const fs = require('fs')
const path = require('path')
const { randomPick } = require('./utils')
const { SEASONS, resolveSeason } = require('../data/season_data')
const { readJsonSafe, writeJsonAtomicSync } = require('./safe-json')

function formatRemaining(ms) {
  const totalMinutes = Math.max(0, Math.ceil(ms / 60000))
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${hours}小时${String(minutes).padStart(2, '0')}分`
}

function dedupeTexts(items) {
  const result = []
  const seen = new Set()

  for (const item of items || []) {
    const text = String(item || '')
    if (!text || seen.has(text)) continue
    seen.add(text)
    result.push(text)
  }

  return result
}

class SeasonSystem {
  constructor(memoryDir, logger, options = {}) {
    this.logger = logger || console
    this.savePath = path.join(memoryDir, 'season-cycle.json')
    this.defaultCycleHours = Math.max(1, Number(options.cycleHours) || 24)
    this.cycleHours = this.defaultCycleHours
    this.cycleMs = this.cycleHours * 60 * 60 * 1000
    this.data = {
      currentIndex: 0,
      changedAt: Date.now(),
      manualSeason: false,
      manualCycle: false,
    }
    this._load()
  }

  _load() {
    const result = readJsonSafe(this.savePath, {}, {
      logger: this.logger,
      label: '季节循环配置',
    })
    const parsed = result.data && typeof result.data === 'object' ? result.data : {}

    if (
      Number.isInteger(parsed?.currentIndex) &&
      parsed.currentIndex >= 0 &&
      parsed.currentIndex < SEASONS.length &&
      Number.isFinite(parsed?.changedAt)
    ) {
      this.data.currentIndex = parsed.currentIndex
      this.data.changedAt = parsed.changedAt
    }
    if (typeof parsed?.manualSeason === 'boolean') {
      this.data.manualSeason = parsed.manualSeason
    }
    if (typeof parsed?.manualCycle === 'boolean') {
      this.data.manualCycle = parsed.manualCycle
    }
    if (Number.isFinite(parsed?.cycleHours) && parsed.cycleHours >= 1) {
      this.cycleHours = Math.max(1, Number(parsed.cycleHours))
      this.cycleMs = this.cycleHours * 60 * 60 * 1000
    }
  }

  _save() {
    try {
      writeJsonAtomicSync(this.savePath, {
        ...this.data,
        cycleHours: this.cycleHours,
        defaultCycleHours: this.defaultCycleHours,
      }, { pretty: 2 })
    } catch (err) {
      this.logger.warn(`[fox] 季节循环配置保存失败: ${err.message}`)
    }
  }

  _advance(now = Date.now()) {
    const elapsed = Math.max(0, now - this.data.changedAt)
    const steps = Math.floor(elapsed / this.cycleMs)
    if (steps <= 0) return

    this.data.currentIndex = (this.data.currentIndex + steps) % SEASONS.length
    this.data.changedAt += steps * this.cycleMs
    if (this.data.manualSeason) {
      this.data.manualSeason = false
    }
    this._save()
  }

  getSeason(now = Date.now()) {
    this._advance(now)
    const base = SEASONS[this.data.currentIndex] || SEASONS[0]
    const elapsed = Math.max(0, now - this.data.changedAt)
    const remainingMs = Math.max(0, this.cycleMs - elapsed)
    return {
      ...base,
      description: randomPick(base.descriptions) || '',
      foxComment: randomPick(base.foxComment) || '',
      recommendations: Array.isArray(base.recommendations) ? base.recommendations.slice() : [],
      index: this.data.currentIndex,
      cycleHours: this.cycleHours,
      defaultCycleHours: this.defaultCycleHours,
      changedAt: this.data.changedAt,
      nextChangeAt: this.data.changedAt + this.cycleMs,
      remainingMs,
      remainingLabel: formatRemaining(remainingMs),
      isManualSeason: !!this.data.manualSeason,
      isManualCycle: !!this.data.manualCycle,
      isManualOverride: !!this.data.manualSeason || !!this.data.manualCycle,
    }
  }

  setSeason(input, now = Date.now()) {
    const target = resolveSeason(input)
    if (!target) {
      return { success: false, season: null }
    }

    const index = SEASONS.findIndex(item => item.id === target.id)
    if (index < 0) {
      return { success: false, season: null }
    }

    this.data.currentIndex = index
    this.data.changedAt = now
    this.data.manualSeason = true
    this._save()

    return {
      success: true,
      season: this.getSeason(now),
    }
  }

  setCycleHours(hours, now = Date.now()) {
    const parsed = Number(hours)
    if (!Number.isFinite(parsed) || parsed < 1) {
      return { success: false, season: null }
    }
    const nextHours = Math.max(1, parsed)

    this._advance(now)
    this.cycleHours = nextHours
    this.cycleMs = this.cycleHours * 60 * 60 * 1000
    this.data.changedAt = now
    this.data.manualCycle = nextHours !== this.defaultCycleHours
    this._save()

    return {
      success: true,
      season: this.getSeason(now),
    }
  }

  restoreAuto(now = Date.now()) {
    this._advance(now)
    this.cycleHours = this.defaultCycleHours
    this.cycleMs = this.cycleHours * 60 * 60 * 1000
    this.data.changedAt = now
    this.data.manualSeason = false
    this.data.manualCycle = false
    this._save()

    return {
      success: true,
      season: this.getSeason(now),
    }
  }

  matchTextsByKeywords(items, options = {}) {
    const season = options.season || this.getSeason()
    const keywords = Array.isArray(season?.keywords) ? season.keywords : []
    const texts = Array.isArray(items) ? items : []
    if (!keywords.length) return []

    return dedupeTexts(texts.filter(text => keywords.some(keyword => String(text).includes(keyword))))
  }

  getSeasonalQuotePool(quotesLoader, options = {}) {
    if (!quotesLoader?.all?.length) return []

    const season = options.season || this.getSeason()
    const preferredCategories = Array.isArray(season?.preferredCategories) ? season.preferredCategories : []
    const candidates = []

    for (const categoryName of preferredCategories) {
      const categoryQuotes = quotesLoader.getCategory(categoryName) || []
      candidates.push(...this.matchTextsByKeywords(categoryQuotes, { season }))
    }

    if (candidates.length < 8) {
      candidates.push(...this.matchTextsByKeywords(quotesLoader.all, { season }))
    }

    return dedupeTexts(candidates)
  }

  pickSeasonalQuote(quotesLoader, options = {}) {
    const { chance = 0.35 } = options
    if (!quotesLoader?.all?.length) return null
    if (Math.random() > chance) return null

    const season = options.season || this.getSeason()
    const pool = this.getSeasonalQuotePool(quotesLoader, { season })
    if (!pool.length) return null
    return randomPick(pool)
  }

  getReport(snapshot) {
    const season = snapshot || this.getSeason()
    const lines = [
      '== 酒狐季节播报 ==',
      '',
      `当前季节: ${season.name}`,
      `轮换周期: 每 ${season.cycleHours} 小时切换一次`,
      `下次更替: ${season.remainingLabel} 后`,
      '',
      season.description,
      '',
      `推荐: ${season.recommendations.join(' / ') || '和主人待在一起'}`,
      '',
      `酒狐: ${season.foxComment}`,
    ]

    return lines.join('\n')
  }
}

module.exports = SeasonSystem
