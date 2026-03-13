/**
 * WineFox-Daily - 酒狐小游戏
 * 猜拳、猜数字、抽签
 */

const { randomPick } = require('./utils')
const responseData = require('../data/responses')
const RPS_WIN_LINES = responseData.rpsWinLines
const RPS_LOSE_LINES = responseData.rpsLoseLines
const RPS_DRAW_LINES = responseData.rpsDrawLines
const OMIKUJI_RESULTS = responseData.omikujiResults

// 猜拳映射
const RPS_MAP = {
  '石头': 'rock', 'rock': 'rock',
  '剪刀': 'scissors', 'scissors': 'scissors',
  '布': 'paper', 'paper': 'paper',
}

const RPS_NAMES = { rock: '石头', scissors: '剪刀', paper: '布' }
const RPS_CHOICES = ['rock', 'scissors', 'paper']

// 猜数字游戏的会话存储（内存中）
const guessingSessions = new Map()
const SESSION_TIMEOUT = 30 * 60 * 1000 // 30分钟超时

class GamesSystem {
  /**
   * @param {object} [logger]
   * @param {object} [config]
   * @param {number} [config.rpsWinBonus] - 猜拳赢得的好感度
   * @param {number} [config.guessMaxAttempts] - 猜数字最大次数
   * @param {number} [config.guessRange] - 猜数字范围上限
   */
  constructor(logger, config = {}) {
    this.logger = logger || console
    this.config = {
      rpsWinBonus: config.rpsWinBonus ?? 2,
      guessMaxAttempts: config.guessMaxAttempts ?? 10,
      guessRange: config.guessRange ?? 100,
    }
  }

  /**
   * 猜拳游戏
   * @param {string} userChoice - 用户出的手势
   * @returns {{ result: 'win'|'lose'|'draw', message: string, affinityBonus: number }}
   */
  playRPS(userChoice) {
    const normalized = RPS_MAP[userChoice]
    if (!normalized) {
      return {
        result: 'invalid',
        message: '酒狐看不懂这个手势...请出「石头」「剪刀」或「布」哦！',
        affinityBonus: 0,
      }
    }

    const foxChoice = randomPick(RPS_CHOICES)
    const foxName = RPS_NAMES[foxChoice]
    const userName = RPS_NAMES[normalized]

    let result, line, bonus

    if (normalized === foxChoice) {
      result = 'draw'
      line = randomPick(RPS_DRAW_LINES)
      bonus = 1
    } else if (
      (normalized === 'rock' && foxChoice === 'scissors') ||
      (normalized === 'scissors' && foxChoice === 'paper') ||
      (normalized === 'paper' && foxChoice === 'rock')
    ) {
      result = 'win'
      line = randomPick(RPS_WIN_LINES)
      bonus = this.config.rpsWinBonus
    } else {
      result = 'lose'
      line = randomPick(RPS_LOSE_LINES)
      bonus = 1
    }

    const header = `主人出了「${userName}」，酒狐出了「${foxName}」！`

    return {
      result,
      message: `${header}\n\n${line}`,
      affinityBonus: bonus,
    }
  }

  /**
   * 开始或继续猜数字游戏
   * @param {string} sessionKey - 通常是 `${guildId}:${userId}`
   * @param {number|null} guess - 用户的猜测，null 表示开始新游戏
   * @returns {{ message: string, finished: boolean, affinityBonus: number }}
   */
  playGuessNumber(sessionKey, guess) {
    // 清理过期会话
    const now = Date.now()
    for (const [key, sess] of guessingSessions) {
      if (now - sess.createdAt > SESSION_TIMEOUT) {
        guessingSessions.delete(key)
      }
    }

    // 开始新游戏
    if (guess === null || guess === undefined) {
      const range = this.config.guessRange
      const maxAttempts = this.config.guessMaxAttempts
      const answer = Math.floor(Math.random() * range) + 1
      guessingSessions.set(sessionKey, { answer, attempts: 0, maxAttempts, range, createdAt: now })
      return {
        message: `酒狐在心里想了一个 1-${range} 的数字！你有${maxAttempts}次机会来猜，开始吧！\n(直接发数字就行)`,
        finished: false,
        affinityBonus: 0,
      }
    }

    const session = guessingSessions.get(sessionKey)
    if (!session) {
      return {
        message: '还没开始游戏呢！先发「酒狐猜数」开始吧~',
        finished: true,
        affinityBonus: 0,
      }
    }

    const num = parseInt(guess, 10)
    if (isNaN(num) || num < 1 || num > session.range) {
      return {
        message: `请猜 1-${session.range} 之间的整数哦！`,
        finished: false,
        affinityBonus: 0,
      }
    }

    session.attempts++

    if (num === session.answer) {
      guessingSessions.delete(sessionKey)
      const bonus = session.attempts <= 3 ? 5 : session.attempts <= 6 ? 3 : 2
      return {
        message: `恭喜主人！答对了！答案就是 ${session.answer}！\n你用了 ${session.attempts} 次就猜到了，好厉害！(好感度+${bonus})`,
        finished: true,
        affinityBonus: bonus,
      }
    }

    if (session.attempts >= session.maxAttempts) {
      const answer = session.answer
      guessingSessions.delete(sessionKey)
      return {
        message: `${session.maxAttempts}次机会用完了...答案是 ${answer} 哦。\n没关系，下次一定能猜到的！酒狐相信你！`,
        finished: true,
        affinityBonus: 1,
      }
    }

    const remaining = session.maxAttempts - session.attempts
    const hint = num > session.answer ? '大了！' : '小了！'

    return {
      message: `${hint} 还剩 ${remaining} 次机会~`,
      finished: false,
      affinityBonus: 0,
    }
  }

  /**
   * 检查用户是否在猜数字游戏中
   * @param {string} sessionKey
   * @returns {boolean}
   */
  isInGuessing(sessionKey) {
    return guessingSessions.has(sessionKey)
  }

  /**
   * 抽签（御神签）
   * @returns {{ rank: string, message: string }}
   */
  drawOmikuji() {
    // 加权随机
    const pool = []
    for (const item of OMIKUJI_RESULTS) {
      for (let i = 0; i < item.weight; i++) {
        pool.push(item)
      }
    }

    const result = randomPick(pool)
    const lines = [
      '== 酒狐神社 - 御神签 ==',
      '',
      `【${result.rank}】`,
      '',
      result.text,
    ]

    return {
      rank: result.rank,
      text: result.text,
      message: lines.join('\n'),
    }
  }
}

module.exports = GamesSystem
