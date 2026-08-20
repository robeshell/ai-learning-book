---
title: "上下文窗口与视野极限"
description: "自注意力覆盖上限、窗口结构与工作记忆本质。"
series: understand-ai
chapter: runtime
order: 4
type: concept
articleStatus: draft
prerequisites:
  - "token"
videoSource: context-window
---

# 上下文窗口与视野极限

在实际使用大语言模型时，我们经常会看到“32k 基础窗口”、“128k 长文本支持”或“1M 超大上下文”等规格描述。

人们常产生一种直觉误解：以为上下文窗口越大，就代表大模型拥有越强大的“长期记忆力”，甚至认为模型能像人类一样将聊过的内容永久储存在大脑中。

但在底层工程实现中，**上下文窗口并不是持久存储介质，而是 GPU 在单次前向推理过程中，自注意力机制能够同时维持两两打分与特征汇聚的最大 Token 序列长度上限**。

<figure>
  <img src="/figures/context-window/overview.svg" alt="上下文窗口结构与预算切分" />
  <figcaption>上下文窗口的物理结构与预算切分</figcaption>
</figure>

我们可以把上下文窗口理解为一张**面积有限的物理工作台**。任何参与当前计算的信息——包括系统设定、历史对话、外部检索文档以及预留的输出缓冲区——都必须平铺在这张工作台上。只要某项信息被移出了工作台，它在接下来的这一轮计算中就彻底消失在模型的视野之外。

---

## 上下文窗口的结构组成

在调用大模型 API 时，即使只输入了几个字，后台显示的输入 Token 消耗也可能达到数千。这是因为在真实的工业级应用中，上下文窗口通常由四个部分切分共享：

### 1. 系统底仓（System Prompt & Tools）
在用户消息之前，应用层通常会注入一段固定的全局指令：
- **角色与行为约束**：“你是一个严谨的代码审计助手……”
- **安全与输出格式规范**：如禁止输出违规内容或强制 JSON 格式；
- **工具调用契约（Tool Schemas）**：如果开启了联网搜索、计算器或数据库调用，所有可用工具的 JSON Schema 定义都会被序列化为文本塞进底仓。

这部分内容常驻在窗口最前端，即使用户尚未提问，也会静态占用数百到数千个 Token。

### 2. 历史会话（Conversation History）
大模型本身是**无状态（Stateless）**的。当进行第 5 轮对话时，模型并不是“记住了”前 4 轮发生的事情，而是应用层在后台把前 4 轮的 **所有用户提问与助手回答完整拼接成一段长文本**，重新作为输入送进模型。

这意味着，随着对话轮次增加，输入序列的长度呈线性持续上升：

$$\text{第 } k \text{ 轮输入 Token 数} = \text{底仓} + \sum_{i=1}^{k-1} (\text{User}_i + \text{Assistant}_i) + \text{User}_k$$

### 3. 当前输入与外部检索（Prompt & RAG）
包含用户当前轮次直接输入的指令。在检索增强生成（RAG）场景中，从外部向量数据库或搜索引擎检索出来的参考资料片段，也会动态拼接到这一区域。

### 4. 输出缓冲区（Max Completion Tokens）
模型在开始预测前，必须为本次生成留出足够的输出缓冲额度（例如 4096 Token）。如果输入文本加上系统底仓已经占满了总窗口，模型就会因为没有足够的余量继续生成而报错或被迫截断。

---

## 窗口溢出与滑动截断

当多轮对话的累积长度超出上下文窗口上限时，系统必须丢弃部分内容。目前最常用的策略是 **先进先出（FIFO）滚动截断**。

<figure>
  <img src="/figures/context-window/sliding-window.svg" alt="多轮对话中的 FIFO 滚动截断" />
  <figcaption>多轮会话超限时的先进先出（FIFO）滚动截断</figcaption>
</figure>

在 FIFO 截断中：
1. 最前端的系统提示词（底仓）通常被强制保留；
2. 最靠近当前轮次的近期对话被优先保留；
3. **最早发生的一至多轮历史对话会被直接从文本序列中剔除**。

这也是为什么在长会话中，模型可能会“忘记”早期立下的规则：因为早期的对话已经被物理滑动窗口移出了本次推理的输入序列，在当前的前向传播矩阵中已不复存在。

---

## 参数记忆与工作记忆的区别

要准确理解上下文窗口，需要在物理机制上区分大模型的两套不同系统：

<figure>
  <img src="/figures/context-window/memory-vs-weights.svg" alt="参数记忆与工作记忆对比" />
  <figcaption>参数记忆（只读权重）与工作记忆（动态上下文）对比</figcaption>
</figure>

### 1. 参数记忆（Parametric Memory）
- **物理实体**：磁盘和显存中静态保存的模型权重文件（如 `.safetensors`）。
- **形成机制**：在预训练阶段，神经网络通过反向传播将海量语料统计规律沉淀在权重矩阵中。
- **生命周期**：**只读且固化**。推理期间权重不发生任何写入。
- **局限**：知识停留在训练截止期，且存在概率拟合带来的事实性幻觉。

### 2. 工作记忆（Working Context）
- **物理实体**：当前推理请求在 GPU 显存（HBM）中动态分配的 **KV Cache 激活值矩阵**。
- **形成机制**：由用户当前的 Prompt 实时计算生成。
- **生命周期**：**瞬时计算**。单次请求结束即释放显存；开启新会话时工作台物理归零。
- **价值**：让模型临时理解当前输入的前后文关联与私有文档（In-Context Learning）。

---

## 长上下文下的注意力稀释

尽管现代模型已将上下文窗口扩展至 128k 甚至 1M，但在长文本处理中依然存在实际瓶颈。

