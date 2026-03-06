# 交接文档 - 酒狐日常 v2.2

> **最后更新**: 2026-03-06
> **当前状态**: v2.2 全部开发工作已完成（代码审查+问题排查+数据扩充），仅剩实机测试
> **版本号**: 2.2.0

---

## 一、项目概况

**项目名称**: WineFox-Daily (酒狐日常，原名酒狐悄悄话 foxqqh)
**框架**: Koishi v4 + OneBot 协议
**语言**: Node.js (CommonJS)
**角色设定**: 酒狐 -- Minecraft 知名 OC，可爱、忠诚、有点傲娇、爱喝酒的狐狸女仆
**部署位置**: Koishi 项目的 `plugins/WineFox-Daily/` 目录
**项目作者 GitHub**: KanameMadoka520

---

## 二、架构核心原则

### 代码与文案分离

- `lib/` -- 只放逻辑代码，不硬编码任何台词/回复文案
- `data/` -- 只放文案数据，每个文件顶部有中文注释说明格式
- `memory/` -- 运行时持久化存档（自动生成，不提交到 git）
- `runtime_config.js` -- 统一配置文件（JS 格式，支持中文注释）

### 生命周期安全

- **启动时同步读取** (`fs.readFileSync`) -- 防止竞态条件
- **运行时异步写入** + `withLock` 加锁 -- 防止并发写入损坏
- **Schema 配置** 必须从 `require('koishi')` 的 `Schema` 导入

---

## 三、完整文件清单

### lib/ 功能模块（24个）

| 文件 | 功能 | 对应指令 |
|------|------|----------|
| `index.js` | 主入口，初始化子系统，注册全部指令 | 全部 |
| `lib/utils.js` | 工具函数：颜色清洗、时段判定、随机选取、概率判定 | - |
| `lib/io-lock.js` | 文件 IO 队列锁 | - |
| `lib/quotes-loader.js` | 语录加载器，解析 quotes.txt | - |
| `lib/time-aware.js` | 时间感知，按时段智能选取语录 | - |
| `lib/affinity.js` | 好感度系统(6级)，闲置衰减，图鉴，奖励/消费/回忆 | `酒狐好感` `酒狐图鉴` `酒狐改名` |
| `lib/daily.js` | 每日一句（同一天固定），避免近期重复 | `每日酒狐` |
| `lib/festival.js` | 节日检测（固定+农历粗略） | - |
| `lib/passive.js` | 戳一戳响应 + 关键词冒泡(带冷却) | - |
| `lib/submission.js` | 用户投稿 + 管理员审核 | `酒狐投稿` `酒狐审核` `酒狐通过` `酒狐拒绝` |
| `lib/search.js` | 搜索语录、分类浏览、总数 | `酒狐搜` `酒狐分类` `酒狐总数` |
| `lib/analytics.js` | ASCII 可视化好感度分布 | `酒狐统计` |
| `lib/fortune.js` | 占卜/每日运势（确定性哈希） | `酒狐占卜` |
| `lib/mood.js` | 心情系统（6种心情，修饰语录） | `酒狐心情` |
| `lib/games.js` | 小游戏（猜拳/猜数字/御神签），会话超时清理 | `酒狐猜拳` `酒狐猜数` `酒狐抽签` |
| `lib/story.js` | 故事/狐狸日记，支持分类浏览 | `酒狐故事` `酒狐故事目录` |
| `lib/achievements.js` | 成就系统（23项，含奖励好感） | `酒狐成就` |
| `lib/weather.js` | MC风格天气播报 | `酒狐天气` |
| `lib/favorites.js` | 语录收藏，支持删除 | `酒狐收藏` `酒狐收藏夹` `酒狐取消收藏` |
| `lib/interactions.js` | 好感互动(6种)，带1小时冷却 | `酒狐摸头` `酒狐拥抱` `酒狐告白` `酒狐喂酒` `酒狐挠耳朵` `酒狐牵手` |
| `lib/checkin.js` | **v2.2** 签到系统，连续加成，月度日历 | `酒狐签到` `酒狐签到日历` |
| `lib/memoir.js` | **v2.2** 回忆录，里程碑时间线 | `酒狐回忆` |
| `lib/quiz.js` | **v2.2** MC知识问答，30秒限时 | `酒狐问答` |
| `lib/brewing.js` | **v2.2** 酿酒系统，配方+品质 | `酒狐酿酒` `酒狐酒窖` `酒狐开瓶` |
| `lib/shop.js` | **v2.2** 商店背包，装备+消耗品 | `酒狐商店` `酒狐购买` `酒狐背包` `酒狐装备` `酒狐使用` |

