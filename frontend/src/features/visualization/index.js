/**
 * 成员03 · 数组动画渲染（主责路径 frontend/src/features/visualization/）
 *
 * 职责：只消费一份真实/模拟的 step 快照，把数组、下标、L/R/M 指针、搜索区间、
 *       被排除格子、结束结果画出来，并给出转场动效。本模块【只读】step，不计算任何算法结果。
 * 契约：docs/architecture/trace-contract.md + shared/schemas/step.schema.json（Step v1）
 *
 * 设计纪律（规格"回看要恢复历史快照"的根本保证）：
 *   每一步都整帧重画 —— 每帧的 DOM 完全由传入的 step 决定，不缓存"上一轮的 mid/区间"。
 *   因此 mid=null 不会有旧 M 残留，从第 3 步回看第 2 步也不需要任何回滚逻辑。
 *
 * 动效怎么做的（为什么不用 CSS transition）：
 *   整帧重画会销毁并重建节点，节点上的 transition 不会在两个步骤之间补间。
 *   所以这里用两种手段，且**都不改变上面那条纪律**：
 *     1) keyframes：新节点按"本帧角色"重放动画（入场错峰、变淡、回位、中点脉冲、命中弹跳）；
 *     2) 指针 FLIP：重建前量旧位置，重建后量新位置，用 Web Animations 从老位置滑到新位置，
 *        于是 L/R/M 能真正"跨格移动"。FLIP 只读布局、只加一层临时动画，不改结构也不改状态。
 *   previous 快照**只用于判断"这一格本帧要不要补动画"**，渲染结果永远只由当前 step 决定。
 *   全部动效都是渐进增强：缺少 getBoundingClientRect / animate / matchMedia 时自动跳过，
 *   渲染结果不变（Node 下的自检环境就是这种情况）。
 *
 * 当前由正式工作台注入04真实run/steps；装配层负责初始步骤分发、上下文同步及换run销毁。
 * createPlayback仅回调创建者；工作台通过subscribeStep转发给05/07。
 * 接入方式见本模块README及visualization/C02-INTEGRATION.md。
 */

/** 事件名 → 给学生看的展示文本（move-left 表示"更新左边界"，不是箭头方向）。 */
const EVENT_TEXT = {
  init: '初始化',
  probe: '计算并比较中点',
  'move-left': '更新左边界',
  'move-right': '更新右边界',
  found: '找到',
  'not-found': '未找到'
};

/** 入场错峰的档位数量：第 i 个格子用第 (i % 8) 档，CSS 里给出 0/45/…/315ms 的延迟。 */
const ENTER_STAGGER_SLOTS = 8;

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** 是否要求"减少动态效果"（无障碍）。缺少 matchMedia 时按 false 处理。 */
function prefersReducedMotion() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches === true;
  } catch {
    return false;
  }
}

/**
 * 把一步快照翻译成一行说明文本。
 * 空数组 / 空区间 / mid=null 分别有明确措辞，不冒充"已计算"。
 */
export function describeStep(step) {
  if (!step) return '无步骤数据';
  const { array = [], target, variables = {}, event, done, result } = step;
  const { left, right, mid } = variables;
  const parts = [`第 ${step.stepIndex + 1} 步：${EVENT_TEXT[event] ?? event}`];

  if (array.length === 0) {
    // 空数组必须能看出 left=0 / right=-1（契约规定），但一个格子都不画。
    parts.push(`空数组（left=${left}，right=${right}）：不访问任何元素`);
  } else if (left > right) {
    parts.push(`空区间（left=${left} > right=${right}）：不再访问数组`);
  } else {
    parts.push(`当前区间 ${left}～${right}`);
  }

  parts.push(mid === null || mid === undefined ? 'mid 未计算' : `mid=${mid}，A[mid]=${array[mid]}`);

  if (done) {
    parts.push(typeof result === 'number' && result >= 0 ? `找到目标 ${target}，下标 ${result}` : `未找到目标 ${target}`);
  }
  return parts.join(' ｜ ');
}

/**
 * 转场说明：这一步"发生了什么变化"。只读当前 step 就能说清楚，不依赖上一帧。
 * 供演示页显示，02 的代码/变量面板也可以复用同一份文案。
 */
export function describeTransition(previous, current) {
  if (!current) return '';
  const { array = [], target, variables = {}, event, result } = current;
  const { left, right, mid } = variables;
  const last = array.length - 1;

  if (!previous) return `初始化：left=${left}，right=${right}`;

  switch (event) {
    case 'init':
      return `初始化：设置初始搜索范围 left=0，right=${last}`;
    case 'probe':
      return `比较中点：mid=${mid}，A[mid]=${array[mid]}，与目标 ${target} 比较`;
    case 'move-left':
      return `左边界更新为 ${left}：下标 0～${left - 1} 被排除，区间收窄为 ${left}～${right}`;
    case 'move-right':
      return `右边界更新为 ${right}：下标 ${right + 1}～${last} 被排除，区间收窄为 ${left}～${right}`;
    case 'found':
      return `命中：目标 ${target} 在下标 ${result}`;
    case 'not-found':
      return `结束：区间已空，未找到目标 ${target}`;
    default:
      return '';
  }
}

