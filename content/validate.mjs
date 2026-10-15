// 成员06自编内容检查；不是业务引擎。verified以本批规则与确定性检查为准。
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const read=async p=>JSON.parse(await readFile(new URL(p,import.meta.url),'utf8'));
const [cards,questions,sources,cases,coverage]=await Promise.all([
  read('./knowledge/cards.json'),read('./exercises/binary-search.json'),read('./sources/manifest.json'),
  read('./exercises/binary-search-oracle.json'),read('./coverage/curriculum-plan.json')
]);
const requireKeys=(obj,keys)=>{for(const key of keys)assert.ok(Object.hasOwn(obj,key),`缺字段${key}`)};
const unique=rows=>{assert.equal(new Set(rows.map(r=>r.id)).size,rows.length,'ID重复');};
for(const list of [cards,questions,sources,cases,coverage]){assert.ok(Array.isArray(list));unique(list);}
const sourceById=new Map(sources.map(s=>[s.id,s]));
const cardById=new Map(cards.map(c=>[c.id,c]));
const checkText=x=>assert.ok(typeof x==='string'&&x.trim().length>0,'空文本');
function checkSource(s){
  assert.equal(typeof s.verified,'boolean');
  if(s.verified){
    checkText(s.verification?.reviewer);checkText(s.verification?.reviewedAt);checkText(s.verification?.evidence);
    if(s.type==='textbook'){assert.ok(s.chapter);assert.ok(s.pages);}
  }
}
sources.forEach(checkSource);
for(const c of cards){
  requireKeys(c,['id','topicId','title','content','keywords','sourceId','chapter','pages','verified']);
  assert.equal(c.topicId,'binary-search');checkText(c.title);checkText(c.content);
  assert.ok(c.keywords.length);c.keywords.forEach(checkText);assert.equal(typeof c.verified,'boolean');
  const s=sourceById.get(c.sourceId);assert.ok(s,'来源ID无效');
  if(c.verified){assert.ok(s.verified,'来源未核验');if(s.type==='textbook'){assert.ok(c.chapter);assert.ok(c.pages);}}
}
function checkQuestion(q){
  requireKeys(q,['id','topicId','type','prompt','context','options','answer','explanation','hints','sourceRefs','verified']);
  checkText(q.prompt);checkText(q.explanation);assert.equal(q.topicId,'binary-search');
  assert.equal(typeof q.verified,'boolean');assert.equal(q.hints.length,3);q.hints.forEach(checkText);
  assert.ok(Array.isArray(q.options));assert.ok(q.sourceRefs.length);
  for(const r of q.sourceRefs){
    requireKeys(r,['cardId','sourceId','chapter','pages']);
    const c=cardById.get(r.cardId);assert.ok(c,'关联卡不存在');assert.equal(r.sourceId,c.sourceId);
    assert.deepEqual(r.chapter,c.chapter);assert.deepEqual(r.pages,c.pages);
    if(q.verified)assert.ok(c.verified&&sourceById.get(r.sourceId).verified,'题目依赖仍为草稿');
  }
  if(q.type==='choice'){
    assert.ok(q.options.length>=2);unique(q.options);q.options.forEach(o=>{checkText(o.id);checkText(o.text)});
    assert.equal(typeof q.answer,'string');assert.ok(q.options.some(o=>o.id===q.answer),'答案不在选项内');
  }else{
    assert.equal(q.options.length,0);
    if(q.type==='judgement')assert.equal(typeof q.answer,'boolean');
    else {assert.equal(q.type,'value');assert.ok(Number.isSafeInteger(q.answer));}
  }
  const c=q.context;requireKeys(c,['array','target','left','right','mid','event','sourceVersion']);
  assert.equal(c.indexBase,0);assert.equal(c.interval,'closed');assert.ok(Number.isSafeInteger(c.target));
  assert.ok(c.array.every(Number.isSafeInteger));assert.ok(c.array.every((x,i)=>i===0||c.array[i-1]<=x));
  assert.ok(Number.isSafeInteger(c.left)&&c.left>=0&&c.left<=c.array.length);
  assert.ok(Number.isSafeInteger(c.right)&&c.right>=-1&&c.right<c.array.length);
  if(c.event==='init'){assert.equal(c.left,0);assert.equal(c.right,c.array.length-1);assert.equal(c.mid,null);}
  else if(c.event==='probe'){assert.ok(c.left<=c.right);assert.equal(c.mid,c.left+Math.floor((c.right-c.left)/2));}
  else if(['before-probe','move-left','move-right'].includes(c.event))assert.equal(c.mid,null);
  else assert.fail('未知题目情境');
  if(q.verified){assert.equal(c.algorithmContractId,'binary-search-content-v1');if(c.sourceVersion!==null)checkText(c.sourceVersion);}
}
questions.forEach(checkQuestion);
// 用独立的候选实现交叉核对手工预期；不调用成员04引擎，不输出运行契约快照。
function simulate(array,target){
  let left=0,right=array.length-1,result=-1;const probes=[];
  while(left<=right){const mid=left+Math.floor((right-left)/2);probes.push([left,right,mid]);
    if(array[mid]===target){result=mid;break;}
    if(array[mid]<target)left=mid+1;else right=mid-1;
  }
  return {probes,final:[left,right],result};
}
for(const c of cases){checkText(c.why);assert.deepEqual(simulate(c.array,c.target),{probes:c.probes,final:c.final,result:c.result},c.id);}
const byId=new Map(questions.map(q=>[q.id,q]));
const q1=byId.get('bs-q01');assert.equal(q1.answer,q1.context.left+Math.floor((q1.context.right-q1.context.left)/2));
const q2=byId.get('bs-q02');assert.ok(q2.context.array[q2.context.mid]<q2.context.target);assert.equal(q2.options.find(o=>o.id===q2.answer).text,'left=3，right=4');
const q3=byId.get('bs-q03');assert.ok(q3.context.array[q3.context.mid]>q3.context.target);assert.equal(q3.answer,q3.context.mid-1);
const q4=byId.get('bs-q04');assert.equal(q4.answer,q4.context.left>q4.context.right);
for(const id of ['bs-q05','bs-q06','bs-q07','bs-q08']){const q=byId.get(id);assert.equal(q.answer,simulate(q.context.array,q.context.target).result,id);}
const q9=byId.get('bs-q09');assert.equal(Number(q9.options.find(o=>o.id===q9.answer).text),simulate(q9.context.array,q9.context.target).result);
const q10=byId.get('bs-q10');assert.equal(q10.context.mid,null);assert.equal(q10.options.find(o=>o.id===q10.answer).id,'C');
for(const u of coverage){
  assert.ok(['planned','draft','available','verified'].includes(u.contentStatus));
  for(const id of u.knowledgeCardIds)assert.ok(cardById.has(id));
  for(const id of u.exerciseIds)assert.ok(byId.has(id));
  if(u.contentStatus==='available'){assert.ok(u.knowledgeCardIds.length&&u.exerciseIds.length);assert.ok(u.knowledgeCardIds.every(id=>cardById.get(id).verified));assert.ok(u.exerciseIds.every(id=>byId.get(id).verified));}
  if(u.contentStatus==='verified'){assert.ok(u.officialOutlineRef);assert.ok(u.knowledgeCardIds.length&&u.exerciseIds.length);assert.ok(u.knowledgeCardIds.every(id=>cardById.get(id).verified));assert.ok(u.exerciseIds.every(id=>byId.get(id).verified));}
}
// 负向检查：不能引用仍为草稿的卡片；原始来源不要求教材页码。
const targetCard=cardById.get(questions[0].sourceRefs[0].cardId);
targetCard.verified=false;assert.throws(()=>checkQuestion(questions[0]));targetCard.verified=true;
const invalidChoice=structuredClone(q2);invalidChoice.answer='Z';assert.throws(()=>checkQuestion(invalidChoice));
const boolString=structuredClone(q4);boolString.answer='false';assert.throws(()=>checkQuestion(boolString));
const eligibleCards=cards.filter(c=>c.verified&&sourceById.get(c.sourceId).verified);
const eligibleQuestions=questions.filter(q=>q.verified&&q.sourceRefs.every(r=>cardById.get(r.cardId).verified&&sourceById.get(r.sourceId).verified));
console.log(`内容检查通过：${cards.length}张卡、${questions.length}道题、${cases.length}组手工预期、${coverage.length}个候选知识单元。`);
console.log(`内容可用：${eligibleCards.length}张卡、${eligibleQuestions.length}道题。项目自编，无需教材核验；实际引擎/接口/界面联调未在本脚本验收。`);

