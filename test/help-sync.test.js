const assert = require('assert')
const fs = require('fs')
const path = require('path')

function readProjectFile(relativePath) {
  return fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8')
}

function assertContains(text, needle, label) {
  assert.ok(text.includes(needle), `${label} 应包含 ${needle}`)
}

function assertNotContains(text, needle, label) {
  assert.ok(!text.includes(needle), `${label} 不应包含 ${needle}`)
}

function testHelpMenuCoversRecentCommands() {
  const source = readProjectFile('index.js')
  const requiredEntries = [
    '酒狐帮助',
    '酒狐账本',
    '酒狐动态商店',
    '酒狐动态购买 <物品>',
    '酒狐渲染诊断 [-i]',
    '酒狐渲染统计 [N]',
    '酒狐渲染自检',
    '酒狐缓存清理',
    '酒狐存档备份',
    '酒狐存档列表 [N]',
    '酒狐存档清理 [N]',
    '酒狐存档恢复 <id> -f',
    '酒狐账本 @某人',
  ]

  for (const entry of requiredEntries) {
    assertContains(source, entry, 'index.js 帮助菜单')
  }

  for (const entry of ['酒狐偏好', '酒狐群设置']) {
    assertNotContains(source, entry, 'index.js')
  }
}

function testReadmeMentionsRecentCommands() {
  const source = readProjectFile('README.md')
  const requiredEntries = [
    '`酒狐帮助`',
    '`酒狐账本`',
    '`酒狐动态商店`',
    '`酒狐动态购买 <物品>`',
    '`酒狐渲染诊断 [-i]`',
    '`酒狐渲染统计 [N]`',
    '`酒狐渲染自检`',
    '`酒狐缓存清理`',
    '`酒狐存档备份`',
    '`酒狐存档列表 [N]`',
    '`酒狐存档清理 [N]`',
    '`酒狐存档恢复 <id> -f`',
    '`酒狐账本 @某人`',
  ]

  for (const entry of requiredEntries) {
    assertContains(source, entry, 'README.md')
  }

  for (const entry of ['`酒狐偏好`', '`酒狐群设置`', 'memory/prefs.json']) {
    assertNotContains(source, entry, 'README.md')
  }
}

function testHandoffMentionsRecentCommands() {
  const source = readProjectFile('HANDOFF.md')
  const requiredEntries = [
    '`酒狐帮助`',
    '`酒狐账本`',
    '`酒狐动态商店`',
    '`酒狐动态购买`',
    '管理员：`酒狐渲染诊断` / `酒狐渲染统计` / `酒狐渲染自检` / `酒狐缓存清理`',
    '运维（仅 opsAdminIds）：`酒狐存档备份` / `酒狐存档列表` / `酒狐存档清理` / `酒狐存档恢复` / `酒狐账本 @某人`',
    '兼容别名：`酒狐诊断` -> `酒狐渲染诊断`',
  ]

  for (const entry of requiredEntries) {
    assertContains(source, entry, 'HANDOFF.md')
  }

  for (const entry of ['`酒狐偏好`', '`酒狐群设置`', '个人/群偏好']) {
    assertNotContains(source, entry, 'HANDOFF.md')
  }
}

async function main() {
  const tests = [
    ['help menu covers recent commands', testHelpMenuCoversRecentCommands],
    ['readme mentions recent commands', testReadmeMentionsRecentCommands],
    ['handoff mentions recent commands', testHandoffMentionsRecentCommands],
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
