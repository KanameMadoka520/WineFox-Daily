# WineFox Help Collection Ranking and Achievement Design

**Goal:** Add image-first output for `酒狐帮助`, `酒狐图鉴`, `酒狐排行`, and `酒狐成就`, with automatic text fallback when rendering is unavailable or fails.

**Architecture:** Reuse the existing shared `lib/card-renderer.js` and extend it with four new renderer surfaces: help menu, rare collection, ranking poster, and achievement wall. Keep content logic and text output in existing modules or `index.js`, but introduce structured data helpers where needed so the command layer can consistently choose between image output and fallback text.

## 1. Scope

This batch covers:
- `酒狐帮助`
- `酒狐图鉴`
- `酒狐排行`
- `酒狐成就`

Visual direction:
- `酒狐帮助`: informational menu page
- `酒狐图鉴`: collection / rare-entry album
- `酒狐排行`: ranking poster
- `酒狐成就`: badge wall / achievement album

Behavior:
- default image-first output
- renderer failure falls back to the current text output
- no redesign of command taxonomy or menu hierarchy in this batch

## 2. Help Menu Card

### Intent
Only convert the current help text into a clearer visual menu. Do not rewrite the command groups or wording.

### Data model
The command list currently lives inline in `index.js`. For image rendering, the implementation should extract a structured helper representing:
- title
- grouped sections
- each section containing command rows

The content itself should stay the same as the current help output.

### Visual layout
- title block at top
- clear grouped sections matching the current help categories
- command on the left, short description on the right
- compact but readable spacing

Style target: information-dense menu page, not a decorative poster.

## 3. Rare Collection Card

### Data model
Use the same underlying data already used by `酒狐图鉴`:
- total rare count
- unlocked rare entries
- unlocked count
- empty-state indicator

A structured helper should expose:
- `total`
- `unlockedCount`
- `items`
- `isEmpty`

### Visual layout
- title: `酒狐图鉴`
- top progress summary
- list or card-style entry area for unlocked rare quotes
- empty-state message when nothing is unlocked

Style target: collectible album / archive page.

## 4. Ranking Card

### Data model
The current ranking command already computes sorted entries. Refactor this into a structured helper containing:
- `entries`
  - rank
  - userId
  - points
  - levelName
- optional `isEmpty`

### Visual layout
- title: `酒狐排行`
- first three ranks visually emphasized
- remaining ranks in compact list format
- points and level both visible

Style target: ranking poster with clear hierarchy for top positions.

## 5. Achievement Card

### Data model
`lib/achievements.js` already contains achievement definitions, unlock state, and the text panel builder. It should expose a structured helper containing:
- `total`
- `unlockedCount`
- `items`
  - id
  - name
  - desc
  - reward
  - unlocked
- `allUnlocked`

### Visual layout
- title: `酒狐成就`
- summary line for unlocked/total
- grid or wall of achievement badges/cards
- unlocked items visually stronger than locked ones
- if all unlocked, preserve celebratory ending tone

Style target: badge wall / achievement collection sheet.

## 6. Configuration

Add four new config flags:
- `imageHelp`
- `imageRareCollection`
- `imageRanking`
- `imageAchievement`

All default to `true`, and continue to reuse:
- `imageFallbackToText`

## 7. Renderer Structure

Stay inside the shared renderer file for now:
- `lib/card-renderer.js`

Add:
- `renderHelpCard(...)`
- `renderRareCollectionCard(...)`
- `renderRankingCard(...)`
- `renderAchievementCard(...)`

This remains the right YAGNI choice given the current codebase size.

## 8. Command Wiring Strategy

For each of the four commands:
1. build structured data first
2. build text output first
3. if feature flag is on and Puppeteer exists, try rendering
4. if rendering fails, return text when fallback is enabled

This must stay consistent with all previously image-enabled commands.

## 9. Verification Strategy

As with the previous batches, verification remains module-level in this phase:
- verify structured data helpers exist and return expected fields
- verify text outputs still work unchanged in essence
- verify each new renderer emits the correct title markers
- verify thrown render errors are still catchable for fallback flow
- defer final end-to-end bot UAT until the later full acceptance pass

## 10. Recommended Implementation Order

1. add config flags
2. expose structured collection/ranking/achievement/help data helpers
3. extend shared renderer with four new cards
4. wire command handlers
5. run module-level smoke verification

This keeps the implementation aligned with the previous image-output batches and avoids unnecessary architectural churn.
