---
title: "实时语音与全双工"
description: "端到端语音建模、全双工低延迟对话与声学特征。"
series: multimodal-and-limits
chapter: senses
order: 2
type: concept
articleStatus: draft
prerequisites:
  - "vision-llm"
videoSource: audio-llm
---

# 实时语音与全双工

人类的自然交谈从来不是「打字发消息」，也不是「按住说话、松开等待」的对讲机模式。

在真实对话中，人类的平均回应延迟仅为 **200 ~ 300 毫秒**。更重要的是，我们通过语速的快慢、声调的起伏、微弱的叹气或笑意，传递着比纯文字丰富数十倍的**声学副语言（Paralinguistics）**信息。

过去的智能语音助手（如早期的 Siri、电话客服机器人）为什么总是让人感到机械、呆滞且无法打断？而新一代原生多模态语音（如 GPT-4o、Gemini Live）又是如何做到毫秒级全双工自然对答的？

这就是多模态感官演进的第二座高峰——**端到端语音建模（Speech-to-Speech）与实时全双工（Full-Duplex）**。

<figure>
  <img src="/figures/audio-llm/cascaded-vs-native-audio.svg" alt="传统级联语音（ASR+LLM+TTS） vs 原生端到端语音架构" />
  <figcaption>传统级联语音与原生端到端架构对比</figcaption>
</figure>

---

## 级联语音的延迟与信息损耗

在原生音频大模型出现之前，工业界构建语音助手普遍采用**三段式级联架构（Cascaded Pipeline）**：

$$\text{人类音频} \xrightarrow{\text{ASR 语音识别}} \text{纯文本} \xrightarrow{\text{LLM 文本生成}} \text{纯文本} \xrightarrow{\text{TTS 语音合成}} \text{机器音频}$$

这种拼装流水线存在两大工程瓶颈：

### 1. 延迟硬性叠加（Latency Stacking）
- **ASR 识别延迟**：需要等待用户说完一整句话并检测到 500ms 静音后才切片转写（约 $400 \sim 600\text{ms}$）；
- **LLM 首字生成延迟**：大模型接收文本并计算首 Token（约 $500 \sim 800\text{ms}$）；
- **TTS 语音合成延迟**：TTS 收到完整文本分句后合成音频波形（约 $300 \sim 500\text{ms}$）；
- **端到端总延迟**：

$$T_{\text{Total}} = T_{\text{ASR}} + T_{\text{LLM}} + T_{\text{TTS}} \approx 1.5\text{s} \sim 2.5\text{s}$$

两秒以上的延迟在人类听觉体验中相当于明显的停顿，影响了自然交谈节奏。

### 2. 声学特征的损耗（Paralinguistic Information Loss）
- 当用户焦急地发问、带着情绪求助、或者使用反讽语调时；
- ASR 模块在第一阶段就将声音起伏转换为纯文本；
- 大模型接收到的只有文字，丢失了语调、呼吸与情绪信息，后端的 TTS 只能使用通用声调合成语音。

---

## 端到端语音与神经音频编解码

为了解决级联缺陷，现代多模态大模型（如 **EnCodec, Défossez et al., 2022; AudioPaLM, Rubenstein et al., 2023**）采用了**原生端到端 Speech-to-Speech 架构**：

1. **神经音频编解码器（Neural Audio Codec）**：
   - 连续的音频波形通过轻量级编码器（如 EnCodec 或 DAC, Kumar et al., 2023）与**残差矢量量化（Residual Vector Quantization, RVQ）**；
   - 将连续音频离散化为一系列高密度的**离散声学 Token（Acoustic Tokens）**，同时保留音调、语速、音色与声学细节。
2. **统一多模态自回归生成**：
   - 大模型直接在声学 Token 与文本 Token 组成的联合词表上进行自回归生成；
   - 输入是声音 Token，输出直接也是声音 Token，首包音频生成延迟缩短至 **200 ~ 300 毫秒**，与人类日常交谈反应速度接近。

---

## 全双工交互与实时打断机制

除了延迟与音色，交互范式也发生了升级：**从半双工（Half-Duplex）跃迁至全双工（Full-Duplex）**。

<figure>
  <img src="/figures/audio-llm/full-duplex-interaction.svg" alt="半双工回合制 vs 全双工实时打断（Barge-in）交互" />
  <figcaption>半双工回合制与全双工实时打断交互</figcaption>
</figure>

### 全双工三大核心工程基石
1. **持续双向流（Continuous Bi-directional Streaming）**：
   - 客户端同时维持上行（麦克风流）与下行（扬声器流）两条 WebRTC / WebSocket 通道；
   - 模型在播报的同时，持续保持监听输入通道。
2. **实时打断（Barge-in Detection）**：
   - 当模型正在播报时，底层 **VAD（Voice Activity Detector）** 一旦检测到人类开口发声；
   - 宿主系统在 50 毫秒内**立刻截断下行音频输出，并清空播放缓冲区**，模型停止发声并倾听人类的新指令。
3. **回声消除（Acoustic Echo Cancellation, AEC）**：
   - 扬声器播出的声音会被麦克风重新录入。宿主必须依靠硬件级/软件级 AEC 算法从麦克风信号中精准扣除自身的声音，防止自发声音触发误打断。

