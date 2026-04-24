// content.js — Injected into Google Meet

const SCORECARD_ITEMS = [
  { key: 'PROBLEM',     label: 'Problem',     desc: 'Clear business pain' },
  { key: 'IMPACT',      label: 'Impact',      desc: 'Cost quantified' },
  { key: 'AUTHORITY',   label: 'Authority',   desc: 'Decision maker' },
  { key: 'BUDGET',      label: 'Budget',      desc: 'Budget allocated' },
  { key: 'TIMELINE',    label: 'Timeline',    desc: 'Date + driver' },
  { key: 'CHAMPION',    label: 'Champion',    desc: 'Internal advocate' },
  { key: 'PROCESS',     label: 'Process',     desc: 'Buying steps known' },
  { key: 'COMPETITION', label: 'Competition', desc: 'Competitors known' },
];

const COMPETITOR_COLORS = {
  Salesforce:    { accent: '#38bdf8', glow: 'rgba(56,189,248,0.18)',   label: 'Salesforce CC' },
  Adobe:         { accent: '#f87171', glow: 'rgba(248,113,113,0.18)',  label: 'Adobe Commerce' },
  BigCommerce:   { accent: '#818cf8', glow: 'rgba(129,140,248,0.18)',  label: 'BigCommerce' },
  WooCommerce:   { accent: '#c084fc', glow: 'rgba(192,132,252,0.18)',  label: 'WooCommerce' },
  commercetools: { accent: '#a78bfa', glow: 'rgba(167,139,250,0.18)',  label: 'commercetools' },
  SAP:           { accent: '#fb923c', glow: 'rgba(251,146,60,0.18)',   label: 'SAP Commerce' },
  VTEX:          { accent: '#f472b6', glow: 'rgba(244,114,182,0.18)',  label: 'VTEX' },
  Custom:        { accent: '#34d399', glow: 'rgba(52,211,153,0.18)',   label: 'Custom Build' },
};

const VAULT_BASE = 'https://vault.shopify.com/search?query=';

function getCompetitorStyle(competitor) {
  const key = Object.keys(COMPETITOR_COLORS).find((k) => competitor.includes(k));
  return key ? COMPETITOR_COLORS[key] : { accent: '#94a3b8', glow: 'rgba(148,163,184,0.15)', label: competitor };
}

// ── State ─────────────────────────────────────────────────────────────────
let scores = Object.fromEntries(SCORECARD_ITEMS.map((i) => [i.key, 0]));
let cards = [];
let panelOpen = false;
let isListening = false;
const MAX_CARDS = 15;

