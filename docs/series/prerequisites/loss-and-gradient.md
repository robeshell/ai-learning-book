---
title: "损失函数与梯度下降"
description: "交叉熵误差标尺、链式法则反向求导与 AdamW 优化动力学。"
series: prerequisites
chapter: foundations
order: 5
type: concept
articleStatus: draft
prerequisites:
  - "neural-network-and-fitting"
videoSource: loss-and-gradient
---

# 损失函数与梯度下降

在前几篇文章中，我们建立了一个拥有多层矩阵参数与非线性激活的函数架构。但如果这些参数只是随机初始化的浮点数，网络输出的预测将只是一团随机数值。

如何让这台由多个矩阵构成的数学机器，自动学习到输入与输出之间的正确映射规律？

答案是由三根数学支柱构成的**自适应学习闭环**：
1. **损失函数（Loss Function）**：作为高维特征空间的海拔仪，精确度量「当前网络预测与真实目标之间的误差」；
2. **反向传播（Backpropagation）**：基于多元微积分链式法则，将输出端的总体误差沿着计算图逆向倒流，分配到每一个具体的权重参数；
3. **梯度下降与优化器（Optimizer / AdamW）**：带领参数在高维曲面中，以合适的步长寻找最优解。

---

## 交叉熵损失函数误差标尺

在监督学习与模式分类中，网络的核心任务是**输出各个类别的概率分布**。

假设模型给出的预测概率分布为 $P$，而样本中真实的目标类别为 $y_{true}$：

<figure>
  <img src="/figures/loss-and-gradient/loss-landscape.svg" alt="损失曲面与梯度下降：高维浓雾中的「盲人下山」" />
  <figcaption>损失曲面与梯度下降：步长选择与收敛轨迹</figcaption>
</figure>

### 交叉熵损失（Cross-Entropy Loss）
分类任务中最核心的误差标尺是**交叉熵损失（等价于负对数似然 NLL Loss）**：
$$L = -\log P(y_{true})$$

这个公式背后有着直观的信息论解释：
- 如果模型预测正确目标的概率是 $100\%$（即 $P=1.0$），则 $L = -\log(1.0) = 0$，模型完全没有惩罚；
- 如果模型预测正确目标的概率仅有 $1\%$（即 $P=0.01$），则 $L = -\log(0.01) \approx 4.60$，模型受到较大的误差惩罚；
- 如果模型预测正确目标的概率趋近于 $0$，则 $L \to +\infty$，产生极大的惩罚信号。

每一次前向传播，系统将整批样本的预测误差汇总为一个单一的标量数值 $L$。这个标量就是我们必须最小化的「海拔高度」。

---

## 梯度方向与高维局部下山

参数优化的过程，在几何上常常被比喻为**「浓雾中的盲人下山」**：
- 盲人看不见整座山的全局地形，但他可以用双脚感知**当前脚下地面倾斜最厉害的方向**；
- **梯度（Gradient, $\nabla_W L$）** 是标量损失 $L$ 对所有可学习参数 $W$ 求偏导组成的向量，它在几何上严格指向**函数上升最快的方向**；
- 因此，沿**负梯度方向（$-\nabla_W L$）**迈步，就是在局部范围内下降最快的路线。

<figure>
  <video
    controls
    autoplay
    loop
    muted
    playsinline
    poster="/figures/loss-and-gradient/gradient-descent-poster.jpg"
    style="width: 100%; border-radius: 8px; border: 1px solid var(--vp-c-divider);"
  >
    <source src="/figures/loss-and-gradient/gradient-descent.webm" type="video/webm" />
    <source src="/figures/loss-and-gradient/gradient-descent.mp4" type="video/mp4" />
    您的浏览器不支持 HTML5 视频播放。
  </video>
  <figcaption>梯度下降步长震荡与动量收敛模拟</figcaption>
</figure>

基础参数更新公式为：
$$W_{new} = W_{old} - \eta \cdot \nabla_W L$$

其中 $\eta$（Eta）为**学习率（Learning Rate）**，它决定了每一步迈出的距离大小：
- **学习率过大**：一步迈得太大，可能直接越过谷底，在两侧剧烈横跳，导致损失发散（Loss Exploding）；
- **学习率过小**：每一步移动微弱，耗费大量计算资源仍难以收敛；
- **工程解法**：采用**学习率预热（Warmup）与退火策略（Decay）**，前期先从小步探索，中期平稳滑行，后期微调逼近最优谷底。

---

## 链式法则与反向传播求导

在一个拥有数十层乃至上百层的深度网络中，输出端的误差 $L$ 是如何传递给最初几层的输入权重矩阵的？

1986 年，Geoffrey Hinton 等人发表在 *Nature* 上的经典论文，确立了现代深度学习的基石算法——**误差反向传播（Backpropagation）**。

