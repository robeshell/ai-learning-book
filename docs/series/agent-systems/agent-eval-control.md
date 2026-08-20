---
title: "评测基准与人在回路"
description: "任务评测基准、人在回路审批与质量回归体系。"
series: agent-systems
chapter: scale-security
order: 8
type: concept
articleStatus: draft
prerequisites:
  - "agent-harness"
  - "prompt-injection"
videoSource: agent-eval-control
---

# 评测基准与人在回路

在传统大模型评测中，我们习惯于查看 MMLU、GSM8K 或 HumanEval 等静态基准。这些测试只要求模型根据给定的 Prompt 单步输出一个答案，然后计算文本匹配度或代码通过率。

然而，在智能体（Agent）系统中，**静态评测彻底失效了**。

一个在 MMLU 上得分 90% 的顶级模型，在真实软件仓库中自主修复 Bug 时，可能会因为陷入死循环、选错工具或曲解报错信息而完全卡死。

如何客观量化一个智能体系统的实战能力？如何在赋予其强大能力的同时，用「人在回路」与可观测性防止其失控？

这就是智能体工程化落地的最后一道防线——**评测基准（Agent Eval）与人在回路（Human-in-the-Loop, HITL）**。

<figure>
  <img src="/figures/agent-eval-control/agent-eval-dimensions.svg" alt="静态问答评测 vs 智能体多步轨迹评测" />
  <figcaption>静态问答与智能体轨迹评测对比</figcaption>
</figure>

---

## 多步环境状态断言评测

智能体评测与传统大模型评测存在本质差异：

| 评估维度 | 传统模型评测（Static Eval） | 智能体评测（Agent Trajectory Eval） |
| :--- | :--- | :--- |
| **交互轮次** | 单轮输入 $\to$ 单轮输出 | 多轮「思考 $\to$ 行动 $\to$ 观察」闭环 |
| **环境交互** | 无外部环境，纯文本闭环 | 真实/模拟沙箱（文件系统、Shell、网络） |
| **评价标准** | 文本相似度、选择题正确率 | **最终物理环境状态断言（State Assertion）** |
| **考核指标** | 准确率（Accuracy） | 任务完成率、步数效率、Token 成本、自愈胜率 |

### 业界主流智能体评测基准
1. **SWE-bench（软件工程领域基准，Jimenez et al., 2024）**：
   - 提取 GitHub 真实开源仓库中的真实 Issue 与 Pull Request；
   - 智能体必须阅读代码、定位 Bug、生成 Git Diff 补丁；
   - **判定标准绝对客观**：运行仓库原生的回归测试套件，只有所有测试 100% Pass 才算成功。
2. **WebArena / OSWorld（网页与操作系统交互基准，Zhou et al., 2023; Xie et al., 2024）**：
   - 在沙箱中搭建真实且可交互的电商、论坛、Git 托管平台或桌面操作系统；
   - 评测智能体点击、打字、表单提交的多步轨迹，以数据库最终数据变动为判定依据。
3. **GAIA（通用 AI 助手多模态基准，Mialon et al., 2023）**：
   - 包含复杂的多步骤任务（如结合多模态查阅 PDF 财报、计算数据并填入 Excel 表格）；
   - 强调事实答案的绝对唯一性与不可作弊性。

---

## 全链路追踪与归因分析

在多步智能体运行中，一旦任务失败，工程师面临的最大难题是**根因定位（Root Cause Attribution）**：
- 是基座大模型理解错了用户意图？
- 还是宿主提供的工具参数说明（Tool Schema）存在歧义？
- 还是第三方 API 偶发超时？
- 亦或是上下文过长导致关键记忆被轮替遗忘？

工业级智能体框架必须集成**分布式链路追踪（Distributed Tracing，如 LangSmith、OpenTelemetry 规范）**，将智能体单次任务执行展开为完整的树状 Span：

$$\text{Trace} = \Big[ \text{RunTask} \to \big( \text{Span}_{\text{Think}} \to \text{Span}_{\text{ToolCall}} \to \text{Span}_{\text{Obs}} \big) \times N \Big]$$

记录每一轮交互的耗时、Token 消耗、输入输出与环境 Diff，让偶发性失败变得完全可复现、可定位。

---

## 人在回路与风险分级

自动化虽然高效，但在生产环境中直接让智能体拥有无限权限无异于自杀。必须引入**人在回路（Human-in-the-Loop）**，根据动作的破坏性建立分级治理体系：

<figure>
  <img src="/figures/agent-eval-control/hitl-governance-pyramid.svg" alt="智能体风险分级与人在回路（HITL）治理体系" />
  <figcaption>智能体风险分级与人在回路治理架构</figcaption>
</figure>

1. **Level 0：只读安全动作（完全自主执行）**
   - 例如：搜索网络、读取文件、查询只读数据库；
   - **策略**：零人工干预，最大化系统并发与响应速度。
2. **Level 1：低危可逆写操作（沙箱隔离 + 事后审计）**
   - 例如：创建临时分支、写入缓存、修改草稿文件；
   - **策略**：允许自主执行，但必须限制在独立沙箱中，支持一键版本回滚。
3. **Level 2：高危不可逆操作（强制人工审批卡点）**
   - 例如：删除生产数据库、向客户外发正式邮件、调用支付接口；
   - **策略**：**宿主底层硬性阻断**，必须向人类运维弹出交互式审查窗口，只有人类授权后才放行底层执行。

---

## 最小代码实现

下面的代码演示了一个极简的 **Agent Eval Runner**：在隔离环境中加载测试用例，运行智能体，并通过环境状态断言计算最终的任务成功率、平均步数与成本：

