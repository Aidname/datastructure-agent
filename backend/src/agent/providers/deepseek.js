export class DeepSeekProvider {
  constructor(apiKey) {
    this.apiKey = apiKey || process.env.DEEPSEEK_API_KEY;
    if (!this.apiKey) {
      throw new Error('DEEPSEEK_API_KEY 未配置');
    }
    this.model = process.env.DEEPSEEK_MODEL || 'deepseek-chat';
    this.timeoutMs = Number(process.env.MODEL_TIMEOUT_MS) || 15000;
  }

  async chat(messages, options = {}) {
    const timeoutMs = options.timeoutMs || this.timeoutMs;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const body = JSON.stringify({
      model: this.model,
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 1024,
      stream: false
    });

    let response;
    try {
      response = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body,
        signal: controller.signal
      });
    } catch (err) {
      clearTimeout(timer);
      if (err.name === 'AbortError') {
        throw new Error('MODEL_TIMEOUT');
      }
      throw new Error('MODEL_CALL_FAILED');
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`MODEL_CALL_FAILED: DeepSeek API ${response.status} ${errText.slice(0, 200)}`);
    }

    const data = await response.json();
    const usage = data.usage || null;

    return {
      content: data.choices?.[0]?.message?.content || '',
      model: data.model || this.model,
      cost: usage ? this.estimateCost(usage) : null,
      usage: usage ? {
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens
      } : null
    };
  }

  estimateCost(usage) {
    if (!usage) return null;
    const inputCost = (usage.prompt_tokens / 1_000_000) * 1;
    const outputCost = (usage.completion_tokens / 1_000_000) * 2;
    return Math.round((inputCost + outputCost) * 10000) / 10000;
  }
}
