# AGENTS.md

本仓库是 VitePress 站点「看懂人工智能」。五季、36 篇概念长文，按因果链阅读。

## 先读

写文章、改文章、补调研、配图时，读取并执行通用的 `.agents/skills/concept-article/SKILL.md`（或兼容路径 `.cursor/skills/concept-article/SKILL.md`）。

调研用 `.agents/skills/research/`，机制图用 `.agents/skills/fireworks-tech-graph/`（Style 4），去痕用 `.agents/skills/humanizer-zh/`，并受 `concept-article/voice.md` 约束。

不要凭训练记忆直接开写。目录以 `docs/.vitepress/series.ts` 为准，正文以对应 Markdown 为准。

## 本站是什么

- 体裁是概念长文，不是口播、不是论文综述、不是产品评测。
- 阅读顺序的第一篇是 `docs/series/understand-ai/large-model.md`。
- 导航、侧栏、首页地图只认 `docs/.vitepress/series.ts`。新增或改状态必须两边一起改。

## 禁止

- 不要把外部视频工程的 `research.md`、`script.md` 当底稿或对照粘贴。
- 不要把视频稿写进正文。
- 不要在 `docs/.vitepress/series.ts` 之外私自加篇目。
- 不要发明没有来源的数字、引语、产品行为。
- 不要改仓耳今楷的加载方式和标题用字，除非用户明确要求改字体。
- 不要引用没有可点击直达链接的论文/文献（正文必须带链接，文末必须附参考文献列表）。
- 不要生成文字超出节点边框或图表画布的机制配图（节点文字必须精炼并预留安全边距）。

## 文件落点

| 用途 | 路径 |
| --- | --- |
| 目录 | `docs/.vitepress/series.ts` |
| 正文 | `docs/series/<season>/<id>.md` |
| 事实笔记 | `docs/_research/<id>.md`（站点不发布） |
| 配图 | `docs/public/figures/<id>/` |
| 阅读约定 | `docs/start.md` |
| 色板 | `docs/.vitepress/theme/tokens.css` |

## 改代码时

主题、目录、组件只做任务要求的最小改动。文章写作走 skill，不要顺手重构主题。
