---
title: "智能体的三层记忆"
description: "工作记忆、短期会话状态与长期向量检索分工。"
series: agent-systems
chapter: loop
order: 3
type: concept
articleStatus: draft
prerequisites:
  - "agent-loop"
  - "context-window"
videoSource: agent-memory
---

# 智能体的三层记忆

在人类解决复杂现实任务时，我们依赖于不同层级的大脑记忆机制：正在读写代码时的**瞬时工作记忆**、跟踪今天任务进度的**短期会话记忆**、以及沉淀在潜意识里的**长期专业经验**。

对于 AI 智能体而言，如果把所有历史对话和中间结果无脑塞进上下文窗口，系统会迅速面临三大物理危机：
1. **上下文物理溢出（Context Overflow）**：哪怕是 200k Token 的窗口，在多轮执行几百次工具调用后也会被耗尽；
2. **注意力稀释与幻觉飙升**：窗口中充斥着几万行无用的旧试错日志，会导致模型对当前关键目标的注意力急剧衰减；
3. **会话重启即失忆**：大模型的单次推理是完全无状态的，窗口一旦重置，之前沉淀的所有用户偏好与经验教训彻底归零。

如何构建一套兼顾高吞吐推理与持久化沉淀的记忆系统？

这就是现代智能体系统的标准分级哲学——**智能体的三层记忆架构**。

<figure>
  <img src="/figures/agent-memory/three-tier-memory-hierarchy.svg" alt="AI 智能体的三层记忆分级架构" />
  <figcaption>工作记忆、会话状态与长期存储分级</figcaption>
</figure>

---

## 三层记忆分工与存储介质

### 第 1 层：工作记忆（Working Memory / In-Context Buffer）
- **物理介质**：当前推理周期的**上下文窗口（Context Window / GPU 显存）**；
- **定位与内容**：智能体的「当前工作台」。存放当前正在执行的一两轮 `Thought-Action-Observation`、紧迫的局部代码片段与即时输入；
- **特点**：支持全量双向 Self-Attention 深度交互，响应速度极快；缺点是容量严格受限，且在单次推理或会话结束后即被销毁。

### 第 2 层：短期会话状态（Short-term State / Session Memory）
- **物理介质**：宿主内存、Redis 缓存或本地 SQLite 数据库；
- **定位与内容**：当前任务的「项目看板与任务草稿纸（Scratchpad）」。存放整个长程任务的步骤分解清单、已完成事项打勾标记、变量状态与 Checkpoint 快照；
- **特点**：支撑智能体在执行 20~50 轮长程任务中保持目标一致性，支持断点续传；在人类宣布当前任务彻底交付后归档清空。

### 第 3 层：长期经验记忆（Long-term Store / Persistent Memory）
- **物理介质**：向量数据库（Vector DB / RAG）或本地持久化文件（如 `memory/*.md`）；
- **定位与内容**：跨越多个会话的「数字档案室与经验沉淀库」。存放用户的长期编码偏好（如*“本项目使用 pnpm”*）、架构约定与历史采坑总结；
- **特点**：跨会话永久保存。在新任务启动时，通过 Embedding 语义检索按需唤醒（Recall）并注入第 1 层工作记忆。

---

## 记忆流转与压缩代价

<figure>
  <img src="/figures/agent-memory/memory-compression-retrieval.svg" alt="记忆生命周期：上下文压缩与长期检索" />
  <figcaption>窗口溢出压缩与长期经验语义唤回</figcaption>
</figure>

智能体的记忆在三个层级之间动态流转，工程师必须正视其中的**工程代价**：

1. **摘要压缩的细节损耗（Summarization Loss）**：
   - 当第 1 层工作记忆达到 85% 阈值时，Harness 底盘会调用模型对过往历史执行滚动摘要（Rolling Summary）；
   - 摘要提炼虽然释放了 70% 的 Token，但**不可避免会丢失微观数值、精确行号和边缘异常信息**。
2. **记忆陈旧与冲突（Stale & Conflicting Memories）**：
   - 长期记忆库中如果记录了旧版的 API 规范，当项目升级后，模型再次检索出旧记忆就会产生严重的「经验主义误导」；
   - 必须为长期记忆设计基于事实检验的**更新（Update）、置信度衰减与淘汰机制（TTL）**。

---

## 最小代码实现

下面的代码实现了一个极简的三层记忆系统：演示工作台缓冲、短期任务草稿纸与基于关键词/语义的长期记忆唤回：

