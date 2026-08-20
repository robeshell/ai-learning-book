---
title: "为什么大模型会幻觉"
description: "极大似然估计、逆转诅咒与外部锚定必要性。"
series: understand-ai
chapter: limits
order: 10
type: concept
articleStatus: draft
prerequisites:
  - "next-token"
  - "prompt"
videoSource: hallucination
---

# 为什么大模型会幻觉

在实际使用大语言模型时，常会遇到这样一种现象：

模型以严谨、流畅且权威的口吻，生成了一份结构完整的学术解答，甚至附带了作者、期刊名称与出版年份；然而在数据库中检索时，却发现**该论文或结论在现实中并不存在**。

这种现象被称为大模型的 **幻觉（Hallucination）**。

一种常见的误解是：幻觉只是模型参数量不够大或训练语料不够多时的工程缺陷。然而从统计学习与信息论的视角来看，**幻觉是自回归概率生成架构在数学上的自然伴生物**。

<figure>
  <img src="/figures/hallucination/syntax-vs-fact.svg" alt="句法流畅度与事实真实性象限" />
  <figcaption>句法流畅度与事实真实性的二维解耦关系</figcaption>
</figure>

---

## 统计概率与客观真实的分离

人类在日常交流中容易将“语言的流畅度”等同于“事实的掌握度”。但在大模型的训练机制中，两者是完全解耦的：

- **大模型的训练目标**：基于海量文本执行 **极大似然估计（Maximum Likelihood Estimation, MLE）**，最大化序列中下一个词的对数共现概率：

$$\max_{\theta} \sum_{t=1}^T \log P(w_t \mid w_{<t}; \theta)$$

**该目标的优化导向是“下一个词在统计上下文中的搭配合理性”，而非“该命题在物理世界中是否真实”**。

语言的语法句式（主谓宾搭配、连词转折、修辞套路）在语料库中高度重复且高频出现；而具体的事实知识（如特定事件的准确数字、专有名词定义）则分布在稀疏的长尾区间。当模型遇到知识盲区时，为了保持全局语法的通顺连贯，依然会生成符合概率统计习惯的虚构词汇。

---

## 幻觉产生的三个主要机理

<figure>
  <img src="/figures/hallucination/causes-breakdown.svg" alt="大模型幻觉的底层物理机理" />
  <figcaption>大模型幻觉的三大底层物理与数学机理</figcaption>
</figure>

### 1. 长尾分布与自回归累积偏航
知识在现实语料中的分布具有极度不均衡的特性（齐夫定律）：
- 对于低频的长尾事实，模型内部前馈网络对该知识的记忆强度较低；
- 在输出端，预测该位置的 Logits 分布较为平缓（香农熵较高）；
- 在带随机性的采样（$T > 0$）中，模型可能选中了一个语法通顺但事实错误的词。**由于自回归生成的特性，该错误词会作为后续生成的上下文前缀，导致后续步骤在错误前提下继续生成**。

### 2. 逆转诅咒（The Reversal Curse）
研究表明，自回归 Transformer 存在单向因果注意力的固有局限：
- 若模型在训练集中学习了命题 **“A 的母亲是 B”**；
- 提问“A 的母亲是谁”时模型能够正确回答出“B”；
- 但反向提问 **“B 的儿子是谁”** 时，准确率会出现显著下降，并可能随机生成人名。

这是因为自回归模型仅学习了从左到右的单向前缀条件概率 $P(B \mid A)$，并未自动构建双向的知识关联。

### 3. 强化学习对齐带来的谄媚倾向
在基于人类反馈的强化学习（RLHF）中，人类标注员更容易对排版整洁、语气自信的回答给出高分。
- 奖励模型倾向于鼓励模型生成看似权威、格式完整的文本，而非直接回答“未知”；
- 这可能导致模型在面对诱导性问题时倾向于顺应用户前提编造回答，产生谄媚效应（Sycophancy）。

---

## 不确定性与语义熵检测

虽然自回归模型缺乏物理校验机制，但我们可以通过分析输出分布的 **香农熵（Shannon Entropy）** 与 **前两名得分差距（Margin）** 来评估模型当前生成的不确定性：

$$\text{Entropy} = -\sum_{i=1}^{|V|} P(w_i) \log_2 P(w_i)$$

- 当熵值极低且 Margin 较大时，模型处于高确定性的知识区间；
- 当熵值显著升高且多个候选词概率接近时，模型处于概率弥散状态，产生事实幻觉的风险大幅上升。

---

## 外部锚定与确定性约束

由于单一自回归模型无法从根本上消除统计概率带来的幻觉，在实际工程应用中，需要引入 **外部落地锚定（Grounding）与确定性约束体系**：

<figure>
  <img src="/figures/hallucination/grounding-bridge.svg" alt="从概率生成到系统锚定的演进" />
  <figcaption>从概率生成到外部系统锚定（Grounding）的技术演进</figcaption>
</figure>

1. **训练层约束**：通过 SFT 与 DPO/PPO 引导模型在缺乏依据时拒绝回答；
2. **检索增强（RAG）**：将权威参考文档作为上下文输入，利用自注意力机制锚定事实依据；
3. **工具调用（Tool Calling / MCP）**：将数学计算、数据库查询与代码执行交由确定性系统处理；
4. **智能体环境反馈（Agent Loop）**：通过“规划 - 执行 - 环境验证 - 反思修复”的物理回路，检验执行结果。

