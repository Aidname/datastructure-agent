import assert from 'node:assert/strict';
import {test} from 'node:test';
import {refersToRun} from '../backend/src/agent/step-question.js';
import {generateSteps} from '../shared/algorithms/binarySearch.js';
import {buildPrompt} from '../backend/src/agent/prompt.js';

test('numeric grounding follows actual inputs rather than hardcoded example values and leaves unrelated nouns out',()=>{
 for(const [array,target,question]of [
  [[1,3,5,7,9],7,'为什么是到7不是到5'],
  [[2,4,8,16],16,'怎么直接选8不选4'],
  [[-9,-5,-1,3],3,'为什么跳过-5去-1'],
  [[10,20,30],30,'为什么选３０而不是２０']
 ]){
   const run=generateSteps(array,target),step=run.steps[2];
   assert.equal(refersToRun(question,run,step),true,question);
   const prompt=buildPrompt(run,step,1,question,[]).at(-1).content;
   assert.ok(prompt.includes('【上一步的服务端快照，不是当前状态】'));
   assert.ok(prompt.includes('"comparedValue":'+array[run.steps[1].variables.mid]));
 }
 const run=generateSteps([1,3,5,7,9],7),step=run.steps[2];
 for(const question of ['为什么天气7度不是5度','为什么电影7比5好看','为什么选999而不是888','午夜midnight是什么意思'])assert.equal(refersToRun(question,run,step),false,question);
 assert.equal(refersToRun('这是什么意思？',run,step),true);
});
