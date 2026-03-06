/**
 * WineFox-Daily - 酒狐心情系统
 * 酒狐有自己的心情状态，受时间、互动频率、随机事件影响
 * 心情会影响语录前缀/后缀
 */

const { getTimePeriod, randomPick } = require('./utils')
const MOOD_DECORATORS = require('../data/mood_decorators')

// 心情定义
const MOODS = {
  happy:    { name: '开心',   emoji: '(* ^ ω ^)',  weight: 20 },
  normal:   { name: '普通',   emoji: '( ˘ω˘ )',    weight: 30 },
  lazy:     { name: '慵懒',   emoji: '(  ̄ω ̄ )',   weight: 15 },
  tipsy:    { name: '微醺',   emoji: '(* ˘ ³˘ )',  weight: 10 },
  tsundere: { name: '傲娇',   emoji: '( ˙꒳˙ )',    weight: 15 },
  clingy:   { name: '撒娇',   emoji: '(≧ω≦)',      weight: 10 },
}

// 时间对心情的影响
const TIME_MOOD_BIAS = {
  latenight: { lazy: 40, tipsy: 20 },
  dawn:      { lazy: 30, normal: 20 },
  morning:   { happy: 30, normal: 20 },
  noon:      { lazy: 15, happy: 20 },
  afternoon: { normal: 25, happy: 15 },
  evening:   { tipsy: 20, clingy: 15 },
  night:     { tipsy: 25, clingy: 20, lazy: 15 },
}

class MoodSystem {
  /**
   * @param {object} [config]
   * @param {number} [config.moodDecorateChance] - 心情修饰概率 (0~1)
   * @param {boolean} [config.enableMoodDecorate] - 是否启用心情修饰语录
   */
  constructor(config = {}) {
    this.config = {
      moodDecorateChance: config.moodDecorateChance ?? 0.4,
      enableMoodDecorate: config.enableMoodDecorate ?? true,
    }
    this.currentMood = 'normal'
    this.lastUpdateHour = -1
    this._updateMood()
  }

  /**
   * 根据时间和随机因子更新心情
   * 每小时最多更新一次
   */
  _updateMood() {
    const now = new Date()
    const hour = now.getHours()

    if (hour === this.lastUpdateHour) return
    this.lastUpdateHour = hour

    const period = getTimePeriod()
    const timeBias = TIME_MOOD_BIAS[period] || {}

    // 构建加权池
    const weightedPool = []
    for (const [mood, config] of Object.entries(MOODS)) {
      const baseWeight = config.weight
      const bonus = timeBias[mood] || 0
      const totalWeight = baseWeight + bonus
      for (let i = 0; i < totalWeight; i++) {
        weightedPool.push(mood)
      }
    }

    this.currentMood = randomPick(weightedPool) || 'normal'
  }

  /**
   * 互动时可能触发心情变化
   * @param {string} eventType - 'interact' | 'poke' | 'game_win' | 'game_lose'
   */
  onEvent(eventType) {
    const shifts = {
      interact: { happy: 0.3, clingy: 0.15 },
      poke:     { tsundere: 0.3, clingy: 0.2 },
      game_win: { happy: 0.5 },
      game_lose:{ tsundere: 0.3 },
      tipsy:    { tipsy: 1.0 },
      happy:    { happy: 1.0 },
      lazy:     { lazy: 1.0 },
    }

    const shift = shifts[eventType]
    if (!shift) return

    for (const [mood, chance] of Object.entries(shift)) {
      if (Math.random() < chance) {
        this.currentMood = mood
        return
      }
    }
  }

  /**
   * 获取当前心情
   * @returns {{ key: string, name: string, emoji: string }}
   */
  getMood() {
    this._updateMood()
    const mood = MOODS[this.currentMood]
    return {
      key: this.currentMood,
      name: mood.name,
      emoji: mood.emoji,
    }
  }

  /**
   * 用心情修饰一条语录
   * @param {string} quote
   * @returns {string}
   */
  decorateQuote(quote) {
    if (!this.config.enableMoodDecorate) return quote
    this._updateMood()
    const dec = MOOD_DECORATORS[this.currentMood]
    if (!dec) return quote

    const chance = this.config.moodDecorateChance
    let result = quote
    if (dec.prefix.length > 0 && Math.random() < chance) {
      result = randomPick(dec.prefix) + ' ' + result
    }
    if (dec.suffix.length > 0 && Math.random() < chance) {
      result = result + ' ' + randomPick(dec.suffix)
    }
    return result
  }

  /**
   * 获取心情面板文字
   * @returns {string}
   */
  getStatusText() {
    this._updateMood()
    const mood = MOODS[this.currentMood]
    const dec = MOOD_DECORATORS[this.currentMood]

    const lines = [
      '== 酒狐心情 ==',
      '',
      `当前心情: ${mood.name} ${mood.emoji}`,
    ]

    const flavorTexts = {
      happy:    '酒狐现在很开心，尾巴摇个不停！',
      normal:   '酒狐现在心情平静，在窝里舒服地待着。',
      lazy:     '酒狐有点犯困，蜷在角落打瞌睡...',
      tipsy:    '酒狐刚偷喝了一口酒，脸红红的...',
      tsundere: '酒狐现在有点别扭，嘴上说不要其实很想被关注。',
      clingy:   '酒狐现在特别想要主人的陪伴，一直蹭过来...',
    }

    lines.push('')
    lines.push(flavorTexts[this.currentMood] || '')

    return lines.join('\n')
  }
}

module.exports = MoodSystem
