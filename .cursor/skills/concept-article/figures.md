# 配图

机制图必须用 fireworks-tech-graph 生成。氛围插画默认不做。

## Skill

先读 `.agents/skills/fireworks-tech-graph/SKILL.md`。

`SKILL_ROOT=.agents/skills/fireworks-tech-graph`

风格钉死 **Style 4 Notion Clean**。不要换 1–12 里的其他皮肤。

## 生成

1. 写结构到 `docs/public/figures/<id>/<slug>.json`，字段含 `"style": 4`。
2. 生成：

```bash
python3 "$SKILL_ROOT/scripts/generate-from-template.py" <type> \
  docs/public/figures/<id>/<slug>.svg \
  < docs/public/figures/<id>/<slug>.json
```

`<type>` 用 `architecture`、`flowchart`、`data-flow` 等 fireworks 模板名。

3. 校验：

```bash
bash "$SKILL_ROOT/scripts/validate-svg.sh" docs/public/figures/<id>/<slug>.svg
```

XML、marker、几何、组合预算必须通过。缺 cairosvg 时渲染检查会失败，先保证前几项通过。不要把缺中文字体的 PNG 当成品。站点引用 SVG。

4. 失败就改 JSON 重跑。禁止改回手写 SVG。

## 文本排版与尺寸安全（硬约束）

**图表上的所有文字严禁超出节点边框或画布本身。**

- **节点与文案长度匹配**：中文文本按每个汉字约 12–14px 估算。节点单行文案两端必须留有至少 30px 的安全内边距。
  - 例如宽 220–260px 的卡片节点，`sublabel` 请精炼在 12–15 个汉字以内，不要塞入整段长句。
  - 如需更多说明，调整节点宽度、拆分子标题或将说明写入正文与图注。
- **箭头与回路标签**：连线上的 `label` 必须简明扼要（3–8 字），避免与转折点或临近节点重叠。
- **节点间距与边距**：节点间距（`gap`）必须 $\ge 40\text{px}$，画布外边距 $\ge 48\text{px}$，以通过 composition quality 校验。
- **生成后复核**：SVG 生成后必须检查所有 `<text>` 元素的 `x` 坐标和字数，确认没有任何文本溢出边界。

## 正文引用

```html
<figure>
  <img src="/figures/<id>/<slug>.svg" alt="用一句话描述图里有什么" />
  <figcaption>这张图在证明的那句判断。</figcaption>
</figure>
```

`alt` 说图画了什么。`figcaption` 说它证明什么。

## 不要

- 不要把文字排到超出节点框或画布边缘。
- 不要照片、粘土插画、统计图冒充机制图。
- 不要把调研报告表格截图塞进正文。
- 不要无图注的装饰图。
- 不要在 fireworks 可用时手绘顶替。
