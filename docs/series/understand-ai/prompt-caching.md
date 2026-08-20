---
title: "Prompt Caching 前缀缓存"
description: "因果不变性、前缀树索引与首字延迟优化。"
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

在真实的大模型应用（如智能客服、代码审计 Agent 或知识库问答）中，开发者经常会遇到一个工程瓶颈：**多轮对话越深入，首字吐出延迟（TTFT）越长，API 计费也呈等差级数快速上升**。

大模型本身是无状态的，多轮对话依靠应用层把历史记录完整重传。如果一段 10,000 字的系统设定与参考文档在 10 轮对话中被反复发送 10 次，GPU 每次都需要将这 10,000 字从头到尾重新计算一遍吗？

解决这一重复算力开销的核心技术，正是 **Prompt Caching（前缀缓存）**。

<figure>
  <img src="/figures/prompt-caching/overview.svg" alt="全量重算与前缀缓存对比" />
  <figcaption>全量重算与前缀缓存（Prompt Caching）机制对比</figcaption>
</figure>

---

## 算力浪费的根源：Prefill 阶段的重复计算

大模型在 GPU 上执行推理包含两个截然不同的物理阶段：

1. **预填充阶段（Prefill Phase）**：
   - 模型一次性读入输入的全部 Token（如 8,000 字的 Prompt）；
   - 在多层 Transformer 中，所有 Token 并行计算自注意力与矩阵乘法，生成第一批预测分布；
   - **计算瓶颈**：**算力受限（Compute-bound）**。计算复杂度为 $O(N^2)$，当输入长度 $N$ 达到数万时，GPU 计算核心会被高强度的矩阵乘法占满，导致首字吐出延迟（Time to First Token, TTFT）显著增加。
2. **解码阶段（Decode Phase）**：
   - 模型从第 1 个生成的 Token 开始，以自回归方式逐字往后预测；
   - **计算瓶颈**：**显存带宽受限（Memory-bandwidth bound）**。每生成 1 个 Token，都需要将模型权重与历史 KV Cache 从显存重新读取一遍。

在传统的多轮对话中，每一轮用户发来一条新消息，系统就会将“系统底仓 + 历史轮次 + 新消息”打包成一个新序列。

这意味着，**前面数万字的系统设定与历史背景，在每一轮推理的 Prefill 阶段都要在 GPU 上重新做一次自注意力计算**。

---

## 核心机制：因果注意力的前缀不变性

为什么已经计算过的前缀可以直接复用？这源于 Transformer 解码器采用的 **因果掩码（Causal Masking）机制**。

在因果自注意力中，任何位置 $t$ 的 Token，在计算其查询（Query）、键（Key）和值（Value）向量时，只能看到它前面的 Token（$1 \le i \le t$），无法看到后面的内容：

$$K_t = x_t \mathbf{W}_K, \quad V_t = x_t \mathbf{W}_V$$

$$\text{Attention}(Q_t, \mathbf{K}_{1:t}, \mathbf{V}_{1:t}) = \text{softmax}\left(\frac{Q_t \mathbf{K}_{1:t}^T}{\sqrt{d_k}}\right) \mathbf{V}_{1:t}$$

这带来了一个关键的数学特性：**只要输入序列的前 $M$ 个 Token 保持完全一致，无论后面追加了什么新内容，前 $M$ 个 Token 在每一层计算出的 Key 和 Value 矩阵在数学上恒定不变。**

因此，服务框架可以在第一轮计算完成后，把这批前缀 Token 对应的 KV Cache 保留在 GPU 显存（HBM）中。当后续请求到来时：
1. 计算新请求与已缓存序列的最长公共前缀（Longest Common Prefix）；
2. **直接命中显存中现成的 KV Cache 矩阵，前 $M$ 个 Token 的计算量降为 0 FLOPs**；
3. GPU 仅需从第 $M+1$ 个 Token 开始执行轻量的增量 Prefill。

---

## 显存共享与前缀树调度

在现代高性能推理引擎（如 SGLang、vLLM）中，显存里的 KV Cache 通常由 **前缀树（Radix Tree / Trie）** 进行统一索引与调度。

