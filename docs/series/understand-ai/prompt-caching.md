---
title: "Prompt Caching 前缀缓存"
description: "KV Cache 和前缀缓存如何降低首字延迟和重复计算成本。"
series: understand-ai
chapter: runtime
order: 5
type: concept
articleStatus: draft
prerequisites:
  - "context-window"
videoSource: prompt-caching
---

# Prompt Caching 前缀缓存

在前两篇中，我们解析了 Token 的度量方式以及上下文窗口的有限性。在真实的大模型应用（如智能客服、代码审计 Agent 或知识库问答）中，开发者很快会遭遇一个极其痛苦的工程瓶颈：**多轮对话越往后聊，首字吐出延迟（TTFT）越来越长，API 账单金额呈几何级数飙升**。

在上一篇我们提到，大模型本身是无状态的，多轮对话依靠应用层把历史记录完整重传。如果一段 10,000 字的系统设定与参考文档在 10 轮对话中被反复发送 10 次，GPU 真的需要将这 10,000 字从头到尾重新计算 10 遍吗？

我们可以把这个过程比作大厨炒菜：
- **没有缓存时**：每来一个新顾客点番茄炒蛋，大厨都要从头洗番茄、切葱花、打鸡蛋，每一个步骤都无法省略，出餐极慢；
- **有了前缀缓存（Prompt Caching）**：大厨在开店时就把大批葱花切好、把底料熬好放入保鲜盒（保存在显存中）。新订单一来，直接把现成底料倒进锅里，只需炒最后加入的新食材，**首道菜出锅时间（TTFT）瞬间缩短 90%**。

解决这一巨大算力浪费的工业级核心技术，正是 **Prompt Caching（前缀缓存）**。

<figure>
  <img src="/figures/prompt-caching/overview.svg" alt="全量重算与前缀缓存对比" />
  <figcaption>全量重算与前缀缓存（Prompt Caching）机制对比</figcaption>
</figure>

---

## 算力浪费的根源：Prefill 阶段的重复计算

要理解前缀缓存，首先要拆解大模型在 GPU 上执行前向推理的两个截然不同的物理阶段：

1. **预填充阶段（Prefill Phase）**：
   - 模型一次性吞入用户给出的全部输入 Token（如 8,000 字的 Prompt）；
   - 在多层 Transformer 中，所有 Token 并行进行两两点积与矩阵乘法，计算出自注意力并生成第一批预测分布；
   - **物理瓶颈**：**算力受限（Compute-bound）**。计算复杂度为 $O(N^2)$，当输入长度 $N$ 达到数万时，GPU 的 Tensor Core 会被高强度的矩阵乘法完全吃满，导致首字吐出延迟（Time to First Token, TTFT）长达数秒甚至十几秒。
2. **解码阶段（Decode Phase）**：
   - 模型从第 1 个生成的 Token 开始，以自回归方式逐字往后预测；
   - **物理瓶颈**：**显存带宽受限（Memory-bandwidth bound）**。每生成 1 个 Token，都需要将数十 GB 的模型权重与 KV Cache 从显存重新读取一遍。

在传统的多轮对话中，每一轮用户发来一条新消息，系统就会将「系统底仓 + 所有历史轮次 + 新消息」打包成一个全新的超长序列。

这意味着，**前面几万字的系统设定与历史背景，在每一轮推理的 Prefill 阶段都要在 GPU 上重新做一次 $O(N^2)$ 的自注意力打分**。这种重复计算不仅无端消耗了庞大的数据中心电力，而且让用户的等待时间随着对话轮次线性拉长。

---

## 物理原理：因果注意力的「前缀不变性」

为什么已经算过的前缀可以直接复用？这源于 Transformer 解码器采用的 **因果掩码（Causal Masking）机制**。

在因果自注意力中，任何一个位置 $t$ 的 Token，在计算其查询（Query）、键（Key）和值（Value）向量时，只能看到它前面的 Token（$1 \le i \le t$），绝对看不到它后面的内容：

$$K_t = x_t W_K, \quad V_t = x_t W_V$$

$$\text{Attention}(Q_t, K_{1:t}, V_{1:t}) = \text{Softmax}\left(\frac{Q_t K_{1:t}^T}{\sqrt{d_k}}\right) V_{1:t}$$

这带来了一个极其关键的数学推论：**只要输入序列的前 $M$ 个 Token 保持一字不差，无论后面新追加了什么内容，前 $M$ 个 Token 在每一层计算出的 Key 和 Value 矩阵是绝对恒定不变的。**

