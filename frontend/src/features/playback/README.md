# 播放控制（成员03）

**已实现**：播放 / 暂停 / 下一步 / 上一步（回看）/ 重置 / 调速，维护唯一播放指针 `stepIndex`，
并在每次状态变化时**恰好广播一次** `onStepChange`。

- 入口：`createPlayback({ runId, steps, intervalMs, onStepChange })`
  → `{ play, pause, next, prev, reset, seek, setSpeed, getState, getDiagnostics, destroy }`
- **订阅方式只有一种**：创建时传入 `onStepChange`（没有 `subscribe` 方法；本模块也不发全局事件）。
  创建时**不会**广播一次，见 `../visualization/C02-INTEGRATION.md` 的「初始分发」。
- 计时器纪律：任何时刻最多一个计时器；`getDiagnostics().activeTimers` 恒为 0 或 1
  （对应规格「快速换输入不出现两套计时器」）；到终点自动停；`destroy()` 后不再广播。
- 广播载荷：`{ runId, stepIndex, step, canPrev, canNext, playing, total, intervalMs }`
- 接入 02 的说明（含换 run / destroy 职责）：`../visualization/C02-INTEGRATION.md`

正式工作台已消费onStepChange并分发runId/stepIndex给代码面板、05和07；本模块仍只回调创建者，不发全局事件、不碰DOM。装配层通过subscribeStep提供当前上下文并负责销毁，见工作台README。

seek(index)接受0起始安全整数并校验范围，先停止原计时器，再移动唯一cursor并广播一次；使用原step快照，不重新运行算法。销毁后的调用不广播。

UI 步骤从 1 显示，接口 `stepIndex` 从 0 计数；不混淆两种序号。
