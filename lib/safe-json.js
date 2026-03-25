const fs = require('fs')
const path = require('path')

function cloneFallback(value) {
  if (value === null || value === undefined) return value
  if (typeof value !== 'object') return value
  try {
    return JSON.parse(JSON.stringify(value))
  } catch {
    return Array.isArray(value) ? value.slice() : { ...value }
  }
}

function buildCorruptBackupPath(filePath) {
  const dir = path.dirname(filePath)
  const base = path.basename(filePath)
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  return path.join(dir, `${base}.corrupt-${stamp}`)
}

function backupCorruptFileSync(filePath) {
  const backupPath = buildCorruptBackupPath(filePath)
  try {
    fs.renameSync(filePath, backupPath)
    return backupPath
  } catch {
    try {
      fs.copyFileSync(filePath, backupPath)
      fs.unlinkSync(filePath)
      return backupPath
    } catch {
      return null
    }
  }
}

/**
 * Safe JSON reader (sync).
 * - If file missing: returns fallback clone
 * - If JSON invalid: backs up corrupt file and returns fallback clone
 * @param {string} filePath
 * @param {*} fallback
 * @param {{ label?: string, logger?: any, backupCorrupt?: boolean }} [options]
 */
function readJsonSafe(filePath, fallback, options = {}) {
  const label = options.label || path.basename(filePath)
  const logger = options.logger
  const backupCorrupt = options.backupCorrupt !== false
  const fallbackValue = cloneFallback(typeof fallback === 'function' ? fallback() : fallback)

  if (!filePath) {
    return { ok: false, exists: false, data: fallbackValue, error: new Error('missing filePath'), backupPath: null, label }
  }

  if (!fs.existsSync(filePath)) {
    return { ok: true, exists: false, data: fallbackValue, error: null, backupPath: null, label }
  }

  try {
    const raw = fs.readFileSync(filePath, 'utf-8')
    const parsed = JSON.parse(raw)
    return { ok: true, exists: true, data: parsed, error: null, backupPath: null, label }
  } catch (error) {
    let backupPath = null
    if (backupCorrupt) {
      backupPath = backupCorruptFileSync(filePath)
    }

    if (logger?.warn) {
      const detail = backupPath ? ` 已备份到: ${backupPath}` : ''
      logger.warn(`[fox] ${label} JSON 解析失败，将使用默认值。原因: ${error?.message || error}${detail}`)
    }

    return { ok: false, exists: true, data: fallbackValue, error, backupPath, label }
  }
}

async function writeFileAtomic(filePath, content, encoding = 'utf-8') {
  const dir = path.dirname(filePath)
  await fs.promises.mkdir(dir, { recursive: true })

  const base = path.basename(filePath)
  const tempPath = path.join(
    dir,
    `.${base}.tmp-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`
  )

  try {
    await fs.promises.writeFile(tempPath, content, encoding)
    await fs.promises.rename(tempPath, filePath)
  } catch (error) {
    try { await fs.promises.unlink(tempPath) } catch { /* ignore */ }
    throw error
  }
}

function writeFileAtomicSync(filePath, content, encoding = 'utf-8') {
  const dir = path.dirname(filePath)
  fs.mkdirSync(dir, { recursive: true })

  const base = path.basename(filePath)
  const tempPath = path.join(
    dir,
    `.${base}.tmp-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`
  )

  try {
    fs.writeFileSync(tempPath, content, encoding)
    fs.renameSync(tempPath, filePath)
  } catch (error) {
    try { fs.unlinkSync(tempPath) } catch { /* ignore */ }
    throw error
  }
}

/**
 * Atomic JSON writer (async).
 * @param {string} filePath
 * @param {*} data
 * @param {{ pretty?: number }} [options]
 */
async function writeJsonAtomic(filePath, data, options = {}) {
  const pretty = Number.isFinite(options.pretty) ? options.pretty : 2
  const content = JSON.stringify(data, null, pretty)
  await writeFileAtomic(filePath, content, 'utf-8')
}

/**
 * Atomic JSON writer (sync).
 * @param {string} filePath
 * @param {*} data
 * @param {{ pretty?: number }} [options]
 */
function writeJsonAtomicSync(filePath, data, options = {}) {
  const pretty = Number.isFinite(options.pretty) ? options.pretty : 2
  const content = JSON.stringify(data, null, pretty)
  writeFileAtomicSync(filePath, content, 'utf-8')
}

module.exports = {
  readJsonSafe,
  writeJsonAtomic,
  writeJsonAtomicSync,
}

