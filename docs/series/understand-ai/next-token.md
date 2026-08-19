---
title: "Next-Token 概率预测"
description: "Logits、采样温度/Top-P 与上下文学习。"
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

在前两章中，我们解析了大模型的物理底座（Token、自注意力矩阵）与运行时加速机制（KV Cache、PagedAttention 与推测采样）。现在，我们将正式进入大模型最核心的生成逻辑层：**它究竟是如何一步步吐出连贯文字的？**

大众对大模型最常见的误解，是认为它的大脑里有一个巨大的「数据库索引」或「确定性逻辑求解器」，在收到问题后去检索一条标准答案并打印出来。

然而在底层的工程与数学实现中，大模型自始至终只在做一件事：**根据前面已经出现的全部 Token 序列，在庞大的词表空间中，计算下一个最可能出现的词（Next-Token）的概率分布，并按概率掷骰子采样。**

<figure>
  <img src="/figures/next-token/pipeline.svg" alt="Next-Token 概率预测与采样流程" />
  <figcaption>从隐藏状态到词表采样的 Next-Token 预测流水线</figcaption>
</figure>

---

## 概率的诞生：从 Hidden State 到 Raw Logits

当输入序列经过 Transformer 多层自注意力与前馈网络的逐层计算后，模型在最后一个 Token 位置会输出一个高维的隐藏状态向量 $\mathbf{h} \in \mathbb{R}^d$（例如在 LLaMA-3-70B 中，$d = 8192$）。

这个向量虽然凝聚了全上下文的丰富特征，但它本身只是一串抽象的浮点数，无法直接变成人类可读的文字。将向量转化为文字的关键工序是 **语言模型头（LM Head, Language Modeling Head）**：

1. **词表线性投影**：
   LM Head 是一个全连接矩阵 $W_{lm} \in \mathbb{R}^{|V| \times d}$，其中 $|V|$ 是词表大小（例如 128,256 个 Token）。通过一次矩阵向量乘法：

   $$\mathbf{z} = \mathbf{h} W_{lm}^T \in \mathbb{R}^{|V|}$$

2. **未归一化得分（Logits）**：
   输出的向量 $\mathbf{z} = [z_1, z_2, \dots, z_{|V|}]$ 被称为 **Logits**。词表里的每一个词（如「人工」、「猫」、「的」）都会在这个向量中分到一个实数得分。得分越高，代表模型认为该词越符合上下文统计搭配。

---

## 几何控盘：Softmax、Temperature 与 Top-P 采样

有了原始得分 $\mathbf{z}$，系统并不能直接把它当成概率，因为 Logits 中存在负数且总和不为 1。为了将得分转换为合法的概率分布，并对生成的「发散度」与「确定性」进行人为调控，推理引擎引入了两个核心超参数：**Temperature（温度）** 与 **Top-P（核采样）**。

<figure>
  <img src="/figures/next-token/temperature-and-top-p.svg" alt="Temperature 调节与 Top-P 核采样对比" />
  <figcaption>Temperature 缩放与 Top-P 核采样的概率分布几何调控</figcaption>
</figure>

### 1. 温度缩放与 Softmax（Temperature Scaling）
系统通过带有温度参数 $T > 0$ 的 Softmax 函数，将 Logits 转化为和为 1 的概率分布：

$$P(w_i) = \frac{\exp(z_i / T)}{\sum_{j=1}^{|V|} \exp(z_j / T)}$$

- **低温模式（$T \to 0$）**：
  当 $T$ 趋近于 0 时，最高得分词与其他词的差距被指数级放大，Softmax 退化为 $\text{argmax}$ 脉冲函数。模型**每次都 100% 选择概率最高的那 1 个词（贪心搜索 / Greedy Search）**，输出极其确定、严肃且可重复，适合代码生成、数学计算与事实提取。
- **标准模式（$T \approx 0.7$）**：
  保持合理的统计起伏，兼顾了句子的通顺可读与一定的行文丰富度。
