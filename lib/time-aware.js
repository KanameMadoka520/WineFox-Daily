/**
 * WineFox-Daily - 时间感知模块
 * 根据当前时段智能选择语录风格
 */

const { getTimePeriod, randomPick } = require('./utils')

// 时段 -> 优先匹配的分类名列表
const PERIOD_CATEGORY_MAP = {
  latenight: ['催睡', '关心健康', '晚安', '暖心'],
  dawn:      ['早安', '暖心', '通用'],
  morning:   ['早安', '暖心', '日常', '通用'],
  noon:      ['美食', '日常', '通用'],
  afternoon: ['日常', '冒险', '建造', '通用'],
  evening:   ['暖心', '美食', '日常', '通用'],
  night:     ['催睡', '关心健康', '晚安', '暖心', '喝酒'],
}

// 时段 -> 关键词匹配（当分类系统没命中时，从全部语录中按关键词筛选）
const PERIOD_KEYWORDS = {
  latenight: ['睡', '休息', '晚安', '夜', '累', '熬', '幻翼', '被窝', '床', '困'],
  dawn:      ['早', '太阳', '起床', '清晨', '新的一天'],
  morning:   ['早', '太阳', '元气', '新的一天', '加油'],
  noon:      ['吃', '饭', '料理', '厨房', '汤', '牛排', '饿', '食', '午'],
  afternoon: ['冒险', '探索', '挖', '建', '模组', '机器'],
  evening:   ['晚', '温暖', '辛苦', '回家', '陪'],
  night:     ['睡', '休息', '晚安', '月', '星', '夜', '累', '床', '被窝', '困', '酒'],
}

/**
 * 根据时段从语录库中智能选取
 * @param {import('./quotes-loader')} quotesLoader - 语录加载器实例
 * @param {object} [options]
 * @param {number} [options.timeAwareChance=0.6] - 使用时间感知的概率 (0~1)
 * @returns {string|null}
 */
function pickByTime(quotesLoader, options = {}) {
  const { timeAwareChance = 0.6 } = options
  const period = getTimePeriod()

  // 按概率决定是否启用时间感知
  if (Math.random() > timeAwareChance) {
    return randomPick(quotesLoader.all)
  }

  // 优先：从分类中匹配
  const preferredCategories = PERIOD_CATEGORY_MAP[period] || ['通用']
  for (const catName of preferredCategories) {
    const catQuotes = quotesLoader.getCategory(catName)
    if (catQuotes && catQuotes.length > 0) {
      return randomPick(catQuotes)
    }
  }

  // 备选：从全量语录中按关键词筛选
  const keywords = PERIOD_KEYWORDS[period] || []
  if (keywords.length > 0) {
    const filtered = quotesLoader.all.filter(q =>
      keywords.some(kw => q.includes(kw))
    )
    if (filtered.length > 0) {
      return randomPick(filtered)
    }
  }

  // 兜底：完全随机
  return randomPick(quotesLoader.all)
}

/**
 * 获取当前时段的友好名称
 * @returns {string}
 */
function getTimePeriodLabel() {
  const labels = {
    latenight: '深夜',
    dawn: '清晨',
    morning: '上午',
    noon: '中午',
    afternoon: '下午',
    evening: '傍晚',
    night: '夜晚',
  }
  return labels[getTimePeriod()] || '未知'
}

module.exports = {
  pickByTime,
  getTimePeriodLabel,
  PERIOD_CATEGORY_MAP,
}
