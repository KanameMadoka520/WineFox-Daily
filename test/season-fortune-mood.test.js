const assert = require('assert')

function testFortuneSeasonEnrichment() {
  const FortuneSystem = require('../lib/fortune')
  const { getSeasonById } = require('../data/season_data')
  const fortune = new FortuneSystem()

  const plain = fortune.getTodayFortuneData('tester')
  const winter = fortune.getTodayFortuneData('tester', { season: getSeasonById('winter') })

  assert.strictEqual(plain.luck, winter.luck, '季节修饰不应改变基础幸运值')
  assert.strictEqual(plain.color, winter.color, '季节修饰不应改变基础幸运色')
  assert.strictEqual(plain.direction, winter.direction, '季节修饰不应改变基础幸运方位')
  assert.strictEqual(winter.seasonName, '冬季', '应附加季节名称')
  assert.ok(winter.seasonHint, '应附加季节签语')
  assert.ok(winter.seasonAdvice, '应附加季节建议')

  const text = fortune.formatFortuneText(winter)
  assert.ok(text.includes('当前季节: 冬季'), '占卜文本应展示当前季节')
  assert.ok(text.includes('季节签语:'), '占卜文本应展示季节签语')
}

function testMoodSeasonBiasAndText() {
  const { buildMoodWeightTable } = require('../lib/mood')
  const MoodSystem = require('../lib/mood')
  const { getSeasonById } = require('../data/season_data')

  const spring = getSeasonById('spring')
  const winter = getSeasonById('winter')
  const springWeights = Object.fromEntries(buildMoodWeightTable('night', spring).map(item => [item.key, item.weight]))
  const winterWeights = Object.fromEntries(buildMoodWeightTable('night', winter).map(item => [item.key, item.weight]))

  assert.ok(winterWeights.clingy > springWeights.clingy, '冬季应比春季更偏向撒娇')
  assert.ok(winterWeights.lazy >= springWeights.lazy, '冬季应不低于春季的慵懒倾向')

  const mood = new MoodSystem({ enableMoodDecorate: true, moodDecorateChance: 0.4 })
  const status = mood.getStatusText({ season: winter })
  assert.ok(status.includes('当前季节: 冬季'), '心情文本应展示当前季节')
  assert.ok(status.includes('季节氛围:'), '心情文本应展示季节氛围说明')
}

async function main() {
  const tests = [
    ['fortune season enrichment', testFortuneSeasonEnrichment],
    ['mood season bias and text', testMoodSeasonBiasAndText],
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
