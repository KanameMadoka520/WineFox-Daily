/**
 * WineFox-Daily - 酒狐商店 & 背包系统
 * 用好感度兑换虚拟物品，装备物品改变互动文案
 */

const fs = require('fs')
const path = require('path')
const { withLock } = require('./io-lock')
const { randomPick } = require('./utils')
const SHOP_ITEMS = require('../data/shop_items')

class ShopSystem {
  /**
   * @param {string} memoryDir
   * @param {object} [logger]
   */
  constructor(memoryDir, logger) {
    this.savePath = path.join(memoryDir, 'inventory.json')
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
      this.logger.warn(`[fox] 背包数据加载失败: ${err.message}`)
      this.data = {}
    }
  }

  async _save() {
    try {
      await withLock(this.savePath, async () => {
        await fs.promises.writeFile(this.savePath, JSON.stringify(this.data, null, 2), 'utf-8')
      })
    } catch (err) {
      this.logger.error(`[fox] 背包数据保存失败: ${err.message}`)
    }
  }

  _getUserData(userId) {
    if (!this.data[userId]) {
      this.data[userId] = {
        items: [],        // [{ id, name, type }]
        equipped: null,   // 装备中的物品id
      }
    }
    return this.data[userId]
  }

  /**
   * 查看商店
   * @returns {string}
   */
  getShopList() {
    const lines = [
      '== 酒狐商店 ==',
      '',
    ]

    for (const item of SHOP_ITEMS) {
      const typeTag = item.type === 'equip' ? '[装备]' : '[消耗]'
      lines.push(`${typeTag} ${item.name} - ${item.price}好感`)
      lines.push(`  ${item.description}`)
      lines.push('')
    }

    lines.push('使用「酒狐购买 <物品名>」购买')
    return lines.join('\n')
  }

  /**
   * 购买物品（验证 + 添加 + 保存，原子操作）
   * @param {string} userId
   * @param {string} itemName
   * @returns {{ success: boolean, message: string, cost: number }}
   */
  buyItem(userId, itemName) {
    const item = SHOP_ITEMS.find(i => i.name === itemName.trim())
    if (!item) {
      return {
        success: false,
        message: `酒狐悄悄话: 商店里没有「${itemName}」哦...用「酒狐商店」看看有什么吧！`,
        cost: 0,
      }
    }

    const userData = this._getUserData(userId)

    // 装备类：检查是否已拥有
    if (item.type === 'equip') {
      if (userData.items.some(i => i.id === item.id)) {
        return {
          success: false,
          message: `酒狐悄悄话: 你已经拥有「${item.name}」了哦~`,
          cost: 0,
        }
      }
    }

    // 只返回验证结果和价格，不修改状态
    return {
      success: true,
      message: `酒狐悄悄话: 成功购买了「${item.name}」！\n${item.buyLine || ''}`,
      cost: item.price,
      _itemId: item.id,
      _itemName: item.name,
      _itemType: item.type,
    }
  }

  /**
   * 确认购买（在扣费成功后调用）
   * @param {string} userId
   * @param {{ _itemId: string, _itemName: string, _itemType: string }} purchaseInfo
   */
  async confirmBuy(userId, purchaseInfo) {
    const userData = this._getUserData(userId)
    userData.items.push({ id: purchaseInfo._itemId, name: purchaseInfo._itemName, type: purchaseInfo._itemType })
    await this._save()
  }

  /**
   * 查看背包
   * @param {string} userId
   * @returns {string}
   */
  getInventory(userId) {
    const userData = this._getUserData(userId)

    if (userData.items.length === 0) {
      return '酒狐悄悄话: 背包是空的~去「酒狐商店」看看有什么好东西吧！'
    }

    const lines = [
      '== 酒狐背包 ==',
      '',
    ]

    // 统计物品数量
    const countMap = new Map()
    for (const item of userData.items) {
      const key = item.id
      if (!countMap.has(key)) {
        countMap.set(key, { ...item, count: 0 })
      }
      countMap.get(key).count++
    }

    for (const item of countMap.values()) {
      const typeTag = item.type === 'equip' ? '[装备]' : '[消耗]'
      const equippedTag = userData.equipped === item.id ? ' (已装备)' : ''
      const countTag = item.count > 1 ? ` x${item.count}` : ''
      lines.push(`${typeTag} ${item.name}${countTag}${equippedTag}`)
    }

    lines.push('')
    if (countMap.size > 0) {
      lines.push('装备类: 「酒狐装备 <物品名>」')
      lines.push('消耗类: 「酒狐使用 <物品名>」')
    }

    return lines.join('\n')
  }

  /**
   * 装备物品
   * @param {string} userId
   * @param {string} itemName
   * @returns {Promise<{ success: boolean, message: string }>}
   */
  async equip(userId, itemName) {
    const userData = this._getUserData(userId)
    const item = userData.items.find(i => i.name === itemName.trim() && i.type === 'equip')

    if (!item) {
      return { success: false, message: `酒狐悄悄话: 背包里没有可装备的「${itemName}」哦...` }
    }

    userData.equipped = item.id
    await this._save()

    const shopItem = SHOP_ITEMS.find(i => i.id === item.id)
    const equipLine = shopItem?.equipLine || '酒狐悄悄话: 装备好了！'

    return { success: true, message: equipLine }
  }

  /**
   * 使用消耗品
   * @param {string} userId
   * @param {string} itemName
   * @returns {Promise<{ success: boolean, message: string, effect: string|null }>}
   */
  async useItem(userId, itemName) {
    const userData = this._getUserData(userId)
    const itemIndex = userData.items.findIndex(
      i => i.name === itemName.trim() && i.type === 'consumable'
    )

    if (itemIndex === -1) {
      return { success: false, message: `酒狐悄悄话: 背包里没有可使用的「${itemName}」哦...`, effect: null }
    }

    const item = userData.items[itemIndex]
    userData.items.splice(itemIndex, 1)
    await this._save()

    const shopItem = SHOP_ITEMS.find(i => i.id === item.id)
    const useLine = shopItem?.useLine || '酒狐悄悄话: 已使用！'

    return {
      success: true,
      message: useLine,
      effect: shopItem?.effect || null,
    }
  }

  /**
   * 获取当前装备的物品效果文本
   * @param {string} userId
   * @returns {string|null}
   */
  getEquippedEffect(userId) {
    const userData = this._getUserData(userId)
    if (!userData.equipped) return null

    const shopItem = SHOP_ITEMS.find(i => i.id === userData.equipped)
    return shopItem?.effectText || null
  }
}

module.exports = ShopSystem
