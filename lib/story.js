/**
 * WineFox-Daily - 酒狐故事 / 狐狸日记
 * 从 data/stories.txt 加载短篇故事/日记
 */

const fs = require('fs')
const path = require('path')
const { cleanColorCodes, randomPickAvoidRecent } = require('./utils')
const { withLock } = require('./io-lock')
const { readJsonSafe, writeJsonAtomic } = require('./safe-json')

class StorySystem {
  /**
   * @param {string} dataDir - data 目录
   * @param {string} memoryDir - memory 目录
   * @param {object} [logger]
   * @param {{ ioDebounceMs?: number }} [options]
   */
  constructor(dataDir, memoryDir, logger, options = {}) {
    this.filePath = path.join(dataDir, 'stories.txt')
    this.historyPath = path.join(memoryDir, 'story_history.json')
    this.logger = logger || console
    this.ioDebounceMs = Number.isFinite(options.ioDebounceMs) ? Math.max(0, Math.floor(options.ioDebounceMs)) : 0
    this._historySaveTimer = null
    this.stories = []
    this.categories = new Map()
    this.recentHistory = []
    this._load()
  }

  _load() {
    // 加载故事文件
    try {
      if (fs.existsSync(this.filePath)) {
        const content = fs.readFileSync(this.filePath, 'utf-8')
        const lines = content.split(/\r?\n/)

        this.stories = []
        this.categories = new Map()
        let currentCategory = '通用'
        this.categories.set(currentCategory, [])

        let buffer = []
        let inStory = false

        for (const rawLine of lines) {
          const trimmed = rawLine.trim()

          const catMatch = trimmed.match(/^\[(.+)\]$/)
          if (catMatch) {
            // 保存上一段
            if (buffer.length > 0) {
              this._addStory(buffer.join('\n'), currentCategory)
              buffer = []
            }
            currentCategory = catMatch[1].trim()
            if (!this.categories.has(currentCategory)) {
              this.categories.set(currentCategory, [])
            }
            continue
          }

          if (trimmed === '') {
            if (buffer.length > 0) {
              this._addStory(buffer.join('\n'), currentCategory)
              buffer = []
            }
            continue
          }

          buffer.push(cleanColorCodes(trimmed))
        }

        // 末尾残余
        if (buffer.length > 0) {
          this._addStory(buffer.join('\n'), currentCategory)
        }

        this.logger.info(`[fox] 成功加载故事 ${this.stories.length} 篇`)
      } else {
        this.logger.warn(`[fox] 未找到故事文件: ${this.filePath}`)
      }
    } catch (err) {
      this.logger.error(`[fox] 加载故事失败: ${err.message}`)
    }

    // 加载历史
    const historyResult = readJsonSafe(this.historyPath, [], {
      logger: this.logger,
      label: '故事历史',
    })
    this.recentHistory = Array.isArray(historyResult.data) ? historyResult.data : []
  }

  _addStory(text, category) {
    const cleaned = text.trim()
    if (cleaned === '') return
    this.stories.push(cleaned)
    this.categories.get(category).push(cleaned)
  }

  async _saveHistoryNow() {
    await withLock(this.historyPath, async () => {
      await writeJsonAtomic(this.historyPath, this.recentHistory, { pretty: 0 })
    })
  }

  async _saveHistory() {
    if (this.ioDebounceMs <= 0) {
      return await this._saveHistoryNow()
    }

    if (this._historySaveTimer) {
      clearTimeout(this._historySaveTimer)
    }

    this._historySaveTimer = setTimeout(() => {
      this._historySaveTimer = null
      this._saveHistoryNow().catch((err) => {
        this.logger.warn(`[fox] 故事历史保存失败: ${err?.message || err}`)
      })
    }, this.ioDebounceMs)
  }

