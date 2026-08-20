---
title: "MCP 统一接入协议"
description: "统一工具接口、资源挂载与服务通信标准。"
series: models-at-work
chapter: protocols
order: 6
type: concept
articleStatus: draft
prerequisites:
  - "tool-calling"
videoSource: mcp
---

# MCP 统一接入协议

在工具调用普及之前，连接不同数据源与客户端通常依赖私有的胶水代码：
- 客户端 A 为访问 GitHub 编写一套接口；
- 客户端 B 为连接 PostgreSQL 数据库编写另一套接口；
- 当存在 $M$ 个客户端应用与 $N$ 个外部服务时，系统需要维护 $M \times N$ 组点对点的适配逻辑。

为了降低多端集成的适配成本，类似开发工具中用于统一语言支持的 LSP（Language Server Protocol），Anthropic 在 2024 年底开源了 **MCP（Model Context Protocol，模型上下文协议）**。

<figure>
  <img src="/figures/mcp/m-times-n-to-m-plus-n.svg" alt="从 M×N 网状依赖到 M+N MCP 标准协议" />
  <figcaption>从 M×N 碎片化适配到 M+N MCP 统一总线架构</figcaption>
</figure>

---

## 生态连接与协议标准化

**MCP 基于 JSON-RPC 2.0 规范，提供了一套解耦客户端（MCP Client）与服务提供方（MCP Server）的通信标准：**
- **工具开发方**：按规范实现一次 MCP Server，即可接入所有支持该协议的宿主环境与 IDE 插件；
- **客户端开发方**：实现通用的 MCP Client 协议解析器，即可直接挂载开源生态中的数据源与工具服务。

---

## MCP 核心原语：Tools、Resources 与 Prompts

MCP 协议将大模型与外部环境的交互拆解为三大核心能力面：

<figure>
  <img src="/figures/mcp/mcp-three-primitives.svg" alt="MCP 核心三原语 Tools, Resources 与 Prompts" />
  <figcaption>MCP 动作、资源与模板三大原语架构</figcaption>
</figure>

### 1. Tools（工具执行）
- **主动触发的操作**：由模型根据上下文主动发起调用的函数接口，具备外部副作用；
- 协议接口：`tools/list`（发现工具 Schema）、`tools/call`（执行具体工具）；
- 示例：执行 Git 提交、发起数据库写入、发送通知。

### 2. Resources（上下文资源）
- **被动读取的数据流**：由宿主或服务端暴露的只读上下文视图（类似虚拟文件系统）；
- 协议接口：`resources/list`（列出可用资源）、`resources/read`（读取资源内容）；
- 示例：读取系统日志（`file:///var/log/app.log`）、读取数据库表元数据（`postgres://users/schema`），支持客户端订阅变更通知。

### 3. Prompts（提示词工作流）
- **预设模板**：由服务端打包的结构化提示词模板与参数定义；
- 协议接口：`prompts/list`（查询模板列表）、`prompts/get`（根据参数渲染具体提示词）；
- 示例：代码审查模板、安全性分析流水线。

---

## 传输协议与安全边界

MCP 支持两种标准的传输通道：
1. **Stdio 本地子进程**：客户端通过操作系统的标准输入输出（`stdin` / `stdout`）与本地命令行 Server 通信，适用于本地开发与文件处理；
2. **SSE / HTTP 远程连接**：基于 Server-Sent Events（SSE）与 HTTP POST 进行通信，适用于云端微服务与分布式工具网关。

### 客户端安全防护原则
MCP 作为通信协议本身不负责自动授权。**工具调用的实际执行审批权依然保留在客户端（Host System）手中**：
- 对于带有破坏性（如删除、资金划转）的写操作，客户端应在底层拦截并提示用户进行人工确认（Human-in-the-loop），避免非预期的自动化副作用。

---

## 最小代码实现

以下代码演示了一个基于 JSON-RPC 2.0 规范的简易 MCP Server 协议处理器：展示了 `tools/list` 与 `tools/call` 的消息分发逻辑：

