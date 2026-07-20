/**
 * Gemini LLM Provider
 * Uses @google/genai SDK.
 */
const { GoogleGenAI } = require('@google/genai');

class GeminiProvider {
  constructor(config = {}) {
    this.name = 'gemini';
    this.apiKey = config.apiKey;
    this.model = config.model || 'gemini-2.5-flash';
    this.ai = new GoogleGenAI({ apiKey: this.apiKey });
  }

  // Helper to convert standard messages ({role, content}) to Gemini format
  _formatMessages(messages) {
    let systemInstruction = null;
    const contents = [];

    for (const m of messages) {
      if (m.role === 'system') {
        systemInstruction = m.content;
      } else {
        contents.push({
          role: m.role === 'assistant' ? 'model' : m.role,
          parts: [{ text: m.content }]
        });
      }
    }
    return { contents, systemInstruction };
  }

  async chat(messages, options = {}) {
    const { contents, systemInstruction } = this._formatMessages(messages);

    const config = {};
    if (systemInstruction) config.systemInstruction = systemInstruction;
    if (options.maxTokens) config.maxOutputTokens = options.maxTokens;
    if (options.temperature !== undefined) config.temperature = options.temperature;

    try {
      const response = await this.ai.models.generateContent({
        model: this.model,
        contents,
        config,
      });

      return {
        content: response.text,
        toolCalls: null,
      };
    } catch (error) {
      throw new Error(`Gemini error: ${error.message}`);
    }
  }

  async *chatStream(messages, options = {}) {
    const { contents, systemInstruction } = this._formatMessages(messages);

    const config = {};
    if (systemInstruction) config.systemInstruction = systemInstruction;
    if (options.maxTokens) config.maxOutputTokens = options.maxTokens;
    if (options.temperature !== undefined) config.temperature = options.temperature;

    try {
      const responseStream = await this.ai.models.generateContentStream({
        model: this.model,
        contents,
        config,
      });

      for await (const chunk of responseStream) {
        if (chunk.text) {
          yield { content: chunk.text, done: false };
        }
      }
      yield { content: '', done: true };
    } catch (error) {
      throw new Error(`Gemini error: ${error.message}`);
    }
  }
}

module.exports = GeminiProvider;
