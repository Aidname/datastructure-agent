# 本机学习记录

键名：datastructure-agent:learning:v1；结构：{schemaVersion:1, attempts:[]}。保留最近200次作答；无登录或跨设备同步，清理浏览器数据会删除记录。

每条包含id、createdAt、updatedAt、question公开快照（含version/topicId/context）、answer、correct、hintsUsed、feedbackByLevel，以及可空origin（runId、stepIndex、sourceVersion）。提示2/3更新同一条记录，不增加作答次数；答案修改后提交为新作答。

进度按当前题号和版本统计：已练为有记录的题数，最近答对为每题最后一次结果正确的题数。全部作答、错题历史和尚未订正可切换；旧版本保留回顾但不计入当前进度，重练载入当前题目并清空答案。200条上限淘汰后仅依据保留记录计算。

仅主动确认后删除本应用键，不使用localStorage.clear。无权限/空间不足时给出仅本页有效的提示；无法解析或不兼容数据保留原值，新记录不覆盖损坏数据，用户清除后才能恢复持久化。storage事件触发重新读取及取消当前请求，写入前也读取磁盘记录，尽量保留其他标签新增数据；普通localStorage不提供跨标签事务保证。

数据为浏览器可编辑的学习辅助记录，不是可信考试成绩；原型记录使用不同空间，不导入生产记录。不包含真实访谈资料或API密钥。
