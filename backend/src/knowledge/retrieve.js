import { readFileSync } from 'node:fs';

const cardsURL = new URL('../../../content/knowledge/cards.json', import.meta.url);
export const RETRIEVAL_METHOD = 'keyword-v1';
const aliases = {
  '有序': ['排好序', '排序', '有序性', 'sorted'],
  '非递减': ['递增', '从小到大'],
  '安全整数': ['小数', '整数限制', 'safe integer'],
  '重复值': ['重复元素', '重复数字', '相同元素'],
  '第一次出现': ['第一个', '首次出现', '第一个位置', 'first occurrence', 'lower_bound'],
  '最右': ['最后一个', '最后一次出现', 'last occurrence'],
  '闭区间': ['包含端点', '两端包含', '左右端点'],
  'left=right': ['left==right', 'left===right', 'left等于right', '左右边界相等', '左边界等于右边界'],
  'left>right': ['left大于right', '左边界大于右边界', '左右边界交叉'],
  '中点': ['中间位置', '中间下标', 'middle'],
  '向下取整': ['取整', '向上取整', '四舍五入', 'ceil', 'round'],
  '更新left': ['left=mid+1', '为什么加一', '为什么加1'],
  '更新right': ['right=mid-1', '为什么减一', '为什么减1'],
  '未找到': ['找不到', '不存在目标', '没有找到'],
  '空数组': ['数组为空', '没有元素', '长度为0', '长度是0', 'empty array'],
  '单元素': ['只有一个', '一个元素', '长度为1', '长度是1', '单个元素'],
  '复杂度': ['效率', '时间复杂度', '对数', 'logn', 'log2n', 'complexity'],
  '空间': ['内存', '额外空间', '存储开销', '空间复杂度'],
  'mid=null': ['mid为空', 'mid是空', 'mid没有值', '中点为空', 'mid为什么是null', 'mid为什么为null', 'mid是null'],
  '未计算': ['还没计算', '尚未计算', '还没算', '中点没算', 'null'],
  '下标和值': ['下标还是值', '索引还是值', '下标与值'],
  'stepIndex': ['步骤编号', '步骤索引', '第几步'],
};
const stopWords = new Set(['为什么','怎么','如何','什么','是否','可以','这个','那个','当前','这步','一步','步骤','解释','一下','依据','请问','查找','算法','二分','二分查找','问题','应该','需要','是不是','计算','返回','一个','元素','数组','情况','处理','结果','位置','比较','更新','规则','内容','资料','数据','实现','进行']);
const segmenter = new Intl.Segmenter('zh-CN', { granularity: 'word' });

function normalize(text) {
  return text.normalize('NFKC').toLowerCase().replace(/[−–]/g, '-').replace(/≤/g, '<=').replace(/≥/g, '>=').replace(/\s+/g, ' ').trim();
}
function contains(text, term) {
  const value = normalize(term);
  if (/^[a-z_][a-z0-9_]*$/.test(value)) {
    return new RegExp(`(^|[^a-z0-9_])${value}($|[^a-z0-9_])`, 'u').test(text);
  }
  return text.replaceAll(' ', '').includes(value.replaceAll(' ', ''));
}
function eligible(card, topicId) {
  return card?.verified === true && card.topicId === topicId &&
    ['id','title','content','sourceId','sourceType','version'].every(key => typeof card[key] === 'string' && card[key].trim());
}
export function loadKnowledgeCards() {
  const cards = JSON.parse(readFileSync(cardsURL, 'utf8'));
  if (!Array.isArray(cards)) throw new Error('INVALID_KNOWLEDGE_CATALOG');
  return cards;
}
export function verifiedCards(topicId, cards = loadKnowledgeCards()) {
  const seen = new Set();
  return cards.filter(card => {
    if (!eligible(card, topicId) || seen.has(card.id)) return false;
    seen.add(card.id); return true;
  });
}
export function sourceRef(card) {
  return { cardId: card.id, title: card.title, sourceId: card.sourceId, sourceType: card.sourceType,
    chapter: card.chapter ?? null, pages: card.pages ?? null, version: card.version, verified: true };
}
export function publicCard(card) {
  return { id: card.id, topicId: card.topicId, title: card.title, content: card.content,
    keywords: Array.isArray(card.keywords) ? card.keywords.filter(k => typeof k === 'string') : [],
    ...Object.fromEntries(Object.entries(sourceRef(card)).filter(([key]) => key !== 'cardId')) };
}

