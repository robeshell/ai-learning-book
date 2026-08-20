---
title: "大模型究竟是什么"
description: "参数规模、自回归概率拟合与大模型的物理分层。"
series: understand-ai
chapter: foundation
order: 1
type: concept
articleStatus: draft
prerequisites: []
videoSource: large-model
---

# 大模型究竟是什么

人们口中常说的大模型，通常指大语言模型（Large Language Model, LLM）。在底层工程与数学本质上，**它是在海量文本上通过自监督学习预训练出来的深度神经网络，主流架构几乎全由 Transformer 解码器构成**。

它既不是具备主观意识的通识学者，也不是把海量网页存进硬盘的搜索引擎。大模型的物理实体是一份静态保存的权重文件（如 `.safetensors`）。它在预训练阶段做的事情非常朴素：吞进海量无标注文本，把后面的内容遮住，让神经网络根据前面的文字去预测下一个词。猜得准就保持方向，猜得偏就通过反向传播修正参数。

数万亿次循环计算之后，模型得到的不是一本随时翻阅的百科全书，而是一套对人类语言统计关联与世界概念高度压缩的参数矩阵。

---

## 物理尺度的三维协同

大模型的「大」不是玄学概念，它明确对应三项可以度量的工程规模：**参数量、训练数据量、消耗的计算量**。

<figure>
  <img src="/figures/large-model/scale.svg" alt="大模型的三维物理尺度" />
  <figcaption>大模型的三维物理尺度（参数、数据、算力）</figcaption>
</figure>

### 1. 参数量（Parameters, $N$）
参数是神经网络里所有可学习的浮点数权重（Weight 与 Bias）。训练结束后，这批浮点数会被固化在权重文件中。参数越多，神经网络能容纳的表征空间和知识容量上限就越高。

### 2. 训练数据量（Dataset Size, $D$）
数据是模型在预训练时读过的全部语料 Token 数量。现代主流模型（如 Llama 3、DeepSeek-V3）通常在 15 万亿到 20 万亿 Token 上训练。模型内部不存这些文本的原文，而是把文字共现的统计规律提炼并沉淀在参数中。

### 3. 训练算力（Compute, $C$）
训练一个千亿规模的现代大模型，需要数千张乃至数万张高性能 GPU 在高带宽集群网络下持续协同运转数周或数月。通常以 FLOPs（浮点运算次数）度量，近似满足 $C \approx 6ND$。

