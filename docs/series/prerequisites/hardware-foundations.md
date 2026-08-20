---
title: "显存与计算带宽"
description: "GPU 并行架构、显存带宽瓶颈与计算内存受限法则。"
series: prerequisites
chapter: foundations
order: 1
type: concept
articleStatus: draft
prerequisites: []
videoSource: hardware-foundations
---

# 显存与计算带宽

在理解现代深度学习与神经网络的计算原理时，首先需要关注的是底层硬件的**物理运行规律**：

- 为什么一个标称拥有数十亿甚至数百亿参数的网络模型，在消费级显卡上连加载都无法完成，直接报错 `CUDA Out of Memory`（显存溢出）？
- 为什么数据中心里售价高昂的高性能 GPU，在执行逐点向量运算时，算力利用率往往不足 10%，绝大部分时间核心都在「空转干等」？

深度学习与模式识别系统是一套**被半导体物理规律、内存层级结构与总线带宽约束的计算工程系统**。

要理解后续的所有计算机制，我们必须先建立起清晰的物理账本——**硬件算力与显存带宽**。

<figure>
  <img src="/figures/hardware-foundations/cpu-vs-gpu.svg" alt="CPU 与 GPU 微观计算拓扑对比" />
  <figcaption>CPU 与 GPU 微观计算拓扑对比</figcaption>
</figure>

---

## CPU 与 GPU 计算架构差异

为什么深度学习的训练与推理普遍依赖 GPU（图形处理器）或专用加速器（TPU/NPU），而不能直接使用日常电脑的 CPU（中央处理器）？

我们可以通过微观架构的分工来理解两者的差异：

- **CPU（中央处理器）**：通常拥有 8~64 个物理核心。每个核心主频高达 4~5GHz，拥有大容量缓存（L1/L2/L3 Cache）和复杂的分支预测器，擅长处理复杂的逻辑跳转、条件判断（`if-else`）和操作系统调度。但如果交给 CPU 包含 100 亿道简单加减乘除的巨型计算任务，由于核心数量有限，只能依靠较少的线程串行计算，耗时较长。
- **GPU（图形处理器）**：拥有数万个流处理器核心（ALU）。单个核心的逻辑控制单元相对简单，无法独立运行操作系统，但如果把这 100 亿道矩阵乘加算术题（$y = wx + b$）平均分给数万个并发核心，它们能在同一微秒内并行计算完成。

神经网络计算的核心是由海量浮点数构成的超大规模矩阵乘加运算（GEMM）。这种计算天然具有极高的数据并行性，每一个乘加操作彼此独立，因此 GPU 的高并发流处理器成为了现代数值计算的主要硬件载体。

---

## 浮点精度与显存容量计算

显卡的显存（VRAM / HBM）是神经网络能否成功加载并运行的**第一道物理门槛**。

网络中的可学习参数（权重与偏置）在物理存储上是二进制浮点数（Float）。数值的存储精度直接决定了每个参数占用的字节数（Bytes）：

<figure>
  <img src="/figures/hardware-foundations/precision-bytes.svg" alt="不同数值精度下的模型静态显存对照表" />
  <figcaption>不同数值精度下的模型静态显存对照表</figcaption>
</figure>

### 1. 常见精度与物理字节对照
- **FP32（单精度浮点）**：每个参数占 **4 字节（Bytes）**（传统科学计算标准）；
- **FP16 / BF16（半精度浮点）**：每个参数占 **2 字节（Bytes）**（**现代深度学习标准格式**）；
- **INT8（8 位整数量化）**：每个参数占 **1 字节（Byte）**；
- **INT4（4 位整数极限量化）**：每个参数占 **0.5 字节（半个字节）**。

### 2. 网络权重的显存占用公式
计算网络参数静态显存占用只需一个基础公式：

$$\text{静态权重显存占用 (GB)} = \text{参数量 (Billion)} \times \text{每参数字节数 (Bytes)}$$

- **计算实例 A（700 亿参数网络）**：
  在标准的 FP16（16 位，2 字节）模式下：
  $$\text{显存需求} = 70 \times 2 = 140 \text{ GB}$$
  *物理结论*：一张 24GB 显存的消费级显卡无法单独装载，需要至少两张 80GB 的专业数据中心显卡（共 160GB 显存）才能完整加载。
