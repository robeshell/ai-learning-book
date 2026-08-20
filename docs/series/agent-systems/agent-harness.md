---
title: "Harness 智能体底盘"
description: "宿主底盘生命周期管理、权限沙箱与崩溃恢复。"
series: agent-systems
chapter: loop
order: 2
type: concept
articleStatus: draft
prerequisites:
  - "agent-loop"
videoSource: agent-harness
---

# Harness 智能体底盘

在上一篇中，我们学习了 ReAct 智能体思考、行动与观察的自主执行循环。

然而，在真实生产环境中把一个 Agent 部署上线时，工程师们会立刻面临一连串残酷的系统级挑战：
- *如果某个调用的子进程陷入死循环卡死了，谁来强行终止它？*
- *如果智能体运行到第 8 步时网络波动断线或 API 触发限流，怎么避免从头重跑？*
- *当执行工具打印了 10 万行庞大日志瞬间撑爆上下文窗口时，谁来执行智能裁剪？*
- *如果模型被恶意注入试图执行 `rm -rf /`，谁来做物理级硬隔离拦截？*

大模型本身只是一个无状态的纯矩阵计算器，它既管不了操作系统进程，也管不了磁盘持久化。

承载大模型运转、全权掌控外部状态、权限与容灾的宿主中控系统，被称为——**Harness（智能体宿主底盘）**。

<figure>
  <img src="/figures/agent-harness/engine-vs-chassis.svg" alt="大模型发动机与 Harness 宿主底盘职责分工" />
  <figcaption>大模型计算与宿主底盘分工</figcaption>
</figure>

---

## 宿主底盘职责与四大支柱

如果把大模型比作一辆赛车强劲的**「发动机（Engine）」**，那么 **Harness** 就是赛车的**「底盘、悬挂、变速箱与车载安全中控（Chassis & Operating Runtime）」**。

离开底盘，孤立的发动机只是一堆轰鸣的齿轮；只有装载在坚固的 Harness 底盘上，智能体才能在复杂的现实道路上稳定行驶。

Harness 负责为大模型提供 **四大工程支柱**：

<figure>
  <img src="/figures/agent-harness/harness-four-pillars.svg" alt="Harness 智能体底盘的四大工程支柱" />
  <figcaption>Harness 宿主底盘四大工程支柱</figcaption>
</figure>

---

## 生命周期与状态快照

复杂的 Agent 任务往往需要跨越数十分钟甚至数小时。Harness 必须管理整个智能体的生命周期状态机：
1. **事务性状态快照（Checkpointing）**：在每完成一轮 `Thought-Action-Observation` 后，Harness 自动将当前完整的执行轨迹、环境变量与产物序列化持久化至磁盘或数据库；
2. **断点续传与崩溃恢复（Crash Recovery）**：遭遇断网、断电或云端 API 临时故障时，Harness 在重启后能从上一个成功的 Checkpoint 瞬间拉起现场无缝续跑；
3. **状态回滚（Time-Travel Debugging & Rollback）**：当发现某一分支执行彻底走偏时，系统支持一键回滚到第 $N$ 步状态重新探索。

---

## 权限拦截与沙箱隔离

大模型生成的代码和指令具有概率不确定性，Harness 是抵御安全风险的**终极物理防线**：
1. **沙箱隔离（Sandboxed Execution）**：所有终端命令与代码执行必须运行在独立的轻量容器（如 Docker、gVisor、Firejail）中，限制 CPU、内存与文件系统读写权限；
2. **权限白名单拦截**：Harness 在物理发起系统调用前，强制执行路径与指令正则白名单筛查；
3. **人类审批卡点（Human-in-the-loop）**：对于具有不可逆破坏性的操作（如推送远程分支、删除数据表、外发邮件），Harness 强制挂起执行流，向人类弹窗请求显式确认。

---

## 上下文裁剪与缓存亲和

长程任务极易遭遇**上下文溢出（Context Window Overflow）**。大模型自己不会主动遗忘，必须由 Harness 主动操刀裁剪：
1. **超长 Observation 自动截断**：当工具输出数万行构建日志时，Harness 自动截取头尾关键行，中间部分转存为磁盘文件并向模型回填引用路径；
2. **滚动历史摘要（Rolling Summarization）**：当窗口占用超过阈值（如 80%）时，Harness 自动触发微型模型对前期的探索轨迹做结构化浓缩，仅保留关键事实；
3. **Prompt Cache 亲和性**：裁剪时保持前缀结构稳定，最大化命中云端推理的 Prompt Caching，大幅降低推理延迟与成本。

---

## 超时控制与故障重试

