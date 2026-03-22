# 计划文档说明

本目录下的 `docs/plans/*.md` 主要用于保留各阶段的**历史设计记录**和分阶段实现思路。

这些文件的用途是：

- 追溯某一阶段为什么这样设计
- 回看当时拆解过哪些任务
- 为后续重构或复盘提供上下文

这些文件**不是当前主线现状文档**。  
如果你想确认 WineFox-Daily 的当前实现状态，请优先阅读：

1. [README.md](/app/WineFox-Daily/README.md)
2. [HANDOFF.md](/app/WineFox-Daily/HANDOFF.md)
3. [CONTRIBUTING.md](/app/WineFox-Daily/CONTRIBUTING.md)
4. 当前 `index.js`、`lib/`、`data/` 与 `test/` 代码本身

当前主线已经额外演进出了这些内容，而它们未必会完整回写到每一份历史计划文档中：

- 扩展语料库体系（`quotes_extra*.js`）
- 暖笺物语主题
- 循环季节系统
- 季节影响天气、主语录、每日酒狐、故事、占卜、心情
- 帮助 / 季节 / 天气 / 每日 / 占卜 / 心情 的统一状态头卡片风格

如果后续要继续写新计划，建议在文件开头明确写出：

- 创建日期
- 适用范围
- 是否为历史文档
- 与当前主线状态的差异
