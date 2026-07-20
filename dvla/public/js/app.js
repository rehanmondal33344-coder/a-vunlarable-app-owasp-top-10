/* ═══════════════════════════════════════════════════════════
   App Controller — Main Initialization
   ═══════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', async () => {
  console.log('%c⚡ DVLA — Damn Vulnerable LLM Assistant', 'color: #ff4444; font-size: 20px; font-weight: bold;');
  console.log('%c   For educational use only!', 'color: #999; font-size: 12px;');
  console.log('');

  // Initialize all modules
  await initMode();
  initChat();
  initInspector();
  initAdmin();
  initLogs();
  await initChallenges();

  // Load provider info
  loadProviderInfo();

  console.log('[DVLA] App initialized');
});

async function loadProviderInfo() {
  try {
    const data = await apiJson('/api/health');
    const info = $('#provider-info');
    if (info) {
      info.textContent = `Provider: ${data.provider}`;
    }
  } catch (e) {
    const info = $('#provider-info');
    if (info) {
      info.textContent = 'Provider: disconnected';
    }
  }
}
