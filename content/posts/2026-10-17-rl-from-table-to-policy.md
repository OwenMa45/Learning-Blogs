---
title: "从 Q-Learning 到 DQN，再到 DDPG：一份图解学习笔记"
date: "2026-10-17"
slug: "rl-from-table-to-policy"
category: "rl"
tags: ["Q-Learning", "DQN", "DDPG", "强化学习入门", "Actor-Critic"]
excerpt: "用一个机器人例子，看懂 Q 表如何更新、神经网络如何估计价值，以及 Actor 如何做出连续动作。附逐步动画、公式对照与复习卡片。"
kind: "学习总结"
notice: "阅读路线：先建立直觉，再跟着动画手算，最后用公式和自测巩固。文中的数值与图形均为教学示例。"
featured: true
draft: false
---

<link rel="stylesheet" href="{{base}}/assets/rl-guide.css">
<script type="module" src="{{base}}/assets/rl-guide.js"></script>

学习这三个算法时，可以一直追问两件事：**怎样评价一个动作？怎样选出要执行的动作？**

Q-Learning 把评价存在表里；DQN 用神经网络来估计评价；DDPG 则让一个网络负责行动、另一个网络负责评价，使算法能够处理连续动作。下面沿着“机器人走格子 → 观察更复杂 → 控制更精细”这条线，把直觉、公式与训练过程连起来。

<figure class="rl-figure rl-overview" aria-labelledby="rl-overview-caption">
  <div class="rl-overview-grid">
    <div class="rl-concept">
      <span class="rl-kicker">01 · Q-LEARNING</span><strong>把经验写进表格</strong>
      <div class="rl-mini-table" aria-hidden="true"><span></span><span>↑</span><span>→</span><span>A</span><i>0</i><i class="rl-highlight">1.01</i><span>B</span><i class="rl-highlight">4.50</i><i>0</i><span>C</span><i>0</i><i class="rl-highlight">8.75</i></div>
      <p>状态 × 动作<br><b>查表，再比较</b></p>
    </div>
    <div class="rl-concept">
      <span class="rl-kicker">02 · DQN</span><strong>用网络预测一行分数</strong>
      <svg class="rl-net-sketch" viewBox="0 0 200 130" role="img" aria-label="状态经过神经网络，得到四个离散动作的 Q 值"><g fill="none" stroke="currentColor" opacity=".35"><path d="M25 40 95 25 175 20M25 40 95 65 175 50M25 40 95 105 175 110M25 90 95 25 175 80M25 90 95 65 175 110M25 90 95 105 175 20M95 25 175 50M95 65 175 80M95 105 175 80"/></g><g class="rl-node"><circle cx="25" cy="40" r="8"/><circle cx="25" cy="90" r="8"/><circle cx="95" cy="25" r="9"/><circle cx="95" cy="65" r="9"/><circle cx="95" cy="105" r="9"/><circle cx="175" cy="20" r="7"/><circle cx="175" cy="50" r="7"/><circle cx="175" cy="80" r="7"/><circle cx="175" cy="110" r="7"/></g></svg>
      <p>状态 → 各动作 Q 值<br><b>预测，再比较</b></p>
    </div>
    <div class="rl-concept">
      <span class="rl-kicker">03 · DDPG</span><strong>让策略直接提出动作</strong>
      <div class="rl-mini-actor" aria-hidden="true"><span>Actor · μ(s)</span><b>↓</b><span class="rl-action">[2.3, −0.8] mm</span><b>↓</b><span>Critic · Q(s, a)</span></div>
      <p>状态 → 动作 → 评价<br><b>行动者与评价者协作</b></p>
    </div>
  </div>
  <figcaption id="rl-overview-caption">图 1 · 三种不同的实现。左图截取后文三回合演示的部分 Q 值并作四舍五入；右图动作数值仅作示意。</figcaption>
</figure>

## 01 · 先认清 Q：它是分数，不是动作

想象一个在格子世界里找终点的机器人。它看到当前位置 <em>s</em>，选择动作 <em>a</em>，环境返回奖励 <em>r</em> 和下一个状态 <em>s′</em>。策略 π 决定机器人如何选动作。

**Q(s, a) 回答的是：“在状态 s 先做动作 a，之后按某种策略行动，预计能得到多少折扣后的累计奖励？”** 它不仅看这一步赚了多少，还看这一步会把机器人带到怎样的未来。[1]

