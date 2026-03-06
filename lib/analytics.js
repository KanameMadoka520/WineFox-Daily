/**
 * WineFox-Daily - 数据分析与统计
 */

/**
 * 注册数据统计指令
 * @param {import('koishi').Context} ctx
 * @param {import('./affinity')} affinitySystem
 * @param {Function} getTodayPassiveCount
 */
function registerAnalyticsCommands(ctx, affinitySystem, getTodayPassiveCount) {
  ctx.command('酒狐统计', '查看群内酒狐互动健康表与好感度分布')
    .action(() => {
      const users = Object.values(affinitySystem.data)
      const totalUsers = users.length

      const tierCounts = {}
      for (const user of users) {
        const levelData = affinitySystem.getLevel(user.points || 0)
        const name = levelData.name
        tierCounts[name] = (tierCounts[name] || 0) + 1
      }

      const AFFINITY_LEVEL_NAMES = ['陌生人', '初识', '熟人', '好朋友', '挚友', '灵魂伴侣']
      const maxCount = Math.max(...AFFINITY_LEVEL_NAMES.map(name => tierCounts[name] || 0), 1)

      const lines = [
        '📊 酒狐互动健康表与好感度分布',
        `总参与互动用户: ${totalUsers} 人`,
        ''
      ]

      for (const name of AFFINITY_LEVEL_NAMES) {
        const count = tierCounts[name] || 0
        const barLen = 15
        const filled = Math.round((count / maxCount) * barLen)
        const bar = '█'.repeat(filled) + '░'.repeat(Math.max(0, barLen - filled))
        let paddedName = name
        while (paddedName.length < 4) paddedName += '　'
        lines.push(`${paddedName} ${bar} ${count}人`)
      }

      const passiveCount = getTodayPassiveCount()
      lines.push('')
      lines.push(`[今日被动触发次数: ${passiveCount}次]`)

      return lines.join('\n')
    })
}

module.exports = {
  registerAnalyticsCommands
}