<figure>
  <img src="/figures/loss-and-gradient/backprop-chain-rule.svg" alt="反向传播与链式法则：误差梯度的倒流流水线" />
  <figcaption>反向传播：链式法则误差偏导数倒流流水线</figcaption>
</figure>

反向传播的本质是多元微积分的**链式法则（Chain Rule）**：
$$\frac{\partial L}{\partial W_1} = \frac{\partial L}{\partial \hat{y}} \cdot \frac{\partial \hat{y}}{\partial z_2} \cdot \frac{\partial z_2}{\partial a_1} \cdot \frac{\partial a_1}{\partial z_1} \cdot \frac{\partial z_1}{\partial W_1}$$

其在工程实现上的核心在于**动态规划与梯度复用**：
1. **前向传播（Forward Pass）**：从前往后顺次计算每一层的输出与激活值，并将这些中间张量暂存在内存中；
2. **损失计算（Loss Computation）**：在输出端对比真实标签，计算标量误差；
3. **反向传播（Backward Pass）**：从后往前逆序推进，每一层只需将上一层传过来的梯度乘以当前层局部的雅可比导数，即可求得当前权重的偏导数 $\frac{\partial L}{\partial W}$；
4. **单次计算复杂度与前向传播同阶**：反向传播将求解全网络参数梯度的复杂度从穷举求导降到了与前向传播相同的 $O(N)$。

---

## 优化器从 SGD 到 AdamW 演进

在高维非凸损失曲面上，朴素的随机梯度下降（SGD）往往面临挑战：它容易在狭长的山谷中发生横向震荡，并且在遇到梯度近乎为 0 的鞍点（Saddle Point）时容易停滞。

为了克服这些缺陷，优化器经历了一系列的工程演化：

<figure>
  <img src="/figures/loss-and-gradient/optimizer-comparison.svg" alt="优化器演进全景：从朴素 SGD 到现代工业标准 AdamW" />
  <figcaption>优化器从 SGD 到 AdamW 演进对比</figcaption>
</figure>

### 1. SGD + Momentum（物理动量）
引入下山小球的**物理惯性**（一阶动量 $m_t$）：
$$m_t = \beta m_{t-1} + g_t, \quad W \leftarrow W - \eta m_t$$
动量机制使得在相同方向上的连续下坡速度越来越快，而在来回颠簸的横向震荡方向上相互抵消，从而加速收敛。

### 2. Adam（自适应矩估计）
Adam 算法同时维护了**一阶动量（梯度的均值，方向惯性）**和**二阶动量（梯度的未中心化方差，自适应缩放）**：
- 对于频繁更新、梯度剧烈的权重分量，自动缩小其更新步长，防止剧烈震荡；
- 对于稀疏更新、梯度微弱的权重分量，自动放大其更新步长，加快特征学习。

### 3. AdamW（解耦权重衰减）
Loshchilov 和 Hutter 发现了传统 Adam 与 L2 正则化结合时的缺陷，提出了 **AdamW（Decoupled Weight Decay）**：
- 将权重衰减项（Weight Decay $\lambda W$）从自适应梯度更新中解耦出来，直接作用于参数本身；
- 这一改进显著提升了深层网络的泛化能力与训练稳定性，成为现代深度学习训练的常用首选优化器。

---

## 最小代码实现

下面的 Python 代码演示了一个单层网络的前向传播、交叉熵损失计算、解析梯度反向传播与参数更新循环，展示 Loss 从 2.35 稳定下降的全过程：

```python
import numpy as np

# 1. 构造一个 3 类别分类微型训练样本 (输入 4 维，真实类别为第 2 类 index=1)
x = np.array([[1.0, 2.0, -1.0, 0.5]])  # 1x4
y_true_idx = 1                          # 目标标签为 1

# 2. 随机初始化权重 W (4x3) 与学习率
np.random.seed(42)
W = np.random.randn(4, 3) * 0.5
lr = 0.1

print("--- 开始梯度下降优化循环 ---")
for epoch in range(1, 6):
    # (1) 前向传播: z = x @ W
    z = x @ W
    
    # (2) 计算 Softmax 概率分布
    exp_z = np.exp(z - np.max(z))
    probs = exp_z / np.sum(exp_z, axis=1, keepdims=True)
    
    # (3) 计算交叉熵损失 L = -log P(y_true)
    loss = -np.log(probs[0, y_true_idx])
    
    # (4) 反向传播计算梯度: dL/dz = P - y_one_hot
    dL_dz = probs.copy()
    dL_dz[0, y_true_idx] -= 1.0  # 核心数学简化: 预测概率减真实标签
    
    # (5) 链式法则求权重的梯度: dL/dW = x^T @ dL_dz
    dL_dW = x.T @ dL_dz
    
    # (6) 梯度下降更新权重
    W -= lr * dL_dW
    
    print(f"轮次 {epoch}: 损失 Loss = {loss:.4f} | 目标类别预测概率 P(y=1) = {probs[0, y_true_idx]*100:.2f}%")
```

