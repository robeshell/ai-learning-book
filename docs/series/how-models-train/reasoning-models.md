---
title: "深度推理与慢思考模型"
description: "思维链（CoT）、可验证规则强化（RLVR）与慢思考。"
series: how-models-train
chapter: deep-thinking
order: 5
type: concept
articleStatus: draft
prerequisites:
  - "rlhf-and-dpo"
videoSource: reasoning-models
---

# 深度推理与慢思考模型

在经历了预训练、SFT 与偏好对齐后，大语言模型已经能够流畅地回答各种开放式问题。但在面对高难度的数学证明、算法设计或严密的逻辑谜题时，标准对话模型往往表现出局限——单步推导出错后，后续自回归生成容易在错误前提下继续推演。

以 OpenAI o1 和 DeepSeek-R1 为代表的**深度推理 / 慢思考模型（Reasoning Models）** 引入了新的训练与推理机制。

为什么传统模型在长链推理中容易出错？慢思考模型是如何在输出前展开多步推演与自纠错的？为什么说测试时计算（Test-Time Compute）构成了算力扩展的新维度？

本篇将从双系统理论、思维链机制与规则驱动强化学习出发，解析深度推理模型的核心原理。

<figure>
  <img src="/figures/reasoning-models/system1-vs-system2.svg" alt="快思考 System 1 与慢思考 System 2 的生成机制对比" />
  <figcaption>快思考 vs 慢思考：直觉直出与长思维链</figcaption>
</figure>

---

## 思考的双系统机制

在认知心理学中，人类的思考常被划分为两种模式：
- **系统 1（快思考）**：依赖本能与直觉，自动化运行、响应快。例如脱口而出简单的加法口诀；
- **系统 2（慢思考）**：调动集中注意力与严密逻辑，逐步推演并反复核算。例如在草稿纸上进行复杂的多位数乘除或定理推导。

标准大语言模型在前向推理时主要对应 **系统 1** 特征：
- 无论面对简单的问候还是复杂的逻辑证明，Transformer 单次前向传播所执行的网络层数与浮点运算量是**固定且一致**的；
- 模型需要在有限的 Token 内直接生成最终结果。单步决策失误会导致错误在后续生成中逐步放大。

**深度推理模型（系统 2）** 则在输出最终答案前，在特定的标记（如 `<think>`）内生成一定数量的 **思考 Token（Thinking Tokens）**，模拟在草稿纸上的推演、反思与自验证过程。

---

## 思维链（CoT）与工作记忆

2022 年，Wei 等人提出了 **思维链（Chain-of-Thought, CoT）** 机制。

思维链在计算层面的核心逻辑主要体现为两点：

1. **有效计算步数的动态展开**：
   - 对于层数为 $L$ 的 Transformer，单次前向传播的非线性变换深度受限于 $L$；
   - 当模型生成中间思考 Token $t_1$ 后，在预测 $t_2$ 时，自注意力机制可基于 $t_1$ 的特征进行再次计算。生成 $M$ 个思考 Token，实质上将有效的前向计算深度延伸了 $M$ 步。
2. **中间状态的物理持久化**：
   - 多步推导中的中间变量与假设被记录在上下文窗口中，作为后续计算随时可回溯访问的显存依据，减轻了在高维隐向量中维持长程状态的压力。

---

## 可验证规则强化学习（RLVR）

在早期实现中，思维链主要依赖人工标注的推导演示样本进行 SFT 模仿。但人工标注成本高昂，且容易限制模型的解题策略空间。

现代深度推理模型转向了 **RLVR（Reinforcement Learning with Verifiable Rewards，可验证奖励强化学习）** 范式：

<figure>
  <img src="/figures/reasoning-models/test-time-compute.svg" alt="测试时计算标度律与 RLVR 可验证规则强化学习" />
  <figcaption>测试时计算与 RLVR 可验证规则强化</figcaption>
</figure>

### 1. 确定性规则奖励
在数学计算、算法竞赛与形式化逻辑等领域，不需要人工对中间过程打分：
- **准确率奖励（Accuracy Reward）**：将模型最终答案与标准答案进行符号比对，或在沙箱中运行单元测试，正确得正向奖励，错误得 0 分；
- **格式奖励（Format Reward）**：要求模型在特定标签内完成思考推演，并在标签外给出清晰的最终结论。

### 2. 策略优化与反思演化（GRPO / PPO）
针对同一个复杂题目，让模型采样生成多种不同的思考路径（如 16 条解法）：
- 仅依据最终答案正误计算相对优势，反向更新策略模型；
- 在大规模强化学习过程中，模型在没有人工干预具体思考模板的前提下，自发展开多路径尝试、回溯验算与假设推翻等推理行为。

---

## 测试时计算（Test-Time Compute）

传统的标度律主要关注预训练阶段的模型参数量 $N$ 与训练数据量 $D$。

深度推理模型拓展了 **测试时计算标度律（Inference-Time Scaling Law）**：
- 在模型参数量固定的前提下，**推理阶段分配的计算资源越多（生成的思考 Token 越多、并行采样的候选路径越多），复杂任务的解题成功率越高**；
- 使得系统能够根据任务难度动态调配资源：简单查询快速直出，复杂科研计算与算法设计则通过多路径搜索与多数投票进行深度推演。

---

## 慢思考的客观局限性

深度推理模型显著提升了数理逻辑能力，但在应用中也存在特定约束：

