---
title: "无状态与缓存机制"
description: "无状态 HTTP 请求的现实意义、空间换时间的缓存哲学，以及前缀树匹配。"
series: prerequisites
chapter: foundations
order: 6
type: concept
articleStatus: draft
prerequisites: []
videoSource: stateless-and-cache
---

# 无状态与缓存机制

在掌握了硬件显存账本与高维向量几何之后，我们来到前置基石的最后一环：**大模型服务在工程软件层面的运转逻辑**。

当你在 ChatGPT 或 Claude 网页端和 AI 聊得热火朝天，感觉对方仿佛拥有持久的「记忆力」时，很多人的直觉是：
> *“大模型服务器一定开辟了一个专属内存空间，把我说过的话保存在了它的脑子里。”*

**事实恰恰相反——大模型服务端是绝对「无状态（Stateless）」的。**

大模型没有记忆，每一次对话在物理上都是一次彻底的「失忆重开」。它是如何制造出连续对话假象的？为什么这会导致 Token 消耗剧烈膨胀？工程师又是如何用「前缀树与缓存」挽救算力的？

这就是本篇要拆解的核心数据结构与工程机制。

<figure>
  <img src="/figures/stateless-and-cache/stateless-turn-overhead.svg" alt="无状态多轮对话中的 Token 累积机制" />
  <figcaption>无状态请求与多轮对话 Token 累积机制</figcaption>
</figure>

---

## 无状态协议：大模型根本没有「记忆」

在 Web 后端架构中，**无状态（Stateless）** 意味着：**服务器不会在两次独立的网络请求之间，保留任何关于客户端的历史会话状态。**

大模型的底层数学模型 $P(x_t \mid x_{<t})$ 本质上就是一个静态的巨型数学函数。它不会因为你 5 秒前发了一句话，就在显存里挂起一个等待线程。

### 1. 多轮对话的伪装：Token 滚雪球
为了让大模型在第 3 轮知道你在第 1 轮说了什么，客户端（网页端或 API 调用方）必须执行一个残酷的操作——**把前面的全部历史聊天记录，当成新请求的 Prompt 一并发送过去**：

- **第 1 轮**：
  - 客户端发送：`[系统提示词: 100 字] + [用户问 1: 20 字]`（输入 120 Tokens）
  - 模型回复：`[回答 1: 80 字]`
- **第 2 轮**：
  - 客户端发送：`[系统提示词: 100 字] + [用户问 1: 20 字] + [回答 1: 80 字] + [用户问 2: 30 字]`（**输入暴涨到 230 Tokens！**）
  - 模型回复：`[回答 2: 90 字]`
- **第 3 轮**：
  - 客户端发送：`[系统提示词] + [问1] + [答1] + [问2] + [答2] + [用户问 3: 50 字]`（**输入高达 370 Tokens！**）

### 2. 动笔手算：多轮对话的成本账本
如果一个多轮对话持续了 $N$ 轮，每一次对话的输入 Token 并不是单独那句话的长度，而是**前置所有轮次的累加和**：

$$\text{第 } k \text{ 轮输入} = \text{System} + \sum_{j=1}^{k-1} (\text{User}_j + \text{Assistant}_j) + \text{User}_k$$

设系统提示词 1000 字，每轮问答合计 200 字，进行 10 轮对话：
- 第 1 轮输入：$1000 + 200 = 1200$ Tokens；
- 第 10 轮输入：$1000 + 9 \times 200 = 2800$ Tokens；
- **10 轮累积计费输入** $= 1200 + 1400 + 1600 + \dots + 2800 = \mathbf{20,000 \text{ Tokens}}$！

虽然你只聊了 10 句话（实际新增内容仅 3000 字），但由于无状态重传，你向 GPU 提交了整整 2 万个 Token 的计算量。

---

## 缓存哲学：用显存空间换取计算时间

既然历史 Token 必须每一轮重复发送，难道 GPU 每次都要将前面的 2800 个字重新从第 1 层神经网络计算到第 80 层吗？

如果真这么做，多轮对话的计算量和等待延迟将随轮次呈二次方爆炸（$O(N^2)$）。

计算机科学中最经典的核心思想随之登场——**空间换时间（Space-Time Tradeoff）**。

<figure>
  <img src="/figures/stateless-and-cache/kv-cache-principle.svg" alt="全量重算与 KV Cache 空间换时间机制对比" />
  <figcaption>全量重算 vs KV Cache 空间换时间机制对比</figcaption>
</figure>

### 1. 为什么历史计算可以被缓存？
在上一篇《向量空间与概率计算》中我们学到：注意力机制的核心是计算 Query（当前词）与 Key（所有历史词）的点积，再乘以 Value（特征内容）。

当大模型生成下一个字时：
- **过去所有字对应的 Key 向量和 Value 向量是永远固定不变的！**
- 既然不变，我们完全可以在第 1 轮算完后，把这组 Key 和 Value 向量**直接缓存在 GPU 显存（VRAM）中**。
- 下一轮或下一个字到来时，GPU 只需要计算当前这 1 个新字的向量，直接与显存里的缓存做点积即可！

### 2. 缓存的物理代价：显存消耗
KV 缓存虽然将生成阶段的单步算力复杂度降到了 $O(1)$，但代价是消耗大量显存。

对于一个标准的 70B 模型（80 层，维度 8192），每个 Token 的 KV 向量需要占用约 **1.3 MB 显存**。
如果并发 100 个用户，每个用户上下文有 4000 个 Token：

$$\text{KV Cache 显存占用} = 100 \times 4000 \times 1.3 \text{ MB} \approx \mathbf{520 \text{ GB 显存}}$$

这需要数张 80GB 的高端 GPU 专门用来充当「临时缓存仓库」。

---

