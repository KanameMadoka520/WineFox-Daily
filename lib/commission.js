const fs = require('fs')
const path = require('path')
const { withLock } = require('./io-lock')
const TASK_POOL = require('../data/commission_data')

function createSeed(input) {
  let seed = 0
  for (const ch of input) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0
  return seed || 1
}

function createRng(seed) {
  let x = seed >>> 0
  return () => {
    x = (x * 1664525 + 1013904223) >>> 0
    return x / 0x100000000
  }
}

function pickTasks(userId, dateKey) {
  const pool = [...TASK_POOL]
  const rng = createRng(createSeed(`${dateKey}:${userId}`))
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return pool.slice(0, 3).map(task => ({ ...task, progress: 0, completed: false }))
}

class CommissionSystem {
  constructor(memoryDir, logger, affinity) {
    this.savePath = path.join(memoryDir, 'commission.json')
    this.logger = logger || console
    this.affinity = affinity
    this.data = {}
    this._load()
  }

  _load() {
    try {
      if (fs.existsSync(this.savePath)) {
        this.data = JSON.parse(fs.readFileSync(this.savePath, 'utf-8'))
      }
    } catch (err) {
      this.logger.warn(`[fox] 委托数据加载失败: ${err.message}`)
      this.data = {}
    }
  }

  async _save() {
    try {
      await withLock(this.savePath, async () => {
        await fs.promises.writeFile(this.savePath, JSON.stringify(this.data, null, 2), 'utf-8')
      })
    } catch (err) {
      this.logger.error(`[fox] 委托数据保存失败: ${err.message}`)
    }
  }

  _getUserData(userId) {
    if (!this.data[userId]) {
      this.data[userId] = { date: '', tasks: [] }
    }
    return this.data[userId]
  }

  async getDailyTasks(userId, dateKey) {
    const userData = this._getUserData(userId)
    if (userData.date !== dateKey || !Array.isArray(userData.tasks) || userData.tasks.length !== 3) {
      userData.date = dateKey
      userData.tasks = pickTasks(userId, dateKey)
      await this._save()
    }

    const lines = ['== 酒狐委托 ==', '']
    userData.tasks.forEach((task, idx) => {
      const mark = task.completed ? '[完成]' : '[进行中]'
      lines.push(`${idx + 1}. ${mark} ${task.desc}`)
      lines.push(`   进度: ${task.progress}/${task.target} | 奖励: ${task.reward}狐狐券`)
    })
    return lines.join('\n')
  }

  async recordProgress(userId, eventType, value = 1) {
    const userData = this._getUserData(userId)
    const completedTasks = []

    for (const task of userData.tasks || []) {
      if (task.completed) continue
      if (task.event !== eventType) continue
      task.progress = Math.min(task.target, (task.progress || 0) + value)
      if (task.progress >= task.target) {
        task.completed = true
        await this.affinity.addTickets(userId, task.reward)
        completedTasks.push(task)
      }
    }

    await this._save()
    return { completedTasks }
  }
}

module.exports = CommissionSystem
