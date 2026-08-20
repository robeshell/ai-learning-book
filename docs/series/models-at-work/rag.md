---
title: "RAG 检索增强生成"
description: "外挂检索召回、知识注入与幻觉抑制基础闭环。"
series: models-at-work
chapter: retrieve
order: 1
type: concept
articleStatus: draft
prerequisites:
  - "hallucination"
  - "context-window"
videoSource: rag
---

# RAG 检索增强生成

大模型在完成训练后，其参数权重完全固化。在实际业务落地中，单体模型通常面临三个约束：
1. **知识时效性截止（Knowledge Cutoff）**：模型无法获知训练截止日期之后发生的新事件或新数据；
2. **私有领域数据隔离**：企业内部的业务规范、代码仓库与客户档案并未公开在互联网预训练语料中；
3. **事实准确性保障**：在面对高精度的专业查询时，纯概率生成容易出现统计幻觉。

通过微调（Fine-Tuning）将动态事实写入模型权重不仅更新周期长、显存与计算开销大，且无法提供可追溯的文档引用。

针对私有与动态知识的结合，工业界广泛采用的标准方案是 **RAG（Retrieval-Augmented Generation，检索增强生成）**。

<figure>
  <img src="/figures/rag/rag-triad-pipeline.svg" alt="RAG 检索增强生成全景流水线" />
  <figcaption>RAG 架构：索引构建、语义召回与窗口注入生成</figcaption>
</figure>

---

## 外部知识注入与开卷机制

如果将纯模型基于内部权重的问答比作“闭卷作答”；

那么 **RAG** 则类似于“开卷检索”：
- 系统为模型配置外部检索索引（如向量数据库或全文搜索引擎）；
- 用户发起提问时，检索系统先在外部知识库中召回与问题语义相关的候选片段；
- 将召回的真实文档片段作为 **参考依据（Grounding Context）** 组装到当前提示词中送入上下文窗口；
- 模型基于窗口内的参考材料进行提炼与生成，并附带引用来源。

<figure>
  <img src="/figures/rag/closed-vs-open-book.svg" alt="闭卷参数记忆与开卷 RAG 机制对比" />
  <figcaption>闭卷参数微调 vs 开卷 RAG：两种知识注入路径对比</figcaption>
</figure>

---

## RAG 系统的三阶段流程

