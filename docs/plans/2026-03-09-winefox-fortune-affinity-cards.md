# WineFox Fortune and Affinity Card Output Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Puppeteer-based image output for `酒狐占卜` and `酒狐好感`, enabled by default and automatically falling back to text when rendering is unavailable or fails.

**Architecture:** Keep existing text output logic as the source of truth, then add a small rendering layer that converts structured fortune and affinity data into themed HTML cards and screenshots them through Koishi's optional `puppeteer` service. Gate image output with per-feature config flags and wrap rendering in try/catch so commands degrade cleanly to the current text responses.

**Tech Stack:** Node.js CommonJS, Koishi plugin API, optional Koishi `puppeteer` service, HTML/CSS card templates, existing WineFox modules.

---

### Task 1: Add image-output configuration flags

**Files:**
- Modify: `/app/WineFox-Daily/index.js:59-90`
- Check: `/app/WineFox-Daily/package.json`

**Step 1: Write the failing test**

There is no test harness in the repository, so first document the expected config behavior as executable acceptance criteria to implement manually:

```js
// expected config defaults
{
  imageFortune: true,
  imageAffinity: true,
  imageFallbackToText: true,
}
```

**Step 2: Verify the current schema lacks these flags**

Read `/app/WineFox-Daily/index.js:59-90`.
Expected: no `imageFortune`, `imageAffinity`, or `imageFallbackToText` fields exist.

**Step 3: Write minimal implementation**

Extend `exports.Config` in `/app/WineFox-Daily/index.js` with three boolean fields:
- `imageFortune` default `true`
- `imageAffinity` default `true`
- `imageFallbackToText` default `true`

Keep descriptions user-facing and consistent with existing Chinese config text.

**Step 4: Verify the implementation**

Read the edited schema and confirm all three flags are present with `default(true)`.
Expected: all three flags are visible and grouped in a sensible config section.

**Step 5: Commit**

```bash
git add index.js
git commit -m "feat: add image output config flags"
```

### Task 2: Refactor fortune module to expose structured data and text formatting

**Files:**
- Modify: `/app/WineFox-Daily/lib/fortune.js:1-107`
- Modify: `/app/WineFox-Daily/index.js:367-372`
- Test manually via command behavior

**Step 1: Write the failing test**

Define the expected API before editing:

```js
const fortune = new FortuneSystem()
const data = fortune.getTodayFortuneData('123')

expect(data).toEqual({
  dateKey: expect.any(String),
  luck: expect.any(Number),
  color: expect.any(String),
  direction: expect.any(String),
  goods: expect.any(Array),
  bads: expect.any(Array),
  commentText: expect.any(String),
})

expect(fortune.formatFortuneText(data)).toContain('== 酒狐占卜 ==')
```

**Step 2: Verify the current implementation cannot support card rendering cleanly**

Read `/app/WineFox-Daily/lib/fortune.js:55-104`.
Expected: `getTodayFortune()` returns only a formatted string.

**Step 3: Write minimal implementation**

In `/app/WineFox-Daily/lib/fortune.js`:
- Extract the deterministic generation logic into `getTodayFortuneData(userId)`
- Add `formatFortuneText(data)` that reproduces the existing text output
- Keep `getTodayFortune(userId)` as a compatibility wrapper that calls the two methods

In `/app/WineFox-Daily/index.js`:
- Leave the command behavior unchanged for now, still returning text
- If needed, switch the command to use the new API without changing the final output text

**Step 4: Verify the implementation**

Read `/app/WineFox-Daily/lib/fortune.js`.
Expected:
- deterministic generation is centralized in `getTodayFortuneData()`
- text formatting is isolated in `formatFortuneText()`
- `getTodayFortune()` still returns the same textual shape as before

**Step 5: Commit**

```bash
git add lib/fortune.js index.js
git commit -m "refactor: expose structured fortune data"
```

### Task 3: Add a shared card renderer for Puppeteer output

**Files:**
- Create: `/app/WineFox-Daily/lib/card-renderer.js`
- Modify: `/app/WineFox-Daily/index.js:17-48`
- Reference: `/app/@seidko/koishi-plugin-puppeteer/lib/index.js:34-45`

**Step 1: Write the failing test**

Define the expected rendering surface:

```js
await renderFortuneCard(ctx, {
  userName: 'Tester',
  data: { luck: 88, color: '琥珀金', direction: '东南', goods: ['签到'], bads: ['熬夜'], commentText: '今天不错' }
})
// returns Koishi image string

await renderAffinityCard(ctx, {
  userName: 'Tester',
  status: {
    points: 42,
    progress: '42/100',
    level: { level: 2, name: '初识' },
    nextLevel: { name: '熟人', minPoints: 100 }
  }
})
// returns Koishi image string
```

**Step 2: Verify the file does not exist yet**

Check `/app/WineFox-Daily/lib/card-renderer.js`.
Expected: file missing.

**Step 3: Write minimal implementation**

Create `/app/WineFox-Daily/lib/card-renderer.js` with:
- `hasPuppeteer(ctx)` helper returning whether `ctx.puppeteer?.render` exists
- `renderFortuneCard(ctx, payload)`
- `renderAffinityCard(ctx, payload)`
- one shared internal `renderCard(ctx, html)` helper
- inline HTML/CSS only; do not add extra assets yet
- theme should be simple, readable, and WineFox-styled

Implementation constraints:
- Escape all interpolated text before placing it in HTML
- Keep CSS self-contained
- Avoid fetching remote assets or fonts
- Return the exact result from `ctx.puppeteer.render(...)`

**Step 4: Verify the implementation**

Read `/app/WineFox-Daily/lib/card-renderer.js`.
Expected:
- exports are small and focused
- no dependency on remote URLs
- interpolation is escaped
- renderer only assumes optional `ctx.puppeteer.render`

