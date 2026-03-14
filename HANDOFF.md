# 交接文档 - 酒狐日常 v2.3

> **最后更新**: 2026-03-14
> **当前状态**: v2.3 经济体系、图片卡片与主题切换已落地，待宿主环境联调与继续打磨
> **版本号**: 2.3.0

---

## 一、项目概况

**项目名称**: WineFox-Daily (酒狐日常，原名酒狐悄悄话 foxqqh)  
**框架**: Koishi v4 + OneBot 协议  
**语言**: Node.js (CommonJS)  
**角色设定**: 酒狐 -- Minecraft 知名 OC，可爱、忠诚、有点傲娇、爱喝酒的狐狸女仆  
**部署位置**: Koishi 项目的 `plugins/WineFox-Daily/` 目录  
**项目作者 GitHub**: KanameMadoka520

---

## 二、当前版本结论

当前主线代码已经不是“文档先行”的半成品，而是以下三条线已合流：

1. **v2.3 经济体系**
   - 10 级好感
   - 双货币（好感度 + 狐狐券）
   - 每日免费指令
   - 委托系统
   - 装备机制 bonus
   - 好感下降机制
   - 关键路径进度播报

2. **图片卡片输出**
   - 高信息密度指令优先输出图片
   - 统一回退为文字
   - 已统一加入后台诊断日志

3. **卡片主题切换**
   - 已支持 `酒狐UI`
   - 当前内置 3 套主题：
     - `奶油纸张`
     - `晴天玻璃`
     - `晨光咖啡馆`

---

## 三、架构核心原则

### 代码与文案分离

- `lib/` -- 只放逻辑代码，不硬编码任何台词/回复文案
- `data/` -- 只放文案数据和主题数据
- `memory/` -- 运行时持久化存档（自动生成，不提交到 git）
- `runtime_config.js` -- 统一配置文件（JS 格式，支持中文注释）

### 生命周期安全

- **启动时同步读取** (`fs.readFileSync`) -- 防止竞态条件
- **运行时异步写入** + `withLock` 加锁 -- 防止并发写入损坏
- **Schema 配置** 必须从 `require('koishi')` 的 `Schema` 导入

### 图片卡片约定

- 图片渲染入口统一在 `lib/card-renderer.js`
- 指令层统一通过 `renderImageFeature()` 处理：
  - 条件检查
  - 日志打印
  - 成功返回图片
  - 失败回退文字
- 主题通过 `lib/ui-theme.js` + `data/card_themes.js` 管理

---

## 四、目录现状

### 功能模块（`lib/` 28 个文件 + `index.js` 主入口）

| 文件 | 功能 | 备注 |
|------|------|------|
| `index.js` | 主入口，初始化子系统，注册全部指令 | 含图片诊断日志 |
| `lib/utils.js` | 工具函数 | 时段、随机、概率等 |
| `lib/io-lock.js` | 文件 IO 队列锁 | 所有运行时写入共用 |
| `lib/quotes-loader.js` | 语录加载器 | 现支持搜索元数据与分类统计 |
| `lib/time-aware.js` | 时间感知语录 | - |
| `lib/affinity.js` | 10级好感 + 双货币 | v2.3 核心 |
| `lib/daily.js` | 每日一句 | `每日酒狐` |
| `lib/daily-free.js` | 每日免费指令 | v2.3 |
| `lib/festival.js` | 节日检测 | - |
| `lib/passive.js` | 戳一戳 + 关键词冒泡 | 已修复 OneBot 事件问题 |
| `lib/submission.js` | 投稿与审核 | - |
| `lib/search.js` | 搜索 / 分类 / 总数 | 已支持图片卡片接线 |
| `lib/analytics.js` | 统计数据 | 已支持图片卡片接线 |
| `lib/fortune.js` | 占卜 | 已支持图片卡片接线 |
| `lib/mood.js` | 心情系统 | 已支持图片卡片接线 |
| `lib/games.js` | 猜拳 / 猜数 / 抽签 | 猜拳胜利卡已接入 |
| `lib/story.js` | 故事系统 | 支持分类、目录、结构化数据 |
| `lib/achievements.js` | 成就系统 | 支持结构化数据 |
| `lib/weather.js` | 天气播报 | 已支持图片卡片接线 |
| `lib/favorites.js` | 收藏夹 | 已支持结构化数据与图片卡片 |
| `lib/interactions.js` | 互动动作 | 冷却 + 骚扰惩罚 |
| `lib/checkin.js` | 签到 | 已支持结构化数据与图片卡片 |
| `lib/memoir.js` | 回忆录 | 已支持结构化数据与图片卡片 |
| `lib/quiz.js` | 问答 | - |
| `lib/brewing.js` | 酿酒系统 | 已支持结果卡 / 酒窖卡 |
| `lib/shop.js` | 商店与背包 | 已支持结构化数据与图片卡片 |
| `lib/commission.js` | 委托系统 | 已支持任务板卡片 |
| `lib/card-renderer.js` | 全部图片卡片渲染器 | 宽屏帮助 / 商店布局已优化 |
| `lib/ui-theme.js` | 卡片主题持久化 | `酒狐UI` |

