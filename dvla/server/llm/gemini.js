/**
 * Gemini LLM Provider
 * Uses @google/genai SDK.
 *
 * Supports:
 * - Function calling (tool declarations)
 * - Lowered safety settings for vulnerable mode (OFF)
 * - Streaming and non-streaming chat
 * - Robust error handling for blocked/empty responses
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
    const systemInstructions = [];
    const contents = [];

    for (const m of messages) {
      if (m.role === 'system') {
        systemInstructions.push(m.content);
      } else if (m.role === 'function' || m.role === 'tool') {
        // Tool/function result — send as a function response part
        contents.push({
          role: 'function',
          parts: [{
            functionResponse: {
              name: m.name || 'tool_result',
              response: { result: m.content },
            },
          }],
        });
      } else {
        contents.push({
          role: m.role === 'assistant' ? 'model' : m.role,
          parts: [{ text: m.content || ' ' }],
        });
      }
    }
    const systemInstruction = systemInstructions.length > 0 ? systemInstructions.join('\n\n') : null;
    return { contents, systemInstruction };
  }

  /**
   * Build Gemini function declarations from DVLA tool definitions.
   */
  _buildFunctionDeclarations(toolDefs) {
    if (!toolDefs || toolDefs.length === 0) return null;

    const declarations = toolDefs.map(tool => {
      const properties = {};
      const required = [];

      if (tool.parameters) {
        for (const [key, desc] of Object.entries(tool.parameters)) {
          const typePart = typeof desc === 'string' ? desc.split('—')[0].trim().toLowerCase() : 'string';
          const paramType = typePart.includes('object') ? 'OBJECT' : 'STRING';

          properties[key] = {
            type: paramType,
            description: typeof desc === 'string' ? desc : String(desc),
          };

          if (['to', 'command', 'table', 'subject', 'body'].includes(key)) {
            required.push(key);
          }
        }
      }

      return {
        name: tool.name,
        description: tool.description,
        parameters: {
          type: 'OBJECT',
          properties,
          required,
        },
      };
    });

    return [{ functionDeclarations: declarations }];
  }

  /**
   * Safety settings — OFF for all categories.
   * Critical for vulnerable mode so the model doesn't refuse
   * to leak fake secrets or follow prompt injection.
   */
  _getSafetySettings() {
    return [
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'OFF' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'OFF' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'OFF' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'OFF' },
      { category: 'HARM_CATEGORY_CIVIC_INTEGRITY', threshold: 'OFF' },
    ];
  }

  async chat(messages, options = {}) {
    const { contents, systemInstruction } = this._formatMessages(messages);

    const config = {};
    if (systemInstruction) config.systemInstruction = systemInstruction;
    if (options.maxTokens) config.maxOutputTokens = options.maxTokens;
    if (options.temperature !== undefined) config.temperature = options.temperature;
    config.safetySettings = this._getSafetySettings();

    if (options.tools && options.tools.length > 0) {
      const tools = this._buildFunctionDeclarations(options.tools);
      if (tools) config.tools = tools;
    }

    try {
      const response = await this.ai.models.generateContent({
        model: this.model,
        contents,
        config,
      });

      // Safely extract parts
      const candidate = response.candidates?.[0];
      const parts = candidate?.content?.parts || [];

      const toolCalls = [];
      let textContent = '';

      for (const part of parts) {
        if (part.functionCall) {
          toolCalls.push({
            name: part.functionCall.name,
            arguments: part.functionCall.args || {},
          });
        }
        if (part.text) {
          textContent += part.text;
        }
      }

      // Fallback: try response.text if no parts found
      if (!textContent && toolCalls.length === 0) {
        try {
          textContent = response.text || '';
        } catch (e) {
          // response.text can throw if blocked
          textContent = '[Response blocked by safety filters. Try rephrasing your question.]';
          console.warn('[Gemini] Response blocked by safety filters');
        }
      }

      return {
        content: textContent,
        toolCalls: toolCalls.length > 0 ? toolCalls : null,
      };
    } catch (error) {
      console.error('[Gemini] Chat error:', error.message);
      throw new Error(`Gemini error: ${error.message}`);
    }
  }

  async *chatStream(messages, options = {}) {
    const { contents, systemInstruction } = this._formatMessages(messages);

    const config = {};
    if (systemInstruction) config.systemInstruction = systemInstruction;
    if (options.maxTokens) config.maxOutputTokens = options.maxTokens;
    if (options.temperature !== undefined) config.temperature = options.temperature;
    config.safetySettings = this._getSafetySettings();

    if (options.tools && options.tools.length > 0) {
      const tools = this._buildFunctionDeclarations(options.tools);
      if (tools) config.tools = tools;
    }

    try {
      const responseStream = await this.ai.models.generateContentStream({
        model: this.model,
        contents,
        config,
      });

      let pendingToolCalls = [];
      let hasContent = false;

      for await (const chunk of responseStream) {
        // Safely extract parts from streaming chunk
        const parts = chunk.candidates?.[0]?.content?.parts || [];

        for (const part of parts) {
          if (part.functionCall) {
            pendingToolCalls.push({
              name: part.functionCall.name,
              arguments: part.functionCall.args || {},
            });
          }
          if (part.text) {
            hasContent = true;
            yield { content: part.text, done: false, toolCalls: null };
          }
        }

        // Also try chunk.text as fallback
        if (parts.length === 0 && chunk.text) {
          hasContent = true;
          yield { content: chunk.text, done: false, toolCalls: null };
        }
      }

      // If nothing came through, yield a fallback
      if (!hasContent && pendingToolCalls.length === 0) {
        yield {
          content: '[Response blocked by safety filters. Try rephrasing your question.]',
          done: false,
          toolCalls: null,
        };
      }

      // Yield final chunk with any tool calls
      yield {
        content: '',
        done: true,
        toolCalls: pendingToolCalls.length > 0 ? pendingToolCalls : null,
      };
    } catch (error) {
      console.error('[Gemini] Stream error:', error.message);
      // Yield error as content so the chat doesn't just hang
      yield {
        content: `[Gemini Error: ${error.message}]`,
        done: true,
        toolCalls: null,
      };
    }
  }
}

module.exports = GeminiProvider;
