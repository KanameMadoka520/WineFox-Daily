# 贡献指南 - 酒狐悄悄话增强版 v2.2

感谢你对酒狐悄悄话项目的关注！以下是参与贡献的指南。

---

## 如何贡献文案内容

v2.0 采用**代码与文案分离**架构。所有台词、语录、回复文案都存放在 `data/` 目录下的独立文件中，每个文件顶部都有详细的中文注释说明格式。**改文案不需要碰任何 `lib/` 里的代码。**

### 可编辑的数据文件一览

| 文件 | 内容 | 怎么改 |
|------|------|--------|
| `data/quotes.txt` | 主语录库 | 一行一条，`[分类名]` 标分类，`[RARE]` 标稀有 |
| `data/stories.txt` | 酒狐冒险日记（100篇） | 同上，但每段故事之间用空行分隔 |
| `data/poke_responses.js` | 戳一戳回复（50条） | JS 数组，增删字符串即可 |
| `data/keyword_triggers.js` | 群聊关键词冒泡表（30组） | 增删关键词、调 chance 概率 |
| `data/festival_quotes.js` | 节日专属语录（13节日各6条） | 按节日名添加语录数组 |
| `data/fortune_data.js` | 占卜数据（宜101/忌81/色85/方位40） | 增删条目丰富占卜结果 |
| `data/responses.js` | 统一台词库（互动每组20条/签91种） | 含升级台词、互动回复、猜拳台词、御神签 |
| `data/mood_decorators.js` | 心情修饰词（每种15前缀+15后缀） | 按心情类型增删前缀/后缀 |
| `data/weather_data.js` | 天气类型（15种各10条描述） | 可添加新天气或增加描述/评语 |

### 通过 QQ 机器人投稿语录（推荐）

在群聊中直接使用指令：

```
酒狐投稿 你想投稿的语录内容
```

管理员审核通过后，语录会自动入库。

### 通过编辑文件

1. 打开 `data/quotes.txt`
2. 在对应分类标记下添加新语录
3. 格式：`酒狐悄悄话: 你的语录内容`
4. 使用 `酒狐重载` 指令让机器人重新加载

### 语录编写规范

- 保持酒狐的人设：可爱、忠诚、有点傲娇、爱喝酒的狐狸女仆
- 语录开头统一使用 `酒狐悄悄话: ` 前缀
- 稀有语录在行尾加 `[RARE]` 或 `#rare` 标记
- 控制长度在 10-100 字之间为佳
- 避免包含敏感或不当内容
- 可以引用 Minecraft 或模组相关内容，增加代入感
- 如果是 Minecraft 服务器专属内容，可使用颜色代码（`&d`, `&f` 等）

---

## 如何贡献代码

### 项目结构

```
WineFox-Daily/
├── index.js              主入口，初始化和注册指令
├── runtime_config.js     运行时配置（带中文注释）
├── lib/                  功能模块（逻辑代码）
├── data/                 文案数据（台词/语录/回复，改文案在这里）
└── memory/               运行时存档（不要提交此目录的内容）
```

**核心原则：代码与文案分离。** `lib/` 只放逻辑，`data/` 只放文案内容。新功能涉及文案池的，必须把文案提取到 `data/` 下的独立文件中，通过 `require('../data/xxx')` 加载。

### 开发规范

1. **模块化**：新功能请在 `lib/` 下创建独立模块，然后在 `index.js` 中引入
2. **文案分离**：所有台词、回复、数据池放 `data/` 目录下独立 `.js` 文件，顶部写中文注释说明格式
3. **命名风格**：文件名使用 kebab-case，变量使用 camelCase
4. **日志**：使用 `ctx.logger('fox')` 输出日志，不要使用 `console.log`
5. **持久化**：需要保存数据的功能，将 JSON 文件存放到 `memory/` 目录
6. **配置项**：可调参数加入 `exports.Config` 的 Schema 定义 + `runtime_config.js`
7. **错误处理**：所有文件 I/O 操作都要 try-catch，不能让插件崩溃
8. **兼容性**：确保兼容 Koishi v4+。**配置项定义必须直接引入并使用 `koishi` 核心库导出的 `Schema` 对象**，严禁使用已弃用的 `ctx.schema`
9. **生命周期与并发安全（核心原则）**：
   - **启动读取必须同步**：涉及到插件启动时的数据初始化读取（如各种 `_load()` 方法），**必须使用同步方法**（如 `fs.readFileSync`）。严禁在类的构造函数中调用异步读取，以防出现竞态条件（Race Condition）导致数据加载完成前被新的群聊交互事件覆盖，造成本地存档永久丢失。
   - **运行时写入必须异步加锁**：任何运行时的文件写入/保存操作（如 `_save()`、`append()`），**必须保持异步并使用内置的 `withLock` 队列锁包裹**，绝对保证高并发群聊环境下的文件 I/O 安全与读写分离。

### 新模块开发模板

```javascript
// lib/新模块.js - 逻辑代码
const fs = require('fs')
const path = require('path')
const { withLock } = require('./io-lock')
const MY_DATA = require('../data/my-data')  // 文案从 data/ 加载

class NewSystem {
  constructor(memoryDir, logger, config = {}) {
    this.savePath = path.join(memoryDir, 'new-system.json')
    this.logger = logger || console
    this.config = { someOption: config.someOption ?? 默认值 }
    this.data = {}
    this._load()  // 必须同步！
  }

  _load() { /* fs.readFileSync 同步加载 */ }
  async _save() { /* withLock + fs.promises.writeFile 异步保存 */ }
}

module.exports = NewSystem
```

```javascript
// data/my-data.js - 文案内容
/**
 * 文件说明（中文注释）
 * 格式说明...
 */
module.exports = {
  // 文案内容
}
```

### 在 index.js 中接入

```javascript
// 1. 顶部 require 模块
const NewSystem = require('./lib/new-system')

// 2. 在 exports.apply 中初始化（传入 config）
const newSystem = new NewSystem(memoryDir, logger, {
  someOption: finalConfig.someOption,
})

// 3. 注册指令
ctx.command('酒狐xxx', '功能描述')
  .action(async ({ session }) => {
    return newSystem.doSomething(session.userId)
  })

// 4. 在 exports.Config Schema 中添加配置项
// 5. 在 runtime_config.js 中添加默认值和中文注释
// 6. 在「酒狐帮助」指令的输出中添加新指令条目
```

### 提交规范

```
feat: 新增XX功能
fix: 修复XX问题
docs: 更新文档
data: 新增/修改语录或台词
refactor: 重构XX模块
```

---

## 问题反馈

如果遇到 Bug 或有功能建议，请：

1. 先检查是否已有相同的问题
2. 提供复现步骤和错误日志
3. 说明你的 Koishi 版本和 Node.js 版本

---

## 许可

贡献的代码和语录将遵循本项目的 MIT 许可证。
