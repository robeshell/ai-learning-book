---
title: "推理加速与推测采样"
description: "显存分页、推测采样与吞吐延迟权衡。"
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

在大模型完成输入处理进入“吐字”阶段后，开发者常会面临一个硬件瓶颈：**单用户的逐字解码速度相对缓慢，且增加 GPU 算力并不能线性提升单流出字速度**。

为什么拥有上万个计算核心的高性能 GPU 在自回归生成时难以跑满算力？现代推理框架是如何突破显存碎片与串行解码限制的？

本篇将从显存带宽开销与概率采样机制出发，解析大模型推理中的两大核心加速技术：**PagedAttention（显存虚拟分页）** 与 **Speculative Decoding（推测采样）**。

<figure>
  <img src="/figures/inference-speed/paged-attention.svg" alt="连续显存预分配与 PagedAttention 虚拟分页对比" />
  <figcaption>连续显存预分配与 PagedAttention 虚拟分页对比</figcaption>
</figure>

---

## 自回归解码的显存带宽瓶颈

大模型的推理分为预填充（Prefill）与解码（Decode）两个阶段。在解码阶段，模型按自回归方式逐字生成。

以一个 70B 参数的半精度（FP16 / BF16）模型为例，其权重占用约为：

$$\text{权重显存} = 70 \times 10^9 \times 2 \text{ Bytes} \approx 140 \text{ GB}$$

在自回归解码中，**模型每生成 1 个新的 Token，都需要将整整 140 GB 的权重参数从 GPU 显存（HBM）读取到片上计算核心一次**。

假设显存理论带宽为 $2 \text{ TB/s}$（$2000 \text{ GB/s}$），单次读取权重的物理极限耗时为：

$$\text{单 Token 读取耗时} = \frac{140 \text{ GB}}{2000 \text{ GB/s}} = 0.07 \text{ 秒} = 70 \text{ ms}$$

在单并发下，该硬件每秒理论上最多生成约 $1 \div 0.07 \approx 14 \text{ 个 Token}$。

**此时 GPU 计算核心绝大部分时间都在等待显存搬运数据，算力利用率通常较低**。这就是所谓的 **显存带宽受限（Memory-bandwidth bound）**。

---

## 显存分页管理：PagedAttention

在提升推理吞吐量时，早期系统常面临显存碎片化的问题：

### 1. 传统连续预分配的显存浪费
传统框架要求 KV Cache 在显存中物理连续存储。系统接收到请求时，必须提前按最大长度（如 4096 Tokens）预先分配一大块连续空间：
- **内部碎片**：用户若在 200 个字后结束对话，剩余预留的显存空间将被闲置；
- **外部碎片**：请求动态释放后留下大量不连续的显存空隙，无法承接新的长请求；
- **实测结果**：在真实集群中，**大量 GPU 显存处于被预定但未实际使用的状态**，制约了单卡能够承载的并发请求数。

### 2. 虚拟内存分页机制
PagedAttention 借鉴了操作系统的虚拟内存管理思想：
1. **固定块切分**：将每个请求动态增长的 KV Cache 切分为固定大小的逻辑块（如每块容纳 16 个 Token）；
2. **块表映射（Block Table）**：维护页表，将逻辑上连续的 Token 块映射到 GPU 显存中任意非连续的物理块；
3. **按需分配**：每生成 16 个 Token 才动态申请新的物理块，避免预分配浪费；
4. **共享机制**：多分支采样与公共前缀可直接共享底层物理块（写时复制）。

通过显存分页，显存浪费率大幅降低，单卡的并发承载吞吐量提升了 2~4 倍。

---

## 推测采样机制：Speculative Decoding

显存分页提高了集群并发时的吞吐量，但对于单用户的逐字吐字延迟，显存带宽墙依然存在。

为了改善单流出字速度，业界提出了 **推测采样（Speculative Decoding）** 机制。

