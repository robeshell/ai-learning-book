---
title: "视觉大模型与多模态"
description: "Patch 图像切片、视觉 Token 编码与跨模态对齐。"
series: multimodal-and-limits
chapter: senses
order: 1
type: concept
articleStatus: draft
prerequisites:
  - "token"
  - "transformer"
videoSource: vision-llm
---

# 视觉大模型与多模态

在前面的章节中，我们探讨的大模型全部基于文本。然而，人类接收的外部物理世界信息中，超过 80% 来自视觉。

一个原本只能处理离散一维文本 Token 的 Transformer 架构，究竟是如何「看懂」二维连续的图像像素，并与人类进行图文问答的？

从像素矩阵到语义理解，大模型跨越模态鸿沟的核心桥梁就是——**视觉 Token 化（Patch Tiling）与跨模态空间对齐（Multimodal Alignment）**。

<figure>
  <img src="/figures/vision-llm/image-to-visual-tokens.svg" alt="图像切片（Patch）与视觉 Token 离散化流程" />
  <figcaption>图像切片与视觉 Token 离散化流程</figcaption>
</figure>

---

## Patch 切片与线性投影

传统卷积神经网络（CNN）通过滑动卷积核提取局部特征。但在 Transformer 时代，**Vision Transformer（ViT, Dosovitskiy et al., 2020）** 开创了全新的视觉表征范式：**像处理句子一样处理图片**。

### Patch 切片与线性投影数学原理

假设输入一张彩色图像 $\mathbf{X} \in \mathbb{R}^{H \times W \times C}$（例如 $224 \times 224 \times 3$）：
1. **网格切片（Patch Tiling）**：将图像划分为大小为 $P \times P$（如 $16 \times 16$）的不重叠小方块（Patch）。
   切片后的 Patch 总数为：
   $$N = \frac{H \cdot W}{P^2} = \frac{224 \times 224}{16 \times 16} = 196$$
2. **展平与线性投影（Linear Projection）**：
   每个 Patch 包含 $P^2 \cdot C = 16 \times 16 \times 3 = 768$ 个像素值。通过一个可学习的线性投影矩阵 $\mathbf{W}_E \in \mathbb{R}^{768 \times D}$ 将其映射到模型的隐藏维度 $D$：
   $$\mathbf{z}_0 = \Big[ \mathbf{x}_p^1 \mathbf{W}_E; \; \mathbf{x}_p^2 \mathbf{W}_E; \; \dots; \; \mathbf{x}_p^N \mathbf{W}_E \Big] + \mathbf{E}_{pos}$$
3. **叠加空间位置编码（Positional Embedding）**：
   由于自注意力机制天然具有排列不变性，必须在每个 Patch 向量上叠加一维或二维位置编码 $\mathbf{E}_{pos}$，使模型知道第 1 个 Patch 在左上角，第 196 个 Patch 在右下角。

经过这三步，一张 $224 \times 224$ 的二维图片，就被转化为 **196 个长度为 $D$ 的离散视觉 Token 序列**。

---

## 跨模态空间对齐架构

有了视觉 Token 后，如何让只懂文字的大模型理解这些视觉特征？

目前业界最主流的架构（如 **LLaVA, Liu et al., 2023** 与 **CLIP, Radford et al., 2021**）采用了两段式对齐架构：

<figure>
  <img src="/figures/vision-llm/multimodal-alignment-adapter.svg" alt="多模态对齐架构：Vision Encoder 与语言空间投影" />
  <figcaption>多模态对齐架构与统一序列自回归</figcaption>
</figure>

1. **视觉编码器（Vision Encoder）**：使用预训练的 CLIP-ViT 或 SigLIP 提取富含语义的视觉表征向量 $\mathbf{H}_v \in \mathbb{R}^{N \times d_v}$；
2. **多模态投影适配器（MLP Projector）**：通过一个简单的 2 层多层感知机（MLP）将视觉特征维度 $d_v$ 线性映射到大模型的文本词嵌入维度 $d_{text}$：
   $$\mathbf{H}_v' = \text{GELU}(\mathbf{H}_v \mathbf{W}_1 + \mathbf{b}_1) \mathbf{W}_2 + \mathbf{b}_2$$
3. **图文序列统一拼接与自回归生成**：
   宿主将投影后的视觉 Token $\mathbf{H}_v'$ 与用户输入的文本 Token $\mathbf{H}_t$ 拼接为一个统一的长序列：
   $$\text{Sequence} = \big[ \text{<image>}, \mathbf{v}_1, \dots, \mathbf{v}_N, \text{</image>}, \text{"请描述这张图片"} \big]$$
   大模型在统一的自注意力矩阵中自由计算图文之间的注意力权重，并自回归生成下一个文字 Token。

---

## 视觉 Token 开销与能力边界

了解视觉大模型的机理后，工程师必须清晰认识到其**物理开销与能力边界**：

### 1. 视觉输入的 Token 开销
- 一张图片在切片后会直接转化为 **数百到数千个视觉 Token**（例如高动态分辨率下切出 4 个 Tile，单张图就消耗超过 2000 个 Token）；
- 视频理解本质上是按照 1~2 fps 抽帧后的图片序列拼接，几分钟的视频会瞬间吞噬数万 Token 上下文并显著推高显存与推理延迟。