- **高温模式（$T > 1.0$）**：
  Logits 之间的差异被数值缩小，原本概率极低的冷门生僻词获得了被选中的机会，回答变得发散、富有想象力甚至语无伦次；当 $T \to \infty$ 时，退化为完全的均匀随机乱码。

### 2. 核采样（Nucleus Sampling / Top-P）
早期系统常使用固定选取前 $K$ 个词的 **Top-K 采样**，但 [Holtzman 等人在 ICLR 2020 的里程碑论文 *The Curious Case of Neural Text Degeneration*](https://arxiv.org/abs/1904.09751) 中指出了 Top-K 的致命缺陷：
- 当上下文极度明确（如「人工智能的本___」）时，前 1 个词「质」的概率已经高达 95%，固定 $K=50$ 会强行把后 49 个完全不通顺的词拉入候选池；
- 当上下文极度开放时，前 50 个词各自只有 1% 概率，固定 $K=50$ 又过早截断了大量合理的表达。

为了解决这一问题，Holtzman 等人提出了 **Top-P（核采样）**：
将词表中的词按概率从大到小降序排列，**动态累加概率，直到累积和刚好达到阈值 $p$（例如 $p=0.90$）时截断**：

$$\sum_{w \in V^{(p)}} P(w) \ge p$$

- **模型高度自信时**：Top-P 候选集自动缩窄为 1~2 个词，杜绝胡说八道；
- **模型面对开放创作时**：Top-P 候选集自动放大到数十上百个词，保持表达灵动。

我们可以通过一段标准的 Python 代码，实现工业级的大模型采样核心逻辑：

```python
import numpy as np

def sample_next_token(logits: np.ndarray, temperature: float = 0.7, top_p: float = 0.9) -> int:
    """
    大模型 Next-Token 采样内核：支持 Temperature 缩放与 Top-P 动态核采样
    """
    # 1. 贪心分支：当温度极低时直接取 argmax
    if temperature < 1e-5:
        return int(np.argmax(logits))
    
    # 2. 温度缩放
    scaled_logits = logits / temperature
    
    # 3. 数值稳定的 Softmax 计算
    exp_logits = np.exp(scaled_logits - np.max(scaled_logits))
    probs = exp_logits / np.sum(exp_logits)
    
    # 4. Top-P (核采样) 动态截断
    sorted_indices = np.argsort(probs)[::-1]
    sorted_probs = probs[sorted_indices]
    cumulative_probs = np.cumsum(sorted_probs)
    
    # 找到累积概率超过 top_p 的截止点
    cutoff_index = np.searchsorted(cumulative_probs, top_p)
    valid_indices = sorted_indices[:cutoff_index + 1]
    valid_probs = probs[valid_indices]
    
    # 5. 重新归一化并在候选子集中进行多项式抽样
    valid_probs = valid_probs / np.sum(valid_probs)
    selected_token_id = np.random.choice(valid_indices, p=valid_probs)
    
    return int(selected_token_id)
```

---

## 物理本质：上下文学习（In-Context Learning）究竟在改什么？

在理解了概率预测后，我们就能彻底解开 AI 领域另一个著名的谜团：**为什么在 Prompt 里放两个示例（Few-Shot），模型就能突然「学会」一个复杂的输出格式？它在后台微调自己的模型参数了吗？**

<figure>
  <img src="/figures/next-token/icl-mechanism.svg" alt="模型微调与上下文学习对比" />
  <figcaption>模型微调（修改权重）与上下文学习（前向注意力约束）机制对比</figcaption>
</figure>

根据 [Brown 等人（2020）](https://arxiv.org/abs/2005.14165) 与 [Xie 等人（2022）](https://arxiv.org/abs/2111.02080) 的理论分析：

1. **参数修改量严格为零（$\Delta W = 0$）**：
   在整个交互过程中，GPU 从未执行反向传播，磁盘与显存中的权重矩阵没有发生哪怕一个 bit 的修改。
2. **前向自注意力的隐式贝叶斯更新**：
   Few-Shot 示例作为 Token 序列进入上下文窗口后，它们生成的 Key 和 Value 向量留在了显存中。当模型计算当前位置的 Query 时，自注意力机制在两两打分中，将当前位置的隐藏状态 $\mathbf{h}$ 强力拉向示例所示范的特征空间。
3. **概率轨道的收拢**：
   在最终经过 LM Head 投影时，原本可能均摊在全词表各处的概率质量，被强烈约束在了符合示例格式的几个特定 Token 上（例如 `{"name": ...}`）。

所谓上下文「学习」，并不是模型真的长出了新神经回路，而是**前置 Token 充当了强大的概率重塑器，将下一步生成的轨道严格限制在局部子空间内**。

---

## 现实认知误区与奇特现象

### 误区一：把 Temperature 设为 0，大模型就不会产生「幻觉」了吗？
**物理真相**：完全错误。
将 Temperature 设为 0（贪心采样）只能保证**每次运行的输出绝对确定且可重复**。但如果大模型在其海量预训练参数中，对某个错误事实的概率打分本身就高于正确事实（例如因网上假新闻泛滥导致错误搭配统计概率更高），那么在 $T=0$ 下，模型只会**以 100% 确定且极其自信的姿态，每一次都吐出同一个谎言**。流畅来自高频统计搭配，不等于事实真伪。

### 误区二：为什么纯贪心生成（$T=0$）经常会陷入死循环复读？
**物理真相**：
当模型在某一步意外生成了一句具有强烈自我指涉特征的句式后，在自回归机制下，这句话立刻作为新的前缀进入上下文。在随后的自注意力计算中，它对自己产生了极高的注意力权重，导致下一步预测的最高概率词再次指向该句式的开头，从而在概率景观中跌入**局部循环引力阱（Degenerate Loop）**。适当设置 $T > 0$ 与 Top-P 正是依靠随机扰动打破死循环的物理救生索。

---

## 读到这里该能分清

大模型不是检索既有答案的数据库，而是基于前序 Token 序列计算词表概率分布并自回归采样的统计生成器。

LM Head 将顶层高维隐藏状态线性投影为词表维度的未归一化得分（Raw Logits）。

Temperature 调控概率分布的平滑度：低温（T=0）使分布尖锐化走向确定性贪心输出，高温（T>1）压平分布增加发散度与长尾词概率。

Top-P（核采样）通过动态累积概率截断自适应伸缩候选池，兼顾了高确定性下的严谨与开放场景下的灵动。

上下文学习（In-Context Learning）在物理上零修改参数（$\Delta W = 0$），它依靠自注意力在前向计算中将词表概率质量收拢到目标格式轨道。

$T=0$ 只能消除随机性，不能消除幻觉。流畅的高概率文本搭配不等于客观世界的物理真实。

既然大模型的每一次吐字都是由前置 Token 的注意力收拢决定的，那么我们在输入端写下的指令究竟在物理层面如何操纵这台概率机器？下一篇，我们将解析——《提示词在做什么》。

## 参考文献

1. Holtzman, A., Buys, J., Du, L., et al. (2020). [*The Curious Case of Neural Text Degeneration*](https://arxiv.org/abs/1904.09751). ICLR 2020 / arXiv:1904.09751.
2. Brown, T. B., Mann, B., Ryder, N., et al. (2020). [*Language Models are Few-Shot Learners*](https://arxiv.org/abs/2005.14165). NeurIPS 2020 / arXiv:2005.14165.
3. Xie, S. M., Raghunathan, A., Liang, P., & Ma, T. (2022). [*An Explanation of In-context Learning as Implicit Bayesian Inference*](https://arxiv.org/abs/2111.02080). ICLR 2022 / arXiv:2111.02080.
4. von Oswald, J., Niklasson, E., Randazzo, E., et al. (2023). [*Transformers Learn In-Context by Gradient Descent*](https://arxiv.org/abs/2212.07677). ICML 2023 / arXiv:2212.07677.
5. Fan, A., Lewis, M., & Dauphin, Y. (2018). [*Hierarchical Neural Story Generation*](https://arxiv.org/abs/1805.04833). ACL 2018 / arXiv:1805.04833.
