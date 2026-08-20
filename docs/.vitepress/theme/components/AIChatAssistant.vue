<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch } from "vue";
import { useData } from "vitepress";
import MarkdownIt from "markdown-it";

const md = new MarkdownIt({
  html: false,
  breaks: true,
  linkify: true,
});

// 自定义链接新标签打开
const defaultRender =
  md.renderer.rules.link_open ||
  function (tokens, idx, options, _env, self) {
    return self.renderToken(tokens, idx, options);
  };
md.renderer.rules.link_open = function (tokens, idx, options, env, self) {
  tokens[idx].attrSet("target", "_blank");
  tokens[idx].attrSet("rel", "noopener noreferrer");
  return defaultRender(tokens, idx, options, env, self);
};

const { page, frontmatter } = useData();

// 界面状态
const isOpen = ref(false);
const isSettingsOpen = ref(false);
const inputMessage = ref("");
const isLoading = ref(false);
const messagesContainer = ref<HTMLElement | null>(null);
const textareaRef = ref<HTMLTextAreaElement | null>(null);
const abortController = ref<AbortController | null>(null);
const copiedIndex = ref<number | null>(null);

// 核心三大免费服务商配置
interface ProviderPreset {
  id: string;
  name: string;
  tag: string;
  baseUrl: string;
  defaultModel: string;
  description: string;
  keyUrl: string;
  keyName: string;
  needsKey: boolean;
}

const PROVIDERS: ProviderPreset[] = [
  {
    id: "siliconflow",
    name: "SiliconFlow",
    tag: "国内直连",
    baseUrl: "https://api.siliconflow.cn/v1",
    defaultModel: "deepseek-ai/DeepSeek-V3",
    description: "国内高速直连，支持 DeepSeek 等主流模型",
    keyUrl: "https://cloud.siliconflow.cn/i/E4oi4CS1",
    keyName: "获取 API Key (cloud.siliconflow.cn)",
    needsKey: true,
  },
  {
    id: "gemini",
    name: "Google Gemini",
    tag: "官方直连",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    defaultModel: "gemini-2.0-flash",
    description: "Gemini 2.0 Flash 模型，支持长上下文与代码推演",
    keyUrl: "https://aistudio.google.com/app/apikey",
    keyName: "获取 API Key (aistudio.google.com)",
    needsKey: true,
  },
  {
    id: "groq",
    name: "Groq",
    tag: "极速推理",
    baseUrl: "https://api.groq.com/openai/v1",
    defaultModel: "llama-3.3-70b-versatile",
    description: "Llama 3.3 70B 模型，推理响应速度快",
    keyUrl: "https://console.groq.com/keys",
    keyName: "获取 API Key (console.groq.com)",
    needsKey: true,
  },
  {
    id: "custom",
    name: "自定义 / Ollama",
    tag: "本地或中转",
    baseUrl: "http://localhost:11434/v1",
    defaultModel: "qwen2.5:7b",
    description: "支持本地 Ollama 离线运行或兼容 OpenAI 协议的自建 API",
    keyUrl: "",
    keyName: "本地 Ollama 无需填写 Key",
    needsKey: false,
  },
];

// 配置存储
const selectedProviderId = ref("siliconflow");
const apiKey = ref("");
const customBaseUrl = ref(PROVIDERS[0].baseUrl);
const customModel = ref(PROVIDERS[0].defaultModel);
const temperature = ref(0.6);
const showApiKey = ref(false);

const activeProvider = computed(() => {
  return PROVIDERS.find((p) => p.id === selectedProviderId.value) || PROVIDERS[0];
});

// 消息结构
interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  reasoningContent?: string;
  isReasoning?: boolean;
  timestamp?: string;
}

const defaultWelcomeMessage: ChatMessage = {
  role: "assistant",
  content: `你好！我是《看懂人工智能》的 AI 伴读助手。

我可以为你解答书中涉及的**硬件显存带宽、大模型底层原理、预训练与微调、智能体系统**等技术细节。

默认已预设 **SiliconFlow (DeepSeek)** 服务。你可以点击右上角 ⚙️ **设置** 填入 API Key，或切换为 **Google Gemini** 与 **Groq**！`,
  timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
};

const messages = ref<ChatMessage[]>([defaultWelcomeMessage]);

// 本地存储同步
const STORAGE_KEY_CONFIG = "ai_book_chat_config_v2";
const STORAGE_KEY_MESSAGES = "ai_book_chat_messages_v2";

