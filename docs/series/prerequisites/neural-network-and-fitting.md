---
title: "神经网络与数据拟合"
description: "人工神经元、非线性激活折叠与万能连续函数逼近。"
series: prerequisites
chapter: foundations
order: 4
type: concept
articleStatus: draft
prerequisites:
  - "matrix-and-projection"
videoSource: neural-network-and-fitting
---

# 神经网络与数据拟合

在传统软件工程中，程序员的工作是**「编写显式规则」**：通过成千上万行 `if-else`、状态机和算法逻辑，精确告诉计算机在什么条件下执行什么操作。但现实世界中复杂的模式识别问题——例如判断图像中物体的类别、识别复杂传感器信号的异常——往往难以写出完备的形式化规则系统。

机器学习的核心范式转换，正是从「人工编写规则」跃迁到了**「数据拟合参数」**。人工神经网络（Artificial Neural Network）是一个拥有可调节权重与偏置参数的**万能连续函数拟合器**。

---

## 规则编程与数据参数拟合

我们可以对比两种截然不同的工程世界观：

| 维度 | 传统软件工程（规则驱动） | 神经网络（数据驱动） |
| :--- | :--- | :--- |
| **核心逻辑** | 程序员手动显式编写 `if ... else ...` 分支 | 算法通过数据自动调节矩阵权重 $W$ 与偏置 $b$ |
| **逻辑载体** | 源代码文本（.py, .java, .cpp） | 连续浮点数张量（Tensor 权重数组） |
| **边界处理** | 遇到未穷举的边界条件容易直接报错异常 | 在高维连续空间中寻找邻近流形或平滑插值 |
| **优化方式** | 人工重构代码、修复 Bug、补充规则分支 | 计算误差损失、通过梯度下降反向调节数值参数 |

<figure>
  <video
    controls
    autoplay
    loop
    muted
    playsinline
    poster="/figures/neural-network-and-fitting/space-folding-poster.jpg"
    style="width: 100%; border-radius: 8px; border: 1px solid var(--vp-c-divider);"
  >
    <source src="/figures/neural-network-and-fitting/space-folding.webm" type="video/webm" />
    <source src="/figures/neural-network-and-fitting/space-folding.mp4" type="video/mp4" />
    您的浏览器不支持 HTML5 视频播放。
  </video>
  <figcaption>非线性激活空间折叠与线性可分切分</figcaption>
</figure>

---

## 人工神经元与非线性激活

一个基础的人工神经元（Neuron）主要包含两个计算步骤：**线性加权汇总**与**非线性激活映射**。

<figure>
  <img src="/figures/neural-network-and-fitting/neuron-activation.svg" alt="人工神经元计算流：线性加权与非线性激活" />
  <figcaption>人工神经元计算流：线性汇总与非线性激活</figcaption>
</figure>

### 1. 线性加权与偏置：$z = w^T x + b$
- **输入向量 $x$**：前序层传递过来的特征分量 $[x_1, x_2, \dots, x_n]$。
- **权重向量 $w$**：衡量每个输入维度的重要性。正权重代表促进，负权重代表抑制。
- **偏置 $b$（Bias）**：神经元的**激活阈值基准线**。即使所有输入都为 0，偏置也能控制神经元的默认倾向。

### 2. 为什么必须引入非线性激活函数（$\sigma$）？
这是多层网络设计的核心数学性质：**如果没有非线性激活函数，无论堆叠多少层神经网络，它在数学上都只能退化为单层线性变换！**

设想一个没有激活函数的 3 层网络：
$$y = W_3 \cdot (W_2 \cdot (W_1 \cdot x))$$

根据矩阵乘法的结合律：
$$y = (W_3 \cdot W_2 \cdot W_1) \cdot x = W_{eq} \cdot x$$

三个矩阵相乘只是生成了一个新的等效矩阵 $W_{eq}$。这意味着哪怕堆叠了多层的纯线性网络，它的表达能力和一个单层矩阵乘法没有本质区别，连基础的**异或问题（XOR）**都无法分类。

