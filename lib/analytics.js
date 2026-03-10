/**
 * WineFox-Daily - 数据分析与统计
 */

const AFFINITY_LEVEL_NAMES = ['陌生人', '初识', '熟人', '好朋友', '挚友', '灵魂伴侣']

function getAnalyticsData(affinitySystem, getTodayPassiveCount) {
  const users = Object.values(affinitySystem.data)
  const totalUsers = users.length

  const tierCounts = {}
  for (const user of users) {
    const levelData = affinitySystem.getLevel(user.points || 0)
    const name = levelData.name
    tierCounts[name] = (tierCounts[name] || 0) + 1
  }

  const maxCount = Math.max(...AFFINITY_LEVEL_NAMES.map(name => tierCounts[name] || 0), 1)
  const tiers = AFFINITY_LEVEL_NAMES.map((name) => ({
    name,
    count: tierCounts[name] || 0,
    ratio: maxCount ? (tierCounts[name] || 0) / maxCount : 0,
  }))

  return {
    totalUsers,
    tiers,
    passiveCount: getTodayPassiveCount(),
    maxCount,
  }
}

function formatAnalyticsText(data) {
  const lines = [
    '📊 酒狐互动健康表与好感度分布',
    `总参与互动用户: ${data.totalUsers} 人`,
    '',
  ]

  for (const tier of data.tiers) {
    const barLen = 15
    const filled = Math.round(tier.ratio * barLen)
    const bar = '█'.repeat(filled) + '░'.repeat(Math.max(0, barLen - filled))
    let paddedName = tier.name
    while (paddedName.length < 4) paddedName += '　'
    lines.push(`${paddedName} ${bar} ${tier.count}人`)
  }

  lines.push('')
  lines.push(`[今日被动触发次数: ${data.passiveCount}次]`)
  return lines.join('\n')
}

/**
 * 注册数据统计指令
 * @param {import('koishi').Context} ctx
 * @param {import('./affinity')} affinitySystem
 * @param {Function} getTodayPassiveCount
 * @param {{ hasPuppeteer?: Function, renderAnalyticsCard?: Function, finalConfig?: object, logger?: object }} [options]
 */
function registerAnalyticsCommands(ctx, affinitySystem, getTodayPassiveCount, options = {}) {
  const { hasPuppeteer, renderAnalyticsCard, finalConfig = {}, logger = console } = options

  ctx.command('酒狐统计', '查看群内酒狐互动健康表与好感度分布')
    .action(async () => {
      const data = getAnalyticsData(affinitySystem, getTodayPassiveCount)
      const textOutput = formatAnalyticsText(data)

      if (!finalConfig.imageAnalytics || !hasPuppeteer || !renderAnalyticsCard || !hasPuppeteer(ctx)) {
        return textOutput
      }

      try {
        return await renderAnalyticsCard(ctx, { data })
      } catch (err) {
        logger.warn('[fox] 酒狐统计图片渲染失败', err)
        if (finalConfig.imageFallbackToText) return textOutput
        return '酒狐悄悄话: 统计卡片生成失败了，请稍后再试一次...'
      }
    })
}

module.exports = {
  getAnalyticsData,
  formatAnalyticsText,
  registerAnalyticsCommands,
}
