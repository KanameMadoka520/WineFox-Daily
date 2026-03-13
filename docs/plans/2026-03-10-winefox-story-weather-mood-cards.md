# WineFox Story, Weather, and Mood Cards Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add image-first card output for `酒狐故事`, `酒狐故事目录`, `酒狐天气`, and `酒狐心情`, including capped 3-page story pagination and automatic text fallback.

**Architecture:** Extend `lib/story.js` to expose structured story and catalog data while keeping current text APIs intact. Add dedicated renderers in `lib/card-renderer.js`, then wire the four commands in `index.js` behind new config flags and shared Puppeteer fallback behavior. Story pagination will use deterministic character-count chunking with page-count-based font sizing instead of height measurement.

**Tech Stack:** Node.js CommonJS, Koishi plugin API, Koishi Puppeteer service, existing `lib/card-renderer.js`, existing `lib/story.js` / `lib/weather.js` / `lib/mood.js`.

---

## Chunk 1: Config + structured story data

### Task 1: Add image config flags for story, catalog, weather, and mood cards

**Files:**
- Modify: `/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards/index.js` (Config schema section)

- [ ] **Step 1: Read the existing image config block**

Find the existing `image*` boolean config entries in `index.js` and note the placement/style used for other card toggles.

- [ ] **Step 2: Write the failing verification snippet**

Run:

```bash
node - <<'EOF'
const plugin = require('/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards/index.js')
for (const key of ['imageStory', 'imageStoryCatalog', 'imageWeather', 'imageMood']) {
  console.log(key, Object.prototype.hasOwnProperty.call(plugin.Config.dict, key))
}
EOF
```

Expected before implementation: one or more lines print `false`.

- [ ] **Step 3: Add the schema entries**

Add booleans with default `true` and Chinese descriptions:

```js
imageStory: Schema.boolean().default(true).description('是否为酒狐故事优先输出图片卡片'),
imageStoryCatalog: Schema.boolean().default(true).description('是否为酒狐故事目录优先输出图片卡片'),
imageWeather: Schema.boolean().default(true).description('是否为酒狐天气优先输出图片卡片'),
imageMood: Schema.boolean().default(true).description('是否为酒狐心情优先输出图片卡片'),
```

- [ ] **Step 4: Run the verification again**

Run the same Node snippet.
Expected after implementation: all four print `true`.

- [ ] **Step 5: Commit**

```bash
git add index.js
git commit -m "feat: add image flags for story, weather, and mood cards"
```

### Task 2: Add structured story and catalog APIs without breaking text APIs

**Files:**
- Modify: `/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards/lib/story.js`

- [ ] **Step 1: Write the failing smoke script**

Run:

```bash
node - <<'EOF'
const StorySystem = require('/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards/lib/story.js')
const story = new StorySystem('/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards/data', '/tmp', console)
console.log(typeof story.getRandomStoryData, typeof story.getCatalogData)
EOF
```

Expected before implementation: `undefined undefined`

- [ ] **Step 2: Add structured story methods**

Add methods that keep current text-returning methods untouched while introducing structured accessors such as:

```js
async getRandomStoryData() {
  return { title: '酒狐故事', category, text }
}

async getStoryDataByCategory(categoryName) {
  return { title: '酒狐故事', category, text }
}

getCatalogData() {
  return {
    title: '酒狐故事目录',
    storyCount: this.stories.length,
    categoryCount: this.categories.size,
    categories: Array.from(this.categories, ([name, stories]) => ({ name, count: stories.length }))
  }
}
```

Store enough info for renderers, but do not introduce pagination logic here.

- [ ] **Step 3: Preserve current behavior**

Ensure existing methods still return strings:
- `getRandomStory()` → string
- `getStoryByCategory()` → string/null
- `getCategoryList()` → string

- [ ] **Step 4: Run structured-data verification**

Run:

```bash
node - <<'EOF'
const StorySystem = require('/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards/lib/story.js')
;(async () => {
  const story = new StorySystem('/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards/data', '/tmp', console)
  const random = await story.getRandomStoryData()
  const catalog = story.getCatalogData()
  console.log(Boolean(random && random.text), Boolean(catalog && catalog.categories && catalog.categories.length > 0))
  console.log(typeof await story.getRandomStory(), typeof story.getCategoryList())
})()
EOF
```

Expected: `true true` then `string string`

- [ ] **Step 5: Commit**

```bash
git add lib/story.js
git commit -m "feat: expose structured story and catalog data"
```

## Chunk 2: Story pagination + renderers

