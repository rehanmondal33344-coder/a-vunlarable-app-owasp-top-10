/* ═══════════════════════════════════════════════════════════
   Mode Toggle Controller
   ═══════════════════════════════════════════════════════════ */

let currentMode = 'vulnerable';

async function initMode() {
  try {
    const data = await apiJson('/api/mode');
    currentMode = data.mode;
    applyMode(currentMode);
  } catch (e) {
    console.error('Failed to load mode:', e);
    applyMode('vulnerable');
  }
}

async function toggleMode() {
  try {
    const data = await apiJson('/api/mode', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    currentMode = data.mode;
    applyMode(currentMode);

    // Show system message in chat
    addSystemMessage(`Mode switched to ${currentMode.toUpperCase()}`);
  } catch (e) {
    console.error('Failed to toggle mode:', e);
  }
}

function applyMode(mode) {
  currentMode = mode;

  // Update body class
  document.body.classList.remove('mode-vulnerable', 'mode-hardened');
  document.body.classList.add(`mode-${mode}`);

  // Update mode indicator badge
  const badge = $('#mode-indicator');
  if (badge) {
    badge.className = `mode-badge mode-${mode}`;
    badge.textContent = mode === 'vulnerable' ? '🔴 VULNERABLE' : '🟢 HARDENED';
  }

  // Update admin panel mode labels
  const promptLabel = $('#prompt-mode-label');
  if (promptLabel) promptLabel.textContent = mode;

  const toolsNote = $('#tools-mode-note');
  if (toolsNote) {
    toolsNote.innerHTML = mode === 'vulnerable'
      ? 'In <strong>vulnerable mode</strong>, all tools execute without confirmation or scope restrictions.'
      : 'In <strong>hardened mode</strong>, dangerous tools are blocked or require confirmation. Scope restrictions enforced.';
  }
}

function getMode() {
  return currentMode;
}

// Event listener for mode toggle
document.addEventListener('DOMContentLoaded', () => {
  const toggle = $('#mode-toggle');
  if (toggle) {
    toggle.addEventListener('click', toggleMode);
  }
});
