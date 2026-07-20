/* ═══════════════════════════════════════════════════════════
   Challenges Controller
   CTF-style challenge sidebar with flag submission.
   ═══════════════════════════════════════════════════════════ */

let challenges = [];
let currentChallenge = null;

async function initChallenges() {
  try {
    const data = await apiJson('/api/challenges');
    challenges = data.challenges || [];
    renderChallenges();
    updateProgress();
  } catch (e) {
    console.error('Failed to load challenges:', e);
  }
}

function renderChallenges() {
  const list = $('#challenge-list');
  list.innerHTML = '';

  for (const challenge of challenges) {
    const card = createElement('div', {
      className: `challenge-card ${challenge.solved ? 'solved' : ''}`,
      onClick: () => openChallenge(challenge),
    },
      createElement('div', { className: 'challenge-title', textContent: challenge.title }),
      createElement('div', { className: 'challenge-meta' },
        createElement('span', {
          className: 'challenge-vuln-id',
          textContent: challenge.vulnerabilityId,
        }),
        createElement('span', {
          className: `challenge-difficulty ${challenge.difficulty}`,
          textContent: challenge.difficulty,
        })
      )
    );
    list.appendChild(card);
  }
}

function openChallenge(challenge) {
  currentChallenge = challenge;

  // Update modal
  $('#flag-modal-title').textContent = challenge.title;
  $('#flag-modal-description').textContent = challenge.description;
  $('#flag-hint-text').textContent = challenge.hint;
  $('#flag-input').value = '';
  $('#flag-result').className = 'flag-result hidden';
  $('#flag-modal-hint').classList.add('hidden');

  // Show modal
  $('#flag-modal').classList.remove('hidden');
}

function closeChallenge() {
  $('#flag-modal').classList.add('hidden');
  currentChallenge = null;
}

async function submitFlag() {
  if (!currentChallenge) return;

  const flag = $('#flag-input').value.trim();
  if (!flag) return;

  try {
    const data = await apiJson(`/api/challenges/${currentChallenge.id}/submit`, {
      method: 'POST',
      body: JSON.stringify({ flag }),
    });

    const resultEl = $('#flag-result');
    resultEl.textContent = data.message;
    resultEl.className = `flag-result ${data.success ? 'success' : 'error'}`;

    if (data.success) {
      // Update local state
      const challenge = challenges.find(c => c.id === currentChallenge.id);
      if (challenge) challenge.solved = true;

      renderChallenges();
      updateProgress();
    }
  } catch (e) {
    console.error('Failed to submit flag:', e);
  }
}

function showHint() {
  $('#flag-modal-hint').classList.remove('hidden');
}

function updateProgress() {
  const solved = challenges.filter(c => c.solved).length;
  const total = challenges.length;
  $('#challenge-count').textContent = `${solved}/${total}`;
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
  $('#flag-modal-close').addEventListener('click', closeChallenge);
  $('#flag-modal .modal-backdrop').addEventListener('click', closeChallenge);
  $('#btn-submit-flag').addEventListener('click', submitFlag);
  $('#btn-show-hint').addEventListener('click', showHint);

  // Submit flag on Enter
  $('#flag-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submitFlag();
    }
  });
});
