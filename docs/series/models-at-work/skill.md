---
title: "Skill 专业技能包"
description: "打包作业规程、提示词模板与脚本资源标准化。"
series: models-at-work
chapter: protocols
order: 7
type: concept
articleStatus: draft
prerequisites:
  - "mcp"
videoSource: skill
---

# Skill 专业技能包

在实际工程任务中，仅仅为大模型提供底层的通用 API（如读取文件、执行 Shell）往往不足以保证高质量交付。例如，在要求模型执行生产级代码审查时：
- 单纯依赖即兴的自然语言提问，模型容易遗漏特定的安全检查项、违背团队既定的 Git 提交规范，或在未运行测试套件的情况下直接发起代码变更；
- 可靠的软件工程交付依赖于 **标准作业规程（SOP）、执行脚本、静态规范参考与质量卡点**。

如何将专业领域的工程工作法固化为可复用的模块？

这是智能体系统中的高阶封装单元——**Skill（专业技能包）**。

<figure>
  <img src="/figures/skill/skill-anatomy-sop.svg" alt="Skill 专业技能包解剖结构" />
  <figcaption>Skill 技能包解剖：规程、脚本、规范与工具的自包含集成</figcaption>
</figure>

---

## 从即兴提示词到标准作业法

在软件工程中，**Skill（技能包）** 是将特定领域的作业规程、辅助脚本与参考资料打包封装而成的标准化资产。

### Skill 的四个组成要素
1. **Instructions（作业规程 SOP）**：定义任务的执行阶段、前后置依赖、边界条件与检查清单；
2. **Scripts（确定性执行脚本）**：将无需概率推理的检查任务（如运行 Linter、单元测试、依赖漏洞扫描）交由确定性脚本执行，降低 Token 开销并消除算术误差；
3. **Reference（静态参考规范）**：包含团队的代码风格指引、安全基线与接口文档；
4. **Tools（绑定的工具集合）**：声明该技能需要调用的 MCP 工具或 API 接口。

---

## Skill 与 MCP 的分工协同

在系统架构中，Skill 与 MCP 处于不同抽象层级：

<figure>
  <img src="/figures/skill/skill-vs-mcp-division.svg" alt="Skill 业务规程与 MCP 接口总线分工协同" />
  <figcaption>Skill 业务规程 vs MCP 接口总线分工协同</figcaption>
</figure>

| 维度 | MCP 协议（底层能力总线） | Skill 技能包（业务作业法） |
| :--- | :--- | :--- |
| **定位** | 通用通信协议与工具接口暴露 | 领域任务的标准作业流程（SOP） |
| **关注点** | “如何建立连接、如何调用接口” | “按什么步骤、遵循什么规则完成任务” |
| **复用形态** | 跨客户端通用，无业务属性 | 绑定具体业务场景，包含质量验收规则 |
| **协同关系** | 提供基础工具原语 | 在作业步骤中编排并调用 MCP 工具 |

---

## 渐进式披露与动态挂载

若系统中注册了数十上百个专业技能，全量将每个 Skill 的详细步骤预先注入 System Prompt 会占用大量上下文窗口并引起注意力分散。

现代智能体系统通常采用 **渐进式披露（Progressive Disclosure）** 机制：

1. **初始索引（轻量常驻）**：在 System Prompt 中仅常驻所有可用技能的名称与一句话简短摘要（约数十 Token）；
2. **按需装载（动态激活）**：当用户下达指令或模型识别到需要特定技能时，系统将该 Skill 对应的完整 SOP 步骤、辅助脚本与参考文件动态挂载至上下文；
3. **任务结束（上下文清理）**：任务完成后释放相关详情，保持工作台上下文的精简。

---

## 最小代码实现

以下代码演示了一个支持渐进式索引展示与按需动态装载的轻量 Skill 运行时：

