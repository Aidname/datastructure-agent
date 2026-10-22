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
| 503 | MODEL_NOT_CONFIGURED | 未开Mock且无Key |
| 429 | RATE_LIMIT_EXCEEDED / TOKEN_LIMIT_EXCEEDED / BUDGET_EXCEEDED | 请求/日token/估算额度不足 |
| 503 | BUDGET_UNAVAILABLE | 本地预算记录不可读写，未调用模型 |
| 502 | MODEL_CALL_FAILED | 模型调用失败 |
| 504 | MODEL_TIMEOUT | 模型响应头或正文超时 |

### 说明

- stepIndex 为必填安全整数数字，不接受小数、负数、布尔值、数组或数字字符串
- question 为必填非空字符串，缺失、null或空白都返回400
- hintLevel 默认为 1，仅接受 1、2、3 三个值
- 开发阶段需设置环境变量 `AGENT_MOCK=true` 启用 Mock 模式
- Mock显式优先；未开Mock时，有DEEPSEEK_API_KEY调用真实模型，否则503
- Mock 模式下所有回答带 `[Mock开发模式]` 前缀

权威契约见[API契约](../../../docs/architecture/api-contract.md)。hintLevel仅缺省时为1，显式null等非法值拒绝。

真实模式及配置见[Agent说明](../../../backend/src/agent/README.md)。可选sessionId用于统计，GET /api/agent/usage?sessionId=...须使用相同标识。未知token/费用分别为null；不要显示为0。聊天页为 /src/features/agent/chat.html?runId=实际ID&stepIndex=1。正式工作台装配与按问题检索仍待协作。

回归：node --test tests/agent-explain.test.mjs tests/agent-provider.test.mjs tests/agent-real-mode.test.mjs。真实调用测试使用本地桩，不产生模型费用。
