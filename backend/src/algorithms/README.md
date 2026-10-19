# 算法引擎（成员04）

当前二分查找实现位于[共享引擎](../../../shared/algorithms/binarySearch.js)，本目录不另建重复实现。输入校验由 routes/runs.js 执行。

闭区间、零下标、重复值允许任一实际匹配、未找到-1；逐步独立快照、源码版本与映射见[状态契约](../../../docs/architecture/trace-contract.md)。模型不得产生权威执行状态。
