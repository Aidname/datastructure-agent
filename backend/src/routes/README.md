# 业务路由（成员04，Agent handler由05提供）

runs.js 已提供创建/查询run与单步读取；exercises.js 已接06题库、公开字段白名单和程序判分。server.js 负责入口、按字节限制创建/判分请求体、静态文件和health。

Agent当前固定503 MODEL_NOT_CONFIGURED，知识卡GET仍501 NOT_IMPLEMENTED；模型、状态工具与检索尚未接入。字段、状态码和待实现部分见[API契约](../../../docs/architecture/api-contract.md)。公共后端入口由04整合，变更同步文档与消费者。
