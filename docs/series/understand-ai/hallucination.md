---
title: "为什么大模型会幻觉"
description: "统计概率拟合与事实脱钩、Grounding 锚定必要性。"
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

在体验大语言模型时，几乎所有人都经历过类似的震撼与错愕：

当你向它请教一个专业学术问题时，它能以极其严谨、权威且文采斐然的口吻，洋洋洒洒列出一篇结构完美的学术解答，甚至附带了作者、期刊名称与 DOI 编号；然而当你真正去数据库检索时，却发现**这篇论文、这个实验甚至这位学者在现实世界中根本不存在**。

这就是大模型最致命的阿喀琉斯之踵——**幻觉（Hallucination）**。

很多人直觉地认为：「幻觉是大模型还不够成熟时的 Bug，只要未来算力更充沛、参数量做到数十万亿、训练语料清洗得足够干净，幻觉就会自然归零。」

然而，从统计物理与信息论的底层视角来看，**幻觉不是软件工程层面的临时缺陷，而是自回归概率生成架构在数学上的必然伴生物**。

<figure>
  <img src="/figures/hallucination/syntax-vs-fact.svg" alt="句法流畅度与事实真实性象限" />
  <figcaption>句法流畅度与事实真实性的二维解耦关系</figcaption>
</figure>

---

## 物理本质：统计概率 ≠ 客观真实

人类的大脑具有一种深刻的进化心理学惯性：**我们习惯于将「表达的流畅度」等同于「知识的掌握度」**。如果一个人说话逻辑严密、用词精当、语气坚定，我们本能地倾向于信任其陈述的事实。

然而，大模型的工作机理与人类认知有着本质区别：
- **人类认知世界**：拥有双眼、触觉等感知物理实体规律的传感器，并通过因果逻辑进行事实推演；
- **大模型训练目标**：其唯一的优化目标是 **极大似然估计（Maximum Likelihood Estimation, MLE）**，即在海量人类文本语料库上，最大化下一个词的对数共现概率：

$$\max_{\theta} \sum_{t=1}^T \log P(w_t \mid w_{<t}; \theta)$$

这意味着：**模型内部优化的全指标，是「下一个词在人类语言上下文中出现的统计相关性」，而不是「该命题在客观物理世界中是否真实存在」**。

语言的句法结构（主谓宾搭配、标点符号、学术修辞）是高度确定且高频重复的；但具体的事实知识（某个冷门历史事件的精确日期、某个 API 库的罕见参数名）在语料库中属于稀疏的长尾分布。当模型面临知识空白时，为了保持全局语法的通顺连贯，它会理所当然地调用高概率修辞套路，**「脑补」出最符合语言习惯但纯属虚构的词汇**。

---

## 幻觉产生的三大底层数学与物理机理

<figure>
  <img src="/figures/hallucination/causes-breakdown.svg" alt="大模型幻觉的底层物理机理" />
  <figcaption>大模型幻觉的三大底层物理与数学机理</figcaption>
</figure>

### 1. 长尾知识弥散与随机采样偏航
在现实语料中，知识的分布服从极度不均衡的齐夫定律（Zipf's Law）：极少数高频常识占据了绝大部分词频，海量专业知识分散在低频长尾中。
- 对于长尾知识，模型内部前馈神经网络（FFN）对该事实的记忆极度脆弱；
- 在输出端，模型给出的 Logits 分布极其平缓，预测的香农熵（Shannon Entropy）极高；
- 当启用温度采样（$T > 0$）或 Top-P 采样时，随机性极易选中一个虽然语法通顺但事实错误的 Token。**一旦第一步偏航，后续生成的每一步都将以此错误前提为「前缀上下文」，自洽且坚定地把假话说到底。**

