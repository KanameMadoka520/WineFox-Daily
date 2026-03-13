/**
 * WineFox-Daily - 好感度专属互动
 * 不同好感等级解锁不同的互动选项，带冷却机制
 */

const { randomPick } = require('./utils')
const responseData = require('../data/responses')

// 冷却记录：Map<userId:action, timestamp>
const cooldowns = new Map()
const harassTracker = new Map()
const COOLDOWN_MS = 60 * 60 * 1000 // 1小时

function checkCooldown(userId, action) {
  const key = `${userId}:${action}`
  const now = Date.now()
  const last = cooldowns.get(key) || 0
  if (now - last < COOLDOWN_MS) {
    const remaining = Math.ceil((COOLDOWN_MS - (now - last)) / 60000)
    return remaining
  }
  return 0
}

function setCooldown(userId, action) {
  cooldowns.set(`${userId}:${action}`, Date.now())
}

function resetHarass(userId, action) {
  harassTracker.delete(`${userId}:${action}`)
}

function recordHarass(userId, action) {
  const key = `${userId}:${action}`
  const current = harassTracker.get(key) || 0
  const next = current + 1
  harassTracker.set(key, next)
  return next
}

/**
 * 注册互动指令
 */
function registerInteractions(ctx, affinity, mood, config = {}) {
  const headpatLevel = config.headpatLevel ?? 3
  const hugLevel = config.hugLevel ?? 4
  const confessLevel = config.confessLevel ?? 5
  const feedDrinkLevel = config.feedDrinkLevel ?? 2
  const scratchEarLevel = config.scratchEarLevel ?? 3
  const holdHandLevel = config.holdHandLevel ?? 4

  // 通用互动处理
  async function handleInteraction(session, action, requiredLevel, reward, responseKey, rejectKey) {
    const userId = session.userId
    const status = affinity.getStatus(userId)

    if (status.level.level < requiredLevel) {
      const rejectLines = responseData[rejectKey]
      return rejectLines ? randomPick(rejectLines) : '酒狐悄悄话: 我们还不够熟悉呢...'
    }

    const cdRemaining = checkCooldown(userId, action)
    if (cdRemaining > 0) {
      const harassCount = recordHarass(userId, action)
      if (harassCount === 1) {
        return `酒狐悄悄话: 刚才已经${action}过了啦...${cdRemaining}分钟后再来好不好？ (1/3 再骚扰酒狐就要扣好感了哦！)`
      }
      if (harassCount === 2) {
        return `酒狐悄悄话: 刚才已经${action}过了啦...${cdRemaining}分钟后再来好不好？ (2/3 最后警告！再来要扣好感了！)`
      }
      await affinity.removePoints(userId, 2)
      resetHarass(userId, action)
      return `酒狐悄悄话: 还在冷却里还一直闹腾...酒狐要生气了！\n${affinity.formatProgressLine(userId, -2)}`
    }

    await affinity.addPoints(userId, reward)
    setCooldown(userId, action)
    resetHarass(userId, action)
    if (mood) mood.onEvent(action === 'headpat' ? 'poke' : 'interact')

    const lines = responseData[responseKey]
    return lines ? randomPick(lines) : '酒狐悄悄话: ...'
  }

  // 酒狐摸头
  ctx.command('酒狐摸头', '摸摸酒狐的头')
    .action(({ session }) => handleInteraction(
      session, 'headpat', headpatLevel, 1,
      'headpatResponses', 'headpatReject'
    ))

  // 酒狐拥抱
  ctx.command('酒狐拥抱', '给酒狐一个拥抱')
    .action(({ session }) => handleInteraction(
      session, 'hug', hugLevel, 2,
      'hugResponses', 'hugReject'
    ))

  // 酒狐告白
  ctx.command('酒狐告白', '向酒狐告白')
    .action(({ session }) => handleInteraction(
      session, 'confess', confessLevel, 3,
      'confessResponses', 'confessReject'
    ))

  // --- v2.2 新增互动 ---

  // 酒狐喂酒
  ctx.command('酒狐喂酒', '给酒狐喂一口酒')
    .action(async ({ session }) => {
      const result = await handleInteraction(
        session, 'feedDrink', feedDrinkLevel, 1,
        'feedDrinkResponses', 'feedDrinkReject'
      )
      // 概率触发微醺心情（通过 onEvent 机制，不直接赋值）
      if (mood && Math.random() < 0.4) {
        mood.onEvent('tipsy')
      }
      return result
    })

  // 酒狐挠耳朵
  ctx.command('酒狐挠耳朵', '挠挠酒狐的耳朵')
    .action(({ session }) => handleInteraction(
      session, 'scratchEar', scratchEarLevel, 1,
      'scratchEarResponses', 'scratchEarReject'
    ))

  // 酒狐牵手
  ctx.command('酒狐牵手', '牵着酒狐的手')
    .action(({ session }) => handleInteraction(
      session, 'holdHand', holdHandLevel, 2,
      'holdHandResponses', 'holdHandReject'
    ))
}

module.exports = { registerInteractions }
