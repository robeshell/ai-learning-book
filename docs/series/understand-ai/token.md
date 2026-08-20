---
title: "Token：文字的度量衡"
description: "从字符到子词与 BPE 算法，及现代大词表演进。"
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

在实际使用大模型时，我们经常会看到“128k 上下文窗口”、“每百万 Token 计费 0.15 美元”或“最大输出 4096 Token”等术语。

直觉上人们常把 Token 简单等同于“字”或“词”。但在大模型的底层计算中，**Token 是神经网络处理人类自然语言的最小离散单元**。

深度神经网络本质上是由浮点数矩阵构成的计算系统，它无法直接读写 ASCII 字符或 UTF-8 字符串。文本进入模型前，必须先由分词器（Tokenizer）切分为离散片段，将片段映射为整数编号（Token ID），再通过嵌入层（Embedding Lookup Table）转化为高维稠密向量。

<figure>
  <img src="/figures/token/pipeline.svg" alt="文本到向量的转换流程" />
  <figcaption>文本到稠密向量的 Token 化转换流水线</figcaption>
</figure>

理解 Token 的生成机制、分词算法以及词表规模的演进，是理解模型上下文长度限制、显存开销以及计费模式的基础。

---

## 为什么不能只按字符或按词切分

在自然语言处理中，对文本进行切分通常面临两种极端的选择：

1. **按字符切分（Character-level）**：将每个字母（a, b, c...）或汉字作为独立单位。
   - **优点**：词表极小（英文字母与常见标点仅上百个），几乎不会遇到未登录词（Out-of-Vocabulary, OOV）。
   - **缺陷**：序列长度极长。一段 500 词的英文会产生数千个字符。由于标准自注意力机制的计算与 KV Cache 显存开销与序列长度呈二次方关系（$O(N^2)$），过长的序列会导致计算量和显存急剧膨胀。
2. **按完整词切分（Word-level）**：以空格或分词工具切出的完整单词（apple, transformer）为单位。
   - **优点**：序列长度短，语义集中。
   - **缺陷**：词表无限膨胀。英语中存在词根变化、时态衍生、复合词以及海量专有名词；一旦遇到词表中未记录的生僻词，模型只能输出 `<UNK>`（Unknown，未知词），造成信息丢失。

为了兼顾序列紧凑度与词表覆盖率，**子词分词算法（Subword Tokenization）** 成为了现代大模型的标准方案：**高频出现的完整词保留为独立 Token，低频出现的词拆解为高频子片段（词根或字节组合）**。

---

## BPE 算法的构建过程

目前主流大模型（如 GPT 系列、Llama 系列、Qwen、DeepSeek 等）普遍采用 **字节对编码（Byte Pair Encoding, BPE）** 或 Byte-level BPE。

<figure>
  <img src="/figures/token/bpe-merge.svg" alt="BPE 字节对编码合并机制" />
  <figcaption>BPE 字节对编码自底向上迭代合并机制</figcaption>
</figure>

BPE 原本是一种数据压缩算法，其核心逻辑是从最小单元出发，通过统计最高频相邻对并进行迭代合并：

1. **基础词表初始化**：现代分词器直接以 256 个基础字节（UTF-8 字节 `0x00` 到 `0xFF`）作为初始词表，保证所有文本都能被表示，从根本上消除了 `<UNK>`；
2. **统计相邻对频次**：遍历训练语料，统计所有相邻 Token 组合（Pair）的出现频次；
3. **合并最高频对**：挑出频次最高的相邻对（例如 `('e', 's')`），合并为一个新的 Token（`'es'`），并将规则加入合并表（Merge Table）；
4. **循环迭代**：在更新后的语料上重复上述统计与合并过程，直到词表达到预设容量（如 128k 或 152k）。

通过这种自底向上的迭代，高频词（如 `the`、`model`）在几轮合并后成为单独的 Token；而生僻词（如 `unbelievably`）则自然拆解为 `un` + `believ` + `ably`。

### 正则切分规则的作用

在实际工程实现（如 GPT-2/4、Llama）中，分词器在统计 BPE 合并前，会先用正则表达式将文本拆分为独立的原子块：

```python
# GPT-4 / cl100k_base 采用的正则切分模式
GPT4_SPLIT_PATTERN = r"""'s|'t|'re|'ve|'m|'ll|'d| ?\p{L}+| ?\p{N}+| ?[^\s\p{L}\p{N}]+|\s+(?!\S)|\s+"""
```

