# 需求图表 v0.9

更新2026-10-20；09设计。图为需求分析，不声称业务对象均已实现为JavaScript类。

| 图 | 可直接预览的导出 | 可编辑源文件 |
|---|---|---|
| 功能思维导图 | [SVG](functional-map.svg) | [Mermaid](functional-map.mmd) |
| 类图/领域模型 | [SVG](domain-model.svg) | [Mermaid](domain-model.mmd) |

SVG本身也可编辑。离线排版生成源为[render.mjs](render.mjs)，执行 `node docs/architecture/diagrams/render.mjs` 重建SVG；不依赖第三方服务。Mermaid是语义关系源，SVG使用同一含义的固定排版，改图时需同步两者。

Run拥有至少初始化和终止两步；卡片有来源；题目产生多次作答，本机学习记录汇总作答。AnswerRecord到Step是可选的情境关联：当前固定题context是独立before-probe，不能强行对应真实step。Agent只通过状态服务与检索工具读取依据，不生成权威轨迹、不负责客观题判分。

实线表示领域关系，虚线表示依赖/可选关联；Run/Step与Card/Exercise已有对应数据，Agent及本机记录仍为设计。sourceRefs可关联多卡；本批original的chapter/pages为空。字段细节仍以[API](../api-contract.md)与[trace](../trace-contract.md)为准。
