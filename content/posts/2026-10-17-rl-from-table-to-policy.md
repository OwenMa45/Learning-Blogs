---
title: "从 Q-Learning 到 DQN，再到 DDPG"
date: "2026-10-17"
slug: "rl-from-table-to-policy"
category: "rl"
tags: ["Q-Learning", "DQN", "DDPG", "强化学习入门"]
excerpt: "一张表如何变成神经网络？为什么连续动作需要另一个网络来做决定？用同一条线索理解三个算法。"
kind: "入门示例"
notice: "建站示例笔记 · 用于体验排版与交互，可继续修改为自己的学习总结。"
featured: true
draft: false
---

理解这三个算法，可以从一个问题出发：**处在某个状态时，哪一个动作更值得做？**

Q-Learning 把答案存在表里；DQN 用神经网络估计答案；DDPG 在连续动作空间里，同时学习一个评价动作的网络和一个提出动作的网络。

## 01 · Q 值是一种长期评价

Q(s, a) 表示：在状态 s 采取动作 a，之后按某种策略继续行动时，能够获得的**期望折扣回报**。它不只是这一步的奖励。谈论 Q 时，需要明确是某个策略的 Q 值，还是最优 Q 值 Q*。

表格型 Q-Learning 的目标是学习最优动作价值函数。把它画成表，就容易理解了：每一行是一种状态，每一列是一个动作。

| 状态 | 向左 | 向右 | 向上 | 向下 |
| --- | --- | --- | --- | --- |
| 格子 A | 0.10 | 0.65 | 0.20 | 0.05 |
| 格子 B | 0.25 | 0.80 | 0.35 | 0.15 |
| 格子 C | 0.40 | 1.00 | 0.10 | 0.20 |

这里的数字只是说明表格结构的示例，并非实验结果。若在格子 A 使用贪心选择，就会选择当前 Q 值最大的「向右」。训练时通常还需要探索，避免过早相信已有估计。

## 02 · 一条经验，更新一个格子

一次交互提供四个关键信息：当前状态 s、动作 a、即时奖励 r、下一状态 s′。是否真正终止，还决定了是否应当继续估计未来回报。

<div class="equation">Q(s, a) ← Q(s, a) + α [r + γ max<sub>a′</sub> Q(s′, a′) − Q(s, a)]</div>

这条更新规则适用于非终止转移。可以把它读成：**旧估计，加上朝着新目标迈出的一小步。** α 决定迈多大一步，γ 决定未来回报打多少折扣。到达真正终止状态时，目标只保留 r。

下面是一条只有「向右」动作的简化链：A → B → C → 终点。普通移动奖励是 0，进入终点奖励是 1，α = 0.5，γ = 0.9。它只用来展示更新与奖励传播，不包含探索策略。

<div class="q-demo" data-q-demo>
<h3>动手看一次 Q 表更新</h3>
<p>固定按 A → B → C → 终点采样，然后开始下一回合。</p>
<div class="demo-track" aria-label="A 到 B 到 C 到终点"><span class="demo-state" data-state="0">A</span><span>→</span><span class="demo-state" data-state="1">B</span><span>→</span><span class="demo-state" data-state="2">C</span><span>→</span><span class="demo-state goal">终点</span></div>
<table><thead><tr><th>状态</th><th>Q(s, 向右)</th></tr></thead><tbody><tr><td>A</td><td data-q="0">0.000</td></tr><tr><td>B</td><td data-q="1">0.000</td></tr><tr><td>C</td><td data-q="2">0.000</td></tr></tbody></table>
<p class="demo-status" role="status" aria-live="polite">Q 值从 0 开始。点击「下一步」，观察终点奖励怎样通过后续回合逐渐传回 A。</p>
<div class="demo-controls"><button type="button" data-next>下一步 →</button><button type="button" data-play>自动播放</button><button type="button" data-reset>重置</button></div>
</div>

