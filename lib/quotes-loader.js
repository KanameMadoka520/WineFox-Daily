const fs = require('fs')
const path = require('path')
const { cleanColorCodes } = require('./utils')
const { withLock } = require('./io-lock')

class QuotesLoader {
  constructor(filePath, logger) {
    this.filePath = filePath
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
      if (!fs.existsSync(this.filePath)) {
        this.logger.warn(`[fox] 未找到语录文件: ${this.filePath}`)
        return false
      }

      const content = fs.readFileSync(this.filePath, 'utf-8')
      const lines = content.split(/\r?\n/)

      this.all = []
      this.rares = []
      this.categories = new Map()
      let currentCategory = '通用'
      this.categories.set(currentCategory, [])

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

          let isRare = false
          let rawText = trimmed
          if (rawText.includes('[RARE]') || rawText.includes('#rare')) {
            isRare = true
            rawText = rawText.replace(/\[RARE\]/g, '').replace(/#rare/g, '').trim()
          }
          const cleaned = cleanColorCodes(rawText)
          if (cleaned.trim() === '') continue

          this.all.push(cleaned)
          this.categories.get(currentCategory).push(cleaned)
          if (isRare) {
            this.rares.push(cleaned)
          }
        } catch (lineErr) {
          this.logger.error(`[fox] 解析语录文件失败 (行号: ${i + 1}): ${lineErr.message}`)
          continue
        }
      }

      for (const [name, arr] of this.categories) {
        if (arr.length === 0) this.categories.delete(name)
      }

      this.categoryNames = [...this.categories.keys()]
      this.logger.info(`[fox] 成功加载语录 ${this.all.length} 条，分类 ${this.categoryNames.length} 个`)
      return true
    } catch (err) {
      this.logger.error(`[fox] 加载语录失败: ${err.message}`)
      return false
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