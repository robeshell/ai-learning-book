export type ArticleStatus = "stub" | "outline" | "draft" | "published";

export interface Article {
  id: string;
  title: string;
  description: string;
  points: string[];
  order: number;
  prerequisites: string[];
  articleStatus: ArticleStatus;
  videoSource: string;
}

export interface Chapter {
  id: string;
  title: string;
  description: string;
  articles: Article[];
}

export interface Series {
  id: string;
  season: number;
  title: string;
  subtitle: string;
  description: string;
  promise: string;
  badge: string;
  chapters: Chapter[];
}

export const site = {
  title: "看懂人工智能",
  description:
    "大模型底层原理、训练对齐、工具协议与智能体系统的硬核通识长卷。",
};

export const seriesList: Series[] = [
  {
    id: "prerequisites",
    season: 0,
    title: "基础知识",
    subtitle: "AI 计算的物理与数学工具箱",
    description: "显存算力、向量几何、矩阵算子、梯度反传与缓存共享机制。",
    promise: "掌握显存换算、向量点积、矩阵投影、梯度下降与缓存机制。",
    badge: "选读预备",
    chapters: [
      {
        id: "foundations",
        title: "核心工具箱",
        description: "硬件显存账本、高维几何、矩阵投影与梯度学习机制。",
        articles: [
          {
            id: "hardware-foundations",
            title: "显存与计算带宽",
            description: "GPU 并行架构、显存带宽瓶颈与计算内存受限法则。",
            points: [
              "CPU 与 GPU 的本质区别：复杂串行逻辑 vs 高并发浮点",
              "显存容量决定装载上限，显存带宽决定数据搬运速率",
              "浮点数精度换算：FP32、FP16 与 INT8 的字节规律",
              "计算受限（Compute-Bound）与内存受限（Memory-Bound）",
            ],
            order: 1,
            prerequisites: [],
            articleStatus: "draft",
            videoSource: "hardware-foundations",
          },
          {
            id: "vector-and-softmax",
            title: "向量空间与概率计算",
            description: "高维特征坐标、点积余弦相似度与 Softmax 概率归一化。",
            points: [
              "高维向量是计算机量化现实特征的几何坐标",
              "点积（Dot Product）度量两个向量的方向一致性",
              "Softmax 如何把任意实数平滑压缩为总和 100% 的概率分布",
              "动手演算一次真实的向量相似度与 Softmax 归一化",
            ],
            order: 2,
            prerequisites: [],
            articleStatus: "draft",
            videoSource: "vector-and-softmax",
          },
          {
            id: "matrix-and-projection",
            title: "矩阵变换与线性投影",
            description: "空间旋转拉伸、升降维投影与多重视角观察滤镜本质。",
            points: [
              "矩阵乘法本质是高维向量空间的位置变换（拉伸与旋转）",
              "基向量落点：从新坐标系理解线性映射",
              "升维寻找特征可分性，降维提炼信息瓶颈",
              "线性投影：通过权重矩阵切换观察切面",
            ],
            order: 3,
            prerequisites: ["vector-and-softmax"],
            articleStatus: "draft",
            videoSource: "matrix-and-projection",
          },
          {
            id: "neural-network-and-fitting",
            title: "神经网络与数据拟合",
            description: "权重拟合逻辑、人工神经元与非线性激活空间折叠。",
            points: [
              "传统编程与机器学习：人工写死规则 vs 数据拟合参数",
              "人工神经元：线性加权求和与偏置（y = Wx + b）",
              "为什么必须有非线性激活函数：打破线性多层塌陷",
              "多层感知机（MLP）与万能逼近定理的几何折叠直觉",
            ],
            order: 4,
            prerequisites: ["matrix-and-projection"],
            articleStatus: "draft",
            videoSource: "neural-network-and-fitting",
          },
          {
            id: "loss-and-gradient",
            title: "损失函数与梯度下降",
            description: "误差度量标尺、链式法则反向求导与自适应梯度优化。",
            points: [
              "损失函数（Loss）：精准度量预测与真实标签的差距",
              "梯度（Gradient）：高维地形中指出最陡峭的下坡方向",
              "学习率（Learning Rate）与反向传播链式法则直觉",
              "从随机初始化到参数收敛的自适应优化闭环",
            ],
            order: 5,
            prerequisites: ["neural-network-and-fitting"],
            articleStatus: "draft",
            videoSource: "loss-and-gradient",
          },
          {
            id: "stateless-and-cache",
            title: "无状态与缓存机制",
            description: "Client-Server 无状态、通信开销与前缀树缓存共享。",
            points: [
              "Client-Server 架构在物理上完全无状态（Stateless）",
              "多轮交互中的历史重复传输与通信开销",
              "缓存（Cache）的物理哲学：只要算过且复用就绝不重算",
              "前缀树（Trie / Radix Tree）如何高效共享公共前缀",
            ],
            order: 6,
            prerequisites: [],
            articleStatus: "draft",
            videoSource: "stateless-and-cache",
          },
        ],
      },
    ],
  },
  {
    id: "understand-ai",
    season: 1,
    title: "看懂大模型",
    subtitle: "从底层结构到概率预测",
    description: "底层结构、Token 离散化、上下文窗口、概率采样与幻觉成因。",
    promise: "讲清模型结构、显存消耗、提示词引导与幻觉客观必然性。",
    badge: "AI 通识",
    chapters: [
      {
        id: "foundation",
        title: "大模型的物理底座",
        description: "模型参数结构、Token 离散切分与词表张量计算。",
        articles: [
          {
            id: "large-model",
            title: "大模型究竟是什么",
            description: "参数规模、自回归概率拟合与大模型的物理分层。",
            points: [
              "大模型是在海量文本上预训练出的深度学习模型",
              "“大”指参数、数据与算力规模，不是神秘智能",
              "生成靠自回归统计预测，不等于事实已经核实",
              "聊天产品、模型和基座权重要分层看",
            ],
            order: 1,
            prerequisites: [],
            articleStatus: "draft",
            videoSource: "large-model",
          },
          {
            id: "transformer",
            title: "Transformer 与自注意力",
            description: "自注意力机制、QKV 物理投影与全词并发计算。",
            points: [
              "为什么注意力机制能取代传统循环网络",
              "Self-Attention 如何并行计算词语关联",
              "Q、K、V 的直观物理意义",
              "多头注意力与二次方复杂度只讲到能用的程度",
            ],
            order: 2,
            prerequisites: ["large-model"],
            articleStatus: "draft",
            videoSource: "transformer",
          },
          {
            id: "token",
            title: "Token：文字的度量衡",
            description: "BPE 词表切分、中英文切分差异与计费度量衡。",
            points: [
              "Token 是模型接收和吐出文本的基本单位",
              "中英文切分粒度不同，字数不等于 Token 数",
              "词表因模型而异，同一段话在不同模型上计数不同",
              "计费和上下文上限都以 Token 为度量衡",
            ],
            order: 3,
            prerequisites: ["large-model"],
            articleStatus: "draft",
            videoSource: "token",
          },
        ],
      },
      {
        id: "runtime",
        title: "视野极限与计算加速",
        description: "单次推理视野极限、KV Cache 与推测加速。",
        articles: [
          {
            id: "context-window",
            title: "上下文窗口与视野极限",
            description: "注意力覆盖上限、窗口溢出截断与工作记忆本质。",
            points: [
              "窗口是单次推理注意力能覆盖的 Token 上限",
              "System Prompt 占用窗口底仓",
              "超限后的 FIFO 截断与压缩",
              "会话重置后工作台即销毁，不等于长期记忆",
            ],
            order: 4,
            prerequisites: ["token"],
            articleStatus: "draft",
            videoSource: "context-window",
          },
          {
            id: "prompt-caching",
            title: "Prompt Caching 前缀缓存",
            description: "KV Cache 显存开销、前缀缓存命中与首字延迟优化。",
            points: [
              "KV Cache 为何占用显存",
              "前缀缓存命中如何跳过重复计算",
              "TTFT（首字延迟）为什么会下降",
              "云厂商按缓存命中降本的逻辑",
            ],
            order: 5,
            prerequisites: ["context-window"],
            articleStatus: "draft",
            videoSource: "prompt-caching",
          },
          {
            id: "inference-speed",
            title: "推理加速与推测采样",
            description: "PagedAttention 显存分页、推测采样与吞吐延迟权衡。",
            points: [
              "vLLM 一类系统如何对显存做分页",
              "小模型起草、大模型秒审的推测采样",
              "吞吐和延迟不是同一件事",
              "加速不改变模型会不会说错",
            ],
            order: 6,
            prerequisites: ["prompt-caching"],
            articleStatus: "draft",
            videoSource: "inference-speed",
          },
        ],
      },
      {
        id: "generation",
        title: "概率生成与提示控制",
        description: "自回归概率预测、采样控制与稀疏门控路由。",
        articles: [
          {
            id: "next-token",
            title: "Next-Token 概率预测",
            description: "Logits、采样温度/Top-P 与上下文学习。",
            points: [
              "下一步预测是词表上的概率分布，不是检索答案",
              "Temperature 和 Top-P 如何改变随机性",
              "In-Context Learning 是窗口里的条件，不是改权重",
              "流畅来自高概率搭配",
            ],
            order: 7,
            prerequisites: ["token"],
            articleStatus: "draft",
            videoSource: "next-token",
          },
          {
            id: "prompt",
            title: "提示词在做什么",
            description: "输入 Token 序列注意力引导与概率生成轨道收拢。",
            points: [
              "提示词本质是输入 Token 序列",
              "通过注意力收拢下一步的概率轨道",
              "System 与 User 是分层约束，不是两种魔法",
              "提示词不能突破模型的知识和逻辑上限",
            ],
            order: 8,
            prerequisites: ["next-token"],
            articleStatus: "draft",
            videoSource: "prompt",
          },
          {
            id: "moe",
            title: "MoE 混合专家模型",
            description: "稀疏门控路由、条件激活与大参数低显存权衡。",
            points: [
              "混合专家是稀疏激活，不是每次叫醒全部参数",
              "门控网络负责把 Token 路由到专家",
              "为何高总参数可以对应较低激活显存",
              "和 Dense 模型的取舍",
            ],
            order: 9,
            prerequisites: ["transformer"],
            articleStatus: "draft",
            videoSource: "moe",
          },
        ],
      },
      {
        id: "limits",
        title: "统计本质与幻觉必然性",
        description: "统计概率拟合与客观事实脱钩的物理成因。",
        articles: [
          {
            id: "hallucination",
            title: "为什么大模型会幻觉",
            description: "统计概率拟合与事实脱钩、Grounding 锚定必要性。",
            points: [
              "幻觉是高概率、语法通顺但事实不成立的生成",
              "模型优化的是统计相关性，不是真伪判断",
              "Grounding 要把生成落到可核验依据上",
              "这是引出外挂检索、工具和智能体的原因",
            ],
            order: 10,
            prerequisites: ["next-token", "prompt"],
            articleStatus: "draft",
            videoSource: "hallucination",
          },
        ],
      },
    ],
  },
  {
    id: "how-models-train",
    season: 2,
    title: "大模型是怎么炼成的",
    subtitle: "从接龙到深度思考",
    description: "预训练基座、合成数据、SFT、偏好对齐与量化蒸馏。",
    promise: "掌握 Base、SFT、RLHF/DPO 与慢思考推理模型的工序差异。",
    badge: "AI 制造",
    chapters: [
      {
        id: "raw-model",
        title: "基座预训练：海量语料接龙",
        description: "无标注语料自监督接龙与高质量合成数据构建。",
        articles: [
          {
            id: "pre-training",
            title: "预训练与基座模型",
            description: "无标注自监督接龙、Scaling Law 经验定律与 Base 模型。",
            points: [
              "预训练用无标注文本做 next-token 学习",
              "Scaling Law 描述规模与能力的经验关系",
              "Base 模型是毛坯，默认不会按指令听话",
              "本季后续工序都是在这块毛坯上装修",
            ],
            order: 1,
            prerequisites: ["large-model"],
            articleStatus: "draft",
            videoSource: "pre-training",
          },
          {
            id: "synthetic-data",
            title: "合成数据与语料自造",
            description: "语料枯竭对策、代码形式化判题与自造训练数据。",
            points: [
              "公开高质量文本正在变稀缺",
              "模型出题、编译器或形式化工具判对错",
              "合成数据有飞轮，也有污染风险",
              "它补的是训练数据，不是推理时的事实",
            ],
            order: 2,
            prerequisites: ["pre-training"],
            articleStatus: "draft",
            videoSource: "synthetic-data",
          },
        ],
      },
      {
        id: "alignment",
        title: "后训练对齐：指令与偏好",
        description: "指令微调守格式、人类偏好对齐与安全排雷。",
        articles: [
          {
            id: "sft",
            title: "SFT 指令微调",
            description: "监督指令微调、问答格式对齐与模型角色扮演。",
            points: [
              "SFT 用指令-回答对做监督学习",
              "它教会角色、格式和“像在回答人”",
              "数据质量比数量更决定脾气",
              "SFT 之后仍未必按人类偏好排雷",
            ],
            order: 3,
            prerequisites: ["pre-training"],
            articleStatus: "draft",
            videoSource: "sft",
          },
          {
            id: "rlhf-and-dpo",
            title: "RLHF 与 DPO 偏好对齐",
            description: "奖励模型、人类偏好对齐与 DPO 隐式策略优化。",
            points: [
              "RLHF 先学奖励模型，再优化生成策略",
              "DPO 用正负样本直接改策略",
              "对齐在改“更愿说什么”，不是补新知识",
              "安全红线与讨好评测者会一起出现",
            ],
            order: 4,
            prerequisites: ["sft"],
            articleStatus: "draft",
            videoSource: "rlhf-and-dpo",
          },
        ],
      },
      {
        id: "deep-thinking",
        title: "深度推理与模型轻量化",
        description: "思维链慢思考试错与权重低比特压缩。",
        articles: [
          {
            id: "reasoning-models",
            title: "深度推理与慢思考模型",
            description: "思维链（CoT）、可验证规则强化（RLVR）与慢思考。",
            points: [
              "CoT 把中间步骤写出来，给搜索和检查留空间",
              "RLVR 用可验证规则给奖励，而不是只听人打分",
              "慢思考换的是测试时计算，不是魔法智商",
              "它仍可能流畅地走错推理路径",
            ],
            order: 5,
            prerequisites: ["rlhf-and-dpo"],
            articleStatus: "draft",
            videoSource: "reasoning-models",
          },
          {
            id: "distillation-quantization",
            title: "模型蒸馏与量化压缩",
            description: "教师模型蒸馏、INT8/INT4 低比特量化与 LoRA 微调。",
            points: [
              "蒸馏是把大模型的轨迹教给小模型",
              "量化用更少比特存权重，换显存和速度",
              "LoRA 改的是少量附加参数，不是重训全网",
              "瘦身会损失能力，边界要讲清楚",
            ],
            order: 6,
            prerequisites: ["sft"],
            articleStatus: "draft",
            videoSource: "distillation-quantization",
          },
        ],
      },
    ],
  },
  {
    id: "models-at-work",
    season: 3,
    title: "给大模型装上手和脚",
    subtitle: "连接资料与外部世界",
    description: "向量嵌入、RAG 检索增强、函数调用、MCP 与 Skill。",
    promise: "掌握私有知识挂接、外部工具调用与标准化协议连接。",
    badge: "外部连接",
    chapters: [
      {
        id: "retrieve",
        title: "外挂知识库：向量检索召回",
        description: "文本语义向量化与外挂私有知识检索召回。",
        articles: [
          {
            id: "rag",
            title: "RAG 检索增强生成",
            description: "外挂检索召回、知识注入与幻觉抑制基础闭环。",
            points: [
              "RAG 把检索到的片段当作这一次的依据",
              "切块粒度会直接决定召回质量",
              "它补的是窗口里的事实，不是永久记忆",
              "检索错了，生成会一本正经地跟着错",
            ],
            order: 1,
            prerequisites: ["hallucination", "context-window"],
            articleStatus: "draft",
            videoSource: "rag",
          },
          {
            id: "embeddings",
            title: "Embedding 向量嵌入",
            description: "高维向量语义编码、距离度量与文本表征模型。",
            points: [
              "Embedding 把文本映射成向量",
              "余弦相似度衡量的是几何邻近，不是逻辑蕴含",
              "向量库负责存和搜，不负责保证正确",
              "这是 RAG 召回的底座",
            ],
            order: 2,
            prerequisites: ["rag"],
            articleStatus: "draft",
            videoSource: "embeddings",
          },
          {
            id: "advanced-rag",
            title: "高阶 RAG 与图谱检索",
            description: "分块优化、多路召回、重排序（Rerank）与上下文压缩。",
            points: [
              "固定切块会切断关系和表格",
              "GraphRAG 一类方法在补实体关系",
              "Agentic 检索会多轮改写查询",
              "更复杂的检索仍需要可核验出处",
            ],
            order: 3,
            prerequisites: ["rag", "embeddings"],
            articleStatus: "draft",
            videoSource: "advanced-rag",
          },
        ],
      },
      {
        id: "action",
        title: "跨出语言界限：动作与结构",
        description: "函数调用参数生成与 JSON Schema 结构化约束。",
        articles: [
          {
            id: "tool-calling",
            title: "工具调用与动作执行",
            description: "函数声明注入、模型结构化决策与外部 API 触发。",
            points: [
              "Tool Calling 是生成结构化请求，不是模型直接联网",
              "执行权在宿主系统，不在权重里",
              "结果回填窗口后，模型再继续写",
              "这是从“只说话”走到“能办事”的分界",
            ],
            order: 4,
            prerequisites: ["prompt"],
            articleStatus: "draft",
            videoSource: "tool-calling",
          },
          {
            id: "structured-output",
            title: "严格结构化输出",
            description: "JSON Schema 约束、Grammar 语法树引导与确定性输出。",
            points: [
              "聊天文本对程序不可靠",
              "JSON Schema / Strict Mode 把语法变成硬约束",
              "约束的是形状，不是内容真伪",
              "它常和工具调用一起出现",
            ],
            order: 5,
            prerequisites: ["tool-calling"],
            articleStatus: "draft",
            videoSource: "structured-output",
          },
        ],
      },
      {
        id: "protocols",
        title: "能力标准化：MCP 与 Skill",
        description: "统一接入协议与标准化专业技能包打包。",
        articles: [
          {
            id: "mcp",
            title: "MCP 统一接入协议",
            description: "统一工具接口、资源挂载与服务通信标准。",
            points: [
              "MCP 要解决的是客户端和工具各接各的",
              "Tools / Resources / Prompts 是三种能力面",
              "协议不自动等于安全，权限仍在宿主",
              "它是总线，不是智能本身",
            ],
            order: 6,
            prerequisites: ["tool-calling"],
            articleStatus: "draft",
            videoSource: "mcp",
          },
          {
            id: "skill",
            title: "Skill 专业技能包",
            description: "打包作业规程、提示词模板与脚本资源标准化。",
            points: [
              "Skill 是打包的作业规程，不是一句 prompt",
              "它可以包含说明、脚本和资源",
              "和 MCP 工具的分工：规程 vs 接口",
              "技能包仍然受窗口、权限和幻觉约束",
            ],
            order: 7,
            prerequisites: ["mcp"],
            articleStatus: "draft",
            videoSource: "skill",
          },
        ],
      },
    ],
  },
  {
    id: "agent-systems",
    season: 4,
    title: "AI 智能体怎么替人干活",
    subtitle: "从问答走向自主行动",
    description: "ReAct 循环、底盘生命周期、记忆、规划、多体与安全评测。",
    promise: "分清 Chatbot 与 Agent，搞懂 Harness 底盘与执行沙箱。",
    badge: "智能体",
    chapters: [
      {
        id: "loop",
        title: "单体闭环：思考循环与底盘",
        description: "思考行动反馈闭环、底盘生命周期与三层记忆。",
        articles: [
          {
            id: "agent-loop",
            title: "AI Agent 自主闭环",
            description: "思考行动观察闭环、自主停机与动态决策。",
            points: [
              "Agent 是看目标、选动作、看反馈、再决策的循环",
              "Chatbot 默认停在一次回答，Agent 默认继续到停机条件",
              "ReAct 把推理和行动写在同一条轨迹里",
              "循环本身不保证做对，只保证能试",
            ],
            order: 1,
            prerequisites: ["tool-calling"],
            articleStatus: "draft",
            videoSource: "agent-loop",
          },
          {
            id: "agent-harness",
            title: "Harness 智能体底盘",
            description: "宿主生命周期、权限沙箱、上下文压缩与恢复。",
            points: [
              "Harness 管生命周期，模型不管",
              "权限截获、超时、断点续传都在宿主",
              "上下文爆窗时由宿主裁剪，不是模型自觉",
              "没有底盘就只是会说话的函数",
            ],
            order: 2,
            prerequisites: ["agent-loop"],
            articleStatus: "draft",
            videoSource: "agent-harness",
          },
          {
            id: "agent-memory",
            title: "智能体的三层记忆",
            description: "三级存储层级、上下文窗口与向量检索分工。",
            points: [
              "窗口是工作记忆，不是档案室",
              "短期状态可存在宿主，跨轮也不等于懂你",
              "长期记忆常用检索或键值，会过时也会错",
              "压缩会丢细节，要当工程问题看",
            ],
            order: 3,
            prerequisites: ["agent-loop", "context-window"],
            articleStatus: "draft",
            videoSource: "agent-memory",
          },
          {
            id: "planning-reflection",
            title: "任务规划与自我反思",
            description: "Plan-and-Solve 任务拆解、动态重规划与反思。",
            points: [
              "Plan-and-Solve 把大目标拆成可执行步骤",
              "反思是看反馈后改计划，不是突然有了良知",
              "自愈依赖错误信号是否可检验",
              "没有停机条件和预算，反思会空转",
            ],
            order: 4,
            prerequisites: ["agent-loop"],
            articleStatus: "draft",
            videoSource: "planning-reflection",
          },
        ],
      },
      {
        id: "scale-security",
        title: "群体智能与安全控制",
        description: "多智能体协作、GUI 交互、注入防御与安全评测。",
        articles: [
          {
            id: "multi-agent",
            title: "多智能体协同与分工",
            description: "角色隔离、协作拓扑与结构化交付协议。",
            points: [
              "多 Agent 解决单上下文过载与角色冲突",
              "编排模式：流水线、主从分发、对齐讨论",
              "通信协议要防广播风暴和循环死锁",
              "多模型协作不等于正确率自然提升",
            ],
            order: 5,
            prerequisites: ["agent-loop"],
            articleStatus: "draft",
            videoSource: "multi-agent",
          },
          {
            id: "coding-computer-use",
            title: "Coding 与 Computer Use",
            description: "代码生成执行、GUI 屏幕坐标点击与环境交互。",
            points: [
              "代码是结构化动作的最优载体",
              "Computer Use 通过屏幕截图和坐标点击操作 GUI",
              "无头 API 优先于 GUI 点击",
              "环境状态回读是闭环的核心",
            ],
            order: 6,
            prerequisites: ["tool-calling"],
            articleStatus: "draft",
            videoSource: "coding-computer-use",
          },
          {
            id: "prompt-injection",
            title: "提示词注入与越狱攻防",
            description: "指令与数据混淆、越狱绕过与纵深防御沙箱。",
            points: [
              "间接注入把恶意指令藏在网页或邮件里",
              "越狱通过角色扮演绕过安全护栏",
              "数据与指令混淆是 LLM 架构级缺陷",
              "防御需靠输入过滤、权限隔离与双模型校验",
            ],
            order: 7,
            prerequisites: ["prompt"],
            articleStatus: "draft",
            videoSource: "prompt-injection",
          },
          {
            id: "agent-eval-control",
            title: "评测基准与人在回路",
            description: "任务评测基准、人在回路审批与质量回归体系。",
            points: [
              "沙箱限制文件系统、网络和副作用",
              "人在回路是高风险动作的闸门",
              "Eval 要把任务结果变成可重复分数",
              "没有 tracing，失败无法定位是模型还是工具",
            ],
            order: 8,
            prerequisites: ["agent-harness"],
            articleStatus: "draft",
            videoSource: "agent-eval-control",
          },
        ],
      },
    ],
  },
  {
    id: "multimodal-and-limits",
    season: 5,
    title: "大模型的感官与物理极限",
    subtitle: "多模态演进与物理极限",
    description: "视觉语音多模态、端侧轻量化、长文本退化与物理极限。",
    promise: "掌握多模态 Token 统一计算与大模型不可逾越的物理边界。",
    badge: "前沿形态",
    chapters: [
      {
        id: "senses",
        title: "感官扩展：视觉与语音",
        description: "图像切片与音频波形统一接入 Token 计算。",
        articles: [
          {
            id: "vision-llm",
            title: "视觉大模型与多模态",
            description: "Patch 图像切片、视觉 Token 编码与跨模态对齐。",
            points: [
              "图像被切成 Patch，再变成视觉 Token",
              "对齐层把视觉和语言接到可一起注意的空间",
              "能描述不等于能可靠定位或计数",
              "视觉输入同样占用上下文窗口",
            ],
            order: 1,
            prerequisites: ["token", "transformer"],
            articleStatus: "draft",
            videoSource: "vision-llm",
          },
          {
            id: "audio-llm",
            title: "实时语音与全双工",
            description: "端到端语音建模、全双工低延迟对话与声学特征。",
            points: [
              "级联 ASR + LLM + TTS 会引入延迟和信息损失",
              "端到端语音模型在同一条链路里听和说",
              "全双工才谈得上打断和重叠对话",
              "情绪感知仍是统计相关，不是共情",
            ],
            order: 2,
            prerequisites: ["vision-llm"],
            articleStatus: "draft",
            videoSource: "audio-llm",
          },
        ],
      },
      {
        id: "edge",
        title: "端侧轻量化：本地离线计算",
        description: "端侧设备离线推理与能耗隐私折中。",
        articles: [
          {
            id: "on-device-ai",
            title: "端侧模型与本地离线计算",
            description: "端侧模型量化、NPU 离线计算与隐私算力折中。",
            points: [
              "端侧首先受内存和功耗约束",
              "量化和蒸馏是能塞进设备的前提",
              "本地运行换隐私和离线，不换同等能力",
              "设备上的模型仍然会幻觉",
            ],
            order: 3,
            prerequisites: ["distillation-quantization"],
            articleStatus: "draft",
            videoSource: "on-device-ai",
          },
        ],
      },
      {
        id: "boundaries",
        title: "终极边界：长文本与客观物理墙",
        description: "注意力衰减规律与数据算力物理上限。",
        articles: [
          {
            id: "context-rot",
            title: "长文本退化与注意力衰减",
            description: "长文本注意力衰减、迷失在中间与召回劣化。",
            points: [
              "标称窗口长度不等于有效工作记忆",
              "Lost in the Middle 说明位置会影响召回",
              "Context Rot 是能力随长度变差，不是突然坏掉",
              "更长窗口不能替代检索和外挂记忆",
            ],
            order: 4,
            prerequisites: ["context-window"],
            articleStatus: "draft",
            videoSource: "context-rot",
          },
          {
            id: "model-limits",
            title: "大模型的物理极限",
            description: "语料枯竭、统计非零误差与客观物理墙。",
            points: [
              "高质量人类语料正在变贵、变少",
              "幻觉可以压低，不能承诺为零",
              "算力能换平均表现，换不来担保",
              "金钱、医疗、法律和不可逆操作不能让模型独自拍板",
            ],
            order: 5,
            prerequisites: ["hallucination", "context-rot"],
            articleStatus: "draft",
            videoSource: "model-limits",
          },
        ],
      },
    ],
  },
];

