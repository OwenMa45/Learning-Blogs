// The fixed route is a teaching sequence, not an exploration policy.
const ROUTE = [
  { state: 'A', action: 3, actionName: '右', next: 'B', reward: 0, terminal: false },
  { state: 'B', action: 0, actionName: '上', next: 'C', reward: 0, terminal: false },
  { state: 'C', action: 3, actionName: '右', next: 'G', reward: 10, terminal: true }
];
const ALPHA = 0.5;
const GAMMA = 0.9;
const copyQ = q => Object.fromEntries(Object.entries(q).map(([s, values]) => [s, [...values]]));
const format = n => String(Number(n.toFixed(4)));

export function buildFrames() {
  const q = { A: [0, 0, 0, 0], B: [0, 0, 0, 0], C: [0, 0, 0, 0] };
  const frames = [{ phase: 'initial', episode: 0, updates: 0, position: 'A', q: copyQ(q) }];
  for (let episode = 1; episode <= 3; episode++) {
    for (let routeIndex = 0; routeIndex < ROUTE.length; routeIndex++) {
      const transition = ROUTE[routeIndex];
      const { state, action, next, reward, terminal } = transition;
      const old = q[state][action];
      const nextMax = terminal ? 0 : Math.max(...q[next]);
      const target = reward + GAMMA * nextMax;
      const value = old + ALPHA * (target - old);
      const updates = (episode - 1) * ROUTE.length + routeIndex;
      const common = { ...transition, episode, routeIndex, position: next, old, nextMax, target, value };
      frames.push({ ...common, phase: 'act', updates, q: copyQ(q) });
      frames.push({ ...common, phase: 'read', updates, q: copyQ(q) });
      q[state][action] = value;
      frames.push({ ...common, phase: 'write', updates: updates + 1, q: copyQ(q) });
    }
  }
  return frames;
}

