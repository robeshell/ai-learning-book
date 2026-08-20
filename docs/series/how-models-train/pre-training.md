---
title: "预训练与基座模型"
description: "自监督接龙、Scaling Law 标度律与 Base 模型。"
series: how-models-train
chapter: raw-model
order: 1
type: concept
articleStatus: draft
prerequisites:
  - "large-model"
videoSource: pre-training
---

# 预训练与基座模型

大模型的完整训练过程通常分为两个核心阶段：**预训练（Pre-training）** 与 **后训练（Post-training / Alignment）**。

其中，预训练耗费了整个生命周期中超过 90% 的算力与电力成本。数千张 GPU 在集群中持续运行数月，吞吐海量的人类互联网语料，最终产出一份包含数百亿至数千亿参数的 **基座模型（Base Model）**。

为什么预训练不需要人工逐条标注答案？大模型的算力投入是如何通过标度律进行规划的？刚训练完成的 Base 模型为什么不能直接作为聊天助手使用？

本篇将从数据流、损失函数与算力规律出发，解析预训练阶段的核心机制。

<figure>
  <img src="/figures/pre-training/scaling-law-curves.svg" alt="Scaling Laws 标度律与算力分配" />
  <figcaption>Scaling Law 标度律：模型损失与计算规模的幂律关系</figcaption>
</figure>

---

## 自监督学习与因果语言建模

传统机器学习通常依赖大量的人工标注数据（如手动为百万张图片打上分类标签）。然而，面对数十万亿 Token 的海量文本，人工标注是不现实的。

预训练采用 **自监督学习（Self-Supervised Learning）** 机制：
- **文本自身即是监督信号**：对于任意一段自然语言文本，前 $t-1$ 个字天然构成输入上下文，第 $t$ 个字天然就是预测的正确目标；
- **自回归语言建模**：在每个位置 $t$，模型利用因果掩码遮蔽未来信息，仅根据前序文本 $x_{<t}$ 预测下一个词 $x_t$ 的概率分布；
- **交叉熵损失反向传播**：将预测概率与实际出现的下一个词计算交叉熵损失：

$$\mathcal{L}_{\text{pretrain}} = -\frac{1}{T} \sum_{t=1}^T \log P(x_t \mid x_{<t}; \theta)$$

通过链式法则反向传播梯度，更新全网参数。

互联网上海量的网页、电子书、学术论文与代码仓库，都可以转化为这种自监督训练语料。

---

## 标度律（Scaling Laws）与算力分配

训练千亿参数的大模型耗资巨大，标度律为万卡算力集群的资源分配提供了定量指导。

2020 年，OpenAI 的研究揭示了语言模型的 **标度律（Scaling Law）**：模型的测试损失（Test Loss）主要取决于 **模型参数量 $N$**、**训练数据量 $D$（Token 数）** 与 **总计算量 $C$**，且三者之间呈现出平滑的幂律关系。

### 1. 训练总算力换算
对于标准 Transformer 稠密模型，每处理 1 个 Token，前向传播约需 $2N$ 次浮点运算，反向传播求导约需 $4N$ 次浮点运算。因此，预训练所需的理论总算力 $C$（单位为 FLOPs）可近似估算为：

$$C \approx 6 \times N \times D$$

例如，用 15T（$1.5 \times 10^{13}$）Tokens 训练一个 70B（$7 \times 10^{10}$）模型，所需的理论总计算量约为：

$$C \approx 6 \times (7 \times 10^{10}) \times (1.5 \times 10^{13}) = 6.3 \times 10^{24} \text{ FLOPs}$$

### 2. Kaplan 与 Chinchilla 算力分配
- **Kaplan 早期假设（2020）**：倾向于优先扩大参数量 $N$，数据量 $D$ 的增长相对较缓。这导致早期的 GPT-3（175B 参数，仅训练 300B Tokens）处于一定程度的欠训练状态；
- **Chinchilla 定律（Hoffmann 等人, 2022）**：指出参数量与数据量应以 1:1 的等比例协同扩张。在计算最优（Compute-Optimal）前提下，训练 Token 数约为参数量的 **20 倍**（$D \approx 20 \times N$）；
- **现代超饱和训练（Over-training）**：考虑到模型部署后的持续推理成本，现代开源模型（如 Llama 3 8B 使用 15T Tokens 训练）普遍采用超饱和训练。虽然增加了前期的预训练算力投入，但显著降低了推理阶段的显存与计算开销。