// ── Styles ────────────────────────────────────────────────────────────────
const styleEl = document.createElement('style');
styleEl.textContent = `
  #se-root * {
    box-sizing: border-box;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
    margin: 0; padding: 0;
    -webkit-font-smoothing: antialiased;
  }

  /* ── Toggle button ─────────────────────────────────────────────────── */
  #se-toggle {
    position: fixed; right: 20px; bottom: 92px; z-index: 2147483646;
    width: 52px; height: 52px; border-radius: 50%;
    background: rgba(8, 20, 12, 0.88);
    backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
    border: 1.5px solid rgba(74,222,128,0.28);
    box-shadow: 0 8px 32px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.08);
    cursor: pointer; display: flex; align-items: center; justify-content: center;
    font-size: 22px;
    transition: transform 0.2s cubic-bezier(0.34,1.56,0.64,1), border-color 0.2s, box-shadow 0.2s;
  }
  #se-toggle:hover {
    transform: scale(1.1);
    border-color: rgba(74,222,128,0.55);
    box-shadow: 0 0 24px rgba(74,222,128,0.2), 0 8px 32px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.1);
  }
  #se-toggle.se-listening {
    background: rgba(10, 28, 12, 0.92);
    border-color: rgba(74,222,128,0.7);
    animation: se-ring 2.4s ease-in-out infinite;
  }
  #se-toggle.se-alert {
    background: rgba(30, 20, 5, 0.92);
    border-color: rgba(251,191,36,0.7);
    animation: se-ring-amber 1s ease-in-out infinite;
  }
  @keyframes se-ring {
    0%,100% { box-shadow: 0 0 0 3px rgba(74,222,128,0.1), 0 0 20px rgba(74,222,128,0.2), 0 8px 32px rgba(0,0,0,0.6); }
    50%      { box-shadow: 0 0 0 7px rgba(74,222,128,0.05), 0 0 36px rgba(74,222,128,0.32), 0 8px 32px rgba(0,0,0,0.6); }
  }
  @keyframes se-ring-amber {
    0%,100% { box-shadow: 0 0 0 3px rgba(251,191,36,0.1), 0 0 20px rgba(251,191,36,0.2), 0 8px 32px rgba(0,0,0,0.6); }
    50%      { box-shadow: 0 0 0 7px rgba(251,191,36,0.05), 0 0 32px rgba(251,191,36,0.35), 0 8px 32px rgba(0,0,0,0.6); }
  }

  /* ── Panel ─────────────────────────────────────────────────────────── */
  #se-panel {
    position: fixed; right: 0; top: 0; bottom: 0; z-index: 2147483645;
    width: 372px;
    background: linear-gradient(160deg, rgba(12,12,32,0.97) 0%, rgba(6,6,18,0.98) 100%);
    backdrop-filter: blur(40px); -webkit-backdrop-filter: blur(40px);
    border-left: 1px solid rgba(255,255,255,0.07);
    box-shadow: -24px 0 60px rgba(0,0,0,0.5);
    display: flex; flex-direction: column; overflow: hidden;
    transform: translateX(100%);
    transition: transform 0.36s cubic-bezier(0.32, 0.72, 0, 1);
  }
  #se-panel.se-open { transform: translateX(0); }

  /* ── Header ─────────────────────────────────────────────────────────── */
  #se-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 15px 16px 13px;
    background: rgba(255,255,255,0.025);
    border-bottom: 1px solid rgba(255,255,255,0.06);
    flex-shrink: 0;
  }
  #se-header-left { display: flex; align-items: center; gap: 10px; }
  .se-logo {
    width: 30px; height: 30px; border-radius: 9px;
    background: linear-gradient(135deg, #14532d, #166534);
    border: 1px solid rgba(74,222,128,0.25);
    box-shadow: 0 0 14px rgba(74,222,128,0.15), inset 0 1px 0 rgba(255,255,255,0.1);
    display: flex; align-items: center; justify-content: center; font-size: 15px;
  }
  .se-title { font-size: 13px; font-weight: 700; color: #f0f0ff; letter-spacing: -0.02em; }
  .se-live-pill {
    display: flex; align-items: center; gap: 5px;
    font-size: 10px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
    padding: 3px 8px; border-radius: 20px;
    background: rgba(74,222,128,0.1); border: 1px solid rgba(74,222,128,0.25);
    color: #4ade80; opacity: 0; transition: opacity 0.3s;
  }
  .se-live-pill.se-visible { opacity: 1; }
  .se-live-dot {
    width: 5px; height: 5px; border-radius: 50%; background: #4ade80;
    box-shadow: 0 0 6px rgba(74,222,128,0.8);
    animation: se-dot-blink 1.6s ease-in-out infinite;
  }
  @keyframes se-dot-blink { 0%,100% { opacity:1; } 50% { opacity:0.3; } }
  #se-close-btn {
    background: none; border: none; color: rgba(255,255,255,0.25);
    cursor: pointer; width: 28px; height: 28px; border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    font-size: 14px; transition: background 0.15s, color 0.15s;
  }
  #se-close-btn:hover { background: rgba(255,255,255,0.07); color: rgba(255,255,255,0.8); }

  /* ── Transcript bar ──────────────────────────────────────────────────── */
  #se-transcript-bar {
    padding: 8px 16px; min-height: 32px;
    border-bottom: 1px solid rgba(255,255,255,0.04);
    background: rgba(255,255,255,0.01);
    flex-shrink: 0; display: flex; align-items: center; gap: 8px;
  }
  #se-transcript-icon { font-size: 11px; opacity: 0.3; flex-shrink: 0; }
  #se-transcript-text {
    font-size: 11px; color: rgba(255,255,255,0.22); font-style: italic;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    flex: 1; line-height: 1.4; transition: color 0.2s;
  }
  #se-transcript-text.se-error { color: #fbbf24; font-style: normal; }

  /* ── Cards feed ──────────────────────────────────────────────────────── */
  #se-cards {
    flex: 1; overflow-y: auto; padding: 14px 12px;
    display: flex; flex-direction: column; gap: 10px;
  }
  #se-cards::-webkit-scrollbar { width: 3px; }
  #se-cards::-webkit-scrollbar-track { background: transparent; }
  #se-cards::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 2px; }

  /* ── Empty state ─────────────────────────────────────────────────────── */
  .se-empty {
    display: flex; flex-direction: column; align-items: center;
    justify-content: center; height: 100%; gap: 12px; text-align: center; padding: 24px;
  }
  .se-empty-orb {
    width: 56px; height: 56px; border-radius: 50%;
    background: rgba(74,222,128,0.06);
    border: 1px solid rgba(74,222,128,0.12);
    display: flex; align-items: center; justify-content: center; font-size: 24px;
  }
  .se-empty-title { font-size: 14px; font-weight: 600; color: rgba(255,255,255,0.25); }
  .se-empty-desc { font-size: 12px; color: rgba(255,255,255,0.14); max-width: 220px; line-height: 1.8; }

  /* ── Trigger quote ───────────────────────────────────────────────────── */
  .se-trigger {
    font-size: 10.5px; color: rgba(255,255,255,0.18); font-style: italic;
    margin-bottom: 6px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    padding: 0 3px;
  }

  /* ── Card ────────────────────────────────────────────────────────────── */
  .se-card {
    border-radius: 16px;
    border: 1px solid rgba(255,255,255,0.07);
    overflow: hidden;
    background: rgba(255,255,255,0.028);
    backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
    animation: se-card-in 0.28s cubic-bezier(0.16, 1, 0.3, 1);
    transition: transform 0.15s ease;
  }
  .se-card:hover { transform: translateY(-1px); }
  @keyframes se-card-in {
    from { opacity: 0; transform: translateY(10px) scale(0.97); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }

  /* Colored accent line at top of each card */
  .se-card-accent { height: 2px; width: 100%; }

  /* Card meta row */
  .se-card-meta {
    display: flex; align-items: center; justify-content: space-between;
    padding: 10px 14px 0;
  }
  .se-source-pill {
    display: flex; align-items: center; gap: 5px;
    font-size: 10px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase;
    padding: 2px 9px; border-radius: 20px; border: 1px solid;
  }
  .se-source-dot { width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0; }
  .se-card-time { font-size: 10px; color: rgba(255,255,255,0.2); letter-spacing: 0.01em; }

  /* Card body */
  .se-card-body { padding: 11px 14px 13px; }
  .se-card-type-label {
    font-size: 9.5px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase;
    color: rgba(255,255,255,0.25); margin-bottom: 6px;
  }
  .se-card-headline {
    font-size: 14px; font-weight: 700; color: #f0f0ff; line-height: 1.4;
    margin-bottom: 10px; letter-spacing: -0.02em;
  }
  .se-card-body-text {
    font-size: 12px; color: rgba(255,255,255,0.45); line-height: 1.7; margin-bottom: 4px;
  }

  /* Win badge */
  .se-win-badge {
    display: inline-flex; align-items: center; gap: 6px;
    font-size: 11px; font-weight: 600; letter-spacing: 0.01em;
    padding: 4px 10px; border-radius: 8px; margin-bottom: 12px;
    background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.09);
    color: rgba(255,255,255,0.4);
  }

  /* Key points */
  .se-points { list-style: none; display: flex; flex-direction: column; gap: 5px; margin-bottom: 10px; }
  .se-point {
    font-size: 12px; color: rgba(255,255,255,0.5); line-height: 1.55;
    display: flex; gap: 8px; align-items: flex-start;
  }
  .se-point-bullet {
    width: 14px; height: 14px; border-radius: 4px; flex-shrink: 0; margin-top: 1px;
    display: flex; align-items: center; justify-content: center;
    background: rgba(255,255,255,0.06); font-size: 8px; color: rgba(255,255,255,0.3);
  }

  /* Rebuttal box */
  .se-rebuttal {
    margin-top: 10px;
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 10px; padding: 11px 13px;
  }
  .se-rebuttal-label {
    font-size: 9px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase;
    color: rgba(255,255,255,0.25); margin-bottom: 6px;
  }
  .se-rebuttal-text { font-size: 12px; color: rgba(134,211,105,0.9); line-height: 1.65; }

  /* Fit card stat */
  .se-stat {
    margin-top: 10px; padding: 8px 11px; border-radius: 9px;
    font-size: 11.5px; font-weight: 600;
    background: rgba(74,222,128,0.06); border: 1px solid rgba(74,222,128,0.15);
    color: rgba(74,222,128,0.85);
  }

  /* Coaching card */
  .se-coaching-card {
    border-radius: 16px; overflow: hidden;
    border: 1px solid rgba(251,191,36,0.15);
    background: rgba(251,191,36,0.03);
    backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
    box-shadow: 0 0 30px rgba(251,191,36,0.06);
    animation: se-card-in 0.28s cubic-bezier(0.16, 1, 0.3, 1);
  }

  /* Action buttons */
  .se-card-actions { display: flex; gap: 8px; padding: 0 14px 14px; }
  .se-btn {
    flex: 1; padding: 8px 12px; border-radius: 10px; border: 1px solid;
    cursor: pointer; font-size: 11.5px; font-weight: 600;
    display: flex; align-items: center; justify-content: center; gap: 5px;
    letter-spacing: 0.01em;
    transition: background 0.15s, border-color 0.15s, transform 0.12s, box-shadow 0.15s;
  }
  .se-btn:hover { transform: translateY(-1px); }
  .se-btn:active { transform: translateY(0); }
  .se-btn-vault {
    background: rgba(74,222,128,0.1); border-color: rgba(74,222,128,0.22); color: #4ade80;
  }
  .se-btn-vault:hover {
    background: rgba(74,222,128,0.18); border-color: rgba(74,222,128,0.38);
    box-shadow: 0 4px 14px rgba(74,222,128,0.12);
  }
  .se-btn-dismiss {
    background: rgba(255,255,255,0.03); border-color: rgba(255,255,255,0.08);
    color: rgba(255,255,255,0.28);
  }
  .se-btn-dismiss:hover {
    background: rgba(255,255,255,0.06); border-color: rgba(255,255,255,0.12);
    color: rgba(255,255,255,0.5);
  }

  /* ── Scorecard ───────────────────────────────────────────────────────── */
  #se-scorecard {
    flex-shrink: 0; border-top: 1px solid rgba(255,255,255,0.05);
    background: rgba(255,255,255,0.015); max-height: 220px; overflow-y: auto;
  }
  #se-scorecard::-webkit-scrollbar { width: 2px; }
  #se-scorecard::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.07); }
  #se-score-header {
    display: flex; justify-content: space-between; align-items: center;
    padding: 11px 16px 8px;
  }
  .se-score-section-label {
    font-size: 9px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase;
    color: rgba(255,255,255,0.2);
  }
  #se-score-total {
    font-size: 12px; font-weight: 700; color: rgba(255,255,255,0.6); letter-spacing: -0.01em;
  }
  .se-score-row {
    display: flex; align-items: center; gap: 10px;
    padding: 6px 16px;
  }
  .se-score-name {
    font-size: 11px; font-weight: 500; width: 76px; flex-shrink: 0;
    color: rgba(255,255,255,0.25); letter-spacing: -0.01em;
    transition: color 0.2s;
  }
  .se-score-name.se-active { color: rgba(255,255,255,0.7); }
  .se-score-track {
    flex: 1; display: flex; gap: 3px;
  }
  .se-score-seg {
    flex: 1; height: 4px; border-radius: 2px;
    background: rgba(255,255,255,0.06);
    cursor: pointer; transition: transform 0.1s, background 0.15s;
  }
  .se-score-seg:hover { transform: scaleY(1.5); }
  .se-score-seg.se-filled-green { background: #4ade80; box-shadow: 0 0 6px rgba(74,222,128,0.45); }
  .se-score-seg.se-filled-yellow { background: #fbbf24; }
  .se-score-seg.se-filled-red { background: #f87171; }
  .se-score-val {
    font-size: 10px; font-weight: 600; width: 18px; text-align: right; flex-shrink: 0;
    color: rgba(255,255,255,0.2); transition: color 0.2s;
  }
  .se-score-val.se-active { color: rgba(255,255,255,0.55); }
`;
document.head.appendChild(styleEl);

