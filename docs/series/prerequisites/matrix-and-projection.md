---
title: "矩阵变换与线性投影"
description: "基向量空间形变、升降维投影与观察视角滤镜本质。"
series: prerequisites
chapter: foundations
order: 3
type: concept
articleStatus: draft
prerequisites:
  - "vector-and-softmax"
videoSource: matrix-and-projection
---

# 矩阵变换与线性投影

在计算科学与机器学习的几何视角下，**矩阵不是静态的数据表，而是一个空间力场与特征观察滤镜**。

当一个高维特征向量穿过权重矩阵时，它被旋转、拉伸、升维或降维，投射到了一个全新的观察坐标系中。掌握矩阵变换与线性投影的几何直觉，是理解多维特征提取、维度压缩与深度神经网络空间映射的基础。

---

## 矩阵乘法与空间拉伸旋转

在前一篇文章中，我们知道高维向量是几何空间中的一个「坐标点」或「箭头」。那么，一个矩阵 $W$ 与向量 $x$ 相乘得到 $y = Wx$，在几何上到底发生了什么？

答案是：**矩阵乘法是对整个坐标空间的整体线性形变**。

<figure>
  <video
    controls
    autoplay
    loop
    muted
    playsinline
    poster="/figures/matrix-and-projection/matrix-transformation-poster.jpg"
    style="width: 100%; border-radius: 8px; border: 1px solid var(--vp-c-divider);"
  >
    <source src="/figures/matrix-and-projection/matrix-transformation.webm" type="video/webm" />
    <source src="/figures/matrix-and-projection/matrix-transformation.mp4" type="video/mp4" />
    您的浏览器不支持 HTML5 视频播放。
  </video>
  <figcaption>矩阵乘法空间旋转拉伸与投影模拟</figcaption>
</figure>

我们可以从基向量（Basis Vectors）的落点来理解矩阵变换：
- 在二维直角坐标系中，标准基底是 $\hat{i} = [1, 0]^T$（水平方向 1 单位）和 $\hat{j} = [0, 1]^T$（垂直方向 1 单位）。
- 任何向量 $v = [x, y]^T$ 都是这两个基向量的线性缩放组合：$v = x\hat{i} + y\hat{j}$。
- 如果我们给出一个变换矩阵 $W = \begin{bmatrix} a & b \\ c & d \end{bmatrix}$，矩阵的**第一列 $[a, c]^T$ 就是变换后 $\hat{i}$ 的新坐标，第二列 $[b, d]^T$ 就是变换后 $\hat{j}$ 的新坐标**。

<figure>
  <img src="/figures/matrix-and-projection/spatial-transformation.svg" alt="矩阵变换几何本质：网格变形、空间旋转与拉伸" />
  <figcaption>矩阵变换几何本质：基底落点与空间形变</figcaption>
</figure>

当空间发生形变时，原先网格中的每一个点都被带着移动到了新的位置。神经网络中的权重参数，本质上就是由一层层空间线性变换矩阵构成的。输入特征经过这些连续的空间变换，被逐步映射到更易分类与决策的目标特征空间。

---

## 升维拓展与降维信息瓶颈

如果矩阵的输入维度和输出维度相同（如 $d_{in} = d_{out} = 4$），矩阵主要起**旋转和缩放**作用。但如果输入维度与输出维度不同，矩阵就执行了**维度投影（Dimension Projection）**。

在物理世界中，投影就像拿手电筒从不同角度照射一个三维物体：
- 从上方照射，在地面留下一个水平轮廓阴影（过滤了高度信息）；
- 从侧面照射，在墙上留下功能部件的投影。

同一个实体，透过不同的投影矩阵，会呈现出完全不同的特征切面。

<figure>
  <img src="/figures/matrix-and-projection/dimension-change.svg" alt="升维与降维：高维特征分离与低维信息瓶颈" />
  <figcaption>升维与降维：高维特征展开与低维信息瓶颈</figcaption>
</figure>

