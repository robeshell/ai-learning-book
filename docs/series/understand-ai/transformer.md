---
title: "Transformer 与自注意力"
description: "从简单平均到 QKV 亲和力路由与现代注意力演进。"
series: understand-ai
chapter: foundation
order: 2
type: concept
articleStatus: draft
prerequisites:
  - "large-model"
videoSource: transformer
---

# Transformer 与自注意力

在大语言模型中，输入的文本首先会被切分成一个个 Token，并转化为静态的高维向量。但这些初始向量存在一个根本缺陷：**它们是彼此孤立的**。

在词表里，*“苹果”* 这个词查出来的向量永远是固定的一串数字。如果它孤立地躺在内存里，它根本不知道自己身处什么语境——它是一颗水果，还是一家科技公司？

只有结合上下文，一个词的语义才是完整的。

模型如何让序列中的每一个词与周围的词对话，动态吸收语境信息？

2017 年，Google 在论文 [*Attention Is All You Need*](https://arxiv.org/abs/1706.03762) 中提出了 **Transformer 架构与自注意力机制（Self-Attention）**。它抛弃了传统循环网络的串行等待，以矩阵并行点积计算词与词之间的关联，构成了现代大模型的通用底座。

---

## 为什么不能只做简单平均

如果我们要让第 $t$ 个词融合前文的信息，最直觉的做法是：**把第 $t$ 个词及其之前所有词的向量直接求算术平均**。

假设输入序列为三个词的向量 $[x_1, x_2, x_3]$：
- 位置 1 的输出：$y_1 = x_1$
- 位置 2 的输出：$y_2 = \frac{1}{2}(x_1 + x_2)$
- 位置 3 的输出：$y_3 = \frac{1}{3}(x_1 + x_2 + x_3)$

用矩阵表示，这相当于构造一个下三角全 1 矩阵，做行归一化后与输入矩阵 $\mathbf{X}$ 相乘：

$$\mathbf{W}_{\text{avg}} = \begin{bmatrix} 1.0 & 0 & 0 \\ 0.5 & 0.5 & 0 \\ 0.33 & 0.33 & 0.33 \end{bmatrix}, \quad \mathbf{Y} = \mathbf{W}_{\text{avg}} \mathbf{X}$$

这个做法虽然简单，且由于下三角矩阵的存在不会窥探未来的词，但存在明显的缺陷：**它对所有历史词一视同仁**。

在实际句子中，当我们要理解动词 *“穿过”* 时，它最需要关注的是主语 *“小明”* 和宾语 *“木桥”*，而不是介词 *“在”* 或助词 *“的”*。

我们需要让每个词根据自身的内容，动态决定给前文的哪些词分配更多权重。

---

## 自注意力的计算过程：Q、K、V

为了让权重完全由数据内容决定，自注意力机制为每个词引入了三套线性投影，派生出三种向量：

<figure>
  <video
    controls
    autoplay
    loop
    muted
    playsinline
    poster="/figures/transformer/transformer-attention-poster.jpg"
    style="width: 100%; border-radius: 8px; border: 1px solid var(--vp-c-divider);"
  >
    <source src="/figures/transformer/transformer-attention.webm" type="video/webm" />
    <source src="/figures/transformer/transformer-attention.mp4" type="video/mp4" />
    您的浏览器不支持 HTML5 视频播放。
  </video>
  <figcaption>自注意力 QKV 动态语境路由动画演示</figcaption>
</figure>

1. **Query（查询向量 $q_i = x_i \mathbf{W}_Q$）**：当前词发出的查询——*“我在寻找什么样的特征？”*
2. **Key（键向量 $k_j = x_j \mathbf{W}_K$）**：每个词对外暴露的特征标签——*“我具备什么样的语义属性供匹配？”*
3. **Value（值向量 $v_j = x_j \mathbf{W}_V$）**：每个词实际承载的信息内容——*“如果匹配成功，我能提供什么特征？”*

<figure>
  <img src="/figures/transformer/qkv.svg" alt="Query、Key、Value 角色分工" />
  <figcaption>Query、Key、Value 向量角色的分工关系</figcaption>
</figure>

### 1. 相似度打分与根号缩放
词 $i$ 用自己的 $q_i$ 与前文词 $j$ 的 $k_j$ 计算点积。点积越大，说明两个词的语义相关度越高：

$$\text{Score}(i, j) = \frac{q_i \cdot k_j}{\sqrt{d_k}}$$

**为什么要除以 $\sqrt{d_k}$？**  
在维度 $d_k$ 较大（如 128）时，点积的方差会随维度线性放大到 128。数值过大会导致送入 Softmax 后进入饱和区，导数趋近于 0（引发梯度消失）。除以 $\sqrt{d_k}$ 将方差标准化拉回 1.0，保证反向传播时梯度平稳流动。

### 2. 因果掩码与 Softmax 归一化
为了防止当前词提前看到后文，我们将未来位置的打分置为 $-\infty$。随后通过 Softmax 将打分转化为总和为 1.0 的注意力权重：

$$\alpha_{i, j} = \text{softmax}\left( \text{Scores}_i \right)$$

以序列 `["苹果", "发布", "新手机"]` 为例，*“苹果”* 算出的权重分布可能为：
- 对 *“苹果”* 自身：$0.15$
- 对 *“发布”*：$0.10$
- 对 *“新手机”*：$0.75$

### 3. Value 加权求和
最后，按照算出的权重对各位置的 Value 向量求和：

$$z_{\text{苹果}} = 0.15 \cdot v_{\text{苹果}} + 0.10 \cdot v_{\text{发布}} + 0.75 \cdot v_{\text{新手机}}$$

输出向量 $z_{\text{苹果}}$ 融合了来自 *“新手机”* 的特征，在向量空间中更靠近科技公司的语义簇。

全序列的矩阵计算公式如下：

$$\text{Attention}(\mathbf{Q}, \mathbf{K}, \mathbf{V}) = \text{softmax}\left( \frac{\mathbf{Q} \mathbf{K}^T}{\sqrt{d_k}} + \mathbf{M} \right) \mathbf{V}$$

---

## 多头注意力机制（Multi-Head Attention）

如果只使用一套 Q、K、V 矩阵（单头注意力），单次 Softmax 算出的概率总预算只有 1.0。若模型将大部分注意力集中在主谓关系上，就无法充分兼顾修饰词或代词指代。

为此，Transformer 引入了多头注意力机制（MHA）：

<figure>
  <img src="/figures/transformer/multi-head-sentence-example.svg" alt="多头注意力在长句中的多维关系解耦" />
  <figcaption>多头注意力在长句中的多维关系解耦</figcaption>
</figure>

将模型总维度 $d$（如 4096）切分为 $h$ 个子空间（如 32 个头，每个头 $d_k = 128$），各个头并行独立计算：

- **Head 1（主谓主干）**：捕捉核心动作骨架（`[小明]` $\leftrightarrow$ `[穿过]` $\leftrightarrow$ `[木桥]`）；
- **Head 2（属性修饰）**：将形容词绑定到对应名词（`[红色]` $\rightarrow$ `[跑车]`、`[古老]` $\rightarrow$ `[木桥]`）；
- **Head 3（代词消解）**：将句尾代词 `[他]` 关联回句首的 `[小明]`；
- **Head 4（逻辑因果）**：关联连词 `[因为]` 与目的 `[赶回家]`。

各个头的输出向量拼接在一起，通过线性输出矩阵 $\mathbf{W}_O$ 融合成最终表征：

$$\text{MultiHead}(\mathbf{Q}, \mathbf{K}, \mathbf{V}) = \text{Concat}(\text{head}_1, \dots, \text{head}_h) \mathbf{W}_O$$

---

## 现代架构演进：GQA、MLA 与 RoPE

2017 年的原始 Transformer 在面对今天的超长上下文与大规模部署时，遇到了显存占用和计算瓶颈。现代开源与工业级大模型主要在以下几个方向完成了演进：

<figure>
  <img src="/figures/transformer/mha-gqa-mla-evolution.svg" alt="注意力架构演进：MHA、GQA 与 MLA" />
  <figcaption>注意力架构演进：MHA、GQA 与 MLA</figcaption>
</figure>

### 1. 显存优化：GQA 与 MLA
- **经典 MHA 瓶颈**：在长文本生成时，每个头都需要独立缓存历史的 Key 和 Value（KV Cache），导致显存占用急剧膨胀；
- **GQA（分组查询注意力 · Llama 3 / Qwen 2.5 采用）**：让多个 Query 头共享一组 Key/Value，将 KV Cache 显存占用大幅缩减（如 $8:1$ 分组可缩减 $87.5\%$）；
- **MLA（多头潜变量注意力 · DeepSeek-V3 / R1 采用）**：通过低秩投影将 Key 和 Value 联合压缩为低维向量，将 KV Cache 显存降低 $90\%$ 以上。

### 2. 硬件加速：FlashAttention
- **瓶颈**：标准注意力计算需要在显存中物化生成 $N \times N$ 的中间矩阵，频繁读写显存成为主要耗时瓶颈；
- **现代方案**：利用 GPU 片上高速缓存（SRAM），分块（Tiling）计算并在片上执行在线 Softmax，避免了 $N \times N$ 矩阵在显存中的读写。

### 3. 相对位置编码：RoPE
- **瓶颈**：传统的绝对正弦位置编码直接将位置向量加到词向量上，难以自然外推到更长的序列；
- **现代方案（RoPE）**：将向量两两配对，在二维平面上根据位置进行角度旋转。两词的点积仅取决于相对距离，天然支持超长上下文扩展。

### 4. 规范化与激活函数：RMSNorm 与 SwiGLU
- **RMSNorm**：舍弃均值计算，仅计算均方根，在保持数值稳定性的同时减少计算开销；
- **SwiGLU**：替代传统 ReLU/GELU，提升前馈网络（FFN）的特征表达能力。

<figure>
  <img src="/figures/transformer/transformer-architecture-flow.svg" alt="Transformer 解码器核心架构与数据流" />
  <figcaption>Transformer 解码器核心架构与数据流</figcaption>
</figure>

---

## 最小代码实现

以下代码演示了因果自注意力的单步前向传播过程：

```python
import torch
import torch.nn.functional as F

def self_attention_demo():
    torch.manual_seed(42)
    
    # 模拟输入: 3 个 Token，每个 Token 维度 d_model = 4
    # 句子: ["苹果", "发布", "新手机"]
    X = torch.tensor([
        [1.0, 0.2, 0.1, 0.5],  # 苹果
        [0.1, 0.9, 0.8, 0.2],  # 发布
        [0.9, 0.1, 0.2, 0.8]   # 新手机
    ], dtype=torch.float32)
    
    seq_len, d_model = X.shape
    d_k = 4
    
    # 1. 线性投影权重 W_Q, W_K, W_V
    W_Q = torch.randn(d_model, d_k) * 0.5
    W_K = torch.randn(d_model, d_k) * 0.5
    W_V = torch.randn(d_model, d_k) * 0.5
    
    # 2. 派生 Q, K, V
    Q = X @ W_Q  # (3, 4)
    K = X @ W_K  # (3, 4)
    V = X @ W_V  # (3, 4)
    
    # 3. 计算点积并做根号缩放
    scores = (Q @ K.T) / (d_k ** 0.5)  # (3, 3)
    
    # 4. 构造因果掩码 (下三角矩阵，未来位置填 -inf)
    mask = torch.tril(torch.ones(seq_len, seq_len))
    masked_scores = scores.masked_fill(mask == 0, float('-inf'))
    
    # 5. Softmax 归一化得到注意力权重
    attn_weights = F.softmax(masked_scores, dim=-1)
    
    # 6. Value 加权求和
    output = attn_weights @ V  # (3, 4)
    
    print("--- 掩码打分矩阵 (包含 -inf 阻断未来) ---")
    print(masked_scores)
    print("\n--- 注意力权重分布 (每行和为 1.0) ---")
    print(attn_weights)
    print("\n--- 语境融合后的输出特征 Output ---")
    print(output)

self_attention_demo()
```

**控制台输出：**
```text
--- 掩码打分矩阵 (包含 -inf 阻断未来) ---
tensor([[-0.0554,    -inf,    -inf],
        [-0.4017, -0.9109,    -inf],
        [-0.0654, -0.2521, -0.1019]])

--- 注意力权重分布 (每行和为 1.0) ---
tensor([[1.0000, 0.0000, 0.0000],
        [0.6246, 0.3754, 0.0000],
        [0.3579, 0.2970, 0.3451]])

--- 语境融合后的输出特征 Output ---
tensor([[-1.0569,  0.1024, -0.4338,  0.6292],
        [-0.9140,  0.2051, -0.4019,  0.1858],
        [-1.0183,  0.3331, -0.4891,  0.2265]])
```

---

## 核心概念辨析

- **简单平均 vs 自注意力**：
  - 简单平均使用固定权重，无法根据语义区分重点；
  - 自注意力通过 Q 与 K 的点积动态计算相关性权重。
- **经典 MHA vs 现代 GQA / MLA**：
  - 经典 MHA 全头独立缓存 KV，长文本显存开销大；
  - GQA 采用分组共享 KV，MLA 采用低秩潜变量压缩，显著降低显存开销。
- **绝对位置编码 vs RoPE 旋转位置编码**：
  - 绝对位置相加难以自然外推长文本；
  - RoPE 通过复数平面旋转编码相对位置，支持更长序列扩展。
- **自注意力 vs 前馈网络（FFN）**：
  - 自注意力负责跨 Token 交换信息、聚合上下文；
  - 前馈网络负责每个 Token 独立进行非线性特征变换与知识提取。

文字进入 Transformer 之前，计算机是如何将自然语言切碎并编码为数字的？下一篇我们将探讨——《Token：文字的度量衡》。

---

## 参考文献

1. Vaswani, Ashish, Shazeer, Noam, Parmar, Niki, et al. (2017). [*Attention Is All You Need*](https://arxiv.org/abs/1706.03762). NeurIPS 2017 / arXiv:1706.03762.
2. Su, Jianlin, Ahmed, Murtadha, Lu, Yu, et al. (2024). [*RoFormer: Enhanced Transformer with Rotary Position Embedding (RoPE)*](https://arxiv.org/abs/2104.09864). *Neurocomputing*, 568, 127063.
3. Ainslie, Joshua, Lee-Thorp, James, de Jong, Michiel, et al. (2023). [*GQA: Training Generalized Multi-Query Transformer Models from Multi-Head Checkpoints*](https://arxiv.org/abs/2305.13245). EMNLP 2023 / arXiv:2305.13245.
4. DeepSeek-AI. (2024). [*DeepSeek-V3 Technical Report*](https://arxiv.org/abs/2412.19437). arXiv:2412.19437.
5. Dao, Tri. (2023). [*FlashAttention-2: Faster Attention with Better Parallelism and Work Partitioning*](https://arxiv.org/abs/2307.08691). ICLR 2024 / arXiv:2307.08691.
6. Karpathy, Andrej. (2023). [*Let's build GPT: from scratch, in code, spelled out.*](https://www.youtube.com/watch?v=kCc8FmEb1nY). YouTube / GitHub `nanoGPT`.
