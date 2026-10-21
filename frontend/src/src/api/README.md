API 接口文档
POST /api/agent/explain
步骤辅导接口。根据当前执行步骤和提问，返回分级提示与知识卡引用。
请求
Content-Type: application/json
{
"runId": "string（必填，由 POST /api/algorithms/binary-search/runs 创建）",
"stepIndex": "number（必填，非负整数，对应步骤索引）",
"question": "string（必填，非空，学生提问内容）",
"hintLevel": "number（可选，1/2/3，默认1）"
}
响应
200 成功
{
"runId": "string",
"stepIndex": 2,
"answer": "string（提示内容，Mock模式下前缀标注[Mock开发模式]）",
"references": {
"stepRefs": [
{
"runId": "string",
"stepIndex": 2,
"event": "probe",
"mid": 2
}
],
"sourceRefs": [
{
"cardId": "bs-k03",
"title": "中点计算：向下取整",
"content": "string（知识卡全文）",
"sourceId": "project-original-binary-search",
"sourceType": "original",
"version": "1.0.0",
"verified": true,
"chapter": null,
"pages": null
}
]
},
"usage": {
"model": "mock",
"cost": 0,
"mock": true
}
}
400 非法请求
{
"error": {
"code": "BAD_REQUEST",
"message": "string（具体原因）"
}
}
触发条件：请求体为空、runId非字符串、stepIndex非非负整数、question为空。
404 未找到
{
"error": {
"code": "RUN_NOT_FOUND | STEP_OUT_OF_RANGE",
"message": "string"
}
}
触发条件：runId不存在、步骤索引越界。
503 模型未配置
{
"error": {
"code": "MODEL_NOT_CONFIGURED",
"message": "模型未配置。开发阶段请设置 AGENT_MOCK=true 启用 Mock 模式。"
}
}
触发条件：未设置环境变量 AGENT_MOCK=true。
说明
本接口读取04服务端真实 run/step 状态，忽略客户端传入的步骤状态
提示级别递进：1级仅当前步骤状态，2级加问题针对性解释，3级加下一步预判
知识卡引用从 content/knowledge/cards.json 动态读取，不编造来源
Mock模式仅用于开发阶段，需显式开启，答案标注非模型输出
当前阶段不调用付费模型，不暴露模型密钥