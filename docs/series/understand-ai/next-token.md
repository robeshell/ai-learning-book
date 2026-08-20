---
title: "Next-Token 概率预测"
description: "Logits 投影、采样温度/Top-P 与上下文学习。"
series: understand-ai
chapter: generation
order: 7
type: concept
articleStatus: draft
prerequisites:
  - "token"
videoSource: next-token
---

# Next-Token 概率预测

大众对大模型常见的一种误解，是认为它内部包含一个结构化的“确定性知识数据库”，在接收到问题后检索出标准答案。

但在底层工程与数学实现中，大模型的核心逻辑非常纯粹：**根据前序已出现的全部 Token 序列，在词表空间中计算下一个最可能出现的词（Next-Token）的概率分布，并按设定的采样策略决定输出**。

<figure>
  <img src="/figures/next-token/pipeline.svg" alt="从隐藏状态到词表采样的 Next-Token 预测流水线" />
  <figcaption>从隐藏状态到词表采样的 Next-Token 预测流水线</figcaption>
</figure>

---

## 从隐藏状态到未归一化得分（Logits）

当输入序列经过 Transformer 多层自注意力与前馈网络的逐层计算后，模型在最后一个 Token 位置会输出一个高维隐藏状态向量 $\mathbf{h} \in \mathbb{R}^d$（例如在 Llama 3 70B 中，$d = 8192$）。

该向量本身是连续的浮点数，需要通过 **语言模型头（LM Head, Language Modeling Head）** 映射回离散词表空间：

1. **词表线性投影**：
   LM Head 是一个全连接权重矩阵 $\mathbf{W}_{\text{lm}} \in \mathbb{R}^{|V| \times d}$，其中 $|V|$ 为词表大小（例如 128,256）。通过一次矩阵乘法：

   $$\mathbf{z} = \mathbf{h} \mathbf{W}_{\text{lm}}^T \in \mathbb{R}^{|V|}$$

2. **未归一化得分（Logits）**：
   输出向量 $\mathbf{z} = [z_1, z_2, \dots, z_{|V|}]$ 即为 **Logits**。词表中的每个 Token 都会获得一个实数打分，数值越高代表与当前上下文的统计关联越强。

---

## 采样调控：Temperature 与 Top-P

Logits 向量中包含负数且和不为 1。为了将其转化为合法的概率分布，并控制生成的确定性与多样性，推理引擎引入了 **Temperature（温度）** 与 **Top-P（核采样）**。

<figure>
  <img src="/figures/next-token/temperature-and-top-p.svg" alt="Temperature 调节与 Top-P 核采样对比" />
  <figcaption>Temperature 缩放与 Top-P 核采样的概率分布几何调控</figcaption>
</figure>

### 1. 温度缩放与 Softmax
系统通过带温度参数 $T > 0$ 的 Softmax 函数计算概率分布：

$$P(w_i) = \frac{\exp(z_i / T)}{\sum_{j=1}^{|V|} \exp(z_j / T)}$$

- **低温模式（$T \to 0$）**：
  最高得分项与其他项的差距被放大，分布趋近于脉冲函数。模型**每次都选取概率最高的那 1 个词（贪心搜索 / Greedy Search）**，输出确定且可复现，适用于代码生成与严谨问答。
- **标准模式（$T \approx 0.7$）**：
  保持合理的概率起伏，兼顾语句通顺与表达多样性。
- **高温模式（$T > 1.0$）**：
  各词之间的概率差距被缩小，低频词获得更多被选中的机会，回答更具发散性；当 $T \to \infty$ 时退化为均匀随机分布。

### 2. 核采样（Top-P / Nucleus Sampling）
传统的 Top-K 采样固定选取前 $K$ 个词，但在上下文极度明确（如前 1 个词概率已达 95%）或极度开放时不够灵活。

Top-P 采样将候选词按概率降序排列，**动态累加概率直到总和达到设定阈值 $p$（例如 $p = 0.90$）时截断**：

$$\sum_{w \in V^{(p)}} P(w) \ge p$$

- **模型高确信度时**：候选集自动缩减为 1~2 个高概率词；
- **开放性场景时**：候选集自动扩充，保留更多合理的词汇选择。

---

## 上下文学习的物理机制

在实际使用中，如果在 Prompt 中提供几个示例（Few-Shot），模型就能适应特定的输出格式（如结构化 JSON）。这种上下文学习（In-Context Learning, ICL）在底层是如何工作的？

<figure>
  <img src="/figures/next-token/icl-mechanism.svg" alt="模型微调与上下文学习对比" />
  <figcaption>模型微调（修改权重）与上下文学习（前向注意力约束）机制对比</figcaption>
</figure>

1. **权重保持不变（$\Delta W = 0$）**：
   在推理期间，模型权重完全固化，不发生反向传播或参数更新。
2. **自注意力的前向特征约束**：
   示例作为前缀 Token 驻留在上下文窗口中，其 Key 和 Value 向量保存在显存中。在计算当前位置时，自注意力机制将当前隐藏状态拉向示例所在的特征子空间。
3. **词表概率收拢**：
   经过 LM Head 投影后，原本分散的概率质量被集中收拢在符合示例格式的特定 Token 上。

上下文学习通过前置 Token 的注意力交互，在前向计算中动态重塑了输出的概率分布。

---

## 常见认知误区