<figure>
  <img src="/figures/neural-network-and-fitting/linear-collapse-vs-folding.svg" alt="纯线性堆叠塌陷 vs 非线性空间折叠" />
  <figcaption>纯线性堆叠塌陷 vs 非线性空间折叠对比</figcaption>
</figure>

非线性激活函数（如 $\text{ReLU}(z) = \max(0, z)$ 或 $\text{GELU}(z)$）的作用，就像是一把**空间折纸刀**：
- 它在输出为负数时截断归零或平滑抑制，打破了矩阵的全局线性；
- 它将原本纠缠在平面的复杂分布沿着决策边界进行折叠，使得原先在低维平面上无法用直线切分的数据，在折叠后的特征空间中变得线性可分。

---

## 多层感知机与万能逼近定理

1989 年，数学家 George Cybenko 与 Kurt Hornik 分别独立证明了著名的**万能逼近定理（Universal Approximation Theorem）**：一个包含足够神经元的单隐藏层前馈神经网络，配合非线性激活函数，理论上可以**以任意精度逼近紧集上的任何连续非线性函数**。

<figure>
  <img src="/figures/neural-network-and-fitting/mlp-knowledge-memory.svg" alt="多层感知机计算流水线：隐层特征提取与输出投影" />
  <figcaption>多层感知机隐层特征与输出计算流水线</figcaption>
</figure>

一个标准的多层感知机（MLP）通常由两部分组成：
1. **隐层升维投影与非线性折叠（$h = \sigma(x W_1 + b_1)$）**：
   - 将输入特征投影到高维隐层空间；
   - 每个神经元提取特定维度的局部特征模式，经激活函数折叠后形成非线性表征。
2. **输出层投影（$y = h W_2 + b_2$）**：
   - 将折叠后的隐层特征线性组合，输出最终的分类得分或连续回归值。

### 深度（Deep）相比浅层（Shallow）的参数效率优势
虽然理论上单层极宽的网络也能逼近任意函数，但在实际工程中，**深层网络（Deep Networks）**通过逐层空间折叠的嵌套组合，能够以**更少总参数量**实现更优的表征效率。每一层在前一层提取的抽象特征之上继续构建更高阶的模式。

---

## 最小代码实现

经典的异或问题（XOR）是早期单层感知机无法解决的非线性难题。下面的 Python 代码展示了一个最简 2 层神经网络如何借助 ReLU 非线性激活成功拟合异或规律：

```python
import numpy as np

# 1. 异或数据集：输入 2 维，输出 1 维 (相同为 0，不同为 1)
X = np.array([[0, 0], [0, 1], [1, 0], [1, 1]], dtype=float)
y = np.array([[0], [1], [1], [0]], dtype=float)

# 2. 手工设计一个已训练好的 2 层 MLP 权重 (输入 2 -> 隐层 2 -> 输出 1)
# 隐层第 1 个神经元计算 relu(x1 + x2)，第 2 个神经元计算 relu(x1 + x2 - 1)
W1 = np.array([[1.0, 1.0], [1.0, 1.0]])
b1 = np.array([0.0, -1.0])

# 输出层：y = h1 - 2 * h2
W2 = np.array([[1.0], [-2.0]])
b2 = np.array([0.0])

def relu(z):
    return np.maximum(0, z)

# 3. 前向传播计算
# 隐层线性加权 + 偏置
z1 = X @ W1 + b1
# 非线性 ReLU 空间折叠
h = relu(z1)
# 输出层加权
out = h @ W2 + b2

# 4. 打印拟合验证结果
print("输入样本 X:")
print(X)
print("\n经过 ReLU 空间折叠后的隐层表征 h:")
print(h)
print("\n网络最终预测输出 vs 真实标签:")
for i in range(len(X)):
    print(f"输入: {X[i]} -> 预测: {out[i][0]:.1f} | 真实: {y[i][0]}")
```

