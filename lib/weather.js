/**
 * WineFox-Daily - 酒狐天气播报
 * MC 风格的天气描述，基于时间和随机因子生成
 */

const { getTimePeriod, randomPick } = require('./utils')
const WEATHER_TYPES = require('../data/weather_data')

class WeatherSystem {
  constructor() {
    this.currentWeather = null
    this.lastUpdateHour = -1
  }

  /**
   * 获取当前天气（每小时更新一次）
   * @returns {{ type: string, name: string, description: string, foxComment: string, moodEffect: string }}
   */
  getWeather() {
    const hour = new Date().getHours()
    if (hour !== this.lastUpdateHour || !this.currentWeather) {
      this.lastUpdateHour = hour
      this._generateWeather()
    }
    return this.currentWeather
  }

  _generateWeather() {
    // 加权随机
    const pool = []
    for (const w of WEATHER_TYPES) {
      for (let i = 0; i < w.weight; i++) {
        pool.push(w)
      }
    }

    const chosen = randomPick(pool)
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
  getReport() {
    const weather = this.getWeather()
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
