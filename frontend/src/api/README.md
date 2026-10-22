# Agent API 接口文档

## POST /api/agent/explain

获取二分查找步骤的提示解释。

### 请求体

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| runId | string | 是 | 运行ID，由 `/api/algorithms/binary-search/runs` 创建 |
| stepIndex | integer ≥ 0 | 是 | 步骤索引，从 0 开始，必须在 run.steps 范围内 |
| hintLevel | integer (1-3) | 否 | 提示级别：1=基础信息，2=详细分析，3=完整推理链。默认 1 |
| question | string | 否 | 用户追问内容。若提供则必须为字符串 |

### 响应

#### 成功 200
json
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
"knowledgeCard": "bs-k01"
}
],
"sourceRefs": [
{
"cardId": "bs-k01",
"title": "二分查找基础",
"sourceId": "string",
"sourceType": "string"
}
],
"usage": {
"model": "mock",
"cost": 0,
"mock": true
}
}
#### 错误码

| 状态码 | 错误码 | 说明 |
|--------|--------|------|
| 400 | INVALID_INPUT | 请求体不是合法 JSON |
| 400 | INVALID_INPUT | runId 缺失或不是字符串 |
| 400 | INVALID_INPUT | stepIndex 缺失、不是整数或小于 0 |
| 400 | INVALID_INPUT | hintLevel 不是 1、2 或 3 |
| 400 | INVALID_INPUT | question 提供了但不是字符串 |
| 400 | INVALID_INPUT | 请求体超过 10KB 限制 |
| 404 | RUN_NOT_FOUND | run 不存在或已过期 |
| 400 | STEP_OUT_OF_RANGE | stepIndex 超出 run.steps 范围 |
| 503 | MODEL_NOT_CONFIGURED | 未设置 AGENT_MOCK=true 时返回 |

### 说明

- stepIndex 为必填字段，不接受小数、负数或字符串形式的数字
- question 为可选字段，但传入时必须为字符串类型
- hintLevel 默认为 1，仅接受 1、2、3 三个值
- 开发阶段需设置环境变量 `AGENT_MOCK=true` 启用 Mock 模式
- 未启用 Mock 时返回 503 MODEL_NOT_CONFIGURED
- Mock 模式下所有回答带 `[Mock开发模式]` 前缀