// ── DOM ───────────────────────────────────────────────────────────────────
const root = document.createElement('div');
root.id = 'se-root';
document.body.appendChild(root);

// Toggle button
const toggleBtn = document.createElement('button');
toggleBtn.id = 'se-toggle';
toggleBtn.innerHTML = '🎯';
toggleBtn.title = 'Shopi Eval Bot';
toggleBtn.addEventListener('click', () => setPanel(!panelOpen));
root.appendChild(toggleBtn);

// Panel
const panel = document.createElement('div');
panel.id = 'se-panel';
panel.innerHTML = `
  <div id="se-header">
    <div id="se-header-left">
      <div class="se-logo">🎯</div>
      <span class="se-title">Shopi Eval Bot</span>
    </div>
    <div style="display:flex;align-items:center;gap:8px">
      <div class="se-live-pill" id="se-live-pill">
        <div class="se-live-dot"></div>
        <span>Live</span>
      </div>
      <button id="se-close-btn">✕</button>
    </div>
  </div>
  <div id="se-transcript-bar">
    <span id="se-transcript-icon">◎</span>
    <span id="se-transcript-text">Waiting for audio…</span>
  </div>
  <div id="se-cards"></div>
  <div id="se-scorecard">
    <div id="se-score-header">
      <span class="se-score-section-label">Qualification Score</span>
      <span id="se-score-total">0 / 8</span>
    </div>
    <div id="se-score-rows"></div>
  </div>
`;
root.appendChild(panel);
panel.querySelector('#se-close-btn').addEventListener('click', () => setPanel(false));

