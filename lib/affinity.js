/**
 * WineFox-Daily - 好感度系统 v2.3
 * 双货币体系：好感度(纯羁绊) + 狐狐券(活动货币)
 * 10级好感等级，含衰减机制和进度播报
 */

const fs = require('fs')
const path = require('path')
const { getTodayKey } = require('./utils')
const { withLock } = require('./io-lock')
const { levelUpLines: LEVEL_UP_LINES } = require('../data/responses')

// 好感度等级定义 (10级)
const AFFINITY_LEVELS = [
  { level: 0, name: '陌生人',   minPoints: 0,    prefix: '那个...你好，' },
  { level: 1, name: '初识',     minPoints: 10,   prefix: '嗯，' },
  { level: 2, name: '点头之交', minPoints: 25,   prefix: '你好呀，' },
  { level: 3, name: '熟人',     minPoints: 50,   prefix: '主人，' },
  { level: 4, name: '好朋友',   minPoints: 90,   prefix: '主人～ ' },
  { level: 5, name: '密友',     minPoints: 140,  prefix: '嘿嘿，主人～ ' },
  { level: 6, name: '挚友',     minPoints: 200,  prefix: '亲爱的主人！' },
  { level: 7, name: '知己',     minPoints: 280,  prefix: '最喜欢的主人！' },
  { level: 8, name: '灵魂伴侣', minPoints: 380,  prefix: '最最最喜欢的主人❤ ' },
  { level: 9, name: '命运之绊', minPoints: 500,  prefix: '❤ 永远在一起 ❤ ' },
]

// 等级→解锁权益映射 (用于进度播报)
const LEVEL_UNLOCKS = {
  0: '基础指令',
  1: '猜拳/猜数字/抽签',
  2: '喂酒/基础商店/酿酒',
  3: '问答/故事分类',
  4: '摸头/挠耳朵/进阶商店',
  5: '拥抱/牵手',
  6: '高级商店/委托系统',
  7: '告白',
  8: '改名/传说商店',
  9: '隐藏成就/专属语录',
}

class AffinitySystem {
  /**
   * @param {string} memoryDir
   * @param {object} [logger]
   * @param {object} [config]
   */
  constructor(memoryDir, logger, config = {}) {
    this.savePath = path.join(memoryDir, 'affinity.json')
    this.logger = logger || console
    this.config = {
      dailyAffinityMax: config.dailyAffinityMax ?? 20,
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
      this.logger.warn(`[fox] 好感度数据加载失败: ${err.message}`)
      this.data = {}
    }
  }

  async _save() {
    try {
      await withLock(this.savePath, async () => {
        await fs.promises.writeFile(this.savePath, JSON.stringify(this.data, null, 2), 'utf-8')
      })
    } catch (err) {
      this.logger.error(`[fox] 好感度数据保存失败: ${err.message}`)
    }
  }

  /**
   * 获取用户数据（含懒迁移）
   */
  _getUserData(userId) {
    if (!this.data[userId]) {
      this.data[userId] = {
        points: 0, lastDate: '', dailyCount: 0,
        customPrefix: null, unlockedRares: [],
        firstMeet: '', milestones: [],
        tickets: 0,
      }
    } else {
      const d = this.data[userId]
      if (d.customPrefix === undefined) d.customPrefix = null
      if (d.unlockedRares === undefined) d.unlockedRares = []
      if (d.firstMeet === undefined) d.firstMeet = ''
      if (d.milestones === undefined) d.milestones = []
      if (d.tickets === undefined) d.tickets = 0
    }
    return this.data[userId]
  }

  // ===== 好感度操作 =====

  /**
   * 增加好感度（每次互动调用，受每日上限限制）
   */
  async addPoints(userId, amount = 1, bonuses = {}) {
    const userData = this._getUserData(userId)
    const today = getTodayKey()

    if (!userData.firstMeet) {
      userData.firstMeet = today
    }

    let decayed = false
    let decayMessage = ''

    if (!bonuses.decayImmune && userData.lastDate && userData.lastDate !== today) {
      const lastDateObj = new Date(userData.lastDate)
      const todayObj = new Date(today)
      const diffTime = Math.abs(todayObj - lastDateObj)
      const daysDiff = Math.floor(diffTime / (1000 * 60 * 60 * 24))

      if (daysDiff >= 3) {
        const penalty = (daysDiff - 2) * 3
        userData.points = Math.max(0, userData.points - penalty)
        decayed = true
        decayMessage = `酒狐悄悄话: 主人${daysDiff}天没理我了，感觉好寂寞... (好感度 -${penalty})`
      }
    }

    if (userData.lastDate !== today) {
      userData.lastDate = today
      userData.dailyCount = 0
    }

    const dailyMax = this.config.dailyAffinityMax + (bonuses.dailyCapBonus || 0)
    if (userData.dailyCount >= dailyMax) {
      return {
        newPoints: userData.points,
        actualAdded: 0,
        capped: true,
        levelUp: false,
        newLevel: this.getLevel(userData.points),
        oldLevel: this.getLevel(userData.points),
        decayed,
        decayMessage,
      }
    }

    const oldLevel = this.getLevel(userData.points)
    const remaining = Math.max(0, dailyMax - userData.dailyCount)
    const actualAdded = Math.max(0, Math.min(amount, remaining))
    const capped = actualAdded < amount
    userData.points += actualAdded
    userData.dailyCount += actualAdded
    const newLevel = this.getLevel(userData.points)

    if (actualAdded > 0 && newLevel.level > oldLevel.level) {
      userData.milestones.push({
        type: 'levelup',
        level: newLevel.level,
        name: newLevel.name,
        date: today,
      })
    }

    this.data[userId] = userData
    await this._save()

    return {
      newPoints: userData.points,
      actualAdded,
      capped,
      levelUp: newLevel.level > oldLevel.level,
      newLevel,
      oldLevel,
      decayed,
      decayMessage,
    }
  }

