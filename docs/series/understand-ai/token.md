---
title: "Token：文字的度量衡"
description: "BPE 词表切分、中英文切分差异与计费度量衡。"
series: understand-ai
chapter: foundation
order: 3
type: concept
articleStatus: draft
prerequisites:
  - "large-model"
videoSource: token
---

# Token：文字的度量衡

人们在使用大语言模型时，经常会看到「128k 上下文窗口」、「每百万 Token 计费 0.15 美元」或者「输出最大 4096 Token」这类术语。初学者常常把 Token 等同于「字」或「单词」，但在大模型的底层世界里，Token 是神经网络与人类语言进行交互的最小度量衡。

深度神经网络本质上是由浮点数矩阵构成的计算系统，它无法直接读写 ASCII 字符或 UTF-8 字符串。文本要被大模型理解，必须先由分词器（Tokenizer）切分成离散的片段，再将每个片段映射为一个固定的整数编号（Token ID），最后通过嵌入矩阵（Embedding Lookup Table）转化为连续的高维稠密向量。

<figure>
  <img src="/figures/token/pipeline.svg" alt="文本到向量的转换流程" />
  <figcaption>文本到稠密向量的 Token 化转换流水线</figcaption>
</figure>

理解 Token 的生成机制、分词算法的演进以及中英文之间的切分差异，是看懂大模型上下文容量限制、显存瓶颈、计费逻辑乃至某些奇异行为（如「数不对单词字母」）的关键基石。

---

## 为什么不直接按字或词切分

在自然语言处理的早期，研究者面临着一个两难的切分困境：

1. **按字符切分（Character-level）**：将每个字母（a, b, c...）或每个汉字作为一个独立单位。
   - **优点**：词表极小（英文字母加上常见标点不过上百个），永远不会遇到没见过的未知符号。
   - **致命缺陷**：文本序列会变得极长。一个 500 词的英文段落可能会被切成 3000 个字符。由于标准自注意力机制的计算与显存复杂度与序列长度呈二次方关系（$O(N^2)$），过长的序列会让自注意力层的计算与 KV Cache 显存消耗瞬间爆炸。
2. **按词切分（Word-level）**：按照空格或分词工具将完整的单词（apple, transformer）作为单位。
   - **优点**：序列长度短，语义聚合度高。
   - **致命缺陷**：词表无限膨胀。英语中存在词根变化、时态衍生、复合词以及海量人名术语；一旦遇到词表中未记录的生僻词，模型只能无奈地输出 `<UNK>`（Unknown，未登录词），造成严重的信息截断。

为了打破这种「极小词表导致超长序列」与「超大词表导致生词死角」的对立，**子词分词算法（Subword Tokenization）** 应运而生。其核心思想非常优雅：**高频出现的完整词保留为独立 Token，低频出现的生僻词拆解为若干高频的词根或子片段**。

---

## BPE 算法：统计驱动的自底向上合并

目前主流大模型（如 GPT 系列、Llama 系列、Qwen 等）普遍采用 **字节对编码（Byte Pair Encoding, BPE）** 或其变体（Byte-level BPE）。

