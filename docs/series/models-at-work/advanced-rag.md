---
title: "高阶 RAG 与图谱检索"
description: "分块优化、多路召回、重排序（Rerank）与上下文压缩。"
series: models-at-work
chapter: retrieve
order: 3
type: concept
articleStatus: draft
prerequisites:
  - "rag"
  - "embeddings"
videoSource: advanced-rag
---

# 高阶 RAG 与图谱检索

基础的向量检索 RAG（Naive RAG）能够处理常规的事实查询。但在处理复杂的真实业务文档时，容易遇到以下三类典型问题：

1. **结构化信息被切断**：固定长度的机械分块（Chunking）容易将表格的表头与数值拆分到不同块中，导致语义失真；
2. **专有名词与精确代号漏检**：向量检索侧重于模糊语义相似度，对特定错误码、零件型号或法律条款等精确字符的匹配能力有限；
3. **跨文档全局归纳困难**：当用户提出“总结全库所有项目的技术演进趋势”这类宏观问题时，单个切块无法覆盖全景，纯局部检索难以生成全局视角的摘要。

为了应对这些挑战，进阶 RAG 体系引入了 **混合检索（Hybrid Search）、重排序（Reranker）与知识图谱检索（GraphRAG）** 等技术。

<figure>
  <img src="/figures/advanced-rag/hybrid-search-rerank.svg" alt="多路混合检索与重排序全流程" />
  <figcaption>多路召回、RRF 融合与重排模型精筛全流程</figcaption>
</figure>

---

## 混合检索与 RRF 倒数排名融合

为了兼顾语义模糊泛化与精确专有名词匹配，现代检索系统通常采用 **双路混合召回（Hybrid Search）**：
- **稠密向量路（Dense Retrieval / Embedding）**：负责捕捉同义词、上下文语义关联，召回候选集；
- **稀疏字面路（Sparse Retrieval / BM25）**：负责精确产品型号、错误码、实体名的字符匹配，召回候选集。

### RRF 倒数排名融合算法（Reciprocal Rank Fusion）
向量通道输出的是余弦相似度（取值通常在 $0.0 \sim 1.0$），而 BM25 通道输出的是无上限的相关性得分。两者的绝对分值不具备可比性。

业界常用的无量纲融合方法是 **倒数排名融合（RRF）**：

$$\text{RRF\_Score}(d \in D) = \sum_{m \in M} \frac{1}{k + r_m(d)}$$

- $M$ 为检索通道集合（如 Dense 与 Sparse）；
- $r_m(d)$ 为文档 $d$ 在通道 $m$ 中的 **排序名次（Rank）**（从 1 开始）；
- $k$ 为平滑常数（经验值通常设为 $60$）。

RRF 算法脱离了对原始打分数值的依赖，仅根据文档在不同通道中的相对名次进行加权。在两个通道中均名列前茅的文档将获得显著靠前的综合排名。

---

## 交叉编码器重排序（Rerank）

多路召回阶段通常会将候选池放宽至数十条以防止漏检，但这也会引入不相关的噪声片段。直接送入上下文窗口容易触发注意力的稀释。

检索系统通过引入 **重排模型（Reranker / Cross-Encoder）** 进行精细重判：

1. **全注意力交互**：将用户查询 Query 与候选 Chunk 拼接送入交叉编码器；
2. **深层语义与逻辑校验**：利用跨序列的完整自注意力机制识别否定句、限定修饰与实体对应关系，压低仅有表面词汇重合但不相关的片段得分；
3. **精炼输入**：最终筛选出置信度最高的 Top 3~5 个片段送入提示词。

---

## GraphRAG：实体图谱与社区摘要

面对全库总结或跨实体多跳关联的全局性问题，微软在 2024 年提出了 **GraphRAG** 方法：

<figure>
  <img src="/figures/advanced-rag/graphrag-community-summary.svg" alt="GraphRAG 实体网络拓扑与社区摘要生成机制" />
  <figcaption>GraphRAG 拓扑网络与分层社区摘要生成机制</figcaption>
</figure>

### 1. 实体与关系图谱抽取
在离线建库阶段，利用模型对所有文档块中的实体、关系与事实进行结构化抽取，构建跨文档的知识网络拓扑图。

### 2. 社区发现算法（Leiden Algorithm）
利用图论算法自动识别紧密关联的实体子图，将其聚类为不同层级的知识“社区（Community）”。

### 3. 分层社区摘要（Community Summaries）
自底向上为每个实体社区预先生成结构化的社区摘要报告。当遇到宏观全局提问时，系统通过扫描相关社区的报告执行聚合总结，弥补了传统单点切块在宏观归纳上的局限。

---

## 最小代码实现