  /**
   * 增加奖励好感度（不受每日上限限制）
   */
  async addBonusPoints(userId, amount) {
    const userData = this._getUserData(userId)
    userData.points += amount
    await this._save()
  }

  /**
   * 扣除好感度（用于惩罚机制，下限为0）
   * @returns {{ newPoints: number, oldLevel: object, newLevel: object }}
   */
  async removePoints(userId, amount) {
    const userData = this._getUserData(userId)
    const oldLevel = this.getLevel(userData.points)
    userData.points = Math.max(0, userData.points - amount)
    const newLevel = this.getLevel(userData.points)
    await this._save()
    return { newPoints: userData.points, oldLevel, newLevel }
  }

  // ===== 狐狐券操作 =====

  /**
   * 增加狐狐券（无上限）
   * @returns {{ newTickets: number }}
   */
  async addTickets(userId, amount) {
    const userData = this._getUserData(userId)
    userData.tickets += amount
    await this._save()
    return { newTickets: userData.tickets }
  }

  /**
   * 消费狐狐券
   * @returns {{ success: boolean, newTickets: number }}
   */
  async spendTickets(userId, amount) {
    const userData = this._getUserData(userId)
    if (userData.tickets < amount) {
      return { success: false, newTickets: userData.tickets }
    }
    userData.tickets -= amount
    await this._save()
    return { success: true, newTickets: userData.tickets }
  }

  /**
   * 获取狐狐券余额
   */
  getTickets(userId) {
    return this._getUserData(userId).tickets
  }

  // ===== 等级与状态 =====

  getLevel(points) {
    let result = AFFINITY_LEVELS[0]
    for (const lv of AFFINITY_LEVELS) {
      if (points >= lv.minPoints) result = lv
    }
    return result
  }

  getStatus(userId) {
    const userData = this._getUserData(userId)
    const level = this.getLevel(userData.points)
    const nextIdx = AFFINITY_LEVELS.findIndex(l => l.level === level.level) + 1
    const nextLevel = nextIdx < AFFINITY_LEVELS.length ? AFFINITY_LEVELS[nextIdx] : null

    let progress = '已满级 ★'
    if (nextLevel) {
      const current = userData.points - level.minPoints
      const total = nextLevel.minPoints - level.minPoints
      const pct = Math.floor((current / total) * 100)
      const barLen = 10
      const filled = Math.floor((pct / 100) * barLen)
      const bar = '█'.repeat(filled) + '░'.repeat(barLen - filled)
      progress = `[${bar}] ${pct}% (还差${nextLevel.minPoints - userData.points}点)`
    }

    return { points: userData.points, tickets: userData.tickets, level, nextLevel, progress }
  }

  /**
   * 生成进度播报行（每次好感变动后调用）
   * @param {string} userId
   * @param {number} delta - 正数为增加，负数为减少
   * @returns {string}
   */
  formatProgressLine(userId, delta) {
    const userData = this._getUserData(userId)
    const level = this.getLevel(userData.points)
    const nextIdx = AFFINITY_LEVELS.findIndex(l => l.level === level.level) + 1
    const nextLevel = nextIdx < AFFINITY_LEVELS.length ? AFFINITY_LEVELS[nextIdx] : null

    const sign = delta >= 0 ? `+${delta}` : `${delta}`

    if (!nextLevel) {
      return `好感 ${sign} → ${userData.points} ${level.name} ★ 已满级`
    }

    const remaining = nextLevel.minPoints - userData.points
    const unlocks = LEVEL_UNLOCKS[nextLevel.level] || ''
    return `好感 ${sign} → ${userData.points}/${nextLevel.minPoints} ${nextLevel.name} (还需${remaining}) | 解锁: ${unlocks}`
  }

  getLevelUpLine(level) {
    return LEVEL_UP_LINES[level] || null
  }

  getPrefix(userId) {
    const userData = this._getUserData(userId)
    if (userData.customPrefix) return userData.customPrefix
    return this.getLevel(userData.points).prefix
  }

  async setCustomPrefix(userId, prefix) {
    const userData = this._getUserData(userId)
    userData.customPrefix = prefix
    await this._save()
  }

  async unlockRare(userId, quoteString) {
    const userData = this._getUserData(userId)
    if (!userData.unlockedRares.includes(quoteString)) {
      userData.unlockedRares.push(quoteString)
      await this._save()
      return true
    }
    return false
  }

  getUnlockedRares(userId) {
    return this._getUserData(userId).unlockedRares || []
  }

  getMemoir(userId) {
    const userData = this._getUserData(userId)
    return {
      firstMeet: userData.firstMeet || '',
      milestones: userData.milestones || [],
    }
  }
}

module.exports = AffinitySystem
module.exports.AFFINITY_LEVELS = AFFINITY_LEVELS
module.exports.LEVEL_UNLOCKS = LEVEL_UNLOCKS
