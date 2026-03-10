/**
 * WineFox-Daily - 酒狐悄悄话增强版 v2.2
 * Koishi 插件主入口
 *
 * v2.2 新增:
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
const { registerAnalyticsCommands, formatAnalyticsText } = require('./lib/analytics')
const { hasPuppeteer, renderFortuneCard, renderAffinityCard, renderCheckinCalendarCard, renderMemoirCard, renderAnalyticsCard, renderShopCard, renderInventoryCard, renderEquipResultCard, renderUseResultCard, renderHelpCard, renderRareCollectionCard, renderRankingCard, renderAchievementCard, renderStoryCards, renderStoryCatalogCard, renderWeatherCard, renderMoodCard, renderCheckinResultCard, renderBuyResultCard, renderGiftResultCard } = require('./lib/card-renderer')

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

exports.name = 'WineFox-Daily'

exports.usage = `
## 酒狐悄悄话增强版 v2.2

一只可爱的酒狐女仆，随时随地为主人送上暖心悄悄话。

已支持为「酒狐占卜」「酒狐好感」优先输出图片卡片；未启用浏览器服务或渲染失败时会自动回退文字。

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
  headpatLevel: Schema.number().min(0).max(5).default(3).description('摸头所需好感等级'),
  hugLevel: Schema.number().min(0).max(5).default(4).description('拥抱所需好感等级'),
  confessLevel: Schema.number().min(0).max(5).default(5).description('告白所需好感等级'),
  feedDrinkLevel: Schema.number().min(0).max(5).default(2).description('喂酒所需好感等级'),
  scratchEarLevel: Schema.number().min(0).max(5).default(3).description('挠耳朵所需好感等级'),
  holdHandLevel: Schema.number().min(0).max(5).default(4).description('牵手所需好感等级'),
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

  if (!quotesLoader.load()) {
    logger.warn('[fox] 语录文件加载失败')
  }

  // ===== 成就上报辅助（含奖励发放） =====
  async function trackAndNotify(session, eventType, value) {
    const { names, totalReward } = await achievements.recordEvent(session.userId, eventType, value)
    if (names.length > 0) {
      const achNames = names.map(n => `"${n}"`).join('、')
      let msg = `\n\n-- 成就解锁！${achNames} --`
      if (totalReward > 0) {
        await affinity.addBonusPoints(session.userId, totalReward)
        msg += `\n奖励好感度 +${totalReward}！`
      }
      session.send(msg)
    }
  }

  // ===== 注册被动/搜索/分析/互动 =====
  registerPassive(ctx, quotesLoader, affinity, finalConfig)
  registerAnalyticsCommands(ctx, affinity, getTodayPassiveCount, { hasPuppeteer, renderAnalyticsCard, finalConfig, logger })
  registerSearchCommands(ctx, quotesLoader)
  registerInteractions(ctx, affinity, mood, {
    headpatLevel: finalConfig.headpatLevel, hugLevel: finalConfig.hugLevel, confessLevel: finalConfig.confessLevel,
    feedDrinkLevel: finalConfig.feedDrinkLevel, scratchEarLevel: finalConfig.scratchEarLevel, holdHandLevel: finalConfig.holdHandLevel,
  })

  function getHelpData() {
    return {
      title: '酒狐悄悄话 v2.2 - 指令列表',
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
            ['酒狐改名 <名字>', '灵魂伴侣改名'],
          ],
        },
        {
          title: '每日',
          items: [
            ['酒狐签到', '每日签到(连续有加成)'],
            ['酒狐签到日历', '查看签到日历'],
            ['酒狐占卜', '今日运势'],
          ],
        },
        {
          title: '趣味玩法',
          items: [
            ['酒狐心情', '酒狐心情状态'],
            ['酒狐猜拳 <手势>', '猜拳游戏'],
            ['酒狐猜数', '猜数字游戏'],
            ['酒狐抽签', '御神签'],
            ['酒狐故事', '随机冒险日记'],
            ['酒狐故事 <分类>', '指定分类故事'],
            ['酒狐故事目录', '故事分类列表'],
            ['酒狐天气', 'MC天气播报'],
            ['酒狐问答', 'MC知识问答'],
          ],
        },
        {
          title: '酿酒系统',
          items: [
            ['酒狐酿酒', '查看配方/开始酿酒'],
            ['酒狐酿酒 <配方>', '开始酿指定的酒'],
            ['酒狐酒窖', '查看酿酒进度'],
            ['酒狐开瓶', '品尝酿好的酒'],
          ],
        },
        {
          title: '商店与背包',
          items: [
            ['酒狐商店', '浏览商品'],
            ['酒狐购买 <物品>', '购买物品'],
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
            ['酒狐摸头 / 酒狐拥抱 / 酒狐告白', '互动动作'],
            ['酒狐喂酒 / 酒狐挠耳朵 / 酒狐牵手', '互动动作'],
            ['酒狐收藏', '收藏语录'],
            ['酒狐收藏夹', '查看收藏'],
            ['酒狐取消收藏 <编号>', '删除收藏'],
          ],
        },
        {
          title: '管理员',
          items: [
            ['酒狐审核 / 酒狐通过 / 酒狐拒绝 / 酒狐重载', '审核与维护'],
          ],
        },
      ],
      footer: '戳一戳酒狐也会回复哦~',
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
    if (allUsers.length === 0) {
      return { entries: [], isEmpty: true }
    }

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
        '== 酒狐悄悄话 v2.2 - 指令列表 ==',
        '',
        ...helpData.groups.flatMap((group) => [
          `【${group.title}】`,
          ...group.items.map(item => `  ${item[0]}   ${item[1]}`),
          '',
        ]),
        helpData.footer,
      ].join('\n')

      if (!finalConfig.imageHelp || !hasPuppeteer(ctx)) {
        return textOutput
      }

      try {
        return await renderHelpCard(ctx, { data: helpData })
      } catch (err) {
        logger.warn('[fox] 酒狐帮助图片渲染失败', err)
        if (finalConfig.imageFallbackToText) return textOutput
        return '酒狐悄悄话: 帮助菜单卡片生成失败了，请稍后再试一次...'
      }
    })

  // ===== 主指令: 酒狐 =====
  ctx.command('酒狐 [category:text]', '随机发送一句酒狐语录')
    .action(async ({ session }, category) => {
      if (quotesLoader.count === 0) {
        quotesLoader.reload()
        if (quotesLoader.count === 0) return '主人，我找不到笔记本了（未找到语录文件）'
      }

      const userId = session.userId
      const affinityResult = await affinity.addPoints(userId, 1)
      await trackAndNotify(session, 'interact')

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
      return resOutput + decorated + suffix
    })

  // ===== 每日酒狐 =====
  ctx.command('每日酒狐', '获取今日专属酒狐语录')
    .action(async ({ session }) => {
      if (quotesLoader.count === 0) return '主人，语录本不见了...'
      const affinityResult = await affinity.addPoints(session.userId, 1)
      await trackAndNotify(session, 'interact')
      const quote = await daily.getTodayQuote(quotesLoader.all)
      let resOutput = ''
      if (affinityResult.decayed) resOutput += affinityResult.decayMessage + '\n\n'
      favorites.setLastReceived(session.userId, quote)
      return `${resOutput}[今日酒狐悄悄话]\n${quote}`
    })

  // ===== 酒狐好感 =====
  ctx.command('酒狐好感', '查看与酒狐的好感度')
    .action(async ({ session }) => {
      const status = affinity.getStatus(session.userId)
      const textLines = ['== 酒狐好感度面板 ==', '', `称号：${status.level.name}`, `好感值：${status.points} 点`, `进度：${status.progress}`]
      if (status.nextLevel) textLines.push(`下一等级：${status.nextLevel.name} (需要 ${status.nextLevel.minPoints} 点)`)
      const textOutput = textLines.join('\n')

      if (!finalConfig.imageAffinity || !hasPuppeteer(ctx)) {
        return textOutput
      }

      try {
        return await renderAffinityCard(ctx, {
          userName: session.username || session.author?.name || session.userId,
          status,
        })
      } catch (err) {
        logger.warn('[fox] 酒狐好感图片渲染失败', err)
        if (finalConfig.imageFallbackToText) return textOutput
        return '酒狐悄悄话: 好感卡片生成失败了，请稍后再试一次...'
      }
    })

  // ===== 酒狐图鉴 =====
  ctx.command('酒狐图鉴', '查看已解锁的稀有语录进度')
    .action(async ({ session }) => {
      const rareData = getRareCollectionData(session.userId)
      if (rareData.total === 0) return '主人，当前的语录本里似乎没有稀有语录呢...'
      const textOutput = rareData.isEmpty
        ? `== 酒狐图鉴 ==\n\n收录进度: 0/${rareData.total}\n尚未解锁任何稀有语录。多跟我互动就有机会发现哦~`
        : ['== 酒狐图鉴 ==', '', `收录进度: ${rareData.unlockedCount}/${rareData.total}`, '', ...rareData.items.map(item => `${item.index}. ${item.text}`)].join('\n')

      if (!finalConfig.imageRareCollection || !hasPuppeteer(ctx)) {
        return textOutput
      }

      try {
        return await renderRareCollectionCard(ctx, { data: rareData })
      } catch (err) {
        logger.warn('[fox] 酒狐图鉴图片渲染失败', err)
        if (finalConfig.imageFallbackToText) return textOutput
        return '酒狐悄悄话: 图鉴卡片生成失败了，请稍后再试一次...'
      }
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
        await trackAndNotify(session, 'checkin')

        if (!finalConfig.imageCheckinResult || !hasPuppeteer(ctx)) {
          return result.message
        }

        const userData = checkin.getData(session.userId)
        const foxLines = responseData.actionResultQuotesCheckin || ['今天也辛苦啦。']
        const foxLine = require('./lib/utils').randomPick(foxLines)

        try {
          return await renderCheckinResultCard(ctx, {
            data: {
              tag: '今日奖励',
              mainRows: [
                { label: '奖励', value: `好感 +${result.reward}`, muted: `连续 ${userData.streak} 天 · 累计 ${userData.totalDays} 天` },
              ],
              suggestions: ['酒狐签到日历'],
              foxLine,
            },
          })
        } catch (err) {
          logger.warn('[fox] 酒狐签到结果卡片渲染失败', err)
          if (finalConfig.imageFallbackToText) return result.message
          return '酒狐悄悄话: 签到结果卡片生成失败了，请稍后再试一次...'
        }
      }
      return result.message
    })

  // ===== 酒狐签到日历 =====
  ctx.command('酒狐签到日历', '查看签到日历')
    .action(async ({ session }) => {
      const calendarData = checkin.getCalendarData(session.userId)
      const textOutput = checkin.getCalendar(session.userId)

      if (!finalConfig.imageCheckinCalendar || !hasPuppeteer(ctx)) {
        return textOutput
      }

      try {
        return await renderCheckinCalendarCard(ctx, {
          userName: session.username || session.author?.name || session.userId,
          data: calendarData,
        })
      } catch (err) {
        logger.warn('[fox] 酒狐签到日历图片渲染失败', err)
        if (finalConfig.imageFallbackToText) return textOutput
        return '酒狐悄悄话: 签到日历卡片生成失败了，请稍后再试一次...'
      }
    })

  // ===== 酒狐占卜 =====
  ctx.command('酒狐占卜', '今日运势占卜')
    .action(async ({ session }) => {
      await trackAndNotify(session, 'fortune')
      const fortuneData = fortune.getTodayFortuneData(session.userId)
      const textOutput = fortune.formatFortuneText(fortuneData)

      if (!finalConfig.imageFortune || !hasPuppeteer(ctx)) {
        return textOutput
      }

      try {
        return await renderFortuneCard(ctx, {
          userName: session.username || session.author?.name || session.userId,
          data: fortuneData,
        })
      } catch (err) {
        logger.warn('[fox] 酒狐占卜图片渲染失败', err)
        if (finalConfig.imageFallbackToText) return textOutput
        return '酒狐悄悄话: 占卜卡片生成失败了，请稍后再试一次...'
      }
    })

  // ===== 酒狐心情 =====
  ctx.command('酒狐心情', '查看酒狐当前心情')
    .action(async () => {
      const moodInfo = mood.getMood()
      const textOutput = mood.getStatusText()

      if (!finalConfig.imageMood || !hasPuppeteer(ctx)) {
        return textOutput
      }

      try {
        return await renderMoodCard(ctx, {
          data: {
            title: '酒狐心情',
            mood: moodInfo.name,
            emoji: moodInfo.emoji,
            body: textOutput,
          },
        })
      } catch (err) {
        logger.warn('[fox] 酒狐心情图片渲染失败', err)
        if (finalConfig.imageFallbackToText) return textOutput
        return '酒狐悄悄话: 心情卡片生成失败了，请稍后再试一次...'
      }
    })

  // ===== 酒狐猜拳 =====
  ctx.command('酒狐猜拳 <choice:text>', '和酒狐猜拳')
    .action(async ({ session }, choice) => {
      if (!choice || !choice.trim()) return '请出「石头」「剪刀」或「布」哦！'
      const result = games.playRPS(choice.trim())
      if (result.result === 'invalid') return result.message
      if (result.affinityBonus > 0) await affinity.addPoints(session.userId, result.affinityBonus)
      if (result.result === 'win') await trackAndNotify(session, 'rps_win')
      else await trackAndNotify(session, 'rps_play')
      mood.onEvent(result.result === 'win' ? 'game_lose' : result.result === 'lose' ? 'game_win' : 'interact')
      return result.message
    })

  // ===== 酒狐猜数 =====
  ctx.command('酒狐猜数 [guess:number]', '猜数字游戏')
    .action(async ({ session }, guess) => {
      const sessionKey = `${session.guildId || 'dm'}:${session.userId}`
      if (guess === null || guess === undefined) {
        if (quiz.isInQuiz(sessionKey)) {
          return '酒狐悄悄话: 你正在答题呢，先完成当前的问答吧~'
        }
      }
      const result = games.playGuessNumber(sessionKey, guess)
      if (result.finished && result.affinityBonus > 0) {
        await affinity.addPoints(session.userId, result.affinityBonus)
        if (guess !== null && guess !== undefined) await trackAndNotify(session, 'guess_win')
      }
      return result.message
    })

  // ===== 酒狐抽签 =====
  ctx.command('酒狐抽签', '抽取御神签')
    .action(async ({ session }) => {
      await affinity.addPoints(session.userId, 1)
      await trackAndNotify(session, 'interact')
      return games.drawOmikuji().message
    })

  // ===== 酒狐故事 =====
  ctx.command('酒狐故事 [category:text]', '酒狐的冒险日记')
    .action(async ({ session }, category) => {
      await affinity.addPoints(session.userId, 1)
      await trackAndNotify(session, 'story')

      if (category && category.trim()) {
        const catName = story.findCategory(category.trim())
        if (!catName) {
          return `没有找到「${category.trim()}」这个分类...用「酒狐故事目录」看看有哪些吧！`
        }

        const storyData = await story.getStoryDataByCategory(catName)
        const textOutput = storyData?.text || '这个分类暂时没有故事了...'
        if (!storyData || !finalConfig.imageStory || !hasPuppeteer(ctx)) {
          return textOutput
        }

        try {
          return await renderStoryCards(ctx, { data: storyData })
        } catch (err) {
          logger.warn('[fox] 酒狐故事图片渲染失败', err)
          if (finalConfig.imageFallbackToText) return textOutput
          return '酒狐悄悄话: 故事卡片生成失败了，请稍后再试一次...'
        }
      }

      const storyData = await story.getRandomStoryData()
      const textOutput = storyData.text
      if (!finalConfig.imageStory || !hasPuppeteer(ctx)) {
        return textOutput
      }

      try {
        return await renderStoryCards(ctx, { data: storyData })
      } catch (err) {
        logger.warn('[fox] 酒狐故事图片渲染失败', err)
        if (finalConfig.imageFallbackToText) return textOutput
        return '酒狐悄悄话: 故事卡片生成失败了，请稍后再试一次...'
      }
    })

  // ===== 酒狐故事目录 =====
  ctx.command('酒狐故事目录', '查看故事分类列表')
    .action(async () => {
      const catalogData = story.getCatalogData()
      const textOutput = story.getCategoryList()

      if (!finalConfig.imageStoryCatalog || !hasPuppeteer(ctx)) {
        return textOutput
      }

      try {
        return await renderStoryCatalogCard(ctx, { data: catalogData })
      } catch (err) {
        logger.warn('[fox] 酒狐故事目录图片渲染失败', err)
        if (finalConfig.imageFallbackToText) return textOutput
        return '酒狐悄悄话: 故事目录卡片生成失败了，请稍后再试一次...'
      }
    })

  // ===== 酒狐问答 =====
  ctx.command('酒狐问答', 'MC知识问答')
    .action(async ({ session }) => {
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

    if (result.correct) {
      await affinity.addPoints(session.userId, result.reward)
      await trackAndNotify(session, 'quiz_correct')
    } else {
      await achievements.recordEvent(session.userId, 'quiz_wrong')
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
    if (result.finished && result.affinityBonus > 0) {
      await affinity.addPoints(session.userId, result.affinityBonus)
      await trackAndNotify(session, 'guess_win')
    }
    return result.message
  }, true)

  // ===== 酒狐酿酒 =====
  ctx.command('酒狐酿酒 [recipe:text]', '酿酒系统')
    .action(async ({ session }, recipe) => {
      if (!recipe || !recipe.trim()) return brewing.getRecipeList()

      const result = await brewing.startBrewing(session.userId, recipe.trim())
      if (!result.success) return result.message

      if (result.cost > 0) {
        const spend = await affinity.spendPoints(session.userId, result.cost)
        if (!spend.success) {
          return `酒狐悄悄话: 好感度不够消耗呢...需要 ${result.cost} 点，主人当前只有 ${spend.newPoints} 点。`
        }
      }
      await brewing.confirmBrewing(session.userId, result._recipeName)
      return result.message
    })

  // ===== 酒狐酒窖 =====
  ctx.command('酒狐酒窖', '查看酿酒进度')
    .action(({ session }) => brewing.getCellar(session.userId))

  // ===== 酒狐开瓶 =====
  ctx.command('酒狐开瓶', '品尝酿好的酒')
    .action(async ({ session }) => {
      const result = await brewing.openBottle(session.userId)
      if (result.success) {
        await affinity.addBonusPoints(session.userId, result.reward)
        await trackAndNotify(session, 'brew')
        if (result.quality === '传说') await trackAndNotify(session, 'brew_legendary')
        mood.onEvent('tipsy')
      }
      return result.message
    })

  // ===== 酒狐商店 =====
  ctx.command('酒狐商店', '浏览商品')
    .action(async () => {
      const shopData = shop.getShopData()
      const textOutput = shop.getShopList()

      if (!finalConfig.imageShop || !hasPuppeteer(ctx)) {
        return textOutput
      }

      try {
        return await renderShopCard(ctx, { data: shopData })
      } catch (err) {
        logger.warn('[fox] 酒狐商店图片渲染失败', err)
        if (finalConfig.imageFallbackToText) return textOutput
        return '酒狐悄悄话: 商店卡片生成失败了，请稍后再试一次...'
      }
    })

  // ===== 酒狐购买 =====
  ctx.command('酒狐购买 <item:text>', '购买物品')
    .action(async ({ session }, item) => {
      if (!item || !item.trim()) return '请指定物品名，例如：酒狐购买 狐狸耳饰'
      const result = shop.buyItem(session.userId, item.trim())
      if (!result.success) return result.message

      if (result.cost > 0) {
        const spend = await affinity.spendPoints(session.userId, result.cost)
        if (!spend.success) {
          return `酒狐悄悄话: 好感度不够呢...需要 ${result.cost} 点，主人当前只有 ${spend.newPoints} 点。`
        }
      }
      await shop.confirmBuy(session.userId, result)

      const textOutput = result.message
      if (!finalConfig.imageBuyResult || !hasPuppeteer(ctx)) {
        return textOutput
      }

      const foxLines = responseData.actionResultQuotesBuy || ['买到了就要好好用哦。']
      const foxLine = require('./lib/utils').randomPick(foxLines)
      const itemName = result._itemName || item.trim()
      const itemType = result._itemType || 'unknown'
      const suggestions = itemType === 'equip'
        ? [`酒狐装备 ${itemName}`, '酒狐背包']
        : [`酒狐使用 ${itemName}`, '酒狐背包']

      try {
        return await renderBuyResultCard(ctx, {
          data: {
            tag: '商店',
            mainRows: [
              { label: '物品', value: itemName, muted: `消耗好感 ${result.cost} 点` },
              { label: '类型', value: itemType === 'equip' ? '装备' : '消耗品' },
            ],
            suggestions,
            foxLine,
          },
        })
      } catch (err) {
        logger.warn('[fox] 酒狐购买结果卡片渲染失败', err)
        if (finalConfig.imageFallbackToText) return textOutput
        return '酒狐悄悄话: 购买结果卡片生成失败了，请稍后再试一次...'
      }
    })

  // ===== 酒狐背包 =====
  ctx.command('酒狐背包', '查看背包')
    .action(async ({ session }) => {
      const inventoryData = shop.getInventoryData(session.userId)
      const textOutput = shop.getInventory(session.userId)

      if (!finalConfig.imageInventory || !hasPuppeteer(ctx)) {
        return textOutput
      }

      try {
        return await renderInventoryCard(ctx, { data: inventoryData })
      } catch (err) {
        logger.warn('[fox] 酒狐背包图片渲染失败', err)
        if (finalConfig.imageFallbackToText) return textOutput
        return '酒狐悄悄话: 背包卡片生成失败了，请稍后再试一次...'
      }
    })

  // ===== 酒狐装备 =====
  ctx.command('酒狐装备 <item:text>', '装备物品')
    .action(async ({ session }, item) => {
      if (!item || !item.trim()) return '请指定要装备的物品名'
      const result = await shop.equip(session.userId, item.trim())
      if (!result.success || !finalConfig.imageEquipResult || !hasPuppeteer(ctx)) {
        return result.message
      }

      try {
        return await renderEquipResultCard(ctx, {
          data: {
            itemName: item.trim(),
            message: result.message,
          },
        })
      } catch (err) {
        logger.warn('[fox] 酒狐装备结果卡片渲染失败', err)
        if (finalConfig.imageFallbackToText) return result.message
        return '酒狐悄悄话: 装备结果卡片生成失败了，请稍后再试一次...'
      }
    })

  // ===== 酒狐使用 =====
  ctx.command('酒狐使用 <item:text>', '使用消耗品')
    .action(async ({ session }, item) => {
      if (!item || !item.trim()) return '请指定要使用的物品名'
      const itemName = item.trim()
      const result = await shop.useItem(session.userId, itemName)
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

      if (!result.success || !finalConfig.imageUseResult || !hasPuppeteer(ctx)) {
        return result.message
      }

      try {
        return await renderUseResultCard(ctx, {
          data: {
            itemName,
            message: result.message,
            effect: result.effect,
          },
        })
      } catch (err) {
        logger.warn('[fox] 酒狐使用结果卡片渲染失败', err)
        if (finalConfig.imageFallbackToText) return result.message
        return '酒狐悄悄话: 使用结果卡片生成失败了，请稍后再试一次...'
      }
    })

  // ===== 酒狐回忆 =====
  ctx.command('酒狐回忆', '查看回忆录')
    .action(async ({ session }) => {
      const memoirData = memoir.getMemoirData(session.userId)
      const textOutput = memoir.getMemoir(session.userId)

      if (!memoirData || !finalConfig.imageMemoir || !hasPuppeteer(ctx)) {
        return textOutput
      }

      try {
        return await renderMemoirCard(ctx, {
          userName: session.username || session.author?.name || session.userId,
          data: memoirData,
        })
      } catch (err) {
        logger.warn('[fox] 酒狐回忆图片渲染失败', err)
        if (finalConfig.imageFallbackToText) return textOutput
        return '酒狐悄悄话: 回忆录卡片生成失败了，请稍后再试一次...'
      }
    })

  // ===== 酒狐成就 =====
  ctx.command('酒狐成就', '查看成就徽章')
    .action(async ({ session }) => {
      const achievementData = achievements.getPanelData(session.userId)
      const textOutput = achievements.getPanel(session.userId)

      if (!finalConfig.imageAchievement || !hasPuppeteer(ctx)) {
        return textOutput
      }

      try {
        return await renderAchievementCard(ctx, { data: achievementData })
      } catch (err) {
        logger.warn('[fox] 酒狐成就图片渲染失败', err)
        if (finalConfig.imageFallbackToText) return textOutput
        return '酒狐悄悄话: 成就卡片生成失败了，请稍后再试一次...'
      }
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

      if (!finalConfig.imageRanking || !hasPuppeteer(ctx)) {
        return textOutput
      }

      try {
        return await renderRankingCard(ctx, { data: rankingData })
      } catch (err) {
        logger.warn('[fox] 酒狐排行图片渲染失败', err)
        if (finalConfig.imageFallbackToText) return textOutput
        return '酒狐悄悄话: 排行卡片生成失败了，请稍后再试一次...'
      }
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

      const textOutput = `酒狐悄悄话: 已帮主人把心意传达给 ${targetId} 了！\n（你 -${giftCost}好感度，对方 +${giftBonus}好感度）`

      if (!finalConfig.imageGiftResult || !hasPuppeteer(ctx)) {
        return textOutput
      }

      const foxLines = responseData.actionResultQuotesGift || ['我会好好传达的。']
      const foxLine = require('./lib/utils').randomPick(foxLines)

      try {
        return await renderGiftResultCard(ctx, {
          data: {
            tag: '社交',
            mainRows: [
              { label: '对象', value: targetId, muted: `你 -${giftCost} / 对方 +${giftBonus}` },
            ],
            suggestions: ['酒狐排行', '酒狐回忆'],
            foxLine,
          },
        })
      } catch (err) {
        logger.warn('[fox] 酒狐送礼结果卡片渲染失败', err)
        if (finalConfig.imageFallbackToText) return textOutput
        return '酒狐悄悄话: 送礼结果卡片生成失败了，请稍后再试一次...'
      }
    })

  // ===== 酒狐收藏 =====
  ctx.command('酒狐收藏', '收藏最近收到的语录')
    .action(async ({ session }) => {
      const result = await favorites.addFavorite(session.userId)
      if (result.success) await trackAndNotify(session, 'favorite')
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
        latenight: '深夜', dawn: '清晨', morning: '上午',
        noon: '中午', afternoon: '下午', evening: '傍晚', night: '夜晚',
      }
      const periodKey = require('./lib/utils').getTimePeriod()

      if (!finalConfig.imageWeather || !hasPuppeteer(ctx)) {
        return textOutput
      }

      try {
        return await renderWeatherCard(ctx, {
          data: {
            title: '酒狐天气',
            status: weatherData.name,
            period: periodMap[periodKey] || '未知',
            body: weatherData.description,
            foxComment: weatherData.foxComment,
          },
        })
      } catch (err) {
        logger.warn('[fox] 酒狐天气图片渲染失败', err)
        if (finalConfig.imageFallbackToText) return textOutput
        return '酒狐悄悄话: 天气卡片生成失败了，请稍后再试一次...'
      }
    })

  // ===== 酒狐委托(预留) =====
  ctx.command('酒狐委托', '酒狐委托任务板（敬请期待）')
    .action(() => '== 酒狐委托 ==\n\n这个功能以后可能会和 MC 模组联动哦！\n酒狐悄悄话: 正在学习怎么发布委托呢...敬请期待~')

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

  logger.info(`[fox] 酒狐悄悄话增强版 v2.2 已启动 | 语录 ${quotesLoader.count} 条 | 故事 ${story.count} 篇`)
}