<div class="rl-formula" role="group" aria-label="动作价值的定义">
  <span>G<sub>t</sub> = r<sub>t+1</sub> + γr<sub>t+2</sub> + γ²r<sub>t+3</sub> + …</span>
  <span>Q<sup>π</sup>(s, a) = E<sub>π</sub>[G<sub>t</sub> | S<sub>t</sub> = s, A<sub>t</sub> = a]</span>
</div>

这里的 **G 是某次经历的回报，Q 是回报的期望**。同一动作可能产生不同结果，因此我们要通过经验估计它。Q 值可以是负数，也不要求加起来等于 1；它不是成功概率。

| 符号 | 可以怎样理解 | 在机器人例子里 |
| --- | --- | --- |
| s、a、r、s′ | 当前状态、所做动作、这一步奖励、下一状态 | A、向右、0、B |
| γ（gamma） | 折扣因子，通常 0 ≤ γ < 1 | γ = 0.9；越远的奖励权重越小 |
| α（alpha） | 表格更新步长，决定这次修正多少 | α = 0.5；朝目标值走一半 |
| ε（epsilon） | ε-greedy 的随机探索比例 | 大多数时候选高分动作，少数时候试别的 |
| π、μ | 策略；μ 常用于表示确定性策略 | 根据位置或传感器信息选择动作 |
| d | 这一步后是否真正终止 | 进入终点 G 时 d = 1，否则为 0 |

Q-Learning 和 DQN 的目标是逼近最优动作价值 **Q\***：第一步做 a，此后都采取最优策略时的期望回报。训练中存下来的 Q 只是当前估计，起初可能很不准确。

### Q 表到底长什么样？

在表格型 Q-Learning 中，**一行是一个状态，一列是一个动作，一个单元格是这个“状态—动作”组合的估计分数**。下面是一张人为设定的示意表，用来理解行列；它不是后面动画的训练结果。

| 状态 \ 动作 | ↑ 上 | ↓ 下 | ← 左 | → 右 | 按这一行贪心选择 |
| --- | ---: | ---: | ---: | ---: | --- |
| A | 1.2 | −2 | 0.5 | **4** | → 右 |
| B | **7** | 1 | 3 | 2 | ↑ 上 |
| C | 2 | −1 | 6 | **10** | → 右 |

例如在 B，比较的是 **B 这一整行**，最大值 7 对应“向上”。Q 表本身存的是价值；“每行选最大值”才从价值导出了一个策略。训练时仍需要探索，不能从第一步起只相信这张还没学好的表。

## 02 · Q-Learning：一段经历，更新一个格子

机器人从 s 做了 a，得到 r 并到达 s′ 后，先计算一个“更有依据的新目标” y，再让旧 Q 值向它靠近。[1]

<div class="rl-formula" role="group" aria-label="Q-Learning 更新公式">
  <span>y = r + γ(1 − d) max<sub>a′</sub> Q(s′, a′)</span>
  <span>δ = y − Q(s, a)</span>
  <span><b>Q(s, a) ← Q(s, a) + αδ</b></span>
</div>

这个目标由两部分组成：**已经拿到的即时奖励 + 下一状态最有希望的未来价值**。δ 叫时序差分误差（TD error）：新目标与旧估计差了多少。

注意两个位置：**读 s′ 那一行的最大值，写 s 那一行里刚执行的 a 那一格。** 到达 B，不意味着这次要更新 B；如果刚才是从 A 向右来到 B，写回的是 Q(A, 右)。对于终止状态，未来项直接为 0，不需要再查询终点的 Q 值。

### 跟着动画看：终点奖励怎样向前传？

这里固定走三回合同一条路线：**A 向右到 B，B 向上到 C，C 向右到 G**。普通转移奖励为 0，进入终点奖励为 10。初始 Q 全为 0，α = 0.5，γ = 0.9。

每条经验被拆成三帧：执行动作 → 读取下一行 → 更新原格。点击“下一步”慢慢看，也可以自动播放。