const saveConfig = () => {
  if (typeof window === "undefined") return;
  const config = {
    providerId: selectedProviderId.value,
    apiKey: apiKey.value,
    baseUrl: customBaseUrl.value,
    model: customModel.value,
    temperature: temperature.value,
  };
  localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
};

const loadConfig = () => {
  if (typeof window === "undefined") return;
  const saved = localStorage.getItem(STORAGE_KEY_CONFIG);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      selectedProviderId.value = parsed.providerId || "siliconflow";
      apiKey.value = parsed.apiKey || "";
      const p = PROVIDERS.find((item) => item.id === selectedProviderId.value) || PROVIDERS[0];
      customBaseUrl.value = parsed.baseUrl || p.baseUrl;
      customModel.value = parsed.model || p.defaultModel;
      temperature.value = parsed.temperature ?? 0.6;
    } catch {
      // 忽略解析错误
    }
  }
};

const saveMessages = () => {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY_MESSAGES, JSON.stringify(messages.value));
};

const loadMessages = () => {
  if (typeof window === "undefined") return;
  const saved = localStorage.getItem(STORAGE_KEY_MESSAGES);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        messages.value = parsed;
      }
    } catch {
      // 忽略解析错误
    }
  }
};

// 选择服务商卡片
const selectProvider = (p: ProviderPreset) => {
  selectedProviderId.value = p.id;
  if (p.id !== "custom") {
    customBaseUrl.value = p.baseUrl;
    customModel.value = p.defaultModel;
  }
  saveConfig();
};

// 当前页面上下文感知与推荐问题
const currentContext = computed(() => {
  const title = page.value?.title || frontmatter.value?.title || "";
  const desc = frontmatter.value?.description || "";
  return { title, desc };
});

const quickQuestions = computed(() => {
  const title = currentContext.value.title;
  if (!title || title === "看懂人工智能") {
    return [
      "大模型与传统软件编程有什么根本区别？",
      "什么是 Transformer 自注意力机制？",
      "CPU 和 GPU 算力有什么物理差异？",
    ];
  }
  if (title.includes("Transformer")) {
    return [
      "自注意力机制中的 Q、K、V 究竟是什么含义？",
      "为什么需要将输入除以根号 d_k？",
      "MHA、GQA 与 MLA 之间有什么演进关系？",
    ];
  }
  if (title.includes("显存") || title.includes("带宽") || title.includes("硬件")) {
    return [
      "70B 模型的 FP16 静态权重需要多少显存？",
      "计算受限（Compute-Bound）和内存受限有什么区别？",
      "Roofline 模型的物理含义是什么？",
    ];
  }
  if (title.includes("Token")) {
    return [
      "BPE 分词算法是如何工作的？",
      "为什么扩大词表能提升多语言压缩率？",
      "为什么 Input Token 计费比 Output Token 便宜？",
    ];
  }
  if (title.includes("上下文") || title.includes("窗口")) {
    return [
      "上下文窗口与模型持久记忆有什么本质区别？",
      "什么是 Lost in the Middle 现象？",
      "FIFO 滚动截断是如何处理多轮对话的？",
    ];
  }
  if (title.includes("智能体") || title.includes("Agent")) {
    return [
      "什么是智能体的 ReAct 循环？",
      "多智能体协作中如何做上下文物理隔离？",
      "什么是间接提示词注入攻击？",
    ];
  }
  return [
    `请帮我通俗拆解一下《${title}》的核心原理。`,
    `《${title}》在工业界工程实践中有什么常见坑？`,
    `这一章的核心公式与关键概念是什么？`,
  ];
});

// 滚动到底部
const scrollToBottom = async () => {
  await nextTick();
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
  }
};

// 复制消息内容
const copyMessage = async (content: string, index: number) => {
  try {
    await navigator.clipboard.writeText(content);
    copiedIndex.value = index;
    setTimeout(() => {
      copiedIndex.value = null;
    }, 2000);
  } catch (err) {
    console.error("Failed to copy text: ", err);
  }
};