### data/ 文案数据（12个）

| 文件 | 内容 | 格式 | 被谁加载 |
|------|------|------|----------|
| `quotes.txt` | 主语录库 | `[分类名]` + 一行一条 | `quotes-loader.js` |
| `stories.txt` | 酒狐冒险日记（100篇/9分类） | 同上，空行分段 | `story.js` |
| `poke_responses.js` | 戳一戳回复（50条） | JS 数组 | `passive.js` |
| `keyword_triggers.js` | 关键词冒泡表（30组） | `{ 关键词: { search, chance } }` | `passive.js` |
| `festival_quotes.js` | 节日语录（13节日各6条） | `{ 节日名: [语录] }` | `festival.js` |
| `fortune_data.js` | 占卜数据（宜101/忌81/色85/方位40） | 分类对象 | `fortune.js` |
| `responses.js` | 统一台词库（20组，含v2.2新互动/签到/回忆） | 分类对象 | 多个模块 |
| `mood_decorators.js` | 心情修饰词（6种心情各15前缀+15后缀） | `{ mood: { prefix, suffix } }` | `mood.js` |
| `weather_data.js` | 天气类型（15种各10条描述） | `[{ type, name, weight, ... }]` | `weather.js` |
| `quiz_data.js` | **v2.2** MC问答题库（4分类100题） | `{ 分类: [{ question, options, answer }] }` | `quiz.js` |
| `brewing_recipes.js` | **v2.2** 酿酒配方（14种酒） | `[{ name, materials, brewTimeMs, ... }]` | `brewing.js` |
| `shop_items.js` | **v2.2** 商店物品（9装备+9消耗品） | `[{ id, name, type, price, ... }]` | `shop.js` |

### memory/ 运行时存档（11个，自动生成）

| 文件 | 内容 |
|------|------|
| `affinity.json` | 好感度 `{ userId: { points, lastDate, dailyCount, customPrefix, unlockedRares, giftLog, firstMeet, milestones } }` |
| `daily.json` | 每日一句 `{ date, quote }` |
| `recent_history.json` | 近期抽取历史 |
| `pending_submissions.json` | 待审核投稿 |
| `achievements.json` | 成就 `{ userId: { unlocked, unlockedAt, stats } }` |
| `favorites.json` | 收藏 `{ userId: { quotes, lastReceived } }` |
| `story_history.json` | 故事阅读历史 |
| `checkin.json` | **v2.2** 签到 `{ userId: { dates, streak, maxStreak, totalDays } }` |
| `quiz.json` | **v2.2** 问答 `{ userId: { todayCount, todayDate, recentQuestions } }` |
| `brewing.json` | **v2.2** 酿酒 `{ userId: { brewing, finished, totalBrewed, bestQuality } }` |
| `inventory.json` | **v2.2** 背包 `{ userId: { items, equipped } }` |

### 配置文件

| 文件 | 说明 |
|------|------|
| `runtime_config.js` | 统一配置（23个参数，8个分区，带详细中文注释） |

加载优先级: `runtime_config.js` > `runtime_config.json`(兼容旧版) > Koishi 后台配置 > Schema 默认值

---

## 四、配置项一览（23个）

