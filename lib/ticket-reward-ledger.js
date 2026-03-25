/**
 * WineFox-Daily - 狐狐券日奖励记录
 * 用于限制可高频重复触发的玩法在每日内的狐狐券领取次数
 */

const fs = require('fs')
const path = require('path')
const { withLock } = require('./io-lock')
const { readJsonSafe, writeJsonAtomic } = require('./safe-json')

class TicketRewardLedger {
  constructor(memoryDir, logger) {
    this.savePath = path.join(memoryDir, 'ticket-reward-ledger.json')
    this.logger = logger || console
    this.data = {}
    this._load()
  }

  _load() {
    const result = readJsonSafe(this.savePath, {}, {
      logger: this.logger,
      label: '狐狐券奖励记录',
    })
    this.data = result.data || {}
  }

  async _save() {
    try {
      await withLock(this.savePath, async () => {
        await writeJsonAtomic(this.savePath, this.data, { pretty: 2 })
      })
    } catch (err) {
      this.logger.error(`[fox] 狐狐券奖励记录保存失败: ${err.message}`)
    }
  }

  _getUserData(userId) {
    if (!this.data[userId]) {
      this.data[userId] = { date: '', claims: {} }
    }
    return this.data[userId]
  }

  _resetIfNeeded(userData, dateKey) {
    if (userData.date !== dateKey) {
      userData.date = dateKey
      userData.claims = {}
    }
  }

  async claim(userId, dateKey, rewardKey, amount, dailyLimit) {
    const userData = this._getUserData(userId)
    this._resetIfNeeded(userData, dateKey)

    const used = userData.claims[rewardKey] || 0
    if (used >= dailyLimit) {
      return {
        granted: 0,
        used,
        limit: dailyLimit,
        exhausted: true,
      }
    }

    userData.claims[rewardKey] = used + 1
    await this._save()

    return {
      granted: amount,
      used: userData.claims[rewardKey],
      limit: dailyLimit,
      exhausted: false,
    }
  }

  /**
   * 获取某用户在某日的领取快照（只读，不会重置数据）
   * @param {string} userId
   * @param {string} dateKey YYYY-MM-DD
   * @returns {{ date: string, claims: Record<string, number> }}
   */
  getSnapshot(userId, dateKey) {
    const id = String(userId || '')
    const key = String(dateKey || '')
    const raw = this.data[id]
    if (!raw || raw.date !== key) {
      return { date: key, claims: {} }
    }

    const claims = raw.claims && typeof raw.claims === 'object' ? raw.claims : {}
    return {
      date: raw.date,
      claims: { ...claims },
    }
  }
}

module.exports = TicketRewardLedger