<figure class="rl-figure rl-demo" data-rl-demo aria-labelledby="rl-demo-caption">
  <div class="rl-demo-header"><div><span class="rl-kicker">Q TABLE LAB</span><strong>把一次更新拆开看</strong></div><span data-rl-counter>初始化 · 0 / 9 次更新</span></div>
  <ol class="rl-phases" aria-label="一次更新的三个阶段"><li data-rl-phase="act">1 执行动作</li><li data-rl-phase="read">2 读下一行</li><li data-rl-phase="write">3 写回原格</li></ol>
  <div class="rl-demo-grid">
    <div class="rl-map-panel">
      <div class="rl-map" aria-label="路线图：A 向右到 B，B 向上到 C，C 向右到终点 G">
        <div class="rl-map-cell rl-map-a is-agent" data-rl-state="A"><b>A</b><span>起点</span></div>
        <div class="rl-map-cell rl-map-b" data-rl-state="B"><b>B</b><span>中间状态</span></div>
        <div class="rl-map-cell rl-map-c" data-rl-state="C"><b>C</b><span>终点前</span></div>
        <div class="rl-map-cell rl-map-g" data-rl-state="G"><b>G</b><span>终点 +10</span></div>
        <span class="rl-route rl-route-ab" data-rl-route="0" aria-hidden="true">→</span><span class="rl-route rl-route-bc" data-rl-route="1" aria-hidden="true">↑</span><span class="rl-route rl-route-cg" data-rl-route="2" aria-hidden="true">→</span>
      </div>
      <p class="rl-map-legend"><span class="rl-agent-dot"></span> 圆点表示机器人所在位置</p>
    </div>
    <div class="rl-table-panel">
      <div class="table-scroll" tabindex="0" role="region" aria-label="演示 Q 表，可横向滚动"><table class="rl-q-table"><caption>当前估计 Q(s, a)</caption><thead><tr><th scope="col">状态</th><th scope="col">↑ 上</th><th scope="col">↓ 下</th><th scope="col">← 左</th><th scope="col">→ 右</th></tr></thead><tbody>
        <tr data-rl-row="A"><th scope="row">A</th><td data-rl-cell="A-0">0</td><td data-rl-cell="A-1">0</td><td data-rl-cell="A-2">0</td><td data-rl-cell="A-3">0</td></tr>
        <tr data-rl-row="B"><th scope="row">B</th><td data-rl-cell="B-0">0</td><td data-rl-cell="B-1">0</td><td data-rl-cell="B-2">0</td><td data-rl-cell="B-3">0</td></tr>
        <tr data-rl-row="C"><th scope="row">C</th><td data-rl-cell="C-0">0</td><td data-rl-cell="C-1">0</td><td data-rl-cell="C-2">0</td><td data-rl-cell="C-3">0</td></tr>
      </tbody></table></div>
      <div class="rl-table-legend"><span><i class="rl-read-key"></i>读：下一行</span><span><i class="rl-write-key"></i>写：原来的格子</span></div>
    </div>
  </div>
  <div class="rl-demo-explain" role="status" aria-live="polite" aria-atomic="true"><strong data-rl-heading>准备开始</strong><p data-rl-explanation>所有估计先设为 0。点击下一步，观察机器人行动与 Q 表写回的位置。</p><div class="rl-demo-equation" data-rl-equation>新值 = 旧值 + 0.5 ×（目标 − 旧值）</div></div>
  <div class="rl-demo-controls" hidden><button type="button" data-rl-back>上一步</button><button type="button" data-rl-next class="rl-primary">下一步 →</button><button type="button" data-rl-play aria-pressed="false">自动播放</button><button type="button" data-rl-reset>重置</button><label>速度 <select data-rl-speed aria-label="动画播放速度"><option value="2200">慢</option><option value="1300" selected>中</option><option value="700">快</option></select></label></div>
  <noscript><p>启用 JavaScript 可逐步播放；下方手算与回合表提供完整的静态学习内容。</p></noscript>
  <figcaption id="rl-demo-caption">图 2 · 固定路线教学演示，不包含探索。每回合到 G 后重新从 A 开始；没有访问的动作保持初始值 0，这不代表它们真实的价值就是 0。</figcaption>
</figure>

第一次走到终点，只有最后一步见到了奖励。我们实际写入的是：

<div class="rl-formula"><span>Q(C, 右) ← 0 + 0.5 × (10 − 0) = <b>5</b></span></div>

第二回合再次从 B 到 C 时，C 的最大 Q 已经是 5，所以这次即使奖励为 0，也能学到：

<div class="rl-formula"><span>y = 0 + 0.9 × 5 = 4.5</span><span>Q(B, 上) ← 0 + 0.5 × (4.5 − 0) = <b>2.25</b></span></div>