| 分区 | 参数 | 默认值 | 说明 |
|------|------|--------|------|
| 基础 | `timeAwareChance` | 0.6 | 时间感知概率 |
| 基础 | `enablePassiveKeyword` | true | 关键词冒泡开关 |
| 基础 | `passiveCooldown` | 600000 | 冷却时间(ms) |
| 基础 | `rareDropChance` | 0.05 | 稀有掉落概率 |
| 基础 | `dailyAffinityMax` | 20 | 每日好感上限 |
| 心情 | `enableMoodDecorate` | true | 心情修饰开关 |
| 心情 | `moodDecorateChance` | 0.4 | 修饰概率 |
| 游戏 | `rpsWinBonus` | 2 | 猜拳赢奖励 |
| 游戏 | `guessMaxAttempts` | 10 | 猜数最大次数 |
| 游戏 | `guessRange` | 100 | 猜数范围 |
| 互动 | `headpatLevel` | 3 | 摸头门槛 |
| 互动 | `hugLevel` | 4 | 拥抱门槛 |
| 互动 | `confessLevel` | 5 | 告白门槛 |
| 互动 | `feedDrinkLevel` | 2 | **v2.2** 喂酒门槛 |
| 互动 | `scratchEarLevel` | 3 | **v2.2** 挠耳朵门槛 |
| 互动 | `holdHandLevel` | 4 | **v2.2** 牵手门槛 |
| 送礼 | `giftDailyLimit` | 3 | 每日送礼次数 |
| 送礼 | `giftCostSender` | 1 | 送礼扣除 |
| 送礼 | `giftBonusReceiver` | 2 | 收礼获得 |
| 收藏 | `maxFavorites` | 50 | 收藏上限 |
| 收藏 | `favoritesPerPage` | 5 | 每页条数 |
| 签到 | `checkinBaseReward` | 3 | **v2.2** 签到基础奖励 |
| 签到 | `checkinStreakCap` | 7 | **v2.2** 连续签到加成上限 |

---

## 五、好感度等级定义

| level | name | minPoints | prefix |
|-------|------|-----------|--------|
| 0 | 陌生人 | 0 | 那个...你好， |
| 1 | 初识 | 10 | 嗯， |
| 2 | 熟人 | 30 | 主人， |
| 3 | 好朋友 | 80 | 主人~ |
| 4 | 挚友 | 150 | 亲爱的主人！ |
| 5 | 灵魂伴侣 | 300 | 最最最喜欢的主人❤ |

---

## 六、成就定义（23项）

### 原有成就（15项，v2.2 新增奖励好感）

| ID | 名称 | 条件 | 奖励 |
|----|------|------|------|
| first_meet | 初次见面 | 首次互动 | +5 |
| regular | 常客 | 累计互动50次 | +10 |
| drinking_buddy | 酒友 | 累计互动100次 | +20 |
| soulmate | 生死之交 | 累计互动500次 | +50 |
| quote_hunter_1 | 语录收藏家 | 收集5条稀有 | +10 |
| quote_hunter_2 | 语录猎人 | 收集10条稀有 | +25 |
| fortune_teller | 占卜师 | 使用占卜7次 | +10 |
| rps_beginner | 猜拳新手 | 猜拳赢5次 | +5 |
| rps_master | 猜拳王 | 猜拳赢20次 | +20 |
| guess_master | 数字大师 | 猜数赢5次 | +15 |
| streak_7 | 全勤奖(周) | 连续7天互动 | +15 |
| streak_30 | 全勤奖(月) | 连续30天互动 | +50 |
| story_lover | 故事迷 | 阅读10篇故事 | +10 |
| collector | 收藏达人 | 收藏10条语录 | +10 |
| generous | 慷慨之人 | 送礼10次 | +15 |

### v2.2 新增成就（8项）

| ID | 名称 | 条件 | 奖励 |
|----|------|------|------|
| checkin_7 | 周签到达人 | 累计签到7天 | +15 |
| checkin_30 | 月签到达人 | 累计签到30天 | +30 |
| checkin_100 | 百日之约 | 累计签到100天 | +100 |
| brewer_1 | 初次酿酒 | 首次酿酒成功 | +5 |
| brewer_10 | 酿酒师 | 酿酒10次 | +20 |
| legendary_brew | 传说佳酿 | 酿出传说品质 | +50 |
| quiz_10 | 学霸狐 | 答对10题 | +10 |
| quiz_streak_5 | 五连对 | 连续答对5题 | +15 |