---

## 常见认知误区

### 1. 为什么模型会给出真实存在的学者姓名搭配虚构的论文？
大模型不是关系型数据库。它在预训练中学习了“该学者是该领域活跃研究者”的统计特征，同时也学习了“该领域论文标题的常见词汇模式”。在自回归生成时，注意力机制将这两个高频概率特征组合在了一起。

### 2. 扩大参数规模是否能彻底消除幻觉？
不能。增大参数量能够扩展模型的知识容量（覆盖更多长尾知识），但自回归概率生成的本质决定了模型在面对分布外数据或长链推理时，依然存在累积误差与统计漂移的可能。

---

## 最小代码实现

以下代码演示了基于输出 Logits 计算香农熵与 Margin 以评估事实生成不确定性的逻辑：

```python
import numpy as np

def analyze_uncertainty(logits: np.ndarray) -> dict:
    """
    通过 Logits 计算香农熵与 Top-1 / Top-2 Margin 评估不确定性
    """
    # 1. 转换为 Softmax 概率分布
    exp_logits = np.exp(logits - np.max(logits))
    probs = exp_logits / np.sum(exp_logits)
    
    # 2. 计算香农熵 H(X) = -Σ P(w) * log2(P(w))
    safe_probs = probs[probs > 1e-12]
    entropy = -np.sum(safe_probs * np.log2(safe_probs))
    
    # 3. 计算 Top-1 概率与 Margin (前两名概率差)
    sorted_probs = np.sort(probs)[::-1]
    top1_p = sorted_probs[0]
    top2_p = sorted_probs[1]
    margin = top1_p - top2_p
    
    # 4. 评估置信等级
    if entropy < 1.0 and margin > 0.6:
        risk = "低风险 (高确信事实)"
    elif entropy < 2.0:
        risk = "中风险 (概率发散)"
    else:
        risk = "高风险 (高度疑似幻觉)"
        
    return {
        "entropy": round(float(entropy), 3),
        "top1_prob": round(float(top1_p), 3),
        "margin": round(float(margin), 3),
        "risk_level": risk
    }

def hallucination_demo():
    # 场景 1: 高频常识事实 (如 "法国的首都是" -> "巴黎")
    logits_fact = np.array([12.5, 3.2, 1.1, 0.5, 0.1])
    res_fact = analyze_uncertainty(logits_fact)
    print("场景 1 (高频常识):", res_fact)
    
    # 场景 2: 长尾盲区 (如 捏造冷门文献标题)
    logits_hallucination = np.array([2.1, 2.0, 1.9, 1.8, 1.7])
    res_hal = analyze_uncertainty(logits_hallucination)
    print("场景 2 (长尾盲区):", res_hal)

hallucination_demo()
```

**控制台输出：**
```text
场景 1 (高频常识): {'entropy': 0.002, 'top1_prob': 1.0, 'margin': 1.0, 'risk_level': '低风险 (高确信事实)'}
场景 2 (长尾盲区): {'entropy': 2.308, 'top1_prob': 0.242, 'margin': 0.023, 'risk_level': '高风险 (高度疑似幻觉)'}
```

---

## 核心概念辨析

- **统计搭配合理性 vs 物理事实真实性**：
  - 极大似然估计优化的是词汇共现的统计规律，不直接校验现实世界的真伪。
- **句法流畅度 vs 知识准确度**：
  - 语法结构是高频确定的，事实知识分布在长尾稀疏区间，表达流畅不代表内容属实。
- **逆转诅咒（Reversal Curse）**：
  - 自回归单向条件概率导致模型学会了 $A \to B$ 无法自动推导出 $B \to A$。
- **孤立参数生成 vs 外部系统锚定**：
  - 依赖单体模型参数无法彻底消除幻觉，需要结合 RAG、Tool Calling 与 Agent 闭环共同保障输出可靠性。

至此，我们已经完成了第一季《搞懂大模型》的全部核心概念剖析。下一季，我们将深入模型的生产流程，探讨模型是如何一步步训练出来的——《预训练与基座模型》。

---

## 参考文献

1. Berglund, L., Stickland, A. C., Balesni, M., et al. (2023). [*The Reversal Curse: LLMs trained on "A is B" fail to learn "B is A"*](https://arxiv.org/abs/2309.12288). arXiv:2309.12288.
2. Perez, E., Ringer, S., Lukošiūtė, K., et al. (2022). [*Discovering Language Model Behaviors with Model-Written Evaluations*](https://arxiv.org/abs/2212.09251). Anthropic / arXiv:2212.09251.
3. Farquhar, S., Kossen, J., Kuhn, L., & Gal, Y. (2024). [*Detecting hallucinations in large language models using semantic entropy*](https://www.nature.com/articles/s41586-024-07421-0). Nature, 630(8017), 625-630.
4. Ji, Z., Lee, N., Frieske, R., et al. (2023). [*Survey of Hallucination in Natural Language Generation*](https://dl.acm.org/doi/10.1145/3571730). ACM Computing Surveys, 55(12), 1-38.
