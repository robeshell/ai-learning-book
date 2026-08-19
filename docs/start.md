---
title: 怎么读这个站
description: 阅读顺序、文章体裁和写作约定。
---

# 怎么读这个站

这个站点按五季专题展开，对应同一套内容地图。每一季内部有章节，章节里的文章有前置关系。请按侧栏顺序读；跳读时先看文首的「先读」链接。

## 现在有什么

主路径只有一种体裁：概念长文（`type: concept`）。目标是把一个机制讲清楚：它是什么、怎么运转、边界在哪、常见误解是什么、和前后篇什么关系。

视频稿不是正文。长文要把机制讲清楚。事实笔记放在 `docs/_research/`，站点不发布这些文件。

## 以后会有什么

这些目录先留着，不进入顶栏：

- `papers/`：论文精读。满 3 篇再挂导航。
- `glossary/`：跨季术语。词条大约 20 个再挂导航。

体裁写在 frontmatter 的 `type` 里，不靠空栏目撑场面。

## 一篇文章的元数据

```yaml
title: 什么是大模型
description: 参数与结构、预训练与自回归、规模效应
series: understand-ai
chapter: foundation
order: 1
type: concept
articleStatus: draft
prerequisites: []
```

`articleStatus` 取值：

- `stub`：只有提纲，正文待写
- `outline`：已有研究提纲，可开始写正文
- `draft`：正文写作中
- `published`：可以当作成品阅读

导航和首页学习地图的数据源是 `docs/.vitepress/series.ts`。新增一篇文章时，先改这份目录，再补 Markdown。