export interface ArticleRef {
  series: Series;
  chapter: Chapter;
  article: Article;
}

const articleIndex = new Map<string, ArticleRef>();
for (const series of seriesList) {
  for (const chapter of series.chapters) {
    for (const article of chapter.articles) {
      articleIndex.set(article.id, { series, chapter, article });
    }
  }
}

export function findArticle(id: string): ArticleRef | undefined {
  return articleIndex.get(id);
}

export function articleHref(seriesId: string, articleId: string): string {
  return `/series/${seriesId}/${articleId}`;
}

export function seriesHref(seriesId: string): string {
  return `/series/${seriesId}/`;
}

export function allArticles(): ArticleRef[] {
  return [...articleIndex.values()].sort((a, b) => {
    if (a.series.season !== b.series.season) {
      return a.series.season - b.series.season;
    }
    return a.article.order - b.article.order;
  });
}

export function seriesProgress(series: Series): { ready: number; total: number } {
  const articles = series.chapters.flatMap((chapter) => chapter.articles);
  const ready = articles.filter(
    (article) => article.articleStatus !== "stub",
  ).length;
  return { ready, total: articles.length };
}

export function buildNav() {
  const topics = seriesList.filter((s) => s.season > 0);
  return [
    { text: "学习地图", link: "/" },
    {
      text: "专题",
      items: topics.map((series) => ({
        text: `第${seasonLabel(series.season)}季 · ${series.title}`,
        link: seriesHref(series.id),
      })),
    },
    { text: "基础知识", link: seriesHref("prerequisites") },
  ];
}

export function buildSidebar() {
  const sidebar: Record<string, ReturnType<typeof sidebarForSeries>> = {};
  for (const series of seriesList) {
    sidebar[`/series/${series.id}/`] = sidebarForSeries(series);
  }
  return sidebar;
}

function sidebarForSeries(series: Series) {
  const sectionTitle =
    series.season === 0
      ? "基础知识"
      : `第${seasonLabel(series.season)}季 · ${series.title}`;
  const overviewText = series.season === 0 ? "基础知识概览" : "本季概览";

  return [
    {
      text: sectionTitle,
      items: [{ text: overviewText, link: seriesHref(series.id) }],
    },
    ...series.chapters.map((chapter) => ({
      text: chapter.title,
      collapsed: false,
      items: chapter.articles.map((article) => ({
        text: `${String(article.order).padStart(2, "0")} ${article.title}`,
        link: articleHref(series.id, article.id),
      })),
    })),
  ];
}

export function seasonLabel(season: number): string {
  return ["零", "一", "二", "三", "四", "五"][season] ?? String(season);
}
