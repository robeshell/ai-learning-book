---
title: "SFT 指令微调"
description: "监督指令微调、问答格式对齐与模型角色扮演。"
series: how-models-train
chapter: alignment
order: 3
type: concept
articleStatus: draft
prerequisites:
  - "pre-training"
videoSource: sft
---

# SFT 指令微调

在完成预训练后，基座模型具备了广泛的语言规律与常识知识。但从行为模式来看，Base 模型本质上是面向文本续写的生成器。当输入 `“请解释什么是操作系统的虚拟内存”` 时，它可能会将其当作教材目录继续罗列 `“2. 进程管理 3. 文件系统”`，而不是直接给出一份结构清晰的解答。

如何让模型理解人类的指令意图，并按照问答助手的格式进行交互？

这是后训练（Post-training）的第一道关键工序——**SFT（Supervised Fine-Tuning，监督微调 / 指令微调）**。

<figure>
  <img src="/figures/sft/chatml-loss-mask.svg" alt="ChatML 角色封装与 SFT 损失掩码机制" />
  <figcaption>ChatML 角色封装与损失掩码（Loss Mask）</figcaption>
</figure>

---

## 指令微调的目标与样本形态

**指令微调（Instruction Tuning）** 指在预训练好的 Base 模型基础之上，使用结构化的“指令-回答”成对数据（Prompt-Response Pairs），继续执行有监督的自回归训练。

在预训练阶段，模型接触的是海量无结构网页；而在 SFT 阶段，训练样本具有明确的任务指向：

- **指令（Prompt）**：`"请将以下 Python 代码重构为时间复杂度更优的版本：..."`
- **目标回答（Response）**：`"这是一份优化后的代码实现，主要改进点如下：..."`

通过在这类结构化样本上进行参数更新，模型建立了新的条件反射：当输入呈现为提问或任务指令时，输出应为符合要求的解答，并在完成作答后输出终止标记（`<|im_end|>` 或 `<EOS>`）停止生成。

---

## ChatML 模板与损失掩码（Loss Mask）

在底层实现中，输入数据依然是一维 Token 序列。模型需要通过明确的标记来区分系统设定、用户输入与模型自身的回答。

### 1. ChatML 格式与特殊标记（Special Tokens）
以常见的 ChatML 规范为例，输入文本在送入模型前会被格式化为带有特殊标记的序列：

```text
<|im_start|>system
你是一个严谨的编程助手。<|im_end|>
<|im_start|>user
快速排序的最坏时间复杂度是多少？<|im_end|>
<|im_start|>assistant
快速排序的最坏时间复杂度是 O(n²)。当每次选取的基准值均为当前区间的极值时会出现该情况。<|im_end|>
```

- `<|im_start|>` 与 `<|im_end|>` 为结构定界符；
- `system`、`user`、`assistant` 标明了各段文本的角色属性；
- 这些特殊标记在分词器中拥有独立的 Token ID。

### 2. 损失掩码（Loss Mask / Label Masking）
在 SFT 训练的前向传播与误差计算中，一个关键的工程处理是：**仅对 `assistant` 生成的回答部分计算交叉熵损失，而对 `system` 与 `user` 的输入部分施加掩码（Mask）忽略**。

- **避免拟合输入提示词**：若对用户提问和系统提示词也计算损失并反向传播，模型会消耗容量去拟合用户的提问习惯；
- **实现方式（`ignore_index = -100`）**：在主流深度学习框架（如 PyTorch CrossEntropyLoss）中，将 Prompt 部分对应的目标标签设定为 `-100`。反向传播时，这些位置的梯度为 0，仅有模型自身的回答内容参与权重更新。

---

## 表层对齐假说（LIMA）

在早期的大模型训练中，常有通过海量爬取或自动生成数十万条低质问答对进行微调的做法。