BPE 原本是一种通用的数据压缩算法，[Sennrich 等人在 2016 年发表的论文 *Neural Machine Translation of Rare Words with Subword Units*](https://arxiv.org/abs/1508.07909) 中，首次将其创造性地引入自然语言处理的子词切分领域。随后，[Radford 等人在 2019 年的 GPT-2 技术报告](https://cdn.openai.com/better-language-models/language_models_are_unsupervised_multitask_learners.pdf) 中提出了直接在 UTF-8 字节流上运行的 Byte-level BPE，彻底奠定了现代大模型分词器的技术范式。此外，Google 在 BERT 中使用的 [WordPiece（Schuster & Nakajima 2012）](https://static.googleusercontent.com/media/research.google.com/en//pubs/archive/37842.pdf) 以及跨语言常用的 [SentencePiece（Kudo & Richardson 2018）](https://arxiv.org/abs/1808.06226)，也都是这一思路的分支。

<figure>
  <img src="/figures/token/bpe-merge.svg" alt="BPE 字节对编码合并机制" />
  <figcaption>BPE 字节对编码自底向上迭代合并机制</figcaption>
</figure>

BPE 的构建流程极其直观：
1. **准备初始词表**：将训练语料中的所有单词拆解为最小单位（如所有 ASCII 字母与基础符号，或者 256 个 UTF-8 基础字节）。
2. **统计频次**：遍历语料库，统计所有相邻 Token 组合（Pair）出现的频次。
3. **合并最高频对**：挑出出现次数最多的那个相邻对（例如 `('e', 's')`），将其合并为一个新的复合 Token（`'es'`），并将这一合并规则写入规则库。
4. **迭代重复**：在更新后的语料上再次统计并合并，直到词表达到预设的容量目标（例如 50,000 或 128,000）。

通过这一过程，高频词汇（如 `the`、`is`、`model`）在几轮合并后直接成为了单个 Token；而罕见词汇（如 `unbelievably`）则会被自然拆解为 `un` + `believ` + `ably` 三个高频词根。

我们可以用 Python 配合 OpenAI 开源的 `tiktoken` 库观察实际的分词切分效果：

```python
import tiktoken

# 获取 GPT-4o 采用的 o200k_base 分词器
encoding = tiktoken.get_encoding("o200k_base")

text = "Transformer models encode text into tokens."
token_ids = encoding.encode(text)
tokens = [encoding.decode_single_token_bytes(t).decode('utf-8') for t in token_ids]

print("Token IDs:", token_ids)
print("切分片段:", tokens)
# 输出:
# Token IDs: [51978, 4211, 23783, 1495, 1109, 13783, 13]
# 切分片段: ['Transformer', ' models', ' encode', ' text', ' into', ' tokens', '.']
```

> **注意前缀空格**：在上面的输出中，你会发现许多词的开头都带有一个空格（如 `' models'`、`' encode'`）。在 Byte-level BPE 中，空格被视为普通字符一同参与统计。因此，「包含前导空格的单词」与「单独开头的单词」在分词器看来是两个完全不同的 Token ID。

---

## 词表规模与多语言「汉字刺客」

分词器的核心参数是 **词表大小（Vocabulary Size, 简写为 $V$）**。

在早期大模型时代（如 GPT-2、GPT-3 及 GPT-3.5 使用的 `cl100k_base` 之前），训练语料主要以英文为主，词表大小通常设置在 30,000 到 50,000 左右。这导致了非英语语系（尤其是中文、日文、阿拉伯文）在使用大模型时遭遇了著名的「Token 刺客」现象。

### 为什么早期汉字消耗的 Token 远多于英文

根据 UTF-8 编码规范：
- 标准英文字母与 ASCII 字符占用 **1 个字节（Byte）**；
- 绝大多数常用汉字占用 **3 个字节（Bytes）**。

如果一个模型的词表主要被英文高频子词填满，没有为中文汉字或高频中文词汇预留足够的位置，分词器就只能把汉字拆成 3 个独立的 UTF-8 字节碎片来表示。

<figure>
  <img src="/figures/token/vocab-comparison.svg" alt="词表规模与多语言压缩率对比" />
  <figcaption>词表规模演进与多语言文本压缩率对比</figcaption>
</figure>

这就造成了显著的非对称性：
- 表达相同的信息量，英文段落可能只需 **100 个 Token**；
- 中文翻译段落可能需要被拆解成 **250 到 300 个 Token**。

这不仅导致中文调用 API 时的实际计费成本飙升 2~3 倍，而且同样标称为 32k 的上下文窗口，能容纳的中文有效字数只有英文的不到一半，严重制约了中文长文本的处理能力。

### 现代大模型的破局：扩充多语言词表

为了解决多语言压缩效率低下的问题，近两年的主流大模型大幅扩充了词表体积：
- **LLaMA 1 & 2**：词表仅为 32,000（中文极度碎片化）；
- **LLaMA 3**：词表扩张到 128,256（增加了大量多语言与代码 Token）；
- **Qwen 1.5 / 2.5**：词表扩张到 151,646 到 152,064；
- **GPT-4o**：升级为 `o200k_base`，词表扩充至约 200,000。

词表扩充到 128k+ 之后，常见的两字词、四字成语乃至多字专业术语（如「人工智能」、「中华人民共和国」）都能被压缩为仅 1~2 个 Token。中英文的实际信息压缩比（Compression Ratio）终于拉到了接近 1:1 的平准线。

---

## 度量衡的双重属性：容量尺度与计费尺度

Token 既是大模型物理硬件层面的 **容量尺度**，也是商业应用层面的 **计费尺度**。

### 1. 容量尺度：上下文与显存

大模型的标称规格中，最核心的一项就是上下文窗口长度（Context Length, $L$）。无论是 8k、32k 还是 128k，这里的计数单位全是 Token。

Token 数量直接决定了两项物理消耗：
- **自注意力计算复杂度**：在没有任何稀疏优化的标准 Transformer 中，计算全序列关联的矩阵乘法复杂度为 $O(L^2)$。Token 数量翻倍，计算量呈平方级上升。
- **KV Cache 显存开销**：在多轮对话与自回归生成过程中，每处理一个 Token，模型每一层的键向量（Key）和值向量（Value）都必须常驻显存。其显存消耗公式为：

$$\text{KV Cache 大小 (Bytes)} = 2 \times n_{\text{layers}} \times d_{\text{model}} \times L \times \text{Bytes per float}$$

其中 $n_{\text{layers}}$ 为网络层数，$d_{\text{model}}$ 为隐藏层维度，$L$ 为序列 Token 长度。对于一个千亿模型，128k 的 Token 序列仅 KV Cache 就会吃掉几十甚至上百 GB 的显存。

### 2. 计费尺度：为什么输入比输出便宜

在主流云服务商（如 OpenAI、Anthropic、阿里云等）的 API 价格表里，通常会区分两类价格：
- **Prompt / Input Token（输入价格）**：相对低廉（如 \$0.15 / 1M tokens）；
- **Completion / Output Token（输出价格）**：显著更贵（通常是输入的 3 到 5 倍，如 \$0.60 / 1M tokens）。

很多开发者好奇：同样是一个 Token，为什么输出要比输入贵这么多？

其本质原因在于两者在 GPU 计算模式上的根本差异：
1. **输入阶段（Prefill 阶段）**：用户传入的整个 Prompt 可以被一次性并行送入 GPU。此时 GPU 的千百个计算核心处于高并发打满状态，属于 **计算密集型（Compute-Bound）**，吞吐速度极快，硬件利用效率极高。
2. **输出阶段（Decoding 阶段）**：模型必须按自回归逻辑一个 Token 一个 Token 串行生成。每预测出一个新 Token，GPU 就要把全部百亿/千亿参数及整个历史 KV Cache 从显存（HBM）重新读取一次到计算核心中。此时算力严重闲置，瓶颈卡在显存带宽上，属于 **访存密集型（Memory-Bound）**，硬件吞吐效率极低。

因此，Output Token 昂贵的溢价不是商业套路，而是为了补偿 GPU 串行推理时被闲置的计算带宽成本。

---

## 分词器引发的奇特「物理现象」

由于大模型直接打交道的是 Token ID 而不是字符流，这在现实交互中引发了许多看似匪夷所思的现象：

### 现象一：为什么模型数不对单词里的字母？

最经典的例子是提问：`"How many 'r's are in 'strawberry'?"`（strawberry 里有几个字母 r？）。许多早期顶尖模型都会坚定地回答是 2 个。

<figure>
  <img src="/figures/token/pipeline.svg" alt="Token 切分导致的底层字符流盲区" />
  <figcaption>Token 切分导致的底层字符流盲区</figcaption>
</figure>

原因就在于分词器：`strawberry` 在绝大多数分词器中被整块切分为单个 Token `[strawberry]`（ID 为 42352）或者两个片段 `[straw, berry]`。进入 Transformer 运算的只有这个向量，模型根本没有机会「逐字查看」里面的每一个字母拼写。除非你在 Prompt 中强制要求它用连字符拆开（`s-t-r-a-w-b-e-r-r-y`）让其暴露每个字符，否则它只能靠黑盒统计概率瞎猜。

### 现象二：多位数加减法容易算错

如果你让大模型计算 `12893 + 45912`，有时它会在中间某一位算错。这是因为分词器在处理长数字时并没有统一的数学切分逻辑，可能会把 `12893` 切成 `[128, 93]`，把 `45912` 切成 `[45, 912]`。这种不对齐的数字切分打破了人类列竖式计算时「个十百千万」的对齐结构，给神经网络的内部数字推理造成了额外的认知障碍。

---

## 读到这里该能分清

Token 是大模型处理语言的最小离散单元。文本经分词器转化为整数 ID，再通过嵌入矩阵检索映射为高维连续向量。

BPE 算法通过统计最高频相邻子词自底向上合并，兼顾了紧凑的序列长度与零未登录词（No OOV）的边界覆盖。

中英文切分效率由词表规模决定。现代大模型通过扩充多语言词表（128k~200k），消除了早期 UTF-8 字节拆解导致的中文「Token 刺客」现象。

Token 是硬件上下文与显存 KV Cache 的物理容量尺度，也是衡量 Prefill 并行计算与 Decode 串行访存瓶颈的商业计费尺度。

分词器的粗粒度聚合使得模型无法直接「感知」单词内部的单个字母拼写，这是导致数字母失误和数字对齐异常的底层原因。

下一篇我们进入模型单次前向推理的视野边界，探讨长文本处理中的核心工作台与瓶颈——《上下文窗口与视野极限》。

## 参考文献

1. Sennrich, R., Haddow, B., & Birch, A. (2016). [*Neural Machine Translation of Rare Words with Subword Units*](https://arxiv.org/abs/1508.07909). ACL 2016 / arXiv:1508.07909.
2. Radford, A., Wu, J., Child, R., et al. (2019). [*Language Models are Unsupervised Multitask Learners*](https://cdn.openai.com/better-language-models/language_models_are_unsupervised_multitask_learners.pdf). OpenAI Technical Report (GPT-2 Byte-level BPE).
3. Schuster, M., & Nakajima, K. (2012). [*Japanese and Korean voice search*](https://static.googleusercontent.com/media/research.google.com/en//pubs/archive/37842.pdf). ICASSP 2012.
4. Kudo, T., & Richardson, J. (2018). [*SentencePiece: A simple and language independent subword tokenizer and detokenizer for Neural Text Processing*](https://arxiv.org/abs/1808.06226). EMNLP 2018 / arXiv:1808.06226.
5. OpenAI. (2023). [*tiktoken: A fast BPE tokeniser for use with OpenAI's models*](https://github.com/openai/tiktoken).
