# API 契约 v1

更新：2026-10-23；算法接口基于PR #10，Agent/问题检索基于已合并PR #18/#20，本分支为07接入增加可选题目版本校验。同源前后端，请求使用 JSON 与 `Content-Type: application/json`。本页区分已实现行为与后续计划；消费者联调状态见[接口对齐清单](contract-alignment.md)。

## 当前接口

| 方法与路径 | 当前行为 | 主责 |
|---|---|---|
| GET /api/health | 200；ok=true、stage=scaffold、implemented 包含 static-page/health/runs/exercises/agent/knowledge；mode 为 disabled/mock/deepseek，modelCallsEnabled 按实际模式返回 | 04 |
| POST /api/algorithms/binary-search/runs | 200，创建并返回完整 run | 04 |
| GET /api/runs/:runId | 200，返回同一完整 run | 04 |
| GET /api/runs/:runId/steps/:stepIndex | 200，返回 `{runId,step}` | 04 |
| GET /api/exercises | 200，返回 `{exercises:[...]}`，当前10题 | 04+06 |
| POST /api/exercises/check | 200，程序判分及固定提示 | 04+07 |
| POST /api/agent/explain | 无Key且未开Mock时503；显式AGENT_MOCK=true优先；否则有Key调用DeepSeek，返回步骤/资料引用 | 05，04整合入口 |
| GET /api/agent/usage?sessionId=... | 200，当前来源/会话的请求数、失败数、耗时及已知用量；未知值null | 05 |
| GET /api/knowledge/cards | 200，verified卡片目录或按q检索；无Key也可使用 | 05+06 |

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
{"exerciseId":"bs-q02","exerciseVersion":"1.0.0","answer":"A","hintLevel":1}
```

- value：answer 必须为安全整数数字；choice：必须为 options 中的精确选项 ID 字符串；judgement：必须为布尔值。
- hintLevel 缺省为数字1，只接受数字1、2、3，不接受字符串。
- 正确：`{"correct":true}`，包括第三级也不额外返回解析。
- 错误，一级/二级：`{"correct":false,"hint":"对应固定提示"}`。
- 错误，第三级：`{"correct":false,"correctAnswer":"B","explanation":"对应解析"}`；correctAnswer 类型随题型变化，此时无 hint 字段。
- 类型/提示级别/选项非法为400 INVALID_INPUT；题目不存在为404 NOT_FOUND。评分由程序执行，不调用模型，也不保存作答记录。
- exerciseVersion 可省略以兼容既有调用；提供时必须为非空字符串，否则400 INVALID_INPUT。与服务端题目version不一致时409 EXERCISE_VERSION_MISMATCH，客户端提示刷新题库，不保存作答。07始终发送当前展示版本，并在本机记录中保留题目快照、版本、答案、正确性、提示级别、时间和可选run/步骤关联。旧版本记录仅供回顾，不计入当前版本进度；重练使用当前题库。

## 错误与未实现部分

错误使用 `{error:{code,message}}`。非法JSON及上述输入错误为400 INVALID_INPUT；未知 API 为404 NOT_FOUND；请求解析失败可为400 INVALID_REQUEST。

## Agent 与聊天（2026-10-22，PR #18修复版）

请求为 `{runId,stepIndex,question,hintLevel,sessionId?}`。runId是非空字符串；stepIndex是非负安全整数数字，禁止类型转换；question是1至2000字符的非空字符串；hintLevel仅缺省时为1，显式仅接受数字1/2/3。客户端stepState不影响真实状态。sessionId仅用于用量展示，不是鉴权或限流身份。

模式按以下优先级选择：显式AGENT_MOCK=true返回开发模板且不调用模型；否则配置DEEPSEEK_API_KEY时调用真实模型；其余情况503 MODEL_NOT_CONFIGURED。health中的mode和modelCallsEnabled与实际模式一致。

成功200返回runId、stepIndex、hintLevel、answer、stepRefs、sourceRefs、knowledgeUsed、retrieval、usage。状态来自04记录；按学生问题检索最多2张06的verified知识卡，再补充当前事件上下文卡，去重后最多3张放入prompt。stepRefs含原运行、步骤、事件、变量；sourceRefs含cardId/title/sourceId/sourceType/chapter/pages/version/verified。本批original的chapter/pages可为null。显式Mock正常步骤解释带[Mock开发模式]，usage为 `{model:"mock",cost:0,mock:true}`；无关问题/信息不足的本地固定回复另有irrelevant/infoInsufficient标记。

真实usage包含model、mock=false、tokens、elapsedMs、cost、costCurrency=CNY及costBasis。tokens有promptTokens/completionTokens/totalTokens；上游缺失或不合法时为null。单价不内置，需依据实际账户/model配置MODEL_INPUT_CNY_PER_MILLION和MODEL_OUTPUT_CNY_PER_MILLION；未配置时cost=null。金额仅为配置估算，非账单。

GET /api/agent/usage?sessionId=... 返回当前socket来源+session、服务启动以来且北京时间当日的requests/failures/elapsedMs/tokensUsed/costUsed/unknownCalls。token未知与费用未知分别标null，不能转换成0。该展示统计重启清零；预算预留账本独立持久保存。

错误：400 INVALID_INPUT（含非法JSON、超过10240字节）、404 RUN_NOT_FOUND、400 STEP_OUT_OF_RANGE、429 RATE_LIMIT_EXCEEDED、429 TOKEN_LIMIT_EXCEEDED、429 BUDGET_EXCEEDED、503 BUDGET_UNAVAILABLE、502 MODEL_CALL_FAILED、504 MODEL_TIMEOUT。超时覆盖响应头与正文，错误不回显上游诊断正文，不假称自动Mock降级；算法、动画和判分仍可独立使用。

限流默认开启，按socket peer来源聚合；忽略session、User-Agent、x-forwarded-for。反向代理部署需另明确可信来源策略。预算调用前同步预留，避免并发重复分配；本地单进程持久账本位于已忽略的data/private/agent-budget.json，保留失败、未知用量及中断调用的预留。默认测试累计30元、每日5元；这是估算额度控制，实际账单仍以服务商为准，多实例需事务共享存储。配置见[Agent说明](../../backend/src/agent/README.md)。

按问题检索已接入，详见下节；本分支已完成02/03/05工作台装配，07模块已在本分支接入并通过本地检查，真实模型效果及08独立验收仍待完成。聊天独立页支持URL传runId/stepIndex，失败重试保存原请求快照。02负责工作台装配，05配合；真实案例由05提供调用记录并配合08评测。

回归：`node --test tests/knowledge-retrieval.test.mjs tests/agent-explain.test.mjs tests/agent-provider.test.mjs tests/agent-real-mode.test.mjs`。测试使用本地桩，不是实际模型效果证据。

## 已核验知识查询与问题检索

GET /api/knowledge/cards?topicId=binary-search&q=问题&limit=3：topicId缺省binary-search；q可省略，省略时列目录（默认10张），存在时须为1至2000字符非空值（默认3张）；limit是1至10的十进制整数。只返回同主题verified=true且具备有效出处/版本的卡片。未知主题/无匹配200空数组；非法参数400 INVALID_INPUT；资料读取失败503 KNOWLEDGE_UNAVAILABLE。

返回 `{topicId,query,cards,sourceRefs,retrieval}`。cards含id/topicId/title/content/keywords及出处版本字段；不返回内部review记录。retrieval.method=keyword-v1，status为catalog/matched/no-match；matches含cardId/score/matchedTerms，score是排序权重，不是模型置信度。

Agent检索字段另含matchedCardIds与contextCardId。问题匹配优先于事件；“解释这一步”等问题用事件卡并标step-context。无匹配返回资料不足、空sourceRefs、knowledgeUsed=false、usage.insufficientKnowledge=true，不调用模型；明显无关问题标irrelevant。stepRefs.knowledgeCard仅指实际提供的事件上下文卡（可null），所有提供给模型的卡片列在sourceRefs中，不能将这些引用解释成每句话都已事实核验。

本批只覆盖现有10张自编二分查找卡，不使用向量数据库，无额外依赖；排序细节及限制见[知识检索说明](../../backend/src/knowledge/README.md)。

## 正式工作台步骤上下文

02使用04完整run和03唯一播放指针，显式分发初始步骤0；输入失效广播null并销毁旧播放/请求。代码按sourceLines/lineId渲染。05共享面板通过setContext同步当前run/step，提问暂停播放；更换run取消旧问答。07挂载点#exercise-mount，subscribeStep(listener)或workbench:step事件接收只读context：{runId,stepIndex,step,total,playing,sourceVersion}或null。07当前未实现，挂载区不代表练习/记录已交付。具体生命周期见[02接入说明](../../frontend/src/features/workbench/README.md)。

### 连续追问（2026-10-23）

可选增加conversationId与turnId，须同时提供，均为8至80位字母/数字/下划线/连字符；旧调用不传时保持无历史单轮行为。前端为独立运行会话和每次问题分别生成随机ID，失败重试复用原快照ID。

服务端按socket来源+runId+conversationId隔离内存记录，最多10轮成功且有依据的完整问答，总文本上限8000个UTF-16字符；超限淘汰最早整轮。1小时无活动过期，最多200个会话，重启清空。客户端history不作为历史或权威状态，sessionId仍仅作统计。跨步骤保留对话并注入服务端真实状态，新run隔离。

同会话并发409 CONVERSATION_BUSY；全部会话执行中且达到容量时429 CONVERSATION_BUSY。保留窗口内同turnId与相同请求重放成功结果，不重复调用模型；同ID改写问题/步骤/级别400 INVALID_INPUT。失败/无关/无资料回复不进入历史。正文不再自动拼接整卡，sourceRefs字段与来源展示保留。详见[检查记录](agent-conversation-check-20261023.md)。


2026-10-23口语步骤问答补充：关键词未命中但问题可关联当前运行数值/指代时，retrieval.status可为step-grounded，提供真实步骤及相关verified卡给模型；matches/matchedCardIds为空，不伪称关键词或语义命中。prompt另附上一步服务端快照，避免当前mid=null时丢失上轮比较依据。无关问题处理、十轮隔离和限流预算保持原行为。
