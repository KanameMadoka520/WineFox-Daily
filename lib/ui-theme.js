/**
 * WineFox-Daily - 图片主题持久化
 * 全局保存当前启用的卡片主题
 */

const fs = require('fs')
const path = require('path')
const { withLock } = require('./io-lock')
const { DEFAULT_CARD_THEME_ID, getCardThemeById } = require('../data/card_themes')

class UIThemeSystem {
  constructor(memoryDir, logger) {
    this.savePath = path.join(memoryDir, 'ui-theme.json')
    this.logger = logger || console
    this.data = { currentThemeId: DEFAULT_CARD_THEME_ID }
    this._load()
  }

  _load() {
    try {
      if (!fs.existsSync(this.savePath)) return
      const parsed = JSON.parse(fs.readFileSync(this.savePath, 'utf-8'))
      const currentThemeId = parsed?.currentThemeId
      if (getCardThemeById(currentThemeId)) {
        this.data.currentThemeId = currentThemeId
      }
    } catch (err) {
      this.logger.warn(`[fox] 图片主题配置加载失败: ${err.message}`)
      this.data = { currentThemeId: DEFAULT_CARD_THEME_ID }
    }
  }

  async _save() {
    try {
      await withLock(this.savePath, async () => {
        await fs.promises.writeFile(this.savePath, JSON.stringify(this.data, null, 2), 'utf-8')
      })
    } catch (err) {
      this.logger.error(`[fox] 图片主题配置保存失败: ${err.message}`)
    }
  }

  getThemeId() {
    return this.data.currentThemeId || DEFAULT_CARD_THEME_ID
  }

  getTheme() {
    return getCardThemeById(this.getThemeId()) || getCardThemeById(DEFAULT_CARD_THEME_ID)
  }

  async setTheme(themeId) {
    const theme = getCardThemeById(themeId)
    if (!theme) {
      return { success: false, theme: null }
    }

    this.data.currentThemeId = theme.id
    await this._save()
    return { success: true, theme }
  }
}

module.exports = UIThemeSystem
