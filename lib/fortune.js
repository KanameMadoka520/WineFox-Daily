/**
 * WineFox-Daily - 酒狐占卜 / 每日运势
 * 基于日期+userId哈希确定性生成，同一用户同一天结果固定
 */

const { getTodayKey } = require('./utils')
const fortuneData = require('../data/fortune_data')
const GOOD_THINGS = fortuneData.goodThings
const BAD_THINGS = fortuneData.badThings
const LUCKY_COLORS = fortuneData.luckyColors
const LUCKY_DIRECTIONS = fortuneData.luckyDirections
const FORTUNE_COMMENTS = fortuneData.fortuneComments

const SEASON_FORTUNE_HINTS = {
  spring: [
    '春季的运势更适合开新坑、说软话和把计划轻轻推向前面。',
    '这个季节很偏爱“重新开始”，很多卡住的事都会比平时更容易松动一点。',
    '春风会替你吹开一点阻力，适合先迈出第一步，再考虑远处的答案。',
  ],
  summer: [
    '夏季的运势偏热烈，行动力和冲劲都会被放大，但也别忘了给自己留降温时间。',
    '这个季节适合外出、探索和把想做的事做得更干脆一点。',
    '夏天会把情绪和野心一起晒亮，适合出击，也适合在热闹里保持分寸。',
  ],
  autumn: [
    '秋季的运势偏收束，适合整理、复盘、把资源和心情都重新归位。',
    '这个季节更适合慢一点地做决定，很多好结果会从耐心里长出来。',
    '秋风会提醒你把节奏放稳，眼前的积累比一时的热闹更重要。',
  ],
  winter: [
    '冬季的运势偏向内收，适合休整、取暖、陪伴和把消耗降下来一点。',
    '这个季节更适合把体力和情绪都照顾好，稳住就是一种胜利。',
    '冬天会把很多事情放慢，但也会让真正重要的东西显得更清楚。',
  ],
}

/**
 * 简易哈希函数，将字符串转为数字
 * @param {string} str
 * @returns {number}
 */
function simpleHash(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // 转为32位整数
  }
  return Math.abs(hash)
}

/**
 * 基于种子的伪随机数生成（确保同一种子同一结果）
 * @param {number} seed
 * @returns {function} 返回一个 0-1 之间的随机数生成函数
 */
function seededRandom(seed) {
  let s = seed
  return function () {
    s = (s * 1103515245 + 12345) & 0x7fffffff
    return s / 0x7fffffff
  }
}

/**
 * 从数组中基于种子选取
 */
function seededPick(arr, rng) {
  return arr[Math.floor(rng() * arr.length)]
}

class FortuneSystem {
  /**
   * 获取今日运势结构化数据（同一用户同一天结果固定）
   * @param {string} userId
   */
  getTodayFortuneData(userId, options = {}) {
    const dateKey = getTodayKey()
    const seed = simpleHash(`${userId}-${dateKey}-foxfortune`)
    const rng = seededRandom(seed)

    const luck = Math.floor(rng() * 100) + 1
    const color = seededPick(LUCKY_COLORS, rng)
    const direction = seededPick(LUCKY_DIRECTIONS, rng)

    const goodPool = [...GOOD_THINGS]
    const badPool = [...BAD_THINGS]
    const goods = []
    const bads = []

    for (let i = 0; i < 2; i++) {
      const idx = Math.floor(rng() * goodPool.length)
      goods.push(goodPool.splice(idx, 1)[0])
    }

    for (let i = 0; i < 2; i++) {
      const idx = Math.floor(rng() * badPool.length)
      bads.push(badPool.splice(idx, 1)[0])
    }

    const comment = FORTUNE_COMMENTS.find(c => luck >= c.min && luck <= c.max)
    let commentText = '酒狐也看不懂这个运势...'
    if (comment) {
      if (Array.isArray(comment.texts)) {
        commentText = seededPick(comment.texts, rng)
      } else if (comment.text) {
        commentText = comment.text
      }
    }

    const data = {
      dateKey,
      luck,
      color,
      direction,
      goods,
      bads,
      commentText,
    }

    return this.enrichFortuneData(data, options)
  }

  enrichFortuneData(data, options = {}) {
    const season = options.season || null
    if (!season?.id) return { ...data }

    const hints = SEASON_FORTUNE_HINTS[season.id] || []
    const seed = simpleHash(`${data.dateKey || ''}-${season.id}-${data.luck || 0}-seasonfortune`)
    const rng = seededRandom(seed)
    const seasonHint = hints.length ? seededPick(hints, rng) : ''
    const seasonAdvice = Array.isArray(season.recommendations) && season.recommendations.length
      ? seededPick(season.recommendations, rng)
      : ''

    return {
      ...data,
      seasonName: season.name,
      seasonHint,
      seasonAdvice,
    }
  }

  /**
   * 格式化占卜文字输出
   * @param {{ dateKey?: string, luck: number, color: string, direction: string, goods: string[], bads: string[], commentText: string }} data
   * @returns {string}
   */
  formatFortuneText(data) {
    const lines = [
      '== 酒狐占卜 ==',
      '',
      `幸运指数: ${data.luck}/100 ${'*'.repeat(Math.ceil(data.luck / 10))}`,
      `幸运色: ${data.color}`,
      `幸运方位: ${data.direction}`,
      ...(data.seasonName ? [`当前季节: ${data.seasonName}`] : []),
      '',
      `宜: ${data.goods.join('、')}`,
      `忌: ${data.bads.join('、')}`,
      '',
      `酒狐解读: ${data.commentText}`,
      ...(data.seasonHint ? [`季节签语: ${data.seasonHint}`] : []),
      ...(data.seasonAdvice ? [`推荐方向: ${data.seasonAdvice}`] : []),
    ]

    return lines.join('\n')
  }

  /**
   * 获取今日运势（同一用户同一天结果固定）
   * @param {string} userId
   * @returns {string}
   */
  getTodayFortune(userId) {
    return this.formatFortuneText(this.getTodayFortuneData(userId))
  }
}

module.exports = FortuneSystem