### `data/` 数据文件（14 个）

| 文件 | 内容 |
|------|------|
| `quotes.txt` | 主语录库 |
| `stories.txt` | 故事库 |
| `poke_responses.js` | 戳一戳回复 |
| `keyword_triggers.js` | 关键词冒泡表 |
| `festival_quotes.js` | 节日语录 |
| `fortune_data.js` | 占卜数据 |
| `responses.js` | 统一台词库 |
| `mood_decorators.js` | 心情修饰词 |
| `weather_data.js` | 天气数据 |
| `quiz_data.js` | 问答题库 |
| `brewing_recipes.js` | 酿酒配方 |
| `shop_items.js` | 商店物品 |
| `commission_data.js` | 委托模板池 |
| `card_themes.js` | 图片卡片主题定义 |

### `memory/` 运行时存档（按需生成）

- `affinity.json`
- `daily.json`
- `recent_history.json`
- `pending_submissions.json`
- `achievements.json`
- `favorites.json`
- `story_history.json`
- `checkin.json`
- `quiz.json`
- `brewing.json`
- `inventory.json`
- `commission.json`
- `ui-theme.json`

---

## 五、当前指令状态

### 已实现命令（共 39 个）

- `酒狐`
- `每日酒狐`
- `酒狐好感`
- `酒狐图鉴`
- `酒狐搜`
- `酒狐分类`
- `酒狐总数`
- `酒狐统计`
- `酒狐投稿`
- `酒狐改名`
- `酒狐签到`
- `酒狐签到日历`
- `酒狐占卜`
- `酒狐心情`
- `酒狐猜拳`
- `酒狐猜数`
- `酒狐抽签`
- `酒狐故事`
- `酒狐故事目录`
- `酒狐问答`
- `酒狐酿酒`
- `酒狐酒窖`
- `酒狐开瓶`
- `酒狐商店`
- `酒狐购买`
- `酒狐背包`
- `酒狐装备`
- `酒狐使用`
- `酒狐回忆`
- `酒狐成就`
- `酒狐排行`
- `酒狐送礼`
- `酒狐收藏`
- `酒狐收藏夹`
- `酒狐取消收藏`
- `酒狐天气`
- `酒狐委托`
- `酒狐UI`
- 管理员：`酒狐审核` / `酒狐通过` / `酒狐拒绝` / `酒狐重载`

### `酒狐UI`

- 作用：查看或切换当前图片主题
- 权限：`authority >= 3`
- 当前支持：
  - `奶油纸张`
  - `晴天玻璃`
  - `晨光咖啡馆`

---

## 六、图片卡片覆盖范围

### 当前已接入图片优先输出的场景