**控制台输出：**
```text
--- 开始梯度下降优化循环 ---
轮次 1: 损失 Loss = 2.3581 | 目标类别预测概率 P(y=1) = 9.46%
轮次 2: 损失 Loss = 1.5922 | 目标类别预测概率 P(y=1) = 20.35%
轮次 3: 损失 Loss = 1.0343 | 目标类别预测概率 P(y=1) = 35.55%
轮次 4: 损失 Loss = 0.6830 | 目标类别预测概率 P(y=1) = 50.51%
轮次 5: 损失 Loss = 0.4778 | 目标类别预测概率 P(y=1) = 62.02%
```

仅仅 5 步梯度迭代，模型对正确目标的置信度就从 $9.46\%$ 提升到了 $62.02\%$，损失值呈现出平稳下降趋势。

---

## 训练阶段显存开销构成

在第一篇《显存与计算带宽》中，我们知道仅做前向计算时每个参数通常占 2 字节（FP16）。但在**训练阶段**，因为需要保存反向传播的状态，显存开销会明显增加：

| 显存占用项 | 存储内容 | 每个参数显存占用（标准 FP16 + AdamW） |
| :--- | :--- | :--- |
| **模型权重（Weights）** | 参与前向计算的参数 | 2 字节（FP16） |
| **梯度张量（Gradients）** | 反向传播计算出的 $\nabla_W L$ | 2 字节（FP16） |
| **优化器状态（Optimizer States）** | AdamW 的一阶动量 $m$ + 二阶动量 $v$ + FP32 主权重 | **12 字节**（4 + 4 + 4 字节） |
| **激活值缓冲（Activations）** | 前向各层暂存用于反向求导的中间特征 | 随 Batch Size 与网络深度增加 |

这就是为什么训练一个参数模型，除了存储静态权重，还需要留出数倍于权重的显存用于存储梯度与优化器状态。

---

## 核心概念辨析

- **损失函数 vs 梯度 vs 优化器**：
  - 损失函数是**度量错误的标尺（海拔高度）**；
  - 梯度是**误差对参数的偏导数（最陡下坡方向）**；
  - 优化器是**结合动量与自适应步长修正权重的更新算法（下山策略）**。
- **前向传播 vs 反向传播**：
  - 前向传播是**从输入到输出的数据推理与预测**；
  - 反向传播是**从输出到输入的误差分配与链式求导**。
- **SGD 优化器 vs AdamW 优化器**：
  - SGD 每次使用全参数统一的固定学习率，易在鞍点震荡；
  - AdamW 维护一阶动量与二阶方差，结合解耦权重衰减，实现按参数维度自适应调节步长。

掌握了单机内部的算法闭环后，当系统需要通过网络向客户端提供持续交互服务时，无状态协议与内存缓存是如何平衡计算开销的？下一篇我们将探讨——《无状态与缓存机制》。

---

## 参考文献与推荐学习

1. Rumelhart, David E., Hinton, Geoffrey E., & Williams, Ronald J. (1986). [*Learning representations by back-propagating errors*](https://www.nature.com/articles/323533a0). Nature, 323(6088), 533-536.
2. Kingma, Diederik P., & Ba, Jimmy. (2014). [*Adam: A Method for Stochastic Optimization*](https://arxiv.org/abs/1412.6980). ICLR 2015 / arXiv:1412.6980.
3. Loshchilov, Ilya, & Hutter, Frank. (2017). [*Decoupled Weight Decay Regularization*](https://arxiv.org/abs/1711.05101). ICLR 2019 / arXiv:1711.05101.
4. Goodfellow, Ian, Bengio, Yoshua, & Courville, Aaron. (2016). *Deep Learning*. MIT Press. (Chapter 6: Deep Feedforward Networks; Chapter 8: Optimization for Training Deep Models).
5. 3Blue1Brown (Grant Sanderson). (2017). [*Gradient descent, how neural networks learn*](https://www.3blue1brown.com/lessons/gradient-descent). 3Blue1Brown 梯度下降直观解析.
6. 3Blue1Brown (Grant Sanderson). (2017). [*What is backpropagation really doing?*](https://www.3blue1brown.com/lessons/backpropagation). 3Blue1Brown 反向传播微积分直觉.
7. Karpathy, Andrej. (2022). [*The spelled-out intro to neural networks and backpropagation: building micrograd*](https://www.youtube.com/watch?v=VMj-3S1tku0). Andrej Karpathy 零基础手写反向传播.
