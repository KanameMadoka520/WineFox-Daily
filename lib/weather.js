/**
 * WineFox-Daily - 酒狐天气播报
 * MC 风格的天气描述，基于时间和随机因子生成
 */

const { getTimePeriod, randomPick } = require('./utils')
const WEATHER_TYPES = require('../data/weather_data')

function resolveWeatherWeight(weather, season) {
  const baseWeight = Math.max(0, Number(weather?.weight) || 0)
  const modifier = season?.weatherWeights?.[weather?.type]
  const factor = modifier == null ? 1 : Math.max(0, Number(modifier) || 0)
  return baseWeight * factor
}

function buildWeatherWeightTable(season) {
  return WEATHER_TYPES
    .map((weather) => ({
      weather,
      weight: resolveWeatherWeight(weather, season),
    }))
    .filter(item => item.weight > 0)
}

function pickWeatherEntry(season, randomValue = Math.random()) {
  const weighted = buildWeatherWeightTable(season)
  if (!weighted.length) return null

  const totalWeight = weighted.reduce((sum, item) => sum + item.weight, 0)
  let cursor = Math.max(0, Math.min(0.999999999, randomValue)) * totalWeight

  for (const item of weighted) {
    cursor -= item.weight
    if (cursor <= 0) return item.weather
  }

  return weighted[weighted.length - 1].weather
}

class WeatherSystem {
  constructor() {
    this.currentWeather = null
    this.lastContextKey = ''
  }

  /**
   * 获取当前天气（每小时更新一次）
   * @returns {{ type: string, name: string, description: string, foxComment: string, moodEffect: string }}
   */
  getWeather(options = {}) {
    const now = options.now == null ? new Date() : new Date(options.now)
    const season = options.season || null
    const hour = now.getHours()
    const seasonId = season?.id || 'none'
    const contextKey = `${hour}:${seasonId}`

    if (contextKey !== this.lastContextKey || !this.currentWeather) {
      this.lastContextKey = contextKey
      this._generateWeather(season)
    }
    return this.currentWeather
  }

  _generateWeather(season) {
    const chosen = pickWeatherEntry(season) || randomPick(WEATHER_TYPES)
    this.currentWeather = {
      type: chosen.type,
      name: chosen.name,
      description: randomPick(chosen.descriptions),
      foxComment: randomPick(chosen.foxComment),
      moodEffect: chosen.moodEffect,
    }
  }

  /**
   * 获取天气播报文字
   * @returns {string}
   */
  getReport(options = {}) {
    const now = options.now == null ? new Date() : new Date(options.now)
    const weather = this.getWeather(options)
    const period = getTimePeriod()
    const periodNames = {
      latenight: '深夜', dawn: '清晨', morning: '上午',
      noon: '中午', afternoon: '下午', evening: '傍晚', night: '夜晚',
    }

    const lines = [
      '== 酒狐天气播报 ==',
      '',
      `时段: ${periodNames[period] || '未知'}`,
      `天气: ${weather.name}`,
      '',
      weather.description,
      '',
      `酒狐: ${weather.foxComment}`,
    ]

    return lines.join('\n')
  }
}

module.exports = WeatherSystem
module.exports.buildWeatherWeightTable = buildWeatherWeightTable
module.exports.pickWeatherEntry = pickWeatherEntry
