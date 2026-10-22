// Loaded explicitly by tests with --import; never imported by the application.
const original = globalThis.fetch;
globalThis.fetch = async (url, options) => {
  if (!String(url).startsWith('https://api.deepseek.com/')) return original(url, options);
  const content = JSON.parse(options.body).messages.at(-1).content;
  if (content.includes('TEST_TIMEOUT_BODY')) return { ok: true, json: () => new Promise((_, reject) => {
    options.signal.addEventListener('abort', () => reject(Object.assign(new Error('abort'), { name: 'AbortError' })), { once: true });
  }) };
  if (content.includes('TEST_FAILURE')) return { ok: false, status: 500, text: async () => 'sensitive-upstream-diagnostic' };
  return { ok: true, json: async () => ({ model: 'local-test-provider', choices: [{ message: { content: '请观察当前区间和中点。' } }],
    ...(content.includes('TEST_UNKNOWN_USAGE') ? {} : { usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 } }) }) };
};
