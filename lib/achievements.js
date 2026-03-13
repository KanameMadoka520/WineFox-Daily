/**
 * WineFox-Daily - 酒狐成就系统
 * 基于用户行为解锁称号/成就徽章
 */

const fs = require('fs')
const path = require('path')
const { withLock } = require('./io-lock')
const { getTodayKey } = require('./utils')

// 成就定义（含奖励好感度）
const ACHIEVEMENT_DEFS = [
  // --- 互动 ---
  { id: 'first_meet', name: '初次见面', desc: '第一次使用酒狐指令', reward: 5,
    check: (stats) => stats.totalInteractions >= 1 },
  { id: 'regular', name: '常客', desc: '累计互动 50 次', reward: 10,
    check: (stats) => stats.totalInteractions >= 50 },
  { id: 'drinking_buddy', name: '酒友', desc: '累计互动 100 次', reward: 20,
    check: (stats) => stats.totalInteractions >= 100 },
  { id: 'soulmate', name: '生死之交', desc: '累计互动 500 次', reward: 50,
    check: (stats) => stats.totalInteractions >= 500 },

  // --- 稀有语录 ---
  { id: 'quote_hunter_1', name: '语录收藏家', desc: '收集 5 条稀有语录', reward: 10,
    check: (stats) => stats.rareCount >= 5 },
  { id: 'quote_hunter_2', name: '语录猎人', desc: '收集 10 条稀有语录', reward: 25,
    check: (stats) => stats.rareCount >= 10 },

  // --- 占卜 ---
  { id: 'fortune_teller', name: '占卜师', desc: '使用占卜 7 次', reward: 10,
    check: (stats) => stats.fortuneCount >= 7 },

  // --- 猜拳 ---
  { id: 'rps_beginner', name: '猜拳新手', desc: '猜拳累计赢 5 次', reward: 5,
    check: (stats) => stats.rpsWins >= 5 },
  { id: 'rps_master', name: '猜拳王', desc: '猜拳累计赢 20 次', reward: 20,
    check: (stats) => stats.rpsWins >= 20 },

  // --- 猜数 ---
  { id: 'guess_master', name: '数字大师', desc: '猜数字累计赢 5 次', reward: 15,
    check: (stats) => stats.guessWins >= 5 },

  // --- 连续互动 ---
  { id: 'streak_7', name: '全勤奖(周)', desc: '连续 7 天与酒狐互动', reward: 15,
    check: (stats) => stats.maxStreak >= 7 },
  { id: 'streak_30', name: '全勤奖(月)', desc: '连续 30 天与酒狐互动', reward: 50,
    check: (stats) => stats.maxStreak >= 30 },

  // --- 内容 ---
  { id: 'story_lover', name: '故事迷', desc: '阅读 10 篇酒狐故事', reward: 10,
    check: (stats) => stats.storyCount >= 10 },
  { id: 'collector', name: '收藏达人', desc: '收藏 10 条语录', reward: 10,
    check: (stats) => stats.favoriteCount >= 10 },
  { id: 'generous', name: '慷慨之人', desc: '通过酒狐送礼 10 次', reward: 15,
    check: (stats) => stats.giftCount >= 10 },

  // --- 签到 (v2.2) ---
  { id: 'checkin_7', name: '周签到达人', desc: '累计签到 7 天', reward: 15,
    check: (stats) => (stats.checkinDays || 0) >= 7 },
  { id: 'checkin_30', name: '月签到达人', desc: '累计签到 30 天', reward: 30,
    check: (stats) => (stats.checkinDays || 0) >= 30 },
  { id: 'checkin_100', name: '百日之约', desc: '累计签到 100 天', reward: 100,
    check: (stats) => (stats.checkinDays || 0) >= 100 },

  // --- 酿酒 (v2.2) ---
  { id: 'brewer_1', name: '初次酿酒', desc: '首次酿酒成功', reward: 5,
    check: (stats) => (stats.brewCount || 0) >= 1 },
  { id: 'brewer_10', name: '酿酒师', desc: '酿酒 10 次', reward: 20,
    check: (stats) => (stats.brewCount || 0) >= 10 },
  { id: 'legendary_brew', name: '传说佳酿', desc: '酿出传说品质的酒', reward: 50,
    check: (stats) => (stats.brewLegendary || 0) >= 1 },

  // --- 问答 (v2.2) ---
  { id: 'quiz_10', name: '学霸狐', desc: '答对 10 题', reward: 10,
    check: (stats) => (stats.quizCorrect || 0) >= 10 },
  { id: 'quiz_streak_5', name: '五连对', desc: '连续答对 5 题', reward: 15,
    check: (stats) => (stats.maxQuizStreak || 0) >= 5 },
]

