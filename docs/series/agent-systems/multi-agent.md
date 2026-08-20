---
title: "多智能体协同与分工"
description: "多智能体角色分工、总线通信与协作拓扑模式。"
series: agent-systems
chapter: scale-security
order: 5
type: concept
articleStatus: draft
prerequisites:
  - "agent-loop"
videoSource: multi-agent
---

# 多智能体协同与分工

在前面的章节中，我们探讨了单智能体（Single Agent）的闭环与规划。

然而，当面对真实工业界的大规模软件开发与复杂业务中台时，单智能体架构很快会撞上**三大不可逾越的物理瓶颈**：
1. **角色冲突（Role Confusion）**：同一个模型实例既当「业务开发者」又当「安全审计员」，容易产生严重的认知偏置与自我放水，难以客观挑出自己的逻辑漏洞；
2. **工具列表膨胀（Tool Explosion）**：如果在一个 Prompt 中塞入 50 个不同微服务的 API 声明，大模型在单步推理中选错工具、传错参数的概率会呈指数级飙升；
3. **上下文雪崩污染（Context Pollution）**：单条长程轨迹中如果混杂了 500 次文件扫描的巨量日志，整个工作窗口会被垃圾信息填满，导致模型对核心目标的注意力彻底涣散。

为了突破单智能体的物理极限，智能体系统演化出了现代分布式架构——**多智能体协同（Multi-Agent Systems, MAS）**。

<figure>
  <img src="/figures/multi-agent/multi-agent-topologies.svg" alt="多智能体三大经典协作拓扑模式" />
  <figcaption>流水线、主从与对抗辩论协作拓扑</figcaption>
</figure>

---

## 关注点分离与上下文物理隔离

在多智能体系统设计中，一个常见的直觉假设是：*“接入更多 Agent 开展自由群聊讨论，是否就能提升任务成功率？”*

**事实恰恰相反。盲目的多 Agent 自由闲聊不仅不会提高准确率，反而会导致「幻觉放大（Hallucination Cascades）」与严重的 Token 浪费。**

多智能体架构在工程上的真正价值只有两点：
1. **关注点分离（Separation of Concerns）**：每个专职子 Agent 拥有极简、纯粹的 System Prompt 和针对性的最小工具集（如专职负责查库的 Explorer、专职写代码的 Coder、专职找茬的 Reviewer）；
2. **上下文物理隔离（Context Isolation）**：子 Agent 在独立的执行沙箱中消耗数万 Token 吃掉探索噪声，任务完成后**仅向主控交付精炼的结构化结论**，子窗口当场销毁，保持主控上下文的绝对纯净。

<figure>
  <img src="/figures/multi-agent/supervisor-subagent-handoff.svg" alt="上下文隔离与结构化 Handoff 严密交接契约" />
  <figcaption>上下文隔离与结构化交接契约</figcaption>
</figure>

---

## 三大经典协作拓扑

### 1. 流水线串行链（Sequential Pipeline）
- **拓扑逻辑**：$A \to B \to C$。前一个 Agent 的输出物经过严格校验后，作为下一个 Agent 的输入上下文；
- **典型场景**：标准软件开发流水线（需求分析 Agent ➔ 架构设计 Agent ➔ 编码 Agent ➔ 单元测试 Agent）。

### 2. 主从分发与汇总模式（Supervisor / Leader-Worker Pattern）
- **拓扑逻辑**：主控 Supervisor 负责全局任务规划，根据当前进展并行派发（Fork / Spawn）多个专职 Worker（例如 Worker 1 扫描前端目录，Worker 2 扫描后端目录），并汇总各 Worker 的精炼结论；
- **典型场景**：现代高级 Coding Agent（如 Claude Code、Cursor）的核心底层架构。

### 3. 红蓝对抗与委员会裁决（Debate & Joint Consensus）
- **拓扑逻辑**：生成 Agent 提出解决方案，Critic Agent 从安全性、性能和边缘场景多维度全力挑刺，最后由 Judge Agent 进行客观裁决；
- **典型场景**：金融风控审计、核心安全漏洞挖掘与高质量合成数据清洗。

---

## 强类型 Handoff 交接契约

在多智能体工程中，最致命的陷阱是让 Agent 之间进行无格式约束的自然语言群聊。

**工业级多智能体系统必须建立「强类型 Handoff 交接契约」**：
- 子 Agent 之间交付的必须是标准结构化数据包（如 JSON Schema 校验通过的 Artifacts 或严格按照 Markdown 模板输出的报告）；
- 必须明确定义每个子 Agent 的输入参数、输出契约与退出条件，杜绝无限套娃与通信死锁。

---

## 最小代码实现

下面的代码演示了一个极简的多智能体系统：包含 Supervisor 主控、专职 Coder 以及带有质检驳回机制的 Reviewer：