// ── Panel toggle ──────────────────────────────────────────────────────────
function setPanel(open) {
  panelOpen = open;
  panel.classList.toggle('se-open', open);
  if (open) { renderScorecard(); renderCards(); }
}

// ── Scorecard ─────────────────────────────────────────────────────────────
function renderScorecard() {
  const rowsEl = document.getElementById('se-score-rows');
  const totalEl = document.getElementById('se-score-total');
  if (!rowsEl) return;

  rowsEl.innerHTML = '';
  let qualified = 0;

  SCORECARD_ITEMS.forEach(({ key, label }) => {
    const score = scores[key] || 0;
    if (score >= 3) qualified++;

    const row = document.createElement('div');
    row.className = 'se-score-row';

    const nameEl = document.createElement('span');
    nameEl.className = 'se-score-name' + (score >= 3 ? ' se-active' : '');
    nameEl.textContent = label;
    row.appendChild(nameEl);

    const track = document.createElement('div');
    track.className = 'se-score-track';
    [1,2,3,4,5].forEach((v) => {
      const seg = document.createElement('div');
      seg.className = 'se-score-seg';
      if (v <= score) {
        seg.classList.add(score >= 4 ? 'se-filled-green' : score >= 2 ? 'se-filled-yellow' : 'se-filled-red');
      }
      seg.addEventListener('click', () => { scores[key] = v; renderScorecard(); });
      track.appendChild(seg);
    });
    row.appendChild(track);

    const valEl = document.createElement('span');
    valEl.className = 'se-score-val' + (score > 0 ? ' se-active' : '');
    valEl.textContent = score > 0 ? score : '—';
    row.appendChild(valEl);

    rowsEl.appendChild(row);
  });

  if (totalEl) {
    totalEl.textContent = `${qualified} / 8`;
    totalEl.style.color = qualified >= 6 ? '#4ade80' : qualified >= 4 ? '#fbbf24' : 'rgba(255,255,255,0.6)';
  }
}

