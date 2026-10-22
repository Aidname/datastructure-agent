# 已核验知识检索

当前基于06提供的10张二分查找知识卡，使用Node内置分词、关键词/别名及标题和正文词匹配，无额外依赖、向量数据库或模型调用。方法版本为 `keyword-v1`；分数只是排序权重，不是语义置信度或正确率。

## 工具

`retrieveKnowledge(question, topicId, {limit=3})` 返回 `{topicId,query,method,status,matches,cards}`。question须为1至2000字符的非空字符串；limit为1至10的整数；结果按分数降序、相同分数按卡片ID排序。只采用同topic、verified=true且具备有效ID/标题/正文/来源/版本的卡片，去重，不修改内容文件。原始original出处和null章节页码按原值保留。

匹配卡片关键词和少量人工维护的同义表达，辅以标题/正文词；过滤通用词，复合边界条件优先于单独left/right。英文单词有边界，公式忽略空白、大小写及常见字符宽度。没有足够词匹配时返回no-match，不用任意卡片填满结果。

## HTTP接口

```text
GET /api/knowledge/cards?topicId=binary-search
GET /api/knowledge/cards?topicId=binary-search&q=为什么必须有序&limit=3
```

- topicId缺省binary-search；无q时列出已核验目录，默认最多10张；有q时默认最多3张。
- 返回200 `{topicId,query,cards,sourceRefs,retrieval}`，cards提供正文/关键词及出处版本；retrieval提供method/status/matches，其中matches含cardId/score/matchedTerms。
- 空q、超过2000字符、空topicId、非法limit返回400 INVALID_INPUT。未知主题或无匹配返回空数组；目录读取失败返回503 KNOWLEDGE_UNAVAILABLE。
- 无需模型Key，不产生模型费用。不把verified解释成教材核验或模型效果已验收。

## 辅导接入

Agent先按问题选取最多2张卡，再补当前事件的上下文卡（去重后最多3张）。例如当前事件probe时问“为什么必须有序”，主依据为bs-k01，当前步骤上下文为bs-k03。所有实际提供给模型的卡片都进入prompt及sourceRefs；sourceRefs表示提供的依据，不保证模型每句话均已通过事实验证。

“解释这一步”等泛化问题使用当前事件卡，retrieval.status=step-context。问题检索成功为matched；无匹配为no-match，此时返回资料不足、空sourceRefs、knowledgeUsed=false和insufficientKnowledge=true，不调用模型；明显无关问题status=irrelevant。匹配和泛化问题的Mock回答仍是明确标注的模板，附检索卡片，不冒充真实模型回答。

retrieval.matchedCardIds是问题匹配卡；contextCardId是提供的事件上下文卡；stepRefs中的knowledgeCard对应contextCardId。消费者可继续使用原字段，新增retrieval字段用于说明选卡依据。

## 验收与限制

```powershell
node --test tests/knowledge-retrieval.test.mjs tests/agent-explain.test.mjs tests/agent-provider.test.mjs tests/agent-real-mode.test.mjs
```

测试覆盖10个主题、别名/公式、无结果、未核验和跨主题过滤、来源版本、多卡prompt、HTTP接口及真实模式本地桩。没有付费模型效果证据。关键词检索对未收录措辞、多义表达和其他算法覆盖有限，后续扩展内容时需补关键词和独立查询用例；本批不承诺408全部知识覆盖。
