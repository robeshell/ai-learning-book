---
title: "长文本退化与注意力衰减"
description: "长文本注意力衰减、迷失在中间与召回劣化。"
series: multimodal-and-limits
chapter: boundaries
order: 4
type: concept
articleStatus: draft
prerequisites:
  - "context-window"
videoSource: context-rot
---

# 长文本退化与注意力衰减

近年来，大模型的上下文窗口（Context Window）经历了极其激进的军备竞赛：从早期的 4k、8k，一路狂飙至 128k、100 万（1M），甚至是 1000 万 Token。

厂商宣传中常常宣称：「*你可以一口气把几十本书、整套企业代码库全部塞进窗口里向模型提问！*」

然而，在真实工程实践中，许多开发者却发现：**当把几十万字的资料全部灌给大模型时，它开始频繁答非所问、遗忘核心指令，甚至编造事实。**

标称的上下文长度真的等同于模型的有效工作记忆吗？为什么模型会「迷失在中间」？

这就是超长上下文背后的数学物理诅咒——**长文本认知退化（Context Rot）与注意力稀释（Attention Dilution）**。

<figure>
  <img src="/figures/context-rot/lost-in-the-middle-u-curve.svg" alt="长文本认知陷阱：迷失在中间（Lost in the Middle）U 型曲线" />
  <figcaption>长文本中间迷失 U 型召回曲线</figcaption>
</figure>

---

## 大海捞针测试与多跳推理差异

在长文本宣传中，各厂商最喜欢展示全绿色的「**大海捞针测试（Needle In A Haystack, NIAH, Kamradt, 2023）**」热力图：
- 测试者在一篇几十万字的随机文本中插入一句毫无关联的高对比度语句（例如：「*特别密码是香蕉42*」）；
- 然后询问模型：「*特别密码是什么？*」，模型几乎能 100% 准确命中。

**但大海捞针测试与真实业务存在差异**：
1. **合成针是人工高对比度异常值**：合成的句子与周围的背景文本语义完全正交，自注意力极易捕捉这种局部梯度突变；
2. **真实业务需要多跳逻辑综合**：真实的长文本任务（如「比对三份财报中的现金流矛盾」）需要模型在不同章节之间建立跨越数万 Token 的高阶逻辑关联，此时模型的表现会明显下滑。

---

## 中间迷失与 U 型位置偏差

斯坦福大学在 2023 年的一项经典研究（**Liu et al., 2023**）揭示了大模型对长文本处理的先天缺陷：**迷失在中间（Lost in the Middle）**。

当把关键信息放置在长上下文的不同深度时，模型的检索与推理准确率呈现出一条明显的 **U 型曲线**：
- **首部（0% ~ 10% 深度）—— 首因效应（Primacy Effect）**：准确率最高（> 90%）。系统提示词与开头文本在预训练和自注意力中享有天然的高权重先验；
- **尾部（90% ~ 100% 深度）—— 近因效应（Recency Effect）**：准确率极高（> 85%）。刚输入的最新 Query 处于局部的短程注意力焦距内；
- **中间区域（30% ~ 70% 深度）—— 迷失盲区**：准确率**出现明显下滑至 40% ~ 50%**。大量埋藏在文档中间的关键事实容易被模型忽略。

---

## Softmax 归一化与注意力稀释

为什么模型会发生这种退化？其物理根源直接来自 Transformer 自注意力机制中的 **Softmax 归一化公式**：

$$\text{Attention}(\mathbf{Q}, \mathbf{K}, \mathbf{V}) = \text{softmax}\left( \frac{\mathbf{Q} \mathbf{K}^T}{\sqrt{d_k}} \right) \mathbf{V}$$

对于第 $i$ 个查询 Token，它对所有前序 $N$ 个键 Token 的注意力权重为：

$$\alpha_{i, j} = \frac{\exp(s_{i, j})}{\sum_{k=1}^N \exp(s_{i, k})}, \quad \text{其中 } \sum_{j=1}^N \alpha_{i, j} = 1$$

<figure>
  <img src="/figures/context-rot/attention-dilution-softmax.svg" alt="Softmax 归一化在超长文本下的注意力稀释（Attention Dilution）" />
  <figcaption>超长文本下注意力稀释与弥散机制</figcaption>
</figure>

1. **短文本（$N \le 2048$）**：
   - 分母的累加项较少，真正相关的关键事实 Token 能够获得 **$70\% \sim 80\%$** 的压倒性概率峰值，注意力高度聚焦；
2. **超长文本（$N \ge 128{,}000$）**：
   - 分母包含了十万个无关的背景噪音 Token；
   - 即使每个噪音 Token 的得分极小（例如 $\exp(s) \approx 0.001$），但**十万个微小概率累加起来，分母被急剧放大**；
   - 最终导致关键事实 Token 的概率被稀释到 **$10\%$ 以下**，注意力分布从尖锐变为弥散高熵，模型陷入「认知退化与疲劳（Context Rot）」，开始依靠语言先验生成内容。

---

## 长窗口与 RAG 选型原则