<figure>
  <img src="/figures/context-window/lost-in-the-middle.svg" alt="长文本中的检索性能分布：Lost in the Middle" />
  <figcaption>长文本中的检索性能分布：Lost in the Middle</figcaption>
</figure>

研究表明，大模型在长上下文检索中存在经典的 **“迷失在中间”（Lost in the Middle）** 现象：
1. **U 型召回分布**：模型对位于长文本**最开头（首部效应）**和**最末尾（近因效应）**的关键信息提取准确率较高；
2. **中段信息稀释**：当关键证据位于超长文本的中段时，提取准确率会出现明显下降。

其物理原因在于：Softmax 归一化要求全序列注意力权重之和等于 1。当序列长度达到数万至数十万 Token 时，海量背景噪声 Token 会共同分流有限的注意力权重，导致关键信息在加权汇聚时被稀释。

---

## 最小代码实现

以下代码演示了多轮对话管理中的 Token 预算控制与 FIFO 滚动截断逻辑：

```python
class ContextWindowManager:
    def __init__(self, system_prompt: str, max_tokens: int = 50, reserve_output: int = 15):
        self.system_prompt = system_prompt
        # 简单使用空格分词模拟 Token 计数
        self.system_tokens = len(system_prompt.split())
        self.max_history_tokens = max_tokens - self.system_tokens - reserve_output
        self.history = []  # 存储历史记录 [(user_msg, assistant_msg)]

    def add_turn(self, user_msg: str, assistant_msg: str):
        self.history.append((user_msg, assistant_msg))

    def build_prompt(self, current_user_msg: str):
        current_tokens = len(current_user_msg.split())
        available_budget = self.max_history_tokens - current_tokens
        
        included_history = []
        dropped_turns = 0
        accumulated_tokens = 0
        
        # 从最新轮次往前遍历 (FIFO 丢弃早期轮次)
        for u, a in reversed(self.history):
            turn_text = f"User: {u} | Assistant: {a}"
            turn_tokens = len(turn_text.split())
            if accumulated_tokens + turn_tokens <= available_budget:
                included_history.append(turn_text)
                accumulated_tokens += turn_tokens
            else:
                dropped_turns += 1
                
        included_history.reverse()
        prompt = f"[System: {self.system_prompt}]\n"
        if included_history:
            prompt += "\n".join(included_history) + "\n"
        prompt += f"User: {current_user_msg} | Assistant:"
        
        total_tokens = self.system_tokens + accumulated_tokens + current_tokens
        return prompt, total_tokens, dropped_turns

def context_demo():
    # 初始化工作台: 总容量 50 Tokens，预留输出 15 Tokens
    mgr = ContextWindowManager(system_prompt="You are a code assistant.", max_tokens=50, reserve_output=15)
    
    # 模拟历史会话
    mgr.add_turn("How to reverse a list in Python?", "Use list.reverse() or slicing [::-1].")
    mgr.add_turn("Explain list slicing in detail.", "Syntax is sequence[start:stop:step].")
    
    # 当前第 3 轮提问
    prompt, total_tokens, dropped = mgr.build_prompt("What is the time complexity?")
    
    print("--- 组装后的上下文 Prompt ---")
    print(prompt)
    print("\n--- 上下文统计 ---")
    print(f"输入消耗: {total_tokens} Tokens (预算上限: 35), 超限丢弃早期轮数: {dropped}")

context_demo()
```

**控制台输出：**
```text
--- 组装后的上下文 Prompt ---
[System: You are a code assistant.]
User: Explain list slicing in detail. | Assistant: Syntax is sequence[start:stop:step].
User: What is the time complexity? | Assistant:

--- 上下文统计 ---
输入消耗: 21 Tokens (预算上限: 35), 超限丢弃早期轮数: 1
```

---

## 核心概念辨析

- **上下文窗口 vs 持久记忆**：
  - 上下文窗口是单次推理中自注意力能覆盖的瞬时工作台；
  - 模型本身完全无状态，多轮对话依赖应用层完整重传历史。
- **参数记忆 vs 工作记忆**：
  - 参数记忆只读固化在权重文件中，推理期间不更新；
  - 工作记忆是显存中动态生成的 KV Cache，请求结束即释放。
- **FIFO 截断 vs 记忆遗忘**：
  - 模型并未“遗忘”规则，而是早期历史文本被物理滑动窗口剔除出当前输入。
- **标称窗口容量 vs 有效检索能力**：
  - 能够容纳长文本不等于能完美提取中段细节，长上下文存在 Softmax 稀释与 Lost in the Middle 现象。

在多轮长对话中，每次重传完整历史会导致重复计算与显存开销。下一篇我们将探讨如何通过复用前缀计算结果来降低延迟与成本——《Prompt Caching 前缀缓存》。

---

## 参考文献

1. Liu, N. F., Lin, K., Hewitt, J., et al. (2023). [*Lost in the Middle: How Language Models Use Long Contexts*](https://arxiv.org/abs/2307.03172). TACL 2024 / arXiv:2307.03172.
2. Xiao, G., Tian, Y., Chen, B., et al. (2023). [*Efficient Streaming Language Models with Attention Sinks*](https://arxiv.org/abs/2309.17453). ICLR 2024 / arXiv:2309.17453.
3. Beltagy, I., Peters, M. E., & Cohan, A. (2020). [*Longformer: The Long-Document Transformer*](https://arxiv.org/abs/2004.05150). arXiv:2004.05150.
4. Anthropic. (2023). [*Prompt Engineering and Working with Long Context Windows*](https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/long-context-tips).
