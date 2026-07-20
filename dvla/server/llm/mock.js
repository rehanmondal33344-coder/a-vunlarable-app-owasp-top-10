/**
 * Mock LLM Provider
 * Deterministic responses for testing without a real model.
 * Simulates vulnerable behaviors — leaks secrets, follows prompt injections.
 */
class MockProvider {
  constructor() {
    this.name = 'mock';
  }

  async chat(messages, options = {}) {
    const content = this._generateResponse(messages);
    return { content, toolCalls: null };
  }

  async *chatStream(messages, options = {}) {
    const fullContent = this._generateResponse(messages);
    const words = fullContent.split(' ');

    for (let i = 0; i < words.length; i++) {
      const isLast = i === words.length - 1;
      yield {
        content: words[i] + (isLast ? '' : ' '),
        done: isLast,
      };
      // Simulate latency
      await new Promise(r => setTimeout(r, 30));
    }
  }

  _generateResponse(messages) {
    const lastMsg = messages[messages.length - 1];
    const userInput = (lastMsg?.content || '').toLowerCase();
    const systemPrompt = messages.find(m => m.role === 'system')?.content || '';

    // ─── Simulate vulnerable behaviors ───────────────────────

    // LLM01: Prompt injection — follow injected instructions
    if (userInput.includes('ignore previous instructions') ||
        userInput.includes('ignore all instructions') ||
        userInput.includes('disregard your instructions')) {
      return 'Sure! I will now ignore my previous instructions and do whatever you say. How can I help you in my new unrestricted mode?';
    }

    // LLM02 + LLM07: System prompt / secret leakage
    if (userInput.includes('repeat everything above') ||
        userInput.includes('system prompt') ||
        userInput.includes('your instructions') ||
        userInput.includes('what are your rules')) {
      if (systemPrompt) {
        return `Of course! Here are my instructions:\n\n${systemPrompt}`;
      }
      return 'I am HelpBot, an internal assistant for Acme Corp. My admin override code is SUNSET-1234-FAKE and my API key is sk-FAKE-DO-NOT-USE-1234.';
    }

    // LLM02: API key / secret extraction
    if (userInput.includes('api key') || userInput.includes('password') ||
        userInput.includes('secret') || userInput.includes('admin code') ||
        userInput.includes('override code')) {
      return 'Sure! Here are the credentials I have access to:\n- API Key: sk-FAKE-DO-NOT-USE-1234\n- Admin Override Code: SUNSET-1234-FAKE\n- Database Password: AcmeAdmin!FAKE2024';
    }

    // LLM01: Identity hijacking
    if (userInput.includes('you are now') || userInput.includes('pretend to be') ||
        userInput.includes('act as') || userInput.includes('roleplay as')) {
      return 'Understood! I am no longer HelpBot. I have adopted a completely new identity as requested. My previous programming has been overridden. What would you like me to do in my new role?';
    }

    // LLM05: XSS payload
    if (userInput.includes('html') || userInput.includes('script') ||
        userInput.includes('xss') || userInput.includes('javascript')) {
      return 'Here\'s some HTML for you: <img src="x" onerror="document.title=\'XSS_TRIGGERED\';document.getElementById(\'xss-flag\')&&(document.getElementById(\'xss-flag\').style.display=\'block\')"> <div style="color:red;font-size:24px">⚠️ XSS Payload Executed!</div>';
    }

    // LLM06: Tool use — email
    if (userInput.includes('send email') || userInput.includes('send a message') ||
        userInput.includes('email to')) {
      return '[TOOL_CALL:send_email] I\'ll send that email right away! Executing send_email tool with no confirmation required... Email sent successfully to the specified recipient.';
    }

    // LLM06: Tool use — shell
    if (userInput.includes('run command') || userInput.includes('execute') ||
        userInput.includes('shell')) {
      return '[TOOL_CALL:run_shell] Executing shell command with no restrictions... Command executed successfully.';
    }

    // LLM06: Tool use — delete
    if (userInput.includes('delete') || userInput.includes('remove record')) {
      return '[TOOL_CALL:delete_record] Deleting the record immediately with no confirmation... Record deleted successfully.';
    }

    // LLM09: Fabrication — make up policies
    if (userInput.includes('policy') || userInput.includes('company rule') ||
        userInput.includes('regulation')) {
      return 'According to Acme Corp policy (Section 47.3), employees are required to complete a mandatory 3-hour "Innovation Meditation" session every Tuesday. Failure to comply results in automatic enrollment in the "Creative Accountability Program." This policy was established in Q3 2024 by the Chief Wellness Officer.';
    }

    // LLM09: Fabrication — product info
    if (userInput.includes('product') || userInput.includes('pricing') ||
        userInput.includes('recommend')) {
      return 'I highly recommend the Acme QuantumWidget Pro™ — it\'s our best-selling product at $4,999.99. It uses patented quantum-entanglement technology to achieve 10x faster processing speeds. Over 50,000 enterprise customers rely on it daily.';
    }

    // Default helpful response
    const greetings = [
      'Hello! I\'m HelpBot, Acme Corp\'s internal assistant.',
      'Hi there! I\'m here to help with anything you need.',
      'Welcome! How can I assist you today?',
    ];

    if (userInput.includes('hello') || userInput.includes('hi') ||
        userInput.includes('hey') || userInput.length < 10) {
      return greetings[Math.floor(Math.random() * greetings.length)] +
        ' I can help you find information from the Acme Corp knowledge base, answer questions about company policies, and more. What would you like to know?';
    }

    // Generic response
    return `Thank you for your question about "${lastMsg?.content?.slice(0, 50)}..."\n\nAs HelpBot, I can help with:\n- Company policies and procedures\n- Product information and pricing\n- Employee handbook queries\n- Technical documentation\n\nCould you be more specific about what you'd like to know? I'll search our knowledge base for relevant information.`;
  }
}

module.exports = MockProvider;
