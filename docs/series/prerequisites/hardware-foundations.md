---
title: "显存与计算带宽"
description: "参数显存占用换算、HBM 带宽瓶颈与单字生成延迟下限。"
series: prerequisites
chapter: foundations
order: 1
type: concept
articleStatus: draft
prerequisites: []
videoSource: hardware-foundations
---

# 显存与计算带宽

在进入大模型的算法与神经网络细节之前，很多初学者最容易产生困惑的往往不是复杂的数学，而是各种冷酷的**硬件物理现象**：

- 为什么下载了一个标称「只有 70B（700 亿）参数」的模型，家里的 24GB 顶级显卡连加载都加载不进去，直接弹出一串报错 `CUDA Out of Memory`（显存溢出）？
- 为什么数据中心里一张售价数十万元的英伟达 H100 显卡，在给单个用户生成文章时，每秒钟吐出几十个字就似乎达到了物理极限？

大模型不是凭空漂浮在云端的魔法，它是一套**被半导体物理规律死死约束的计算工程系统**。

要读懂全书后续的所有核心机制（上下文窗口、前缀缓存、推理加速与 MoE），我们必须先建立起全书的第一块物理基石——**大模型的硬件账本**。

<figure>
  <img src="/figures/hardware-foundations/cpu-vs-gpu.svg" alt="CPU 与 GPU 微观计算拓扑对比" />
  <figcaption>CPU 与 GPU 微观计算拓扑对比</figcaption>
</figure>

---

## 物理底座：CPU 与 GPU 的分工真相

为什么大模型的训练与推理必须依赖 GPU（图形处理器）甚至专用的 TPU / NPU，而不能用我们熟悉的电脑 CPU（中央处理器）？

我们可以用一个通俗的场景来理解两者的微观架构差异：

- **CPU（中央处理器）**：像**几位无所不知的大学教授（通常 8~64 个核心）**。每个核心极其强大，主频高达 4~5GHz，擅长处理复杂的逻辑跳转、条件判断（`if-else`）和操作系统调度。但如果给教授一张包含 100 亿个简单加减乘除的巨型考卷，由于教授只有几个人，他们只能一道一道串行去算，耗时极其漫长。
- **GPU（图形处理器）**：像**一万名只会做简单加减乘除的小学生（如 16,384 个流处理器核心）**。单个小学生的智商并不高，无法运行复杂的操作系统，但如果把这 100 亿道乘加算术题（$y = wx + b$）平均分给这一万名小学生，他们能在**同一微秒内齐刷刷同时算完并交卷**。

大模型本质上是什么？**它就是由数千亿个浮点数权重构成的巨型矩阵乘法（GEMM）**。这种计算天然没有任何复杂的 `if-else` 分支，每一个数字的乘法彼此独立，因此 GPU 的海量并发架构成为了大模型的天然宿主。

---

## 显存算式：一个模型到底占多大空间？

买显卡时常听到的「显存（VRAM）」，是模型能否运行的**第一道生死门槛**。

模型参数在物理上就是一个个用二进制表示的浮点数（Float）。浮点数的精度决定了它在显存中占用的字节数（Bytes）：

<figure>
  <img src="/figures/hardware-foundations/precision-bytes.svg" alt="不同数值精度下的模型静态显存对照表" />
  <figcaption>不同数值精度下的模型静态显存对照表</figcaption>
</figure>

### 1. 常见精度与物理字节对照
- **FP32（单精度浮点）**：每个参数占 **4 字节（Bytes）**（传统科学计算标准）；
- **FP16 / BF16（半精度浮点）**：每个参数占 **2 字节（Bytes）**（**现代大模型工业标准**）；
- **INT8（8 位整数量化）**：每个参数占 **1 字节（Byte）**；
- **INT4（4 位整数极限量化）**：每个参数占 **0.5 字节（半个字节）**。

### 2. 动笔手算：为什么 70B 模型至少需要 140GB 显存？
只要记住一个极简的核心公式：

$$\text{静态权重显存占用 (GB)} = \text{模型参数量 (Billion)} \times \text{每参数字节数 (Bytes)}$$