第一回合里，A 和 B 都还不知道终点的好处，只有 C 的值先变大。再次走过这条链时，更新就能把已有的价值估计向前传播。这里使用固定学习率来展示过程；一般随机环境下的表格收敛结论还需要合适的学习率、充分探索等条件。

## 03 · DQN：把表换成函数

如果状态是一张图像，几乎不可能为每一种图像分配一行表格。DQN 用带参数的神经网络 Qθ(s, a) 近似 Q 值。在常见离散动作实现里，输入状态，输出各动作对应的分数。

以三个离散动作举例：

```text
状态 s → Q 网络 → [Q(s, 左), Q(s, 右), Q(s, 停)]
                       ↓
                 选择或探索一个动作
```

网络通过预测值与 TD 目标之间的误差更新参数。一个样本不再只改变一格数字：共享的参数发生变化，也可能影响其他状态的预测。

经典 DQN 的稳定化设计包括：

- **经验回放：**把交互转移存起来，随机采样小批量训练，降低相邻样本相关性并重复利用数据。
- **目标网络：**用更新较慢的网络构造 TD 目标，缓解训练目标随在线网络不断移动的问题。

需要区分 DQN 的早期论文与后续经典实现：2013 年工作展示了深度 Q 网络与经验回放，2015 年 Nature 工作系统采用了独立目标网络。

## 04 · DDPG：连续动作怎么选？

在机器人控制里，动作可能是连续的关节速度或力矩。它不像「向左、向右、停止」这样只有少数选项。对每个连续动作都计算一次 Q 值，再逐个比较，并不可行。

DDPG 同时学习两个函数：

| 网络 | 输入 | 输出 | 职责 |
| --- | --- | --- | --- |
| Actor，μ(s) | 状态 | 连续动作 | 提出一个动作 |
| Critic，Q(s, a) | 状态与动作 | 价值估计 | 评价这个动作 |

Critic 用 Bellman 目标学习价值。Actor 则利用 Critic 对动作的梯度，调整自己输出的动作，尝试让 Critic 给出更高的估计。训练收集数据时，通常给 Actor 的动作加入噪声以进行探索。

**DDPG 并不是只把 DQN 的输出层改成连续数值。**它结合确定性策略梯度和 Actor–Critic 结构，也借用了经验回放与目标网络等设计。

## 05 · 放在一张表里复习

| 问题 | 表格 Q-Learning | DQN | DDPG |
| --- | --- | --- | --- |
| 价值存在哪里？ | Q 表 | Q 网络 | Critic 网络 |
| 动作如何产生？ | 比较表格中的 Q 值，结合探索 | 比较网络输出的 Q 值，结合探索 | Actor 直接输出连续动作，训练时加探索噪声 |
| 典型动作空间 | 少量离散动作 | 离散动作 | 连续动作 |
| 核心变化 | 用 TD 更新价值 | 用函数近似替代表格 | 同时学习动作生成与动作评价 |

对精细操作而言，连续动作空间只是问题的一部分。接触感知、观测延迟、奖励设计、控制频率、执行器精度等，仍然会影响表现。选用了 DDPG，并不自动意味着夹爪更稳定。

## 原始资料与延伸阅读

1. [Sutton 与 Barto：Reinforcement Learning: An Introduction](http://incompleteideas.net/book/the-book-2nd.html) — 表格方法与 TD 学习。
2. [Mnih 等，Playing Atari with Deep Reinforcement Learning，2013](https://arxiv.org/abs/1312.5602) — DQN 早期工作。
3. [Mnih 等，Human-level control through deep reinforcement learning，2015](https://www.nature.com/articles/nature14236) — 经典 DQN。
4. [Lillicrap 等，Continuous control with deep reinforcement learning](https://arxiv.org/abs/1509.02971) — DDPG 原始论文。
5. [OpenAI Spinning Up：DDPG](https://spinningup.openai.com/en/latest/algorithms/ddpg.html) — 方程与算法流程。
