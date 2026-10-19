# API 契约 v1

更新：2026-10-19；实现基线 main `d1ce117`（合并 PR #10）。同源前后端，请求使用 JSON 与 `Content-Type: application/json`。本页区分已实现行为与后续计划；消费者联调状态见[接口对齐清单](contract-alignment.md)。

## 当前接口

| 方法与路径 | 当前行为 | 主责 |
|---|---|---|
| GET /api/health | 200；ok=true、stage=scaffold、implemented 包含 static-page/health/runs/exercises、modelCallsEnabled=false | 04 |
| POST /api/algorithms/binary-search/runs | 200，创建并返回完整 run | 04 |
| GET /api/runs/:runId | 200，返回同一完整 run | 04 |
| GET /api/runs/:runId/steps/:stepIndex | 200，返回 `{runId,step}` | 04 |
| GET /api/exercises | 200，返回 `{exercises:[...]}`，当前10题 | 04+06 |
| POST /api/exercises/check | 200，程序判分及固定提示 | 04+07 |
| POST /api/agent/explain | 固定503 MODEL_NOT_CONFIGURED 占位；尚未接入模型或工具 | 05，04整合入口 |
| GET /api/knowledge/cards | 501 NOT_IMPLEMENTED；尚未实现检索 | 05+06 |

## 运行与步骤

创建输入：`{"array":[1,3,5,7,9],"target":7}`。

- array 为非递减安全整数数组，最多100项；target 为安全整数。不接受数字字符串、小数或不安全整数。允许空数组、负数、重复值；不自动排序或去重。
- 创建与判分的请求体最多10240字节，按 UTF-8 字节计；超过限制当前返回400 INVALID_INPUT。
- 创建成功为200，完整对象字段如下。输入固定，改输入需创建新 run。

| 字段 | 当前格式 |
|---|---|
| runId | 服务端生成的字符串 |
| createdAt | Date.now()，毫秒时间戳数字 |
| algorithm | binary-search |
| sourceVersion | c-v1 |
| sourceLines | `[{lineId,text}]`，当前13行 C/C++ 风格展示片段 |
| steps | 完整步骤数组；schemaVersion=1.0，格式见[状态契约](trace-contract.md) |
| result | 匹配下标或-1，与最终步骤一致 |

闭区间、零下标、mid 向下取整；重复值返回实际命中的任一下标，不承诺首个或末个。run 存在服务进程内存 Map 中，保留1小时，每60秒清理；查询过期 run 也会删除。重启丢失，没有持久化或容量上限策略。输入数组位于每个 step 的 array 中，顶层没有单独 array/target 字段。

stepIndex 使用十进制非负整数字符串；超出已存在 run 的步骤范围返回400 STEP_OUT_OF_RANGE。负数、小数和非数字路径不匹配当前路由，返回404 NOT_FOUND。不存在或已过期的 run 返回404 RUN_NOT_FOUND。

## 题目与判分

GET /api/exercises 当前读取 `content/exercises/binary-search.json`。公开字段只有 id、version、topicId、type、prompt、context、options；不返回 answer、hints 或 explanation。当前数据均为本批已检查题目，但路由没有实现 verified/草稿过滤。可附 `?topicId=binary-search`，当前代码忽略查询参数，不支持按主题筛选。

context 是题目场景，不是实时 run 的 step：可能含 before-probe，sourceVersion 可为 null，以 algorithmContractId=binary-search-content-v1 标识内容口径；不要强行当成引擎事件或实时状态。

POST /api/exercises/check 输入示例：

```json
{"exerciseId":"bs-q02","answer":"A","hintLevel":1}
```

- value：answer 必须为安全整数数字；choice：必须为 options 中的精确选项 ID 字符串；judgement：必须为布尔值。
- hintLevel 缺省为数字1，只接受数字1、2、3，不接受字符串。
- 正确：`{"correct":true}`，包括第三级也不额外返回解析。
- 错误，一级/二级：`{"correct":false,"hint":"对应固定提示"}`。
- 错误，第三级：`{"correct":false,"correctAnswer":"B","explanation":"对应解析"}`；correctAnswer 类型随题型变化，此时无 hint 字段。
- 类型/提示级别/选项非法为400 INVALID_INPUT；题目不存在为404 NOT_FOUND。评分由程序执行，不调用模型，也不保存作答记录。
- 公开 version 已提供；判分请求当前不校验 exerciseVersion。07保存记录时应保留所见题目版本，旧版本判分策略仍需联调。

## 错误与未实现部分

错误使用 `{error:{code,message}}`，知识接口的501还含 owner 占位字段。非法JSON及上述输入错误为400 INVALID_INPUT；未知 API 为404 NOT_FOUND；请求解析失败可为400 INVALID_REQUEST。

Agent 后续计划输入 `{runId,stepIndex,question,hintLevel}`，输出 answer、stepRefs、sourceRefs、usage；应从服务端读取真实步骤，只引用已核验内容，如实记录真实模型用量。本批 original 来源允许 chapter/pages 为空。当前503仅为固定降级占位，没有实现 Agent 入参校验、状态工具、检索、provider、超时重试、预算控制或真实 usage。

MODEL_TIMEOUT/504、MODEL_UNAVAILABLE/502、BUDGET_LIMIT/429 是后续计划，尚无对应实现；不得作为当前可用接口承诺。模型预算上限30元，当前没有付费调用。
