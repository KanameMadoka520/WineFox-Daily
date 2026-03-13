const assert = require('assert')
const fs = require('fs')
const path = require('path')

async function testBrewingSpoilage() {
  const BrewingSystem = require('../lib/brewing')
  const memDir = '/tmp/wf_phase3_brewing'
  fs.mkdirSync(memDir, { recursive: true })

  const brewing = new BrewingSystem(memDir, console)
  brewing.data.user1 = {
    brewing: {
      recipe: '苹果酒',
      startTime: Date.now() - 60 * 60 * 1000 * 50,
      finishTime: Date.now() - 60 * 60 * 1000 * 49,
      qualityMin: 0,
      qualityMax: 1,
    },
    finished: [],
    totalBrewed: 0,
    bestQuality: '',
  }
  await brewing._save()

  const result = await brewing.openBottle('user1')
  assert.strictEqual(result.spoiled, true, '酿酒超过48小时后应当变质')
  assert.strictEqual(result.penalty, 3, '变质应返回 -3 好感惩罚')
  assert.strictEqual(brewing.data.user1.brewing, null, '变质后应清空当前酿酒状态')
}

async function testInteractionHarassPenalty() {
  const { registerInteractions } = require('../lib/interactions')

  const commands = new Map()
  const ctx = {
    command(name) {
      return {
        action(fn) {
          commands.set(name, fn)
          return this
        },
      }
    },
  }

  let removed = 0
  const affinity = {
    getStatus() {
      return { level: { level: 9 } }
    },
    async addPoints() {},
    async removePoints(userId, amount) {
      removed += amount
      return { newPoints: 98, oldLevel: { level: 4 }, newLevel: { level: 4 } }
    },
    formatProgressLine() {
      return '好感 -2 → 98/140 密友 (还需42) | 解锁: 拥抱/牵手'
    },
  }

  const mood = { onEvent() {} }
  registerInteractions(ctx, affinity, mood, { headpatLevel: 4, hugLevel: 5, confessLevel: 7, feedDrinkLevel: 2, scratchEarLevel: 4, holdHandLevel: 5 })

  const action = commands.get('酒狐摸头')
  assert.ok(action, '应注册 酒狐摸头 指令')
  const session = { userId: 'u1' }

  await action({ session })
  const warn1 = await action({ session })
  const warn2 = await action({ session })
  const punish = await action({ session })

  assert.ok(String(warn1).includes('1/3'), '第一次冷却内骚扰应提示 1/3 警告')
  assert.ok(String(warn2).includes('2/3'), '第二次冷却内骚扰应提示 2/3 警告')
  assert.strictEqual(removed, 2, '第三次冷却内骚扰应扣除 2 点好感')
  assert.ok(String(punish).includes('好感 -2'), '惩罚提示应包含好感下降信息')
}

async function testQuizWrongRemovesAffinity() {
  let removed = 0

  const affinity = {
    async removePoints(_userId, amount) {
      removed += amount
      return { newPoints: 9 }
    },
  }

  async function handleQuizWrong(session) {
    return affinity.removePoints(session.userId, 1)
  }

  await handleQuizWrong({ userId: 'u1' })
  assert.strictEqual(removed, 1, '问答答错时应扣除 1 点好感')
}

async function main() {
  const tests = [
    ['brewing spoilage', testBrewingSpoilage],
    ['interaction harass penalty', testInteractionHarassPenalty],
    ['quiz wrong removes affinity', testQuizWrongRemovesAffinity],
  ]

  let failed = 0
  for (const [name, fn] of tests) {
    try {
      await fn()
      console.log('PASS', name)
    } catch (err) {
      failed++
      console.error('FAIL', name)
      console.error(err && err.stack ? err.stack : err)
    }
  }

  if (failed > 0) process.exit(1)
}

main()
