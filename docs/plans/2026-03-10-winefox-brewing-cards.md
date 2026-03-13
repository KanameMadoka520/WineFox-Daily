# WineFox Brewing Cards Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add image-first card output for `酒狐酿酒`, `酒狐酒窖`, and `酒狐开瓶`, with a feature-rich cellar card and text fallback preserved for all failure or render-error cases.

**Architecture:** Extend `lib/brewing.js` to expose structured data for cellar state and success-result payloads while preserving existing text behavior. Add dedicated renderers in `lib/card-renderer.js` for a primary cellar card plus lighter brew/open result cards, then wire the three commands in `index.js` behind new config flags and shared Puppeteer fallback logic.

**Tech Stack:** Node.js CommonJS, Koishi plugin API, optional Koishi Puppeteer service, existing `lib/brewing.js`, `lib/card-renderer.js`, and command wiring in `index.js`.

---

## Chunk 1: Config + brewing structured data

### Task 1: Add image config flags for brewing cards

**Files:**
- Modify: `/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards/index.js`

- [ ] **Step 1: Verify the flags do not already exist**

Run:

```bash
node - <<'EOF'
const plugin = require('/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards/index.js')
for (const key of ['imageCellar', 'imageBrewResult', 'imageOpenBottleResult']) {
  console.log(key, Object.prototype.hasOwnProperty.call(plugin.Config.dict, key))
}
EOF
```

Expected before implementation: one or more lines print `false`.

- [ ] **Step 2: Add the config entries**

Add booleans with default `true` and Chinese descriptions:

```js
imageCellar: Schema.boolean().default(true).description('是否为酒狐酒窖优先输出图片卡片'),
imageBrewResult: Schema.boolean().default(true).description('是否为酒狐酿酒成功优先输出结果卡片'),
imageOpenBottleResult: Schema.boolean().default(true).description('是否为酒狐开瓶成功优先输出结果卡片'),
```

- [ ] **Step 3: Re-run verification**

Run the same Node snippet again.
Expected after implementation: all three print `true`.

- [ ] **Step 4: Commit**

```bash
git add index.js
git commit -m "feat: add brewing card image flags"
```

### Task 2: Expose structured brewing data sources in `lib/brewing.js`

**Files:**
- Modify: `/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards/lib/brewing.js`

- [ ] **Step 1: Read current brewing text methods and outputs**

Inspect the methods used by:
- `酒狐酿酒`
- `酒狐酒窖`
- `酒狐开瓶`

Identify available internal fields for:
- current brewing state
- cellar inventory/summary
- open-bottle quality/reward/effect

- [ ] **Step 2: Write the failing smoke check**

Run:

```bash
node - <<'EOF'
const BrewingSystem = require('/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards/lib/brewing.js')
const brewing = new BrewingSystem('/tmp', console)
console.log(typeof brewing.getCellarCardData, typeof brewing.getBrewResultCardData, typeof brewing.getOpenBottleResultCardData)
EOF
```

Expected before implementation: `undefined` for one or more methods.

- [ ] **Step 3: Add structured cellar/result methods**

Add methods such as:

```js
getCellarCardData(userId) {
  return {
    current: { name, progress, remainingText, ready, expectedQuality, expectedReward },
    summary: { totalStored, readyCount, brewingCount },
    recent: [{ name, quality }],
    empty: boolean,
  }
}

getBrewResultCardData(result) {
  return { brewName, cost, foxLine, suggestion }
}

getOpenBottleResultCardData(result) {
  return { brewName, quality, reward, effect, foxLine }
}
```

Use actual available fields from the current system rather than inventing unrelated state.

- [ ] **Step 4: Preserve existing text methods**

Ensure current text-returning flows still work unchanged:
- `getRecipeList()`
- `getCellar(userId)`
- `startBrewing(userId, recipe)`
- `openBottle(userId)`

- [ ] **Step 5: Run structured-data verification**

Run a smoke script that instantiates `BrewingSystem`, checks the new methods exist, and verifies current text methods still return strings/result objects as expected.

- [ ] **Step 6: Commit**

```bash
git add lib/brewing.js
 git commit -m "feat: expose structured brewing card data"
```

## Chunk 2: Brewing renderers

### Task 3: Add cellar, brew-result, and open-bottle renderers

**Files:**
- Modify: `/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards/lib/card-renderer.js`

- [ ] **Step 1: Write the failing smoke script**

Run:

```bash
node - <<'EOF'
const renderer = require('/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards/lib/card-renderer.js')
console.log(typeof renderer.renderCellarCard, typeof renderer.renderBrewResultCard, typeof renderer.renderOpenBottleResultCard)
EOF
```

Expected before implementation: one or more are `undefined`.

- [ ] **Step 2: Add `renderCellarCard()`**

Requirements:
- single main card
- upper section: current brew focus
- lower section: mixed summary (inventory + recent notable item(s) + next-step hint)
- include mixed SVG usage:
  - decorative bottle/barrel/cellar motif
  - information graphics like progress indicator / quality badge
- support empty-state cellar card

- [ ] **Step 3: Add `renderBrewResultCard()`**

Requirements:
- medium-complexity success card
- show brew/recipe name, cost/status, fox line, and suggestion to use `酒狐酒窖`
- use lighter SVG than the cellar card

