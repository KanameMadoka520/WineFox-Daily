const assert = require('assert')

function loadModule() {
  delete require.cache[require.resolve('../lib/daily-free')]
  return require('../lib/daily-free')
}

async function testDailyFreeDeterministic() {
  const dailyFree = loadModule()
  const a = dailyFree.getDailyFreeCommands('2026-03-09')
  const b = dailyFree.getDailyFreeCommands('2026-03-09')
  assert.deepStrictEqual(a, b, '同一天应得到相同的免费指令集合')
  assert.strictEqual(a.length, 4, '每天应正好选出 4 个免费指令')
  assert.strictEqual(new Set(a).size, 4, '免费指令不应重复')
}

async function testAnnouncementTextBuilds() {
  const dailyFree = loadModule()
  const text = dailyFree.getAnnouncementText('2026-03-09')
  assert.ok(text.startsWith('今日免费体验:'), '应生成今日免费体验公告文本')
  assert.ok(text.includes('酒狐'), '公告中应包含酒狐指令名前缀')
}

async function testCommandFreeCheck() {
  const dailyFree = loadModule()
  const cmds = dailyFree.getDailyFreeCommands('2026-03-09')
  const hit = cmds[0]
  assert.strictEqual(dailyFree.isCommandFree(hit, '2026-03-09'), true, '今日免费指令应返回 true')
  assert.strictEqual(dailyFree.isCommandFree('不存在的指令', '2026-03-09'), false, '不在免费列表中的指令应返回 false')
}

async function testHelpLineFormatting() {
  const dailyFree = loadModule()
  const line = dailyFree.formatHelpLine('酒狐猜拳 <手势>', '猜拳游戏', 1, ['猜拳'])
  assert.ok(line.includes('[Lv1]'), '帮助行应包含等级标签')
  assert.ok(line.includes('[今日免费]'), '帮助行应包含今日免费标签')
}

async function main() {
  const tests = [
    ['daily free deterministic', testDailyFreeDeterministic],
    ['announcement text builds', testAnnouncementTextBuilds],
    ['daily free membership check', testCommandFreeCheck],
    ['help line formatting', testHelpLineFormatting],
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
