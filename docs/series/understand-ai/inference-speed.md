---
title: "推理加速与推测采样"
description: "PagedAttention 显存分页、推测采样与吞吐延迟权衡。"
series: understand-ai
chapter: runtime
order: 6
type: concept
articleStatus: draft
prerequisites:
  - "prompt-caching"
videoSource: inference-speed
---

# 推理加速与推测采样

在前几篇中，我们解析了 Token 的度量方式、上下文窗口的工作台本质以及前缀缓存（Prompt Caching）对输入计算的节省。然而，当输入处理完毕、大模型开始正式向外「吐字」时，开发者会面临另一个冷酷的硬件物理瓶颈：**逐字生成的解码速度极其缓慢，且无论 GPU 算力多强，单用户的吐字速率似乎总是卡在每秒几十个 Token 的上限。**

为什么拥有一万多个计算核心的高性能 GPU，在给大模型生成文字时却跑不满算力？现代推理框架是如何打破显存碎片与自回归串行枷锁的？

本篇将从底层显存分页与概率采样数学推导出发，解析现代大模型推理的两大支柱技术：**PagedAttention（显存虚拟分页）** 与 **Speculative Decoding（推测采样）**。

<figure>
  <img src="/figures/inference-speed/paged-attention.svg" alt="连续显存分配与 PagedAttention 虚拟分页对比" />
  <figcaption>连续显存预分配与 PagedAttention 虚拟分页对比</figcaption>
</figure>

---

## 逐字生成的物理枷锁：显存带宽受限（Memory-bound）

要理解为什么大模型吐字慢，必须从 GPU 硬件的物理运转机制来看自回归解码（Decode Phase）：

以一个 70B 参数的半精度（FP16/BF16）大模型为例，其权重文件大小约为：

$$\text{权重显存占用} = 70 \times 10^9 \times 2 \text{ Bytes} \approx 140 \text{ GB}$$

在自回归解码阶段，大模型**每预测生成 1 个新的 Token，就必须将这整整 140 GB 的权重参数从 GPU 高速显存（HBM）完整读取到计算核心（SRAM/Cache）中一次**。

假设一张高端数据中心 GPU 的显存理论带宽为 $2 \text{ TB/s}$（$2000 \text{ GB/s}$），那么单次读取 140 GB 权重的物理极限时间为：

$$\text{单 Token 读取延迟} = \frac{140 \text{ GB}}{2000 \text{ GB/s}} = 0.07 \text{ 秒} = 70 \text{ ms}$$

这意味着，在单并发情况下，该硬件每秒最多只能吐出约 $1 \div 0.07 \approx 14 \text{ 个 Token}$。

**此时 GPU 的计算核心（Tensor Core）绝大部分时间都在空闲等待数据从显存搬运过来，实际算力利用率往往不足 10%**。这就是所谓的**显存带宽受限（Memory-bandwidth bound）**。

---

## 显存革命：PagedAttention 消除碎片

