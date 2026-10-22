import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseInput, validateRun } from '../frontend/src/features/workbench/input.js';
test('workbench parses empty, negative, duplicate and safe boundary integers without sorting',()=>{
  assert.deepEqual(parseInput('', '7'),{array:[],target:7});
  assert.deepEqual(parseInput('-3，-3, +2', '+2'),{array:[-3,-3,2],target:2});
  assert.deepEqual(parseInput('-9007199254740991,9007199254740991','9007199254740991').array,[-9007199254740991,9007199254740991]);
});
test('workbench rejects illegal input before HTTP creation',()=>{
  for(const [array,target] of [['1,,2','1'],['1,','1'],['1,a','1'],['3,1','1'],['1.5,2','2'],['1,2','1.0'],['Infinity','1'],['1',''],['1','9007199254740992'],[Array(101).fill('1').join(','),'1']])assert.throws(()=>parseInput(array,target),Error,JSON.stringify([array,target]));
});
test('workbench rejects missing run, steps and stable source mapping',()=>{
  const valid={runId:'r',algorithm:'binary-search',sourceVersion:'c-v1',sourceLines:[{lineId:'init-left',text:'int left=0;'}],steps:[{stepIndex:0,lineId:'init-left',array:[],variables:{left:0,right:-1,mid:null}}]};
  assert.equal(validateRun(valid),valid);
  for(const run of [null,{}, {...valid,steps:[]},{...valid,sourceLines:[]},{...valid,steps:[{...valid.steps[0],lineId:'missing'}]},{...valid,steps:[{...valid.steps[0],variables:null}]}])assert.throws(()=>validateRun(run),Error);
});
