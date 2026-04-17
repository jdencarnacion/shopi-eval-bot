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
  Salesforce:    { accent: '#00a1e0', glow: 'rgba(0,161,224,0.25)',  label: 'SFCC' },
  Adobe:         { accent: '#ff5c5c', glow: 'rgba(255,92,92,0.25)',  label: 'Adobe' },
  BigCommerce:   { accent: '#7b7ff5', glow: 'rgba(123,127,245,0.25)', label: 'BigCommerce' },
  WooCommerce:   { accent: '#9b59b6', glow: 'rgba(155,89,182,0.25)', label: 'WooCommerce' },
  commercetools: { accent: '#a78bfa', glow: 'rgba(167,139,250,0.25)', label: 'commercetools' },
  SAP:           { accent: '#f59e0b', glow: 'rgba(245,158,11,0.25)', label: 'SAP' },
  VTEX:          { accent: '#ec4899', glow: 'rgba(236,72,153,0.25)', label: 'VTEX' },
  Custom:        { accent: '#6ee7b7', glow: 'rgba(110,231,183,0.25)', label: 'Custom Build' },
};

function getCompetitorStyle(competitor) {
  const key = Object.keys(COMPETITOR_COLORS).find((k) => competitor.includes(k));
  return key ? COMPETITOR_COLORS[key] : { accent: '#7c3aed', glow: 'rgba(124,58,237,0.25)', label: competitor };
}

// ── State ─────────────────────────────────────────────────────────────────
let scores = Object.fromEntries(SCORECARD_ITEMS.map((i) => [i.key, 0]));
let cards = [];
let panelOpen = false;
let isListening = false;