在推测采样出现之前，工业界首先遭遇的是显存容量的严重浪费危机。[Kwon 等人在 SOSP 2023 发表的开创性论文 *PagedAttention*](https://arxiv.org/abs/2309.06180) 揭示了传统推理服务的致命缺陷：

### 1. 传统连续预分配的碎片危机
在早期系统中，由于显存中的 KV Cache 必须是物理连续的张量，系统在接收到一个请求时，必须提前按照模型支持的最大长度（如 2048 或 4096 Tokens）为其预分配一块连续显存空间。
- **内部碎片**：用户如果只聊了 200 个字就结束了对话，剩下的 1848 个 Token 的显存空间全部被白白占用；
- **外部碎片**：各请求释放显存后遗留下大量不连续的显存空隙，无法容纳新的长文本请求。
- **实测结果**：在真实业务集群中，**60%~80% 的 GPU 显存处于被预定但未实际使用的浪费状态**，导致单卡能跑的并发请求数（Batch Size）被严重压低。

### 2. 虚拟内存分页机制（PagedAttention）
PagedAttention 彻底借鉴了传统操作系统管理内存的经典思想：
1. **固定块切分**：将每个请求动态增长的 KV Cache 切分为固定大小的逻辑块（Logical Blocks，例如每个块容纳 16 个 Token 的 KV 向量）；
2. **块表映射（Block Table）**：维护一张页表，将逻辑上连续的 Token 块映射到 GPU 物理显存中任意非连续的物理块（Physical Blocks）；
3. **按需分配**：每生成 16 个 Token 才动态申请一个新的物理块，未使用的空间不预先占用；
4. **零碎片共享**：支持 Copy-on-Write（写时复制），让多分支采样、束搜索（Beam Search）和公共前缀能够天然共享相同的物理显存块。

通过 PagedAttention，显存浪费率被戏剧性地压缩到了 **4% 以下**，单张 GPU 的并发承载吞吐量直接提升了 2~4 倍。

---

## 算法突围：推测采样（Speculative Decoding）

显存分页解决了「多用户并发时的吞吐量」问题，但在面对「单个用户的逐字等待延迟」时，自回归的显存带宽墙依然存在。

为了打破「每次搬运 140GB 权重却只算 1 个词」的物理僵局，[Leviathan 等人（2022）](https://arxiv.org/abs/2211.17192) 与 [Chen 等人（2023）](https://arxiv.org/abs/2302.01318) 提出了 **推测采样（Speculative Decoding）** 机制。

<figure>
  <img src="/figures/inference-speed/speculative-decoding.svg" alt="推测采样起草与核验流水线" />
  <figcaption>推测采样（Speculative Decoding）起草与核验流水线</figcaption>
</figure>

### 1. 起草与验证的闭环逻辑
我们可以把推测采样形象地比作 **「资深总编与快手实习生」** 的协同写作：
- **起草模型（Draft Model，如 1B 小模型 / 实习生）**：手脚极其麻利，显存读取开销微乎其微。当用户提问时，它一口气快速往后草拟了 4 个候选词（如 `“人工智能”“将”“深刻”“改变”`）；
- **目标模型（Target Model，如 70B 大模型 / 资深总编）**：总编平时打字慢（显存带宽瓶颈），但审稿极快。总编把实习生写的 4 个词一把抓过来，**在单次前向传播（Forward Pass）中同时核验这 4 个词的概率**。
- 如果总编审阅发现前 3 个词写得极好，直接盖章通过；第 4 个词不够精准，总编随手修改并打回。

**结果**：总编只需要抬一次头（单次显存读取），就直接连续产出了 3~4 个高质量 Token！由于小模型快速起草几乎不耗显存带宽，这使得大模型的单用户吐字速度直接提升了 **2~3 倍**。

### 2. 严格无损的拒绝采样数学证明
小模型预测的词难免会出错。如何保证加速后的输出不会退化为「小模型的低智商水平」？

推测采样设计了一套巧妙的 **修正拒绝采样（Modified Rejection Sampling）** 算法。对于小模型在第 $i$ 步起草的候选 Token $\hat{x}$：
- 目标大模型预测该词的真实概率为 $P(\hat{x})$；
- 起草小模型预测该词的概率为 $Q(\hat{x})$；

系统按以下判定规则决定是否接受该词：

$$P_{\text{accept}}(\hat{x}) = \min\left(1, \frac{P(\hat{x})}{Q(\hat{x})}\right)$$

> **💡 公式大白话**：
> - 如果大模型给这个词的概率 $P$ 比小模型的 $Q$ 还要高（$P/Q \ge 1$），说明大模型完全认可这个草稿，**100% 毫无保留直接采纳**；
> - 如果大模型觉得小模型有点瞎猜（$P < Q$），就按比例概率性接受；一旦拒绝，立即丢弃该词及后续所有草稿，并从**残差分布**中重新抽取一个由大模型校准的正确词。

数学上已严格证明：**经过修正拒绝采样后的最终输出概率分布，与直接让 70B 大模型一个字一个字慢吞吞计算出来的概率分布在数学上绝对完全一致（Zero-Loss，零精度损失）**。

$$P_{\text{resample}}(x) = \frac{\max(0, P(x) - Q(x))}{\sum_y \max(0, P(y) - Q(y))}$$

**数学定理保证**：经由该算法输出的 Token 序列分布，与直接让 70B 大模型从头到尾逐字生成的概率分布在数学上**绝对完全一致（Zero Quality Loss）**。

我们可以通过一段标准的 Python 代码，实现推测采样的拒绝采样算法内核：

```python
import numpy as np

def speculative_step(p_target: np.ndarray, q_draft: np.ndarray, draft_token_id: int):
    """
    推测采样单步判定：输入大模型目标分布 p、小模型起草分布 q 及草稿 Token ID
    返回：(是否接受 bool, 最终选定的 Token ID)
    """
    p_val = p_target[draft_token_id]
    q_val = q_draft[draft_token_id]
    
    # 1. 接受概率计算
    accept_prob = min(1.0, p_val / q_val)
    rand_val = np.random.rand()
    
    if rand_val < accept_prob:
        # 判定接受草稿
        return True, draft_token_id
    else:
        # 判定拒绝：计算残差分布并重新采样修正 Token
        residual = np.maximum(0.0, p_target - q_draft)
        residual_sum = np.sum(residual)
        
        if residual_sum > 0:
            norm_residual = residual / residual_sum
            corrected_token_id = np.random.choice(len(p_target), p=norm_residual)
        else:
            corrected_token_id = np.random.choice(len(p_target), p=p_target)
            
        return False, corrected_token_id
```

---

## 工业界两大维度的物理取舍：吞吐量 vs 延迟

在实际的大模型生产部署中，架构师必须清晰区分优化目标：

<figure>
  <img src="/figures/inference-speed/throughput-vs-latency.svg" alt="吞吐量与单流延迟优化对比" />
  <figcaption>吞吐量（Throughput）与单流延迟（Latency）优化维度对比</figcaption>
</figure>

### 1. 吞吐量指标（Throughput）
- **度量单位**：$\text{Tokens} / \text{s} / \text{GPU}$；
- **优化手段**：Continuous Batching + PagedAttention；
- **物理本质**：让单张 GPU 塞入尽可能多的并发请求（如同时处理 64 个用户），通过拉大 Batch Size 让矩阵乘法跑满 Tensor Core 算力。
- **代价**：当 GPU 被塞满时，每个单独用户的排队等待时间（TPOT）不仅不会变快，反而可能因为显存争抢而略微上升。

### 2. 单流延迟指标（Latency）
- **度量单位**：$\text{Time Per Output Token (TPOT)}$（如毫秒/字）；
- **优化手段**：推测采样（Speculative Decoding / Medusa / EAGLE）；
- **物理本质**：在低并发或单用户场景下，利用轻量模型起草与单次前向批量验证，打破自回归逐字读取权重的显存时间墙。
- **代价**：需要额外消耗小模型的显存空间，并在起草命中率较低时浪费部分验证算力。

---

## 现实认知误区剖析

### 误区一：小模型老是猜错，大模型会不会变笨？
**物理真相**：绝对不会。从前文的数学证明可知，拒绝采样机制就像一个严厉的导师：只要草稿有偏差，大模型会直接行使一票否决权并重新从大模型自身的分布中采样。推测采样**只改变出字速度，绝不改变大模型的智力水平与回答内容**。

### 误区二：推理加速技术能否解决大模型的「幻觉」？
**物理真相**：不能。PagedAttention 优化的是显存物理排布，推测采样优化的是矩阵计算并行度。它们让模型吐字的速度从 15 字/秒提升到了 45 字/秒，但如果大模型本身的概率分布中某个错误事实占主导，模型只会**以 3 倍的速度一本正经地胡说八道**。

---

## 读到这里该能分清

大模型逐字解码（Decode）是显存带宽受限（Memory-bound），每吐一个字都要完整搬运一次全量模型权重，导致计算核心长期空闲。

传统系统因连续显存预分配导致 60%~80% 碎片浪费；PagedAttention 借鉴操作系统虚拟内存分页，将浪费率压至 4% 以下并极大释放了并发吞吐。

推测采样利用轻量小模型快速起草多词，大模型单次前向并行验证，将显存搬运频率成倍压缩。

修正拒绝采样算法在数学上严格保证了推测采样的输出概率分布与大模型原生逐字生成完全等价，实现零精度损失的纯工程加速。

吞吐量（Throughput）是衡量集群每秒总产出，单流延迟（TPOT）是衡量单用户吐字速度；加速技术仅提升物理执行效率，无法消除概率拟合带来的事实性幻觉。

至此，我们已经完整拆解了大模型的物理底座与运行时加速机制。接下来，我们将正式深入大模型生成文字的核心概率引擎——《Next-Token 概率预测》。

## 参考文献

1. Kwon, W., Li, Z., Zhuang, S., et al. (2023). [*Efficient Memory Management for Large Language Model Serving with PagedAttention*](https://arxiv.org/abs/2309.06180). SOSP '23 / ACM.
2. Leviathan, Y., Kalman, M., & Matias, Y. (2023). [*Fast Inference from Transformers via Speculative Decoding*](https://arxiv.org/abs/2211.17192). ICML 2023 / arXiv:2211.17192.
3. Chen, C., Borgeaud, S., Irving, G., et al. (2023). [*Accelerating Large Language Model Decoding with Speculative Sampling*](https://arxiv.org/abs/2302.01318). DeepMind / arXiv:2302.01318.
4. Yu, G. I., Jeong, J. S., Kim, G. W., et al. (2022). [*Orca: A Distributed Serving System for Transformer-Based Generative Models*](https://www.usenix.org/conference/osdi22/presentation/yu). OSDI '22 / USENIX.
