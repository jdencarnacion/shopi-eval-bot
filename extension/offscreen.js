// offscreen.js — Runs in hidden offscreen document

let mediaStream = null;
let isRecording = false;
let serverUrl = 'http://localhost:3002';
let transcriptBuffer = '';
let lastAnalyzedText = '';
let silenceTimer = null;
let maxTimer = null;

// Signal to background.js that this document is loaded and ready
chrome.runtime.sendMessage({ type: 'OFFSCREEN_READY' }).catch(() => {});

// ── Message router ────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'START_RECORDING') {
    startRecording(msg.streamId, msg.serverUrl);
  }
  if (msg.type === 'STOP_RECORDING') {
    stopRecording();
  }
});

// ── Start recording ───────────────────────────────────────────────────────
async function startRecording(streamId, url) {
  if (isRecording) return;
  serverUrl = url || 'http://localhost:3002';

  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        mandatory: {
          chromeMediaSource: 'tab',
          chromeMediaSourceId: streamId,
        },
      },
      video: false,
    });

    isRecording = true;
    chrome.runtime.sendMessage({ type: 'CAPTURE_STARTED' });
    recordNextChunk();
  } catch (e) {
    chrome.runtime.sendMessage({
      type: 'CAPTURE_ERROR',
      error: 'Mic access failed: ' + e.message,
    });
  }
}

// ── Chunked recording loop ────────────────────────────────────────────────
function recordNextChunk() {
  if (!isRecording || !mediaStream) return;

  const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
    ? 'audio/webm;codecs=opus'
    : 'audio/webm';

  const chunks = [];
  let recorder;

  try {
    recorder = new MediaRecorder(mediaStream, { mimeType });
  } catch (e) {
    chrome.runtime.sendMessage({ type: 'CAPTURE_ERROR', error: 'MediaRecorder failed: ' + e.message });
    return;
  }

  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  recorder.onstop = async () => {
    if (chunks.length > 0) {
      const blob = new Blob(chunks, { type: mimeType });
      if (blob.size > 2000) await transcribeChunk(blob);
    }
    if (isRecording) recordNextChunk();
  };

  recorder.onerror = (e) => {
    chrome.runtime.sendMessage({ type: 'CAPTURE_ERROR', error: 'Recorder error: ' + e.error?.message });
  };

  recorder.start();
  setTimeout(() => {
    if (recorder.state === 'recording') recorder.stop();
  }, 2000);
}

// ── Transcribe one chunk via Next.js → Whisper ───────────────────────────
async function transcribeChunk(blob) {
  try {
    const form = new FormData();
    form.append('audio', blob, 'chunk.webm');

    const res = await fetch(`${serverUrl}/api/transcribe`, {
      method: 'POST',
      body: form,
    });

    if (!res.ok) return;

    const { transcript } = await res.json();
    if (!transcript || transcript.trim().length < 3) return;

    const text = transcript.trim();
    transcriptBuffer = (transcriptBuffer + ' ' + text).trim();

    chrome.runtime.sendMessage({ type: 'TRANSCRIPT_PARTIAL', text });
    scheduleAnalysis();
  } catch (_) {}
}

// ── Analysis scheduling ───────────────────────────────────────────────────
function scheduleAnalysis() {
  if (silenceTimer) clearTimeout(silenceTimer);
  silenceTimer = setTimeout(flushAnalysis, 1500);

  if (!maxTimer) {
    maxTimer = setTimeout(flushAnalysis, 6000);
  }
}

function flushAnalysis() {
  if (silenceTimer) { clearTimeout(silenceTimer); silenceTimer = null; }
  if (maxTimer) { clearTimeout(maxTimer); maxTimer = null; }

  const text = transcriptBuffer.trim();
  transcriptBuffer = '';

  if (!text || text === lastAnalyzedText || text.length < 8) return;
  lastAnalyzedText = text;
  analyzeText(text);
}

// ── Analyze ───────────────────────────────────────────────────────────────
async function analyzeText(text) {
  try {
    const res = await fetch(`${serverUrl}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript: text }),
    });

    if (!res.ok) return;
    const data = await res.json();

    if (data.battlecard || data.fitCard || data.coachingNote || data.scorecardUpdates) {
      chrome.runtime.sendMessage({ type: 'ANALYSIS_RESULT', data, trigger: text });
    }
  } catch (_) {}
}

// ── Stop recording ────────────────────────────────────────────────────────
function stopRecording() {
  isRecording = false;
  if (silenceTimer) { clearTimeout(silenceTimer); silenceTimer = null; }
  if (maxTimer) { clearTimeout(maxTimer); maxTimer = null; }
  transcriptBuffer = '';

  if (mediaStream) {
    mediaStream.getTracks().forEach((t) => t.stop());
    mediaStream = null;
  }

  chrome.runtime.sendMessage({ type: 'CAPTURE_STOPPED' });
}
