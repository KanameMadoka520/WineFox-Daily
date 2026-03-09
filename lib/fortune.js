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
  getTodayFortuneData(userId) {
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

    return {
      dateKey,
      luck,
      color,
      direction,
      goods,
      bads,
      commentText,
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
      '',
      `宜: ${data.goods.join('、')}`,
      `忌: ${data.bads.join('、')}`,
      '',
      `酒狐解读: ${data.commentText}`,
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