  /**
   * 获取随机故事（避免近期重复）
   * @returns {Promise<string>}
   */
  async getRandomStoryData(options = {}) {
    if (this.stories.length === 0) {
      return {
        title: '酒狐故事',
        category: null,
        text: '酒狐的故事本还是空的...以后会有更多故事的！',
      }
    }

    const season = options.season || null
    const seasonData = options.seasonData || null
    const preferSeasonChance = Number.isFinite(options.preferSeasonChance) ? options.preferSeasonChance : 0.6
    let storyPool = this.stories

    if (season && seasonData) {
      const seasonCategoryStories = this.categories.get('季节') || []
      const seasonalCandidates = season.matchTextsByKeywords
        ? season.matchTextsByKeywords(seasonCategoryStories, { season: seasonData })
        : []
      const fallbackCandidates = season.matchTextsByKeywords
        ? season.matchTextsByKeywords(this.stories, { season: seasonData })
        : []
      const preferredStories = [...new Set([...seasonalCandidates, ...fallbackCandidates])]

      if (preferredStories.length > 0 && Math.random() < preferSeasonChance) {
        storyPool = preferredStories
      }
    }

    const { picked, updatedHistory } = randomPickAvoidRecent(
      storyPool,
      this.recentHistory,
      Math.min(20, Math.max(1, Math.floor(storyPool.length / 2)))
    )

    this.recentHistory = updatedHistory
    await this._saveHistory()

    return this._buildStoryData(picked || '酒狐想不起来要讲什么故事了...')
  }

  async getRandomStory() {
    const data = await this.getRandomStoryData()
    return data.text
  }

  /**
   * 从指定分类获取随机故事
   * @param {string} categoryName
   * @returns {Promise<string|null>}
   */
  async getStoryDataByCategory(categoryName) {
    const stories = this.categories.get(categoryName)
    if (!stories || stories.length === 0) return null

    const { picked, updatedHistory } = randomPickAvoidRecent(
      stories,
      this.recentHistory,
      Math.min(5, Math.floor(stories.length / 2))
    )

    this.recentHistory = updatedHistory
    await this._saveHistory()

    return this._buildStoryData(picked, categoryName)
  }

  async getStoryByCategory(categoryName) {
    const data = await this.getStoryDataByCategory(categoryName)
    return data ? data.text : null
  }

  getCatalogData() {
    return {
      title: '酒狐故事目录',
      storyCount: this.stories.length,
      categoryCount: this.categories.size,
      categories: Array.from(this.categories, ([name, stories]) => ({
        name,
        count: stories.length,
      })),
    }
  }

  _buildStoryData(text, fallbackCategory = null) {
    const storyText = (text || '').trim()
    return {
      title: '酒狐故事',
      category: fallbackCategory || this._findCategoryForStory(storyText),
      text: storyText,
    }
  }

  _findCategoryForStory(text) {
    for (const [name, stories] of this.categories) {
      if (stories.includes(text)) return name
    }
    return null
  }

  /**
   * 获取分类列表
   * @returns {string}
   */
  getCategoryList() {
    if (this.categories.size === 0) {
      return '酒狐的故事本还是空的...'
    }

    const lines = [
      '== 酒狐故事目录 ==',
      '',
      `共 ${this.stories.length} 篇故事，${this.categories.size} 个分类`,
      '',
    ]

    for (const [name, stories] of this.categories) {
      lines.push(`  ${name} (${stories.length}篇)`)
    }

    lines.push('')
    lines.push('使用「酒狐故事 <分类名>」阅读指定分类的故事')

    return lines.join('\n')
  }

  /**
   * 查找分类名（模糊匹配）
   * @param {string} input
   * @returns {string|null}
   */
  findCategory(input) {
    const trimmed = input.trim()
    if (this.categories.has(trimmed)) return trimmed
    for (const name of this.categories.keys()) {
      if (name.includes(trimmed) || trimmed.includes(name)) return name
    }
    return null
  }

  get count() { return this.stories.length }
}

module.exports = StorySystem
