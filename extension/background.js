// background.js — Service Worker

let isCapturing = false;
let captureTabId = null;
let pendingStartPayload = null; // Held until offscreen signals ready

// ── Message router ──────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  switch (msg.type) {
    case 'START_CAPTURE':
      handleStartCapture(msg)
        .then((r) => sendResponse(r))
        .catch((e) => sendResponse({ error: e.message }));
      return true;

    case 'STOP_CAPTURE':
      handleStopCapture()
        .then(() => sendResponse({ ok: true }));
      return true;

    case 'GET_STATUS':
      sendResponse({ isCapturing, captureTabId });
      return false;

    // Offscreen document signals it has loaded and is ready for messages
    case 'OFFSCREEN_READY':
      if (pendingStartPayload) {
        const payload = pendingStartPayload;
        pendingStartPayload = null;
        chrome.runtime.sendMessage(payload).catch((e) => {
          notifyPopup({ type: 'ERROR', error: 'Offscreen start failed: ' + e.message });
        });
      }
      break;

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

    case 'TRANSCRIPT_ERROR':
      broadcastToMeet({ type: 'TRANSCRIPT_ERROR', error: msg.error });
      break;

    case 'ANALYSIS_RESULT':
      broadcastToMeet({ type: 'CARD_UPDATE', data: msg.data, trigger: msg.trigger });
      break;
  }
});

// ── Start capture ────────────────────────────────────────────────────────────
async function handleStartCapture({ tabId, serverUrl }) {
  captureTabId = tabId;
  pendingStartPayload = null;

  // 1. Always tear down any existing offscreen document — never reuse.
  //    Reusing risks sending START_RECORDING to an offscreen whose isRecording
  //    is still true (stale state after service worker sleep), causing a silent no-op.
  try {
    const contexts = await chrome.runtime.getContexts({
      contextTypes: ['OFFSCREEN_DOCUMENT'],
    });
    if (contexts.length > 0) {
      chrome.runtime.sendMessage({ type: 'STOP_RECORDING' }).catch(() => {});
      await chrome.offscreen.closeDocument();
    }
  } catch (e) {
    // Already closed or never existed — safe to continue
    console.warn('Offscreen pre-cleanup:', e.message);
  }
  isCapturing = false;

  // 2. Get the stream ID — must happen before createDocument (short validity window)
  const streamId = await new Promise((resolve, reject) => {
    chrome.tabCapture.getMediaStreamId({ targetTabId: tabId }, (id) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(id);
      }
    });
  });

  // 3. Store payload, then create a fresh offscreen document
  pendingStartPayload = {
    type: 'START_RECORDING',
    streamId,
    tabId,
    serverUrl: serverUrl || 'http://localhost:3002',
  };

  await chrome.offscreen.createDocument({
    url: 'offscreen.html',
    reasons: ['USER_MEDIA'],
    justification: 'Capture Google Meet tab audio for real-time transcription',
  });
  // pendingStartPayload sent when offscreen.js fires OFFSCREEN_READY.
  // Fallback: if OFFSCREEN_READY never arrives within 800ms, send anyway.
  setTimeout(() => {
    if (pendingStartPayload) {
      const payload = pendingStartPayload;
      pendingStartPayload = null;
      chrome.runtime.sendMessage(payload).catch(() => {});
    }
  }, 800);

  return { ok: true };
}

// ── Stop capture ─────────────────────────────────────────────────────────────
async function handleStopCapture() {
  pendingStartPayload = null;
  chrome.runtime.sendMessage({ type: 'STOP_RECORDING' }).catch(() => {});

  try {
    const contexts = await chrome.runtime.getContexts({
      contextTypes: ['OFFSCREEN_DOCUMENT'],
    });
    if (contexts.length > 0) {
      await chrome.offscreen.closeDocument();
    }
  } catch (e) {
    console.warn('closeDocument on stop:', e.message);
  }

  // Always reset state — even if closeDocument threw
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
