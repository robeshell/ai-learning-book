---
title: "Embedding 向量嵌入"
description: "高维向量语义编码、距离度量与文本表征模型。"
series: models-at-work
chapter: retrieve
order: 2
type: concept
articleStatus: draft
prerequisites:
  - "rag"
videoSource: embeddings
---

# Embedding 向量嵌入

在传统计算机中，文本以离散的字符编码（如 ASCII 或 UTF-8）形式存储。在底层表示上，“苹果”与“水果”是完全不同的二进制编码，计算机无法直接判断两者在语义上的关联。

如何让算法理解词语与句子的语义亲疏？为什么将文本映射为高维连续浮点数向量后，系统能够支持基于语义的检索？

这是现代信息检索与语义表征的核心基础——**Embedding（向量嵌入）**。

<figure>
  <img src="/figures/embeddings/dense-vector-space.svg" alt="高维语义空间中的向量聚类与夹角相似度" />
  <figcaption>Embedding 空间：从离散字符到连续语义坐标</figcaption>
</figure>

---

## 语义空间与连续坐标映射

传统的关键词检索（如 BM25）基于字面的精确匹配：若文档中写有“犬类护理指南”，而查询为“如何养小狗”，若无字面重合则容易发生漏检。

**向量嵌入（Embedding）** 本质上是**将离散文本映射到连续高维几何空间（如 768、1024 或 1536 维）的非线性投影函数**：

$$f(\text{"可爱的小狗"}) \to [-0.042, 0.881, -0.215, \dots, 0.512] \in \mathbb{R}^d$$

在高维语义空间中：
- 每一个维度对应潜在的抽象语义特征；
- 语义相近的句子，其向量端点在几何空间中相互靠近；
- 语义无关的概念，其向量夹角接近正交（垂直）。

---

## 向量相似度度量方式

将两段文本转化为高维向量 $\mathbf{u}$ 与 $\mathbf{v}$ 后，系统通过几何度量量化它们的语义关联度：

### 1. 欧氏距离（Euclidean Distance, $L_2$）
$$d(\mathbf{u}, \mathbf{v}) = \sqrt{\sum_{i=1}^d (u_i - v_i)^2}$$
度量空间中两点的直线绝对距离，易受文本长度差异引起的向量模长影响。

### 2. 余弦相似度（Cosine Similarity）
$$\cos\theta = \frac{\mathbf{u} \cdot \mathbf{v}}{\|\mathbf{u}\| \|\mathbf{v}\|} = \frac{\sum_{i=1}^d u_i v_i}{\sqrt{\sum_{i=1}^d u_i^2} \sqrt{\sum_{i=1}^d v_i^2}}$$
度量两向量在高维空间中的**夹角方向一致性**（取值范围 $[-1.0, 1.0]$）。方向完全一致为 $1.0$，正交无关为 $0.0$，方向完全相反为 $-1.0$。

### 3. 归一化点积（Normalized Inner Product）
在工程落地中，向量入库前通常会执行 $L_2$ 归一化（使得 $\|\mathbf{u}\| = 1.0$）。此时向量点积与余弦相似度等价，计算复杂度显著降低，便于利用硬件 SIMD 指令集进行大规模并行计算。

---

## 双塔编码器与对比学习

通用的文本 Embedding 模型通常采用 **双塔架构（Bi-Encoder）** 配合 **对比学习（Contrastive Learning）** 进行训练：

<figure>
  <img src="/figures/embeddings/bi-encoder-contrastive.svg" alt="双塔编码器与交叉编码器的架构分工" />
  <figcaption>双塔编码器（Bi-Encoder）与对比学习架构</figcaption>
</figure>

### 1. 双塔架构（Bi-Encoder）
- Query 编码器与 Document 编码器解耦；
- 知识库文档可在离线状态下全部完成向量化并写入索引；
- 在线检索时仅需对当前 Query 计算一次向量，即可与数百万文档向量进行快速矩阵点积匹配。

### 2. 对比学习目标（InfoNCE 损失）
训练过程通过拉近正样本、推开负样本来优化空间分布：
- **正样本对（Positive Pair）**：真实相关的问答对（如 Query: `"如何报销发票"` 与 Doc: `"财务报销规定说明..."`）；
- **负样本对（Negative Pairs）**：批次内的其他不相关文档；
- **优化目标**：最大化正样本对的余弦相似度，同时最小化与负样本对的相似度。

---

## 向量相似度的物理边界

在 RAG 系统中，需要客观认识向量相似度的性质与边界：

