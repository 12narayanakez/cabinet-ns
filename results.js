/* ============================================================
   results.js — Narayana Techno Schools Cabinet Elections 2026–27
   Local Trainer Results Portal
   ============================================================ */

// ── CONFIGURATION ─────────────────────────────────────────────
const RESULTS_CONFIG = {
  POSITIONS: [
    'Head Boy',
    'Head Girl',
    'Sports Captain',
    'Sports Deputy Captain',
    'Cyber Sentinel',
    'Deputy Cyber Sentinel',
  ],
  REFRESH_INTERVAL_MS: 15000,
};

// ── STATE ──────────────────────────────────────────────────────
const rState = {
  password: '',
  allVotes: [],
  selectedPosition: '',
  isLocked: false,
  refreshTimer: null,
};

// ── INIT ───────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('loginForm').addEventListener('submit', handleLogin);
  document.getElementById('logoutBtn').addEventListener('click', handleLogout);
  document.getElementById('refreshBtn').addEventListener('click', loadResults);
  document.getElementById('positionFilter').addEventListener('change', handlePositionChange);
  
  populatePositionFilter();
});

function populatePositionFilter() {
  const select = document.getElementById('positionFilter');
  select.innerHTML = '<option value="">-- All Positions --</option>' +
    RESULTS_CONFIG.POSITIONS.map(pos => `<option value="${pos}">${pos}</option>`).join('');
}

// ── AUTH ───────────────────────────────────────────────────────
async function handleLogin(e) {
  e.preventDefault();
  const pwd = document.getElementById('resultPassword').value.trim();
  const errEl = document.getElementById('loginError');
  const btn = document.getElementById('loginBtn');

  if (!pwd) {
    errEl.textContent = 'Password is required.';
    return;
  }

  errEl.textContent = '';
  setButtonLoading(btn, true);

  try {
    // For local demo: check password against stored settings
    const settings = StorageService.getSettings();
    if (pwd !== settings.adminPassword) {
      errEl.textContent = 'Incorrect password.';
      return;
    }

    rState.password = pwd;
    rState.isLocked = settings.locked || false;
    rState.allVotes = StorageService.getVotes();

    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('resultsDashboard').classList.remove('hidden');

    renderResults();
    startAutoRefresh();

  } catch (err) {
    errEl.textContent = `Error: ${err.message}`;
  } finally {
    setButtonLoading(btn, false);
  }
}

function handleLogout() {
  stopAutoRefresh();
  rState.password = '';
  rState.allVotes = [];
  rState.selectedPosition = '';
  document.getElementById('resultPassword').value = '';
  document.getElementById('resultsDashboard').classList.add('hidden');
  document.getElementById('loginScreen').style.display = '';
}

// ── POSITION CHANGE ────────────────────────────────────────────
function handlePositionChange() {
  rState.selectedPosition = document.getElementById('positionFilter').value;
  renderResults();
}

// ── LOAD RESULTS ───────────────────────────────────────────────
function loadResults() {
  if (!rState.password) return;

  try {
    rState.allVotes = StorageService.getVotes();
    const settings = StorageService.getSettings();
    rState.isLocked = settings.locked || false;
    
    renderResults();

    document.getElementById('lastUpdatedLabel').innerHTML = `
      <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><circle cx="6.5" cy="6.5" r="5.5" stroke="#8E96B0" stroke-width="1.2"/><path d="M6.5 3.5v3.3l2 1.2" stroke="#8E96B0" stroke-width="1.3"/></svg>
      Updated ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
    `;
    hideResultsAlert();

  } catch (err) {
    showResultsAlert('error', `Refresh failed: ${err.message}`);
  }
}

// ── RENDER ─────────────────────────────────────────────────────
function renderResults() {
  renderBranchName();
  renderStats();
  renderPositionResults();
}

function renderBranchName() {
  // Get branch name from admin login or default to "Local Branch"
  const branchName = localStorage.getItem('trainerBranch') || 'Local Branch';
  document.getElementById('branchNameDisplay').textContent = `Voting at: ${branchName}`;
}

function renderStats() {
  const totalVotes = rState.allVotes.length;
  document.getElementById('rStatTotal').textContent = totalVotes.toLocaleString();

  // Last vote timestamp
  if (rState.allVotes.length > 0) {
    const lastVote = rState.allVotes[rState.allVotes.length - 1];
    const voteTime = new Date(lastVote.timestamp);
    document.getElementById('rStatLastVote').textContent = isNaN(voteTime)
      ? '—'
      : voteTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  } else {
    document.getElementById('rStatLastVote').textContent = '—';
  }

  // Status
  const statusEl = document.getElementById('rStatus');
  if (rState.isLocked) {
    statusEl.textContent = 'Voting Closed';
    statusEl.style.color = '#E76F24';
  } else {
    statusEl.textContent = 'Voting Open';
    statusEl.style.color = '#156D45';
  }
}

