# WineFox Checkin Calendar and Memoir Card Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add image-first Puppeteer output for `酒狐签到日历` and `酒狐回忆`, with automatic text fallback when rendering is unavailable or fails.

**Architecture:** Reuse the existing shared `lib/card-renderer.js` and extend it with checkin-calendar and memoir-specific renderers. Add structured data methods to `lib/checkin.js` and `lib/memoir.js`, then wire the corresponding commands in `index.js` using the same image-first/fallback flow already used for `酒狐占卜` and `酒狐好感`.

**Tech Stack:** Node.js CommonJS, Koishi plugin API, optional Koishi `puppeteer` service, shared HTML/CSS card templates, existing WineFox state modules.

---

### Task 1: Add config flags for calendar and memoir image output

**Files:**
- Modify: `/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards/index.js:60-95`

**Step 1: Write the failing test**

Document the expected new defaults:

```js
{
  imageCheckinCalendar: true,
  imageMemoir: true,
}
```

**Step 2: Verify the current schema lacks these fields**

Read `index.js` config schema.
Expected: these two fields are not yet present.

**Step 3: Write minimal implementation**

Add two boolean config fields to `exports.Config`:
- `imageCheckinCalendar` default `true`
- `imageMemoir` default `true`

Descriptions should stay concise and match the existing Chinese config style.

**Step 4: Run verification**

Run a Node module-load smoke check:

```bash
node - <<'EOF'
const plugin = require('/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards/index.js')
console.log(['imageCheckinCalendar', 'imageMemoir'].every(key => Object.prototype.hasOwnProperty.call(plugin.Config.dict, key)))
EOF
```

Expected: `true`

**Step 5: Commit**

```bash
git -C "/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards" add index.js
git -C "/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards" commit -m "feat: add image config for calendar and memoir"
```

### Task 2: Expose structured checkin calendar data

**Files:**
- Modify: `/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards/lib/checkin.js:140-212`

**Step 1: Write the failing test**

Define the desired API:

```js
const data = checkin.getCalendarData('123')
expect(data).toEqual({
  year: expect.any(Number),
  month: expect.any(Number),
  monthLabel: expect.any(String),
  today: expect.any(Number),
  startWeekday: expect.any(Number),
  daysInMonth: expect.any(Number),
  checkedDays: expect.any(Array),
  checkedThisMonth: expect.any(Number),
  streak: expect.any(Number),
  totalDays: expect.any(Number),
})
```

**Step 2: Verify the current implementation is text-only**

Read `lib/checkin.js`.
Expected: only `getCalendar(userId)` returns a formatted string.

**Step 3: Write minimal implementation**

Refactor `lib/checkin.js` to:
- add `getCalendarData(userId)` returning structured calendar fields
- keep `getCalendar(userId)` and have it format text from that structured data
- preserve existing text output shape as closely as possible

**Step 4: Run verification**

Run:

```bash
node - <<'EOF'
const CheckinSystem = require('/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards/lib/checkin.js')
const checkin = new CheckinSystem('/tmp/winefox-checkin-test')
const data = checkin.getCalendarData('user-1')
console.log(JSON.stringify({
  hasMonthLabel: typeof data.monthLabel === 'string',
  checkedDaysIsArray: Array.isArray(data.checkedDays),
  textHeaderOk: checkin.getCalendar('user-1').startsWith('== 酒狐签到日历')
}, null, 2))
EOF
```

Expected:
- `hasMonthLabel: true`
- `checkedDaysIsArray: true`
- `textHeaderOk: true`

**Step 5: Commit**

```bash
git -C "/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards" add lib/checkin.js
git -C "/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards" commit -m "refactor: expose structured checkin calendar data"
```

### Task 3: Expose structured memoir data

**Files:**
- Modify: `/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards/lib/memoir.js:19-91`

**Step 1: Write the failing test**

Define the desired API:

```js
const data = memoir.getMemoirData('123')
expect(data).toEqual({
  meetDate: expect.any(String),
  daysTogether: expect.any(Number),
  totalInteractions: expect.any(Number),
  status: expect.any(Object),
  events: expect.any(Array),
  closingLine: expect.any(String),
})
```

