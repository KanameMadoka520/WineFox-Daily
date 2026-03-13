# WineFox Action Result Cards Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add image-first success result cards for `酒狐签到`, `酒狐购买`, and `酒狐送礼`, with automatic text fallback when Puppeteer rendering is unavailable or fails.

**Architecture:** Keep existing command logic and text messages as the source of truth. On success only, build a small structured payload (core fields + suggestions + fox quote) and render a themed HTML card via `ctx.puppeteer.render`. On any rendering error, return the existing text message.

**Tech Stack:** Node.js CommonJS, Koishi plugin API, optional Koishi `puppeteer` service, shared `lib/card-renderer.js`, `data/responses.js` quote lists.

---

## Chunk 1: Configuration + quote data

### Task 1: Add image config flags for action result cards

**Files:**
- Modify: `/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards/index.js` (Config schema near existing `image*` flags)

- [ ] **Step 1: Define expected defaults (acceptance criteria)**

Expected new defaults:

```js
{
  imageCheckinResult: true,
  imageBuyResult: true,
  imageGiftResult: true,
}
```

- [ ] **Step 2: Verify flags are not already present**

Read the config schema section in `index.js`.
Expected: these 3 keys not present.

- [ ] **Step 3: Implement the schema fields**

Add three booleans with default `true` and Chinese descriptions:
- `imageCheckinResult`
- `imageBuyResult`
- `imageGiftResult`

- [ ] **Step 4: Verify via Node smoke check**

Run:

```bash
node - <<'EOF'
const plugin = require('/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards/index.js')
console.log(['imageCheckinResult','imageBuyResult','imageGiftResult'].every(k => Object.prototype.hasOwnProperty.call(plugin.Config.dict, k)))
EOF
```

Expected: `true`

- [ ] **Step 5: Commit**

```bash
git add index.js
git commit -m "feat: add image flags for action result cards"
```

### Task 2: Add action-result quote arrays to `data/responses.js`

**Files:**
- Modify: `/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards/data/responses.js`

- [ ] **Step 1: Define expected shape**

```js
{
  actionResultQuotesCheckin: [ '...' ],
  actionResultQuotesBuy: [ '...' ],
  actionResultQuotesGift: [ '...' ],
}
```

- [ ] **Step 2: Add minimal quote lists**

Add ~6–10 short lines per category. Guidelines:
- keep each line short enough to fit in a single card section
- keep the “酒狐悄悄话:” prefix **optional** (card already has context)

- [ ] **Step 3: Verify exports contain arrays**

Run:

```bash
node - <<'EOF'
const r = require('/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards/data/responses.js')
console.log(
  Array.isArray(r.actionResultQuotesCheckin),
  Array.isArray(r.actionResultQuotesBuy),
  Array.isArray(r.actionResultQuotesGift)
)
EOF
```

Expected: `true true true`

- [ ] **Step 4: Commit**

```bash
git add data/responses.js
git commit -m "data: add action result quote lists"
```

## Chunk 2: Renderers

### Task 3: Add three new result-card renderers

**Files:**
- Modify: `/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards/lib/card-renderer.js`

- [ ] **Step 1: Define renderer entrypoints**

Add:
- `renderCheckinResultCard(ctx, { data })`
- `renderBuyResultCard(ctx, { data })`
- `renderGiftResultCard(ctx, { data })`

Where `data` contains:
- `tag` (small)
- `mainRows: { label, value, muted? }[]`
- `suggestions: string[]`
- `foxLine: string`

- [ ] **Step 2: Implement minimal HTML for each**

Re-use existing shell + section styles; keep a consistent layout.

- [ ] **Step 3: Export them**

Add to `module.exports`.

- [ ] **Step 4: Verify with a stub Puppeteer context**

Run:

```bash
node - <<'EOF'
const { renderCheckinResultCard, renderBuyResultCard, renderGiftResultCard } = require('/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards/lib/card-renderer.js')
const ctx = { puppeteer: { render: (html) => ({
  checkin: html.includes('签到成功'),
  buy: html.includes('购买成功'),
  gift: html.includes('送礼成功'),
}) } }
console.log({
  checkin: renderCheckinResultCard(ctx, { data: { tag: '今日奖励', mainRows: [{ label: '奖励', value: '好感 +3' }], suggestions: ['酒狐签到日历'], foxLine: '做得好。' } }),
  buy: renderBuyResultCard(ctx, { data: { tag: '商店', mainRows: [{ label: '物品', value: '木剑', muted: '消耗好感 10 点' }], suggestions: ['酒狐装备 木剑','酒狐背包'], foxLine: '很适合你。' } }),
  gift: renderGiftResultCard(ctx, { data: { tag: '社交', mainRows: [{ label: '对象', value: '@某人', muted: '你 -1 / 对方 +2' }], suggestions: ['酒狐排行','酒狐回忆'], foxLine: '主人真温柔。' } }),
})
EOF
```

Expected: `checkin.checkin === true`, etc.

- [ ] **Step 5: Commit**

```bash
git add lib/card-renderer.js
git commit -m "feat: add checkin/buy/gift result card renderers"
```

## Chunk 3: Command wiring

