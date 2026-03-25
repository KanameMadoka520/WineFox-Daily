const assert = require('assert')
const fs = require('fs')
const path = require('path')

async function testCommissionData() {
  const CommissionSystem = require('../lib/commission')
  const memDir = '/tmp/wf_phase8_commission'
  if (fs.existsSync(memDir)) fs.rmSync(memDir, { recursive: true, force: true })
  fs.mkdirSync(memDir, { recursive: true })

  const affinity = {
    async addTickets() { return { newTickets: 0 } },
  }

  const commission = new CommissionSystem(memDir, console, affinity)
  const data = await commission.getDailyTasksData('u1', '2026-03-14')
  assert.strictEqual(data.tasks.length, 3, '委托卡片数据应包含 3 个任务')
  assert.strictEqual(data.totalCount, 3, '委托总数应为 3')
}

async function testCommissionBonusApplied() {
  const CommissionSystem = require('../lib/commission')
  const memDir = '/tmp/wf_phase8_commission_bonus'
  if (fs.existsSync(memDir)) fs.rmSync(memDir, { recursive: true, force: true })
  fs.mkdirSync(memDir, { recursive: true })

  let added = 0
  const affinity = {
    async addTickets(_userId, amount) {
      added += amount
      return { newTickets: added }
    },
  }

  const commission = new CommissionSystem(memDir, console, affinity, {
    getCommissionBonus() {
      return 0.5
    },
  })

  commission.data.u1 = {
    date: '2026-03-14',
    tasks: [
      { id: 'gift_1', desc: '送出 1 次礼物', event: 'gift', target: 1, progress: 0, reward: 6, completed: false },
    ],
  }

  const result = await commission.recordProgress('u1', 'gift', 1)
  assert.strictEqual(result.completedTasks[0].actualReward, 9, '委托奖励应叠加 bonus 后发放')
}

async function testFavoritesDataPagination() {
  const FavoritesSystem = require('../lib/favorites')
  const memDir = '/tmp/wf_phase8_favorites'
  if (fs.existsSync(memDir)) fs.rmSync(memDir, { recursive: true, force: true })
  fs.mkdirSync(memDir, { recursive: true })

  const favorites = new FavoritesSystem(memDir, console, { favoritesPerPage: 2 })
  favorites.data.u1 = {
    quotes: ['a quote', 'b quote', 'c quote'],
    lastReceived: '',
  }

  const data = favorites.getFavoritesData('u1', 2)
  assert.strictEqual(data.page, 2, '收藏夹数据应返回正确页码')
  assert.strictEqual(data.totalPages, 2, '收藏夹总页数应正确')
  assert.strictEqual(data.items.length, 1, '第二页应只有一条收藏')
}

async function testShopTempEffectsPersistence() {
  const ShopSystem = require('../lib/shop')
  const memDir = '/tmp/wf_phase8_shop_temp_effects'
  if (fs.existsSync(memDir)) fs.rmSync(memDir, { recursive: true, force: true })
  fs.mkdirSync(memDir, { recursive: true })

  const shop = new ShopSystem(memDir, console)
  await shop.setTempEffect('u1', 'next_affinity_bonus', 2)
  assert.strictEqual(shop.getTempEffect('u1', 'next_affinity_bonus'), 2, '临时效果应可保存')
  const taken = await shop.takeTempEffect('u1', 'next_affinity_bonus')
  assert.strictEqual(taken, 2, '临时效果应可取出')
  assert.strictEqual(shop.getTempEffect('u1', 'next_affinity_bonus'), undefined, '取出后应被清除')
}

async function testOmikujiCarriesText() {
  const GamesSystem = require('../lib/games')
  const games = new GamesSystem(console)
  const result = games.drawOmikuji()
  assert.ok(result.rank, '御神签结果应包含等级')
  assert.ok(result.text, '御神签结果应包含签文正文')
}

async function testRpsCarriesCardFields() {
  const GamesSystem = require('../lib/games')
  const games = new GamesSystem(console)
  const result = games.playRPS('石头')
  assert.ok(result.userChoiceName, '猜拳结果应包含用户出拳名称')
  assert.ok(result.foxChoiceName, '猜拳结果应包含酒狐出拳名称')
  assert.ok(result.flavorLine, '猜拳结果应包含结果文案')
}

