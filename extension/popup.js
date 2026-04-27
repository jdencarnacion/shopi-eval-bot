// popup.js

const dot        = document.getElementById('dot');
const statusText = document.getElementById('statusText');
const mainBtn    = document.getElementById('mainBtn');
const errMsg     = document.getElementById('errMsg');
const meetUI     = document.getElementById('meetUI');
const noMeetUI   = document.getElementById('noMeetUI');
const serverUrlInput = document.getElementById('serverUrl');

let isCapturing = false;
let currentTabId = null;
let serverCheckTimer = null;

// ── Load saved settings ───────────────────────────────────────────────────
chrome.storage.local.get(['serverUrl'], ({ serverUrl }) => {
  serverUrlInput.value = serverUrl || 'http://localhost:3002';
});

serverUrlInput.addEventListener('change', () => {
  chrome.storage.local.set({ serverUrl: serverUrlInput.value.trim() });
  checkServer();
});

// ── Server status indicator ───────────────────────────────────────────────
const srvDot   = document.getElementById('srvDot');
const srvLabel = document.getElementById('srvLabel');

async function checkServer() {
  const url = serverUrlInput.value.trim() || 'http://localhost:3002';
  srvDot.className = 'srv-dot';
  srvLabel.textContent = 'Checking…';
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 3000);
    const res = await fetch(`${url}/api/transcribe`, { method: 'OPTIONS', signal: ctrl.signal }).catch(() => null);
    clearTimeout(t);
    if (res) {
      srvDot.className = 'srv-dot online';
      srvLabel.textContent = 'Server online';
    } else {
      throw new Error();
    }
  } catch (_) {
    srvDot.className = 'srv-dot offline';
    srvLabel.textContent = 'Server offline — run pnpm dev';
  }
}

// Check on open, re-check every 8s
checkServer();
serverCheckTimer = setInterval(checkServer, 8000);

// ── Detect Meet tab and check content script is injected ─────────────────
chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
  if (!tab?.url?.includes('meet.google.com')) {
    noMeetUI.style.display = 'block';
    statusText.textContent = 'Not on Google Meet';
    return;
  }

  currentTabId = tab.id;
  meetUI.style.display = 'block';

  // Ping content script to confirm it's injected in this tab
  chrome.tabs.sendMessage(tab.id, { type: 'PING' }, (res) => {
    if (chrome.runtime.lastError || !res?.pong) {
      // Content script not present — tab was open before extension was loaded
      showError('Refresh your Google Meet tab, then re-open this popup.');
      mainBtn.disabled = true;
      statusText.textContent = 'Meet tab needs a refresh';
      statusText.classList.remove('active');
      return;
    }

    // Content script is alive — check capture status
    chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (bgRes) => {
      isCapturing = bgRes?.isCapturing || false;
      updateUI();
    });
  });
});

// ── UI state ──────────────────────────────────────────────────────────────
function updateUI() {
  mainBtn.disabled = false;
  errMsg.style.display = 'none';

  if (isCapturing) {
    dot.classList.add('active');
    statusText.textContent = 'Listening to call…';
    statusText.classList.add('active');
    mainBtn.textContent = '■  Stop Listening';
    mainBtn.className = 'btn btn-stop';
  } else {
    dot.classList.remove('active');
    statusText.textContent = 'Ready — on Google Meet';
    statusText.classList.remove('active');
    mainBtn.textContent = '▶  Start Listening';
    mainBtn.className = 'btn btn-start';
  }
}

// ── Button click ──────────────────────────────────────────────────────────
mainBtn.addEventListener('click', async () => {
  mainBtn.disabled = true;
  errMsg.style.display = 'none';

  const serverUrl = serverUrlInput.value.trim() || 'http://localhost:3002';

  if (isCapturing) {
    chrome.runtime.sendMessage({ type: 'STOP_CAPTURE' }, () => {
      isCapturing = false;
      updateUI();
    });
    return;
  }

  // Pre-check: confirm server is reachable before capturing audio
  statusText.textContent = 'Checking server…';
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 4000);
    const res = await fetch(`${serverUrl}/api/transcribe`, {
      method: 'OPTIONS',
      signal: ctrl.signal,
    }).catch(() => null);
    clearTimeout(t);

    if (!res) throw new Error('Server not reachable');
  } catch (_) {
    showError(`Cannot reach server at ${serverUrl}\n\nMake sure "pnpm dev" is running.`);
    statusText.textContent = 'Ready — on Google Meet';
    mainBtn.disabled = false;
    return;
  }

  chrome.runtime.sendMessage(
    { type: 'START_CAPTURE', tabId: currentTabId, serverUrl },
    (res) => {
      if (res?.error) {
        showError(res.error);
        statusText.textContent = 'Ready — on Google Meet';
        mainBtn.disabled = false;
      } else {
        isCapturing = true;
        updateUI();
      }
    }
  );
});

// ── Background broadcasts ─────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'STATUS_CHANGE') {
    isCapturing = msg.isCapturing;
    updateUI();
  }
  if (msg.type === 'ERROR') {
    showError(msg.error);
    isCapturing = false;
    updateUI();
  }
});

function showError(text) {
  errMsg.textContent = text;
  errMsg.style.display = 'block';
}