第三回合从 A 到 B 时，A 才利用上一回合留下的 Q(B, 上) = 2.25 得到正向更新：

<div class="rl-formula"><span>Q(A, 右) ← 0 + 0.5 × (0.9 × 2.25 − 0) = <b>1.0125</b></span></div>

| 完成的回合 | Q(A, 右) | Q(B, 上) | Q(C, 右) |
| --- | ---: | ---: | ---: |
| 初始化 | 0 | 0 | 0 |
| 第 1 回合 | 0 | 0 | 5 |
| 第 2 回合 | 0 | 2.25 | 7.5 |
| 第 3 回合 | 1.0125 | 4.5 | 8.75 |

这就是 **bootstrapping（自举）**：用现有估计来构造新的学习目标。奖励带来的信息，随着再次访问相邻状态逐步向前传播。这里每条转移到来后立刻更新一次，因此早先走过的 A、B 不会在抵达 G 的瞬间自动被回填。

**这还不是训练完成的表。** 如果始终只回放这条确定性路线，继续更新这三个格子，它们会趋近 8.1、9、10；这只说明这条路线上的估计。一般有限表格问题要收敛到 Q\*，还需要充分访问状态—动作对、合适的步长条件等，不能由三回合演示推出收敛保证。[1]

### 它为什么开始不够用了？

假设状态由位置、速度、姿态和一张相机图像共同组成。即使动作还是“上、下、左、右”，状态组合也多到无法逐行存储。表格对相近状态也没有天然的共享机制：在位置 A 学到的东西，不会自动教会一个从未见过的相似位置。

下一个问题因此是：**能不能不存所有格子，而是学习一个能预测 Q 值的函数？**

## 03 · DQN：让神经网络代替 Q 表

DQN（Deep Q-Network）用带参数 θ 的神经网络 Q<sub>θ</sub> 来近似动作价值。典型的离散动作 DQN 输入一个状态，一次输出所有候选动作的 Q 值，再取最大值对应的动作。状态可以是向量，也可以经卷积网络处理图像。[2][3]

<figure class="rl-figure" aria-labelledby="rl-dqn-caption">
  <span class="rl-kicker">DQN · 一次决策</span>
  <div class="rl-flow">
    <div class="rl-flow-box"><small>输入</small><strong>状态 s</strong><span>位置、速度或图像</span></div>
    <div class="rl-flow-arrow" aria-hidden="true">↓</div>
    <div class="rl-flow-box rl-tone-green"><small>可学习参数 θ</small><strong>Q 网络</strong><span>提取特征，并预测价值</span></div>
    <div class="rl-flow-arrow" aria-hidden="true">↓</div>
    <div class="rl-score-row" aria-label="动作价值示例：上 1.2，下负 2，左 0.5，右 4"><span>↑ 上<b>1.2</b></span><span>↓ 下<b>−2</b></span><span>← 左<b>0.5</b></span><span class="rl-score-best">→ 右<b>4.0</b></span></div>
    <div class="rl-flow-arrow" aria-hidden="true">↓</div>
    <div class="rl-flow-box"><strong>贪心动作：向右</strong><span>训练时通常再结合 ε-greedy 探索</span></div>
  </div>
  <figcaption id="rl-dqn-caption">图 3 · 可以把这次输出想象成“临时算出 Q 表的一行”。网络实际保存的是参数，并没有在内存中展开一张巨型表。</figcaption>
</figure>

对比表格更新，DQN 有一个重要变化：**一次训练修改的是共享参数 θ。** 虽然损失针对本次采样动作的 Q 值，但参数变化也可能影响其他动作和其他状态的预测。这带来了泛化能力，也使训练更容易互相干扰；泛化不是必然正确。

### 关键不只在网络，还有两种训练技巧

经典 DQN 将 Q 学习与经验回放、目标网络结合起来。[2][3]

| 机制 | 怎么做 | 解决什么问题 |
| --- | --- | --- |
| 神经网络 | 用 Q<sub>θ</sub>(s, a) 预测价值 | 状态太多，表格存不下；希望共享特征 |
| 经验回放 Replay Buffer | 保存 (s, a, r, s′, d)，随机抽取小批量训练 | 减弱相邻经验的时间相关性，重复利用交互数据 |
| 目标网络 Target Network | 另存参数 θ<sup>−</sup>，一段时间内固定，用来构造目标 | 让学习目标变化得慢一些，缓解“追着自己跑” |