**控制台输出：**
```text
输入样本 X:
[[0. 0.]
 [0. 1.]
 [1. 0.]
 [1. 1.]]

经过 ReLU 空间折叠后的隐层表征 h:
[[0. 0.]
 [1. 0.]
 [1. 0.]
 [2. 1.]]

网络最终预测输出 vs 真实标签:
输入: [0. 0.] -> 预测: 0.0 | 真实: 0.0
输入: [0. 1.] -> 预测: 1.0 | 真实: 1.0
输入: [1. 0.] -> 预测: 1.0 | 真实: 1.0
输入: [1. 1.] -> 预测: 0.0 | 真实: 0.0
```

观察隐层表征 `h`：原本在二维平面上无法用单一直线分割的样本，在折叠后映射到了新的特征位置，从而实现了 100% 精确的非线性分类。

---

## 常用激活函数形态与权衡

在神经网络的发展中，激活函数的演进直接影响了深度网络的训练稳定性：

| 激活函数 | 数学形式 | 特性与物理权衡 |
| :--- | :--- | :--- |
| **Sigmoid / Tanh** | $\frac{1}{1 + e^{-z}}$ | 输出平滑压缩到 $(0, 1)$；但在两端饱和区导数极小，深层网络易遭遇**梯度消失** |
| **ReLU** | $\max(0, z)$ | 正区间导数恒为 1，计算仅需比较指令；但负区间梯度为 0 易导致**神经元失活** |
| **Leaky ReLU / GELU** | $z \cdot \Phi(z)$ | 负区间保留微小可导斜率，保证梯度持续流动，提供更平滑的非线性过渡 |
| **Swish / SiLU** | $z \cdot \sigma(z)$ | 具备非单调性与平滑下界，在深层网络中表现稳定 |

---

## 核心概念辨析

- **硬编码规则 vs 数据拟合**：
  - 传统程序是人工枚举显式分支；
  - 神经网络是通过多层连续函数在特征空间上拟合输入与输出的隐式映射。
- **纯线性堆叠 vs 非线性折叠**：
  - 纯线性多层矩阵连乘在数学上等价于单层矩阵（线性坍缩）；
  - 非线性激活函数打破了全局线性，赋予网络空间折叠与万能逼近能力。
- **浅层宽网络 vs 深层深网络**：
  - 浅层宽网络需要巨量神经元并联逼近复杂边界；
  - 深层网络通过多级分层空间折叠，以更少的参数实现高效的多阶特征抽象。

拥有了能够拟合任意函数的神经网络架构后，计算机如何度量当前的拟合误差，并自动调整数以亿计的权重参数？下一篇我们将探讨——《损失函数与梯度下降》。

---

## 参考文献与推荐学习

1. Cybenko, George. (1989). [*Approximation by superpositions of a sigmoidal function*](https://link.springer.com/article/10.1007/BF02551274). Mathematics of Control, Signals and Systems, 2(4), 303-314.
2. Hornik, Kurt, Stinchcombe, Maxwell, & White, Halbert. (1989). [*Multilayer feedforward networks are universal approximators*](https://www.sciencedirect.com/science/article/abs/pii/0893608089900208). Neural Networks, 2(5), 359-366.
3. Nair, Vinod, & Hinton, Geoffrey E. (2010). [*Rectified Linear Units Improve Restricted Boltzmann Machines*](https://icml.cc/Conferences/2010/papers/432.pdf). ICML 2010.
4. Hendrycks, Dan, & Gimpel, Kevin. (2016). [*Gaussian Error Linear Units (GELUs)*](https://arxiv.org/abs/1606.08415). arXiv:1606.08415.
5. 3Blue1Brown (Grant Sanderson). (2017). [*Neural Networks: But what is a neural network?*](https://www.3blue1brown.com/lessons/neural-networks). 3Blue1Brown 深度学习的本质系列.
6. Karpathy, Andrej. (2022). [*Building micrograd: A tiny scalar-valued autograd engine and neural network*](https://github.com/karpathy/micrograd). GitHub & YouTube Video Tutorial.
7. 李沐等. (2023). [*动手学深度学习 · 多层感知机与激活函数*](https://zh.d2l.ai/chapter_multilayer-perceptrons/index.html). D2L 开源教材.
