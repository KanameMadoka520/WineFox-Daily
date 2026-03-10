# WineFox Analytics Shop and Inventory Cards Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add image-first output for analytics, shop, and inventory views, plus success-result cards for equip/use actions, with automatic text fallback when rendering is unavailable or fails.

**Architecture:** Extend the current shared `lib/card-renderer.js` with five new renderers and add structured data helpers in `lib/analytics.js` and `lib/shop.js`. Keep the command layer in `index.js` responsible for building text output first, attempting image rendering when enabled, and falling back to text under the same rules used by the previous image-enabled commands.

**Tech Stack:** Node.js CommonJS, Koishi plugin API, optional Koishi `puppeteer` service, shared HTML/CSS card renderer, WineFox analytics and shop systems.

---

### Task 1: Add image config flags for analytics/shop/inventory/result cards

**Files:**
- Modify: `/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards/index.js`

**Step 1: Write the failing test**

Document the expected defaults:

```js
{
  imageAnalytics: true,
  imageShop: true,
  imageInventory: true,
  imageEquipResult: true,
  imageUseResult: true,
}
```

**Step 2: Verify the current schema lacks these fields**

Read `index.js` config schema.
Expected: none of these five fields exist yet.

**Step 3: Write minimal implementation**

Add five boolean fields with default `true` and concise Chinese descriptions.

**Step 4: Run verification**

```bash
node - <<'EOF'
const plugin = require('/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards/index.js')
console.log(['imageAnalytics','imageShop','imageInventory','imageEquipResult','imageUseResult'].every(key => Object.prototype.hasOwnProperty.call(plugin.Config.dict, key)))
EOF
```

Expected: `true`

**Step 5: Commit**

```bash
git -C "/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards" add index.js
git -C "/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards" commit -m "feat: add image config for analytics and shop views"
```

### Task 2: Expose structured analytics data and text formatter

**Files:**
- Modify: `/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards/lib/analytics.js`

**Step 1: Write the failing test**

Define expected API:

```js
const data = getAnalyticsData(affinitySystem, getTodayPassiveCount)
expect(data).toEqual({
  totalUsers: expect.any(Number),
  tiers: expect.any(Array),
  passiveCount: expect.any(Number),
  maxCount: expect.any(Number),
})
```

**Step 2: Verify current implementation is text-only**

Read `lib/analytics.js`.
Expected: the command action builds text inline and no structured helper exists.

**Step 3: Write minimal implementation**

Refactor `lib/analytics.js` to export:
- `getAnalyticsData(affinitySystem, getTodayPassiveCount)`
- `formatAnalyticsText(data)`
- keep `registerAnalyticsCommands(...)`, but allow `index.js` to reuse the structured helper later

Avoid changing the textual content more than necessary.

**Step 4: Run verification**

```bash
node - <<'EOF'
const { getAnalyticsData, formatAnalyticsText } = require('/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards/lib/analytics.js')
const affinitySystem = {
  data: { a: { points: 0 }, b: { points: 50 }, c: { points: 90 } },
  getLevel(points) {
    if (points >= 90) return { name: '好朋友' }
    if (points >= 50) return { name: '熟人' }
    return { name: '陌生人' }
  },
}
const data = getAnalyticsData(affinitySystem, () => 7)
console.log(JSON.stringify({
  tiersIsArray: Array.isArray(data.tiers),
  totalUsersOk: data.totalUsers === 3,
  textHeaderOk: formatAnalyticsText(data).includes('酒狐互动健康表')
}, null, 2))
EOF
```

Expected: all checks true.

**Step 5: Commit**

```bash
git -C "/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards" add lib/analytics.js
git -C "/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards" commit -m "refactor: expose structured analytics data"
```

### Task 3: Expose structured shop and inventory data

**Files:**
- Modify: `/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards/lib/shop.js`

**Step 1: Write the failing test**

Define expected API:

```js
const shopData = shop.getShopData()
const inventoryData = shop.getInventoryData('123')

expect(shopData.equips).toBeInstanceOf(Array)
expect(shopData.consumables).toBeInstanceOf(Array)
expect(inventoryData.items).toBeInstanceOf(Array)
```

**Step 2: Verify current implementation is text-only for shop/inventory views**

Read `lib/shop.js`.
Expected: `getShopList()` and `getInventory()` return strings only.

**Step 3: Write minimal implementation**

Add:
- `getShopData()` returning grouped item arrays
- `getInventoryData(userId)` returning merged item counts and equipped state
- keep `getShopList()` and `getInventory()` formatting text from the structured data when possible

Do not add speculative abstractions for equip/use result payloads yet.

**Step 4: Run verification**

```bash
node - <<'EOF'
const fs = require('fs')
const path = '/tmp/winefox-shop-data-test'
fs.mkdirSync(path, { recursive: true })
const ShopSystem = require('/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards/lib/shop.js')
const shop = new ShopSystem(path)
const shopData = shop.getShopData()
const inventoryData = shop.getInventoryData('user-1')
console.log(JSON.stringify({
  equipsIsArray: Array.isArray(shopData.equips),
  consumablesIsArray: Array.isArray(shopData.consumables),
  inventoryItemsIsArray: Array.isArray(inventoryData.items),
  shopTextHeaderOk: shop.getShopList().startsWith('== 酒狐商店 ==')
}, null, 2))
EOF
```

Expected: all checks true.

**Step 5: Commit**

```bash
git -C "/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards" add lib/shop.js
git -C "/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards" commit -m "refactor: expose structured shop and inventory data"
```

### Task 4: Add analytics/shop/inventory/result-card renderers

**Files:**
- Modify: `/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards/lib/card-renderer.js`

**Step 1: Write the failing test**

Define new rendering entry points:

```js
renderAnalyticsCard(ctx, { data })
renderShopCard(ctx, { data })
renderInventoryCard(ctx, { data })
renderEquipResultCard(ctx, { data })
renderUseResultCard(ctx, { data })
```

**Step 2: Verify the current renderer lacks these exports**

Read `lib/card-renderer.js`.
Expected: no analytics/shop/inventory/equip/use renderers exist yet.

**Step 3: Write minimal implementation**

Add the five renderers with these constraints:
- analytics: lightweight dashboard with totals and tier bars
- shop: long grouped list card
- inventory: grid UI with equipped highlight and count badges
- equip/use: compact success result cards
- keep all text escaped and keep CSS self-contained
- no remote assets

**Step 4: Run verification**

```bash
node - <<'EOF'
const { renderAnalyticsCard, renderShopCard, renderInventoryCard, renderEquipResultCard, renderUseResultCard } = require('/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards/lib/card-renderer.js')
const ctx = { puppeteer: { render: (html) => ({
  hasAnalytics: html.includes('酒狐统计'),
  hasShop: html.includes('酒狐商店'),
  hasInventory: html.includes('酒狐背包'),
  hasEquip: html.includes('装备成功'),
  hasUse: html.includes('使用成功'),
}) } }
console.log(JSON.stringify({
  analytics: renderAnalyticsCard(ctx, { data: { totalUsers: 3, tiers: [], passiveCount: 2 } }),
  shop: renderShopCard(ctx, { data: { equips: [], consumables: [] } }),
  inventory: renderInventoryCard(ctx, { data: { items: [] } }),
  equip: renderEquipResultCard(ctx, { data: { itemName: '木剑', message: '装备好了！' } }),
  use: renderUseResultCard(ctx, { data: { itemName: '苹果汁', message: '已使用！' } }),
}, null, 2))
EOF
```

Expected: each renderer output sets the matching marker to true.

**Step 5: Commit**

```bash
git -C "/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards" add lib/card-renderer.js
git -C "/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards" commit -m "feat: add analytics and shop renderers"
```

### Task 5: Wire `酒狐统计`, `酒狐商店`, and `酒狐背包` to image-first output

**Files:**
- Modify: `/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards/index.js`
- Modify: `/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards/lib/analytics.js`
- Modify: `/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards/lib/shop.js`

**Step 1: Write the failing test**

Document desired behavior for each display command:
- image enabled + renderer available => image
- renderer fails => text fallback
- feature disabled => text

**Step 2: Verify the current command implementations**

Locate the current handlers for:
- `酒狐统计`
- `酒狐商店`
- `酒狐背包`

Expected: all are currently text-only.

**Step 3: Write minimal implementation**

Update each command to:
- compute structured data first
- compute text output first
- attempt image rendering when the feature flag is on and Puppeteer exists
- return text on failure when `imageFallbackToText` is true

**Step 4: Run verification**

Run a focused smoke script that verifies:
- analytics text remains available
- shop text remains available
- inventory text remains available
- each renderer can be called with realistic payloads

Expected: all checks true.

**Step 5: Commit**

```bash
git -C "/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards" add index.js lib/analytics.js lib/shop.js lib/card-renderer.js
git -C "/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards" commit -m "feat: add image output for analytics and inventory views"
```

### Task 6: Wire `酒狐装备` and `酒狐使用` success-result cards

**Files:**
- Modify: `/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards/index.js`
- Modify: `/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards/lib/card-renderer.js`
- Reference: `/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards/lib/shop.js`

**Step 1: Write the failing test**

Document desired behavior:
- failed equip/use => existing text only
- successful equip/use with image enabled => result card
- render failure on successful equip/use => existing success text

**Step 2: Verify current behavior**

Locate `酒狐装备` and `酒狐使用` in `index.js`.
Expected: both currently return text only.

**Step 3: Write minimal implementation**

Update both commands so that:
- the action happens first
- on `success: false`, return the existing message directly
- on success, build a small payload with item name, type, message, and effect if present
- attempt `renderEquipResultCard(...)` or `renderUseResultCard(...)`
- fall back to the current text message if rendering fails

**Step 4: Run verification**

Run a focused smoke script with stub success payloads and a throwing renderer context.
Expected:
- success card inputs render
- thrown render errors are catchable
- text fallback messages remain available as raw strings

**Step 5: Commit**

```bash
git -C "/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards" add index.js lib/card-renderer.js
git -C "/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards" commit -m "feat: add equip and use result cards"
```

### Task 7: Run combined module-level verification for this batch

**Files:**
- Verify: `/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards/index.js`
- Verify: `/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards/lib/analytics.js`
- Verify: `/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards/lib/shop.js`
- Verify: `/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards/lib/card-renderer.js`

**Step 1: Run fresh module-load verification**

```bash
node - <<'EOF'
require('/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards/index.js')
require('/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards/lib/analytics.js')
require('/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards/lib/shop.js')
require('/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards/lib/card-renderer.js')
console.log('module-load-ok')
EOF
```

Expected: `module-load-ok`

**Step 2: Run fresh smoke verification**

Verify all of these with one fresh command:
- analytics structured data exists
- shop data exists
- inventory data exists
- analytics/shop/inventory text outputs still work
- all five new renderers produce matching title markers
- thrown render error remains catchable for fallback flow

Expected: all checks true.

**Step 3: Review final diff**

```bash
git -C "/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards" diff -- index.js lib/analytics.js lib/shop.js lib/card-renderer.js
```

Expected: only requested functionality, no unrelated refactors.

**Step 4: Commit**

```bash
git -C "/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards" add index.js lib/analytics.js lib/shop.js lib/card-renderer.js
git -C "/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards" commit -m "test: verify analytics and shop image fallback flow"
```