### 1. 将 Temperature 设为 0 是否能消除幻觉？
不能。$T = 0$ 只能确保**输出结果绝对确定且可复现**。如果模型在预训练权重中对某个错误事实赋予了最高打分，在 $T = 0$ 下模型依然会确定性地输出该错误内容。概率高低反映的是训练数据的统计共现，不等于事实真伪。

### 2. 为什么贪心采样（$T = 0$）容易陷入重复死循环？
当模型偶然生成了具有自我重复特性的句式后，在自回归机制下，该句式会作为新前缀重新进入上下文。由于它对自己产生了较高的注意力权重，下一步预测容易再次指向相同的句式开头，从而陷入局部循环。适当引入 $T > 0$ 与 Top-P 可以通过随机扰动跳出死循环。

---

## 最小代码实现

以下代码演示了带有 Temperature 缩放与 Top-P 核采样的 Next-Token 采样逻辑：

```python
import numpy as np

def sample_next_token(logits: np.ndarray, temperature: float = 0.7, top_p: float = 0.9, seed: int = 42) -> int:
    """
    Next-Token 采样核心逻辑:
    1. 温度为 0 时贪心取 argmax
    2. 温度缩放 + Softmax 归一化
    3. Top-P 动态核采样截断
    4. 候选子集多项式抽样
    """
    np.random.seed(seed)
    if temperature < 1e-5:
        return int(np.argmax(logits))
    
    # 1. 温度缩放
    scaled = logits / temperature
    # 2. 数值稳定的 Softmax 归一化
    exp_logits = np.exp(scaled - np.max(scaled))
    probs = exp_logits / np.sum(exp_logits)
    
    # 3. 按概率降序排列做 Top-P 截断
    sorted_idx = np.argsort(probs)[::-1]
    sorted_probs = probs[sorted_idx]
    cum_probs = np.cumsum(sorted_probs)
    
    cutoff = np.searchsorted(cum_probs, top_p)
    valid_idx = sorted_idx[:cutoff + 1]
    valid_probs = probs[valid_idx]
    
    # 4. 重新归一化并在子集中抽样
    valid_probs = valid_probs / np.sum(valid_probs)
    selected = np.random.choice(valid_idx, p=valid_probs)
    return int(selected)

def next_token_demo():
    vocab = ["技术", "应用", "模型", "发展", "系统"]
    logits = np.array([2.5, 2.4, 2.3, 1.0, 0.5])
    
    # 输出不同温度下的概率分布对比
    for t in [0.2, 0.7, 1.5]:
        scaled = logits / t
        exp_l = np.exp(scaled - np.max(scaled))
        p = exp_l / np.sum(exp_l)
        print(f"温度 T={t:.1f} 概率分布:", np.round(p, 3))
    
    print("\n--- 采样测试 ---")
    print("T=0.0 (贪心采样):", vocab[sample_next_token(logits, temperature=0.0)])
    print("T=0.7 (标准采样, seed=1):", vocab[sample_next_token(logits, temperature=0.7, seed=1)])
    print("T=1.5 (高温采样, seed=3):", vocab[sample_next_token(logits, temperature=1.5, seed=3)])

next_token_demo()
```

**控制台输出：**
```text
温度 T=0.2 概率分布: [0.506 0.307 0.186 0.    0.   ]
温度 T=0.7 概率分布: [0.358 0.31  0.269 0.042 0.021]
温度 T=1.5 概率分布: [0.291 0.272 0.254 0.107 0.077]

--- 采样测试 ---
T=0.0 (贪心采样): 技术
T=0.7 (标准采样, seed=1): 应用
T=1.5 (高温采样, seed=3): 应用
```

---

## 核心概念辨析

- **数据库检索 vs 概率自回归**：
  - 大模型不是检索固定答案，而是基于前序上下文计算词表概率并逐步采样。
- **Logits vs 概率分布**：
  - Logits 是 LM Head 线性投影得到的未归一化实数得分；
  - Softmax 将 Logits 映射为总和为 1.0 的非负概率分布。
- **Temperature vs Top-P**：
  - Temperature 改变概率分布的平滑程度；
  - Top-P 根据累积概率动态截断低概率长尾词。
- **微调训练 vs 上下文学习（ICL）**：
  - 微调通过反向传播修改模型权重参数；
  - 上下文学习在 $\Delta W = 0$ 的前提下，利用自注意力机制在前向传播中约束概率空间。

既然每一次生成都是基于前置上下文的概率约束，那么我们输入的提示词到底是如何引导这台概率机器的？下一篇我们将探讨——《提示词在做什么》。

---

## 参考文献

1. Holtzman, A., Buys, J., Du, L., et al. (2020). [*The Curious Case of Neural Text Degeneration*](https://arxiv.org/abs/1904.09751). ICLR 2020 / arXiv:1904.09751.
2. Brown, T. B., Mann, B., Ryder, N., et al. (2020). [*Language Models are Few-Shot Learners*](https://arxiv.org/abs/2005.14165). NeurIPS 2020 / arXiv:2005.14165.
3. Xie, S. M., Raghunathan, A., Liang, P., & Ma, T. (2022). [*An Explanation of In-context Learning as Implicit Bayesian Inference*](https://arxiv.org/abs/2111.02080). ICLR 2022 / arXiv:2111.02080.
4. von Oswald, J., Niklasson, E., Randazzo, E., et al. (2023). [*Transformers Learn In-Context by Gradient Descent*](https://arxiv.org/abs/2212.07677). ICML 2023 / arXiv:2212.07677.