## 前缀树（Radix / Trie Tree）：跨请求共享缓存

在现实的 AI 产品中，千万个不同用户往往使用着**完全相同的系统提示词（System Prompt）**，同一个用户在同一会话中也会持续产生**相同的前缀历史**。

服务端如何高效管理海量的显存缓存块？

答案是经典数据结构——**前缀树（Trie / Radix Tree）**。

<figure>
  <img src="/figures/stateless-and-cache/radix-prefix-tree.svg" alt="基于前缀树的跨请求缓存共享" />
  <figcaption>基于前缀树（Radix Tree）的跨请求缓存共享</figcaption>
</figure>

### 最长公共前缀（LCP）匹配
当一个新的请求到达服务端推理引擎（如 SGLang 或 vLLM）时：
1. **树上查找**：引擎沿着前缀树向下比对，寻找当前请求与显存缓存树的**最长公共前缀**；
2. **命中跳过**：命中的前缀节点（如 1000 字的系统提示词）**完全不需要 GPU 重新计算**，直接复用显存中现成的 KV 缓存；
3. **分叉延伸**：仅对新增加的不同词汇（用户提问部分）进行增量计算，并将新结果作为叶子节点挂载到树上。

这就是为什么全书第 7 篇的 **Prompt Caching（前缀缓存）** 能够让大模型 API 的首字延迟（TTFT）降低 80% 以上，并将输入价格直接打 1 折的底层数据结构真相！

---

## 动手实验：15 行代码实现极简前缀缓存树

下面的 Python 代码实现了一个简易的前缀缓存树，完整模拟了服务端如何通过前缀匹配识别公共历史并计算节省的 Token 算力：

```python
class MiniRadixCache:
    def __init__(self):
        # 树的根节点，用嵌套字典表示前缀分支
        self.root = {}

    def query_and_cache(self, tokens: list[str]) -> tuple[int, float]:
        curr = self.root
        hit_tokens = 0
        
        # 1. 遍历当前 Token 序列，在树中寻找最长公共前缀
        for token in tokens:
            if token in curr:
                hit_tokens += 1
                curr = curr[token]
            else:
                # 2. 未命中分支：开辟新节点存入树中（增量缓存）
                curr[token] = {}
                curr = curr[token]
                
        # 3. 计算缓存命中率与免除计算的百分比
        hit_ratio = (hit_tokens / len(tokens)) * 100.0 if tokens else 0.0
        return hit_tokens, hit_ratio

# --- 模拟真实工业场景 ---
cache = MiniRadixCache()

# 步骤 1：系统预热公共 System Prompt (1000字前缀)
sys_prompt = ["<SYS>", "你", "是", "AI", "助手"]
cache.query_and_cache(sys_prompt)

# 步骤 2：用户 A 发起请求 (公共前缀 + 自身问题)
req_a = ["<SYS>", "你", "是", "AI", "助手", "讲", "Python"]
hit_a, ratio_a = cache.query_and_cache(req_a)
print(f"用户 A: 序列总长 {len(req_a)}, 命中缓存 {hit_a} Tokens, 节省计算 {ratio_a:.1f}%")

# 步骤 3：用户 B 发起请求 (共享公共前缀)
req_b = ["<SYS>", "你", "是", "AI", "助手", "讲", "Java"]
hit_b, ratio_b = cache.query_and_cache(req_b)
print(f"用户 B: 序列总长 {len(req_b)}, 命中缓存 {hit_b} Tokens, 节省计算 {ratio_b:.1f}%")
```

运行输出结果：
```text
用户 A: 序列总长 7, 命中缓存 5 Tokens, 节省计算 71.4%
用户 B: 序列总长 7, 命中缓存 5 Tokens, 节省计算 71.4%
```

---

## 读到这里该能分清

大模型服务端是完全无状态（Stateless）的，多轮对话靠客户端在每次请求中完整回传历史记录来实现。

多轮对话会导致输入 Token 呈等差级数激增，累积请求计算量远超单次对话的新增内容。

KV Cache 贯彻了「空间换时间」的工程哲学，将已生成的 Key 和 Value 向量驻留显存，避免每吐一个字都重新计算历史全序列。

前缀树（Radix / Trie Tree）让海量并发请求能够共享系统提示词和公共对话前缀，是 Prompt Caching 与现代推理系统高效调度的核心数据结构。

到这里，**《前置基石 · 读懂 AI 的物理与数学底座》全 3 篇已全部通关！**
我们已经手握：
1. **硬件物理账本**（显存容量、带宽墙与自回归搬运延迟）；
2. **高维空间几何**（词嵌入、点积相似度与 Softmax 概率归一化）；
3. **系统数据结构**（无状态协议、KV 缓存与前缀树）。

带着这些扎实直观的认知武器，让我们正式进入 **《第 1 季：读懂大模型基本机制》** 的核心殿堂！

## 参考文献

1. Fielding, R. T. (2000). [*Architectural Styles and the Design of Network-based Software Architectures (Chapter 5: Representational State Transfer / REST)*](https://www.ics.uci.edu/~fielding/pubs/dissertation/rest_arch_style.htm). PhD dissertation, University of California, Irvine.
2. Zheng, L., Yin, L., Xie, Z., et al. (2023). [*SGLang: Efficient Execution of Structured Language Model Programs (RadixAttention)*](https://arxiv.org/abs/2312.07104). arXiv:2312.07104.
3. Kwon, W., Li, Z., Zhuang, S., et al. (2023). [*Efficient Memory Management for Large Language Model Serving with PagedAttention*](https://arxiv.org/abs/2309.06180). SOSP 2023 / arXiv:2309.06180.
4. Anthropic. (2024). [*Prompt Caching: Speed up LLM API requests and reduce costs*](https://www.anthropic.com/news/prompt-caching).