// ── Cards ─────────────────────────────────────────────────────────────────
function renderCards() {
  const cardsEl = document.getElementById('se-cards');
  if (!cardsEl) return;

  if (cards.length === 0) {
    cardsEl.innerHTML = `
      <div class="se-empty">
        <div class="se-empty-orb">🎯</div>
        <div class="se-empty-title">Listening for signals</div>
        <div class="se-empty-desc">Competitor names surface battlecards. Pain points surface Shopify fit cards.</div>
      </div>`;
    return;
  }

  cardsEl.innerHTML = '';
  cards.forEach((card) => {
    const wrap = document.createElement('div');

    const onDismiss = () => {
      cards = cards.filter((c) => c.id !== card.id);
      wrap.remove();
    };

    if (card.trigger) {
      const t = document.createElement('div');
      t.className = 'se-trigger';
      t.textContent = `"${card.trigger.substring(0, 72)}${card.trigger.length > 72 ? '…' : ''}"`;
      wrap.appendChild(t);
    }

    if (card.type === 'battlecard' && card.battlecard) {
      wrap.appendChild(buildBattlecard(card.battlecard, onDismiss));
    } else if (card.type === 'fitcard' && card.fitCard) {
      wrap.appendChild(buildFitCard(card.fitCard, onDismiss));
    } else if (card.type === 'coaching' && card.coachingNote) {
      wrap.appendChild(buildCoachingCard(card.coachingNote));
    }

    cardsEl.appendChild(wrap);
  });

  cardsEl.scrollTop = cardsEl.scrollHeight;
}

