/**
 * WineFox-Daily - 酒狐悄悄话增强版 v2.3
 * Koishi 插件主入口
 *
 * v2.3 现状:
 * - 酒狐签到 / 酒狐签到日历
 * - 酒狐酿酒 / 酒狐酒窖 / 酒狐开瓶
 * - 酒狐商店 / 酒狐购买 / 酒狐背包 / 酒狐装备 / 酒狐使用
 * - 酒狐问答
 * - 酒狐回忆
 * - 酒狐故事目录 / 酒狐故事 <分类>
 * - 酒狐季节 / 酒狐天气
 * - 酒狐取消收藏
 * - 酒狐喂酒 / 酒狐挠耳朵 / 酒狐牵手
 * - 互动冷却 / 成就奖励 / 游戏会话超时
 */

const path = require('path')
const fs = require('fs')
const { Schema } = require('koishi')
const responseData = require('./data/responses')
const { listSeasons, resolveSeason } = require('./data/season_data')

// lib 模块
const QuotesLoader = require('./lib/quotes-loader')
const { pickByTime, getTimePeriodLabel } = require('./lib/time-aware')
const AffinitySystem = require('./lib/affinity')
const DailyQuote = require('./lib/daily')
const FestivalSystem = require('./lib/festival')
const { registerPassive, getTodayPassiveCount } = require('./lib/passive')
const SubmissionSystem = require('./lib/submission')
const { registerSearchCommands } = require('./lib/search')
const { registerAnalyticsCommands } = require('./lib/analytics')
const {
  hasPuppeteer,
  listCardThemes,
  resolveCardTheme,
  setCardTheme,
  getActiveCardThemeInfo,
  withCardTheme,
  renderCommissionCard,
  renderFavoritesCard,
  renderSearchResultCard,
  renderCategoryListCard,
  renderQuoteStatsCard,
  renderFortuneCard,
  renderAffinityCard,
  renderCheckinCalendarCard,
  renderMemoirCard,
  renderAnalyticsCard,
  renderShopCard,
  renderInventoryCard,
  renderEquipResultCard,
  renderUseResultCard,
  renderHelpCard,
  renderRareCollectionCard,
  renderRankingCard,
  renderAchievementCard,
  renderCellarCard,
  renderBrewResultCard,
  renderOpenBottleResultCard,
  renderStoryCards,
  renderStoryCatalogCard,
  renderWeatherCard,
  renderSeasonCard,
  renderMoodCard,
  renderCheckinResultCard,
  renderBuyResultCard,
  renderGiftResultCard,
  renderRpsWinResultCard,
  renderGuessNumberResultCard,
  renderDailyQuoteCard,
  renderOmikujiCard,
  renderDiagnosticsCard,
} = require('./lib/card-renderer')

// v2 模块
const FortuneSystem = require('./lib/fortune')
const MoodSystem = require('./lib/mood')
const GamesSystem = require('./lib/games')
const StorySystem = require('./lib/story')
const AchievementSystem = require('./lib/achievements')
const WeatherSystem = require('./lib/weather')
const SeasonSystem = require('./lib/season')
const FavoritesSystem = require('./lib/favorites')
const { registerInteractions, clearUserCooldowns } = require('./lib/interactions')

// v2.2 新模块
const CheckinSystem = require('./lib/checkin')
const MemoirSystem = require('./lib/memoir')
const QuizSystem = require('./lib/quiz')
const BrewingSystem = require('./lib/brewing')
const ShopSystem = require('./lib/shop')
const DynamicShopSystem = require('./lib/dynamic-shop')
const CommissionSystem = require('./lib/commission')
const dailyFree = require('./lib/daily-free')
const UIThemeSystem = require('./lib/ui-theme')
const TicketRewardLedger = require('./lib/ticket-reward-ledger')
const { createAsyncLimiter } = require('./lib/async-limiter')
const PrefsSystem = require('./lib/prefs')
const RenderCache = require('./lib/render-cache')
const RenderMetricsBuffer = require('./lib/render-metrics')
const {
  DEFAULT_PLAYER_MEMORY_FILES,
  getDefaultBackupRootDir,
  createPlayerBackup,
  listPlayerBackups,
  cleanupPlayerBackups,
  resolvePlayerBackupDir,
  restorePlayerBackup,
} = require('./lib/player-backup')

exports.name = 'WineFox-Daily'
exports.inject = {
  optional: ['puppeteer'],
}

exports.usage = `
## 酒狐悄悄话增强版 v2.3.1

一只可爱的酒狐女仆，随时随地为主人送上暖心悄悄话。

已支持多类指令优先输出图片卡片；未启用 Puppeteer 服务或渲染失败时会自动回退文字。

使用「酒狐帮助」查看完整指令列表。
`.trim()

exports.Config = Schema.object({
  // === 基础 ===
  timeAwareChance: Schema.number().min(0).max(1).default(0.6).description('触发时间感知语录的概率 (0~1)'),
  enablePassiveKeyword: Schema.boolean().default(true).description('是否开启群聊关键词被动冒泡'),
  passiveCooldown: Schema.number().default(600000).description('群聊被动触发冷却时间（毫秒）'),
  rareDropChance: Schema.number().min(0).max(1).default(0.05).description('稀有语录掉落概率 (0~1)'),
  dailyAffinityMax: Schema.number().default(50).description('每日好感度获取上限'),
  ioDebounceMs: Schema.number().min(0).default(0).description('高频存档写入防抖（毫秒，0=关闭；目前主要用于历史记录类文件）'),
  opsAdminIds: Schema.array(String).default([]).description('指定可执行敏感运维指令的QQ/用户ID列表（例如存档备份/恢复、查询他人账本）'),
  renderMetricsMaxEntries: Schema.number().min(50).default(200).description('渲染统计最多保留多少条记录（仅内存）'),
  // === 图片输出 ===
  imageFortune: Schema.boolean().default(true).description('是否为酒狐占卜优先输出图片卡片'),
  imageAffinity: Schema.boolean().default(true).description('是否为酒狐好感优先输出图片卡片'),
  imageCheckinCalendar: Schema.boolean().default(true).description('是否为酒狐签到日历优先输出图片卡片'),
  imageMemoir: Schema.boolean().default(true).description('是否为酒狐回忆优先输出图片卡片'),
  imageAnalytics: Schema.boolean().default(true).description('是否为酒狐统计优先输出图片卡片'),
  imageShop: Schema.boolean().default(true).description('是否为酒狐商店优先输出图片卡片'),
  imageInventory: Schema.boolean().default(true).description('是否为酒狐背包优先输出图片卡片'),
  imageCommission: Schema.boolean().default(true).description('是否为酒狐委托优先输出图片卡片'),
  imageFavorites: Schema.boolean().default(true).description('是否为酒狐收藏夹优先输出图片卡片'),
  imageSearch: Schema.boolean().default(true).description('是否为酒狐搜索优先输出图片卡片'),
  imageDailyQuote: Schema.boolean().default(true).description('是否为每日酒狐优先输出图片卡片'),
  imageOmikuji: Schema.boolean().default(true).description('是否为酒狐抽签优先输出图片卡片'),
  imageRpsWinResult: Schema.boolean().default(true).description('是否为酒狐猜拳胜利优先输出结果卡片'),
  imageGuessResult: Schema.boolean().default(true).description('是否为酒狐猜数结算优先输出结果卡片'),
  imageCategory: Schema.boolean().default(true).description('是否为酒狐分类优先输出图片卡片'),
  imageQuoteStats: Schema.boolean().default(true).description('是否为酒狐总数优先输出图片卡片'),
  imageEquipResult: Schema.boolean().default(true).description('是否为酒狐装备成功优先输出结果卡片'),
  imageUseResult: Schema.boolean().default(true).description('是否为酒狐使用成功优先输出结果卡片'),
  imageHelp: Schema.boolean().default(true).description('是否为酒狐帮助优先输出图片菜单'),
  imageRareCollection: Schema.boolean().default(true).description('是否为酒狐图鉴优先输出图片卡片'),
  imageRanking: Schema.boolean().default(true).description('是否为酒狐排行优先输出图片卡片'),
  imageAchievement: Schema.boolean().default(true).description('是否为酒狐成就优先输出图片卡片'),
  imageCheckinResult: Schema.boolean().default(true).description('是否为酒狐签到成功优先输出结果卡片'),
  imageBuyResult: Schema.boolean().default(true).description('是否为酒狐购买成功优先输出结果卡片'),
  imageGiftResult: Schema.boolean().default(true).description('是否为酒狐送礼成功优先输出结果卡片'),
  imageStory: Schema.boolean().default(true).description('是否为酒狐故事优先输出图片卡片'),
  imageStoryCatalog: Schema.boolean().default(true).description('是否为酒狐故事目录优先输出图片卡片'),
  imageWeather: Schema.boolean().default(true).description('是否为酒狐天气优先输出图片卡片'),
  imageSeason: Schema.boolean().default(true).description('是否为酒狐季节优先输出图片卡片'),
  imageMood: Schema.boolean().default(true).description('是否为酒狐心情优先输出图片卡片'),
  imageCellar: Schema.boolean().default(true).description('是否为酒狐酒窖优先输出图片卡片'),
  imageBrewResult: Schema.boolean().default(true).description('是否为酒狐酿酒成功优先输出结果卡片'),
  imageOpenBottleResult: Schema.boolean().default(true).description('是否为酒狐开瓶成功优先输出结果卡片'),
  imageFallbackToText: Schema.boolean().default(true).description('图片渲染失败时是否自动回退为文字输出'),
  imageRenderMaxConcurrency: Schema.number().min(0).default(0).description('图片渲染并发上限（0=不限制；高并发机器建议按 puppeteer renderPoolSize 设置）'),
  imageRenderQueueTimeout: Schema.number().default(10000).description('图片渲染排队等待超时（毫秒，仅在开启并发上限时生效）'),
  imageCacheEnabled: Schema.boolean().default(false).description('是否启用图片渲染缓存（帮助/分类/总数等低变化卡片可提升速度）'),
  imageCacheMaxEntries: Schema.number().min(10).default(120).description('图片渲染缓存最大条目数'),
  imageCacheDefaultTtlMs: Schema.number().min(1000).default(60000).description('图片渲染缓存默认 TTL（毫秒）'),
  seasonCycleHours: Schema.number().min(1).max(168).default(24).description('季节轮换周期（小时），按循环制切换，不按现实月份。'),
  seasonQuoteChance: Schema.number().min(0).max(1).default(0.35).description('主语录触发当前季节偏向语录的概率 (0~1)'),
  // === 心情 ===
  enableMoodDecorate: Schema.boolean().default(true).description('是否启用心情修饰语录'),
  moodDecorateChance: Schema.number().min(0).max(1).default(0.4).description('心情修饰词出现概率 (0~1)'),
  // === 小游戏 ===
  rpsWinBonus: Schema.number().default(2).description('猜拳赢得的好感度奖励'),
  guessMaxAttempts: Schema.number().default(10).description('猜数字最大猜测次数'),
  guessRange: Schema.number().default(100).description('猜数字数字范围上限'),
  // === 互动 ===
  headpatLevel: Schema.number().min(0).max(9).default(4).description('摸头所需好感等级'),
  hugLevel: Schema.number().min(0).max(9).default(5).description('拥抱所需好感等级'),
  confessLevel: Schema.number().min(0).max(9).default(7).description('告白所需好感等级'),
  feedDrinkLevel: Schema.number().min(0).max(9).default(2).description('喂酒所需好感等级'),
  scratchEarLevel: Schema.number().min(0).max(9).default(4).description('挠耳朵所需好感等级'),
  holdHandLevel: Schema.number().min(0).max(9).default(5).description('牵手所需好感等级'),
  // === 送礼 ===
  giftDailyLimit: Schema.number().default(3).description('每日送礼次数上限'),
  giftCostSender: Schema.number().default(1).description('送礼扣除好感度'),
  giftBonusReceiver: Schema.number().default(2).description('收礼获得好感度'),
  // === 收藏 ===
  maxFavorites: Schema.number().default(50).description('每人最大收藏数'),
  favoritesPerPage: Schema.number().default(5).description('收藏夹每页条数'),
  // === 签到 ===
  checkinBaseReward: Schema.number().default(3).description('签到基础好感奖励'),
  checkinStreakCap: Schema.number().default(7).description('连续签到加成上限天数'),
})

