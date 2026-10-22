export class DeepSeekProvider {
  constructor(apiKey) {
    this.apiKey = apiKey || process.env.DEEPSEEK_API_KEY;
    if (!this.apiKey) {
      throw new Error('DEEPSEEK_API_KEY 未配置');
    }
    this.model = process.env.DEEPSEEK_MODEL || 'deepseek-chat';
  }

  async chat(messages, options = {}) {
    const body = JSON.stringify({
      model: this.model,
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 1024,
      stream: false
    });

    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`DeepSeek API ${response.status}: ${errText}`);
    }

    const data = await response.json();
    return {
      content: data.choices?.[0]?.message?.content || '',
      model: data.model || this.model,
      cost: this.estimateCost(data.usage),
      usage: {
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0
      }
    };
  }

  estimateCost(usage) {
    if (!usage) return 0;
    const inputCost = (usage.prompt_tokens / 1_000_000) * 1;
    const outputCost = (usage.completion_tokens / 1_000_000) * 2;
    return Math.round((inputCost + outputCost) * 10000) / 10000;
  }
}