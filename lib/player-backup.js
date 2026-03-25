const fs = require('fs')
const path = require('path')

const DEFAULT_PLAYER_MEMORY_FILES = [
  'affinity.json',
  'inventory.json',
  'commission.json',
  'favorites.json',
  'checkin.json',
  'brewing.json',
  'quiz.json',
  'achievements.json',
  'ticket-reward-ledger.json',
  'pending_submissions.json',
  'prefs.json',
]

function pad2(value) {
  return String(value).padStart(2, '0')
}

function formatBackupId(date = new Date()) {
  const yyyy = date.getUTCFullYear()
  const mm = pad2(date.getUTCMonth() + 1)
  const dd = pad2(date.getUTCDate())
  const hh = pad2(date.getUTCHours())
  const min = pad2(date.getUTCMinutes())
  const ss = pad2(date.getUTCSeconds())
  return `${yyyy}${mm}${dd}-${hh}${min}${ss}`
}

function getDefaultBackupRootDir(pluginDir) {
  return path.join(pluginDir, 'player_backups')
}

async function ensureDir(dir) {
  await fs.promises.mkdir(dir, { recursive: true })
}

async function safeStat(filePath) {
  try {
    return await fs.promises.stat(filePath)
  } catch {
    return null
  }
}

function normalizeBackupId(input) {
  const raw = String(input || '').trim()
  if (!raw) return ''
  if (raw.startsWith('backup-')) return raw.slice('backup-'.length)
  return raw
}

