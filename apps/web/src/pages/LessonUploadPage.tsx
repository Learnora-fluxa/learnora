import { useEffect, useRef, useState } from 'react'
import type { Upload as TusUpload } from 'tus-js-client'
import { ArrowLeft, CheckCircle2, ChevronDown, File, FileText, Headphones, Link2, Loader2, Pause, Play, Upload, Video, X } from 'lucide-react'
import DashboardLayout from '../components/layout/DashboardLayout'
import { teacherNav } from '../components/layout/Sidebar'
import { useAuth, profileToSidebarUser } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { logSupabaseError } from '../lib/supabaseError'
import { createResumableUpload, createStoragePath, uploadPrivateFile } from '../lib/storage'

type Props = { onNavigate: (page: string) => void }
type ContentType = 'video' | 'pdf' | 'audio' | 'document'
type InputMode = 'upload' | 'url'
type UploadPhase = 'idle' | 'uploading' | 'paused' | 'saving'

const LESSON_UPLOAD_BUCKET = 'teacher-resources'
const RESUMABLE_VIDEO_THRESHOLD = 20 * 1024 * 1024

const typeConfig: Record<ContentType, {
  label: string
  icon: typeof Video
  color: string
  placeholder: string
  accept: string
  maxBytes: number
}> = {
  video: {
    label: 'Video',
    icon: Video,
    color: 'text-primary',
    placeholder: 'YouTube, Vimeo, or direct video URL',
    accept: 'video/mp4,video/webm,video/quicktime,video/x-matroska,.mp4,.webm,.mov,.mkv',
    maxBytes: 500 * 1024 * 1024,
  },
  pdf: {
    label: 'PDF',
    icon: FileText,
    color: 'text-amber-600',
    placeholder: 'Google Drive, Dropbox, or PDF URL',
    accept: 'application/pdf,.pdf',
    maxBytes: 50 * 1024 * 1024,
  },
  audio: {
    label: 'Audio',
    icon: Headphones,
    color: 'text-teal-600',
    placeholder: 'SoundCloud, direct MP3 URL',
    accept: 'audio/mpeg,audio/mp3,audio/wav,audio/x-wav,audio/mp4,audio/aac,audio/ogg,.mp3,.wav,.m4a,.aac,.ogg',
    maxBytes: 100 * 1024 * 1024,
  },
  document: {
    label: 'Document',
    icon: File,
    color: 'text-foreground',
    placeholder: 'Google Docs, OneDrive, or doc URL',
    accept: 'application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.doc,.docx',
    maxBytes: 50 * 1024 * 1024,
  },
}

interface CourseOpt { id: string; title: string }
interface ModuleOpt { id: string; title: string }
type ContentTypeState<T> = Record<ContentType, T>

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_')
}

