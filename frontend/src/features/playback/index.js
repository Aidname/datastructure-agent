/**
 * 成员03 · 播放控制（主责路径 frontend/src/features/playback/）
 *
 * 职责：维护【唯一播放指针 stepIndex】，实现播放/暂停/下一步/上一步/重置/调速，
 *       并把当前步骤广播出去。本模块不含任何 DOM，也不计算算法轨迹。
 *
 * 规格对应（plan-a-output-spec.md「按钮行为」）：
 *   播放   按所选速度推进，结束自动停止
 *   暂停   停在当前 stepIndex（供 05 提问定位）
 *   下一步 前进一个真实步骤，结束时禁用
 *   上一步 恢复上一个快照，初始化时禁用（只移动指针，不重算）
 *   重置   回到初始化并停止计时器
 *   速度   只改播放间隔，不改变算法轨迹
 *
 * 计时器纪律（规格"快速换输入不出现两套计时器"）：
 *   1) 任何时候最多一个计时器 handle，保存在闭包里；
 *   2) play / reset / next / prev / setSpeed / destroy 都先清掉残留计时器；
 *   3) 播放中改速度会重建计时器，避免旧间隔继续触发；
 *   4) 每次状态变化【恰好广播一次】，不在渲染里顺手再广播；
 *   5) getDiagnostics().activeTimers 恒为 0 或 1，可直接作为"没有两套计时器"的证据。
 *
 * ================= [before it happens] 尚未接入的依赖 =================
 * [before it happens] C06 广播接口：onStepChange 的载荷形状（{runId, stepIndex, step,
 *   canPrev, canNext, playing, total, intervalMs}）与订阅方式是 03 的提案，待 02 确认。
 *   这个广播口同时被 05（提问要定位到具体 step）和 07（练习上下文）消费，
 *   02/03 定完必须同步 05/07，否则 19 日集成才发现签名不兼容。
 *   docs/architecture/contract-alignment.md C06。
 * [before it happens] 真实步骤：现在注入的是 fixtures 里的模拟 steps；17 日换成 04 真实轨迹时
 *   只替换注入点（steps 与 runId），本模块逻辑不变。
 * [before it happens] 挂载与销毁：02 换输入时必须调用 destroy()（或丢弃实例并新建），
 *   否则旧 run 的计时器会继续推进新上下文。
 * [before it happens] 暂停后提问（05）、播放结束的练习联动（07）尚未接入。
 *
 * ================= [02 unsupports] 02 尚未提供的接口 =================
 * [02 unsupports] 广播通道：02 还没有"把 runId + stepIndex 发给代码面板 / 05 / 07"的统一接口或事件总线
 *   （C06 在 contract-alignment.md 里仍写着"待提案与联调，不单方规定函数或事件总线"）。
 *   所以本模块**只**回调创建者给的 onStepChange；不给 02 之外的人发事件、不读全局状态、不碰 DOM。
 *   → 02 的装配层需要自己把这份载荷转发给代码面板/05/07（转发方式待 02 定）。
 * [02 unsupports] 换 run 时的清理：本模块不感知 runId 变化，也不能自己判断"旧 run 的实例"。
 *   → 02 在换输入后必须对旧实例调用 destroy()（或直接丢弃），否则旧计时器会推进新上下文。
 * [02 unsupports] 挂载点与控件位置：开始/暂停/单步/重置/速度这些按钮的**位置与外观**属 02 的页面壳；
 *   03 只提供上面那些方法与状态，开发页里的传输条只是自测替身。
 * =====================================================================
 */

/**
 * 创建播放控制器。
 * @param {object} options
 * @param {string} [options.runId] 当前 run 标识；广播时带上，供订阅方做旧 run 隔离
 * @param {object[]} [options.steps] 真实/模拟步骤数组，本模块只读不改
 * @param {number} [options.intervalMs] 播放间隔，默认 1000 毫秒（规格"1秒/步"）
 * @param {(event: object) => void} [options.onStepChange] 步骤变化订阅者
 */
