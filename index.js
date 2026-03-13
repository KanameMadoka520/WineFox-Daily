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
 * - 酒狐取消收藏
 * - 酒狐喂酒 / 酒狐挠耳朵 / 酒狐牵手
 * - 互动冷却 / 成就奖励 / 游戏会话超时
 */

const path = require('path')
const fs = require('fs')
const { Schema } = require('koishi')
const responseData = require('./data/responses')

// lib 模块
const QuotesLoader = require('./lib/quotes-loader')
const { pickByTime } = require('./lib/time-aware')
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
  renderMoodCard,
  renderCheckinResultCard,
  renderBuyResultCard,
  renderGiftResultCard,
} = require('./lib/card-renderer')

// v2 模块
const FortuneSystem = require('./lib/fortune')
const MoodSystem = require('./lib/mood')
const GamesSystem = require('./lib/games')
const StorySystem = require('./lib/story')
const AchievementSystem = require('./lib/achievements')
const WeatherSystem = require('./lib/weather')
const FavoritesSystem = require('./lib/favorites')
const { registerInteractions } = require('./lib/interactions')

// v2.2 新模块
const CheckinSystem = require('./lib/checkin')
const MemoirSystem = require('./lib/memoir')
const QuizSystem = require('./lib/quiz')
const BrewingSystem = require('./lib/brewing')
const ShopSystem = require('./lib/shop')
const CommissionSystem = require('./lib/commission')
const dailyFree = require('./lib/daily-free')
const UIThemeSystem = require('./lib/ui-theme')

exports.name = 'WineFox-Daily'
exports.inject = {
  optional: ['puppeteer'],
}