// ── Styles ────────────────────────────────────────────────────────────────
const styleEl = document.createElement('style');
styleEl.textContent = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

  #se-root * {
    box-sizing: border-box;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    margin: 0; padding: 0;
  }

  /* ── Toggle button ── */
  #se-toggle {
    position: fixed; right: 18px; bottom: 88px; z-index: 2147483646;
    width: 48px; height: 48px; border-radius: 50%;
    background: linear-gradient(135deg, #1a2a1a, #2d4a1e);
    border: 1px solid rgba(110,231,155,0.4);
    box-shadow: 0 0 16px rgba(110,231,155,0.3), 0 4px 20px rgba(0,0,0,0.6);
    cursor: pointer; display: flex; align-items: center; justify-content: center;
    font-size: 20px; transition: transform .2s, box-shadow .2s;
    color: #fff;
  }
  #se-toggle:hover { transform: scale(1.1); box-shadow: 0 0 28px rgba(110,231,155,0.5), 0 4px 24px rgba(0,0,0,0.7); }
  #se-toggle.se-listening {
    background: linear-gradient(135deg, #166534, #15803d);
    border-color: rgba(74,222,128,0.6);
    animation: se-toggle-pulse 2.5s ease-in-out infinite;
  }
  #se-toggle.se-alert {
    background: linear-gradient(135deg, #78350f, #b45309);
    border-color: rgba(251,191,36,0.6);
    animation: se-toggle-pulse-amber 1s ease-in-out infinite;
  }
  @keyframes se-toggle-pulse {
    0%,100% { box-shadow: 0 0 16px rgba(74,222,128,0.4), 0 4px 20px rgba(0,0,0,0.6); }
    50%      { box-shadow: 0 0 32px rgba(74,222,128,0.7), 0 4px 24px rgba(0,0,0,0.7); }
  }
  @keyframes se-toggle-pulse-amber {
    0%,100% { box-shadow: 0 0 16px rgba(251,191,36,0.4), 0 4px 20px rgba(0,0,0,0.6); }
    50%      { box-shadow: 0 0 32px rgba(251,191,36,0.7), 0 4px 24px rgba(0,0,0,0.7); }
  }

  /* ── Panel ── */
  #se-panel {
    position: fixed; right: 0; top: 0; bottom: 0; z-index: 2147483645;
    width: 360px;
    background: linear-gradient(180deg, #0c0c18 0%, #0a0a14 100%);
    border-left: 1px solid rgba(255,255,255,0.07);
    display: flex; flex-direction: column; overflow: hidden;
    transform: translateX(100%); transition: transform .28s cubic-bezier(.4,0,.2,1);
  }
  #se-panel.se-open { transform: translateX(0); }

  /* ── Header ── */
  #se-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 14px 16px 12px;
    background: rgba(255,255,255,0.03);
    border-bottom: 1px solid rgba(255,255,255,0.06);
    flex-shrink: 0;
  }
  #se-header-left { display: flex; align-items: center; gap: 8px; }
  .se-logo {
    width: 28px; height: 28px; border-radius: 8px;
    background: linear-gradient(135deg, #166534, #15803d);
    border: 1px solid rgba(74,222,128,0.3);
    display: flex; align-items: center; justify-content: center;
    font-size: 14px;
    box-shadow: 0 0 10px rgba(74,222,128,0.2);
  }
  .se-title { font-size: 13px; font-weight: 700; color: #f0f0ff; letter-spacing: -.01em; }
  .se-badge {
    font-size: 10px; font-weight: 600; color: rgba(255,255,255,0.35);
    background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
    padding: 2px 7px; border-radius: 20px; letter-spacing: .02em;
  }
  #se-close-btn {
    background: none; border: none; color: rgba(255,255,255,0.3);
    cursor: pointer; font-size: 16px; line-height: 1;
    width: 26px; height: 26px; border-radius: 6px;
    display: flex; align-items: center; justify-content: center;
    transition: background .15s, color .15s;
  }
  #se-close-btn:hover { background: rgba(255,255,255,0.08); color: #f0f0ff; }

  /* ── Status bar ── */
  #se-status {
    display: flex; align-items: center; gap: 7px;
    padding: 8px 16px;
    background: rgba(255,255,255,0.02);
    border-bottom: 1px solid rgba(255,255,255,0.04);
    flex-shrink: 0; font-size: 11px; color: rgba(255,255,255,0.35);
    font-weight: 500;
  }
  #se-status-dot {
    width: 6px; height: 6px; border-radius: 50%;
    background: rgba(255,255,255,0.15); flex-shrink: 0;
  }
  #se-status-dot.se-active {
    background: #4ade80;
    box-shadow: 0 0 6px rgba(74,222,128,0.8);
    animation: se-dot-pulse 1.8s ease-in-out infinite;
  }
  @keyframes se-dot-pulse { 0%,100% { opacity:1; } 50% { opacity:.4; } }

  /* ── Transcript ticker ── */
  #se-transcript {
    padding: 6px 16px; min-height: 28px; font-size: 11px;
    color: rgba(255,255,255,0.25); font-style: italic; line-height: 1.5;
    background: transparent; border-bottom: 1px solid rgba(255,255,255,0.04);
    flex-shrink: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }

  /* ── Cards feed ── */
  #se-cards {
    flex: 1; overflow-y: auto; padding: 12px; display: flex; flex-direction: column; gap: 10px;
  }
  #se-cards::-webkit-scrollbar { width: 3px; }
  #se-cards::-webkit-scrollbar-track { background: transparent; }
  #se-cards::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }

  .se-empty {
    display: flex; flex-direction: column; align-items: center;
    justify-content: center; height: 100%; gap: 10px; text-align: center;
    padding: 20px;
  }
  .se-empty-icon { font-size: 32px; opacity: .6; }
  .se-empty-title { font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.3); }
  .se-empty-desc { font-size: 11px; color: rgba(255,255,255,0.18); max-width: 230px; line-height: 1.7; }

  /* ── Card chrome ── */
  .se-card {
    border-radius: 12px;
    border: 1px solid rgba(255,255,255,0.08);
    overflow: hidden;
    background: rgba(255,255,255,0.03);
    transition: box-shadow .2s;
  }

  /* Source pill row */
  .se-card-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 9px 12px 0;
  }
  .se-source-pill {
    display: flex; align-items: center; gap: 5px;
    font-size: 10px; font-weight: 700; letter-spacing: .06em;
    text-transform: uppercase;
    padding: 2px 8px; border-radius: 20px;
    border: 1px solid; opacity: .9;
  }
  .se-source-dot { width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0; }
  .se-card-time { font-size: 10px; color: rgba(255,255,255,0.25); }

  /* Dots row (decorative, like the screenshot) */
  .se-dots { display: flex; gap: 4px; align-items: center; }
  .se-dot-dec { width: 7px; height: 7px; border-radius: 50%; }

  /* Card body */
  .se-card-body { padding: 10px 12px 12px; }

  /* Summary label */
  .se-summary-label {
    font-size: 9px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase;
    color: rgba(255,255,255,0.3); margin-bottom: 5px;
  }

  /* Headline */
  .se-card-headline {
    font-size: 13px; font-weight: 700; color: #f0f0ff; line-height: 1.4;
    margin-bottom: 8px; letter-spacing: -.01em;
  }

  /* Body text */
  .se-card-text {
    font-size: 12px; color: rgba(255,255,255,0.5); line-height: 1.65;
    margin-bottom: 2px;
  }

  /* Points */
  .se-points { list-style: none; display: flex; flex-direction: column; gap: 4px; margin-bottom: 8px; }
  .se-point {
    font-size: 12px; color: rgba(255,255,255,0.55); line-height: 1.5;
    display: flex; gap: 6px; align-items: flex-start;
  }
  .se-point::before { content: '—'; color: rgba(255,255,255,0.2); flex-shrink: 0; }

  /* Win rate badge */
  .se-win-badge {
    display: inline-flex; align-items: center; gap: 5px;
    font-size: 10px; font-weight: 600;
    padding: 3px 8px; border-radius: 20px; margin-bottom: 10px;
    border: 1px solid rgba(255,255,255,0.1);
    color: rgba(255,255,255,0.45);
    background: rgba(255,255,255,0.04);
  }

  /* Action buttons */
  .se-card-actions {
    display: flex; gap: 7px; padding: 0 12px 12px;
  }
  .se-btn {
    flex: 1; padding: 7px 10px; border-radius: 8px; border: 1px solid;
    cursor: pointer; font-size: 11px; font-weight: 600;
    display: flex; align-items: center; justify-content: center; gap: 5px;
    transition: opacity .15s, transform .1s; letter-spacing: .01em;
  }
  .se-btn:hover { opacity: .85; transform: translateY(-1px); }
  .se-btn:active { transform: translateY(0); }
  .se-btn-primary {
    background: rgba(74,222,128,0.15); border-color: rgba(74,222,128,0.35);
    color: #4ade80;
  }
  .se-btn-dismiss {
    background: rgba(255,255,255,0.04); border-color: rgba(255,255,255,0.1);
    color: rgba(255,255,255,0.35);
  }

  /* Rebuttal box */
  .se-rebuttal {
    margin: 8px 0 0;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 8px; padding: 10px 11px;
  }
  .se-rebuttal-label {
    font-size: 9px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase;
    color: rgba(255,255,255,0.3); margin-bottom: 5px;
  }
  .se-rebuttal-text { font-size: 12px; color: rgba(150,220,120,0.9); line-height: 1.6; }

  /* Fit card stat */
  .se-stat {
    margin-top: 8px; padding: 7px 10px; border-radius: 8px;
    font-size: 11px; font-weight: 600;
    background: rgba(150,191,72,0.08); border: 1px solid rgba(150,191,72,0.2);
    color: rgba(150,191,72,0.9);
  }

  /* Coaching card */
  .se-coaching-card {
    border-radius: 12px; overflow: hidden;
    border: 1px solid rgba(251,191,36,0.2);
    background: rgba(251,191,36,0.04);
    box-shadow: 0 0 20px rgba(251,191,36,0.08);
  }

  /* ── Trigger label ── */
  .se-trigger {
    font-size: 10px; color: rgba(255,255,255,0.2); font-style: italic;
    margin-bottom: 5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    padding: 0 2px;
  }

  /* ── Scorecard ── */
  #se-scorecard {
    flex-shrink: 0; border-top: 1px solid rgba(255,255,255,0.06);
    background: rgba(255,255,255,0.02); max-height: 230px; overflow-y: auto;
  }
  #se-scorecard::-webkit-scrollbar { width: 3px; }
  #se-scorecard::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); }
  #se-score-header {
    display: flex; justify-content: space-between; align-items: center;
    padding: 10px 16px 6px;
  }
  .se-score-section-label {
    font-size: 9px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase;
    color: rgba(255,255,255,0.25);
  }
  #se-score-summary { font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.7); }
  .se-score-row {
    display: flex; align-items: center; gap: 8px;
    padding: 5px 16px; border-bottom: 1px solid rgba(255,255,255,0.03);
  }
  .se-score-name { font-size: 11px; font-weight: 500; width: 80px; flex-shrink: 0; color: rgba(255,255,255,0.3); }
  .se-score-name.se-qualified { color: rgba(255,255,255,0.8); }
  .se-score-bars { display: flex; gap: 3px; }
  .se-bar {
    width: 14px; height: 14px; border-radius: 3px;
    background: rgba(255,255,255,0.06); cursor: pointer;
    transition: background .1s, transform .1s; border: 1px solid rgba(255,255,255,0.05);
  }
  .se-bar:hover { transform: scale(1.15); }
  .se-bar.se-green  { background: #4ade80; border-color: rgba(74,222,128,0.5); box-shadow: 0 0 6px rgba(74,222,128,0.4); }
  .se-bar.se-yellow { background: #fbbf24; border-color: rgba(251,191,36,0.5); }
  .se-bar.se-red    { background: #f87171; border-color: rgba(248,113,113,0.5); }
`;
document.head.appendChild(styleEl);

// ── Build DOM ─────────────────────────────────────────────────────────────
const root = document.createElement('div');
root.id = 'se-root';
document.body.appendChild(root);

const toggleBtn = document.createElement('button');
toggleBtn.id = 'se-toggle';
toggleBtn.innerHTML = '🎯';
toggleBtn.title = 'Shopi Eval Bot';
toggleBtn.addEventListener('click', () => setPanel(!panelOpen));
root.appendChild(toggleBtn);

const panel = document.createElement('div');
panel.id = 'se-panel';
panel.innerHTML = `
  <div id="se-header">
    <div id="se-header-left">
      <div class="se-logo">🎯</div>
      <span class="se-title">Shopi Eval Bot</span>
      <span class="se-badge">Discovery</span>
    </div>
    <button id="se-close-btn">✕</button>
  </div>
  <div id="se-status">
    <div id="se-status-dot"></div>
    <span id="se-status-text">Not listening — click extension icon to start</span>
  </div>
  <div id="se-transcript">Waiting for audio…</div>
  <div id="se-cards"></div>
  <div id="se-scorecard">
    <div id="se-score-header">
      <span class="se-score-section-label">Qualification</span>
      <span id="se-score-summary">0 / 8</span>
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
  const summaryEl = document.getElementById('se-score-summary');
  if (!rowsEl) return;

  rowsEl.innerHTML = '';
  let qualified = 0;

  SCORECARD_ITEMS.forEach(({ key, label }) => {
    const score = scores[key] || 0;
    if (score >= 3) qualified++;

    const row = document.createElement('div');
    row.className = 'se-score-row';

    const nameEl = document.createElement('span');
    nameEl.className = 'se-score-name' + (score >= 3 ? ' se-qualified' : '');
    nameEl.textContent = label;
    row.appendChild(nameEl);

    const barsEl = document.createElement('div');
    barsEl.className = 'se-score-bars';
    [1,2,3,4,5].forEach((v) => {
      const bar = document.createElement('div');
      bar.className = 'se-bar';
      if (v <= score) bar.classList.add(score >= 4 ? 'se-green' : score >= 2 ? 'se-yellow' : 'se-red');
      bar.addEventListener('click', () => { scores[key] = v; renderScorecard(); });
      barsEl.appendChild(bar);
    });
    row.appendChild(barsEl);
    rowsEl.appendChild(row);
  });

  if (summaryEl) {
    summaryEl.textContent = `${qualified} / 8`;
    summaryEl.style.color = qualified >= 6 ? '#4ade80' : qualified >= 4 ? '#fbbf24' : 'rgba(255,255,255,0.7)';
  }
}

// ── Cards ─────────────────────────────────────────────────────────────────
function renderCards() {
  const cardsEl = document.getElementById('se-cards');
  if (!cardsEl) return;

  if (cards.length === 0) {
    cardsEl.innerHTML = `
      <div class="se-empty">
        <div class="se-empty-icon">🎯</div>
        <div class="se-empty-title">Listening for signals</div>
        <div class="se-empty-desc">Competitor mentions surface battlecards. Pain points surface Shopify fit cards.</div>
      </div>`;
    return;
  }

  cardsEl.innerHTML = '';
  cards.forEach((card) => {
    const wrap = document.createElement('div');

    if (card.trigger) {
      const t = document.createElement('div');
      t.className = 'se-trigger';
      t.textContent = `"${card.trigger.substring(0, 72)}${card.trigger.length > 72 ? '…' : ''}"`;
      wrap.appendChild(t);
    }

    if (card.type === 'battlecard' && card.battlecard) {
      wrap.appendChild(buildBattlecard(card.battlecard));
    } else if (card.type === 'fitcard' && card.fitCard) {
      wrap.appendChild(buildFitCard(card.fitCard));
    } else if (card.type === 'coaching' && card.coachingNote) {
      wrap.appendChild(buildCoachingCard(card.coachingNote));
    }

    cardsEl.appendChild(wrap);
  });

  cardsEl.scrollTop = cardsEl.scrollHeight;
}

function now() {
  const d = new Date();
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function buildBattlecard(bc) {
  const style = getCompetitorStyle(bc.competitor);

  const card = document.createElement('div');
  card.className = 'se-card';
  card.style.boxShadow = `0 0 24px ${style.glow}, inset 0 1px 0 rgba(255,255,255,0.06)`;
  card.style.borderColor = `rgba(255,255,255,0.08)`;

  // Header row
  const header = document.createElement('div');
  header.className = 'se-card-header';

  const pill = document.createElement('div');
  pill.className = 'se-source-pill';
  pill.style.color = style.accent;
  pill.style.borderColor = style.accent + '40';
  pill.style.background = style.accent + '12';
  const dot = document.createElement('div');
  dot.className = 'se-source-dot';
  dot.style.background = style.accent;
  dot.style.boxShadow = `0 0 4px ${style.accent}`;
  pill.appendChild(dot);
  pill.appendChild(document.createTextNode(style.label));
  header.appendChild(pill);

  const right = document.createElement('div');
  right.style.display = 'flex'; right.style.alignItems = 'center'; right.style.gap = '8px';

  // Decorative dots like screenshot
  const dots = document.createElement('div');
  dots.className = 'se-dots';
  ['#ff5f57','#ffbd2e', style.accent].forEach((c) => {
    const d = document.createElement('div');
    d.className = 'se-dot-dec';
    d.style.background = c;
    d.style.boxShadow = `0 0 4px ${c}80`;
    dots.appendChild(d);
  });
  right.appendChild(dots);

  const time = document.createElement('span');
  time.className = 'se-card-time';
  time.textContent = now();
  right.appendChild(time);
  header.appendChild(right);
  card.appendChild(header);

  // Body
  const body = document.createElement('div');
  body.className = 'se-card-body';

  const summaryLabel = document.createElement('div');
  summaryLabel.className = 'se-summary-label';
  summaryLabel.textContent = 'BATTLECARD';
  body.appendChild(summaryLabel);

  const headline = document.createElement('div');
  headline.className = 'se-card-headline';
  headline.textContent = bc.headline;
  body.appendChild(headline);

  if (bc.winRateNote) {
    const badge = document.createElement('div');
    badge.className = 'se-win-badge';
    badge.textContent = '📊 ' + bc.winRateNote;
    body.appendChild(badge);
  }

  const pts = document.createElement('ul');
  pts.className = 'se-points';
  (bc.keyPoints || []).forEach((p) => {
    const li = document.createElement('li');
    li.className = 'se-point';
    li.appendChild(document.createTextNode(p));
    pts.appendChild(li);
  });
  body.appendChild(pts);

  if (bc.objectionResponse) {
    const rb = document.createElement('div');
    rb.className = 'se-rebuttal';
    const lbl = document.createElement('div');
    lbl.className = 'se-rebuttal-label';
    lbl.textContent = 'SUGGESTED RESPONSE';
    rb.appendChild(lbl);
    const txt = document.createElement('div');
    txt.className = 'se-rebuttal-text';
    txt.textContent = bc.objectionResponse;
    rb.appendChild(txt);
    body.appendChild(rb);
  }

  card.appendChild(body);

  // Action buttons
  const actions = document.createElement('div');
  actions.className = 'se-card-actions';
  const vaultBtn = document.createElement('button');
  vaultBtn.className = 'se-btn se-btn-primary';
  vaultBtn.innerHTML = '⊞ Vault';
  const dismissBtn = document.createElement('button');
  dismissBtn.className = 'se-btn se-btn-dismiss';
  dismissBtn.textContent = '✕ Dismiss';
  dismissBtn.addEventListener('click', () => {
    const wrap = card.closest('div');
    if (wrap) wrap.remove();
  });
  actions.appendChild(vaultBtn);
  actions.appendChild(dismissBtn);
  card.appendChild(actions);

  return card;
}

function buildFitCard(fc) {
  const card = document.createElement('div');
  card.className = 'se-card';
  card.style.boxShadow = '0 0 24px rgba(150,191,72,0.12), inset 0 1px 0 rgba(255,255,255,0.06)';
  card.style.borderColor = 'rgba(150,191,72,0.2)';

  const header = document.createElement('div');
  header.className = 'se-card-header';

  const pill = document.createElement('div');
  pill.className = 'se-source-pill';
  pill.style.color = '#96bf48'; pill.style.borderColor = '#96bf4840'; pill.style.background = '#96bf4812';
  const dot = document.createElement('div');
  dot.className = 'se-source-dot';
  dot.style.background = '#96bf48'; dot.style.boxShadow = '0 0 4px #96bf48';
  pill.appendChild(dot);
  pill.appendChild(document.createTextNode('Shopify Fit'));
  header.appendChild(pill);

  const time = document.createElement('span');
  time.className = 'se-card-time';
  time.textContent = now();
  header.appendChild(time);
  card.appendChild(header);

  const body = document.createElement('div');
  body.className = 'se-card-body';

  const summaryLabel = document.createElement('div');
  summaryLabel.className = 'se-summary-label';
  summaryLabel.textContent = 'FIT CARD';
  body.appendChild(summaryLabel);

  const headline = document.createElement('div');
  headline.className = 'se-card-headline';
  headline.textContent = fc.painPoint;
  body.appendChild(headline);

  const sol = document.createElement('div');
  sol.className = 'se-card-text';
  sol.textContent = fc.shopifySolution;
  body.appendChild(sol);

  if (fc.stat) {
    const stat = document.createElement('div');
    stat.className = 'se-stat';
    stat.textContent = '📊 ' + fc.stat;
    body.appendChild(stat);
  }

  card.appendChild(body);

  const actions = document.createElement('div');
  actions.className = 'se-card-actions';
  const dismissBtn = document.createElement('button');
  dismissBtn.className = 'se-btn se-btn-dismiss';
  dismissBtn.textContent = '✕ Dismiss';
  dismissBtn.addEventListener('click', () => {
    const wrap = card.closest('div');
    if (wrap) wrap.remove();
  });
  actions.appendChild(dismissBtn);
  card.appendChild(actions);

  return card;
}

function buildCoachingCard(note) {
  const card = document.createElement('div');
  card.className = 'se-coaching-card';

  const header = document.createElement('div');
  header.className = 'se-card-header';
  const pill = document.createElement('div');
  pill.className = 'se-source-pill';
  pill.style.color = '#fbbf24'; pill.style.borderColor = '#fbbf2440'; pill.style.background = '#fbbf2408';
  const dot = document.createElement('div');
  dot.className = 'se-source-dot';
  dot.style.background = '#fbbf24'; dot.style.boxShadow = '0 0 4px #fbbf24';
  pill.appendChild(dot);
  pill.appendChild(document.createTextNode('Coaching'));
  header.appendChild(pill);
  const time = document.createElement('span');
  time.className = 'se-card-time';
  time.textContent = now();
  header.appendChild(time);
  card.appendChild(header);

  const body = document.createElement('div');
  body.className = 'se-card-body';
  const lbl = document.createElement('div');
  lbl.className = 'se-summary-label';
  lbl.textContent = 'COACHING NOTE';
  body.appendChild(lbl);
  const txt = document.createElement('div');
  txt.className = 'se-card-headline';
  txt.style.fontWeight = '500';
  txt.style.color = 'rgba(251,191,36,0.9)';
  txt.style.fontSize = '12px';
  txt.textContent = note;
  body.appendChild(txt);
  card.appendChild(body);
  return card;
}

// ── Message listener ──────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'PING') { sendResponse({ pong: true }); return false; }

  switch (msg.type) {
    case 'LISTENING_STARTED':
      isListening = true;
      document.getElementById('se-status-dot')?.classList.add('se-active');
      const st = document.getElementById('se-status-text');
      if (st) st.textContent = 'Listening…';
      toggleBtn.classList.add('se-listening');
      toggleBtn.classList.remove('se-alert');
      setPanel(true);
      break;

    case 'LISTENING_STOPPED':
      isListening = false;
      document.getElementById('se-status-dot')?.classList.remove('se-active');
      const st2 = document.getElementById('se-status-text');
      if (st2) st2.textContent = 'Stopped — click extension icon to resume';
      toggleBtn.classList.remove('se-listening');
      break;

    case 'TRANSCRIPT_UPDATE': {
      const el = document.getElementById('se-transcript');
      if (el) el.textContent = msg.text;
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
        const seen = cards.some(c => c.type === 'battlecard' && c.battlecard?.competitor === data.battlecard.competitor);
        if (!seen) newCards.push({ id: Date.now()+'b', type: 'battlecard', trigger, battlecard: data.battlecard });
      }
      if (data.fitCard) newCards.push({ id: Date.now()+'f', type: 'fitcard', trigger, fitCard: data.fitCard });
      if (data.coachingNote && newCards.length === 0) newCards.push({ id: Date.now()+'c', type: 'coaching', trigger, coachingNote: data.coachingNote });

      if (newCards.length > 0) {
        cards = [...cards, ...newCards];
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
