/**
 * WineFox-Daily - 语录搜索模块
 * 提供关键词搜索和分类浏览功能
 */

const { randomPick } = require('./utils')

/**
 * 注册搜索相关指令
 * @param {import('koishi').Context} ctx
 * @param {import('./quotes-loader')} quotesLoader
 * @param {{
 *   renderImageFeature?: Function,
 *   renderSearchResultCard?: Function,
 *   renderCategoryListCard?: Function,
 *   renderQuoteStatsCard?: Function,
 *   finalConfig?: object,
 * }} [options]
 */
function registerSearchCommands(ctx, quotesLoader, options = {}) {
  const {
    renderImageFeature,
    renderSearchResultCard,
    renderCategoryListCard,
    renderQuoteStatsCard,
    finalConfig = {},
  } = options

  // 酒狐搜 <关键词> - 搜索语录
  ctx.command('酒狐搜 <keyword:text>', '搜索包含关键词的酒狐语录')
    .action(({ session }, keyword) => {
      if (!keyword || !keyword.trim()) {
        return '请输入要搜索的关键词，例如：酒狐搜 苦力怕'
      }

      const kw = keyword.trim()
      const results = quotesLoader.searchWithMeta(kw)

      if (results.length === 0) {
        return `没有找到包含「${kw}」的语录呢...`
      }

      // 随机返回一条匹配结果，并告知总数
      const picked = randomPick(results)
      const textOutput = results.length === 1
        ? picked.text
        : `${picked.text}\n\n💬 共找到 ${results.length} 条相关语录`

      if (!renderImageFeature || !renderSearchResultCard) {
        return textOutput
      }

      return renderImageFeature({
        feature: '酒狐搜索',
        imageKey: 'imageSearch',
        imageEnabled: finalConfig.imageSearch,
        textOutput,
        session,
        detail: `keyword=${kw}`,
        render: () => renderSearchResultCard(ctx, {
          data: {
            keyword: kw,
            resultCount: results.length,
            quote: picked.text,
            category: picked.category,
          },
        }),
        fallbackMessage: '酒狐悄悄话: 搜索结果卡片生成失败了，请稍后再试一次...',
      })
    })

  // 酒狐分类 - 查看所有分类
  ctx.command('酒狐分类', '查看酒狐语录的所有分类')
    .action(({ session }) => {
      const summary = quotesLoader.getCategorySummaryData()
      if (summary.categoryCount === 0) {
        return '暂时没有分类信息，所有语录都是通用的～'
      }

      const lines = summary.categories.map(item => `  📁 ${item.name} (${item.count}条)`)
      const textOutput = `📚 酒狐语录分类列表：\n${lines.join('\n')}\n\n使用「酒狐 <分类名>」查看对应分类的语录`

      if (!renderImageFeature || !renderCategoryListCard) {
        return textOutput
      }

      const fingerprint = summary.categories.map(item => `${item.name}:${item.count}`).join('|')
      return renderImageFeature({
        feature: '酒狐分类',
        imageKey: 'imageCategory',
        imageEnabled: finalConfig.imageCategory,
        textOutput,
        session,
        cacheKey: `category:${summary.quoteCount}:${summary.categoryCount}:${summary.rareCount}:${fingerprint}`,
        cacheTtlMs: 600000,
        render: () => renderCategoryListCard(ctx, { data: summary }),
        fallbackMessage: '酒狐悄悄话: 分类目录卡片生成失败了，请稍后再试一次...',
      })
    })

  // 酒狐总数 - 查看语录统计
  ctx.command('酒狐总数', '查看酒狐语录总数')
    .action(({ session }) => {
      const stats = quotesLoader.getStatsData()
      const textOutput = `📖 酒狐的笔记本里一共记录了 ${stats.quoteCount} 条悄悄话，分为 ${stats.categoryCount} 个类别～\n每一条都是酒狐的心意哦！`

      if (!renderImageFeature || !renderQuoteStatsCard) {
        return textOutput
      }

      return renderImageFeature({
        feature: '酒狐总数',
        imageKey: 'imageQuoteStats',
        imageEnabled: finalConfig.imageQuoteStats,
        textOutput,
        session,
        cacheKey: `quoteStats:${stats.quoteCount}:${stats.categoryCount}:${stats.rareCount}`,
        cacheTtlMs: 600000,
        render: () => renderQuoteStatsCard(ctx, { data: stats }),
        fallbackMessage: '酒狐悄悄话: 语录统计卡片生成失败了，请稍后再试一次...',
      })
    })
}

module.exports = { registerSearchCommands }
