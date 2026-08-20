---
title: "合成数据与语料自造"
description: "语料枯竭对策、代码形式化判题与自造训练数据。"
series: how-models-train
chapter: raw-model
order: 2
type: concept
articleStatus: draft
prerequisites:
  - "pre-training"
videoSource: synthetic-data
---

# 合成数据与语料自造

根据标度律，训练千亿参数的大模型通常需要消耗十万亿至数十万亿级别的 Token。

据研究机构 Epoch AI 的测算，人类互联网上公开的高质量文本总量约为数十万亿 Token 级别。随着大模型训练规模的持续扩张，公开的高质量人类语料增长速度难以匹配算力扩张的需求。若仅将相同语料重复多轮训练，模型容易出现过拟合。

如何利用算法和模型自身生成训练数据？为什么在代码与数学领域合成数据能形成有效的能力提升，而在无约束的通识文本中滥用合成数据会导致模型崩溃？

本篇将从合成范式、形式化验证与分布坍缩机理出发，解析合成数据在模型训练中的应用与边界。

<figure>
  <img src="/figures/synthetic-data/verifiable-synthesis-loop.svg" alt="可验证领域的合成数据自造与判题闭环" />
  <figcaption>可验证合成数据自造与判题闭环</figcaption>
</figure>

---

## 合成数据的三种生成范式

**合成数据（Synthetic Data）** 指由算法规则、仿真环境或大语言模型自身生成并过滤出的训练语料。

在实际工程中，常见的生成范式主要包含以下三种：

### 1. 教科书式重构（Textbook Quality Rewriting）
互联网原始网页通常夹杂着大量冗余信息与低质排版。在微软 Phi 系列模型的研究中，团队利用能力更强的模型作为重构器，将互联网上的知识点提炼重写为**排版清晰、结构严谨的教材级正文与习题解析**。实验表明，通过提高单位 Token 的信息密度，较小规模的模型也能在专业测试中取得较好的表现。

### 2. 指令自动扩展（Self-Instruct / Evol-Instruct）
从少量高质量的人类种子指令（Seed Prompts）出发，引导模型演化生成新样本：
- **深度演化**：增加限制条件、复杂上下文与多步骤因果推理要求；
- **广度演化**：跨领域生成不同场景下的同类型任务；
- **任务逆向**：给定输入或输出片段，反向推导对应的指令背景。

### 3. 多样性扰动与模拟重构
在仿真环境中模拟多角色交互、长文档问答或结构化数据解析，通过规则脚本控制变量，批量生成覆盖长尾边界情况的测试与训练样本。

---

## 可验证领域的自造闭环

合成数据的核心挑战在于：**模型自身的生成不可避免地包含幻觉与逻辑漏洞**。若将包含事实错误的合成文本直接作为训练集，错误信息会被强化沉淀至新模型中。

因此，合成数据的有效应用主要建立在**客观可验证领域（Verifiable Domains）**——如代码开发与数学定理证明。

### 1. 外部确定性判题器（Ground-Truth Verifiers）
- **代码领域**：生成的代码不需要人工逐行审查，可直接输入沙箱环境执行**单元测试（Unit Tests）**。语法报错或用例失败的代码直接丢弃，通过全量测试的样本予以保留；
- **数学与逻辑领域**：计算结果可通过符号计算系统（如 SymPy）或形式化证明工具（如 Lean 4、Isabelle）进行严格的逻辑推导验证。

### 2. 拒绝采样（Rejection Sampling / Best-of-N）
针对复杂问题，利用模型采样生成多个不同的解答路径（如 64 个候选解）：
- 外部判题系统淘汰存在错误、死循环或结果偏差的候选解；
- 保留通过全量验证的有效推理链（Chain-of-Thought）；
- 将这些经过客观检验的样本加入后训练数据集。

这种机制使得模型能够在外部环境的确定性反馈下扩充高质量推理数据。

---

## 模型崩溃与方差坍缩

如果脱离外部客观环境的真伪校验，仅让模型无节制地吞食由自身或同代模型生成的非验证文本，会导致模型性能退化。

2024 年，牛津大学与剑桥大学等团队发表于《自然》（*Nature*）的研究指出了**模型崩溃（Model Collapse）**的物理与数学成因：

<figure>
  <img src="/figures/synthetic-data/model-collapse-distribution.svg" alt="递归自吞食导致的数据方差坍缩与模型崩溃" />
  <figcaption>模型崩溃与无监督自吞食方差坍缩</figcaption>
</figure>

### 1. 长尾信息丢失与概率均值收敛
- 人类真实语料包含丰富的小众事件、边缘领域知识与多样化的表达风格（宽分布与重长尾）；
- 统计生成模型在采样时倾向于选取高概率的主流词汇；
- 在多次递归生成与训练后，处于分布边缘的长尾低频信息逐步被判定为噪声并被过滤，导致生成数据的方差持续收缩。