面对注意力衰减与物理成本，工程师应当遵循以下核心工程原则：

1. **核心指令与关键事实首尾放置**：
   - 必须严格遵循的约束放在 System Prompt（首部）；
   - 具体的待解答问题与最新上下文放在最后（尾部）；
   - 避免将最重要的业务规则埋在一长串参考文档的中间。
2. **高精度业务依然选择精准 RAG**：
   - 100 万 Token 窗口适合**通读概括**与**宏观主题聚类**；
   - 但对于财务审计、医疗诊断、法律合同等**高精度事实问答**，先切块检索（RAG）出最相关的 3~5 个段落（2k Token）再喂给模型，准确率与性价比显著高于塞入几十万字。

---

## 最小代码实现

下面的代码使用纯 NumPy 模拟了随着上下文长度 $N$ 从 10 激增到 10,000 时，关键事实 Token 的注意力权重是如何被海量背景噪声逐步冲淡的：

```python
import numpy as np

def simulate_attention_dilution(seq_lengths: list, signal_score: float = 8.0, noise_mean: float = 1.0) -> None:
    """
    模拟不同上下文长度下的 Softmax 稀释效应
    signal_score: 关键线索 Token 的内积得分 (高相关性)
    noise_mean: 普通无关背景 Token 的内积得分均值
    """
    h1 = "上下文长度 (N)"
    h2 = "关键事实 Token 权重 (%)"
    h3 = "背景噪声总权重 (%)"
    print(f"{h1:<16} | {h2:<22} | {h3:<20} | 聚焦状态")
    print("-" * 75)

    for N in seq_lengths:
        np.random.seed(42)
        # 生成 1 个关键事实得分 + (N-1) 个背景噪声得分
        noise_scores = np.random.normal(loc=noise_mean, scale=0.5, size=N - 1)
        all_scores = np.concatenate([[signal_score], noise_scores])
        
        # 计算 Softmax 归一化概率
        exp_scores = np.exp(all_scores - np.max(all_scores))
        softmax_probs = exp_scores / np.sum(exp_scores)
        
        target_prob = softmax_probs[0] * 100
        noise_total_prob = (1.0 - softmax_probs[0]) * 100
        
        status = "极度聚焦" if target_prob > 60 else ("开始弥散" if target_prob > 20 else "严重稀释 (Context Rot)")
        print(f"{N:<18} | {target_prob:>20.2f}% | {noise_total_prob:>18.2f}% | {status}")

# 模拟从短文本 (10 Token) 到长文本 (10,000 Token) 的注意力演化
simulate_attention_dilution(seq_lengths=[10, 100, 500, 2000, 10000])
```

**控制台输出：**
```text
上下文长度 (N)        | 关键事实 Token 权重 (%)      | 背景噪声总权重 (%)          | 聚焦状态
---------------------------------------------------------------------------
10                 |                98.92% |               1.08% | 极度聚焦
100                |                91.34% |               8.66% | 极度聚焦
500                |                65.89% |              34.11% | 极度聚焦
2000               |                32.17% |              67.83% | 开始弥散
10000              |                 8.83% |              91.17% | 严重稀释 (Context Rot)
```

---

## 核心概念辨析

- **标称窗口 vs 有效工作记忆**：
  - 标称窗口是能塞进显存计算的最大 Token 长度；
  - 有效工作记忆是模型能精准保持逻辑关联的注意力聚焦深度。
- **合成大海捞针 vs 真实长文本任务**：
  - 大海捞针是高对比度人造特征匹配，全绿不代表真实长文本能力无懈可击；
  - 真实业务需要跨多段落复杂逻辑综合，易受「迷失在中间」影响。
- **长窗口 vs RAG 架构**：
  - 长窗口解决了大篇幅通读与宏观概括问题；
  - 精准 RAG 依然是保证事实问答高准确率、低延迟与低成本的最优解。

随着大模型席卷全球，Scaling Law 是否能一直无休止延续下去？大模型不可逾越的客观物理边界究竟在哪里？下一篇我们将探讨全书终篇——《大模型的物理极限》。

---

## 参考文献

1. Liu, Nelson F., Lin, Kevin, Hewitt, John, et al. (2023). [*Lost in the Middle: How Language Models Use Long Contexts*](https://arxiv.org/abs/2307.03172). TACL 2024 / arXiv:2307.03172.
2. Kamradt, Greg. (2023). [*Needle In A Haystack: Pressure Testing LLM Context Recall*](https://github.com/gkamradt/LLMTest_NeedleInAHaystack). GitHub Benchmark.
3. Xiao, Guangxuan, Tian, Yuandong, Chen, Beidi, et al. (2023). [*Efficient Streaming Language Models with Attention Sinks (StreamingLLM)*](https://arxiv.org/abs/2309.17453). ICLR 2024 / arXiv:2309.17453.
4. Peng, Bowen, Quesnelle, Jeffrey, Fan, Honglu, & Shippole, Enrico. (2023). [*YaRN: Efficient Context Window Extension of Large Language Models*](https://arxiv.org/abs/2309.00071). ICLR 2024 / arXiv:2309.00071.