async function readManifest(backupDir) {
  const manifestPath = path.join(backupDir, 'manifest.json')
  try {
    const raw = await fs.promises.readFile(manifestPath, 'utf-8')
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

async function writeManifest(backupDir, manifest) {
  const manifestPath = path.join(backupDir, 'manifest.json')
  await fs.promises.writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8')
  return manifestPath
}

async function createPlayerBackup(options) {
  const memoryDir = options.memoryDir
  const backupRootDir = options.backupRootDir
  const pluginVersion = String(options.pluginVersion || 'unknown')
  const logger = options.logger || console
  const includeFiles = Array.isArray(options.includeFiles) && options.includeFiles.length > 0
    ? options.includeFiles
    : DEFAULT_PLAYER_MEMORY_FILES

  const id = formatBackupId()
  const backupDir = path.join(backupRootDir, `backup-${id}`)
  await ensureDir(backupDir)

  const included = []
  const missing = []
  let totalBytes = 0

  for (const fileName of includeFiles) {
    const safeName = String(fileName || '').trim()
    if (!safeName) continue
    const src = path.join(memoryDir, safeName)
    const st = await safeStat(src)
    if (!st || !st.isFile()) {
      missing.push(safeName)
      continue
    }
    const dest = path.join(backupDir, safeName)
    await ensureDir(path.dirname(dest))
    await fs.promises.copyFile(src, dest)
    included.push({ file: safeName, bytes: st.size })
    totalBytes += st.size
  }

  const manifest = {
    type: 'winefox-player-backup',
    id,
    createdAt: new Date().toISOString(),
    pluginVersion,
    memoryDir,
    backupDir,
    included,
    missing,
    totalBytes,
  }

  await writeManifest(backupDir, manifest)
  logger.info(`[fox] player backup created id=${id} included=${included.length} missing=${missing.length} bytes=${totalBytes}`)

  return {
    id,
    backupDir,
    included,
    missing,
    totalBytes,
    manifest,
  }
}

async function listPlayerBackups(backupRootDir, limit = 20) {
  try {
    const entries = await fs.promises.readdir(backupRootDir, { withFileTypes: true })
    const dirs = entries
      .filter(item => item.isDirectory() && item.name.startsWith('backup-'))
      .map(item => item.name)
      .sort()
      .reverse()

    const sliced = dirs.slice(0, Math.max(1, Math.floor(limit || 20)))
    const result = []

    for (const dirName of sliced) {
      const backupDir = path.join(backupRootDir, dirName)
      const manifest = await readManifest(backupDir)
      let totalBytes = 0
      let fileCount = 0

      if (manifest?.totalBytes) {
        totalBytes = Number(manifest.totalBytes) || 0
      } else if (manifest?.included) {
        for (const item of manifest.included) totalBytes += Number(item?.bytes) || 0
      } else {
        // fallback scan
        const files = await fs.promises.readdir(backupDir, { withFileTypes: true })
        for (const file of files) {
          if (!file.isFile()) continue
          const st = await safeStat(path.join(backupDir, file.name))
          if (!st) continue
          totalBytes += st.size
          fileCount += 1
        }
      }

      if (!fileCount) fileCount = Array.isArray(manifest?.included) ? manifest.included.length : fileCount

      result.push({
        id: dirName.slice('backup-'.length),
        dirName,
        backupDir,
        createdAt: manifest?.createdAt || null,
        pluginVersion: manifest?.pluginVersion || null,
        totalBytes,
        fileCount,
      })
    }

    return result
  } catch {
    return []
  }
}

async function removeDirRecursive(dirPath) {
  try {
    if (fs.promises.rm) {
      await fs.promises.rm(dirPath, { recursive: true, force: true })
      return true
    }
    await fs.promises.rmdir(dirPath, { recursive: true })
    return true
  } catch {
    return false
  }
}

async function cleanupPlayerBackups(backupRootDir, keep = 10, options = {}) {
  const dryRun = options.dryRun === true
  const requestedKeep = Number.isFinite(keep) ? Math.floor(keep) : 10
  const keepCount = Math.max(0, requestedKeep)

  let entries = []
  try {
    entries = await fs.promises.readdir(backupRootDir, { withFileTypes: true })
  } catch (error) {
    return {
      ok: true,
      dryRun,
      backupRootDir,
      exists: false,
      total: 0,
      keep: keepCount,
      deleteCount: 0,
      deleted: [],
      failed: [],
      error: error?.message || String(error),
    }
  }

  const dirs = entries
    .filter(item => item.isDirectory() && item.name.startsWith('backup-'))
    .map(item => item.name)
    .sort()
    .reverse()

  const keepDirs = dirs.slice(0, keepCount)
  const deleteDirs = dirs.slice(keepCount)

  const deleted = []
  const failed = []

  for (const dirName of deleteDirs) {
    const backupDir = path.join(backupRootDir, dirName)
    if (dryRun) {
      deleted.push({ id: dirName.slice('backup-'.length), dirName, backupDir })
      continue
    }
    const ok = await removeDirRecursive(backupDir)
    if (ok) deleted.push({ id: dirName.slice('backup-'.length), dirName, backupDir })
    else failed.push({ id: dirName.slice('backup-'.length), dirName, backupDir })
  }

  return {
    ok: failed.length === 0,
    dryRun,
    backupRootDir,
    exists: true,
    total: dirs.length,
    keep: keepDirs.length,
    deleteCount: deleteDirs.length,
    deleted,
    failed,
    keepDirs,
  }
}

async function resolvePlayerBackupDir(backupRootDir, id) {
  const normalized = normalizeBackupId(id)
  if (!normalized) return null

  if (normalized.toLowerCase() === 'latest') {
    const list = await listPlayerBackups(backupRootDir, 1)
    return list[0]?.backupDir || null
  }

  const direct = path.join(backupRootDir, `backup-${normalized}`)
  const st = await safeStat(direct)
  if (st && st.isDirectory()) return direct
  return null
}

async function restorePlayerBackup(options) {
  const backupDir = options.backupDir
  const memoryDir = options.memoryDir
  const logger = options.logger || console

  const manifest = await readManifest(backupDir)
  const includeFiles = Array.isArray(manifest?.included)
    ? manifest.included.map(item => item?.file).filter(Boolean)
    : DEFAULT_PLAYER_MEMORY_FILES

  let restored = 0
  let totalBytes = 0
  const missing = []

  await ensureDir(memoryDir)

  for (const fileName of includeFiles) {
    const src = path.join(backupDir, fileName)
    const st = await safeStat(src)
    if (!st || !st.isFile()) {
      missing.push(fileName)
      continue
    }
    const dest = path.join(memoryDir, fileName)
    await ensureDir(path.dirname(dest))
    await fs.promises.copyFile(src, dest)
    restored += 1
    totalBytes += st.size
  }

  logger.info(`[fox] player backup restored dir=${backupDir} restored=${restored} bytes=${totalBytes}`)
  return {
    restored,
    totalBytes,
    missing,
    manifest,
  }
}

module.exports = {
  DEFAULT_PLAYER_MEMORY_FILES,
  formatBackupId,
  getDefaultBackupRootDir,
  createPlayerBackup,
  listPlayerBackups,
  cleanupPlayerBackups,
  resolvePlayerBackupDir,
  restorePlayerBackup,
}