**Step 2: Verify the current implementation is text-only**

Read `lib/memoir.js`.
Expected: `getMemoir(userId)` directly returns formatted text.

**Step 3: Write minimal implementation**

Refactor `lib/memoir.js` to:
- add `getMemoirData(userId)` returning structured memoir fields
- keep `getMemoir(userId)` and format text from the data object
- preserve empty-state behavior exactly

**Step 4: Run verification**

Run:

```bash
node - <<'EOF'
const MemoirSystem = require('/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards/lib/memoir.js')
const affinity = {
  getMemoir: () => ({ firstMeet: '2026-03-01', milestones: [{ type: 'levelup', level: 3, name: '熟人', date: '2026-03-02' }] }),
  getStatus: () => ({ points: 50, level: { level: 3, name: '熟人' } }),
}
const achievements = {
  getStats: () => ({ totalInteractions: 12 }),
  getUnlockedAt: () => ({ a1: '2026-03-03' }),
  getAchievementName: () => '初见默契',
}
const memoir = new MemoirSystem(affinity, achievements)
const data = memoir.getMemoirData('user-1')
console.log(JSON.stringify({
  hasMeetDate: typeof data.meetDate === 'string',
  eventsIsArray: Array.isArray(data.events),
  textHeaderOk: memoir.getMemoir('user-1').startsWith('== 酒狐的回忆录 ==')
}, null, 2))
EOF
```

Expected:
- `hasMeetDate: true`
- `eventsIsArray: true`
- `textHeaderOk: true`

**Step 5: Commit**

```bash
git -C "/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards" add lib/memoir.js
git -C "/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards" commit -m "refactor: expose structured memoir data"
```

### Task 4: Add calendar and memoir renderers to the shared card renderer

**Files:**
- Modify: `/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards/lib/card-renderer.js`

**Step 1: Write the failing test**

Define the expected rendering entry points:

```js
renderCheckinCalendarCard(ctx, { userName: 'Tester', data: calendarData })
renderMemoirCard(ctx, { userName: 'Tester', data: memoirData })
```

Expected: both call `ctx.puppeteer.render(...)` with themed HTML.

**Step 2: Verify the current renderer only supports fortune and affinity**

Read `lib/card-renderer.js`.
Expected: exports only contain `hasPuppeteer`, `renderFortuneCard`, `renderAffinityCard`.

**Step 3: Write minimal implementation**

Add:
- `renderCheckinCalendarCard(ctx, payload)`
- `renderMemoirCard(ctx, payload)`

Implementation requirements:
- reuse the current shell and shared styles where reasonable
- escape all interpolated text
- render a 7-column checkin grid for the calendar card
- render a readable timeline block for the memoir card
- do not fetch any remote assets

**Step 4: Run verification**

Run:

```bash
node - <<'EOF'
const { renderCheckinCalendarCard, renderMemoirCard } = require('/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards/lib/card-renderer.js')
const ctx = { puppeteer: { render: (html) => ({ length: html.length, hasCalendar: html.includes('酒狐签到日历'), hasMemoir: html.includes('酒狐的回忆录') }) } }
const calendarData = { monthLabel: '2026年3月', weekdays: ['一','二','三','四','五','六','日'], cells: [{ day: 1, state: 'checked' }], checkedThisMonth: 1, streak: 2, totalDays: 8 }
const memoirData = { meetDate: '2026-03-01', daysTogether: 10, totalInteractions: 20, status: { points: 88, level: { level: 4, name: '好朋友' } }, events: [{ date: '2026-03-02', text: '好感升至 Lv3 熟人' }], closingLine: '今天也想陪在你身边。' }
console.log(JSON.stringify({
  calendar: renderCheckinCalendarCard(ctx, { userName: 'Tester', data: calendarData }),
  memoir: renderMemoirCard(ctx, { userName: 'Tester', data: memoirData }),
}, null, 2))
EOF
```

