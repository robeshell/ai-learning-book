---
title: "Coding 与 Computer Use"
description: "代码生成执行、GUI 屏幕坐标点击与环境交互。"
series: agent-systems
chapter: scale-security
order: 6
type: concept
articleStatus: draft
prerequisites:
  - "tool-calling"
videoSource: coding-computer-use
---

# Coding 与 Computer Use

在前面的章节中，我们学习了智能体如何通过工具调用和规划来解决问题。

在智能体真正落地的现实物理世界中，根据**交互载体与行动介质的不同**，演化出了两大主流技术分支：
1. **Coding Agent（编程智能体）**：以代码仓库、终端 Shell、文本 Diff 与自动化测试为核心载体；
2. **Computer Use（计算机视觉与键鼠操作智能体）**：以屏幕像素截图、鼠标绝对坐标与物理按键为核心载体。

这两者各自的技术机理是什么？在什么场景下应该用代码，什么场景下必须看屏幕点鼠标？

这就是智能体连接数字世界的两大终极触角——**Coding 与 Computer Use**。

<figure>
  <img src="/figures/coding-computer-use/coding-vs-computer-use.svg" alt="Coding Agent 与 Computer Use 架构与介质对比" />
  <figcaption>代码驱动与屏幕点击介质对比</figcaption>
</figure>

---

## 代码作为动作执行的最优载体

在所有智能体应用中，**编程智能体（Coding Agent，如 Claude Code、SWE-bench 体系）**是成熟度最高、落地价值最大的领域。

为什么代码是大模型驱动真实世界的最优载体？
1. **语义精确无歧义**：编程语言具有严格的语法和类型规范，相比自然语言的模糊性，代码逻辑极其严密；
2. **拥有绝对客观的物理裁判**：代码在修改后，可以通过**编译器、Linter 静态检查、单元测试与集成测试**进行毫秒级物理验证，为智能体提供了高胜率的自愈闭环；
3. **极高吞吐与极低开销**：通过 Unified Diff 局部打补丁，单次只需读写几十行文本，Token 消耗极小、响应极快。

---

## Computer Use 视觉感知与动作闭环

尽管 Coding Agent 和无头 API 极其高效，但在真实企业业务中，依然存在数以万计的**遗留系统、封闭桌面软件与复杂后台网页**：
- 它们根本没有暴露 RESTful API 或 CLI 命令行接口；
- 人类唯一能与它们交互的方式，就是坐在屏幕前「肉眼看界面、伸手点鼠标」。

2024 年底，Anthropic 在行业内率先推出了 **Computer Use** API，开创了操作系统级的通用交互：

<figure>
  <img src="/figures/coding-computer-use/computer-use-vision-loop.svg" alt="Computer Use 视觉感知与键鼠动作 4 步闭环" />
  <figcaption>视觉感知与键鼠操作 4 步闭环</figcaption>
</figure>

### Computer Use 的 4 步标准视觉闭环
1. **捕获屏幕（Capture Screenshot）**：宿主底层截取当前桌面的无损高清图像，转换为 Vision 多模态输入喂给大模型；
2. **视觉定位（Visual Grounding）**：模型在像素级别定位目标按钮、输入框或菜单项，自回归输出结构化坐标与动作（例如 `mouse_click(x=840, y=520)` 或 `type("admin123")`）；
3. **OS 事件派发（Dispatch OS Events）**：宿主程序通过系统底层 API 模拟真实的鼠标移动、点击或键盘击键；
4. **视觉重检（Visual Verification）**：派发完毕后再次截屏，比对界面是否发生预期变化（如弹窗是否出现），决定下一轮动作。

---

## Headless First 工程选型原则

在构建智能体系统时，工程师必须牢记一条**硬性架构铁律**：

$$\textbf{无头 API / CLI（Headless）} \gg \textbf{视觉点击（Computer Use）}$$

- **优先采用 API / CLI**：只要目标系统提供了命令行工具、数据库连接或 HTTP 接口，必须 100% 优先走 Coding / Tool Calling 路线。其延迟为毫秒级、Token 开销低、成功率逼近 100%；
- **Computer Use 作为终极兜底**：仅在目标应用完全封闭、没有任何 API 暴露时，才启用 Computer Use。
  - Computer Use 每次截屏消耗数千视觉 Token；
  - 易受分辨率缩放、UI 动画延迟与像素坐标微小漂移干扰，工程容错成本极高。

---

## 最小代码实现

