const assert = require('assert')
const fs = require('fs')
const os = require('os')
const path = require('path')

async function testDealsDeterministic() {
  const DynamicShopSystem = require('../lib/dynamic-shop')
  const memDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wf_dynamic_shop_'))

  const shop = new DynamicShopSystem(memDir, console)
  const dealsA = shop.getDeals('2026-03-25')
  const dealsB = shop.getDeals('2026-03-25')

  assert.deepStrictEqual(dealsA, dealsB, '同一日期的特供应是确定性的')
  assert.strictEqual(dealsA.length, 4, '默认应生成 4 个特供（2 装备 + 2 消耗）')

  for (const deal of dealsA) {
    assert.ok(deal.itemId, 'deal.itemId should exist')
    assert.ok(deal.name, 'deal.name should exist')
    assert.ok(deal.type === 'equip' || deal.type === 'consumable', 'deal.type should be equip/consumable')
    assert.ok(Number.isFinite(deal.basePrice), 'deal.basePrice should be number')
    assert.ok(Number.isFinite(deal.dealPrice), 'deal.dealPrice should be number')
    assert.ok(deal.dealPrice >= 1, 'deal.dealPrice should be >= 1')
    assert.ok(deal.dealPrice <= deal.basePrice, 'dealPrice 应不高于原价')
    assert.ok(Number.isFinite(deal.discountPct), 'deal.discountPct should be number')
  }

  fs.rmSync(memDir, { recursive: true, force: true })
}

async function testPurchaseTrackingResetsDaily() {
  const DynamicShopSystem = require('../lib/dynamic-shop')
  const memDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wf_dynamic_shop_'))

  const shop = new DynamicShopSystem(memDir, console)
  const userId = '10001'
  const itemId = 'pumpkin_lantern'

  assert.strictEqual(shop.hasPurchased(userId, '2026-03-25', itemId), false, '初始不应已购买')
  await shop.markPurchased(userId, '2026-03-25', itemId)
  assert.strictEqual(shop.hasPurchased(userId, '2026-03-25', itemId), true, '标记后应已购买')

  // next day resets
  assert.strictEqual(shop.hasPurchased(userId, '2026-03-26', itemId), false, '跨日后应重置限购')

  fs.rmSync(memDir, { recursive: true, force: true })
}

async function main() {
  const tests = [
    ['dynamic shop deals deterministic', testDealsDeterministic],
    ['dynamic shop purchase resets daily', testPurchaseTrackingResetsDaily],
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