---

## 七、版本历史

### v2.1 文案大扩充（已完成）

8个 data/ 文件全部扩充完毕。stories 16->100篇, responses 增至20组/91签, 天气6->15种等。

### v2.2 功能大更新（代码完成，已审查，待实机测试）

**A. 已有功能完善（5项）**
1. **A1 互动增强**: 加1小时冷却 + 新增喂酒/挠耳朵/牵手（含90条文案）
2. **A2 收藏夹删除**: 新增 `酒狐取消收藏 <编号>`
3. **A3 游戏会话清理**: 猜数字30分钟超时自动清理
4. **A4 故事分类浏览**: `酒狐故事 <分类>` + `酒狐故事目录`
5. **A5 成就奖励**: 全部23项成就解锁时发放好感度（不受每日上限限制）

**B. 新功能（5项）**
1. **B1 酒狐签到**: 每日签到+连续加成+月度ASCII日历
2. **B2 酒狐酿酒**: 14配方+5档品质+真实时间酿造
3. **B3 酒狐背包**: 商店购买(9装备+9消耗品)+装备效果+消耗品心情变化
4. **B4 酒狐问答**: MC知识4分类100题+30秒限时
5. **B5 酒狐回忆**: 初次相遇/升级里程碑/成就解锁时间线

---

## 八、待办事项（给下一次会话）

> **当前优先级**: 实机测试 -> 修复问题

### 已完成

1. **代码审查**: v2.2 全部模块已审查，Critical/Important 问题已修复
2. **潜在问题排查**: 4项全部排查完毕，结论如下：
   - `lib/quiz.js` vs 猜数字中间件 -- **无冲突**（正则不重叠 + 指令层互斥保护）
   - `lib/brewing.js` 好感扣除时序 -- **正确**（两阶段提交：验证→扣费→确认）
   - `lib/shop.js` `_save()` 调用时机 -- **正确**（同上两阶段提交模式）；已修复余额不足提示未显示当前好感度的问题
   - `lib/interactions.js` 冷却存内存 -- **可接受**（1小时冷却无需持久化，重启重置是合理的）
3. **题库扩充**: quiz_data.js 从 50题 扩充到 100题（4分类各25题）
4. **酿酒配方扩充**: brewing_recipes.js 从 8种 扩充到 14种，新增樱花清酒、雪域冰酿、蘑菇岛特酿、海洋之心酒、幽匿回响酒、紫水晶气泡酒，覆盖了极品~传说品质区间
5. **商店物品扩充**: shop_items.js 从 10件 扩充到 18件（装备5→9，消耗品5→9），新增手链/小眼镜/发簪/星光披风 + 南瓜派/唱片·猫/金苹果/迷之药水，价格梯度从5到50

### 待做

1. **实机测试**: 在 Koishi 环境中加载插件，验证所有新旧指令正常运行
2. **后续可选优化**:
   - 题库可继续扩充（当前100题）
   - 可根据玩家反馈调整商店物品价格和效果

### 不做

- 酒狐传话（消息代转）-- 明确不做
- 酒狐委托 -- 保持预留占位

---

## 九、快速启动指南（给下一次 Claude 会话）

当你看到这份文档时，请按以下流程操作：

1. **读取本文档** (`HANDOFF.md`) 了解全貌
2. **确认当前状态**: 查看第八节待办事项
3. **代码审查**: 重点检查 v2.2 五个新 lib 模块 + index.js 的指令注册（已完成）
4. **改文案**: 只改 `data/` 下的文件，不用动 `lib/`
5. **改配置**: 改 `runtime_config.js`（带中文注释）
6. **加新功能**: 遵循代码与文案分离原则，逻辑放 `lib/`，文案放 `data/`
7. **参考设计文档**: `DEVELOPMENT-PLAN-v2.2.md` 记录了详细设计
