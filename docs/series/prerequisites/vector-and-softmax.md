---
title: "向量空间与概率计算"
description: "高维空间坐标、点积几何意义与 Softmax 概率归一化。"
series: prerequisites
chapter: foundations
order: 2
type: concept
articleStatus: draft
prerequisites: []
videoSource: vector-and-softmax
---

# 向量空间与概率计算

在上一篇中，我们拆解了硬件计算的物理账本：GPU 本质上是一台擅长做「大规模矩阵与向量乘加运算」的物理并行机器。

然而，一个根本性的矛盾随之而来：
**现实世界中的信息是文字、图像、音频与类别；而硬件计算核心只认识纯粹的浮点数（如 `0.85`、`-1.23`）。**

计算机究竟是如何把现实世界中复杂多维的事物，转化为可以进行数值计算的数学实体？为什么数学模型能够判定两件事物高度相似、彼此独立还是相互排斥？

这就是现代机器学习与深度学习的核心数学基石——**高维向量空间（Vector Space）、点积（Dot Product）与 Softmax 概率归一化**。

<figure>
  <img src="/figures/vector-and-softmax/vector-space.svg" alt="高维特征空间中的向量几何分布" />
  <figcaption>高维特征空间中的向量几何分布</figcaption>
</figure>

---

## 向量空间与高维特征坐标

如果要让计算机理解世界上形形色色的概念，最直观的方法是建立一个多维特征坐标系：
- 维度 1（体型大小）：蚂蚁是 `-1.0`，猫是 `0.0`，大象是 `+1.0`；
- 维度 2（可爱程度）：蟑螂是 `-1.0`，猫是 `+0.9`，狗是 `+0.9`；
- 维度 3（是否水生）：猫是 `-0.8`，金鱼是 `+1.0`。

把这三个维度的数字打包在一起，我们就得到了「小猫」在三维几何空间中的坐标向量：

$$\vec{v}_{\text{猫}} = [0.0, +0.9, -0.8]$$

在现代机器学习中，这种将离散对象映射为高维连续浮点数数组的过程称为 **特征嵌入（Embedding）**。真实系统通常会使用数百甚至数千维度的超高维几何空间。

在充分训练的高维特征空间中，向量之间往往展现出代数平移规律：

$$\vec{v}_{\text{国王}} - \vec{v}_{\text{男人}} + \vec{v}_{\text{女人}} \approx \vec{v}_{\text{王后}}$$

这意味着，复杂的语义或物理特征被数学模型解耦为了空间中可以进行加减运算的几何方向。

---

## 点积与高维相似度计算

当所有对象都变成了空间中的几何箭头后，计算机是如何衡量「向量 A 与向量 B 是否相似」的？

最基础且最高效的工具就是——**点积（Dot Product / 内积）**。

<figure>
  <img src="/figures/vector-and-softmax/dot-product-similarity.svg" alt="向量空间夹角与点积相似度关系" />
  <figcaption>向量空间夹角与点积相似度关系</figcaption>
</figure>

### 1. 点积的代数与几何定义
两个 $d$ 维向量 $\mathbf{a} = [a_1, a_2, \dots, a_d]$ 与 $\mathbf{b} = [b_1, b_2, \dots, b_d]$ 的点积，等于**对应分量相乘后的代数累加**：

$$\mathbf{a} \cdot \mathbf{b} = \sum_{i=1}^d a_i b_i = \|\mathbf{a}\| \|\mathbf{b}\| \cos(\theta)$$

> **💡 几何直观**：
> 点积的大小直接取决于两个空间箭头之间的夹角 $\theta$：
> - **同向夹角（锐角，$\theta < 90^\circ$）**：$\cos(\theta) > 0$，点积结果为**正数**（特征方向一致，高度正相关）；
> - **相互正交（直角，$\theta = 90^\circ$）**：$\cos(\theta) = 0$，点积结果为 **0**（两个维度毫无交集，彼此独立）；
> - **反向夹角（钝角，$\theta > 90^\circ$）**：$\cos(\theta) < 0$，点积结果为**负数**（特征方向对立，相互排斥）。

### 2. 动笔手算一次点积
设三维空间中有三个概念向量：
- $\mathbf{a} = [2, 1, 0]$（“小猫”）
- $\mathbf{b} = [1, 2, 0]$（“小狗”）
- $\mathbf{c} = [-2, 0, 1]$（“潜水艇”）

我们来计算两组向量的相关性得分：
1. **计算「小猫」与「小狗」的关联**：
   $$\mathbf{a} \cdot \mathbf{b} = (2 \times 1) + (1 \times 2) + (0 \times 0) = 2 + 2 + 0 = \mathbf{+4} \quad (\text{正高分，高度相关})$$
2. **计算「小猫」与「潜水艇」的关联**：
   $$\mathbf{a} \cdot \mathbf{c} = (2 \times -2) + (1 \times 0) + (0 \times 1) = -4 + 0 + 0 = \mathbf{-4} \quad (\text{负分，毫不相关或互斥})$$

点积运算只需要乘法与加法，在 GPU 上可以被流水线并行加速，因而成为了特征相关性匹配的基础算子。

---

## Softmax 概率分布归一化

通过点积计算出来的原始打分（通常称为 **Logits**）可能是有正有负、大小不一的任意实数（例如 $+4.0, +1.0, -4.0$）。

在决策与多分类场景中，我们无法直接用负数或未归一化的分数进行概率推断。如何把任意范围的实数打分，平滑地压缩为「非负且总和严格等于 100%」的标准概率分布？

这就是 **Softmax 函数** 的核心使命。