export default function LessonUploadPage({ onNavigate }: Props) {
  const { profile, session } = useAuth()
  const sidebarUser = profileToSidebarUser(profile)

  const [courses, setCourses] = useState<CourseOpt[]>([])
  const [modules, setModules] = useState<ModuleOpt[]>([])
  const [courseId, setCourseId] = useState(sessionStorage.getItem('learnora_selected_course') ?? '')
  const [moduleId, setModuleId] = useState('')
  const [title, setTitle] = useState('')
  const [contentUrls, setContentUrls] = useState<ContentTypeState<string>>({
    video: '',
    pdf: '',
    audio: '',
    document: '',
  })
  const [contentType, setContentType] = useState<ContentType>('video')
  const [inputMode, setInputMode] = useState<InputMode>('upload')
  const [selectedFiles, setSelectedFiles] = useState<ContentTypeState<File | null>>({
    video: null,
    pdf: null,
    audio: null,
    document: null,
  })
  const [duration, setDuration] = useState('')
  const [position, setPosition] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadPhase, setUploadPhase] = useState<UploadPhase>('idle')
  const [uploadModeLabel, setUploadModeLabel] = useState('')

  const resumableUploadRef = useRef<TusUpload | null>(null)

  const contentUrl = contentUrls[contentType]
  const selectedFile = selectedFiles[contentType]

  useEffect(() => { if (profile?.id) void loadCourses() }, [profile?.id])
  useEffect(() => { if (courseId) void loadModules(courseId) }, [courseId])

  async function loadCourses() {
    const { data } = await supabase
      .from('courses')
      .select('id, title')
      .eq('teacher_id', profile!.id)
      .eq('school_id', profile!.school_id!)
      .order('created_at', { ascending: false })

    const rows = (data ?? []) as CourseOpt[]
    setCourses(rows)
    if (rows.length > 0 && !courseId) setCourseId(rows[0].id)
    setLoading(false)
  }

  async function loadModules(cid: string) {
    setModuleId('')
    const { data } = await supabase
      .from('modules')
      .select('id, title')
      .eq('course_id', cid)
      .order('position', { ascending: true })

    const rows = (data ?? []) as ModuleOpt[]
    setModules(rows)
    if (rows.length > 0) setModuleId(rows[0].id)
  }

  function resetUploadState() {
    resumableUploadRef.current = null
    setUploadProgress(0)
    setUploadPhase('idle')
    setUploadModeLabel('')
  }

  function setSelectedFileForType(type: ContentType, file: File | null) {
    setSelectedFiles((current) => ({
      ...current,
      [type]: file,
    }))
  }

  function setContentUrlForType(type: ContentType, value: string) {
    setContentUrls((current) => ({
      ...current,
      [type]: value,
    }))
  }

  function validateSelectedFile(file: File) {
    const config = typeConfig[contentType]

    if (file.size > config.maxBytes) {
      return `${config.label} files must be ${formatBytes(config.maxBytes)} or smaller.`
    }

    const lower = file.name.toLowerCase()
    const extensionOk =
      (contentType === 'video' && ['.mp4', '.webm', '.mov', '.mkv'].some((ext) => lower.endsWith(ext))) ||
      (contentType === 'pdf' && lower.endsWith('.pdf')) ||
      (contentType === 'audio' && ['.mp3', '.wav', '.m4a', '.aac', '.ogg'].some((ext) => lower.endsWith(ext))) ||
      (contentType === 'document' && ['.doc', '.docx'].some((ext) => lower.endsWith(ext)))

    if (!extensionOk) {
      return `Selected file does not match the ${config.label.toLowerCase()} type.`
    }

    return null
  }

  function buildStoragePath(file: File) {
    return createStoragePath([
      profile!.school_id,
      'lesson-content',
      courseId,
      moduleId,
      `${Date.now()}_${sanitizeFileName(file.name)}`,
    ])
  }

  function isLargeResumableVideo(file: File) {
    return contentType === 'video' && file.size >= RESUMABLE_VIDEO_THRESHOLD
  }

  async function uploadSelectedFile() {
    if (!selectedFile) return null

    const validationError = validateSelectedFile(selectedFile)
    if (validationError) {
      setError(validationError)
      return null
    }

    const path = buildStoragePath(selectedFile)

    if (isLargeResumableVideo(selectedFile)) {
      if (!session) {
        setError('Your session expired. Please sign in again before uploading large videos.')
        return null
      }

      setUploadModeLabel('Resumable upload')
      setUploadPhase('uploading')

      const { upload, storageRef } = await createResumableUpload({
        bucket: LESSON_UPLOAD_BUCKET,
        path,
        file: selectedFile,
        session,
        onProgress: setUploadProgress,
      })

      resumableUploadRef.current = upload

      return await new Promise<string | null>((resolve) => {
        upload.options.onError = (uploadError) => {
          console.error('LessonUpload/resumableUpload', uploadError)
          setError(`Upload failed: ${uploadError.message}`)
          setSaving(false)
          resetUploadState()
          resolve(null)
        }

        upload.options.onSuccess = () => {
          setUploadProgress(100)
          setUploadPhase('saving')
          resetUploadState()
          resolve(storageRef)
        }

        upload.start()
      })
    }

    setUploadModeLabel('Direct upload')
    setUploadPhase('uploading')

    try {
      const storageRef = await uploadPrivateFile({
        bucket: LESSON_UPLOAD_BUCKET,
        path,
        file: selectedFile,
      })

      setUploadProgress(100)
      setUploadPhase('saving')
      return storageRef
    } catch (uploadError) {
      const message = uploadError instanceof Error ? uploadError.message : 'Unknown upload error'
      console.error('LessonUpload/upload', uploadError)
      setError(`Upload failed: ${message}`)
      return null
    }
  }

  function pauseUpload() {
    if (!resumableUploadRef.current) return
    resumableUploadRef.current.abort()
    setUploadPhase('paused')
  }

  function resumeUpload() {
    if (!resumableUploadRef.current) return
    setUploadPhase('uploading')
    resumableUploadRef.current.start()
  }

  async function saveLesson() {
    if (!title.trim() || !courseId || !moduleId) {
      setError('Please fill in the lesson title and select a course and module.')
      return
    }

    if (inputMode === 'upload' && !selectedFile) {
      setError('Please choose a file to upload.')
      return
    }

    if (inputMode === 'url' && !contentUrl.trim()) {
      setError('Please provide a content URL.')
      return
    }

    setError('')
    setSaving(true)
    setUploadProgress(0)

    const uploadedUrl = inputMode === 'upload' ? await uploadSelectedFile() : contentUrl.trim()
    if (!uploadedUrl) {
      setSaving(false)
      return
    }

    const lessonPayload = {
      course_id: courseId,
      module_id: moduleId,
      school_id: profile!.school_id!,
      title: title.trim(),
      content_url: uploadedUrl,
      type: contentType,
      duration_minutes: duration ? parseInt(duration, 10) || null : null,
      position: position ? parseInt(position, 10) || null : null,
      is_published: true,
    }

    const resourcePayload = {
      course_id: courseId,
      school_id: profile!.school_id!,
      name: title.trim(),
      file_url: uploadedUrl,
      file_type: contentType,
      uploaded_by: profile!.id,
    }

    const [lessonResult, resourceResult] = await Promise.all([
      supabase.from('lessons').insert(lessonPayload),
      supabase.from('course_resources').insert(resourcePayload),
    ])

    setSaving(false)

    if (lessonResult.error) {
      logSupabaseError('LessonUpload/lessonInsert', lessonResult.error)
      setError(`Failed to save lesson: ${lessonResult.error.message}`)
      return
    }

    if (resourceResult.error) {
      logSupabaseError('LessonUpload/resourceInsert', resourceResult.error)
    }

    setDone(true)
  }

  function reset() {
    setTitle('')
    setContentUrls({
      video: '',
      pdf: '',
      audio: '',
      document: '',
    })
    setSelectedFiles({
      video: null,
      pdf: null,
      audio: null,
      document: null,
    })
    setDuration('')
    setPosition('')
    setDone(false)
    setError('')
    setInputMode('upload')
    resetUploadState()
  }

  const showUploadProgress = inputMode === 'upload' && saving && uploadProgress > 0

  if (done) {
    return (
      <DashboardLayout activePage="course-builder" onNavigate={onNavigate} title="Upload Lesson Content" nav={teacherNav} user={sidebarUser}>
        <div className="flex flex-col items-center justify-center py-20 gap-6">
          <div className="size-16 rounded-full bg-green-50 flex items-center justify-center">
            <CheckCircle2 size={32} className="text-green-600" />
          </div>
          <div className="text-center">
            <h2 className="text-xl font-bold text-foreground">Lesson Added!</h2>
            <p className="text-sm text-muted mt-2">"{title}" has been uploaded and saved to your course.</p>
          </div>
          <div className="flex gap-3">
            <button onClick={reset} className="h-11 px-6 bg-primary text-white text-sm font-semibold rounded-pill hover:bg-primary-deep transition-colors">
              Add Another Lesson
            </button>
            <button onClick={() => onNavigate('course-builder')} className="h-11 px-6 border border-black/20 text-foreground text-sm font-semibold rounded-pill hover:border-primary hover:text-primary transition-colors">
              Back to Course Builder
            </button>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout
      activePage="course-builder"
      onNavigate={onNavigate}
      title="Upload Lesson Content"
      subtitle="Upload lesson files directly or attach external URLs"
      nav={teacherNav}
      user={sidebarUser}
    >
      <div className="max-w-[800px] flex flex-col gap-6">
        <button onClick={() => onNavigate('course-builder')} className="flex items-center gap-1.5 text-sm text-muted hover:text-foreground w-fit">
          <ArrowLeft size={14} /> Back to Course Builder
        </button>

        {loading ? (
          <div className="bg-surface rounded-card shadow-sm p-12 text-center text-sm text-muted">Loading courses…</div>
        ) : courses.length === 0 ? (
          <div className="bg-surface rounded-card shadow-sm p-12 flex flex-col items-center gap-4">
            <p className="text-sm text-muted text-center">No courses found. Create a course first before adding lesson content.</p>
            <button onClick={() => onNavigate('course-builder')} className="h-10 px-5 bg-primary text-white text-sm font-semibold rounded-pill">
              Go to Course Builder
            </button>
          </div>
        ) : (
          <>
            <div className="bg-surface rounded-card shadow-sm p-6">
              <h2 className="text-base font-bold text-foreground mb-4">Content Type</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {(Object.entries(typeConfig) as [ContentType, typeof typeConfig.video][]).map(([key, cfg]) => {
                  const Icon = cfg.icon
                  return (
                    <button
                      key={key}
                      onClick={() => {
                        setContentType(key)
                        setError('')
                        resetUploadState()
                      }}
                      className={`flex flex-col items-center gap-2 p-4 rounded-card border-2 transition-colors ${
                        contentType === key ? 'border-primary bg-primary/5' : 'border-black/10 hover:border-primary/40'
                      }`}
                    >
                      <Icon size={22} className={contentType === key ? 'text-primary' : cfg.color} />
                      <span className="text-xs font-semibold text-foreground">{cfg.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="bg-surface rounded-card shadow-sm p-6 flex flex-col gap-5">
              <h2 className="text-base font-bold text-foreground">Lesson Details</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-foreground">Course *</label>
                  <div className="relative">
                    <select
                      value={courseId}
                      onChange={e => setCourseId(e.target.value)}
                      className="w-full h-12 pl-4 pr-10 border border-black/20 rounded-input text-sm text-foreground bg-white outline-none focus:border-primary appearance-none"
                    >
                      {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-foreground">Module *</label>
                  <div className="relative">
                    <select
                      value={moduleId}
                      onChange={e => setModuleId(e.target.value)}
                      className="w-full h-12 pl-4 pr-10 border border-black/20 rounded-input text-sm text-foreground bg-white outline-none focus:border-primary appearance-none"
                    >
                      {modules.length === 0
                        ? <option value="">No modules in this course</option>
                        : modules.map(m => <option key={m.id} value={m.id}>{m.title}</option>)
                      }
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-foreground">Lesson Title *</label>
                <input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Introduction to Newton's Laws"
                  className="h-12 px-4 border border-black/20 rounded-input text-sm text-foreground placeholder:text-muted outline-none focus:border-primary"
                />
              </div>

              <div className="flex gap-1 bg-canvas rounded-card p-1 w-fit">
                {(['upload', 'url'] as InputMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => {
                      setInputMode(mode)
                      setError('')
                      resetUploadState()
                    }}
                    className={`px-4 h-9 text-sm font-semibold rounded-md transition-colors ${
                      inputMode === mode ? 'bg-white text-primary shadow-sm' : 'text-muted hover:text-foreground'
                    }`}
                  >
                    {mode === 'upload' ? 'Upload file' : 'Use URL'}
                  </button>
                ))}
              </div>

              {inputMode === 'upload' ? (
                <div className="flex flex-col gap-3">
                  <label className="text-sm font-semibold text-foreground">Upload File *</label>
                  <label className="border-2 border-dashed border-black/15 rounded-card p-5 hover:border-primary/40 transition-colors cursor-pointer">
                    <input
                      type="file"
                      accept={typeConfig[contentType].accept}
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0] ?? null
                        setSelectedFileForType(contentType, file)
                        setError('')
                        resetUploadState()
                      }}
                    />
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Upload size={18} className="text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">Choose a {typeConfig[contentType].label.toLowerCase()} file</p>
                        <p className="text-xs text-muted mt-1">
                          Videos larger than {formatBytes(RESUMABLE_VIDEO_THRESHOLD)} will upload resumably. Files are stored privately and opened with signed access.
                        </p>
                      </div>
                    </div>
                  </label>

                  {selectedFile && (
                    <div className="flex items-center justify-between gap-3 rounded-card border border-black/10 bg-canvas px-4 py-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{selectedFile.name}</p>
                        <p className="text-xs text-muted">
                          {formatBytes(selectedFile.size)}
                          {isLargeResumableVideo(selectedFile) ? ' · resumable video upload' : ' · direct upload'}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedFileForType(contentType, null)
                          resetUploadState()
                        }}
                        className="text-muted hover:text-foreground transition-colors"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  )}

                  {showUploadProgress && (
                    <div className="rounded-card border border-black/10 bg-canvas px-4 py-4 flex flex-col gap-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-foreground">{uploadModeLabel || 'Uploading lesson file'}</p>
                          <p className="text-xs text-muted">
                            {uploadPhase === 'paused' ? 'Upload paused. Resume when ready.' : uploadPhase === 'saving' ? 'Finalizing lesson record…' : 'Upload in progress…'}
                          </p>
                        </div>
                        <p className="text-sm font-bold text-foreground">{uploadProgress}%</p>
                      </div>
                      <div className="h-2 rounded-full bg-black/8 overflow-hidden">
                        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${uploadProgress}%` }} />
                      </div>
                      {isLargeResumableVideo(selectedFile!) && (
                        <div className="flex gap-2">
                          {uploadPhase === 'uploading' && (
                            <button onClick={pauseUpload} type="button" className="h-9 px-3 rounded-pill border border-black/15 text-sm font-semibold text-foreground inline-flex items-center gap-1.5">
                              <Pause size={14} /> Pause
                            </button>
                          )}
                          {uploadPhase === 'paused' && (
                            <button onClick={resumeUpload} type="button" className="h-9 px-3 rounded-pill bg-primary text-white text-sm font-semibold inline-flex items-center gap-1.5">
                              <Play size={14} /> Resume
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                    <Link2 size={13} className="text-muted" /> Content URL
                  </label>
                  <input
                    value={contentUrl}
                    onChange={e => setContentUrlForType(contentType, e.target.value)}
                    placeholder={typeConfig[contentType].placeholder}
                    className="h-12 px-4 border border-black/20 rounded-input text-sm text-foreground placeholder:text-muted outline-none focus:border-primary"
                  />
                  <p className="text-xs text-muted">Use this for hosted content like YouTube, Vimeo, Google Drive, or OneDrive.</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-foreground">Duration (minutes)</label>
                  <input
                    value={duration}
                    onChange={e => setDuration(e.target.value)}
                    type="number"
                    min="1"
                    placeholder="e.g. 15"
                    className="h-12 px-4 border border-black/20 rounded-input text-sm text-foreground placeholder:text-muted outline-none focus:border-primary"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-foreground">Position in Module</label>
                  <input
                    value={position}
                    onChange={e => setPosition(e.target.value)}
                    type="number"
                    min="1"
                    placeholder="e.g. 1"
                    className="h-12 px-4 border border-black/20 rounded-input text-sm text-foreground placeholder:text-muted outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="rounded-card bg-canvas p-4 text-xs text-muted leading-relaxed">
                <strong className="text-foreground">Upload architecture:</strong> the browser sends media straight to Supabase Storage, large videos resume automatically, and the database stores only a private storage reference so lessons open through signed links instead of public URLs.
              </div>

              {error && <p className="text-sm text-red-500">{error}</p>}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => void saveLesson()}
                disabled={saving || !title.trim() || !courseId || !moduleId}
                className="h-12 px-6 bg-primary text-white text-sm font-semibold rounded-pill hover:bg-primary-deep transition-colors shadow-primary disabled:opacity-50 inline-flex items-center gap-2"
              >
                {saving && <Loader2 size={16} className="animate-spin" />}
                {saving ? 'Saving Lesson…' : 'Save Lesson'}
              </button>
              <button onClick={() => onNavigate('course-builder')} className="h-12 px-6 border border-black/20 text-foreground text-sm font-semibold rounded-pill hover:border-primary hover:text-primary transition-colors">
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