如果今天预测的 Q 值和明天要追赶的目标都由同一个不断改变的网络给出，训练容易不稳定。经典 2015 DQN 的做法是：在线网络持续训练，**每隔 C 次更新把在线参数复制给目标网络**。目标网络仍然是估计，不是标准答案。[3]

<figure class="rl-figure" aria-labelledby="rl-dqn-train-caption">
  <span class="rl-kicker">DQN · 一批经验如何训练</span>
  <div class="rl-flow-box"><strong>经验池随机采样</strong><span>(s, a, r, s′, d)</span></div>
  <div class="rl-flow-arrow" aria-hidden="true">↓ 分成两条计算路径</div>
  <div class="rl-branches">
    <div class="rl-flow-box rl-tone-green"><small>当前预测 · 可求梯度</small><strong>s → 在线 Q<sub>θ</sub></strong><span>只取实际动作 a 对应的预测 q</span></div>
    <div class="rl-flow-box rl-tone-orange"><small>学习目标 · 停止梯度</small><strong>s′ → 目标 Q<sub>θ−</sub></strong><span>取动作最大值，结合 r 与 d 得到 y</span></div>
  </div>
  <div class="rl-flow-arrow" aria-hidden="true">↓ 比较 q 与 y</div>
  <div class="rl-flow-box"><strong>最小化预测误差 → 更新 θ</strong><span>每隔 C 次：θ<sup>−</sup> ← θ</span></div>
  <figcaption id="rl-dqn-train-caption">图 4 · 在线网络负责被训练，目标网络负责算目标。进入真正终止状态的样本，目标直接取 r。</figcaption>
</figure>

### 从“改格子”变成“改参数”

设一个小批量有 N 条经验。用平方误差表示损失，核心计算是：

<div class="rl-formula" role="group" aria-label="DQN 的目标和损失">
  <span>y<sub>i</sub> = r<sub>i</sub> + γ(1 − d<sub>i</sub>) max<sub>a′</sub> Q<sub>θ−</sub>(s′<sub>i</sub>, a′)</span>
  <span>L(θ) = (1/N) ∑<sub>i</sub> [Q<sub>θ</sub>(s<sub>i</sub>, a<sub>i</sub>) − y<sub>i</sub>]²</span>
  <span>θ ← θ − η ∇<sub>θ</sub>L(θ)</span>
</div>

η 是优化器的学习率，不能直接理解成“Q 值朝目标走 η 的比例”；网络结构与梯度共同决定预测如何变化。计算损失时将 y 视为常量，**不会沿目标这一支反向传播**。实际实现也常用 Huber loss 等更稳健的误差形式。[3]

举例：当前 Q<sub>θ</sub>(B, 上) = 4，这步奖励为 0，目标网络在 C 给出的最大 Q 为 7，且未终止。则 y = 0 + 0.9 × 7 = 6.3，TD error 为 2.3。训练让当前预测向 6.3 靠近，但不能像表格那样断言一次训练后它必然变成 5.15。

> **DQN 改进了什么？** 用可泛化的函数代替逐格存储，并用经验回放与目标网络改善深度 Q 学习的训练稳定性。标准 DQN 的动作集合仍然是离散的。

## 04 · DDPG：连续动作，交给 Actor 来提出

现在把“走一格”改成控制机械臂末端：动作是位移向量 [Δx, Δy]，例如 [2.3 mm, −0.8 mm]。动作不再只有四个按钮，而是某个范围内的连续数值。

DQN 的“列出所有动作再取最大值”就很难直接套用了。假设有 6 个控制维度，每个维度只离散成 10 档，动作组合已经有 **10⁶ 种**。连续动作下的 max<sub>a</sub> Q(s, a) 在数学上仍有意义，但每一步求解这个优化问题通常很昂贵。

DDPG（Deep Deterministic Policy Gradient）的思路是：**额外学一个函数 μ<sub>θ</sub>(s)，让它直接给出一个高价值动作。** 不必在每一步枚举全部候选动作。[4][5]

需要摆正算法关系：DDPG 建立在**确定性策略梯度 DPG** 的基础上，并吸收 DQN 的经验回放与目标网络技巧。把它当作学习路线中 DQN 之后的一站很方便，但它并非只给 DQN 增加了一个连续输出层。[4][5]

