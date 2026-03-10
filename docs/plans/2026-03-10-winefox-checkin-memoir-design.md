# WineFox Checkin Calendar and Memoir Card Design

**Goal:** Extend the current WineFox image-output pattern to `酒狐签到日历` and `酒狐回忆`, keeping image-first behavior by default with automatic text fallback on render failure.

**Architecture:** Reuse the existing `lib/card-renderer.js` as the shared rendering entry point, and add structured data methods to `lib/checkin.js` and `lib/memoir.js` so the command layer can generate either text or themed HTML cards from the same source data. The command handlers in `index.js` should mirror the already-shipped `酒狐占卜` and `酒狐好感` flow: prepare text output first, attempt image rendering when enabled, and fall back to text if Puppeteer is unavailable or rendering throws.

**Design Scope:**
- Add image-first output for `酒狐签到日历`
- Add image-first output for `酒狐回忆`
- Add per-feature config flags for these two commands
- Keep existing text output behavior as fallback and as the source of truth for content

## 1. Checkin Calendar Card

### Data model
`lib/checkin.js` should expose a structured calendar data method in addition to the existing text method. The data should contain:
- `year`
- `month`
- `monthLabel`
- `today`
- `startWeekday`
- `daysInMonth`
- `checkedDays` as a numeric collection
- summary values:
  - `checkedThisMonth`
  - `streak`
  - `totalDays`

The current `getCalendar(userId)` remains and continues to format the text response.

### Visual layout
The image card should include:
- title: `酒狐签到日历`
- subtitle: current month + user display name
- a 7-column weekday header
- a month grid with distinct visual states:
  - normal day
  - checked day
  - today but unchecked
  - today and checked
- bottom summary section with:
  - 本月已签
  - 连续签到
  - 累计签到

### Styling direction
This card should stay visually aligned with the current fortune/affinity cards, but the center of gravity should be the calendar grid rather than stat panels. It should feel like a monthly check-in board rather than a generic stats card.

## 2. Memoir Card

### Data model
`lib/memoir.js` should expose a structured memoir data method in addition to the existing text method. The data should contain:
- `meetDate`
- `daysTogether`
- `totalInteractions`
- `status` or distilled status fields:
  - current level number
  - current level name
  - current points
- `events` list sorted by date
- `closingLine` or memoir quote if present

The current `getMemoir(userId)` remains and continues to format text from the same information.

### Visual layout
The image card should include:
- title: `酒狐的回忆录`
- subtitle: user display name + relationship framing
- top summary stats:
  - 初次相遇
  - 在一起已经
  - 总互动次数
  - 当前好感
- a timeline section showing milestone events in date order
- if event count is large, cap display count and keep the existing “还有 N 条记录” idea in a concise visual form
- a closing emotional line at the bottom

### Styling direction
This card should feel more like a commemorative memory page than a dashboard. It can still reuse the existing theme shell, but the content block should prioritize a readable vertical timeline.

## 3. Command and Fallback Behavior

The command handlers in `index.js` should follow the exact pattern already used for `酒狐占卜` and `酒狐好感`:
- compute structured data first
- produce the text output first
- if image output is enabled and Puppeteer is available, attempt card rendering
- if rendering fails and fallback is enabled, return the text output
- otherwise return a short friendly failure message

This keeps all image-enabled commands behaviorally consistent.

## 4. Configuration

Add two new config flags to `exports.Config` in `index.js`:
- `imageCheckinCalendar` default `true`
- `imageMemoir` default `true`

Keep using the existing:
- `imageFallbackToText` default `true`

This preserves consistency with the previous batch and avoids overloading one global switch for all future image features.

## 5. Renderer Structure

Do **not** split the renderer layer into many files yet.

Continue using:
- `lib/card-renderer.js`

Add:
- `renderCheckinCalendarCard(ctx, payload)`
- `renderMemoirCard(ctx, payload)`

Keep shared HTML shell, escaping, and theme utilities in the same file for now. This is the DRY/YAGNI-friendly choice for the current project size.

## 6. Testing and Verification Strategy

There is still no formal test harness, so verification should stay focused and explicit:
- verify new structured data methods return the fields required by the renderer
- verify text-formatting methods still produce valid legacy output
- verify renderer functions produce HTML/image output with the expected title markers
- verify failure path by making renderer throw and confirming the command layer uses text fallback inputs
- defer full bot-level UAT until the final combined acceptance pass, per user request

## 7. Recommended Implementation Approach

**Recommended approach:**
- add structured data helpers to `checkin.js` and `memoir.js`
- extend `card-renderer.js` with two new card renderers
- wire `酒狐签到日历` and `酒狐回忆` in `index.js`
- add config flags
- perform module-level smoke verification only for now

This is the lowest-risk path and stays fully aligned with the already-implemented fortune/affinity batch.
