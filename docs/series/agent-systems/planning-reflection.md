---
title: "任务规划与自我反思"
description: "任务拆解、执行反馈自检与自愈重试工程边界。"
series: agent-systems
chapter: loop
order: 4
type: concept
articleStatus: draft
prerequisites:
  - "agent-loop"
videoSource: planning-reflection
---

# 任务规划与自我反思

在前面的章节中，我们看到了智能体如何通过 ReAct 循环一步步执行工具。

然而，在面对高复杂度的工程级任务（例如*“将整个单体应用重构为微服务，并完成数据库迁移与全量测试”*）时，单纯依赖 ReAct 的「走一步看一步」会迅速陷入**局部贪心陷阱**：
- 模型容易在第一步就盲目修改底层代码，改到一半发现上层依赖全断，陷入进退两难；
- 缺乏全局宏观蓝图，导致中间步骤遗漏关键安全卡点，无法保证长程任务的交付质量。

如何让智能体像资深架构师一样，先制定全局蓝图、分步推进，并在遭遇报错时深度反思、自主修复？

这就是智能体高阶推理的核心机制——**任务规划（Planning）与自我反思（Self-Reflection）**。

<figure>
  <img src="/figures/planning-reflection/plan-and-solve-dynamic.svg" alt="Plan-and-Solve 任务规划与动态重规划机制" />
  <figcaption>规划拆解与动态重规划流转</figcaption>
</figure>

---

## 任务拆解与动态重规划

2023 年，学术界提出了 **Plan-and-Solve 范式**，将复杂任务的解决解耦为两个明确阶段：

### 1. 全局任务拆解（Task Decomposition）
- 在动写任何一行代码前，智能体首先进行宏观推演，将大目标拆解为一个**有向无环图（DAG）或线性步骤清单**：
  ```markdown
  - [ ] 步骤 1: 扫描当前系统接口定义与测试覆盖现状
  - [ ] 步骤 2: 设计并创建新版微服务目录与数据表 Schema
  - [ ] 步骤 3: 迁移核心业务逻辑并编写适配层
  - [ ] 步骤 4: 运行全量集成测试并输出回归测试报告
  ```
- 明确每一个步骤的前置依赖与预期交付物，显著降低单次行动时的认知负担。

### 2. 动态重规划（Dynamic Re-planning）
- 现实环境充满了不确定性。当执行到步骤 2 时，如果工具报错*“发现历史数据表中包含非法遗留枚举值”*；
- 智能体不会当场崩溃，而是**动态调整任务计划表**，在步骤 2 之后即时插入 `[ ] 步骤 2.1: 编写数据清洗补丁转换旧枚举`，自适应应对现实环境变化。

---

## 报错反馈与反思自愈

<figure>
  <img src="/figures/planning-reflection/reflexion-self-healing-loop.svg" alt="Reflexion 自我反思与可验证反馈自愈闭环" />
  <figcaption>反思自愈机制与客观可验证边界</figcaption>
</figure>

许多人对智能体的「反思」抱有拟人化的误解，以为是模型突然产生了良知或灵光一现。

**自我反思（Reflexion）的物理本质，是将外部物理世界的客观报错信号（Compiler Error / Test Failure / Linter Warning），编译转化为下一轮大模型推断的显式条件提示词！**

1. **执行尝试（Actor Trial）**：模型生成了第一版修复代码；
2. **客观裁判（Evaluator Judge）**：宿主环境运行 `pytest`，捕获到确凿的 Traceback 报错；
3. **反思沉淀（Verbal Reflection）**：模型阅读报错详情，生成自检日志：*“上一次尝试失败的原因是漏掉了非空判断，在下一轮中必须先对 user_id 做 None 校验”*；
4. **自愈纠错（Self-Healing）**：将反思日志作为上下文依据，指导模型生成第二版代码，直至测试 100% 变绿。

---

## 可验证与不可验证边界

工程师必须清醒认识到自我反思的**适用物理边界**：

1. **客观可验证领域（Verifiable Domains）**：
   - 典型场景：代码编译、单元测试、SQL 查询、数学定理证明；
   - 特点：拥有不讲情面的「绝对裁判（编译器/测试套件）」，反思纠错具有强烈的确定性收敛趋势，**自愈胜率极高**。
2. **主观不可验证领域（Non-Verifiable Domains）**：
   - 典型场景：营销文案润色、主观艺术审美、闲聊陪伴；
   - 特点：缺乏客观的判决标准。如果让模型对自己生成的文案进行反思重写，模型容易陷入「左右互搏、越改越平庸」的**无限空转陷阱**。
   - 工程原则：**主观任务严禁开启无上限的反思自愈循环，必须引入人类打分（Human-in-the-loop）或硬编码单次交付。**

---

## 最小代码实现

下面的代码演示了完整的规划、执行、捕获真实测试报错、触发 Reflexion 自我反思纠正并最终自愈的全流程：

