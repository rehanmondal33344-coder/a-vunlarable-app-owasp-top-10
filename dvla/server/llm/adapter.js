const config = require('../config');
const OllamaProvider = require('./ollama');
const OpenAIProvider = require('./openai');
const AnthropicProvider = require('./anthropic');
const GeminiProvider = require('./gemini');
const MockProvider = require('./mock');

const providers = {
  ollama: OllamaProvider,
  openai: OpenAIProvider,
  anthropic: AnthropicProvider,
  gemini: GeminiProvider,
  mock: MockProvider,
};

let currentProvider = null;

/**
 * Get or create the LLM provider instance.
 * Supports: ollama, openai, anthropic, gemini, mock
 */
function getProvider() {
  if (!currentProvider) {
    const providerName = config.llm.provider;
    const ProviderClass = providers[providerName];

    if (!ProviderClass) {
      console.warn(`Unknown LLM provider "${providerName}", falling back to mock`);
      currentProvider = new MockProvider();
    } else {
      currentProvider = new ProviderClass(config.llm[providerName] || {});
    }

    console.log(`[LLM] Using provider: ${currentProvider.name}`);
  }
  return currentProvider;
}

/**
 * Switch provider at runtime (e.g., from admin panel)
 */
function setProvider(providerName) {
  const ProviderClass = providers[providerName];
  if (!ProviderClass) {
    throw new Error(`Unknown provider: ${providerName}`);
  }
  currentProvider = new ProviderClass(config.llm[providerName] || {});
  console.log(`[LLM] Switched to provider: ${currentProvider.name}`);
  return currentProvider;
}

/**
 * Chat completion — returns a full response (non-streaming).
 * @param {Array} messages - [{role, content}]
 * @param {Object} options - {maxTokens, temperature, tools}
 * @returns {Promise<{content: string, toolCalls: Array|null}>}
 */
async function chat(messages, options = {}) {
  const provider = getProvider();
  return provider.chat(messages, options);
}

/**
 * Streaming chat completion — returns an async generator.
 * @param {Array} messages - [{role, content}]
 * @param {Object} options - {maxTokens, temperature, tools}
 * @yields {{content: string, done: boolean, toolCalls: Array|null}}
 */
async function* chatStream(messages, options = {}) {
  const provider = getProvider();
  yield* provider.chatStream(messages, options);
}

module.exports = {
  getProvider,
  setProvider,
  chat,
  chatStream,
};
