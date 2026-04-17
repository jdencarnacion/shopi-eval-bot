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

    case 'ANALYSIS_RESULT':
      broadcastToMeet({ type: 'CARD_UPDATE', data: msg.data, trigger: msg.trigger });
      break;
  }
});

// ── Start capture ────────────────────────────────────────────────────────────
async function handleStartCapture({ tabId, serverUrl }) {
  if (isCapturing) await handleStopCapture();
  captureTabId = tabId;

  // 1. Get the stream ID FIRST — it has a short validity window
  const streamId = await new Promise((resolve, reject) => {
    chrome.tabCapture.getMediaStreamId({ targetTabId: tabId }, (id) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(id);
      }
    });
  });

  // 2. Store the payload so it can be sent once offscreen signals ready
  pendingStartPayload = {
    type: 'START_RECORDING',
    streamId,
    tabId,
    serverUrl: serverUrl || 'http://localhost:3002',
  };

  // 3. Create offscreen document (or reuse existing one)
  const contexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
  });

  if (contexts.length > 0) {
    // Already exists — send immediately, it's already ready
    const payload = pendingStartPayload;
    pendingStartPayload = null;
    chrome.runtime.sendMessage(payload).catch((e) => {
      notifyPopup({ type: 'ERROR', error: e.message });
    });
  } else {
    // Creating fresh — will send after OFFSCREEN_READY fires
    await chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: ['USER_MEDIA'],
      justification: 'Capture Google Meet tab audio for real-time transcription',
    });
    // pendingStartPayload will be sent when offscreen.js sends OFFSCREEN_READY
    // Fallback: if OFFSCREEN_READY never arrives, send after 500ms
    setTimeout(() => {
      if (pendingStartPayload) {
        const payload = pendingStartPayload;
        pendingStartPayload = null;
        chrome.runtime.sendMessage(payload).catch(() => {});
      }
    }, 500);
  }

  return { ok: true };
}

// ── Stop capture ─────────────────────────────────────────────────────────────
async function handleStopCapture() {
  pendingStartPayload = null;
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
