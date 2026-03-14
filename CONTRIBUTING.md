# 贡献指南 - 酒狐悄悄话增强版 v2.3

感谢你参与 WineFox-Daily 的维护与扩展。当前项目已经进入 **v2.3 主线**，核心业务、图片卡片和主题切换都已落地，因此贡献时请特别注意“规则一致性”和“图片层一致性”。

---

## 一、当前贡献重点

当前最适合贡献的方向：

- 扩充 `data/` 中的语录、故事、天气、问答、商店文案
- 继续补齐图片卡片或继续优化现有卡片比例
- 优化宿主联调体验和图片性能
- 修复业务逻辑与文案不一致的问题

当前不适合随意改动的方向：

- 擅自改动双货币规则
- 擅自改动 10 级好感曲线
- 擅自修改委托 event 名、装备 bonus 类型、图片主题 id

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
| `data/quiz_data.js` | 问答题库 | 注意答案索引正确 |
| `data/brewing_recipes.js` | 酿酒配方 | 文案应与狐狐券语义一致 |
| `data/shop_items.js` | 商店物品 | 改 bonus / effect 时要同步确认逻辑支持 |
| `data/commission_data.js` | 委托模板池 | `event` 名必须与代码中的事件上报一致 |
| `data/card_themes.js` | 图片主题定义 | 主题 id、name、alias 要保持稳定 |

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

建议每次改动后至少验证：

```bash
node test/phase3.test.js
node test/phase4.test.js
node test/phase5.test.js
node test/phase6.test.js
node test/phase7.test.js
node test/phase8.test.js
node test/ui-theme.test.js
```

如果你改了图片相关逻辑，还应在真实 Koishi 宿主里额外测试：

- `酒狐帮助`
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
