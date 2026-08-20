---
title: "AI Agent 自主闭环"
description: "思考行动观察闭环、自主停机与动态决策。"
series: agent-systems
chapter: loop
order: 1
type: concept
articleStatus: draft
prerequisites:
  - "tool-calling"
videoSource: agent-loop
---

# AI Agent 自主闭环

在前面的章节中，我们学习了大模型如何通过 Tool Calling 调用外部接口。

然而，拥有工具并不等于拥有「自主办事」的能力。如果你给传统的聊天机器人下达一个指令：*“帮我把最新的代码部署上线”*，它只会洋洋洒洒地列出五条建议，然后**停留在单次回复上，等待人类自己去动手操作**。

如何让大模型从一个「嘴上给建议的顾问」，进化为「能够领受目标、自主拆解步骤、调用工具、观察反馈、纠正错误直到彻底交付结果的执行者」？

这就是人工智能走向自主化行动的核心范式——**AI Agent（智能体）与自主执行闭环**。

<figure>
  <img src="/figures/agent-loop/chatbot-vs-agent-execution.svg" alt="Chatbot 聊天机器人与 AI Agent 智能体执行流对比" />
  <figcaption>Chatbot 单次应答 vs Agent 自主循环</figcaption>
</figure>

---

## 控制流驱动与长程循环

两者的核心差异不在于模型参数的大小，而在于**系统控制流的驱动逻辑**：

- **Chatbot（单次被动响应）**：
  - 控制流是线性的：`Request ➔ Model ➔ Response`；
  - 默认停留在单次输出，没有环境状态感知的长程闭环，遇到错误不会自动纠正，必须等待人类下一轮输入。
- **AI Agent（目标导向自主循环）**：
  - 控制流是**循环迭代的（Agent Loop）**：`Goal ➔ [Thought ➔ Action ➔ Observation]* ➔ Finish`；
  - 宿主系统维持一个自循环引擎，大模型根据外界环境的真实反馈，自主决定下一轮是继续修 Bug、查资料、还是结束任务。

---

## ReAct 思考与行动闭环

