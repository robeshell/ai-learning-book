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
    "从大模型底层结构、训练对齐、工具与协议，到智能体与物理极限的系统学习笔记。",
};

export const seriesList: Series[] = [
  {
    id: "prerequisites",
    season: 0,
    title: "基础知识",
    subtitle: "大模型的底层物理与数学工具箱",
    description:
      "在进入大模型世界前，先掌握硬件账本、向量几何、矩阵算子、梯度学习与无状态缓存这六大基础工具。",
    promise:
      "掌握显存换算、向量点积、矩阵投影、梯度下降与无状态缓存的底层原理，读懂大模型不再有数学与硬件门槛。",
    badge: "选读预备",
    chapters: [
      {
        id: "foundations",
        title: "核心工具箱",
        description:
          "从显存带宽计算、高维向量空间到矩阵投影、梯度下降与前缀树，亲手演算一遍 AI 最底层的物理与数学机制。",
        articles: [
          {
            id: "hardware-foundations",
            title: "显存与计算带宽",
            description:
              "参数量与显存换算、显存带宽瓶颈，以及为什么每吐一个字都要搬运整套模型。",
            points: [
              "CPU 与 GPU 的本质区别：串行逻辑 vs 矩阵高并发",
              "显存容量决定装不装得下，显存带宽决定吐字有多快",
              "为什么半精度 FP16 模式下每个参数占 2 个字节",
              "手算大模型单字生成延迟的物理下限",
            ],
            order: 1,
            prerequisites: [],
            articleStatus: "draft",
            videoSource: "hardware-foundations",
          },
          {
            id: "vector-and-softmax",
            title: "向量空间与概率计算",
            description:
              "词如何变成高维坐标、点积为什么能度量语义关联，以及分数如何转为概率。",
            points: [
              "高维向量是计算机理解语义的几何坐标",
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
            description:
              "矩阵乘法的几何直觉、空间旋转与升降维投影，以及权重如何充当语义滤镜。",
            points: [
              "矩阵乘法本质是高维向量空间的位置变换（拉伸与旋转）",
              "线性投影（Linear Projection）：用权重矩阵切换观察视角",
              "升维寻找线性可分特征，降维压缩信息瓶颈",
              "为什么 Transformer 的 Q、K、V 本质是三个投影矩阵",
            ],
            order: 3,
            prerequisites: ["vector-and-softmax"],
            articleStatus: "outline",
            videoSource: "matrix-and-projection",
          },
          {
            id: "neural-network-and-fitting",
            title: "神经网络与数据拟合",
            description:
              "从写死规则到权重拟合，以及非线性激活函数如何赋予网络折叠弯曲空间的能力。",
            points: [
              "传统编程与机器学习：写死规则 vs 拟合参数",
              "人工神经元：线性加权求和与偏置（y = Wx + b）",
              "为什么必须有非线性激活函数（ReLU / GELU）：赋予空间折叠能力",
              "多层感知机（MLP）为什么能逼近任意复杂的现实规律",
            ],
            order: 4,
            prerequisites: ["matrix-and-projection"],
            articleStatus: "outline",
            videoSource: "neural-network-and-fitting",
          },
          {
            id: "loss-and-gradient",
            title: "损失函数与梯度下降",
            description:
              "量化预测差距的度量衡、盲人下山的梯度直觉，以及千亿参数如何协同微调。",
            points: [
              "损失函数（Loss）：用一把尺子精准量化模型预测与真实答案的差距",
              "梯度（Gradient）：在千亿维度空间里指出最快下山的方向",
              "学习率（Learning Rate）与反向传播（Backprop）链式法则直觉",
              "模型从随机噪音蜕变为连贯语言的物理过程",
            ],
            order: 5,
            prerequisites: ["neural-network-and-fitting"],
            articleStatus: "outline",
            videoSource: "loss-and-gradient",
          },
          {
            id: "stateless-and-cache",
            title: "无状态与缓存机制",
            description:
              "无状态 HTTP 请求的现实意义、空间换时间的缓存哲学，以及前缀树匹配。",
            points: [
              "大模型服务在物理上完全无状态（Stateless）",
              "多轮对话由应用层全量重传，Token 呈现等差累积",
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
    description:
      "从参数结构、Token 切分、上下文窗口讲到概率预测与幻觉本质，带你看懂大模型底层究竟是怎么运转的。",
    promise:
      "看完后能用大白话讲清大模型是怎么切分文字、怎样消耗显存、为什么能被提示词引导，以及为什么流畅的回答可以一本正经地瞎编。",
    badge: "AI 通识",
    chapters: [
      {
        id: "foundation",
        title: "大模型的物理底座",
        description: "拆解大模型究竟由什么构成，文字如何变成模型能算的数字编号与张量。",
        articles: [
          {
            id: "large-model",
            title: "大模型究竟是什么",
            description: "参数与结构、预训练与自回归、规模效应，以及产品和模型为什么不是一层。",
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
            description: "自注意力如何并行计算词汇关联，以及 QKV 的直观物理意义。",
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
            description: "文本如何被切成数字编号，以及计费和容量为什么都按 Token 算。",
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
        description: "从单次运算的视野极限，到如何利用缓存与推测采样大幅降本提速。",
        articles: [
          {
            id: "context-window",
            title: "上下文窗口与视野极限",
            description: "单次推理能看见多远，以及窗口为什么不是长期记忆。",
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
            description: "KV Cache 和前缀缓存如何降低首字延迟和重复计算成本。",
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
            description: "PagedAttention 与推测采样如何让模型吐字越来越快。",
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
        description: "大模型如何一步步预测文字，提示词如何通过注意力收拢生成轨道。",
        articles: [
          {
            id: "next-token",
            title: "Next-Token 概率预测",
            description: "Logits、温度、Top-P，以及上下文学习究竟在改什么。",
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
            description: "提示词是进入窗口的 Token 序列，不是神秘咒语。",
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
            description: "稀疏激活和门控路由，为什么总参数很大、一次只用一部分。",
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
        description: "为什么大模型必然会产生幻觉，为什么不能让统计预测模型独自拍板。",
        articles: [
          {
            id: "hallucination",
            title: "为什么大模型会幻觉",
            description: "概率拟合不是客观真实，流畅的句子可以完全没有事实依据。",
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
    description:
      "从预训练基座、合成数据、SFT、偏好对齐到推理模型与瘦身，拆解一个大模型诞生的工业工序。",
    promise:
      "看完后能分清 Base、Chat/Instruct、RLHF/DPO 与慢思考推理模型的本质区别与工业工序。",
    badge: "AI 制造",
    chapters: [
      {
        id: "raw-model",
        title: "基座预训练：从海量语料到语言模型",
        description: "数万亿文本如何变成只会接龙的基座模型，以及合成数据如何补充高质量语料。",
        articles: [
          {
            id: "pre-training",
            title: "预训练与基座模型",
            description: "自监督接龙、Scaling Law，以及 Base 为什么还不是聊天助手。",
            points: [
              "预训练用无标注文本做 next-token 学习",
              "Scaling Law 描述规模与能力的经验关系",
              "Base 模型是毛坯，默认不会按指令听话",
              "本季后续工序都是在这块毛坯上装修",
            ],
            order: 1,
            prerequisites: ["large-model"],
            articleStatus: "stub",
            videoSource: "pre-training",
          },
          {
            id: "synthetic-data",
            title: "合成数据与语料自造",
            description: "高质量人类语料不够时，模型如何自己造可验证的训练数据。",
            points: [
              "公开高质量文本正在变稀缺",
              "模型出题、编译器或形式化工具判对错",
              "合成数据有飞轮，也有污染风险",
              "它补的是训练数据，不是推理时的事实",
            ],
            order: 2,
            prerequisites: ["pre-training"],
            articleStatus: "stub",
            videoSource: "synthetic-data",
          },
        ],
      },
      {
        id: "alignment",
        title: "后训练对齐：从接龙机到听懂人话",
        description: "如何让只会接龙的基座学会听懂指令，并依靠人类偏好排雷。",
        articles: [
          {
            id: "sft",
            title: "SFT 指令微调",
            description: "用高质量问答对把接龙机教会听指令、守格式并扮演角色。",
            points: [
              "SFT 用指令-回答对做监督学习",
              "它教会角色、格式和“像在回答人”",
              "数据质量比数量更决定脾气",
              "SFT 之后仍未必按人类偏好排雷",
            ],
            order: 3,
            prerequisites: ["pre-training"],
            articleStatus: "stub",
            videoSource: "sft",
          },
          {
            id: "rlhf-and-dpo",
            title: "RLHF 与 DPO 偏好对齐",
            description: "奖励模型、人类偏好，以及 DPO 如何绕开显式奖励模型直接对齐。",
            points: [
              "RLHF 先学奖励模型，再优化生成策略",
              "DPO 用正负样本直接改策略",
              "对齐在改“更愿说什么”，不是补新知识",
              "安全红线与讨好评测者会一起出现",
            ],
            order: 4,
            prerequisites: ["sft"],
            articleStatus: "stub",
            videoSource: "rlhf-and-dpo",
          },
        ],
      },
      {
        id: "deep-thinking",
        title: "深度推理与模型轻量化",
        description: "慢思考如何在内部试错，小模型如何通过蒸馏与量化继承大模型能力。",
        articles: [
          {
            id: "reasoning-models",
            title: "深度推理与慢思考模型",
            description: "思维链、可验证奖励（RLVR），以及 o1 / R1 一类慢思考在优化什么。",
            points: [
              "CoT 把中间步骤写出来，给搜索和检查留空间",
              "RLVR 用可验证规则给奖励，而不是只听人打分",
              "慢思考换的是测试时计算，不是魔法智商",
              "它仍可能流畅地走错推理路径",
            ],
            order: 5,
            prerequisites: ["rlhf-and-dpo"],
            articleStatus: "stub",
            videoSource: "reasoning-models",
          },
          {
            id: "distillation-quantization",
            title: "模型蒸馏与量化压缩",
            description: "大模型当老师、权重降精度，以及 LoRA 一类低成本参数适配。",
            points: [
              "蒸馏是把大模型的轨迹教给小模型",
              "量化用更少比特存权重，换显存和速度",
              "LoRA 改的是少量附加参数，不是重训全网",
              "瘦身会损失能力，边界要讲清楚",
            ],
            order: 6,
            prerequisites: ["sft"],
            articleStatus: "stub",
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
    description:
      "从 RAG、向量检索、工具调用、结构化输出到 MCP 与 Skill，看模型如何接上私有资料和外部动作。",
    promise:
      "看完后能讲清 RAG 怎样补私有事实、Tool Calling 怎样触发外部动作，以及 MCP 和 Skill 怎样标准化能力。",
    badge: "外部连接",
    chapters: [
      {
        id: "retrieve",
        title: "外挂知识库：向量检索与语义召回",
        description: "把文档按语义坐标召回，再动态塞进上下文窗口，而不必重训模型。",
        articles: [
          {
            id: "rag",
            title: "RAG 检索增强生成",
            description: "切块、召回、塞进窗口：不重训也能让模型回答私有知识。",
            points: [
              "RAG 把检索到的片段当作这一次的依据",
              "切块粒度会直接决定召回质量",
              "它补的是窗口里的事实，不是永久记忆",
              "检索错了，生成会一本正经地跟着错",
            ],
            order: 1,
            prerequisites: ["hallucination", "context-window"],
            articleStatus: "stub",
            videoSource: "rag",
          },
          {
            id: "embeddings",
            title: "Embedding 向量嵌入",
            description: "文字变成高维坐标之后，为什么能按意思而不是按关键词查找。",
            points: [
              "Embedding 把文本映射成向量",
              "余弦相似度衡量的是几何邻近，不是逻辑蕴含",
              "向量库负责存和搜，不负责保证正确",
              "这是 RAG 召回的底座",
            ],
            order: 2,
            prerequisites: ["rag"],
            articleStatus: "stub",
            videoSource: "embeddings",
          },
          {
            id: "advanced-rag",
            title: "高阶 RAG 与图谱检索",
            description: "朴素切块的盲区、GraphRAG 知识图谱，以及多轮 Agentic 深入检索。",
            points: [
              "固定切块会切断关系和表格",
              "GraphRAG 一类方法在补实体关系",
              "Agentic 检索会多轮改写查询",
              "更复杂的检索仍需要可核验出处",
            ],
            order: 3,
            prerequisites: ["rag", "embeddings"],
            articleStatus: "stub",
            videoSource: "advanced-rag",
          },
        ],
      },
      {
        id: "action",
        title: "跨出语言界限：动作触发与结构化输出",
        description: "模型如何生成参数包触发外部系统，并保证格式严格可被下游程序消费。",
        articles: [
          {
            id: "tool-calling",
            title: "工具调用与动作执行",
            description: "模型不亲手调接口，而是生成参数包，由系统执行后再回填。",
            points: [
              "Tool Calling 是生成结构化请求，不是模型直接联网",
              "执行权在宿主系统，不在权重里",
              "结果回填窗口后，模型再继续写",
              "这是从“只说话”走到“能办事”的分界",
            ],
            order: 4,
            prerequisites: ["prompt"],
            articleStatus: "stub",
            videoSource: "tool-calling",
          },
          {
            id: "structured-output",
            title: "严格结构化输出",
            description: "用 JSON Schema 约束输出，让程序拿到合法数据而不是聊天废话。",
            points: [
              "聊天文本对程序不可靠",
              "JSON Schema / Strict Mode 把语法变成硬约束",
              "约束的是形状，不是内容真伪",
              "它常和工具调用一起出现",
            ],
            order: 5,
            prerequisites: ["tool-calling"],
            articleStatus: "stub",
            videoSource: "structured-output",
          },
        ],
      },
      {
        id: "protocols",
        title: "能力标准化：MCP 总线与专业 Skill",
        description: "MCP 如何成为统一接入总线，Skill 如何打包可复用专业工作法。",
        articles: [
          {
            id: "mcp",
            title: "MCP 统一接入协议",
            description: "把 Tools、Resources、Prompts 收成一套可插拔的上下文协议标准。",
            points: [
              "MCP 要解决的是客户端和工具各接各的",
              "Tools / Resources / Prompts 是三种能力面",
              "协议不自动等于安全，权限仍在宿主",
              "它是总线，不是智能本身",
            ],
            order: 6,
            prerequisites: ["tool-calling"],
            articleStatus: "stub",
            videoSource: "mcp",
          },
          {
            id: "skill",
            title: "Skill 专业技能包",
            description: "把提示词、脚本和规范打成可复用的专业工作法，而不是一段咒语。",
            points: [
              "Skill 是打包的作业规程，不是一句 prompt",
              "它可以包含说明、脚本和资源",
              "和 MCP 工具的分工：规程 vs 接口",
              "技能包仍然受窗口、权限和幻觉约束",
            ],
            order: 7,
            prerequisites: ["mcp"],
            articleStatus: "stub",
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
    description:
      "从 ReAct 循环、宿主底盘、记忆、规划，到多智能体、电脑操作与安全评测，看智能体如何从问答变成干活。",
    promise:
      "看完后能分清 Chatbot 与 Autonomous Agent，搞懂 Harness、工具循环、自检和安全落地。",
    badge: "智能体",
    chapters: [
      {
        id: "loop",
        title: "单体闭环：思考循环、底盘与记忆",
        description: "智能体如何在闭环里自主决策，宿主底盘如何管生命周期，三层记忆如何分工。",
        articles: [
          {
            id: "agent-loop",
            title: "AI Agent 自主闭环",
            description: "Thought-Action-Observation 闭环，以及它和聊天机器人的本质差别。",
            points: [
              "Agent 是看目标、选动作、看反馈、再决策的循环",
              "Chatbot 默认停在一次回答，Agent 默认继续到停机条件",
              "ReAct 把推理和行动写在同一条轨迹里",
              "循环本身不保证做对，只保证能试",
            ],
            order: 1,
            prerequisites: ["tool-calling"],
            articleStatus: "stub",
            videoSource: "agent-loop",
          },
          {
            id: "agent-harness",
            title: "Harness 智能体底盘",
            description: "模型只是发动机，宿主操作系统底盘才管理状态、权限和崩溃恢复。",
            points: [
              "Harness 管生命周期，模型不管",
              "权限截获、超时、断点续传都在宿主",
              "上下文爆窗时由宿主裁剪，不是模型自觉",
              "没有底盘就只是会说话的函数",
            ],
            order: 2,
            prerequisites: ["agent-loop"],
            articleStatus: "stub",
            videoSource: "agent-harness",
          },
          {
            id: "agent-memory",
            title: "智能体的三层记忆",
            description: "工作记忆、会话状态和长期记忆如何分工，以及压缩如何发生。",
            points: [
              "窗口是工作记忆，不是档案室",
              "短期状态可存在宿主，跨轮也不等于懂你",
              "长期记忆常用检索或键值，会过时也会错",
              "压缩会丢细节，要当工程问题看",
            ],
            order: 3,
            prerequisites: ["agent-loop", "context-window"],
            articleStatus: "stub",
            videoSource: "agent-memory",
          },
          {
            id: "planning-reflection",
            title: "任务规划与自我反思",
            description: "任务分解、执行失败后的自检重试，以及自愈的工程边界。",
            points: [
              "Plan-and-Solve 把大目标拆成可执行步骤",
              "反思是看反馈后改计划，不是突然有了良知",
              "自愈依赖错误信号是否可检验",
              "没有停机条件和预算，反思会空转",
            ],
            order: 4,
            prerequisites: ["agent-loop"],
            articleStatus: "stub",
            videoSource: "planning-reflection",
          },
        ],
      },
      {
        id: "collaboration",
        title: "形态演进：群体协同与软硬件操作",
        description: "多智能体如何协同分工，代码智能体和 GUI 智能体如何操作真实环境。",
        articles: [
          {
            id: "multi-agent",
            title: "多智能体分工协同",
            description: "主从编排、专职子 Agent，以及 Agent 之间如何严密交接。",
            points: [
              "多 Agent 首先是分工，不是人多力量大",
              "Supervisor 模式把路由和汇总放在一层",
              "交接必须有明确输入输出，否则互相幻觉",
              "协议解决的是接口，不解决目标冲突",
            ],
            order: 5,
            prerequisites: ["agent-loop"],
            articleStatus: "stub",
            videoSource: "multi-agent",
          },
          {
            id: "coding-computer-use",
            title: "代码智能体与电脑操作",
            description: "改代码的 Agent 和看屏幕点鼠标的 Agent，能力边界差在哪。",
            points: [
              "Coding Agent 依赖仓库索引、测试和补丁循环",
              "Computer Use 把屏幕当观察，把键鼠当动作",
              "两者都把不可逆操作交给宿主审批",
              "能操作电脑不等于理解你的意图",
            ],
            order: 6,
            prerequisites: ["agent-loop"],
            articleStatus: "stub",
            videoSource: "coding-computer-use",
          },
        ],
      },
      {
        id: "safety",
        title: "工程落地：安全防线与质量评估",
        description: "提示词注入防御、沙箱隔离、人在回路，以及回归评测支架。",
        articles: [
          {
            id: "prompt-injection",
            title: "提示词注入与安全防御",
            description: "直接和间接注入如何把工具权利用来执行攻击者的指令。",
            points: [
              "注入是把攻击指令混进模型正在读的文本",
              "间接注入可以藏在网页、邮件、文档里",
              "模型分不清“数据”和“指令”时就会被劫持",
              "防御在隔离、权限和人审，不在更长的系统提示",
            ],
            order: 7,
            prerequisites: ["prompt", "agent-loop"],
            articleStatus: "stub",
            videoSource: "prompt-injection",
          },
          {
            id: "agent-eval-control",
            title: "沙箱隔离与质量评测",
            description: "执行隔离、危险操作审批，以及把智能体质量测成可重复回归的指标。",
            points: [
              "沙箱限制文件系统、网络和副作用",
              "人在回路是高风险动作的闸门",
              "Eval 要把任务结果变成可重复分数",
              "没有 tracing，失败无法定位是模型还是工具",
            ],
            order: 8,
            prerequisites: ["agent-harness"],
            articleStatus: "stub",
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
    description:
      "从视觉与语音、端侧运行，到长文本退化和算力墙，看大模型的扩展形态与不可逾越边界。",
    promise:
      "看完后能讲清跨模态如何变成 Token、本地运行靠什么，以及堆算力也跨不过去的限制。",
    badge: "前沿形态",
    chapters: [
      {
        id: "senses",
        title: "感官扩展：视觉与实时语音直连",
        description: "图像切片和音频波形如何直接进入同一套 Token 统一计算。",
        articles: [
          {
            id: "vision-llm",
            title: "视觉大模型与多模态",
            description: "图片如何被切成视觉 Token，再和对齐后的语言空间一起计算。",
            points: [
              "图像被切成 Patch，再变成视觉 Token",
              "对齐层把视觉和语言接到可一起注意的空间",
              "能描述不等于能可靠定位或计数",
              "视觉输入同样占用上下文窗口",
            ],
            order: 1,
            prerequisites: ["token", "transformer"],
            articleStatus: "stub",
            videoSource: "vision-llm",
          },
          {
            id: "audio-llm",
            title: "实时语音与全双工",
            description: "Speech-to-Speech 如何避免“先转写再合成”的拼接卡顿与情绪丢失。",
            points: [
              "级联 ASR + LLM + TTS 会引入延迟和信息损失",
              "端到端语音模型在同一条链路里听和说",
              "全双工才谈得上打断和重叠对话",
              "情绪感知仍是统计相关，不是共情",
            ],
            order: 2,
            prerequisites: ["vision-llm"],
            articleStatus: "stub",
            videoSource: "audio-llm",
          },
        ],
      },
      {
        id: "edge",
        title: "端侧轻量化：本地离线与能耗折中",
        description: "在个人设备上离线运行，换来的是隐私和能力的现实折中。",
        articles: [
          {
            id: "on-device-ai",
            title: "端侧模型与本地离线计算",
            description: "量化、NPU 和本地运行时，如何在断网时也能完成低延迟推理。",
            points: [
              "端侧首先受内存和功耗约束",
              "量化和蒸馏是能塞进设备的前提",
              "本地运行换隐私和离线，不换同等能力",
              "设备上的模型仍然会幻觉",
            ],
            order: 3,
            prerequisites: ["distillation-quantization"],
            articleStatus: "stub",
            videoSource: "on-device-ai",
          },
        ],
      },
      {
        id: "boundaries",
        title: "终极边界：长文本衰减与客观物理墙",
        description: "窗口开很大仍然会丢中间，以及数据、幻觉和价值判断的硬物理边界。",
        articles: [
          {
            id: "context-rot",
            title: "长文本退化与注意力衰减",
            description: "大海捞针、迷失在中间（Lost in the Middle），以及注意力随长度的衰减。",
            points: [
              "标称窗口长度不等于有效工作记忆",
              "Lost in the Middle 说明位置会影响召回",
              "Context Rot 是能力随长度变差，不是突然坏掉",
              "更长窗口不能替代检索和外挂记忆",
            ],
            order: 4,
            prerequisites: ["context-window"],
            articleStatus: "stub",
            videoSource: "context-rot",
          },
          {
            id: "model-limits",
            title: "大模型的物理极限",
            description: "高质量人类数据枯竭、幻觉不可完全消除，以及为何价值判断不能外包给模型。",
            points: [
              "高质量人类语料正在变贵、变少",
              "幻觉可以压低，不能承诺为零",
              "算力能换平均表现，换不来担保",
              "金钱、医疗、法律和不可逆操作不能让模型独自拍板",
            ],
            order: 5,
            prerequisites: ["hallucination", "context-rot"],
            articleStatus: "stub",
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