### Actor 与 Critic，各自学什么？

<figure class="rl-figure" aria-labelledby="rl-ddpg-caption">
  <span class="rl-kicker">DDPG · 行动与评价分开学</span>
  <div class="rl-flow-box"><small>输入</small><strong>状态 s</strong><span>机械臂姿态、速度、目标相对位置等</span></div>
  <div class="rl-flow-arrow" aria-hidden="true">↓</div>
  <div class="rl-flow-box rl-tone-green"><small>Actor · 行动者</small><strong>a = μ<sub>θ</sub>(s)</strong><span>直接输出连续动作，如 [2.3, −0.8] mm</span></div>
  <div class="rl-branches rl-ddpg-branches">
    <div class="rl-branch"><div class="rl-flow-arrow" aria-hidden="true">↓ 与环境交互</div><div class="rl-flow-box"><strong>环境</strong><span>训练时给动作加探索噪声<br>得到 r、s′、d，存入经验池</span></div></div>
    <div class="rl-branch"><div class="rl-flow-arrow" aria-hidden="true">↓ 与原状态 s 一起输入</div><div class="rl-flow-box rl-tone-orange"><small>Critic · 评价者</small><strong>Q<sub>φ</sub>(s, a) → 一个分数</strong><span>训练时提供动作改进的梯度</span></div></div>
  </div>
  <div class="rl-feedback"><b>Actor 的学习信号</b><span>沿着 Critic 对动作的梯度，调整 Actor 参数，让提出的动作获得更高评价。</span></div>
  <figcaption id="rl-ddpg-caption">图 5 · Actor 输出动作，Critic 输出价值。执行已经训练好的策略时，通常只需要 Actor；Critic 主要用于训练。</figcaption>
</figure>

| 网络 | 输入 | 输出 | 学习目标 |
| --- | --- | --- | --- |
| Actor：μ<sub>θ</sub> | 状态 s | 一个连续动作向量 a | 提出的动作，能被 Critic 评得更高 |
| Critic：Q<sub>φ</sub> | 状态 s 和动作 a | 一个标量 Q 值 | 对长期回报的估计更准确 |

这里的 Critic 更接近在估计当前策略的 Q<sup>μ</sup>，Actor 则不断改进策略；不能直接把 Critic 的输出当成已经求出的最优 Q\*。

“确定性”指的是：**网络参数固定、输入状态相同时，Actor 给出相同动作。** 它不表示环境必须确定，也不表示训练时没有探索。DDPG 通常在收集经验时使用 a = μ(s) + 噪声，并按动作边界裁剪；原论文使用 OU 噪声，也可使用高斯噪声。评估时通常移除探索噪声。[5][6]

### 一次训练，分成三步

**第一步：训练 Critic，让评分更可信。** 从经验池采样后，用目标 Actor 在下一状态提出动作，再由目标 Critic 评价这个动作：

<div class="rl-formula" role="group" aria-label="DDPG Critic 的目标和损失">
  <span>a′<sub>i</sub> = μ<sub>θ−</sub>(s′<sub>i</sub>)</span>
  <span>y<sub>i</sub> = r<sub>i</sub> + γ(1 − d<sub>i</sub>) Q<sub>φ−</sub>(s′<sub>i</sub>, a′<sub>i</sub>)</span>
  <span>L<sub>critic</sub>(φ) = (1/N) ∑<sub>i</sub> [Q<sub>φ</sub>(s<sub>i</sub>, a<sub>i</sub>) − y<sub>i</sub>]²</span>
</div>

这一步中，预测一侧用的是**经验里实际执行的动作 a<sub>i</sub>**，包括它当时可能带有的探索噪声。构造 y 使用两个目标网络，且停止梯度。终止样本直接令 y = r。[5][6]

**第二步：训练 Actor，让动作更有价值。** 使用采样状态，但把动作换成当前 Actor 的输出。定义：

<div class="rl-formula" role="group" aria-label="DDPG Actor 目标">
  <span>J(θ) = (1/N) ∑<sub>i</sub> Q<sub>φ</sub>(s<sub>i</sub>, μ<sub>θ</sub>(s<sub>i</sub>))</span>
  <span>最大化 J(θ)，等价于最小化 L<sub>actor</sub>(θ) = −J(θ)</span>
