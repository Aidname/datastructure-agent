import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {publicQuestion,parseAnswer,gradeFeedback} from '../frontend/src/features/exercises/model.js';
import {createRecordStore,learningSummary,STORAGE_KEY,MAX_RECORDS} from '../frontend/src/features/records/store.js';
const questions=(JSON.parse(await readFile(new URL('../content/exercises/binary-search.json',import.meta.url),'utf8'))).map(publicQuestion);
const q=questions[0];
function storage(){const map=new Map();return {getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k),map};}
let serial=0;
const make=s=>createRecordStore({storage:s,newId:()=>String(++serial)});
const wrong=(store,question=q)=>store.addAttempt({question,answer:0,correct:false,feedback:{correct:false,hint:'观察区间'}});
test('public catalog strips private fields and preserves false/zero/negative typed answers',()=>{
 const raw={...q,answer:3,hints:['secret'],explanation:'secret'};
 assert.equal(Object.hasOwn(publicQuestion(raw),'answer'),false);
 assert.equal(Object.hasOwn(publicQuestion(raw),'hints'),false);
 assert.equal(parseAnswer(q,'0'),0);assert.equal(parseAnswer(q,'-1'),-1);
 assert.equal(parseAnswer(questions.find(q=>q.type==='judgement'),'false'),false);
 for(const value of ['', ' ', '1.2','NaN','Infinity','9007199254740992'])assert.throws(()=>parseAnswer(q,value));
 assert.throws(()=>publicQuestion({...q,context:{...q.context,array:[null]}}));
 assert.throws(()=>gradeFeedback({correct:false,correctAnswer:3},1));
 assert.deepEqual(gradeFeedback({correct:false,hint:'h',correctAnswer:3},1),{correct:false,hint:'h'});
});
test('reload, progressive hints on one attempt, and immutable snapshots',()=>{
 const s=storage(),store=make(s),r=wrong(store);
 assert.throws(()=>store.addHint(r.id,3,{correct:false,correctAnswer:3,explanation:'x'}));
 store.addHint(r.id,2,{correct:false,hint:'规则'});store.addHint(r.id,3,{correct:false,correctAnswer:3,explanation:'取整'});
 assert.equal(store.list().length,1);assert.deepEqual(make(s).list()[0].hintsUsed,[1,2,3]);
 const copy=store.list();copy[0].question.prompt='changed';assert.equal(store.list()[0].question.prompt,q.prompt);
});
test('progress uses current versions and latest answer; history stays reviewable',()=>{
 const store=make(storage());store.addAttempt({question:q,answer:3,correct:true,feedback:{correct:true}});
 assert.equal(learningSummary(store.list(),[q]).solved,1);wrong(store);
 assert.equal(learningSummary(store.list(),[q]).solved,0);
 assert.equal(learningSummary(store.list(),[{...q,version:'2'}]).attempted,0);
 assert.equal(store.list().length,2);
});
test('clear affects only owned key; cap retains newest attempts',()=>{
 const s=storage();s.setItem('unrelated','keep');const store=make(s);
 for(let i=0;i<MAX_RECORDS+2;i++)wrong(store);
 assert.equal(store.list().length,MAX_RECORDS);assert.equal(make(s).list().length,MAX_RECORDS);
 store.clear();assert.equal(s.getItem(STORAGE_KEY),null);assert.equal(s.getItem('unrelated'),'keep');assert.deepEqual(make(s).list(),[]);
});
test('damaged, denied, and quota storage remain usable without destroying disk data',()=>{
 for(const text of ['{broken',JSON.stringify({schemaVersion:1,attempts:[{question:{options:[null]}}]})]){
  const s=storage();s.setItem(STORAGE_KEY,text);const store=make(s);assert.match(store.status().warning,/损坏/);wrong(store);assert.equal(s.getItem(STORAGE_KEY),text);assert.equal(store.list().length,1);store.clear();assert.equal(store.status().persistent,true);
 }
 const s=storage();const initial=make(s);wrong(initial);const disk=s.getItem(STORAGE_KEY);s.setItem=()=>{throw Error('QuotaExceededError');};
 const quota=make(s);wrong(quota);assert.equal(quota.list().length,2);assert.equal(s.getItem(STORAGE_KEY),disk);assert.match(quota.status().warning,/写入失败/);
 const denied=make(null);wrong(denied);assert.equal(denied.list().length,1);assert.equal(denied.status().persistent,false);
 const unreadable=make({getItem(){throw Error('SecurityError');}});wrong(unreadable);assert.equal(unreadable.list().length,1);
});
test('storage modified by another tab is read before write; deleted attempt cannot regain hints',()=>{
 const s=storage(),a=make(s),b=make(s),r=wrong(a);wrong(b);assert.equal(make(s).list().length,2);
 a.clear();assert.equal(b.addHint(r.id,2,{correct:false,hint:'x'}),false);assert.deepEqual(b.list(),[]);
});
