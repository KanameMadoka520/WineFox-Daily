# 贡献指南 - 酒狐悄悄话增强版 v2.3.1

感谢你参与 WineFox-Daily 的维护与扩展。当前项目已经进入 **v2.3 主线**，核心业务、图片卡片、主题切换、扩展语料库和循环季节系统都已落地，因此贡献时请特别注意“规则一致性”和“图片层一致性”。

---

## 一、当前贡献重点

当前最适合贡献的方向：

- 扩充 `data/` 中的语录、故事、天气、问答、商店文案
- 继续补齐图片卡片或继续优化现有卡片比例
- 围绕季节系统继续补世界状态联动、卡片状态头和轻量运营玩法
- 优化宿主联调体验和图片性能
- 修复业务逻辑与文案不一致的问题

当前不适合随意改动的方向：

- 擅自改动双货币规则
- 擅自改动 10 级好感曲线
- 擅自修改委托 event 名、装备 bonus 类型、图片主题 id
- 擅自修改季节 id、主题 id、天气 type 这类会影响持久化和图片状态块的稳定标识

---

## 二、文案贡献

项目继续采用 **代码与文案分离**。

- `lib/` 只放逻辑
- `data/` 只放文案和数据
- 改文案通常不需要修改 `lib/`

### 可编辑的数据文件

| 文件 | 内容 | 注意事项 |
|------|------|----------|
| `data/quotes.txt` | 主语录库 | `[分类名]` 标分类，`[RARE]` 标稀有 |
| `data/stories.txt` | 故事库 | 故事之间用空行分隔 |
| `data/poke_responses.js` | 戳一戳回复 | 直接增删字符串 |
| `data/keyword_triggers.js` | 关键词冒泡表 | 改关键词时注意概率和 search 字段 |
| `data/festival_quotes.js` | 节日语录 | 节日名必须与逻辑一致 |
| `data/fortune_data.js` | 占卜数据 | 可继续丰富结果池 |
| `data/responses.js` | 统一台词库 | 含升级、互动、签到、结果卡文案等 |
| `data/mood_decorators.js` | 心情修饰词 | - |
| `data/weather_data.js` | 天气数据 | - |
| `data/season_data.js` | 季节定义 / 季节天气偏向 | 季节 `id` 与别名不要随意改 |
| `data/quiz_data.js` | 问答题库 | 注意答案索引正确 |
| `data/brewing_recipes.js` | 酿酒配方 | 文案应与狐狐券语义一致 |
| `data/shop_items.js` | 商店物品 | 改 bonus / effect / 图标含义时必须同步检查逻辑支持 |
| `data/commission_data.js` | 委托模板池 | `event` 名必须与代码中的事件上报一致 |
| `data/card_themes.js` | 图片主题定义 | 主题 id、name、alias 要保持稳定 |
| `data/quotes_extra*.js` | 扩展语料包 | 适合继续分专题扩写，不建议反复把内容塞回 `quotes.txt` |

### 语录编写规范

- 保持酒狐人设：可爱、忠诚、有点傲娇、爱喝酒的狐狸女仆
- 语录建议统一以 `酒狐悄悄话: ` 起头
- 稀有语录使用 `[RARE]` 或 `#rare`
- 控制长度在 10-100 字为宜
- 避免敏感或不当内容
- 如果文案涉及规则提示，必须先确认代码真实逻辑

### QQ 机器人投稿

推荐直接使用：

```text
酒狐投稿 你想投稿的语录内容
```

管理员审核通过后会自动入库。

---

## 三、代码贡献

### 项目结构

```
WineFox-Daily/
├── index.js
├── runtime_config.js
├── lib/
├── data/
├── memory/
└── test/
```

### 开发规则

1. 新功能逻辑放到 `lib/` 独立模块，不要堆到 `index.js`
2. 所有可编辑文案、数据池放到 `data/`
3. 文件名使用 kebab-case，变量使用 camelCase
4. 日志统一使用 `ctx.logger('fox')`
5. 需要持久化的数据放进 `memory/`
6. 可调参数必须同时更新：
   - `index.js` 中的 `exports.Config`
   - `runtime_config.js`
7. 所有运行时写入都要用 `withLock`
8. 启动阶段读取必须同步
9. 兼容 Koishi v4+，Schema 必须直接从 `require('koishi')` 导入
10. 新增/修改用户可见能力（指令、配置、行为）必须同步更新：
   - `README.md`（指令表/用法/说明）
   - `CONTRIBUTING.md`（如影响贡献约定或新增维护工具）
   - 必要时更新 `HANDOFF.md`（交接与当前状态）
   - 必要时补充/更新 `test/*.test.js`
11. 涉及“敏感运维/高风险写操作”的指令（例如存档恢复、查询他人账本）必须额外校验 `opsAdminIds`：
    - 不能只依赖 Koishi `authority`
    - `opsAdminIds` 为空时应拒绝执行并给出配置提示
    - 建议将该类指令的 `authority` 设为 `0`，确保权限只由 `opsAdminIds` 控制（避免不同宿主的 authority 配置差异导致误放行）

### 图片卡片相关约定

当前图片卡片统一遵循：

- 渲染器全部放在 `lib/card-renderer.js`
- 指令接线统一通过 `renderImageFeature()`
- 图片失败自动回退文字
- 后台要保留条件检查 / 渲染开始 / 渲染成功 / 回退原因日志

如果你新增图片卡片，建议遵循下面步骤：

1. 在 `lib/对应模块.js` 中补结构化数据接口
2. 在 `lib/card-renderer.js` 中新增 renderer
3. 在 `index.js` 中通过 `renderImageFeature()` 接线
4. 在 `exports.Config` 和 `runtime_config.js` 中补对应 `imageXxx` 开关
5. 若需要，补测试到 `test/phase8.test.js` 或新测试文件

