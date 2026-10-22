import assert from 'node:assert/strict';
import { test } from 'node:test';
import { retrieveKnowledge, knowledgeResponse, loadKnowledgeCards, verifiedCards, isStepQuestion, sourceRef } from '../backend/src/knowledge/retrieve.js';
import { buildPrompt } from '../backend/src/agent/prompt.js';

test('question retrieval ranks each knowledge topic ahead of the current event', () => {
  const cases = [
    ['为什么数组必须有序？','bs-k01'], ['为什么要先排好序','bs-k01'],
    ['left=right就结束了吗','bs-k02'], ['为什么向下取整','bs-k03'],
    ['LEFT = MID + 1 为什么加1','bs-k04'], ['为什么 right=mid-1','bs-k05'],
    ['left大于right时怎么办','bs-k06'], ['空数组怎么处理','bs-k07'],
    ['数组只有一个元素怎么办','bs-k07'], ['重复元素会返回第一个吗','bs-k08'],
    ['时间复杂度为什么是对数','bs-k09'], ['保存轨迹占多少内存','bs-k09'],
    ['mid为什么是null','bs-k10']
  ];
  for (const [question,id] of cases) {
    const result = retrieveKnowledge(question);
    assert.equal(result.status,'matched'); assert.equal(result.cards[0].id,id,question);
    assert.ok(result.matches[0].score > 0); assert.ok(result.matches[0].matchedTerms.length > 0);
  }
});

test('no-match and unknown topics do not manufacture citations or semantic confidence', () => {
  for (const q of ['今天的天气预报','红黑树怎样旋转','量子计算超导比特']) {
    const result = retrieveKnowledge(q);
    assert.equal(result.status,'no-match'); assert.deepEqual(result.cards,[]);
  }
  assert.deepEqual(retrieveKnowledge('为什么有序','linked-list').cards,[]);
  assert.equal(isStepQuestion('请解释当前步骤'),true);
  assert.equal(isStepQuestion('这一步依据是什么？'),true);
  assert.equal(isStepQuestion('为什么数组必须有序'),false);
});

test('only verified cards with provenance in the selected topic can enter retrieval', () => {
  const good = loadKnowledgeCards()[0];
  const cards = [ {...good,id:'draft',verified:false}, {...good,id:'other-topic',topicId:'linked-list'},
    {...good,id:'no-source',sourceId:''}, {...good,id:'no-version',version:null}, good, good ];
  assert.deepEqual(retrieveKnowledge('为什么有序','binary-search',{cards}).cards.map(c=>c.id),[good.id]);
  assert.equal(verifiedCards('binary-search',cards).length,1);
  const ref = sourceRef(good);
  assert.equal(ref.sourceType,'original'); assert.equal(ref.chapter,null); assert.equal(ref.pages,null);
  assert.equal(ref.version,good.version);
});

test('ranking is stable, bounded, does not mutate cards, and Latin keywords use boundaries', () => {
  const cards = loadKnowledgeCards(); const before = JSON.stringify(cards);
  const a = retrieveKnowledge('mid 为什么是 null','binary-search',{limit:1,cards});
  assert.equal(a.cards.length,1); assert.equal(a.cards[0].id,'bs-k10');
  assert.deepEqual(a,retrieveKnowledge('mid 为什么是 null','binary-search',{limit:1,cards}));
  assert.equal(JSON.stringify(cards),before);
  assert.equal(retrieveKnowledge('midnight leftover copyright').status,'no-match');
});

test('knowledge HTTP response supports verified catalog/search, provenance and validation', () => {
  const catalog = knowledgeResponse(new URLSearchParams('topicId=binary-search'));
  assert.equal(catalog.status,200); assert.equal(catalog.body.cards.length,10);
  assert.equal(catalog.body.retrieval.status,'catalog');
  assert.ok(catalog.body.cards.every(c=>c.verified && !('review' in c)));
  const search = knowledgeResponse(new URLSearchParams({q:'为什么必须有序',limit:'1'}));
  assert.equal(search.body.cards[0].id,'bs-k01'); assert.equal(search.body.sourceRefs[0].cardId,'bs-k01');
  assert.equal(search.body.retrieval.matches[0].cardId,'bs-k01');
  for (const params of [{q:''},{q:' '},{q:'x'.repeat(2001)},{limit:'0'},{limit:'11'},{limit:'1.5'},{limit:''},{topicId:''}]) {
    assert.equal(knowledgeResponse(new URLSearchParams(params)).status,400,JSON.stringify(params));
  }
  assert.deepEqual(knowledgeResponse(new URLSearchParams({q:'有序',topicId:'unknown'})).body.cards,[]);
});

test('retrieval input rejects invalid types and lengths rather than silently coercing', () => {
  for (const q of ['',null,{},'x'.repeat(2001)]) assert.throws(()=>retrieveKnowledge(q),TypeError);
  for (const limit of [0,11,1.5,'1']) assert.throws(()=>retrieveKnowledge('中点','binary-search',{limit}),TypeError);
});

test('prompt includes every selected card while keeping examples separate from the real step', () => {
  const cards = loadKnowledgeCards();
  const selected = [cards[0],cards[2]];
  const step = {array:[2,4,6],target:4,stepIndex:1,event:'probe',variables:{left:0,right:2,mid:1}};
  const prompt = buildPrompt({},step,1,'为什么必须有序',selected).map(m=>m.content).join('\n');
  for (const card of selected) { assert.ok(prompt.includes(card.id)); assert.ok(prompt.includes(card.content)); }
  assert.match(prompt,/目标值: 4/); assert.match(prompt,/A\[mid\] 的值: 4/);
  assert.ok(prompt.includes('不要把不同卡片中的示例误当成当前运行'));
});