/**
 * 按一步快照生成整帧：格子节点 + 指针节点表。
 * 只读 step；previous 仅用于决定"本帧给哪些格子补转场动画"。
 * @returns {{cells: HTMLElement[], pointers: Map<string, HTMLElement>}}
 */
function buildFrame(step, { previous = null, enter = false } = {}) {
  // 空态（没有 run / 清空运行 / 请求失败后恢复空态）：一个格子都不画，也不碰任何变量。
  // 02 在"加载前、换输入清空、失败回退"这三种时机都会用 showStep(null)，这里必须安全。
  if (!step) return { cells: [], pointers: new Map() };

  const { array = [], variables = {}, event, result } = step;
  const { left, right, mid } = variables;
  const pointers = new Map();

  if (array.length === 0) {
    return { cells: [el('div', 'bsviz-empty', '空数组（没有格子，不访问任何元素）')], pointers };
  }

  const rangeValid = left <= right;
  const prev = previous?.variables ?? null;
  // 上一帧里这些指针是否已经存在 —— 决定本帧要不要播"出现"动效。
  // 关键：指针节点每步都会重建，若无条件播出现动效，L/R/M 就会每一步都闪一次。
  // 所以只有"逻辑上原本不存在"的指针才播出现：首帧、或 mid 由 null 变为有值。
  const prevHasBounds = prev !== null && prev.left <= prev.right;
  const prevHasMid = prev !== null && prev.mid !== null && prev.mid !== undefined;
  const prevMid = prevHasMid ? prev.mid : null;
  const midIsNew = mid !== null && mid !== undefined && mid !== prevMid;

  const cells = array.map((value, index) => {
    const cell = el('div', 'bsviz-cell');
    const excluded = index < left || index > right;
    cell.classList.add(excluded ? 'is-excluded' : 'is-in-range');
    if (rangeValid) {
      if (index === left) cell.classList.add('is-range-start');
      if (index === right) cell.classList.add('is-range-end');
    }
    const isMid = mid !== null && mid !== undefined && index === mid;
    if (isMid) cell.classList.add('is-mid');
    const isFound = event === 'found' && result === index;
    if (isFound) cell.classList.add('is-found');

    // ---------- 动效（纯增强层：只加动画类，不改上面的状态类） ----------
    // 注意：一个元素同时只能生效一条 animation 简写，所以这里刻意让各类互斥：
    //   变淡/复原（互斥）· 区间端点（必在区间内，与变淡互斥）· 命中；
    //   中点脉冲改挂在 M 标签上（见下方 midIsNew），避免与变淡/复原抢 animation。
    if (enter) {
      cell.classList.add(`bsviz-enter-${index % ENTER_STAGGER_SLOTS}`);
    } else if (prev) {
      const wasExcluded = index < prev.left || index > prev.right;
      if (excluded && !wasExcluded) cell.classList.add('bsviz-anim-dim');      // 本帧被排除 → 变淡收缩
      if (!excluded && wasExcluded) cell.classList.add('bsviz-anim-restore');  // 本帧回到区间 → 复原
      if (rangeValid && index === left && left !== prev.left) cell.classList.add('bsviz-anim-range');
      if (rangeValid && index === right && right !== prev.right) cell.classList.add('bsviz-anim-range');
    }
    if (isFound) cell.classList.add('bsviz-anim-found');                       // 命中 → 弹跳高亮
    // ------------------------------------------------------------------

    const pointerRows = el('div', 'bsviz-ptrs');
    const boundsRow = el('div', 'bsviz-ptr-row');
    // 只有在上一帧还没有左右边界（首帧）时，L/R 才播"出现"动效；其余情况只靠 FLIP 滑动。
    const boundsAppear = prevHasBounds ? '' : ' bsviz-ptr-appear';
    if (rangeValid && index === left) {
      const label = el('span', `bsviz-ptr bsviz-ptr-left${boundsAppear}`, 'L');
      label.setAttribute('data-ptr', 'left');
      boundsRow.append(label);
      pointers.set('left', label);
    }
    if (rangeValid && index === right) {
      const label = el('span', `bsviz-ptr bsviz-ptr-right${boundsAppear}`, 'R');
      label.setAttribute('data-ptr', 'right');
      boundsRow.append(label);
      pointers.set('right', label);
    }
    const midRow = el('div', 'bsviz-ptr-row');
    if (isMid) {
      const extraClasses = [];
      // M 之前是 null（或首帧）才算"重新出现"，播出现动效
      if (!prevHasMid) extraClasses.push('bsviz-ptr-appear');
      // 新算出的中点：追加脉冲（与出现动效合并成一条 animation 列表，见 CSS）
      if (midIsNew && !enter) extraClasses.push('is-new-mid');
      const label = el('span', `bsviz-ptr bsviz-ptr-mid${extraClasses.length ? ' ' + extraClasses.join(' ') : ''}`, 'M');
      label.setAttribute('data-ptr', 'mid');
      midRow.append(label);
      pointers.set('mid', label);
    }
    // 两行始终存在，保证格子高度稳定、步骤切换时不抖动。
    pointerRows.append(boundsRow, midRow);

    cell.append(pointerRows, el('div', 'bsviz-value', String(value)), el('div', 'bsviz-idx', String(index)));
    return cell;
  });

  return { cells, pointers };
}

