# 动画（成员03）

**已实现**：按共享 Step 快照绘制数组格子、下标、`L / R / M` 指针、当前搜索区间、被排除格子变淡、
命中/未找到结果，以及空数组、单元素、`mid=null`、空区间这些边界。整帧重渲染，所以回看是真恢复。

- 入口：`createVisualization(container, { run, legend, dots, explainContainer })`
  → `{ showStep, getStep, playEnterAnimation, destroy }`（`showStep(null)` 是明确的空态，不抛错）
- 样式：同目录 `visualization.css`（浅色默认 token `--viz-*`，宿主必须引）
- 自测页：`dev.html`（v1，Blender 深色壳）、`dev-morph.html`（v2，浅色五区 + 三栏同屏）
- 接入 02 的说明：`C02-INTEGRATION.md`

尚未接入（代码里以标记写明）：`[02 unsupports]` 正式挂载点与步骤广播、`[05 unsupports]` 辅导后端、
`[07 unsupports]` 练习与本机记录。开发页里的这些区都是 03 的自测替身，不是对应成员的业务实现。

约束：只消费 `steps`，不计算另一套算法；`mid=null` 不展示为 0；空数组不画假节点；回看恢复历史快照。
