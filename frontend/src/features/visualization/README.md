# 动画（成员03）

**已实现**：按共享 Step 快照绘制数组格子、下标、`L / R / M` 指针、当前搜索区间、被排除格子变淡、
命中/未找到结果，以及空数组、单元素、`mid=null`、空区间这些边界。整帧重渲染，所以回看是真恢复。

- 入口：`createVisualization(container, { run, legend, dots, explainContainer })`
  → `{ showStep, getStep, playEnterAnimation, destroy }`（`showStep(null)` 是明确的空态，不抛错）
- 样式：同目录 `visualization.css`（浅色默认 token `--viz-*`，宿主必须引）
- 正式入口：npm start后访问工作台。window.js/window.css从03原dev-viz-window恢复并按用户确认布局调整，已接04真实run及唯一播放指针；原完整dev页面及Mock数据继续移除。
- 窗口采用白底无网格，支持拖拽平移、滚轮缩放、Home取景、重播入场、拖动/调整窗口；标题栏仅保留一个全屏按钮，进入后改为退出全屏，也支持Esc退出。播放栏右侧同排时间轴，刻度标签按宽度/步数自适应；点击/左右/Home/End跳步及起止按钮均委托createPlayback。界面移除速度选择，默认1秒/步，不另算轨迹。
- 用createVizWindow(host,{run,onSeek,onTransport})装配；返回setRun、setStep、fitView、replay、destroy。setStep(step,state)由宿主转发同一份播放状态，构造不会广播；无运行时禁用播放/跳步并显示空态。销毁清理全屏、窗口按键、ResizeObserver、动画帧及延迟取景。
- 先加载visualization.css/window.css，再加载宿主workbench.css。左代码右视口，辅导在右下悬浮窗口；手机转为纵向，长数组按视口中心适配，可继续平移缩放。
- 检查与真实截图见[当前布局验收](../../../../docs/architecture/workbench-layout-check-20261023.md)。
- 接入 02 的说明：`C02-INTEGRATION.md`

正式工作台已接入04真实run、02代码变量、05辅导和07练习记录。回归使用tests/workbench.browser.mjs与tests/visualization-window.browser.mjs；生产窗口不依赖fixtures或独立开发页。08独立验收仍待完成。

约束：只消费 `steps`，不计算另一套算法；`mid=null` 不展示为 0；空数组不画假节点；回看恢复历史快照。