function renderPositionResults() {
  const tbody = document.getElementById('resultsTableBody');
  const position = rState.selectedPosition;

  if (rState.allVotes.length === 0) {
    tbody.innerHTML = `<tr><td colspan="3"><div class="empty-state"><div class="empty-state-title">No votes recorded yet</div></div></td></tr>`;
    return;
  }

  // Get votes for selected position (or all if none selected)
  const positionKey = position
    ? position.replace(/\s+/g, '').toLowerCase()
    : null;

  // Count votes by candidate
  const voteCounts = {};
  rState.allVotes.forEach(vote => {
    if (positionKey) {
      // Map position to vote object key
      let voteKey = '';
      if (position === 'Head Boy') voteKey = 'headBoy';
      else if (position === 'Head Girl') voteKey = 'headGirl';
      else if (position === 'Sports Captain') voteKey = 'sportsCaptain';
      else if (position === 'Sports Deputy Captain') voteKey = 'sportsDeputy';
      else if (position === 'Cyber Sentinel') voteKey = 'cyberSentinel';
      else if (position === 'Deputy Cyber Sentinel') voteKey = 'deputyCyberSentinel';

      const candidate = vote[voteKey];
      if (candidate) {
        voteCounts[candidate] = (voteCounts[candidate] || 0) + 1;
      }
    } else {
      // Show all positions
      RESULTS_CONFIG.POSITIONS.forEach(pos => {
        let voteKey = '';
        if (pos === 'Head Boy') voteKey = 'headBoy';
        else if (pos === 'Head Girl') voteKey = 'headGirl';
        else if (pos === 'Sports Captain') voteKey = 'sportsCaptain';
        else if (pos === 'Sports Deputy Captain') voteKey = 'sportsDeputy';
        else if (pos === 'Cyber Sentinel') voteKey = 'cyberSentinel';
        else if (pos === 'Deputy Cyber Sentinel') voteKey = 'deputyCyberSentinel';

        const candidate = vote[voteKey];
        if (candidate) {
          voteCounts[candidate] = (voteCounts[candidate] || 0) + 1;
        }
      });
    }
  });

  // Sort by votes (descending)
  const sorted = Object.entries(voteCounts).sort((a, b) => b[1] - a[1]);

  if (sorted.length === 0) {
    tbody.innerHTML = `<tr><td colspan="3"><div class="empty-state"><div class="empty-state-title">No votes for this position yet</div></div></td></tr>`;
    return;
  }

  // Render table rows with ranking
  tbody.innerHTML = sorted.map(([candidate, voteCount], index) => {
    const rank = index + 1;
    let rankBadge = '🥇';
    if (rank === 2) rankBadge = '🥈';
    else if (rank === 3) rankBadge = '🥉';
    else rankBadge = `#${rank}`;

    return `
      <tr>
        <td style="font-weight:600; text-align:center; font-size:16px;">${rankBadge}</td>
        <td>${escapeHtml(candidate)}</td>
        <td style="text-align:center; font-weight:600; color:#1D3557;">${voteCount}</td>
      </tr>
    `;
  }).join('');
}

// ── AUTO-REFRESH ───────────────────────────────────────────────
function startAutoRefresh() {
  stopAutoRefresh();
  rState.refreshTimer = setInterval(loadResults, RESULTS_CONFIG.REFRESH_INTERVAL_MS);
  loadResults();
}

function stopAutoRefresh() {
  if (rState.refreshTimer) {
    clearInterval(rState.refreshTimer);
    rState.refreshTimer = null;
  }
}

// ── UTILITIES ──────────────────────────────────────────────────
function showResultsAlert(type, msg) {
  const el = document.getElementById('resultsAlert');
  el.textContent = msg;
  el.className = `alert alert-${type}`;
}

function hideResultsAlert() {
  const el = document.getElementById('resultsAlert');
  el.className = 'alert hidden';
}

function setButtonLoading(btn, loading) {
  if (!btn) return;
  const text = btn.querySelector('.btn-text');
  const spinner = btn.querySelector('.btn-spinner');
  btn.disabled = loading;
  if (text) text.classList.toggle('hidden', loading);
  if (spinner) spinner.classList.toggle('hidden', !loading);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(String(str)));
  return div.innerHTML;
}