2020 年，Meta 团队的 Lewis 等人在论文 [*Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks*](https://arxiv.org/abs/2005.11401) 中提出了 RAG 的经典三阶段架构：

### 1. 索引构建阶段（Indexing，离线处理）
- **文档解析与清洗**：解析 PDF、Word、Markdown 等格式，清洗排版与杂质文本；
- **文本切块（Chunking）**：将长文档切分为长度适中（如 300~500 字符）的独立文本块，通常保留部分滑动重叠（Overlap）以维持上下文连贯；
- **向量化嵌入（Embedding）**：调用文本嵌入模型将文本块转化为连续的高维稠密向量，存入向量数据库构建检索索引。

### 2. 检索召回阶段（Retrieval，在线实时）
- 用户提交查询（Query）后，系统调用相同的 Embedding 模型对提问进行向量化；
- 在向量索引中进行相似度计算（如余弦相似度），召回与查询语义最近的 Top-K 个候选文本块。

### 3. 增强生成阶段（Generation，推理输出）
- 将召回的参考材料与用户问题按预设模板拼装为结构化 Prompt：
  ```text
  你是一个专业助手。请严格根据以下提供的参考资料回答用户问题。
  若资料中未提及，请明确说明无法从材料中获知，严禁主观编造。
  
  【参考资料 1】：...
  【参考资料 2】：...
  
  用户问题：公司关于差旅住宿的报销标准是多少？
  ```
- 模型根据窗口内的具体事实生成解答，降低无依据的概率幻觉。

---

## 切块与检索中的常见问题

在基础 RAG 的落地过程中，常见以下工程挑战：

1. **切块粒度的权衡**：
   - **切块过大**：包含过多不相关信息，容易稀释语义匹配度，并占用上下文窗口预算；
   - **切块过小**：容易破坏语义完整性（如切断表格结构或割裂代词指代）；
2. **关键词与语义检索的差异**：向量检索侧重语义相近度，对特定专有名词、精确型号或错误码等硬匹配能力较弱；
3. **输入质量对生成的直接影响**：若检索模块召回了不相关或错误的文档，在强约束提示词下，模型容易顺沿错误材料生成偏差回答。

为改善上述问题，进阶方案通常会引入 **混合检索（Hybrid Search）、重排序（Rerank）与图谱检索（GraphRAG）** 等技术。

---

## 最小代码实现

以下代码演示了一个简易的内存 RAG 流程：包含词频向量构建、余弦相似度检索与上下文 Prompt 动态组装：

```python
import numpy as np

# 1. 模拟企业内部知识库文档库
documents = [
    {"id": "doc_1", "text": "员工出差住宿标准：一线城市（北上广深）每晚不超过 500 元，其他城市每晚不超过 350 元。"},
    {"id": "doc_2", "text": "员工年假规定：入职满 1 年享有 5 天带薪年假，满 3 年享有 10 天带薪年假。"},
    {"id": "doc_3", "text": "发票报销时限：所有因公消费发票必须在费用发生后 30 个自然日内提交审批系统。"},
    {"id": "doc_4", "text": "技术部团建预算：每人每季度享有 200 元团队建设活动经费。"}
]

# 2. 模拟微型文本特征字典
all_words = ["出差", "住宿", "标准", "年假", "发票", "报销", "时限", "团建", "预算", "500", "30"]
word2idx = {w: i for i, w in enumerate(all_words)}

def simple_embed(text: str) -> np.ndarray:
    """简易词频向量生成与 L2 归一化"""
    vec = np.zeros(len(all_words), dtype=float)
    for w in all_words:
        if w in text:
            vec[word2idx[w]] += 1.0
    norm = np.linalg.norm(vec)
    return vec / norm if norm > 0 else vec

# 3. 离线阶段：构建向量索引
doc_vectors = [simple_embed(doc["text"]) for doc in documents]

# 4. 在线阶段：用户提问检索
user_query = "去上海出差住宿可以报销多少钱？"
query_vec = simple_embed(user_query)

# 计算 Query 与所有文档的余弦相似度点积
scores = [np.dot(query_vec, d_vec) for d_vec in doc_vectors]
top_k_indices = np.argsort(scores)[::-1][:2]  # 召回 Top-2 片段

print("--- 在线检索召回结果 ---")
retrieved_chunks = []
for idx in top_k_indices:
    score = scores[idx]
    doc = documents[idx]
    print(f"召回文档 [{doc['id']}] (相似度得分: {score:.3f}): {doc['text']}")
    retrieved_chunks.append(doc["text"])

# 5. 生成阶段：组装 Grounding Prompt
context_str = "\n".join([f"- {chunk}" for chunk in retrieved_chunks])
grounded_prompt = f"""【系统设定】：你是一个严谨的行政助手。请严格根据下列提供的【参考依据】回答用户问题，不要编造。

【参考依据】：
{context_str}

【用户问题】：{user_query}
【助手回答】："""

print("\n--- 组装完成的注入 Prompt ---")
print(grounded_prompt)
```

**控制台输出：**
```text
--- 在线检索召回结果 ---
召回文档 [doc_1] (相似度得分: 0.577): 员工出差住宿标准：一线城市（北上广深）每晚不超过 500 元，其他城市每晚不超过 350 元。
召回文档 [doc_3] (相似度得分: 0.289): 发票报销时限：所有因公消费发票必须在费用发生后 30 个自然日内提交审批系统。

--- 组装完成的注入 Prompt ---
【系统设定】：你是一个严谨的行政助手。请严格根据下列提供的【参考依据】回答用户问题，不要编造。

【参考依据】：
- 员工出差住宿标准：一线城市（北上广深）每晚不超过 500 元，其他城市每晚不超过 350 元。
- 发票报销时限：所有因公消费发票必须在费用发生后 30 个自然日内提交审批系统。

【用户问题】：去上海出差住宿可以报销多少钱？
【助手回答】：
```

---

## 核心概念辨析

- **模型微调（Fine-Tuning） vs 检索增强（RAG）**：
  - 微调修改模型内部权重，适合调整格式规范与特定语言风格；
  - RAG 通过动态检索将外部依据注入上下文窗口，便于实时更新与事实追溯。
- **参数记忆 vs 工作记忆**：
  - 参数记忆在预训练与微调中固化在矩阵权重中；
  - 工作记忆是单次推理时上下文窗口中的临时依据，会话结束后显存被释放。
- **向量语义检索 vs 关键词匹配**：
  - 向量检索基于特征几何距离，支持近义词与模糊语义关联；
  - 关键词匹配依赖字面完全一致，擅长精确定位专用符号与编号。

在 RAG 流程中，文本是如何被转换为能够进行几何相似度计算的连续向量的？下一篇我们将探讨——《Embedding 向量嵌入》。

---

## 参考文献

1. Lewis, Patrick, Perez, Ethan, Piktus, Aleksandra, et al. (2020). [*Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks*](https://arxiv.org/abs/2005.11401). NeurIPS 2020 / arXiv:2005.11401.
2. Gao, Yunfan, Xiong, Yun, Gao, Xinyu, et al. (2023). [*Retrieval-Augmented Generation for Large Language Models: A Survey*](https://arxiv.org/abs/2312.10997). arXiv:2312.10997.
3. Barnett, Scott, Kourakis, Stefan, et al. (2024). [*Seven Failure Points in Retrieval-Augmented Generation Systems*](https://arxiv.org/abs/2401.05856). arXiv:2401.05856.
4. Karpukhin, Vladimir, Oguz, Barlas, Min, Sewon, et al. (2020). [*Dense Passage Retrieval for Open-Domain Question Answering (DPR)*](https://arxiv.org/abs/2004.04906). EMNLP 2020 / arXiv:2004.04906.
