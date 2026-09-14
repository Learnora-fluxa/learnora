#!/usr/bin/env node
// scripts/check-env.mjs
//
// Prints, in the exact precedence order apps/web (Vite) and apps/api (Nest)
// use at runtime, which env file each variable would load from. No
// dependencies required -- useful for proving the dev/prod file split
// actually resolves the way you expect, before wiring up real deployments.
//
// Usage: node scripts/check-env.mjs <apps/web|apps/api> <mode>
//   node scripts/check-env.mjs apps/api development
//   node scripts/check-env.mjs apps/web production

import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const [, , appDir, mode] = process.argv
if (!appDir || !mode) {
  console.error('Usage: node scripts/check-env.mjs <apps/web|apps/api> <mode>')
  process.exit(1)
}

const files = [`.env.${mode}.local`, `.env.${mode}`, '.env.local', '.env']

function parseEnvFile(path) {
  const out = {}
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    out[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim()
  }
  return out
}

const resolved = {}
const source = {}

console.log(`Loading order for ${appDir} (mode=${mode}), highest priority first:`)
for (const file of files) {
  const full = join(appDir, file)
  if (!existsSync(full)) {
    console.log(`  (skip) ${file} -- not found`)
    continue
  }
  console.log(`  (load) ${file}`)
  const vars = parseEnvFile(full)
  for (const [k, v] of Object.entries(vars)) {
    if (!(k in resolved)) {
      resolved[k] = v
      source[k] = file
    }
  }
}

console.log(`\nResolved values:`)
for (const [k, v] of Object.entries(resolved)) {
  console.log(`  ${k}=${v}   <- ${source[k]}`)
}
