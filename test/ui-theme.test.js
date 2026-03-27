const assert = require('assert')
const fs = require('fs')

async function testThemeResolution() {
  const { resolveCardTheme, getCardThemeById, listCardThemes } = require('../data/card_themes')

  assert.ok(resolveCardTheme('奶油纸张'), '应支持按中文主题名解析')
  assert.ok(resolveCardTheme('sky-glass'), '应支持按主题 id 解析')
  assert.ok(resolveCardTheme('咖啡馆'), '应支持按别名解析')
  assert.ok(resolveCardTheme('wedog'), '应支持按 WeDog 主题别名解析')
  assert.ok(resolveCardTheme('拟态玻璃'), '应支持按玻璃主题别名解析')
  assert.strictEqual(resolveCardTheme('不存在的主题'), null, '不存在的主题应返回 null')
  assert.ok(getCardThemeById('cream-paper'), '应能按 id 获取主题')
  assert.ok(getCardThemeById('wedog-letter'), '应能获取新增的 WeDog 灵感主题')
  assert.ok(getCardThemeById('prism-glass'), '应能获取新增的棱镜玻璃主题')
  assert.strictEqual(listCardThemes().length >= 5, true, '应至少提供 5 个主题')
}

async function testThemePersistence() {
  const UIThemeSystem = require('../lib/ui-theme')
  const memDir = '/tmp/wf_ui_theme'
  if (fs.existsSync(memDir)) fs.rmSync(memDir, { recursive: true, force: true })
  fs.mkdirSync(memDir, { recursive: true })

  const uiTheme = new UIThemeSystem(memDir, console)
  assert.strictEqual(uiTheme.getThemeId(), 'cream-paper', '默认主题应为 cream-paper')

  const result = await uiTheme.setTheme('wedog-letter')
  assert.strictEqual(result.success, true, '切换已存在主题应成功')

  const uiThemeReloaded = new UIThemeSystem(memDir, console)
  assert.strictEqual(uiThemeReloaded.getThemeId(), 'wedog-letter', '重载后应保留已切换主题')
}

async function main() {
  const tests = [
    ['theme resolution', testThemeResolution],
    ['theme persistence', testThemePersistence],
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