- `酒狐帮助`
- `酒狐好感`
- `酒狐图鉴`
- `酒狐签到`
- `酒狐签到日历`
- `酒狐占卜`
- `酒狐心情`
- `酒狐故事`
- `酒狐故事目录`
- `酒狐酿酒`
- `酒狐酒窖`
- `酒狐开瓶`
- `酒狐商店`
- `酒狐购买`
- `酒狐背包`
- `酒狐装备`
- `酒狐使用`
- `酒狐回忆`
- `酒狐成就`
- `酒狐排行`
- `酒狐送礼`
- `酒狐天气`
- `酒狐委托`
- `酒狐收藏夹`
- `酒狐搜`
- `每日酒狐`
- `酒狐抽签`
- `酒狐分类`
- `酒狐总数`
- `酒狐猜拳` **仅胜利结果**

### 当前 UI 状态

- `酒狐帮助`：宽屏 4 列布局，社交区已拆分为两组，页脚通栏
- `酒狐商店`：宽屏 4 列商品布局，减少纵向高度
- 全局卡片已改为明亮浅色主题，不再使用旧深紫色调

---

## 七、配置项现状

当前 `exports.Config` 共 **55 项**：

- 基础：5 项
- 图片卡片：32 项
- 心情：2 项
- 游戏：3 项
- 互动：6 项
- 送礼：3 项
- 收藏：2 项
- 签到：2 项

说明：

- 图片相关开关都在 `index.js` 的 Schema 和 `runtime_config.js` 里同步维护
- `runtime_config.js` 说明已更新到 v2.3
- 插件已声明 `exports.inject = { optional: ['puppeteer'] }`，不会再因访问 `ctx.puppeteer` 报注入告警

---

## 八、测试现状

当前仓库自带测试文件：

- `test/phase3.test.js`
- `test/phase4.test.js`
- `test/phase5.test.js`
- `test/phase6.test.js`
- `test/phase7.test.js`
- `test/phase8.test.js`
- `test/ui-theme.test.js`

已覆盖内容包括：

- 好感下降与骚扰惩罚
- 每日免费指令
- 委托生成与奖励
- 装备 bonus
- 进度播报
- UI 主题解析与持久化
- 收藏夹分页
- 抽签结构化结果
- 搜索元数据
- 猜拳结果卡字段

---

## 九、当前待办事项

### 高优先级

1. **宿主环境实机联调**
   - 在真实 Koishi + OneBot + Puppeteer 环境里验证全部图片卡片
   - 重点看：
     - `酒狐帮助`
     - `酒狐商店`
     - `酒狐故事`
     - `酒狐委托`
     - `酒狐猜拳` 胜利卡
     - `酒狐UI` 主题切换

2. **继续优化图片比例**
   - 如果帮助 / 商店在手机 QQ 中仍偏高，可继续压缩版式
   - 目前已经是宽屏模式，但仍需宿主实际截图确认

3. **回填魔改 Puppeteer 插件源码**
   - 当前 `@shangxueink` 的 page pool 改动主要落在编译产物
   - 后续应同步到其 `src/index.ts`

### 中优先级

1. **补充更多结果卡**
   - `酒狐收藏`
   - `酒狐取消收藏`
   - `酒狐改名`
   - `酒狐投稿`

2. **继续细分卡片尺寸**
   - 让帮助卡、商店卡、故事卡分别采用不同宽度模板

### 长期项

1. **数据迁移**
   - 用户规模过大时，从 JSON 文件迁移到 Koishi 内置数据库

### 明确不做

- 酒狐传话（消息代转）

---

## 十、快速接手指南

1. 先读本文档和 `README.md`
2. 确认当前目标是“继续做功能”还是“宿主联调”
3. 如果要改图片：
   - 先看 `lib/card-renderer.js`
   - 再看 `index.js` 中 `renderImageFeature()` 的接线方式
4. 如果要改主题：
   - 看 `data/card_themes.js`
   - 看 `lib/ui-theme.js`
   - 用 `酒狐UI` 验证
5. 如果只改文案：
   - 只动 `data/`
6. 如果改配置：
   - `index.js` Schema
   - `runtime_config.js`
   两边一起改
