/**
 * WineFox-Daily - 被动触发模块
 * 响应戳一戳事件，以及群聊关键词小概率冒泡
 */

const { randomPick, rollChance, getTodayKey } = require('./utils')
const POKE_RESPONSES = require('../data/poke_responses')
const KEYWORD_TRIGGERS = require('../data/keyword_triggers')

let dailyStats = { date: '', count: 0 }

function incrementDailyStats() {
  const today = getTodayKey()
  if (dailyStats.date !== today) {
    dailyStats.date = today
    dailyStats.count = 1
  } else {
    dailyStats.count++
  }
}

function getTodayPassiveCount() {
  return dailyStats.date === getTodayKey() ? dailyStats.count : 0
}

/**
 * 注册被动触发事件
 * @param {import('koishi').Context} ctx - Koishi 上下文
 * @param {import('./quotes-loader')} quotesLoader - 语录加载器
 * @param {import('./affinity')} affinity - 好感度系统
 * @param {object} config - 插件配置
 */
function registerPassive(ctx, quotesLoader, affinity, config) {
  const logger = ctx.logger('fox')

  // 1. 戳一戳响应 - 监听 OneBot 平台的 notice 事件，过滤 poke 子类型
  ctx.platform('onebot').on('notice', async (session) => {
    if (session.subtype !== 'poke') return

    logger.info(`[fox] 收到戳一戳事件: user=${session.userId}, target=${session.targetId}, self=${session.selfId}, guild=${session.guildId || '私聊'}`)

    // 只响应戳机器人自己
    if (session.targetId !== session.selfId) return

    const userId = session.userId
    logger.info(`[fox] 戳一戳触发: userId=${userId}, 群=${session.guildId || '私聊'}`)

    if (affinity) {
      const passiveAffinityBonus = 1 + (config.getPassiveAffinityBonus ? config.getPassiveAffinityBonus(userId) : 0)
      const affinityResult = await affinity.addPoints(userId, passiveAffinityBonus)
      await affinity.addTickets(userId, 1)
      if (affinityResult.decayed) {
        await session.send(affinityResult.decayMessage)
      }
    }

    // 70% 概率用专属戳一戳回复，30% 概率用语录
    if (rollChance(0.7)) {
      const reply = randomPick(POKE_RESPONSES)
      logger.debug(`[fox] 戳一戳回复(专属): ${reply.substring(0, 50)}`)
      await session.send(reply)
      incrementDailyStats()
    } else if (quotesLoader.all.length > 0) {
      const reply = randomPick(quotesLoader.all)
      logger.debug(`[fox] 戳一戳回复(语录): ${reply.substring(0, 50)}`)
      await session.send(reply)
      incrementDailyStats()
    }
  })

  // 2. 群聊关键词被动冒泡
  if (config.enablePassiveKeyword !== false) {
    // 记录每个群聊上一次被动触发的时间：guildId -> timestamp
    const lastTriggered = new Map()
    // 获取配置中的冷却时间，默认为 10 分钟 (600,000 ms)
    const cooldown = config.passiveCooldown !== undefined ? config.passiveCooldown : 600000
    logger.info(`[fox] 关键词被动冒泡已启用 (冷却=${cooldown}ms, 关键词=${Object.keys(KEYWORD_TRIGGERS).length}个)`)

    ctx.middleware((session, next) => {
      // 只在群聊中触发
      if (!session.guildId) return next()

      const guildId = session.guildId
      const now = Date.now()

      // 检查该群是否还在冷却中
      if (lastTriggered.has(guildId)) {
        const lastTime = lastTriggered.get(guildId)
        if (now - lastTime < cooldown) {
          return next()
        }
      }

      const content = session.content || ''

      // 扫描所有关键词，收集命中的
      const hits = []
      for (const [keyword, triggerConfig] of Object.entries(KEYWORD_TRIGGERS)) {
        if (content.includes(keyword)) {
          hits.push({ keyword, triggerConfig })
        }
      }

      if (hits.length === 0) return next()

      // 从命中的关键词中随机选一个（而非固定取第一个）
      const pick = hits[Math.floor(Math.random() * hits.length)]
      logger.info(`[fox] 关键词检测: 命中=${hits.map(h => h.keyword).join('/')} → 选中「${pick.keyword}」(${(pick.triggerConfig.chance * 100).toFixed(0)}%), 群=${guildId}`)

      if (!rollChance(pick.triggerConfig.chance)) {
        logger.info(`[fox] 关键词「${pick.keyword}」概率未通过, 跳过`)
        return next()
      }

      // 从语录库搜索匹配的语录
      const matched = quotesLoader.all.filter(q =>
        pick.triggerConfig.search.some(s => q.includes(s))
      )

      if (matched.length === 0) {
        logger.info(`[fox] 关键词「${pick.keyword}」概率通过但语录库无匹配, search=${pick.triggerConfig.search.join('/')}`)
        return next()
      }

      // 触发成功，记录时间并进入冷却
      lastTriggered.set(guildId, now)

      const quote = randomPick(matched)
      // 延迟 1-3 秒回复，更自然
      const delay = 1000 + Math.floor(Math.random() * 2000)
      setTimeout(() => {
        session.send(quote)
      }, delay)
      incrementDailyStats()
      if (affinity && session.userId) {
        affinity.addTickets(session.userId, 1)
      }
      logger.info(`[fox] 被动触发: 关键词=${pick.keyword}, 匹配语录=${matched.length}条, 群=${guildId}`)

      return next()
    })
  } else {
    logger.info('[fox] 关键词被动冒泡已关闭 (enablePassiveKeyword=false)')
  }
}

module.exports = {
  registerPassive,
  POKE_RESPONSES,
  KEYWORD_TRIGGERS,
  getTodayPassiveCount,
}
