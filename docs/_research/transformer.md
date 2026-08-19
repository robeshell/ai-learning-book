# 什么是 Transformer · 事实笔记

复核：2026-08-19。本站独立调研，按 research skill 压缩为单篇 item。

## 定义

- Transformer 是 Vaswani 等人在 2017 年提出的序列神经网络架构，其核心特征是彻底摒弃了传统的循环（RNN）和卷积（CNN）结构，完全依赖自注意力（Self-Attention）机制计算词汇之间的关联（[*Attention Is All You Need*](https://arxiv.org/abs/1706.03762)，NeurIPS 2017）。
- 架构演变：原论文采用机器翻译的编码器–解码器（Encoder-Decoder）结构；今天主流的生成式大语言模型（如 GPT 系列、Llama 等）多采用仅解码器（Decoder-only）架构，但其核心的自注意力计算层完全同源。

## 核心机制

1. **摆脱 RNN 的串行瓶颈**：
   - 传统循环网络（RNN/LSTM）计算当前时间步状态 $h_t$ 时，必须等待前一状态 $h_{t-1}$ 完成，顺序操作步数为 $O(n)$，长距离依赖路径为 $O(n)$，无法充分利用 GPU 硬件的大规模并行能力，且长文本容易遗忘。
   - 自注意力层中，序列内任意两个位置之间的交互路径长度为常数 $O(1)$，全部位置的相关性通过矩阵乘法在单步 $O(1)$ 内并行完成（论文 Table 1）。
2. **Q、K、V 的物理直觉与点积注意力**：
   - 输入向量通过三个可学习的线性投影矩阵分别生成 Query（查询）、Key（键）、Value（值）。
   - **Query（Q）**：当前词“要寻找什么样的上下文”。
   - **Key（K）**：当前词“具有什么特征标签供别人匹配”。
   - **Value（V）**：当前词“实际承载的内容信息”。
   - 缩放点积公式：$\text{Attention}(Q, K, V) = \text{softmax}\left(\frac{QK^T}{\sqrt{d_k}}\right)V$
     - $QK^T$：计算序列中所有词对之间的点积相似度得分；
     - 除以 $\sqrt{d_k}$：缩放因子，防止高维向量内积过大导致 Softmax 梯度饱和进入平台期；
     - $\text{softmax}$：将匹配得分归一化为和为 1 的注意力权重矩阵；
     - 乘 $V$：按权重加权求和，将全序列相关信息聚合到当前词的表示中。
3. **多头注意力（Multi-Head Attention）**：
   - 将 Q、K、V 投影到 $h$ 个不同的低维子空间分别计算注意力，再将各头输出拼接后投影：$\text{MultiHead}(Q, K, V) = \text{Concat}(\text{head}_1, \dots, \text{head}_h)W^O$。
   - 原论文配置：$h=8, d_{\text{model}}=512, d_k=d_v=64$。
   - 作用：单头注意力容易将信息平均化，多头机制允许模型同时捕捉指代关系、句法依赖、语义并列等多种不同维度的关联。
4. **因果掩码（Causal Masking，仅针对自回归解码器）**：
   - 在生成任务中，模型不能提前看到未来的词。在 Softmax 之前，将未来位置的注意力得分置为 $-\infty$，使 Softmax 后的权重严格为 0。
5. **二次方复杂度（$O(n^2)$）的代价**：
   - 自注意力层的计算复杂度为 $O(n^2 \cdot d)$，RNN 为 $O(n \cdot d^2)$。
   - 当序列长度 $n$ 较短（$n < d$）时，自注意力在 GPU 上具有压倒性的并行计算优势；但当序列长度 $n$ 急剧增大时，$n^2$ 的计算量与显存占用成为长文本推理的核心瓶颈。

## 必须核住的数字与来源

- **论文发表**：Vaswani, A., Shazeer, N., Parmar, N., et al. [*Attention Is All You Need*](https://arxiv.org/abs/1706.03762). NeurIPS 2017.
- **基准配置**：8 个注意力头（$h=8$），模型维度 $d_{\text{model}}=512$，单头维度 $d_k=d_v=64$。
- **复杂度与路径对比（Table 1）**：
  - Self-Attention：每层计算量 $O(n^2 \cdot d)$，顺序操作 $O(1)$，最大路径长度 $O(1)$。
  - Recurrent（RNN）：每层计算量 $O(n \cdot d^2)$，顺序操作 $O(n)$，最大路径长度 $O(n)$。
- **翻译基准**：8 块 P100 GPU 训练 3.5 天，WMT 2014 En-Fr 达到 41.0 BLEU。

## 常见误解

1. **误解：Transformer 是一套拥有独立思考意图的系统**
   - 纠偏：它是一套高度优化的矩阵运算拓扑结构，核心功能是快速、并行地计算序列内部各个符号之间的相关性。
2. **误解：Q、K、V 是三个独立预设的外部知识库**
   - 纠偏：Q、K、V 是输入向量经过同一层的三个不同参数矩阵线性变换（投影）出来的内部数学表征。
3. **误解：注意力机制没有任何计算瓶颈**
   - 纠偏：虽然解决了串行问题，但每两个词之间都要算一次点积，导致计算量和内存占用随序列长度 $n$ 呈 $n^2$ 二次方暴涨。

## 和上下篇的关系

- 前置篇目：第 1 篇《什么是大模型》（确立了大模型的参数规模与自回归生成整体图景）。
- 本篇定位：深入大模型内部主干，解释词与词之间是如何并行计算关联的。
- 承接后文：
  - 第 3 篇《什么是 Token》将输入与输出落到具体的编码编号与词表上；
  - 第 4 篇《什么是上下文窗口》展开 $n^2$ 复杂度在实际推理中的视野极限；
  - 第 5 篇《什么是 Prompt Caching》与第 6 篇《为什么模型吐字越来越快》讲解如何通过缓存 K 和 V 避免重复计算。

## 本篇不展开

- Token 分词算法与词表大小（第 3 篇展开）。
- 上下文窗口限制与超限截断（第 4 篇展开）。
- KV Cache 显存占用与前缀缓存（第 5 篇展开）。
- 残差连接（Residual Connections）与 LayerNorm 的前向反向数学推导。
- 相对位置编码（RoPE）与长文本外推技术（第 5 季展开）。

## 来源

1. Vaswani, A., Shazeer, N., Parmar, N., et al. (2017). [*Attention Is All You Need*](https://arxiv.org/abs/1706.03762). NeurIPS 2017 / arXiv:1706.03762.
2. Google Research. (2017-08-31). [*Transformer: A Novel Neural Network Architecture for Language Understanding*](https://research.google/blog/transformer-a-novel-neural-network-architecture-for-language-understanding/).
