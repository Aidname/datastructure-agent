# 03 → 02 接入说明（数组动画 + 播放控制）

> 这份文档只写**怎么接**，不写业务背景。对应复审意见「建议提供明确的 02 接入文档」。
> 状态：模块已实现并通过 `npm run check` 与浏览器自测；已由01按用户授权代02在本分支正式装配并做本地浏览器联调；08独立验收待完成。

## 1. 要引的两个文件

```html
<!-- 动画的样式（必须引，否则格子/指针没有尺寸与配色） -->
<link rel="stylesheet" href="/src/features/visualization/visualization.css">
```

```js
// 两个模块都是 ES module，只在 http 下可用（file:// 会被 CORS 拦）
import { createVisualization, describeStep, describeTransition } from '/src/features/visualization/index.js';
import { createPlayback } from '/src/features/playback/index.js';
```

## 2. 挂载点（02 提供）

```html
<!-- 02 的页面里给 03 预留这两个容器即可，03 不创建、不移动、不删除它们 -->
<div id="visualization-panel"></div>   <!-- 数组动画 -->
<div id="viz-explain"></div>           <!-- 可选：本步解释浮层挂这里；不传则内嵌在动画下方 -->
```

## 3. 最小装配代码

> ⚠️ 顺序很重要：`createPlayback` / `createVisualization` **构造时都不会广播**，
> 所以装配完必须**自己显式分发第 0 步**（见 §4），不能等第一次 `onStepChange`。

```js
// ① 渲染器：只读 run.steps，不计算任何算法结果
const viz = createVisualization(document.querySelector('#visualization-panel'), {
  run,                                  // 04 返回的完整 run（含 runId / sourceVersion / sourceLines / steps / result）
  legend: true,                         // 是否显示图例
  dots: true,                           // 是否显示步骤时间轴圆点
  explainContainer: document.querySelector('#viz-explain')  // 可选
});

// ② 播放控制：唯一播放指针 + 计时器纪律
const playback = createPlayback({
  runId: run.runId,                     // 广播里带上，订阅方据此隔离旧 run
  steps: run.steps,
  intervalMs: 1000,                     // 规格「1 秒/步」
  onStepChange: ({ runId, stepIndex, step, canPrev, canNext, playing, total }) => {
    viz.showStep(step);                 // ③ 动画跟着走（传 null 会进入明确空态）
    // ④ 在这里把 runId + stepIndex 分发给你自己的代码面板、05、07
    codePanel.setStep(step, { runId, stepIndex, total });  //   ← 这一步归 02
  }
});

// ⑤ 按钮只调这些方法，绝不自己算下一步
prevBtn.onclick = () => playback.prev();
nextBtn.onclick = () => playback.next();
playBtn.onclick = () => playback.getState().playing ? playback.pause() : playback.play();
resetBtn.onclick = () => { playback.reset(); viz.playEnterAnimation(); };
speedSelect.onchange = () => playback.setSpeed(Number(speedSelect.value));
```

## 4. 初始分发（第 0 步必须由 02 主动发一次）

`createPlayback` 只在**状态变化**时广播；构造、`createVisualization` 装配都**不会**触发
`onStepChange`。所以只订阅回调的话，代码面板 / 05 / 07 在用户点第一下之前拿不到任何上下文，
05 也就无法在"第 1 步就能提问"这个场景下定位。

装配完成后请**显式**分发一次初始快照（`runId` + `stepIndex: 0` + `run.steps[0]`）：

```js
const first = run.steps[0] ?? null;

// ① 动画
viz.showStep(first);

// ② 02 自己的代码/变量面板
codePanel.setStep(first, { runId: run.runId, stepIndex: 0, total: run.steps.length });

// ③ 05 的上下文：给 runId + stepIndex + 这一步快照，不要让它去猜"最近一次回调"
agent.setContext({ runId: run.runId, stepIndex: 0, step: first });

// ④ 07 的练习上下文同理
exercises.setContext({ runId: run.runId, stepIndex: 0, step: first });
```

要点：

- **初始提问不能只依赖"最近一次 onStepChange"**：用户完全可能在点播放之前就问；
- 05 需要用 `runId + stepIndex` 去服务端取真实步骤（`GET /api/runs/:runId/steps/:stepIndex`），
  而不是只靠客户端缓存；
- 换 run 时重复本节的初始化（先 `destroy()` 旧的 `viz` / `playback`），保证新上下文从第 0 步开始。

## 4. 换 run / 销毁职责（必须照做，否则旧计时器会推进新上下文）

| 时机 | 谁负责 | 做什么 |
|---|---|---|
| 用户改了输入、重新创建 run | **02** | 先 `playback.destroy()` + `viz.destroy()`，再用新 run 重建两者 |
| 接口失败、清空运行 | **02** | `viz.showStep(null)` 进入明确空态（不抛错），并 `playback.destroy()` |
| 页面卸载 / 切换模式 | **02** | 两个 `destroy()` 都要调 |
| 暂停后提问（05） | 02 转发 | 用 `runId + stepIndex`（初始为 §4 的那次显式分发，之后来自 `onStepChange`）定位；不要让 05 依赖"最近一次回调" |

`destroy()` 之后：计时器清零、不再广播、DOM 与事件监听都移除（`getDiagnostics().activeTimers === 0`）。

## 5. 接口契约（与 main 一致，实测）

- 创建 run：`POST /api/algorithms/binary-search/runs`，body `{array, target}`；
  返回 `{runId, createdAt, algorithm, sourceVersion, sourceLines:[{lineId,text}], steps, result}`。
  **顶层没有 `array` / `target` / `label`**：数组与目标在**每个 step**里。
- 单步查询：`GET /api/runs/:runId/steps/:stepIndex` → `{runId, step}`。
- 每个 step 的字段与 `shared/schemas/step.schema.json` 一致（11 个必填）；
  事件名 `init / probe / move-left / move-right / found / not-found`。
- 错误码：`INVALID_INPUT/400`、`RUN_NOT_FOUND/404`、`STEP_OUT_OF_RANGE/400`。

> 契约以 main 上的实际返回为准（本文档只记录实测到的事实：接口已实现、字段如上）。
> 跨成员确认状态：C06已由本分支02装配层消费03原有接口并完成初始同步/销毁检查；具体广播与07接入边界见[工作台说明](../workbench/README.md)。

## 6. 边界（03 不做的部分）

- 数组/目标输入、开始分析、加载与校验反馈 → **02**；
- 代码面板与 `left/right/mid` 变量面板（`null` 显示"未计算"）→ **02**；
- 把 `runId + stepIndex` 广播给 05/07（含 §4 的初始分发）→ **02**（03 只回调 `onStepChange`）；
- 步骤辅导真实回答与引用链 → **05**（已合并模型适配与问题检索，本分支共享panel消费当前上下文；无Key且未开Mock时503）；
- 练习题库/判分与本机记录 → **07**。

原完整dev自测页、替身面板和Mock fixtures已清理；03可复用的窗口、网格与样式随后按用户要求恢复为window.js/window.css/grid.js，并装配到正式工作台。窗口只消费真实run，时间轴通过createPlayback.seek转发同一指针；其余输入、源码、聊天和练习继续复用正式模块。使用tests/workbench.browser.mjs及tests/visualization-window.browser.mjs验证；设计原型仍独立保留于docs/prototype。
