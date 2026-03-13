const assert = require('assert')
const fs = require('fs')

function loadModule() {
  delete require.cache[require.resolve('../lib/commission')]
  return require('../lib/commission')
}

async function testDailyTasksGenerated() {
  const CommissionSystem = loadModule()
  const memDir = '/tmp/wf_phase5_commission'
  fs.mkdirSync(memDir, { recursive: true })

  const affinity = {
    async addTickets() { return { newTickets: 10 } },
  }

  const commission = new CommissionSystem(memDir, console, affinity)
  const panel = await commission.getDailyTasks('u1', '2026-03-09')
  assert.ok(panel.includes('== 酒狐委托 =='), '应生成委托面板')
  assert.strictEqual(commission.data.u1.tasks.length, 3, '每天应生成 3 个委托任务')
}

async function testTasksDeterministicPerDay() {
  const CommissionSystem = loadModule()
  const memDir = '/tmp/wf_phase5_commission_same'
  fs.mkdirSync(memDir, { recursive: true })

  const affinity = {
    async addTickets() { return { newTickets: 10 } },
  }

  const commission = new CommissionSystem(memDir, console, affinity)
  await commission.getDailyTasks('u1', '2026-03-09')
  const first = commission.data.u1.tasks.map(t => t.id)
  await commission.getDailyTasks('u1', '2026-03-09')
  const second = commission.data.u1.tasks.map(t => t.id)
  assert.deepStrictEqual(first, second, '同一天同一用户的委托应固定')
}

async function testRecordProgressAndReward() {
  const CommissionSystem = loadModule()
  const memDir = '/tmp/wf_phase5_commission_reward'
  fs.mkdirSync(memDir, { recursive: true })

  let added = 0
  const affinity = {
    async addTickets(_userId, amount) {
      added += amount
      return { newTickets: added }
    },
  }

  const commission = new CommissionSystem(memDir, console, affinity)
  commission.data.u1 = {
    date: '2026-03-09',
    tasks: [
      { id: 'checkin_today', desc: '今日签到', event: 'checkin', target: 1, progress: 0, reward: 5, completed: false },
    ],
  }

  const result = await commission.recordProgress('u1', 'checkin', 1)
  assert.strictEqual(commission.data.u1.tasks[0].progress, 1, '事件应推进委托进度')
  assert.strictEqual(commission.data.u1.tasks[0].completed, true, '达到目标后应标记为已完成')
  assert.strictEqual(added, 5, '完成任务后应自动发放狐狐券')
  assert.strictEqual(result.completedTasks.length, 1, '应返回已完成任务列表')
}

async function main() {
  const tests = [
    ['daily tasks generated', testDailyTasksGenerated],
    ['tasks deterministic per day', testTasksDeterministicPerDay],
    ['record progress and reward', testRecordProgressAndReward],
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
