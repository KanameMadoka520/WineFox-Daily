const assert = require('assert')
const fs = require('fs')
const os = require('os')
const path = require('path')

const { cleanupPlayerBackups } = require('../lib/player-backup')

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'winefox-player-backups-'))
}

function mkdir(dir) {
  fs.mkdirSync(dir, { recursive: true })
}

function exists(dir) {
  try {
    return fs.statSync(dir).isDirectory()
  } catch {
    return false
  }
}

async function testCleanupDryRun() {
  const base = makeTempDir()
  try {
    const backupRootDir = path.join(base, 'player_backups')
    mkdir(backupRootDir)

    const ids = [
      '20260101-000000',
      '20260102-000000',
      '20260103-000000',
      '20260104-000000',
      '20260105-000000',
    ]
    for (const id of ids) {
      mkdir(path.join(backupRootDir, `backup-${id}`))
    }

    const result = await cleanupPlayerBackups(backupRootDir, 2, { dryRun: true })
    assert.strictEqual(result.exists, true)
    assert.strictEqual(result.dryRun, true)
    assert.strictEqual(result.total, 5)
    assert.strictEqual(result.keep, 2)
    assert.strictEqual(result.deleteCount, 3)
    assert.strictEqual(result.deleted.length, 3)
    assert.strictEqual(result.failed.length, 0)

    // dry-run should not delete anything
    for (const id of ids) {
      assert.ok(exists(path.join(backupRootDir, `backup-${id}`)), `backup-${id} should still exist after dry run`)
    }
  } finally {
    fs.rmSync(base, { recursive: true, force: true })
  }
}

async function testCleanupDeletesOldBackups() {
  const base = makeTempDir()
  try {
    const backupRootDir = path.join(base, 'player_backups')
    mkdir(backupRootDir)

    const ids = [
      '20260101-000000',
      '20260102-000000',
      '20260103-000000',
      '20260104-000000',
      '20260105-000000',
    ]
    for (const id of ids) {
      mkdir(path.join(backupRootDir, `backup-${id}`))
    }

    const result = await cleanupPlayerBackups(backupRootDir, 2)
    assert.strictEqual(result.exists, true)
    assert.strictEqual(result.dryRun, false)
    assert.strictEqual(result.total, 5)
    assert.strictEqual(result.keep, 2)
    assert.strictEqual(result.deleteCount, 3)
    assert.strictEqual(result.deleted.length, 3)
    assert.strictEqual(result.failed.length, 0)

    // newest two should remain
    assert.ok(exists(path.join(backupRootDir, 'backup-20260105-000000')))
    assert.ok(exists(path.join(backupRootDir, 'backup-20260104-000000')))
    assert.ok(!exists(path.join(backupRootDir, 'backup-20260103-000000')))
    assert.ok(!exists(path.join(backupRootDir, 'backup-20260102-000000')))
    assert.ok(!exists(path.join(backupRootDir, 'backup-20260101-000000')))
  } finally {
    fs.rmSync(base, { recursive: true, force: true })
  }
}

async function testCleanupMissingDirectory() {
  const base = makeTempDir()
  try {
    const missing = path.join(base, 'not-exists-player_backups')
    const result = await cleanupPlayerBackups(missing, 10)
    assert.strictEqual(result.exists, false)
    assert.strictEqual(result.total, 0)
    assert.strictEqual(result.deleteCount, 0)
  } finally {
    fs.rmSync(base, { recursive: true, force: true })
  }
}

async function main() {
  const tests = [
    ['cleanup dry-run', testCleanupDryRun],
    ['cleanup deletes old backups', testCleanupDeletesOldBackups],
    ['cleanup missing directory', testCleanupMissingDirectory],
  ]

  let failed = 0
  for (const [name, fn] of tests) {
    try {
      await fn()
      console.log('PASS', name)
    } catch (err) {
      failed++
      console.error('FAIL', name)
      console.error(err && err.stack ? err.stack : err)
    }
  }

  if (failed > 0) process.exit(1)
}

main()

