function mean(values) {
  const arr = Array.isArray(values) ? values.filter((n) => Number.isFinite(n)) : []
  if (arr.length === 0) return 0
  const sum = arr.reduce((a, b) => a + b, 0)
  return sum / arr.length
}

function pct(part, total) {
  if (!Number.isFinite(part) || !Number.isFinite(total) || total <= 0) return 0
  return (part / total) * 100
}

class RenderMetricsBuffer {
  constructor(options = {}) {
    this.maxEntries = Number.isFinite(options.maxEntries) ? Math.max(50, Math.floor(options.maxEntries)) : 200
    /** @type {Array<any>} */
    this.events = []
  }

  push(event) {
    if (!event || typeof event !== 'object') return false
    const normalized = {
      ts: Number.isFinite(event.ts) ? event.ts : Date.now(),
      feature: String(event.feature || ''),
      imageKey: String(event.imageKey || ''),
      themeId: String(event.themeId || ''),
      ok: event.ok === true,
      reason: String(event.reason || ''),
      cacheHit: event.cacheHit === true,
      queueEnabled: event.queueEnabled === true,
      waitMs: Number.isFinite(event.waitMs) ? event.waitMs : 0,
      renderMs: Number.isFinite(event.renderMs) ? event.renderMs : 0,
      totalMs: Number.isFinite(event.totalMs) ? event.totalMs : 0,
      detail: event.detail ? String(event.detail) : '',
    }

    this.events.push(normalized)
    if (this.events.length > this.maxEntries) {
      this.events.splice(0, this.events.length - this.maxEntries)
    }
    return true
  }

  clear() {
    const before = this.events.length
    this.events = []
    return before
  }

  getRecent(count = 20) {
    const n = Number.isFinite(count) ? Math.max(1, Math.floor(count)) : 20
    return this.events.slice(-n).reverse()
  }

  getSummary(count = 50) {
    const slice = this.getRecent(count).slice().reverse() // chronological for nicer aggregation
    const total = slice.length
    const okCount = slice.filter(e => e.ok).length
    const failCount = slice.filter(e => !e.ok).length
    const cacheHits = slice.filter(e => e.cacheHit).length

    const attempts = slice.filter(e => !e.cacheHit && (e.reason === 'rendered' || e.reason === 'render_failed' || e.reason === 'queue_timeout'))
    const attemptOkCount = attempts.filter(e => e.ok && e.reason === 'rendered').length
    const attemptFailCount = attempts.filter(e => !e.ok).length
    const skipCount = Math.max(0, total - cacheHits - attempts.length)
    const waits = attempts.map(e => e.waitMs)
    const renders = attempts.map(e => e.renderMs)
    const totals = slice.map(e => e.totalMs)

    const failuresByReason = {}
    for (const e of slice) {
      if (e.ok) continue
      const key = e.reason || 'unknown'
      failuresByReason[key] = (failuresByReason[key] || 0) + 1
    }

    return {
      windowCount: total,
      okCount,
      failCount,
      okRate: pct(okCount, total),
      cacheHits,
      cacheHitRate: pct(cacheHits, total),
      attemptCount: attempts.length,
      attemptOkCount,
      attemptFailCount,
      attemptOkRate: pct(attemptOkCount, attempts.length),
      skipCount,
      avgWaitMs: Math.round(mean(waits)),
      avgRenderMs: Math.round(mean(renders)),
      avgTotalMs: Math.round(mean(totals)),
      failuresByReason,
    }
  }
}

module.exports = RenderMetricsBuffer