- **计算实例 A（70B 工业基准）**：
  在标准的 FP16（16 位，2 字节）模式下：
  $$\text{显存需求} = 70 \times 2 = 140 \text{ GB}$$
  *结论*：一张 24GB 的 RTX 4090 显卡连它的 1/5 都装不下，必须使用两张 80GB 的专业数据中心显卡（如 A100/H100，共 160GB 显存）才能完整加载。
- **计算实例 B（7B 消费级部署）**：
  如果是 7B（70 亿）模型，经过 4-bit（INT4，0.5 字节）量化压缩后：
  $$\text{显存需求} = 7 \times 0.5 = 3.5 \text{ GB}$$
  *结论*：即使是只有 8GB 显存的普通轻薄笔记本，也能毫无压力地在本地离线流畅运行。

> **⚠️ 真实工业冗余**：
> 实际部署时，除了静态存放模型权重文件，还需要为中间激活值、CUDA 运行时底仓以及后续会讲到的 **KV Cache** 预留约 **20% 的安全显存缓冲**。因此 140GB 的权重，通常需要 $140 \times 1.2 \approx 168 \text{ GB}$ 的物理显存。

---

## 显存带宽墙：为什么大模型吐字速度有上限？

很多刚接触 AI 的工程师会问：显卡拥有上万个计算核心，为什么单用户聊天时，模型生成一句话不能像搜索网页一样瞬间完成（如 0.01 秒吐出一千字），而是像打字机一样一秒钟吐出三四十个词？

这引出了大模型硬件体系中最关键的矛盾：**显存容量（VRAM） vs 显存带宽（Bandwidth）**。

<figure>
  <img src="/figures/hardware-foundations/vram-vs-bandwidth.svg" alt="显存容量（仓库）与显存带宽（通道）示意图" />
  <figcaption>显存容量（仓库）与显存带宽（通道）示意图</figcaption>
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
  <figcaption>自回归单字生成与显存带宽受限（Memory-Bound）模拟</figcaption>
</figure>

我们可以把 GPU 内部运作还原为物理工厂：
- **显存（HBM）是仓库**：140GB 的模型权重像海量的原材料堆在仓库里；
- **计算核心（Tensor Core）是车间**：工人的算力极其强悍，每秒能做数百万亿次矩阵乘加；
- **显存总线（Memory Bus）是大门与货道**：连接仓库和车间的大门宽度，就是**显存带宽（Bandwidth，如 2000 GB/s）**。

### 冰冷的自回归物理瓶颈
在逐字生成（Decode）阶段，大模型是**自回归（Autoregressive）**运转的——**每生成 1 个新的字，都必须将全网整整 140GB 的权重参数，从显存仓库完整读取搬运到计算核心中过一遍！**

让我们动手推导一下单用户的生成延迟下限：

$$\text{单 Token 搬运延迟 (秒)} = \frac{\text{模型权重体积 (GB)}}{\text{显存总线带宽 (GB/s)}}$$

假设我们在一张理论带宽为 $2000 \text{ GB/s}$（2 TB/s）的显卡上运行 140GB 的 70B 模型：
1. **搬运一次 140GB 权重的物理时间**：
   $$\text{搬运耗时} = \frac{140 \text{ GB}}{2000 \text{ GB/s}} = 0.07 \text{ 秒} = 70 \text{ 毫秒}$$
2. **单用户理论最大吐字速率**：
   $$\text{吐字速率} = \frac{1 \text{ 秒}}{0.07 \text{ 秒}} \approx 14.3 \text{ Tokens/秒}$$

**在这 70 毫秒中，计算车间的工人只需要花几毫秒就能算完算术，剩下的 90% 以上时间全部在百无聊赖地干等数据从仓库搬运过来。**

这就是为什么大模型在生成时处于 **显存带宽受限（Memory-bandwidth bound）** 状态。这也是后续我们要学习的 **推测采样**（第 6 篇）与 **MoE 混合专家模型**（第 9 篇）之所以能大幅加速的物理根源！

---

## 动手实验：15 行代码算清任何模型的硬件开销

下面的极简 Python 代码实现了一个通用的硬件开销估算器，你可以用它秒算任何开源模型在不同显卡上的显存占用与吐字速度极限：

