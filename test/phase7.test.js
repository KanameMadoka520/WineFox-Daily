const assert = require('assert')
const fs = require('fs')
const path = require('path')

async function testPackageVersionUpdated() {
  const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'))
  assert.strictEqual(pkg.version, '2.3.0', 'package.json 版本号应更新到 2.3.0')
}

async function testProgressLineWiredInIndex() {
  const text = fs.readFileSync(path.join(__dirname, '..', 'index.js'), 'utf8')
  const count = (text.match(/formatProgressLine\(/g) || []).length
  assert.ok(count >= 6, 'index.js 中应在多个关键路径追加进度播报')
}

async function testHandoffMarksPhase7Done() {
  const handoff = fs.readFileSync(path.join(__dirname, '..', 'HANDOFF.md'), 'utf8')
  assert.ok(handoff.includes('| Phase 7 | 进度播报 + 收尾打磨 | ✅ 完成 |'), 'HANDOFF 应标记 Phase 7 完成')
}

async function main() {
  const tests = [
    ['package version updated', testPackageVersionUpdated],
    ['progress line wired in index', testProgressLineWiredInIndex],
    ['handoff marks phase7 done', testHandoffMarksPhase7Done],
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
