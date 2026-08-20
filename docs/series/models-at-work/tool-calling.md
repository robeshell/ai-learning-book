---
title: "工具调用与动作执行"
description: "函数声明注入、模型结构化决策与外部 API 触发。"
series: models-at-work
chapter: action
order: 4
type: concept
articleStatus: draft
prerequisites:
  - "prompt"
videoSource: tool-calling
---

# 工具调用与动作执行

在检索增强（RAG）中，系统主要解决的是知识输入的时效与私有化问题。但在实际业务中，系统往往需要执行具体动作——例如查询实时天气、向数据库插入订单、发送邮件或执行代码。单纯依靠自然语言生成无法直接完成物理操作。

为了让大模型具备触发外部系统的能力，工业界确立了 **Tool Calling（工具调用 / Function Calling）** 机制。

<figure>
  <img src="/figures/tool-calling/tool-call-loop.svg" alt="Tool Calling 4 步闭环标准工作流" />
  <figcaption>Tool Calling 工具调用 4 步标准闭环工作流</figcaption>
</figure>

---

## 工具调用的物理本质

一种常见的误解是认为“模型调用了工具”意味着模型自身在服务器上直接发起了网络请求。

在底层物理计算中：
- 大模型本身是运行在 GPU 显存中的浮点运算单元；
- 模型不具备网络套接字（Socket）权限，也无法直接读写外部文件系统；
- **大模型在工具调用中承担的角色是“结构化意图与参数生成器”**，实际的执行权完全由外部宿主程序（Host Runtime）承接。

---

## 工具调用四步闭环

工具调用的完整生命周期由以下四个阶段构成：

### 1. 工具声明注入（Tool Schema Injection）
在发起推理请求时，宿主程序将可用函数的名称、功能描述与参数规范以标准 **JSON Schema** 格式注入到提示词中：

```json
{
  "name": "get_stock_price",
  "description": "查询指定股票代码的实时股价",
  "parameters": {
    "type": "object",
    "properties": {
      "ticker": {"type": "string", "description": "股票代码，如 AAPL, MSFT"}
    },
    "required": ["ticker"]
  }
}
```

### 2. 模型生成调用意图（Model Generates Call Intent）
当用户提问 `“帮我查询苹果公司当前的股价”` 时：
- 模型判定自身权重中缺乏实时股价数据，且识别到当前上下文中定义了 `get_stock_price` 工具；
- 模型停止生成自然语言闲聊，转而输出一段符合 JSON Schema 规范的结构化调用参数（如 `<tool_call>{"name": "get_stock_price", "arguments": {"ticker": "AAPL"}}</tool_call>`）；
- 输出终止符后，模型推理暂停。

### 3. 宿主拦截与真实执行（Host Interception & Execution）
- 宿主程序（如 Python / Node.js 运行时）解析模型输出，识别出工具调用请求；
- 宿主程序完成参数校验与安全鉴权后，**在外部环境中发起真实的 HTTP 请求或数据库读写**，获得执行结果（如 `{"price": 224.50, "currency": "USD"}`）。

### 4. 结果回填与最终生成（Context Injection & Generation）
- 宿主程序将执行结果作为 `tool` 角色消息回填到上下文窗口中；
- 重新触发模型前向推理，模型基于获取的真实数据生成最终的自然语言回复：`“苹果公司（AAPL）当前最新股价为 224.50 美元。”`

---

## 宿主安全控制与权限边界

由于大模型属于概率生成系统，工具调用的工程设计需建立明确的权限隔离：

<figure>
  <img src="/figures/tool-calling/host-vs-model-boundary.svg" alt="大模型与宿主系统的物理执行与安全边界" />
  <figcaption>大模型认知域与宿主系统执行域的物理边界</figcaption>
</figure>

1. **只读类操作（Read-Only Actions）**：
   - 示例：天气查询、文档检索、系统状态探测；
   - 风险较低，宿主环境通常可在校验后自动化执行并回填。
2. **具副作用的写操作（State-Mutating Actions）**：
   - 示例：资金转账、文件删除、邮件外发、生产环境部署；
   - 具有物理状态改变风险。系统通常采用 **人工介入（Human-in-the-loop）** 机制：宿主程序拦截参数后在交互界面向用户展示确认卡片，待获得明确授权后再行触发物理执行。

---

## 最小代码实现

以下代码演示了一个简单的工具调用执行器：包含工具注册、模型输出拦截、动态函数派发与结果回填流程：