### 缓存与运维工具约定（v2.3.1+）

项目新增了以下“性能/运维”工具（默认都尽量不改变现状）：

- 图片渲染缓存（RenderCache）：用于帮助/分类/总数/故事目录等低变化卡片的重复渲染加速
  - 开关：`imageCacheEnabled`
  - 清理指令（管理员）：`酒狐缓存清理`
  - 注意：该缓存是 **内存缓存**，不应与 `memory/*.json` 业务存档混淆
- 图片渲染统计（RenderMetricsBuffer）：用于追踪渲染耗时/失败原因/缓存命中率
  - 指令（管理员）：`酒狐渲染统计` / `酒狐渲染诊断`
  - 注意：统计为 **仅内存** 环形缓冲区，重启后会清空
- 高频 IO 防抖：`ioDebounceMs`（目前主要用于历史记录类存档，减少磁盘写入）
- 玩家存档备份（player_backups）：用于备份/恢复“玩家数据相关存档”
  - 目录：`WineFox-Daily/player_backups/`（已加入 `.gitignore`）
  - 恢复指令必须强制二次确认（例如 `-f`），并在输出中明确提示“恢复后需重启插件/Koishi”

如新增新的缓存层（例如更复杂的渲染缓存或持久化缓存），必须：

1. 写清楚“缓存的对象是什么 / 是否持久化 / 失效策略”
2. 提供诊断或清理入口（至少管理员指令）
3. 在 `README.md` 中明确说明“清理会影响什么 / 不会影响什么”

### 季节系统约定

当前季节系统已经是主线能力的一部分，不再只是单独的“展示型指令”。

- 季节定义：`data/season_data.js`
- 状态存档：`memory/season-cycle.json`
- 核心逻辑：`lib/season.js`
- 影响范围：
  - `酒狐天气`
  - `酒狐`
  - `每日酒狐`
  - `酒狐故事`
  - `酒狐占卜`
  - `酒狐心情`
  - `酒狐帮助` / `酒狐季节` / `酒狐天气` 等卡片状态头

如果你继续扩季节系统，请至少同步检查：

1. 是否需要补 `README.md`
2. 是否需要补 `HANDOFF.md`
3. 是否需要补对应测试
4. 是否会影响 `酒狐季节状态` / `酒狐季节设置` / `酒狐季节周期` / `酒狐季节恢复自动`

### 商店与图标约定

商店系统当前不仅有文案和价格，还有统一的 SVG 图标和效果接线：

- 商品数据源：`data/shop_items.js`
- 商店逻辑：`lib/shop.js`
- 图标与商店卡渲染：`lib/card-renderer.js`
- 高信息量效果接线：`index.js`

如果你新增商品，请至少同步检查：

1. 是否已有可复用的 `bonus.type` 或 `effect`
2. 若新增 `effect`，是否已在 `酒狐使用` 路由里真正落地
3. 是否已在 `lib/card-renderer.js` 的商品图标规格表中补图标
4. 是否需要补测试（例如商品数量、效果持久化、图标覆盖）

### 主题系统约定

主题相关逻辑当前分三层：

- `data/card_themes.js`：主题定义
- `lib/ui-theme.js`：当前主题持久化
- `lib/card-renderer.js`：读取当前主题变量并渲染

如果你新增主题：

1. 在 `data/card_themes.js` 增加一个主题对象
2. 保持唯一 `id`
3. 提供 `name`、`aliases`、`description`
4. 只改 CSS 变量，不要在 renderer 中写主题分支

---

## 四、测试与验证

当前仓库内已有这些测试：

- `test/phase3.test.js`
- `test/phase4.test.js`
- `test/phase5.test.js`
- `test/phase6.test.js`
- `test/phase7.test.js`
- `test/phase8.test.js`
- `test/ui-theme.test.js`
- `test/season-cycle.test.js`
- `test/weather-season.test.js`
- `test/seasonal-content.test.js`
- `test/season-fortune-mood.test.js`

建议每次改动后至少验证：

```bash
node test/phase3.test.js
node test/phase4.test.js
node test/phase5.test.js
node test/phase6.test.js
node test/phase7.test.js
node test/phase8.test.js
node test/ui-theme.test.js
node test/season-cycle.test.js
node test/weather-season.test.js
node test/seasonal-content.test.js
node test/season-fortune-mood.test.js
```

如果你改了图片相关逻辑，还应在真实 Koishi 宿主里额外测试：

- `酒狐帮助`
- `酒狐季节`
- `酒狐天气`
- `酒狐商店`
- `酒狐故事`
- `酒狐委托`
- `酒狐UI`

---

## 五、依赖与仓库卫生

- `memory/` 不提交
- `node_modules/` 不提交
- 插件目录里的 `package-lock.json` 也不作为仓库必需文件

说明：

- 本插件代码里只直接依赖 `koishi`
- 正常部署时使用宿主 Koishi 项目的依赖即可
- 插件目录里若出现 `node_modules/` 或 `package-lock.json`，通常是本地安装残留

---

## 六、提交建议

建议使用下列前缀：

```text
feat: 新增功能
fix: 修复问题
docs: 更新文档
data: 更新文案或数据池
style: 调整图片卡片或展示样式
refactor: 重构逻辑
chore: 维护性改动
```

---

## 七、问题反馈

提交问题时建议附带：

1. 复现步骤
2. 后台日志
3. Koishi 版本和 Node.js 版本
4. 若与图片有关，附带 `Puppeteer 服务可用` 和 `回退原因` 日志

---

## 八、许可证

贡献的代码和语录遵循本项目的 [MIT License](./LICENSE)。
