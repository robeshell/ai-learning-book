# 什么是大模型 · 事实笔记

复核：2026-08-19。本站独立调研，按 research skill 压缩为单篇 item，不引用外部视频底稿。

## 定义

- 大语言模型（Large Language Model, LLM）：在海量无标注文本上预训练的深度学习语言模型，主流架构几乎全为基于 Transformer 的自回归神经网络。
- 工业界与学术界口径：学术界（如 Zhao 等人综述 arXiv:2303.18223）通常以 100 亿（~10B）参数为讨论的分界线，但强调并不存在严格的物理界限；能力由参数量、数据质量与规模、训练总算力共同决定。
- 本质定位：不是自带真伪校验的知识数据库，而是高度压缩了人类语言与世界知识统计规律的“条件概率预测机器”。

## 机制

1. **预训练自回归学习（Pre-training & Next-Token Prediction）**：
   - 数据准备：收集数万亿 Token 的网页、书籍、代码和百科等开放语料，切分为 Token 序列。
   - 学习目标：以自监督方式，遮盖后续文本，要求模型根据前面的上下文 $x_{<t}$ 预测下一个片段 $x_t$ 的概率分布 $P(x_t \mid x_{<t}; \theta)$。
   - 梯度更新：计算交叉熵损失（Cross-Entropy Loss），反向传播更新数十亿至上万亿个权重参数，使模型在词表上的预测概率趋近真实语料分布。
2. **推理生成循环（Autoregressive Generation Loop）**：
   - 用户输入文本被转换为初始 Token 序列。
   - 模型单次前向传播，计算出词表中所有 Token 的候选概率（Logits -> Softmax）。
   - 采样器根据温度（Temperature）、Top-P 等策略选取一个 Token。
   - 选出的新 Token 被拼接至原文本末尾，作为下一步的新输入，再次送入模型。循环往复直到遇到结束标记（End-of-Sequence, EOS）或达到最大长度。
3. **规模效应（Scaling Laws）**：
   - Kaplan 等人（2020）与 Chinchilla（Hoffmann 等人，2022）标度律证明：在参数量 $N$、数据量 $D$ 和算力 $C$ 协同增长时，测试损失（Loss）呈现稳定的幂律下降。
   - 规模带来泛化与上下文学习（In-Context Learning）能力，但不保证事实正确性，流畅度是统计搭配的必然结果，事实性是外部约束的结果。
4. **分层架构（Three-tier System）**：
   - 顶层 · 产品层（Product/App）：网页或 App 界面、会话管理、System Prompt 隐藏预设、内容安全风控拦截、外挂搜索与工具。
   - 中层 · 对齐模型（Instruct/Chat Model）：经过 SFT（指令微调）和 RLHF/DPO（偏好对齐）的权重，学会听懂问答、保持助手口吻并拒绝危险请求。
   - 底层 · 基座模型（Base Model）：预训练完成的原始权重文件，只懂得按概率续写文本，是所有下游能力的物理基础。

## 必须核住的数字与来源

- **GPT-3 参数量与预训练**：1750 亿（175B）参数，在约 3000 亿 Token 数据上训练（Brown et al., NeurIPS 2020, arXiv:2005.14165）。
- **标度律经验公式**：测试损失 $L(N, D, C)$ 随参数 $N$、数据 $D$、计算量 $C$ 呈幂律衰减（Kaplan et al., arXiv:2001.08361, 2020; Hoffmann et al., arXiv:2203.15556, 2022）。
- **LLM 百亿口径与综述**：Zhao et al., *A Survey of Large Language Models*, arXiv:2303.18223 (2023)。
- **ChatGPT 产品上线日期**：2022 年 11 月 30 日（OpenAI 官方公告 *Introducing ChatGPT*）。

## 常见误解

1. **误解：大模型是能查阅资料的“超级搜索引擎”或“知识库”**
   - 纠偏：模型没有把网页或图书原文存储在内部，参数里存储的是高维数值权重（统计规律），生成是概率采样。它不具备实时自我核对真实世界事实的能力。
2. **误解：“大”意味着有了意识或神秘智能**
   - 纠偏：“大”是参数量（数十亿到数万亿）、训练语料（数万亿 Token）和算力（数万卡 GPU 集群数月运算）的工程规模，本质仍是高维数学函数的拟合。
3. **误解：句子通顺、语气笃定就等于内容属实**
   - 纠偏：流畅是语言模型自回归预测高频词汇搭配的天然属性；即使在完全捏造事实时，语法和逻辑连词依然可以极为严密。
4. **误解：ChatGPT 表现变好或变差直接等于底层模型升级或降智**
   - 纠偏：产品层经常静默调整系统提示词、温度参数、安全过滤机制或调度不同大小的模型版本，表现变化往往发生在产品或对齐策略层。

## 和上下篇的关系

- 前置依赖：无（作为全书第 1 篇，建立核心物理图景）。
- 承接后文：
  - 本篇讲大模型的宏观定义与运行框架；
  - 第 2 篇《什么是 Transformer》拆解模型内部如何通过自注意力并行计算词汇间联系与 QKV 机制；
  - 第 3 篇《什么是 Token》拆解文字如何被切分成数字编号并作为计费与显存的度量衡；
  - 第 7 篇《模型如何预测下一个词》深入 Logits、Softmax、温度与采样；
  - 第 10 篇《为什么大模型会幻觉》全面展开概率拟合与客观真实的鸿沟。

## 本篇不展开

- Transformer 的自注意力计算矩阵与 QKV 细节（留给第 2 篇）。
- Token 词表、BPE 分词算法与计费换算（留给第 3 篇）。
- 上下文窗口与 KV Cache（留给第 4、5 篇）。
- SFT、RLHF、DPO 的具体数学与训练工序（留给第 2 季第 3、4 篇）。
- 提示词工程与系统提示编写技巧（留给第 1 季第 8 篇）。

## 来源

1. Zhao, W. X., Zhou, K., Li, J., et al. (2023). [*A Survey of Large Language Models*](https://arxiv.org/abs/2303.18223). arXiv:2303.18223.
2. Kaplan, J., McCandlish, S., Henighan, T., et al. (2020). [*Scaling Laws for Neural Language Models*](https://arxiv.org/abs/2001.08361). arXiv:2001.08361.
3. Hoffmann, J., Borgeaud, S., Mensch, A., et al. (2022). [*Training Compute-Optimal Large Language Models*](https://arxiv.org/abs/2203.15556). arXiv:2203.15556.
4. Brown, T. B., Mann, B., Ryder, N., et al. (2020). [*Language Models are Few-Shot Learners*](https://arxiv.org/abs/2005.14165). NeurIPS 2020 / arXiv:2005.14165.
5. OpenAI. (2022-11-30). [*Introducing ChatGPT*](https://openai.com/index/chatgpt/).
