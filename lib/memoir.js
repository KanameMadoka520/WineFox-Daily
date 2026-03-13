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
   * 生成回忆录结构化数据
   * @param {string} userId
   */
  getMemoirData(userId) {
    const { firstMeet, milestones } = this.affinity.getMemoir(userId)
    const status = this.affinity.getStatus(userId)
    const stats = this.achievements.getStats(userId)
    const unlockedAt = this.achievements.getUnlockedAt(userId)

    if (!firstMeet && stats.totalInteractions === 0) {
      return null
    }

    const today = getTodayKey()
    const meetDate = firstMeet || today
    const daysTogether = Math.floor(
      (new Date(today) - new Date(meetDate)) / (1000 * 60 * 60 * 24)
    ) + 1

    const events = []

    for (const ms of milestones) {
      if (ms.type === 'levelup') {
        events.push({ date: ms.date, text: `好感升至 Lv${ms.level} ${ms.name}` })
      }
    }

    for (const [achId, date] of Object.entries(unlockedAt)) {
      events.push({ date, text: `解锁成就: ${this.achievements.getAchievementName(achId)}` })
    }

    events.sort((a, b) => a.date.localeCompare(b.date))

    const memoirLines = responseData.memoirLines || {}
    const levelLine = memoirLines[status.level.level]
    const closingLine = levelLine
      ? randomPick(Array.isArray(levelLine) ? levelLine : [levelLine])
      : ''

    return {
      meetDate,
      daysTogether,
      totalInteractions: stats.totalInteractions,
      status,
      events,
      closingLine,
    }
  }

  /**
   * 生成回忆录面板
   * @param {string} userId
   * @returns {string}
   */
  getMemoir(userId) {
    const data = this.getMemoirData(userId)

    if (!data) {
      return '酒狐悄悄话: 我们还没有任何回忆呢...快来和酒狐互动吧！'
    }

    const lines = [
      '== 酒狐的回忆录 ==',
      '',
      `初次相遇: ${data.meetDate}`,
      `在一起已经: ${data.daysTogether} 天`,
      `总互动次数: ${data.totalInteractions} 次`,
      `当前好感: Lv${data.status.level.level} ${data.status.level.name} (${data.status.points}点)`,
    ]

    if (data.events.length > 0) {
      lines.push('')
      lines.push('-- 里程碑 --')
      const shown = data.events.slice(0, 15)
      for (const ev of shown) {
        lines.push(`${ev.date}  ${ev.text}`)
      }
      if (data.events.length > 15) {
        lines.push(`...还有 ${data.events.length - 15} 条记录`)
      }
    }

    if (data.closingLine) {
      lines.push('')
      lines.push(data.closingLine)
    }

    return lines.join('\n')
  }
}

module.exports = MemoirSystem
