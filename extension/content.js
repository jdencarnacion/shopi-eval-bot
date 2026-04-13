// content.js — Injected into Google Meet
// Renders the floating overlay sidebar

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

const ACCENT_COLORS = {
  Salesforce:   '#00a1e0',
  Adobe:        '#ff6b6b',
  BigCommerce:  '#6b7ff5',
  WooCommerce:  '#7f54b3',
  commercetools:'#a78bfa',
};

// ── State ─────────────────────────────────────────────────────────────────
let scores = Object.fromEntries(SCORECARD_ITEMS.map((i) => [i.key, 0]));
let cards = [];
let panelOpen = false;
let isListening = false;

// ── Styles ────────────────────────────────────────────────────────────────
const styleEl = document.createElement('style');
styleEl.textContent = `
  #se-root * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 0; padding: 0; }

  #se-toggle {
    position: fixed; right: 18px; bottom: 88px; z-index: 2147483646;
    width: 46px; height: 46px; border-radius: 50%;
    background: #96bf48; border: none; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    font-size: 20px; box-shadow: 0 4px 20px rgba(0,0,0,0.5);
    transition: transform .2s, background .2s;
    color: #fff;
  }
  #se-toggle:hover { transform: scale(1.1); }
  #se-toggle.se-listening { background: #22c55e; animation: se-pulse-glow 2s infinite; }
  #se-toggle.se-alert { background: #eab308; animation: se-pulse-glow 1s infinite; }
  @keyframes se-pulse-glow {
    0%, 100% { box-shadow: 0 4px 20px rgba(150,191,72,.3); }
    50%       { box-shadow: 0 4px 32px rgba(150,191,72,.8); }
  }

  #se-panel {
    position: fixed; right: 0; top: 0; bottom: 0; z-index: 2147483645;
    width: 360px; background: #0a0a0f; border-left: 1px solid #2a2a3d;
    display: flex; flex-direction: column; overflow: hidden;
    transform: translateX(100%); transition: transform .25s ease;
  }
  #se-panel.se-open { transform: translateX(0); }

  /* Header */
  #se-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 11px 14px; background: #13131a; border-bottom: 1px solid #2a2a3d;
    flex-shrink: 0;
  }
  #se-header-left { display: flex; align-items: center; gap: 7px; }
  .se-title { font-size: 13px; font-weight: 700; color: #e8e8f0; }
  .se-badge { font-size: 10px; color: #7070a0; background: #1c1c27; border: 1px solid #2a2a3d; padding: 2px 7px; border-radius: 4px; }
  #se-close-btn { background: none; border: none; color: #7070a0; cursor: pointer; font-size: 15px; line-height: 1; }
  #se-close-btn:hover { color: #e8e8f0; }

  /* Status bar */
  #se-status {
    display: flex; align-items: center; gap: 7px;
    padding: 7px 14px; background: #0d0d14; border-bottom: 1px solid #1c1c27;
    flex-shrink: 0; font-size: 11px; color: #6060a0;
  }
  #se-status-dot { width: 7px; height: 7px; border-radius: 50%; background: #3a3a5a; flex-shrink: 0; }
  #se-status-dot.se-active { background: #22c55e; animation: se-blink 1.5s infinite; }
  @keyframes se-blink { 0%,100% { opacity:1; } 50% { opacity:.3; } }

  /* Transcript ticker */
  #se-transcript {
    padding: 5px 14px; min-height: 26px; font-size: 11px; color: #4a4a6a;
    font-style: italic; line-height: 1.4; background: #0a0a0f;
    border-bottom: 1px solid #141420; flex-shrink: 0;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }

  /* Cards feed */
  #se-cards {
    flex: 1; overflow-y: auto; padding: 12px;
    display: flex; flex-direction: column; gap: 10px;
  }
  #se-cards::-webkit-scrollbar { width: 3px; }
  #se-cards::-webkit-scrollbar-track { background: #0a0a0f; }
  #se-cards::-webkit-scrollbar-thumb { background: #2a2a3d; border-radius: 2px; }

  .se-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; gap: 8px; text-align: center; }
  .se-empty-icon { font-size: 30px; }
  .se-empty-title { font-size: 13px; font-weight: 600; color: #5a5a7a; }
  .se-empty-desc { font-size: 11px; color: #4a4a6a; max-width: 240px; line-height: 1.6; }

  /* Card components */
  .se-trigger { font-size: 10px; color: #4a4a6a; font-style: italic; margin-bottom: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

  .se-battlecard { background: #13131a; border-radius: 8px; padding: 12px; border: 1px solid; border-left-width: 3px; }
  .se-battlecard-tag { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .8px; margin-bottom: 6px; }
  .se-battlecard-headline { font-size: 13px; font-weight: 600; color: #e8e8f0; margin-bottom: 8px; line-height: 1.4; }
  .se-points { padding-left: 14px; display: flex; flex-direction: column; gap: 3px; }
  .se-point { font-size: 12px; color: #b0b0d0; line-height: 1.4; }
  .se-rebuttal { margin-top: 10px; background: #1c1c27; border: 1px solid #2a2a3d; border-radius: 6px; padding: 8px 10px; }
  .se-rebuttal-label { font-size: 10px; color: #7070a0; font-weight: 600; margin-bottom: 3px; }
  .se-rebuttal-text { font-size: 12px; color: #96bf48; line-height: 1.5; }

  .se-fitcard { background: #13131a; border: 1px solid #96bf4840; border-left: 3px solid #96bf48; border-radius: 8px; padding: 12px; }
  .se-fitcard-tag { font-size: 10px; font-weight: 700; color: #96bf48; text-transform: uppercase; letter-spacing: .8px; margin-bottom: 6px; }
  .se-fitcard-row { font-size: 12px; color: #b0b0d0; line-height: 1.5; margin-bottom: 4px; }
  .se-fitcard-label { color: #e8e8f0; font-weight: 600; }
  .se-fitcard-stat { margin-top: 8px; background: #96bf4810; border: 1px solid #96bf4830; border-radius: 6px; padding: 6px 8px; font-size: 11px; color: #96bf48; font-weight: 600; }

  .se-coaching { background: #13131a; border: 1px solid #eab30840; border-left: 3px solid #eab308; border-radius: 8px; padding: 12px; font-size: 12px; color: #eab308; line-height: 1.5; }

  /* Scorecard */
  #se-scorecard { flex-shrink: 0; background: #13131a; border-top: 1px solid #2a2a3d; max-height: 220px; overflow-y: auto; }
  #se-scorecard::-webkit-scrollbar { width: 3px; }
  #se-scorecard::-webkit-scrollbar-thumb { background: #2a2a3d; }
  #se-score-header { display: flex; justify-content: space-between; align-items: center; padding: 9px 14px 5px; }
  .se-score-section-label { font-size: 10px; font-weight: 700; color: #7070a0; text-transform: uppercase; letter-spacing: .8px; }
  #se-score-summary { font-size: 12px; color: #e8e8f0; }
  .se-score-row { display: flex; align-items: center; gap: 8px; padding: 5px 14px; border-bottom: 1px solid #111118; }
  .se-score-name { font-size: 11px; width: 75px; flex-shrink: 0; color: #6060a0; }
  .se-score-name.se-qualified { color: #e8e8f0; }
  .se-score-bars { display: flex; gap: 2px; }
  .se-bar { width: 15px; height: 15px; border-radius: 2px; background: #2a2a3d; cursor: pointer; transition: background .1s; }
  .se-bar.se-green  { background: #22c55e; }
  .se-bar.se-yellow { background: #eab308; }
  .se-bar.se-red    { background: #ef4444; }
`;
document.head.appendChild(styleEl);

