# /api/agent/explain 接口文档

## 请求

POST /api/agent/explain
Content-Type: application/json
json
{
"runId": "string（必填）",
"stepIndex": 0,
"question": "string（可选）",
"hintLevel": 1
}
## 响应

### 200 成功
json
{
"runId": "string",
"stepIndex": 0,
"answer": "[Mock开发模式] 步骤提示内容...",
"stepRefs": [{ "stepIndex": 0, "event": "probe", "left": 0, "right": 4, "mid": 2, "knowledgeCard": "bs-k03" }],
"sourceRefs": [{ "cardId": "bs-k03", "title": "比较中间元素", "original": "..." }],
"usage": { "model": "mock", "cost": 0, "mock": true }
}
### 400 非法输入
json
{
"error": { "code": "INVALID_INPUT", "message": "具体原因" }
}
场景：缺 runId、hintLevel 非法（非1/2/3）、请求体非JSON、stepIndex越界、请求体超过10KB。

### 404 run不存在
json
{
"error": { "code": "RUN_NOT_FOUND", "message": "run 不存在" }
}
### 400 步骤越界
json
{
"error": { "code": "STEP_OUT_OF_RANGE", "message": "stepIndex 越界" }
}
### 400 请求体过大
json
{
"error": { "code": "INVALID_INPUT", "message": "请求体超过 10KB 限制" }
}
### 503 未开启Mock
json
{
"error": { "code": "MODEL_NOT_CONFIGURED", "message": "Agent 未启用，请设置 AGENT_MOCK=true" }
}
## 环境变量

- `AGENT_MOCK=true`：启用本地 Mock Agent
- 未设置时返回 503

## 说明

- 当前为 Mock 开发模式，不调用真实模型
- 知识卡从 `content/knowledge/cards.json` 动态读取
- hintLevel 1/2/3 递进提示深度