```python
from typing import List, Dict, Any

class CodeSandbox:
    """模拟一个客观代码评测沙箱"""
    def run_tests(self, code: str) -> Dict[str, Any]:
        if "if user is None:" not in code:
            return {"passed": False, "error": "NullPointerException: user 对象可能为 None，导致 user.id 读取崩溃"}
        return {"passed": True, "error": None}

def run_planning_and_reflection():
    sandbox = CodeSandbox()
    
    # 1. Plan 阶段: 拆解步骤
    plan = [
        "1. 分析用户函数逻辑缺陷",
        "2. 编写补丁代码",
        "3. 提交沙箱运行测试验证"
    ]
    print("--- 步骤规划清单 ---")
    for p in plan:
        print(f"  {p}")
    print()

    # 2. 执行与 Reflexion 自愈循环 (最大重试 3 轮)
    max_retries = 3
    reflections = []
    
    for attempt in range(1, max_retries + 1):
        print(f"--- 尝试第 {attempt} 次提交修复 ---")
        
        # 模拟模型根据历史反思生成的代码
        if attempt == 1:
            code_attempt = "def get_user_id(user):\n    return user.id"  # 初次尝试：漏了判空
        else:
            print(f"[结合前序反思]: {reflections[-1]}")
            code_attempt = "def get_user_id(user):\n    if user is None:\n        return None\n    return user.id"
            
        print(f"[生成代码]:\n{code_attempt}")
        
        # 客观沙箱裁判
        result = sandbox.run_tests(code_attempt)
        
        if result["passed"]:
            print(f"[测试通过] 第 {attempt} 次尝试成功通过沙箱验证！任务完成。\n")
            break
        else:
            error_msg = result["error"]
            print(f"[沙箱报错]: {error_msg}")
            
            # 触发 Reflexion 反思
            reflection_thought = f"反思：第 {attempt} 次测试报错 '{error_msg}'，必须增加判空分支。"
            reflections.append(reflection_thought)
            print(f"[反思沉淀]: {reflection_thought}\n")

run_planning_and_reflection()
```

**控制台输出：**
```text
--- 步骤规划清单 ---
  1. 分析用户函数逻辑缺陷
  2. 编写补丁代码
  3. 提交沙箱运行测试验证

--- 尝试第 1 次提交修复 ---
[生成代码]:
def get_user_id(user):
    return user.id
[沙箱报错]: NullPointerException: user 对象可能为 None，导致 user.id 读取崩溃
[反思沉淀]: 反思：第 1 次测试报错 'NullPointerException: user 对象可能为 None，导致 user.id 读取崩溃'，必须增加判空分支。

--- 尝试第 2 次提交修复 ---
[结合前序反思]: 反思：第 1 次测试报错 'NullPointerException: user 对象可能为 None，导致 user.id 读取崩溃'，必须增加判空分支。
[生成代码]:
def get_user_id(user):
    if user is None:
        return None
    return user.id
[测试通过] 第 2 次尝试成功通过沙箱验证！任务完成。
```

---

## 核心概念辨析

- **即兴单步试错 vs Plan 全局规划**：
  - 即兴单步容易陷入局部最优与死胡同；
  - Plan 规划先建立依赖拓扑与进度看板，长任务可控可追溯。
- **拟人良知 vs 报错反馈驱动的反思（Reflexion）**：
  - 反思不是凭空产生的顿悟；
  - 反思是将外部编译和测试报错转换为提示词输入，在下一轮概率采样中定向纠偏。
- **客观可验证 vs 主观不可验证**：
  - 代码与数据等可检验领域自愈胜率极高；
  - 文案与审美等主观领域反思容易空转自嗨，必须设置严格的预算与人工终止防线。

单智能体能力再强，也受限于单进程与单上下文窗口。如何让多个专门智能体分工协同、互相监督？下一篇我们将探讨——《多智能体协同与分工》。

---

## 参考文献

1. Wang, Lei, Xu, Wanyu, Lan, Yujie, et al. (2023). [*Plan-and-Solve Prompting: Improving Zero-Shot Chain-of-Thought Reasoning by Large Language Models*](https://arxiv.org/abs/2305.04091). ACL 2023 / arXiv:2305.04091.
2. Shinn, Noah, Cassano, Federico, Gopinath, Ashwin, et al. (2023). [*Reflexion: Language Agents with Verbal Reinforcement Learning*](https://arxiv.org/abs/2303.11366). NeurIPS 2023 / arXiv:2303.11366.
3. Yao, Shunyu, Yu, Dian, Zhao, Jeffrey, et al. (2023). [*Tree of Thoughts: Deliberate Problem Solving with Large Language Models*](https://arxiv.org/abs/2305.10601). NeurIPS 2023 / arXiv:2305.10601.
4. Madaan, Aman, Tandon, Niket, Gupta, Prakhar, et al. (2023). [*Self-Refine: Iterative Refinement with Self-Feedback*](https://arxiv.org/abs/2303.17651). NeurIPS 2023 / arXiv:2303.17651.
