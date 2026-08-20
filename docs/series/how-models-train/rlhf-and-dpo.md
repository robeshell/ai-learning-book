---
title: "RLHF 与 DPO 偏好对齐"
description: "奖励模型、人类偏好对齐与 DPO 隐式策略优化。"
series: how-models-train
chapter: alignment
order: 4
type: concept
articleStatus: draft
prerequisites:
  - "sft"
videoSource: rlhf-and-dpo
---

# RLHF 与 DPO 偏好对齐

经过 SFT（监督微调）后，模型已经掌握了指令遵循与问答的基本格式。但在处理开放性与复杂任务时，单纯依赖 SFT 存在以下局限：

1. **多目标偏好权衡**：对于同一个提示词，可能存在多种形式的回答。部分回答详尽但冗长，部分回答精炼但省略了背景。SFT 的单一样本监督难以表达“在多个可用回答中哪一个更符合人类习惯”；
2. **安全性与诱导性防御**：面对恶意构造的角色扮演或越狱提示词，纯 SFT 模型容易将其视为常规指令执行，缺乏边界防御倾向。

如何让模型在生成时更符合人类的偏好与安全规范？

这是大模型后训练中的核心技术——**人类反馈强化学习（RLHF）与直接偏好对齐（DPO）**。

<figure>
  <img src="/figures/rlhf-and-dpo/rlhf-ppo-pipeline.svg" alt="经典 RLHF 三阶段强化学习工作流" />
  <figcaption>RLHF 工作流：SFT、奖励模型与 PPO</figcaption>
</figure>

---

## 偏好对齐的目标与机制

偏好对齐的核心目的不是向模型注入新的基础知识，而是**调整高维概率空间中的采样倾向**：

- **概率质量迁移**：将模型的生成分布从冗长、包含幻觉或违规的内容区间，引导至符合人类偏好、诚实与安全的表达轨道；
- **优化原则（3H 原则）**：通常以有用（Helpful）、诚实（Honest）与无害（Harmless）作为综合评估准则。

---

## 经典 RLHF：三阶段强化学习流水线