export function retrieveKnowledge(question, topicId = 'binary-search', { limit = 3, cards = loadKnowledgeCards() } = {}) {
  if (typeof question !== 'string' || !question.trim() || question.length > 2000 ||
      typeof topicId !== 'string' || !topicId.trim() || !Number.isInteger(limit) || limit < 1 || limit > 10) {
    throw new TypeError('INVALID_RETRIEVAL_INPUT');
  }
  const query = normalize(question);
  const catalog = verifiedCards(topicId, cards);
  const tokens = [...new Set([...segmenter.segment(query)].filter(part => part.isWordLike)
    .map(part => part.segment).filter(token => token.length >= 2 && !stopWords.has(token)))];
  const ranked = catalog.map(card => {
    let score = 0; const matchedTerms = new Set();
    for (const keyword of Array.isArray(card.keywords) ? card.keywords : []) {
      if (typeof keyword !== 'string' || !keyword.trim()) continue;
      const forms = [keyword, ...(Object.hasOwn(aliases, keyword) ? aliases[keyword] : [])];
      const hit = forms.find(term => contains(query, term));
      if (hit) { score += ['left','right'].includes(normalize(keyword)) ? 6 : 8 + Math.min(normalize(hit).replaceAll(' ', '').length, 8); matchedTerms.add(hit); }
    }
    for (const token of tokens) {
      if (stopWords.has(token)) continue;
      if (contains(normalize(card.title), token)) { score += 6; matchedTerms.add(token); }
      else if (contains(normalize(card.content), token)) {
        const frequency = catalog.filter(c => contains(normalize(c.title + ' ' + c.content), token)).length;
        if (frequency <= Math.max(1, catalog.length / 3)) { score += 3; matchedTerms.add(token); }
      }
    }
    return { card, score, matchedTerms: [...matchedTerms] };
  }).filter(match => match.score >= 6)
    .sort((a,b) => b.score - a.score || a.card.id.localeCompare(b.card.id)).slice(0,limit);
  return { topicId, query: question.trim(), method: RETRIEVAL_METHOD, status: ranked.length ? 'matched' : 'no-match', matches: ranked,
    cards: ranked.map(item => item.card) };
}

export function isStepQuestion(question) {
  return normalize(question).replace(/(这一步骤|这一步|当前步骤|当前状态|这步|当前|下一步|发生了什么|为什么|怎么|如何|依据|是什么|解释|分析|一下|请问|请|帮我|这样|做|的|呢|吗|呀|[\s?？。!！])/gu, '') === '';
}

export function knowledgeResponse(params) {
  const topicId = params.get('topicId') ?? 'binary-search';
  const q = params.get('q');
  const rawLimit = params.get('limit');
  const limit = rawLimit === null ? (q === null ? 10 : 3) : Number(rawLimit);
  if (!topicId.trim() || topicId.length > 100 || (rawLimit !== null && !/^[1-9]\d*$/.test(rawLimit)) || !Number.isInteger(limit) || limit < 1 || limit > 10 ||
      (q !== null && (!q.trim() || q.length > 2000))) {
    return { status: 400, body: { error: { code: 'INVALID_INPUT', message: 'topicId须非空；q须为1至2000字符；limit须为1至10的整数' } } };
  }
  try {
    const result = q === null ? { topicId, query: null, method: RETRIEVAL_METHOD, status: 'catalog', cards: verifiedCards(topicId).slice(0,limit), matches: [] } : retrieveKnowledge(q, topicId, { limit });
    return { status: 200, body: { topicId, query: result.query, cards: result.cards.map(publicCard), sourceRefs: result.cards.map(sourceRef),
      retrieval: { method: result.method, status: result.status, matches: result.matches.map(({card,score,matchedTerms}) => ({cardId:card.id,score,matchedTerms})) } } };
  } catch {
    return { status: 503, body: { error: { code: 'KNOWLEDGE_UNAVAILABLE', message: '已核验知识资料暂不可用' } } };
  }
}
