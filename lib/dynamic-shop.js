const path = require('path')
const { withLock } = require('./io-lock')
const { readJsonSafe, writeJsonAtomic } = require('./safe-json')
const SHOP_ITEMS = require('../data/shop_items')

function fnv1aHash(input) {
  const text = String(input || '')
  let hash = 2166136261
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 16777619) >>> 0
  }
  return hash >>> 0
}

function createRng(seed) {
  let state = (Number.isFinite(seed) ? seed : 0) >>> 0
  if (state === 0) state = 0x9e3779b9

  return function next() {
    // xorshift32
    state ^= state << 13
    state >>>= 0
    state ^= state >>> 17
    state >>>= 0
    state ^= state << 5
    state >>>= 0
    return state / 0x100000000
  }
}

function pickUnique(items, count, rng) {
  const pool = Array.isArray(items) ? items.slice() : []
  const picked = []
  const n = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0
  while (pool.length > 0 && picked.length < n) {
    const index = Math.floor(rng() * pool.length)
    picked.push(pool.splice(index, 1)[0])
  }
  return picked
}

function clampInt(value, min, max, fallback) {
  const n = Number.isFinite(value) ? Math.floor(value) : fallback
  return Math.min(max, Math.max(min, n))
}

function computeDiscountPct(type, rng, options) {
  const equipMin = clampInt(options?.equipDiscountMinPct, 0, 95, 5)
  const equipMax = clampInt(options?.equipDiscountMaxPct, equipMin, 95, 20)
  const conMin = clampInt(options?.consumableDiscountMinPct, 0, 95, 10)
  const conMax = clampInt(options?.consumableDiscountMaxPct, conMin, 95, 30)

  const min = type === 'equip' ? equipMin : conMin
  const max = type === 'equip' ? equipMax : conMax

  const span = Math.max(0, max - min)
  return min + Math.floor(rng() * (span + 1))
}

function computeDealPrice(basePrice, discountPct) {
  const price = Number.isFinite(basePrice) ? Math.max(0, Math.floor(basePrice)) : 0
  const pct = Number.isFinite(discountPct) ? Math.min(95, Math.max(0, Math.floor(discountPct))) : 0
  const raw = price * (100 - pct) / 100
  return Math.max(1, Math.ceil(raw))
}

function buildDealsForDate(dateKey, options = {}) {
  const salt = options.seedSalt || 'winefox-dynamic-shop:v1'
  const seed = fnv1aHash(`${salt}:${dateKey}`)
  const rng = createRng(seed)

  const equipSlots = clampInt(options.equipSlots, 0, 20, 2)
  const consumableSlots = clampInt(options.consumableSlots, 0, 20, 2)

  const equips = SHOP_ITEMS.filter(item => item && item.type === 'equip')
  const consumables = SHOP_ITEMS.filter(item => item && item.type === 'consumable')

  const pickedEquips = pickUnique(equips, Math.min(equipSlots, equips.length), rng)
  const pickedConsumables = pickUnique(consumables, Math.min(consumableSlots, consumables.length), rng)

  const picked = [...pickedEquips, ...pickedConsumables]
  const deals = picked.map((item) => {
    const discountPct = computeDiscountPct(item.type, rng, options)
    const basePrice = Number(item.price || 0) || 0
    const dealPrice = computeDealPrice(basePrice, discountPct)
    return {
      dateKey,
      itemId: item.id,
      name: item.name,
      type: item.type,
      basePrice,
      dealPrice,
      discountPct,
      levelRequired: Number(item.levelRequired || 0) || 0,
      description: item.description || '',
    }
  })

  return deals
}

class DynamicShopSystem {
  constructor(memoryDir, logger, options = {}) {
    this.savePath = path.join(memoryDir, 'dynamic-shop.json')
    this.logger = logger || console
    this.options = options || {}
    this.data = {
      version: 1,
      users: {},
      updatedAt: '',
    }
    this._load()
  }

  _load() {
    const result = readJsonSafe(this.savePath, this.data, {
      logger: this.logger,
      label: '动态商店数据',
    })
    const parsed = result.data && typeof result.data === 'object' ? result.data : {}
    this.data = {
      version: Number.isInteger(parsed.version) ? parsed.version : 1,
      users: parsed.users && typeof parsed.users === 'object' ? parsed.users : {},
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : '',
    }
  }

  async _save() {
    this.data.updatedAt = new Date().toISOString()
    try {
      await withLock(this.savePath, async () => {
        await writeJsonAtomic(this.savePath, this.data, { pretty: 2 })
      })
    } catch (err) {
      this.logger?.error?.(`[fox] 动态商店数据保存失败: ${err?.message || err}`)
    }
  }

  _getUserData(userId) {
    const id = String(userId || '')
    if (!id) return null
    if (!this.data.users[id]) {
      this.data.users[id] = { date: '', purchased: {} }
    }
    const raw = this.data.users[id]
    if (!raw.purchased || typeof raw.purchased !== 'object') raw.purchased = {}
    if (typeof raw.date !== 'string') raw.date = ''
    return raw
  }

  _resetIfNeeded(userData, dateKey) {
    if (!userData) return
    if (userData.date !== dateKey) {
      userData.date = dateKey
      userData.purchased = {}
    }
  }

  getDeals(dateKey) {
    const key = String(dateKey || '').trim()
    if (!key) return []
    return buildDealsForDate(key, this.options)
  }

  getPurchasedSnapshot(userId, dateKey) {
    const id = String(userId || '')
    const key = String(dateKey || '').trim()
    const userData = this._getUserData(id)
    if (!userData || !key) return {}
    this._resetIfNeeded(userData, key)
    const purchased = userData.purchased && typeof userData.purchased === 'object' ? userData.purchased : {}
    return { ...purchased }
  }

  hasPurchased(userId, dateKey, itemId) {
    const id = String(userId || '')
    const key = String(dateKey || '').trim()
    const item = String(itemId || '').trim()
    const userData = this._getUserData(id)
    if (!userData || !key || !item) return false
    this._resetIfNeeded(userData, key)
    return Number(userData.purchased[item] || 0) > 0
  }

  async markPurchased(userId, dateKey, itemId) {
    const id = String(userId || '')
    const key = String(dateKey || '').trim()
    const item = String(itemId || '').trim()
    const userData = this._getUserData(id)
    if (!userData || !key || !item) return { success: false }
    this._resetIfNeeded(userData, key)

    userData.purchased[item] = (Number(userData.purchased[item]) || 0) + 1
    await this._save()
    return { success: true, purchased: { ...userData.purchased } }
  }
}

module.exports = DynamicShopSystem

