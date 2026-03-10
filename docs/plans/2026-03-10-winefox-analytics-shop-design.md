# WineFox Analytics Shop and Inventory Design

**Goal:** Add image-first output for `酒狐统计`, `酒狐商店`, `酒狐背包`, and success-result cards for `酒狐装备` / `酒狐使用`, while preserving text output as the fallback path.

**Architecture:** Reuse the existing shared `lib/card-renderer.js` and extend it with analytics, shop, inventory, equip-result, and use-result renderers. Add structured data helpers to `lib/analytics.js` and `lib/shop.js`, then keep the command layer responsible for choosing image-first or text fallback depending on config and renderer availability.

## 1. Scope

This batch covers five commands:
- `酒狐统计`
- `酒狐商店`
- `酒狐背包`
- `酒狐装备`
- `酒狐使用`

Visual priority:
- `酒狐统计`: concise dashboard-style card
- `酒狐商店`: long vertically scrolling shop card
- `酒狐背包`: grid inventory UI
- `酒狐装备`: small success result card
- `酒狐使用`: small success result card

Failure behavior:
- all display commands fall back to the existing text output
- action commands only render a result card on success; failure stays text-only

## 2. Analytics Card

### Data model
`lib/analytics.js` should expose a structured data helper containing:
- `totalUsers`
- `tiers` list, each with:
  - `name`
  - `count`
  - `ratio` or count relative to max
- `passiveCount`
- optional `maxCount` for rendering bars

The text output should continue to be available from a formatter so the existing textual behavior remains intact.

### Visual layout
- title: `酒狐统计`
- top summary block showing total users
- middle bar distribution for affinity tiers
- bottom small stat block showing today passive trigger count

Style target: lightweight game-styled dashboard, readable first.

## 3. Shop Card

### Data model
`lib/shop.js` should expose `getShopData()` returning grouped items:
- `equips`
- `consumables`

Each item should include:
- `id`
- `name`
- `type`
- `price`
- `description`

### Visual layout
- title: `酒狐商店`
- grouped long-card sections for 装备 and 消耗品
- each item rendered as a store row/card with:
  - type badge
  - name
  - price
  - short description
- footer reminder for `酒狐购买 <物品名>`

Style target: game shop interface, but optimized for list scanning rather than simulated 3D UI.

## 4. Inventory Card

### Data model
`lib/shop.js` should expose `getInventoryData(userId)` returning:
- normalized item list with merged counts
- current equipped item id
- each item containing:
  - `id`
  - `name`
  - `type`
  - `count`
  - `equipped`

This should mirror the current textual inventory output while making the UI grid renderable.

### Visual layout
- title: `酒狐背包`
- grid layout of inventory cells
- visual distinctions for:
  - equipment items
  - consumables
  - currently equipped item
  - stack count
- bottom short usage hints:
  - `酒狐装备 <物品名>`
  - `酒狐使用 <物品名>`

Style target: RPG bag/inventory feel; this is the most game-like surface in this batch.

## 5. Equip and Use Result Cards

### Behavior
These commands should not always render cards. They should behave like this:
- if action fails: return current text message only
- if action succeeds and image output is enabled: try rendering a small result card
- if render fails: fall back to the existing text message

### Equip result card content
- title: `装备成功`
- item name
- item type
- result line / equip message
- optional currently equipped state hint

### Use result card content
- title: `使用成功`
- item name
- result line / use message
- optional effect text

Style target: compact celebratory result card, not a full panel.

## 6. Configuration

Add these config flags to `index.js`:
- `imageAnalytics` default `true`
- `imageShop` default `true`
- `imageInventory` default `true`
- `imageEquipResult` default `true`
- `imageUseResult` default `true`

Continue reusing:
- `imageFallbackToText` default `true`

## 7. Command Wiring Strategy

### Display commands
For `酒狐统计`, `酒狐商店`, `酒狐背包`:
1. generate structured data
2. build text output first
3. if feature flag is enabled and puppeteer exists, attempt image rendering
4. on render failure, return text when fallback is enabled

### Action commands
For `酒狐装备`, `酒狐使用`:
1. execute current action first
2. if failed, return text immediately
3. if success, build success payload
4. if feature flag is enabled and puppeteer exists, attempt small result card
5. on render failure, return success text

## 8. Renderer Structure

Stay with the current shared file:
- `lib/card-renderer.js`

Add:
- `renderAnalyticsCard(...)`
- `renderShopCard(...)`
- `renderInventoryCard(...)`
- `renderEquipResultCard(...)`
- `renderUseResultCard(...)`

Do not split into more files yet. Current project size still favors a single renderer module.

## 9. Verification Strategy

Because final UAT will happen later, this batch should use module-level verification only:
- verify structured analytics/shop/inventory data exists
- verify current text output remains valid
- verify the new renderers emit output containing the expected titles/markers
- verify success result cards can render for action-success payloads
- verify thrown render errors remain catchable for fallback flow

## 10. Recommended Approach

Recommended implementation order:
1. add config flags
2. expose structured analytics and shop/inventory data
3. extend shared renderer
4. wire display commands
5. wire action success cards
6. run module-level smoke verification

This keeps the implementation consistent with the already-completed image batches and prioritizes high-value UI surfaces first.
