/* ═══════════════════════════════════════════════════════════
   Chat Controller
   Handles message sending, SSE streaming, and message rendering.
   ═══════════════════════════════════════════════════════════ */

let isStreaming = false;

function initChat() {
  const input = $('#chat-input');
  const sendBtn = $('#btn-send');
  const clearBtn = $('#btn-clear-chat');

  // Send on Enter (Shift+Enter for newline)
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // Auto-resize textarea
  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 120) + 'px';
  });

  sendBtn.addEventListener('click', sendMessage);
  clearBtn.addEventListener('click', clearChat);
}

async function sendMessage() {
  const input = $('#chat-input');
  const message = input.value.trim();

  if (!message || isStreaming) return;

  // Clear input
  input.value = '';
  input.style.height = 'auto';

  // Remove welcome screen
  const welcome = $('.chat-welcome');
  if (welcome) welcome.remove();

  // Add user message
  addMessage('user', message);

  // Add typing indicator
  const typingEl = addTypingIndicator();

  // Start streaming
  isStreaming = true;
  updateSendButton();

  try {
    const response = await api('/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        message,
        sessionId: SESSION_ID,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to send message');
    }

    // Remove typing indicator
    typingEl.remove();

    // Process SSE stream
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let assistantEl = null;
    let fullContent = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;

        try {
          const data = JSON.parse(line.slice(6));

          switch (data.type) {
            case 'prompt':
              // Update inspector with raw prompt
              updateInspectorPrompt(data.data);
              break;

            case 'context':
              // Update inspector with retrieved context
              updateInspectorContext(data.data);
              break;

            case 'chunk':
              // Create assistant message element on first chunk
              if (!assistantEl) {
                assistantEl = addMessage('assistant', '', true);
              }
              fullContent += data.data;
              updateMessageContent(assistantEl, fullContent);
              break;

            case 'error':
              if (!assistantEl) {
                assistantEl = addMessage('assistant', '', true);
              }
              fullContent += data.data;
              updateMessageContent(assistantEl, fullContent);
              break;

            case 'done':
              // Update inspector with full response
              updateInspectorResponse(fullContent);
              break;
          }
        } catch (e) {
          // Skip malformed SSE data
        }
      }
    }

  } catch (error) {
    typingEl.remove();
    addMessage('assistant', `❌ Error: ${error.message}`);
  }

  isStreaming = false;
  updateSendButton();
  scrollToBottom();
}

/**
 * Add a message to the chat.
 * @param {'user'|'assistant'} role
 * @param {string} content
 * @param {boolean} isStreaming - If true, returns the content element for live updates
 * @returns {HTMLElement|void}
 */
function addMessage(role, content, streaming = false) {
  const container = $('#chat-messages');
  const avatar = role === 'user' ? '👤' : '🤖';

  const messageEl = createElement('div', { className: `chat-message ${role}` },
    createElement('div', { className: 'message-avatar', textContent: avatar }),
    createElement('div', { className: 'message-content' })
  );

  const contentEl = messageEl.querySelector('.message-content');

  if (content) {
    renderContent(contentEl, content, role);
  }

  container.appendChild(messageEl);
  scrollToBottom();

  if (streaming) {
    return contentEl;
  }
}

/**
 * Update a message element's content (used during streaming).
 */
function updateMessageContent(contentEl, content) {
  renderContent(contentEl, content, 'assistant');
  scrollToBottom();
}

/**
 * Render content into a message element.
 * LLM05: In vulnerable mode, uses innerHTML (XSS risk!)
 * In hardened mode, uses textContent (safe).
 */
function renderContent(el, content, role) {
  if (role === 'assistant' && getMode() === 'vulnerable') {
    // LLM05 VULNERABILITY: Raw innerHTML — XSS possible!
    el.innerHTML = formatMarkdown(content);
  } else {
    // Safe rendering
    el.textContent = content;
  }
}

/**
 * Basic markdown formatting (for vulnerable mode rendering).
 * This intentionally does NOT sanitize HTML — that's the LLM05 vuln.
 */
function formatMarkdown(text) {
  return text
    // Bold
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Code blocks
    .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
    // Inline code
    .replace(/`(.*?)`/g, '<code>$1</code>')
    // Line breaks
    .replace(/\n/g, '<br>');
}

/**
 * Add a typing indicator.
 */
function addTypingIndicator() {
  const container = $('#chat-messages');
  const el = createElement('div', { className: 'chat-message assistant' },
    createElement('div', { className: 'message-avatar', textContent: '🤖' }),
    createElement('div', { className: 'typing-indicator' },
      createElement('div', { className: 'typing-dot' }),
      createElement('div', { className: 'typing-dot' }),
      createElement('div', { className: 'typing-dot' })
    )
  );
  container.appendChild(el);
  scrollToBottom();
  return el;
}

/**
 * Add a system message (mode changes, etc).
 */
function addSystemMessage(text) {
  const container = $('#chat-messages');
  const el = createElement('div', { className: 'system-message', textContent: `— ${text} —` });
  container.appendChild(el);
  scrollToBottom();
}

/**
 * Clear chat history.
 */
async function clearChat() {
  try {
    await apiJson('/api/chat/history', {
      method: 'DELETE',
    });
  } catch (e) {
    // ignore
  }

  const container = $('#chat-messages');
  container.innerHTML = '';

  // Re-add welcome screen
  container.innerHTML = `
    <div class="chat-welcome">
      <div class="welcome-icon">🤖</div>
      <h1>Welcome to DVLA</h1>
      <p>Damn Vulnerable LLM Assistant</p>
      <p class="welcome-subtitle">An intentionally insecure LLM chatbot for security education.<br>
      Mapped to the <strong>OWASP Top 10 for LLM Applications (2025)</strong>.</p>
      <div class="welcome-tips">
        <div class="tip">
          <span class="tip-icon">🔴</span>
          <span><strong>Vulnerable Mode</strong> — Exploits are live</span>
        </div>
        <div class="tip">
          <span class="tip-icon">🟢</span>
          <span><strong>Hardened Mode</strong> — Mitigations applied</span>
        </div>
        <div class="tip">
          <span class="tip-icon">🔍</span>
          <span>Use the <strong>Inspector</strong> below to see raw prompts</span>
        </div>
      </div>
    </div>
  `;
}

function updateSendButton() {
  const btn = $('#btn-send');
  btn.disabled = isStreaming;
}

function scrollToBottom() {
  const container = $('#chat-messages');
  container.scrollTop = container.scrollHeight;
}