### Task 3: Add deterministic story pagination helper and story card renderer

**Files:**
- Modify: `/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards/lib/card-renderer.js`

- [ ] **Step 1: Write the failing smoke script for pagination helpers**

Run:

```bash
node - <<'EOF'
const renderer = require('/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards/lib/card-renderer.js')
console.log(typeof renderer.renderStoryCards)
EOF
```

Expected before implementation: `undefined`

- [ ] **Step 2: Add page-splitting helper using character counts**

Implement a helper with deterministic rules:
- prefer splitting on paragraph boundaries (`\n`)
- if a paragraph exceeds page budget, hard-split by characters
- 1 page = normal font budget
- 2 pages = smaller font budget
- 3 pages = smallest font budget
- cap output at 3 pages
- append `（内容过长已截断）` to the final page if content remains

A suitable internal signature:

```js
function paginateStoryText(text) {
  return {
    pageCount,
    fontSizeLevel, // 1 | 2 | 3
    pages: ['...', '...']
  }
}
```

- [ ] **Step 3: Add `renderStoryCards()`**

Add:

```js
async function renderStoryCards(ctx, { data }) {
  // returns [segment.image(...), segment.image(...)] or equivalent array of rendered results
}
```

Each page should contain:
- title `酒狐故事`
- category subtitle if available
- page number `第 N/M 页`
- story body
- bottom hint `可使用「酒狐故事 <分类>」阅读指定分类故事`

- [ ] **Step 4: Export the new renderer**

Add `renderStoryCards` to `module.exports`.

- [ ] **Step 5: Run pagination + renderer verification**

Run:

```bash
node - <<'EOF'
const { renderStoryCards } = require('/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards/lib/card-renderer.js')
const ctx = { puppeteer: { render: (html) => html } }
;(async () => {
  const short = await renderStoryCards(ctx, { data: { category: '日常', text: '短故事。' } })
  const medium = await renderStoryCards(ctx, { data: { category: '日常', text: '第一段。\n\n' + '中'.repeat(500) } })
  const long = await renderStoryCards(ctx, { data: { category: '日常', text: '长'.repeat(5000) } })
  console.log(short.length >= 1 && short.length <= 3)
  console.log(medium.length >= 1 && medium.length <= 3)
  console.log(long.length === 3)
  console.log(long[2].includes('内容过长已截断') || long.join('').includes('内容过长已截断'))
})()
EOF
```

Expected: all lines print `true`.

- [ ] **Step 6: Commit**

```bash
git add lib/card-renderer.js
git commit -m "feat: add paginated story card renderer"
```

### Task 4: Add story catalog, weather, and mood renderers

**Files:**
- Modify: `/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards/lib/card-renderer.js`

- [ ] **Step 1: Define renderer entrypoints**

Add:
- `renderStoryCatalogCard(ctx, { data })`
- `renderWeatherCard(ctx, { data })`
- `renderMoodCard(ctx, { data })`

- [ ] **Step 2: Implement minimal renderers using existing visual shell**

Requirements:
- story catalog card: total counts + category list + bottom usage hint
- weather card: title + weather status + main body text
- mood card: title + mood name + description/body text

- [ ] **Step 3: Export the new renderers**

Add all three to `module.exports`.

- [ ] **Step 4: Run renderer smoke verification**

Run:

```bash
node - <<'EOF'
const { renderStoryCatalogCard, renderWeatherCard, renderMoodCard } = require('/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards/lib/card-renderer.js')
const ctx = { puppeteer: { render: (html) => ({
  catalog: html.includes('酒狐故事目录'),
  weather: html.includes('酒狐天气'),
  mood: html.includes('酒狐心情'),
}) } }
console.log({
  catalog: renderStoryCatalogCard(ctx, { data: { storyCount: 10, categoryCount: 2, categories: [{ name: '日常', count: 5 }] } }),
  weather: renderWeatherCard(ctx, { data: { title: '酒狐天气', status: '晴天', body: '今天是适合冒险的好天气。' } }),
  mood: renderMoodCard(ctx, { data: { title: '酒狐心情', mood: '开心', body: '酒狐今天心情很好。' } }),
})
EOF
```

Expected: the matching boolean is `true` for each renderer.

- [ ] **Step 5: Commit**

```bash
git add lib/card-renderer.js
git commit -m "feat: add catalog, weather, and mood card renderers"
```

## Chunk 3: Command wiring

### Task 5: Wire `酒狐故事` and `酒狐故事目录` to image-first output