// 清空对话历史
const clearHistory = () => {
  if (confirm("确定要清空所有聊天记录吗？")) {
    messages.value = [
      {
        ...defaultWelcomeMessage,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ];
    saveMessages();
  }
};

// 停止生成
const stopGenerating = () => {
  if (abortController.value) {
    abortController.value.abort();
    abortController.value = null;
  }
  isLoading.value = false;
};

// 发送消息
const sendMessage = async (textToSend?: string) => {
  const text = (textToSend || inputMessage.value).trim();
  if (!text || isLoading.value) return;

  // 检查 API Key 配置
  const provider = activeProvider.value;
  if (provider.needsKey && !apiKey.value) {
    isSettingsOpen.value = true;
    messages.value.push({
      role: "assistant",
      content: `⚠️ 请先在**设置**中填入您的 API Key（如 [${provider.name}](${provider.keyUrl})）即可开始提问。本地运行 Ollama 可直接免 Key 使用。`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    });
    scrollToBottom();
    return;
  }

  const userMsg: ChatMessage = {
    role: "user",
    content: text,
    timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  };

  messages.value.push(userMsg);
  inputMessage.value = "";
  isLoading.value = true;
  saveMessages();
  await scrollToBottom();

  // 创建助手占位消息
  const assistantMsg: ChatMessage = {
    role: "assistant",
    content: "",
    timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  };
  messages.value.push(assistantMsg);
  const assistantIndex = messages.value.length - 1;

  // 构建 System Prompt 与上下文注入
  let systemPrompt = `你是一个专业、严谨、谦逊的技术导师，专为《看懂人工智能》技术书读者解答问题。
请遵循以下回答准则：
1. 用清晰、客观、从零推演的方式解答计算机体系结构、大模型底层数学与工程原理。
2. 给出具体的底层计算逻辑、公式推导或关键代码，杜绝空洞套话。
3. 保持平实质朴的工程师态度，使用中立严谨的专业术语。
4. 控制回答在 3~5 个核心要点以内，条理清晰，杜绝无意义冗长罗列。`;

  if (currentContext.value.title) {
    systemPrompt += `\n\n【当前读者正在阅读章节】\n标题：《${currentContext.value.title}》\n导语：${currentContext.value.desc}`;
  }

  // 组装请求历史（最多带最近 10 条）
  const historyToSend = messages.value
    .slice(0, assistantIndex)
    .filter((m) => m.role === "user" || m.role === "assistant")
    .slice(-10)
    .map((m) => ({ role: m.role, content: m.content }));

  const payload: Record<string, any> = {
    model: customModel.value || activeProvider.value.defaultModel,
    messages: [{ role: "system", content: systemPrompt }, ...historyToSend],
    temperature: temperature.value,
    max_tokens: 2048,
    top_p: 0.85,
    frequency_penalty: 0.2,
    presence_penalty: 0.1,
    stream: true,
  };

  abortController.value = new AbortController();
  const url = `${customBaseUrl.value.replace(/\/+$/, "")}/chat/completions`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (apiKey.value) {
    headers["Authorization"] = `Bearer ${apiKey.value}`;
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: abortController.value.signal,
    });

    if (!response.ok) {
      const errText = await response.text();
      let parsedErr = errText;
      try {
        const json = JSON.parse(errText);
        parsedErr = json.error?.message || errText;
      } catch {
        // raw text
      }
      throw new Error(`API 请求失败 (${response.status}): ${parsedErr}`);
    }

    if (!response.body) {
      throw new Error("API 未返回流式响应体");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data:")) continue;
        const dataStr = trimmed.slice(5).trim();
        if (dataStr === "[DONE]") continue;

        try {
          const json = JSON.parse(dataStr);
          const deltaReasoning = json.choices?.[0]?.delta?.reasoning_content || "";
          const deltaContent = json.choices?.[0]?.delta?.content || "";

          // 处理深度思考思维链 (如 DeepSeek-R1 / QwQ)
          if (deltaReasoning) {
            if (!messages.value[assistantIndex].reasoningContent) {
              messages.value[assistantIndex].reasoningContent = "";
            }
            messages.value[assistantIndex].reasoningContent += deltaReasoning;
            messages.value[assistantIndex].isReasoning = true;
            scrollToBottom();
          }

          // 处理正文内容
          if (deltaContent) {
            messages.value[assistantIndex].content += deltaContent;
            messages.value[assistantIndex].isReasoning = false;

            // 防御检测：检测自回归重复死循环
            const currentContent = messages.value[assistantIndex].content;
            if (currentContent.length > 50) {
              const tail = currentContent.slice(-30);
              if (/(.)(?:\s*\1){6,}/.test(tail)) {
                messages.value[assistantIndex].content = currentContent.replace(/(.)(?:\s*\1){5,}$/, "");
                messages.value[assistantIndex].content += "\n\n*(检测到模型重复生成，已自动截断)*";
                if (abortController.value) {
                  abortController.value.abort();
                }
                break;
              }
            }

            scrollToBottom();
          }
        } catch {
          // ignore stream parse errors for partial chunks
        }
      }
    }
  } catch (err: any) {
    if (err.name === "AbortError") {
      messages.value[assistantIndex].content += "\n\n*(已手动停止生成)*";
    } else {
      messages.value[assistantIndex].content = `❌ **请求出错**：${err.message || err}\n\n*请检查 API Key、Base URL 或网络连接状态。*`;
    }
  } finally {
    isLoading.value = false;
    abortController.value = null;
    saveMessages();
    scrollToBottom();
  }
};