以下代码演示了 RRF（倒数排名融合）算法的实现，展示了如何通过名次倒数消除向量检索与 BM25 检索的分值量纲差异：

```python
from typing import List, Dict

def compute_rrf(dense_ranks: List[str], sparse_ranks: List[str], k: int = 60) -> List[Dict]:
    """
    计算两路检索结果的 RRF (Reciprocal Rank Fusion) 融合得分
    :param dense_ranks: 向量检索召回的文档 ID 列表 (按相似度降序)
    :param sparse_ranks: BM25 检索召回的文档 ID 列表 (按得分降序)
    :param k: RRF 平滑常数 (默认 60)
    :return: 综合排序后的文档列表与得分
    """
    scores = {}
    
    # 1. 累加向量通道的名次贡献
    for rank, doc_id in enumerate(dense_ranks, start=1):
        scores[doc_id] = scores.get(doc_id, 0.0) + (1.0 / (k + rank))
        
    # 2. 累加 BM25 通道的名次贡献
    for rank, doc_id in enumerate(sparse_ranks, start=1):
        scores[doc_id] = scores.get(doc_id, 0.0) + (1.0 / (k + rank))
        
    # 3. 按最终综合得分降序排列
    sorted_docs = sorted(scores.items(), key=lambda item: item[1], reverse=True)
    return [{"doc_id": doc_id, "rrf_score": score} for doc_id, score in sorted_docs]

def rrf_demo():
    # 模拟两路检索结果 (用户提问包含特定错误码: "报销 ERR_8091 错误怎么处理？")
    dense_retrieval = ["doc_finance_guide", "doc_err_8091_fix", "doc_invoice_rule"]  # 语义匹配偏向财务
    sparse_retrieval = ["doc_err_8091_fix", "doc_server_errors", "doc_network_codes"] # BM25 精确命中错误码
    
    fused_results = compute_rrf(dense_retrieval, sparse_retrieval, k=60)
    
    print("--- RRF 倒数排名融合结果 ---")
    for idx, res in enumerate(fused_results, start=1):
        print(f"Top {idx}: {res['doc_id']:<20} -> RRF 得分 = {res['rrf_score']:.6f}")

rrf_demo()
```

**控制台输出：**
```text
--- RRF 倒数排名融合结果 ---
Top 1: doc_err_8091_fix     -> RRF 得分 = 0.032522
Top 2: doc_finance_guide    -> RRF 得分 = 0.016393
Top 3: doc_server_errors    -> RRF 得分 = 0.016129
Top 4: doc_invoice_rule     -> RRF 得分 = 0.015873
Top 5: doc_network_codes    -> RRF 得分 = 0.015873
```

---

## 核心概念辨析

- **基础 RAG vs 进阶混合检索 RAG**：
  - 基础 RAG 依赖单一向量最近邻检索；
  - 进阶 RAG 结合双路召回、RRF 排序融合与 Cross-Encoder 重排，提升了召回的全面性与准确性。
- **局部事实检索（Local Search） vs 全局摘要检索（GraphRAG Global Search）**：
  - 局部检索针对具体细节做点状定位；
  - GraphRAG 依托实体图谱社区摘要，支持全库跨文档的宏观归纳与多跳推理。
- **双塔初筛（Bi-Encoder） vs 交叉重排（Cross-Encoder）**：
  - 双塔初筛独立编码，侧重于高吞吐与高召回；
  - 交叉重排全序列交互，侧重于高精度与噪声过滤。

检索技术解决了模型的信息输入问题，但模型如何触发外部动作、调用真实 API 完成任务？下一篇我们将探讨——《工具调用与动作执行》。

---

## 参考文献

1. Edge, Darren, Trinh, Ha, Cheng, Newman, et al. (2024). [*From Local to Global: A Graph RAG Approach to Query-Focused Summarization*](https://arxiv.org/abs/2404.16130). Microsoft Research / arXiv:2404.16130.
2. Cormack, Gordon V., Clarke, Charles L., & Buettcher, Stefan. (2009). [*Reciprocal Rank Fusion outperforms Condorcet and individual Rank Learning Methods*](https://doi.org/10.1145/1571941.1572114). SIGIR 2009.
3. Asai, Akari, Sewon, Min, Zhong, Zexuan, et al. (2023). [*Self-RAG: Learning to Retrieve, Generate, and Critique through Self-Reflection*](https://arxiv.org/abs/2310.11511). ICLR 2024 / arXiv:2310.11511.
4. Nogueira, Rodrigo, Jiang, Zhiying, & Lin, Jimmy. (2020). [*Document Ranking with Dual-Encoder Models (Reranking Survey)*](https://arxiv.org/abs/2004.09813). arXiv:2004.09813.
