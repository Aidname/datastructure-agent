# 二分查找执行状态 v1

更新：2026-10-19；main `d1ce117` 已合并04的引擎。实现位于 [binarySearch.js](../../shared/algorithms/binarySearch.js)，导出 generateSteps、SOURCE_VERSION、SOURCE_LINES。HTTP入口负责输入校验；直接调用纯引擎前需满足[API输入条件](api-contract.md)。

## 算法及版本

采用闭区间[left,right]，零下标，mid向下取整。重复值命中返回任一实际匹配下标，未找到为-1。初始化left=0、right=array.length-1、mid=null；空数组产生初始化与not-found两步，不访问元素。

schemaVersion 固定为 `1.0`，sourceVersion 当前为 `c-v1`。每步字段：schemaVersion、algorithm、stepIndex、event、sourceVersion、lineId、array、target、variables、done、result。variables 含 left/right/mid；步骤数组从0连续编号，array 和 variables 为独立快照。

probe 显示当前比较位置；边界更新后 mid=null；not-found 结束时 mid=null。仅 found/not-found 的 done=true，result 分别为命中下标/-1；其他步骤 result=null。

## 当前源码映射

API 的 sourceLines 是当前引擎导出的13行展示片段，不是完整可独立编译的 C 程序。以下为实际稳定映射；事件名称与 lineId 不必相同。

| event | lineId | 展示语句 |
|---|---|---|
| init | init-left | int left = 0; |
| probe | calc-mid | int mid = left + (right - left) / 2; |
| move-left | update-left | left = mid + 1; |
| move-right | update-right | right = mid - 1; |
| found | found | return mid; |
| not-found | not-found | return -1; |

其余源码行标识为 init-right、loop-check、probe-match、probe-less、probe-greater、loop-end、loop-end-2；消费者使用 API 的 sourceLines 渲染，避免自行维护第二份代码。

## 标准轨迹

输入 `[1,3,5,7,9]`，target=7；当前引擎输出5步，result=3：

| stepIndex | event | left | right | mid | lineId | done | result |
|---|---|---|---|---|---|---|---|
| 0 | init | 0 | 4 | null | init-left | false | null |
| 1 | probe | 0 | 4 | 2 | calc-mid | false | null |
| 2 | move-left | 3 | 4 | null | update-left | false | null |
| 3 | probe | 3 | 4 | 3 | calc-mid | false | null |
| 4 | found | 3 | 4 | 3 | found | true | 3 |

[单步人工样例](../../shared/examples/step.example.json)现与标准轨迹第0步一致；样例文件本身仍不是运行证据。[后端核验记录](backend-check-20261019.md)记录独立检查范围；08交叉验收与消费者联调仍待完成。

## 消费者联调边界

03播放任意step时，02/05/07应共享同一runId/stepIndex；回看读取已有步骤，不重新生成轨迹。Agent引用应固定到被问步骤，切换步骤不改写历史引用。前端挂载、通知、重置和销毁接口仍需02/03协同确认。

现有 Schema 约束字段类型、枚举及部分范围；安全整数、有序性、索引关系、事件/result一致性和快照独立性需业务验证。npm run check 不执行 Schema 或算法正确性验证。已实现行为与待确认事项见[接口对齐清单](contract-alignment.md)。
