// In-memory conversation data is owned by the server, never accepted as client history.
export const MAX_TURNS = 10;
export const MAX_HISTORY_CHARS = 8000;
const ID = /^[a-zA-Z0-9_-]{8,80}$/;

export function validateConversation(body) {
  if (body?.conversationId === undefined && body?.turnId === undefined) return true;
  return typeof body?.conversationId === 'string' && ID.test(body.conversationId) &&
    typeof body?.turnId === 'string' && ID.test(body.turnId);
}

export function createConversationStore({ now = Date.now, maxSessions = 200, ttlMs = 3600000 } = {}) {
  const sessions = new Map();
  return {
    begin(body, req) {
      if (!body.conversationId) return { history: [], commit() {}, release() {} };
      const time = now();
      for (const [key, value] of sessions) if (!value.busy && time - value.touched >= ttlMs) sessions.delete(key);
      const key = JSON.stringify([req?.socket?.remoteAddress || 'local', body.runId, body.conversationId]);
      let session = sessions.get(key);
      if (!session) {
        if (sessions.size >= maxSessions) {
          const oldest = [...sessions].filter(([, value]) => !value.busy).sort((a,b) => a[1].touched - b[1].touched)[0];
          if (oldest) sessions.delete(oldest[0]);
          else return { error: { status: 429, body: { error: { code: 'CONVERSATION_BUSY', message: '辅导会话繁忙，请稍后重试。' } } } };
        }
        session = { turns: [], touched: time, busy: false }; sessions.set(key, session);
      }
      const fingerprint = JSON.stringify([body.stepIndex, body.question, body.hintLevel ?? 1]);
      const cached = session.turns.find(turn => turn.turnId === body.turnId);
      if (cached) return cached.fingerprint === fingerprint ? { cached: structuredClone(cached.response) } :
        { error: { status: 400, body: { error: { code: 'INVALID_INPUT', message: '同一问题标识不能用于不同请求。' } } } };
      if (session.busy) return { error: { status: 409, body: { error: { code: 'CONVERSATION_BUSY', message: '上一个问题还在回答，请稍后重试。' } } } };
      session.busy = true; session.touched = time;
      return {
        history: session.turns.map(({ question, answer, stepIndex, topicQuestion }) => ({ question, answer, stepIndex, topicQuestion })),
        commit(response, topicQuestion) {
          const turn = { turnId: body.turnId, fingerprint, question: body.question, answer: response.body.answer,
            stepIndex: body.stepIndex, topicQuestion, response: structuredClone(response) };
          session.turns.push(turn);
          const length = () => session.turns.reduce((sum, item) => sum + item.question.length + item.answer.length + item.topicQuestion.length, 0);
          while (session.turns.length > MAX_TURNS || length() > MAX_HISTORY_CHARS) session.turns.shift();
        },
        release() { session.busy = false; session.touched = now(); }
      };
    }
  };
}

export const conversations = createConversationStore();

export function resolveFollowup(question, history) {
  const text = question.trim();
  const previous = history.at(-1);
  // Explicit current-step questions use the freshly selected step, not an old topic.
  const followup = previous && !/(当前|现在|这一步|下一步)/.test(text) && [
    /^(那|所以|这里|那里|这个|那个|它)?(能|可以|请|你|再|给我|帮我|说|讲|解释|详细|一点|一下|更|具体|展开|吗|呢|吧|[，,？?\s])+$/,
    /^(那|所以)?(这里|那里|这个|那个|它)?(为啥|为什么|什么意思|是什么意思|怎么理解|怎么来的|有什么区别)[呢吗？?\s]*$/,
    /^(我)?(还是|仍然)?(没[听看]?懂|不太?明白)[。？?\s]*$/,
    /^(能|可以|请)?(再)?(换[个种一]?说法|换[个种一]?解释|换[个一]?例子|举[个一]?例子)(讲讲|解释|一下|吗|呢|[？?\s])*$/
  ].some(pattern => pattern.test(text));
  const topicQuestion = followup ? previous.topicQuestion : text;
  return { followup: Boolean(followup), topicQuestion, query: followup ? (topicQuestion + ' ' + text).slice(0,2000) : text };
}