### 2. 累积误差与分布漂移
未经校验的生成误差在多代递归中不断累积放大，最终导致模型输出退化为模板化的单一模式，丧失泛化表达能力。

### 3. 工程应对方案
- **保留真实人类数据基底**：在训练集中保留一定比例的高质量原始人类语料作为分布锚点；
- **严格的多阶段清洗与判别**：引入外部规则校验、LLM-as-a-Judge 评估器与去重聚类；
- **控制合成数据在通识领域的混合比例**。

---

## 最小代码实现

以下代码演示了一个简单的代码合成数据筛选流水线：模拟生成候选解并在隔离沙箱中执行单元测试，自动过滤出满足断言的有效样本：

```python
def count_vowels_solution_1(s: str) -> int:
    return sum(1 for char in s.lower() if char in 'aeiou')

def count_vowels_solution_2(s: str) -> int:
    return sum(1 for char in s if char in 'aeiou')  # 缺陷: 未处理大写

def count_vowels_solution_3(s: str) -> int:
    return len([c for c in s if c in 'aeiouy'])     # 缺陷: 误计 y

candidate_solutions = [
    {"id": "sol_1", "func": count_vowels_solution_1, "desc": "正确实现（考虑大小写）"},
    {"id": "sol_2", "func": count_vowels_solution_2, "desc": "缺陷实现（未处理大写）"},
    {"id": "sol_3", "func": count_vowels_solution_3, "desc": "错误实现（误计 y）"}
]

test_suite = [
    ("hello", 2),
    ("HELLO WORLD", 3),
    ("xyz", 0),
    ("Python Programming", 4),
    ("AEIOU aeiou", 10),
]

def verify_solution(fn, tests: list) -> bool:
    """在测试用例上执行断言校验"""
    try:
        for input_arg, expected in tests:
            if fn(input_arg) != expected:
                return False
        return True
    except Exception:
        return False

def synthetic_filter_demo():
    verified_dataset = []
    print("--- 沙箱判题与数据过滤 ---")
    for sol in candidate_solutions:
        passed = verify_solution(sol["func"], test_suite)
        status_str = "通过测试（保留）" if passed else "未通过（丢弃）"
        print(f"{sol['id']} ({sol['desc']}): {status_str}")
        if passed:
            verified_dataset.append(sol)
            
    print(f"\n有效样本数: {len(verified_dataset)} / {len(candidate_solutions)}")

synthetic_filter_demo()
```

**控制台输出：**
```text
--- 沙箱判题与数据过滤 ---
sol_1 (正确实现（考虑大小写）): 通过测试（保留）
sol_2 (缺陷实现（未处理大写）): 未通过（丢弃）
sol_3 (错误实现（误计 y）): 未通过（丢弃）

有效样本数: 1 / 3
```

---

## 核心概念辨析

- **自然人类语料 vs 合成数据**：
  - 自然人类语料真实度高、长尾覆盖广，但面临增长瓶颈；
  - 合成数据可通过算法规模化生成，但需要建立质量把控机制。
- **可验证领域 vs 开放式生成**：
  - 代码与数学等领域具备明确的外部校验工具（编译器、断言、形式化证明），能构建自验证闭环；
  - 开放式文本缺乏确定性的事实校验手段，需要更谨慎的过滤策略以防范幻觉污染。
- **数据增强 vs 模型崩溃**：
  - 有效的数据增强通过多视角演化与外部校验扩充数据边界；
  - 模型崩溃是无监督递归自吞食导致的长尾丢失与方差衰减。

通过预训练与合成数据构建出具备丰富知识的基座模型后，如何让模型学会理解人类指令、按规范格式作答？下一篇我们将探讨后训练的第一步——《SFT 指令微调》。

---

## 参考文献

1. Gunasekar, Suriya, Zhang, Yi, Aneja, Jyoti, et al. (2023). [*Textbooks Are All You Need (Phi-1)*](https://arxiv.org/abs/2306.11644). arXiv:2306.11644.
2. Shumailov, Ilia, Shumaylov, Zakhar, Zhao, Yiren, et al. (2024). [*AI models collapse when trained on recursively generated data*](https://www.nature.com/articles/s41586-024-07566-y). Nature, 631(8022), 755-759.
3. Wang, Yizhong, Kordi, Yeganeh, Mishra, Swaroop, et al. (2022). [*Self-Instruct: Aligning Language Models with Self-Generated Instructions*](https://arxiv.org/abs/2212.10560). ACL 2023 / arXiv:2212.10560.
4. Villalobos, Jaime, Sevilla, Jaime, Heim, Lennart, et al. (2022). [*Will we run out of data? Limits of LLM scaling on human-generated data*](https://arxiv.org/abs/2211.04325). Epoch AI / arXiv:2211.04325.
