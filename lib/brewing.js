/**
 * WineFox-Daily - 酒狐酿酒系统
 * MC主题酿酒小游戏：选配方 -> 等发酵 -> 开瓶
 */

const fs = require('fs')
const path = require('path')
const { withLock } = require('./io-lock')
const { randomPick } = require('./utils')
const RECIPES = require('../data/brewing_recipes')

// 品质定义
const QUALITIES = [
  { name: '普通', weight: 40, reward: 2 },
  { name: '优良', weight: 30, reward: 5 },
  { name: '极品', weight: 20, reward: 10 },
  { name: '稀有', weight: 8, reward: 20 },
  { name: '传说', weight: 2, reward: 50 },
]

const BREW_RESULT_FOX_LINES = [
  '酒香已经慢慢醒过来了，接下来就交给时间吧。',
  '这次发酵的味道不错，酒狐会替主人盯着它。',
  '木桶已经封好啦，等开瓶的时候一定会很惊喜。',
]

const OPEN_RESULT_FOX_LINES = [
  '香气一下子就散开了，连尾巴都想跟着晃起来。',
  '这一口的味道很有层次，主人果然很会挑配方。',
  '开瓶的声音真好听，像冒险结束后的庆功时刻。',
]

class BrewingSystem {
  /**
   * @param {string} memoryDir
   * @param {object} [logger]
   */
  constructor(memoryDir, logger) {
    this.savePath = path.join(memoryDir, 'brewing.json')
    this.logger = logger || console
    this.data = {}
    this._load()
  }

  _load() {
    try {
      if (fs.existsSync(this.savePath)) {
        this.data = JSON.parse(fs.readFileSync(this.savePath, 'utf-8'))
      }
    } catch (err) {
      this.logger.warn(`[fox] 酿酒数据加载失败: ${err.message}`)
      this.data = {}
    }
  }

  async _save() {
    try {
      await withLock(this.savePath, async () => {
        await fs.promises.writeFile(this.savePath, JSON.stringify(this.data, null, 2), 'utf-8')
      })
    } catch (err) {
      this.logger.error(`[fox] 酿酒数据保存失败: ${err.message}`)
    }
  }

  _getUserData(userId) {
    if (!this.data[userId]) {
      this.data[userId] = {
        brewing: null,       // { recipe, startTime, finishTime }
        finished: [],        // 已酿好未开瓶的酒
        totalBrewed: 0,
        bestQuality: '',
      }
    }
    return this.data[userId]
  }

  _getQualityRangeLabel(minIdx = 0, maxIdx = QUALITIES.length - 1) {
    const min = QUALITIES[minIdx] || QUALITIES[0]
    const max = QUALITIES[maxIdx] || QUALITIES[QUALITIES.length - 1]
    return min.name === max.name ? min.name : `${min.name} ~ ${max.name}`
  }

  _getRemainingMinutes(finishTime) {
    return Math.max(0, Math.ceil((finishTime - Date.now()) / 60000))
  }

  _getProgress(startTime, finishTime) {
    const total = Math.max(1, finishTime - startTime)
    const elapsed = Math.min(total, Math.max(0, Date.now() - startTime))
    return Math.max(0, Math.min(100, Math.round((elapsed / total) * 100)))
  }

  getCellarCardData(userId) {
    const userData = this._getUserData(userId)
    const current = userData.brewing
    const finished = Array.isArray(userData.finished) ? userData.finished : []

    if (!current) {
      return {
        empty: true,
        current: null,
        summary: {
          totalStored: finished.length,
          readyCount: finished.length,
          brewingCount: 0,
          totalBrewed: userData.totalBrewed || 0,
          bestQuality: userData.bestQuality || '暂无',
        },
        recent: finished.slice(-3).reverse().map(item => ({
          name: item.recipe,
          quality: item.quality,
          reward: item.reward,
        })),
        suggestions: finished.length > 0 ? ['酒狐开瓶'] : ['酒狐酿酒 <配方名>'],
      }
    }

    const remainingMinutes = this._getRemainingMinutes(current.finishTime)
    const ready = remainingMinutes <= 0
    const recipe = RECIPES.find(r => r.name === current.recipe) || {}

    return {
      empty: false,
      current: {
        name: current.recipe,
        materials: recipe.materials || '神秘配方',
        progress: ready ? 100 : this._getProgress(current.startTime, current.finishTime),
        remainingText: ready ? '现在就可以开瓶' : `${remainingMinutes} 分钟后可开瓶`,
        ready,
        expectedQuality: this._getQualityRangeLabel(current.qualityMin, current.qualityMax),
        expectedReward: QUALITIES[current.qualityMax || 0]?.reward || 0,
      },
      summary: {
        totalStored: finished.length,
        readyCount: finished.length + (ready ? 1 : 0),
        brewingCount: 1,
        totalBrewed: userData.totalBrewed || 0,
        bestQuality: userData.bestQuality || '暂无',
      },
      recent: finished.slice(-2).reverse().map(item => ({
        name: item.recipe,
        quality: item.quality,
        reward: item.reward,
      })),
      suggestions: ready ? ['酒狐开瓶'] : ['酒狐开瓶', '酒狐酿酒'],
    }
  }