</div>

可以把它理解为：“Critic 告诉 Actor，动作往哪个方向微调，评分会上升；Actor 再调整自己的参数。”梯度沿 **Q 对动作的变化 → 动作对 Actor 参数的变化** 传递。此时保持 Critic 参数 φ 不变，但仍需要通过 Critic 计算对动作输入的梯度；不能把整段 Critic 计算切断。这里也不需要对真实环境求导。[4][6]

**第三步：缓慢更新两个目标网络。** DDPG 通常每次训练后采用软更新，而不是长时间不动再整体复制：

<div class="rl-formula" role="group" aria-label="DDPG 目标网络软更新">
  <span>θ<sup>−</sup> ← τθ + (1 − τ)θ<sup>−</sup></span>
  <span>φ<sup>−</sup> ← τφ + (1 − τ)φ<sup>−</sup></span>
</div>

τ 很小，例如 0.005 表示目标参数这次只向在线参数靠近 0.5%。因此完整的 DDPG 训练通常有 **4 个网络：在线 Actor、在线 Critic、目标 Actor、目标 Critic**。后两个是缓慢跟随的副本，不是额外两个独立任务。[5][6]

### 连续动作不等于自动学会精细操作

连续动作让模型能够表达细小的控制量，但实际精度还取决于状态观测、奖励设计、动力学、控制频率、探索方式和训练质量。动作也不会天然平滑；需要时应在目标、策略或控制器中考虑平滑性。

DDPG 仍可能因价值估计偏差、探索不足或超参数敏感而训练不稳定。Actor 还可能利用 Critic 的错误估计，追求“看起来高分”的坏动作。理解这些局限后，再学习 TD3 或 SAC，会更容易看懂它们试图修补的问题。[6]

## 05 · 把三种算法放在同一张桌上

最值得对照的是它们怎样估计“下一步有多好”：

| 算法 | 未终止时的目标 y | 下一动作从哪里来？ |
| --- | --- | --- |
| Q-Learning | r + γ max<sub>a′</sub> Q(s′, a′) | 比较 Q 表下一行 |
| DQN | r + γ max<sub>a′</sub> Q<sub>θ−</sub>(s′, a′) | 比较目标 Q 网络的离散输出 |
| DDPG | r + γ Q<sub>φ−</sub>(s′, μ<sub>θ−</sub>(s′)) | 目标 Actor 提出动作，目标 Critic 打分 |

**真正终止时，三者的目标都变成 y = r。** DDPG 中 Actor 提出的动作是在训练中学出来的，不能认为它每次都精确等于全局 argmax。

| 比较维度 | 表格型 Q-Learning | 标准 DQN | DDPG |
| --- | --- | --- | --- |
| 核心存储 | 状态 × 动作的数值表 | Q 网络参数 | Actor 与 Critic 参数 |
| 典型状态 | 可枚举、规模较小 | 可处理高维状态 | 可处理高维状态 |
| 典型动作 | 离散 | 离散 | 连续向量 |
| 贪心决策 | 选当前行最大值 | 选网络最大输出 | Actor 直接输出 |
| 单次训练改什么 | 采样到的一个表格单元 | 共享的 Q 网络参数 | 先更新 Critic，再更新 Actor |
| 探索 | 常用 ε-greedy | 常用 ε-greedy | 常在动作上添加噪声 |
| 经验回放 | 基础算法不必使用 | 经典机制 | 经典机制 |
| 目标网络 | 基础算法没有 | 1 个目标 Q 网络 | 目标 Actor + 目标 Critic |
| 常见目标更新 | 不适用 | 周期性硬复制 | 每步软更新 |

三者都是**无模型（model-free）、离策略（off-policy）**方法：这里的训练不依赖已知环境转移模型，目标策略也可以不同于采集数据时的行为策略。例如 Q-Learning 可以用带 ε 探索的行为采集经验，却向贪心策略的目标更新。

“离策略”不等于“离线强化学习”。DQN、DDPG 通常仍不断与环境交互；经验池只是把过去经验保存下来供训练使用。模型是否拥有神经网络，也与“model-free”中的环境模型不是同一个概念。

## 06 · 复习时，先查这些易混点