async function testSearchWithMetaAndStats() {
  const QuotesLoader = require('../lib/quotes-loader')
  const tmpFile = '/tmp/wf_phase8_quotes.txt'
  fs.writeFileSync(tmpFile, ['[冒险]', '酒狐悄悄话: 苦力怕快跑！', '[日常]', '酒狐悄悄话: 今天晒太阳真舒服。'].join('\n'))

  const loader = new QuotesLoader(tmpFile, console)
  assert.strictEqual(loader.load(), true, '语录文件应成功加载')

  const results = loader.searchWithMeta('苦力怕')
  assert.strictEqual(results.length, 1, '应命中一条带分类的搜索结果')
  assert.strictEqual(results[0].category, '冒险', '搜索结果应携带分类信息')

  const stats = loader.getStatsData()
  assert.strictEqual(stats.quoteCount, 2, '统计数据应返回总语录数')
  assert.strictEqual(stats.categoryCount, 2, '统计数据应返回分类数量')
}

async function testTicketRewardLedgerClaimLimit() {
  const TicketRewardLedger = require('../lib/ticket-reward-ledger')
  const memDir = '/tmp/wf_phase8_ticket_ledger'
  if (fs.existsSync(memDir)) fs.rmSync(memDir, { recursive: true, force: true })
  fs.mkdirSync(memDir, { recursive: true })

  const ledger = new TicketRewardLedger(memDir, console)
  const first = await ledger.claim('u1', '2026-03-14', 'daily_quote', 2, 1)
  const second = await ledger.claim('u1', '2026-03-14', 'daily_quote', 2, 1)

  assert.strictEqual(first.granted, 2, '第一次应成功领取奖励')
  assert.strictEqual(second.granted, 0, '达到每日上限后不应继续领取')
  assert.strictEqual(second.exhausted, true, '达到上限后应标记为 exhausted')
}

async function testShopItemsExpandedAndIconCovered() {
  const items = require('../data/shop_items')
  const { getItemIconSpec, hasItemIconSpec } = require('../lib/card-renderer')

  assert.ok(items.length >= 60, '商店商品数量应扩充到至少 60 件')
  for (const item of items) {
    const spec = getItemIconSpec(item.id)
    assert.ok(spec && spec.kind, `商品 ${item.id} 应有对应的图标规格`)
    assert.strictEqual(hasItemIconSpec(item.id), true, `商品 ${item.id} 应提供专属矢量图标（不可回退为默认 box 图标）`)
  }
}

async function testRareQuotesExist() {
  const QuotesLoader = require('../lib/quotes-loader')
  const loader = new QuotesLoader('/app/WineFox-Daily/data/quotes.txt', console)
  assert.strictEqual(loader.load(), true, '主语录库应成功加载')
  assert.ok(loader.getTotalRareCount() >= 10, '主语录库应至少包含 10 条稀有语录')
}

async function testAffinityReportsActualAdded() {
  const AffinitySystem = require('../lib/affinity')
  const memDir = '/tmp/wf_phase8_affinity_cap'
  if (fs.existsSync(memDir)) fs.rmSync(memDir, { recursive: true, force: true })
  fs.mkdirSync(memDir, { recursive: true })

  const affinity = new AffinitySystem(memDir, console, { dailyAffinityMax: 3 })
  const user = affinity._getUserData('u1')
  user.lastDate = new Date().toISOString().slice(0, 10)
  user.dailyCount = 2

  const result = await affinity.addPoints('u1', 3)
  assert.strictEqual(result.actualAdded, 1, '达到每日上限前应返回真实增加值')
  assert.strictEqual(result.capped, true, '部分被上限截断时应标记 capped')
}

async function main() {
  const tests = [
    ['commission data', testCommissionData],
    ['commission bonus applied', testCommissionBonusApplied],
    ['favorites pagination data', testFavoritesDataPagination],
    ['shop temp effects persistence', testShopTempEffectsPersistence],
    ['omikuji carries text', testOmikujiCarriesText],
    ['rps carries card fields', testRpsCarriesCardFields],
    ['search with meta and stats', testSearchWithMetaAndStats],
    ['ticket reward ledger limit', testTicketRewardLedgerClaimLimit],
    ['shop items expanded and icon covered', testShopItemsExpandedAndIconCovered],
    ['rare quotes exist', testRareQuotesExist],
    ['affinity reports actual added', testAffinityReportsActualAdded],
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