### 1. 几何邻近不代表逻辑等价
向量空间主要衡量主题分布的相关性，而非命题的真伪：
- 句子 A：`"吸烟对身体健康有严重危害。"`
- 句子 B：`"吸烟对身体健康没有任何危害。"`
- 在高维向量空间中，两句话的余弦相似度通常依然很高（如 0.9 以上），因为它们涉及相同的实体与概念词汇，仅在单个否定词上有差异。向量检索本身无法判别哪一句是客观事实。

### 2. 主题相近不代表逻辑蕴含
向量检索反映的是“主题相关（Topical Relevance）”，而非因果推理或逻辑蕴含。因此在工业检索中，常需结合**多路召回与重排序（Rerank）**以提高精确度。

---

## 最小代码实现

以下代码演示了向量余弦相似度的计算，展示了语义相近句、否定句与无关句在特征空间中的数值分布特征：

```python
import numpy as np

def cosine_similarity(v1: np.ndarray, v2: np.ndarray) -> float:
    """计算两向量的余弦相似度"""
    dot = np.dot(v1, v2)
    norm = np.linalg.norm(v1) * np.linalg.norm(v2)
    return dot / norm if norm > 0 else 0.0

def embedding_demo():
    # 模拟包含 5 个核心语义维度的特征空间: [AI技术, 医疗健康, 负面危害, 天文宇宙, 法律合规]
    sentences = {
        "query": ("人工智能正在深刻改变世界", np.array([0.90, 0.05, 0.10, 0.00, 0.10])),
        "pos":   ("深度学习算法推动科技革命", np.array([0.85, 0.02, 0.05, 0.00, 0.08])),
        "neg":   ("人工智能不会改变任何世界", np.array([0.88, 0.04, 0.15, 0.00, 0.12])),
        "irrel": ("太阳系共有八颗主要的行星", np.array([0.00, 0.00, 0.00, 0.95, 0.00]))
    }
    
    q_title, q_vec = sentences["query"]
    print(f"基准查询 Query: '{q_title}'\n")
    
    print("--- 高维空间余弦相似度计算结果 ---")
    for key in ["pos", "neg", "irrel"]:
        title, vec = sentences[key]
        sim = cosine_similarity(q_vec, vec)
        print(f"对比文本 [{key:<5}]: '{title}' -> 余弦相似度 = {sim:.4f}")

embedding_demo()
```

**控制台输出：**
```text
基准查询 Query: '人工智能正在深刻改变世界'

--- 高维空间余弦相似度计算结果 ---
对比文本 [pos  ]: '深度学习算法推动科技革命' -> 余弦相似度 = 0.9980
对比文本 [neg  ]: '人工智能不会改变任何世界' -> 余弦相似度 = 0.9980
对比文本 [irrel]: '太阳系共有八颗主要的行星' -> 余弦相似度 = 0.0000
```

---

## 核心概念辨析

- **关键词稀疏检索（BM25） vs 向量稠密检索（Embedding）**：
  - BM25 依赖字面精确匹配，擅长专有名词与编号查询；
  - Embedding 将文本映射为连续向量，支持跨句式与近义词的语义匹配。
- **双塔编码器（Bi-Encoder） vs 交叉编码器（Cross-Encoder / Reranker）**：
  - 双塔独立编码，适合海量文档离线建库与快速初筛；
  - 交叉编码器全序列拼接注意力计算，精度更高但算力开销大，适合对候选集做精排。
- **特征空间距离 vs 客观真实性**：
  - 向量相似度度量的是语义主题的几何夹角，不等于命题在逻辑上的真假。

在复杂的企业知识库中，面对长文本切块割裂与表格关联难题，如何进一步提升检索召回率？下一篇我们将探讨——《高阶 RAG 与图谱检索》。

---

## 参考文献

1. Mikolov, Tomas, Chen, Kai, Corrado, Greg, & Dean, Jeffrey. (2013). [*Efficient Estimation of Word Representations in Vector Space (Word2Vec)*](https://arxiv.org/abs/1301.3781). ICLR 2013 / arXiv:1301.3781.
2. Reimers, Nils, & Gurevych, Iryna. (2019). [*Sentence-BERT: Sentence Embeddings using Siamese BERT-Networks*](https://arxiv.org/abs/1908.10084). EMNLP 2019 / arXiv:1908.10084.
3. Xiao, Shitao, Liu, Zheng, Zhang, Peitian, & Muennighoff, Niklas. (2023). [*C-Pack: Packaged Resources To Advance General Chinese Embedding (BGE)*](https://arxiv.org/abs/2309.07597). arXiv:2309.07597.
4. Radford, Alec, Kim, Jong Wook, Hallacy, Chris, et al. (2021). [*Learning Transferable Visual Models From Natural Language Supervision (CLIP / InfoNCE)*](https://arxiv.org/abs/2103.00020). ICML 2021 / arXiv:2103.00020.
