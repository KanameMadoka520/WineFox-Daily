class QueueTimeoutError extends Error {
  constructor(message) {
    super(message)
    this.name = 'QueueTimeoutError'
    this.code = 'QUEUE_TIMEOUT'
  }
}

function createAsyncLimiter(maxConcurrency, options = {}) {
  const limit = Number.isFinite(maxConcurrency) ? Math.max(0, Math.floor(maxConcurrency)) : 0
  const defaultTimeoutMs = Number.isFinite(options.timeoutMs) ? Math.max(0, Math.floor(options.timeoutMs)) : 10000

  let active = 0
  /** @type {Array<{ resolve: Function, reject: Function, timer?: NodeJS.Timeout }>} */
  const waiters = []

  function releaseOne() {
    active = Math.max(0, active - 1)
    if (waiters.length === 0) return

    const waiter = waiters.shift()
    if (waiter.timer) clearTimeout(waiter.timer)
    active += 1
    waiter.resolve()
  }

  function acquire(timeoutMs = defaultTimeoutMs) {
    if (limit <= 0) {
      active += 1
      return Promise.resolve()
    }

    if (active < limit) {
      active += 1
      return Promise.resolve()
    }

    return new Promise((resolve, reject) => {
      const waiter = { resolve, reject, timer: null }

      const ms = Number.isFinite(timeoutMs) ? Math.max(0, Math.floor(timeoutMs)) : defaultTimeoutMs
      if (ms > 0) {
        waiter.timer = setTimeout(() => {
          const index = waiters.indexOf(waiter)
          if (index >= 0) waiters.splice(index, 1)
          reject(new QueueTimeoutError(`[fox] render queue timeout after ${ms}ms`))
        }, ms)
      }

      waiters.push(waiter)
    })
  }

  async function run(fn, timeoutMs = defaultTimeoutMs) {
    await acquire(timeoutMs)
    let released = false

    const safeRelease = () => {
      if (released) return
      released = true
      releaseOne()
    }

    try {
      return await fn()
    } finally {
      safeRelease()
    }
  }

  function getStatus() {
    return {
      enabled: limit > 0,
      maxConcurrency: limit,
      active,
      queued: waiters.length,
      defaultTimeoutMs,
    }
  }

  return {
    run,
    getStatus,
  }
}

module.exports = {
  QueueTimeoutError,
  createAsyncLimiter,
}