1. **过度推演（Overthinking）**：面对基础简单常识，模型也可能在思考标签内展开冗长分析，增加了推理延迟与显存开销；
2. **先验缺失下的虚假推演**：如果基座模型在预训练中未曾沉淀相关领域的底层知识，长链思考无法凭空产生事实，仍可能生成看似严谨但前提虚假的推导；
3. **缺乏客观判据领域的受限**：在缺乏确定性客观真值表的文史哲学等领域，RLVR 规则奖励难以直接部署。

---

## 最小代码实现

以下代码演示了测试时计算中的 **自洽性多数投票（Self-Consistency Voting）** 逻辑：通过并行采样多条推导路径并聚合最终结果，降低单次采样的偶然偏差：

```python
import re
from collections import Counter

sampled_reasoning_paths = [
    {
        "id": "path_1",
        "thought": "12 - 3 = 9 (剩余). 买入 9 * 2 = 18. 现在共有 9 + 18 = 27.",
        "answer_str": "最终答案: 27"
    },
    {
        "id": "path_2",
        "thought": "12 - 3 = 9. 又买了 2 倍原本剩余: 9 * 2 = 18. 9 + 18 = 27.",
        "answer_str": "最终答案: 27"
    },
    {
        "id": "path_3",
        "thought": "吃了 3 个剩 9 个，买了 12 的 2 倍即 24 个(误读题意)，9 + 24 = 33.",
        "answer_str": "最终答案: 33"  # 偶发性单步逻辑偏差
    },
    {
        "id": "path_4",
        "thought": "初始 12，吃 3 剩 9。新增买入 18。总计 9 + 18 = 27。",
        "answer_str": "最终答案: 27"
    },
    {
        "id": "path_5",
        "thought": "9 + (9 * 2) = 27。",
        "answer_str": "最终答案: 27"
    }
]

def extract_final_answer(text: str) -> str:
    """正则提取结论中的数值答案"""
    match = re.search(r"(\d+)", text)
    return match.group(1) if match else "UNKNOWN"

def self_consistency_demo():
    extracted_answers = []
    for p in sampled_reasoning_paths:
        ans = extract_final_answer(p["answer_str"])
        extracted_answers.append(ans)
        print(f"{p['id']} 提取答案: {ans} (思考摘要: {p['thought'][:25]}...)")
        
    votes = Counter(extracted_answers)
    winner_ans, winner_count = votes.most_common(1)[0]
    confidence = (winner_count / len(sampled_reasoning_paths)) * 100.0
    
    print(f"\n--- 自洽性多数投票判定 ---")
    print(f"候选答案得票: {dict(votes)}")
    print(f"最终胜出答案: {winner_ans} (置信胜率: {confidence:.1f}%)")

self_consistency_demo()
```

**控制台输出：**
```text
path_1 提取答案: 27 (思考摘要: 12 - 3 = 9 (剩余). 买入 9 * 2...)
path_2 提取答案: 27 (思考摘要: 12 - 3 = 9. 又买了 2 倍原本剩余: ...)
path_3 提取答案: 33 (思考摘要: 吃了 3 个剩 9 个，买了 12 的 2 倍即 ...)
path_4 提取答案: 27 (思考摘要: 初始 12，吃 3 剩 9。新增买入 18。总计 ...)
path_5 提取答案: 27 (思考摘要: 9 + (9 * 2) = 27。...)

--- 自洽性多数投票判定 ---
候选答案得票: {'27': 4, '33': 1}
最终胜出答案: 27 (置信胜率: 80.0%)
```

---

## 核心概念辨析

- **快思考（System 1） vs 慢思考（System 2）**：
  - 快思考单步直接预测，计算延迟低但难以承受长链推理；
  - 慢思考通过生成中间思考 Token 扩展有效计算步数，支持回溯与自纠错。
- **SFT 模仿思维链 vs RLVR 强化学习思维链**：
  - SFT 思维链依赖人工编写的推导范式；
  - RLVR 基于客观答案对错反馈，促使模型自发展开解题路径探索。
- **预训练标度律 vs 测试时计算标度律**：
  - 预训练标度律通过扩大参数量与数据量提升固有知识储备；
  - 测试时计算标度律通过在推理阶段投入更多 Token 与采样预算提升解题上限。

模型经过多阶段训练后虽然能力强大，但在工业部署中，千亿模型对显存与计算资源有着严苛的要求。如何对模型进行轻量化压缩，使其在受限硬件上高效运行？下一篇我们将探讨——《模型蒸馏与量化压缩》。

---

## 参考文献

1. Wei, Jason, Wang, Xuezhi, Schuurmans, Dale, et al. (2022). [*Chain-of-Thought Prompting Elicits Reasoning in Large Language Models*](https://arxiv.org/abs/2201.11903). NeurIPS 2022 / arXiv:2201.11903.
2. Wang, Xuezhi, Wei, Jason, Schuurmans, Dale, et al. (2022). [*Self-Consistency Improves Chain of Thought Reasoning in Language Models*](https://arxiv.org/abs/2203.11171). ICLR 2023 / arXiv:2203.11171.
3. Snell, Charlie, Lee, Jaehoon, Xu, Kelvin, & Levine, Sergey. (2024). [*Scaling LLM Test-Time Compute Optimally can be More Effective than Scaling Model Parameters*](https://arxiv.org/abs/2408.03314). arXiv:2408.03314.
4. DeepSeek-AI. (2025). [*DeepSeek-R1: Incentivizing Reasoning Capability in LLMs via Reinforcement Learning*](https://arxiv.org/abs/2501.12948). arXiv:2501.12948.
5. Kahneman, Daniel. (2011). *Thinking, Fast and Slow*. Farrar, Straus and Giroux.