class AchievementSystem {
  /**
   * @param {string} memoryDir
   * @param {object} [logger]
   */
  constructor(memoryDir, logger) {
    this.savePath = path.join(memoryDir, 'achievements.json')
    this.logger = logger || console
    /** @type {Object<string, { unlocked: string[], unlockedAt: object, stats: object }>} */
    this.data = {}
    this._load()
  }

  _load() {
    try {
      if (fs.existsSync(this.savePath)) {
        this.data = JSON.parse(fs.readFileSync(this.savePath, 'utf-8'))
      }
    } catch (err) {
      this.logger.warn(`[fox] 成就数据加载失败: ${err.message}`)
      this.data = {}
    }
  }

  async _save() {
    try {
      await withLock(this.savePath, async () => {
        await fs.promises.writeFile(this.savePath, JSON.stringify(this.data, null, 2), 'utf-8')
      })
    } catch (err) {
      this.logger.error(`[fox] 成就数据保存失败: ${err.message}`)
    }
  }

  _getUserData(userId) {
    if (!this.data[userId]) {
      this.data[userId] = {
        unlocked: [],
        unlockedAt: {},
        stats: {
          totalInteractions: 0,
          rareCount: 0,
          fortuneCount: 0,
          rpsWins: 0,
          rpsTotal: 0,
          guessWins: 0,
          storyCount: 0,
          favoriteCount: 0,
          giftCount: 0,
          maxStreak: 0,
          currentStreak: 0,
          lastActiveDate: '',
          checkinDays: 0,
          brewCount: 0,
          brewLegendary: 0,
          quizCorrect: 0,
          quizStreak: 0,
          maxQuizStreak: 0,
        },
      }
    }
    // 兼容旧数据
    const stats = this.data[userId].stats
    const defaults = {
      totalInteractions: 0, rareCount: 0, fortuneCount: 0, rpsWins: 0,
      rpsTotal: 0, guessWins: 0, storyCount: 0, favoriteCount: 0, giftCount: 0,
      maxStreak: 0, currentStreak: 0, lastActiveDate: '',
      checkinDays: 0, brewCount: 0, brewLegendary: 0,
      quizCorrect: 0, quizStreak: 0, maxQuizStreak: 0,
    }
    for (const [key, def] of Object.entries(defaults)) {
      if (stats[key] === undefined) stats[key] = def
    }
    if (!this.data[userId].unlocked) this.data[userId].unlocked = []
    if (!this.data[userId].unlockedAt) this.data[userId].unlockedAt = {}
    return this.data[userId]
  }