  getBrewResultCardData(result) {
    const recipe = RECIPES.find(r => r.name === result?._recipeName) || {}
    return {
      brewName: result?._recipeName || '未知酒品',
      materials: recipe.materials || '神秘配方',
      cost: result?.cost || 0,
      qualityRange: recipe.qualityRange || this._getQualityRangeLabel(recipe.qualityMin, recipe.qualityMax),
      suggestion: '酒狐酒窖',
      foxLine: randomPick(BREW_RESULT_FOX_LINES),
    }
  }

  getOpenBottleResultCardData(result) {
    return {
      brewName: result?.brewName || '未知酒品',
      quality: result?.quality || '普通',
      reward: result?.reward || 0,
      effect: result?.effect || '',
      suggestion: '酒狐酿酒',
      foxLine: randomPick(OPEN_RESULT_FOX_LINES),
    }
  }

  /**
   * 查看配方列表
   * @returns {string}
   */
  getRecipeList() {
    const lines = [
      '== 酒狐酿酒坊 - 配方一览 ==',
      '',
    ]

    for (const recipe of RECIPES) {
      const hours = recipe.brewTimeMs / (60 * 60 * 1000)
      lines.push(`【${recipe.name}】`)
      lines.push(`  材料: ${recipe.materials}`)
      lines.push(`  酿造时间: ${hours}小时`)
      lines.push(`  消耗好感: ${recipe.cost}点`)
      lines.push(`  品质范围: ${recipe.qualityRange}`)
      lines.push('')
    }

    lines.push('使用「酒狐酿酒 <配方名>」开始酿酒')
    return lines.join('\n')
  }

  /**
   * 开始酿酒
   * @param {string} userId
   * @param {string} recipeName
   * @returns {Promise<{ success: boolean, message: string, cost: number }>}
   */
  async startBrewing(userId, recipeName) {
    const userData = this._getUserData(userId)

    if (userData.brewing) {
      const remaining = userData.brewing.finishTime - Date.now()
      if (remaining > 0) {
        const mins = Math.ceil(remaining / 60000)
        return {
          success: false,
          message: `酒狐悄悄话: 酒窖里已经有一瓶「${userData.brewing.recipe}」在酿了哦~还需要 ${mins} 分钟。`,
          cost: 0,
        }
      }
      // 已酿好但未开瓶，阻止覆盖
      return {
        success: false,
        message: `酒狐悄悄话: 「${userData.brewing.recipe}」已经酿好了！先用「酒狐开瓶」品尝吧~`,
        cost: 0,
      }
    }

    const recipe = RECIPES.find(r => r.name === recipeName.trim())
    if (!recipe) {
      return {
        success: false,
        message: `酒狐悄悄话: 没有叫「${recipeName}」的配方哦...用「酒狐酿酒」查看配方列表吧！`,
        cost: 0,
      }
    }

    // 返回配方信息，但不修改状态（由调用方在扣费成功后调用 confirmBrewing）
    return {
      success: true,
      message: `酒狐悄悄话: 开始酿造「${recipe.name}」了！\n材料: ${recipe.materials}\n酿造时间: ${recipe.brewTimeMs / 3600000}小时\n消耗好感: ${recipe.cost}点\n\n酿好了就用「酒狐开瓶」来品尝吧~`,
      cost: recipe.cost,
      _recipeName: recipe.name,
    }
  }