function nowTime() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ── Card builders ─────────────────────────────────────────────────────────
function buildBattlecard(bc, onDismiss) {
  const style = getCompetitorStyle(bc.competitor);

  const card = document.createElement('div');
  card.className = 'se-card';
  card.style.boxShadow = `0 0 0 1px ${style.glow.replace('0.18', '0.35')}, 0 4px 28px ${style.glow}, inset 0 1px 0 rgba(255,255,255,0.05)`;

  // Colored accent line
  const accent = document.createElement('div');
  accent.className = 'se-card-accent';
  accent.style.background = `linear-gradient(90deg, ${style.accent}, transparent)`;
  card.appendChild(accent);

  // Meta row
  const meta = document.createElement('div');
  meta.className = 'se-card-meta';

  const pill = document.createElement('div');
  pill.className = 'se-source-pill';
  pill.style.color = style.accent;
  pill.style.borderColor = style.accent + '35';
  pill.style.background = style.accent + '10';
  const dot = document.createElement('div');
  dot.className = 'se-source-dot';
  dot.style.background = style.accent;
  dot.style.boxShadow = `0 0 5px ${style.accent}`;
  pill.appendChild(dot);
  pill.appendChild(document.createTextNode(style.label));
  meta.appendChild(pill);

  const time = document.createElement('span');
  time.className = 'se-card-time';
  time.textContent = nowTime();
  meta.appendChild(time);
  card.appendChild(meta);

  // Body
  const body = document.createElement('div');
  body.className = 'se-card-body';

  const typeLabel = document.createElement('div');
  typeLabel.className = 'se-card-type-label';
  typeLabel.textContent = 'Battlecard';
  body.appendChild(typeLabel);

  const headline = document.createElement('div');
  headline.className = 'se-card-headline';
  headline.textContent = bc.headline;
  body.appendChild(headline);

  if (bc.winRateNote) {
    const badge = document.createElement('div');
    badge.className = 'se-win-badge';
    badge.innerHTML = `<span style="opacity:0.6">📊</span> ${bc.winRateNote}`;
    body.appendChild(badge);
  }

  const pts = document.createElement('ul');
  pts.className = 'se-points';
  (bc.keyPoints || []).forEach((p) => {
    const li = document.createElement('li');
    li.className = 'se-point';
    const bullet = document.createElement('div');
    bullet.className = 'se-point-bullet';
    bullet.textContent = '→';
    li.appendChild(bullet);
    li.appendChild(document.createTextNode(p));
    pts.appendChild(li);
  });
  body.appendChild(pts);

  if (bc.objectionResponse) {
    const rb = document.createElement('div');
    rb.className = 'se-rebuttal';
    const lbl = document.createElement('div');
    lbl.className = 'se-rebuttal-label';
    lbl.textContent = 'Suggested response';
    rb.appendChild(lbl);
    const txt = document.createElement('div');
    txt.className = 'se-rebuttal-text';
    txt.textContent = bc.objectionResponse;
    rb.appendChild(txt);
    body.appendChild(rb);
  }

  card.appendChild(body);

  // Actions
  const actions = document.createElement('div');
  actions.className = 'se-card-actions';

  const vaultBtn = document.createElement('button');
  vaultBtn.className = 'se-btn se-btn-vault';
  vaultBtn.innerHTML = '⊞ Vault';
  vaultBtn.addEventListener('click', () => {
    window.open(VAULT_BASE + encodeURIComponent(bc.competitor + ' battlecard'), '_blank');
  });

  const dismissBtn = document.createElement('button');
  dismissBtn.className = 'se-btn se-btn-dismiss';
  dismissBtn.textContent = 'Dismiss';
  dismissBtn.addEventListener('click', onDismiss);

  actions.appendChild(vaultBtn);
  actions.appendChild(dismissBtn);
  card.appendChild(actions);

  return card;
}