  /**
   * 上报事件并检查新成就
   * @param {string} userId
   * @param {string} eventType
   * @param {number} [value=1]
   * @returns {Promise<{ names: string[], totalReward: number }>} 新解锁的成就
   */
  async recordEvent(userId, eventType, value = 1) {
    const userData = this._getUserData(userId)
    const stats = userData.stats

    // 更新连续互动天数
    const today = getTodayKey()
    if (stats.lastActiveDate !== today) {
      const yesterdayDate = new Date()
      yesterdayDate.setDate(yesterdayDate.getDate() - 1)
      const yy = yesterdayDate.getFullYear()
      const ym = String(yesterdayDate.getMonth() + 1).padStart(2, '0')
      const yd = String(yesterdayDate.getDate()).padStart(2, '0')
      const yesterday = `${yy}-${ym}-${yd}`
      if (stats.lastActiveDate === yesterday) {
        stats.currentStreak += 1
      } else if (stats.lastActiveDate !== today) {
        stats.currentStreak = 1
      }
      stats.lastActiveDate = today
      if (stats.currentStreak > stats.maxStreak) {
        stats.maxStreak = stats.currentStreak
      }
    }

    // 按事件类型更新统计
    switch (eventType) {
      case 'interact': stats.totalInteractions += value; break
      case 'rare_unlock': stats.rareCount += value; break
      case 'fortune': stats.fortuneCount += value; break
      case 'rps_win': stats.rpsWins += value; stats.rpsTotal += value; break
      case 'rps_play': stats.rpsTotal += value; break
      case 'guess_win': stats.guessWins += value; break
      case 'story': stats.storyCount += value; break
      case 'favorite': stats.favoriteCount += value; break
      case 'gift': stats.giftCount += value; break
      case 'checkin': stats.checkinDays += value; break
      case 'brew': stats.brewCount += value; break
      case 'brew_legendary': stats.brewLegendary += value; break
      case 'quiz_correct':
        stats.quizCorrect += value
        stats.quizStreak += value
        if (stats.quizStreak > stats.maxQuizStreak) {
          stats.maxQuizStreak = stats.quizStreak
        }
        break
      case 'quiz_wrong':
        stats.quizStreak = 0
        break
    }

    // 检查新成就
    const newAchievements = []
    let totalReward = 0
    for (const def of ACHIEVEMENT_DEFS) {
      if (!userData.unlocked.includes(def.id) && def.check(stats)) {
        userData.unlocked.push(def.id)
        userData.unlockedAt[def.id] = today
        newAchievements.push(def.name)
        totalReward += (def.reward || 0)
      }
    }

    await this._save()
    return { names: newAchievements, totalReward }
  }

  /**
   * 获取用户成就结构化数据
   * @param {string} userId
   * @returns {{ total: number, unlockedCount: number, items: Array<{ id: string, name: string, desc: string, reward: number, unlocked: boolean }>, allUnlocked: boolean }}
   */
  getPanelData(userId) {
    const userData = this._getUserData(userId)
    const unlocked = userData.unlocked
    const total = ACHIEVEMENT_DEFS.length

    return {
      total,
      unlockedCount: unlocked.length,
      items: ACHIEVEMENT_DEFS.map(def => ({
        id: def.id,
        name: def.name,
        desc: def.desc,
        reward: def.reward || 0,
        unlocked: unlocked.includes(def.id),
      })),
      allUnlocked: unlocked.length === total,
    }
  }

  /**
   * 获取用户成就面板
   * @param {string} userId
   * @returns {string}
   */
  getPanel(userId) {
    const data = this.getPanelData(userId)

    const lines = [
      '== 酒狐成就 ==',
      '',
      `已解锁: ${data.unlockedCount}/${data.total}`,
      '',
    ]

    for (const item of data.items) {
      const mark = item.unlocked ? '[v]' : '[ ]'
      const rewardTag = item.reward ? ` (+${item.reward}好感)` : ''
      lines.push(`${mark} ${item.name} - ${item.desc}${item.unlocked ? '' : rewardTag}`)
    }

    if (data.allUnlocked) {
      lines.push('')
      lines.push('恭喜主人！已经解锁了全部成就！酒狐好骄傲！')
    }

    return lines.join('\n')
  }

  /**
   * 获取用户统计数据
   * @param {string} userId
   * @returns {object}
   */
  getStats(userId) {
    return this._getUserData(userId).stats
  }

  /**
   * 获取解锁时间记录
   * @param {string} userId
   * @returns {object}
   */
  getUnlockedAt(userId) {
    return this._getUserData(userId).unlockedAt || {}
  }
  /**
   * 获取成就显示名称
   * @param {string} achId
   * @returns {string}
   */
  getAchievementName(achId) {
    const def = ACHIEVEMENT_DEFS.find(d => d.id === achId)
    return def ? def.name : achId
  }
}

module.exports = AchievementSystem