export function createPlayback({ runId = 'unknown-run', steps = [], intervalMs = 1000, onStepChange = null } = {}) {
  if (!Array.isArray(steps)) throw new Error('createPlayback 需要 steps 数组');
  if (!Number.isFinite(intervalMs) || intervalMs <= 0) throw new Error('intervalMs 必须是正数');

  const lastIndex = steps.length - 1;
  let cursor = steps.length > 0 ? 0 : -1;
  let playing = false;
  let timer = null;
  let currentInterval = intervalMs;
  let listener = onStepChange;
  let destroyed = false;
  const diagnostics = { timerStarts: 0, timerStops: 0, ticks: 0 };

  function getState() {
    return {
      runId,
      stepIndex: cursor,
      canPrev: cursor > 0,
      canNext: cursor >= 0 && cursor < lastIndex,
      playing,
      total: steps.length,
      intervalMs: currentInterval
    };
  }

  /** 唯一的清表入口：保证不会留下第二个计时器。 */
  function stopTimer() {
    if (timer !== null) {
      clearInterval(timer);
      timer = null;
      diagnostics.timerStops += 1;
    }
    playing = false;
  }

  function broadcast() {
    if (!listener) return;
    try {
      listener({ ...getState(), step: steps[cursor] ?? null });
    } catch (error) {
      // 订阅者出错不能把播放器带崩；如实打到控制台，不静默吞掉。
      console.error('[playback] onStepChange 订阅者抛出异常：', error);
    }
  }

  function startTimer() {
    timer = setInterval(tick, currentInterval);
    diagnostics.timerStarts += 1;
  }

  /** 每个间隔推进恰好一步；到末步清表并广播一次（广播与停止在同一次 tick 内完成）。 */
  function tick() {
    diagnostics.ticks += 1;
    if (cursor < lastIndex) cursor += 1;
    if (cursor >= lastIndex) stopTimer(); // 结束自动停止
    broadcast();                          // 每次变化恰好广播一次
  }

  function play() {
    if (destroyed) return getState();
    if (steps.length === 0 || cursor >= lastIndex) {
      // 已经在末尾：不启动一个永远不会推进的空计时器，只如实广播当前状态。
      broadcast();
      return getState();
    }
    stopTimer();   // 幂等：先清掉任何残留计时器，杜绝两套计时器
    playing = true;
    startTimer();
    broadcast();
    return getState();
  }

  function pause() {
    if (destroyed) return getState();
    const wasActive = playing || timer !== null;
    stopTimer();
    if (wasActive) broadcast();
    return getState();
  }

  function next() {
    if (destroyed || cursor >= lastIndex) return getState();
    stopTimer();       // 单步意图：先停播放，避免与计时器抢指针
    cursor += 1;
    broadcast();
    return getState();
  }

  function prev() {
    if (destroyed || cursor <= 0) return getState();
    stopTimer();
    cursor -= 1;       // 只移动指针，绝不重新计算轨迹
    broadcast();
    return getState();
  }

  function reset() {
    if (destroyed) return getState();
    stopTimer();
    cursor = steps.length > 0 ? 0 : -1;
    broadcast();
    return getState();
  }

  function setSpeed(ms) {
    if (destroyed) return getState();
    if (!Number.isFinite(ms) || ms <= 0) throw new Error('速度必须是正数毫秒');
    currentInterval = ms;
    if (playing) {
      stopTimer();
      playing = true;    // 保持播放状态
      startTimer();      // 重建计时器，旧间隔立即失效
    }
    broadcast();
    return getState();
  }

  /** 只读诊断：activeTimers 必须始终是 0 或 1，用于证明没有两套计时器。 */
  function getDiagnostics() {
    return { ...diagnostics, activeTimers: diagnostics.timerStarts - diagnostics.timerStops, total: steps.length };
  }

  function destroy() {
    stopTimer();
    listener = null;
    destroyed = true;
  }

  return { play, pause, next, prev, reset, setSpeed, getState, getDiagnostics, destroy };
}
