const assert = require('assert')
const fs = require('fs')
const path = require('path')

function makeTempDir(name) {
  const dir = path.join('/tmp', name)
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true })
  fs.mkdirSync(dir, { recursive: true })
  return dir
}

function testSeasonCycleProgression() {
  const SeasonSystem = require('../lib/season')
  const dir = makeTempDir('wf_season_cycle')
  const season = new SeasonSystem(dir, console, { cycleHours: 1 })

  season.data = {
    currentIndex: 0,
    changedAt: 0,
  }

  const spring = season.getSeason(30 * 60 * 1000)
  assert.strictEqual(spring.name, '春季', '半个周期内应保持春季')

  const summer = season.getSeason(60 * 60 * 1000 + 1)
  assert.strictEqual(summer.name, '夏季', '跨过一个周期后应进入夏季')

  const winter = season.getSeason(3 * 60 * 60 * 1000 + 1)
  assert.strictEqual(winter.name, '冬季', '连续推进三个周期后应进入冬季')
  assert.ok(/小时/.test(winter.remainingLabel), '应返回剩余时间文本')
}

function testSeasonPersistence() {
  const SeasonSystem = require('../lib/season')
  const dir = makeTempDir('wf_season_persist')
  const savePath = path.join(dir, 'season-cycle.json')
  fs.writeFileSync(savePath, JSON.stringify({
    currentIndex: 2,
    changedAt: 123456789,
  }, null, 2))

  const season = new SeasonSystem(dir, console, { cycleHours: 12 })
  const snapshot = season.getSeason(123456789)
  assert.strictEqual(snapshot.name, '秋季', '持久化后应恢复到秋季')
  assert.strictEqual(snapshot.cycleHours, 12, '应保留配置中的轮换周期')
}

function testSeasonManualSet() {
  const SeasonSystem = require('../lib/season')
  const dir = makeTempDir('wf_season_set')
  const season = new SeasonSystem(dir, console, { cycleHours: 6 })

  const setResult = season.setSeason('冬天', 999999)
  assert.strictEqual(setResult.success, true, '应支持按别名手动切换季节')
  assert.strictEqual(setResult.season.name, '冬季', '手动切换后应进入冬季')
  assert.strictEqual(setResult.season.changedAt, 999999, '手动切换后应重置起始时间')
  assert.strictEqual(setResult.season.isManualSeason, true, '手动切换后应标记手动季节状态')

  const invalidResult = season.setSeason('不存在的季节', 1000000)
  assert.strictEqual(invalidResult.success, false, '无效季节不应切换成功')
}

function testSeasonCycleHoursSet() {
  const SeasonSystem = require('../lib/season')
  const dir = makeTempDir('wf_season_cycle_hours')
  const season = new SeasonSystem(dir, console, { cycleHours: 24 })

  const setResult = season.setCycleHours(8, 2000000)
  assert.strictEqual(setResult.success, true, '应支持手动调整季节周期')
  assert.strictEqual(setResult.season.cycleHours, 8, '调整后应使用新的周期小时数')
  assert.strictEqual(setResult.season.changedAt, 2000000, '调整周期后应重置切换起点')
  assert.strictEqual(setResult.season.isManualCycle, true, '调整周期后应标记手动周期状态')

  const reloaded = new SeasonSystem(dir, console, { cycleHours: 24 })
  assert.strictEqual(reloaded.getSeason(2000000).cycleHours, 8, '持久化后应保留手动设置的周期')

  const invalidResult = season.setCycleHours(0, 3000000)
  assert.strictEqual(invalidResult.success, false, '无效周期不应设置成功')
}

function testSeasonRestoreAuto() {
  const SeasonSystem = require('../lib/season')
  const dir = makeTempDir('wf_season_restore')
  const season = new SeasonSystem(dir, console, { cycleHours: 12 })

  season.setSeason('冬季', 500000)
  season.setCycleHours(4, 500001)
  const restored = season.restoreAuto(500002)
  assert.strictEqual(restored.success, true, '恢复自动应成功')
  assert.strictEqual(restored.season.cycleHours, 12, '恢复后应回到默认周期')
  assert.strictEqual(restored.season.isManualSeason, false, '恢复后不应保留手动季节标记')
  assert.strictEqual(restored.season.isManualCycle, false, '恢复后不应保留手动周期标记')
  assert.strictEqual(restored.season.isManualOverride, false, '恢复后应回到自动状态')
}

async function main() {
  const tests = [
    ['season cycle progression', testSeasonCycleProgression],
    ['season persistence', testSeasonPersistence],
    ['season manual set', testSeasonManualSet],
    ['season cycle hours set', testSeasonCycleHoursSet],
    ['season restore auto', testSeasonRestoreAuto],
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
