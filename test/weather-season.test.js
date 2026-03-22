const assert = require('assert')

function testSeasonalWeatherWeights() {
  const { buildWeatherWeightTable } = require('../lib/weather')
  const { getSeasonById } = require('../data/season_data')

  function toMap(items) {
    return Object.fromEntries(items.map(item => [item.weather.type, item.weight]))
  }

  const spring = toMap(buildWeatherWeightTable(getSeasonById('spring')))
  const summer = toMap(buildWeatherWeightTable(getSeasonById('summer')))
  const winter = toMap(buildWeatherWeightTable(getSeasonById('winter')))

  assert.ok(spring.drizzle > summer.drizzle, '春季应比夏季更偏向毛毛雨')
  assert.ok(summer.heatwave > winter.heatwave, '夏季应比冬季更偏向酷暑')
  assert.ok(winter.snow > spring.snow, '冬季应比春季更偏向下雪')
  assert.ok(winter.blizzard > summer.blizzard, '冬季应比夏季更偏向暴风雪')
}

function testWeatherCacheRespectsSeason() {
  const WeatherSystem = require('../lib/weather')
  const weather = new WeatherSystem()
  const calls = []

  weather._generateWeather = function (season) {
    calls.push(season?.id || 'none')
    this.currentWeather = {
      type: season?.id || 'none',
      name: season?.id || 'none',
      description: '',
      foxComment: '',
      moodEffect: 'normal',
    }
  }

  const spring = { id: 'spring' }
  const winter = { id: 'winter' }

  const a = weather.getWeather({ now: '2026-03-21T10:00:00Z', season: spring })
  const b = weather.getWeather({ now: '2026-03-21T10:20:00Z', season: spring })
  const c = weather.getWeather({ now: '2026-03-21T10:30:00Z', season: winter })
  const d = weather.getWeather({ now: '2026-03-21T11:00:00Z', season: winter })

  assert.strictEqual(a.type, 'spring', '首次获取应使用春季上下文')
  assert.strictEqual(b.type, 'spring', '相同时段同季节应复用缓存')
  assert.strictEqual(c.type, 'winter', '同小时切换季节后应刷新天气')
  assert.strictEqual(d.type, 'winter', '跨小时后应再次生成天气')
  assert.deepStrictEqual(calls, ['spring', 'winter', 'winter'], '天气缓存应按小时与季节共同失效')
}

async function main() {
  const tests = [
    ['seasonal weather weights', testSeasonalWeatherWeights],
    ['weather cache respects season', testWeatherCacheRespectsSeason],
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