export function initDemo(root) {
  const frames = buildFrames();
  const $ = selector => root.querySelector(selector);
  const $$ = selector => [...root.querySelectorAll(selector)];
  const back = $('[data-rl-back]');
  const next = $('[data-rl-next]');
  const play = $('[data-rl-play]');
  const speed = $('[data-rl-speed]');
  let cursor = 0;
  let timer = null;

  function stop() {
    if (timer !== null) clearInterval(timer);
    timer = null;
    play.textContent = cursor === frames.length - 1 ? '重新播放' : '自动播放';
    play.setAttribute('aria-pressed', 'false');
  }

  function render() {
    const f = frames[cursor];
    $('[data-rl-counter]').textContent = `${f.episode ? `第 ${f.episode} / 3 回合` : '初始化'} · ${f.updates} / 9 次更新`;
    $$('[data-rl-state]').forEach(el => {
      const active = el.dataset.rlState === f.position;
      el.classList.toggle('is-agent', active);
      el.setAttribute('aria-label', `${el.dataset.rlState}${active ? '，机器人当前位置' : ''}`);
    });
    $$('[data-rl-route]').forEach(el => el.classList.toggle('is-active', Number(el.dataset.rlRoute) === f.routeIndex));
    $$('[data-rl-phase]').forEach(el => {
      const active = el.dataset.rlPhase === f.phase;
      el.classList.toggle('is-current', active);
      if (active) el.setAttribute('aria-current', 'step');
      else el.removeAttribute('aria-current');
    });
    $$('[data-rl-row]').forEach(el => el.classList.toggle('is-read', !f.terminal && f.phase === 'read' && el.dataset.rlRow === f.next));
    $$('[data-rl-cell]').forEach(el => {
      const [state, action] = el.dataset.rlCell.split('-');
      el.textContent = format(f.q[state][Number(action)]);
      el.classList.toggle('is-write', f.phase === 'write' && state === f.state && Number(action) === f.action);
    });
    let heading, explanation, equation;
    if (f.phase === 'initial') {
      heading = '准备开始';
      explanation = '所有估计先设为 0。点击下一步，观察机器人行动与 Q 表写回的位置。';
      equation = '新值 = 旧值 + 0.5 ×（目标 − 旧值）';
    } else if (f.phase === 'act') {
      heading = `① 执行：${f.state} 向${f.actionName} → ${f.next}`;
      explanation = `${f.routeIndex === 0 && f.episode > 1 ? '新回合重新从 A 出发。' : ''}获得奖励 r = ${f.reward}。记录这条经验；此帧还没有修改 Q 表。`;
      equation = `(s, a, r, s′, d) = (${f.state}, ${f.actionName}, ${f.reward}, ${f.next}, ${Number(f.terminal)})`;
    } else if (f.phase === 'read') {
      heading = f.terminal ? '② 已终止：未来价值为 0' : `② 读取下一状态 ${f.next} 的一整行`;
      explanation = f.terminal
        ? 'G 是终点，不再读取下一行。此次目标只包含进入终点得到的奖励。'
        : `${f.next} 行最大 Q 值为 ${format(f.nextMax)}。用它构造目标，原来的 Q(${f.state}, ${f.actionName}) 仍是 ${format(f.old)}。`;
      equation = f.terminal ? `y = r = ${f.reward}` : `y = ${f.reward} + 0.9 × ${format(f.nextMax)} = ${format(f.target)}`;
    } else {
      heading = `③ 写回原格：Q(${f.state}, ${f.actionName})`;
      explanation = `机器人现在在 ${f.next}，但这次写回的是 ${f.state} 行的“${f.actionName}”列。${f.value === f.old ? '本次目标等于旧值，数值暂时不变。' : '其他单元格保持不变。'}${cursor === frames.length - 1 ? '三回合结束；这仍是学习中的估计。' : ''}`;
      equation = `y = ${format(f.target)}，TD 误差 δ = ${format(f.target - f.old)}\n${format(f.old)} + 0.5 × (${format(f.target)} − ${format(f.old)}) = ${format(f.value)}`;
    }
    $('[data-rl-heading]').textContent = heading;
    $('[data-rl-explanation]').textContent = explanation;
    $('[data-rl-equation]').textContent = equation;
    back.disabled = cursor === 0;
    next.disabled = cursor === frames.length - 1;
    if (timer === null) play.textContent = cursor === frames.length - 1 ? '重新播放' : '自动播放';
  }

  function start() {
    if (cursor === frames.length - 1) cursor = 0;
    render();
    play.textContent = '暂停';
    play.setAttribute('aria-pressed', 'true');
    timer = setInterval(() => {
      cursor++;
      render();
      if (cursor === frames.length - 1) stop();
    }, Number(speed.value));
  }

  back.addEventListener('click', () => { stop(); cursor = Math.max(0, cursor - 1); render(); });
  next.addEventListener('click', () => { stop(); cursor = Math.min(frames.length - 1, cursor + 1); render(); });
  $('[data-rl-reset]').addEventListener('click', () => { stop(); cursor = 0; render(); });
  play.addEventListener('click', () => { if (timer === null) start(); else stop(); });
  speed.addEventListener('change', () => { if (timer !== null) { stop(); start(); } });
  root.ownerDocument.addEventListener('visibilitychange', () => { if (root.ownerDocument.hidden) stop(); });
  root.ownerDocument.defaultView?.addEventListener('pagehide', stop);
  // There is no automatic playback on page load, including with reduced motion.
  render();
  $('.rl-demo-controls').hidden = false;
}

if (typeof document !== 'undefined') {
  document.querySelectorAll('[data-rl-demo]').forEach(initDemo);
  // Long formulas remain horizontally scrollable and keyboard accessible.
  document.querySelectorAll('.rl-formula').forEach(el => {
    el.tabIndex = 0;
    el.setAttribute('role', 'group');
    if (!el.hasAttribute('aria-label')) el.setAttribute('aria-label', '公式，可横向滚动');
  });
}