// 快捷键发送
const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
};

// 自动调整输入框高度
watch(inputMessage, () => {
  nextTick(() => {
    if (textareaRef.value) {
      textareaRef.value.style.height = "auto";
      textareaRef.value.style.height = `${Math.min(textareaRef.value.scrollHeight, 120)}px`;
    }
  });
});

onMounted(() => {
  loadConfig();
  loadMessages();
});
</script>

<template>
  <div class="ai-chat-root">
    <!-- 悬浮触发按钮 -->
    <button
      v-if="!isOpen"
      class="ai-chat-trigger"
      title="打开 AI 伴读助手"
      @click="isOpen = true"
    >
      <div class="ai-trigger-icon">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
        </svg>
      </div>
      <span class="ai-trigger-text">AI 助手</span>
    </button>

    <!-- 聊天主窗口 -->
    <transition name="ai-fade-slide">
      <div v-if="isOpen" class="ai-chat-window">
        <!-- 头部 -->
        <header class="ai-chat-header">
          <div class="ai-header-left">
            <div class="ai-header-avatar">✨</div>
            <div class="ai-header-info">
              <div class="ai-header-title">看懂 AI · 伴读助手</div>
              <div class="ai-header-model" :title="activeProvider.name">
                <span class="ai-status-dot"></span>
                {{ activeProvider.name.split(' ')[0] }}
              </div>
            </div>
          </div>
          <div class="ai-header-actions">
            <button class="ai-btn-icon" title="清空对话" @click="clearHistory">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
            </button>
            <button class="ai-btn-icon" title="选择模型与配置" @click="isSettingsOpen = !isSettingsOpen">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
            <button class="ai-btn-icon" title="关闭" @click="isOpen = false">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </header>

        <!-- 设置面板浮层 -->
        <div v-if="isSettingsOpen" class="ai-settings-panel">
          <div class="ai-settings-header">
            <span class="ai-settings-title">⚙️ 模型与 API 配置</span>
            <button class="ai-btn-close-sm" @click="isSettingsOpen = false">✕</button>
          </div>

          <div class="ai-settings-body">
            <div class="ai-provider-cards">
              <div
                v-for="p in PROVIDERS"
                :key="p.id"
                :class="['ai-pcard', { 'ai-pcard-active': selectedProviderId === p.id }]"
                @click="selectProvider(p)"
              >
                <div class="ai-pcard-header">
                  <span class="ai-pcard-name">{{ p.name }}</span>
                  <span class="ai-pcard-tag">{{ p.tag }}</span>
                </div>
                <div class="ai-pcard-desc">{{ p.description }}</div>
              </div>
            </div>

            <!-- Key 输入与获取 -->
            <div class="ai-field" v-if="activeProvider.needsKey">
              <div class="ai-label-row">
                <label>API Key (仅保存在本地浏览器)</label>
                <button class="ai-btn-text" @click="showApiKey = !showApiKey">
                  {{ showApiKey ? '隐藏' : '显示' }}
                </button>
              </div>
              <input
                :type="showApiKey ? 'text' : 'password'"
                v-model="apiKey"
                placeholder="sk-..."
                @change="saveConfig"
              />
              <div class="ai-field-tip" v-if="activeProvider.keyUrl">
                🔗 <a :href="activeProvider.keyUrl" target="_blank">{{ activeProvider.keyName }} ↗</a>
              </div>
            </div>

            <!-- 高级自定义配置折叠 -->
            <details class="ai-advanced-details" v-if="selectedProviderId === 'custom'">
              <summary>高级参数 (Base URL / Model ID)</summary>
              <div class="ai-advanced-body">
                <div class="ai-field">
                  <label>Base URL</label>
                  <input type="text" v-model="customBaseUrl" @change="saveConfig" />
                </div>
                <div class="ai-field">
                  <label>Model ID</label>
                  <input type="text" v-model="customModel" @change="saveConfig" />
                </div>
              </div>
            </details>
          </div>

          <div class="ai-settings-footer">
            <button class="ai-btn-primary" @click="saveConfig(); isSettingsOpen = false">
              确认并保存
            </button>
          </div>
        </div>

        <!-- 当前页面感知横幅 -->
        <div v-if="currentContext.title" class="ai-context-banner">
          <div class="ai-context-text">
            <span class="ai-context-tag">当前阅读</span>
            <span class="ai-context-title">《{{ currentContext.title }}》</span>
          </div>
        </div>

        <!-- 消息列表 -->
        <div ref="messagesContainer" class="ai-messages-list">
          <div
            v-for="(msg, idx) in messages"
            :key="idx"
            :class="['ai-message-row', `ai-msg-${msg.role}`]"
          >
            <div class="ai-msg-avatar">
              {{ msg.role === 'user' ? '👤' : '✨' }}
            </div>
            <div class="ai-msg-bubble-wrap">
              <div class="ai-msg-bubble">
                <!-- 深度思考过程折叠块 (DeepSeek-R1 等模型) -->
                <details
                  v-if="msg.role === 'assistant' && msg.reasoningContent"
                  class="ai-reasoning-box"
                  :open="msg.isReasoning || isLoading"
                >
                  <summary class="ai-reasoning-summary">
                    <span class="ai-reasoning-icon">🧠</span>
                    <span class="ai-reasoning-title">思考过程</span>
                    <span v-if="msg.isReasoning" class="ai-reasoning-pulse">正在推演...</span>
                  </summary>
                  <div class="ai-reasoning-text">{{ msg.reasoningContent }}</div>
                </details>

                <!-- 等待首个 Token 或思考中状态 -->
                <div
                  v-if="msg.role === 'assistant' && !msg.content && !msg.reasoningContent && isLoading"
                  class="ai-thinking-indicator"
                >
                  <span class="ai-thinking-brain">🧠</span>
                  <span class="ai-thinking-text">思考中</span>
                  <div class="ai-thinking-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>

                <!-- 回答正文 -->
                <div
                  v-else-if="msg.role === 'assistant' && msg.content"
                  class="ai-markdown-content"
                  v-html="md.render(msg.content)"
                ></div>

                <!-- 用户消息 -->
                <div v-else-if="msg.role === 'user'" class="ai-user-text">
                  {{ msg.content }}
                </div>
              </div>
              <div class="ai-msg-meta">
                <span class="ai-msg-time">{{ msg.timestamp }}</span>
                <button
                  v-if="msg.role === 'assistant' && msg.content"
                  class="ai-btn-copy"
                  title="复制内容"
                  @click="copyMessage(msg.content, idx)"
                >
                  {{ copiedIndex === idx ? '已复制' : '复制' }}
                </button>
              </div>
            </div>
          </div>

          <!-- 生成中的打字机光标 -->
          <div v-if="isLoading && messages[messages.length - 1]?.role !== 'assistant'" class="ai-message-row ai-msg-assistant">
            <div class="ai-msg-avatar">✨</div>
            <div class="ai-msg-bubble-wrap">
              <div class="ai-msg-bubble ai-loading-bubble">
                <span class="ai-typing-dot"></span>
                <span class="ai-typing-dot"></span>
                <span class="ai-typing-dot"></span>
              </div>
            </div>
          </div>
        </div>

        <!-- 推荐快捷提问 -->
        <div v-if="messages.length <= 3 && !isLoading" class="ai-quick-prompts">
          <div class="ai-quick-title">💡 推荐提问</div>
          <div class="ai-quick-chips">
            <button
              v-for="(q, qIdx) in quickQuestions"
              :key="qIdx"
              class="ai-chip"
              @click="sendMessage(q)"
            >
              {{ q }}
            </button>
          </div>
        </div>

        <!-- 输入区域 -->
        <footer class="ai-chat-footer">
          <div v-if="isLoading" class="ai-stop-wrap">
            <button class="ai-btn-stop" @click="stopGenerating">
              ⏹ 停止生成
            </button>
          </div>
          <div class="ai-input-box">
            <textarea
              ref="textareaRef"
              v-model="inputMessage"
              placeholder="向 AI 伴读助手提问... (Enter 发送, Shift+Enter 换行)"
              rows="1"
              :disabled="isLoading"
              @keydown="handleKeydown"
            ></textarea>
            <button
              class="ai-btn-send"
              :disabled="isLoading || !inputMessage.trim()"
              @click="sendMessage()"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
            </button>
          </div>
          <div class="ai-disclaimer">
            回答基于 AI 大模型生成，可结合书中对应章节原文查验。
          </div>
        </footer>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.ai-chat-root {
  font-family: var(--font-sans, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif);
  color: var(--vp-c-text-1, #1a1a1a);
  position: relative;
  z-index: 100;
}

/* 悬浮触发按钮 */
.ai-chat-trigger {
  position: fixed;
  right: 24px;
  bottom: 24px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  background: var(--vp-c-brand-1, #1b365d);
  color: #ffffff;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 28px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  z-index: 99;
}

.ai-chat-trigger:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.22);
  background: var(--vp-c-brand-2, #2d5a8a);
}

.ai-trigger-icon {
  display: flex;
  align-items: center;
  justify-content: center;
}

.ai-trigger-text {
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 0.5px;
}

/* 聊天主窗口 */
.ai-chat-window {
  position: fixed;
  right: 24px;
  bottom: 24px;
  width: 420px;
  height: 600px;
  max-width: calc(100vw - 32px);
  max-height: calc(100vh - 48px);
  background: var(--vp-c-bg, #ffffff);
  border: 1px solid var(--vp-c-border, #e8e8e8);
  border-radius: 12px;
  box-shadow: 0 12px 36px rgba(0, 0, 0, 0.18);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  z-index: 100;
}

/* 头部 */
.ai-chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--vp-c-border-soft, #f0f0f0);
  background: var(--vp-c-bg-alt, #f5f5f5);
}

.ai-header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.ai-header-avatar {
  font-size: 18px;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: var(--vp-c-brand-soft, #eef2f7);
  display: flex;
  align-items: center;
  justify-content: center;
}

.ai-header-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.ai-header-model {
  font-size: 11px;
  color: var(--vp-c-text-3, #737373);
  display: flex;
  align-items: center;
  gap: 4px;
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ai-status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #10b981;
}

.ai-header-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.ai-btn-icon {
  background: transparent;
  border: none;
  color: var(--vp-c-text-2, #5c5c5c);
  padding: 6px;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}

.ai-btn-icon:hover {
  background: var(--vp-c-default-2, #e8e8e8);
  color: var(--vp-c-text-1);
}

/* 当前阅读感知横幅 */
.ai-context-banner {
  background: var(--vp-c-brand-soft, #eef2f7);
  padding: 8px 14px;
  border-bottom: 1px solid var(--vp-c-border-soft, #f0f0f0);
}

.ai-context-text {
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
  overflow: hidden;
  white-space: nowrap;
}

.ai-context-tag {
  background: var(--vp-c-brand-1, #1b365d);
  color: #fff;
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 10px;
  flex-shrink: 0;
}

.ai-context-title {
  color: var(--vp-c-brand-1, #1b365d);
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 设置面板卡片选择 */
.ai-settings-panel {
  position: absolute;
  top: 56px;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--vp-c-bg, #ffffff);
  z-index: 20;
  display: flex;
  flex-direction: column;
  padding: 16px;
}

.ai-settings-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.ai-settings-title {
  font-size: 14px;
  font-weight: 600;
}

.ai-btn-close-sm {
  background: transparent;
  border: none;
  font-size: 16px;
  cursor: pointer;
  color: var(--vp-c-text-2);
}

.ai-settings-body {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.ai-provider-cards {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ai-pcard {
  padding: 10px 12px;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  background: var(--vp-c-bg-alt);
  cursor: pointer;
  transition: all 0.15s ease;
}

.ai-pcard:hover {
  border-color: var(--vp-c-brand-2);
}

.ai-pcard-active {
  border-color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
}

.ai-pcard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.ai-pcard-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.ai-pcard-tag {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 4px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-border);
  color: var(--vp-c-brand-1);
  font-weight: 500;
}

.ai-pcard-desc {
  font-size: 11px;
  color: var(--vp-c-text-3);
  line-height: 1.4;
}

.ai-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.ai-field label {
  font-size: 12px;
  font-weight: 500;
  color: var(--vp-c-text-2);
}

.ai-label-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.ai-btn-text {
  background: none;
  border: none;
  font-size: 11px;
  color: var(--vp-c-brand-1);
  cursor: pointer;
  padding: 0;
}

.ai-field input {
  padding: 8px 10px;
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  background: var(--vp-c-bg-alt);
  color: var(--vp-c-text-1);
  font-size: 13px;
  outline: none;
}

.ai-field input:focus {
  border-color: var(--vp-c-brand-1);
}

.ai-field-tip {
  font-size: 11px;
  color: var(--vp-c-text-3);
}

.ai-field-tip a {
  color: var(--vp-c-brand-1);
  text-decoration: underline;
}

.ai-advanced-details {
  font-size: 12px;
  color: var(--vp-c-text-3);
}

.ai-advanced-details summary {
  cursor: pointer;
  padding: 4px 0;
}

.ai-advanced-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 8px;
}

.ai-settings-footer {
  margin-top: 12px;
}

.ai-btn-primary {
  width: 100%;
  padding: 10px;
  background: var(--vp-c-brand-1);
  color: #ffffff;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}

.ai-btn-primary:hover {
  background: var(--vp-c-brand-2);
}

/* 消息列表 */
.ai-messages-list {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.ai-message-row {
  display: flex;
  gap: 10px;
  max-width: 92%;
}

.ai-msg-user {
  align-self: flex-end;
  flex-direction: row-reverse;
}

.ai-msg-assistant {
  align-self: flex-start;
}

.ai-msg-avatar {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background: var(--vp-c-bg-alt);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  flex-shrink: 0;
}

.ai-msg-bubble-wrap {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.ai-msg-bubble {
  padding: 10px 14px;
  border-radius: 10px;
  font-size: 13px;
  line-height: 1.6;
  word-break: break-word;
}

.ai-msg-user .ai-msg-bubble {
  background: var(--vp-c-brand-1, #1b365d);
  color: #ffffff;
  border-bottom-right-radius: 2px;
}

.ai-msg-assistant .ai-msg-bubble {
  background: var(--vp-c-bg-alt, #f5f5f5);
  color: var(--vp-c-text-1);
  border: 1px solid var(--vp-c-border-soft);
  border-bottom-left-radius: 2px;
}

.ai-msg-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 10px;
  color: var(--vp-c-text-3);
  padding: 0 4px;
}

.ai-msg-user .ai-msg-meta {
  justify-content: flex-end;
}

.ai-btn-copy {
  background: none;
  border: none;
  padding: 0;
  font-size: 10px;
  color: var(--vp-c-text-3);
  cursor: pointer;
}

.ai-btn-copy:hover {
  color: var(--vp-c-brand-1);
}

/* Markdown 样式 */
.ai-markdown-content :deep(p) {
  margin: 6px 0;
}

.ai-markdown-content :deep(p:first-child) {
  margin-top: 0;
}

.ai-markdown-content :deep(p:last-child) {
  margin-bottom: 0;
}

.ai-markdown-content :deep(code) {
  font-family: var(--font-mono);
  font-size: 12px;
  padding: 2px 4px;
  border-radius: 4px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-border);
}

.ai-markdown-content :deep(pre) {
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-border);
  padding: 8px 10px;
  border-radius: 6px;
  overflow-x: auto;
  margin: 8px 0;
}

.ai-markdown-content :deep(pre code) {
  border: none;
  padding: 0;
  background: transparent;
}

.ai-markdown-content :deep(ul),
.ai-markdown-content :deep(ol) {
  padding-left: 18px;
  margin: 6px 0;
}

.ai-markdown-content :deep(li) {
  margin: 3px 0;
}

.ai-markdown-content :deep(strong) {
  color: var(--vp-c-brand-1);
}

/* 思考中状态指示器 */
.ai-thinking-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--vp-c-text-2, #5c5c5c);
  font-size: 13px;
  padding: 4px 0;
}

.ai-thinking-brain {
  font-size: 14px;
  animation: ai-pulse 1.8s infinite ease-in-out;
}

.ai-thinking-text {
  font-weight: 500;
  color: var(--vp-c-text-2);
}

.ai-thinking-dots {
  display: flex;
  align-items: center;
  gap: 4px;
}

.ai-thinking-dots span {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--vp-c-brand-1);
  animation: ai-bounce 1.2s infinite ease-in-out both;
}

.ai-thinking-dots span:nth-child(1) { animation-delay: -0.32s; }
.ai-thinking-dots span:nth-child(2) { animation-delay: -0.16s; }

@keyframes ai-pulse {
  0%, 100% { transform: scale(1); opacity: 0.9; }
  50% { transform: scale(1.15); opacity: 1; }
}

/* 深度思考过程折叠块 */
.ai-reasoning-box {
  margin-bottom: 10px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-border);
  border-left: 3px solid var(--vp-c-brand-1);
  border-radius: 6px;
  padding: 8px 10px;
  font-size: 12px;
}

.ai-reasoning-summary {
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 500;
  color: var(--vp-c-text-2);
  user-select: none;
  list-style: none;
}

.ai-reasoning-summary::-webkit-details-marker {
  display: none;
}

.ai-reasoning-icon {
  font-size: 13px;
}

.ai-reasoning-title {
  font-size: 12px;
  color: var(--vp-c-text-2);
}

.ai-reasoning-pulse {
  font-size: 11px;
  color: var(--vp-c-brand-1);
  margin-left: auto;
  animation: ai-fade 1.5s infinite ease-in-out;
}

@keyframes ai-fade {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 1; }
}

.ai-reasoning-text {
  margin-top: 8px;
  color: var(--vp-c-text-3);
  white-space: pre-wrap;
  font-family: var(--font-mono);
  font-size: 11px;
  line-height: 1.5;
  max-height: 220px;
  overflow-y: auto;
  padding-top: 6px;
  border-top: 1px dashed var(--vp-c-border-soft);
}

/* 打字中动画 */
.ai-loading-bubble {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 10px 14px;
}

.ai-typing-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--vp-c-text-3);
  animation: ai-bounce 1.2s infinite ease-in-out both;
}

.ai-typing-dot:nth-child(1) { animation-delay: -0.32s; }
.ai-typing-dot:nth-child(2) { animation-delay: -0.16s; }

@keyframes ai-bounce {
  0%, 80%, 100% { transform: scale(0); }
  40% { transform: scale(1); }
}

/* 推荐提问卡片 */
.ai-quick-prompts {
  padding: 0 16px 12px 16px;
}

.ai-quick-title {
  font-size: 11px;
  font-weight: 600;
  color: var(--vp-c-text-3);
  margin-bottom: 6px;
}

.ai-quick-chips {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.ai-chip {
  text-align: left;
  background: var(--vp-c-bg-alt);
  border: 1px solid var(--vp-c-border-soft);
  border-radius: 6px;
  padding: 6px 10px;
  font-size: 12px;
  color: var(--vp-c-text-2);
  cursor: pointer;
  transition: all 0.15s;
}

.ai-chip:hover {
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
  border-color: var(--vp-c-brand-1);
}

/* 底部输入框 */
.ai-chat-footer {
  padding: 12px 16px 14px 16px;
  border-top: 1px solid var(--vp-c-border-soft);
  background: var(--vp-c-bg);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ai-stop-wrap {
  display: flex;
  justify-content: center;
}

.ai-btn-stop {
  background: var(--vp-c-bg-alt);
  border: 1px solid var(--vp-c-border);
  border-radius: 16px;
  padding: 4px 12px;
  font-size: 11px;
  color: var(--vp-c-text-2);
  cursor: pointer;
  transition: all 0.15s;
}

.ai-btn-stop:hover {
  background: #fee2e2;
  color: #dc2626;
  border-color: #fca5a5;
}

.ai-input-box {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  background: var(--vp-c-bg-alt);
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  padding: 6px 8px;
  transition: border-color 0.15s;
}

.ai-input-box:focus-within {
  border-color: var(--vp-c-brand-1);
}

.ai-input-box textarea {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  resize: none;
  font-size: 13px;
  line-height: 1.5;
  color: var(--vp-c-text-1);
  max-height: 120px;
  font-family: inherit;
}

.ai-btn-send {
  background: var(--vp-c-brand-1);
  color: #fff;
  border: none;
  border-radius: 6px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s;
  flex-shrink: 0;
}

.ai-btn-send:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.ai-btn-send:not(:disabled):hover {
  background: var(--vp-c-brand-2);
}

.ai-disclaimer {
  font-size: 10px;
  color: var(--vp-c-text-3);
  text-align: center;
}

/* 动效 */
.ai-fade-slide-enter-active,
.ai-fade-slide-leave-active {
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

.ai-fade-slide-enter-from,
.ai-fade-slide-leave-to {
  opacity: 0;
  transform: translateY(16px) scale(0.96);
}

/* 移动端适配 */
@media (max-width: 640px) {
  .ai-chat-trigger {
    right: 16px;
    bottom: 16px;
    padding: 8px 14px;
  }
  .ai-chat-window {
    right: 8px;
    left: 8px;
    bottom: 8px;
    width: auto;
    height: 85vh;
    max-width: none;
  }
}
</style>
