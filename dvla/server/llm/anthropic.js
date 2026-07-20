/**
 * Anthropic Messages API Provider
 */
class AnthropicProvider {
  constructor(config = {}) {
    this.name = 'anthropic';
    this.apiKey = config.apiKey;
    this.model = config.model || 'claude-sonnet-4-20250514';
    this.baseUrl = 'https://api.anthropic.com/v1';
  }

  async chat(messages, options = {}) {
    // Anthropic uses a separate system parameter
    const systemMsg = messages.find(m => m.role === 'system');
    const otherMsgs = messages.filter(m => m.role !== 'system');

    const body = {
      model: this.model,
      messages: otherMsgs.map(m => ({ role: m.role, content: m.content })),
      max_tokens: options.maxTokens || 4096,
      stream: false,
    };

    if (systemMsg) {
      body.system = systemMsg.content;
    }
    if (options.temperature !== undefined) {
      body.temperature = options.temperature;
    }

    const response = await fetch(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic error (${response.status}): ${error}`);
    }

    const data = await response.json();
    const textBlock = data.content?.find(b => b.type === 'text');
    return {
      content: textBlock?.text || '',
      toolCalls: null,
    };
  }

  async *chatStream(messages, options = {}) {
    const systemMsg = messages.find(m => m.role === 'system');
    const otherMsgs = messages.filter(m => m.role !== 'system');

    const body = {
      model: this.model,
      messages: otherMsgs.map(m => ({ role: m.role, content: m.content })),
      max_tokens: options.maxTokens || 4096,
      stream: true,
    };

    if (systemMsg) {
      body.system = systemMsg.content;
    }
    if (options.temperature !== undefined) {
      body.temperature = options.temperature;
    }

    const response = await fetch(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic error (${response.status}): ${error}`);
    }

    const reader = response.body;
    const decoder = new TextDecoder();
    let buffer = '';

    for await (const chunk of reader) {
      buffer += decoder.decode(chunk, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data: ')) continue;

        try {
          const data = JSON.parse(trimmed.slice(6));

          if (data.type === 'content_block_delta' && data.delta?.type === 'text_delta') {
            yield { content: data.delta.text || '', done: false };
          } else if (data.type === 'message_stop') {
            yield { content: '', done: true };
            return;
          }
        } catch (e) {
          // Skip malformed
        }
      }
    }
  }
}

module.exports = AnthropicProvider;