2022 年，OpenAI 在 [InstructGPT 论文（Ouyang 等人）](https://arxiv.org/abs/2203.02155) 中确立了经典 **RLHF（Reinforcement Learning from Human Feedback）** 的三阶段训练流程：

### 1. SFT 策略模型（$\pi^{\text{SFT}}$）
基于高质量示范样本对基座模型进行微调，获得初始策略模型 $\pi^{\text{SFT}}$，并将其复制一份冻结作为基准参考模型 $\pi_{\text{ref}}$。

### 2. 训练奖励模型（Reward Model, RM）
1. **构建成对偏好数据**：针对同一个输入提示词 $x$，让模型生成两个不同回答 $y_1$ 与 $y_2$；
2. **人类标注偏好**：标注员对比两个回答，判定胜出样本 $y_w$（Winner）与落败样本 $y_l$（Loser），记为 $y_w \succ y_l$；
3. **Bradley-Terry 偏好建模**：将偏好概率建模为两个回答标量得分之差的 Sigmoid 激活：
   $$P(y_w \succ y_l \mid x) = \sigma\big(r_\phi(x, y_w) - r_\phi(x, y_l)\big)$$
4. **损失函数与训练**：通过最小化负对数似然损失，训练独立的打分模型 $r_\phi$：
   $$\mathcal{L}_{\text{RM}}(\phi) = -\mathbb{E}_{(x, y_w, y_l)}\Big[\log \sigma\big(r_\phi(x, y_w) - r_\phi(x, y_l)\big)\Big]$$

### 3. PPO 策略梯度优化
使用近端策略优化（PPO）算法更新策略模型 $\pi_\theta$，其优化目标为：

$$\max_{\theta} \mathbb{E}_{x \sim \mathcal{D}, y \sim \pi_\theta(y \mid x)}\Big[ r_\phi(x, y) - \beta \cdot \mathbb{D}_{\text{KL}}\big(\pi_\theta(y \mid x) \,\|\, \pi_{\text{ref}}(y \mid x)\big) \Big]$$

- **$r_\phi(x, y)$（奖励最大化）**：引导模型输出获得更高奖励分数的回答；
- **$\beta \cdot \mathbb{D}_{\text{KL}}(\pi_\theta \,\|\, \pi_{\text{ref}})$（KL 散度惩罚）**：约束策略模型 $\pi_\theta$ 不要过度偏离初始参考模型 $\pi_{\text{ref}}$。
  - **KL 惩罚的作用**：奖励模型本身存在拟合局限。若缺乏 KL 散度约束，强化学习容易陷入**奖励作弊（Reward Hacking）**（例如通过无意义的排版堆砌骗取高分），导致模型输出异常。

---

## DPO：直接偏好优化

经典 RLHF 在工程部署上较为复杂：训练时需在显存中同时维护 **Actor（策略网络）、Critic（价值网络）、Reward Model（奖励模型）与 Reference（参考模型）**，显存与调度开销较大。

2023 年，斯坦福大学的 [Rafailov 等人提出 Direct Preference Optimization（DPO）](https://arxiv.org/abs/2305.18290)，推导出了绕过显式奖励模型的闭式解。

<figure>
  <img src="/figures/rlhf-and-dpo/dpo-closed-form.svg" alt="RLHF 与 DPO 架构对比与隐式奖励闭式优化" />
  <figcaption>DPO 直接偏好优化：绕过显式奖励模型的闭式优雅解</figcaption>
</figure>

### 1. DPO 的数学推导逻辑
通过带 KL 约束的强化学习最优策略公式，可以将隐式奖励函数表示为策略模型与参考模型对数概率比的形式：

$$r(x, y) = \beta \log \frac{\pi_\theta(y \mid x)}{\pi_{\text{ref}}(y \mid x)} + \beta \log Z(x)$$

将该关系代入 Bradley-Terry 偏好模型中，配分函数 $Z(x)$ 在做差时相互抵消，从而得到直接基于策略模型参数更新的 DPO 损失函数：

$$\mathcal{L}_{\text{DPO}}(\theta) = -\mathbb{E}_{(x, y_w, y_l)}\left[ \log \sigma \left( \beta \log \frac{\pi_\theta(y_w \mid x)}{\pi_{\text{ref}}(y_w \mid x)} - \beta \log \frac{\pi_\theta(y_l \mid x)}{\pi_{\text{ref}}(y_l \mid x)} \right) \right]$$

### 2. DPO 的工程特点
- **资源占用减少**：训练期间仅需载入当前模型 $\pi_\theta$ 与冻结的参考模型 $\pi_{\text{ref}}$，无需单独训练和加载 Critic 与 Reward Model；
- **训练流程简化**：无需在线自回归采样，直接在成对偏好数据集上进行离线梯度更新，训练稳定性接近标准监督微调。

---

## 对齐的代价与副作用

在实际应用中，偏好对齐也会伴随一些需要权衡的现象：

1. **对齐税（Alignment Tax）**：严格的安全与风格偏好约束可能对某些非标准创意写作或小众代码推导产生一定抑制，表现为部分基准评测分数的轻微波动；
2. **过度拒答（Over-Refusal）**：安全规则若泛化过强，可能对中性或技术性提示词（如查询系统进程终止命令）产生误拦截；
3. **谄媚倾向（Sycophancy）**：当用户在提问中预设了某种事实错误的前提时，模型为了迎合人类语气可能倾向于顺从该错误前提。

---

## 最小代码实现

以下代码演示了基于 NumPy 实现的 DPO 闭式损失计算逻辑：

```python
import numpy as np

def sigmoid(x: float) -> float:
    return 1.0 / (1.0 + np.exp(-x))

def compute_dpo_loss(
    pi_theta_logps_win: float,   # 当前模型对赢家样本 y_w 的对数概率 log pi_theta(y_w|x)
    pi_theta_logps_lose: float,  # 当前模型对输家样本 y_l 的对数概率 log pi_theta(y_l|x)
    pi_ref_logps_win: float,     # 参考模型对赢家样本 y_w 的对数概率 log pi_ref(y_w|x)
    pi_ref_logps_lose: float,    # 参考模型对输家样本 y_l 的对数概率 log pi_ref(y_l|x)
    beta: float = 0.1            # KL 惩罚强度系数 (常用取值 0.1 ~ 0.5)
) -> tuple[float, float, float]:
    """
    计算单个偏好对样本的 DPO 损失与隐式奖励差
    """
    # 1. 计算当前模型相对参考模型的对数几率比 (Log Ratio)
    log_ratio_win = pi_theta_logps_win - pi_ref_logps_win
    log_ratio_lose = pi_theta_logps_lose - pi_ref_logps_lose
    
    # 2. 计算隐式奖励差: implicit_reward_diff = beta * (log_ratio_win - log_ratio_lose)
    logits_diff = beta * (log_ratio_win - log_ratio_lose)
    
    # 3. 计算 DPO 损失 L_DPO = -log(sigmoid(logits_diff))
    prob_win = sigmoid(logits_diff)
    loss = -np.log(prob_win + 1e-12)
    
    return loss, prob_win, logits_diff

def dpo_demo():
    print("--- DPO 损失计算演练 ---")
    
    # 场景 1: 模型符合偏好要求 (对赢家样本赋予更高的相对概率)
    loss_good, prob_good, diff_good = compute_dpo_loss(
        pi_theta_logps_win=-12.0, pi_theta_logps_lose=-20.0,
        pi_ref_logps_win=-15.0, pi_ref_logps_lose=-18.0,
        beta=0.1
    )
    print(f"场景 1 [正确对齐]: 隐式奖励优势={diff_good:+.3f} | 胜率 P(w>l)={prob_good*100:.2f}% | 损失 Loss={loss_good:.4f}")
    
    # 场景 2: 模型偏离偏好要求 (对输家样本赋予了更高的相对概率)
    loss_bad, prob_bad, diff_bad = compute_dpo_loss(
        pi_theta_logps_win=-18.0, pi_theta_logps_lose=-10.0,
        pi_ref_logps_win=-12.0, pi_ref_logps_lose=-15.0,
        beta=0.1
    )
    print(f"场景 2 [逆偏好状态]: 隐式奖励优势={diff_bad:+.3f} | 胜率 P(w>l)={prob_bad*100:.2f}% | 损失 Loss={loss_bad:.4f}")

dpo_demo()
```

**控制台输出：**
```text
--- DPO 损失计算演练 ---
场景 1 [正确对齐]: 隐式奖励优势=+0.500 | 胜率 P(w>l)=62.25% | 损失 Loss=0.4741
场景 2 [逆偏好状态]: 隐式奖励优势=-1.100 | 胜率 P(w>l)=24.97% | 损失 Loss=1.3873
```

---

## 核心概念辨析

- **SFT 微调 vs 偏好对齐（RLHF / DPO）**：
  - SFT 通过成对问答进行单向模仿学习，建立基础对话格式；
  - 偏好对齐通过成对比较建立价值偏好，优化多目标权衡与安全性。
- **PPO-RLHF vs DPO**：
  - PPO-RLHF 依赖显式奖励模型与在线策略采样，计算开销与调度较重；
  - DPO 基于数学等价推导直接在离线数据上更新策略，架构更为简洁稳定。
- **奖励优化 vs KL 散度约束**：
  - 奖励优化提高偏好指标；
  - KL 约束防止模型偏离原始分布以避免奖励作弊。

在掌握了偏好对齐后，大模型面对极高难度的复杂逻辑、数学证明与算法难题时，如何像人类一样进行深思熟虑、自纠错与长链慢思考？下一篇我们将探讨——《深度推理与慢思考模型》。

---

## 参考文献

1. Ouyang, Long, Wu, Jeffrey, Jiang, Xu, et al. (2022). [*Training language models to follow instructions with human feedback (InstructGPT)*](https://arxiv.org/abs/2203.02155). NeurIPS 2022 / arXiv:2203.02155.
2. Rafailov, Rafael, Sharma, Archit, Mitchell, Eric, et al. (2023). [*Direct Preference Optimization: Your Language Model is Secretly a Reward Model*](https://arxiv.org/abs/2305.18290). NeurIPS 2023 / arXiv:2305.18290.
3. Christiano, Paul F., Leike, Jan, Brown, Tom, et al. (2017). [*Deep Reinforcement Learning from Human Preferences*](https://arxiv.org/abs/1706.03741). NeurIPS 2017 / arXiv:1706.03741.
4. Bai, Yuntao, Kadavath, Saurav, Kundu, Sandipan, et al. (2022). [*Constitutional AI: Harmlessness from AI Feedback*](https://arxiv.org/abs/2212.08073). Anthropic / arXiv:2212.08073.
5. Schulman, John, Wolski, Filip, Dhariwal, Prafulla, et al. (2017). [*Proximal Policy Optimization Algorithms (PPO)*](https://arxiv.org/abs/1707.06347). arXiv:1707.06347.
