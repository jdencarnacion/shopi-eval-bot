// background.js — Service Worker

let isCapturing = false;
let captureTabId = null;

// ── Message router ──────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  switch (msg.type) {
    case 'START_CAPTURE':
      handleStartCapture(msg)
        .then((r) => sendResponse(r))
        .catch((e) => sendResponse({ error: e.message }));
      return true; // async

    case 'STOP_CAPTURE':
      handleStopCapture()
        .then(() => sendResponse({ ok: true }));
      return true;

    case 'GET_STATUS':
      sendResponse({ isCapturing, captureTabId });
      return false;

    // From offscreen.js
    case 'CAPTURE_STARTED':
      isCapturing = true;
      broadcastToMeet({ type: 'LISTENING_STARTED' });
      notifyPopup({ type: 'STATUS_CHANGE', isCapturing: true });
      break;

    case 'CAPTURE_STOPPED':
      isCapturing = false;
      captureTabId = null;
      broadcastToMeet({ type: 'LISTENING_STOPPED' });
      notifyPopup({ type: 'STATUS_CHANGE', isCapturing: false });
      break;

    case 'CAPTURE_ERROR':
      isCapturing = false;
      captureTabId = null;
      notifyPopup({ type: 'ERROR', error: msg.error });
      broadcastToMeet({ type: 'LISTENING_STOPPED' });
      break;

    case 'TRANSCRIPT_PARTIAL':
      broadcastToMeet({ type: 'TRANSCRIPT_UPDATE', text: msg.text });
      break;

    case 'ANALYSIS_RESULT':
      broadcastToMeet({ type: 'CARD_UPDATE', data: msg.data, trigger: msg.trigger });
      break;
  }
});

// ── Start capture ────────────────────────────────────────────────────────────
async function handleStartCapture({ tabId, serverUrl }) {
  if (isCapturing) await handleStopCapture();

  captureTabId = tabId;

  // Ensure offscreen document exists
  const contexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
  });
  if (contexts.length === 0) {
    await chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: ['USER_MEDIA'],
      justification: 'Capture Google Meet tab audio for real-time transcription',
    });
  }

  // Get stream ID for the target tab (must be called from service worker)
  const streamId = await new Promise((resolve, reject) => {
    chrome.tabCapture.getMediaStreamId({ targetTabId: tabId }, (id) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(id);
      }
    });
  });

  // Hand off to offscreen document
  chrome.runtime.sendMessage({
    type: 'START_RECORDING',
    streamId,
    tabId,
    serverUrl: serverUrl || 'http://localhost:3002',
  });

  return { ok: true };
}

// ── Stop capture ─────────────────────────────────────────────────────────────
async function handleStopCapture() {
  chrome.runtime.sendMessage({ type: 'STOP_RECORDING' }).catch(() => {});

  const contexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
  });
  if (contexts.length > 0) {
    await chrome.offscreen.closeDocument();
  }

  isCapturing = false;
  captureTabId = null;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
async function broadcastToMeet(message) {
  try {
    const tabs = await chrome.tabs.query({ url: 'https://meet.google.com/*' });
    for (const tab of tabs) {
      chrome.tabs.sendMessage(tab.id, message).catch(() => {});
    }
  } catch (_) {}
}

function notifyPopup(message) {
  chrome.runtime.sendMessage(message).catch(() => {});
}