- [ ] **Step 4: Add `renderOpenBottleResultCard()`**

Requirements:
- medium-complexity success card
- show brew name, quality, reward/effect, fox line, and next-step hint
- include lighter SVG and quality badge styling

- [ ] **Step 5: Export the renderers**

Add all three to `module.exports`.

- [ ] **Step 6: Run renderer smoke verification**

Run a Node script with stub Puppeteer and verify:
- cellar card contains `酒狐酒窖`
- brew result card contains `酿酒成功` or equivalent title
- open-bottle result card contains `开瓶成功` or equivalent title
- empty cellar payload still renders

- [ ] **Step 7: Commit**

```bash
git add lib/card-renderer.js
 git commit -m "feat: add brewing card renderers"
```

## Chunk 3: Command wiring

### Task 4: Wire `酒狐酒窖` to image-first output

**Files:**
- Modify: `/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards/index.js`
- Reference: `/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards/lib/brewing.js`
- Reference: `/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards/lib/card-renderer.js`

- [ ] **Step 1: Capture current text output as fallback source of truth**

Use `brewing.getCellar(userId)` as fallback text.

- [ ] **Step 2: Add image-first cellar wiring**

Implementation requirements:
- obtain `cellarData = brewing.getCellarCardData(session.userId)`
- gate with `finalConfig.imageCellar` and `hasPuppeteer(ctx)`
- on success return `renderCellarCard(ctx, { data: cellarData })`
- on render error log warning and return text fallback if `imageFallbackToText`

- [ ] **Step 3: Verify empty-state path**

Ensure empty cellar still returns a card when image mode is available.

- [ ] **Step 4: Run smoke verification**

Run module-load verification plus a stub render invocation for cellar payload.

- [ ] **Step 5: Commit**

```bash
git add index.js
 git commit -m "feat: add cellar card output"
```

### Task 5: Wire `酒狐酿酒` success result card

**Files:**
- Modify: `/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards/index.js`
- Reference: `/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards/lib/brewing.js`
- Reference: `/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards/lib/card-renderer.js`

- [ ] **Step 1: Keep current failure logic untouched**

Any existing invalid recipe / insufficient points / other failure path must remain text-only.

- [ ] **Step 2: Add success-card wiring**

After successful brewing confirmation:
- keep current text output as fallback source of truth
- build structured payload with `brewing.getBrewResultCardData(...)`
- gate with `finalConfig.imageBrewResult` and `hasPuppeteer(ctx)`
- render success card only on successful path

- [ ] **Step 3: Run smoke verification**

Use stub renderer context and confirm success path returns image payload while failure paths remain plain text logic.

- [ ] **Step 4: Commit**

```bash
git add index.js
 git commit -m "feat: add brew success result card"
```

### Task 6: Wire `酒狐开瓶` success result card

**Files:**
- Modify: `/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards/index.js`
- Reference: `/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards/lib/brewing.js`
- Reference: `/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards/lib/card-renderer.js`

- [ ] **Step 1: Keep current failure logic untouched**

If opening fails, preserve the exact text path.

- [ ] **Step 2: Add success-card wiring**

On successful open:
- keep current text output as fallback source of truth
- build payload with `brewing.getOpenBottleResultCardData(result)`
- gate with `finalConfig.imageOpenBottleResult` and `hasPuppeteer(ctx)`
- render success card only for success cases

- [ ] **Step 3: Run smoke verification**

Use stub renderer context and confirm success returns image payload while failure continues to return text.

- [ ] **Step 4: Commit**

```bash
git add index.js
 git commit -m "feat: add open bottle success result card"
```

## Chunk 4: Verification

### Task 7: Run final verification for brewing card support

**Files:**
- Verify: `index.js`, `lib/brewing.js`, `lib/card-renderer.js`

- [ ] **Step 1: Run module-load verification**

```bash
node - <<'EOF'
require('/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards/index.js')
require('/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards/lib/brewing.js')
require('/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards/lib/card-renderer.js')
console.log('module-load-ok')
EOF
```

Expected: `module-load-ok`

- [ ] **Step 2: Run combined renderer verification**

Run:

```bash
node - <<'EOF'
const { renderCellarCard, renderBrewResultCard, renderOpenBottleResultCard } = require('/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards/lib/card-renderer.js')
const ctx = { puppeteer: { render: (html) => html } }
console.log(renderCellarCard(ctx, { data: { empty: true, current: null, summary: { totalStored: 0, readyCount: 0, brewingCount: 0 }, recent: [] } }).includes('酒狐酒窖'))
console.log(renderBrewResultCard(ctx, { data: { brewName: '梅子酒', cost: 5, suggestion: '酒狐酒窖', foxLine: '开始发酵啦。' } }).includes('酿'))
console.log(renderOpenBottleResultCard(ctx, { data: { brewName: '梅子酒', quality: '优质', reward: 3, effect: 'mood_happy', foxLine: '香气很好。' } }).includes('开'))
EOF
```

Expected: all lines print `true`.

- [ ] **Step 3: Review final diff**

```bash
git diff -- index.js lib/brewing.js lib/card-renderer.js
```

- [ ] **Step 4: Commit**

```bash
git add index.js lib/brewing.js lib/card-renderer.js
 git commit -m "test: verify brewing card flows"
```