---

## 预训练数据清洗流水线

数据质量直接决定了基座模型的能力上限。“Garbage in, Garbage out”是预训练的基本规律。

<figure>
  <img src="/figures/pre-training/pretrain-pipeline.svg" alt="预训练语料多阶段清洗过滤流水线" />
  <figcaption>预训练语料清洗：从万亿原始网页到纯净数据流</figcaption>
</figure>

1. **文本抽取与编码规范化**：从海量原始 HTML 网页中提取正文，剔除导航栏、CSS 样式与乱码字符；
2. **启发式质量过滤（Heuristic Filtering）**：根据停用词比例、标点符号分布、重复字符率等规则，过滤低质与机器灌水内容；
3. **安全与隐私脱敏（Safety & PII Masking）**：过滤违规言论，并脱敏个人隐私信息；
4. **大规模模糊去重（MinHash LSH / Exact Dedup）**：过滤镜像网页与模板套用文本，防止模型在预训练中产生死记硬背与过拟合；
5. **分词与文档打包（Document Packing）**：使用 BPE 算法将文本切分为 Token 序列，并将多篇短文档拼接至固定的上下文长度。

---

## Base 基座模型的行为特征

经过预训练产出的模型被称为 **Base 基座模型**（如 `Llama-3-8B-Base`、`Qwen2.5-7B-Base`）。

如果向 Base 模型输入 `“中国的首都是哪里？”`，它通常不会给出一句简洁的回答，而是可能输出 `“A. 北京 B. 上海 C. 广州”` 或继续列举其他国家的首都。

<figure>
  <img src="/figures/pre-training/base-model-continuation.svg" alt="Base 模型与 Chat 助手的生成行为对比" />
  <figcaption>Base 基座 vs Chat 助手：文本接龙与指令遵循的本质分界</figcaption>
</figure>

### 为什么 Base 模型不会直接回答？
Base 模型的训练目标仅为 **文本续写（Text Continuation）**：
- 在互联网语料中，`“中国的首都是哪里？”` 出现最多的场景往往是地理试卷、问答题库或论坛讨论；
- 统计概率上，该句子后面紧跟选择题选项或同类常识知识点的概率，远高于单独出现一句礼貌的回答；
- Base 模型没有“助手身份”与“问答契约”的概念，它只是忠实地预测统计上的下一个词。

Base 模型沉淀了广泛的常识、语法结构、代码逻辑与世界知识。如何将 Base 模型调教为懂得遵循指令的对话助手？这需要后续的 **后训练对齐工序（SFT、RLHF 与 DPO）**。

---

## 最小代码实现

以下代码演示了语言模型自监督预训练中的标签错位（Shift）、前向概率计算与交叉熵损失评估：

