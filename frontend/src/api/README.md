# API 接口文档

## POST /api/agent/explain

步骤辅导接口。根据当前执行步骤和提问，返回分级提示与知识卡引用。

### 请求

Content-Type: application/json

{
  "runId": "string（必填，由 POST /api/algorithms/binary-search/runs 创建）",
  "stepIndex": "number（必填，非负整数，对应步骤索引）",
  "question": "string（必填，非空，学生提问内容）",
  "hintLevel": "number（可选，1/2/3，默认1）"
}

### 响应

#### 200 成功

{
  "answer": "string（[Mock开发模式]前缀提示内容）",
  "stepRefs": [{ "runId": "string", "stepIndex": 2, "event": "probe", "mid": 2 }],
  "sourceRefs": [{ "cardId": "bs-k03", "title": "string", "content": "string", "sourceId": "string", "sourceType": "original", "version": "1.0.0", "verified": true, "chapter": null, "pages": null }],
  "usage": { "model": "mock", "cost": 0, "mock": true }
}

#### 400 非法请求

{
  "error": { "code": "INVALID_INPUT", "message": "string" }
}

#### 404 未找到

{
  "error": { "code": "RUN_NOT_FOUND", "message": "string" }
}

#### 413 请求体过大

{
  "error": { "code": "PAYLOAD_TOO_LARGE", "message": "请求体超过 10KB 限制" }
}

#### 503 模型未配置

{
  "error": { "code": "MODEL_NOT_CONFIGURED", "message": "模型未配置。开发阶段请设置 AGENT_MOCK=true 启用 Mock 模式。" }
}

### 说明

- 读取04服务端真实 run/step 状态，忽略客户端传入的步骤状态
- hintLevel 1/2/3 递进，所有级别标注[Mock开发模式]
- 知识卡从 content/knowledge/cards.json 动态读取，不编造来源
- 需 AGENT_MOCK=true 显式开启，默认返回503
- hintLevel 显式传非1/2/3值将返回400 INVALID_INPUT
本接口读取04服务端真实 run/step 状态，忽略客户端传入的步骤状态
提示级别递进：1级仅当前步骤状态，2级加问题针对性解释，3级加下一步预判
知识卡引用从 content/knowledge/cards.json 动态读取，不编造来源
Mock模式仅用于开发阶段，需显式开启，答案标注非模型输出
当前阶段不调用付费模型，不暴露模型密钥
