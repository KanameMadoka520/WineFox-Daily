const fs = require('fs')
const path = require('path')
const { cleanColorCodes } = require('./utils')
const { withLock } = require('./io-lock')

function isJsDataFile(filePath) {
  return String(filePath || '').toLowerCase().endsWith('.js')
}

class QuotesLoader {
  constructor(filePath, logger) {
    this.filePath = Array.isArray(filePath) ? filePath[0] : filePath
    this.filePaths = Array.isArray(filePath) ? filePath.filter(Boolean) : [filePath]
    this.logger = logger || console
    this.all = []
    this.rares = []
    this.categories = new Map()
    this.categoryNames = []
  }

  getRareQuotes() { return this.rares }
  getTotalRareCount() { return this.rares.length }
  
  getRandomRareQuote() {
    if (this.rares.length === 0) return null
    const idx = Math.floor(Math.random() * this.rares.length)
    return this.rares[idx]
  }

  // 改为同步加载，解决 index.js 启动时由于未 await 导致的语录数为 0 的问题
  load() {
    try {
      if (!this.filePaths.length) {
        this.logger.warn('[fox] 未配置语录文件路径')
        return false
      }

      this.all = []
      this.rares = []
      this.categories = new Map()

      for (const filePath of this.filePaths) {
        if (!fs.existsSync(filePath)) {
          this.logger.warn(`[fox] 未找到语录文件: ${filePath}`)
          continue
        }

        if (isJsDataFile(filePath)) {
          this._loadFromModule(filePath)
          continue
        }

        const content = fs.readFileSync(filePath, 'utf-8')
        const lines = content.split(/\r?\n/)
        let currentCategory = '通用'
        if (!this.categories.has(currentCategory)) {
          this.categories.set(currentCategory, [])
        }

        for (let i = 0; i < lines.length; i++) {
          try {
            const rawLine = lines[i]
            const trimmed = rawLine.trim()
            if (trimmed === '') continue

            const catMatch = trimmed.match(/^\[(.+)\]$/)
            if (catMatch) {
              currentCategory = catMatch[1].trim()
              if (!this.categories.has(currentCategory)) {
                this.categories.set(currentCategory, [])
              }
              continue
            }

            this._appendQuote(trimmed, currentCategory)
          } catch (lineErr) {
            this.logger.error(`[fox] 解析语录文件失败 (文件: ${path.basename(filePath)}, 行号: ${i + 1}): ${lineErr.message}`)
            continue
          }
        }
      }

      for (const [name, arr] of this.categories) {
        if (arr.length === 0) this.categories.delete(name)
      }

      this.categoryNames = [...this.categories.keys()]
      this.logger.info(`[fox] 成功加载语录 ${this.all.length} 条，分类 ${this.categoryNames.length} 个，来源文件 ${this.filePaths.length} 个`)
      if (this.all.length === 0) {
        this.logger.warn('[fox] 所有语录文件都已读取，但没有加载到任何语录')
        return false
      }
      return true
    } catch (err) {
      this.logger.error(`[fox] 加载语录失败: ${err.message}`)
      return false
    }
  }

  _appendQuote(rawText, categoryName = '通用') {
    let isRare = false
    let source = String(rawText || '').trim()
    if (!source) return

    if (source.includes('[RARE]') || source.includes('#rare')) {
      isRare = true
      source = source.replace(/\[RARE\]/g, '').replace(/#rare/g, '').trim()
    }

    const cleaned = cleanColorCodes(source)
    if (!cleaned.trim()) return

    if (!this.categories.has(categoryName)) {
      this.categories.set(categoryName, [])
    }

    this.all.push(cleaned)
    this.categories.get(categoryName).push(cleaned)
    if (isRare) this.rares.push(cleaned)
  }

  _loadFromModule(filePath) {
    delete require.cache[require.resolve(filePath)]
    const payload = require(filePath)
    const categories = payload?.categories && typeof payload.categories === 'object'
      ? payload.categories
      : (payload && typeof payload === 'object' && !Array.isArray(payload) ? payload : null)

    if (!categories) {
      throw new Error(`JS 语录文件格式无效: ${filePath}`)
    }

    for (const [categoryName, quotes] of Object.entries(categories)) {
      if (!Array.isArray(quotes)) continue
      for (const quote of quotes) {
        this._appendQuote(quote, categoryName || '通用')
      }
    }
  }

  // 同步重载
  reload() {
    return this.load()
  }

  getCategory(categoryName) { return this.categories.get(categoryName) || null }

  findCategory(keyword) {
    if (!keyword) return null
    const kw = keyword.trim()
    if (this.categories.has(kw)) return kw
    for (const name of this.categoryNames) {
      if (name.includes(kw) || kw.includes(name)) return name
    }
    return null
  }

  search(keyword) {
    if (!keyword) return []
    const kw = keyword.trim().toLowerCase()
    return this.all.filter(q => q.toLowerCase().includes(kw))
  }

  searchWithMeta(keyword) {
    if (!keyword) return []
    const kw = keyword.trim().toLowerCase()
    const results = []

    for (const name of this.categoryNames) {
      const quotes = this.getCategory(name) || []
      for (const quote of quotes) {
        if (quote.toLowerCase().includes(kw)) {
          results.push({ text: quote, category: name })
        }
      }
    }

    return results
  }

  getCategorySummaryData() {
    const categories = this.categoryNames.map((name) => ({
      name,
      count: (this.getCategory(name) || []).length,
    }))

    return {
      categoryCount: categories.length,
      quoteCount: this.count,
      rareCount: this.getTotalRareCount(),
      categories,
    }
  }

  getStatsData() {
    return {
      quoteCount: this.count,
      categoryCount: this.categoryNames.length,
      rareCount: this.getTotalRareCount(),
    }
  }

  // append 保持异步和文件锁，防止并发写入导致乱码
  async append(text) {
    return await withLock(this.filePath, async () => {
      try {
        const line = `\n${text}\n`
        await fs.promises.appendFile(this.filePath, line, 'utf-8')
        const cleaned = cleanColorCodes(text.trim())
        this.all.push(cleaned)
        if (this.categories.has('投稿')) {
          this.categories.get('投稿').push(cleaned)
        } else {
          this.categories.set('投稿', [cleaned])
          this.categoryNames = [...this.categories.keys()]
        }
        return true
      } catch (err) {
        this.logger.error(`[fox] 追加语录失败: ${err.message}`)
        return false
      }
    })
  }

  get count() { return this.all.length }
}

module.exports = QuotesLoader