<figure>
  <img src="/figures/prompt-caching/radix-tree.svg" alt="基于前缀树的多会话显存共享" />
  <figcaption>基于前缀树（Radix Tree）的多会话显存共享机制</figcaption>
</figure>

当多个并发用户访问同一个应用时：
- **公共根节点**（如 System Prompt 与 Tool Schema）只需在显存中计算并分配一次物理空间；
- 多个下游会话直接挂载在公共根节点之下，共享祖先节点的 KV 缓存；
- 当显存空间不足时，引擎会根据 **LRU（最近最少使用）算法** 优先释放叶子节点的会话分支，尽可能保留根节点的公共底仓。

---

## 对首字延迟与计费成本的影响

前缀缓存技术对推理时延与云服务定价结构产生了直接影响：

<figure>
  <img src="/figures/prompt-caching/cost-and-ttft.svg" alt="前缀缓存对延迟与计费的影响" />
  <figcaption>前缀缓存对首字延迟（TTFT）与阶梯计费的影响</figcaption>
</figure>

### 1. 首字延迟（TTFT）下降
在长文本场景（如一次性分析数十页长文档或代码库）中，输入 Token 往往达到 32k~64k。在无缓存时，每次提问都需要等待较长的 GPU Prefill 计算；命中前缀缓存后，GPU 直接跳过前缀计算进入 Decode 阶段，首字吐出时间（TTFT）可压缩至数百毫秒以内。

### 2. 阶梯定价逻辑
主流大模型 API 普遍推出了前缀缓存阶梯定价：
- **标准输入 Token（未命中）**：按常规标准计费；
- **缓存写入（Cache Write）**：首次写入需要占用集群显存维持一定时长（TTL），通常收取略微的溢价；
- **缓存命中读取（Cache Read）**：后续请求只要命中前缀，价格通常可享受 **50%~90% 的折扣**。

---

## 缓存失效场景与提示词排布规范

在实际接入前缀缓存时，需要注意以下常见问题：

### 1. 动态变量导致全局失效
前缀树匹配是**严格从第一个 Token 开始逐字对齐**的。如果在 System Prompt 最开头插入了动态变量（如 `当前时间：2026-08-20 10:15:30`），由于时间戳每秒都在变化，第 1 个 Token 即发生失配，导致后续原本相同的全部背景文档无法命中缓存，被迫全量重算。

### 2. 缓存生存时间（TTL）
云端显存资源有限，云厂商通常为前缀缓存设定了 **5 分钟左右的生存时间（TTL）**：
- 在 5 分钟内有新请求命中前缀，TTL 会被自动刷新；
- 如果请求间隔超过 5 分钟，该显存块可能已被 LRU 机制释放，下次请求将重新触发全量写入。

### 提示词排布规范
为了最大化前缀缓存的命中率，应当严格按照 **从静态到动态** 的顺序排布输入内容：

$$\text{Prompt 结构} = \underbrace{\text{全局角色定义}}_{\text{永久静态}} \longrightarrow \underbrace{\text{工具 JSON Schema}}_{\text{稳定静态}} \longrightarrow \underbrace{\text{外挂参考文档}}_{\text{单会话静态}} \longrightarrow \underbrace{\text{历史对话记录}}_{\text{等差追加}} \longrightarrow \underbrace{\text{当前用户提问}}_{\text{动态新增}}$$

---

## 最小代码实现

以下代码演示了基于前缀树（Radix Tree）的 Token 序列匹配与增量缓存索引逻辑：