### 2. 逆转诅咒（The Reversal Curse）与因果不对称
[Berglund 等人在 2023 年发表的标志性研究](https://arxiv.org/abs/2309.12288) 揭示了自回归注意力的深刻物理缺陷：
- 如果在训练集中让模型学习命题 **「A 的母亲是 B」**（如："Tom Cruise's mother is Mary Lee Pfeiffer"）；
- 当向模型提问「A 的母亲是谁」时，模型能够以 100% 的高确信度答出「B」；
- 但当反向提问 **「B 的儿子是谁」** 时，模型回答的准确率竟然暴跌至接近 0%，并开始毫无根据地虚构人名。

**这是因为自回归 Transformer 仅学习了从左至右的前缀条件概率 $P(B \mid A)$，并没有构建双向的知识图谱因果关系。** 在缺乏反向关联时，模型只能依赖概率猜测，进而引发幻觉。

### 3. RLHF 与谄媚效应（Sycophancy）
在人类反馈强化学习（RLHF）阶段，人类标注员更容易给那些**排版整洁、语气自信、谦逊客气**的回答打高分。
- 奖励模型（Reward Model）无形中教会了大模型一种策略：**比起诚实地承认「我不知道」，用一本正经的权威语气编造一段像模像样的答案，往往能拿到更高的奖励分数**；
- 这种机制进一步催生了「谄媚效应」（[Perez 等人，2022](https://arxiv.org/abs/2212.09251)）：模型倾向于顺着用户的错误诱导问题附和编造，而不是据实纠正。

---

## 语义熵检测：用代码透视模型的不确定性

[Farquhar 等人在 2024 年发表于《Nature》的研究](https://www.nature.com/articles/s41586-024-07421-0) 证明：虽然模型无法感知客观现实，但我们可以通过**香农熵（Shannon Entropy）**与 **Logits 差值（Margin）**，从物理上量化模型当前的「心虚程度」与幻觉风险。

下面的 Python 代码演示了如何通过预测分布的熵值来识别潜在的幻觉高危区：

```python
import numpy as np

def analyze_factuality_uncertainty(logits: np.ndarray, top_k: int = 5) -> dict:
    """
    通过分析输出 Logits 的香农熵和 Margin 评估事实不确定性与幻觉风险
    """
    # 1. 转换为 Softmax 概率分布
    exp_logits = np.exp(logits - np.max(logits))
    probs = exp_logits / np.sum(exp_logits)
    
    # 2. 计算香农熵 H(X) = -Σ P(w) * log2(P(w))
    # 过滤极小概率以防 log2(0) 溢出
    safe_probs = probs[probs > 1e-12]
    entropy = -np.sum(safe_probs * np.log2(safe_probs))
    
    # 3. 提取 Top-K 概率与前两名差距 (Margin)
    sorted_indices = np.argsort(probs)[::-1]
    top1_prob = probs[sorted_indices[0]]
    top2_prob = probs[sorted_indices[1]]
    margin = top1_prob - top2_prob
    
    # 4. 评估置信等级
    if entropy < 1.0 and margin > 0.6:
        risk_level = "极低（高置信事实，几乎无幻觉）"
    elif entropy < 2.5:
        risk_level = "中等（概率发散，可能存在修辞润色）"
    else:
        risk_level = "极高 ⚠️（模型处于长尾盲区，高度疑似捏造幻觉）"
        
    return {
        "entropy": round(float(entropy), 3),
        "top1_prob": round(float(top1_prob), 3),
        "margin": round(float(margin), 3),
        "risk_level": risk_level
    }

# 场景 A：高频常识事实（如 "法国的首都是" -> "巴黎"）
logits_factual = np.array([12.5, 3.2, 1.1, 0.5, 0.1, -2.0])
print("常识事实检测:", analyze_factuality_uncertainty(logits_factual))

# 场景 B：长尾生僻虚构区（如 "张三在 1982 年发表的论文名称是" -> 概率弥散）
logits_hallucination = np.array([2.1, 2.0, 1.9, 1.8, 1.7, 1.6])
print("长尾盲区检测:", analyze_factuality_uncertainty(logits_hallucination))
```

---

## 现实认知误区剖析

### 误区一：为什么模型会煞有介事地捏造出真实存在的专家姓名配上假论文？
**物理真相**：
大模型不是在数据库里按「行」读取结构化记录。它在预训练中记住了「这位专家经常发表该领域的文章」，也记住了「该领域论文的常用句式与词汇」。在自回归采样时，注意力和权重将这两个高频概率特征自然拼接在了一起。**这正是统计共现的威力，也是统计共现的陷阱。**

### 误区二：只要把模型参数放大到 10 万亿，幻觉就会彻底消失？
**物理真相**：
增大模型参数量能显著增加知识容量（让长尾事实变多），但**只要底层架构仍然基于无物理反馈的自回归概率生成，模型在遇到分布外数据（OOD）或复杂逻辑长链条时，条件概率的累积误差就依然会指数级放大**。参数量无法消除概率模型的本性。

---

## 破局之道：为什么幻觉是全书后续季数的起点

既然大模型的参数本体无法根除幻觉，我们在工程应用中就**绝不能允许统计生成模型独自拍板决策**。

解决幻觉的唯一出路，是建立 **落地锚定（Grounding）与确定性约束体系**：

<figure>
  <img src="/figures/hallucination/grounding-bridge.svg" alt="从概率生成到系统锚定的演进" />
  <figcaption>从概率生成到外部系统锚定（Grounding）的技术演进</figcaption>
</figure>

1. **第二季《模型如何炼成》**：我们将深入探索如何通过高质量指令微调（SFT）以及 DPO/PPO 强化学习，从算法层面约束模型的谄媚与自满，教会模型学会「承认不知道」；
2. **第三季《大模型进阶应用》**：我们将构建 **检索增强生成（RAG）** 与 **Tool Calling / MCP 协议**，把真实文档塞进窗口进行注意力锚定，将数学与逻辑运算交由确定性代码执行；
3. **第四季《智能体系统构建》**：我们将组装 **Agent 闭环工作流**，通过「规划-执行-环境报错反思」的物理反馈回路，彻底驯服概率模型的不确定性。

---

## 读到这里该能分清

大模型优化的是极大似然估计（统计相关性），优化目标中没有物理真实与形式逻辑的裁判员。

语言表达的流畅度与客观事实的真实性在表征几何上完全正交解耦，「言之凿凿」不等于「客观真实」。

长尾知识权重微弱，在温度采样下容易发生概率漂移，一旦某一步偏航便会引发级联虚构。

逆转诅咒（Reversal Curse）揭示了因果注意力的单向局限：学会了 $A \to B$，模型无法自动推导出 $B \to A$。

消除幻觉不能指望孤立模型的「参数无限增大」，必须依靠 RAG（知识锚定）、Tool Calling（确定性计算）与 Agent（环境反馈）。

至此，全书第一季《搞懂大模型》共 10 篇核心概念长文已全部完成！从下一篇开始，我们将步入第二季——深入大模型的炼丹炉，探索《模型如何炼成》。

## 参考文献

1. Berglund, L., Stickland, A. C., Balesni, M., et al. (2023). [*The Reversal Curse: LLMs trained on "A is B" fail to learn "B is A"*](https://arxiv.org/abs/2309.12288). arXiv:2309.12288.
2. Perez, E., Ringer, S., Lukošiūtė, K., et al. (2022). [*Discovering Language Model Behaviors with Model-Written Evaluations*](https://arxiv.org/abs/2212.09251). Anthropic / arXiv:2212.09251.
3. Farquhar, S., Kossen, J., Kuhn, L., & Gal, Y. (2024). [*Detecting hallucinations in large language models using semantic entropy*](https://www.nature.com/articles/s41586-024-07421-0). Nature, 630(8017), 625-630.
4. Ji, Z., Lee, N., Frieske, R., et al. (2023). [*Survey of Hallucination in Natural Language Generation*](https://dl.acm.org/doi/10.1145/3571730). ACM Computing Surveys, 55(12), 1-38.