---

## 最小代码实现

下面的代码演示了一个全双工音频控制器：展示系统如何在上行监听用户语音能量（VAD），并在检测到用户插话时截断下行音频流：

```python
from typing import List

class AudioDuplexController:
    def __init__(self, vad_threshold: float = 0.6):
        self.vad_threshold = vad_threshold
        self.is_ai_speaking = False
        self.ai_audio_buffer: List[str] = []

    def start_ai_speaking(self, sentence_chunks: List[str]):
        """AI 开始流式播报内容"""
        self.is_ai_speaking = True
        self.ai_audio_buffer = list(sentence_chunks)
        print(f"[AI 开始发声]: 待播报内容共 {len(self.ai_audio_buffer)} 个音频切片")

    def process_incoming_audio_frame(self, user_audio_energy: float, user_text: str = ""):
        """持续处理麦克风上行音频帧 (流式监听)"""
        # 1. 简易 VAD 语音活动检测: 能量超过阈值判定为人类正在说话
        human_is_talking = user_audio_energy > self.vad_threshold

        if human_is_talking:
            if self.is_ai_speaking:
                # 2. 触发 Barge-in 实时打断机制！
                print(f"\n[触发实时打断 Barge-in]: 检测到用户插话 (声音能量: {user_audio_energy:.2f})")
                print(f"[宿主截断]: 立即清空 AI 剩余的 {len(self.ai_audio_buffer)} 个待播音频切片，AI 停止发声。")
                self.ai_audio_buffer.clear()
                self.is_ai_speaking = False
            
            print(f"[AI 倾听中]: 正在接收用户新输入 -> '{user_text}'")
        else:
            # 用户未说话，如果 AI 正在说话，按序消耗音频切片
            if self.is_ai_speaking and self.ai_audio_buffer:
                chunk = self.ai_audio_buffer.pop(0)
                print(f"[AI 正在播报]: {chunk}")
                if not self.ai_audio_buffer:
                    self.is_ai_speaking = False
                    print("[AI 播报完毕]")

# 模拟全双工交互流程
controller = AudioDuplexController(vad_threshold=0.5)

print("--- 模拟全双工实时语音交互 ---")
controller.start_ai_speaking([
    "切片1: 人工智能技术发展较为迅速...",
    "切片2: 尤其在端到端多模态与全双工领域...",
    "切片3: 降低了端到端对话延迟...",
    "切片4: 带来了更为自然的交流体验。"
])

# 轮次 1: 用户安静，AI 正常播报切片 1
controller.process_incoming_audio_frame(user_audio_energy=0.1)

# 轮次 2: 用户突然插话打断
controller.process_incoming_audio_frame(user_audio_energy=0.85, user_text="请解释全双工原理")
```

**控制台输出：**
```text
--- 模拟全双工实时语音交互 ---
[AI 开始发声]: 待播报内容共 4 个音频切片
[AI 正在播报]: 切片1: 人工智能技术发展较为迅速...

[触发实时打断 Barge-in]: 检测到用户插话 (声音能量: 0.85)
[宿主截断]: 立即清空 AI 剩余的 3 个待播音频切片，AI 停止发声。
[AI 倾听中]: 正在接收用户新输入 -> '请解释全双工原理'
```

---

## 核心概念辨析

- **级联语音 vs 原生端到端**：
  - 级联语音（ASR+LLM+TTS）延迟超 1.5 秒且丢失语气；
  - 原生端到端基于 Neural Audio Codec，延迟低于 300 毫秒并完整保留声学副语言。
- **半双工 vs 全双工**：
  - 半双工如对讲机，我说你听，必须等待静音；
  - 全双工如电话，AI 一边说一边听，随时支持人类开口打断（Barge-in）。
- **声音情绪感知 vs 真正共情**：
  - AI 能模仿温柔或焦急的声音，是声学 Token 在高维空间中的统计条件概率拟合；
  - 并不代表模型拥有真实的情感与生理体验。

当大模型具备了视觉与语音能力后，如何将庞大的模型塞进手机、PC 和智能汽车等本地硬件中离线运行？下一篇我们将探讨——《端侧模型与本地离线计算》。

---

## 参考文献

1. Défossez, Alexandre, Copet, Jade, Synnaeve, Gabriel, & Adi, Yossi. (2022). [*High Fidelity Neural Audio Compression (EnCodec)*](https://arxiv.org/abs/2210.13438). arXiv:2210.13438.
2. Rubenstein, Paul K., Chrzanowski, Mike, Lucassen, Arthur, et al. (2023). [*AudioPaLM: A Large Language Model That Can Speak and Listen*](https://arxiv.org/abs/2306.12925). arXiv:2306.12925.
3. Kumar, Rithesh, Seetharaman, Prem, Luebs, Alejandro, et al. (2023). [*High-Fidelity Audio Compression with Improved RVQGAN (Descript Audio Codec, DAC)*](https://arxiv.org/abs/2306.06548). NeurIPS 2023 / arXiv:2306.06548.
4. OpenAI. (2024). [*GPT-4o System Card: Advancements in Real-time Multimodal Speech-to-Speech*](https://openai.com/index/gpt-4o-system-card/). OpenAI Research.
