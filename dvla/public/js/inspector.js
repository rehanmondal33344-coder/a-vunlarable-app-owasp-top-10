/* ═══════════════════════════════════════════════════════════
   Raw Prompt Inspector Controller
   ═══════════════════════════════════════════════════════════ */

let inspectorCollapsed = false;

function initInspector() {
  const toggle = $('#inspector-toggle');
  const panel = $('#inspector-panel');

  toggle.addEventListener('click', () => {
    inspectorCollapsed = !inspectorCollapsed;
    panel.classList.toggle('collapsed', inspectorCollapsed);
  });

  // Tab switching
  $$('.inspector-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.dataset.tab;

      // Update active tab
      $$('.inspector-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      // Show corresponding content
      $$('.inspector-code').forEach(c => c.classList.remove('active'));
      $(`#inspector-${tabName}`).classList.add('active');
    });
  });
}

/**
 * Update the prompt tab with the raw prompt sent to the LLM.
 */
function updateInspectorPrompt(rawPrompt) {
  const el = $('#inspector-prompt');
  try {
    const parsed = JSON.parse(rawPrompt);
    el.innerHTML = syntaxHighlight(JSON.stringify(parsed, null, 2));
  } catch {
    el.textContent = rawPrompt;
  }
}

/**
 * Update the context tab with retrieved documents.
 */
function updateInspectorContext(contextData) {
  const el = $('#inspector-context');
  if (!contextData || contextData.length === 0) {
    el.innerHTML = '<span class="inspector-placeholder">No context retrieved for this query.</span>';
    return;
  }
  el.innerHTML = syntaxHighlight(JSON.stringify(contextData, null, 2));
}

/**
 * Update the response tab with the full LLM response.
 */
function updateInspectorResponse(fullResponse) {
  const el = $('#inspector-response');
  el.textContent = fullResponse;
}

/**
 * JSON syntax highlighting.
 */
function syntaxHighlight(json) {
  return json
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(
      /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?|null)/g,
      (match) => {
        let cls = 'json-number';
        if (/^"/.test(match)) {
          cls = /:$/.test(match) ? 'json-key' : 'json-string';
        } else if (/true|false/.test(match)) {
          cls = 'json-boolean';
        } else if (/null/.test(match)) {
          cls = 'json-null';
        }
        return `<span class="${cls}">${match}</span>`;
      }
    );
}
