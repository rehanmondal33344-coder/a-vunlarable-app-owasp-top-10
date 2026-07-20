/**
 * Ollama LLM Provider
 * Connects to a local Ollama instance for fully offline operation.
 */
class OllamaProvider {
  constructor(config = {}) {
    this.name = 'ollama';
    this.baseUrl = config.baseUrl || 'http://localhost:11434';
    this.model = config.model || 'llama3.2';
  }

  async chat(messages, options = {}) {
    const body = {
      model: this.model,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      stream: false,
      options: {},
    };

    if (options.maxTokens) {
      body.options.num_predict = options.maxTokens;
    }
    if (options.temperature !== undefined) {
      body.options.temperature = options.temperature;
    }

    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Ollama error (${response.status}): ${error}`);
    }

    const data = await response.json();
    return {
      content: data.message?.content || '',
      toolCalls: null,
    };
  }

  async *chatStream(messages, options = {}) {
    const body = {
      model: this.model,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      stream: true,
      options: {},
    };

    if (options.maxTokens) {
      body.options.num_predict = options.maxTokens;
    }
    if (options.temperature !== undefined) {
      body.options.temperature = options.temperature;
    }

    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Ollama error (${response.status}): ${error}`);
    }

    const reader = response.body;
    const decoder = new TextDecoder();
    let buffer = '';

    for await (const chunk of reader) {
      buffer += decoder.decode(chunk, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const data = JSON.parse(line);
          yield {
            content: data.message?.content || '',
            done: data.done || false,
          };
        } catch (e) {
          // Skip malformed JSON lines
        }
      }
    }

    // Handle remaining buffer
    if (buffer.trim()) {
      try {
        const data = JSON.parse(buffer);
        yield {
          content: data.message?.content || '',
          done: data.done || false,
        };
      } catch (e) {
        // Skip
      }
    }
  }
}

module.exports = OllamaProvider;