<figure>
  <img src="/figures/vector-and-softmax/softmax-flow.svg" alt="从 Logits 到概率分布的 Softmax 变换流程" />
  <figcaption>Logits 到概率分布的 Softmax 流程</figcaption>
</figure>

### 1. Softmax 数学公式
对于一组包含 $K$ 个原始打分的向量 $\mathbf{z} = [z_1, z_2, \dots, z_K]$，第 $i$ 个元素的归一化概率定义为：

$$P_i = \frac{e^{z_i}}{\sum_{j=1}^K e^{z_j}}$$

> **💡 双重数学性质**：
> 1. **自然指数 $e^z$ 映射非负**：对于任意实数 $z$（即使是负数 $-100$），$e^z$ 永远严格大于 0，且单调递增，拉大高分项与低分项的差距；
> 2. **分母求和归一化**：把所有指数和作为分母除数，确保所有类别的概率 $P_i \in (0, 1)$，并且**所有类别的概率总和严格等于 1.0（100%）**。

### 2. 动笔手算一次 Softmax
假设系统对三个候选类别的原始打分为 $\mathbf{z} = [2.0, 1.0, -1.0]$（分别代表类别 A、类别 B、类别 C）：

- **第一步：计算各项自然指数 $e^z$**
  - $e^{2.0} \approx 7.389$
  - $e^{1.0} \approx 2.718$
  - $e^{-1.0} \approx 0.368$
- **第二步：求分母总和**
  $$\text{Sum} = 7.389 + 2.718 + 0.368 = \mathbf{10.475}$$
- **第三步：计算最终归一化概率**
  - $P(\text{A}) = \frac{7.389}{10.475} \approx \mathbf{70.54\%}$
  - $P(\text{B}) = \frac{2.718}{10.475} \approx \mathbf{25.95\%}$
  - $P(\text{C}) = \frac{0.368}{10.475} \approx \mathbf{3.51\%}$
  - **概率校验**：$70.54\% + 25.95\% + 3.51\% = \mathbf{100.0\%}$。

---

## 最小代码实现

下面的 Python + NumPy 代码完整演示了特征向量构建、点积相关度打分与 Softmax 数值稳定归一化的全过程：

```python
import numpy as np

def run_vector_and_softmax():
    # 1. 定义三个特征向量 (3维空间坐标)
    v_cat = np.array([2.0, 1.0, 0.0])   # "小猫"
    v_dog = np.array([1.0, 2.0, 0.0])   # "小狗"
    v_sub = np.array([-2.0, 0.0, 1.0])  # "潜水艇"
    
    # 2. 计算点积内积相似度 (以小猫为基准)
    raw_scores = np.array([
        np.dot(v_cat, v_cat),  # 猫 vs 猫: 2*2 + 1*1 + 0*0 = 5.0
        np.dot(v_cat, v_dog),  # 猫 vs 狗: 2*1 + 1*2 + 0*0 = 4.0
        np.dot(v_cat, v_sub)   # 猫 vs 潜艇: 2*-2 + 1*0 + 0*1 = -4.0
    ])
    print("原始点积相似度打分 (猫, 狗, 潜水艇):", raw_scores)
    
    # 3. Softmax 变换 (减去 max(raw_scores) 防止指数上溢，数学结果严格等价)
    exp_scores = np.exp(raw_scores - np.max(raw_scores))
    probabilities = exp_scores / np.sum(exp_scores)
    
    for name, prob in zip(["小猫", "小狗", "潜水艇"], probabilities):
        print(f"归一化概率 [{name}]: {prob * 100:.2f}%")

run_vector_and_softmax()
```

**控制台输出：**
```text
原始点积相似度打分 (猫, 狗, 潜水艇): [ 5.  4. -4.]
归一化概率 [小猫]: 73.10%
归一化概率 [小狗]: 26.89%
归一化概率 [潜水艇]: 0.01%
```

---

## 核心概念辨析

- **特征嵌入（Embedding）**：将离散对象映射为高维空间中的坐标向量，距离近、方向同代表特征关联强；
- **点积（Dot Product）**：通过对应维度乘积累加，度量两个向量的夹角余弦与对齐程度，是高效的相似度计算工具；
- **Softmax 变换**：利用自然指数 $e^z$ 将任意实数分数转换为非负值并按总和归一化，输出总和严格为 100% 的标准概率分布。

掌握了单个向量的内积与概率归一化后，计算机如何利用矩阵批量对空间进行旋转、缩放与投影？下一篇我们将探讨——《矩阵变换与线性投影》。

---

## 参考文献与推荐学习

1. Mikolov, T., Chen, K., Corrado, G., & Dean, J. (2013). [*Efficient Estimation of Word Representations in Vector Space*](https://arxiv.org/abs/1301.3781). ICLR 2013 / arXiv:1301.3781.
2. Strang, G. (2016). [*Introduction to Linear Algebra (5th Edition)*](https://math.mit.edu/~gs/linearalgebra/). Wellesley-Cambridge Press.
3. Goodfellow, I., Bengio, Y., & Courville, A. (2016). [*Deep Learning*](https://www.deeplearningbook.org/). MIT Press. (Chapter 2: Linear Algebra; Chapter 6: Deep Feedforward Networks).
4. 3Blue1Brown (Grant Sanderson). (2016). [*Essence of Linear Algebra: Vectors, what even are they?*](https://www.3blue1brown.com/lessons/vectors). 3Blue1Brown 线性代数的本质系列.
5. Alammar, Jay. (2019). [*The Illustrated Word2vec & Vector Embeddings*](https://jalammar.github.io/illustrated-word2vec/). Jay Alammar Blog.