2023 年，Meta 团队在论文 [**《LIMA: Less Is More for Alignment》**](https://arxiv.org/abs/2305.11206) 中提出了 **表层对齐假说（Superficial Alignment Hypothesis）**：

<figure>
  <img src="/figures/sft/lima-quality-vs-quantity.svg" alt="LIMA 表层对齐假说：预训练知识内核与 SFT 交互表层" />
  <figcaption>表层对齐假说（LIMA）：预训练提供知识底座，SFT 调教交互外壳</figcaption>
</figure>

- **核心观点**：模型的大部分知识储备与推理能力在预训练阶段已经基本形成（约占 99%）；
- **SFT 的作用**：SFT 阶段主要在于调教模型的交互风格与输出规范（约占 1%）——引导模型以符合人类习惯的语气、格式（如 Markdown 排版）和角色设定组织语言；
- **质量优先于数量**：实验表明，使用 1,000 条高质量、格式严谨的精选样本训练的模型，在人工盲测评估中的表现优于使用数万条低质数据训练的模型。低质或含逻辑漏洞的 SFT 数据容易破坏预训练形成的知识分布。

---

## SFT 的局限性

虽然 SFT 能够建立良好的问答格式遵循能力，但单纯依靠监督微调存在以下局限：

1. **单一样本模仿的局限**：SFT 基于最大似然估计（MLE）模仿标准答案。但在开放式问答与复杂决策中，合理回答往往不唯一，过度拟合具体字句可能降低泛化灵活性；
2. **多目标权衡困难**：仅靠静态问答对难以精细调节模型在“实用性（Helpfulness）”与“安全性（Harmlessness）”之间的边界（例如处理诱导性攻击）；
3. **缺乏基于反馈的探索机制**：SFT 模型缺乏对生成质量的主动探索与奖惩信号，在面对知识盲区时依然可能为了降低 Token 损失而编造内容。

为了让模型更好地符合人类价值观、在复杂场景下做出稳健权衡，需要引入 **人类反馈强化学习（RLHF）与直接偏好对齐（DPO）**。

---

## 最小代码实现

以下代码演示了多轮对话数据的 ChatML 格式化及损失掩码（Loss Mask）标签构造逻辑：

```python
vocab = {
    "<PAD>": 0, "<|im_start|>": 1, "<|im_end|>": 2, "\n": 3,
    "system": 4, "user": 5, "assistant": 6,
    "你": 7, "是": 8, "助手": 9, "谁": 10, "我": 11, "AI": 12
}

def tokenize(text: str) -> list[int]:
    """基于词表的最长前缀匹配分词"""
    tokens = []
    sorted_words = sorted(vocab.keys(), key=len, reverse=True)
    i = 0
    while i < len(text):
        matched = False
        for word in sorted_words:
            if text[i:].startswith(word):
                tokens.append(vocab[word])
                i += len(word)
                matched = True
                break
        if not matched:
            tokens.append(vocab["<PAD>"])
            i += 1
    return tokens

def sft_masking_demo():
    messages = [
        {"role": "system", "content": "你是助手"},
        {"role": "user", "content": "谁是助手"},
        {"role": "assistant", "content": "我是AI助手"}
    ]
    
    input_ids = []
    labels = []
    IGNORE_INDEX = -100
    
    for msg in messages:
        role = msg["role"]
        content = msg["content"]
        header_text = f"<|im_start|>{role}\n"
        body_text = f"{content}<|im_end|>\n"
        
        header_tokens = tokenize(header_text)
        body_tokens = tokenize(body_text)
        block_tokens = header_tokens + body_tokens
        
        input_ids.extend(block_tokens)
        
        # 仅对 assistant 生成的回答内容计算损失，其余部分赋为 -100
        if role == "assistant":
            labels.extend([IGNORE_INDEX] * len(header_tokens))
            labels.extend(body_tokens)
        else:
            labels.extend([IGNORE_INDEX] * len(block_tokens))
            
    print(f"输入序列长度: {len(input_ids)}")
    print(f"Input IDs : {input_ids}")
    print(f"Labels    : {labels}")
    
    print("\n--- 逐 Token 损失掩码校验 ---")
    id_to_vocab = {v: k for k, v in vocab.items()}
    for idx, (t_in, t_lbl) in enumerate(zip(input_ids, labels)):
        token_str = id_to_vocab.get(t_in, "?")
        if token_str == "\n": token_str = "\\n"
        status = f"梯度反传 (Label={t_lbl})" if t_lbl != IGNORE_INDEX else "掩码忽略 (Label=-100)"
        print(f"位置 {idx:02d} | Token: {token_str:<12} -> {status}")

sft_masking_demo()
```

**控制台输出：**
```text
输入序列长度: 25
Input IDs : [1, 4, 3, 7, 8, 9, 2, 3, 1, 5, 3, 10, 8, 9, 2, 3, 1, 6, 3, 11, 8, 12, 9, 2, 3]
Labels    : [-100, -100, -100, -100, -100, -100, -100, -100, -100, -100, -100, -100, -100, -100, -100, -100, -100, -100, -100, 11, 8, 12, 9, 2, 3]

--- 逐 Token 损失掩码校验 ---
位置 00 | Token: <|im_start|> -> 掩码忽略 (Label=-100)
位置 01 | Token: system       -> 掩码忽略 (Label=-100)
位置 02 | Token: \n           -> 掩码忽略 (Label=-100)
位置 03 | Token: 你            -> 掩码忽略 (Label=-100)
位置 04 | Token: 是            -> 掩码忽略 (Label=-100)
位置 05 | Token: 助手          -> 掩码忽略 (Label=-100)
位置 06 | Token: <|im_end|>   -> 掩码忽略 (Label=-100)
位置 07 | Token: \n           -> 掩码忽略 (Label=-100)
位置 08 | Token: <|im_start|> -> 掩码忽略 (Label=-100)
位置 09 | Token: user         -> 掩码忽略 (Label=-100)
位置 10 | Token: \n           -> 掩码忽略 (Label=-100)
位置 11 | Token: 谁            -> 掩码忽略 (Label=-100)
位置 12 | Token: 是            -> 掩码忽略 (Label=-100)
位置 13 | Token: 助手          -> 掩码忽略 (Label=-100)
位置 14 | Token: <|im_end|>   -> 掩码忽略 (Label=-100)
位置 15 | Token: \n           -> 掩码忽略 (Label=-100)
位置 16 | Token: <|im_start|> -> 掩码忽略 (Label=-100)
位置 17 | Token: assistant    -> 掩码忽略 (Label=-100)
位置 18 | Token: \n           -> 掩码忽略 (Label=-100)
位置 19 | Token: 我            -> 梯度反传 (Label=11)
位置 20 | Token: 是            -> 梯度反传 (Label=8)
位置 21 | Token: AI           -> 梯度反传 (Label=12)
位置 22 | Token: 助手          -> 梯度反传 (Label=9)
位置 23 | Token: <|im_end|>   -> 梯度反传 (Label=2)
位置 24 | Token: \n           -> 梯度反传 (Label=3)
```

---

## 核心概念辨析

- **Base 基座模型 vs SFT 微调模型**：
  - Base 模型侧重文本统计续写，无对话角色认知；
  - SFT 模型通过成对问答数据训练，掌握了指令理解、排版与对话停机能力。
- **全序列损失 vs 损失掩码（Loss Mask）**：
  - 全序列损失会强制拟合输入提示词；
  - 损失掩码将 Prompt 标签置为 `-100`，使反向传播专注于模型回答部分。
- **表层对齐假说（LIMA）**：
  - 模型的深层知识主要来自预训练，SFT 侧重于调优交互风格与格式规范；
  - 高质量样本的训练效果显著优于大量低质爬虫数据。

经过 SFT 调优后，如何引导模型在复杂场景下权衡多方偏好并提升回答安全性？下一篇我们将探讨——《RLHF 与 DPO 偏好对齐》。

---

## 参考文献

1. Ouyang, Long, Wu, Jeffrey, Jiang, Xu, et al. (2022). [*Training language models to follow instructions with human feedback (InstructGPT)*](https://arxiv.org/abs/2203.02155). NeurIPS 2022 / arXiv:2203.02155.
2. Zhou, Chunting, Liu, Pengfei, Xu, Puxin, et al. (2023). [*LIMA: Less Is More for Alignment*](https://arxiv.org/abs/2305.11206). NeurIPS 2023 / arXiv:2305.11206.
3. Wei, Jason, Bosma, Maarten, Zhao, Vincent Y., et al. (2021). [*Finetuned Language Models are Zero-Shot Learners (FLAN)*](https://arxiv.org/abs/2109.01652). ICLR 2022 / arXiv:2109.01652.
4. Taori, Rohan, Gulrajani, Ishaan, Zhang, Tianyi, et al. (2023). [*Stanford Alpaca: An Instruction-following LLaMA model*](https://github.com/tatsu-lab/stanford_alpaca). GitHub repository.