因此，服务框架完全可以在第一轮计算完成后，把这批前缀 Token 对应的 KV Cache 物理保留在 GPU 高速显存（HBM）或主机内存中。当下一轮请求到来时：
1. 计算新请求与已缓存序列的最长公共前缀（Longest Common Prefix）；
2. **直接命中显存中现成的 KV Cache 矩阵，前 $M$ 个 Token 的计算量降为 0 FLOPs**；
3. GPU 仅需从第 $M+1$ 个 Token 开始执行轻量的增量 Prefill。

---

## 架构演进：前缀树（Radix Tree）索引管理

在现代高性能推理引擎（如 SGLang、vLLM）中，显存里的 KV Cache 并不是简单地以平铺数组存放的，而是由 **前缀树（Radix Tree / Trie）** 统一调度管理的。

<figure>
  <img src="/figures/prompt-caching/radix-tree.svg" alt="基于前缀树的多会话显存共享" />
  <figcaption>基于前缀树（Radix Tree）的多会话显存共享机制</figcaption>
</figure>

如上图所示，当多个并发用户访问同一个智能体应用时：
- **公共根节点**（如 2k Token 的 System Prompt 与 1.5k Token 的 Tools Schema）只需要在 GPU 显存中分配一次物理空间并计算一次；
- 所有下游会话无论是进行文档阅读还是代码审计，都可以直接挂载在公共根节点之下，共享祖先节点的 KV 缓存；
- 当显存空间紧张时，推理引擎会根据 **LRU（最近最少使用）算法** 优先剔除叶子节点的会话分支，尽可能保护根节点的公共底仓常驻显存。

我们可以通过一段轻量级的 Python 代码，模拟这种基于前缀树与 Token 序列匹配的 KV Cache 缓存命中机制：

```python
from typing import Dict, List, Optional, Tuple

class PrefixCacheNode:
    def __init__(self, token_id: int):
        self.token_id = token_id
        self.children: Dict[int, 'PrefixCacheNode'] = {}
        self.kv_tensor_id: Optional[str] = None  # 指向 GPU 显存中的物理 KV Cache 块

class RadixPrefixCache:
    def __init__(self):
        self.root = PrefixCacheNode(token_id=-1)
        self.cached_tokens_count = 0

    def match_prefix(self, tokens: List[int]) -> Tuple[int, List[str]]:
        """在树中查找与输入 Token 序列的最长公共前缀，返回命中的 Token 数与 KV 缓存句柄"""
        curr = self.root
        matched_tokens = 0
        kv_handles = []

        for token in tokens:
            if token in curr.children:
                curr = curr.children[token]
                matched_tokens += 1
                if curr.kv_tensor_id:
                    kv_handles.append(curr.kv_tensor_id)
            else:
                break
        return matched_tokens, kv_handles

    def insert_sequence(self, tokens: List[int], start_idx: int = 0) -> None:
        """为增量计算的 Token 序列建立索引并绑定显存句柄"""
        curr = self.root
        # 先下潜到已命中的最深节点
        for i in range(start_idx):
            curr = curr.children[tokens[i]]

        # 插入后续新计算的 Token 节点
        for i in range(start_idx, len(tokens)):
            t = tokens[i]
            if t not in curr.children:
                new_node = PrefixCacheNode(token_id=t)
                new_node.kv_tensor_id = f"gpu_kv_block_{t}_{i}"
                curr.children[t] = new_node
                self.cached_tokens_count += 1
            curr = curr.children[t]
```

---

## 现实影响：首字时延与商业计费模型

前缀缓存技术不仅是一次底层工程优化，它直接重塑了大模型云服务的定价结构与应用交互体验：

<figure>
  <img src="/figures/prompt-caching/cost-and-ttft.svg" alt="前缀缓存对延迟与计费的影响" />
  <figcaption>前缀缓存对首字延迟（TTFT）与阶梯计费的影响</figcaption>
</figure>

### 1. 首字延迟（TTFT）大幅下降
在长文本场景（如一次性分析 50 页 PDF 或长代码库）中，输入 Token 往往高达 32k~64k。在无缓存时，用户发送每一句话都需要忍受 2~5 秒的 GPU Prefill 计算等待；命中前缀缓存后，GPU 直接跳入 Decode 阶段，首字吐出时间（TTFT）被压缩至 **100~200 毫秒以内**，带来丝滑的交互体验。

