/**
 * WineFox-Daily - 酒狐故事 / 狐狸日记
 * 从 data/stories.txt 加载短篇故事/日记
 */

const fs = require('fs')
const path = require('path')
const { cleanColorCodes, randomPickAvoidRecent } = require('./utils')
const { withLock } = require('./io-lock')

class StorySystem {
  /**
   * @param {string} dataDir - data 目录
   * @param {string} memoryDir - memory 目录
   * @param {object} [logger]
   */
  constructor(dataDir, memoryDir, logger) {
    this.filePath = path.join(dataDir, 'stories.txt')
    this.historyPath = path.join(memoryDir, 'story_history.json')
    this.logger = logger || console
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
    try {
      if (fs.existsSync(this.historyPath)) {
        this.recentHistory = JSON.parse(fs.readFileSync(this.historyPath, 'utf-8'))
      }
    } catch (err) {
      this.logger.warn(`[fox] 故事历史加载失败: ${err.message}`)
    }
  }

  _addStory(text, category) {
    const cleaned = text.trim()
    if (cleaned === '') return
    this.stories.push(cleaned)
    this.categories.get(category).push(cleaned)
  }

  async _saveHistory() {
    await withLock(this.historyPath, async () => {
      await fs.promises.writeFile(this.historyPath, JSON.stringify(this.recentHistory), 'utf-8')
    })
  }

  /**
   * 获取随机故事（避免近期重复）
   * @returns {Promise<string>}
   */
  async getRandomStory() {
    if (this.stories.length === 0) {
      return '酒狐的故事本还是空的...以后会有更多故事的！'
    }

    const { picked, updatedHistory } = randomPickAvoidRecent(
      this.stories,
      this.recentHistory,
      Math.min(20, Math.floor(this.stories.length / 2))
    )

    this.recentHistory = updatedHistory
    await this._saveHistory()

    return picked || '酒狐想不起来要讲什么故事了...'
  }

  /**
   * 从指定分类获取随机故事
   * @param {string} categoryName
   * @returns {Promise<string|null>}
   */
  async getStoryByCategory(categoryName) {
    const stories = this.categories.get(categoryName)
    if (!stories || stories.length === 0) return null

    const { picked, updatedHistory } = randomPickAvoidRecent(
      stories,
      this.recentHistory,
      Math.min(5, Math.floor(stories.length / 2))
    )

    this.recentHistory = updatedHistory
    await this._saveHistory()

    return picked
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