```python
from typing import Dict, Any, List, Callable

class EvalTestCase:
    def __init__(self, task_id: str, prompt: str, initial_state: Dict[str, Any], ground_truth_check: Callable[[Dict[str, Any]], bool]):
        self.task_id = task_id
        self.prompt = prompt
        self.initial_state = initial_state
        self.ground_truth_check = ground_truth_check

class MockAgent:
    """模拟一个根据环境状态进行多步操作的智能体"""
    def run(self, prompt: str, env_state: Dict[str, Any]) -> int:
        steps = 0
        if "修复测试" in prompt:
            # 步骤 1: 读取代码
            steps += 1
            # 步骤 2: 修改环境中的状态
            steps += 1
            env_state["tests_passed"] = True
            env_state["bug_fixed"] = True
        elif "整理报表" in prompt:
            steps += 1
            env_state["report_generated"] = True
        return steps

class AgentEvalHarness:
    def __init__(self, test_suite: List[EvalTestCase]):
        self.test_suite = test_suite

    def run_eval(self, agent: MockAgent) -> Dict[str, Any]:
        passed_count = 0
        total_steps = 0

        print(f"--- 开始执行 Agent 自动化回归评测 (共 {len(self.test_suite)} 个测试用例) ---\n")

        for test in self.test_suite:
            # 1. 深度拷贝初始状态，确保测试用例沙箱隔离
            env = test.initial_state.copy()
            
            # 2. 运行智能体
            steps = agent.run(test.prompt, env)
            total_steps += steps
            
            # 3. 执行最终物理状态断言 (Ground Truth Assertion)
            is_success = test.ground_truth_check(env)
            if is_success:
                passed_count += 1
                status = "PASS"
            else:
                status = "FAIL"
            
            print(f"[{status}] 用例 {test.task_id} | 消耗步数: {steps} | 目标达成: {is_success}")

        pass_rate = (passed_count / len(self.test_suite)) * 100
        avg_steps = total_steps / len(self.test_suite)

        return {
            "total_cases": len(self.test_suite),
            "passed_cases": passed_count,
            "pass_rate_pct": pass_rate,
            "avg_steps": avg_steps
        }

# 构建基准测试集
suite = [
    EvalTestCase(
        task_id="SWE-001",
        prompt="修复测试用例中的除以零异常",
        initial_state={"tests_passed": False, "bug_fixed": False},
        ground_truth_check=lambda env: env.get("tests_passed") is True and env.get("bug_fixed") is True
    ),
    EvalTestCase(
        task_id="BI-002",
        prompt="整理报表并导出为 PDF",
        initial_state={"report_generated": False},
        ground_truth_check=lambda env: env.get("report_generated") is True
    )
]

# 运行评测
runner = AgentEvalHarness(suite)
metrics = runner.run_eval(MockAgent())

print("\n--- 评测汇总报告 ---")
pass_pct = metrics["pass_rate_pct"]
passed = metrics["passed_cases"]
total = metrics["total_cases"]
avg_s = metrics["avg_steps"]
print(f"通过率: {pass_pct:.1f}% ({passed}/{total})")
print(f"平均步数: {avg_s:.1f} 步/任务")
```

**控制台输出：**
```text
--- 开始执行 Agent 自动化回归评测 (共 2 个测试用例) ---

[PASS] 用例 SWE-001 | 消耗步数: 2 | 目标达成: True
[PASS] 用例 BI-002 | 消耗步数: 1 | 目标达成: True

--- 评测汇总报告 ---
通过率: 100.0% (2/2)
平均步数: 1.5 步/任务
```

---

## 核心概念辨析

- **静态基准 vs 智能体基准**：
  - 静态基准（MMLU）只看单步文本预测；
  - 智能体基准（SWE-bench）看多步环境交互与最终物理测试断言。
- **无感运行 vs 人在回路（HITL）**：
  - 只读与低危动作可全自动执行，提升效率；
  - 高危不可逆动作必须由宿主拦截并向人类审批，守住安全红线。
- **黑盒报错 vs 全链路 Tracing**：
  - 仅靠最终报错信息无法改进智能体；
  - 必须通过 Tracing 将每一步 Thought、Action、Observation 具象化，进行精准归因。

至此，我们已经完整走完了第四季《智能体系统》的全部核心架构：从 ReAct 循环、宿主底座、三级记忆、动态规划，到多智能体协作、终端与图形交互、安全攻防以及评测治理。

第五季《多模态与边界》我们将进入全新视野：大模型如何看懂图像、听懂声音，以及在端侧设备和超长上下文下的物理极限与认知退化。

---

## 参考文献

1. Jimenez, Carlos E., Yang, John, Wettig, Alexander, et al. (2024). [*SWE-bench: Can Language Models Resolve Real-World GitHub Issues?*](https://arxiv.org/abs/2310.06770). ICLR 2024 / arXiv:2310.06770.
2. Zhou, Shuyan, Xu, Frank F., Zhu, Hao, et al. (2023). [*WebArena: A Realistic Web Environment for Building Autonomous Agents*](https://arxiv.org/abs/2307.13854). ICLR 2024 / arXiv:2307.13854.
3. Mialon, Grégoire, Fourrier, Clémentine, Swift, Craig, et al. (2023). [*GAIA: A Benchmark for General AI Assistants*](https://arxiv.org/abs/2311.12983). ICLR 2024 / arXiv:2311.12983.
4. Xie, Tianbao, Zhang, Deyi, Chen, Jiau, et al. (2024). [*OSWorld: Benchmarking Multimodal Agents for Open-Ended Tasks in Real Computer Environments*](https://arxiv.org/abs/2404.07972). arXiv:2404.07972.
