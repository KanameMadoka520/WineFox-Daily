/**
 * WineFox-Daily - 酒狐商店 & 背包系统 v2.3
 * 使用狐狐券兑换虚拟物品，装备提供机制效果与文案效果
 */

const fs = require('fs')
const path = require('path')
const { withLock } = require('./io-lock')
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
        items: [],
        equipped: null,
      }
    }
    return this.data[userId]
  }

  /**
   * 获取商店结构化数据
   * @param {number} [userLevel=0]
   * @returns {{ equips: Array, consumables: Array }}
   */
  getShopData(userLevel = 0) {
    const items = SHOP_ITEMS.map(item => ({
      id: item.id,
      name: item.name,
      type: item.type,
      price: item.price,
      description: item.description,
      levelRequired: item.levelRequired || 0,
      locked: userLevel < (item.levelRequired || 0),
    }))

    return {
      equips: items.filter(item => item.type === 'equip'),
      consumables: items.filter(item => item.type === 'consumable'),
    }
  }

  /**
   * 查看商店
   * @param {number} [userLevel=0]
   * @returns {string}
   */
  getShopList(userLevel = 0) {
    const lines = ['== 酒狐商店 ==', '', '货币：狐狐券', '']

    const groups = [
      { title: '【入门】', min: 2, max: 3 },
      { title: '【进阶】', min: 4, max: 5 },
      { title: '【高级】', min: 6, max: 7 },
      { title: '【传说】', min: 8, max: 9 },
    ]

    for (const group of groups) {
      const items = SHOP_ITEMS.filter(item => item.levelRequired >= group.min && item.levelRequired <= group.max)
      if (items.length === 0) continue
      lines.push(group.title)
      for (const item of items) {
        const typeTag = item.type === 'equip' ? '[装备]' : '[消耗]'
        const gateTag = userLevel >= item.levelRequired ? '' : ` [需Lv${item.levelRequired}]`
        lines.push(`${typeTag} ${item.name} - ${item.price}券${gateTag}`)
        lines.push(`  ${item.description}`)
        lines.push('')
      }
    }

    lines.push('使用「酒狐购买 <物品名>」购买')
    return lines.join('\n')
  }

  /**
   * 购买物品（验证阶段，不修改状态）
   * @param {string} userId
   * @param {string} itemName
   * @param {number} [userLevel=0]
   */
  buyItem(userId, itemName, userLevel = 0) {
    const item = SHOP_ITEMS.find(i => i.name === itemName.trim())
    if (!item) {
      return {
        success: false,
        message: `酒狐悄悄话: 商店里没有「${itemName}」哦...用「酒狐商店」看看有什么吧！`,
        cost: 0,
      }
    }

    if (userLevel < item.levelRequired) {
      return {
        success: false,
        message: `酒狐悄悄话: 想购买「${item.name}」的话，至少要达到 Lv${item.levelRequired} 哦...再多陪陪酒狐吧。`,
        cost: 0,
      }
    }

    const userData = this._getUserData(userId)

    if (item.type === 'equip' && userData.items.some(i => i.id === item.id)) {
      return {
        success: false,
        message: `酒狐悄悄话: 你已经拥有「${item.name}」了哦~`,
        cost: 0,
      }
    }

    return {
      success: true,
      message: `酒狐悄悄话: 成功购买了「${item.name}」！\n${item.buyLine || ''}`,
      cost: item.price,
      _itemId: item.id,
      _itemName: item.name,
      _itemType: item.type,
    }
  }

  async confirmBuy(userId, purchaseInfo) {
    const userData = this._getUserData(userId)
    userData.items.push({ id: purchaseInfo._itemId, name: purchaseInfo._itemName, type: purchaseInfo._itemType })
    await this._save()
  }

  /**
   * 获取背包结构化数据
   * @param {string} userId
   * @returns {{ items: Array<{ id: string, name: string, type: string, count: number, equipped: boolean }>, equipped: string|null }}
   */
  getInventoryData(userId) {
    const userData = this._getUserData(userId)
    const countMap = new Map()

    for (const item of userData.items) {
      if (!countMap.has(item.id)) {
        countMap.set(item.id, {
          id: item.id,
          name: item.name,
          type: item.type,
          count: 0,
          equipped: userData.equipped === item.id,
        })
      }
      countMap.get(item.id).count++
    }

    return {
      items: [...countMap.values()],
      equipped: userData.equipped,
    }
  }

  /**
   * 查看背包
   * @param {string} userId
   * @returns {string}
   */
  getInventory(userId) {
    const inventoryData = this.getInventoryData(userId)
    if (inventoryData.items.length === 0) {
      return '酒狐悄悄话: 背包是空的~去「酒狐商店」看看有什么好东西吧！'
    }

    const lines = ['== 酒狐背包 ==', '']
    for (const item of inventoryData.items) {
      const typeTag = item.type === 'equip' ? '[装备]' : '[消耗]'
      const equippedTag = item.equipped ? ' (已装备)' : ''
      const countTag = item.count > 1 ? ` x${item.count}` : ''
      lines.push(`${typeTag} ${item.name}${countTag}${equippedTag}`)
    }

    lines.push('')
    lines.push('装备类: 「酒狐装备 <物品名>」')
    lines.push('消耗类: 「酒狐使用 <物品名>」')
    return lines.join('\n')
  }

  async equip(userId, itemName) {
    const userData = this._getUserData(userId)
    const item = userData.items.find(i => i.name === itemName.trim() && i.type === 'equip')
    if (!item) {
      return { success: false, message: `酒狐悄悄话: 背包里没有可装备的「${itemName}」哦...` }
    }

    userData.equipped = item.id
    await this._save()

    const shopItem = SHOP_ITEMS.find(i => i.id === item.id)
    return { success: true, message: shopItem?.equipLine || '酒狐悄悄话: 装备好了！' }
  }

  async useItem(userId, itemName) {
    const userData = this._getUserData(userId)
    const itemIndex = userData.items.findIndex(i => i.name === itemName.trim() && i.type === 'consumable')
    if (itemIndex === -1) {
      return { success: false, message: `酒狐悄悄话: 背包里没有可使用的「${itemName}」哦...`, effect: null }
    }

    const item = userData.items[itemIndex]
    userData.items.splice(itemIndex, 1)
    await this._save()

    const shopItem = SHOP_ITEMS.find(i => i.id === item.id)
    return {
      success: true,
      message: shopItem?.useLine || '酒狐悄悄话: 已使用！',
      effect: shopItem?.effect || null,
    }
  }

  getEquippedEffect(userId) {
    const userData = this._getUserData(userId)
    if (!userData.equipped) return null
    const shopItem = SHOP_ITEMS.find(i => i.id === userData.equipped)
    return shopItem?.effectText || null
  }

  /**
   * 获取当前装备的机制加成
   * @param {string} userId
   * @param {string} bonusType
   * @returns {number}
   */
  getEquippedBonus(userId, bonusType) {
    const userData = this._getUserData(userId)
    if (!userData.equipped) return 0
    const shopItem = SHOP_ITEMS.find(i => i.id === userData.equipped)
    if (!shopItem?.bonus) return 0
    return shopItem.bonus.type === bonusType ? shopItem.bonus.value : 0
  }
}

module.exports = ShopSystem
