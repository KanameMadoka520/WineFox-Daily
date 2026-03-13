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

async function main() {
  const tests = [
    ['commission data', testCommissionData],
    ['favorites pagination data', testFavoritesDataPagination],
    ['omikuji carries text', testOmikujiCarriesText],
    ['rps carries card fields', testRpsCarriesCardFields],
    ['search with meta and stats', testSearchWithMetaAndStats],
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