  /**
   * 确认开始酿酒（在扣费成功后调用）
   * @param {string} userId
   * @param {string} recipeName
   */
  async confirmBrewing(userId, recipeName) {
    const userData = this._getUserData(userId)
    const recipe = RECIPES.find(r => r.name === recipeName)
    if (!recipe) return

    const now = Date.now()
    userData.brewing = {
      recipe: recipe.name,
      startTime: now,
      finishTime: now + recipe.brewTimeMs,
      qualityMin: recipe.qualityMin,
      qualityMax: recipe.qualityMax,
    }
    await this._save()
  }

  /**
   * 查看酒窖
   * @param {string} userId
   * @returns {string}
   */
  getCellar(userId) {
    const userData = this._getUserData(userId)

    const lines = [
      '== 酒狐的酒窖 ==',
      '',
    ]

    if (userData.brewing) {
      const remaining = userData.brewing.finishTime - Date.now()
      if (remaining > 0) {
        const mins = Math.ceil(remaining / 60000)
        lines.push(`正在酿造: 「${userData.brewing.recipe}」`)
        lines.push(`剩余时间: ${mins} 分钟`)
      } else {
        lines.push(`「${userData.brewing.recipe}」已酿好！快用「酒狐开瓶」品尝吧！`)
      }
    } else {
      lines.push('酒窖里没有正在酿的酒。')
    }

    lines.push('')
    lines.push(`累计酿酒: ${userData.totalBrewed} 次`)
    if (userData.bestQuality) {
      lines.push(`最佳品质: ${userData.bestQuality}`)
    }

    return lines.join('\n')
  }

  /**
   * 开瓶品尝
   * @param {string} userId
   * @returns {Promise<{ success: boolean, message: string, reward: number, quality: string }>}
   */
  async openBottle(userId) {
    const userData = this._getUserData(userId)

    if (!userData.brewing) {
      return {
        success: false,
        message: '酒狐悄悄话: 酒窖里没有酿好的酒呢...先用「酒狐酿酒 <配方名>」开始酿酒吧！',
        reward: 0,
        quality: '',
      }
    }

    const remaining = userData.brewing.finishTime - Date.now()
    if (remaining > 0) {
      const mins = Math.ceil(remaining / 60000)
      return {
        success: false,
        message: `酒狐悄悄话: 「${userData.brewing.recipe}」还没酿好呢~还要等 ${mins} 分钟。`,
        reward: 0,
        quality: '',
      }
    }

    // 决定品质
    const minIdx = userData.brewing.qualityMin || 0
    const maxIdx = userData.brewing.qualityMax || QUALITIES.length - 1
    const availableQualities = QUALITIES.slice(minIdx, maxIdx + 1)

    const pool = []
    for (const q of availableQualities) {
      for (let i = 0; i < q.weight; i++) {
        pool.push(q)
      }
    }

    const quality = randomPick(pool) || availableQualities[0]
    const recipeName = userData.brewing.recipe

    userData.brewing = null
    userData.totalBrewed += 1

    // 更新最佳品质
    const qualityOrder = QUALITIES.map(q => q.name)
    const currentBestIdx = qualityOrder.indexOf(userData.bestQuality)
    const newIdx = qualityOrder.indexOf(quality.name)
    if (newIdx > currentBestIdx) {
      userData.bestQuality = quality.name
    }

    await this._save()

    if (!Array.isArray(userData.finished)) userData.finished = []
    userData.finished.push({
      recipe: recipeName,
      quality: quality.name,
      reward: quality.reward,
      openedAt: Date.now(),
    })

    const recipe = RECIPES.find(r => r.name === recipeName) || {}
    const openLine = recipe.openLines
      ? randomPick(recipe.openLines)
      : '酒狐悄悄话: 打开瓶塞...一股醇香扑面而来！'

    const lines = [
      '== 酒狐开瓶 ==',
      '',
      openLine,
      '',
      `酒名: 「${recipeName}」`,
      `品质: ★${quality.name}★`,
      `好感奖励: +${quality.reward}`,
    ]

    if (quality.name === '传说') {
      lines.push('')
      lines.push('酒狐悄悄话: 这...这是传说品质！！酒狐也是第一次喝到这么好的酒！（眼睛都亮了）')
    }

    return {
      success: true,
      message: lines.join('\n'),
      reward: quality.reward,
      quality: quality.name,
      brewName: recipeName,
      effect: recipe.effect || '',
    }
  }
}

module.exports = BrewingSystem
