const fs = require('fs')
const path = require('path')
const { withLock } = require('./io-lock')
const { readJsonSafe, writeJsonAtomic } = require('./safe-json')
const { getCardThemeById, DEFAULT_CARD_THEME_ID } = require('../data/card_themes')

function isPlainObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function normalizeOptionalBool(value) {
  if (value === undefined || value === null) return undefined
  if (value === true || value === false) return value
  return undefined
}

function normalizeOptionalString(value) {
  if (value === undefined || value === null) return undefined
  const str = String(value).trim()
  return str ? str : undefined
}

class PrefsSystem {
  constructor(memoryDir, logger) {
    this.savePath = path.join(memoryDir, 'prefs.json')
    this.logger = logger || console
    this.data = {
      version: 1,
      users: {},
      guilds: {},
      updatedAt: '',
    }
    this._load()
  }

  _load() {
    const result = readJsonSafe(this.savePath, this.data, {
      logger: this.logger,
      label: '偏好设置',
    })

    const parsed = result.data && typeof result.data === 'object' ? result.data : {}
    this.data = {
      version: Number.isInteger(parsed.version) ? parsed.version : 1,
      users: isPlainObject(parsed.users) ? parsed.users : {},
      guilds: isPlainObject(parsed.guilds) ? parsed.guilds : {},
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : '',
    }
  }

  async _save() {
    this.data.updatedAt = new Date().toISOString()
    await withLock(this.savePath, async () => {
      await writeJsonAtomic(this.savePath, this.data, { pretty: 2 })
    })
  }

  getUserKey(session) {
    const platform = String(session?.platform || 'unknown')
    const userId = String(session?.userId || '')
    if (!userId) return null
    return `${platform}:${userId}`
  }

  getGuildKey(session) {
    const guildId = String(session?.guildId || '')
    if (!guildId) return null
    const platform = String(session?.platform || 'unknown')
    return `${platform}:${guildId}`
  }

  getUserPrefs(session) {
    const key = this.getUserKey(session)
    if (!key) return {}
    const raw = this.data.users[key]
    return isPlainObject(raw) ? raw : {}
  }

  getGuildPrefs(session) {
    const key = this.getGuildKey(session)
    if (!key) return {}
    const raw = this.data.guilds[key]
    return isPlainObject(raw) ? raw : {}
  }

  async setUserPrefs(session, patch) {
    const key = this.getUserKey(session)
    if (!key) return { success: false, message: '无法识别用户信息。' }
    const current = this.getUserPrefs(session)
    const next = { ...current }
    for (const [field, value] of Object.entries(patch || {})) {
      if (value === null) delete next[field]
      else next[field] = value
    }
    this.data.users[key] = next
    await this._save()
    return { success: true, prefs: next }
  }

  async setGuildPrefs(session, patch) {
    const key = this.getGuildKey(session)
    if (!key) return { success: false, message: '只能在群聊中设置群偏好。' }
    const current = this.getGuildPrefs(session)
    const next = { ...current }
    for (const [field, value] of Object.entries(patch || {})) {
      if (value === null) delete next[field]
      else next[field] = value
    }
    this.data.guilds[key] = next
    await this._save()
    return { success: true, prefs: next }
  }

  resolveThemeId(session, globalThemeId) {
    const userThemeId = normalizeOptionalString(this.getUserPrefs(session)?.themeId)
    if (userThemeId && getCardThemeById(userThemeId)) return userThemeId

    const guildThemeId = normalizeOptionalString(this.getGuildPrefs(session)?.themeId)
    if (guildThemeId && getCardThemeById(guildThemeId)) return guildThemeId

    const globalId = normalizeOptionalString(globalThemeId) || DEFAULT_CARD_THEME_ID
    return getCardThemeById(globalId) ? globalId : DEFAULT_CARD_THEME_ID
  }