### Task 4: Wire `酒狐签到` success path to result card

**Files:**
- Modify: `/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards/index.js` (`酒狐签到` handler)
- Reference: `/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards/lib/checkin.js` (returns `{ success, message, reward }`)
- Reference: `/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards/data/responses.js`

- [ ] **Step 1: Build payload only on success**

Use `responses.actionResultQuotesCheckin` to pick a fox line.

Payload must include:
- reward number
- streak/total from `checkin.getData(userId)` (already exists)
- suggestions: `['酒狐签到日历']`

- [ ] **Step 2: Render if enabled and Puppeteer exists**

Gate with `finalConfig.imageCheckinResult` and `hasPuppeteer(ctx)`.

- [ ] **Step 3: Fallback to existing text on render error**

Wrap in try/catch; on error return `result.message` when `imageFallbackToText` is true.

- [ ] **Step 4: Verify via Node smoke check**

Run a small script that stubs `ctx.puppeteer.render` and asserts the path returns `[image]` on success and returns message when render throws.

- [ ] **Step 5: Commit**

```bash
git add index.js
git commit -m "feat: add checkin success result card"
```

### Task 5: Wire `酒狐购买` success path to result card

**Files:**
- Modify: `/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards/index.js` (`酒狐购买` handler)
- Reference: `/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards/lib/shop.js` (`buyItem()` returns `_itemName/_itemType/cost/message`)
- Reference: `/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards/data/responses.js`

- [ ] **Step 1: Build payload only after purchase is confirmed**

Only after `spendPoints` and `confirmBuy` succeed.

Payload:
- item name
- cost
- item type
- suggestions by type:
  - equip: `酒狐装备 <name>`, `酒狐背包`
  - consumable: `酒狐使用 <name>`, `酒狐背包`
- foxLine from `actionResultQuotesBuy`

- [ ] **Step 2: Render if enabled**

Gate with `finalConfig.imageBuyResult`.

- [ ] **Step 3: Fallback**

On render fail, return existing `result.message`.

- [ ] **Step 4: Verify with Node smoke check**

Stub `shop.buyItem` return object and stub render.

- [ ] **Step 5: Commit**

```bash
git add index.js
git commit -m "feat: add buy success result card"
```

### Task 6: Wire `酒狐送礼` success path to result card

**Files:**
- Modify: `/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards/index.js` (`酒狐送礼` handler)
- Reference: `/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards/data/responses.js`

- [ ] **Step 1: Build payload only after mutations succeed**

Payload:
- target id (or displayed target)
- sender cost and receiver bonus
- suggestions: `['酒狐排行','酒狐回忆']`
- foxLine from `actionResultQuotesGift`

- [ ] **Step 2: Render if enabled**

Gate with `finalConfig.imageGiftResult`.

- [ ] **Step 3: Fallback**

On render fail, return existing success text.

- [ ] **Step 4: Verify with Node smoke check**

Stub render and throw path.

- [ ] **Step 5: Commit**

```bash
git add index.js
git commit -m "feat: add gift success result card"
```

## Chunk 4: Batch verification

### Task 7: Run combined module-level verification

**Files:**
- Verify: `index.js`, `lib/card-renderer.js`, `data/responses.js`

- [ ] **Step 1: Fresh module-load check**

```bash
node - <<'EOF'
require('/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards/index.js')
require('/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards/lib/card-renderer.js')
require('/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards/data/responses.js')
console.log('module-load-ok')
EOF
```

Expected: `module-load-ok`

- [ ] **Step 2: Smoke verify quote picking + renderer markers**

Run:

```bash
node - <<'EOF'
const r = require('/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards/data/responses.js')
const { renderCheckinResultCard, renderBuyResultCard, renderGiftResultCard } = require('/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards/lib/card-renderer.js')
const ctx = { puppeteer: { render: (html) => ({
  ok: html.includes('签到成功') || html.includes('购买成功') || html.includes('送礼成功')
}) } }
console.log({
  quotesOk: [r.actionResultQuotesCheckin, r.actionResultQuotesBuy, r.actionResultQuotesGift].every(a => Array.isArray(a) && a.length > 0),
  checkinOk: renderCheckinResultCard(ctx, { data: { tag: '今日奖励', mainRows: [{ label: '奖励', value: '好感 +3' }], suggestions: ['酒狐签到日历'], foxLine: 'OK' } }).ok,
  buyOk: renderBuyResultCard(ctx, { data: { tag: '商店', mainRows: [{ label: '物品', value: '木剑' }], suggestions: ['酒狐背包'], foxLine: 'OK' } }).ok,
  giftOk: renderGiftResultCard(ctx, { data: { tag: '社交', mainRows: [{ label: '对象', value: '@某人' }], suggestions: ['酒狐排行'], foxLine: 'OK' } }).ok,
})
EOF
```

Expected: all true.

- [ ] **Step 3: Final diff review**

```bash
git diff -- index.js lib/card-renderer.js data/responses.js
```

- [ ] **Step 4: Commit**

```bash
git add index.js lib/card-renderer.js data/responses.js
 git commit -m "test: verify action result cards fallback flow"
```