```python
import json
from typing import Dict, Any

class SimpleMCPServer:
    def __init__(self):
        # 1. 注册工具元数据 (Tools Schema)
        self.tools = {
            "query_db": {
                "description": "查询数据库中的用户基本信息",
                "parameters": {
                    "type": "object",
                    "properties": {"user_id": {"type": "string"}},
                    "required": ["user_id"]
                }
            }
        }

    def handle_request(self, json_rpc_msg: str) -> str:
        req = json.loads(json_rpc_msg)
        req_id = req.get("id")
        method = req.get("method")
        params = req.get("params", {})

        # 2. JSON-RPC 2.0 路由分发
        if method == "tools/list":
            response = {
                "jsonrpc": "2.0",
                "id": req_id,
                "result": {"tools": [{"name": k, **v} for k, v in self.tools.items()]}
            }
        elif method == "tools/call":
            tool_name = params.get("name")
            arguments = params.get("arguments", {})
            if tool_name == "query_db":
                uid = arguments.get("user_id")
                result_content = {"user_id": uid, "name": "张三", "role": "系统管理员"}
                response = {
                    "jsonrpc": "2.0",
                    "id": req_id,
                    "result": {"content": [{"type": "text", "text": json.dumps(result_content, ensure_ascii=False)}]}
                }
            else:
                response = {"jsonrpc": "2.0", "id": req_id, "error": {"code": -32601, "message": "Method not found"}}
        else:
            response = {"jsonrpc": "2.0", "id": req_id, "error": {"code": -32600, "message": "Invalid Request"}}

        return json.dumps(response, ensure_ascii=False)

def mcp_demo():
    server = SimpleMCPServer()
    
    # 交互 1: 客户端发现可用工具列表
    list_req = json.dumps({"jsonrpc": "2.0", "id": 1, "method": "tools/list"})
    print(f"Client -> Server: {list_req}")
    print(f"Server -> Client: {server.handle_request(list_req)}\n")
    
    # 交互 2: 客户端触发工具执行
    call_req = json.dumps({
        "jsonrpc": "2.0",
        "id": 2,
        "method": "tools/call",
        "params": {"name": "query_db", "arguments": {"user_id": "U_10086"}}
    })
    print(f"Client -> Server: {call_req}")
    print(f"Server -> Client: {server.handle_request(call_req)}")

mcp_demo()
```

**控制台输出：**
```text
Client -> Server: {"jsonrpc": "2.0", "id": 1, "method": "tools/list"}
Server -> Client: {"jsonrpc": "2.0", "id": 1, "result": {"tools": [{"name": "query_db", "description": "查询数据库中的用户基本信息", "parameters": {"type": "object", "properties": {"user_id": {"type": "string"}}, "required": ["user_id"]}}]}}

Client -> Server: {"jsonrpc": "2.0", "id": 2, "method": "tools/call", "params": {"name": "query_db", "arguments": {"user_id": "U_10086"}}}
Server -> Client: {"jsonrpc": "2.0", "id": 2, "result": {"content": [{"type": "text", "text": "{\"user_id\": \"U_10086\", \"name\": \"张三\", \"role\": \"系统管理员\"}"}]}}
```

---

## 核心概念辨析

- **私有胶水适配 vs MCP 通用协议**：
  - 胶水适配是点对点针对特定 API 硬编码；
  - MCP 通过统一的 JSON-RPC 2.0 规范，实现跨客户端与工具生态的解耦。
- **Tools（动作） vs Resources（资源）**：
  - Tools 代表带有执行动作与副作用的函数；
  - Resources 代表只读的数据流与上下文视图。
- **通信总线（Protocol） vs 执行权限（Security）**：
  - MCP 负责规范参数传递格式；
  - 执行权限与安全控制仍需由宿主程序负责落实。

除了通用协议外，如何将特定领域的业务逻辑封装为可复用的技能单元？下一篇我们将探讨——《Skill 技能抽象与封装》。

---

## 参考文献

1. Anthropic. (2024). [*Introducing the Model Context Protocol (MCP)*](https://www.anthropic.com/news/model-context-protocol). Anthropic Official Announcements.
2. Model Context Protocol Specification. (2024). [*MCP Architecture, Protocols and Primitives Documentation*](https://modelcontextprotocol.io/).
3. JSON-RPC Working Group. (2010). [*JSON-RPC 2.0 Specification*](https://www.jsonrpc.org/specification).
4. Microsoft. (2016). [*Language Server Protocol (LSP) Specification*](https://microsoft.github.io/language-server-protocol/).