  resolveForceText(session) {
    const userForce = normalizeOptionalBool(this.getUserPrefs(session)?.forceText)
    if (userForce === true) return true
    if (userForce === false) return false

    const guildForce = normalizeOptionalBool(this.getGuildPrefs(session)?.forceText)
    if (guildForce === true) return true
    if (guildForce === false) return false

    return false
  }

  resolvePassiveKeywordEnabled(session, globalEnabled) {
    const guildSetting = normalizeOptionalBool(this.getGuildPrefs(session)?.passiveKeywordEnabled)
    if (guildSetting === true) return true
    if (guildSetting === false) return false

    const globalBool = globalEnabled !== false
    return globalBool
  }

  isUserAllowedToTriggerPassiveKeyword(session) {
    const disabled = normalizeOptionalBool(this.getUserPrefs(session)?.disablePassiveKeywordTrigger)
    return disabled === true ? false : true
  }

  normalizeUserPatch(input = {}) {
    const forceText = normalizeOptionalBool(input.forceText)
    const themeId = normalizeOptionalString(input.themeId)
    const disablePassiveKeywordTrigger = normalizeOptionalBool(input.disablePassiveKeywordTrigger)

    const patch = {}
    if (forceText !== undefined) patch.forceText = forceText
    if (themeId !== undefined) patch.themeId = themeId
    if (disablePassiveKeywordTrigger !== undefined) patch.disablePassiveKeywordTrigger = disablePassiveKeywordTrigger
    return patch
  }

  normalizeGuildPatch(input = {}) {
    const forceText = normalizeOptionalBool(input.forceText)
    const themeId = normalizeOptionalString(input.themeId)
    const passiveKeywordEnabled = normalizeOptionalBool(input.passiveKeywordEnabled)

    const patch = {}
    if (forceText !== undefined) patch.forceText = forceText
    if (themeId !== undefined) patch.themeId = themeId
    if (passiveKeywordEnabled !== undefined) patch.passiveKeywordEnabled = passiveKeywordEnabled
    return patch
  }

  formatPrefsSummary(session, globalThemeId) {
    const userPrefs = this.getUserPrefs(session)
    const guildPrefs = this.getGuildPrefs(session)
    const themeId = this.resolveThemeId(session, globalThemeId)
    const forceText = this.resolveForceText(session)
    const passiveKeywordEnabled = this.resolvePassiveKeywordEnabled(session, true)
    const userTriggerAllowed = this.isUserAllowedToTriggerPassiveKeyword(session)

    const theme = getCardThemeById(themeId)
    const themeLabel = theme ? `${theme.name} (${theme.id})` : themeId

    const lines = [
      '== 酒狐偏好 ==',
      '',
      `当前输出: ${forceText ? '强制文字' : '允许图片（按各指令配置）'}`,
      `当前主题: ${themeLabel}`,
      `群被动冒泡: ${passiveKeywordEnabled ? '开启' : '关闭'}`,
      `我的发言触发被动: ${userTriggerAllowed ? '允许' : '禁用'}`,
      '',
      '个人设置:',
      `- forceText: ${userPrefs.forceText === undefined ? '(未设置)' : String(userPrefs.forceText)}`,
      `- themeId: ${userPrefs.themeId || '(未设置)'}`,
      `- disablePassiveKeywordTrigger: ${userPrefs.disablePassiveKeywordTrigger === undefined ? '(未设置)' : String(userPrefs.disablePassiveKeywordTrigger)}`,
      '',
      '群设置:',
      `- forceText: ${guildPrefs.forceText === undefined ? '(未设置)' : String(guildPrefs.forceText)}`,
      `- themeId: ${guildPrefs.themeId || '(未设置)'}`,
      `- passiveKeywordEnabled: ${guildPrefs.passiveKeywordEnabled === undefined ? '(未设置)' : String(guildPrefs.passiveKeywordEnabled)}`,
    ]

    return lines.join('\n')
  }
}

module.exports = PrefsSystem