```python
import json
from typing import Callable, Dict, Any

class ToolRegistry:
    def __init__(self):
        self._tools: Dict[str, Callable] = {}
        
    def register(self, name: str):
        def decorator(func: Callable):
            self._tools[name] = func
            return func
        return decorator
        
    def execute(self, tool_name: str, arguments: Dict[str, Any]) -> str:
        if tool_name not in self._tools:
            return f"Error: 未知工具 '{tool_name}'"
        try:
            result = self._tools[tool_name](**arguments)
            return json.dumps(result, ensure_ascii=False)
        except Exception as e:
            return f"Execution Error: {str(e)}"

registry = ToolRegistry()

# 注册一个具备业务逻辑的计算函数
@registry.register("calculate_tax")
def calculate_tax(salary: float, city: str) -> Dict[str, Any]:
    tax = salary * 0.15
    after_tax = salary - tax
    return {"city": city, "gross": salary, "tax": tax, "net": after_tax}

def tool_calling_demo():
    # 1. 模拟大模型输出的结构化工具调用指令
    simulated_llm_output = json.dumps({
        "action": "call_tool",
        "tool_name": "calculate_tax",
        "arguments": {"salary": 20000.0, "city": "上海"}
    })
    
    # 2. 宿主运行时：拦截模型输出并安全派发
    parsed = json.loads(simulated_llm_output)
    if parsed.get("action") == "call_tool":
        tool_name = parsed["tool_name"]
        args = parsed["arguments"]
        print(f"[宿主拦截] 识别到模型工具调用意图: {tool_name}, 参数: {args}")
        
        # 3. 宿主物理执行真实函数
        execution_result = registry.execute(tool_name, args)
        print(f"[执行成功] 真实工具返回数据: {execution_result}")
        
        # 4. 模拟将结果回填至上下文，再次驱动模型生成最终回答
        net_val = json.loads(execution_result)["net"]
        final_answer = f"经核算，您在 {args['city']} 的月薪 {args['salary']} 元扣税后实际到手为 {net_val} 元。"
        print(f"[模型终答] {final_answer}")

print("--- 工具调用闭环演示 ---")
tool_calling_demo()
```

**控制台输出：**
```text
--- 工具调用闭环演示 ---
[宿主拦截] 识别到模型工具调用意图: calculate_tax, 参数: {'salary': 20000.0, 'city': '上海'}
[执行成功] 真实工具返回数据: {"city": "上海", "gross": 20000.0, "tax": 3000.0, "net": 17000.0}
[模型终答] 经核算，您在 上海 的月薪 20000.0 元扣税后实际到手为 17000.0 元。
```

---

## 核心概念辨析

- **模型参数生成 vs 宿主物理执行**：
  - 大模型只负责在上下文约束下输出结构化的调用参数字符串；
  - 宿主程序负责解析参数、发起网络/数据库请求并处理安全性。
- **RAG 检索 vs Tool Calling 工具调用**：
  - RAG 侧重于被动拉取外部文档知识并注入上下文；
  - Tool Calling 是模型根据任务需求主动触发外部系统的动作或精确计算。
- **只读探测 vs 状态变更**：
  - 只读类操作可自动化完成；
  - 涉及写操作和资金、权限变更的任务需引入人工审批机制。

在工具调用与自动化管道中，如何保证大模型严格输出符合 JSON 语法树的结构化数据，避免由于括号缺失导致解析崩溃？下一篇我们将探讨——《严格结构化输出》。

---

## 参考文献

1. Schick, Timo, Dwivedi-Yu, Jane, Dessì, Roberto, et al. (2023). [*Toolformer: Language Models Can Teach Themselves to Use Tools*](https://arxiv.org/abs/2302.04761). NeurIPS 2023 / arXiv:2302.04761.
2. Qin, Yujia, Liang, Shihao, Ye, Yining, et al. (2023). [*ToolLLM: Facilitating Large Language Models to Master 16000+ Real-world APIs*](https://arxiv.org/abs/2307.16789). ICLR 2024 / arXiv:2307.16789.
3. Patil, Shishir G., Zhang, Tianjun, Wang, Xin, & Gonzalez, Joseph E. (2023). [*Gorilla: Large Language Model Connected with Massive APIs*](https://arxiv.org/abs/2305.15334). arXiv:2305.15334.
4. OpenAI. (2023). [*Function Calling and Other API Updates*](https://openai.com/index/function-calling-and-other-api-updates/). OpenAI Official Blog.