// 按拟定读取方式做消费检查，不接入他人后端模块。
assert.equal(eligibleCards.length,10);assert.equal(eligibleQuestions.length,10);
const publicKeys=['id','topicId','version','type','prompt','context','options'];
const publicQuestions=eligibleQuestions.map(q=>Object.fromEntries(publicKeys.map(k=>[k,q[k]])));
for(const q of publicQuestions){for(const key of ['answer','explanation','hints','review'])assert.ok(!Object.hasOwn(q,key));}
const queries=[['有序','bs-k01'],['闭区间','bs-k02'],['向下取整','bs-k03'],['更新left','bs-k04'],['更新right','bs-k05'],['未找到','bs-k06'],['空数组','bs-k07'],['最左','bs-k08'],['复杂度','bs-k09'],['mid=null','bs-k10']];
for(const [word,id]of queries){const matches=eligibleCards.filter(c=>[c.title,c.content,...c.keywords].some(t=>t.includes(word)));assert.ok(matches.some(c=>c.id===id),word+'未命中预期卡');}
const strictGrade=(q,a)=>{if(q.type==='choice')assert.ok(typeof a==='string'&&q.options.some(o=>o.id===a));else if(q.type==='judgement')assert.equal(typeof a,'boolean');else assert.ok(Number.isSafeInteger(a));return a===q.answer;};
for(const q of eligibleQuestions){assert.equal(strictGrade(q,q.answer),true);let wrong=q.type==='choice'?q.options.find(o=>o.id!==q.answer).id:q.type==='judgement'?!q.answer:q.answer+1;assert.equal(strictGrade(q,wrong),false);}
assert.throws(()=>strictGrade(byId.get('bs-q04'),'false'));
for(const bad of ['',null,'3abc','3',true,NaN,Infinity])assert.throws(()=>strictGrade(byId.get('bs-q01'),bad));
console.log('消费检查通过：10组关键词、公开题目不泄露答案、10题正确/错误答案及非法类型检查。');