```python
from typing import List, Dict, Any

class AgentMemorySystem:
    def __init__(self):
        # 第 3 层: 长期记忆 (持久化存储)
        self.long_term_store: List[str] = [
            "【规则】本项目前端严格使用 TailwindCSS，禁止手写内联 CSS",
            "【偏好】用户偏好使用 pytest 运行测试，要求覆盖率大于 80%",
            "【历史】旧版 auth 模块曾发生过 JWT 密钥硬编码泄漏故障"
        ]
        # 第 2 层: 短期会话状态 (当前任务 Scratchpad)
        self.session_scratchpad: List[Dict[str, Any]] = []
        # 第 1 层: 工作记忆 (当前推理窗口)
        self.working_buffer: List[str] = []

    def recall_long_term(self, query: str) -> List[str]:
        """从长期记忆中语义检索相关经验 (关键词/语义匹配示意)"""
        keywords = ["前端", "测试", "auth", "CSS", "pytest"]
        hit_keywords = [kw for kw in keywords if kw in query]
        recalled = [mem for mem in self.long_term_store if any(kw in mem for kw in hit_keywords)]
        return recalled

    def start_task(self, task_goal: str):
        print(f"[任务初始化]: {task_goal}")
        
        # 1. 从长期记忆检索先验经验
        relevant_memories = self.recall_long_term(task_goal)
        print(f"[长期记忆唤回]: 检索到 {len(relevant_memories)} 条历史经验")
        
        # 2. 注入第 1 层工作记忆
        self.working_buffer.append(f"System: 长期记忆参考 -> {relevant_memories}")
        self.working_buffer.append(f"User: {task_goal}")
        
        # 3. 在第 2 层会话状态中建立步骤规划
        self.session_scratchpad = [
            {"step": 1, "desc": "检查前端组件样式", "done": False},
            {"step": 2, "desc": "编写单元测试并验证", "done": False}
        ]

    def record_step_done(self, step_idx: int, thought: str):
        """更新第 2 层状态并在第 1 层追加工作记忆"""
        self.session_scratchpad[step_idx - 1]["done"] = True
        self.working_buffer.append(f"Step {step_idx} Done: {thought}")
        print(f"[短期看板更新]: 步骤 {step_idx} 已打勾完成！")

# 模拟运行
memory = AgentMemorySystem()
print("--- 启动三层记忆流转 ---")
memory.start_task("重构前端登录按钮并补全测试")
memory.record_step_done(1, "采用 TailwindCSS 规范完成了按钮重构")
memory.record_step_done(2, "使用 pytest 完成了 100% 测试用例覆盖")
```

**控制台输出：**
```text
--- 启动三层记忆流转 ---
[任务初始化]: 重构前端登录按钮并补全测试
[长期记忆唤回]: 检索到 2 条历史经验
[短期看板更新]: 步骤 1 已打勾完成！
[短期看板更新]: 步骤 2 已打勾完成！
```

---

## 核心概念辨析

- **工作记忆（Working Memory） vs 长期记忆（Long-term Store）**：
  - 工作记忆是当前推理窗口里的瞬时工作台，注意力和刷新极快，关机即清空；
  - 长期记忆是磁盘/向量库中的外挂经验库，跨越多个任务永久沉淀，按需唤醒。
- **短期会话状态（Session State） vs 提示词上下文**：
  - 会话状态保存在宿主数据库中，掌控多轮任务的进度与 Checkpoint；
  - 提示词上下文是单次喂给模型的原始 Token 流。
- **记住全部 vs 智能摘要**：
  - 企图在单窗口记住所有细节是不可能的物理幻想；
  - 优秀的系统通过滚动摘要与向量检索，在信息压缩与关键事实保留之间取得工程平衡。

有了记忆与执行底盘，智能体在面对数小时的超级长任务时，如何进行顶层规划并纠正执行中的偏差？下一篇我们将探讨——《任务规划与自我反思》。

---

## 参考文献

1. Park, Joon Sung, O'Brien, Joseph C., Cai, Carrie J., et al. (2023). [*Generative Agents: Interactive Simulacra of Human Behavior*](https://arxiv.org/abs/2304.03442). UIST 2023 / arXiv:2304.03442.
2. Packer, Charles, Wooders, Vivian, Lin, Kevin, et al. (2023). [*MemGPT: Towards LLMs as Operating Systems (Hierarchical Memory)*](https://arxiv.org/abs/2310.08560). arXiv:2310.08560.
3. Anthropic. (2024). [*Building Effective Agents: Memory Architecture & Retrieval*](https://www.anthropic.com/research/building-effective-agents). Anthropic Research.
4. Hu, Chenxu, Fu, Jie, Du, Chenzhuang, et al. (2023). [*ChatDB: Augmenting LLMs with Databases as Their Symbolic Memory*](https://arxiv.org/abs/2306.03901). arXiv:2306.03901.