// ── Build DOM ─────────────────────────────────────────────────────────────
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
      <span style="font-size:15px">🎯</span>
      <span class="se-title">Shopi Eval Bot</span>
      <span class="se-badge">Discovery</span>
    </div>
    <button id="se-close-btn">✕</button>
  </div>
  <div id="se-status">
    <div id="se-status-dot"></div>
    <span id="se-status-text">Not listening — click extension icon to start</span>
  </div>
  <div id="se-transcript">Waiting for audio...</div>
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

// ── Panel open/close ──────────────────────────────────────────────────────
function setPanel(open) {
  panelOpen = open;
  panel.classList.toggle('se-open', open);
  if (open) {
    renderScorecard();
    renderCards();
  }
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

    [1, 2, 3, 4, 5].forEach((v) => {
      const bar = document.createElement('div');
      bar.className = 'se-bar';
      if (v <= score) {
        bar.classList.add(score >= 4 ? 'se-green' : score >= 2 ? 'se-yellow' : 'se-red');
      }
      bar.addEventListener('click', () => {
        scores[key] = v;
        renderScorecard();
      });
      barsEl.appendChild(bar);
    });

    row.appendChild(barsEl);
    rowsEl.appendChild(row);
  });

  if (summaryEl) {
    summaryEl.textContent = `${qualified} / 8`;
    summaryEl.style.color = qualified >= 6 ? '#22c55e' : qualified >= 4 ? '#eab308' : '#e8e8f0';
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
        <div class="se-empty-desc">Competitor mentions trigger battlecards. Pain points surface Shopify fit cards.</div>
      </div>`;
    return;
  }

  cardsEl.innerHTML = '';

  cards.forEach((card) => {
    const wrap = document.createElement('div');

    if (card.trigger) {
      const t = document.createElement('div');
      t.className = 'se-trigger';
      t.textContent = `"${card.trigger.substring(0, 70)}${card.trigger.length > 70 ? '…' : ''}"`;
      wrap.appendChild(t);
    }

    if (card.type === 'battlecard' && card.battlecard) {
      wrap.appendChild(buildBattlecard(card.battlecard));
    } else if (card.type === 'fitcard' && card.fitCard) {
      wrap.appendChild(buildFitCard(card.fitCard));
    } else if (card.type === 'coaching' && card.coachingNote) {
      const el = document.createElement('div');
      el.className = 'se-coaching';
      el.textContent = '💡 ' + card.coachingNote;
      wrap.appendChild(el);
    }

    cardsEl.appendChild(wrap);
  });

  cardsEl.scrollTop = cardsEl.scrollHeight;
}

function buildBattlecard(bc) {
  const key = Object.keys(ACCENT_COLORS).find((k) => bc.competitor.includes(k));
  const accent = key ? ACCENT_COLORS[key] : '#7c3aed';

  const el = document.createElement('div');
  el.className = 'se-battlecard';
  el.style.borderColor = accent + '40';
  el.style.borderLeftColor = accent;

  const tag = document.createElement('div');
  tag.className = 'se-battlecard-tag';
  tag.style.color = accent;
  tag.textContent = `⚔ vs ${bc.competitor}`;
  el.appendChild(tag);

  const headline = document.createElement('div');
  headline.className = 'se-battlecard-headline';
  headline.textContent = bc.headline;
  el.appendChild(headline);

  const pts = document.createElement('ul');
  pts.className = 'se-points';
  (bc.keyPoints || []).forEach((p) => {
    const li = document.createElement('li');
    li.className = 'se-point';
    li.textContent = p;
    pts.appendChild(li);
  });
  el.appendChild(pts);

  if (bc.objectionResponse) {
    const rb = document.createElement('div');
    rb.className = 'se-rebuttal';
    rb.innerHTML = `<div class="se-rebuttal-label">SUGGESTED RESPONSE</div>`;
    const txt = document.createElement('div');
    txt.className = 'se-rebuttal-text';
    txt.textContent = bc.objectionResponse;
    rb.appendChild(txt);
    el.appendChild(rb);
  }

  return el;
}

function buildFitCard(fc) {
  const el = document.createElement('div');
  el.className = 'se-fitcard';

  el.innerHTML = `<div class="se-fitcard-tag">✦ Shopify Fit</div>`;

  const pain = document.createElement('div');
  pain.className = 'se-fitcard-row';
  pain.innerHTML = `<span class="se-fitcard-label">Pain: </span>`;
  pain.appendChild(document.createTextNode(fc.painPoint));
  el.appendChild(pain);

  const sol = document.createElement('div');
  sol.className = 'se-fitcard-row';
  sol.innerHTML = `<span class="se-fitcard-label">Solution: </span>`;
  sol.appendChild(document.createTextNode(fc.shopifySolution));
  el.appendChild(sol);

  if (fc.stat) {
    const stat = document.createElement('div');
    stat.className = 'se-fitcard-stat';
    stat.textContent = '📊 ' + fc.stat;
    el.appendChild(stat);
  }

  return el;
}

// ── Message listener (from background.js) ────────────────────────────────
chrome.runtime.onMessage.addListener((msg) => {
  switch (msg.type) {
    case 'LISTENING_STARTED':
      isListening = true;
      document.getElementById('se-status-dot')?.classList.add('se-active');
      const statusText = document.getElementById('se-status-text');
      if (statusText) statusText.textContent = 'Listening...';
      toggleBtn.classList.add('se-listening');
      toggleBtn.classList.remove('se-alert');
      setPanel(true);
      break;

    case 'LISTENING_STOPPED':
      isListening = false;
      document.getElementById('se-status-dot')?.classList.remove('se-active');
      const stoppedText = document.getElementById('se-status-text');
      if (stoppedText) stoppedText.textContent = 'Stopped — click extension icon to resume';
      toggleBtn.classList.remove('se-listening');
      break;

    case 'TRANSCRIPT_UPDATE': {
      const el = document.getElementById('se-transcript');
      if (el) el.textContent = msg.text;
      break;
    }

    case 'CARD_UPDATE': {
      const { data, trigger } = msg;

      // Update scorecard scores
      if (data.scorecardUpdates) {
        Object.entries(data.scorecardUpdates).forEach(([k, v]) => {
          if (v !== null && v !== undefined) scores[k] = v;
        });
      }

      // Deduplicate: skip battlecard if same competitor already shown this session
      const newCards = [];
      if (data.battlecard) {
        const alreadySeen = cards.some(
          (c) => c.type === 'battlecard' && c.battlecard?.competitor === data.battlecard.competitor
        );
        if (!alreadySeen) {
          newCards.push({ id: Date.now() + 'b', type: 'battlecard', trigger, battlecard: data.battlecard });
        }
      }
      if (data.fitCard) {
        newCards.push({ id: Date.now() + 'f', type: 'fitcard', trigger, fitCard: data.fitCard });
      }
      if (data.coachingNote && newCards.length === 0) {
        newCards.push({ id: Date.now() + 'c', type: 'coaching', trigger, coachingNote: data.coachingNote });
      }

      if (newCards.length > 0) {
        cards = [...cards, ...newCards];

        if (panelOpen) {
          renderCards();
        } else {
          // Flash the toggle button to signal a new card
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

// Initial render
renderScorecard();
