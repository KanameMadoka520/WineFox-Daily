# WineFox Help Collection Ranking and Achievement Cards Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add image-first output for help, rare collection, ranking, and achievement views, with automatic text fallback when rendering is unavailable or fails.

**Architecture:** Extend the current shared `lib/card-renderer.js` with dedicated help, collection, ranking, and achievement renderers. Add small structured data helpers in the most local place for each feature—`index.js` for help/ranking/rare collection if appropriate, and `lib/achievements.js` for achievements—so commands can preserve their current text output while gaining consistent image-first behavior.

**Tech Stack:** Node.js CommonJS, Koishi plugin API, optional Koishi `puppeteer` service, shared HTML/CSS card renderer, existing WineFox state modules.

---

### Task 1: Add image config flags for help/collection/ranking/achievement output

**Files:**
- Modify: `/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards/index.js`

**Step 1: Write the failing test**

Document expected defaults:

```js
{
  imageHelp: true,
  imageRareCollection: true,
  imageRanking: true,
  imageAchievement: true,
}
```

**Step 2: Verify the current schema lacks these fields**

Read `index.js` config schema.
Expected: these four fields are not present yet.

**Step 3: Write minimal implementation**

Add the four boolean config fields with concise Chinese descriptions.

**Step 4: Run verification**

```bash
node - <<'EOF'
const plugin = require('/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards/index.js')
console.log(['imageHelp','imageRareCollection','imageRanking','imageAchievement'].every(key => Object.prototype.hasOwnProperty.call(plugin.Config.dict, key)))
EOF
```

Expected: `true`

**Step 5: Commit**

```bash
git -C "/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards" add index.js
git -C "/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards" commit -m "feat: add image config for help and collection views"
```

### Task 2: Expose structured achievement data

**Files:**
- Modify: `/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards/lib/achievements.js`

**Step 1: Write the failing test**

Define expected API:

```js
const data = achievements.getPanelData('123')
expect(data).toEqual({
  total: expect.any(Number),
  unlockedCount: expect.any(Number),
  items: expect.any(Array),
  allUnlocked: expect.any(Boolean),
})
```

**Step 2: Verify current implementation is text-only**

Read `lib/achievements.js`.
Expected: `getPanel(userId)` directly returns formatted text.

**Step 3: Write minimal implementation**

Add `getPanelData(userId)` returning structured achievement data and update `getPanel(userId)` to format text from that data where reasonable.
Preserve the celebratory all-unlocked ending.

**Step 4: Run verification**

```bash
node - <<'EOF'
const fs = require('fs')
const path = '/tmp/winefox-achievement-test'
fs.mkdirSync(path, { recursive: true })
const AchievementSystem = require('/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards/lib/achievements.js')
const achievements = new AchievementSystem(path)
const data = achievements.getPanelData('user-1')
console.log(JSON.stringify({
  itemsIsArray: Array.isArray(data.items),
  totalIsNumber: typeof data.total === 'number',
  textHeaderOk: achievements.getPanel('user-1').startsWith('== 酒狐成就 ==')
}, null, 2))
EOF
```

Expected: all checks true.

**Step 5: Commit**

```bash
git -C "/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards" add lib/achievements.js
git -C "/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards" commit -m "refactor: expose structured achievement data"
```

### Task 3: Add local structured helpers for help, rare collection, and ranking

**Files:**
- Modify: `/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards/index.js`

**Step 1: Write the failing test**

Define expected helper outputs:

```js
getHelpData() => { title, groups }
getRareCollectionData(userId) => { total, unlockedCount, items, isEmpty }
getRankingData() => { entries, isEmpty }
```

**Step 2: Verify current logic is inline only**

Read the relevant command sections in `index.js`.
Expected: all three commands currently build text inline.

**Step 3: Write minimal implementation**

Add small local helpers inside `apply()` or nearby that:
- return structured help menu groups without changing wording
- return structured rare collection data from `affinity` and `quotesLoader`
- return structured ranking data from existing ranking logic

Keep text output generation near these helpers or derive current text from them.

**Step 4: Run verification**

Run a focused Node smoke script that checks:
- help groups are arrays
- rare collection data includes counts and item list
- ranking entries are arrays

Expected: all checks true.

**Step 5: Commit**

```bash
git -C "/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards" add index.js
 git -C "/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards" commit -m "refactor: expose help and collection view data"
```