- **计算实例 B（70 亿参数网络量化）**：
  如果是 7B（70 亿）参数网络，经过 4-bit（INT4，0.5 字节）量化压缩后：
  $$\text{显存需求} = 7 \times 0.5 = 3.5 \text{ GB}$$
  *物理结论*：8GB 显存的普通设备也能将其放入显存中运行。

> **⚠️ 运行时显存缓冲**：
> 实际计算时，除了静态存放权重参数外，系统还需要为前向计算的中间激活值（Activations）、临时张量工作区（Workspace）预留显存空间。通常建议在纯权重显存基础上**额外预留 20%~30% 的缓冲余量**。

---

## 显存带宽与 Roofline 模型

在硬件体系结构中，拥有强悍的算力并不等于实际计算就能跑得飞快。这引出了现代硬件架构中最核心的矛盾：**显存容量（VRAM） vs 显存带宽（Bandwidth）**。

<figure>
  <img src="/figures/hardware-foundations/vram-vs-bandwidth.svg" alt="显存容量（仓库）与显存带宽（通道）示意图" />
  <figcaption>显存容量与显存带宽系统示意</figcaption>
</figure>

<figure>
  <video
    controls
    autoplay
    loop
    muted
    playsinline
    poster="/figures/hardware-foundations/memory-bandwidth-wall-poster.jpg"
    style="width: 100%; border-radius: 8px; border: 1px solid var(--vp-c-divider);"
  >
    <source src="/figures/hardware-foundations/memory-bandwidth-wall.webm" type="video/webm" />
    <source src="/figures/hardware-foundations/memory-bandwidth-wall.mp4" type="video/mp4" />
    您的浏览器不支持 HTML5 视频播放。
  </video>
  <figcaption>显存数据搬运与内存受限模拟</figcaption>
</figure>

我们可以把 GPU 内部运作抽象为数据流转模型：
- **显存（HBM / GDDR）是仓库**：网络权重与输入数据存放在仓库中；
- **计算核心（Tensor Core / ALU）是加工车间**：每秒能做数百乃至数千 TFLOPS（万亿次）浮点运算；
- **显存总线（Memory Bus）是连接仓库与车间的物流通道**：通道的通行速度上限就是**显存带宽（Bandwidth，例如 2000 GB/s）**。

### 屋顶模型（Roofline Model）与算术强度
在计算机体系结构中，一个计算任务的瓶颈由**算术强度（Operational / Arithmetic Intensity）**决定：

$$\text{算术强度} = \frac{\text{总计算量 (FLOPs)}}{\text{总数据搬运量 (Bytes)}}$$

根据算术强度的高低，计算任务被严格划分为两类：

1. **计算受限（Compute-Bound）**：
   - 典型场景：大批次矩阵乘法（$Y = W \cdot X$，Batch 较大）。
   - 特点：从显存读取 1 字节权重后，能与多个输入数据复用进行多次乘加运算。算术强度较高，数据传输不再是主要瓶颈，计算核心能够满载运转。
2. **内存受限 / 访存受限（Memory-Bound）**：
   - 典型场景：矩阵-向量乘法（$y = W \cdot x$，单批次处理）或逐元素激活函数（如 ReLU）。
   - 特点：为了对单个向量做一次乘法，必须把全量矩阵权重从显存完整搬运一遍。算术强度较低（每个字节只参与 1~2 次运算）。
   - **后果**：计算核心仅需极短时间即可算完，绝大部分时间都在等待数据从显存搬运过来，系统性能受制于显存带宽上限。

---

## 最小代码实现

下面的 Python 代码实现了一个通用的硬件物理账本计算器，帮助我们快速评估不同参数规模、数值精度与显存带宽下的理论搬运耗时与计算瓶颈：

