/**
 * WineFox-Daily - 酒狐签到系统
 * 每日签到获取好感奖励，连续签到有加成
 */

const fs = require('fs')
const path = require('path')
const { withLock } = require('./io-lock')
const { randomPick, getTodayKey } = require('./utils')
const { readJsonSafe, writeJsonAtomic } = require('./safe-json')
const responseData = require('../data/responses')

class CheckinSystem {
  /**
   * @param {string} memoryDir
   * @param {object} [logger]
   * @param {object} [config]
   */
  constructor(memoryDir, logger, config = {}) {
    this.savePath = path.join(memoryDir, 'checkin.json')
    this.logger = logger || console
    this.config = {
      baseReward: config.checkinBaseReward ?? 3,
      streakCap: config.checkinStreakCap ?? 7,
    }
    this.data = {}
    this._load()
  }

  _load() {
    const result = readJsonSafe(this.savePath, {}, {
      logger: this.logger,
      label: '签到数据',
    })
    this.data = result.data || {}
  }

  async _save() {
    try {
      await withLock(this.savePath, async () => {
        await writeJsonAtomic(this.savePath, this.data, { pretty: 2 })
      })
    } catch (err) {
      this.logger.error(`[fox] 签到数据保存失败: ${err.message}`)
    }
  }

  _getUserData(userId) {
    if (!this.data[userId]) {
      this.data[userId] = {
        dates: [],
        streak: 0,
        maxStreak: 0,
        totalDays: 0,
      }
    }
    return this.data[userId]
  }

  /**
   * 执行签到
   * @param {string} userId
   * @returns {Promise<{ success: boolean, message: string, reward: number, ticketReward: number, streak: number }>}
   */
  async checkin(userId) {
    const userData = this._getUserData(userId)
    const today = getTodayKey()

    if (userData.dates.includes(today)) {
      const line = randomPick(responseData.checkinAlready || [
        '酒狐悄悄话: 主人今天已经签到过了哦~明天再来吧！',
      ])
      return { success: false, message: line, reward: 0, ticketReward: 0, streak: userData.streak || 0 }
    }

    // 计算连续签到
    const yesterdayDate = new Date()
    yesterdayDate.setDate(yesterdayDate.getDate() - 1)
    const yy = yesterdayDate.getFullYear()
    const ym = String(yesterdayDate.getMonth() + 1).padStart(2, '0')
    const yd = String(yesterdayDate.getDate()).padStart(2, '0')
    const yesterday = `${yy}-${ym}-${yd}`
    if (userData.dates.includes(yesterday)) {
      userData.streak += 1
    } else {
      userData.streak = 1
    }

    userData.dates.push(today)
    userData.totalDays += 1
    if (userData.streak > userData.maxStreak) {
      userData.maxStreak = userData.streak
    }

    // 计算奖励
    const streakBonus = Math.min(userData.streak - 1, this.config.streakCap - 1)
    let reward = this.config.baseReward + streakBonus
    const ticketReward = 8 + streakBonus

    // 里程碑额外奖励
    let milestoneMsg = ''
    if (userData.streak === 7) {
      reward += 10
      milestoneMsg = '\n连续签到 7 天！额外获得 10 好感度！'
    } else if (userData.streak === 30) {
      reward += 30
      milestoneMsg = '\n连续签到 30 天！额外获得 30 好感度！'
    }

    // 只保留最近90天的签到记录
    if (userData.dates.length > 90) {
      userData.dates = userData.dates.slice(-90)
    }

    await this._save()

    const line = randomPick(responseData.checkinSuccess || [
      '酒狐悄悄话: 签到成功！今天也要元气满满哦~',
    ])

    const lines = [
      line,
      '',
      `签到奖励: +${reward} 好感度`,
      `狐狐券奖励: +${ticketReward}`,
      `连续签到: ${userData.streak} 天`,
      `累计签到: ${userData.totalDays} 天`,
    ]

    if (streakBonus > 0) {
      lines.push(`连续加成: +${streakBonus}`)
    }
    if (milestoneMsg) {
      lines.push(milestoneMsg)
    }

    return { success: true, message: lines.join('\n'), reward, ticketReward, streak: userData.streak }
  }

  /**
   * 获取签到日历结构化数据
   * @param {string} userId
   * @returns {{ year: number, month: number, monthLabel: string, today: number, startWeekday: number, daysInMonth: number, checkedDays: number[], checkedThisMonth: number, streak: number, totalDays: number, weekdays: string[], cells: Array<{ day: number, state: string }> }}
   */
  getCalendarData(userId) {
    const userData = this._getUserData(userId)
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()
    const today = now.getDate()

    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    let startWeekday = firstDay.getDay() - 1
    if (startWeekday < 0) startWeekday = 6

    const monthLabel = `${year}年${month + 1}月`
    const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}-`
    const checkedDaysSet = new Set()

    for (const d of userData.dates) {
      if (d.startsWith(monthPrefix)) {
        checkedDaysSet.add(parseInt(d.slice(8), 10))
      }
    }

    const checkedDays = [...checkedDaysSet].sort((a, b) => a - b)
    const cells = []
    for (let day = 1; day <= daysInMonth; day++) {
      let state = 'normal'
      if (day === today) {
        state = checkedDaysSet.has(day) ? 'today-checked' : 'today'
      } else if (checkedDaysSet.has(day)) {
        state = 'checked'
      }
      cells.push({ day, state })
    }

    return {
      year,
      month: month + 1,
      monthLabel,
      today,
      startWeekday,
      daysInMonth,
      checkedDays,
      checkedThisMonth: checkedDays.length,
      streak: userData.streak,
      totalDays: userData.totalDays,
      weekdays: ['一', '二', '三', '四', '五', '六', '日'],
      cells,
    }
  }

  /**
   * 获取签到日历
   * @param {string} userId
   * @returns {string}
   */
  getCalendar(userId) {
    const data = this.getCalendarData(userId)
    const checkedDays = new Set(data.checkedDays)
    const lines = [
      `== 酒狐签到日历 (${data.monthLabel}) ==`,
      '',
      data.weekdays.join('  '),
    ]

    let row = '    '.repeat(data.startWeekday)
    for (let d = 1; d <= data.daysInMonth; d++) {
      const dayStr = String(d).padStart(2, '0')
      if (d === data.today) {
        if (checkedDays.has(d)) {
          row += `[${dayStr}]`
        } else {
          row += ` ${dayStr}*`
        }
      } else if (checkedDays.has(d)) {
        row += ` ${dayStr}+`
      } else {
        row += ` ${dayStr} `
      }

      const weekday = (data.startWeekday + d - 1) % 7
      if (weekday === 6 || d === data.daysInMonth) {
        lines.push(row)
        row = ''
      }
    }

    lines.push('')
    lines.push(`本月已签 ${data.checkedThisMonth} 天 | 连续 ${data.streak} 天 | 累计 ${data.totalDays} 天`)
    lines.push('(+已签到 *今天 []今天已签)')

    return lines.join('\n')
  }

  /**
   * 获取用户签到数据
   * @param {string} userId
   * @returns {object}
   */
  getData(userId) {
    return this._getUserData(userId)
  }
}

module.exports = CheckinSystem