**Step 5: Commit**

```bash
git add lib/card-renderer.js index.js
git commit -m "feat: add shared winefox card renderer"
```

### Task 4: Wire `酒狐占卜` to prefer image output with fallback

**Files:**
- Modify: `/app/WineFox-Daily/index.js:367-372`
- Modify: `/app/WineFox-Daily/lib/card-renderer.js`
- Reference: `/app/WineFox-Daily/lib/fortune.js:55-107`

**Step 1: Write the failing test**

Capture the desired command behavior:

```js
// when imageFortune=true and ctx.puppeteer.render works
await command('酒狐占卜')
// => returns image

// when imageFortune=true and renderer throws
await command('酒狐占卜')
// => returns the same text produced by formatFortuneText(data)
```

**Step 2: Verify the current command always returns text**

Read `/app/WineFox-Daily/index.js:367-372`.
Expected: command directly returns `fortune.getTodayFortune(session.userId)`.

**Step 3: Write minimal implementation**

Update the `酒狐占卜` command to:
- call `trackAndNotify(session, 'fortune')` as today
- generate structured fortune data first
- build text fallback with `fortune.formatFortuneText(data)`
- if `finalConfig.imageFortune` is true and Puppeteer is available, attempt `renderFortuneCard(...)`
- wrap render in `try/catch`
- on failure, log a warning and return text when `finalConfig.imageFallbackToText` is true
- if fallback is disabled, return a short friendly error message

Do not change the deterministic fortune content itself.

**Step 4: Verify the implementation**

Read the updated command in `/app/WineFox-Daily/index.js`.
Expected:
- text fallback is produced before render attempt
- render path is optional
- failure handling is explicit and logged

**Step 5: Commit**

```bash
git add index.js lib/card-renderer.js lib/fortune.js
git commit -m "feat: add image output for fortune command"
```

### Task 5: Wire `酒狐好感` to prefer image output with fallback

**Files:**
- Modify: `/app/WineFox-Daily/index.js:315-321`
- Modify: `/app/WineFox-Daily/lib/card-renderer.js`
- Reference: `/app/WineFox-Daily/lib/affinity.js`

**Step 1: Write the failing test**

Document the expected command behavior:

```js
// when imageAffinity=true and ctx.puppeteer.render works
await command('酒狐好感')
// => returns image

// when imageAffinity=true and renderer fails
await command('酒狐好感')
// => returns existing text panel
```

**Step 2: Verify the current command shape**

Read `/app/WineFox-Daily/index.js:315-321`.
Expected: command builds and returns text inline.

**Step 3: Write minimal implementation**

Update the `酒狐好感` command to:
- obtain `status` from `affinity.getStatus(session.userId)`
- build the current text panel first
- if `finalConfig.imageAffinity` is true and Puppeteer is available, try `renderAffinityCard(...)`
- use the same fallback rules and warning logging as the fortune command

Keep the textual content identical or as close as possible to the current output.

**Step 4: Verify the implementation**

Read the updated command.
Expected:
- text fallback remains easy to audit
- card rendering consumes `status`
- no behavior change when image output is disabled

**Step 5: Commit**

```bash
git add index.js lib/card-renderer.js
git commit -m "feat: add image output for affinity command"
```

### Task 6: Declare optional Puppeteer integration in plugin metadata and usage

**Files:**
- Modify: `/app/WineFox-Daily/package.json:19-24`
- Modify: `/app/WineFox-Daily/index.js:51-57`
- Optional: `/app/WineFox-Daily/README.md`

**Step 1: Write the failing test**

Define expected metadata:

```json
{
  "koishi": {
    "service": {
      "optional": ["puppeteer"]
    }
  }
}
```

And expected usage note: image output is available and falls back to text if rendering is unavailable.

**Step 2: Verify the current metadata**

Read `/app/WineFox-Daily/package.json:19-24`.
Expected: `optional` is empty.

**Step 3: Write minimal implementation**

- Add `puppeteer` to the plugin's optional service metadata in `package.json`
- Update the short usage string in `index.js` to mention that some panels support image output when browser service is installed
- Keep wording concise; do not over-document

**Step 4: Verify the implementation**

Read the updated metadata and usage.
Expected: optional service is declared and the usage text matches actual behavior.

**Step 5: Commit**

```bash
git add package.json index.js README.md
git commit -m "docs: declare optional puppeteer integration"
```

### Task 7: Manually verify happy path and fallback path

**Files:**
- Verify: `/app/WineFox-Daily/index.js`
- Verify: `/app/WineFox-Daily/lib/fortune.js`
- Verify: `/app/WineFox-Daily/lib/card-renderer.js`
- Verify: `/app/WineFox-Daily/package.json`

**Step 1: Verify static behavior by reading code**

Read all modified files and confirm:
- no command lost its existing text content
- image output is feature-gated
- fallback is explicit
- HTML escaping is present in the renderer

**Step 2: Run manual smoke checks in Koishi environment**

Suggested manual checks:
- trigger `酒狐占卜` with Puppeteer available
- trigger `酒狐好感` with Puppeteer available
- temporarily simulate render failure by throwing inside renderer, then verify both commands fall back to text
- disable `imageFortune` and `imageAffinity` in config and verify text-only output still works

Expected:
- image responses on happy path
- original-style text on failure or when disabled

**Step 3: Do a final focused diff review**

Review only the touched files.
Expected: no unrelated refactors, no extra abstractions, no remote assets, no breaking command renames.

**Step 4: Commit**

```bash
git add index.js lib/fortune.js lib/card-renderer.js package.json README.md
git commit -m "test: verify winefox image output fallback flow"
```