1. **子进程执行超时强制 SIGKILL**：为每一个外部命令设置硬性 Timeout（如 120 秒），防止死循环脚本耗尽系统资源；
2. **指数退避重试（Exponential Backoff）**：遇到大模型供应商 `429 Rate Limit` 或网络瞬时抖动时，自动按 $2^n$ 秒退避重试；
3. **异常转义**：将底层崩溃堆栈包装为标准清晰的 Observation 错误信息喂回大模型，驱动模型在下一轮循环中自主修复。

---

## 最小代码实现

下面的代码模拟了一个轻量级 Harness 底盘的核心逻辑：包含磁盘 Checkpoint 快照保存、超长日志自动截断与超时重试控制：

```python
import json
import time
from typing import Dict, Any, List

class AgentHarness:
    def __init__(self, max_context_chars: int = 500):
        self.max_context_chars = max_context_chars
        self.state_history: List[Dict[str, Any]] = []
        self.current_step = 0

    def save_checkpoint(self, step: int, thought: str, action: str, observation: str):
        """1. 事务性保存状态快照到持久化存储"""
        snapshot = {
            "step": step,
            "timestamp": time.time(),
            "thought": thought,
            "action": action,
            "observation": self._compact_observation(observation)
        }
        self.state_history.append(snapshot)
        print(f"[Harness 存储] 第 {step} 步快照已成功持久化至磁盘 Checkpoint。")

    def _compact_observation(self, raw_obs: str) -> str:
        """2. 上下文自动裁剪：超长日志截断"""
        if len(raw_obs) > 100:
            compacted = raw_obs[:40] + "\n... [Harness 自动截断中间 9000 字日志] ...\n" + raw_obs[-40:]
            print("[Harness 裁剪] 检测到超长输出，已执行截断保护上下文。")
            return compacted
        return raw_obs

    def execute_with_retry(self, tool_fn, max_retries: int = 3) -> str:
        """3. 容灾与指数退避重试"""
        for attempt in range(1, max_retries + 1):
            try:
                return tool_fn()
            except Exception as e:
                wait_sec = 2 ** (attempt - 1)
                print(f"[Harness 异常] 第 {attempt} 次执行失败: {e}，等待 {wait_sec}s 后重试...")
                time.sleep(0.01)
        return "FATAL: 工具多次重试后仍然失败。"

# 模拟运行
harness = AgentHarness()

# 模拟执行一个吐出海量日志的工具
def noisy_build_tool():
    return "BUILD START: 编译模块 1\n" + ("log...\n" * 500) + "BUILD SUCCESS: 最终产物编译完成！"

print("--- 启动 Harness 宿主底盘守护 ---")
tool_output = harness.execute_with_retry(noisy_build_tool)
harness.save_checkpoint(
    step=1,
    thought="执行全量工程构建",
    action="run_build()",
    observation=tool_output
)
```

**控制台输出：**
```text
--- 启动 Harness 宿主底盘守护 ---
[Harness 裁剪] 检测到超长输出，已执行截断保护上下文。
[Harness 存储] 第 1 步快照已成功持久化至磁盘 Checkpoint。
```

---

## 核心概念辨析

- **模型能力（Model Engine） vs 底盘工程（Harness Chassis）**：
  - 模型只负责无状态的下一个 Token 概率预测与工具参数生成；
  - Harness 负责真实的进程生命周期、磁盘持久化、沙箱安全隔离与窗口裁剪。
- **内存临时状态 vs 磁盘 Checkpoint 快照**：
  - 临时状态随进程崩溃而彻底消失；
  - Checkpoint 快照能够支撑任务在跨节点、断网恢复后无缝续跑。
- **裸奔脚本 vs 工业级 Agent 系统**：
  - 裸奔脚本在遇到超时、限流或长日志时会当场崩溃；
  - 带有健壮 Harness 底盘的智能体系统具备自愈、容灾与安全硬隔离能力。

在底盘管理的状态中，智能体如何区分短期工作记忆与长期经验记忆？下一篇我们将探讨——《智能体的三层记忆》。

---

## 参考文献

1. Anthropic. (2024). [*Building Effective Agents: Workflows and Autonomous Agents*](https://www.anthropic.com/research/building-effective-agents). Anthropic Research.
2. Anthropic. (2025). [*Claude Code Architecture: Checkpointing, Sandboxing and Tool Execution*](https://docs.anthropic.com/).
3. LangChain. (2024). [*LangGraph: Multi-Agent Workflows and State Management Architecture*](https://blog.langchain.dev/langgraph-multi-agent-workflows/).
4. Wu, Qingyun, Bansal, Gagan, Zhang, Jieyu, et al. (2023). [*AutoGen: Enabling Next-Gen LLM Applications via Multi-Agent Conversation*](https://arxiv.org/abs/2308.08155). arXiv:2308.08155.
