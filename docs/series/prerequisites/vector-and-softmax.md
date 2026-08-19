---
title: "向量空间与概率计算"
description: "词如何变成高维坐标、点积为什么能度量语义关联，以及分数如何转为概率。"
series: prerequisites
chapter: foundations
order: 2
type: concept
articleStatus: draft
prerequisites: []
videoSource: vector-and-softmax
---

# 向量空间与概率计算

在上一篇中，我们拆解了大模型的硬件账本：GPU 本质上是一台极其擅长做「大规模矩阵乘加运算」的物理并行机器。

然而，一个根本性的矛盾随之而来：
**人类写下的是汉字、英文和代码；而 GPU 的计算核心只认识浮点数（如 `0.85`、`-1.23`）。**

计算机究竟是如何把「小猫」、「国王」、「人工智能」这些抽象的人类语言概念，变成可以让 GPU 进行乘加计算的数学实体的？为什么大模型能「理解」小猫和小狗很像，而小猫和潜水艇无关？

这就是现代人工智能的核心数学语言——**高维向量空间（Vector Space）、点积（Dot Product）与 Softmax 归一化**。

<figure>
  <img src="/figures/vector-and-softmax/vector-space.svg" alt="高维语义空间中的词向量几何分布" />
  <figcaption>高维语义空间中的词向量几何分布</figcaption>
</figure>

---

## 语义空间：词如何变成高维坐标？

如果我们要向计算机描述世界上所有的动物，最朴素的方法是建立一个多维度的特征打分表：
- 维度 1（体型大小）：蚂蚁是 `-1.0`，猫是 `0.0`，大象是 `+1.0`；
- 维度 2（可爱程度）：蟑螂是 `-1.0`，猫是 `+0.9`，狗是 `+0.9`；
- 维度 3（是否水生）：猫是 `-0.8`，金鱼是 `+1.0`。

把这三个维度的数字打包在一起，我们就得到了「小猫」在三维空间中的坐标向量：

$$\vec{v}_{\text{猫}} = [0.0, +0.9, -0.8]$$

在大语言模型中，这种把文字转化为多维浮点数的过程称为 **词嵌入（Word Embedding）**。真实的大模型不会只有 3 个维度，而是拥有 **4096 维乃至 12288 维** 的超高维几何空间。

