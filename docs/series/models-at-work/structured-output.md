---
title: "严格结构化输出"
description: "JSON Schema 约束、Grammar 语法树引导与确定性输出。"
series: models-at-work
chapter: action
order: 5
type: concept
articleStatus: draft
prerequisites:
  - "tool-calling"
videoSource: structured-output
---

# 严格结构化输出

在工具调用与自动化流水线中，下游系统通常依赖严格的数据契约（如 JSON / Protobuf / SQL）进行解析与入库。

然而，大语言模型在本质上是基于词表概率分布的自回归文本生成器。若仅依赖自然语言提示词约束格式，模型在小概率情况下仍可能出现多余前缀、格式标记缺失或括号不闭合等语法错误，导致下游反序列化解析失败。

如何保证大模型在输出结构化数据时实现确定性的语法合规？

本篇将从提示词软约束局限、语法引导状态机与 Logits 动态掩码出发，解析**严格结构化输出（Structured Outputs & Constrained Decoding）**的底层实现原理。

<figure>
  <img src="/figures/structured-output/constrained-decoding-fsm.svg" alt="约束解码与 Logits Masking 机制" />
  <figcaption>约束解码：状态机引导下的 Logits 采样屏蔽机制</figcaption>
</figure>

---

## 提示词软约束与长尾格式失效

在早期的提示工程中，开发者通常在提示词中追加格式要求：
```text
请提取以下文本中的姓名与年龄。
【要求】：只输出标准 JSON 格式，不要包含任何前言、解释或 Markdown 标记。
```

