---
title: "上下文窗口与视野极限"
description: "注意力覆盖上限、窗口溢出截断与工作记忆本质。"
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

在上一篇中，我们把大模型与自然语言交互的最小单元还原为了数字化的 Token。当你向大模型发送一段提问或者上传一份长文档时，紧接着会遇到的第二个物理限制，就是**上下文窗口（Context Window）**。

无论是技术报告中宣称的「32k 基础窗口」、「128k 长文本支持」还是「1M 超大上下文」，初学者常常产生一种直觉误解：以为上下文窗口越大，就代表大模型拥有越强大的「长期记忆力」，甚至认为模型能像人类一样把聊过的内容永久储存在大脑中。

但在工程实现中，上下文窗口根本不是永久存储介质。它的本质是 **GPU 在单次前向推理过程中，自注意力机制能够同时维持两两打分与向量汇聚的最大 Token 序列长度上限**。

<figure>
  <img src="/figures/context-window/overview.svg" alt="上下文窗口结构与预算切分" />
  <figcaption>上下文窗口的物理结构与预算切分</figcaption>
</figure>

我们可以把上下文窗口形象地比喻为一张**面积有限的物理工作台**。任何想要参与当前这次计算的信息——无论是系统的初始角色设定、过往数十轮的对话历史、最新检索到的参考资料，还是预备让模型输出的文字缓冲区——都必须在这张桌子上平铺展开。只要某项信息被拿下了工作台，它在接下来的这一轮计算中就彻底消失在模型的视野之外。

---

## 窗口内部的物理预算切分

很多开发者在调用大模型 API 时会感到疑惑：为什么我只输入了几个字，后台显示的输入 Token 消耗却高达数千？

这是因为在真实的工业级大模型产品中，上下文窗口并不是由用户的单句提问独享的，它被严格切分为了四个功能区域：

### 1. 底仓区：系统提示词与工具定义（System Prompt & Tools）
在用户的任何一条消息送入模型之前，应用层必须在最前端固定压入一段隐式的指令。这段底仓包含了：
- **角色与行为约束**（System Prompt）：「你是一个严谨的代码审计助手……」
- **安全与合规边界**：各类防越狱规范与输出格式要求；
- **函数调用契约（Function / Tool Schemas）**：如果开启了联网搜索、计算器或数据库调用，所有可用工具的 JSON Schema 定义都会被完整序列化为文本塞进底仓。

这部分内容像地基一样死死钉在窗口最前端，即使用户一句话没说，几百到数千个 Token 的底仓额度就已经被静态吃掉了。

### 2. 动态区：多轮对话历史的等差累积
大模型本身是**无状态（Stateless）**的。当你在网页上与它进行第 5 轮对话时，模型并不是「记住了」前 4 轮发生的事情，而是前端产品层在后台把前 4 轮的 **所有用户提问与助手回答原封不动地拼接成一段长文本**，作为第 5 轮的输入重新送进模型。

这意味着，随着对话轮次的深入，输入序列的长度呈等差数列持续上升：

$$\text{第 } k \text{ 轮输入 Token 数} = \text{底仓} + \sum_{i=1}^{k-1} (\text{User}_i + \text{Assistant}_i) + \text{User}_k$$

这种无状态重传机制，不仅让 API 计费随着会话深入越来越贵，而且会以极快的速度把有限的上下文窗口塞满。

### 3. 即时区：当前用户提问与外部检索（RAG）
这是用户当前轮次直接输入的指令。在知识库问答或联网搜索场景中，检索增强生成（RAG）从外部数据库检索出来的数篇参考文档切片，也会在这个区域被动态拼接到 Prompt 中。

### 4. 预留区：最大输出缓冲（Max Completion Tokens）
模型在开始预测前，必须为本次生成留出足够的输出缓冲额度（例如 4096 Token）。如果输入文本加上系统底仓已经占满了总窗口（例如 128k 中的 127.5k），模型就会因为没有足够的余量继续吐字而被迫抛出错误或提前截断。

---

## 超限之后：FIFO 截断与信息遗忘

当多轮对话的累积长度超过了模型标称的上下文窗口上限时，系统必须做出取舍。目前工业界最通用的策略是 **先进先出（FIFO）滚动截断**。