```python
from typing import Dict, List, Optional, Tuple

class PrefixCacheNode:
    def __init__(self, token_id: int):
        self.token_id = token_id
        self.children: Dict[int, "PrefixCacheNode"] = {}
        self.kv_handle: Optional[str] = None

class RadixPrefixCache:
    def __init__(self):
        self.root = PrefixCacheNode(token_id=-1)
        self.total_cached_tokens = 0

    def match_prefix(self, tokens: List[int]) -> Tuple[int, List[str]]:
        """查找与输入序列的最长公共前缀，返回命中数量与 KV 句柄"""
        curr = self.root
        matched_count = 0
        handles = []
        for t in tokens:
            if t in curr.children:
                curr = curr.children[t]
                matched_count += 1
                if curr.kv_handle:
                    handles.append(curr.kv_handle)
            else:
                break
        return matched_count, handles

    def insert_sequence(self, tokens: List[int], start_idx: int = 0) -> None:
        """为未命中的增量 Token 构建索引并分配缓存句柄"""
        curr = self.root
        for i in range(start_idx):
            curr = curr.children[tokens[i]]
            
        for i in range(start_idx, len(tokens)):
            t = tokens[i]
            if t not in curr.children:
                node = PrefixCacheNode(token_id=t)
                node.kv_handle = f"kv_block_{t}_pos{i}"
                curr.children[t] = node
                self.total_cached_tokens += 1
            curr = curr.children[t]

def cache_demo():
    cache = RadixPrefixCache()
    
    # 模拟 Token 序列:
    # 系统底仓: [101, 102, 103]
    # 请求 1: 系统底仓 + 提问 A [201, 202]
    req1 = [101, 102, 103, 201, 202]
    
    # 第 1 次请求: 缓存为空
    hit_len, handles = cache.match_prefix(req1)
    print(f"--- 请求 1 (首发): 输入 {len(req1)} Tokens ---")
    print(f"命中缓存: {hit_len} Tokens, 需要执行 Prefill: {len(req1) - hit_len} Tokens")
    cache.insert_sequence(req1, start_idx=hit_len)
    
    # 请求 2: 相同系统底仓 + 提问 B [301, 302]
    req2 = [101, 102, 103, 301, 302]
    hit_len2, handles2 = cache.match_prefix(req2)
    print(f"\n--- 请求 2 (共享底仓): 输入 {len(req2)} Tokens ---")
    print(f"命中缓存: {hit_len2} Tokens, 复用 KV 句柄: {handles2}")
    print(f"仅需执行增量 Prefill: {len(req2) - hit_len2} Tokens (省去前缀计算)")

cache_demo()
```

**控制台输出：**
```text
--- 请求 1 (首发): 输入 5 Tokens ---
命中缓存: 0 Tokens, 需要执行 Prefill: 5 Tokens

--- 请求 2 (共享底仓): 输入 5 Tokens ---
命中缓存: 3 Tokens, 复用 KV 句柄: ['kv_block_101_pos0', 'kv_block_102_pos1', 'kv_block_103_pos2']
仅需执行增量 Prefill: 2 Tokens (省去前缀计算)
```

---

## 核心概念辨析

- **Prefill 阶段 vs Decode 阶段**：
  - Prefill 处理输入文本，受矩阵算力限制（Compute-bound）；
  - Decode 逐字自回归生成，受显存带宽限制（Memory-bound）。
- **全量重算 vs 前缀缓存**：
  - 全量重算每一轮都对历史前缀做 $O(N^2)$ 的自注意力点积；
  - 前缀缓存利用因果不变性，直接复用显存中的 KV Cache。
- **静态前缀 vs 动态插入**：
  - 前缀匹配严格从第 1 个 Token 开始；
  - 动态时间戳或随机参数若放在前缀开头，会导致下游缓存链式失效。

前缀缓存优化了输入前缀的重复计算，而在输出阶段（Decode），自回归的逐字生成依然受限于串行访存。下一篇我们将探讨如何通过小模型辅助验证打破串行瓶颈——《推理加速与推测采样》。

---

## 参考文献

1. Zheng, L., Yin, L., Xie, Z., et al. (2023). [*Efficiently Programming Large Language Models with SGLang*](https://arxiv.org/abs/2312.07104). arXiv:2312.07104.
2. Kwon, W., Li, Z., Zhuang, S., et al. (2023). [*Efficient Memory Management for Large Language Model Serving with PagedAttention*](https://arxiv.org/abs/2309.06180). SOSP '23 / ACM.
3. Anthropic. (2024). [*Prompt Caching: Accelerate API workflows and reduce costs*](https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching).
4. OpenAI. (2024). [*Prompt Caching in the OpenAI API*](https://platform.openai.com/docs/guides/prompt-caching).