```python
from typing import Dict, Any

class SkillRegistry:
    def __init__(self):
        # 1. 注册技能库 (仅常驻轻量摘要)
        self._skills = {
            "code-review": {
                "summary": "依据团队 Clean Code 规范执行多维度代码审查并输出缺陷报告",
                "sop": [
                    "步骤 1: 扫描 Git 暂存区改动与代码行数",
                    "步骤 2: 运行本地 linter 脚本检查语法异味",
                    "步骤 3: 依据 security-rules.md 筛查 SQL 注入与未授权访问",
                    "步骤 4: 输出包含严重度评级的结构化 Markdown 报告"
                ],
                "script": "python -m flake8 ."
            }
        }

    def get_skill_index(self) -> Dict[str, str]:
        """返回常驻轻量索引 (极小 Token 消耗)"""
        return {name: info["summary"] for name, info in self._skills.items()}

    def load_skill_details(self, skill_name: str) -> Dict[str, Any]:
        """按需动态加载技能的完整 SOP 与规范"""
        if skill_name in self._skills:
            print(f"📦 [动态加载] 激活专业技能包: /{skill_name}")
            return self._skills[skill_name]
        raise ValueError(f"未知技能: {skill_name}")

def skill_demo():
    registry = SkillRegistry()
    
    # 1. 初始提示词中常驻的轻量索引
    print("--- 1. 初始 System Prompt 中注入的轻量技能清单 ---")
    for name, summary in registry.get_skill_index().items():
        print(f"- /{name}: {summary}")
        
    # 2. 用户触发具体技能
    user_command = "/code-review"
    print(f"\n--- 2. 用户触发指令: {user_command} ---")
    active_skill = registry.load_skill_details("code-review")
    
    # 3. 动态展开完整 SOP 规程
    print("\n--- 3. 动态注入上下文的完整 SOP 规程 ---")
    for step in active_skill["sop"]:
        print(f"  {step}")
    print(f"  [辅助脚本]: {active_skill['script']}")
    print("\n[模型遵循 SOP 规程] 开始严格按步骤执行专业审查...")

skill_demo()
```

**控制台输出：**
```text
--- 1. 初始 System Prompt 中注入的轻量技能清单 ---
- /code-review: 依据团队 Clean Code 规范执行多维度代码审查并输出缺陷报告

--- 2. 用户触发指令: /code-review ---
📦 [动态加载] 激活专业技能包: /code-review

--- 3. 动态注入上下文的完整 SOP 规程 ---
  步骤 1: 扫描 Git 暂存区改动与代码行数
  步骤 2: 运行本地 linter 脚本检查语法异味
  步骤 3: 依据 security-rules.md 筛查 SQL 注入与未授权访问
  步骤 4: 输出包含严重度评级的结构化 Markdown 报告
  [辅助脚本]: python -m flake8 .

[模型遵循 SOP 规程] 开始严格按步骤执行专业审查...
```

---

## 核心概念辨析

- **即兴 Prompt vs 封装 Skill**：
  - 即兴 Prompt 缺少结构化流程约束；
  - Skill 将 SOP 步骤、确定性脚本与规范结合，保障任务交付的一致性。
- **MCP 接口 vs Skill 规程**：
  - MCP 负责标准化的底层工具暴露与通信（能力通道）；
  - Skill 负责高层的业务步骤编排与质量卡点（作业方法）。
- **全量静态注入 vs 渐进式披露**：
  - 全量静态注入占用较多上下文并分散注意力；
  - 渐进式披露通过轻量索引加按需挂载保持上下文窗口的高效。

至此，我们完成了第三季《给大模型装上手和脚》的全部核心协议与工具机制剖析。在模型具备了知识检索与工具调用能力之后，如何让其自主规划、循环执行并进行多智能体协同？下一季我们将进入——《第四季：AI 智能体怎么替人干活》。

---

## 参考文献

1. Anthropic. (2024). [*Building Effective Agents: Workflows and Autonomous Agents*](https://www.anthropic.com/research/building-effective-agents). Anthropic Research.
2. Anthropic. (2025). [*Claude Code Skills Specification and Progressive Disclosure Architecture*](https://docs.anthropic.com/).
3. Chase, Harrison. (2023). [*LangChain Expression Language (LCEL) and Composability*](https://blog.langchain.dev/).
4. Yao, Shunyu, Zhao, Jeffrey, Yu, Dian, et al. (2022). [*ReAct: Synergizing Reasoning and Acting in Language Models*](https://arxiv.org/abs/2210.03629). ICLR 2023 / arXiv:2210.03629.
