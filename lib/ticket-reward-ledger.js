/**
 * WineFox-Daily - 狐狐券日奖励记录
 * 用于限制可高频重复触发的玩法在每日内的狐狐券领取次数
 */

const fs = require('fs')
const path = require('path')
const { withLock } = require('./io-lock')

class TicketRewardLedger {
  constructor(memoryDir, logger) {
    this.savePath = path.join(memoryDir, 'ticket-reward-ledger.json')
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
      this.logger.warn(`[fox] 狐狐券奖励记录加载失败: ${err.message}`)
      this.data = {}
    }
  }

  async _save() {
    try {
      await withLock(this.savePath, async () => {
        await fs.promises.writeFile(this.savePath, JSON.stringify(this.data, null, 2), 'utf-8')
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
}

module.exports = TicketRewardLedger
