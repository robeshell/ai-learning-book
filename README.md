# 看懂人工智能

按五季因果链编写的 AI 学习笔记，用 VitePress 生成静态站点。正文按概念长文写。

## 本地运行

需要 Node.js 20 或更高版本。

```bash
npm install
npm run dev
```

默认地址：`http://localhost:5173/`。

```bash
npm run build
npm run preview
```

## 目录

```text
docs/
  index.md                 学习地图
  start.md                 阅读与写作约定
  series/<season>/         五季概念长文
  papers/                  论文精读（暂不进导航）
  glossary/                术语表（暂不进导航）
  .vitepress/
    series.ts              专题目录，导航和首页的唯一数据源
    config.ts
    theme/
```

## 写作

流程见 `AGENTS.md` 与 `.agents/skills/concept-article/SKILL.md`（或 `.cursor/skills/concept-article/SKILL.md`）。

1. 在 `docs/.vitepress/series.ts` 锁定篇目。
2. 独立调研，写入 `docs/_research/<id>.md`。
3. 正文写 1500–3000 字概念长文，配图放 `docs/public/figures/<id>/`。
4. 同步 frontmatter 与目录里的 `articleStatus`。

标题字体是仓耳今楷 02，按个人非商用使用。以后若接广告、卖内容或给公司用，需要向 [仓耳](https://tsanger.cn) 购买商用授权。