/** 兼容入口：只要格子节点（自检脚本与外部只读场景用）。 */
export function buildCells(step) {
  return buildFrame(step, {}).cells;
}

/** 量取指针当前屏幕位置，供 FLIP 用；没有真实布局接口时返回空表。 */
function measurePointers(pointers) {
  const out = new Map();
  if (!pointers) return out;
  for (const [key, node] of pointers) {
    if (typeof node.getBoundingClientRect !== 'function') continue;
    const rect = node.getBoundingClientRect();
    out.set(key, { left: rect.left, top: rect.top });
  }
  return out;
}

/**
 * 指针 FLIP：从"上一帧的位置"滑到"这一帧的位置"。
 * 只做一次临时动画，不写内联样式、不改状态、不改结构。
 */
function flipPointers(before, after, reduced) {
  if (reduced || !before || before.size === 0) return;
  for (const [key, node] of after) {
    const from = before.get(key);
    if (!from) continue;
    if (typeof node.getBoundingClientRect !== 'function' || typeof node.animate !== 'function') continue;
    const to = node.getBoundingClientRect();
    const dx = from.left - to.left;
    const dy = from.top - to.top;
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) continue; // 位置没变就不动
    node.animate(
      [{ transform: `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px)` }, { transform: 'translate(0, 0)' }],
      { duration: 300, easing: 'cubic-bezier(.22,.68,.32,1)' }
    );
  }
}

/** 图例：解释 L / R / M 与区间、已排除的含义（颜色只是辅助，图上都有文字）。 */
function buildLegend() {
  const box = el('div', 'bsviz-legend');
  const items = [
    ['bsviz-legend-item is-l', 'L = left（左边界）'],
    ['bsviz-legend-item is-r', 'R = right（右边界）'],
    ['bsviz-legend-item is-m', 'M = mid（中点）'],
    ['bsviz-legend-item is-range-chip', '当前搜索区间'],
    ['bsviz-legend-item is-dim-chip', '已排除（变淡）']
  ];
  for (const [className, text] of items) box.append(el('span', className, text));
  return box;
}

/**
 * 创建动画渲染器。
 * @param {HTMLElement} container 挂载容器（正式工作台为 #visualization-panel）
 * @param {object} [options]
 * @param {object} [options.run] 提供 array/target/steps 等上下文
 * @param {boolean} [options.legend=false] 是否在视口里画内联图例。
 *   默认 false：dev 页把图例作为"场景集合"放在右栏（Blender 大纲式），
 *   视口里只留数组本身。
 * @param {boolean} [options.dots=false] 是否在视口里画步骤圆点条。
 *   默认 false：dev 页底部已有真正的 Blender 式时间轴（刻度+播放头），
 *   视口里再画一排圆点既重复又占地方。
 * @param {HTMLElement} [options.explainContainer] 把"本步解释"面板挂到这个元素里。
 *   默认挂在模块自己的根节点内。dev 页把它挂到视口右上角的浮层容器：
 *   因为视口的平移/缩放层带 transform，会变成绝对定位后代的包含块，
 *   所以解释面板必须挂在被变换的图层【外面】才能钉在角落里不动。
 * @returns {{showStep: Function, getStep: Function, playEnterAnimation: Function, destroy: Function}}
 */