| 容易记错 | 更准确的说法 |
| --- | --- |
| Q 就是这一步的奖励 | Q 估计折扣后的长期回报；r 是单步反馈 |
| 到达 B，就更新 B | 更新的是刚才从哪里、做了什么，即 Q(s, a) |
| DQN 最后也生成一张表 | 常规实现保存参数，查询状态时才计算价值 |
| DQN 的目标网络会一起做梯度下降 | 目标分支停止梯度，参数通过复制等方式更新 |
| DDPG 的 Actor 在模仿经验里的动作 | 它主要沿 Critic 的价值梯度改进动作 |
| 连续动作一定比离散动作好 | 取决于任务的动作结构；“更复杂”不保证“更合适” |
| done 总意味着未来项归零 | 应区分真正终止与外部时间上限截断；后者在任务仍可继续时通常仍需自举 |

最后一行是落地实现时的常见细节：本文 d 只表示**真正的终止**。如果采样因为外部时间限制结束，但任务本身还有未来，就不能机械地把所有结束标记都当成 d = 1；应保留正确的后续状态用于目标计算。[6]

### 五个问题，检查自己是否真的理解

<div class="rl-review">
  <details><summary>1. 从 A 向右到 B，这次更新哪个位置？又读取哪里？</summary><p>写回 Q(A, 右)，读取 B 这一行的最大 Q 值。读下一状态、写原状态的已执行动作。</p></details>
  <details><summary>2. 奖励是 0，为什么 Q 值还可能变大？</summary><p>只要下一状态的估计未来价值足够高，y = 0 + γ max Q(s′, ·) 就可能高于旧值。即时没得分，不代表这步没有长期价值。</p></details>
  <details><summary>3. DQN 输入一个状态，输出的是什么？</summary><p>典型离散 DQN 输出每个候选动作的 Q 值。比如四个方向对应四个分数；动作由比较分数和探索规则决定，不是把分数当成四个动作概率。</p></details>
  <details><summary>4. DDPG 为什么要有 Actor，不能只保留 Critic？</summary><p>在连续动作空间里，逐一枚举动作不可行，每次求解 max Q(s, a) 也可能昂贵。Actor 学习直接提出高价值动作，Critic 提供评价与改进方向。</p></details>
  <details><summary>5. Actor 更新时，Critic 是“冻结”还是“不参与”？</summary><p>冻结的是 Critic 的参数更新。它仍参与前向计算，并提供 Q 对动作的梯度，继续传到 Actor 参数；若连这条梯度路径都断开，Actor 就无法据此学习。</p></details>
</div>

<div class="rl-memory-card"><span class="rl-kicker">一分钟回顾</span><p><b>Q-Learning：</b>把“这一步 + 下一步的希望”写回一个格子。</p><p><b>DQN：</b>用网络预测价值，用回放和目标网络帮助稳定训练。</p><p><b>DDPG：</b>Actor 给出连续动作，Critic 评价动作，两者交替学习。</p><strong>共同主线：通过经验学习长期价值，再让行动逐渐变好。</strong></div>

## 07 · 原始论文与延伸阅读

正文的示意图、数值演算与交互动画用于建立直觉；下面的原始资料适合在复习公式时对照阅读。

1. **Watkins & Dayan, 1992.** [Q-learning](https://doi.org/10.1007/BF00992698) · 表格 Q-Learning 的更新与收敛分析；[作者页面](https://www.gatsby.ucl.ac.uk/~dayan/papers/wd92.html)。
2. **Mnih et al., 2013.** [Playing Atari with Deep Reinforcement Learning](https://arxiv.org/abs/1312.5602) · 从图像学习动作价值与经验回放的早期 DQN 工作。
3. **Mnih et al., 2015.** [Human-level control through deep reinforcement learning](https://www.nature.com/articles/nature14236) · 经典 DQN；重点看回放、目标网络和训练算法。
4. **Silver et al., 2014.** [Deterministic Policy Gradient Algorithms](https://proceedings.mlr.press/v32/silver14.html) · 理解 DDPG 的策略梯度来源。
5. **Lillicrap et al., 2015 预印本 / ICLR 2016.** [Continuous control with deep reinforcement learning](https://arxiv.org/abs/1509.02971) · DDPG 原论文；重点看 Actor-Critic 与软更新。
6. **OpenAI Spinning Up.** [Deep Deterministic Policy Gradient](https://spinningup.openai.com/en/latest/algorithms/ddpg.html) · 将 DDPG 公式对应到训练步骤，补充实现细节。
