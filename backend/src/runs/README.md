# 运行状态（成员04）

store.js 已实现服务端 runId、createdAt 和内存Map保存；routes/runs.js 提供完整run及单步查询。每个run输入固定，输入变化需新建。

TTL为1小时，每60秒清理，查询过期run也删除；定时器unref。服务重启丢失记录，没有持久化或容量上限策略。Agent只读状态工具尚待05接入；接口错误及字段见[API契约](../../../docs/architecture/api-contract.md)。
