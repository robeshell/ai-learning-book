---
title: "端侧模型与本地离线计算"
description: "端侧模型量化、NPU 离线计算与隐私算力折中。"
series: multimodal-and-limits
chapter: edge
order: 3
type: concept
articleStatus: draft
prerequisites:
  - "distillation-quantization"
videoSource: on-device-ai
---

# 端侧模型与本地离线计算

在大多数人的认知中，大语言模型是必须运行在装满英伟达 H100 显卡、轰鸣作响的恒温数据中心里的庞然大物。

然而，随着终端算力芯片的爆发和轻量化算法的突破，一类全新的模型正在迅速占领我们的手机、笔记本电脑与智能座舱——**端侧小语言模型（On-Device SLM / Edge AI）**。

为什么我们一定要把大模型搬到端侧硬件上？在严苛的手机功耗和内存限制下，小模型是如何做到离线毫秒级推理的？端侧与云端又该如何分工？

这就是大模型走向万物互联的必由之路——**端侧模型与本地离线计算**。

<figure>
  <img src="/figures/on-device-ai/edge-vs-cloud-hardware.svg" alt="云端数据中心 vs 移动端侧硬件物理约束对比" />
  <figcaption>云端数据中心与端侧硬件物理约束对比</figcaption>
</figure>

---

## 端侧推理的动机与优势

尽管云端千亿大模型（如 GPT-4、Claude 3.5、DeepSeek-V3）能力极其强大，但在实际落地中面临三道客观考量：

1. **数据隐私（Privacy）**：
   - 用户的相册人脸、个人微信聊天记录、未公开发布的财务报表与健康医疗数据，企业和个人强烈拒绝上传至第三方云端服务器；
   - 本地端侧推理保证数据 **100% 留在芯片本地**，不通过任何网络外传。
2. **零网络依赖与即时响应（Zero Latency & Offline）**：
   - 在地下车库、高铁隧道或高空飞机等弱网/断网环境中，云端 API 彻底瘫痪；
   - 端侧模型完全在本地内存与 NPU 中运行，不受任何网络波动影响，首字延迟几乎为零。
3. **零云端 API 调用成本（Zero Cost）**：
   - 手机厂商如果让数亿用户每天的系统级高频交互（如全局搜索、输入法补全、语音转写）全部调用云端 API，将产生不可承受的天价算力账单；
   - 利用端侧闲置的 NPU 算力，边际推理成本为零。

---

## 内存带宽墙与量化压缩

要在一部功耗受限在几瓦的手机上运行模型，必须直面两大物理现实：

### 1. 统一内存容量与带宽墙
- **显存与内存共享**：手机的 8GB ~ 12GB LPDDR5X 内存由操作系统、后台 App 和 GPU 共同瓜分，留给 AI 模型的运行空间通常不足 **2GB ~ 4GB**；
- **内存带宽极其狭窄**：手机 LPDDR5X 的内存带宽仅为 **$50 \sim 85\text{ GB/s}$**，而数据中心 H100 显存带宽高达 **$3350\text{ GB/s}$**。由于自回归生成受限于 Memory Bandwidth，未经优化的模型在端侧会较为缓慢。

### 2. 破局关键：4-bit 权重量化与现代端侧 SLM
通过 **INT4 量化（如 AWQ, Lin et al., 2023; GGUF / llama.cpp, Gerganov, 2023）**，模型权重的体积公式为：

$$\text{RAM 占用} \approx \text{参数量（Billion）} \times \frac{\text{量化位宽（Bit）}}{8} \times 1.25\text{（含 KV Cache 与运行时开销）}$$

| 模型规格 | FP16 原始显存 | INT4 量化后显存 | 端侧手机适用性 |
| :--- | :--- | :--- | :--- |
| **1B 参数（Llama-3.2-1B）** | 2.0 GB | **~ 0.7 GB** | 完美常驻后台，秒开响应 |
| **3B 参数（Phi-3-Mini / Qwen2.5-3B）** | 6.0 GB | **~ 2.0 GB** | 旗舰手机与主流 PC 黄金平衡点 |
| **7B/8B 参数（Llama-3.1-8B）** | 16.0 GB | **~ 4.8 GB** | 需 16GB 大内存设备，发热较高 |

配合移动芯片专用的 **NPU（神经网络处理单元，如苹果 ANE、高通 Hexagon）**，可将 4-bit 矩阵乘法直接硬编码加速，实现每秒 25 ~ 40 Token 的流畅吐字。

---

## 端云协同架构与分工

端侧小模型（SLM）虽然小巧，但其参数容量决定了其思维链深度和常识储备无法匹敌云端数百亿乃至万亿模型。

因此，工业界的常见方案是**端云协同架构（Hybrid AI Architecture）**：

<figure>
  <img src="/figures/on-device-ai/hybrid-cloud-edge-architecture.svg" alt="云端与端侧协同（Hybrid AI）架构协同模式" />
  <figcaption>云端与端侧协同架构协同模式</figcaption>
</figure>

- **端侧模型负责「守门与高频」**：
  - 监听传感器、本地私密照片 OCR、个人备忘录检索与高频意图分类；
  - 如果用户仅需「设个 7 点闹钟」或「总结刚拍的收据」，端侧直接秒级完成；
- **端侧脱敏与路由（Local Privacy Sanitization）**：
  - 当检测到复杂任务（如「撰写 5000 字跨领域行业调研方案」），端侧模型在本地抹去人名、卡号等敏感隐私数据；
  - 随后将脱敏后的纯逻辑问题路由至云端大模型，取回高质量深度推理结果。

