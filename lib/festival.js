/**
 * WineFox-Daily - 节日系统
 * 根据日期自动识别节日，优先推送节日相关语录
 */

const { getMonthDay, randomPick } = require('./utils')

// 固定日期的节日 (MM-DD)
const FIXED_FESTIVALS = {
  '01-01': { name: '元旦', keywords: ['新年', '跨年', '元旦'] },
  '02-14': { name: '情人节', keywords: ['情人', '爱', '喜欢', '告白'] },
  '03-08': { name: '妇女节', keywords: ['女', '可爱'] },
  '04-01': { name: '愚人节', keywords: ['愚人', '骗', '玩笑'] },
  '05-01': { name: '劳动节', keywords: ['劳动', '辛苦', '工作'] },
  '06-01': { name: '儿童节', keywords: ['可爱', '玩', '开心'] },
  '10-01': { name: '国庆节', keywords: ['庆祝', '节日'] },
  '10-31': { name: '万圣节', keywords: ['万圣', '糖', '捣蛋', '南瓜'] },
  '12-24': { name: '平安夜', keywords: ['圣诞', '礼物', '平安'] },
  '12-25': { name: '圣诞节', keywords: ['圣诞', '礼物', '平安'] },
  '12-31': { name: '跨年夜', keywords: ['新年', '跨年', '烟花'] },
}

// 农历节日的大致公历日期范围（每年不同，这里给出常见范围）
// 运行时根据当年实际计算可以更精确，这里简化处理
const LUNAR_FESTIVAL_RANGES = [
  { name: '春节', startMonth: 1, startDay: 20, endMonth: 2, endDay: 20, keywords: ['春节', '红包', '新年', '拜年'] },
  { name: '元宵节', startMonth: 2, startDay: 1, endMonth: 3, endDay: 5, keywords: ['元宵', '汤圆', '灯'] },
  { name: '端午节', startMonth: 5, startDay: 25, endMonth: 6, endDay: 25, keywords: ['端午', '粽子', '龙舟'] },
  { name: '七夕', startMonth: 7, startDay: 25, endMonth: 8, endDay: 25, keywords: ['七夕', '爱', '喜欢', '告白', '情人'] },
  { name: '中秋节', startMonth: 9, startDay: 10, endMonth: 10, endDay: 10, keywords: ['中秋', '月亮', '月饼', '月色', '团圆'] },
]

class FestivalSystem {
  constructor() {
    // 内置的节日专属语录
    this.festivalQuotes = require('../data/festival_quotes')
  }

  /**
   * 检测今天是否为节日
   * @returns {{ isFestival: boolean, festivalName: string|null }}
   */
  checkToday() {
    const md = getMonthDay()
    const now = new Date()
    const month = now.getMonth() + 1
    const day = now.getDate()

    // 检查固定节日
    if (FIXED_FESTIVALS[md]) {
      return { isFestival: true, festivalName: FIXED_FESTIVALS[md].name }
    }

    // 检查农历节日（粗略范围）
    for (const lf of LUNAR_FESTIVAL_RANGES) {
      const afterStart = (month > lf.startMonth) || (month === lf.startMonth && day >= lf.startDay)
      const beforeEnd = (month < lf.endMonth) || (month === lf.endMonth && day <= lf.endDay)
      if (afterStart && beforeEnd) {
        // 范围内只是"可能"，不自动触发，但可通过关键词增强
        // 这里不直接返回，留给关键词匹配
      }
    }

    return { isFestival: false, festivalName: null }
  }

  /**
   * 获取节日语录
   * @param {string} festivalName
   * @param {import('./quotes-loader')} quotesLoader
   * @returns {string|null}
   */
  getFestivalQuote(festivalName, quotesLoader) {
    // 优先从内置节日语录取
    const builtIn = this.festivalQuotes[festivalName]
    if (builtIn && builtIn.length > 0) {
      return randomPick(builtIn)
    }

    // 从语录库中按关键词搜索
    const festival = Object.values(FIXED_FESTIVALS).find(f => f.name === festivalName)
    const keywords = festival ? festival.keywords : [festivalName]

    const matched = quotesLoader.all.filter(q =>
      keywords.some(kw => q.includes(kw))
    )
    if (matched.length > 0) {
      return randomPick(matched)
    }

    return null
  }

  /**
   * 获取节日问候（如果今天是节日）
   * @param {import('./quotes-loader')} quotesLoader
   * @returns {{ festivalName: string, quote: string }|null}
   */
  getGreetingIfFestival(quotesLoader) {
    const { isFestival, festivalName } = this.checkToday()
    if (!isFestival) return null

    const quote = this.getFestivalQuote(festivalName, quotesLoader)
    if (!quote) return null

    return { festivalName, quote }
  }
}

module.exports = FestivalSystem
