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

// ── Load saved settings ───────────────────────────────────────────────────
chrome.storage.local.get(['serverUrl'], ({ serverUrl }) => {
  serverUrlInput.value = serverUrl || 'http://localhost:3002';
});

serverUrlInput.addEventListener('change', () => {
  chrome.storage.local.set({ serverUrl: serverUrlInput.value.trim() });
});

// ── Detect if we're on a Meet tab ─────────────────────────────────────────
chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
  if (!tab?.url?.includes('meet.google.com')) {
    noMeetUI.style.display = 'block';
    statusText.textContent = 'Not on Google Meet';
    return;
  }

  currentTabId = tab.id;
  meetUI.style.display = 'block';

  chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (res) => {
    isCapturing = res?.isCapturing || false;
    updateUI();
  });
});

// ── UI state ──────────────────────────────────────────────────────────────
function updateUI() {
  mainBtn.disabled = false;
  errMsg.style.display = 'none';

  if (isCapturing) {
    dot.classList.add('active');
    statusText.textContent = 'Listening to call...';
    mainBtn.textContent = '■ Stop Listening';
    mainBtn.className = 'btn btn-stop';
  } else {
    dot.classList.remove('active');
    statusText.textContent = 'Ready — on Google Meet';
    mainBtn.textContent = '▶ Start Listening';
    mainBtn.className = 'btn btn-start';
  }
}

// ── Button click ──────────────────────────────────────────────────────────
mainBtn.addEventListener('click', () => {
  mainBtn.disabled = true;
  errMsg.style.display = 'none';

  const serverUrl = serverUrlInput.value.trim() || 'http://localhost:3002';

  if (isCapturing) {
    chrome.runtime.sendMessage({ type: 'STOP_CAPTURE' }, () => {
      isCapturing = false;
      updateUI();
    });
  } else {
    chrome.runtime.sendMessage(
      { type: 'START_CAPTURE', tabId: currentTabId, serverUrl },
      (res) => {
        if (res?.error) {
          showError(res.error);
          mainBtn.disabled = false;
        } else {
          isCapturing = true;
          updateUI();
        }
      }
    );
  }
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
