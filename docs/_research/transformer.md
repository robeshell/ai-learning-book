# 什么是 Transformer · 事实笔记

复核：2026-08-19。本站独立调研，按 research skill 压缩为单篇 item。

## 定义

- Transformer 是 Vaswani 等人 2017 年提出的序列模型，主干是注意力，不再用循环或卷积做层间传递（*Attention Is All You Need*，NeurIPS 2017 / arXiv:1706.03762）。
- 原论文是机器翻译的编码器–解码器。今天常见的聊天大模型多用解码器一侧，自注意力这一层仍是同一套机制。

## 机制

- 循环网络（RNN）按位置逐步计算：后一个位置必须等前一个隐状态。任意两位置之间的最长路径是序列长度量级，最少顺序步数是 O(n)。
- 自注意力（self-attention / intra-attention）在同一序列内部让位置与位置直接发生关系。一层里任意两位置以常数步数相连，最少顺序步数是 O(1)（论文 Table 1）。
- 缩放点积注意力：Query 与所有 Key 做点积，除以 √d_k，再 softmax 得到权重，用权重去混合 Value。矩阵写法：Attention(Q, K, V) = softmax(QK^T / √d_k) V。
- 多头：把 Q、K、V 线性投影 h 次，并行做注意力，再拼接后投影。原论文 h = 8，d_model = 512，d_k = d_v = 64。单头平均会压掉不同子空间的信息。
- 解码器自注意力要挡住右侧（尚未生成的位置），以保持自回归。实现上是在 softmax 前把非法位置打成 −∞。
- 每层复杂度：自注意力 O(n² · d)，循环层 O(n · d²)。论文写明，当序列长度 n 小于表示维度 d 时，自注意力通常比循环层更快。n 变大后，n² 个分数成为长序列的主要代价。

## 必须核住的数字与来源

- 论文发表：Vaswani 等，NeurIPS 2017。
- 原配置：8 个注意力头；d_model = 512；每头 d_k = d_v = 64。
- Table 1：自注意力顺序步数 O(1)、最长路径 O(1)、复杂度 O(n²d)；循环网络顺序步数 O(n)、最长路径 O(n)、复杂度 O(n d²)。
- 原论文英法翻译：8 块 GPU 训练 3.5 天，WMT 2014 En–Fr 单模型 41.0 BLEU（论文摘要）。

## 常见误解

- 把 Transformer 当成「会思考的模块」，而不是一层并行算位置关系的网络。
- 以为注意力已经取代了所有序列模型的代价。n 变长时 n² 会反过来成为负担。
- 把 Q、K、V 理解成三个不同的数据库。它们是同一组输入的三种线性投影。
- 把原论文的编码器–解码器翻译模型和今天的解码器语言模型当成同一张结构图。

## 和上下篇的关系

- 先读：什么是大模型（主干点到 Transformer，未讲内部）。
- 后篇：Token（输入如何变成编号）；上下文窗口（n 变长时的容量与代价）。

## 本篇不展开

- Token 切分与词表
- KV Cache、窗口长度、位置编码的工程细节
- 残差、LayerNorm、前馈层内部
- MoE、多模态编码器

## 来源

1. Vaswani et al. *Attention Is All You Need*. NeurIPS 2017. arXiv:1706.03762. https://arxiv.org/abs/1706.03762
2. Google Research. *Transformer: A Novel Neural Network Architecture for Language Understanding*. 2017-08-31. https://research.google/blog/transformer-a-novel-neural-network-architecture-for-language-understanding/
