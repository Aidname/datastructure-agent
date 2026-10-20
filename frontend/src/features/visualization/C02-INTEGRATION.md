# 03 → 02 接入说明（数组动画 + 播放控制）

> 这份文档只写**怎么接**，不写业务背景。对应复审意见「建议提供明确的 02 接入文档」。
> 状态：模块已实现并通过 `npm run check` 与浏览器自测；**尚未**由 02 正式装配（C06 待真实消费者确认）。

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
    codePanel.setStep(step);            //   ← 这一步归 02
  }
});

// ⑤ 按钮只调这些方法，绝不自己算下一步
prevBtn.onclick = () => playback.prev();
nextBtn.onclick = () => playback.next();
playBtn.onclick = () => playback.getState().playing ? playback.pause() : playback.play();
resetBtn.onclick = () => { playback.reset(); viz.playEnterAnimation(); };
speedSelect.onchange = () => playback.setSpeed(Number(speedSelect.value));
```

## 4. 换 run / 销毁职责（必须照做，否则旧计时器会推进新上下文）

| 时机 | 谁负责 | 做什么 |
|---|---|---|
| 用户改了输入、重新创建 run | **02** | 先 `playback.destroy()` + `viz.destroy()`，再用新 run 重建两者 |
| 接口失败、清空运行 | **02** | `viz.showStep(null)` 进入明确空态（不抛错），并 `playback.destroy()` |
| 页面卸载 / 切换模式 | **02** | 两个 `destroy()` 都要调 |
| 暂停后提问（05） | 02 转发 | 用最近一次 `onStepChange` 的 `{runId, stepIndex}` 定位，不要让 05 自己猜 |

`destroy()` 之后：计时器清零、不再广播、DOM 与事件监听都移除（`getDiagnostics().activeTimers === 0`）。

## 5. 接口契约（与 main 一致，实测）

- 创建 run：`POST /api/algorithms/binary-search/runs`，body `{array, target}`；
  返回 `{runId, createdAt, algorithm, sourceVersion, sourceLines:[{lineId,text}], steps, result}`。
  **顶层没有 `array` / `target` / `label`**：数组与目标在**每个 step**里。
- 单步查询：`GET /api/runs/:runId/steps/:stepIndex` → `{runId, step}`。
- 每个 step 的字段与 `shared/schemas/step.schema.json` 一致（11 个必填）；
  事件名 `init / probe / move-left / move-right / found / not-found`。
- 错误码：`INVALID_INPUT/400`、`RUN_NOT_FOUND/404`、`STEP_OUT_OF_RANGE/400`。

## 6. 边界（03 不做的部分）

- 数组/目标输入、开始分析、加载与校验反馈 → **02**；
- 代码面板与 `left/right/mid` 变量面板（`null` 显示"未计算"）→ **02**；
- 把 `runId + stepIndex` 广播给 05/07 → **02**（03 只回调 `onStepChange`）；
- 步骤辅导真实回答 → **05**（`POST /api/agent/explain` 当前固定 503）；
- 练习题库/判分与本机记录 → **07**。

`frontend/src/features/visualization/dev.html` 与 `dev-morph.html` 是 03 的自测页，**不是**产品入口；里面的代码面板/练习/记录/辅导都是替身，不要当生产代码复用。