exports.usage = `
## 酒狐悄悄话增强版 v2.3

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
  dailyAffinityMax: Schema.number().default(20).description('每日好感度获取上限'),
  // === 图片输出 ===
  imageFortune: Schema.boolean().default(true).description('是否为酒狐占卜优先输出图片卡片'),
  imageAffinity: Schema.boolean().default(true).description('是否为酒狐好感优先输出图片卡片'),
  imageCheckinCalendar: Schema.boolean().default(true).description('是否为酒狐签到日历优先输出图片卡片'),
  imageMemoir: Schema.boolean().default(true).description('是否为酒狐回忆优先输出图片卡片'),
  imageAnalytics: Schema.boolean().default(true).description('是否为酒狐统计优先输出图片卡片'),
  imageShop: Schema.boolean().default(true).description('是否为酒狐商店优先输出图片卡片'),
  imageInventory: Schema.boolean().default(true).description('是否为酒狐背包优先输出图片卡片'),
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
  imageMood: Schema.boolean().default(true).description('是否为酒狐心情优先输出图片卡片'),
  imageCellar: Schema.boolean().default(true).description('是否为酒狐酒窖优先输出图片卡片'),
  imageBrewResult: Schema.boolean().default(true).description('是否为酒狐酿酒成功优先输出结果卡片'),
  imageOpenBottleResult: Schema.boolean().default(true).description('是否为酒狐开瓶成功优先输出结果卡片'),
  imageFallbackToText: Schema.boolean().default(true).description('图片渲染失败时是否自动回退为文字输出'),
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
      render,
      fallbackMessage,
      detail = '',
      extraChecks = [],
    } = options

    const puppeteerAvailable = hasPuppeteer(ctx)
    const currentTheme = getActiveCardThemeInfo()
    const checkOptions = { [imageKey]: !!imageEnabled, puppeteerAvailable, theme: currentTheme.id }
    for (const check of extraChecks) {
      checkOptions[check.key] = check.value
    }
    if (detail) checkOptions.detail = detail
    logImageCheck(feature, checkOptions)

    if (!imageEnabled) {
      logger.info(`[fox] ${feature}回退文字输出 reason=${imageKey}_disabled${formatLogDetail(detail)}`)
      return textOutput
    }

    if (!puppeteerAvailable) {
      logger.info(`[fox] ${feature}回退文字输出 reason=puppeteer_unavailable${formatLogDetail(detail)}`)
      return textOutput
    }

    const failedCheck = extraChecks.find(check => !check.ok)
    if (failedCheck) {
      logger.info(`[fox] ${feature}回退文字输出 reason=${failedCheck.reason}${formatLogDetail(detail)}`)
      return textOutput
    }

    try {
      logger.info(`[fox] ${feature}开始图片渲染${formatLogDetail(detail)}`)
      const rendered = await render()
      logger.info(`[fox] ${feature}图片渲染成功${formatLogDetail(detail)}`)
      return rendered
    } catch (err) {
      logger.warn(`[fox] ${feature}图片渲染失败`, err)
      logger.info(`[fox] ${feature}回退文字输出 reason=render_failed${formatLogDetail(detail)}`)
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
  const runtimeConfigJsPath = path.join(__dirname, 'runtime_config.js')
  const runtimeConfigJsonPath = path.join(__dirname, 'runtime_config.json')

  let runtimeConfig = {}
  try {
    if (fs.existsSync(runtimeConfigJsPath)) {
      delete require.cache[require.resolve(runtimeConfigJsPath)]
      runtimeConfig = require(runtimeConfigJsPath)
      logger.info('[fox] 已加载 runtime_config.js')
    } else if (fs.existsSync(runtimeConfigJsonPath)) {
      runtimeConfig = JSON.parse(fs.readFileSync(runtimeConfigJsonPath, 'utf8'))
      logger.info('[fox] 已加载 runtime_config.json')
    }
  } catch (err) {
    logger.warn('[fox] 读取运行时配置失败', err)
  }

  const finalConfig = Object.assign({}, config, runtimeConfig)

  logger.info(`[fox] Puppeteer 服务可用: ${hasPuppeteer(ctx)}`)

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

  // ===== 初始化各子系统 =====
  const quotesLoader = new QuotesLoader(quotesPath, logger)
  const affinity = new AffinitySystem(memoryDir, logger, { dailyAffinityMax: finalConfig.dailyAffinityMax })
  const daily = new DailyQuote(memoryDir, logger)
  const festival = new FestivalSystem()
  const submission = new SubmissionSystem(memoryDir, logger)
  const fortune = new FortuneSystem()
  const mood = new MoodSystem({ enableMoodDecorate: finalConfig.enableMoodDecorate, moodDecorateChance: finalConfig.moodDecorateChance })
  const games = new GamesSystem(logger, { rpsWinBonus: finalConfig.rpsWinBonus, guessMaxAttempts: finalConfig.guessMaxAttempts, guessRange: finalConfig.guessRange })
  const story = new StorySystem(dataDir, memoryDir, logger)
  const achievements = new AchievementSystem(memoryDir, logger)
  const weather = new WeatherSystem()
  const favorites = new FavoritesSystem(memoryDir, logger, { maxFavorites: finalConfig.maxFavorites, favoritesPerPage: finalConfig.favoritesPerPage })

  // v2.2 子系统
  const checkin = new CheckinSystem(memoryDir, logger, { checkinBaseReward: finalConfig.checkinBaseReward, checkinStreakCap: finalConfig.checkinStreakCap })
  const memoir = new MemoirSystem(affinity, achievements)
  const quiz = new QuizSystem(memoryDir, logger)
  const brewing = new BrewingSystem(memoryDir, logger)
  const shop = new ShopSystem(memoryDir, logger)
  const commission = new CommissionSystem(memoryDir, logger, affinity)
  const uiTheme = new UIThemeSystem(memoryDir, logger)
  const appliedTheme = setCardTheme(uiTheme.getThemeId()) || getActiveCardThemeInfo()

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
        lines.push(`${task.desc} (+${task.reward}狐狐券)`)
      }
      session.send(lines.join('\n'))
    }
  }

  // ===== 注册被动/搜索/分析/互动 =====
  registerPassive(ctx, quotesLoader, affinity, {
    ...finalConfig,
    getPassiveAffinityBonus(userId) {
      return shop.getEquippedBonus(userId, 'passive_affinity_bonus')
    },
  })
  registerAnalyticsCommands(ctx, affinity, getTodayPassiveCount, { hasPuppeteer, renderAnalyticsCard, finalConfig, logger })
  registerSearchCommands(ctx, quotesLoader)
  registerInteractions(ctx, affinity, mood, {
    headpatLevel: finalConfig.headpatLevel, hugLevel: finalConfig.hugLevel, confessLevel: finalConfig.confessLevel,
    feedDrinkLevel: finalConfig.feedDrinkLevel, scratchEarLevel: finalConfig.scratchEarLevel, holdHandLevel: finalConfig.holdHandLevel,
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

  function getHelpData() {
    const today = require('./lib/utils').getTodayKey()
    const freeCommands = dailyFree.getDailyFreeCommands(today)
    const freeLabel = freeCommands.map(cmd => `酒狐${cmd}`).join(' / ')

    return {
      title: '酒狐悄悄话 v2.3 - 指令列表',
      groups: [
        {
          title: '基础指令',
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
          items: [
            ['酒狐心情', '酒狐心情状态'],
            [formatHelpItem('酒狐猜拳 <手势>', '猜拳', freeCommands), '猜拳游戏'],
            [formatHelpItem('酒狐猜数', '猜数字', freeCommands), '猜数字游戏'],
            [formatHelpItem('酒狐抽签', '抽签', freeCommands), '御神签'],
            [formatHelpItem('酒狐故事', '故事', freeCommands), '随机冒险日记'],
            [formatHelpItem('酒狐故事 <分类>', '故事', freeCommands), '指定分类故事'],
            ['酒狐故事目录', '故事分类列表'],
            ['酒狐天气', 'MC天气播报'],
            [formatHelpItem('酒狐问答', '问答', freeCommands), 'MC知识问答'],
          ],
        },
        {
          title: '酿酒系统',
          items: [
            [formatHelpItem('酒狐酿酒', '酿酒', freeCommands), '查看配方/开始酿酒'],
            ['酒狐酒窖', '查看酿酒进度'],
            ['酒狐开瓶', '品尝酿好的酒'],
          ],
        },
        {
          title: '商店与背包',
          items: [
            [formatHelpItem('酒狐商店', '商店', freeCommands), '浏览商品'],
            [formatHelpItem('酒狐购买 <物品>', '购买', freeCommands), '购买物品'],
            ['酒狐背包', '查看背包'],
            ['酒狐装备 <物品>', '装备物品'],
            ['酒狐使用 <物品>', '使用消耗品'],
          ],
        },
        {
          title: '社交互动',
          items: [
            ['酒狐成就', '成就徽章'],
            ['酒狐排行', '好感度排行榜'],
            ['酒狐送礼 @某人', '送好感'],
            ['酒狐回忆', '回忆录时间线'],
            [formatHelpItem('酒狐摸头', '摸头', freeCommands), '摸摸酒狐的头'],
            [formatHelpItem('酒狐拥抱', '拥抱', freeCommands), '给酒狐一个拥抱'],
            [formatHelpItem('酒狐告白', '告白', freeCommands), '向酒狐告白'],
            [formatHelpItem('酒狐喂酒', '喂酒', freeCommands), '给酒狐喂酒'],
            [formatHelpItem('酒狐挠耳朵', '挠耳朵', freeCommands), '挠挠酒狐的耳朵'],
            [formatHelpItem('酒狐牵手', '牵手', freeCommands), '牵着酒狐的手'],
            ['酒狐收藏', '收藏语录'],
            ['酒狐收藏夹', '查看收藏'],
            ['酒狐取消收藏 <编号>', '删除收藏'],
          ],
        },
        {
          title: '管理员',
          items: [
            ['酒狐UI [主题名]', '查看或切换图片主题'],
            ['酒狐审核 / 酒狐通过 / 酒狐拒绝 / 酒狐重载', '审核与维护'],
          ],
        },
      ],
      footer: `今日免费体验: ${freeLabel} ｜ 戳一戳酒狐也会回复哦~`,
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
    .action(async () => {
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
      const affinityBonus = shop.getEquippedBonus(userId, 'affinity_bonus') + shop.getEquippedBonus(userId, 'all_affinity_bonus')
      const dailyCapBonus = shop.getEquippedBonus(userId, 'daily_cap_bonus')
      const decayImmune = shop.getEquippedBonus(userId, 'decay_immune') > 0
      const affinityResult = await affinity.addPoints(userId, 1 + affinityBonus, { dailyCapBonus, decayImmune })
      await trackAndNotify(session, 'interact')
      await trackCommission(session, 'interact')

      let resOutput = ''
      if (affinityResult.decayed) resOutput += affinityResult.decayMessage + '\n\n'

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
            const decorated = mood.decorateQuote(picked)
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

      const rareChance = finalConfig.rareDropChance ?? 0.05
      if (Math.random() < rareChance && quotesLoader.getTotalRareCount() > 0) {
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
      const decorated = mood.decorateQuote(finalQuote)

      // 装备效果
      const equipEffect = shop.getEquippedEffect(userId)
      const suffix = equipEffect ? '\n' + equipEffect : ''

      favorites.setLastReceived(userId, finalQuote)
      return resOutput + decorated + suffix + `\n${affinity.formatProgressLine(userId, 1 + affinityBonus)}`
    })

  // ===== 每日酒狐 =====
  ctx.command('每日酒狐', '获取今日专属酒狐语录')
    .action(async ({ session }) => {
      if (quotesLoader.count === 0) return '主人，语录本不见了...'
      const affinityBonus = shop.getEquippedBonus(session.userId, 'affinity_bonus') + shop.getEquippedBonus(session.userId, 'all_affinity_bonus')
      const dailyCapBonus = shop.getEquippedBonus(session.userId, 'daily_cap_bonus')
      const decayImmune = shop.getEquippedBonus(session.userId, 'decay_immune') > 0
      const affinityResult = await affinity.addPoints(session.userId, 1 + affinityBonus, { dailyCapBonus, decayImmune })
      const ticketResult = await affinity.addTickets(session.userId, 1)
      await trackAndNotify(session, 'interact')
      await trackCommission(session, 'interact')
      const quote = await daily.getTodayQuote(quotesLoader.all)
      let resOutput = ''
      if (affinityResult.decayed) resOutput += affinityResult.decayMessage + '\n\n'
      favorites.setLastReceived(session.userId, quote)
      return `${resOutput}[今日酒狐悄悄话]\n${quote}\n狐狐券 +1 (当前 ${ticketResult.newTickets} 张)\n${affinity.formatProgressLine(session.userId, 1 + affinityBonus)}`
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
        render: () => renderAffinityCard(ctx, {
          userName: session.username || session.author?.name || session.userId,
          status,
        }),
        fallbackMessage: '酒狐悄悄话: 好感卡片生成失败了，请稍后再试一次...',
      })
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
        const ticketResult = await affinity.addTickets(session.userId, result.ticketReward)
        await trackAndNotify(session, 'checkin')
        await trackCommission(session, 'checkin')

        const textOutput = `${result.message}\n狐狐券余额: ${ticketResult.newTickets}`
        const userData = checkin.getData(session.userId)
        const foxLines = responseData.actionResultQuotesCheckin || ['今天也辛苦啦。']
        const foxLine = require('./lib/utils').randomPick(foxLines)

        return renderImageFeature({
          feature: '酒狐签到结果',
          imageKey: 'imageCheckinResult',
          imageEnabled: finalConfig.imageCheckinResult,
          textOutput,
          render: () => renderCheckinResultCard(ctx, {
            data: {
              tag: '今日奖励',
              mainRows: [
                { label: '好感', value: `+${result.reward}`, muted: `连续 ${userData.streak} 天 · 累计 ${userData.totalDays} 天` },
                { label: '狐狐券', value: `+${result.ticketReward}`, muted: `当前余额 ${ticketResult.newTickets} 张` },
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
      const fortuneData = fortune.getTodayFortuneData(session.userId)
      const textOutput = fortune.formatFortuneText(fortuneData)

      return renderImageFeature({
        feature: '酒狐占卜',
        imageKey: 'imageFortune',
        imageEnabled: finalConfig.imageFortune,
        textOutput,
        render: () => renderFortuneCard(ctx, {
          userName: session.username || session.author?.name || session.userId,
          data: fortuneData,
        }),
        fallbackMessage: '酒狐悄悄话: 占卜卡片生成失败了，请稍后再试一次...',
      })
    })

  // ===== 酒狐心情 =====
  ctx.command('酒狐心情', '查看酒狐当前心情')
    .action(async () => {
      const moodInfo = mood.getMood()
      const textOutput = mood.getStatusText()

      return renderImageFeature({
        feature: '酒狐心情',
        imageKey: 'imageMood',
        imageEnabled: finalConfig.imageMood,
        textOutput,
        render: () => renderMoodCard(ctx, {
          data: {
            title: '酒狐心情',
            mood: moodInfo.name,
            emoji: moodInfo.emoji,
            body: textOutput,
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
        await affinity.addPoints(session.userId, result.affinityBonus + affinityBonus, { dailyCapBonus, decayImmune })
      }
      if (result.result === 'win') {
        const ticketResult = await affinity.addTickets(session.userId, 2)
        ticketLine = `\n狐狐券 +2 (当前 ${ticketResult.newTickets} 张)`
        await trackAndNotify(session, 'rps_win')
        await trackCommission(session, 'rps_win')
      } else {
        await trackAndNotify(session, 'rps_play')
      }
      mood.onEvent(result.result === 'win' ? 'game_lose' : result.result === 'lose' ? 'game_win' : 'interact')
      const progressDelta = result.affinityBonus > 0 ? result.affinityBonus + (shop.getEquippedBonus(session.userId, 'affinity_bonus') + shop.getEquippedBonus(session.userId, 'all_affinity_bonus')) : 0
      return result.message + ticketLine + (progressDelta > 0 ? `\n${affinity.formatProgressLine(session.userId, progressDelta)}` : '')
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
      if (result.finished && result.affinityBonus > 0) {
        const affinityBonus = shop.getEquippedBonus(session.userId, 'affinity_bonus') + shop.getEquippedBonus(session.userId, 'all_affinity_bonus')
        const dailyCapBonus = shop.getEquippedBonus(session.userId, 'daily_cap_bonus')
        const decayImmune = shop.getEquippedBonus(session.userId, 'decay_immune') > 0
        await affinity.addPoints(session.userId, result.affinityBonus + affinityBonus, { dailyCapBonus, decayImmune })
        if (guess !== null && guess !== undefined) {
          const tickets = result.affinityBonus >= 5 ? 5 : result.affinityBonus >= 3 ? 4 : 3
          const ticketResult = await affinity.addTickets(session.userId, tickets)
          await trackAndNotify(session, 'guess_win')
          await trackCommission(session, 'guess_win')
          return result.message + `\n狐狐券 +${tickets} (当前 ${ticketResult.newTickets} 张)\n${affinity.formatProgressLine(session.userId, result.affinityBonus + affinityBonus)}`
        }
      }
      return result.message
    })

  // ===== 酒狐抽签 =====
  ctx.command('酒狐抽签', '抽取御神签')
    .action(async ({ session }) => {
      const gate = checkLevelGate(session, '抽签')
      if (gate) return gate
      await affinity.addPoints(session.userId, 1)
      const ticketResult = await affinity.addTickets(session.userId, 1)
      await trackAndNotify(session, 'interact')
      await trackCommission(session, 'interact')
      return games.drawOmikuji().message + `\n狐狐券 +1 (当前 ${ticketResult.newTickets} 张)\n${affinity.formatProgressLine(session.userId, 1)}`
    })

  // ===== 酒狐故事 =====
  ctx.command('酒狐故事 [category:text]', '酒狐的冒险日记')
    .action(async ({ session }, category) => {
      logger.info('[fox] 酒狐故事请求开始')
      await affinity.addPoints(session.userId, 1)
      const ticketResult = await affinity.addTickets(session.userId, 1)
      await trackAndNotify(session, 'story')
      await trackCommission(session, 'story')

      if (category && category.trim()) {
        const catName = story.findCategory(category.trim())
        if (!catName) {
          return `没有找到「${category.trim()}」这个分类...用「酒狐故事目录」看看有哪些吧！`
        }

        const storyData = await story.getStoryDataByCategory(catName)
        const textOutput = (storyData?.text || '这个分类暂时没有故事了...') + `\n狐狐券 +1 (当前 ${ticketResult.newTickets} 张)\n${affinity.formatProgressLine(session.userId, 1)}`
        return renderImageFeature({
          feature: '酒狐故事',
          imageKey: 'imageStory',
          imageEnabled: finalConfig.imageStory,
          textOutput,
          detail: `mode=category category=${catName}`,
          extraChecks: [
            { key: 'hasStoryData', value: !!storyData, ok: !!storyData, reason: 'missing_story_data' },
          ],
          render: () => renderStoryCards(ctx, { data: storyData }),
          fallbackMessage: '酒狐悄悄话: 故事卡片生成失败了，请稍后再试一次...',
        })
      }

      const storyData = await story.getRandomStoryData()
      const textOutput = `${storyData.text}\n狐狐券 +1 (当前 ${ticketResult.newTickets} 张)\n${affinity.formatProgressLine(session.userId, 1)}`
      return renderImageFeature({
        feature: '酒狐故事',
        imageKey: 'imageStory',
        imageEnabled: finalConfig.imageStory,
        textOutput,
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
    .action(async () => {
      const catalogData = story.getCatalogData()
      const textOutput = story.getCategoryList()

      return renderImageFeature({
        feature: '酒狐故事目录',
        imageKey: 'imageStoryCatalog',
        imageEnabled: finalConfig.imageStoryCatalog,
        textOutput,
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
      await affinity.addPoints(session.userId, result.reward)
      const ticketResult = await affinity.addTickets(session.userId, 3)
      await trackAndNotify(session, 'quiz_correct')
      await trackCommission(session, 'quiz_correct')
      return result.message + `\n狐狐券 +3 (当前 ${ticketResult.newTickets} 张)\n${affinity.formatProgressLine(session.userId, result.reward)}`
    } else {
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
    if (result.finished && result.affinityBonus > 0) {
      const affinityBonus = shop.getEquippedBonus(session.userId, 'affinity_bonus') + shop.getEquippedBonus(session.userId, 'all_affinity_bonus')
      const dailyCapBonus = shop.getEquippedBonus(session.userId, 'daily_cap_bonus')
      const decayImmune = shop.getEquippedBonus(session.userId, 'decay_immune') > 0
      await affinity.addPoints(session.userId, result.affinityBonus + affinityBonus, { dailyCapBonus, decayImmune })
      const tickets = result.affinityBonus >= 5 ? 5 : result.affinityBonus >= 3 ? 4 : 3
      const ticketResult = await affinity.addTickets(session.userId, tickets)
      await trackAndNotify(session, 'guess_win')
      return result.message + `\n狐狐券 +${tickets} (当前 ${ticketResult.newTickets} 张)`
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
      await brewing.confirmBrewing(session.userId, result._recipeName, shop.getEquippedBonus(session.userId, 'brew_time_reduction'))
      const textOutput = result.message
      return renderImageFeature({
        feature: '酒狐酿酒结果',
        imageKey: 'imageBrewResult',
        imageEnabled: finalConfig.imageBrewResult,
        textOutput,
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
        render: () => renderShopCard(ctx, { data: shopData }),
        fallbackMessage: '酒狐悄悄话: 商店卡片生成失败了，请稍后再试一次...',
      })
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
        detail: `item=${itemName}`,
        render: () => renderBuyResultCard(ctx, {
          data: {
            tag: '商店',
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
        textOutput: result.message,
        detail: `item=${item.trim()}`,
        render: () => renderEquipResultCard(ctx, {
          data: {
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
      if (result.success && result.effect) {
        if (result.effect === 'mood_happy') mood.onEvent('happy')
        else if (result.effect === 'mood_lazy') mood.onEvent('lazy')
        else if (result.effect === 'mood_tipsy') mood.onEvent('tipsy')
        else if (result.effect === 'random_rare' && quotesLoader.getTotalRareCount() > 0) {
          const rareQuote = quotesLoader.getRandomRareQuote()
          if (rareQuote) {
            const isNew = await affinity.unlockRare(session.userId, rareQuote)
            let extra = `\n\n* 稀有语录 *\n${rareQuote}`
            if (isNew) extra += '\n(已收录至「酒狐图鉴」)'
            return result.message + extra
          }
        }
      }
      if (!result.success) {
        return result.message
      }

      return renderImageFeature({
        feature: '酒狐使用结果',
        imageKey: 'imageUseResult',
        imageEnabled: finalConfig.imageUseResult,
        textOutput: result.message,
        detail: `item=${item.trim()}`,
        render: () => renderUseResultCard(ctx, {
          data: {
            itemName: item.trim(),
            message: result.message,
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
        render: () => renderAchievementCard(ctx, { data: achievementData }),
        fallbackMessage: '酒狐悄悄话: 成就卡片生成失败了，请稍后再试一次...',
      })
    })

  // ===== 酒狐排行 =====
  ctx.command('酒狐排行', '好感度排行榜 Top10')
    .action(async () => {
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
    .action(({ session }, page) => favorites.listFavorites(session.userId, page || 1))

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
      await trackAndNotify(session, 'interact')
      const weatherData = weather.getWeather()
      if (mood && weatherData.moodEffect) mood.onEvent('interact')
      const textOutput = weather.getReport()
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
        render: () => renderWeatherCard(ctx, {
          data: {
            title: '酒狐天气',
            status: weatherData.name,
            period: periodMap[periodKey] || '未知',
            body: weatherData.description,
            foxComment: weatherData.foxComment,
          },
        }),
        fallbackMessage: '酒狐悄悄话: 天气卡片生成失败了，请稍后再试一次...',
      })
    })

  // ===== 酒狐委托 =====
  ctx.command('酒狐委托', '查看今日委托任务')
    .action(async ({ session }) => {
      const gate = checkLevelGate(session, '委托')
      if (gate) return gate
      const today = require('./lib/utils').getTodayKey()
      return commission.getDailyTasks(session.userId, today)
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

  logger.info(`[fox] 酒狐悄悄话增强版 v2.3 已启动 | 语录 ${quotesLoader.count} 条 | 故事 ${story.count} 篇`)
}
