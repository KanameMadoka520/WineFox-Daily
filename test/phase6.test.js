const assert = require('assert')
const fs = require('fs')

async function testShopBonusLookup() {
  const ShopSystem = require('../lib/shop')
  const memDir = '/tmp/wf_phase6_shop'
  fs.mkdirSync(memDir, { recursive: true })
  const shop = new ShopSystem(memDir, console)

  shop.data.u1 = {
    items: [{ id: 'bracelet', name: '手链', type: 'equip' }],
    equipped: 'bracelet',
  }

  assert.strictEqual(shop.getEquippedBonus('u1', 'affinity_bonus'), 1, '手链应提供 affinity_bonus +1')
  assert.strictEqual(shop.getEquippedBonus('u1', 'brew_time_reduction'), 0, '不匹配的 bonusType 应返回 0')
}

async function testBrewingTimeReductionApplied() {
  const BrewingSystem = require('../lib/brewing')
  const memDir = '/tmp/wf_phase6_brewing'
  fs.mkdirSync(memDir, { recursive: true })
  const brewing = new BrewingSystem(memDir, console)

  const before = Date.now()
  await brewing.confirmBrewing('u1', '苹果酒', 0.25)
  const after = brewing.data.u1.brewing.finishTime - brewing.data.u1.brewing.startTime
  const base = 1 * 60 * 60 * 1000
  assert.ok(after < base, 'brew_time_reduction 应缩短酿酒时间')
  assert.ok(after <= base * 0.75 + 1000, '25% 缩减后应接近原时长的 75%')
  assert.ok(brewing.data.u1.brewing.startTime >= before, '应正常记录开始时间')
}

async function testAffinityDailyCapBonusAndDecayImmune() {
  const AffinitySystem = require('../lib/affinity')
  const memDir = '/tmp/wf_phase6_affinity'
  fs.mkdirSync(memDir, { recursive: true })
  const affinity = new AffinitySystem(memDir, console, { dailyAffinityMax: 20 })

  const today = new Date()
  const old = new Date(today)
  old.setDate(today.getDate() - 5)
  const oldDate = old.toISOString().slice(0, 10)

  affinity.data.u1 = {
    points: 100,
    lastDate: oldDate,
    dailyCount: 24,
    customPrefix: null,
    unlockedRares: [],
    firstMeet: oldDate,
    milestones: [],
    tickets: 0,
  }

  const resultWithoutBonus = await affinity.addPoints('u1', 1)

  affinity.data.u2 = {
    points: 100,
    lastDate: oldDate,
    dailyCount: 24,
    customPrefix: null,
    unlockedRares: [],
    firstMeet: oldDate,
    milestones: [],
    tickets: 0,
  }

  const resultWithBonus = await affinity.addPoints('u2', 1, { dailyCapBonus: 5, decayImmune: true })
  assert.ok(resultWithBonus.newPoints > resultWithoutBonus.newPoints, '有日上限加成+衰减免疫时结果应优于无加成情况')
  assert.strictEqual(resultWithBonus.newPoints, 101, '有日上限加成+衰减免疫时应允许继续增加且不衰减')
}

async function testPassiveAffinityBonusApplied() {
  const AffinitySystem = require('../lib/affinity')
  const memDir = '/tmp/wf_phase6_passive_clean'
  if (fs.existsSync(memDir)) fs.rmSync(memDir, { recursive: true, force: true })
  fs.mkdirSync(memDir, { recursive: true })
  const affinity = new AffinitySystem(memDir, console)

  const result = await affinity.addPoints('u3', 2)
  assert.strictEqual(result.newPoints, 2, '被动额外好感最终仍通过 addPoints 累加')
}

async function main() {
  const tests = [
    ['shop bonus lookup', testShopBonusLookup],
    ['brewing time reduction applied', testBrewingTimeReductionApplied],
    ['affinity daily cap bonus and decay immune', testAffinityDailyCapBonusAndDecayImmune],
    ['passive affinity bonus applied', testPassiveAffinityBonusApplied],
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
