/**
 * WineFox-Daily - 用户投稿模块
 * 允许用户提交新语录，管理员审核后追加到语录文件
 */

const fs = require('fs')
const path = require('path')
const { withLock } = require('./io-lock')
const { readJsonSafe, writeJsonAtomic } = require('./safe-json')

class SubmissionSystem {
  /**
   * @param {string} memoryDir - memory 目录路径
   * @param {object} [logger]
   */
  constructor(memoryDir, logger) {
    this.pendingPath = path.join(memoryDir, 'pending_submissions.json')
    this.logger = logger || console
    /** @type {Array<{ id: number, userId: string, text: string, timestamp: string }>} */
    this.pending = []
    this._nextId = 1
    // 异步加载
    this._load()
  }

// 移除 async 和 withLock，改为同步读取
  _load() {
    const result = readJsonSafe(this.pendingPath, { pending: [], nextId: 1 }, {
      logger: this.logger,
      label: '投稿数据',
    })
    const parsed = result.data && typeof result.data === 'object' ? result.data : {}
    this.pending = Array.isArray(parsed.pending) ? parsed.pending : []
    this._nextId = Number.isInteger(parsed.nextId) && parsed.nextId >= 1 ? parsed.nextId : 1
  }

  async _save() {
    return await withLock(this.pendingPath, async () => {
      try {
        await writeJsonAtomic(this.pendingPath, {
          pending: this.pending,
          nextId: this._nextId,
        }, { pretty: 2 })
      } catch (err) {
        this.logger.error(`[fox] 投稿数据保存失败: ${err.message}`)
      }
    })
  }

  /**
   * 提交一条语录
   * @param {string} userId - 提交者 ID
   * @param {string} text - 语录内容
   * @returns {Promise<{ success: boolean, id: number, message: string }>}
   */
  async submit(userId, text) {
    const trimmed = text.trim()
    if (!trimmed) {
      return { success: false, id: 0, message: '投稿内容不能为空哦！' }
    }
    if (trimmed.length < 4) {
      return { success: false, id: 0, message: '内容太短了，至少写4个字吧～' }
    }
    if (trimmed.length > 200) {
      return { success: false, id: 0, message: '内容太长了，请控制在200字以内～' }
    }

    // 检查是否有重复的待审核投稿
    if (this.pending.some(p => p.text === trimmed)) {
      return { success: false, id: 0, message: '这条内容已经在审核队列中了哦～' }
    }

    const id = this._nextId++
    this.pending.push({
      id,
      userId,
      text: `酒狐悄悄话: ${trimmed}`,
      timestamp: new Date().toISOString(),
    })
    await this._save()

    return {
      success: true,
      id,
      message: `投稿成功！编号 #${id}，等待管理员审核～`,
    }
  }

  /**
   * 查看待审核列表
   * @returns {Array}
   */
  listPending() {
    return this.pending
  }

  /**
   * 审核通过一条投稿
   * @param {number} id - 投稿编号
   * @param {import('./quotes-loader')} quotesLoader - 用于追加到文件
   * @returns {Promise<{ success: boolean, message: string, text?: string }>}
   */
  async approve(id, quotesLoader) {
    const idx = this.pending.findIndex(p => p.id === id)
    if (idx === -1) {
      return { success: false, message: `未找到编号 #${id} 的投稿。` }
    }

    const item = this.pending[idx]
    const appended = await quotesLoader.append(item.text)
    if (!appended) {
      return { success: false, message: '写入语录文件失败了...' }
    }

    this.pending.splice(idx, 1)
    await this._save()

    return {
      success: true,
      message: `投稿 #${id} 已通过审核并添加到语录库！`,
      text: item.text,
    }
  }

  /**
   * 拒绝一条投稿
   * @param {number} id
   * @returns {Promise<{ success: boolean, message: string }>}
   */
  async reject(id) {
    const idx = this.pending.findIndex(p => p.id === id)
    if (idx === -1) {
      return { success: false, message: `未找到编号 #${id} 的投稿。` }
    }

    this.pending.splice(idx, 1)
    await this._save()

    return { success: true, message: `投稿 #${id} 已被拒绝。` }
  }

  /**
   * 待审核数量
   */
  get pendingCount() {
    return this.pending.length
  }
}

module.exports = SubmissionSystem
