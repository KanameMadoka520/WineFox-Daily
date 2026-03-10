# WineFox Story, Weather, and Mood Cards Design

**Date:** 2026-03-10
**Topic:** `酒狐故事` / `酒狐故事目录` / `酒狐天气` / `酒狐心情` 图片化

## Goal

为 4 个现有指令补充图片优先输出能力，并保持统一的失败回退策略：默认优先发图，渲染失败自动回退到当前文字结果。

涉及指令：
- `酒狐故事`
- `酒狐故事目录`
- `酒狐天气`
- `酒狐心情`

## Existing Context

当前实现中，这 4 个指令都主要返回纯文本：
- `酒狐故事`：从 `lib/story.js` 获取随机故事或分类故事文本
- `酒狐故事目录`：从 `lib/story.js` 返回目录文本
- `酒狐天气`：从 `lib/weather.js` 返回天气播报文本
- `酒狐心情`：从 `lib/mood.js` 返回心情状态文本

现有项目已经具备：
- `lib/card-renderer.js`：统一卡片渲染入口
- `hasPuppeteer(ctx)`：检测是否可发图
- `imageFallbackToText`：图片失败时回退文字
- 多个图片卡片先例（运势、好感、商店、背包、帮助、成就等）

因此本批应延续相同模式，而不是另起新体系。

## Design Decisions

### 1) 酒狐故事：日记 / 章节卡

这是本批最精致的卡片。

#### Layout
- 标题：`酒狐故事`
- 副标题：分类名（若有）+ 页码信息
- 正文：故事内容
- 页脚：提示可继续使用 `酒狐故事 <分类>`

#### Pagination Rule
采用方案 A：**按字符数分页 + 页数决定字号**。

具体规则：
- 优先按段落 / 换行切分
- 当单段过长时允许按字符数硬切
- 先尝试单页容量
- 超出则拆为 2 页并减小字号
- 仍超出则拆为 3 页并再次减小字号
- 最多输出 3 张图
- 若 3 张仍放不下，则最后一张末尾追加：`（内容过长已截断）`

#### Output Rule
- 1~3 张图片，按顺序依次发送
- 每页带 `第 N/M 页`

#### Structured Data Requirement
`lib/story.js` 需要增加结构化输出能力，用于：
- 获取故事正文
- 获取故事分类
- 获取目录统计
- 为 renderer 提供可分页的原始正文

不要求在 `story.js` 中真正渲染分页 HTML，但需要提供足够结构给 `index.js` / `card-renderer.js` 使用。

### 2) 酒狐故事目录：单页目录卡

#### Layout
- 标题：`酒狐故事目录`
- 摘要：故事总数、分类总数
- 列表：分类名 + 篇数
- 底部提示：`使用「酒狐故事 <分类名>」阅读指定分类的故事`

#### Rule
- 单张图片
- 分类过多时截断显示，不做多页
- 文字回退仍使用现有目录文本

### 3) 酒狐天气：单页天气播报卡

#### Layout
- 标题：`酒狐天气`
- 主状态：当前天气
- 正文：天气播报描述
- 语气化展示：保留酒狐风格文案

#### Rule
- 单张图片
- 若 `lib/weather.js` 已有结构化字段则直接使用
- 若当前主要是纯文本，则从现有结果提炼最小结构，避免过度重构

### 4) 酒狐心情：单页角色状态卡

#### Layout
- 标题：`酒狐心情`
- 当前心情名
- 状态描述
- 一句酒狐状态话语

#### Rule
- 单张图片
- 偏角色陪伴感，不做分页
- 回退继续使用当前文字输出

## Integration Plan

### `lib/story.js`
补充结构化方法，例如：
- 获取随机故事结构体
- 获取分类故事结构体
- 获取目录结构体

结构至少应包含：
- `text`
- `category`
- `storyCount`
- `categoryCount`
- `categories[]`

### `lib/card-renderer.js`
新增 renderer：
- 故事卡（支持多页）
- 故事目录卡
- 天气卡
- 心情卡

故事卡 renderer 需要支持：
- 不同页数字号
- 页码展示
- 截断提示

### `index.js`
为以下命令增加图片优先逻辑：
- `酒狐故事`
- `酒狐故事目录`
- `酒狐天气`
- `酒狐心情`

统一 gate：
- 对应配置开关为 `true`
- `hasPuppeteer(ctx)` 为真

统一 fallback：
- 渲染异常时记录日志
- `imageFallbackToText` 为真时回退原文字
- 否则返回固定失败提示

### Config
新增布尔配置，默认 `true`：
- `imageStory`
- `imageStoryCatalog`
- `imageWeather`
- `imageMood`

## Non-Goals

本批不做：
- 渲染高度测量式分页
- 故事目录多页
- 新依赖引入
- 对原有文字文案的大改写
- 对故事内容源文件格式的大改造

## Testing Strategy

- 模块加载检查：确保修改后 `index.js`、`lib/story.js`、`lib/card-renderer.js` 可正常加载
- Story pagination smoke test：验证短故事 1 页、中长故事 2~3 页、超长故事最多 3 页并带截断文案
- Renderer smoke test：stub `ctx.puppeteer.render`，确认 4 类 renderer 都能输出
- Fallback smoke test：模拟渲染抛错，确认命令层回退到原文字

## Acceptance Criteria

- `酒狐故事` 成功时可输出 1~3 张图片，最多 3 张
- 长故事按字符数分页，并随页数缩小字号
- 3 张仍超长时最后一页有截断提示
- `酒狐故事目录`、`酒狐天气`、`酒狐心情` 成功时各输出单页图片
- 4 个命令全部支持图片失败自动回退文字
- 不影响现有文字逻辑的正常使用