```python
def analyze_hardware_budget(param_billion: float, precision_bits: int, bandwidth_gb_s: float):
    # 1. 计算每个参数占用的字节数 (FP32=4, FP16=2, INT8=1, INT4=0.5)
    bytes_per_param = precision_bits / 8.0
    
    # 2. 计算权重静态占用与建议显存 (GB)
    weight_gb = param_billion * bytes_per_param
    recommended_vram_gb = weight_gb * 1.25  # 预留 25% 运行时缓冲区
    
    # 3. 计算低算术强度下单次全量权重搬运的物理延迟 (毫秒) 与理论频次上限
    transfer_latency_ms = (weight_gb / bandwidth_gb_s) * 1000.0
    max_throughput_per_sec = 1000.0 / transfer_latency_ms if transfer_latency_ms > 0 else 0.0
    
    return {
        "静态权重体积": f"{weight_gb:.1f} GB",
        "建议安全显存": f"{recommended_vram_gb:.1f} GB",
        "单轮权重搬运耗时": f"{transfer_latency_ms:.2f} ms",
        "带宽受限频次上限": f"{max_throughput_per_sec:.1f} 次/秒"
    }

# 实验 1：70B 参数网络 (FP16, 16位) 在 H100 GPU (显存带宽 3350 GB/s) 上的物理账本
print("70B-FP16 on H100:", analyze_hardware_budget(param_billion=70, precision_bits=16, bandwidth_gb_s=3350))

# 实验 2：14B 参数网络 (INT4 量化, 4位) 在 RTX 4090 (显存带宽 1008 GB/s) 上的物理账本
print("14B-INT4 on RTX 4090:", analyze_hardware_budget(param_billion=14, precision_bits=4, bandwidth_gb_s=1008))
```

**控制台输出：**
```text
70B-FP16 on H100:     {'静态权重体积': '140.0 GB', '建议安全显存': '175.0 GB', '单轮权重搬运耗时': '41.79 ms', '带宽受限频次上限': '23.9 次/秒'}
14B-INT4 on RTX 4090: {'静态权重体积': '7.0 GB',   '建议安全显存': '8.8 GB',   '单轮权重搬运耗时': '6.94 ms',  '带宽受限频次上限': '144.0 次/秒'}
```

---

## 核心概念辨析

- **CPU vs GPU**：
  - CPU 拥有少数几个功能全面的核心，擅长复杂的串行逻辑分支与操作系统调度；
  - GPU 拥有数万个轻量并发核心，适合执行高并行度矩阵与张量运算。
- **显存容量 vs 显存带宽**：
  - 显存容量（VRAM）是**仓库面积**，决定模型参数与激活张量能否被完整装入；
  - 显存带宽（Bandwidth）是**物流通道**，决定数据从存储单元向计算核心搬运的速率。
- **计算受限 vs 内存受限**：
  - 高算术强度任务（大批次计算）受限于硬件 FLOPs 算力峰值；
  - 低算术强度任务（单批次逐层读取）受限于显存总线数据传输带宽。

掌握了硬件的物理运作规律之后，现实世界中的离散数据（文字、图像、声音）究竟如何被抽象为计算机可以计算的数字坐标？下一篇我们将深入探索——《向量空间与概率计算》。

---

## 参考文献与推荐学习

1. Hennessy, J. L., & Patterson, D. A. (2018). [*Computer Architecture: A Quantitative Approach (6th Edition)*](https://www.elsevier.com/books/computer-architecture/hennessy/978-0-12-811905-1). Morgan Kaufmann.
2. Williams, S., Waterman, A., & Patterson, D. (2009). [*Roofline: an insightful visual performance model for multicore architectures*](https://cacm.acm.org/magazines/2009/4/22972-roofline-an-insightful-visual-performance-model-for-multicore-architectures/fulltext). Communications of the ACM, 52(4), 65-76.
3. NVIDIA. (2022). [*NVIDIA H100 Tensor Core GPU Architecture Whitepaper*](https://images.nvidia.com/aem-dam/en-zz/Solutions/data-center/h100/nvidia-h100-tensor-core-gpu-whitepaper.pdf).
4. Micikevicius, P., Narang, S., Alben, J., et al. (2018). [*Mixed Precision Training*](https://arxiv.org/abs/1710.03740). ICLR 2018 / arXiv:1710.03740.
5. NVIDIA. [*Deep Learning Performance Guide & GPU Architecture Tutorials*](https://docs.nvidia.com/deeplearning/performance/index.html). NVIDIA Developer Documentation.
6. Hwu, W. M., Kirk, D., & El Hajj, I. (2022). [*Programming Massively Parallel Processors (PMPP) Course & Materials*](https://github.com/vtsynergy/Massively_Parallel_Programming). UIUC CS 483 / ECE 408.