<figure>
  <img src="/figures/inference-speed/speculative-decoding.svg" alt="推测采样起草与核验流水线" />
  <figcaption>推测采样（Speculative Decoding）起草与核验流水线</figcaption>
</figure>

### 1. 起草与验证的工作机制
- **起草模型（Draft Model，如 1B~3B 小模型）**：参数量小、显存搬运开销低，可以快速连续生成 $K$ 个候选词（如 4 个词）；
- **目标模型（Target Model，如 70B 主模型）**：将起草模型生成的 4 个候选词打包，**在单次前向传播中同时并行验证这 4 个词的概率分布**；
- 目标模型根据概率判定接受前若干个词；若某个词未被接受，则由大模型校准输出并终止本轮起草。

**效果**：目标大模型单次前向读取权重，即可确认产出多个高质量 Token，从而显著提升单流吐字速度。

### 2. 修正拒绝采样算法
为了确保输出质量不退化为小模型水平，推测采样采用了 **修正拒绝采样（Modified Rejection Sampling）** 算法。

设起草模型在某位置生成候选 Token $\hat{x}$，起草概率为 $Q(\hat{x})$，目标大模型给出的真实概率为 $P(\hat{x})$：
- 接受概率定义为：

$$P_{\text{accept}}(\hat{x}) = \min\left(1, \frac{P(\hat{x})}{Q(\hat{x})}\right)$$

- 若 $P(\hat{x}) \ge Q(\hat{x})$，大模型完全认可该词，接受概率为 $1.0$；
- 若 $P(\hat{x}) < Q(\hat{x})$，按比例概率性接受；若判定拒绝，则从如下残差分布中重新采样校准词：

$$P_{\text{resample}}(x) = \frac{\max(0, P(x) - Q(x))}{\sum_y \max(0, P(y) - Q(y))}$$

**数学保证**：经由该算法生成的 Token 序列分布，与直接让目标大模型逐字生成的真实概率分布在数学上完全等价，属于**无损加速**。

---

## 吞吐量与单流延迟的权衡

在实际服务部署中，通常需要区分两种优化目标：

<figure>
  <img src="/figures/inference-speed/throughput-vs-latency.svg" alt="吞吐量与单流延迟优化对比" />
  <figcaption>吞吐量（Throughput）与单流延迟（Latency）优化维度对比</figcaption>
</figure>

### 1. 吞吐量指标（Throughput）
- **度量单位**：$\text{Tokens} / \text{s} / \text{GPU}$；
- **优化手段**：Continuous Batching + PagedAttention；
- **核心逻辑**：单张 GPU 并发处理多个请求（如同时处理 64 路并发），通过加大 Batch Size 让矩阵乘法充分利用计算核心。

### 2. 单流延迟指标（Latency）
- **度量单位**：$\text{Time Per Output Token (TPOT)}$（毫秒/Token）；
- **优化手段**：推测采样（Speculative Decoding / EAGLE / Medusa）；
- **核心逻辑**：在低并发或单流交互场景下，利用小模型起草与大模型批量验证，降低显存权重的搬运频次。

---

## 常见认知误区

### 1. 小模型猜错是否会导致大模型回答质量下降？
不会。拒绝采样算法确保了只要草稿存在偏差，大模型会直接行使否决并从自身分布中重新采样。推测采样只改变出字速度，输出概率分布与大模型原生推理严格一致。

### 2. 推理加速是否能减少模型幻觉？
不能。PagedAttention 优化的是显存物理排布，推测采样优化的是计算并行度。如果模型本身的先验分布中包含了事实性错误，加速技术只会让错误回答更快地输出。

---

## 最小代码实现

以下代码演示了推测采样中的单步拒绝采样与残差分布重采样逻辑：

