/**
 * WineFox-Daily - 工具函数模块
 * 提供全局通用的辅助方法
 */

/**
 * 清洗 Minecraft 颜色代码 (例如 &d, &f, &l 等)
 * @param {string} text - 原始文本
 * @returns {string} 清洗后的文本
 */
function cleanColorCodes(text) {
  return text.replace(/&[0-9a-fk-or]/gi, '')
}

/**
 * 获取当前时段标签
 * @returns {'dawn'|'morning'|'noon'|'afternoon'|'evening'|'night'|'latenight'}
 */
function getTimePeriod() {
  const hour = new Date().getHours()
  if (hour >= 0 && hour < 5) return 'latenight'
  if (hour >= 5 && hour < 7) return 'dawn'
  if (hour >= 7 && hour < 9) return 'morning'
  if (hour >= 9 && hour < 11) return 'morning'
  if (hour >= 11 && hour < 14) return 'noon'
  if (hour >= 14 && hour < 17) return 'afternoon'
  if (hour >= 17 && hour < 20) return 'evening'
  if (hour >= 20 && hour < 23) return 'night'
  return 'latenight' // 23:00-23:59
}

/**
 * 获取今天的日期字符串 (YYYY-MM-DD)
 * @returns {string}
 */
function getTodayKey() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * 获取当前月日 (MM-DD)
 * @returns {string}
 */
function getMonthDay() {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${m}-${day}`
}

/**
 * 从数组中随机取一个元素
 * @param {Array} arr
 * @returns {*}
 */
function randomPick(arr) {
  if (!arr || arr.length === 0) return null
  return arr[Math.floor(Math.random() * arr.length)]
}

/**
 * 从数组中随机取一个元素，尽量避开最近已抽取的
 * @param {Array} arr - 候选数组
 * @param {Array} recentHistory - 最近抽取的记录
 * @param {number} maxHistory - 最多记录多少条
 * @returns {{ picked: *, updatedHistory: Array }}
 */
function randomPickAvoidRecent(arr, recentHistory = [], maxHistory = 50) {
  if (!arr || arr.length === 0) return { picked: null, updatedHistory: recentHistory }

  // 如果候选池比历史记录小，清空历史避免死循环
  if (arr.length <= maxHistory) {
    maxHistory = Math.floor(arr.length / 2)
  }

  const recentSet = new Set(recentHistory)
  const candidates = arr.filter(item => !recentSet.has(item))
  const pool = candidates.length > 0 ? candidates : arr

  const picked = pool[Math.floor(Math.random() * pool.length)]

  const updated = [...recentHistory, picked]
  if (updated.length > maxHistory) {
    updated.splice(0, updated.length - maxHistory)
  }

  return { picked, updatedHistory: updated }
}

/**
 * 概率判定
 * @param {number} chance - 0~1 之间的概率
 * @returns {boolean}
 */
function rollChance(chance) {
  return Math.random() < chance
}

module.exports = {
  cleanColorCodes,
  getTimePeriod,
  getTodayKey,
  getMonthDay,
  randomPick,
  randomPickAvoidRecent,
  rollChance,
}
