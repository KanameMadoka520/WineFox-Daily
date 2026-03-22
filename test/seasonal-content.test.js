const assert = require('assert')
const fs = require('fs')
const path = require('path')

function makeTempDir(name) {
  const dir = path.join('/tmp', name)
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true })
  fs.mkdirSync(dir, { recursive: true })
  return dir
}

async function testDailyQuoteUsesSeasonalContext() {
  const DailyQuote = require('../lib/daily')
  const dir = makeTempDir('wf_daily_seasonal')
  const daily = new DailyQuote(dir, console)

  const springQuote = await daily.getTodayQuote(
    ['普通语录A', '普通语录B'],
    {
      contextKey: 'season:spring',
      preferredQuotes: ['春天的风吹得尾巴痒痒的。'],
    }
  )
  assert.strictEqual(springQuote, '春天的风吹得尾巴痒痒的。', '有季节池时应优先抽季节语录')

  const cachedSpring = await daily.getTodayQuote(
    ['普通语录A', '普通语录B'],
    {
      contextKey: 'season:spring',
      preferredQuotes: ['另一条不会被用到的春季语录'],
    }
  )
  assert.strictEqual(cachedSpring, springQuote, '同一日期和同一季节上下文应复用缓存')

  const winterQuote = await daily.getTodayQuote(
    ['普通语录A', '普通语录B'],
    {
      contextKey: 'season:winter',
      preferredQuotes: ['冬天就该围着火炉发呆。'],
    }
  )
  assert.strictEqual(winterQuote, '冬天就该围着火炉发呆。', '季节上下文变化后应重新生成每日语录')
}

async function testStoryUsesSeasonalBias() {
  const StorySystem = require('../lib/story')
  const SeasonSystem = require('../lib/season')
  const { getSeasonById } = require('../data/season_data')

  const dataDir = makeTempDir('wf_story_seasonal_data')
  const memoryDir = makeTempDir('wf_story_seasonal_memory')
  const storiesPath = path.join(dataDir, 'stories.txt')

  fs.writeFileSync(storiesPath, [
    '[日常]',
    '酒狐日记: 普通的一天，我和主人在田边晒太阳。',
    '',
    '[季节]',
    '酒狐日记: 春天来了，花田像被风轻轻吹醒了一样。',
    '',
    '酒狐日记: 冬天第一场雪落下来的时候，我把自己裹成了一个球。',
    '',
  ].join('\n'))

  const story = new StorySystem(dataDir, memoryDir, console)
  const season = new SeasonSystem(memoryDir, console, { cycleHours: 24 })
  const winter = getSeasonById('winter')

  const originalRandom = Math.random
  Math.random = () => 0
  try {
    const storyData = await story.getRandomStoryData({
      season,
      seasonData: winter,
      preferSeasonChance: 1,
    })
    assert.ok(storyData.text.includes('冬天'), '在冬季权重强制命中时应优先抽到冬季故事')
  } finally {
    Math.random = originalRandom
  }
}

async function main() {
  const tests = [
    ['daily quote uses seasonal context', testDailyQuoteUsesSeasonalContext],
    ['story uses seasonal bias', testStoryUsesSeasonalBias],
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