function buildFitCard(fc, onDismiss) {
  const card = document.createElement('div');
  card.className = 'se-card';
  card.style.boxShadow = '0 0 0 1px rgba(74,222,128,0.18), 0 4px 28px rgba(74,222,128,0.06), inset 0 1px 0 rgba(255,255,255,0.05)';

  const accent = document.createElement('div');
  accent.className = 'se-card-accent';
  accent.style.background = 'linear-gradient(90deg, #4ade80, transparent)';
  card.appendChild(accent);

  const meta = document.createElement('div');
  meta.className = 'se-card-meta';

  const pill = document.createElement('div');
  pill.className = 'se-source-pill';
  pill.style.color = '#4ade80';
  pill.style.borderColor = 'rgba(74,222,128,0.25)';
  pill.style.background = 'rgba(74,222,128,0.08)';
  const dot = document.createElement('div');
  dot.className = 'se-source-dot';
  dot.style.background = '#4ade80';
  dot.style.boxShadow = '0 0 5px #4ade80';
  pill.appendChild(dot);
  pill.appendChild(document.createTextNode('Shopify Fit'));
  meta.appendChild(pill);

  const time = document.createElement('span');
  time.className = 'se-card-time';
  time.textContent = nowTime();
  meta.appendChild(time);
  card.appendChild(meta);

  const body = document.createElement('div');
  body.className = 'se-card-body';

  const typeLabel = document.createElement('div');
  typeLabel.className = 'se-card-type-label';
  typeLabel.textContent = 'Fit Card';
  body.appendChild(typeLabel);

  const headline = document.createElement('div');
  headline.className = 'se-card-headline';
  headline.textContent = fc.painPoint;
  body.appendChild(headline);

  const sol = document.createElement('div');
  sol.className = 'se-card-body-text';
  sol.textContent = fc.shopifySolution;
  body.appendChild(sol);

  if (fc.stat) {
    const stat = document.createElement('div');
    stat.className = 'se-stat';
    stat.innerHTML = `<span style="opacity:0.7">📊</span> ${fc.stat}`;
    body.appendChild(stat);
  }

  card.appendChild(body);

  const actions = document.createElement('div');
  actions.className = 'se-card-actions';
  const dismissBtn = document.createElement('button');
  dismissBtn.className = 'se-btn se-btn-dismiss';
  dismissBtn.textContent = 'Dismiss';
  dismissBtn.addEventListener('click', onDismiss);
  actions.appendChild(dismissBtn);
  card.appendChild(actions);

  return card;
}

function buildCoachingCard(note) {
  const card = document.createElement('div');
  card.className = 'se-coaching-card';

  const accent = document.createElement('div');
  accent.className = 'se-card-accent';
  accent.style.background = 'linear-gradient(90deg, #fbbf24, transparent)';
  card.appendChild(accent);

  const meta = document.createElement('div');
  meta.className = 'se-card-meta';
  meta.style.paddingTop = '10px';
  const pill = document.createElement('div');
  pill.className = 'se-source-pill';
  pill.style.color = '#fbbf24';
  pill.style.borderColor = 'rgba(251,191,36,0.25)';
  pill.style.background = 'rgba(251,191,36,0.08)';
  const dot = document.createElement('div');
  dot.className = 'se-source-dot';
  dot.style.background = '#fbbf24';
  dot.style.boxShadow = '0 0 5px #fbbf24';
  pill.appendChild(dot);
  pill.appendChild(document.createTextNode('Coaching'));
  meta.appendChild(pill);
  const time = document.createElement('span');
  time.className = 'se-card-time';
  time.textContent = nowTime();
  meta.appendChild(time);
  card.appendChild(meta);

  const body = document.createElement('div');
  body.className = 'se-card-body';
  const typeLabel = document.createElement('div');
  typeLabel.className = 'se-card-type-label';
  typeLabel.textContent = 'Coaching Note';
  body.appendChild(typeLabel);
  const txt = document.createElement('div');
  txt.style.fontSize = '13px';
  txt.style.fontWeight = '500';
  txt.style.color = 'rgba(251,191,36,0.85)';
  txt.style.lineHeight = '1.6';
  txt.textContent = note;
  body.appendChild(txt);
  card.appendChild(body);
  return card;
}

