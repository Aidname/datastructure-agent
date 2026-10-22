# 成员06内容交接：1.0.0

10卡、10题、11组人工预期均已检查；卡题verified=true。来源均为项目自编，chapter/pages为空合法。基础功能不需要教材核验。

## 04：固定题库与确定判分

读取exercises/binary-search.json。choice的options是[{id,text}]，answer是选项ID字符串；judgement的answer为布尔；value的answer是安全整数，两者options=[]。bs-q02答案是字符串B，bs-q04是布尔false，bs-q06是整数-1。

前端输入值规范化后由后端严格比较。空字符串、3abc、字符串false不能冒充合法的整数或布尔。判分不用模型。公开题目仅返回id/topicId/version/type/prompt/context/options，不提前发送answer/explanation/hints。提示按请求等级逐条返回，正确或主动查看第3级提示后可展示解析；具体HTTP响应仍由04/07集成。

context是固定教学情境，不是线上run；before-probe仅描述练习时刻，不是新增引擎事件。sourceVersion=null仅表示未绑定04源码，不阻断固定练习；algorithmContractId=binary-search-content-v1规定题设。实际引擎采用同一闭区间、零下标、向下取整、相等即返回规则后再关联真实sourceVersion，不需要06先写04的引擎。

## 05：知识读取与引用

读取knowledge/cards.json和sources/manifest.json，筛选卡与来源均verified=true。本来源type=original，不因chapter/pages为空而排除；引用显示“项目自编 · 卡片ID/标题”，不要生成教材页码。

以下是离线关键词命中预期，不是实际Agent效果：

| 测试词 | 预期卡片 |
|---|---|
| 有序 | bs-k01 |
| 闭区间 | bs-k02 |
| 向下取整 | bs-k03 |
| 更新left | bs-k04 |
| 更新right | bs-k05 |
| 未找到 | bs-k06 |
| 空数组 | bs-k07 |
| 最左 | bs-k08 |
| 复杂度 | bs-k09 |
| mid=null | bs-k10 |

## 07：展示与记录

通过04接口读题和提交答案，choice提交选项ID、judgement提交布尔、value提交整数；空输入提示未作答。固定题面带自己的数组，不能把它显示为学生当前run的真实步骤。按1/2/3显示提示，记录题ID、version=1.0.0、答案和已用提示等级，防止旧题记录混用。

## 08：独立答案依据

exercises/binary-search-oracle.json列出11组人工推演的每轮[left,right,mid]、结果、结束边界和理由；REVIEW.md有全部答案与三级提示。请自行复算并核对04实际实现。本批检查通过不代表08已经复核或前后端联调已通过。

## 01/09：提交与覆盖

本次只提交content目录。图片/TXT中的真实教材出处要求按用户新指令改为项目自编，PR说明中应明确该变更。根.gitignore的coverage/会忽略教学覆盖表，git提交时使用git add -f content/coverage/，或由01后续调整忽略规则。

40项候选目录用于讨论正式版扩展，只有二分查找available，另外39项planned。不要将候选目录、静态检查或协议样例说成完整软件完成。公共API/引擎事件未在本包改动；成员04/05/07接入后再由08测试。