2022 年，普林斯顿大学与 Google 团队在论文 [*ReAct: Synergizing Reasoning and Acting in Language Models*](https://arxiv.org/abs/2210.03629) 中提出了现代智能体最经典的标准架构：

<figure>
  <img src="/figures/agent-loop/react-cycle-loop.svg" alt="ReAct 范式 Thought-Action-Observation 闭环" />
  <figcaption>ReAct 思考、行动与观察反馈闭环</figcaption>
</figure>

1. **Thought（推理思考）**：
   - 模型在调用工具前，首先用自然语言在上下文轨迹中写下当前的分析与推理：*“当前目标是跑通测试，我需要先执行 pytest 命令”*；
   - 这一步为大模型提供了结构化的工作记忆，理清逻辑脉络。
2. **Action（动作派发）**：
   - 模型自回归输出具体的工具调用参数包（如 `run_shell({"cmd": "pytest"})`），并触发 EOS 挂起推理；
   - 外部宿主环境拦截并物理执行该动作。
3. **Observation（观察反馈）**：
   - 宿主程序将外部真实的执行结果（如 `FAILED: test_auth.py:42 断言失败`）作为确凿事实回填至上下文；
   - **真实反馈打破了模型的主观臆想，强制模型面对物理现实**。
4. **循环自愈（Self-Correction Loop）**：
   - 模型阅读 Observation 中的报错，触发下一轮 Thought：*“发现第 42 行鉴权逻辑报错，我需要读取 auth.py 文件进行修复”*；
   - 持续循环，直至所有测试通过。

---

## 停机条件与熔断防线

既然 Agent 是一个 `while` 循环，就必须建立**不可逾越的停机条件（Termination Guardrails）**：

1. **目标达成（Task Complete）**：模型主动输出 `finish_task(result)`，向人类交付最终成果；
2. **最大迭代步数熔断（Max Steps Limit）**：为了防止模型陷入死循环（如反复报错、反复以相同参数重试），宿主底盘通常硬编码最大循环轮数（如 15~30 步），超限自动熔断挂起；
3. **Token 与成本上限（Budget Cap）**：单次任务消耗的 API Token 或资金达到阈值时强行暂停；
4. **人类主动打断（Human Interrupt）**：人类在控制台随时按下 `Ctrl+C` 或点击终止按钮接管控制权。

---

## 最小代码实现

下面的代码实现了一个极简的 ReAct 智能体循环：包含环境状态模拟、工具执行、Observation 回填与最大步数保护：

```python
import json
from typing import Dict, Any

class MockEnvironment:
    """模拟一个包含待修复代码的真实外部环境"""
    def __init__(self):
        self.code_has_bug = True
        
    def execute_tool(self, action: str, args: Dict[str, Any]) -> str:
        if action == "run_test":
            if self.code_has_bug:
                return "FAIL: test_auth() 校验失败 (预期 200, 实际 401)"
            return "SUCCESS: 全部 12 个单元测试通过！"
        elif action == "fix_code":
            self.code_has_bug = False
            return "SUCCESS: 已经将 auth.py 修复并保存。"
        elif action == "finish":
            summary = args.get("summary", "")
            return f"TASK FINISHED: {summary}"
        return f"ERROR: 未知动作 '{action}'"

def run_agent_loop(goal: str, max_steps: int = 5):
    env = MockEnvironment()
    context = [f"【初始目标】：{goal}"]
    
    print(f"--- 启动 Agent 自主闭环，目标: {goal} ---\n")
    
    for step in range(1, max_steps + 1):
        print(f"--- 迭代第 {step} 轮 ---")
        
        # 1. 模拟模型结合当前上下文产生的 Thought & Action
        if step == 1:
            thought = "首先需要跑一遍测试，确认具体失败原因。"
            action = "run_test"
            args = {}
        elif step == 2:
            thought = "测试报错 401 鉴权失败，我需要调用 fix_code 修复鉴权缺陷。"
            action = "fix_code"
            args = {"file": "auth.py"}
        elif step == 3:
            thought = "代码修复完毕，重新跑测试验证是否彻底解决。"
            action = "run_test"
            args = {}
        else:
            thought = "测试已完全通过，任务圆满达成！"
            action = "finish"
            args = {"summary": "代码缺陷已修复，且 100% 通过测试。"}
            
        print(f"[Thought]: {thought}")
        print(f"[Action ]: {action}({args})")
        
        # 2. 宿主环境执行动作，获取真实反馈
        obs = env.execute_tool(action, args)
        print(f"[Observation]: {obs}\n")
        
        # 3. 检查停机条件
        if action == "finish":
            print("[停机成功] Agent 达成目标并退出循环。")
            return
            
        context.append(f"Thought {step}: {thought}\nAction {step}: {action}\nObs {step}: {obs}")
        
    print("[安全熔断] 达到最大步数上限，强行终止。")

run_agent_loop("修复项目鉴权漏洞并验证测试")
```

**控制台输出：**
```text
--- 启动 Agent 自主闭环，目标: 修复项目鉴权漏洞并验证测试 ---

--- 迭代第 1 轮 ---
[Thought]: 首先需要跑一遍测试，确认具体失败原因。
[Action ]: run_test({})
[Observation]: FAIL: test_auth() 校验失败 (预期 200, 实际 401)

--- 迭代第 2 轮 ---
[Thought]: 测试报错 401 鉴权失败，我需要调用 fix_code 修复鉴权缺陷。
[Action ]: fix_code({'file': 'auth.py'})
[Observation]: SUCCESS: 已经将 auth.py 修复并保存。

--- 迭代第 3 轮 ---
[Thought]: 代码修复完毕，重新跑测试验证是否彻底解决。
[Action ]: run_test({})
[Observation]: SUCCESS: 全部 12 个单元测试通过！

--- 迭代第 4 轮 ---
[Thought]: 测试已完全通过，任务圆满达成！
[Action ]: finish({'summary': '代码缺陷已修复，且 100% 通过测试。'})
[Observation]: TASK FINISHED: 代码缺陷已修复，且 100% 通过测试。

[停机成功] Agent 达成目标并退出循环。
```

---

## 核心概念辨析

- **Chatbot vs AI Agent**：
  - Chatbot 是单次请求即停机的对话建议者；
  - Agent 是在环境反馈中持续迭代、直到交付结果的自主执行者。
- **纯推理（Reason-only） vs 纯行动（Act-only） vs ReAct 闭环**：
  - 纯推理只有内部思维链，无法获知外部物理状态变化；
  - 纯行动盲目调用工具，缺乏对前后依赖的全局逻辑推演；
  - ReAct 将推理与外部观察交织在同一条轨迹上，具备极高的纠错自愈力。
- **无限循环死锁 vs 停机熔断防线**：
  - 循环本身只提供行动可能，不保证一定做对；
  - 必须由外部宿主强制施加最大步数、成本上限与人工打断安全硬防线。

驱动这个自主闭环平稳运转的宿主平台被称为「底盘（Harness）」，它如何管理进程生命周期、超时恢复与上下文裁剪？下一篇我们将探讨——《Harness 智能体底盘》。

---

## 参考文献

1. Yao, Shunyu, Zhao, Jeffrey, Yu, Dian, et al. (2022). [*ReAct: Synergizing Reasoning and Acting in Language Models*](https://arxiv.org/abs/2210.03629). ICLR 2023 / arXiv:2210.03629.
2. Wang, Lei, Ma, Chen, Feng, Xueyang, et al. (2023). [*A Survey on Large Language Model based Autonomous Agents*](https://arxiv.org/abs/2308.11432). Frontiers of Computer Science / arXiv:2308.11432.
3. Anthropic. (2024). [*Building Effective Agents: Workflows and Autonomous Agents*](https://www.anthropic.com/research/building-effective-agents). Anthropic Research.
4. Shinn, Noah, Cassano, Federico, Gopinath, Ashwin, et al. (2023). [*Reflexion: Language Agents with Verbal Reinforcement Learning*](https://arxiv.org/abs/2303.11366). NeurIPS 2023 / arXiv:2303.11366.