// ── Transcript error ──────────────────────────────────────────────────────
let errorTimer = null;
function showTranscriptError(msg) {
  const el = document.getElementById('se-transcript-text');
  if (!el) return;
  el.textContent = '⚠ ' + msg;
  el.classList.add('se-error');
  if (errorTimer) clearTimeout(errorTimer);
  errorTimer = setTimeout(() => {
    el.classList.remove('se-error');
    el.textContent = isListening ? '' : 'Waiting for audio…';
    errorTimer = null;
  }, 4000);
}

// ── Message listener ──────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'PING') {
    sendResponse({ pong: true });
    return false;
  }

  switch (msg.type) {
    case 'LISTENING_STARTED': {
      isListening = true;
      document.getElementById('se-live-pill')?.classList.add('se-visible');
      const txt = document.getElementById('se-transcript-text');
      if (txt) txt.textContent = '';
      toggleBtn.classList.add('se-listening');
      toggleBtn.classList.remove('se-alert');
      setPanel(true);
      break;
    }

    case 'LISTENING_STOPPED': {
      isListening = false;
      document.getElementById('se-live-pill')?.classList.remove('se-visible');
      const txt = document.getElementById('se-transcript-text');
      if (txt) txt.textContent = 'Stopped — open extension to resume';
      toggleBtn.classList.remove('se-listening');
      break;
    }

    case 'TRANSCRIPT_UPDATE': {
      const el = document.getElementById('se-transcript-text');
      if (el && !el.classList.contains('se-error')) el.textContent = msg.text;
      break;
    }

    case 'TRANSCRIPT_ERROR': {
      showTranscriptError(msg.error);
      break;
    }

    case 'CARD_UPDATE': {
      const { data, trigger } = msg;

      if (data.scorecardUpdates) {
        Object.entries(data.scorecardUpdates).forEach(([k, v]) => {
          if (v !== null && v !== undefined) scores[k] = v;
        });
      }

      const newCards = [];

      if (data.battlecard) {
        const seen = cards.some(
          (c) => c.type === 'battlecard' && c.battlecard?.competitor === data.battlecard.competitor
        );
        if (!seen) {
          newCards.push({ id: Date.now() + 'b', type: 'battlecard', trigger, battlecard: data.battlecard });
        }
      }

      if (data.fitCard) {
        const seen = cards.some(
          (c) => c.type === 'fitcard' && c.fitCard?.painPoint === data.fitCard.painPoint
        );
        if (!seen) {
          newCards.push({ id: Date.now() + 'f', type: 'fitcard', trigger, fitCard: data.fitCard });
        }
      }

      if (data.coachingNote && newCards.length === 0) {
        newCards.push({ id: Date.now() + 'c', type: 'coaching', trigger, coachingNote: data.coachingNote });
      }

      if (newCards.length > 0) {
        cards = [...cards, ...newCards];
        if (cards.length > MAX_CARDS) cards = cards.slice(cards.length - MAX_CARDS);

        if (panelOpen) {
          renderCards();
        } else {
          toggleBtn.classList.add('se-alert');
          toggleBtn.innerHTML = '!';
          setTimeout(() => {
            toggleBtn.innerHTML = '🎯';
            toggleBtn.classList.remove('se-alert');
            if (isListening) toggleBtn.classList.add('se-listening');
          }, 3000);
        }
      }

      if (panelOpen) renderScorecard();
      break;
    }
  }
});

renderScorecard();
