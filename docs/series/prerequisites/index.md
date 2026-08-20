---
title: "基础知识"
description: "显存算力、向量几何、矩阵算子、梯度反传与缓存共享机制。"
---

# 基础知识

显存算力换算、高维向量空间、矩阵线性投影、梯度下降反传与无状态缓存共享机制。

随查随用的底层物理与数学工具箱，掌握后读懂大模型不再有硬件与算子门槛。

<LearningMap series-id="prerequisites" />

---

## 推荐系统学习资源

如果你希望对本专栏涉及的数学工具、计算机体系结构与深度学习基础进行更系统、深入的扩展学习，以下精选了几门在业界与学术界公认质量极高的公开教学资源：

### 1. 线性代数与几何直觉
- **[3Blue1Brown · 线性代数的本质 (Essence of Linear Algebra)](https://www.3blue1brown.com/topics/linear-algebra)**：通过高水平的可视化动画，直观讲解向量、矩阵变换、行列式、基变换与特征值的几何本质。
- **[MIT 18.06 · 线性代数导论 (Gilbert Strang)](https://ocw.mit.edu/courses/18-06-linear-algebra-spring-2010/)**：麻省理工学院经典先修课，从四个基本子空间、正交投影到奇异值分解（SVD）的系统推导。

### 2. 微积分、梯度与优化
- **[3Blue1Brown · 微积分的本质 (Essence of Calculus)](https://www.3blue1brown.com/topics/calculus)**：用几何图景讲解导数、积分与链式法则，建立连续变化的直觉感知。
- **[3Blue1Brown · 深度学习与反向传播 (Neural Networks)](https://www.3blue1brown.com/topics/neural-networks)**：生动剖析人工神经网络、梯度下降与误差反向传播的数学过程。

### 3. 深度学习原理与从零推演
- **[Andrej Karpathy · Neural Networks: Zero to Hero](https://karpathy.ai/zero-to-hero.html)**：前 OpenAI 创始科学家、特斯拉 AI 总监经典系列，带你用纯 Python 从零手写 autograd 自动求导引擎（micrograd）、Bigram 语言模型与 GPT。
- **[动手学深度学习 (Dive into Deep Learning / D2L)](https://zh.d2l.ai/)**：李沐等学者开源的交互式教材，涵盖多层感知机、卷积、注意力与优化算法，附带可直接运行的代码与公式推导。

### 4. 计算机体系结构与并行计算
- **[UIUC ECE 408 / CS 483 · 大规模并行处理器编程 (PMPP)](https://www.coursera.org/learn/gpu-programming)**：系统剖析 GPU 线程拓扑、内存层次结构（HBM / SRAM / 寄存器）与 GEMM 矩阵乘法硬件加速原理。
- **[NVIDIA · 深度学习性能优化指南 (Deep Learning Performance Guide)](https://docs.nvidia.com/deeplearning/performance/index.html)**：英伟达官方工程实践文档，深入讲解计算受限（Compute-Bound）与内存受限（Memory-Bound）的调优策略。
