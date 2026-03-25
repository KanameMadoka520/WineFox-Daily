/**
 * WineFox-Daily - 图片主题持久化
 * 全局保存当前启用的卡片主题
 */

const fs = require('fs')
const path = require('path')
const { withLock } = require('./io-lock')
const { readJsonSafe, writeJsonAtomic } = require('./safe-json')
const { DEFAULT_CARD_THEME_ID, getCardThemeById } = require('../data/card_themes')

class UIThemeSystem {
  constructor(memoryDir, logger) {
    this.savePath = path.join(memoryDir, 'ui-theme.json')
    this.logger = logger || console
    this.data = { currentThemeId: DEFAULT_CARD_THEME_ID }
    this._load()
  }

  _load() {
    const result = readJsonSafe(this.savePath, { currentThemeId: DEFAULT_CARD_THEME_ID }, {
      logger: this.logger,
      label: '图片主题配置',
    })

    const currentThemeId = result.data?.currentThemeId
    if (getCardThemeById(currentThemeId)) {
      this.data.currentThemeId = currentThemeId
    }
  }

  async _save() {
    try {
      await withLock(this.savePath, async () => {
        await writeJsonAtomic(this.savePath, this.data, { pretty: 2 })
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
