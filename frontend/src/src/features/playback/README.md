# 播放控制（成员03）

**已实现**：播放 / 暂停 / 下一步 / 上一步（回看）/ 重置 / 调速，维护唯一播放指针 `stepIndex`，
并在每次状态变化时**恰好广播一次** `onStepChange`。

- 入口：`createPlayback({ runId, steps, intervalMs, onStepChange })`
  → `{ play, pause, next, prev, reset, setSpeed, getState, getDiagnostics, destroy }`
- **订阅方式只有一种**：创建时传入 `onStepChange`（没有 `subscribe` 方法；本模块也不发全局事件）。
  创建时**不会**广播一次，见 `../visualization/C02-INTEGRATION.md` 的「初始分发」。
- 计时器纪律：任何时刻最多一个计时器；`getDiagnostics().activeTimers` 恒为 0 或 1
  （对应规格「快速换输入不出现两套计时器」）；到终点自动停；`destroy()` 后不再广播。
- 广播载荷：`{ runId, stepIndex, step, canPrev, canNext, playing, total, intervalMs }`
- 接入 02 的说明（含换 run / destroy 职责）：`../visualization/C02-INTEGRATION.md`

尚未接入：`[02 unsupports]` 把 `runId + stepIndex` 分发给代码面板 / 05 / 07 的统一接口或事件总线
（C06 待 02 确认）；本模块只回调创建者，不发全局事件、不碰 DOM。

UI 步骤从 1 显示，接口 `stepIndex` 从 0 计数；不混淆两种序号。
