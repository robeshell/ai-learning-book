---
title: "模型蒸馏与量化压缩"
description: "教师模型蒸馏、INT8/INT4 低比特量化与 LoRA 微调。"
series: how-models-train
chapter: deep-thinking
order: 6
type: concept
articleStatus: draft
prerequisites:
  - "sft"
videoSource: distillation-quantization
---

# 模型蒸馏与量化压缩

大语言模型虽然具备了丰富的知识储备与推理能力，但在实际工程落地中，模型体积与计算资源构成了直接的显存约束。

一个标准的 70B 稠密模型，若以 FP16 半精度（2 字节/参数）加载，仅权重本身就需要消耗约 140GB 显存，至少需要两张顶级数据中心 GPU 才能装载；在处理长上下文时，KV Cache 的显存开销还会进一步扩张。而在消费级显卡或端侧设备上，可用显存通常更为有限。

如何将千亿大模型的能力迁移至参数量更小的模型中？如何在不全量重训的前提下，以较低开销完成特定任务适配？

本篇将从知识蒸馏、数值量化与低秩微调出发，解析大模型轻量化落地的三项核心技术。

<figure>
  <img src="/figures/distillation-quantization/distillation-dark-knowledge.svg" alt="知识蒸馏流水线：从千亿教师到轻量学生模型" />
  <figcaption>知识蒸馏：软概率分布与暗知识（Dark Knowledge）迁移</figcaption>
</figure>

---

## 知识蒸馏：教师与学生架构

