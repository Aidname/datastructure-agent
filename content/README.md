# 成员06：可接入的二分查找内容

版本：1.0.0；日期：2026-10-15。

本批交付10张知识卡、10道自编过程题、每题答案/解析/三级提示、11组人工预期、1条自编来源登记，以及候选覆盖目录。全部卡题verified=true，可供消费模块读取。没有实现04的后端路由、05的Agent检索或07的练习页面。

用户明确取消了教材照片、真实教材出处和页码核验要求。本版采用sourceType=original和项目自编来源；chapter=null、pages=null合法，不应因此排除内容。没有把未核验的教材引用翻成已核验。

## 字段与用途

- knowledge/cards.json：沿用id/topicId/title/content/keywords/sourceId/chapter/pages/verified，附加version、sourceType、review。
- exercises/binary-search.json：沿用id/topicId/type/prompt/context/options/answer/explanation/hints/sourceRefs/verified，附加version、sourceType、review。
- sources/manifest.json：项目自编来源，verified表示内容检查通过，不表示教材或同伴审核通过。
- sources/binary-search-contract.json：闭区间、零下标、向下取整、首次相等返回等内容题设。
- exercises/binary-search-oracle.json：11组人工推演预期，供08复核，不是线上引擎输出。
- REVIEW.md：可直接阅读的知识卡、题目和提示。
- review/assignment-check.md：本次图片/TXT与交付的逐项核对。
- exercises/HANDOFF.md：04/05/07/08接入说明与检索测试词。
- VALIDATION.md：实际检查记录；validate.mjs是离线检查脚本。

## 可用性口径

只发布本条verified=true且其source/关联卡verified=true的数据。original来源不要求教材页码。context.sourceVersion=null表示尚未绑定04实际运行版本，不能展示成真实运行引用；固定情境练习仍可确定判分。context.algorithmContractId固定题设，不能拿它冒充引擎sourceVersion。

sourceVersion和真实接口联调由04/相关成员接入时补齐，不再阻止本批卡题读取。实际软件上线和完整交互验收仍归相应成员完成。

运行：

```powershell
npm run check
node content/validate.mjs
```