根据 [Kaplan 等人（2020）](https://arxiv.org/abs/2001.08361) 与 [Chinchilla（Hoffmann 等人, 2022）](https://arxiv.org/abs/2203.15556) 的标度律研究：测试损失（Loss）随参数规模、数据规模和训练算力的增加呈现平滑的幂律下降。但需要注意：**标度律优化的是下一词预测的交叉熵损失，它没有在物理上承诺生成的句子在客观世界里一定属实**。

---

## 自回归生成机制

大模型无论是在数月漫长的预训练阶段，还是在服务用户的几秒钟推理过程中，底层运转的都是同一种机制：**自回归（Autoregression）**。

<figure>
  <img src="/figures/large-model/next-token.svg" alt="自回归循环生成机制" />
  <figcaption>自回归（Autoregression）循环生成机制</figcaption>
</figure>

自回归的运作方式是：
1. 模型接收当前已有的上下文序列 $x_1, x_2, \dots, x_t$；
2. 经过前向计算输出未归一化分数（Logits），通过 Softmax 转化为下一个词的概率分布 $P(x_{t+1} \mid x_1, \dots, x_t)$；
3. 按照采样策略挑选出一个新 Token $x_{t+1}$；
4. 将新 Token 追加到序列末尾，更新上下文为 $x_1, \dots, x_{t+1}$，进入下一轮循环，直到遇到终止标记 `[EOS]` 或达到长度上限。

<figure>
  <img src="/figures/large-model/sampling-flow.svg" alt="逐步概率采样与上下文追加流水线" />
  <figcaption>逐步概率采样与上下文追加流水线</figcaption>
</figure>

当输入「床前明月光」，模型在预测下一个词时，脑子里并没有提前规划好整首诗。它只是在当前上下文约束下，计算出词表上几万个候选词的概率分布，挑选出概率最高的「疑是」，然后再以此为基础继续往下预测。

这种机制决定了：**语句流畅与内容真实并不等价**。流畅性来自语言学统计规律的高频搭配，而事实核验需要逻辑闭环与外部真实世界校验。

---

## 系统的三层物理架构

在工程落地与日常使用中，需要把**产品层、对齐模型与预训练基座**这三层结构严格区分开：

<figure>
  <img src="/figures/large-model/layers.svg" alt="AI 系统三层架构" />
  <figcaption>AI 系统三层架构（产品层、对齐模型、基座权重）</figcaption>
</figure>

### 1. 预训练基座模型（Base Model）
用数万亿语料自监督训练出来的原始浮点权重。它本质上是一个纯粹的“文本接龙器”，不具备助手意识，也没有安全审查。

### 2. 对齐模型（Instruct / Chat Model）
在基座模型基础上，通过指令微调（SFT）和强化学习对齐（RLHF / DPO）训练得到的模型。经过这道工序，权重学会了理解用户意图、以对话助手格式作答并在触碰红线时礼貌拒答。

### 3. 产品与应用层（Product / Application）
面向终端用户的完整互联网系统（如 ChatGPT、Claude.ai 网页端）。负责用户鉴权、会话管理、自动拼接 System Prompt、安全风控过滤、联网检索与工具调度沙箱。

---

## 最小代码实现

以下 Python 代码完整演示了基于自回归机制的文本逐步生成与概率采样流程：

```python
import numpy as np

# 1. 词表定义 (Token 与 ID 映射)
vocab = {0: "<EOS>", 1: "床前", 2: "明月", 3: "光", 4: "疑是", 5: "地上", 6: "霜"}
inv_vocab = {v: k for k, v in vocab.items()}

def softmax(logits, temperature=1.0):
    exp_logits = np.exp(logits / temperature)
    return exp_logits / np.sum(exp_logits)

# 2. 模拟单步前向传播: 根据当前上下文输出全词表的未归一化得分 (Logits)
def dummy_forward_step(context_tokens):
    logits_table = {
        (1,): np.array([-1.2, 0.1, 4.5, 0.8, -0.5, 0.2, -2.0]),       # ["床前"] -> 预测 "明月"(2)
        (1, 2): np.array([-2.0, -1.0, 0.2, 5.1, 0.4, -0.8, -1.5]),    # ["床前", "明月"] -> 预测 "光"(3)
        (1, 2, 3): np.array([-1.5, -0.5, -1.0, 0.1, 4.8, 0.3, -2.0]), # -> 预测 "疑是"(4)
        (1, 2, 3, 4): np.array([-3.0, 0.2, -1.0, 0.1, -0.5, 5.5, 0.8]), # -> 预测 "地上"(5)
        (1, 2, 3, 4, 5): np.array([-2.0, 0.1, -0.5, 0.2, 0.0, 0.3, 6.0]), # -> 预测 "霜"(6)
        (1, 2, 3, 4, 5, 6): np.array([5.0, -2.0, -1.0, -1.0, -2.0, -2.0, -2.0]), # -> 预测 "<EOS>"(0)
    }
    return logits_table.get(tuple(context_tokens), np.zeros(len(vocab)))

# 3. 自回归循环生成
context = [inv_vocab["床前"]]
print("初始输入 Prompt:", [vocab[t] for t in context])
print("-" * 50)

for step in range(10):
    logits = dummy_forward_step(context)
    probs = softmax(logits, temperature=0.7)
    next_token = int(np.argmax(probs))  # 贪婪采样
    
    # 提取 Top-3 候选词展示概率分布
    top_indices = np.argsort(probs)[::-1][:3]
    top_candidates = [(vocab[i], f"{probs[i]*100:.1f}%") for i in top_indices]
    
    print(f"Step {step+1}: 当前上下文 {[vocab[t] for t in context]}")
    print(f"       候选分布: {top_candidates} -> 选中 [{vocab[next_token]}]")
    
    if next_token == inv_vocab["<EOS>"]:
        print("\n遇到终止符 <EOS>，生成结束。")
        break
    context.append(next_token)

print("最终生成序列:", "".join([vocab[t] for t in context if t != inv_vocab["<EOS>"]]))
```

**控制台输出：**
```text
初始输入 Prompt: ['床前']
--------------------------------------------------
Step 1: 当前上下文 ['床前']
       候选分布: [('明月', '99.0%'), ('光', '0.5%'), ('地上', '0.2%')] -> 选中 [明月]
Step 2: 当前上下文 ['床前', '明月']
       候选分布: [('光', '99.7%'), ('疑是', '0.1%'), ('明月', '0.1%')] -> 选中 [光]
Step 3: 当前上下文 ['床前', '明月', '光']
       候选分布: [('疑是', '99.6%'), ('地上', '0.2%'), ('光', '0.1%')] -> 选中 [疑是]
Step 4: 当前上下文 ['床前', '明月', '光', '疑是']
       候选分布: [('地上', '99.8%'), ('霜', '0.1%'), ('床前', '0.1%')] -> 选中 [地上]
Step 5: 当前上下文 ['床前', '明月', '光', '疑是', '地上']
       候选分布: [('霜', '99.9%'), ('地上', '0.0%'), ('光', '0.0%')] -> 选中 [霜]
Step 6: 当前上下文 ['床前', '明月', '光', '疑是', '地上', '霜']
       候选分布: [('<EOS>', '99.9%'), ('光', '0.0%'), ('明月', '0.0%')] -> 选中 [<EOS>]

遇到终止符 <EOS>，生成结束。
最终生成序列: 床前明月光疑是地上霜
```

---

## 核心概念辨析

- **统计接龙 vs 逻辑推演**：
  - 大模型底层是自回归概率分布预测，擅长提炼文本共现规律；
  - 逻辑正确性需要依赖严密的语料结构、外部检索（RAG）或强化学习对齐来约束。
- **基座模型 vs 对齐模型**：
  - 基座模型（Base）只做纯粹的自回归续写，直接使用常出现自言自语；
  - 对齐模型（Instruct/Chat）经过 SFT 与 RLHF/DPO，具备指令遵循与安全拒答能力。
- **参数记忆 vs 产品上下文**：
  - 模型权重中的知识是预训练固化的，推理时不写入；
  - 聊天产品展现的多轮记忆是通过应用层每次将历史拼接后重新输入实现的。

大模型是如何在底层并行计算词语间的关联关系的？下一篇我们将深入拆解核心骨干——《Transformer 与自注意力》。

---

## 参考文献

1. Zhao, W. X., Zhou, K., Li, J., et al. (2023). [*A Survey of Large Language Models*](https://arxiv.org/abs/2303.18223). arXiv:2303.18223.
2. Kaplan, J., McCandlish, S., Henighan, T., et al. (2020). [*Scaling Laws for Neural Language Models*](https://arxiv.org/abs/2001.08361). arXiv:2001.08361.
3. Hoffmann, J., Borgeaud, S., Mensch, A., et al. (2022). [*Training Compute-Optimal Large Language Models*](https://arxiv.org/abs/2203.15556). arXiv:2203.15556.
4. Brown, T. B., Mann, B., Ryder, N., et al. (2020). [*Language Models are Few-Shot Learners*](https://arxiv.org/abs/2005.14165). NeurIPS 2020 / arXiv:2005.14165.
5. OpenAI. (2022-11-30). [*Introducing ChatGPT*](https://openai.com/index/chatgpt/).