<figure>
  <img src="/figures/context-window/sliding-window.svg" alt="多轮对话中的 FIFO 滚动截断" />
  <figcaption>多轮会话超限时的先进先出（FIFO）滚动截断</figcaption>
</figure>

在 FIFO 截断中：
1. 最前端的系统提示词（底仓）通常被强制锁定保留；
2. 最靠近当前轮次的近期对话被优先保留；
3. **最早发生的一至多轮历史对话会被直接从文本序列中剔除**。

这解释了一个极其普遍的现实交互现象：
> **「为什么聊到第 20 轮时，模型突然违背了我在第 1 轮立下的规矩？」**

用户往往以为模型「变叛逆」或「智商下降」了，但物理真相非常冰冷：第 1 轮用户输入的那句规矩，已经因为上下文总长度超标，被物理滑动窗口挤出了本次推理的输入序列。在当前这一轮的前向传播矩阵中，那句话根本就不存在。

除了粗暴的 FIFO 截断，进阶的工程方案还包括 **递归摘要压缩（Summary Compression）**：当上下文过长时，调用一个轻量模型把前 10 轮的对话提炼成一段 200 字的摘要，替换掉原始的逐字记录，以此在有限的工作台上腾出可用面积。

我们可以通过一段 Python 代码，直观地观察这种基于 Token 计数的上下文窗口滑动管理逻辑：

```python
import tiktoken

class ContextWindowManager:
    def __init__(self, system_prompt: str, max_window_tokens: int = 4096, reserve_output_tokens: int = 1000):
        self.encoder = tiktoken.get_encoding("cl100k_base")
        self.system_prompt = system_prompt
        self.system_tokens = len(self.encoder.encode(system_prompt))
        self.max_history_tokens = max_window_tokens - self.system_tokens - reserve_output_tokens
        self.history = []  # 存储 (user_text, assistant_text)

    def add_turn(self, user_msg: str, assistant_msg: str):
        self.history.append((user_msg, assistant_msg))

    def build_prompt(self, current_user_msg: str) -> str:
        current_msg_tokens = len(self.encoder.encode(current_user_msg))
        available_history_budget = self.max_history_tokens - current_msg_tokens
        
        # 从最新的一轮往回回溯，直到预算耗尽（FIFO 截断）
        included_history = []
        accumulated_tokens = 0
        
        for u, a in reversed(self.history):
            turn_text = f"User: {u}\nAssistant: {a}\n"
            turn_tokens = len(self.encoder.encode(turn_text))
            if accumulated_tokens + turn_tokens <= available_history_budget:
                included_history.append(turn_text)
                accumulated_tokens += turn_tokens
            else:
                # 早期轮次超出预算，被迫丢弃
                break
                
        included_history.reverse()
        prompt = f"{self.system_prompt}\n\n" + "".join(included_history) + f"User: {current_user_msg}\nAssistant:"
        return prompt
```

---

## 物理本质：参数记忆 vs 工作记忆

要彻底理顺上下文窗口，必须在认知层面将大模型的两套截然不同的「记忆系统」剥离开来：

<figure>
  <img src="/figures/context-window/memory-vs-weights.svg" alt="参数记忆与工作记忆对比" />
  <figcaption>参数记忆（只读权重）与工作记忆（动态上下文）对比</figcaption>
</figure>

### 1. 参数记忆（Parametric Memory）
- **物理实体**：磁盘和显存中静态保存的模型权重文件（如几十 GB 的 `.safetensors` 文件）。
- **形成机制**：在长达数月的预训练中，神经网络通过反向传播把数万亿 Token 的人类知识高度压缩沉淀在权重矩阵中。
- **生命周期**：**只读且永久固化**。无论你在网页上聊了什么、刷新了多少次页面，这批浮点数绝不会在推理期间发生丝毫写入。
- **局限**：知识停留在训练截止期，且存在概率拟合带来的事实性幻觉。