**为什么需要这一步？**  
如果不加限制，BPE 算法在统计时可能会将标点符号与单词合并（例如将 `dog!`、`dog?`、`dog.` 分别合并为不同的 Token），导致词表被大量带有标点的冗余词条填满。正则表达式将缩写、字母、数字、标点和空格隔离在各自的范畴内，确保 BPE 只在相同类别内部进行合并。

---

## 词表规模与多语言压缩

分词器的核心参数是 **词表大小（Vocabulary Size, $V$）**。

<figure>
  <img src="/figures/token/vocab-comparison.svg" alt="词表规模与多语言压缩率对比" />
  <figcaption>词表规模演进与多语言文本压缩率对比</figcaption>
</figure>

### 早期小词表的碎片化问题

在早期模型（如 GPT-2、LLaMA 1）中，词表通常仅设为 32k 或 50k 左右，且训练语料以英文为主：
- 标准 ASCII 字符在 UTF-8 中占用 **1 个字节**；
- 常用汉字在 UTF-8 中占用 **3 个字节**。

当词表中缺乏足够的中文词条时，一个汉字往往会被拆解为 2 到 3 个独立的字节 Token。这导致了早期非英语语系的“Token 膨胀”：表达相同语义，中文消耗的 Token 数量可达英文的 2 到 3 倍。

这不仅推高了非英语调用的 API 成本，更使得标称为 32k 的上下文窗口实际能容纳的中文信息量大打折扣。

### 现代大模型的词表演进

2024–2026 年的主流大模型普遍扩充了词表体积：
- **Llama 2 (32k)** $\to$ **Llama 3 (128k)**；
- **Qwen 1.5 / 2.5 (152k)**；
- **GPT-4o (200k)**。

词表扩充后，常见的中文双字词、四字成语乃至专业术语都能聚合为 1~2 个 Token，中英文的信息压缩率基本对齐。

---

## Token 机制带来的实际影响

由于模型底层直接处理的是 Token ID 而非原始字符流，这在实际交互中引发了若干常见现象：

### 1. 字符级任务表现受限
例如询问 `"strawberry 里面有几个字母 r？"` 时，早期模型容易答错。这是因为分词器将 `strawberry` 作为一个整体 Token 输入，模型接收到的是一个单一的向量，并未直接看到内部字符序列。若要在 Prompt 中改善此类任务，通常需要引导模型将单词逐字符拆解输出（如 `s-t-r-a-w-b-e-r-r-y`）。

### 2. 多位数加减法与单数字切分
如果分词器将 `12893` 切成 `[128, 93]`，把 `45912` 切成 `[45, 912]`，这种不规则的切分会打乱竖式计算的数位对齐。现代分词器（如 Llama 3）通常在正则切分中强制将数字逐位切开（`0-9` 各占一个 Token），以提高模型的算术运算稳定性。

### 3. 空格对分词边界的影响
在 Byte-level BPE 中，空格会被当作普通字节参与合并。因此 `' world'`（带前缀空格）与 `'world'`（无前缀空格）对应不同的 Token ID。在设计 Prompt 时，尾部多余的空格可能会改变下一个 Token 的切分边界，从而影响补全结果。

### 4. 输入与输出的计费差异
在云服务商的 API 计费中，Output Token 通常显著贵于 Input Token：
- **Input 阶段（Prefill）**：用户输入的 Prompt 被一次性并行送入 GPU，计算核心利用率高，属于 **计算密集型（Compute-Bound）**；
- **Output 阶段（Decoding）**：自回归生成必须串行逐字预测，每生成一个 Token 都要从显存中重新加载模型权重与 KV Cache，受显存带宽限制，属于 **访存密集型（Memory-Bound）**。

因此，Output Token 的溢价反映了 GPU 串行推理时被闲置的计算带宽成本。

---

## 最小代码实现

以下代码演示了基于字节流的 BPE 统计与合并逻辑：

