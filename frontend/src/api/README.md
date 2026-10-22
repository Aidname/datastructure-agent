# Agent API 接口文档

## POST /api/agent/explain

获取二分查找步骤的提示解释。

### 请求体

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| runId | string | 是 | 运行ID，由 `/api/algorithms/binary-search/runs` 创建 |
| stepIndex | integer ≥ 0 | 是 | 步骤索引，从 0 开始，必须在 run.steps 范围内 |
| hintLevel | integer (1-3) | 否 | 提示级别：1=基础信息，2=详细分析，3=完整推理链。默认 1 |
| question | string | 是 | 用户追问内容，必须为非空字符串（trim后不能空白） |

### 响应

#### 成功 200
```json
{
"runId": "string",
"stepIndex": 0,
"answer": "string",
"stepRefs": [
{
"runId": "string",
"stepIndex": 0,
"event": "probe|found|not-found|move-left|move-right|init",
"left": 0,
"right": 4,
"mid": 2,
"knowledgeCard": "bs-k03"
}
],
"sourceRefs": [
{
"cardId": "bs-k03",
"title": "中点计算：向下取整",
"sourceId": "string",
"sourceType": "original",
"chapter": null,
"pages": null,
"version": "1.0.0",
"verified": true
}
],
"usage": {
"model": "mock",
"cost": 0,
"mock": true
}
}
```

#### 错误码

| 状态码 | 错误码 | 说明 |
|--------|--------|------|
| 400 | INVALID_INPUT | 请求体不是合法 JSON |
| 400 | INVALID_INPUT | runId 缺失或不是字符串 |
| 400 | INVALID_INPUT | stepIndex 缺失、不是整数或小于 0 |
| 400 | INVALID_INPUT | hintLevel 不是 1、2 或 3 |
| 400 | INVALID_INPUT | question 缺失、非字符串或为空白 |
| 400 | INVALID_INPUT | 请求体超过 10KB 限制 |
| 404 | RUN_NOT_FOUND | run 不存在或已过期 |
| 400 | STEP_OUT_OF_RANGE | stepIndex 超出 run.steps 范围 |
| 503 | MODEL_NOT_CONFIGURED | 未设置 AGENT_MOCK=true 时返回 |

### 说明

- stepIndex 为必填安全整数数字，不接受小数、负数、布尔值、数组或数字字符串
- question 为必填非空字符串，缺失、null或空白都返回400
- hintLevel 默认为 1，仅接受 1、2、3 三个值
- 开发阶段需设置环境变量 `AGENT_MOCK=true` 启用 Mock 模式
- 未启用 Mock 时返回 503 MODEL_NOT_CONFIGURED
- Mock 模式下所有回答带 `[Mock开发模式]` 前缀

权威契约见[API契约](../../../docs/architecture/api-contract.md)。hintLevel仅缺省时为1，显式null等非法值拒绝。

回归命令：node --test tests/agent-explain.test.mjs。真实模型、检索工具、聊天前端及预算控制仍待后续交付。
