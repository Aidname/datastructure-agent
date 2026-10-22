// dom元素
const arrInput = document.querySelector("#arrInput");
const targetInput = document.querySelector("#targetInput");
const fillDemo = document.querySelector("#fillDemo");
const startBtn = document.querySelector("#startBtn");
const msgBox = document.querySelector("#msgBox");

const varLeft = document.querySelector("#varLeft");
const varRight = document.querySelector("#varRight");
const varMid = document.querySelector("#varMid");
const codePanel = document.querySelector("#codePanel");

const prevBtn = document.querySelector("#prevBtn");
const nextBtn = document.querySelector("#nextBtn");
const resetBtn = document.querySelector("#resetBtn");
const stepText = document.querySelector("#stepText");

// 全局状态
let runSteps = [];
let currentStepIdx = 0;

// 填入示例按钮，不自动执行
fillDemo.addEventListener("click", ()=>{
  arrInput.value = "1,3,5,7,9";
  targetInput.value = "7";
  clearMsg();
});

// 清空提示
function clearMsg(){
  msgBox.innerText = "";
}
function showErr(text){
  msgBox.innerText = text;
}

/**
 * 输入校验
 */
function parseInput(){
  const arrStr = arrInput.value.trim();
  const targetStr = targetInput.value.trim();
  if(!targetStr){
    showErr("目标不能为空");
    return null;
  }
  const target = Number(targetStr);
  if(isNaN(target)){
    showErr("目标必须是数字");
    return null;
  }

  let arr = [];
  if(arrStr !== ""){
    const parts = arrStr.split(",");
    for(let p of parts){
      const numStr = p.trim();
      const num = Number(numStr);
      if(numStr === "" ) continue;
      if(isNaN(num)){
        showErr("数组包含非法数字");
        return null;
      }
      arr.push(num);
    }
  }
  // 判断是否升序
  for(let i=1;i<arr.length;i++){
    if(arr[i] < arr[i-1]){
      showErr("数组必须按升序排列");
      return null;
    }
  }
  return {arr, target};
}

/**
 * 更新页面变量面板
 */
function renderStep(step){
  const v = step.variables;
  varLeft.innerText = v.left;
  varRight.innerText = v.right;
  varMid.innerText = v.mid === null ? "未计算" : v.mid;
  stepText.innerText = `${currentStepIdx+1} / ${runSteps.length}`;
  // 简单代码高亮示意
  codePanel.innerHTML = codePanel.innerText.replace(/<span class="highlight-line">|<\/span>/g,"");
}

// 开始分析
startBtn.addEventListener("click", async () => {
  clearMsg();
  const parsed = parseInput();
  if(!parsed) return;
  const { arr, target } = parsed;
  // 调用后端接口拿步骤
  const res = await fetch("/api/algorithms/binary-search/runs", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      array: arr,
      target: target
    })
  })
  const data = await res.json()
  runSteps = data.steps;
  currentStepIdx = 0;
  renderStep(runSteps[currentStepIdx]);
  toggleButtonState();
});


// 上一步
prevBtn.addEventListener("click",()=>{
  if(currentStepIdx > 0){
    currentStepIdx--;
    renderStep(runSteps[currentStepIdx]);
    toggleButtonState();
  }
})
// 下一步
nextBtn.addEventListener("click",()=>{
  if(currentStepIdx < runSteps.length -1){
    currentStepIdx++;
    renderStep(runSteps[currentStepIdx]);
    toggleButtonState();
  }
})

// 重置
resetBtn.addEventListener("click",()=>{
  runSteps = [];
  currentStepIdx = 0;
  arrInput.value = "";
  targetInput.value = "";
  clearMsg();
  varLeft.innerText = "-";
  varRight.innerText = "-";
  varMid.innerText = "-";
  stepText.innerText = "未运行";
  toggleButtonState();
})

// 按钮禁用状态
function toggleButtonState(){
  prevBtn.disabled = currentStepIdx <= 0;
  nextBtn.disabled = currentStepIdx >= runSteps.length -1;
}
