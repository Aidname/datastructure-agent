# 动画（成员03）

**已实现**：按共享 Step 快照绘制数组格子、下标、`L / R / M` 指针、当前搜索区间、被排除格子变淡、
命中/未找到结果，以及空数组、单元素、`mid=null`、空区间这些边界。整帧重渲染，所以回看是真恢复。

- 入口：`createVisualization(container, { run, legend, dots, explainContainer })`
  → `{ showStep, getStep, playEnterAnimation, destroy }`（`showStep(null)` 是明确的空态，不抛错）
- 样式：同目录 `visualization.css`（浅色默认 token `--viz-*`，宿主必须引）
- 正式入口：npm start后访问工作台；原两套dev自测页与Mock数据已由正式入口替代并移除。
- 接入 02 的说明：`C02-INTEGRATION.md`

正式工作台已接入04真实run、02代码变量、05辅导和07练习记录。回归使用tests/workbench.browser.mjs；生产渲染器不依赖fixtures或独立开发页。08独立验收仍待完成。

约束：只消费 `steps`，不计算另一套算法；`mid=null` 不展示为 0；空数组不画假节点；回看恢复历史快照。