```python
import numpy as np

def speculative_step(p_target: np.ndarray, q_draft: np.ndarray, draft_token: int, seed: int = 42):
    """
    推测采样单步验证:
    p_target: 目标大模型的输出概率分布
    q_draft:  起草小模型的输出概率分布
    draft_token: 小模型起草的候选 Token
    """
    np.random.seed(seed)
    p_val = p_target[draft_token]
    q_val = q_draft[draft_token]
    
    # 1. 接受概率: min(1, P/Q)
    accept_prob = min(1.0, p_val / q_val)
    rand_val = np.random.rand()
    
    if rand_val < accept_prob:
        return True, draft_token, accept_prob
    else:
        # 2. 拒绝后从残差分布中重采样: max(0, P - Q)
        residual = np.maximum(0.0, p_target - q_draft)
        residual_sum = np.sum(residual)
        if residual_sum > 0:
            norm_residual = residual / residual_sum
            corrected_token = np.random.choice(len(p_target), p=norm_residual)
        else:
            corrected_token = np.random.choice(len(p_target), p=p_target)
        return False, corrected_token, accept_prob

def speculative_demo():
    # 模拟词表大小为 5
    # 大模型真实分布 (偏好 Token 2)
    p = np.array([0.05, 0.10, 0.70, 0.10, 0.05])
    # 小模型起草分布 (偏好 Token 1)
    q = np.array([0.10, 0.50, 0.25, 0.10, 0.05])
    
    # 测试 1: 小模型起草了 Token 2 (大模型概率高)
    accepted, token, prob = speculative_step(p, q, draft_token=2, seed=42)
    print(f"案例 1: 小模型起草 Token 2 -> 接受概率 {prob:.2f}, 判定: {accepted}, 最终输出: Token {token}")
    
    # 测试 2: 小模型起草了 Token 1 (大模型概率低)
    accepted, token, prob = speculative_step(p, q, draft_token=1, seed=42)
    print(f"案例 2: 小模型起草 Token 1 -> 接受概率 {prob:.2f}, 判定: {accepted}, 最终输出: Token {token}")

speculative_demo()
```

**控制台输出：**
```text
案例 1: 小模型起草 Token 2 -> 接受概率 1.00, 判定: True, 最终输出: Token 2
案例 2: 小模型起草 Token 1 -> 接受概率 0.20, 判定: False, 最终输出: Token 2
```

---

## 核心概念辨析

- **算力受限（Compute-bound）vs 显存受限（Memory-bound）**：
  - Prefill 阶段并行计算，受 GPU 矩阵乘法算力限制；
  - Decode 阶段自回归逐字生成，受显存带宽限制。
- **连续预分配 vs PagedAttention**：
  - 连续预分配造成大量内部与外部显存碎片；
  - PagedAttention 采用虚拟内存分页按需分配，显存利用率达 96% 以上。
- **推测采样 vs 质量损失**：
  - 推测采样通过小模型起草、大模型单次前向并行核验加速；
  - 修正拒绝采样在数学上保证最终输出分布与大模型完全一致。

理解了底层的计算与加速机制后，模型每一步究竟是如何计算并挑选下一个词的？下一篇我们将探讨——《Next-Token 概率预测》。

---

## 参考文献

1. Kwon, W., Li, Z., Zhuang, S., et al. (2023). [*Efficient Memory Management for Large Language Model Serving with PagedAttention*](https://arxiv.org/abs/2309.06180). SOSP '23 / ACM.
2. Leviathan, Y., Kalman, M., & Matias, Y. (2023). [*Fast Inference from Transformers via Speculative Decoding*](https://arxiv.org/abs/2211.17192). ICML 2023 / arXiv:2211.17192.
3. Chen, C., Borgeaud, S., Irving, G., et al. (2023). [*Accelerating Large Language Model Decoding with Speculative Sampling*](https://arxiv.org/abs/2302.01318). DeepMind / arXiv:2302.01318.
4. Yu, G. I., Jeong, J. S., Kim, G. W., et al. (2022). [*Orca: A Distributed Serving System for Transformer-Based Generative Models*](https://www.usenix.org/conference/osdi22/presentation/yu). OSDI '22 / USENIX.