### 1. 升维投影（Up-Projection）：展开纠缠，寻找线性可分
当 $d_{in} < d_{out}$ 时，矩阵将低维向量投射到更高维度的空间。
- **物理动机**：在低维空间中，复杂分布往往纠缠在一起（例如二维平面上的非线性异或分布，无法用单一直线分开）。
- **几何机制**：升维就像把纠缠在平面上的样本点向上拉伸到三维空间，只要维度足够丰富，原本交织的样本就能找到一个平整的超平面（Hyperplane）将其分割。
- **典型应用**：隐层升维映射展开低维纠缠，赋予模型更充裕的表征容量以拟合多元关系。

### 2. 降维投影（Down-Projection）：压缩冗余，构建信息瓶颈
当 $d_{in} > d_{out}$ 时，矩阵将高维向量投射到更低维度的子空间。
- **物理动机**：原始高维数据通常包含噪声与高度共线的冗余特征，计算开销较大。
- **几何机制**：降维构建了一个**信息瓶颈（Information Bottleneck）**，促使网络过滤次要扰动，保留核心的主成分几何特征。
- **典型应用**：主成分分析（PCA）、低秩矩阵分解（Low-Rank Factorization）与自动编码器，在紧凑维度下保留关键信息。

---

## 线性投影与多重视角滤镜

在模式识别与特征工程中，一个核心设计原则是：**对于同一个输入特征向量 $x$，通过乘以多个不同的投影矩阵，可以同时获得关于该对象的多种不同观察切面**。

例如，一个输入特征向量 $x \in \mathbb{R}^{d}$ 包含了物体的全部原始物理测量值。但在具体判别任务中，我们往往需要分别聚焦于不同侧面：

<figure>
  <img src="/figures/matrix-and-projection/qkv-projection.svg" alt="线性投影机制：同一个特征向量的多重视角滤镜" />
  <figcaption>线性投影：同一个特征向量的多重视角滤镜</figcaption>
</figure>

三个投影矩阵充当了三副专门的数学滤镜：
1. **$W_A$ 投影（形态滤镜）➔ 观察几何物理属性**
   - 将向量 $x$ 投影为形态子空间特征 $y_A = x W_A$。
   - 提取物体的边缘、轮廓、尺寸等几何表征分量。
2. **$W_B$ 投影（功能滤镜）➔ 观察行为交互属性**
   - 将向量 $x$ 投影为功能子空间特征 $y_B = x W_B$。
   - 提取物体的可操作性与功能属性。
3. **$W_C$ 投影（类别滤镜）➔ 观察高层抽象归属**
   - 将向量 $x$ 投影为类别子空间特征 $y_C = x W_C$。
   - 提取所属类别的全局抽象语义。

如果省去投影矩阵直接使用原始输入 $x$，就意味着系统只能用单一固定的基底去观察数据，从而丧失了多角度提取独立特征的能力。

---

## 最小代码实现

下面的 Python + NumPy 代码演示了一个 4 维实体特征向量如何通过 3 个独立的线性投影矩阵，映射到三个不同的 2 维观察子空间：

```python
import numpy as np

# 1. 模拟一个 4 维输入特征向量 (如某物体的多维测量指标)
x = np.array([1.2, -0.5, 0.8, 0.1])  # d_in = 4

# 2. 定义 3 个独立的线性投影矩阵 (4x2 矩阵，映射到 2 维子空间)
np.random.seed(42)
d_out = 2
W_shape = np.random.randn(4, d_out) * 0.5  # 观察视角 A: 形态特征
W_func  = np.random.randn(4, d_out) * 0.5  # 观察视角 B: 功能特征
W_class = np.random.randn(4, d_out) * 0.5  # 观察视角 C: 类别特征

# 3. 线性投影变换：y = x @ W
y_shape = x @ W_shape
y_func  = x @ W_func
y_class = x @ W_class

# 4. 在各个子空间中计算与其他标准特征模板的投影内积
template_shape = np.array([0.5, -0.2])
similarity_score = np.dot(y_shape, template_shape)

print(f"原始特征向量 x (4D)  : {np.round(x, 2)}")
print(f"形态投影向量 y_A (2D): {np.round(y_shape, 2)}")
print(f"功能投影向量 y_B (2D): {np.round(y_func, 2)}")
print(f"类别投影向量 y_C (2D): {np.round(y_class, 2)}")
print(f"形态子空间与模板内积匹配度: {similarity_score:.4f}")
```