### Task 4: Add help/collection/ranking/achievement renderers

**Files:**
- Modify: `/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards/lib/card-renderer.js`

**Step 1: Write the failing test**

Define expected renderer entry points:

```js
renderHelpCard(ctx, { data })
renderRareCollectionCard(ctx, { data })
renderRankingCard(ctx, { data })
renderAchievementCard(ctx, { data })
```

**Step 2: Verify the current renderer lacks these exports**

Read `lib/card-renderer.js`.
Expected: none of these four renderers exist yet.

**Step 3: Write minimal implementation**

Add four renderers with these constraints:
- help: clear grouped menu layout
- rare collection: album/progress layout
- ranking: top-focused ranking poster
- achievement: badge wall / card grid
- all interpolated text must be escaped
- CSS must remain self-contained
- no remote assets

**Step 4: Run verification**

```bash
node - <<'EOF'
const { renderHelpCard, renderRareCollectionCard, renderRankingCard, renderAchievementCard } = require('/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards/lib/card-renderer.js')
const ctx = { puppeteer: { render: (html) => ({
  help: html.includes('酒狐帮助'),
  rare: html.includes('酒狐图鉴'),
  ranking: html.includes('酒狐排行'),
  achievement: html.includes('酒狐成就'),
}) } }
console.log(JSON.stringify({
  help: renderHelpCard(ctx, { data: { title: '酒狐帮助', groups: [] } }),
  rare: renderRareCollectionCard(ctx, { data: { total: 10, unlockedCount: 0, items: [], isEmpty: true } }),
  ranking: renderRankingCard(ctx, { data: { entries: [] } }),
  achievement: renderAchievementCard(ctx, { data: { total: 1, unlockedCount: 0, items: [], allUnlocked: false } }),
}, null, 2))
EOF
```

Expected: each output sets its matching marker to true.

**Step 5: Commit**

```bash
git -C "/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards" add lib/card-renderer.js
 git -C "/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards" commit -m "feat: add help and collection renderers"
```

### Task 5: Wire the four commands to image-first output with fallback

**Files:**
- Modify: `/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards/index.js`
- Modify: `/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards/lib/achievements.js`
- Modify: `/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards/lib/card-renderer.js`

**Step 1: Write the failing test**

Document desired behavior for each command:
- image enabled + renderer available => image
- render failure => text fallback
- image disabled => text

**Step 2: Verify current command shape**

Locate handlers for:
- `酒狐帮助`
- `酒狐图鉴`
- `酒狐排行`
- `酒狐成就`

Expected: all are currently text-only.

**Step 3: Write minimal implementation**

Update each command to:
- build structured data first
- build text output first
- attempt rendering when enabled and Puppeteer exists
- fall back to text when rendering fails and fallback is enabled

Do not change the current command wording beyond what is necessary for structured reuse.

**Step 4: Run verification**

Run a focused smoke script verifying:
- all four text outputs still exist
- all four renderers can be called with realistic payloads
- a thrown render error remains catchable for fallback flow

Expected: all checks true.

**Step 5: Commit**

```bash
git -C "/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards" add index.js lib/achievements.js lib/card-renderer.js
 git -C "/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards" commit -m "feat: add help and collection image output"
```

### Task 6: Run combined module-level verification for this batch

**Files:**
- Verify: `/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards/index.js`
- Verify: `/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards/lib/achievements.js`
- Verify: `/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards/lib/card-renderer.js`

**Step 1: Run fresh module-load verification**

```bash
node - <<'EOF'
require('/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards/index.js')
require('/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards/lib/achievements.js')
require('/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards/lib/card-renderer.js')
console.log('module-load-ok')
EOF
```

Expected: `module-load-ok`

**Step 2: Run fresh smoke verification**

Verify these claims with one fresh command:
- help/rare/ranking/achievement structured data exists
- corresponding text outputs still work
- all four renderers emit matching title markers
- thrown render error remains catchable for fallback flow

Expected: all checks true.

**Step 3: Review final diff**

```bash
git -C "/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards" diff -- index.js lib/achievements.js lib/card-renderer.js
```

Expected: only requested functionality, no unrelated refactors.

**Step 4: Commit**

```bash
git -C "/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards" add index.js lib/achievements.js lib/card-renderer.js
 git -C "/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards" commit -m "test: verify help and collection image fallback flow"
```