exports.apply = (ctx, config = {}) => {
  const logger = ctx.logger('fox')
  let imageRenderLimiter = null
  let renderCache = null
  let prefs = null
  let renderMetrics = null
  let pluginVersion = 'unknown'
  try {
    const pkg = require('./package.json')
    if (pkg?.version) pluginVersion = String(pkg.version)
  } catch {
    // ignore
  }

  function logImageCheck(feature, options = {}) {
    const parts = Object.entries(options).map(([key, value]) => `${key}=${value}`)
    logger.info(`[fox] ${feature} 图片条件 ${parts.join(' ')}`)
  }

  function formatLogDetail(detail) {
    return detail ? ` ${detail}` : ''
  }

  async function renderImageFeature(options) {
    const {
      feature,
      imageKey,
      imageEnabled,
      textOutput,
      session,
      render,
      fallbackMessage,
      detail = '',
      extraChecks = [],
      cacheKey = '',
      cacheTtlMs = 0,
    } = options

    const startedAt = Date.now()
    const puppeteerAvailable = hasPuppeteer(ctx)
    const globalTheme = getActiveCardThemeInfo()
    const resolvedThemeId = prefs ? prefs.resolveThemeId(session, globalTheme.id) : globalTheme.id
    const forceText = prefs ? prefs.resolveForceText(session) : false
    const effectiveImageEnabled = !!imageEnabled && !forceText
    const queueEnabled = !!imageRenderLimiter?.getStatus?.().enabled

    const recordMetric = (metric) => {
      if (!renderMetrics) return
      renderMetrics.push({
        ts: Date.now(),
        feature,
        imageKey,
        themeId: resolvedThemeId,
        queueEnabled,
        detail,
        ...metric,
      })
    }

    const checkOptions = { [imageKey]: !!imageEnabled, puppeteerAvailable, theme: resolvedThemeId, forceText }
    for (const check of extraChecks) {
      checkOptions[check.key] = check.value
    }
    if (detail) checkOptions.detail = detail
    logImageCheck(feature, checkOptions)

    if (!effectiveImageEnabled) {
      const reason = forceText ? 'force_text' : `${imageKey}_disabled`
      logger.info(`[fox] ${feature}回退文字输出 reason=${reason}${formatLogDetail(detail)}`)
      recordMetric({ ok: true, reason, cacheHit: false, waitMs: 0, renderMs: 0, totalMs: Date.now() - startedAt })
      return textOutput
    }

    if (!puppeteerAvailable) {
      logger.info(`[fox] ${feature}回退文字输出 reason=puppeteer_unavailable${formatLogDetail(detail)}`)
      recordMetric({ ok: true, reason: 'puppeteer_unavailable', cacheHit: false, waitMs: 0, renderMs: 0, totalMs: Date.now() - startedAt })
      return textOutput
    }

    const failedCheck = extraChecks.find(check => !check.ok)
    if (failedCheck) {
      logger.info(`[fox] ${feature}回退文字输出 reason=${failedCheck.reason}${formatLogDetail(detail)}`)
      recordMetric({ ok: true, reason: failedCheck.reason || 'extra_check_failed', cacheHit: false, waitMs: 0, renderMs: 0, totalMs: Date.now() - startedAt })
      return textOutput
    }

    try {
      const cacheEnabled = !!renderCache?.enabled
      const finalCacheKey = cacheEnabled && cacheKey
        ? `${feature}:${resolvedThemeId}:${cacheKey}`
        : ''

      if (finalCacheKey) {
        const hit = renderCache.get(finalCacheKey)
        if (hit.hit) {
          logger.info(`[fox] ${feature}命中图片缓存${formatLogDetail(detail)}`)
          recordMetric({ ok: true, reason: 'cache_hit', cacheHit: true, waitMs: 0, renderMs: 0, totalMs: Date.now() - startedAt })
          return hit.value
        }
      }

      logger.info(`[fox] ${feature}开始图片渲染${formatLogDetail(detail)}`)
      const renderTask = () => withCardTheme(resolvedThemeId, render)
      let rendered = ''
      let waitMs = 0
      let renderMs = 0
      let totalMs = 0

      if (imageRenderLimiter?.runWithMetrics) {
        const result = await imageRenderLimiter.runWithMetrics(renderTask, finalConfig.imageRenderQueueTimeout)
        rendered = result.value
        waitMs = result.metrics?.waitMs || 0
        renderMs = result.metrics?.runMs || 0
        totalMs = result.metrics?.totalMs || (Date.now() - startedAt)
      } else {
        const runStart = Date.now()
        rendered = await renderTask()
        renderMs = Date.now() - runStart
        totalMs = Date.now() - startedAt
      }

      if (finalCacheKey) {
        const ttl = cacheTtlMs || finalConfig.imageCacheDefaultTtlMs
        renderCache.set(finalCacheKey, rendered, ttl)
      }
      logger.info(`[fox] ${feature}图片渲染成功${formatLogDetail(detail)}`)
      recordMetric({ ok: true, reason: 'rendered', cacheHit: false, waitMs, renderMs, totalMs })
      return rendered
    } catch (err) {
      const reason = err?.code === 'QUEUE_TIMEOUT' ? 'queue_timeout' : 'render_failed'
      const metrics = err?.metrics || {}
      recordMetric({
        ok: false,
        reason,
        cacheHit: false,
        waitMs: Number.isFinite(metrics.waitMs) ? metrics.waitMs : 0,
        renderMs: Number.isFinite(metrics.runMs) ? metrics.runMs : 0,
        totalMs: Number.isFinite(metrics.totalMs) ? metrics.totalMs : (Date.now() - startedAt),
      })
      logger.warn(`[fox] ${feature}图片渲染失败 reason=${reason}`, err)
      logger.info(`[fox] ${feature}回退文字输出 reason=${reason}${formatLogDetail(detail)}`)
      if (finalConfig.imageFallbackToText) return textOutput
      return fallbackMessage
    }
  }

  function logFeatureTrigger(session, label, extra = {}) {
    const base = {
      feature: label,
      user: session?.userId || 'unknown',
      guild: session?.guildId || 'private',
      platform: session?.platform || 'unknown',
    }
    const parts = Object.entries({ ...base, ...extra }).map(([key, value]) => `${key}=${JSON.stringify(String(value))}`)
    logger.info(`[fox] 功能触发 ${parts.join(' ')}`)
  }

  // ===== 路径初始化 =====
  const dataDir = path.join(__dirname, 'data')
  const memoryDir = path.join(__dirname, 'memory')
  const quotesPath = path.join(dataDir, 'quotes.txt')
  const quotesExtraPath = path.join(dataDir, 'quotes_extra.js')
  const quotesExtraLovePath = path.join(dataDir, 'quotes_extra_love.js')
  const quotesExtraFunPath = path.join(dataDir, 'quotes_extra_fun.js')
  const quotesExtraDarkPath = path.join(dataDir, 'quotes_extra_dark.js')
  const quotesExtraThemedPath = path.join(dataDir, 'quotes_extra_themed.js')
  const runtimeConfigJsPath = path.join(__dirname, 'runtime_config.js')
  const runtimeConfigJsonPath = path.join(__dirname, 'runtime_config.json')

  let runtimeConfig = {}
  let runtimeConfigSource = 'none'
  try {
    if (fs.existsSync(runtimeConfigJsPath)) {
      delete require.cache[require.resolve(runtimeConfigJsPath)]
      runtimeConfig = require(runtimeConfigJsPath)
      logger.info('[fox] 已加载 runtime_config.js')
      runtimeConfigSource = 'runtime_config.js'
    } else if (fs.existsSync(runtimeConfigJsonPath)) {
      runtimeConfig = JSON.parse(fs.readFileSync(runtimeConfigJsonPath, 'utf8'))
      logger.info('[fox] 已加载 runtime_config.json')
      runtimeConfigSource = 'runtime_config.json'
    }
  } catch (err) {
    logger.warn('[fox] 读取运行时配置失败', err)
    runtimeConfigSource = 'error'
  }

  const finalConfig = Object.assign({}, config, runtimeConfig)
  imageRenderLimiter = createAsyncLimiter(finalConfig.imageRenderMaxConcurrency, { timeoutMs: finalConfig.imageRenderQueueTimeout })
  renderCache = new RenderCache({
    enabled: !!finalConfig.imageCacheEnabled,
    maxEntries: finalConfig.imageCacheMaxEntries,
    defaultTtlMs: finalConfig.imageCacheDefaultTtlMs,
  })
  renderMetrics = new RenderMetricsBuffer({ maxEntries: finalConfig.renderMetricsMaxEntries })
  const opsAdminSet = new Set(
    (Array.isArray(finalConfig.opsAdminIds) ? finalConfig.opsAdminIds : [])
      .map(item => String(item || '').trim())
      .filter(Boolean)
  )

  logger.info(`[fox] Puppeteer 服务可用: ${hasPuppeteer(ctx)}`)

  function isOpsAdmin(session) {
    if (!opsAdminSet.size) return false
    const userId = String(session?.userId || '').trim()
    if (!userId) return false
    return opsAdminSet.has(userId)
  }

  function requireOpsAdmin(session, actionLabel = '该操作') {
    if (isOpsAdmin(session)) return null
    if (!opsAdminSet.size) {
      return `酒狐悄悄话: ${actionLabel} 需要先在配置里设置 opsAdminIds（指定允许执行敏感指令的 QQ/用户ID）。`
    }
    return `酒狐悄悄话: ${actionLabel} 仅限 opsAdminIds 指定的管理员执行。`
  }

  function formatBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) return '0B'
    if (bytes < 1024) return `${bytes}B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
    return `${(bytes / 1024 / 1024).toFixed(2)}MB`
  }

  function hashText(input) {
    const source = String(input || '')
    let hash = 2166136261
    for (let i = 0; i < source.length; i++) {
      hash ^= source.charCodeAt(i)
      hash = Math.imul(hash, 16777619) >>> 0
    }
    return hash.toString(16)
  }

  function hashJson(value) {
    try {
      return hashText(JSON.stringify(value))
    } catch {
      return hashText(String(value))
    }
  }

  function inspectJsonFile(filePath, parseLimitBytes = 2 * 1024 * 1024) {
    try {
      if (!fs.existsSync(filePath)) return { exists: false, ok: null, bytes: 0, error: null }
      const stat = fs.statSync(filePath)
      const bytes = stat.size
      if (bytes > parseLimitBytes) {
        return { exists: true, ok: null, bytes, error: null }
      }
      const raw = fs.readFileSync(filePath, 'utf-8')
      JSON.parse(raw)
      return { exists: true, ok: true, bytes, error: null }
    } catch (error) {
      let bytes = 0
      try { bytes = fs.statSync(filePath).size } catch { /* ignore */ }
      return { exists: true, ok: false, bytes, error: error?.message || String(error) }
    }
  }

  ctx.middleware((session, next) => {
    const content = (session.content || '').trim()
    const isWineFoxCommand = content === '每日酒狐'
      || content.startsWith('每日酒狐 ')
      || content === '酒狐'
      || content.startsWith('酒狐')

    if (isWineFoxCommand) {
      const command = content.split(/\s+/)[0] || content
      logFeatureTrigger(session, command, { content })
    }

    return next()
  }, true)

  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })
  if (!fs.existsSync(memoryDir)) fs.mkdirSync(memoryDir, { recursive: true })

  prefs = new PrefsSystem(memoryDir, logger)

  // ===== 初始化各子系统 =====
  const quotesLoader = new QuotesLoader([quotesPath, quotesExtraPath, quotesExtraLovePath, quotesExtraFunPath, quotesExtraDarkPath, quotesExtraThemedPath], logger)
  const affinity = new AffinitySystem(memoryDir, logger, { dailyAffinityMax: finalConfig.dailyAffinityMax })
  const daily = new DailyQuote(memoryDir, logger, { ioDebounceMs: finalConfig.ioDebounceMs })
  const festival = new FestivalSystem()
  const submission = new SubmissionSystem(memoryDir, logger)
  const fortune = new FortuneSystem()
  const mood = new MoodSystem({ enableMoodDecorate: finalConfig.enableMoodDecorate, moodDecorateChance: finalConfig.moodDecorateChance })
  const games = new GamesSystem(logger, { rpsWinBonus: finalConfig.rpsWinBonus, guessMaxAttempts: finalConfig.guessMaxAttempts, guessRange: finalConfig.guessRange })
  const story = new StorySystem(dataDir, memoryDir, logger, { ioDebounceMs: finalConfig.ioDebounceMs })
  const achievements = new AchievementSystem(memoryDir, logger)
  const weather = new WeatherSystem()
  const season = new SeasonSystem(memoryDir, logger, { cycleHours: finalConfig.seasonCycleHours })
  const favorites = new FavoritesSystem(memoryDir, logger, { maxFavorites: finalConfig.maxFavorites, favoritesPerPage: finalConfig.favoritesPerPage })

  // v2.2 子系统
  const checkin = new CheckinSystem(memoryDir, logger, { checkinBaseReward: finalConfig.checkinBaseReward, checkinStreakCap: finalConfig.checkinStreakCap })
  const memoir = new MemoirSystem(affinity, achievements)
  const quiz = new QuizSystem(memoryDir, logger)
  const brewing = new BrewingSystem(memoryDir, logger)
  const shop = new ShopSystem(memoryDir, logger)
  const dynamicShop = new DynamicShopSystem(memoryDir, logger)
  const commission = new CommissionSystem(memoryDir, logger, affinity, {
    getCommissionBonus(userId) {
      return shop.getEquippedBonus(userId, 'commission_bonus')
    },
  })
  const uiTheme = new UIThemeSystem(memoryDir, logger)
  const ticketRewardLedger = new TicketRewardLedger(memoryDir, logger)
  const appliedTheme = setCardTheme(uiTheme.getThemeId()) || getActiveCardThemeInfo()

  const TICKET_REWARD_RULES = {
    daily_quote: { amount: 2, dailyLimit: 1 },
    fortune: { amount: 1, dailyLimit: 1 },
    weather: { amount: 1, dailyLimit: 1 },
    omikuji: { amount: 2, dailyLimit: 1 },
    story: { amount: 2, dailyLimit: 2 },
    rps_win: { amount: 3, dailyLimit: 3 },
    guess_win_high: { amount: 6, dailyLimit: 2 },
    guess_win_mid: { amount: 5, dailyLimit: 2 },
    guess_win_low: { amount: 4, dailyLimit: 2 },
    quiz_correct: { amount: 4, dailyLimit: 5 },
  }

  const COMMAND_LEVELS = {
    猜拳: 1,
    猜数字: 1,
    抽签: 1,
    喂酒: 2,
    酿酒: 2,
    商店: 2,
    购买: 2,
    问答: 3,
    故事: 3,
    摸头: 4,
    挠耳朵: 4,
    拥抱: 5,
    牵手: 5,
    委托: 6,
    告白: 7,
    改名: 8,
  }

  function checkLevelGate(session, commandName) {
    const requiredLevel = COMMAND_LEVELS[commandName] ?? 0
    if (requiredLevel <= 0) return null
    const status = affinity.getStatus(session.userId)
    if (status.level.level >= requiredLevel) return null
    const today = require('./lib/utils').getTodayKey()
    if (dailyFree.isCommandFree(commandName, today)) return null
    return `酒狐悄悄话: 这个指令需要达到 Lv${requiredLevel} 才能使用哦...今天多陪陪酒狐吧。`
  }

  if (!quotesLoader.load()) {
    logger.warn('[fox] 语录文件加载失败')
  }

  logger.info(`[fox] 当前卡片主题: ${appliedTheme.name} (${appliedTheme.id})`)

  // ===== 成就上报辅助（含奖励发放） =====
  async function trackAndNotify(session, eventType, value) {
    const { names, totalReward } = await achievements.recordEvent(session.userId, eventType, value)
    if (names.length > 0) {
      const achNames = names.map(n => `"${n}"`).join('、')
      let msg = `\n\n-- 成就解锁！${achNames} --`
      if (totalReward > 0) {
        await affinity.addBonusPoints(session.userId, totalReward)
        const ticketResult = await affinity.addTickets(session.userId, totalReward)
        msg += `\n奖励好感度 +${totalReward}！`
        msg += `\n奖励狐狐券 +${totalReward}！(当前 ${ticketResult.newTickets} 张)`
      }
      session.send(msg)
    }
  }

  async function trackCommission(session, eventType, value = 1) {
    const today = require('./lib/utils').getTodayKey()
    await commission.getDailyTasks(session.userId, today)
    const result = await commission.recordProgress(session.userId, eventType, value)
    if (result.completedTasks.length > 0) {
      const lines = ['\n\n-- 委托完成！ --']
      for (const task of result.completedTasks) {
        lines.push(`${task.desc} (+${task.actualReward || task.reward}狐狐券)`)
      }
      session.send(lines.join('\n'))
    }
  }

  async function grantDailyTickets(userId, rewardKey) {
    const rule = TICKET_REWARD_RULES[rewardKey]
    if (!rule) return { granted: 0, exhausted: true, used: 0, limit: 0 }
    const today = require('./lib/utils').getTodayKey()
    const claim = await ticketRewardLedger.claim(userId, today, rewardKey, rule.amount, rule.dailyLimit)
    if (claim.granted > 0) {
      const ticketResult = await affinity.addTickets(userId, claim.granted)
      return { ...claim, newTickets: ticketResult.newTickets }
    }
    return { ...claim, newTickets: affinity.getTickets(userId) }
  }

  function getConsumableBoostMultiplier(userId) {
    return shop.getEquippedBonus(userId, 'consumable_double') > 0 ? 2 : 1
  }

  async function consumeInteractionBonus(userId) {
    let bonus = 0

    const nextBonus = await shop.takeTempEffect(userId, 'next_affinity_bonus')
    if (nextBonus) bonus += Number(nextBonus) || 0

    const stackCount = Number(shop.getTempEffect(userId, 'stacked_affinity_bonus_count') || 0)
    const stackValue = Number(shop.getTempEffect(userId, 'stacked_affinity_bonus_value') || 0)
    if (stackCount > 0 && stackValue > 0) {
      bonus += stackValue
      await shop.decrementTempEffect(userId, 'stacked_affinity_bonus_count', 1)
    }

    return bonus
  }

  async function consumeGuaranteedRare(userId) {
    const guaranteed = await shop.takeTempEffect(userId, 'guaranteed_rare')
    return !!guaranteed
  }

  async function trySpecialRareDrop(session, source, chance = 0.05) {
    if (quotesLoader.getTotalRareCount() <= 0) return ''
    if (Math.random() >= chance) return ''

    const rareQuote = quotesLoader.getRandomRareQuote()
    if (!rareQuote) return ''
    const isNew = await affinity.unlockRare(session.userId, rareQuote)
    if (isNew) {
      await trackAndNotify(session, 'rare_unlock')
    }
    return `\n\n* 稀有掉落 · ${source} *\n${rareQuote}${isNew ? '\n(已收录至「酒狐图鉴」)' : ''}`
  }

  function buildAffinityCapNote(affinityResult) {
    return affinityResult?.capped && (affinityResult.actualAdded || 0) <= 0
      ? '\n（今日好感已达到上限，本次没有再增加好感度）'
      : ''
  }

  // ===== 注册被动/搜索/分析/互动 =====
  registerPassive(ctx, quotesLoader, affinity, {
    ...finalConfig,
    getPassiveAffinityBonus(userId) {
      return shop.getEquippedBonus(userId, 'passive_affinity_bonus')
    },
    getPassiveChanceBonus(userId) {
      return shop.getEquippedBonus(userId, 'passive_chance_bonus')
    },
    isPassiveKeywordAllowed(session) {
      if (!prefs) return true
      const guildEnabled = prefs.resolvePassiveKeywordEnabled(session, finalConfig.enablePassiveKeyword)
      const userAllowed = prefs.isUserAllowedToTriggerPassiveKeyword(session)
      return guildEnabled && userAllowed
    },
  })
  registerAnalyticsCommands(ctx, affinity, getTodayPassiveCount, { hasPuppeteer, renderAnalyticsCard, renderImageFeature, finalConfig, logger })
  registerSearchCommands(ctx, quotesLoader, {
    renderImageFeature,
    renderSearchResultCard,
    renderCategoryListCard,
    renderQuoteStatsCard,
    finalConfig,
  })
  registerInteractions(ctx, affinity, mood, {
    headpatLevel: finalConfig.headpatLevel, hugLevel: finalConfig.hugLevel, confessLevel: finalConfig.confessLevel,
    feedDrinkLevel: finalConfig.feedDrinkLevel, scratchEarLevel: finalConfig.scratchEarLevel, holdHandLevel: finalConfig.holdHandLevel,
    getCooldownReduction(userId) {
      return shop.getEquippedBonus(userId, 'cooldown_reduction')
    },
    getInteractionAffinityBonus(userId) {
      return shop.getEquippedBonus(userId, 'affinity_bonus') + shop.getEquippedBonus(userId, 'all_affinity_bonus')
    },
    getDailyCapBonus(userId) {
      return shop.getEquippedBonus(userId, 'daily_cap_bonus')
    },
    getDecayImmune(userId) {
      return shop.getEquippedBonus(userId, 'decay_immune') > 0
    },
  })

  ctx.middleware((session, next) => {
    if (!session.guildId) return next()
    const today = require('./lib/utils').getTodayKey()
    if (dailyFree.shouldAnnounce(session.guildId, today)) {
      dailyFree.markAnnounced(session.guildId, today)
      session.send(dailyFree.getAnnouncementText(today))
    }
    return next()
  })

  function formatHelpItem(label, gateKey, freeCommands) {
    const requiredLevel = COMMAND_LEVELS[gateKey] ?? 0
    let suffix = ''
    if (requiredLevel > 0) suffix += ` [Lv${requiredLevel}]`
    if (requiredLevel > 0 && freeCommands.includes(gateKey)) suffix += ' [今日免费]'
    return `${label}${suffix}`
  }

  function getSeasonModeFooter() {
    const seasonData = season.getSeason()
    const modeLabel = seasonData.isManualOverride ? '手动干预中' : '自动轮换中'
    return `当前季节模式：${seasonData.name} · ${modeLabel}`
  }

  function getHelpData() {
    const today = require('./lib/utils').getTodayKey()
    const freeCommands = dailyFree.getDailyFreeCommands(today)
    const freeLabel = freeCommands.map(cmd => `酒狐${cmd}`).join(' / ')
    const seasonData = season.getSeason()
    const weatherData = weather.getWeather({ season: seasonData })
    const modeLabel = seasonData.isManualOverride ? '手动干预中' : '自动轮换中'

    return {
      title: '酒狐悄悄话 v2.3 - 指令列表',
      status: {
        seasonId: seasonData.id,
        season: seasonData.name,
        weatherType: weatherData.type,
        weather: weatherData.name,
        period: getTimePeriodLabel(),
        mode: modeLabel,
        nextChange: seasonData.remainingLabel,
      },
      groups: [
        {
          title: '基础指令',
          weightBias: 10,
          dense: true,
          items: [
            ['酒狐', '随机一条语录'],
            ['酒狐 <分类名>', '指定分类语录'],
            ['每日酒狐', '今日专属语录'],
            ['酒狐好感', '好感度面板'],
            ['酒狐图鉴', '稀有语录进度'],
            ['酒狐搜 <关键词>', '搜索语录'],
            ['酒狐分类', '语录分类列表'],
            ['酒狐总数', '语录统计'],
            ['酒狐统计', '互动数据看板'],
            ['酒狐投稿 <内容>', '投稿语录'],
          ],
        },
        {
          title: '每日与成长',
          weightBias: -2,
          items: [
            ['酒狐签到', '每日签到(连续有加成)'],
            ['酒狐签到日历', '查看签到日历'],
            ['酒狐占卜', '今日运势'],
            [formatHelpItem('酒狐委托', '委托', freeCommands), '查看今日 3 个委托任务'],
            [formatHelpItem('酒狐改名 <名字>', '改名', freeCommands), '高等级专属改名'],
          ],
        },
        {
          title: '趣味玩法',
          weightBias: 8,
          dense: true,
          items: [
            ['酒狐心情', '酒狐心情状态'],
            [formatHelpItem('酒狐猜拳 <手势>', '猜拳', freeCommands), '猜拳游戏'],
            [formatHelpItem('酒狐猜数', '猜数字', freeCommands), '猜数字游戏'],
            [formatHelpItem('酒狐抽签', '抽签', freeCommands), '御神签'],
            [formatHelpItem('酒狐故事', '故事', freeCommands), '随机冒险日记'],
            [formatHelpItem('酒狐故事 <分类>', '故事', freeCommands), '指定分类故事'],
            ['酒狐故事目录', '故事分类列表'],
            ['酒狐季节', '循环季节播报'],
            ['酒狐天气', 'MC天气播报'],
            [formatHelpItem('酒狐问答', '问答', freeCommands), 'MC知识问答'],
          ],
        },
        {
          title: '酿酒系统',
          weightBias: -10,
          compact: true,
          items: [
            [formatHelpItem('酒狐酿酒', '酿酒', freeCommands), '查看配方/开始酿酒'],
            ['酒狐酒窖', '查看酿酒进度'],
            ['酒狐开瓶', '品尝酿好的酒'],
          ],
        },
        {
          title: '商店与背包',
          weightBias: -2,
          items: [
            [formatHelpItem('酒狐商店', '商店', freeCommands), '浏览商品'],
            ['酒狐动态商店', '今日特供（轮换折扣）'],
            ['酒狐动态购买 <物品>', '从今日特供购买（每日限购）'],
            [formatHelpItem('酒狐购买 <物品>', '购买', freeCommands), '购买物品'],
            ['酒狐背包', '查看背包'],
            ['酒狐装备 <物品>', '装备物品'],
            ['酒狐使用 <物品>', '使用消耗品'],
          ],
        },
        {
          title: '互动动作',
          weightBias: 16,
          dense: true,
          items: [
            ['酒狐成就', '成就徽章'],
            ['酒狐回忆', '回忆录时间线'],
            [formatHelpItem('酒狐摸头', '摸头', freeCommands), '摸摸酒狐的头'],
            [formatHelpItem('酒狐拥抱', '拥抱', freeCommands), '给酒狐一个拥抱'],
            [formatHelpItem('酒狐告白', '告白', freeCommands), '向酒狐告白'],
            [formatHelpItem('酒狐喂酒', '喂酒', freeCommands), '给酒狐喂酒'],
            [formatHelpItem('酒狐挠耳朵', '挠耳朵', freeCommands), '挠挠酒狐的耳朵'],
            [formatHelpItem('酒狐牵手', '牵手', freeCommands), '牵着酒狐的手'],
          ],
        },
        {
          title: '收藏与排行',
          weightBias: -4,
          compact: true,
          items: [
            ['酒狐排行', '好感度排行榜'],
            ['酒狐送礼 @某人', '送好感'],
            ['酒狐收藏', '收藏语录'],
            ['酒狐收藏夹', '查看收藏'],
            ['酒狐取消收藏 <编号>', '删除收藏'],
          ],
        },
        {
          title: '管理员',
          weightBias: -14,
          compact: true,
          items: [
            ['酒狐UI [主题名]', '查看或切换图片主题'],
            ['酒狐季节状态', '查看当前季节干预状态'],
            ['酒狐季节设置 <季节>', '手动切换循环季节'],
            ['酒狐季节周期 <小时>', '手动修改季节轮换速度'],
            ['酒狐季节恢复自动', '恢复默认季节轮换速度'],
            ['酒狐审核 / 酒狐通过 / 酒狐拒绝 / 酒狐重载', '审核与维护'],
          ],
        },
      ],
      footer: `今日免费体验: ${freeLabel} ｜ 戳一戳酒狐也会回复哦~`,
      footerText: getSeasonModeFooter(),
    }
  }

  function getRareCollectionData(userId) {
    const unlockedRares = affinity.getUnlockedRares(userId)
    const total = quotesLoader.getTotalRareCount()
    return {
      total,
      unlockedCount: unlockedRares.length,
      items: unlockedRares.map((text, index) => ({ index: index + 1, text })),
      isEmpty: unlockedRares.length === 0,
    }
  }

  function getRankingData() {
    const allUsers = Object.entries(affinity.data)
    if (allUsers.length === 0) return { entries: [], isEmpty: true }

    const entries = allUsers
      .map(([userId, data]) => ({ userId, points: data.points || 0 }))
      .sort((a, b) => b.points - a.points)
      .slice(0, 10)
      .map((entry, index) => ({
        rank: index + 1,
        userId: entry.userId,
        points: entry.points,
        levelName: affinity.getLevel(entry.points).name,
      }))

    return { entries, isEmpty: entries.length === 0 }
  }

  // ===== 酒狐帮助 =====
  ctx.command('酒狐帮助', '查看酒狐所有可用指令')
    .action(async ({ session }) => {
      const helpData = getHelpData()
      const textOutput = [
        `== ${helpData.title} ==`,
        '',
        ...helpData.groups.flatMap((group) => [
          `【${group.title}】`,
          ...group.items.map(item => `${item[0]}  ${item[1]}`),
          '',
        ]),
        helpData.footer,
      ].join('\n')

      return renderImageFeature({
        feature: '酒狐帮助',
        imageKey: 'imageHelp',
        imageEnabled: finalConfig.imageHelp,
        textOutput,
        session,
        cacheKey: `help:${hashJson(helpData)}`,
        cacheTtlMs: 60000,
        render: () => renderHelpCard(ctx, { data: helpData }),
        fallbackMessage: '酒狐悄悄话: 帮助菜单卡片生成失败了，请稍后再试一次...',
      })
    })

  // ===== 主指令: 酒狐 =====
  ctx.command('酒狐 [category:text]', '随机发送一句酒狐语录')
    .action(async ({ session }, category) => {
      if (quotesLoader.count === 0) {
        quotesLoader.reload()
        if (quotesLoader.count === 0) return '主人，我找不到笔记本了（未找到语录文件）'
      }

      const userId = session.userId
      const consumableAffinityBonus = await consumeInteractionBonus(userId)
      const affinityBonus = shop.getEquippedBonus(userId, 'affinity_bonus') + shop.getEquippedBonus(userId, 'all_affinity_bonus')
      const dailyCapBonus = shop.getEquippedBonus(userId, 'daily_cap_bonus')
      const decayImmune = shop.getEquippedBonus(userId, 'decay_immune') > 0
      const affinityResult = await affinity.addPoints(userId, 1 + affinityBonus + consumableAffinityBonus, { dailyCapBonus, decayImmune })
      await trackAndNotify(session, 'interact')
      await trackCommission(session, 'interact')

      let resOutput = ''
      if (affinityResult.decayed) resOutput += affinityResult.decayMessage + '\n\n'
      const seasonData = season.getSeason()

      if (affinityResult.levelUp) {
        const levelUpLine = affinity.getLevelUpLine(affinityResult.newLevel.level)
        if (levelUpLine) return `${resOutput}-- 好感度提升！--\n等级：${affinityResult.newLevel.name}\n\n${levelUpLine}`
      }

      if (category && category.trim()) {
        const catName = quotesLoader.findCategory(category.trim())
        if (catName) {
          const catQuotes = quotesLoader.getCategory(catName)
          if (catQuotes && catQuotes.length > 0) {
            const { picked } = require('./lib/utils').randomPickAvoidRecent(catQuotes, [])
            const decorated = mood.decorateQuote(picked, { season: seasonData })
            favorites.setLastReceived(userId, picked)
            return resOutput + decorated
          }
        }
        return resOutput + `没有找到"${category.trim()}"这个分类呢... 试试「酒狐分类」看看有哪些？`
      }

      const festivalGreeting = festival.getGreetingIfFestival(quotesLoader)
      if (festivalGreeting && Math.random() < 0.4) {
        favorites.setLastReceived(userId, festivalGreeting.quote)
        return resOutput + `${festivalGreeting.festivalName}快乐！\n${festivalGreeting.quote}`
      }

      let quote = pickByTime(quotesLoader, { timeAwareChance: finalConfig.timeAwareChance || 0.6 })
      const seasonalQuote = season.pickSeasonalQuote(quotesLoader, { chance: finalConfig.seasonQuoteChance, season: seasonData })
      if (seasonalQuote) quote = seasonalQuote

      const guaranteedRare = await consumeGuaranteedRare(userId)
      const rareChance = (finalConfig.rareDropChance ?? 0.05) + shop.getEquippedBonus(userId, 'rare_chance_bonus')
      if ((guaranteedRare || Math.random() < rareChance) && quotesLoader.getTotalRareCount() > 0) {
        const rareQuote = quotesLoader.getRandomRareQuote()
        if (rareQuote) {
          quote = `* 稀有掉落 *\n\n${rareQuote}`
          const isNew = await affinity.unlockRare(userId, rareQuote)
          if (isNew) {
            quote += `\n\n(已收录至「酒狐图鉴」)`
            await trackAndNotify(session, 'rare_unlock')
          }
        }
      }

      const finalQuote = quote || '主人，我的脑袋突然一片空白...'
      const decorated = mood.decorateQuote(finalQuote, { season: seasonData })

      // 装备效果
      const equipEffect = shop.getEquippedEffect(userId)
      const suffix = equipEffect ? '\n' + equipEffect : ''

      favorites.setLastReceived(userId, finalQuote)
      const affinityDelta = affinityResult.actualAdded || 0
      const progressLine = affinityDelta > 0 ? `\n${affinity.formatProgressLine(userId, affinityDelta)}` : ''
      return resOutput + decorated + suffix + progressLine + buildAffinityCapNote(affinityResult)
    })

  // ===== 每日酒狐 =====
  ctx.command('每日酒狐', '获取今日专属酒狐语录')
    .action(async ({ session }) => {
      if (quotesLoader.count === 0) return '主人，语录本不见了...'
      const seasonData = season.getSeason()
      const seasonalQuotePool = season.getSeasonalQuotePool(quotesLoader, { season: seasonData })
      const consumableAffinityBonus = await consumeInteractionBonus(session.userId)
      const affinityBonus = shop.getEquippedBonus(session.userId, 'affinity_bonus') + shop.getEquippedBonus(session.userId, 'all_affinity_bonus')
      const dailyCapBonus = shop.getEquippedBonus(session.userId, 'daily_cap_bonus')
      const decayImmune = shop.getEquippedBonus(session.userId, 'decay_immune') > 0
      const affinityResult = await affinity.addPoints(session.userId, 1 + affinityBonus + consumableAffinityBonus, { dailyCapBonus, decayImmune })
      const ticketGrant = await grantDailyTickets(session.userId, 'daily_quote')
      await trackAndNotify(session, 'interact')
      await trackCommission(session, 'interact')
      const quote = await daily.getTodayQuote(quotesLoader.all, {
        contextKey: `season:${seasonData.id}`,
        preferredQuotes: seasonalQuotePool,
      })
      let resOutput = ''
      if (affinityResult.decayed) resOutput += affinityResult.decayMessage + '\n\n'
      favorites.setLastReceived(session.userId, quote)
      const affinityDelta = affinityResult.actualAdded || 0
      const progressLine = affinityDelta > 0 ? affinity.formatProgressLine(session.userId, affinityDelta) : ''
      const ticketLine = ticketGrant.granted > 0
        ? `\n狐狐券 +${ticketGrant.granted} (当前 ${ticketGrant.newTickets} 张)`
        : `\n（今日「每日酒狐」狐狐券已领满，当前 ${ticketGrant.newTickets} 张）`
      const textOutput = `${resOutput}[今日酒狐悄悄话]\n${quote}${ticketLine}${progressLine ? `\n${progressLine}` : ''}${buildAffinityCapNote(affinityResult)}`

      return renderImageFeature({
        feature: '每日酒狐',
        imageKey: 'imageDailyQuote',
        imageEnabled: finalConfig.imageDailyQuote,
        textOutput,
        session,
        render: () => renderDailyQuoteCard(ctx, {
          data: {
            seasonId: seasonData.id,
            mode: seasonData.isManualOverride ? '手动干预中' : '自动轮换中',
            quote,
            season: seasonData.name,
            ticketReward: ticketGrant.granted,
            progressLine: progressLine || '今日好感已达上限',
            dateLabel: require('./lib/utils').getTodayKey(),
            footerText: getSeasonModeFooter(),
          },
        }),
        fallbackMessage: '酒狐悄悄话: 每日语录卡片生成失败了，请稍后再试一次...',
      })
    })

  // ===== 酒狐好感 =====
  ctx.command('酒狐好感', '查看与酒狐的好感度')
    .action(async ({ session }) => {
      const status = affinity.getStatus(session.userId)
      const textLines = ['== 酒狐好感度面板 ==', '', `称号：${status.level.name}`, `好感值：${status.points} 点`, `狐狐券：${status.tickets} 张`, `进度：${status.progress}`]
      if (status.nextLevel) textLines.push(`下一等级：${status.nextLevel.name} (需要 ${status.nextLevel.minPoints} 点)`)
      const textOutput = textLines.join('\n')

      return renderImageFeature({
        feature: '酒狐好感',
        imageKey: 'imageAffinity',
        imageEnabled: finalConfig.imageAffinity,
        textOutput,
        session,
        render: () => renderAffinityCard(ctx, {
          userName: session.username || session.author?.name || session.userId,
          status,
        }),
        fallbackMessage: '酒狐悄悄话: 好感卡片生成失败了，请稍后再试一次...',
      })
    })

  // ===== 酒狐账本 =====
  ctx.command('酒狐账本 [target:text]', '查看今日收益与上限（解释为什么没奖励）')
    .action(({ session }, target) => {
      const today = require('./lib/utils').getTodayKey()

      const extractUserId = (input) => {
        let text = String(input || '').trim()
        if (!text) return ''
        const atMatch = text.match(/<at id="([^"]+)"/)
        if (atMatch) return atMatch[1]
        const cqMatch = text.match(/\[CQ:at,qq=(\d+)\]/)
        if (cqMatch) return cqMatch[1]
        return text
      }

      let userId = session.userId
      let modeLabel = '本人'

      if (target && String(target).trim()) {
        const deny = requireOpsAdmin(session, '查询他人账本')
        if (deny) return deny
        userId = extractUserId(target)
        if (!userId) return '酒狐悄悄话: 请输入要查询的对象，例如：酒狐账本 @某人'
        modeLabel = '管理员查询'
      }

      const status = affinity.getStatus(userId)
      const userData = affinity._getUserData(userId)
      const dailyCapBonus = shop.getEquippedBonus(userId, 'daily_cap_bonus')
      const dailyCap = (finalConfig.dailyAffinityMax ?? 50) + dailyCapBonus
      const todayUsed = String(userData.lastDate || '') === today ? Number(userData.dailyCount || 0) : 0
      const todayRemaining = Math.max(0, dailyCap - todayUsed)

      const snapshot = ticketRewardLedger.getSnapshot(userId, today)
      const claims = snapshot.claims || {}

      const rewardLabels = {
        daily_quote: '每日酒狐',
        fortune: '占卜',
        weather: '天气',
        omikuji: '抽签',
        story: '故事',
        rps_win: '猜拳胜利',
        guess_win_high: '猜数胜利(高)',
        guess_win_mid: '猜数胜利(中)',
        guess_win_low: '猜数胜利(低)',
        quiz_correct: '问答答对',
      }

      const rewardOrder = Object.keys(TICKET_REWARD_RULES)

      const lines = [
        '== 酒狐账本 ==',
        '',
        `日期: ${today}`,
        `用户: ${userId}（${modeLabel}）`,
        '',
        `狐狐券余额: ${status.tickets} 张`,
        `今日好感上限: ${todayUsed}/${dailyCap}（剩余 ${todayRemaining}）${dailyCapBonus > 0 ? `  +装备加成${dailyCapBonus}` : ''}`,
        '',
        '今日狐狐券奖励次数（按玩法）：',
        ...rewardOrder.map((key) => {
          const rule = TICKET_REWARD_RULES[key]
          const used = Number(claims[key] || 0)
          const limit = Number(rule.dailyLimit || 0)
          const remaining = Math.max(0, limit - used)
          const label = rewardLabels[key] || key
          return `- ${label}: ${used}/${limit}（剩余 ${remaining}）· 单次 +${rule.amount}`
        }),
        '',
        '说明：',
        '- 领满后仍可继续使用指令，但不会再获得对应玩法的狐狐券奖励。',
        '- 若今日好感已达上限，互动类指令会提示“今日好感已达到上限”。',
      ]

      return lines.join('\n')
    })

  // ===== 酒狐图鉴 =====
  ctx.command('酒狐图鉴', '查看已解锁的稀有语录进度')
    .action(async ({ session }) => {
      const rareData = getRareCollectionData(session.userId)
      if (rareData.total === 0) return '主人，当前的语录本里似乎没有稀有语录呢...'

      const textOutput = rareData.isEmpty
        ? `== 酒狐图鉴 ==\n\n收录进度: 0/${rareData.total}\n尚未解锁任何稀有语录。多跟我互动就有机会发现哦~`
        : ['== 酒狐图鉴 ==', '', `收录进度: ${rareData.unlockedCount}/${rareData.total}`, '', ...rareData.items.map(item => `${item.index}. ${item.text}`)].join('\n')

      return renderImageFeature({
        feature: '酒狐图鉴',
        imageKey: 'imageRareCollection',
        imageEnabled: finalConfig.imageRareCollection,
        textOutput,
        session,
        render: () => renderRareCollectionCard(ctx, { data: rareData }),
        fallbackMessage: '酒狐悄悄话: 图鉴卡片生成失败了，请稍后再试一次...',
      })
    })

  // ===== 酒狐投稿 =====
  ctx.command('酒狐投稿 <content:text>', '投稿一条酒狐语录')
    .action(async ({ session }, content) => {
      if (!content || !content.trim()) return '请输入要投稿的内容，例如：酒狐投稿 主人今天也是最棒的！'
      const result = await submission.submit(session.userId, content.trim())
      return result.message
    })

  // ===== 酒狐改名 =====
  ctx.command('酒狐改名 <newName:text>', '灵魂伴侣专属改名')
    .action(async ({ session }, newName) => {
      const status = affinity.getStatus(session.userId)
      if (status.level.level < 5) return '酒狐悄悄话: 我们还没有成为「灵魂伴侣」呢...再多陪陪我吧？'
      if (!newName || !newName.trim()) return '酒狐悄悄话: 主人想叫我什么呢？请用「酒狐改名 新名字」告诉我吧。'
      const trimmedName = newName.trim()
      await affinity.setCustomPrefix(session.userId, trimmedName)
      return `酒狐悄悄话: 好的！从现在起，我的专属称呼就变成「${trimmedName}」啦❤`
    })

  // ===== 酒狐签到 =====
  ctx.command('酒狐签到', '每日签到')
    .action(async ({ session }) => {
      const result = await checkin.checkin(session.userId)
      if (result.success) {
        await affinity.addBonusPoints(session.userId, result.reward)
        const checkinMultiplier = Number(await shop.takeTempEffect(session.userId, 'next_checkin_ticket_multiplier') || 1)
        const finalTicketReward = result.ticketReward * checkinMultiplier + shop.getEquippedBonus(session.userId, 'checkin_ticket_bonus')
        const ticketResult = await affinity.addTickets(session.userId, finalTicketReward)
        await trackAndNotify(session, 'checkin')
        await trackCommission(session, 'checkin')

        const textOutput = `${result.message.replace(/狐狐券奖励: \+\d+/, `狐狐券奖励: +${finalTicketReward}`)}\n狐狐券余额: ${ticketResult.newTickets}`
        const userData = checkin.getData(session.userId)
        const foxLines = responseData.actionResultQuotesCheckin || ['今天也辛苦啦。']
        const foxLine = require('./lib/utils').randomPick(foxLines)

	        return renderImageFeature({
	          feature: '酒狐签到结果',
	          imageKey: 'imageCheckinResult',
	          imageEnabled: finalConfig.imageCheckinResult,
	          textOutput,
	          session,
	          render: () => renderCheckinResultCard(ctx, {
	            data: {
	              tag: '今日奖励',
	              mainRows: [
                { label: '好感', value: `+${result.reward}`, muted: `连续 ${userData.streak} 天 · 累计 ${userData.totalDays} 天` },
                { label: '狐狐券', value: `+${finalTicketReward}`, muted: `当前余额 ${ticketResult.newTickets} 张` },
              ],
              suggestions: ['酒狐签到日历', '酒狐好感'],
              foxLine,
            },
          }),
          fallbackMessage: '酒狐悄悄话: 签到结果卡片生成失败了，请稍后再试一次...',
        })
      }
      return result.message
    })

  // ===== 酒狐签到日历 =====
  ctx.command('酒狐签到日历', '查看签到日历')
    .action(async ({ session }) => {
      const calendarData = checkin.getCalendarData(session.userId)
      const textOutput = checkin.getCalendar(session.userId)

      return renderImageFeature({
        feature: '酒狐签到日历',
        imageKey: 'imageCheckinCalendar',
        imageEnabled: finalConfig.imageCheckinCalendar,
        textOutput,
        session,
        render: () => renderCheckinCalendarCard(ctx, {
          userName: session.username || session.author?.name || session.userId,
          data: calendarData,
        }),
        fallbackMessage: '酒狐悄悄话: 签到日历卡片生成失败了，请稍后再试一次...',
      })
    })

  // ===== 酒狐占卜 =====
  ctx.command('酒狐占卜', '今日运势占卜')
    .action(async ({ session }) => {
      await trackAndNotify(session, 'fortune')
      await trackCommission(session, 'fortune')
      const ticketGrant = await grantDailyTickets(session.userId, 'fortune')
      const seasonData = season.getSeason()
      const fortuneData = fortune.getTodayFortuneData(session.userId, { season: seasonData })
      const rareExtra = await trySpecialRareDrop(session, '占卜', fortuneData.luck >= 85 ? 0.18 : 0.05)
      const ticketLine = ticketGrant.granted > 0
        ? `\n狐狐券 +${ticketGrant.granted} (当前 ${ticketGrant.newTickets} 张)`
        : `\n（今日占卜狐狐券已领满，当前 ${ticketGrant.newTickets} 张）`
      const textOutput = fortune.formatFortuneText(fortuneData) + ticketLine + rareExtra

      return renderImageFeature({
        feature: '酒狐占卜',
        imageKey: 'imageFortune',
        imageEnabled: finalConfig.imageFortune,
        textOutput,
        session,
        render: () => renderFortuneCard(ctx, {
          userName: session.username || session.author?.name || session.userId,
          data: {
            ...fortuneData,
            seasonId: seasonData.id,
            mode: seasonData.isManualOverride ? '手动干预中' : '自动轮换中',
            ticketReward: ticketGrant.granted,
            commentText: `${fortuneData.commentText}${rareExtra ? '\n\n今天似乎还翻出了一张特别稀有的小签。' : ''}`,
            footerText: getSeasonModeFooter(),
          },
        }),
        fallbackMessage: '酒狐悄悄话: 占卜卡片生成失败了，请稍后再试一次...',
      })
    })

  // ===== 酒狐心情 =====
  ctx.command('酒狐心情', '查看酒狐当前心情')
    .action(async ({ session }) => {
      const seasonData = season.getSeason()
      const moodInfo = mood.getMood({ season: seasonData })
      const textOutput = mood.getStatusText({ season: seasonData })

      return renderImageFeature({
        feature: '酒狐心情',
        imageKey: 'imageMood',
        imageEnabled: finalConfig.imageMood,
        textOutput,
        session,
        render: () => renderMoodCard(ctx, {
          data: {
            title: '酒狐心情',
            seasonId: seasonData.id,
            mood: moodInfo.name,
            emoji: moodInfo.emoji,
            mode: seasonData.isManualOverride ? '手动干预中' : '自动轮换中',
            season: seasonData.name,
            body: textOutput,
            footerText: getSeasonModeFooter(),
          },
        }),
        fallbackMessage: '酒狐悄悄话: 心情卡片生成失败了，请稍后再试一次...',
      })
    })

  // ===== 酒狐猜拳 =====
  ctx.command('酒狐猜拳 <choice:text>', '和酒狐猜拳')
    .action(async ({ session }, choice) => {
      const gate = checkLevelGate(session, '猜拳')
      if (gate) return gate
      if (!choice || !choice.trim()) return '请出「石头」「剪刀」或「布」哦！'
      const result = games.playRPS(choice.trim())
      if (result.result === 'invalid') return result.message
      let ticketLine = ''
      if (result.affinityBonus > 0) {
        const affinityBonus = shop.getEquippedBonus(session.userId, 'affinity_bonus') + shop.getEquippedBonus(session.userId, 'all_affinity_bonus')
        const dailyCapBonus = shop.getEquippedBonus(session.userId, 'daily_cap_bonus')
        const decayImmune = shop.getEquippedBonus(session.userId, 'decay_immune') > 0
        result.affinityResult = await affinity.addPoints(session.userId, result.affinityBonus + affinityBonus, { dailyCapBonus, decayImmune })
      }
      mood.onEvent(result.result === 'win' ? 'game_lose' : result.result === 'lose' ? 'game_win' : 'interact')
      const progressDelta = result.affinityResult?.actualAdded || 0
      if (result.result === 'win') {
        const ticketGrant = await grantDailyTickets(session.userId, 'rps_win')
        ticketLine = ticketGrant.granted > 0
          ? `\n狐狐券 +${ticketGrant.granted} (当前 ${ticketGrant.newTickets} 张)`
          : `\n（今日猜拳奖励已领满，当前 ${ticketGrant.newTickets} 张）`
        await trackAndNotify(session, 'rps_win')
        await trackCommission(session, 'rps_win')

        const progressLine = progressDelta > 0 ? affinity.formatProgressLine(session.userId, progressDelta) : ''
        const textOutput = result.message + ticketLine + (progressLine ? `\n${progressLine}` : '')
	        return renderImageFeature({
	          feature: '酒狐猜拳胜利结果',
	          imageKey: 'imageRpsWinResult',
	          imageEnabled: finalConfig.imageRpsWinResult,
	          textOutput,
	          session,
	          detail: `userChoice=${result.userChoiceName} foxChoice=${result.foxChoiceName}`,
	          render: () => renderRpsWinResultCard(ctx, {
	            data: {
	              userChoiceName: result.userChoiceName,
              foxChoiceName: result.foxChoiceName,
              flavorLine: result.flavorLine,
              ticketReward: ticketGrant.granted,
              progressLine,
              message: result.message,
            },
          }),
          fallbackMessage: '酒狐悄悄话: 猜拳胜利结果卡片生成失败了，请稍后再试一次...',
        })
      } else {
        await trackAndNotify(session, 'rps_play')
      }
      return result.message + ticketLine + (progressDelta > 0 ? `\n${affinity.formatProgressLine(session.userId, progressDelta)}` : '') + buildAffinityCapNote(result.affinityResult)
    })

  // ===== 酒狐猜数 =====
  ctx.command('酒狐猜数 [guess:number]', '猜数字游戏')
    .action(async ({ session }, guess) => {
      const gate = checkLevelGate(session, '猜数字')
      if (gate) return gate
      const sessionKey = `${session.guildId || 'dm'}:${session.userId}`
      if (guess === null || guess === undefined) {
        if (quiz.isInQuiz(sessionKey)) {
          return '酒狐悄悄话: 你正在答题呢，先完成当前的问答吧~'
        }
      }
      const result = games.playGuessNumber(sessionKey, guess)
      if (result.finished && result.success) {
        const affinityBonus = shop.getEquippedBonus(session.userId, 'affinity_bonus') + shop.getEquippedBonus(session.userId, 'all_affinity_bonus')
        const dailyCapBonus = shop.getEquippedBonus(session.userId, 'daily_cap_bonus')
        const decayImmune = shop.getEquippedBonus(session.userId, 'decay_immune') > 0
        const affinityResult = await affinity.addPoints(session.userId, result.affinityBonus + affinityBonus, { dailyCapBonus, decayImmune })
        const rewardKey = result.affinityBonus >= 5 ? 'guess_win_high' : result.affinityBonus >= 3 ? 'guess_win_mid' : 'guess_win_low'
        const ticketGrant = await grantDailyTickets(session.userId, rewardKey)
        await trackAndNotify(session, 'guess_win')
        await trackCommission(session, 'guess_win')
        const progressLine = (affinityResult.actualAdded || 0) > 0 ? affinity.formatProgressLine(session.userId, affinityResult.actualAdded) : ''
        const ticketLine = ticketGrant.granted > 0
          ? `\n狐狐券 +${ticketGrant.granted} (当前 ${ticketGrant.newTickets} 张)`
          : `\n（今日猜数奖励已领满，当前 ${ticketGrant.newTickets} 张）`
        const textOutput = result.message + ticketLine + (progressLine ? `\n${progressLine}` : '') + buildAffinityCapNote(affinityResult)
	        return renderImageFeature({
	          feature: '酒狐猜数结算',
	          imageKey: 'imageGuessResult',
	          imageEnabled: finalConfig.imageGuessResult,
	          textOutput,
	          session,
	          detail: `answer=${result.answer || ''} attempts=${result.attempts || 0}`,
	          render: () => renderGuessNumberResultCard(ctx, {
	            data: {
	              success: true,
              answer: result.answer,
              attempts: result.attempts,
              summary: result.summary || result.message,
              ticketReward: ticketGrant.granted,
              progressLine: progressLine || '今日好感已达上限',
              message: result.message,
            },
          }),
          fallbackMessage: '酒狐悄悄话: 猜数结算卡片生成失败了，请稍后再试一次...',
        })
      }
      if (result.finished) {
        let affinityResult = { actualAdded: 0, capped: false }
        if (result.affinityBonus > 0) {
          affinityResult = await affinity.addPoints(session.userId, result.affinityBonus)
        }
	        return renderImageFeature({
	          feature: '酒狐猜数结算',
	          imageKey: 'imageGuessResult',
	          imageEnabled: finalConfig.imageGuessResult,
	          session,
	          textOutput: result.affinityBonus > 0
	            ? `${result.message}${(affinityResult.actualAdded || 0) > 0 ? `\n${affinity.formatProgressLine(session.userId, affinityResult.actualAdded)}` : ''}${buildAffinityCapNote(affinityResult)}`
	            : result.message,
	          detail: `answer=${result.answer || ''} attempts=${result.attempts || 0}`,
	          render: () => renderGuessNumberResultCard(ctx, {
	            data: {
              success: false,
              answer: result.answer,
              attempts: result.attempts,
              summary: result.summary || result.message,
              ticketReward: 0,
              progressLine: result.affinityBonus > 0 && (affinityResult.actualAdded || 0) > 0 ? affinity.formatProgressLine(session.userId, affinityResult.actualAdded) : '今日好感已达上限',
              message: result.message,
            },
          }),
          fallbackMessage: '酒狐悄悄话: 猜数结算卡片生成失败了，请稍后再试一次...',
        })
      }
      return result.message
    })

  // ===== 酒狐抽签 =====
  ctx.command('酒狐抽签', '抽取御神签')
    .action(async ({ session }) => {
      const gate = checkLevelGate(session, '抽签')
      if (gate) return gate
      const consumableAffinityBonus = await consumeInteractionBonus(session.userId)
      const affinityResult = await affinity.addPoints(session.userId, 1 + consumableAffinityBonus)
      const ticketGrant = await grantDailyTickets(session.userId, 'omikuji')
      await trackAndNotify(session, 'interact')
      await trackCommission(session, 'interact')
      const omikuji = games.drawOmikuji()
      const progressLine = (affinityResult.actualAdded || 0) > 0 ? affinity.formatProgressLine(session.userId, affinityResult.actualAdded) : ''
      const ticketLine = ticketGrant.granted > 0
        ? `\n狐狐券 +${ticketGrant.granted} (当前 ${ticketGrant.newTickets} 张)`
        : `\n（今日抽签狐狐券已领满，当前 ${ticketGrant.newTickets} 张）`
      const textOutput = omikuji.message + ticketLine + (progressLine ? `\n${progressLine}` : '') + buildAffinityCapNote(affinityResult)

      return renderImageFeature({
        feature: '酒狐抽签',
        imageKey: 'imageOmikuji',
        imageEnabled: finalConfig.imageOmikuji,
        textOutput,
        session,
        render: () => renderOmikujiCard(ctx, {
          data: {
            rank: omikuji.rank,
            text: omikuji.text,
            ticketReward: ticketGrant.granted,
            progressLine: progressLine || '今日好感已达上限',
          },
        }),
        fallbackMessage: '酒狐悄悄话: 御神签卡片生成失败了，请稍后再试一次...',
      })
    })

  // ===== 酒狐故事 =====
  ctx.command('酒狐故事 [category:text]', '酒狐的冒险日记')
    .action(async ({ session }, category) => {
      logger.info('[fox] 酒狐故事请求开始')
      const consumableAffinityBonus = await consumeInteractionBonus(session.userId)
      const affinityResult = await affinity.addPoints(session.userId, 1 + consumableAffinityBonus)
      const ticketGrant = await grantDailyTickets(session.userId, 'story')
      await trackAndNotify(session, 'story')
      await trackCommission(session, 'story')
      const ticketLine = ticketGrant.granted > 0
        ? `\n狐狐券 +${ticketGrant.granted} (当前 ${ticketGrant.newTickets} 张)`
        : `\n（今日故事狐狐券已领满，当前 ${ticketGrant.newTickets} 张）`

      if (category && category.trim()) {
        const catName = story.findCategory(category.trim())
        if (!catName) {
          return `没有找到「${category.trim()}」这个分类...用「酒狐故事目录」看看有哪些吧！`
        }

        const storyData = await story.getStoryDataByCategory(catName)
        const progressLine = (affinityResult.actualAdded || 0) > 0 ? `\n${affinity.formatProgressLine(session.userId, affinityResult.actualAdded)}` : ''
        const textOutput = (storyData?.text || '这个分类暂时没有故事了...') + ticketLine + progressLine + buildAffinityCapNote(affinityResult)
        return renderImageFeature({
          feature: '酒狐故事',
          imageKey: 'imageStory',
          imageEnabled: finalConfig.imageStory,
          textOutput,
          session,
          detail: `mode=category category=${catName}`,
          extraChecks: [
            { key: 'hasStoryData', value: !!storyData, ok: !!storyData, reason: 'missing_story_data' },
          ],
          render: () => renderStoryCards(ctx, { data: storyData }),
          fallbackMessage: '酒狐悄悄话: 故事卡片生成失败了，请稍后再试一次...',
        })
      }

      const seasonData = season.getSeason()
      const storyData = await story.getRandomStoryData({ season, seasonData, preferSeasonChance: 0.6 })
      const progressLine = (affinityResult.actualAdded || 0) > 0 ? `\n${affinity.formatProgressLine(session.userId, affinityResult.actualAdded)}` : ''
      const textOutput = `${storyData.text}${ticketLine}${progressLine}${buildAffinityCapNote(affinityResult)}`
      return renderImageFeature({
        feature: '酒狐故事',
        imageKey: 'imageStory',
        imageEnabled: finalConfig.imageStory,
        textOutput,
        session,
        detail: 'mode=random',
        extraChecks: [
          { key: 'hasStoryData', value: !!storyData, ok: !!storyData, reason: 'missing_story_data' },
        ],
        render: () => renderStoryCards(ctx, { data: storyData }),
        fallbackMessage: '酒狐悄悄话: 故事卡片生成失败了，请稍后再试一次...',
      })
    })

  // ===== 酒狐故事目录 =====
  ctx.command('酒狐故事目录', '查看故事分类列表')
    .action(async ({ session }) => {
      const catalogData = story.getCatalogData()
      const textOutput = story.getCategoryList()

      return renderImageFeature({
        feature: '酒狐故事目录',
        imageKey: 'imageStoryCatalog',
        imageEnabled: finalConfig.imageStoryCatalog,
        textOutput,
        session,
        cacheKey: `storyCatalog:${hashJson(catalogData)}`,
        cacheTtlMs: 300000,
        extraChecks: [
          { key: 'hasCatalogData', value: !!catalogData, ok: !!catalogData, reason: 'missing_catalog_data' },
        ],
        render: () => renderStoryCatalogCard(ctx, { data: catalogData }),
        fallbackMessage: '酒狐悄悄话: 故事目录卡片生成失败了，请稍后再试一次...',
      })
    })

  // ===== 酒狐问答 =====
  ctx.command('酒狐问答', 'MC知识问答')
    .action(async ({ session }) => {
      const gate = checkLevelGate(session, '问答')
      if (gate) return gate
      const sessionKey = `${session.guildId || 'dm'}:${session.userId}`
      if (games.isInGuessing(sessionKey)) {
        return '酒狐悄悄话: 你正在猜数字呢，先完成当前游戏吧~'
      }
      const result = quiz.startQuiz(sessionKey, session.userId)
      return result.message
    })

  // 问答答题监听（中间件）
  ctx.middleware(async (session, next) => {
    const sessionKey = `${session.guildId || 'dm'}:${session.userId}`
    if (!quiz.isInQuiz(sessionKey)) return next()

    const text = (session.content || '').trim()
    if (!/^[A-Da-d]$/.test(text)) return next()

    const result = await quiz.answer(sessionKey, text)
    if (!result.answered) return next()
    logger.info(`[fox] 酒狐问答作答 user=${session.userId} guild=${session.guildId || 'private'} answer=${text.toUpperCase()} correct=${!!result.correct}`)

    if (result.correct) {
      const affinityResult = await affinity.addPoints(session.userId, result.reward)
      const ticketGrant = await grantDailyTickets(session.userId, 'quiz_correct')
      const quizTicketBonus = shop.getEquippedBonus(session.userId, 'quiz_ticket_bonus')
      let finalTicketReward = ticketGrant.granted
      let finalTickets = ticketGrant.newTickets
      if (quizTicketBonus > 0 && ticketGrant.granted > 0) {
        const extra = await affinity.addTickets(session.userId, quizTicketBonus)
        finalTicketReward += quizTicketBonus
        finalTickets = extra.newTickets
      }
      await trackAndNotify(session, 'quiz_correct')
      await trackCommission(session, 'quiz_correct')
      const ticketLine = finalTicketReward > 0
        ? `\n狐狐券 +${finalTicketReward} (当前 ${finalTickets} 张)`
        : `\n（今日问答狐狐券已领满，当前 ${finalTickets} 张）`
      return result.message + ticketLine + ((affinityResult.actualAdded || 0) > 0 ? `\n${affinity.formatProgressLine(session.userId, affinityResult.actualAdded)}` : '') + buildAffinityCapNote(affinityResult)
    } else {
      const enchantProtect = await shop.takeTempEffect(session.userId, 'quiz_protect')
      if (enchantProtect) {
        const protectedReward = 3
        const affinityResult = await affinity.addPoints(session.userId, protectedReward)
        const ticketGrant = await grantDailyTickets(session.userId, 'quiz_correct')
        const ticketLine = ticketGrant.granted > 0
          ? `\n狐狐券 +${ticketGrant.granted} (当前 ${ticketGrant.newTickets} 张)`
          : `\n（今日问答狐狐券已领满，当前 ${ticketGrant.newTickets} 张）`
        return result.message + '\n（附魔之书生效：这次答错没有扣好感，奖励照常发放。）' + ticketLine + ((affinityResult.actualAdded || 0) > 0 ? `\n${affinity.formatProgressLine(session.userId, affinityResult.actualAdded)}` : '') + buildAffinityCapNote(affinityResult)
      }
      await affinity.removePoints(session.userId, 1)
      await achievements.recordEvent(session.userId, 'quiz_wrong')
      return result.message + `\n${affinity.formatProgressLine(session.userId, -1)}`
    }
    return result.message
  }, true)

  // 猜数字答案监听（中间件）
  ctx.middleware(async (session, next) => {
    const sessionKey = `${session.guildId || 'dm'}:${session.userId}`
    if (!games.isInGuessing(sessionKey)) return next()

    const text = (session.content || '').trim()
    if (!/^\d+$/.test(text)) return next()

    const num = parseInt(text, 10)
    const result = games.playGuessNumber(sessionKey, num)
    logger.info(`[fox] 酒狐猜数作答 user=${session.userId} guild=${session.guildId || 'private'} guess=${num} finished=${!!result.finished} reward=${result.affinityBonus || 0}`)
    if (result.finished && result.success) {
      const affinityBonus = shop.getEquippedBonus(session.userId, 'affinity_bonus') + shop.getEquippedBonus(session.userId, 'all_affinity_bonus')
      const dailyCapBonus = shop.getEquippedBonus(session.userId, 'daily_cap_bonus')
      const decayImmune = shop.getEquippedBonus(session.userId, 'decay_immune') > 0
      const affinityResult = await affinity.addPoints(session.userId, result.affinityBonus + affinityBonus, { dailyCapBonus, decayImmune })
      const rewardKey = result.affinityBonus >= 5 ? 'guess_win_high' : result.affinityBonus >= 3 ? 'guess_win_mid' : 'guess_win_low'
      const ticketGrant = await grantDailyTickets(session.userId, rewardKey)
      await trackAndNotify(session, 'guess_win')
      await trackCommission(session, 'guess_win')
      const progressLine = (affinityResult.actualAdded || 0) > 0 ? affinity.formatProgressLine(session.userId, affinityResult.actualAdded) : ''
      const ticketLine = ticketGrant.granted > 0
        ? `\n狐狐券 +${ticketGrant.granted} (当前 ${ticketGrant.newTickets} 张)`
        : `\n（今日猜数奖励已领满，当前 ${ticketGrant.newTickets} 张）`
      const textOutput = result.message + ticketLine + (progressLine ? `\n${progressLine}` : '') + buildAffinityCapNote(affinityResult)
      return renderImageFeature({
        feature: '酒狐猜数结算',
        imageKey: 'imageGuessResult',
        imageEnabled: finalConfig.imageGuessResult,
        textOutput,
        session,
        detail: `answer=${result.answer || ''} attempts=${result.attempts || 0}`,
        render: () => renderGuessNumberResultCard(ctx, {
          data: {
            success: true,
            answer: result.answer,
            attempts: result.attempts,
            summary: result.summary || result.message,
            ticketReward: ticketGrant.granted,
            progressLine: progressLine || '今日好感已达上限',
            message: result.message,
          },
        }),
        fallbackMessage: '酒狐悄悄话: 猜数结算卡片生成失败了，请稍后再试一次...',
      })
    }
    if (result.finished) {
      let affinityResult = { actualAdded: 0, capped: false }
      if (result.affinityBonus > 0) {
        affinityResult = await affinity.addPoints(session.userId, result.affinityBonus)
      }
      return renderImageFeature({
        feature: '酒狐猜数结算',
        imageKey: 'imageGuessResult',
        imageEnabled: finalConfig.imageGuessResult,
        session,
        textOutput: result.affinityBonus > 0
          ? `${result.message}${(affinityResult.actualAdded || 0) > 0 ? `\n${affinity.formatProgressLine(session.userId, affinityResult.actualAdded)}` : ''}${buildAffinityCapNote(affinityResult)}`
          : result.message,
        detail: `answer=${result.answer || ''} attempts=${result.attempts || 0}`,
        render: () => renderGuessNumberResultCard(ctx, {
          data: {
            success: false,
            answer: result.answer,
            attempts: result.attempts,
            summary: result.summary || result.message,
            ticketReward: 0,
            progressLine: result.affinityBonus > 0 && (affinityResult.actualAdded || 0) > 0 ? affinity.formatProgressLine(session.userId, affinityResult.actualAdded) : '今日好感已达上限',
            message: result.message,
          },
        }),
        fallbackMessage: '酒狐悄悄话: 猜数结算卡片生成失败了，请稍后再试一次...',
      })
    }
    return result.message
  }, true)

  // ===== 酒狐酿酒 =====
  ctx.command('酒狐酿酒 [recipe:text]', '酿酒系统')
    .action(async ({ session }, recipe) => {
      const gate = checkLevelGate(session, '酿酒')
      if (gate) return gate
      if (!recipe || !recipe.trim()) return brewing.getRecipeList()

      const result = await brewing.startBrewing(session.userId, recipe.trim())
      if (!result.success) return result.message

      if (result.cost > 0) {
        const spend = await affinity.spendTickets(session.userId, result.cost)
        if (!spend.success) {
          return `酒狐悄悄话: 狐狐券不够消耗呢...需要 ${result.cost} 张，主人当前只有 ${spend.newTickets} 张。`
        }
      }
      const brewQualityBoost = shop.getEquippedBonus(session.userId, 'brew_quality_bonus') + Number(await shop.takeTempEffect(session.userId, 'next_brew_quality_boost') || 0)
      await brewing.confirmBrewing(session.userId, result._recipeName, shop.getEquippedBonus(session.userId, 'brew_time_reduction'), brewQualityBoost)
      const textOutput = result.message
      return renderImageFeature({
        feature: '酒狐酿酒结果',
        imageKey: 'imageBrewResult',
        imageEnabled: finalConfig.imageBrewResult,
        textOutput,
        session,
        render: () => renderBrewResultCard(ctx, {
          data: brewing.getBrewResultCardData(result),
        }),
        fallbackMessage: '酒狐悄悄话: 酿酒结果卡片生成失败了，请稍后再试一次...',
      })
    })

  // ===== 酒狐酒窖 =====
  ctx.command('酒狐酒窖', '查看酿酒进度')
    .action(({ session }) => {
      const textOutput = brewing.getCellar(session.userId)
      return renderImageFeature({
        feature: '酒狐酒窖',
        imageKey: 'imageCellar',
        imageEnabled: finalConfig.imageCellar,
        textOutput,
        session,
        render: () => renderCellarCard(ctx, {
          data: brewing.getCellarCardData(session.userId),
        }),
        fallbackMessage: '酒狐悄悄话: 酒窖卡片生成失败了，请稍后再试一次...',
      })
    })

  // ===== 酒狐开瓶 =====
  ctx.command('酒狐开瓶', '品尝酿好的酒')
    .action(async ({ session }) => {
      const result = await brewing.openBottle(session.userId)
      if (result.success) {
        await affinity.addBonusPoints(session.userId, result.reward)
        const ticketMap = { '普通': 3, '优良': 8, '极品': 15, '稀有': 25, '传说': 50 }
        const ticketReward = ticketMap[result.quality] || 0
        const ticketResult = await affinity.addTickets(session.userId, ticketReward)
        await trackAndNotify(session, 'brew')
        await trackCommission(session, 'brew')
        if (result.quality === '传说') await trackAndNotify(session, 'brew_legendary')
        mood.onEvent('tipsy')
        const textOutput = result.message + `\n狐狐券 +${ticketReward} (当前 ${ticketResult.newTickets} 张)\n${affinity.formatProgressLine(session.userId, result.reward)}`
	        return renderImageFeature({
	          feature: '酒狐开瓶结果',
	          imageKey: 'imageOpenBottleResult',
	          imageEnabled: finalConfig.imageOpenBottleResult,
	          textOutput,
	          session,
	          render: () => renderOpenBottleResultCard(ctx, {
	            data: {
	              ...brewing.getOpenBottleResultCardData(result),
	              ticketReward,
              ticketBalance: ticketResult.newTickets,
            },
          }),
          fallbackMessage: '酒狐悄悄话: 开瓶结果卡片生成失败了，请稍后再试一次...',
        })
      }
      if (result.spoiled) {
        await affinity.removePoints(session.userId, result.penalty || 3)
        return result.message + `\n${affinity.formatProgressLine(session.userId, -(result.penalty || 3))}`
      }
      return result.message
    })

  // ===== 酒狐商店 =====
  ctx.command('酒狐商店', '浏览商品')
    .action(async ({ session }) => {
      const gate = checkLevelGate(session, '商店')
      if (gate) return gate
      const status = affinity.getStatus(session.userId)
      const shopData = shop.getShopData(status.level.level)
      const textOutput = shop.getShopList(status.level.level)

      return renderImageFeature({
        feature: '酒狐商店',
        imageKey: 'imageShop',
        imageEnabled: finalConfig.imageShop,
        textOutput,
        session,
        render: () => renderShopCard(ctx, { data: shopData }),
        fallbackMessage: '酒狐悄悄话: 商店卡片生成失败了，请稍后再试一次...',
      })
    })

  ctx.command('酒狐动态商店', '查看今日动态商店（轮换特供）')
    .action(({ session }) => {
      const gate = checkLevelGate(session, '商店')
      if (gate) return gate
      const status = affinity.getStatus(session.userId)
      const today = require('./lib/utils').getTodayKey()
      const deals = dynamicShop.getDeals(today)
      const purchased = dynamicShop.getPurchasedSnapshot(session.userId, today)

      if (!deals || deals.length === 0) {
        return '酒狐悄悄话: 今日动态商店暂时不可用...稍后再试试？'
      }

      const typeLabel = (type) => (type === 'equip' ? '[装备]' : '[消耗]')

      const lines = [
        '== 酒狐动态商店（今日特供） ==',
        '',
        `日期: ${today}`,
        `狐狐券余额: ${status.tickets} 张`,
        '',
        ...deals.flatMap((deal, index) => {
          const lockedTag = status.level.level >= deal.levelRequired ? '' : ` [需Lv${deal.levelRequired}]`
          const boughtTag = purchased[deal.itemId] ? ' （已购）' : ''
          const priceLine = `特供价 ${deal.dealPrice}券（原价 ${deal.basePrice}券，-${deal.discountPct}%）`
          const title = `${index + 1}. ${typeLabel(deal.type)} ${deal.name}${lockedTag}${boughtTag}`
          const desc = deal.description ? `  ${deal.description}` : ''
          return [title, `  ${priceLine}`, desc].filter(Boolean)
        }),
        '',
        '购买：',
        '- 酒狐动态购买 <物品名>',
        '',
        '提示：每个特供物品每日限购 1 次；折扣与轮换每天刷新。',
      ]

      return lines.join('\n')
    })

  ctx.command('酒狐动态购买 <item:text>', '从今日动态商店购买（每项每日限购 1 次）')
    .action(async ({ session }, item) => {
      if (!item || !item.trim()) return '酒狐悄悄话: 请输入要购买的物品名，例如：酒狐动态购买 围巾'
      const status = affinity.getStatus(session.userId)
      const today = require('./lib/utils').getTodayKey()
      const deals = dynamicShop.getDeals(today)
      const trimmed = item.trim()
      const deal = deals.find(d => d.name === trimmed)

      if (!deal) {
        const names = deals.map(d => d.name).filter(Boolean).slice(0, 8)
        return [
          `酒狐悄悄话: 今日特供里没有「${trimmed}」哦。`,
          '',
          '先用「酒狐动态商店」看看今日有哪些特供吧~',
          names.length > 0 ? `（今日特供示例：${names.join(' / ')}）` : '',
        ].filter(Boolean).join('\n')
      }

      if (dynamicShop.hasPurchased(session.userId, today, deal.itemId)) {
        return `酒狐悄悄话: 「${deal.name}」你今天已经在特供里买过一次啦（每日限购 1 次）。`
      }

      const result = shop.buyItem(session.userId, deal.name, status.level.level)
      if (!result.success) return result.message

      const cost = Number(deal.dealPrice || 0) || result.cost
      const spend = await affinity.spendTickets(session.userId, cost)
      if (!spend.success) {
        return `酒狐悄悄话: 狐狐券不够呢...需要 ${cost} 张（特供价），主人当前只有 ${spend.newTickets} 张。`
      }

      await shop.confirmBuy(session.userId, result)
      await dynamicShop.markPurchased(session.userId, today, deal.itemId)

      const base = Number(deal.basePrice || result.cost) || result.cost
      const discountText = base > 0 ? `（原价 ${base}，特供 ${cost}，-${deal.discountPct}%）` : ''

      return [
        `酒狐悄悄话: 今日特供购买成功！${discountText}`,
        result.message,
      ].filter(Boolean).join('\n')
    })

  // ===== 酒狐购买 =====
  ctx.command('酒狐购买 <item:text>', '购买物品')
    .action(async ({ session }, item) => {
      if (!item || !item.trim()) return '请指定物品名，例如：酒狐购买 狐狸耳饰'
      const status = affinity.getStatus(session.userId)
      const result = shop.buyItem(session.userId, item.trim(), status.level.level)
      if (!result.success) return result.message

      if (result.cost > 0) {
        const spend = await affinity.spendTickets(session.userId, result.cost)
        if (!spend.success) {
          return `酒狐悄悄话: 狐狐券不够呢...需要 ${result.cost} 张，主人当前只有 ${spend.newTickets} 张。`
        }
      }
      await shop.confirmBuy(session.userId, result)

      const textOutput = result.message
      const foxLines = responseData.actionResultQuotesBuy || ['买到了就要好好用哦。']
      const foxLine = require('./lib/utils').randomPick(foxLines)
      const itemName = result._itemName || item.trim()
      const itemType = result._itemType || 'unknown'
      const suggestions = itemType === 'equip'
        ? [`酒狐装备 ${itemName}`, '酒狐背包']
        : [`酒狐使用 ${itemName}`, '酒狐背包']

      return renderImageFeature({
        feature: '酒狐购买结果',
        imageKey: 'imageBuyResult',
        imageEnabled: finalConfig.imageBuyResult,
        textOutput,
        session,
        detail: `item=${itemName}`,
        render: () => renderBuyResultCard(ctx, {
          data: {
            tag: '商店',
            itemId: result._itemId,
            itemName,
            mainRows: [
              { label: '物品', value: itemName, muted: `消耗狐狐券 ${result.cost} 张` },
              { label: '类型', value: itemType === 'equip' ? '装备' : '消耗品' },
            ],
            suggestions,
            foxLine,
          },
        }),
        fallbackMessage: '酒狐悄悄话: 购买结果卡片生成失败了，请稍后再试一次...',
      })
    })

  // ===== 酒狐背包 =====
  ctx.command('酒狐背包', '查看背包')
    .action(async ({ session }) => {
      const inventoryData = shop.getInventoryData(session.userId)
      const textOutput = shop.getInventory(session.userId)

      return renderImageFeature({
        feature: '酒狐背包',
        imageKey: 'imageInventory',
        imageEnabled: finalConfig.imageInventory,
        textOutput,
        session,
        render: () => renderInventoryCard(ctx, { data: inventoryData }),
        fallbackMessage: '酒狐悄悄话: 背包卡片生成失败了，请稍后再试一次...',
      })
    })

  // ===== 酒狐装备 =====
  ctx.command('酒狐装备 <item:text>', '装备物品')
    .action(async ({ session }, item) => {
      if (!item || !item.trim()) return '请指定要装备的物品名'
      const result = await shop.equip(session.userId, item.trim())
      if (!result.success) {
        return result.message
      }

      return renderImageFeature({
        feature: '酒狐装备结果',
        imageKey: 'imageEquipResult',
        imageEnabled: finalConfig.imageEquipResult,
        session,
        textOutput: result.message,
        detail: `item=${item.trim()}`,
        render: () => renderEquipResultCard(ctx, {
          data: {
            itemId: result.itemId || item.trim(),
            itemName: item.trim(),
            message: result.message,
          },
        }),
        fallbackMessage: '酒狐悄悄话: 装备结果卡片生成失败了，请稍后再试一次...',
      })
    })

  // ===== 酒狐使用 =====
  ctx.command('酒狐使用 <item:text>', '使用消耗品')
    .action(async ({ session }, item) => {
      if (!item || !item.trim()) return '请指定要使用的物品名'
      const result = await shop.useItem(session.userId, item.trim())
      const multiplier = getConsumableBoostMultiplier(session.userId)
      const extraLines = []

      if (result.success && result.effect) {
        if (result.effect === 'mood_happy') mood.onEvent('happy')
        else if (result.effect === 'mood_lazy') mood.onEvent('lazy')
        else if (result.effect === 'mood_tipsy') mood.onEvent('tipsy')
        else if (result.effect === 'cake_plus') {
          const bonus = 2 * multiplier
          await affinity.addBonusPoints(session.userId, bonus)
          extraLines.push(`额外好感 +${bonus}`)
        } else if (result.effect === 'next_affinity_boost_small') {
          const bonus = 1 * multiplier
          await shop.setTempEffect(session.userId, 'next_affinity_bonus', bonus)
          extraLines.push(`下一次互动额外好感 +${bonus}`)
        } else if (result.effect === 'next_affinity_boost_medium') {
          const bonus = 3 * multiplier
          await shop.setTempEffect(session.userId, 'next_affinity_bonus', bonus)
          extraLines.push(`下一次互动额外好感 +${bonus}`)
        } else if (result.effect === 'cooldown_reset') {
          clearUserCooldowns(session.userId)
          extraLines.push('互动冷却已全部重置')
        } else if (result.effect === 'fate_coin') {
          if (Math.random() < 0.5) {
            const tickets = 10 * multiplier
            const ticketResult = await affinity.addTickets(session.userId, tickets)
            extraLines.push(`命运偏向好运，狐狐券 +${tickets} (当前 ${ticketResult.newTickets} 张)`)
          } else {
            const penalty = 2
            await affinity.removePoints(session.userId, penalty)
            extraLines.push(`命运偏向坏运，好感 -${penalty}`)
          }
        } else if (result.effect === 'double_checkin') {
          await shop.setTempEffect(session.userId, 'next_checkin_ticket_multiplier', 2)
          extraLines.push('下一次签到的狐狐券奖励将翻倍')
        } else if (result.effect === 'luck_boost') {
          const boost = multiplier > 1 ? 0.4 : 0.2
          await shop.setTempEffect(session.userId, 'next_brew_quality_boost', boost)
          extraLines.push('下一次开瓶更容易提升品质')
        } else if (result.effect === 'guaranteed_rare') {
          await shop.setTempEffect(session.userId, 'guaranteed_rare', 1)
          extraLines.push('下一次互动必定触发稀有语录')
        } else if (result.effect === 'enchant_book') {
          await shop.setTempEffect(session.userId, 'quiz_protect', 1)
          extraLines.push('下一次问答答错不会扣好感，并照常拿奖励')
        } else if (result.effect === 'time_reverse') {
          const success = await brewing.finishNow(session.userId)
          extraLines.push(success ? '正在酿造的酒已被立刻完成' : '当前没有正在酿造的酒，效果静静散去了')
        } else if (result.effect === 'golden_apple') {
          const currentCount = Number(shop.getTempEffect(session.userId, 'stacked_affinity_bonus_count') || 0)
          const currentValue = Number(shop.getTempEffect(session.userId, 'stacked_affinity_bonus_value') || 0)
          await shop.setTempEffect(session.userId, 'stacked_affinity_bonus_count', currentCount + 5)
          await shop.setTempEffect(session.userId, 'stacked_affinity_bonus_value', Math.max(currentValue, multiplier))
          extraLines.push(`接下来 5 次互动额外好感 +${multiplier}`)
        } else if (result.effect === 'mystery_potion') {
          const pool = ['fortune', 'story', 'favorite', 'rps_play']
          const pickedEvent = require('./lib/utils').randomPick(pool)
          await achievements.recordEvent(session.userId, pickedEvent, 1)
          extraLines.push(`一项成就进度被神秘推进了（${pickedEvent}）`)
        } else if (result.effect === 'teleport_pearl') {
          const bonus = 4 * multiplier
          await affinity.addBonusPoints(session.userId, bonus)
          extraLines.push(`瞬间拉近距离，好感 +${bonus}`)
        } else if (result.effect === 'dragon_breath') {
          if (Math.random() < 0.6) {
            const bonus = 6 * multiplier
            const tickets = 8 * multiplier
            await affinity.addBonusPoints(session.userId, bonus)
            const ticketResult = await affinity.addTickets(session.userId, tickets)
            await shop.setTempEffect(session.userId, 'guaranteed_rare', 1)
            extraLines.push(`龙息爆发成功：好感 +${bonus}，狐狐券 +${tickets} (当前 ${ticketResult.newTickets} 张)，并获得下一次稀有保底`)
          } else {
            const penalty = 3
            await affinity.removePoints(session.userId, penalty)
            extraLines.push(`龙息失控了...好感 -${penalty}`)
          }
        } else if (result.effect === 'random_rare' && quotesLoader.getTotalRareCount() > 0) {
          const rareQuote = quotesLoader.getRandomRareQuote()
          if (rareQuote) {
            const isNew = await affinity.unlockRare(session.userId, rareQuote)
            let extra = `\n\n* 稀有语录 *\n${rareQuote}`
            if (isNew) extra += '\n(已收录至「酒狐图鉴」)'
            extraLines.push(extra.trim())
          }
        }
      }
      if (!result.success) {
        return result.message
      }

      const finalMessage = extraLines.length > 0
        ? `${result.message}\n${extraLines.join('\n')}`
        : result.message

      return renderImageFeature({
        feature: '酒狐使用结果',
        imageKey: 'imageUseResult',
        imageEnabled: finalConfig.imageUseResult,
        session,
        textOutput: finalMessage,
        detail: `item=${item.trim()}`,
        render: () => renderUseResultCard(ctx, {
          data: {
            itemId: result.itemId || item.trim(),
            itemName: item.trim(),
            message: finalMessage,
            effect: result.effect,
          },
        }),
        fallbackMessage: '酒狐悄悄话: 使用结果卡片生成失败了，请稍后再试一次...',
      })
    })

  // ===== 酒狐回忆 =====
  ctx.command('酒狐回忆', '查看回忆录')
    .action(async ({ session }) => {
      const memoirData = memoir.getMemoirData(session.userId)
      const textOutput = memoir.getMemoir(session.userId)

      return renderImageFeature({
        feature: '酒狐回忆',
        imageKey: 'imageMemoir',
        imageEnabled: finalConfig.imageMemoir,
        textOutput,
        session,
        extraChecks: [
          { key: 'hasMemoirData', value: !!memoirData, ok: !!memoirData, reason: 'missing_memoir_data' },
        ],
        render: () => renderMemoirCard(ctx, {
          userName: session.username || session.author?.name || session.userId,
          data: memoirData,
        }),
        fallbackMessage: '酒狐悄悄话: 回忆卡片生成失败了，请稍后再试一次...',
      })
    })

  // ===== 酒狐成就 =====
  ctx.command('酒狐成就', '查看成就徽章')
    .action(async ({ session }) => {
      const achievementData = achievements.getPanelData(session.userId)
      const textOutput = achievements.getPanel(session.userId)

      return renderImageFeature({
        feature: '酒狐成就',
        imageKey: 'imageAchievement',
        imageEnabled: finalConfig.imageAchievement,
        textOutput,
        session,
        render: () => renderAchievementCard(ctx, { data: achievementData }),
        fallbackMessage: '酒狐悄悄话: 成就卡片生成失败了，请稍后再试一次...',
      })
    })

  // ===== 酒狐排行 =====
  ctx.command('酒狐排行', '好感度排行榜 Top10')
    .action(async ({ session }) => {
      const rankingData = getRankingData()
      const textOutput = rankingData.isEmpty
        ? '还没有人和酒狐互动过呢...'
        : ['== 酒狐好感度排行榜 ==', '', ...rankingData.entries.map((entry) => {
          const prefix = entry.rank <= 3 ? `[${entry.rank}]` : `[${entry.rank}]`
          return `${prefix} ${entry.userId} - ${entry.points}点 (${entry.levelName})`
        })].join('\n')

      return renderImageFeature({
        feature: '酒狐排行',
        imageKey: 'imageRanking',
        imageEnabled: finalConfig.imageRanking,
        textOutput,
        session,
        render: () => renderRankingCard(ctx, { data: rankingData }),
        fallbackMessage: '酒狐悄悄话: 排行卡片生成失败了，请稍后再试一次...',
      })
    })

  // ===== 酒狐送礼 =====
  ctx.command('酒狐送礼 <target:text>', '通过酒狐向他人赠送好感度')
    .action(async ({ session }, target) => {
      if (!target || !target.trim()) return '请指定送礼对象，例如：酒狐送礼 @某人'
      let targetId = target.trim()
      const atMatch = targetId.match(/<at id="([^"]+)"/)
      if (atMatch) targetId = atMatch[1]
      const cqMatch = targetId.match(/\[CQ:at,qq=(\d+)\]/)
      if (cqMatch) targetId = cqMatch[1]
      if (targetId === session.userId) return '酒狐悄悄话: 不能送给自己哦...'

      const giftLimit = finalConfig.giftDailyLimit ?? 3
      const giftCost = finalConfig.giftCostSender ?? 1
      const giftBonus = finalConfig.giftBonusReceiver ?? 2

      const senderData = affinity._getUserData(session.userId)
      const today = new Date().toISOString().slice(0, 10)
      if (!senderData.giftLog) senderData.giftLog = { date: '', count: 0 }
      if (senderData.giftLog.date !== today) senderData.giftLog = { date: today, count: 0 }
      if (senderData.giftLog.count >= giftLimit) return `酒狐悄悄话: 今天已经送了${giftLimit}次了，明天再来吧~`
      if (senderData.points < giftCost) return '酒狐悄悄话: 好感度不够扣除了...先和我多互动吧~'

      senderData.points = Math.max(0, senderData.points - giftCost)
      senderData.giftLog.count++
      await affinity.addPoints(targetId, giftBonus)
      await affinity._save()
      await trackAndNotify(session, 'gift')
      await trackCommission(session, 'gift')

      const textOutput = `酒狐悄悄话: 已帮主人把心意传达给 ${targetId} 了！\n（你 -${giftCost}好感度，对方 +${giftBonus}好感度）`
      const foxLines = responseData.actionResultQuotesGift || ['我会好好传达的。']
      const foxLine = require('./lib/utils').randomPick(foxLines)

      return renderImageFeature({
        feature: '酒狐送礼结果',
        imageKey: 'imageGiftResult',
        imageEnabled: finalConfig.imageGiftResult,
        textOutput,
        session,
        detail: `target=${targetId}`,
        render: () => renderGiftResultCard(ctx, {
          data: {
            tag: '社交',
            mainRows: [
              { label: '对象', value: targetId, muted: `你 -${giftCost} / 对方 +${giftBonus}` },
            ],
            suggestions: ['酒狐排行', '酒狐回忆'],
            foxLine,
          },
        }),
        fallbackMessage: '酒狐悄悄话: 送礼结果卡片生成失败了，请稍后再试一次...',
      })
    })

  // ===== 酒狐收藏 =====
  ctx.command('酒狐收藏', '收藏最近收到的语录')
    .action(async ({ session }) => {
      const result = await favorites.addFavorite(session.userId)
      if (result.success) {
        await trackAndNotify(session, 'favorite')
        await trackCommission(session, 'favorite')
      }
      return result.message
    })

  // ===== 酒狐收藏夹 =====
  ctx.command('酒狐收藏夹 [page:number]', '查看收藏列表')
    .action(({ session }, page) => {
      const safePage = page || 1
      const data = favorites.getFavoritesData(session.userId, safePage)
      const textOutput = favorites.listFavorites(session.userId, safePage)
      if (data.isEmpty) return textOutput

      return renderImageFeature({
        feature: '酒狐收藏夹',
        imageKey: 'imageFavorites',
        imageEnabled: finalConfig.imageFavorites,
        textOutput,
        session,
        detail: `page=${data.page}`,
        render: () => renderFavoritesCard(ctx, { data }),
        fallbackMessage: '酒狐悄悄话: 收藏夹卡片生成失败了，请稍后再试一次...',
      })
    })

  // ===== 酒狐取消收藏 =====
  ctx.command('酒狐取消收藏 <index:number>', '取消收藏')
    .action(async ({ session }, index) => {
      if (!index) return '请指定编号，例如：酒狐取消收藏 3'
      const result = await favorites.removeFavorite(session.userId, index)
      return result.message
    })

  // ===== 酒狐天气 =====
  ctx.command('酒狐天气', 'MC风格天气播报')
    .action(async ({ session }) => {
      const consumableAffinityBonus = await consumeInteractionBonus(session.userId)
      await trackAndNotify(session, 'interact')
      const seasonData = season.getSeason()
      const weatherData = weather.getWeather({ season: seasonData })
      if (mood && weatherData.moodEffect) mood.onEvent('interact')
      await affinity.addPoints(session.userId, consumableAffinityBonus)
      const ticketGrant = await grantDailyTickets(session.userId, 'weather')
      const rareExtra = await trySpecialRareDrop(session, '天气', ['极光', '星空璀璨', '雨后彩虹'].includes(weatherData.name) ? 0.18 : 0.04)
      const ticketLine = ticketGrant.granted > 0
        ? `\n狐狐券 +${ticketGrant.granted} (当前 ${ticketGrant.newTickets} 张)`
        : `\n（今日天气狐狐券已领满，当前 ${ticketGrant.newTickets} 张）`
      const textOutput = `${weather.getReport({ season: seasonData })}\n季节: ${seasonData.name}\n下次更替: ${seasonData.remainingLabel}\n${ticketLine}${rareExtra}`
      const periodMap = {
        latenight: '深夜',
        dawn: '清晨',
        morning: '上午',
        noon: '中午',
        afternoon: '下午',
        evening: '傍晚',
        night: '夜晚',
      }
      const periodKey = require('./lib/utils').getTimePeriod()

      return renderImageFeature({
        feature: '酒狐天气',
        imageKey: 'imageWeather',
        imageEnabled: finalConfig.imageWeather,
        textOutput,
        session,
        render: () => renderWeatherCard(ctx, {
          data: {
            title: '酒狐天气',
            weatherType: weatherData.type,
            status: weatherData.name,
            period: periodMap[periodKey] || '未知',
            seasonId: seasonData.id,
            season: seasonData.name,
            mode: seasonData.isManualOverride ? '手动干预中' : '自动轮换中',
            nextChange: seasonData.remainingLabel,
            body: weatherData.description,
            ticketReward: ticketGrant.granted,
            foxComment: `${weatherData.foxComment}${rareExtra ? '\n今天的天空像是藏了一句格外珍贵的悄悄话。' : ''}`,
          },
        }),
        fallbackMessage: '酒狐悄悄话: 天气卡片生成失败了，请稍后再试一次...',
      })
    })

  // ===== 酒狐季节 =====
  ctx.command('酒狐季节', '查看当前循环季节')
    .action(({ session }) => {
      const seasonData = season.getSeason()
      const textOutput = season.getReport(seasonData)

      return renderImageFeature({
        feature: '酒狐季节',
        imageKey: 'imageSeason',
        imageEnabled: finalConfig.imageSeason,
        textOutput,
        session,
        render: () => renderSeasonCard(ctx, {
          data: {
            title: '酒狐季节',
            seasonId: seasonData.id,
            season: seasonData.name,
            cycleHours: seasonData.cycleHours,
            mode: seasonData.isManualOverride ? '手动干预中' : '自动轮换中',
            nextChange: seasonData.remainingLabel,
            description: seasonData.description,
            recommendations: seasonData.recommendations,
            foxComment: seasonData.foxComment,
            footerText: getSeasonModeFooter(),
          },
        }),
        fallbackMessage: '酒狐悄悄话: 季节卡片生成失败了，请稍后再试一次...',
      })
    })

  ctx.command('酒狐季节设置 [seasonName:text]', '手动设置当前循环季节', { authority: 3 })
    .action((_, seasonName) => {
      const currentSeason = season.getSeason()
      const seasons = listSeasons()

      if (!seasonName || !seasonName.trim()) {
        return [
          '== 酒狐季节设置 ==',
          '',
          `当前季节: ${currentSeason.name}`,
          `下次更替: ${currentSeason.remainingLabel}`,
          '',
          '可设置季节:',
          ...seasons.map(item => `- ${item.name} (${item.id})`),
          '',
          '使用「酒狐季节设置 春季」进行切换',
        ].join('\n')
      }

      const resolved = resolveSeason(seasonName)
      if (!resolved) {
        return [
          `酒狐悄悄话: 没找到「${seasonName.trim()}」这个季节哦。`,
          '',
          '可设置季节:',
          ...seasons.map(item => `- ${item.name}`),
        ].join('\n')
      }

      const result = season.setSeason(resolved.id)
      if (!result.success) {
        return '酒狐悄悄话: 季节切换失败了，请稍后再试一次...'
      }

      logger.info(`[fox] 循环季节已切换为 ${result.season.name} (${result.season.id})`)
      return [
        `酒狐悄悄话: 已切换到「${result.season.name}」！`,
        result.season.description,
        `下次更替: ${result.season.remainingLabel}`,
      ].join('\n')
    })

  ctx.command('酒狐季节周期 [hours:number]', '手动设置循环季节周期', { authority: 3 })
    .action((_, hours) => {
      const currentSeason = season.getSeason()

      if (!hours || hours < 1) {
        return [
          '== 酒狐季节周期 ==',
          '',
          `当前季节: ${currentSeason.name}`,
          `当前周期: 每 ${currentSeason.cycleHours} 小时轮换一次`,
          `下次更替: ${currentSeason.remainingLabel}`,
          '',
          '使用「酒狐季节周期 12」可以改成每 12 小时轮换一次',
        ].join('\n')
      }

      const result = season.setCycleHours(hours)
      if (!result.success) {
        return '酒狐悄悄话: 季节周期设置失败了，请输入大于等于 1 的小时数。'
      }

      logger.info(`[fox] 循环季节周期已调整为 ${result.season.cycleHours} 小时`)
      return [
        `酒狐悄悄话: 循环季节周期已改为每 ${result.season.cycleHours} 小时切换一次！`,
        `当前季节: ${result.season.name}`,
        `下次更替: ${result.season.remainingLabel}`,
      ].join('\n')
    })

  ctx.command('酒狐季节状态', '查看循环季节当前状态', { authority: 3 })
    .action(() => {
      const currentSeason = season.getSeason()
      const modeLabel = currentSeason.isManualOverride ? '手动干预中' : '自动轮换中'
      return [
        '== 酒狐季节状态 ==',
        '',
        `当前季节: ${currentSeason.name}`,
        `当前模式: ${modeLabel}`,
        `手动指定季节: ${currentSeason.isManualSeason ? '是' : '否'}`,
        `手动调整周期: ${currentSeason.isManualCycle ? '是' : '否'}`,
        `当前周期: 每 ${currentSeason.cycleHours} 小时切换一次`,
        `默认周期: 每 ${currentSeason.defaultCycleHours} 小时切换一次`,
        `下次更替: ${currentSeason.remainingLabel}`,
      ].join('\n')
    })

  ctx.command('酒狐季节恢复自动', '恢复默认循环季节周期', { authority: 3 })
    .action(() => {
      const defaultCycleHours = Math.max(1, Number(finalConfig.seasonCycleHours) || 24)
      const currentSeason = season.getSeason()

      if (!currentSeason.isManualOverride && currentSeason.cycleHours === defaultCycleHours) {
        return [
          '酒狐悄悄话: 当前季节轮换已经是默认自动节奏了。',
          `当前季节: ${currentSeason.name}`,
          `默认周期: 每 ${defaultCycleHours} 小时切换一次`,
          `下次更替: ${currentSeason.remainingLabel}`,
        ].join('\n')
      }

      const result = season.restoreAuto()
      if (!result.success) {
        return '酒狐悄悄话: 恢复默认季节节奏失败了，请稍后再试一次...'
      }

      logger.info(`[fox] 循环季节周期已恢复为默认值 ${defaultCycleHours} 小时`)
      return [
        '酒狐悄悄话: 已恢复默认季节轮换节奏！',
        `当前季节: ${result.season.name}`,
        `默认周期: 每 ${result.season.cycleHours} 小时切换一次`,
        `下次更替: ${result.season.remainingLabel}`,
      ].join('\n')
    })

  // ===== 酒狐委托 =====
  ctx.command('酒狐委托', '查看今日委托任务')
    .action(async ({ session }) => {
      const gate = checkLevelGate(session, '委托')
      if (gate) return gate
      const today = require('./lib/utils').getTodayKey()
      const data = await commission.getDailyTasksData(session.userId, today)
      const textOutput = await commission.getDailyTasks(session.userId, today)

      return renderImageFeature({
        feature: '酒狐委托',
        imageKey: 'imageCommission',
        imageEnabled: finalConfig.imageCommission,
        textOutput,
        session,
        render: () => renderCommissionCard(ctx, { data }),
        fallbackMessage: '酒狐悄悄话: 委托任务板卡片生成失败了，请稍后再试一次...',
      })
    })

  // ===== 酒狐偏好 / 群设置 =====
  function parseToggleInput(value) {
    const normalized = String(value || '').trim()
    if (!normalized) return { kind: 'query' }

    const onWords = new Set(['开', '开启', '启用', 'on', 'true', '1', 'yes', 'y'])
    const offWords = new Set(['关', '关闭', '禁用', 'off', 'false', '0', 'no', 'n'])
    const clearWords = new Set(['默认', '清除', '取消', 'reset', 'unset', 'none'])

    if (onWords.has(normalized)) return { kind: 'set', value: true }
    if (offWords.has(normalized)) return { kind: 'set', value: false }
    if (clearWords.has(normalized)) return { kind: 'clear', value: null }
    return { kind: 'invalid', value: normalized }
  }

  ctx.command('酒狐偏好', '查看个人偏好设置')
    .action(({ session }) => {
      return prefs.formatPrefsSummary(session, getActiveCardThemeInfo().id)
    })

  ctx.command('酒狐偏好.文字 [value:text]', '强制文字输出（开/关/默认）')
    .action(async ({ session }, value) => {
      const parsed = parseToggleInput(value)
      if (parsed.kind === 'query') {
        return [
          '== 酒狐偏好 · 文字 ==',
          '',
          '用法：',
          '- 酒狐偏好 文字 开    # 强制文字（禁用图片）',
          '- 酒狐偏好 文字 关    # 允许图片（按各指令配置）',
          '- 酒狐偏好 文字 默认  # 清除个人设置，交给群/全局配置',
        ].join('\n')
      }
      if (parsed.kind === 'invalid') {
        return `酒狐悄悄话: 不认识「${parsed.value}」这个参数哦，请用 开/关/默认。`
      }

      const patch = parsed.kind === 'clear' ? { forceText: null } : { forceText: parsed.value }
      await prefs.setUserPrefs(session, patch)
      return prefs.formatPrefsSummary(session, getActiveCardThemeInfo().id)
    })

  ctx.command('酒狐偏好.被动 [value:text]', '控制“我的发言触发被动冒泡”（开/关/默认）')
    .action(async ({ session }, value) => {
      const parsed = parseToggleInput(value)
      if (parsed.kind === 'query') {
        return [
          '== 酒狐偏好 · 被动 ==',
          '',
          '说明：这里只控制“你的消息是否允许触发关键词被动冒泡”。',
          '用法：',
          '- 酒狐偏好 被动 开    # 允许你的消息触发（默认）',
          '- 酒狐偏好 被动 关    # 禁用你的消息触发',
          '- 酒狐偏好 被动 默认  # 清除个人设置',
        ].join('\n')
      }
      if (parsed.kind === 'invalid') {
        return `酒狐悄悄话: 不认识「${parsed.value}」这个参数哦，请用 开/关/默认。`
      }

      // disablePassiveKeywordTrigger: true = 不允许触发
      const patch = parsed.kind === 'clear'
        ? { disablePassiveKeywordTrigger: null }
        : { disablePassiveKeywordTrigger: parsed.value ? false : true }
      await prefs.setUserPrefs(session, patch)
      return prefs.formatPrefsSummary(session, getActiveCardThemeInfo().id)
    })

  ctx.command('酒狐偏好.主题 [theme:text]', '设置个人图片主题（会覆盖全局/群主题）')
    .action(async ({ session }, theme) => {
      const themes = listCardThemes()

      if (!theme || !theme.trim()) {
        const resolvedThemeId = prefs.resolveThemeId(session, getActiveCardThemeInfo().id)
        const resolvedTheme = resolveCardTheme(resolvedThemeId) || getActiveCardThemeInfo()
        const lines = [
          '== 酒狐偏好 · 主题 ==',
          '',
          `当前生效主题: ${resolvedTheme.name} (${resolvedTheme.id})`,
          '',
          '可用主题:',
          ...themes.map((item, index) => `${index + 1}. ${item.name} (${item.id}) - ${item.description}`),
          '',
          '用法：',
          '- 酒狐偏好 主题 晴天玻璃',
          '- 酒狐偏好 主题 cream-paper',
          '- 酒狐偏好 主题 默认   # 清除个人主题，回退到群/全局主题',
        ]
        return lines.join('\n')
      }

      const parsed = parseToggleInput(theme)
      if (parsed.kind === 'clear') {
        await prefs.setUserPrefs(session, { themeId: null })
        return prefs.formatPrefsSummary(session, getActiveCardThemeInfo().id)
      }

      const resolvedTheme = resolveCardTheme(theme)
      if (!resolvedTheme) {
        return [
          `酒狐悄悄话: 没找到「${theme.trim()}」这个主题哦。`,
          '',
          '可用主题:',
          ...themes.map(item => `- ${item.name} (${item.id})`),
        ].join('\n')
      }

      await prefs.setUserPrefs(session, { themeId: resolvedTheme.id })
      return `酒狐悄悄话: 已将你的个人主题设置为「${resolvedTheme.name}」(${resolvedTheme.id})。\n（可用「酒狐偏好」查看当前生效设置）`
    })

  ctx.command('酒狐群设置', '查看本群酒狐设置（仅管理员）', { authority: 3 })
    .action(({ session }) => {
      if (!session.guildId) return '酒狐悄悄话: 只能在群聊中查看群设置哦。'
      const guildPrefs = prefs.getGuildPrefs(session)
      const globalTheme = getActiveCardThemeInfo()
      const guildTheme = guildPrefs.themeId ? resolveCardTheme(guildPrefs.themeId) : null
      const effectiveTheme = guildTheme || globalTheme

      return [
        '== 酒狐群设置 ==',
        '',
        `全局主题: ${globalTheme.name} (${globalTheme.id})`,
        `群主题: ${guildTheme ? `${guildTheme.name} (${guildTheme.id})` : '(未设置)'}`,
        `本群生效主题: ${effectiveTheme.name} (${effectiveTheme.id})`,
        '',
        `群文字强制: ${guildPrefs.forceText === undefined ? '(未设置)' : String(guildPrefs.forceText)}`,
        `群被动冒泡: ${guildPrefs.passiveKeywordEnabled === undefined ? '(未设置)' : String(guildPrefs.passiveKeywordEnabled)}`,
        '',
        '提示：个人偏好仍可覆盖群设置（优先级：个人 > 群 > 全局）。',
      ].join('\n')
    })

  ctx.command('酒狐群设置.文字 [value:text]', '本群强制文字输出（开/关/默认）', { authority: 3 })
    .action(async ({ session }, value) => {
      if (!session.guildId) return '酒狐悄悄话: 只能在群聊中设置群偏好哦。'
      const parsed = parseToggleInput(value)
      if (parsed.kind === 'query') {
        return [
          '== 酒狐群设置 · 文字 ==',
          '',
          '用法：',
          '- 酒狐群设置 文字 开    # 本群强制文字（禁用图片）',
          '- 酒狐群设置 文字 关    # 本群允许图片（按各指令配置）',
          '- 酒狐群设置 文字 默认  # 清除群设置，回退到全局配置',
        ].join('\n')
      }
      if (parsed.kind === 'invalid') {
        return `酒狐悄悄话: 不认识「${parsed.value}」这个参数哦，请用 开/关/默认。`
      }
      const patch = parsed.kind === 'clear' ? { forceText: null } : { forceText: parsed.value }
      await prefs.setGuildPrefs(session, patch)
      return '酒狐悄悄话: 本群文字/图片偏好已更新。\n（可用「酒狐群设置」查看当前设置）'
    })

  ctx.command('酒狐群设置.被动 [value:text]', '本群关键词被动冒泡（开/关/默认）', { authority: 3 })
    .action(async ({ session }, value) => {
      if (!session.guildId) return '酒狐悄悄话: 只能在群聊中设置群偏好哦。'
      const parsed = parseToggleInput(value)
      if (parsed.kind === 'query') {
        return [
          '== 酒狐群设置 · 被动 ==',
          '',
          '用法：',
          '- 酒狐群设置 被动 开    # 本群开启关键词被动冒泡',
          '- 酒狐群设置 被动 关    # 本群关闭关键词被动冒泡',
          '- 酒狐群设置 被动 默认  # 清除群设置，回退到全局配置',
        ].join('\n')
      }
      if (parsed.kind === 'invalid') {
        return `酒狐悄悄话: 不认识「${parsed.value}」这个参数哦，请用 开/关/默认。`
      }
      const patch = parsed.kind === 'clear' ? { passiveKeywordEnabled: null } : { passiveKeywordEnabled: parsed.value }
      await prefs.setGuildPrefs(session, patch)
      return '酒狐悄悄话: 本群被动冒泡开关已更新。\n（可用「酒狐群设置」查看当前设置）'
    })

  ctx.command('酒狐群设置.主题 [theme:text]', '设置本群图片主题（仅管理员）', { authority: 3 })
    .action(async ({ session }, theme) => {
      if (!session.guildId) return '酒狐悄悄话: 只能在群聊中设置群主题哦。'
      const themes = listCardThemes()

      if (!theme || !theme.trim()) {
        const resolvedThemeId = prefs.resolveThemeId(session, getActiveCardThemeInfo().id)
        const resolvedTheme = resolveCardTheme(resolvedThemeId) || getActiveCardThemeInfo()
        const lines = [
          '== 酒狐群设置 · 主题 ==',
          '',
          `当前生效主题: ${resolvedTheme.name} (${resolvedTheme.id})`,
          '',
          '可用主题:',
          ...themes.map((item, index) => `${index + 1}. ${item.name} (${item.id}) - ${item.description}`),
          '',
          '用法：',
          '- 酒狐群设置 主题 晨光咖啡馆',
          '- 酒狐群设置 主题 默认   # 清除群主题，回退到全局主题',
        ]
        return lines.join('\n')
      }

      const parsed = parseToggleInput(theme)
      if (parsed.kind === 'clear') {
        await prefs.setGuildPrefs(session, { themeId: null })
        return '酒狐悄悄话: 已清除本群主题设置，将回退到全局主题。'
      }

      const resolvedTheme = resolveCardTheme(theme)
      if (!resolvedTheme) {
        return [
          `酒狐悄悄话: 没找到「${theme.trim()}」这个主题哦。`,
          '',
          '可用主题:',
          ...themes.map(item => `- ${item.name} (${item.id})`),
        ].join('\n')
      }

      await prefs.setGuildPrefs(session, { themeId: resolvedTheme.id })
      return `酒狐悄悄话: 本群主题已设置为「${resolvedTheme.name}」(${resolvedTheme.id})。`
    })

  // ===== 酒狐UI =====
  ctx.command('酒狐UI [theme:text]', '查看或切换图片主题', { authority: 3 })
    .action(async (_, theme) => {
      const currentTheme = getActiveCardThemeInfo()
      const themes = listCardThemes()

      if (!theme || !theme.trim()) {
        const lines = [
          '== 酒狐UI ==',
          '',
          `当前主题: ${currentTheme.name} (${currentTheme.id})`,
          currentTheme.description ? `说明: ${currentTheme.description}` : '',
          '',
          '可用主题:',
          ...themes.map((item, index) => `${index + 1}. ${item.name} (${item.id}) - ${item.description}`),
          '',
          '使用「酒狐UI 主题名」切换，例如：酒狐UI 晴天玻璃',
          '提示：你也可以用「酒狐偏好 主题」设置个人主题，或用「酒狐群设置 主题」设置群主题（优先级：个人 > 群 > 全局）。',
        ].filter(Boolean)
        return lines.join('\n')
      }

      const resolvedTheme = resolveCardTheme(theme)
      if (!resolvedTheme) {
        return [
          `酒狐悄悄话: 没找到「${theme.trim()}」这个主题哦。`,
          '',
          '可用主题:',
          ...themes.map(item => `- ${item.name}`),
        ].join('\n')
      }

      const result = await uiTheme.setTheme(resolvedTheme.id)
      if (!result.success) {
        return '酒狐悄悄话: 主题切换失败了，请稍后再试一次...'
      }

      setCardTheme(resolvedTheme.id)
      logger.info(`[fox] 卡片主题已切换为 ${resolvedTheme.name} (${resolvedTheme.id})`)
      return `酒狐悄悄话: 图片主题已切换为「${resolvedTheme.name}」！\n${resolvedTheme.description}`
    })

  // ===== 管理员指令 =====
  ctx.command('酒狐审核', '查看待审核投稿', { authority: 3 })
    .action(() => {
      const pending = submission.listPending()
      if (pending.length === 0) return '没有待审核的投稿。'
      const lines = pending.map(p => `  #${p.id} [${p.userId}] ${p.text.substring(0, 50)}${p.text.length > 50 ? '...' : ''}`)
      return `待审核投稿 (${pending.length}条)：\n${lines.join('\n')}\n\n使用「酒狐通过 <编号>」或「酒狐拒绝 <编号>」处理`
    })

  ctx.command('酒狐通过 <id:number>', '审核通过投稿', { authority: 3 })
    .action(async (_, id) => {
      if (!id) return '请指定投稿编号'
      return (await submission.approve(id, quotesLoader)).message
    })

  ctx.command('酒狐拒绝 <id:number>', '拒绝投稿', { authority: 3 })
    .action(async (_, id) => {
      if (!id) return '请指定投稿编号'
      return (await submission.reject(id)).message
    })

  ctx.command('酒狐重载', '重新加载语录文件', { authority: 3 })
    .action(() => {
      const ok = quotesLoader.reload()
      return ok ? `语录重载成功！共 ${quotesLoader.count} 条语录，${quotesLoader.categoryNames.length} 个分类。` : '语录重载失败。'
    })

  // ===== 玩家存档备份/恢复（仅 opsAdminIds） =====
  ctx.command('酒狐存档备份', '备份玩家存档（仅 opsAdminIds）', { authority: 0 })
    .action(async ({ session }) => {
      const deny = requireOpsAdmin(session, '存档备份')
      if (deny) return deny

      const backupRootDir = getDefaultBackupRootDir(__dirname)
      const result = await createPlayerBackup({
        memoryDir,
        backupRootDir,
        pluginVersion,
        includeFiles: DEFAULT_PLAYER_MEMORY_FILES,
        logger,
      })

      return [
        '酒狐悄悄话: 存档备份完成。',
        '',
        `- 备份ID: ${result.id}`,
        `- 备份目录: ${result.backupDir}`,
        `- 备份文件: ${result.included.length} 个`,
        `- 缺失跳过: ${result.missing.length} 个`,
        `- 总大小: ${formatBytes(result.totalBytes)}`,
        '',
        '说明：本备份只包含玩家数据相关存档文件，不包含季节循环/全局主题等全局状态。',
      ].join('\n')
    })

  ctx.command('酒狐存档列表 [count:number]', '查看存档备份列表（仅 opsAdminIds）', { authority: 0 })
    .action(async ({ session }, count) => {
      const deny = requireOpsAdmin(session, '查看备份列表')
      if (deny) return deny

      const backupRootDir = getDefaultBackupRootDir(__dirname)
      const list = await listPlayerBackups(backupRootDir, count || 10)
      if (list.length === 0) {
        return [
          '酒狐悄悄话: 当前没有找到任何存档备份。',
          `备份目录: ${backupRootDir}`,
          '可用「酒狐存档备份」创建一次备份。',
        ].join('\n')
      }

      return [
        `== 酒狐存档列表（最近 ${list.length} 个） ==`,
        `备份目录: ${backupRootDir}`,
        '',
        ...list.map((item, index) => {
          const created = item.createdAt ? item.createdAt.replace('T', ' ').replace('Z', '') : 'unknown'
          return `${index + 1}. ${item.id} · files=${item.fileCount} · size=${formatBytes(item.totalBytes)} · at=${created}`
        }),
        '',
        '恢复示例：',
        '酒狐存档恢复 备份ID -f',
      ].join('\n')
    })

  ctx.command('酒狐存档清理 [keep:number]', '清理旧的存档备份（仅 opsAdminIds）', { authority: 0 })
    .option('dry', '-n 仅预览，不实际删除')
    .action(async ({ session, options }, keep) => {
      const deny = requireOpsAdmin(session, '清理存档备份')
      if (deny) return deny

      const keepCount = (keep === undefined || keep === null)
        ? 10
        : (Number.isFinite(keep) ? Math.floor(keep) : NaN)

      if (!Number.isFinite(keepCount) || keepCount < 1) {
        return [
          '酒狐悄悄话: 参数错误。',
          '',
          '用法：',
          '- 酒狐存档清理        # 默认保留 10 个备份',
          '- 酒狐存档清理 20     # 只保留最近 20 个备份',
          '- 酒狐存档清理 -n     # 仅预览，不删除',
          '',
          '提示：为了防止误操作，保留数最小为 1。',
        ].join('\n')
      }

      const backupRootDir = getDefaultBackupRootDir(__dirname)
      const result = await cleanupPlayerBackups(backupRootDir, keepCount, { dryRun: !!options?.dry })

      if (!result.exists || result.total === 0) {
        return [
          '酒狐悄悄话: 当前没有找到任何存档备份。',
          `备份目录: ${backupRootDir}`,
          '可用「酒狐存档备份」创建一次备份。',
        ].join('\n')
      }

      const preview = !!options?.dry
      const deleted = Array.isArray(result.deleted) ? result.deleted : []
      const failed = Array.isArray(result.failed) ? result.failed : []

      const listLines = deleted.slice(0, 20).map(item => `- ${item.id}`)
      const more = deleted.length > 20 ? `...（还有 ${deleted.length - 20} 个未展示）` : ''

      return [
        `== 酒狐存档清理（${preview ? '预览' : '已执行'}） ==`,
        `备份目录: ${backupRootDir}`,
        '',
        `总备份: ${result.total}`,
        `保留: ${result.keep}`,
        preview ? `将删除: ${result.deleteCount}` : `已删除: ${deleted.length}`,
        failed.length > 0 ? `删除失败: ${failed.length}` : '',
        '',
        preview ? '将删除的备份ID（最新在上，最多展示 20 个）：' : '已删除的备份ID（最新在上，最多展示 20 个）：',
        ...listLines,
        more,
      ].filter(Boolean).join('\n')
    })

  ctx.command('酒狐存档恢复 <id:text>', '从备份恢复玩家存档（危险，仅 opsAdminIds）', { authority: 0 })
    .option('force', '-f 强制执行（会覆盖现有玩家存档）')
    .action(async ({ session, options }, id) => {
      const deny = requireOpsAdmin(session, '存档恢复')
      if (deny) return deny

      const backupRootDir = getDefaultBackupRootDir(__dirname)
      const backupDir = await resolvePlayerBackupDir(backupRootDir, id)
      if (!backupDir) {
        const list = await listPlayerBackups(backupRootDir, 5)
        return [
          `酒狐悄悄话: 未找到备份「${String(id || '').trim() || '(空)'}」。`,
          `备份目录: ${backupRootDir}`,
          '',
          list.length > 0 ? '最近备份：' : '当前没有备份。',
          ...list.map((item) => `- ${item.id} (${formatBytes(item.totalBytes)})`),
          '',
          '提示：可用「酒狐存档列表」查看全部备份。',
        ].filter(Boolean).join('\n')
      }

      if (!options?.force) {
        return [
          '酒狐悄悄话: 存档恢复是危险操作，会覆盖现有玩家存档。',
          '',
          `目标备份: ${backupDir}`,
          '',
          '如果你确认要恢复，请使用：',
          `酒狐存档恢复 ${String(id || '').trim() || 'latest'} -f`,
        ].join('\n')
      }

      // 安全措施：恢复前自动做一次“当前玩家存档备份”
      const pre = await createPlayerBackup({
        memoryDir,
        backupRootDir,
        pluginVersion,
        includeFiles: DEFAULT_PLAYER_MEMORY_FILES,
        logger,
      })

      const restored = await restorePlayerBackup({
        backupDir,
        memoryDir,
        logger,
      })

      return [
        '酒狐悄悄话: 存档恢复完成。',
        '',
        `- 已自动创建恢复前备份: ${pre.id}`,
        `- 使用的备份目录: ${backupDir}`,
        `- 已恢复文件: ${restored.restored} 个`,
        `- 缺失跳过: ${restored.missing.length} 个`,
        `- 写入大小: ${formatBytes(restored.totalBytes)}`,
        '',
        '说明：本恢复仅覆盖玩家数据相关存档文件，不包含季节循环/全局主题等全局状态。',
        '',
        '重要提示：请尽快重启 WineFox-Daily 插件（或重启 Koishi）。',
        '原因：多数子系统在启动时把存档加载到内存；如果不重启，旧的内存数据可能会继续运行并覆盖你刚恢复的文件。',
      ].join('\n')
    })

  ctx.command('酒狐缓存清理', '清理 WineFox 图片渲染缓存（仅内存）', { authority: 3 })
    .action(() => {
      const status = renderCache?.getStatus?.()
      const beforeSize = status?.size ?? 0
      const cleared = renderCache?.clear?.() ?? 0
      const afterStatus = renderCache?.getStatus?.()
      const afterSize = afterStatus?.size ?? 0
      const enabled = afterStatus?.enabled === true

      return [
        '酒狐悄悄话: 已清理「图片渲染缓存」（RenderCache · 内存缓存）。',
        '',
        `- 清理前条目: ${beforeSize}`,
        `- 实际清理条目: ${cleared}`,
        `- 清理后条目: ${afterSize}`,
        '',
        '说明：',
        '- 这里清理的是 WineFox-Daily 的“图片卡片渲染结果缓存”（内存 LRU），用于加速帮助/分类/总数/故事目录等低变化卡片的重复渲染。',
        '- 不会删除 `memory/*.json` 存档文件，也不会影响语录库/背包/好感等业务数据。',
        enabled ? '' : '提示：当前 `imageCacheEnabled=false`，缓存处于关闭状态，清理后仅会把内存清空，不会改变当前输出行为。',
      ].filter(Boolean).join('\n')
    })

  ctx.command('酒狐渲染统计 [count:number]', '查看最近 N 次图片渲染统计', { authority: 3 })
    .option('clear', '-c 清空统计')
    .action(({ options }, count) => {
      if (!renderMetrics) return '酒狐悄悄话: 渲染统计不可用。'

      if (options?.clear) {
        const cleared = renderMetrics.clear()
        return `酒狐悄悄话: 已清空渲染统计（清理 ${cleared} 条记录）。`
      }

      const n = Number.isFinite(count) ? Math.max(1, Math.floor(count)) : 50
      const summary = renderMetrics.getSummary(n)
      const recent = renderMetrics.getRecent(Math.min(20, n))

      const lines = [
        `== 酒狐渲染统计（最近 ${summary.windowCount} 条） ==`,
        '',
        `OK/FAIL: ${summary.okCount}/${summary.failCount}（OK率 ${summary.okRate.toFixed(1)}%）`,
        `渲染尝试: ${summary.attemptCount}（成功 ${summary.attemptOkCount} / 失败 ${summary.attemptFailCount} / 成功率 ${summary.attemptOkRate.toFixed(1)}%）`,
        `缓存命中: ${summary.cacheHits}（命中率 ${summary.cacheHitRate.toFixed(1)}%）`,
        `平均排队等待: ${summary.avgWaitMs}ms`,
        `平均渲染耗时: ${summary.avgRenderMs}ms`,
        `平均总耗时: ${summary.avgTotalMs}ms`,
        summary.failCount > 0
          ? `失败原因: ${Object.entries(summary.failuresByReason).map(([k, v]) => `${k}=${v}`).join(' / ')}`
          : '失败原因: (无)',
        '',
        '最近记录（最新在上）：',
        ...recent.map((e) => {
          const time = new Date(e.ts).toISOString().slice(11, 19)
          const status = e.ok ? 'OK' : 'FAIL'
          const cache = e.cacheHit ? 'cache=hit' : 'cache=miss'
          const wait = e.waitMs ? `wait=${Math.round(e.waitMs)}ms` : 'wait=0ms'
          const render = e.renderMs ? `render=${Math.round(e.renderMs)}ms` : 'render=0ms'
          const total = e.totalMs ? `total=${Math.round(e.totalMs)}ms` : 'total=0ms'
          const reason = e.reason ? `reason=${e.reason}` : ''
          const feature = e.feature || 'unknown'
          return `- ${time} ${feature} ${status} ${reason} ${cache} ${wait} ${render} ${total}`
        }),
      ].filter(Boolean)

      return lines.join('\n')
    })

  async function runRenderDiagnosis(options = {}) {
    const version = pluginVersion

    const puppeteerAvailable = hasPuppeteer(ctx)
    const theme = getActiveCardThemeInfo()
    const limiterStatus = imageRenderLimiter?.getStatus?.() || { enabled: false }
    const cacheStatus = renderCache?.getStatus?.() || { enabled: false }
    const metricsSummary = renderMetrics?.getSummary?.(50) || {
      windowCount: 0,
      attemptCount: 0,
      attemptOkCount: 0,
      attemptFailCount: 0,
      attemptOkRate: 0,
      cacheHitRate: 0,
      avgWaitMs: 0,
      avgRenderMs: 0,
      failuresByReason: {},
    }

    const jsonFiles = [
      ['好感度', path.join(memoryDir, 'affinity.json')],
      ['背包', path.join(memoryDir, 'inventory.json')],
      ['委托', path.join(memoryDir, 'commission.json')],
      ['收藏', path.join(memoryDir, 'favorites.json')],
      ['偏好设置', path.join(memoryDir, 'prefs.json')],
      ['狐狐券账本', path.join(memoryDir, 'ticket-reward-ledger.json')],
      ['签到', path.join(memoryDir, 'checkin.json')],
      ['酿酒', path.join(memoryDir, 'brewing.json')],
      ['问答', path.join(memoryDir, 'quiz.json')],
      ['成就', path.join(memoryDir, 'achievements.json')],
      ['每日酒狐', path.join(memoryDir, 'daily.json')],
      ['近期历史', path.join(memoryDir, 'recent_history.json')],
      ['投稿队列', path.join(memoryDir, 'pending_submissions.json')],
      ['故事历史', path.join(memoryDir, 'story_history.json')],
    ]

    const fileStats = jsonFiles.map(([label, filePath]) => ({
      label,
      filePath,
      ...inspectJsonFile(filePath),
    }))

    const okCount = fileStats.filter(item => item.exists && item.ok === true).length
    const badCount = fileStats.filter(item => item.exists && item.ok === false).length
    const skippedCount = fileStats.filter(item => item.exists && item.ok === null).length
    const missingCount = fileStats.filter(item => !item.exists).length

    const lines = [
      '== 酒狐渲染诊断 ==',
      '',
      `版本: ${version}`,
      `Puppeteer: ${puppeteerAvailable ? '可用' : '不可用'}`,
      `主题(全局): ${theme.name} (${theme.id})`,
      `运行时配置: ${runtimeConfigSource}`,
      `渲染队列: ${limiterStatus.enabled ? `启用 max=${limiterStatus.maxConcurrency} active=${limiterStatus.active} queued=${limiterStatus.queued} timeout=${limiterStatus.defaultTimeoutMs}ms` : '未启用'}`,
      `图片缓存: ${cacheStatus.enabled ? `启用 size=${cacheStatus.size}/${cacheStatus.maxEntries} hits=${cacheStatus.hits} misses=${cacheStatus.misses}` : '未启用'}`,
      `渲染统计(最近 ${metricsSummary.windowCount}): 尝试 ${metricsSummary.attemptCount} | 成功率 ${metricsSummary.attemptOkRate.toFixed(1)}% | 命中率 ${metricsSummary.cacheHitRate.toFixed(1)}% | wait ${metricsSummary.avgWaitMs}ms | render ${metricsSummary.avgRenderMs}ms`,
      metricsSummary.attemptFailCount > 0
        ? `失败原因: ${Object.entries(metricsSummary.failuresByReason).map(([k, v]) => `${k}=${v}`).join(' / ')}`
        : '',
      '',
      `memoryDir: ${memoryDir}`,
      `存档健康: OK ${okCount} / BAD ${badCount} / SKIP ${skippedCount} / MISSING ${missingCount}`,
      '',
      '存档详情:',
      ...fileStats.map((item) => {
        const status = item.exists
          ? (item.ok === true ? 'OK' : (item.ok === false ? `BAD(${item.error})` : 'SKIP(过大未解析)'))
          : 'MISSING'
        return `- ${item.label}: ${status} ${formatBytes(item.bytes)}`
      }),
    ].filter(Boolean)

    if (!options?.image || !puppeteerAvailable) return lines.join('\n')

    const rows = [
      ['版本', version],
      ['Puppeteer', puppeteerAvailable ? '可用' : '不可用'],
      ['主题', `${theme.name} (${theme.id})`],
      ['运行时配置', runtimeConfigSource],
      ['渲染队列', limiterStatus.enabled ? `max=${limiterStatus.maxConcurrency} active=${limiterStatus.active} queued=${limiterStatus.queued}` : '未启用'],
      ['图片缓存', cacheStatus.enabled ? `size=${cacheStatus.size}/${cacheStatus.maxEntries}` : '未启用'],
      ['渲染统计', `尝试${metricsSummary.attemptCount} 成功率${metricsSummary.attemptOkRate.toFixed(0)}% 命中率${metricsSummary.cacheHitRate.toFixed(0)}%`],
      ['存档健康', `OK ${okCount} / BAD ${badCount} / MISSING ${missingCount}`],
    ]

    const renderTask = () => renderDiagnosticsCard(ctx, {
      data: {
        title: '酒狐渲染诊断',
        subtitle: '运行状态摘要',
        tip: '用于快速确认 Puppeteer/主题/渲染队列/缓存/统计与存档健康。更详细信息请用文字版「酒狐渲染诊断」。',
        rows,
        footerText: `WineFox-Daily v${version}`,
      },
    })

    try {
      return imageRenderLimiter?.runWithMetrics
        ? (await imageRenderLimiter.runWithMetrics(renderTask, finalConfig.imageRenderQueueTimeout)).value
        : await renderTask()
    } catch (err) {
      logger.warn('[fox] 酒狐渲染诊断图片渲染失败，将回退文字输出', err)
      return lines.join('\n')
    }
  }

  ctx.command('酒狐渲染诊断', '查看图片渲染链路与存档健康', { authority: 3 })
    .option('image', '-i 输出图片卡片')
    .action(async ({ options }) => {
      return await runRenderDiagnosis(options)
    })

  // 兼容旧命令：酒狐诊断 -> 酒狐渲染诊断（不破坏现状）
  ctx.command('酒狐诊断', '（已更名）查看图片渲染链路与存档健康', { authority: 3 })
    .option('image', '-i 输出图片卡片')
    .action(async ({ options }) => {
      const result = await runRenderDiagnosis(options)
      if (options?.image) return result
      return `（提示：该指令已更名为「酒狐渲染诊断」）\n\n${result}`
    })

  ctx.command('酒狐渲染自检', '渲染一张最小诊断卡片（验证生图链路）', { authority: 3 })
    .action(async () => {
      if (!hasPuppeteer(ctx)) {
        return [
          '酒狐渲染自检：当前未启用 Puppeteer 服务。',
          '请在 Koishi 中启用实现了 `puppeteer` 服务的插件（例如 @shangxueink/koishi-plugin-puppeteer-without-canvas）。',
        ].join('\n')
      }

      const theme = getActiveCardThemeInfo()
      const limiterStatus = imageRenderLimiter?.getStatus?.() || { enabled: false }

      const rows = [
        ['状态', '渲染链路 OK'],
        ['主题', `${theme.name} (${theme.id})`],
        ['渲染队列', limiterStatus.enabled ? `max=${limiterStatus.maxConcurrency} active=${limiterStatus.active} queued=${limiterStatus.queued}` : '未启用'],
        ['时间', new Date().toISOString()],
      ]

      const renderTask = () => renderDiagnosticsCard(ctx, {
        data: {
          title: '酒狐渲染自检',
          subtitle: '如果你能看到这张图，说明生图链路正常',
          tip: '若卡片偶发空白/字体错乱，建议检查 Puppeteer 字体注入与 render pool 配置。',
          rows,
        },
      })

      try {
        return imageRenderLimiter
          ? await imageRenderLimiter.run(renderTask, finalConfig.imageRenderQueueTimeout)
          : await renderTask()
      } catch (err) {
        logger.warn('[fox] 酒狐渲染自检失败', err)
        return `酒狐渲染自检失败：${err?.message || String(err)}`
      }
    })

  logger.info(`[fox] 酒狐悄悄话增强版 v${pluginVersion} 已启动 | 语录 ${quotesLoader.count} 条 | 故事 ${story.count} 篇`)
}
