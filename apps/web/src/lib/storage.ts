import { Upload } from 'tus-js-client'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'

export const STORAGE_REF_PREFIX = 'storage://'

interface StorageTarget {
  bucket: string
  path: string
}

interface UploadOptions {
  bucket: string
  path: string
  file: File
  upsert?: boolean
}

interface ResumableUploadOptions extends UploadOptions {
  session: Session
  onProgress?: (progress: number) => void
}

function getEnvValue(key: 'VITE_SUPABASE_URL' | 'VITE_SUPABASE_ANON_KEY') {
  const value = import.meta.env[key]
  if (!value || typeof value !== 'string') {
    throw new Error(`Missing ${key} environment variable.`)
  }

  return value
}

export function makeStorageRef(bucket: string, path: string) {
  return `${STORAGE_REF_PREFIX}${bucket}/${path}`
}

export function parseStorageRef(ref: string | null | undefined): StorageTarget | null {
  if (!ref || !ref.startsWith(STORAGE_REF_PREFIX)) return null

  const target = ref.slice(STORAGE_REF_PREFIX.length)
  const firstSlash = target.indexOf('/')
  if (firstSlash <= 0) return null

  return {
    bucket: target.slice(0, firstSlash),
    path: target.slice(firstSlash + 1),
  }
}

export function createStoragePath(parts: Array<string | null | undefined>) {
  return parts
    .filter((part): part is string => typeof part === 'string' && part.trim().length > 0)
    .map((part) => part.replace(/^\/+|\/+$/g, ''))
    .join('/')
}

export async function resolveStorageUrl(session: Session | null, ref: string | null | undefined, expiresIn = 3600) {
  if (!ref) return null

  const parsed = parseStorageRef(ref)
  if (!parsed) return ref
  if (!session) return null

  const { data, error } = await supabase.storage
    .from(parsed.bucket)
    .createSignedUrl(parsed.path, expiresIn)

  if (error) throw error
  return data.signedUrl
}

export async function uploadPrivateFile({ bucket, path, file, upsert = false }: UploadOptions) {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      upsert,
      contentType: file.type || undefined,
    })

  if (error) throw error
  return makeStorageRef(bucket, data.path)
}

function buildResumableEndpoint() {
  const supabaseUrl = getEnvValue('VITE_SUPABASE_URL')
  const url = new URL(supabaseUrl)
  const host = url.host.replace('.supabase.co', '.storage.supabase.co')
  return `${url.protocol}//${host}/storage/v1/upload/resumable`
}

export async function createResumableUpload({
  bucket,
  path,
  file,
  session,
  upsert = false,
  onProgress,
}: ResumableUploadOptions) {
  const endpoint = buildResumableEndpoint()
  const anonKey = getEnvValue('VITE_SUPABASE_ANON_KEY')

  const upload = new Upload(file, {
    endpoint,
    uploadDataDuringCreation: true,
    removeFingerprintOnSuccess: true,
    retryDelays: [0, 3000, 5000, 10000, 20000],
    chunkSize: 6 * 1024 * 1024,
    headers: {
      authorization: `Bearer ${session.access_token}`,
      apikey: anonKey,
      'x-upsert': String(upsert),
    },
    metadata: {
      bucketName: bucket,
      objectName: path,
      contentType: file.type || 'application/octet-stream',
      cacheControl: '3600',
    },
    onProgress(bytesUploaded, bytesTotal) {
      if (!onProgress || bytesTotal <= 0) return
      onProgress(Math.min(100, Math.round((bytesUploaded / bytesTotal) * 100)))
    },
  })

  const previousUploads = await upload.findPreviousUploads()
  if (previousUploads.length > 0) {
    upload.resumeFromPreviousUpload(previousUploads[0])
  }

  return {
    upload,
    storageRef: makeStorageRef(bucket, path),
  }
}
