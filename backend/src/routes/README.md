# 业务路由（成员04，Agent handler由05提供）

runs.js 已提供创建/查询run与单步读取；exercises.js 已接06题库、公开字段白名单和程序判分。server.js 负责入口、按字节限制创建/判分请求体、静态文件和health。

Agent已接入服务端真实步骤、源码、最多10轮历史及直接DeepSeek调用。显式Mock优先；只有未开Mock且无Key时返回503 MODEL_NOT_CONFIGURED。知识卡GET目录/查询已实现，无Key可用；聊天独立于知识检索，不以无匹配拒答。字段和状态码见[API契约](../../../docs/architecture/api-contract.md)。公共后端入口由04整合，变更同步文档与消费者。
