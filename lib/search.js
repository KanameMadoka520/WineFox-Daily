/**
 * WineFox-Daily - 语录搜索模块
 * 提供关键词搜索和分类浏览功能
 */

const { randomPick } = require('./utils')

/**
 * 注册搜索相关指令
 * @param {import('koishi').Context} ctx
 * @param {import('./quotes-loader')} quotesLoader
 */
function registerSearchCommands(ctx, quotesLoader) {
  // 酒狐搜 <关键词> - 搜索语录
  ctx.command('酒狐搜 <keyword:text>', '搜索包含关键词的酒狐语录')
    .action(({ session }, keyword) => {
      if (!keyword || !keyword.trim()) {
        return '请输入要搜索的关键词，例如：酒狐搜 苦力怕'
      }

      const kw = keyword.trim()
      const results = quotesLoader.search(kw)

      if (results.length === 0) {
        return `没有找到包含「${kw}」的语录呢...`
      }

      // 随机返回一条匹配结果，并告知总数
      const picked = randomPick(results)
      if (results.length === 1) {
        return picked
      }
      return `${picked}\n\n💬 共找到 ${results.length} 条相关语录`
    })

  // 酒狐分类 - 查看所有分类
  ctx.command('酒狐分类', '查看酒狐语录的所有分类')
    .action(() => {
      const names = quotesLoader.categoryNames
      if (names.length === 0) {
        return '暂时没有分类信息，所有语录都是通用的～'
      }

      const lines = names.map(name => {
        const count = quotesLoader.getCategory(name).length
        return `  📁 ${name} (${count}条)`
      })

      return `📚 酒狐语录分类列表：\n${lines.join('\n')}\n\n使用「酒狐 <分类名>」查看对应分类的语录`
    })

  // 酒狐总数 - 查看语录统计
  ctx.command('酒狐总数', '查看酒狐语录总数')
    .action(() => {
      const total = quotesLoader.count
      const catCount = quotesLoader.categoryNames.length

      return `📖 酒狐的笔记本里一共记录了 ${total} 条悄悄话，分为 ${catCount} 个类别～\n每一条都是酒狐的心意哦！`
    })
}

module.exports = { registerSearchCommands }
