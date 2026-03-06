/**
 * WineFox-Daily - 酒狐回忆录
 * 查看与酒狐的互动历程和里程碑
 */

const { randomPick, getTodayKey } = require('./utils')
const responseData = require('../data/responses')

class MemoirSystem {
  /**
   * @param {import('./affinity')} affinity
   * @param {import('./achievements')} achievements
   */
  constructor(affinity, achievements) {
    this.affinity = affinity
    this.achievements = achievements
  }

  /**
   * 生成回忆录面板
   * @param {string} userId
   * @returns {string}
   */
  getMemoir(userId) {
    const { firstMeet, milestones } = this.affinity.getMemoir(userId)
    const status = this.affinity.getStatus(userId)
    const stats = this.achievements.getStats(userId)
    const unlockedAt = this.achievements.getUnlockedAt(userId)

    if (!firstMeet && stats.totalInteractions === 0) {
      return '酒狐悄悄话: 我们还没有任何回忆呢...快来和酒狐互动吧！'
    }

    const today = getTodayKey()
    const meetDate = firstMeet || today

    // 计算在一起的天数
    const daysTogether = Math.floor(
      (new Date(today) - new Date(meetDate)) / (1000 * 60 * 60 * 24)
    ) + 1

    const lines = [
      '== 酒狐的回忆录 ==',
      '',
      `初次相遇: ${meetDate}`,
      `在一起已经: ${daysTogether} 天`,
      `总互动次数: ${stats.totalInteractions} 次`,
      `当前好感: Lv${status.level.level} ${status.level.name} (${status.points}点)`,
    ]

    // 汇总里程碑事件
    const events = []

    // 好感升级里程碑
    for (const ms of milestones) {
      if (ms.type === 'levelup') {
        events.push({ date: ms.date, text: `好感升至 Lv${ms.level} ${ms.name}` })
      }
    }

    // 成就解锁里程碑
    for (const [achId, date] of Object.entries(unlockedAt)) {
      events.push({ date, text: `解锁成就: ${this.achievements.getAchievementName(achId)}` })
    }

    // 按日期排序
    events.sort((a, b) => a.date.localeCompare(b.date))

    if (events.length > 0) {
      lines.push('')
      lines.push('-- 里程碑 --')
      // 最多显示15条
      const shown = events.slice(0, 15)
      for (const ev of shown) {
        lines.push(`${ev.date}  ${ev.text}`)
      }
      if (events.length > 15) {
        lines.push(`...还有 ${events.length - 15} 条记录`)
      }
    }

    // 好感等级对应的感言
    const memoirLines = responseData.memoirLines || {}
    const levelLine = memoirLines[status.level.level]
    if (levelLine) {
      lines.push('')
      lines.push(randomPick(Array.isArray(levelLine) ? levelLine : [levelLine]))
    }

    return lines.join('\n')
  }
}

module.exports = MemoirSystem