```python
import numpy as np

def pretrain_demo():
    # 1. 模拟词表与文本序列: "AI", "is", "transforming", "the", "future"
    vocab = ["<PAD>", "AI", "is", "transforming", "the", "future", "<EOS>", "world"]
    seq_tokens = np.array([1, 2, 3, 4, 5, 6])  # 长度为 6 的 Token ID 序列
    
    # 2. 构造自回归输入 X 与监督目标 Y (向后错开一位)
    input_x = seq_tokens[:-1]
    target_y = seq_tokens[1:]
    
    print(f"自监督输入 X: {[vocab[i] for i in input_x]}")
    print(f"自监督目标 Y: {[vocab[i] for i in target_y]}")
    
    # 3. 模拟隐藏状态 H 与输出分类头 W_head
    np.random.seed(42)
    seq_len = len(input_x)
    vocab_size = len(vocab)
    hidden_states = np.random.randn(seq_len, 4)
    w_head = np.random.randn(4, vocab_size)
    logits = hidden_states @ w_head
    
    # 4. 计算 Softmax 概率与交叉熵损失
    exp_logits = np.exp(logits - np.max(logits, axis=-1, keepdims=True))
    probs = exp_logits / np.sum(exp_logits, axis=-1, keepdims=True)
    
    step_losses = -np.log(probs[np.arange(seq_len), target_y])
    total_loss = np.mean(step_losses)
    
    print("\n--- 逐位置的自监督预测详情 ---")
    for t in range(seq_len):
        curr_token = vocab[input_x[t]]
        expected_token = vocab[target_y[t]]
        pred_prob = probs[t, target_y[t]] * 100
        print(f"位置 {t}: 给定 '{curr_token}' ➔ 预测下一个词 '{expected_token}' 的置信度: {pred_prob:.2f}% (损失: {step_losses[t]:.4f})")
    
    print(f"\n整段文本的预训练平均损失 Loss: {total_loss:.4f}")

pretrain_demo()
```

**控制台输出：**
```text
自监督输入 X: ['AI', 'is', 'transforming', 'the', 'future']
自监督目标 Y: ['is', 'transforming', 'the', 'future', '<EOS>']

--- 逐位置的自监督预测详情 ---
位置 0: 给定 'AI' ➔ 预测下一个词 'is' 的置信度: 3.71% (损失: 3.2944)
位置 1: 给定 'is' ➔ 预测下一个词 'transforming' 的置信度: 27.32% (损失: 1.2976)
位置 2: 给定 'transforming' ➔ 预测下一个词 'the' 的置信度: 5.77% (损失: 2.8531)
位置 3: 给定 'the' ➔ 预测下一个词 'future' 的置信度: 9.69% (损失: 2.3340)
位置 4: 给定 'future' ➔ 预测下一个词 '<EOS>' 的置信度: 7.78% (损失: 2.5540)

整段文本的预训练平均损失 Loss: 2.4666
```

---

## 核心概念辨析

- **预训练（Pre-training） vs 后训练（Post-training）**：
  - 预训练通过自监督接龙构建包含基础知识的 Base 基座模型；
  - 后训练（SFT/RLHF）对齐行为与指令，将其调整为可对话的 Chat 助手。
- **自监督学习 vs 有监督学习**：
  - 自监督学习利用文本自身的天然先后顺序构建监督信号，无需人工标注；
  - 有监督学习依赖人工构造的输入输出配对样本。
- **Kaplan 标度律 vs Chinchilla 定律**：
  - Kaplan 标度律偏向扩大参数规模，导致早期模型普遍欠训练；
  - Chinchilla 定律提出参数与数据等比例扩张，确立了 $D \approx 20N$ 的算力最优配比。

在预训练阶段，互联网公开的人类高质量文本正逐渐逼近耗尽边界。如何利用模型自身合成高质量新语料？下一篇我们将探讨——《合成数据与语料自造》。

---

## 参考文献

1. Kaplan, Jared, McCandlish, Sam, Henighan, Tom, et al. (2020). [*Scaling Laws for Neural Language Models*](https://arxiv.org/abs/2001.08361). arXiv:2001.08361.
2. Hoffmann, Jordan, Borgeaud, Sebastian, Mensch, Arthur, et al. (2022). [*Training Compute-Optimal Large Language Models (Chinchilla)*](https://arxiv.org/abs/2203.15556). NeurIPS 2022 / arXiv:2203.15556.
3. Touvron, Hugo, Lavril, Thibaut, Izacard, Gautier, et al. (2023). [*LLaMA: Open and Efficient Foundation Language Models*](https://arxiv.org/abs/2302.13971). arXiv:2302.13971.
4. Dubey, Abhimanyu, Jauhri, Abhinav, Pandey, Abhishek, et al. (2024). [*The Llama 3 Herd of Models*](https://arxiv.org/abs/2407.21783). arXiv:2407.21783.
