# 前端接口调用（成员02）

`api.js` 提供 `requestJSON(path,{signal,body})` 与 `createRun({array,target},signal)`，使用同源API。统一处理网络失败、HTTP错误及无效JSON，AbortError继续交给调用方处理取消。错误通过页面文字显示，不把后端失败当成功。

工作台保留完整run，由03播放指针驱动展示；不在前端另算轨迹。加载、旧请求代次和AbortController由app.js管理。接口字段见[API契约](../../../docs/architecture/api-contract.md)，模块生命周期见[工作台接入](../features/workbench/README.md)。
