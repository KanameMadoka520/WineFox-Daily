/**
 * WineFox-Daily - 酒狐签到系统
 * 每日签到获取好感奖励，连续签到有加成
 */

const fs = require('fs')
const path = require('path')
const { withLock } = require('./io-lock')
const { randomPick, getTodayKey } = require('./utils')
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
    try {
      if (fs.existsSync(this.savePath)) {
        this.data = JSON.parse(fs.readFileSync(this.savePath, 'utf-8'))
      }
    } catch (err) {
      this.logger.warn(`[fox] 签到数据加载失败: ${err.message}`)
      this.data = {}
    }
  }

  async _save() {
    try {
      await withLock(this.savePath, async () => {
        await fs.promises.writeFile(this.savePath, JSON.stringify(this.data, null, 2), 'utf-8')
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
    const ticketReward = 5 + streakBonus

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
   * 获取签到日历
   * @param {string} userId
   * @returns {string}
   */
  getCalendar(userId) {
    const userData = this._getUserData(userId)
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()
    const today = now.getDate()

    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    // 周一=0, 周日=6
    let startWeekday = firstDay.getDay() - 1
    if (startWeekday < 0) startWeekday = 6

    const monthStr = `${year}年${month + 1}月`
    const lines = [
      `== 酒狐签到日历 (${monthStr}) ==`,
      '',
      '一  二  三  四  五  六  日',
    ]

    // 当月签到的日期集合
    const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}-`
    const checkedDays = new Set()
    for (const d of userData.dates) {
      if (d.startsWith(monthPrefix)) {
        checkedDays.add(parseInt(d.slice(8), 10))
      }
    }

    let row = '    '.repeat(startWeekday)
    for (let d = 1; d <= daysInMonth; d++) {
      const dayStr = String(d).padStart(2, '0')
      if (d === today) {
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

      const weekday = (startWeekday + d - 1) % 7
      if (weekday === 6 || d === daysInMonth) {
        lines.push(row)
        row = ''
      }
    }

    const checkedThisMonth = checkedDays.size
    lines.push('')
    lines.push(`本月已签 ${checkedThisMonth} 天 | 连续 ${userData.streak} 天 | 累计 ${userData.totalDays} 天`)
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