Expected:
- calendar output includes `hasCalendar: true`
- memoir output includes `hasMemoir: true`

**Step 5: Commit**

```bash
git -C "/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards" add lib/card-renderer.js
git -C "/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards" commit -m "feat: add calendar and memoir card renderers"
```

### Task 5: Wire `酒狐签到日历` to prefer image output with fallback

**Files:**
- Modify: `/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards/index.js:385-387`
- Modify: `/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards/lib/card-renderer.js`
- Reference: `/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards/lib/checkin.js`

**Step 1: Write the failing test**

Document desired behavior:

```js
// image enabled + puppeteer available => image
// image enabled + render throws => text fallback
// image disabled => text
```

**Step 2: Verify current command is text-only**

Read `index.js`.
Expected: `酒狐签到日历` returns `checkin.getCalendar(session.userId)` directly.

**Step 3: Write minimal implementation**

Update the command to:
- build `calendarData` from `checkin.getCalendarData(session.userId)`
- build `textOutput` from `checkin.getCalendar(session.userId)`
- attempt `renderCheckinCalendarCard(...)` when enabled and available
- fall back to text on render failure when `imageFallbackToText` is true

**Step 4: Run verification**

Run a focused module-level smoke script that:
- creates stub calendar data
- verifies text output header
- verifies renderer can return image output
- verifies the fallback path input exists

Expected: no syntax errors; text and image inputs both exist.

**Step 5: Commit**

```bash
git -C "/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards" add index.js lib/checkin.js lib/card-renderer.js
git -C "/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards" commit -m "feat: add image output for checkin calendar"
```

### Task 6: Wire `酒狐回忆` to prefer image output with fallback

**Files:**
- Modify: `/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards/index.js`
- Modify: `/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards/lib/card-renderer.js`
- Modify: `/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards/lib/memoir.js`

**Step 1: Write the failing test**

Document desired behavior:

```js
// image enabled + puppeteer available => image
// render failure => text fallback
// image disabled => text
```

**Step 2: Verify current command shape**

Locate the `酒狐回忆` command in `index.js`.
Expected: it currently returns the memoir text panel only.

**Step 3: Write minimal implementation**

Update the command to:
- build memoir structured data first
- build text output first
- attempt `renderMemoirCard(...)` when enabled and available
- fall back to text under the same rules as the previous image-enabled commands

**Step 4: Run verification**

Run a focused smoke script that:
- instantiates memoir dependencies with stubs if needed
- verifies memoir text output header
- verifies memoir card renderer returns image output markers

Expected: text and image paths both produce valid outputs.

**Step 5: Commit**

```bash
git -C "/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards" add index.js lib/memoir.js lib/card-renderer.js
 git -C "/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards" commit -m "feat: add image output for memoir"
```

### Task 7: Run combined verification for the new batch

**Files:**
- Verify: `/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards/index.js`
- Verify: `/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards/lib/checkin.js`
- Verify: `/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards/lib/memoir.js`
- Verify: `/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards/lib/card-renderer.js`

**Step 1: Run fresh module-load verification**

```bash
node - <<'EOF'
require('/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards/index.js')
require('/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards/lib/checkin.js')
require('/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards/lib/memoir.js')
require('/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards/lib/card-renderer.js')
console.log('module-load-ok')
EOF
```

Expected: `module-load-ok`

**Step 2: Run focused smoke verification**

Verify these claims with fresh commands:
- calendar structured data exists
- memoir structured data exists
- calendar text output still works
- memoir text output still works
- both new renderers produce image output markers
- thrown render error remains catchable for fallback flow

Expected: all checks true.

**Step 3: Review final diff**

Run:

```bash
git -C "/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards" diff -- index.js lib/checkin.js lib/memoir.js lib/card-renderer.js
```

Expected: only requested functionality, no unrelated refactors.

**Step 4: Commit**

```bash
git -C "/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards" add index.js lib/checkin.js lib/memoir.js lib/card-renderer.js
git -C "/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards" commit -m "test: verify calendar and memoir image fallback flow"
```