---

## 最小代码实现

下面的代码演示了如何根据端侧硬件的物理参数（LPDDR5X 带宽、参数量、量化精度），精确计算模型在端侧运行时的**内存占用**与**理论最大生成速度（Tokens/s）**：

```python
def calculate_edge_ai_performance(param_billion: float, quant_bits: int, memory_bandwidth_gbps: float) -> dict:
    """
    计算端侧模型在指定内存带宽下的吞吐物理上限
    param_billion: 模型参数量 (十亿)
    quant_bits: 量化位宽 (4, 8, 16)
    memory_bandwidth_gbps: 硬件内存带宽 (GB/s)
    """
    # 1. 权重体积计算 (Bytes)
    bytes_per_param = quant_bits / 8.0
    weight_size_gb = param_billion * bytes_per_param
    
    # 加上约 20% 的运行时与 KV Cache 开销
    total_ram_gb = weight_size_gb * 1.2
    
    # 2. 自回归生成阶段的内存带宽理论极限:
    # 每一个新 Token 的生成都需要将全部模型权重从 RAM 完整读取一遍
    max_tokens_per_sec = memory_bandwidth_gbps / weight_size_gb
    
    return {
        "params": f"{param_billion}B",
        "quant": f"INT{quant_bits}" if quant_bits < 16 else "FP16",
        "ram_required_gb": round(total_ram_gb, 2),
        "max_tps": round(max_tokens_per_sec, 1)
    }

# 设定典型手机硬件规格: LPDDR5X 统一内存带宽 64 GB/s
mobile_bandwidth = 64.0

print(f"端侧硬件规格: 移动统一内存带宽 = {mobile_bandwidth} GB/s\n" + "="*50)

# 场景 1: 未量化的 7B 模型 (FP16)
res_fp16 = calculate_edge_ai_performance(7.0, 16, mobile_bandwidth)
ram_1 = res_fp16["ram_required_gb"]
tps_1 = res_fp16["max_tps"]
print(f"场景 1 [7B FP16 原生]: 需内存 {ram_1} GB | 极限速度: {tps_1} tps")

# 场景 2: INT4 量化后的 7B 模型
res_7b_int4 = calculate_edge_ai_performance(7.0, 4, mobile_bandwidth)
ram_2 = res_7b_int4["ram_required_gb"]
tps_2 = res_7b_int4["max_tps"]
print(f"场景 2 [7B INT4 量化]: 需内存 {ram_2} GB | 极限速度: {tps_2} tps")

# 场景 3: 黄金规格 3B 现代端侧 SLM (INT4 量化)
res_3b_int4 = calculate_edge_ai_performance(3.0, 4, mobile_bandwidth)
ram_3 = res_3b_int4["ram_required_gb"]
tps_3 = res_3b_int4["max_tps"]
print(f"场景 3 [3B INT4 黄金端侧]: 需内存 {ram_3} GB | 极限速度: {tps_3} tps")
```

**控制台输出：**
```text
端侧硬件规格: 移动统一内存带宽 = 64.0 GB/s
==================================================
场景 1 [7B FP16 原生]: 需内存 16.8 GB | 极限速度: 4.6 tps
场景 2 [7B INT4 量化]: 需内存 4.2 GB | 极限速度: 18.3 tps
场景 3 [3B INT4 黄金端侧]: 需内存 1.8 GB | 极限速度: 42.7 tps
```

---

## 核心概念辨析

- **云端大模型 vs 端侧小模型**：
  - 云端大模型重在全域知识与深度逻辑推理；
  - 端侧小模型重在极致隐私、零网络延迟与零调用成本。
- **内存容量 vs 内存带宽**：
  - 内存容量决定模型能不能塞进手机运行；
  - 内存带宽决定模型生成文字的吐字速度（Tokens/s）。
- **完全离线 vs 端云协同**：
  - 追求极致安全时选择 100% 本地离线；
  - 工业级通用产品普遍采用端云协同（端侧前置脱敏路由 + 云端深度攻坚）。

当模型被不断拉长上下文，宣称拥有 100 万甚至 1000 万 Token 窗口时，模型的注意力真的能在长距离下始终保持敏锐吗？下一篇我们将探讨——《长文本退化与注意力衰减》。

---

## 参考文献

1. Lin, Ji, Tang, Jiaming, Tang, Haotian, et al. (2023). [*AWQ: Activation-aware Weight Quantization for LLM Compression and Acceleration*](https://arxiv.org/abs/2306.00978). MLSys 2024 / arXiv:2306.00978.
2. Abdin, Marah, Jacobs, Sam Ade, Awan, Ammar Ahmad, et al. (2024). [*Phi-3 Technical Report: A Highly Capable Language Model Locally on Your Phone*](https://arxiv.org/abs/2404.14219). Microsoft Research / arXiv:2404.14219.
3. Dubey, Abhimanyu, Jauhri, Abhinav, Pandey, Rajan, et al. (2024). [*The Llama 3 Herd of Models (Llama 3.2 1B & 3B on-device)*](https://arxiv.org/abs/2407.21783). Meta AI / arXiv:2407.21783.
4. Gerganov, Georgi. (2023). [*llama.cpp: Port of Facebook's LLaMA model in C/C++ with 4-bit quantization*](https://github.com/ggerganov/llama.cpp). GitHub Open Source.
