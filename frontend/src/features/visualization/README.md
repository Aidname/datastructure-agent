# 动画（成员03）

**已实现**：按共享 Step 快照绘制数组格子、下标、`L / R / M` 指针、当前搜索区间、被排除格子变淡、
命中/未找到结果，以及空数组、单元素、`mid=null`、空区间这些边界。整帧重渲染，所以回看是真恢复。

- 入口：`createVisualization(container, { run, legend, dots, explainContainer })`
  → `{ showStep, getStep, playEnterAnimation, destroy }`（`showStep(null)` 是明确的空态，不抛错）
- 样式：同目录 `visualization.css`（浅色默认 token `--viz-*`，宿主必须引）
- 正式入口：npm start后访问工作台。window.js/window.css/grid.js从03原dev-viz-window与dev-grid恢复，已接04真实run及唯一播放指针；原完整dev页面及Mock数据继续移除。
- 窗口支持两层网格、拖拽平移、滚轮缩放、Home取景、重播入场、拖动/调整窗口、最大化、复位及全屏/Esc退出。时间轴点击/左右/Home/End跳步、起止按钮和速度均委托createPlayback，不另算轨迹。
- 用createVizWindow(host,{run,speedMs,onSpeedChange,onSeek,onTransport})装配；返回setRun、setStep、fitView、replay、destroy。setStep(step,state)由宿主转发同一份播放状态，构造不会广播；无运行时禁用播放/跳步并显示空态。销毁清理全屏、窗口按键、ResizeObserver、动画帧及延迟取景。
- 样式在visualization.css和宿主workbench.css之后加载window.css。左右代码/辅导与中央视口同屏；手机转为纵向，长数组按视口中心适配，可继续平移缩放。
- 检查与真实截图见[窗口恢复验收](../../../../docs/architecture/visualization-window-check-20261023.md)。
- 接入 02 的说明：`C02-INTEGRATION.md`

正式工作台已接入04真实run、02代码变量、05辅导和07练习记录。回归使用tests/workbench.browser.mjs与tests/visualization-window.browser.mjs；生产窗口不依赖fixtures或独立开发页。08独立验收仍待完成。

约束：只消费 `steps`，不计算另一套算法；`mid=null` 不展示为 0；空数组不画假节点；回看恢复历史快照。
