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
   * 获取今日运势（同一用户同一天结果固定）
   * @param {string} userId
   * @returns {string}
   */
  getTodayFortune(userId) {
    const today = getTodayKey()
    const seed = simpleHash(`${userId}-${today}-foxfortune`)
    const rng = seededRandom(seed)

    const luck = Math.floor(rng() * 100) + 1
    const color = seededPick(LUCKY_COLORS, rng)
    const direction = seededPick(LUCKY_DIRECTIONS, rng)

    // 选2个宜、2个忌（不重复）
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
      // 兼容旧版 text(字符串) 和新版 texts(数组)
      if (Array.isArray(comment.texts)) {
        commentText = seededPick(comment.texts, rng)
      } else if (comment.text) {
        commentText = comment.text
      }
    }

    const lines = [
      '== 酒狐占卜 ==',
      '',
      `幸运指数: ${luck}/100 ${'*'.repeat(Math.ceil(luck / 10))}`,
      `幸运色: ${color}`,
      `幸运方位: ${direction}`,
      '',
      `宜: ${goods.join('、')}`,
      `忌: ${bads.join('、')}`,
      '',
      `酒狐解读: ${commentText}`,
    ]

    return lines.join('\n')
  }
}

module.exports = FortuneSystem
