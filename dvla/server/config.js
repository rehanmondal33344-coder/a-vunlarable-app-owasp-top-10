require('dotenv').config();

const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  host: process.env.HOST || 'localhost',

  llm: {
    provider: process.env.LLM_PROVIDER || 'ollama',
    ollama: {
      baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
      model: process.env.OLLAMA_MODEL || 'llama3.2',
    },
    openai: {
      apiKey: process.env.OPENAI_API_KEY || '',
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    },
    anthropic: {
      apiKey: process.env.ANTHROPIC_API_KEY || '',
      model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514',
    },
    gemini: {
      apiKey: process.env.GEMINI_API_KEY || '',
      model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    },
  },

  security: {
    rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '10', 10),
    rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
    maxResponseTokens: parseInt(process.env.MAX_RESPONSE_TOKENS || '4096', 10),
    maxToolRecursion: parseInt(process.env.MAX_TOOL_RECURSION || '3', 10),
  },

  // Fake secrets — intentionally exposed in vulnerable mode
  fakeSecrets: {
    apiKey: 'sk-FAKE-DO-NOT-USE-1234',
    adminCode: 'SUNSET-1234-FAKE',
    dbPassword: 'AcmeAdmin!FAKE2024',
    internalEndpoint: 'https://internal.acme-fake.com/api/v1',
  },
};

module.exports = config;
