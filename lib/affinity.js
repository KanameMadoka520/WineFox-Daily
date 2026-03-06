/**
 * WineFox-Daily - 好感度系统
 * 每次互动积累好感度，不同等级解锁不同称呼和特殊语录
 */

const fs = require('fs')
const path = require('path')
const { getTodayKey } = require('./utils')
const { withLock } = require('./io-lock')
const { levelUpLines: LEVEL_UP_LINES } = require('../data/responses')

// 好感度等级定义
const AFFINITY_LEVELS = [
  { level: 0, name: '陌生人',   minPoints: 0,    prefix: '那个...你好，' },
  { level: 1, name: '初识',     minPoints: 10,   prefix: '嗯，' },
  { level: 2, name: '熟人',     minPoints: 30,   prefix: '主人，' },
  { level: 3, name: '好朋友',   minPoints: 80,   prefix: '主人～ ' },
  { level: 4, name: '挚友',     minPoints: 150,  prefix: '亲爱的主人！' },
  { level: 5, name: '灵魂伴侣', minPoints: 300,  prefix: '最最最喜欢的主人❤ ' },
]

class AffinitySystem {
  /**
   * 解锁稀有语录
   * @param {string} userId
   * @param {string} quoteString
   * @returns {boolean} 是否为新解锁
   */
  async unlockRare(userId, quoteString) {
    const userData = this._getUserData(userId)
    if (!userData.unlockedRares.includes(quoteString)) {
      userData.unlockedRares.push(quoteString)
      await this._save()
      return true
    }
    return false
  }

  /**
   * 获取已解锁的稀有语录
   * @param {string} userId
   * @returns {string[]}
   */
  getUnlockedRares(userId) {
    const userData = this._getUserData(userId)
    return userData.unlockedRares || []
  }

  /**
   * @param {string} memoryDir - memory 目录路径
   * @param {object} [logger]
   * @param {object} [config]
   * @param {number} [config.dailyAffinityMax] - 每日好感度获取上限
   */
  constructor(memoryDir, logger, config = {}) {
    this.savePath = path.join(memoryDir, 'affinity.json')
    this.logger = logger || console
    this.config = {
      dailyAffinityMax: config.dailyAffinityMax ?? 20,
    }
    /** @type {Object<string, { points: number, lastDate: string, dailyCount: number }>} */
    this.data = {}
    this._load()
  }

  // 同步加载方法
  _load() {
    try {
      if (fs.existsSync(this.savePath)) {
        const fileContent = fs.readFileSync(this.savePath, 'utf-8')
        this.data = JSON.parse(fileContent)
      }
    } catch (err) {
      this.logger.warn(`[fox] 好感度数据加载失败: ${err.message}`)
      this.data = {}
    }
  }

  // 异步保存方法
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
   * 获取用户的好感度数据
   * @param {string} userId
   * @returns {{ points: number, lastDate: string, dailyCount: number }}
   */
  _getUserData(userId) {
    if (!this.data[userId]) {
      this.data[userId] = {
        points: 0, lastDate: '', dailyCount: 0,
        customPrefix: null, unlockedRares: [],
        firstMeet: '', milestones: [],
      }
    } else {
      if (this.data[userId].customPrefix === undefined) {
        this.data[userId].customPrefix = null
      }
      if (this.data[userId].unlockedRares === undefined) {
        this.data[userId].unlockedRares = []
      }
      if (this.data[userId].firstMeet === undefined) {
        this.data[userId].firstMeet = ''
      }
      if (this.data[userId].milestones === undefined) {
        this.data[userId].milestones = []
      }
    }
    return this.data[userId]
  }

