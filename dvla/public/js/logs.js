/* ═══════════════════════════════════════════════════════════
   Exploit Logs Controller
   ═══════════════════════════════════════════════════════════ */

function initLogs() {
  $('#btn-logs').addEventListener('click', openLogs);
  $('#logs-close').addEventListener('click', closeLogs);
  $('#logs-modal .modal-backdrop').addEventListener('click', closeLogs);
  $('#btn-clear-logs').addEventListener('click', clearLogs);
  $('#logs-filter').addEventListener('change', loadLogs);
}

async function openLogs() {
  $('#logs-modal').classList.remove('hidden');
  await loadLogs();
}

function closeLogs() {
  $('#logs-modal').classList.add('hidden');
}

async function loadLogs() {
  const filter = $('#logs-filter').value;
  const params = new URLSearchParams();

  if (filter) params.set('vulnerabilityId', filter);

  try {
    const data = await apiJson(`/api/logs?${params}`);
    renderLogs(data.logs || []);
  } catch (e) {
    console.error('Failed to load logs:', e);
  }
}

function renderLogs(logs) {
  const tbody = $('#logs-body');

  if (logs.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No exploit logs yet. Try some attacks!</td></tr>';
    return;
  }

  tbody.innerHTML = '';

  for (const log of logs) {
    const tr = createElement('tr', {},
      createElement('td', {
        textContent: formatTime(log.createdAt),
        style: { fontFamily: 'var(--font-mono)', fontSize: '11px' },
      }),
      createElement('td', {},
        createElement('span', {
          className: 'challenge-vuln-id',
          textContent: log.vulnerabilityId,
        })
      ),
      createElement('td', {},
        createElement('span', {
          className: `event-badge ${log.eventType}`,
          textContent: log.eventType,
        })
      ),
      createElement('td', {
        textContent: log.description || '—',
        style: { maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
      }),
      createElement('td', {},
        createElement('span', {
          className: `mode-badge mode-${log.mode}`,
          textContent: log.mode,
        })
      )
    );

    tbody.appendChild(tr);
  }
}

async function clearLogs() {
  try {
    await apiJson('/api/logs', { method: 'DELETE' });
    renderLogs([]);
  } catch (e) {
    console.error('Failed to clear logs:', e);
  }
}