[Mikolov 等人在 2013 年发表的 Word2Vec 经典论文](https://arxiv.org/abs/1301.3781) 中揭示了一个惊人的几何现象：**在充分训练后，高维空间中的相对向量能够直接进行代数运算**：

$$\vec{v}_{\text{国王}} - \vec{v}_{\text{男人}} + \vec{v}_{\text{女人}} \approx \vec{v}_{\text{王后}}$$

这意味着，语义特征被数学模型优雅地解耦为了空间中可以自由加减的平移方向。

---

## 点积（Dot Product）：语义相似度的物理探测器

当所有词都变成了空间中的箭头后，大模型在计算自注意力（Attention）时，是如何衡量「词 A 与词 B 到底有没有关系」的？

工具极其简单——**点积（Dot Product）**。

<figure>
  <img src="/figures/vector-and-softmax/dot-product-similarity.svg" alt="向量空间夹角与点积相似度关系" />
  <figcaption>向量空间夹角与点积相似度关系</figcaption>
</figure>

### 1. 点积的数学与几何定义
两个向量 $\mathbf{a} = [a_1, a_2, \dots, a_d]$ 与 $\mathbf{b} = [b_1, b_2, \dots, b_d]$ 的点积，就是**把对应维度的数值相乘后再全部累加**：

$$\mathbf{a} \cdot \mathbf{b} = \sum_{i=1}^d a_i b_i = \|\mathbf{a}\| \|\mathbf{b}\| \cos(\theta)$$

> **💡 公式大白话**：
> 点积的大小直接取决于两个箭头之间的夹角 $\theta$：
> - **夹角很小（锐角，方向一致）**：$\cos(\theta) > 0$，点积结果是一个**极大的正数**（说明语义高度相关）；
> - **垂直正交（$\theta = 90^\circ$）**：$\cos(\theta) = 0$，点积结果为 **0**（说明两个概念毫无交集）；
> - **背道而驰（钝角，方向相反）**：$\cos(\theta) < 0$，点积结果为**负数**（说明语义对立或互斥）。

### 2. 动笔手算一次点积
设三维空间中有三个概念向量：
- $\mathbf{a} = [2, 1, 0]$（“小猫”）
- $\mathbf{b} = [1, 2, 0]$（“小狗”）
- $\mathbf{c} = [-2, 0, 1]$（“潜水艇”）

让我们动手算一算相关性得分：
1. **算「小猫」与「小狗」的关联**：
   $$\mathbf{a} \cdot \mathbf{b} = (2 \times 1) + (1 \times 2) + (0 \times 0) = 2 + 2 + 0 = \mathbf{+4} \quad (\text{高分，高度相关！})$$
2. **算「小猫」与「潜水艇」的关联**：
   $$\mathbf{a} \cdot \mathbf{c} = (2 \times -2) + (1 \times 0) + (0 \times 1) = -4 + 0 + 0 = \mathbf{-4} \quad (\text{负分，毫不相关！})$$

**这就是全书第 2 篇《Transformer 与自注意力》中，Query 向量与 Key 向量两两计算点积（$QK^T$）的全部物理真相！**

---

## Softmax 变换：把杂乱的分数变成 100% 概率

通过点积计算出来的原始打分（在学术界称为 **Logits**）可能是有正有负的杂乱实数（如 $+4, +5, -4$）。
但在大模型生成文字时，我们无法用负数去转动概率转盘抽奖。

如何把任意范围的实数得分，平滑地压缩为「加起来正好等于 100%」的概率分布？

这就是 **Softmax 函数** 的核心使命。

<figure>
  <img src="/figures/vector-and-softmax/softmax-flow.svg" alt="从 Logits 到概率分布的 Softmax 变换流程" />
  <figcaption>从 Logits 到概率分布的 Softmax 变换流程</figcaption>
</figure>

### 1. Softmax 公式
对于一组包含 $K$ 个原始分数的序列 $\mathbf{z} = [z_1, z_2, \dots, z_K]$，第 $i$ 个位置的归一化概率为：

$$P_i = \frac{e^{z_i}}{\sum_{j=1}^K e^{z_j}}$$

> **💡 公式大白话**：
> 1. **自然指数 $e^z$ 的妙用**：对于任何实数 $z$（即使是负数 $-10$），$e^z$ 永远是严格大于 0 的正数（负数被打回正数）；而且 $e^z$ 会大幅放大高分与低分之间的差距；
> 2. **分母求和归一化**：把所有指数值加在一起作为分母，使得所有 $P_i$ 算出来的结果必然落在 $[0, 1]$ 之间，且**全部概率之和严格等于 100%（$1.0$）**。

### 2. 动笔手算一次 Softmax
假设大模型在预测下一个词时，算出的三个候选词的原始得分为 $\mathbf{z} = [2.0, 1.0, -1.0]$（分别代表“地上”、“窗台”、“潜水艇”）：

- **第一步：计算各项的自然指数 $e^z$**
  - $e^{2.0} \approx 7.39$
  - $e^{1.0} \approx 2.72$
  - $e^{-1.0} \approx 0.37$
- **第二步：求分母总和**
  $$\text{Sum} = 7.39 + 2.72 + 0.37 = \mathbf{10.48}$$
- **第三步：计算最终概率百分比**
  - $P(\text{地上}) = \frac{7.39}{10.48} \approx \mathbf{70.5\%}$
  - $P(\text{窗台}) = \frac{2.72}{10.48} \approx \mathbf{26.0\%}$
  - $P(\text{潜水艇}) = \frac{0.37}{10.48} \approx \mathbf{3.5\%}$
  - **校验总和**：$70.5\% + 26.0\% + 3.5\% = \mathbf{100.0\%}$。

---

## 动手实验：15 行代码验证向量打分与 Softmax

下面的 Python + NumPy 代码完整复现了上述几何打分与概率归一化的全流程：

```python
import numpy as np

def demo_vector_and_softmax():
    # 1. 定义三个概念的嵌入向量 (Embedding)
    cat = np.array([2.0, 1.0, 0.0])   # "小猫"
    dog = np.array([1.0, 2.0, 0.0])   # "小狗"
    sub = np.array([-2.0, 0.0, 1.0])  # "潜水艇"
    
    # 2. 计算点积相似度得分 (Query · Key)
    scores = np.array([
        np.dot(cat, cat),  # 猫 vs 猫: 2*2 + 1*1 + 0*0 = 5.0
        np.dot(cat, dog),  # 猫 vs 狗: 2*1 + 1*2 + 0*0 = 4.0
        np.dot(cat, sub)   # 猫 vs 潜艇: 2*-2 + 1*0 + 0*1 = -4.0
    ])
    print("原始点积相似度 (猫, 狗, 潜水艇):", scores)
    
    # 3. Softmax 变换为概率分布
    # (工程技巧：减去 max(scores) 防止 e^z 数值过大溢出，数学结果等价)
    exp_scores = np.exp(scores - np.max(scores))
    probs = exp_scores / np.sum(exp_scores)
    
    for label, prob in zip(["小猫", "小狗", "潜水艇"], probs):
        print(f"匹配概率 [{label}]: {prob * 100:.2f}%")

demo_vector_and_softmax()
```

运行输出结果：
```text
原始点积相似度 (猫, 狗, 潜水艇): [ 5.  4. -4.]
匹配概率 [小猫]: 73.10%
匹配概率 [小狗]: 26.89%
匹配概率 [潜水艇]: 0.01%
```

---

## 读到这里该能分清

计算机不认识字，词嵌入（Embedding）将文字转化为高维空间中的坐标向量，距离近代表语义相关。

点积（Dot Product）是两个向量对应维度相乘后求和，几何上反映了两个箭头的同向程度：正数代表相关，0 代表无关，负数代表排斥。

自注意力机制（Self-Attention）的核心就是通过点积 $Q \times K$ 计算全序列两两词汇的语义相似度。

Softmax 负责将任意大小、可正可负的原始分数（Logits），通过指数运算平滑压缩为总和为 100% 的标准概率分布。

掌握了硬件和几何运算之后，在真实的工程系统里，用户发起的多轮对话是如何被组织、缓存并调度给 GPU 计算的？下一篇前置基石，我们将解析——《无状态与缓存机制》。

## 参考文献

1. Mikolov, T., Chen, K., Corrado, G., & Dean, J. (2013). [*Efficient Estimation of Word Representations in Vector Space*](https://arxiv.org/abs/1301.3781). ICLR 2013 / arXiv:1301.3781.
2. Vaswani, A., Shazeer, N., Parmar, N., et al. (2017). [*Attention Is All You Need*](https://arxiv.org/abs/1706.03762). NeurIPS 2017 / arXiv:1706.03762.
3. Goodfellow, I., Bengio, Y., & Courville, A. (2016). [*Deep Learning (Chapter 2: Linear Algebra & Chapter 6: Softmax)*](https://www.deeplearningbook.org/). MIT Press.
