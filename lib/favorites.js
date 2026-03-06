/**
 * WineFox-Daily - 酒狐语录收藏
 * 用户可以收藏喜欢的语录
 */

const fs = require('fs')
const path = require('path')
const { withLock } = require('./io-lock')

class FavoritesSystem {
  /**
   * @param {string} memoryDir
   * @param {object} [logger]
   * @param {object} [config]
   * @param {number} [config.maxFavorites] - 每人最大收藏数
   * @param {number} [config.favoritesPerPage] - 收藏夹每页显示条数
   */
  constructor(memoryDir, logger, config = {}) {
    this.savePath = path.join(memoryDir, 'favorites.json')
    this.logger = logger || console
    this.config = {
      maxFavorites: config.maxFavorites ?? 50,
      favoritesPerPage: config.favoritesPerPage ?? 5,
    }
    /** @type {Object<string, { quotes: string[], lastReceived: string }>} */
    this.data = {}
    this._load()
  }

  _load() {
    try {
      if (fs.existsSync(this.savePath)) {
        this.data = JSON.parse(fs.readFileSync(this.savePath, 'utf-8'))
      }
    } catch (err) {
      this.logger.warn(`[fox] 收藏数据加载失败: ${err.message}`)
      this.data = {}
    }
  }

  async _save() {
    await withLock(this.savePath, async () => {
      await fs.promises.writeFile(this.savePath, JSON.stringify(this.data, null, 2), 'utf-8')
    })
  }

  _getUserData(userId) {
    if (!this.data[userId]) {
      this.data[userId] = { quotes: [], lastReceived: '' }
    }
    return this.data[userId]
  }

  /**
   * 记录用户最近收到的语录（供收藏时引用）
   * @param {string} userId
   * @param {string} quote
   */
  setLastReceived(userId, quote) {
    const userData = this._getUserData(userId)
    userData.lastReceived = quote
  }

  /**
   * 收藏最近收到的语录
   * @param {string} userId
   * @returns {Promise<{ success: boolean, message: string }>}
   */
  async addFavorite(userId) {
    const userData = this._getUserData(userId)

    if (!userData.lastReceived) {
      return { success: false, message: '还没有收到过语录呢，先和酒狐聊聊天吧~' }
    }

    if (userData.quotes.includes(userData.lastReceived)) {
      return { success: false, message: '这条语录已经在收藏夹里了哦~' }
    }

    if (userData.quotes.length >= this.config.maxFavorites) {
      return { success: false, message: `收藏夹已满（最多${this.config.maxFavorites}条），请先清理一下吧~` }
    }

    userData.quotes.push(userData.lastReceived)
    await this._save()

    return {
      success: true,
      message: `已收藏！当前收藏夹共 ${userData.quotes.length} 条语录。`,
    }
  }

  /**
   * 查看收藏夹
   * @param {string} userId
   * @param {number} [page=1]
   * @returns {string}
   */
  listFavorites(userId, page = 1) {
    const userData = this._getUserData(userId)

    if (userData.quotes.length === 0) {
      return '收藏夹是空的~遇到喜欢的语录时可以用「酒狐收藏」收藏哦！'
    }

    const perPage = this.config.favoritesPerPage
    const totalPages = Math.ceil(userData.quotes.length / perPage)
    const safePage = Math.max(1, Math.min(page, totalPages))
    const start = (safePage - 1) * perPage
    const end = Math.min(start + perPage, userData.quotes.length)

    const lines = [
      `== 酒狐收藏夹 (${safePage}/${totalPages}页) ==`,
      `共 ${userData.quotes.length} 条收藏`,
      '',
    ]

    for (let i = start; i < end; i++) {
      const q = userData.quotes[i]
      const preview = q.length > 40 ? q.substring(0, 40) + '...' : q
      lines.push(`${i + 1}. ${preview}`)
    }

    if (totalPages > 1) {
      lines.push('')
      lines.push(`使用「酒狐收藏夹 <页码>」翻页`)
    }

    return lines.join('\n')
  }

  /**
   * 取消收藏
   * @param {string} userId
   * @param {number} index - 从1开始的编号
   * @returns {Promise<{ success: boolean, message: string }>}
   */
  async removeFavorite(userId, index) {
    const userData = this._getUserData(userId)

    if (userData.quotes.length === 0) {
      return { success: false, message: '收藏夹是空的，没有可以取消的收藏哦~' }
    }

    const idx = index - 1
    if (idx < 0 || idx >= userData.quotes.length) {
      return { success: false, message: `编号无效，请输入 1~${userData.quotes.length} 之间的数字。` }
    }

    const removed = userData.quotes.splice(idx, 1)[0]
    await this._save()

    const preview = removed.length > 30 ? removed.substring(0, 30) + '...' : removed
    return {
      success: true,
      message: `已取消收藏「${preview}」\n当前收藏夹还剩 ${userData.quotes.length} 条。`,
    }
  }

  /**
   * 获取收藏数量
   * @param {string} userId
   * @returns {number}
   */
  getCount(userId) {
    const userData = this._getUserData(userId)
    return userData.quotes.length
  }
}

module.exports = FavoritesSystem