这种软约束在多数情况下有效，但在高并发生产环境中，容易出现以下长尾格式问题：
1. **前缀或后缀污染**：模型可能伴随生成礼貌用语（如 `“好的，提取结果如下：”`）；
2. **Markdown 格式包裹**：模型随机使用 ` ```json ` 代码块包裹内容，增加解析适配成本；
3. **闭合符号缺失**：在长文本或生成截断时，末尾的右花括号 `}` 或方括号 `]` 偶尔遗漏；
4. **类型偏离**：Schema 要求 `age` 为整数，模型输出为 `"age": "三十岁左右"`。

<figure>
  <img src="/figures/structured-output/soft-vs-hard-constraint.svg" alt="提示词软约束与约束解码硬约束对比" />
  <figcaption>提示词软约束 vs 约束解码硬约束机制对比</figcaption>
</figure>

---

## 语法引导的约束解码（Constrained Decoding）

为了彻底解决格式不确定性，现代推理框架（如 Outlines、Guidance 以及各大厂商的结构化输出模式）采用了 **语法引导的约束解码（Grammar-Constrained Decoding）**：

### 1. 将 Schema 编译为有限状态自动机（FSM）
在推理前，系统将给定的 JSON Schema 或上下文无关文法（CFG）编译为 **有限状态机（Finite State Machine, FSM）**：
- 状态机精确规定了在当前生成状态下，下一个合法的字符与 Token 集合；
- 例如：当输出完键名 `{"name":` 之后，下一个合法字符必须是双引号 `"`。

### 2. 动态 Logits 掩码（Logits Masking）
在模型计算出全词表的原始打分（Logits）后、执行 Softmax 采样之前：
- 系统查询当前状态机允许的合法 Token 集合；
- **将所有不合法的 Token 的 Logits 强制置为 $-\infty$**；
- 经过 Softmax 变换后，非法 Token 的采样概率在数学上归零。

通过在采样层进行状态拦截，约束解码从数学上保证了输出 100% 符合预定义的语法规则。

---

## 结构约束与事实真伪的边界

在应用结构化输出时，需要明确其能力范围：

- **保证数据格式契约（Syntactic Validity）**：
  若 Schema 定义了 `status` 为 `["APPROVED", "REJECTED"]` 之一，输出绝对不会出现非法字符串；若定义为浮点型，绝对不会输出文本；
- **不保证内容事实真伪（Factual Factuality）**：
  模型在合法的整数类型字段中，仍可能填入错误的事实数值（例如将 25 识别为 52）。

结构化输出保障的是工程通信接口的稳定性，数据内容的准确性依然取决于模型先验、检索上下文（RAG）与校验逻辑。

---

## 最小代码实现

以下代码演示了基于 Logits Masking 的约束解码采样逻辑：通过状态掩码将非法候选词的概率置零，强制模型输出符合语法的首字符：

```python
import numpy as np

def softmax(logits: np.ndarray) -> np.ndarray:
    e_x = np.exp(logits - np.max(logits))
    return e_x / e_x.sum()

def constrained_decoding_demo():
    # 1. 模拟微型词表
    vocab = ["{", "}", '"name"', '"age"', ":", " ", "28", "好的", "没问题", ","]
    token2id = {t: i for i, t in enumerate(vocab)}
    
    # 2. 模拟某步输出的原始 Logits (未加约束前模型倾向于输出闲聊词 "好的")
    raw_logits = np.array([0.1, 0.0, 0.2, 0.1, 0.0, 0.5, 0.3, 9.5, 8.2, 0.1])
    
    # 3. 语法状态机判定：当前状态为 JSON 起始位置，仅允许 "{"
    valid_tokens_at_start = ["{"]
    
    # 4. 执行 Logits Masking: 将所有非法 Token 打分置为 -inf
    masked_logits = raw_logits.copy()
    for i, token in enumerate(vocab):
        if token not in valid_tokens_at_start:
            masked_logits[i] = -np.inf
            
    # 5. 计算概率分布
    raw_probs = softmax(raw_logits)
    constrained_probs = softmax(masked_logits)
    
    print("--- 约束解码 (Constrained Decoding) 对比 ---")
    print(f"未加约束时采样到 '好的' 的概率: {raw_probs[token2id['好的']]:.4f}")
    print(f"未加约束时采样到 '{{' 的概率:    {raw_probs[token2id['{']]:.4f}\n")
    
    print("执行 Logits Masking 后:")
    print(f"非法词 '好的' 的采样概率:       {constrained_probs[token2id['好的']]:.4f}")
    print(f"合法符号 '{{' 的采样概率:        {constrained_probs[token2id['{']]:.4f}")

constrained_decoding_demo()
```

**控制台输出：**
```text
--- 约束解码 (Constrained Decoding) 对比 ---
未加约束时采样到 '好的' 的概率: 0.7854
未加约束时采样到 '{' 的概率:    0.0001

执行 Logits Masking 后:
非法词 '好的' 的采样概率:       0.0000
合法符号 '{' 的采样概率:        1.0000
```

---

## 核心概念辨析

- **提示词软约束 vs 语法约束解码**：
  - 提示词软约束基于概率引导，存在长尾格式错误风险；
  - 约束解码在采样层通过状态机掩码，提供确定性的语法合规保障。
- **语法合法性（Syntax） vs 事实准确性（Factuality）**：
  - 约束解码保证输出字段和数据结构的物理合法；
  - 字段内填充的数据内容是否符合现实事实，仍需依赖外部输入与校验。
- **自然语言对话 vs 结构化接口通信**：
  - 面向人类交互采用自然语言表达；
  - 面向微服务与数据库管道应采用严格的结构化输出契约。

当工具与结构化接口的规模持续增长时，如何通过开放标准协议连接异构数据源与工具服务？下一篇我们将探讨——《MCP 模型上下文协议》。

---

## 参考文献

1. Willard, Brandon T., & Louf, Rémi. (2023). [*Efficient Guided Generation for Large Language Models (Outlines)*](https://arxiv.org/abs/2307.09702). arXiv:2307.09702.
2. Geng, Saibo, Josifoski, Martin, Peyrard, Maxime, & West, Robert. (2023). [*Grammar-Constrained Decoding for Structured NLP Tasks with Large Language Models*](https://arxiv.org/abs/2305.13971). EMNLP 2023 / arXiv:2305.13971.
3. OpenAI. (2024). [*Introducing Structured Outputs in the API*](https://openai.com/index/introducing-structured-outputs-in-the-api/). OpenAI Official Announcements.
4. Beurer-Kellner, Luca, Fischer, Marc, & Vechev, Martin. (2023). [*Prompting Is Programming: A Query Language for Large Language Models (Guidance)*](https://arxiv.org/abs/2212.06094). PLDI 2023 / arXiv:2212.06094.