### 2. 工作记忆（Working Context）
- **物理实体**：当前推理请求在 GPU 显存（HBM）中动态分配的 **KV Cache 激活值矩阵**。
- **形成机制**：用户发送当前的 HTTP 请求，模型按自回归逻辑实时计算生成。
- **生命周期**：**瞬时且用完即散**。当本次回答生成完毕、HTTP 连接断开，这块显存空间会被系统立刻释放。当你点击「新对话（New Chat）」时，工作台被瞬间清空归零。
- **价值**：能够让模型遵循临时的指令约定、理解刚刚喂给它的私有文档（In-Context Learning）。

大模型之所以能表现出理解当前对话的能力，靠的完全是工作记忆在单次推理中的局域关联；它从来没有在后台偷偷修改自己的参数去「记住」任何用户的个人背景。

---

## 视野极限：迷失在中间与注意力稀释

随着硬件与算法的发展，各大厂商不断将标称上下文窗口推高到 128k、1M 乃至更长。[Beltagy 等人（2020）的 Longformer](https://arxiv.org/abs/2004.05150) 以及 [Xiao 等人（2023）的 StreamingLLM](https://arxiv.org/abs/2309.17453) 等工作从算法层面探索了长文本的稀疏注意力扩展。

然而，**「标称窗口能够塞进 100 万字」与「模型能在这 100 万字中完美提取信息」是两回事**。

[Liu 等人在 2023 年发表的著名论文 *Lost in the Middle: How Language Models Use Long Contexts*](https://arxiv.org/abs/2307.03172) 中，通过严谨的实验揭示了大模型在长上下文检索中的经典缺陷：

<figure>
  <img src="/figures/transformer/heads-and-cost.svg" alt="长序列计算中的注意力稀释现象" />
  <figcaption>长序列自注意力计算中的注意力稀释现象</figcaption>
</figure>

1. **U 型检索曲线**：模型对位于长文本**最开头（首部效应）**和**最末尾（近因效应）**的关键信息提取准确率极高；
2. **迷失在中间（Lost in the Middle）**：一旦关键证据被埋在数十万字长文本的正中间，模型的检索准确率会出现断崖式下跌。

这背后的根本原因在于：Softmax 归一化要求全序列所有位置的注意力权重之和必须等于 1。当上下文长度急剧扩张到数万甚至数十万 Token 时，背景噪声 Token 会分流掉有限的注意力权重，导致真正重要的关键信息在加权汇聚时被严重稀释。

因此，单纯把窗口开大并不能完全替代外挂知识检索与精准的信息切片策略。

---

## 读到这里该能分清

上下文窗口是大模型单次前向推理时自注意力能覆盖的 Token 上限，它是瞬时运算的有限工作台，而不是持久记忆。

大模型本身完全无状态。所谓的多轮对话历史，是产品层在每一次发送时将全部历史记录在后台完整重传的结果。

系统提示词和工具定义作为底仓常驻在窗口最前端；当多轮对话导致总长度超标时，最早发生的历史轮次会被 FIFO 机制强行截断丢弃。

参数记忆是预训练固化在权重文件里的通用知识（只读），工作记忆是 GPU 显存里随算随销的 KV Cache（瞬时）。新开对话即意味着工作记忆物理清空。

长文本存在「迷失在中间」的注意力稀释现象，标称窗口容量不等于全局深度的精准理解。

在多轮长对话与 Agent 连续调用中，每次都完整重传上万字的历史底仓会带来高昂的延迟与 Token 费用。下一篇，我们将解析如何利用前缀缓存技术让长文本计算降本提速——《Prompt Caching 降本提速》。

## 参考文献

1. Liu, N. F., Lin, K., Hewitt, J., et al. (2023). [*Lost in the Middle: How Language Models Use Long Contexts*](https://arxiv.org/abs/2307.03172). TACL 2024 / arXiv:2307.03172.
2. Beltagy, I., Peters, M. E., & Cohan, A. (2020). [*Longformer: The Long-Document Transformer*](https://arxiv.org/abs/2004.05150). arXiv:2004.05150.
3. Xiao, G., Tian, Y., Chen, B., et al. (2023). [*Efficient Streaming Language Models with Attention Sinks*](https://arxiv.org/abs/2309.17453). ICLR 2024 / arXiv:2309.17453.
4. Anthropic. (2023). [*Prompt Engineering and Working with Long Context Windows*](https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/long-context-tips).