```python
def estimate_llm_hardware(param_billion: float, quant_bits: int, bandwidth_gb_s: float):
    # 1. 计算每个参数占用的字节数 (FP16=2字节, INT8=1字节, INT4=0.5字节)
    bytes_per_param = quant_bits / 8.0
    
    # 2. 计算纯权重显存与包含 KV Cache 缓冲的建议显存 (GB)
    weight_gb = param_billion * bytes_per_param
    recommended_vram_gb = weight_gb * 1.2  # 预留 20% 运行冗余
    
    # 3. 计算自回归单 Token 搬运物理延迟 (毫秒) 与吐字速率上限
    latency_ms = (weight_gb / bandwidth_gb_s) * 1000.0
    tokens_per_sec = 1000.0 / latency_ms if latency_ms > 0 else 0.0
    
    return {
        "权重净体积": f"{weight_gb:.1f} GB",
        "建议安全显存": f"{recommended_vram_gb:.1f} GB",
        "单字搬运延迟": f"{latency_ms:.1f} ms",
        "单用户吐字上限": f"{tokens_per_sec:.1f} Tokens/s"
    }

# 实验 1：70B 模型 (FP16 16位) 在 H100 (显存带宽 3350 GB/s) 上的账本
print("70B on H100:", estimate_llm_hardware(param_billion=70, quant_bits=16, bandwidth_gb_s=3350))

# 实验 2：14B 模型 (INT4 4位量化) 在 RTX 4090 (显存带宽 1008 GB/s) 上的账本
print("14B-INT4 on 4090:", estimate_llm_hardware(param_billion=14, quant_bits=4, bandwidth_gb_s=1008))
```

运行输出结果：
```text
70B on H100:     {'权重净体积': '140.0 GB', '建议安全显存': '168.0 GB', '单字搬运延迟': '41.8 ms', '单用户吐字上限': '23.9 Tokens/s'}
14B-INT4 on 4090: {'权重净体积': '7.0 GB',   '建议安全显存': '8.4 GB',   '单字搬运延迟': '6.9 ms',  '单用户吐字上限': '144.0 Tokens/s'}
```

---

## 读到这里该能分清

CPU 拥有少数几个全能核心，擅长复杂逻辑跳转；GPU 拥有一万个乘加核心，天生契合大模型的海量矩阵并发。

显存占用计算公式极其简单：$\text{显存(GB)} = \text{参数量(Billion)} \times \text{精度字节(Bytes)}$。FP16 占 2 字节，INT8 占 1 字节，INT4 占 0.5 字节。

显存容量（VRAM）决定模型「装不装得下」；显存带宽（Bandwidth）决定单用户生成「吐字有多快」。

在单用户自回归生成时，每吐 1 个词必须将全量权重从显存读取一次，导致系统长期处于显存带宽受限状态。

掌握了硬件底座之后，计算机究竟如何把人类的文字变成一串串可以参与矩阵相乘的高维数字？下一篇前置基石，我们将解锁——《向量空间与概率计算》。

## 参考文献

1. Hennessy, J. L., & Patterson, D. A. (2018). [*Computer Architecture: A Quantitative Approach (6th Edition)*](https://www.elsevier.com/books/computer-architecture/hennessy/978-0-12-811905-1). Morgan Kaufmann.
2. NVIDIA. (2022). [*NVIDIA H100 Tensor Core GPU Architecture Whitepaper*](https://images.nvidia.com/aem-dam/en-zz/Solutions/data-center/h100/nvidia-h100-tensor-core-gpu-whitepaper.pdf).
3. Dettmers, T., Lewis, M., Belkada, Y., & Zettlemoyer, L. (2022). [*LLM.int8(): 8-bit Matrix Multiplication for Transformers at Scale*](https://arxiv.org/abs/2208.07339). NeurIPS 2022 / arXiv:2208.07339.
4. Frantar, E., Saleh, B., Istrate, R., & Alistarh, D. (2022). [*GPTQ: Accurate Post-Training Quantization for Generative Pre-trained Transformers*](https://arxiv.org/abs/2210.17323). arXiv:2210.17323.