**Files:**
- Modify: `/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards/index.js`
- Reference: `/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards/lib/story.js`
- Reference: `/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards/lib/card-renderer.js`

- [ ] **Step 1: Write the failing thought experiment / expected behavior**

Current behavior: both commands always return strings.
Target behavior:
- success + config enabled + Puppeteer available → image(s)
- render error → existing string output

- [ ] **Step 2: Wire `酒狐故事`**

Implementation requirements:
- obtain structured story data with category if category query is used
- keep existing string behavior as the fallback source of truth
- gate with `finalConfig.imageStory` and `hasPuppeteer(ctx)`
- on success return the array/result from `renderStoryCards`
- on render error log warning and return original text if `imageFallbackToText`

- [ ] **Step 3: Wire `酒狐故事目录`**

Implementation requirements:
- get catalog structured data from `story.getCatalogData()`
- gate with `finalConfig.imageStoryCatalog`
- on render error return `story.getCategoryList()` if fallback enabled

- [ ] **Step 4: Run module-load + stub verification**

Run a small Node script that requires `index.js`, confirms no syntax errors, and separately stubs renderers to ensure the image-first path can return an image payload.

- [ ] **Step 5: Commit**

```bash
git add index.js
 git commit -m "feat: add story and catalog card output"
```

### Task 6: Wire `酒狐天气` and `酒狐心情` to image-first output

**Files:**
- Modify: `/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards/index.js`
- Reference: `/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards/lib/weather.js`
- Reference: `/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards/lib/mood.js`
- Reference: `/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards/lib/card-renderer.js`

- [ ] **Step 1: Identify the smallest structured payloads needed**

Use existing text methods as source of truth. Derive minimal data payloads such as:

```js
{ title: '酒狐天气', status: '晴天', body: weather.getReport() }
{ title: '酒狐心情', mood: '开心', body: mood.getStatusText() }
```

If direct structured fields exist in weather/mood modules, prefer them.

- [ ] **Step 2: Wire `酒狐天气`**

Gate with `finalConfig.imageWeather` + `hasPuppeteer(ctx)`.
On render fail, log warning and return current text output if fallback is enabled.

- [ ] **Step 3: Wire `酒狐心情`**

Gate with `finalConfig.imageMood` + `hasPuppeteer(ctx)`.
On render fail, log warning and return current text output if fallback is enabled.

- [ ] **Step 4: Run module-load + renderer stub verification**

Run a Node script that requires `index.js` and separately exercises `renderWeatherCard`/`renderMoodCard` with stub Puppeteer.

- [ ] **Step 5: Commit**

```bash
git add index.js
 git commit -m "feat: add weather and mood card output"
```

## Chunk 4: Verification

### Task 7: Run final verification for story/weather/mood card support

**Files:**
- Verify: `index.js`, `lib/story.js`, `lib/card-renderer.js`

- [ ] **Step 1: Run module-load verification**

```bash
node - <<'EOF'
require('/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards/index.js')
require('/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards/lib/story.js')
require('/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards/lib/card-renderer.js')
console.log('module-load-ok')
EOF
```

Expected: `module-load-ok`

- [ ] **Step 2: Run combined renderer verification**

```bash
node - <<'EOF'
const { renderStoryCards, renderStoryCatalogCard, renderWeatherCard, renderMoodCard } = require('/app/WineFox-Daily/.worktrees/winefox-fortune-affinity-cards/lib/card-renderer.js')
const ctx = { puppeteer: { render: (html) => html } }
;(async () => {
  const story = await renderStoryCards(ctx, { data: { category: '日常', text: '测试故事' + '。'.repeat(800) } })
  const catalog = renderStoryCatalogCard(ctx, { data: { storyCount: 10, categoryCount: 3, categories: [{ name: '日常', count: 4 }] } })
  const weather = renderWeatherCard(ctx, { data: { title: '酒狐天气', status: '晴天', body: '天气正好。' } })
  const mood = renderMoodCard(ctx, { data: { title: '酒狐心情', mood: '开心', body: '今天很开心。' } })
  console.log(story.length >= 1 && story.length <= 3)
  console.log(catalog.includes('酒狐故事目录'))
  console.log(weather.includes('酒狐天气'))
  console.log(mood.includes('酒狐心情'))
})()
EOF
```

Expected: all lines print `true`.

- [ ] **Step 3: Review final diff**

```bash
git diff -- index.js lib/story.js lib/card-renderer.js
```

- [ ] **Step 4: Commit**

```bash
git add index.js lib/story.js lib/card-renderer.js
 git commit -m "test: verify story, weather, and mood card flows"
```
