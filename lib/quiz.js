/**
 * WineFox-Daily - 酒狐问答系统
 * MC/模组知识问答，答对加好感
 */

const fs = require('fs')
const path = require('path')
const { randomPick, randomPickAvoidRecent, getTodayKey } = require('./utils')
const { withLock } = require('./io-lock')
const { readJsonSafe, writeJsonAtomic } = require('./safe-json')
const QUIZ_DATA = require('../data/quiz_data')

// 内存中的答题会话
const quizSessions = new Map()
const SESSION_TIMEOUT = 30 * 1000 // 30秒超时

class QuizSystem {
  /**
   * @param {string} memoryDir
   * @param {object} [logger]
   */
  constructor(memoryDir, logger) {
    this.savePath = path.join(memoryDir, 'quiz.json')
    this.logger = logger || console
    this.allQuestions = []
    this.data = {}

    // 展平所有题目
    for (const [category, questions] of Object.entries(QUIZ_DATA)) {
      for (const q of questions) {
        this.allQuestions.push({ ...q, category })
      }
    }

    this._load()
  }

  _load() {
    const result = readJsonSafe(this.savePath, {}, {
      logger: this.logger,
      label: '问答数据',
    })
    this.data = result.data || {}
  }

  async _save() {
    try {
      await withLock(this.savePath, async () => {
        await writeJsonAtomic(this.savePath, this.data, { pretty: 2 })
      })
    } catch (err) {
      this.logger.error(`[fox] 问答数据保存失败: ${err.message}`)
    }
  }

  _getUserData(userId) {
    if (!this.data[userId]) {
      this.data[userId] = {
        todayCount: 0,
        todayDate: '',
        recentQuestions: [],
      }
    }
    return this.data[userId]
  }

  /**
   * 开始一道问答
   * @param {string} sessionKey
   * @param {string} userId
   * @returns {{ success: boolean, message: string }}
   */
  startQuiz(sessionKey, userId) {
    // 清理过期会话
    const now = Date.now()
    for (const [key, sess] of quizSessions) {
      if (now - sess.createdAt > SESSION_TIMEOUT) {
        quizSessions.delete(key)
      }
    }

    if (quizSessions.has(sessionKey)) {
      return { success: false, message: '你已经有一道题在进行中了，先回答当前的题目吧！' }
    }

    const userData = this._getUserData(userId)
    const today = getTodayKey()

    if (userData.todayDate !== today) {
      userData.todayDate = today
      userData.todayCount = 0
    }

    if (userData.todayCount >= 5) {
      return { success: false, message: '酒狐悄悄话: 今天已经答了5题了，明天再来挑战吧~' }
    }

    if (this.allQuestions.length === 0) {
      return { success: false, message: '酒狐悄悄话: 题库是空的...' }
    }

    // 避免近期重复
    const { picked } = randomPickAvoidRecent(
      this.allQuestions,
      userData.recentQuestions.map(i => this.allQuestions[i]).filter(Boolean),
      Math.min(20, Math.floor(this.allQuestions.length / 2))
    )

    const question = picked || randomPick(this.allQuestions)
    const qIndex = this.allQuestions.indexOf(question)

    quizSessions.set(sessionKey, {
      question,
      qIndex,
      createdAt: now,
      userId,
    })

    const lines = [
      '== 酒狐问答 ==',
      '',
      `[${question.category}]`,
      '',
      question.question,
      '',
    ]

    const optionLabels = ['A', 'B', 'C', 'D']
    for (let i = 0; i < question.options.length; i++) {
      lines.push(`${optionLabels[i]}. ${question.options[i]}`)
    }

    lines.push('')
    lines.push('(请在30秒内回复 A/B/C/D)')

    return { success: true, message: lines.join('\n') }
  }

  /**
   * 回答问题
   * @param {string} sessionKey
   * @param {string} answer - A/B/C/D
   * @returns {{ answered: boolean, correct: boolean, message: string, reward: number }}
   */
  async answer(sessionKey, answer) {
    const session = quizSessions.get(sessionKey)
    if (!session) {
      return { answered: false, correct: false, message: '', reward: 0 }
    }

    // 超时检查
    if (Date.now() - session.createdAt > SESSION_TIMEOUT) {
      quizSessions.delete(sessionKey)
      return {
        answered: true,
        correct: false,
        message: '酒狐悄悄话: 时间到了~正确答案是 ' + session.question.answer + '。' +
          (session.question.explanation ? '\n' + session.question.explanation : ''),
        reward: 0,
      }
    }

    const normalized = answer.toUpperCase().trim()
    if (!['A', 'B', 'C', 'D'].includes(normalized)) {
      return { answered: false, correct: false, message: '', reward: 0 }
    }

    quizSessions.delete(sessionKey)

    const userData = this._getUserData(session.userId)
    userData.todayCount += 1
    if (!userData.recentQuestions.includes(session.qIndex)) {
      userData.recentQuestions.push(session.qIndex)
      if (userData.recentQuestions.length > 30) {
        userData.recentQuestions = userData.recentQuestions.slice(-30)
      }
    }
    await this._save()

    const correct = normalized === session.question.answer
    const reward = correct ? 3 : 0

    let message
    if (correct) {
      message = '酒狐悄悄话: 答对了！主人好厉害！(好感度+3)'
    } else {
      message = `酒狐悄悄话: 答错了~正确答案是 ${session.question.answer}。`
    }

    if (session.question.explanation) {
      message += '\n' + session.question.explanation
    }

    return { answered: true, correct, message, reward }
  }

  /**
   * 检查用户是否在答题中
   * @param {string} sessionKey
   * @returns {boolean}
   */
  isInQuiz(sessionKey) {
    const session = quizSessions.get(sessionKey)
    if (!session) return false
    if (Date.now() - session.createdAt > SESSION_TIMEOUT) {
      quizSessions.delete(sessionKey)
      return false
    }
    return true
  }
}

module.exports = QuizSystem