### 2. 云厂商的阶梯定价逻辑
从 2024 年起，Anthropic、OpenAI、Google 等主流大模型 API 均推出了前缀缓存定价体系：
- **标准输入 Token（未命中）**：按 100% 全价计费（如 \$3.00 / 1M Token）；
- **缓存写入（Cache Write）**：首次写入由于需要占用集群显存维持 5 分钟（TTL），收取微小的溢价（如 125%）；
- **缓存命中读取（Cache Read）**：后续请求只要命中前缀，**价格直接享受 50%~90% 的断崖式折扣**（如降至 \$0.30 / 1M Token）。

云厂商之所以愿意给出高达 90% 的折扣，是因为前缀命中帮其数据中心省下了极其昂贵的 GPU Prefill 矩阵算力。

---

## 工程实践中的踩坑现象与最佳布局

在实际接入 Prompt Caching 时，开发者经常会遇到各种匪夷所思的「缓存失效」现象：

### 现象一：为什么在提示词开头加了一个动态时间戳，缓存命中率直接暴跌为 0%？
**物理原因**：前缀树匹配是**严格按 Token 序列从第一个词开始逐字前缀比对**的。如果在 System Prompt 最开头插入了 `当前时间：2026-08-19 14:32:05`，那么由于每秒钟时间戳都在改变，整个请求的第 1 个 Token 就与缓存树失配，导致后面原本相同的几万字背景文档全部无法命中缓存，被迫全量重算。

### 现象二：多轮对话中的缓存生命周期（TTL）
云端显存是极度稀缺的资源。主流厂商通常为前缀缓存设定了 **5 分钟左右的生存时间（TTL）**：
- 如果在 5 分钟内该会话有新请求进来并命中前缀，TTL 会被自动刷新重置；
- 如果用户思考超过 5 分钟才发送下一条消息，该显存块可能已经被 LRU 机制物理释放，下一次请求将重新触发全量 Prefill 写入。

### 最佳 Prompt 布局原则
为了最大化榨取前缀缓存的性能与成本红利，开发者应当严格按照 **「从静态到动态」** 的顺序排布输入文本：

$$\text{Prompt 结构} = \underbrace{\text{全局角色定义}}_{\text{永久静态}} \longrightarrow \underbrace{\text{工具 JSON Schema}}_{\text{稳定静态}} \longrightarrow \underbrace{\text{外挂参考文档}}_{\text{单会话静态}} \longrightarrow \underbrace{\text{多轮对话历史}}_{\text{等差追加}} \longrightarrow \underbrace{\text{当前用户问题}}_{\text{动态新增}}$$

---

## 读到这里该能分清

大模型推理分为算力受限的预填充（Prefill）阶段与显存带宽受限的解码（Decode）阶段。长文本的首字延迟主要被 Prefill 矩阵乘法拖慢。

因果自注意力的因果掩码保证了前缀不变性：只要前序 Token 相同，其 Key-Value 激活值矩阵在数学上恒定不变。

前缀缓存（Prompt Caching）通过复用显存中已有的 KV Cache，将重复前缀的计算量降为 0 FLOPs，大幅降低首字延迟（TTFT）。

推理引擎利用前缀树（Radix Tree）在多并发与多会话间共享公共根节点的显存，显存不足时按 LRU 策略淘汰分支。

前缀匹配是严格精确的前序对齐。动态时间戳、随机变量必须放在 Prompt 最末尾，否则会导致整个下游缓存链式失效。

前缀缓存解决了输入前缀的重复计算问题，但在模型吐字阶段（Decode），逐字生成的串行依赖仍然限制了吞吐速度。下一篇，我们将解析如何打破自回归串行枷锁——《推理加速与推测采样》。

## 参考文献

1. Zheng, L., Yin, L., Xie, Z., et al. (2023). [*Efficiently Programming Large Language Models with SGLang*](https://arxiv.org/abs/2312.07104). arXiv:2312.07104.
2. Kwon, W., Li, Z., Zhuang, S., et al. (2023). [*Efficient Memory Management for Large Language Model Serving with PagedAttention*](https://arxiv.org/abs/2309.06180). SOSP '23 / ACM.
3. Anthropic. (2024). [*Prompt Caching: Accelerate API workflows and reduce costs*](https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching).
4. OpenAI. (2024). [*Prompt Caching in the OpenAI API*](https://platform.openai.com/docs/guides/prompt-caching).