export function createVisualization(container, {
  run,
  legend: withLegend = false,
  dots: withDots = false,
  explainContainer = null
} = {}) {
  // [02 unsupports] container 由 02 的装配层提供（正式页面是 02 的 #visualization-panel）；
  // 03 只往里渲染，不创建、不移动、不删除宿主的容器。
  if (!container) throw new Error('createVisualization 需要一个容器元素');

  const root = el('div', 'bsviz');
  const track = el('div', 'bsviz-track');
  const caption = el('p', 'bsviz-caption');
  const status = el('p', 'bsviz-status');
  status.setAttribute('role', 'status');

  // 原来视口里"上一条转场说明 + 下一条状态行"两条解释，合并成一个可收起的解释面板。
  // 面板自带收展控件，宿主只负责决定它挂在哪（dev 页挂在视口右上角的浮层里）。
  const explain = el('div', 'bsviz-explain');
  const explainHead = el('div', 'bsviz-explain-head');
  explainHead.append(el('span', 'bsviz-explain-title', '本步解释'));
  const explainToggle = el('button', 'bsviz-explain-toggle', '收起');
  explainToggle.setAttribute('type', 'button');
  explainToggle.setAttribute('aria-expanded', 'true');
  explainHead.append(explainToggle);
  explain.append(explainHead, caption, status);
  explain.dataset.collapsed = 'false';
  explainToggle.addEventListener('click', () => {
    const collapsed = explain.dataset.collapsed === 'true';
    explain.dataset.collapsed = collapsed ? 'false' : 'true';
    explainToggle.textContent = collapsed ? '收起' : '展开';
    explainToggle.setAttribute('aria-expanded', String(collapsed));
  });

  const steps = Array.isArray(run?.steps) ? run.steps : [];
  const dots = withDots
    ? steps.map((step, index) => {
      const dot = el('span', 'bsviz-dot', String(index + 1));
      dot.setAttribute('title', `第 ${index + 1} 步：${EVENT_TEXT[step.event] ?? step.event}`);
      return dot;
    })
    : [];

  if (withLegend) root.append(buildLegend());
  root.append(track);
  if (dots.length > 0) {
    const timeline = el('div', 'bsviz-timeline');
    timeline.append(...dots);
    root.append(timeline);
  }
  (explainContainer ?? root).append(explain);
  if (run && run.mock) root.dataset.mock = 'true';
  container.append(root);

  let currentStep = null;
  let previousStep = null;      // 只用于判断这一帧给谁补动画，不参与渲染结果
  let previousPointers = null;
  let hasRendered = false;

  function updateTimeline(step) {
    const current = step ? step.stepIndex : -1;
    dots.forEach((dot, index) => {
      dot.classList.remove('is-done', 'is-current', 'is-upcoming');
      dot.classList.add(index < current ? 'is-done' : index === current ? 'is-current' : 'is-upcoming');
    });
  }

  /** 转场说明用 Web Animations 重放：节点不重建，靠 animate() 每次都能重新触发。 */
  function animateCaption(kind, reduced) {
    if (reduced || typeof caption.animate !== 'function') return;
    const frames = kind === 'found'
      ? [{ transform: 'scale(.94)', opacity: 0.4 }, { transform: 'scale(1)', opacity: 1 }]
      : [{ transform: 'translateY(5px)', opacity: 0.25 }, { transform: 'translateY(0)', opacity: 1 }];
    caption.animate(frames, { duration: kind === 'found' ? 420 : 280, easing: 'cubic-bezier(.22,.68,.32,1)' });
  }

  // 整帧重画：先清空，再按当前 step 重建。这是回看/空值不残留的关键。
  // step 为 null 时进入明确空态：格子清空、指针清空、说明与时间轴都回到"无步骤"。
  function render(step, { enter = false } = {}) {
    const reduced = prefersReducedMotion();
    const before = enter ? null : measurePointers(previousPointers);
    const frame = buildFrame(step, { previous: previousStep, enter });

    track.replaceChildren(...frame.cells);
    track.dataset.anim = !step ? 'none' : step.array && step.array.length === 0 ? 'empty' : step.event;
    caption.textContent = describeTransition(previousStep, step);
    caption.dataset.kind = track.dataset.anim;   // 供 CSS 区分命中/未找到/空数组的配色
    status.textContent = describeStep(step);
    updateTimeline(step);

    flipPointers(before, frame.pointers, reduced);
    animateCaption(step ? step.event : 'none', reduced);

    previousStep = step ?? null;
    previousPointers = frame.pointers;
    root.dataset.empty = step ? 'false' : 'true';
  }

  function showStep(step) {
    currentStep = step ?? null;
    render(currentStep, { enter: !hasRendered });
    hasRendered = true;
  }

  /** 重放入场动效（演示/重置用）：不动指针位置，只重放错峰入场。 */
  function playEnterAnimation() {
    render(currentStep, { enter: true });
  }

  function destroy() {
    explain.remove();   // 解释面板可能挂在宿主给的容器里，必须单独移除
    root.remove();
    currentStep = null;
    previousStep = null;
    previousPointers = null;
  }

  // 提供 run.steps 时自动画第 1 步（对应规格流程"点击开始，看到第1步，不直接跳到最终答案"）。
  // 不提供 steps 时保持空白，由调用方显式 showStep。
  if (steps.length > 0) showStep(steps[0]);
  else updateTimeline(null);

  return {
    showStep,
    getStep: () => currentStep,
    playEnterAnimation,
    destroy
  };
}