```python
def get_stats(ids):
    """统计相邻 Token 对的出现频次"""
    counts = {}
    for pair in zip(ids, ids[1:]):
        counts[pair] = counts.get(pair, 0) + 1
    return counts

def merge(ids, pair, idx):
    """将序列中的目标相邻对替换为新的 Token ID"""
    newids = []
    i = 0
    while i < len(ids):
        if i < len(ids) - 1 and ids[i] == pair[0] and ids[i+1] == pair[1]:
            newids.append(idx)
            i += 2
        else:
            newids.append(ids[i])
            i += 1
    return newids

def bpe_demo():
    raw_text = "aaabdaaabac"
    print("原始文本:", repr(raw_text))
    
    # 1. 转换为 UTF-8 字节序列 (基础词表 0-255)
    tokens = list(raw_text.encode("utf-8"))
    print("初始字节序列 (长度 %d):" % len(tokens), tokens)
    
    # 初始化词表映射: ID -> 字节串
    vocab = {idx: bytes([idx]) for idx in range(256)}
    
    # 2. 迭代执行 3 轮合并
    num_merges = 3
    for i in range(num_merges):
        stats = get_stats(tokens)
        if not stats:
            break
        top_pair = max(stats, key=stats.get)
        new_id = 256 + i
        tokens = merge(tokens, top_pair, new_id)
        vocab[new_id] = vocab[top_pair[0]] + vocab[top_pair[1]]
        print(f"第 {i+1} 步合并 {top_pair} -> 新ID {new_id} ({repr(vocab[new_id].decode())}), 频次: {stats[top_pair]}")
        
    print("\n合并后 Token 序列 (长度 %d):" % len(tokens), tokens)
    
    # 3. 解码验证
    decoded_bytes = b"".join(vocab[idx] for idx in tokens)
    print("解码还原文本:", repr(decoded_bytes.decode("utf-8")))

bpe_demo()
```

**控制台输出：**
```text
原始文本: 'aaabdaaabac'
初始字节序列 (长度 11): [97, 97, 97, 98, 100, 97, 97, 97, 98, 97, 99]
第 1 步合并 (97, 97) -> 新ID 256 ('aa'), 频次: 4
第 2 步合并 (256, 97) -> 新ID 257 ('aaa'), 频次: 2
第 3 步合并 (257, 98) -> 新ID 258 ('aaab'), 频次: 2

合并后 Token 序列 (长度 5): [258, 100, 258, 97, 99]
解码还原文本: 'aaabdaaabac'
```

---

## 核心概念辨析

- **按字符分词 vs 按词分词 vs 子词分词（BPE）**：
  - 按字符序列过长引发自注意力二次方计算开销；
  - 按词分词词表无限膨胀且存在 `<UNK>` 盲区；
  - BPE 通过高频对合并在序列长度与词表规模之间取得平衡。
- **Byte-level BPE vs 普通 BPE**：
  - 普通 BPE 以字符为基础，仍可能遇到未知字符；
  - Byte-level BPE 以 256 个 UTF-8 基础字节为底，从根本上消灭了未登录词。
- **小词表（32k）vs 大词表（128k+）**：
  - 小词表下非英语文本常被拆解为字节碎片，序列膨胀；
  - 大词表大幅提升多语言压缩率，降低计算与显存开销。
- **Prefill 阶段 vs Decoding 阶段**：
  - Prefill 阶段并行计算，受 GPU 算力限制（Compute-bound）；
  - Decoding 阶段串行逐字推理，受显存带宽限制（Memory-bound）。

分词器将文本转换为离散的 Token 后，大模型如何在有限的单次推理中容纳这些序列？下一篇我们将探讨——《上下文窗口与视野极限》。

---

## 参考文献

1. Sennrich, R., Haddow, B., & Birch, A. (2016). [*Neural Machine Translation of Rare Words with Subword Units*](https://arxiv.org/abs/1508.07909). ACL 2016 / arXiv:1508.07909.
2. Radford, A., Wu, J., Child, R., et al. (2019). [*Language Models are Unsupervised Multitask Learners*](https://cdn.openai.com/better-language-models/language_models_are_unsupervised_multitask_learners.pdf). OpenAI Technical Report (GPT-2 Byte-level BPE).
3. Kudo, T., & Richardson, J. (2018). [*SentencePiece: A simple and language independent subword tokenizer and detokenizer for Neural Text Processing*](https://arxiv.org/abs/1808.06226). EMNLP 2018 / arXiv:1808.06226.
4. Karpathy, Andrej. (2024). [*Let's build the GPT Tokenizer*](https://www.youtube.com/watch?v=zduSFxRajkE). YouTube / GitHub `minbpe`.
5. OpenAI. (2023). [*tiktoken: A fast BPE tokeniser for use with OpenAI's models*](https://github.com/openai/tiktoken).
