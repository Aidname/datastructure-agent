# Agent Mock 接口接入说明

权威字段与状态码见[API契约](../../../docs/architecture/api-contract.md)。本页提供当前开发模式的调用示例，不另立接口。

默认 `POST /api/agent/explain` 返回503 MODEL_NOT_CONFIGURED。仅开发时在启动前显式开启：

```powershell
$env:AGENT_MOCK='true'
npm start
```

请求JSON为 `{runId,stepIndex,question,hintLevel}`。runId由运行接口创建；stepIndex必须为非负安全整数数字，question为非空字符串。hintLevel缺省为1，显式值只能是数字1、2、3；null、布尔值或数字字符串均非法。客户端stepState不作为权威依据。

```json
{"runId":"run_实际创建的编号","stepIndex":1,"question":"这一步为什么更新边界？","hintLevel":2}
```

成功200返回answer、stepRefs、sourceRefs、usage，另保留顶层runId/stepIndex。每级answer均以[Mock开发模式]开头，不调用模型。stepRefs含实际runId、stepIndex、event及left/right/mid；sourceRefs包含cardId、title、sourceId、sourceType、chapter、pages、version、verified，本批original的chapter/pages可为null。usage为 `{model:"mock",cost:0,mock:true}`。

- 非法请求/JSON/等级、非整数索引、空问题：400 INVALID_INPUT。
- 不存在或过期run：404 RUN_NOT_FOUND。
- 合法整数索引超出当前run：400 STEP_OUT_OF_RANGE。
- 请求体超过10240 UTF-8字节：400 INVALID_INPUT，与运行/判分一致。
- 未显式开启Mock：503 MODEL_NOT_CONFIGURED。

事件卡片映射：init→bs-k01，probe→bs-k03，move-left→bs-k04，move-right→bs-k05，found→bs-k08，not-found→bs-k06。卡片取自06现有文件，仅引用verified=true内容；这不是按问题进行知识检索。

在仓库根目录运行 `node --test tests/agent-explain.test.mjs` 核验请求、真实状态、边界、引用与默认降级。真实模型适配、检索工具、聊天前端和预算控制仍为后续任务。
