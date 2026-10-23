# 步骤辅导界面（成员05，02装配）

共享实现 `panel.js` 导出 `createAgentChat(container,{embedded=false,onBeforeSend})`，返回 `{setContext,destroy}`。两种入口使用同一逻辑：

- 正式工作台：02创建embedded面板，`setContext({runId,stepIndex})`自动绑定当前步骤，`setContext(null)`暂停发送并取消旧请求，输入框仍可编辑草稿；不会要求学生手工复制runId。发送前通过onBeforeSend暂停03播放。
- 独立 `chat.html`：chat.js挂载同一面板，支持URL参数runId/stepIndex及手工输入，原调试入口保留。

同一run切换步骤时，回答保留原问题、原run/步骤/提示级别标签，不显示知识卡出处；换run/输入失效时取消旧请求，迟到数据不写入新关联。失败重试保留原请求快照。等待回复时仍可编辑下一条草稿，仅暂停再次发送；未开始分析也可先写问题，创建运行后保留草稿。中文输入法确认候选词的回车不触发发送。busy时防止重复发送；destroy取消请求和监听。页面隐藏卸载，浏览器历史恢复会重载以重新初始化。

同源POST `/api/agent/explain`和GET用量接口使用同一sessionId；模式来自health，未知token/费用不显示为0，不在前端保存Key。后端直接问答和模式说明见[Agent服务](../../../../backend/src/agent/README.md)。真实模型效果仍需实际Key联调及08评测。
