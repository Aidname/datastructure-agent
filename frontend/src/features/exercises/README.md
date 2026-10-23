# 过程练习（成员07代码，由01按用户授权补齐）

正式入口为侧栏独立“过程练习”页；本机记录在“错题与记录”页。createExercises挂载到#exercise-mount，读取06的10题公开字段，使用04真实程序判分，不依赖模型API。支持整数、单选、判断；空值不当作0，判断false不转成字符串。

createExercises(container,{recordsContainer,onPracticeRequested,onBeforeAnswer,store})支持外部记录挂载点。正式页传入#records-mount并共享原store；重练时先选题，再调用onPracticeRequested切页并聚焦题目。不传recordsContainer仍保留内部记录面板，兼容原有调用。

首次答错显示观察提示；用户主动点击后依次获得规则提示、完整答案及解析。正确响应不展示解析；未请求的提示和答案不预加载。更改答案后重新提交形成新作答，继续提示只更新原作答的提示级别。

所有题使用各自固定数组、目标与边界，不随工作台步骤自动改题。subscribeStep只提供提交时的可选关联；提交前暂停播放。同run的步骤变化不改写历史关联，输入/运行失效或换题会取消旧请求，迟到结果不能保存或显示。

提交携带exerciseVersion，服务端版本不符返回409并提示刷新题库。请求失败不生成记录。题库为空、接口失败可刷新重试；数据均用textContent展示。pagehide销毁模块、订阅和异步请求。

详见[记录格式](../records/README.md)、[API契约](../../../../docs/architecture/api-contract.md)及[本地检查](../../../../docs/architecture/exercises-check-20261023.md)。真实访谈与试用仍由07执行。

界面将题目阶段标识转换为中文：init为“查找开始”、before-probe为“计算中点前”、probe为“计算并比较中点”，边界更新及结束状态同样用中文。题干、选项、提示、解析和历史回顾中的事件名也只在显示时翻译；保留left/right/mid并注明中文含义，题目原文、版本、存储快照和判分参数保持原值。