### 2. 视觉语义理解与像素级精度差异
- **擅长**：高层语义概括（「这是一只在草地上奔跑的金毛犬」）、图表趋势推理、文字 OCR 识别；
- **盲区**：
  - **密集计数（Dense Counting）**：数清一张图里散落的 47 根火柴极为困难，模型倾向于基于统计概率猜一个相近的数字；
  - **微小物体幻觉（Object Hallucination, Li et al., 2023）**：当看到一张厨房的图片时，模型受强烈的语言先验影响，即使图里没有微波炉，也倾向于生成「桌上放着微波炉」。

---

## 最小代码实现

下面的代码使用纯 NumPy 模拟了将一张 $64 \times 64$ 图像切片为 $4 \times 4$ 网格 Patch、线性投影至语言空间并与文本 Query 计算跨模态自注意力的完整前向过程：

```python
import numpy as np

def extract_patches_and_project(image: np.ndarray, patch_size: int, embed_dim: int) -> np.ndarray:
    """
    1. 图像切片与线性投影 (ViT 核心算子)
    image: (H, W, C)
    """
    H, W, C = image.shape
    assert H % patch_size == 0 and W % patch_size == 0
    
    num_patches_h = H // patch_size
    num_patches_w = W // patch_size
    num_patches = num_patches_h * num_patches_w
    patch_dim = patch_size * patch_size * C
    
    # 切片并展平: (num_patches, patch_dim)
    patches = []
    for i in range(num_patches_h):
        for j in range(num_patches_w):
            patch = image[i*patch_size:(i+1)*patch_size, j*patch_size:(j+1)*patch_size, :]
            patches.append(patch.flatten())
    patches = np.array(patches)  # Shape: (N, patch_dim)
    
    # 2. 线性投影 W_E 映射到隐藏维度 embed_dim
    np.random.seed(42)
    W_E = np.random.randn(patch_dim, embed_dim) * 0.02
    visual_tokens = np.dot(patches, W_E)  # Shape: (N, embed_dim)
    
    # 3. 叠加可学习位置编码
    pos_embed = np.random.randn(num_patches, embed_dim) * 0.01
    visual_tokens += pos_embed
    
    return visual_tokens

# 模拟输入一张 64x64x3 的彩色图片
np.random.seed(42)
mock_image = np.random.rand(64, 64, 3)
patch_size = 16  # 切成 16x16 的 Patch
embed_dim = 128  # 语言模型词向量维度

# 生成视觉 Token
visual_tokens = extract_patches_and_project(mock_image, patch_size, embed_dim)
print(f"图像切片完成: 64x64 图像切分为 {visual_tokens.shape[0]} 个 Patch，每个视觉 Token 维度为 {visual_tokens.shape[1]}")

# 模拟文本 Query: "图里有什么?" (3 个文本 Token)
text_tokens = np.random.randn(3, embed_dim)

# 拼接图文 Token 序列: [16 个视觉 Token + 3 个文本 Token] = 19 个 Token
full_sequence = np.concatenate([visual_tokens, text_tokens], axis=0)
print(f"拼接后的多模态上下文序列 Shape: {full_sequence.shape} (视觉 Token 前置，文本 Token 后置)")

# 简易自注意力相关性打分
scores = np.dot(text_tokens, visual_tokens.T) / np.sqrt(embed_dim)
print(f"文本 Query 对各视觉 Patch 的注意力权重矩阵 Shape: {scores.shape}")
```

**控制台输出：**
```text
图像切片完成: 64x64 图像切分为 16 个 Patch，每个视觉 Token 维度为 128
拼接后的多模态上下文序列 Shape: (19, 128) (视觉 Token 前置，文本 Token 后置)
文本 Query 对各视觉 Patch 的注意力权重矩阵 Shape: (3, 16)
```

---

## 核心概念辨析

- **像素矩阵 vs 视觉 Token**：
  - 像素是二维连续的颜色数值网格；
  - 视觉 Token 是将网格切片展平并投影后的一维向量序列，可直接进入 Transformer。
- **视觉理解 vs 视觉幻觉**：
  - 多模态模型擅长宏观语义与 OCR 提取；
  - 但在微小物体计数与像素几何空间定位上存在先天的统计概率幻觉。
- **图像开销 vs 文本开销**：
  - 单张图片等价于数百到数千个文本 Token；
  - 多模态交互必须计入上下文窗口长度与显存吞吐规划中。

除了看懂图片，大模型如何听懂人类的声音并实现低延迟实时全双工对话？下一篇我们将探讨——《实时语音与全双工》。

---

## 参考文献

1. Dosovitskiy, Alexey, Beyer, Lucas, Kolesnikov, Alexander, et al. (2020). [*An Image is Worth 16x16 Words: Transformers for Image Recognition at Scale*](https://arxiv.org/abs/2010.11929). ICLR 2021 / arXiv:2010.11929.
2. Radford, Alec, Kim, Jong Wook, Hallacy, Chris, et al. (2021). [*Learning Transferable Visual Models From Natural Language Supervision (CLIP)*](https://arxiv.org/abs/2103.00020). ICML 2021 / arXiv:2103.00020.
3. Liu, Haotian, Li, Chunyuan, Wu, Qingyang, & Lee, Yong Jae. (2023). [*Visual Instruction Tuning (LLaVA)*](https://arxiv.org/abs/2304.08485). NeurIPS 2023 / arXiv:2304.08485.
4. Li, Yifan, Du, Yifan, Zhou, Kun, et al. (2023). [*Evaluating Object Hallucination in Large Vision-Language Models (POPE)*](https://arxiv.org/abs/2305.10355). EMNLP 2023 / arXiv:2305.10355.