下面的代码演示了一个抽象控制器：展示系统如何优先将任务路由到确定性的 CLI 工具，而在无 API 场景下回退到 GUI 坐标点击模拟：

```python
from typing import Dict, Any

class SystemActionController:
    def __init__(self):
        self.os_cursor_pos = (0, 0)

    def execute_cli_action(self, cmd: str) -> str:
        """1. 优先路线: 高效确定性的 CLI / 代码执行"""
        print(f"[CLI 路线]: 正在终端执行 `{cmd}`")
        if "git commit" in cmd:
            return "SUCCESS: [main 7a8b9c] 提交成功 (耗时 12ms)"
        return "SUCCESS: 终端命令已完成"

    def execute_gui_action(self, action_type: str, params: Dict[str, Any]) -> str:
        """2. 兜底路线: 视觉屏幕坐标与键鼠物理模拟"""
        if action_type == "click":
            x, y = params["x"], params["y"]
            self.os_cursor_pos = (x, y)
            print(f"[GUI 模拟]: 鼠标移动至屏幕坐标 ({x}, {y}) 并触发 Click 事件")
            return f"SUCCESS: 已点击坐标 ({x}, {y})"
        elif action_type == "type":
            text = params["text"]
            print(f"[GUI 模拟]: 键盘向当前焦点输入文本: '{text}'")
            return "SUCCESS: 已输入文本"
        return "ERROR: 未知 GUI 动作"

# 模拟智能体决策分发
controller = SystemActionController()
print("--- 启动动作控制器演示 ---")

# 场景 A: 有 CLI 接口的任务 (高效秒级完成)
print("\n【场景 A】提交代码仓库变动:")
print(controller.execute_cli_action("git commit -m 'feat: 增加登录鉴权'"))

# 场景 B: 无 API 的遗留桌面软件 (GUI 拟人点击)
print("\n【场景 B】操作无 API 的遗留报表桌面软件:")
print(controller.execute_gui_action("click", {"x": 1024, "y": 768}))
print(controller.execute_gui_action("type", {"text": "2026年度财报"}))
```

**控制台输出：**
```text
--- 启动动作控制器演示 ---

【场景 A】提交代码仓库变动:
[CLI 路线]: 正在终端执行 `git commit -m 'feat: 增加登录鉴权'`
SUCCESS: [main 7a8b9c] 提交成功 (耗时 12ms)

【场景 B】操作无 API 的遗留报表桌面软件:
[GUI 模拟]: 鼠标移动至屏幕坐标 (1024, 768) 并触发 Click 事件
SUCCESS: 已点击坐标 (1024, 768)
[GUI 模拟]: 键盘向当前焦点输入文本: '2026年度财报'
SUCCESS: 已输入文本
```

---

## 核心概念辨析

- **Coding Agent vs Computer Use**：
  - Coding Agent 操作文本代码与命令行，依托编译器裁判，精度高、速度快；
  - Computer Use 操作屏幕截图与鼠标坐标，攻克无 API 封闭桌面应用。
- **Headless First 架构原则**：
  - 能用 API/CLI 解决的绝不用 GUI 截屏；
  - GUI 交互作为连接遗留软件的终极兜底手段。
- **模拟点击 vs 意图理解**：
  - 智能体能点中屏幕按钮，不等于理解复杂业务背后的深层风险；
  - 所有涉及支付、删库等高危操作必须由宿主拦截并向人类弹窗确认。

当智能体能够自由读取网页、邮件并执行动作时，黑客如何通过恶意文本远程劫持智能体？下一篇我们将探讨——《提示词注入与越狱攻防》。

---

## 参考文献

1. Anthropic. (2024). [*Developing Computer Use: Breakthroughs in Operating System Interaction*](https://www.anthropic.com/news/3-5-models-and-computer-use). Anthropic Research.
2. Jimenez, Carlos E., Yang, John, Wettig, Alexander, et al. (2024). [*SWE-bench: Can Language Models Resolve Real-World GitHub Issues?*](https://arxiv.org/abs/2310.06770). ICLR 2024 / arXiv:2310.06770.
3. Yang, Chi, Gao, Yuchen, Zhang, Zhaoyang, et al. (2023). [*AppAgent: Multimodal Agents as Smartphone Users*](https://arxiv.org/abs/2312.13771). arXiv:2312.13771.
4. Rawles, Christopher, et al. (2024). [*AndroidWorld: A Dynamic Benchmarking Environment for Autonomous Agents*](https://arxiv.org/abs/2405.14573). arXiv:2405.14573.
