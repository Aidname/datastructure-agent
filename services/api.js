/**
 * 闭区间二分查找，输出标准step快照，对齐spec文档案例
 * @param {number[]} arr 升序数组
 * @param {number} target 目标
 * @returns {Array} steps
 */
window.getSearchSteps = function(arr, target) {
  const steps = [];
  let left = 0;
  let right = arr.length - 1;
  // stepIndex=0 初始化
  steps.push({
    stepIndex:0,
    event:"init",
    variables:{left:left, right:right, mid:null},
    result:null,
    done:false
  });

  while(left <= right){
    const mid = Math.floor(left + (right - left)/2);
    // 计算mid快照
    steps.push({
      stepIndex: steps.length,
      event:"calc-mid",
      variables:{left:left, right:right, mid:mid},
      result:null,
      done:false
    });

    if(arr[mid] === target){
      steps.push({
        stepIndex: steps.length,
        event:"found",
        variables:{left:left, right:right, mid:mid},
        result:mid,
        done:true
      });
      break;
    }else if(arr[mid] < target){
      left = mid + 1;
      steps.push({
        stepIndex: steps.length,
        event:"move-left",
        variables:{left:left, right:right, mid:null},
        result:null,
        done:false
      });
    }else{
      right = mid -1;
      steps.push({
        stepIndex: steps.length,
        event:"move-right",
        variables:{left:left, right:right, mid:null},
        result:null,
        done:false
      });
    }
  }

  // 循环结束还没done，代表未找到
  const last = steps[steps.length-1];
  if(!last.done){
    steps.push({
      stepIndex: steps.length,
      event:"not-found",
      variables:{left:left, right:right, mid:null},
      result:-1,
      done:true
    })
  }
  return steps;
}
