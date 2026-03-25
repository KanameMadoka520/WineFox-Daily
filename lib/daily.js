/**
 * WineFox-Daily - 每日一句模块
 * 每天固定一句语录，同一天同一用户返回相同内容
 * 支持短期内不重复抽取
 */

const fs = require('fs')
const path = require('path')
const { getTodayKey, randomPickAvoidRecent } = require('./utils')
const { withLock } = require('./io-lock')
const { readJsonSafe, writeJsonAtomic } = require('./safe-json')

class DailyQuote {
  /**
   * @param {string} memoryDir - memory 目录路径
   * @param {object} [logger]
   * @param {{ ioDebounceMs?: number }} [options]
   */
  constructor(memoryDir, logger, options = {}) {
    this.savePath = path.join(memoryDir, 'daily.json')
    this.historyPath = path.join(memoryDir, 'recent_history.json')
    this.logger = logger || console
    this.ioDebounceMs = Number.isFinite(options.ioDebounceMs) ? Math.max(0, Math.floor(options.ioDebounceMs)) : 0
    this._historySaveTimer = null
    /** @type {{ date: string, quote: string, contextKey?: string }} */
    this.daily = { date: '', quote: '', contextKey: '' }
    /** @type {string[]} */
    this.recentHistory = []
    this._load()
  }

// 移除 async 和 withLock，改为同步读取
  _load() {
    const historyResult = readJsonSafe(this.historyPath, [], {
      logger: this.logger,
      label: '每日一句近期历史',
    })
    this.recentHistory = Array.isArray(historyResult.data) ? historyResult.data : []

    const dailyResult = readJsonSafe(this.savePath, { date: '', quote: '', contextKey: '' }, {
      logger: this.logger,
      label: '每日一句数据',
    })
    const parsedDaily = dailyResult.data && typeof dailyResult.data === 'object' ? dailyResult.data : {}
    this.daily = {
      date: String(parsedDaily.date || ''),
      quote: String(parsedDaily.quote || ''),
      contextKey: String(parsedDaily.contextKey || ''),
    }
  }

  async _saveDailyNow() {
    await withLock(this.savePath, async () => {
      try {
        await writeJsonAtomic(this.savePath, this.daily, { pretty: 2 })
      } catch (err) {
        this.logger.error(`[fox] 每日一句数据保存失败: ${err.message}`)
      }
    })
  }

  async _saveHistoryNow() {
    await withLock(this.historyPath, async () => {
      try {
        await writeJsonAtomic(this.historyPath, this.recentHistory, { pretty: 0 })
      } catch (err) {
        this.logger.error(`[fox] 每日一句历史数据保存失败: ${err.message}`)
      }
    })
  }

  _scheduleHistorySave() {
    if (this.ioDebounceMs <= 0) {
      return this._saveHistoryNow()
    }

    if (this._historySaveTimer) {
      clearTimeout(this._historySaveTimer)
    }

    this._historySaveTimer = setTimeout(() => {
      this._historySaveTimer = null
      this._saveHistoryNow().catch((err) => {
        this.logger.error(`[fox] 每日一句历史数据保存失败: ${err?.message || err}`)
      })
    }, this.ioDebounceMs)

    return Promise.resolve()
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
    await this._saveDailyNow()
    await this._scheduleHistorySave()

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
    await this._scheduleHistorySave()

    return picked || '主人，我找不到笔记本了...'
  }
}

module.exports = DailyQuote
