# WineFox Action Result Cards Design (Checkin / Buy / Gift)

**Goal:** Add small image “result cards” for high-frequency action commands (`酒狐签到`, `酒狐购买`, `酒狐送礼`) to improve readability and game-like feel.

**Behavior:**
- **Success:** Prefer image output by default. If Puppeteer is unavailable or rendering fails, **fall back to the existing text**.
- **Failure:** Keep **existing text-only** output (no failure card).

**Tone & UX:** Use a **mixed style**: compact (A-style) information density plus a short **WineFox evaluation line** on every success card, and always include **next-step suggestions**.

## Card content rules

All success cards share a consistent structure:
1) **Core result** (title + key numbers)
2) **Suggestions** (next commands as pills)
3) **Fox line** (a short evaluation quote)

### Checkin (`酒狐签到`)
- Core: reward (affinity +X), streak days, total days
- Suggestions: `酒狐签到日历`
- Fox line source: `responses.actionResultQuotesCheckin[]`

### Buy (`酒狐购买 <物品>`)
- Core: item name, cost (affinity -X), item type
- Suggestions:
  - equip: `酒狐装备 <物品名>`, `酒狐背包`
  - consumable: `酒狐使用 <物品名>`, `酒狐背包`
- Fox line source: `responses.actionResultQuotesBuy[]`

### Gift (`酒狐送礼 <target>`)
- Core: target, sender cost, receiver bonus
- Suggestions: `酒狐排行`, `酒狐回忆`
- Fox line source: `responses.actionResultQuotesGift[]`

## Data placement

Add three new arrays to `data/responses.js`:
- `actionResultQuotesCheckin: string[]`
- `actionResultQuotesBuy: string[]`
- `actionResultQuotesGift: string[]`

If the arrays are missing/empty at runtime, fall back to a small inline default list.

## Renderer approach

Extend the existing `lib/card-renderer.js` with:
- `renderCheckinResultCard(ctx, { data })`
- `renderBuyResultCard(ctx, { data })`
- `renderGiftResultCard(ctx, { data })`

Renderers:
- Escape all interpolated text (reuse `escapeHtml`)
- Keep CSS self-contained, no remote assets
- Reuse existing visual shell and section styles

## Configuration

Add three config flags (default `true`):
- `imageCheckinResult`
- `imageBuyResult`
- `imageGiftResult`

Reuse existing `imageFallbackToText`.
