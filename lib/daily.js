/**
 * WineFox-Daily - 每日一句模块
 * 每天固定一句语录，同一天同一用户返回相同内容
 * 支持短期内不重复抽取
 */

const fs = require('fs')
const path = require('path')
const { getTodayKey, randomPickAvoidRecent } = require('./utils')
const { withLock } = require('./io-lock')

class DailyQuote {
  /**
   * @param {string} memoryDir - memory 目录路径
   * @param {object} [logger]
   */
  constructor(memoryDir, logger) {
    this.savePath = path.join(memoryDir, 'daily.json')
    this.historyPath = path.join(memoryDir, 'recent_history.json')
    this.logger = logger || console
    /** @type {{ date: string, quote: string, contextKey?: string }} */
    this.daily = { date: '', quote: '', contextKey: '' }
    /** @type {string[]} */
    this.recentHistory = []
    this._load()
  }

// 移除 async 和 withLock，改为同步读取
  _load() {
    try {
      if (fs.existsSync(this.historyPath)) {
        const hContent = fs.readFileSync(this.historyPath, 'utf-8')
        this.recentHistory = JSON.parse(hContent)
      }
    } catch (err) {
      this.logger.warn(`[fox] 每日一句近期历史加载失败: ${err.message}`)
    }

    try {
      if (fs.existsSync(this.savePath)) {
        const dContent = fs.readFileSync(this.savePath, 'utf-8')
        this.daily = JSON.parse(dContent)
      }
    } catch (err) {
      this.logger.warn(`[fox] 每日一句数据加载失败: ${err.message}`)
    }
  }

  async _save() {
    await withLock(this.savePath, async () => {
      try {
        await fs.promises.writeFile(this.savePath, JSON.stringify(this.daily, null, 2), 'utf-8')
      } catch (err) {
        this.logger.error(`[fox] 每日一句数据保存失败: ${err.message}`)
      }
    })
    await withLock(this.historyPath, async () => {
      try {
         await fs.promises.writeFile(this.historyPath, JSON.stringify(this.recentHistory), 'utf-8')
      } catch (err) {
         this.logger.error(`[fox] 每日一句历史数据保存失败: ${err.message}`)
      }
    })
  }

  /**
   * 获取今日语录（同一天返回同一条）
   * @param {string[]} allQuotes - 所有语录
   * @returns {Promise<string>}
   */
  async getTodayQuote(allQuotes, options = {}) {
    const today = getTodayKey()
    const contextKey = String(options.contextKey || '')
    const preferredQuotes = Array.isArray(options.preferredQuotes) ? options.preferredQuotes.filter(Boolean) : []

    if (this.daily.date === today && this.daily.quote && String(this.daily.contextKey || '') === contextKey) {
      return this.daily.quote
    }

    const pool = preferredQuotes.length > 0 ? preferredQuotes : allQuotes
    // 新的一天，抽取新语录（避免近期重复）
    const { picked, updatedHistory } = randomPickAvoidRecent(
      pool,
      this.recentHistory,
      Math.min(100, Math.max(1, Math.floor(pool.length / 3)))
    )

    this.daily = {
      date: today,
      quote: picked || '主人，今天的语录本好像被风吹走了...',
      contextKey,
    }
    this.recentHistory = updatedHistory
    await this._save()

    return this.daily.quote
  }

  /**
   * 获取不重复的随机语录（用于普通 酒狐 指令）
   * @param {string[]} allQuotes - 所有语录
   * @returns {Promise<string>}
   */
  async pickNonRepeat(allQuotes) {
    const { picked, updatedHistory } = randomPickAvoidRecent(
      allQuotes,
      this.recentHistory,
      Math.min(100, Math.floor(allQuotes.length / 3))
    )

    this.recentHistory = updatedHistory
    await this._save()

    return picked || '主人，我找不到笔记本了...'
  }
}

module.exports = DailyQuote
