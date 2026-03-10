# WineFox Brewing Cards Design

**Date:** 2026-03-10
**Topic:** `酒狐酿酒` / `酒狐酒窖` / `酒狐开瓶` 图片化

## Goal

为酿酒系统的 3 个指令补充图片优先输出能力，在保留现有文字逻辑的前提下提升视觉表现，重点打造 `酒狐酒窖` 主卡，并为 `酒狐酿酒` / `酒狐开瓶` 提供中等精致的成功结果卡。

涉及指令：
- `酒狐酿酒`
- `酒狐酒窖`
- `酒狐开瓶`

## Scope

本批只覆盖以上 3 个指令。

明确不包含：
- 酒谱列表图片化
- 失败卡片
- 新增依赖库
- 动画效果

## Existing Context

当前项目已经形成统一模式：
- 数据模块负责结构化数据
- `lib/card-renderer.js` 负责图片卡片渲染
- `index.js` 负责命令接线、图片优先逻辑与 fallback

酿酒系统当前已有文字流程：
- `酒狐酿酒 [recipe]`
- `酒狐酒窖`
- `酒狐开瓶`

因此本批应继续沿用“结构化数据 + renderer + index 接线”的方式，而不是把大量视图逻辑塞回 `index.js`。

## Design Decisions

### 1) `酒狐酒窖`：主卡

这是本批最精致的卡片。

#### Visual Direction
采用 **上下双层混合面板**，并加入 **混合型 SVG**：

- 装饰型 SVG：酒瓶、木桶、酒架、狐尾/葡萄藤纹样
- 信息型 SVG：发酵进度、品质徽章、状态标签

#### Upper Section: 当前酿造主视图
展示：
- 酒名
- 当前发酵状态
- 发酵进度
- 剩余时间 / 是否可开瓶
- 预计品质 / 奖励提示

#### Lower Section: 混合摘要区
展示：
- 当前库存 / 可开瓶摘要
- 最近酿成记录或代表酒品
- 下一步建议

#### Empty State
当没有正在酿造或无库存时，仍输出一张“空状态酒窖卡”，而不是回到纯文字。

### 2) `酒狐酿酒`：中等精致成功结果卡

#### Role
用于酿造成功启动后的反馈卡。

#### Content
- 标题：酿酒开始 / 酿造成功启动
- 酒名 / 酒谱名
- 消耗信息（按现有逻辑实际可得字段）
- 小型 SVG（酒瓶 / 木桶 / 发酵启动图形）
- 下一步建议：`酒狐酒窖`
- 一句酒狐评价语

#### Failure Handling
失败保持现有文字输出，不做失败卡。

### 3) `酒狐开瓶`：中等精致成功结果卡

#### Role
用于成功开瓶时的反馈卡，强调“开奖感”。

#### Content
- 酒名
- 品质 / 奖励 / 效果
- 小型 SVG（开瓶、酒液、品质徽章）
- 下一步建议
- 一句酒狐评价语

#### Failure Handling
失败保持现有文字输出，不做失败卡。

## Architecture

采用 **方案 B**：`lib/brewing.js` 补结构化数据，`card-renderer.js` 负责渲染，`index.js` 只负责命令接线与 fallback。

### `lib/brewing.js`
新增或补充结构化数据方法，用于：
- 酒窖主卡数据
- 酿酒成功结果数据
- 开瓶成功结果数据

保留原有文字方法和返回语义，不破坏现有文本流程。

### `lib/card-renderer.js`
新增 renderer：
- `renderCellarCard`
- `renderBrewResultCard`
- `renderOpenBottleResultCard`

其中：
- `renderCellarCard` 负责主卡 + SVG 主视觉
- 另外两张卡保留更轻量的 SVG 结构

### `index.js`
为 3 个命令接入：
- 对应配置开关
- 图片优先逻辑
- 渲染异常 fallback 到原文字

## Data Requirements

酒窖主卡至少需要这些结构字段：
- `current`：当前酿造项（酒名、进度、剩余时间、是否可开瓶、预计品质等）
- `summary`：库存摘要 / 可开瓶数量 / 当前状态概览
- `recent`：最近酿成记录或代表条目

酿酒成功结果卡至少需要：
- `recipeName` / `brewName`
- `cost`
- `tips`
- `foxLine`

开瓶结果卡至少需要：
- `brewName`
- `quality`
- `reward`
- `effect`
- `foxLine`

## Config

新增布尔配置，默认 `true`：
- `imageCellar`
- `imageBrewResult`
- `imageOpenBottleResult`

## Fallback Rules

统一规则：
- 成功时：优先发图
- 失败时：保持文字
- 渲染失败时：自动回退文字

## Testing Strategy

- 模块加载检查：`index.js`、`lib/brewing.js`、`lib/card-renderer.js`
- 酒窖卡 renderer smoke test
- 酿酒结果卡 renderer smoke test
- 开瓶结果卡 renderer smoke test
- 命令接线 fallback smoke test
- 空状态酒窖卡 smoke test

## Acceptance Criteria

- `酒狐酒窖` 成功时可输出单张主卡，空状态也可发图
- `酒狐酿酒` 成功时可输出中等精致结果卡
- `酒狐开瓶` 成功时可输出中等精致结果卡
- 三者均支持渲染失败自动回退文字
- 失败场景维持现有纯文字逻辑
- 结构化数据逻辑主要位于 `lib/brewing.js`，`index.js` 不承载过多业务拼装
