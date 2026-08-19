---
name: concept-article
description: 为本站撰写或改稿概念长文。覆盖独立调研、1500–3000 字正文、机制配图、去痕和目录状态。用户提到写文章、下一篇、正文、调研、配图、draft、published、概念长文时使用。
---

# 概念长文

范本是 `docs/series/understand-ai/large-model.md` 与 `docs/_research/large-model.md`。新篇对齐它们的结构，不对齐外部视频稿。

## 何时读哪份

- 调研方法 → `.agents/skills/research/SKILL.md`（缺项再读 `research-add-items`、`research-add-fields`、`research-deep`）
- 配图 → `.agents/skills/fireworks-tech-graph/SKILL.md` 与 [figures.md](figures.md)
- 去痕 → `.agents/skills/humanizer-zh/SKILL.md` 与 [voice.md](voice.md)
- 事实笔记模板 → [research-template.md](research-template.md)

三套外部 skill 都已装进仓库。写文章时必须真的读、真的跑，不要用手写 SVG 或凭记忆去痕代替。

## 流程

按顺序做。不要跳过调研直接写正文。

```
- [ ] 1. 锁定篇目
- [ ] 2. 调研（research skill）
- [ ] 3. 标图
- [ ] 4. 写正文
- [ ] 5. 出图（fireworks Style 4）
- [ ] 6. 去痕（humanizer-zh）
- [ ] 7. 同步状态
```

### 1. 锁定篇目

打开 `docs/.vitepress/series.ts`，记下 `id`、`title`、`points`、`prerequisites`、前后篇。

`points` 是本篇必须讲清的命题。正文覆盖它们，不提前写后篇的机制。

第一篇是 `large-model`。不要把 Token 当第一篇。

### 2. 调研

先读 `.agents/skills/research/SKILL.md`。

概念长文不是竞品矩阵。把本篇当成 **一个 item**，字段用 [research-template.md](research-template.md) 里的栏目：定义、机制、数字与来源、误解、上下篇关系。按 research skill 做公开检索，核来源。不要把 `research-report` 的 Markdown 贴进 VitePress。

产出只有一份：`docs/_research/<id>.md`。列不出定义、机制、至少一处可核来源（带可点击 URL），就不要开写长文。

禁止读取外部视频工程的 `research.md`、`script.md`。未公开的参数量不要写进正文。

对照表、多对象评测才升级到 `research-add-items` / `research-deep`。概念文默认不跑完整 HITL 矩阵。

### 3. 标图

对照 `points` 和将要出现的 `##` 小节，每节标：

- `fireworks` 机制、分层、流程（默认）
- `none` 纯分界或收束段

每篇 2–5 张机制图。图注必须能证明正文里的一句判断。证不了就删图。
文案长度与排版必须严格适配节点尺寸，节点文字单行必须预留足够内边距，严禁文字超出节点边缘。

### 4. 写正文

路径：`docs/series/<season>/<id>.md`。

篇幅：汉字约 1500–3000。frontmatter 与 `series.ts` 字段一致。

结构固定：

1. 开篇定义（它是什么，常见叫法会怎样走偏）
2. 机制展开（一节一个机制，节内配图）
3. 边界或分层（它不是什么，和相邻对象差在哪）
4. 收束（读到这里该能分清什么，下一篇接什么）
5. 参考文献（文末列出正文引用的所有一手文献，每条都必须带可点击链接）

讲解与表达硬约束：
- **生动案例**：每一核心机制必须提供直观的生活化/语言学具体案例（如上下文补全对比、代词指代消解例子、问答场景对比），杜绝纯晦涩名词堆叠。
- **精简代码卡片**：在核心机制处配备精炼代码卡片（5–15 行 Python / PyTorch 最小原型或伪代码），直观呈现张量形状变换与算法内核，辅助程序员与技术读者快速建立心智模型。
- **一手文献链接**：正文中凡提及论文、一手文献、官方报告，必须使用 Markdown 链接嵌入直达地址（如 arXiv 或官方页面）。
- **语气与立场**：读 [voice.md](voice.md)。说话位置是查过材料、能把机制讲清楚的人，不是第一人称随笔。

### 5. 出图

必须走 fireworks。读 `.agents/skills/fireworks-tech-graph/SKILL.md` 与 [figures.md](figures.md)。

1. 写 `docs/public/figures/<id>/<slug>.json`（`style: 4`）
2. 精炼节点与箭头文案，确保任何单行文字宽度不超出节点边框（每个汉字约 12–14px，节点左右预留至少 30px 安全内边距）。
3. `python3 .agents/skills/fireworks-tech-graph/scripts/generate-from-template.py <type> <out.svg> < <slug>.json`
4. `bash .agents/skills/fireworks-tech-graph/scripts/validate-svg.sh <out.svg>`
5. 几何、组合校验以及文字排版必须通过。检查 SVG 中所有 `<text>` 元素，确保没有文字超出图表或节点边框。cairosvg 缺中文字体时 PNG 会出方框，站点以 SVG 为准，不要把缺字 PNG 当成品。

禁止用手写 SVG 顶替。fireworks 校验失败或文字溢出时，精炼文案或调整尺寸重跑，不要改回手绘。

### 6. 去痕

读 `.agents/skills/humanizer-zh/SKILL.md`，按 24 条改稿。再读 [voice.md](voice.md)：去掉模型腔，**不要**改成第一人称随笔。说明文语气优先于 Humanizer 的「注入灵魂」示例。

### 7. 同步状态

两处一起改 `articleStatus`：

- 正文 frontmatter
- `docs/.vitepress/series.ts`

取值：`stub` 占位 → `outline` 有提纲 → `draft` 正文写作中 → `published` 可当成品。写完初稿至少是 `draft`。不要在用户未确认前标 `published`。

## 一篇只做一篇

不要顺手写下一篇，不要改主题和字体，不要把后篇机制提前讲完。点到「下一篇会讲」即可。
