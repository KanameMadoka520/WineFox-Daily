class RenderCache {
  constructor(options = {}) {
    this.enabled = options.enabled === true
    this.maxEntries = Number.isFinite(options.maxEntries) ? Math.max(10, Math.floor(options.maxEntries)) : 120
    this.defaultTtlMs = Number.isFinite(options.defaultTtlMs) ? Math.max(1000, Math.floor(options.defaultTtlMs)) : 60000
    /** @type {Map<string, { value: string, expiresAt: number, createdAt: number }>} */
    this.store = new Map()
    this.hits = 0
    this.misses = 0
    this.sets = 0
    this.evictions = 0
    this.expired = 0
  }

  _now() { return Date.now() }

  _evictIfNeeded() {
    while (this.store.size > this.maxEntries) {
      const firstKey = this.store.keys().next().value
      if (!firstKey) break
      this.store.delete(firstKey)
      this.evictions++
    }
  }

  get(key) {
    if (!this.enabled) return { hit: false, value: null }
    if (!key) return { hit: false, value: null }

    const item = this.store.get(key)
    if (!item) {
      this.misses++
      return { hit: false, value: null }
    }

    if (item.expiresAt && item.expiresAt <= this._now()) {
      this.store.delete(key)
      this.expired++
      this.misses++
      return { hit: false, value: null }
    }

    // LRU: refresh insertion order
    this.store.delete(key)
    this.store.set(key, item)
    this.hits++
    return { hit: true, value: item.value }
  }

  set(key, value, ttlMs) {
    if (!this.enabled) return false
    if (!key) return false
    if (typeof value !== 'string' || !value) return false

    const ttl = Number.isFinite(ttlMs) ? Math.max(1000, Math.floor(ttlMs)) : this.defaultTtlMs
    const now = this._now()
    const expiresAt = now + ttl

    if (this.store.has(key)) this.store.delete(key)
    this.store.set(key, { value, expiresAt, createdAt: now })
    this.sets++

    this._evictIfNeeded()
    return true
  }

  clear() {
    const count = this.store.size
    this.store.clear()
    return count
  }

  getStatus() {
    return {
      enabled: this.enabled,
      size: this.store.size,
      maxEntries: this.maxEntries,
      defaultTtlMs: this.defaultTtlMs,
      hits: this.hits,
      misses: this.misses,
      sets: this.sets,
      evictions: this.evictions,
      expired: this.expired,
    }
  }
}

module.exports = RenderCache