  /**
   * 增加好感度（每次互动调用）
   * @param {string} userId
   * @param {number} [amount=1]
   * @returns {{ newPoints: number, levelUp: boolean, newLevel: object, oldLevel: object }}
   */
  async addPoints(userId, amount = 1) {
    const userData = this._getUserData(userId)
    const today = getTodayKey()

    // 记录初次见面
    if (!userData.firstMeet) {
      userData.firstMeet = today
    }

    let decayed = false
    let decayMessage = ''

    if (userData.lastDate && userData.lastDate !== today) {
      const lastDateObj = new Date(userData.lastDate)
      const todayObj = new Date(today)
      const diffTime = Math.abs(todayObj - lastDateObj)
      const daysDiff = Math.floor(diffTime / (1000 * 60 * 60 * 24))

      if (daysDiff >= 3) {
        const penalty = (daysDiff - 2) * 5
        userData.points = Math.max(0, userData.points - penalty)
        decayed = true
        decayMessage = "酒狐悄悄话: 主人好几天没理我了，感觉好寂寞... (好感度下降)"
      }
    }

    if (userData.lastDate !== today) {
      userData.lastDate = today
      userData.dailyCount = 0
    }

    const dailyMax = this.config.dailyAffinityMax
    if (userData.dailyCount >= dailyMax) {
      return {
        newPoints: userData.points,
        levelUp: false,
        newLevel: this.getLevel(userData.points),
        oldLevel: this.getLevel(userData.points),
        decayed,
        decayMessage,
      }
    }

    const oldLevel = this.getLevel(userData.points)
    userData.points += amount
    userData.dailyCount += amount
    const newLevel = this.getLevel(userData.points)

    // 记录升级里程碑
    if (newLevel.level > oldLevel.level) {
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
      levelUp: newLevel.level > oldLevel.level,
      newLevel,
      oldLevel,
      decayed,
      decayMessage,
    }
  }

  /**
   * 根据好感度分数获取等级信息
   * @param {number} points
   * @returns {object}
   */
  getLevel(points) {
    let result = AFFINITY_LEVELS[0]
    for (const lv of AFFINITY_LEVELS) {
      if (points >= lv.minPoints) {
        result = lv
      }
    }
    return result
  }

  /**
   * 获取用户的好感度详情
   * @param {string} userId
   * @returns {{ points: number, level: object, nextLevel: object|null, progress: string }}
   */
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

    return { points: userData.points, level, nextLevel, progress }
  }

  /**
   * 获取升级台词
   * @param {number} level
   * @returns {string|null}
   */
  getLevelUpLine(level) {
    return LEVEL_UP_LINES[level] || null
  }

  /**
   * 获取好感度称呼前缀
   * @param {string} userId
   * @returns {string}
   */
  getPrefix(userId) {
    const userData = this._getUserData(userId)
    if (userData.customPrefix) {
      return userData.customPrefix
    }
    const level = this.getLevel(userData.points)
    return level.prefix
  }

  /**
   * 设置自定义前缀
   * @param {string} userId
   * @param {string} prefix
   */
  async setCustomPrefix(userId, prefix) {
    const userData = this._getUserData(userId)
    userData.customPrefix = prefix
    await this._save()
  }

  /**
   * 增加奖励好感度（不受每日上限限制，用于成就奖励等）
   * @param {string} userId
   * @param {number} amount
   */
  async addBonusPoints(userId, amount) {
    const userData = this._getUserData(userId)
    userData.points += amount
    await this._save()
  }

  /**
   * 消费好感度（不降低等级显示，仅扣积分，用于商店购买等）
   * @param {string} userId
   * @param {number} amount
   * @returns {{ success: boolean, newPoints: number }}
   */
  async spendPoints(userId, amount) {
    const userData = this._getUserData(userId)
    if (userData.points < amount) {
      return { success: false, newPoints: userData.points }
    }
    userData.points -= amount
    await this._save()
    return { success: true, newPoints: userData.points }
  }

  /**
   * 获取用户的初次见面日期和里程碑
   * @param {string} userId
   * @returns {{ firstMeet: string, milestones: Array }}
   */
  getMemoir(userId) {
    const userData = this._getUserData(userId)
    return {
      firstMeet: userData.firstMeet || '',
      milestones: userData.milestones || [],
    }
  }
}

module.exports = AffinitySystem