2015 年，Hinton 等人在论文 [*Distilling the Knowledge in a Neural Network*](https://arxiv.org/abs/1503.02531) 中提出了 **知识蒸馏（Knowledge Distillation）** 的基本框架。

其核心在于构建 **教师-学生体系（Teacher-Student）**：利用容量较大但推理成本高的教师模型（如 671B MoE），指导结构精简、推理更快的学生模型（如 1.5B 或 7B）。

### 1. 软标签与语义关联分布
传统的硬标签监督学习（Hard Labels）仅提供离散的标准答案（目标类别概率为 100%）。

而教师模型输出的 Softmax 概率分布（软标签 / 预测分布）中，包含了词表上更丰富的相对语义关系：
- 在预测某个专有名词时，教师模型不仅赋予正确词最高概率，还会对相关同义词、近义词赋予适当的小概率，同时对无关词赋予趋近于零的极低概率；
- 这种分布结构反映了特征空间的几何拓扑；
- 通过结合温度系数 $T$ 缩放概率分布，学生模型通过拟合 KL 散度损失，能够以较高效率学习教师模型的特征分布。

### 2. 思维链轨迹蒸馏（CoT Data Distillation）
在现代深度推理大模型体系中，蒸馏发展出了更为直接的范式：
- 利用经过大规模强化学习训练的超大推理模型（Teacher）针对海量数理与代码任务，生成包含推导、反思与回溯的完整思考链（`<think>...</think>`）；
- 将这批高质量思考链作为精标样本，对较小规模的学生模型（如 1.5B / 7B）进行 SFT 训练；
- 小模型通过直接拟合高阶思考轨迹，能够在特定推理任务上取得逼近大模型的表现，大幅缩减了小模型从零探索强化学习的成本。

---

## 模型量化：低位宽整数与显存压缩

标准大模型的权重通常以 **FP16 / BF16（半精度浮点数，每个参数占用 2 字节）** 存储。

**模型量化（Quantization）** 的核心在于**使用低位宽定点整数（如 INT8 占用 1 字节、INT4 占用 0.5 字节）来表达和存储浮点权重**。

### 1. 线性量化与映射公式
浮点张量 $X$ 映射到低比特整数 $X_{\text{quant}}$ 的线性映射公式为：

$$X_{\text{quant}} = \text{clip}\left(\left\lfloor \frac{X}{S} \right\rceil + Z, \, Q_{\min}, \, Q_{\max}\right)$$

- $S$（Scale，缩放因子）：用于将浮点数的动态取值范围映射到定点整数区间；
- $Z$（Zero-point，零点偏移）：用于对齐浮点数 0.0 与整数零点的对应关系。

在推理执行矩阵乘法时，硬件利用 INT8 / INT4 专用张量算子进行整型乘加运算，再经由反量化恢复为激活向量。

### 2. 显存压缩收益与离群值处理
- **显存占用降低**：70B 模型在 FP16 模式下需约 140GB 显存，量化至 INT4（如 AWQ / GPTQ）后显存需求降至 **35GB ~ 40GB**，可在单张消费级显卡或高配工作站上部署；
- **离群值（Outliers）保护**：大模型各层激活中存在极少数数值极大但至关重要的通道。现代量化方案（如 AWQ、LLM.int8()）通过通道分组保护或将关键通道保留为浮点计算，减小了量化带来的精度损失。

---

## LoRA：低秩矩阵微调

当针对垂直领域（如特定代码库、法律文书）微调大模型时，全参数微调（Full Fine-Tuning）需要更新全网权重并维护庞大的梯度与优化器显存。

2021 年，微软研究团队提出了 **LoRA（Low-Rank Adaptation，低秩适配）**。

<figure>
  <img src="/figures/distillation-quantization/lora-low-rank-matrix.svg" alt="LoRA 低秩矩阵分解几何结构与权重合并机制" />
  <figcaption>LoRA（低秩适配）：冻结主权重与轻量旁路矩阵分解</figcaption>
</figure>

### 1. 低秩分解原理
在特定下游任务的微调过程中，权重矩阵的有效更新量 $\Delta W$ 通常处于较低的内在秩（Intrinsic Rank $r$）。

对于输入输出维度为 $d \times k$ 的全连接层权重 $W_0$：
- 冻结原始主权重矩阵 $W_0 \in \mathbb{R}^{d \times k}$，训练时不计算其梯度；
- 在主干旁构建低秩分解分支：
  $$\Delta W = B \cdot A$$
  其中矩阵 $A \in \mathbb{R}^{r \times k}$（正态分布初始化），矩阵 $B \in \mathbb{R}^{d \times r}$（全零初始化，保证训练初始时 $\Delta W = 0$）；
- 秩设定满足 $r \ll \min(d, k)$（通常取 $r = 8$ 或 $16$）。

### 2. 参数量对比
以层维度 $d = 4096, k = 4096$，秩 $r = 8$ 为例：
- 原权重参数量：$4096 \times 4096 \approx 1.67 \times 10^7$；
- LoRA 旁路参数量：$A(8 \times 4096) + B(4096 \times 8) = 65,536$；
- 训练参数量减少约 256 倍（仅占原权重的约 0.39%）。

### 3. 部署期权重融合（Weight Merging）
训练完成后，利用矩阵乘法的线性性质，可将低秩矩阵直接加回原始主权重中：

$$W_{\text{deploy}} = W_0 + \frac{\alpha}{r} (B \cdot A)$$

融合后的模型在推理阶段直接加载单矩阵计算，**不引入额外的结构开销与前向计算延迟**。

---

## 最小代码实现

以下代码演示了 LoRA 层的双分支前向计算，并验证了其与部署期权重融合（Weight Merging）的数学等价性：

```python
import numpy as np

def lora_demo():
    np.random.seed(42)
    d_in, d_out = 4, 4
    r = 2  # 低秩 Rank 设为 2
    alpha = 4.0
    scaling = alpha / r
    
    x = np.array([[1.0, -0.5, 2.0, 0.5]])  # 形状为 (1, 4) 的输入向量
    
    # 1. 冻结的主权重矩阵 W_0
    W_0 = np.random.randn(d_in, d_out) * 0.5
    
    # 2. 模拟训练完成后的 LoRA 旁路矩阵 A 与 B
    A = np.random.randn(r, d_in) * 0.1
    B = np.random.randn(d_out, r) * 0.1
    
    # --- 方式 1: 训练期双分支前向计算 ---
    h_main = x @ W_0
    h_lora = (x @ A.T @ B.T) * scaling
    h_dual_branch = h_main + h_lora
    
    # --- 方式 2: 部署期权重融合 (Weight Merging) ---
    delta_W = (B @ A).T * scaling
    W_merged = W_0 + delta_W
    h_merged = x @ W_merged
    
    # 3. 验证数值一致性
    print(f"双分支前向输出  : {np.round(h_dual_branch, 5)}")
    print(f"融合单矩阵前向输出: {np.round(h_merged, 5)}")
    max_diff = np.max(np.abs(h_dual_branch - h_merged))
    print(f"两种计算方式最大误差: {max_diff:.10e} (严格数学等价: {max_diff < 1e-9})")

lora_demo()
```

**控制台输出：**
```text
双分支前向输出  : [[-0.05967  0.14616 -0.92709  0.04488]]
融合单矩阵前向输出: [[-0.05967  0.14616 -0.92709  0.04488]]
两种计算方式最大误差: 1.1102230246e-16 (严格数学等价: True)
```

---

## 核心概念辨析

- **知识蒸馏 vs 模型量化 vs LoRA**：
  - 知识蒸馏通过学生模型拟合教师模型的输出分布或推理轨迹，改变了模型尺寸；
  - 模型量化通过将权重数值位宽从浮点降低为定点整数，不改变网络拓扑；
  - LoRA 冻结主干权重并仅更新并行的低秩分解矩阵，用于高效的特定领域任务微调。
- **全参数微调 vs 低秩微调（LoRA）**：
  - 全参数微调需保存全网梯度与优化器状态，显存与存储开销大；
  - LoRA 仅更新约 0.1% ~ 1% 的低秩参数，微调成本低且部署时可无损融合。
- **训练后量化（PTQ） vs 量化感知训练（QAT）**：
  - PTQ 在训练完成后直接基于校准集转换，耗时短；
  - QAT 在微调阶段引入量化误差模拟，精度保持能力相对更优。

至此，我们已经完成了第二季《大模型是怎么炼成的》的全部核心训练与优化工序。大模型虽已具备深厚的先验知识与推理能力，但在实际业务中，如何连接企业私有知识库、调用外部工具并执行确定性程序？下一季我们将进入——《给大模型装上手和脚》。

---

## 参考文献

1. Hinton, Geoffrey, Vinyals, Oriol, & Dean, Jeff. (2015). [*Distilling the Knowledge in a Neural Network*](https://arxiv.org/abs/1503.02531). arXiv:1503.02531.
2. Hu, Edward J., Shen, Yelong, Wallis, Phillip, et al. (2021). [*LoRA: Low-Rank Adaptation of Large Language Models*](https://arxiv.org/abs/2106.09685). ICLR 2022 / arXiv:2106.09685.
3. Dettmers, Tim, Lewis, Mike, Belkada, Younes, & Zettlemoyer, Luke. (2022). [*LLM.int8(): 8-bit Matrix Multiplication for Transformers at Scale*](https://arxiv.org/abs/2208.07339). NeurIPS 2022 / arXiv:2208.07339.
4. Lin, Ji, Tang, Jiaming, Tang, Haotian, et al. (2023). [*AWQ: Activation-aware Weight Quantization for LLM Compression and Acceleration*](https://arxiv.org/abs/2306.00978). MLSys 2024 / arXiv:2306.00978.
5. DeepSeek-AI. (2025). [*DeepSeek-R1: Incentivizing Reasoning Capability in LLMs via Reinforcement Learning (DeepSeek-R1-Distill)*](https://arxiv.org/abs/2501.12948). arXiv:2501.12948.