**控制台输出：**
```text
原始特征向量 x (4D)  : [ 1.2 -0.5  0.8  0.1]
形态投影向量 y_A (2D): [ 0.12 -0.52]
功能投影向量 y_B (2D): [-0.16 -0.35]
类别投影向量 y_C (2D): [0.21 0.38]
形态子空间与模板内积匹配度: 0.1645
```

---

## 通用矩阵乘法 GEMM 硬件加速

在现代硬件架构中，矩阵乘法（General Matrix Multiply, GEMM）是整个深度计算系统中算力消耗最大的核心算子。

| 矩阵变换类型 | 维度变化 | 几何与计算特征 | 硬件加速策略 |
| :--- | :--- | :--- | :--- |
| **稠密方阵变换** | $d \to d$ | 空间旋转、拉伸与尺度缩放 | 专用 Tensor Core 脉动阵列（Systolic Array）高吞吐并行计算 |
| **升维投影** | $d_{in} \to d_{out} (d_{out} > d_{in})$ | 扩展空间维度，展开非线性特征 | 权重量化（FP16/INT8）与大批次并行复用（Compute-Bound） |
| **降维投影** | $d_{in} \to d_{out} (d_{out} < d_{in})$ | 压缩特征冗余，提炼信息瓶颈 | 寄存器与 SRAM 快速中间累加，减少显存写回带宽开销 |
| **低秩矩阵分解** | $d \to r \to d (r \ll d)$ | 将 $d \times d$ 大矩阵拆解为 $d \times r$ 与 $r \times d$ | 显存占用从 $O(d^2)$ 降低至 $O(2dr)$，缓解显存与带宽压力 |

---

## 核心概念辨析

- **矩阵乘法 vs 向量内积**：
  - 向量内积（Dot Product）输出一个**标量数值**，衡量两个特定向量之间的夹角与相似度；
  - 矩阵乘法（Matrix Multiply）是一组连续的基底投影，输出一个**全新的向量**，实现空间的整体形变。
- **升维投影 vs 降维投影**：
  - 升维投影扩展特征空间，使原本纠缠的数据更容易被线性分割；
  - 降维投影压缩冗余信息，构建低秩瓶颈并过滤细微噪声。
- **线性变换的局限**：
  - 纯粹的矩阵乘法无论叠加多少层，其数学复合仍然只是一个单层线性变换（$W_2 W_1 x = W_{eq} x$）。

如何打破线性叠加的限制，让多层网络具备拟合任意复杂曲面的能力？下一篇我们将探讨——《神经网络与数据拟合》。

---

## 参考文献与推荐学习

1. Strang, Gilbert. (2016). *Introduction to Linear Algebra (5th ed.)*. Wellesley-Cambridge Press. (Chapter 6: Positive Definite Matrices and SVD; Chapter 7: Linear Transformations).
2. 3Blue1Brown (Grant Sanderson). (2016). [*Essence of Linear Algebra: Linear Transformations and Matrices*](https://www.3blue1brown.com/topics/linear-algebra). 3Blue1Brown 矩阵与线性变换直觉.
3. 3Blue1Brown (Grant Sanderson). (2016). [*Change of basis*](https://www.3blue1brown.com/lessons/change-of-basis). 3Blue1Brown 基变换与空间投影.
4. Golub, Gene H., & Van Loan, Charles F. (2013). *Matrix Computations (4th ed.)*. Johns Hopkins University Press.
5. MIT OpenCourseWare. (2010). [*MIT 18.06: Linear Algebra (Lecture 14: Orthogonal Vectors and Subspaces, Lecture 15: Projections onto Subspaces)*](https://ocw.mit.edu/courses/18-06-linear-algebra-spring-2010/). MIT 官方公开课.