```python
import json
from typing import Dict, Any

class CoderAgent:
    """专职编写代码的子 Agent"""
    def run(self, task_spec: str, feedback: str = None) -> str:
        if feedback:
            print("[Coder Agent]: 收到 Reviewer 驳回意见，正在重构优化代码...")
            return "def divide(a: float, b: float) -> float:\n    if b == 0:\n        raise ValueError('除数不能为零')\n    return a / b"
        print("[Coder Agent]: 正在编写初版业务代码...")
        return "def divide(a, b):\n    return a / b"  # 初版：漏了除零防御

class ReviewerAgent:
    """专职安全与健壮性审查的子 Agent"""
    def review(self, code: str) -> Dict[str, Any]:
        print("[Reviewer Agent]: 开始执行严格代码质检...")
        if "if b == 0" not in code:
            return {"approved": False, "reason": "缺少除数为零的防御性校验分支，存在崩溃风险"}
        return {"approved": True, "reason": "代码规范、具备健壮的异常防御，准予合并！"}

def run_supervisor_orchestration():
    print("--- 启动 Supervisor-Worker 多智能体协同 ---\n")
    coder = CoderAgent()
    reviewer = ReviewerAgent()
    
    # 轮次 1: 派发 Coder 编写代码
    code_v1 = coder.run("实现浮点除法")
    print(f"[产出物 V1]:\n{code_v1}\n")
    
    # 派发 Reviewer 质检
    review_v1 = reviewer.review(code_v1)
    
    if not review_v1["approved"]:
        reason = review_v1["reason"]
        print(f"[质检驳回]: {reason}\n")
        
        # 轮次 2: Supervisor 带着明确的驳回契约重新驱动 Coder
        code_v2 = coder.run("实现浮点除法", feedback=reason)
        print(f"[产出物 V2]:\n{code_v2}\n")
        
        review_v2 = reviewer.review(code_v2)
        if review_v2["approved"]:
            reason_v2 = review_v2["reason"]
            print(f"[质检通过]: {reason_v2}")
            print("\n[Supervisor 交付]: 多智能体协同成功，代码已合并。")

run_supervisor_orchestration()
```

**控制台输出：**
```text
--- 启动 Supervisor-Worker 多智能体协同 ---

[Coder Agent]: 正在编写初版业务代码...
[产出物 V1]:
def divide(a, b):
    return a / b

[Reviewer Agent]: 开始执行严格代码质检...
[质检驳回]: 缺少除数为零的防御性校验分支，存在崩溃风险

[Coder Agent]: 收到 Reviewer 驳回意见，正在重构优化代码...
[产出物 V2]:
def divide(a: float, b: float) -> float:
    if b == 0:
        raise ValueError('除数不能为零')
    return a / b

[Reviewer Agent]: 开始执行严格代码质检...
[质检通过]: 代码规范、具备健壮的异常防御，准予合并！

[Supervisor 交付]: 多智能体协同成功，代码已合并。
```

---

## 核心概念辨析

- **单 Agent 上下文过载 vs 多 Agent 上下文物理隔离**：
  - 单 Agent 容易被成千上万行试错日志撑爆窗口并引发幻觉；
  - 多 Agent 通过子沙箱吞吐噪声，仅向上层交接精炼结构化结论。
- **自由散漫群聊 vs 强类型 Handoff 契约**：
  - 自由群聊容易产生幻觉级联与逻辑死锁；
  - 工业级多智能体必须依托 JSON Schema 和明确的产物契约进行单向流转。
- **Supervisor 主控 vs 专职 Worker**：
  - Supervisor 负责全局拓扑规划、派发与仲裁，维持纯净视野；
  - Worker 拥有专精的系统提示词与最小权限工具集，独立沙箱执行。

智能体不仅能调 API 和写代码，还能不能直接像人一样看屏幕、点鼠标操作电脑？下一篇我们将探讨——《Coding 与 Computer Use》。

---

## 参考文献

1. Hong, Sirui, Zheng, Xiawu, Chen, Jonathan, et al. (2023). [*MetaGPT: Meta Programming for A Multi-Agent Collaborative Framework*](https://arxiv.org/abs/2308.00352). ICLR 2024 / arXiv:2308.00352.
2. Wu, Qingyun, Bansal, Gagan, Zhang, Jieyu, et al. (2023). [*AutoGen: Enabling Next-Gen LLM Applications via Multi-Agent Conversation*](https://arxiv.org/abs/2308.08155). arXiv:2308.08155.
3. Anthropic. (2024). [*Building Effective Agents: Multi-Agent Workflows and Orchestration*](https://www.anthropic.com/research/building-effective-agents). Anthropic Research.
4. Du, Yilun, Li, Shuang, Torralba, Antonio, et al. (2023). [*Improving Factuality and Reasoning in Language Models through Multiagent Debate*](https://arxiv.org/abs/2305.14325). arXiv:2305.14325.
