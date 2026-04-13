// offscreen.js — Runs in hidden offscreen document
// Handles tab audio capture, chunked transcription, and analysis triggering

let mediaStream = null;
let isRecording = false;
let serverUrl = 'http://localhost:3002';
let transcriptBuffer = '';
let lastAnalyzedText = '';
let silenceTimer = null;
let maxTimer = null;

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
    // Acquire the tab's audio stream using the stream ID from tabCapture
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
    chrome.runtime.sendMessage({ type: 'CAPTURE_ERROR', error: e.message });
  }
}

// ── Chunked recording loop ────────────────────────────────────────────────
function recordNextChunk() {
  if (!isRecording || !mediaStream) return;

  const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
    ? 'audio/webm;codecs=opus'
    : 'audio/webm';

  const chunks = [];
  const recorder = new MediaRecorder(mediaStream, { mimeType });

  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  recorder.onstop = async () => {
    if (chunks.length > 0) {
      const blob = new Blob(chunks, { type: mimeType });
      // Skip tiny blobs — likely silence (< 2KB for 2s = essentially no audio)
      if (blob.size > 2000) {
        await transcribeChunk(blob);
      }
    }
    if (isRecording) recordNextChunk();
  };

  recorder.start();
  // 2-second chunks: balances latency vs. API call overhead
  setTimeout(() => {
    if (recorder.state === 'recording') recorder.stop();
  }, 2000);
}

// ── Transcribe one chunk via Next.js → Deepgram ───────────────────────────
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

    // Surface partial transcript to overlay
    chrome.runtime.sendMessage({ type: 'TRANSCRIPT_PARTIAL', text });

    scheduleAnalysis();
  } catch (_) {}
}

// ── Analysis scheduling ───────────────────────────────────────────────────
// Trigger analysis 1.5s after last transcript (speech pause), or 6s max
function scheduleAnalysis() {
  if (silenceTimer) clearTimeout(silenceTimer);

  silenceTimer = setTimeout(() => {
    flushAnalysis();
  }, 1500);

  if (!maxTimer) {
    maxTimer = setTimeout(() => {
      flushAnalysis();
    }, 6000);
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

// ── Call /api/analyze ─────────────────────────────────────────────────────
async function analyzeText(text) {
  try {
    const res = await fetch(`${serverUrl}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript: text }),
    });

    if (!res.ok) return;

    const data = await res.json();

    // Only forward if there's something worth surfacing
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
