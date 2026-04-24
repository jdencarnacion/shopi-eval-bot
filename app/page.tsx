"use client";

import { useState, useEffect, useRef } from "react";

const SCORECARD_ITEMS = [
  { key: "PROBLEM",     label: "Problem",     desc: "Clear business pain identified" },
  { key: "IMPACT",      label: "Impact",      desc: "Cost of inaction quantified" },
  { key: "AUTHORITY",   label: "Authority",   desc: "Decision maker identified" },
  { key: "BUDGET",      label: "Budget",      desc: "Budget exists and allocated" },
  { key: "TIMELINE",    label: "Timeline",    desc: "Specific date + business driver" },
  { key: "CHAMPION",    label: "Champion",    desc: "Internal advocate named" },
  { key: "PROCESS",     label: "Process",     desc: "Buying process understood" },
  { key: "COMPETITION", label: "Competition", desc: "Competitors identified" },
] as const;

type ScorecardKey = typeof SCORECARD_ITEMS[number]["key"];

type Battlecard = {
  competitor: string;
  headline: string;
  keyPoints: string[];
  objectionResponse: string | null;
  winRateNote: string | null;
};

type FitCard = {
  painPoint: string;
  shopifySolution: string;
  stat: string | null;
};

type Card = {
  id: string;
  type: "battlecard" | "fitcard" | "coaching";
  timestamp: number;
  trigger: string;
  battlecard?: Battlecard;
  fitCard?: FitCard;
  coachingNote?: string;
};

const COMPETITOR_COLORS: Record<string, { accent: string; glow: string }> = {
  "Salesforce": { accent: "#38bdf8", glow: "rgba(56,189,248,0.12)" },
  "Adobe":      { accent: "#f87171", glow: "rgba(248,113,113,0.12)" },
  "BigCommerce":{ accent: "#818cf8", glow: "rgba(129,140,248,0.12)" },
  "WooCommerce":{ accent: "#c084fc", glow: "rgba(192,132,252,0.12)" },
  "commercetools":{ accent: "#a78bfa", glow: "rgba(167,139,250,0.12)" },
  "SAP":        { accent: "#fb923c", glow: "rgba(251,146,60,0.12)"  },
  "VTEX":       { accent: "#f472b6", glow: "rgba(244,114,182,0.12)" },
  "Custom":     { accent: "#34d399", glow: "rgba(52,211,153,0.12)"  },
};

function getCompetitorStyle(competitor: string) {
  const key = Object.keys(COMPETITOR_COLORS).find((k) => competitor.includes(k));
  return key ? COMPETITOR_COLORS[key] : { accent: "#94a3b8", glow: "rgba(148,163,184,0.1)" };
}

function useTimer() {
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [running]);
  const fmt = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };
  return { time: fmt(seconds), running, toggle: () => setRunning((r) => !r), reset: () => { setSeconds(0); setRunning(false); } };
}

function ScoreRow({ label, score, onChange }: { label: string; score: number; onChange: (v: number) => void }) {
  const color = score >= 4 ? "#4ade80" : score >= 2 ? "#fbbf24" : "#f87171";
  const glow = score >= 4 ? "rgba(74,222,128,0.5)" : score >= 2 ? "rgba(251,191,36,0.4)" : "rgba(248,113,113,0.4)";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "7px 20px" }}>
      <span style={{ fontSize: 12, fontWeight: 500, width: 80, flexShrink: 0, color: score >= 3 ? "rgba(255,255,255,0.75)" : "rgba(255,255,255,0.28)", letterSpacing: "-0.01em" }}>
        {label}
      </span>
      <div style={{ flex: 1, display: "flex", gap: 3 }}>
        {[1,2,3,4,5].map((v) => (
          <div
            key={v}
            onClick={() => onChange(v)}
            style={{
              flex: 1, height: 4, borderRadius: 2, cursor: "pointer",
              background: v <= score ? color : "rgba(255,255,255,0.07)",
              boxShadow: v <= score && v === score ? `0 0 6px ${glow}` : "none",
              transition: "background 0.15s, transform 0.1s",
            }}
          />
        ))}
      </div>
      <span style={{ fontSize: 10, fontWeight: 600, width: 16, textAlign: "right", color: score > 0 ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.15)" }}>
        {score > 0 ? score : "—"}
      </span>
    </div>
  );
}

function BattlecardView({ card, onDismiss }: { card: Battlecard; onDismiss: () => void }) {
  const style = getCompetitorStyle(card.competitor);
  return (
    <div style={{
      background: "rgba(255,255,255,0.028)",
      border: `1px solid rgba(255,255,255,0.08)`,
      borderRadius: 16, overflow: "hidden",
      boxShadow: `0 0 0 1px ${style.glow.replace("0.12","0.3")}, 0 4px 28px ${style.glow}`,
      backdropFilter: "blur(12px)",
    }}>
      {/* Accent line */}
      <div style={{ height: 2, background: `linear-gradient(90deg, ${style.accent}, transparent)` }} />
      {/* Meta */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: style.accent, background: style.accent + "15", border: `1px solid ${style.accent}30`, borderRadius: 20, padding: "2px 9px" }}>
          <div style={{ width: 5, height: 5, borderRadius: "50%", background: style.accent, boxShadow: `0 0 5px ${style.accent}`, flexShrink: 0 }} />
          {card.competitor}
        </div>
        <button onClick={onDismiss} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.25)", cursor: "pointer", fontSize: 14, padding: "2px 6px", borderRadius: 6 }}>✕</button>
      </div>
      {/* Body */}
      <div style={{ padding: "12px 16px 16px" }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", marginBottom: 6 }}>Battlecard</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#f0f0ff", lineHeight: 1.4, marginBottom: 10, letterSpacing: "-0.02em" }}>{card.headline}</div>
        {card.winRateNote && (
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 8, marginBottom: 12, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", color: "rgba(255,255,255,0.4)" }}>
            📊 {card.winRateNote}
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
          {card.keyPoints.map((p, i) => (
            <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 13, color: "rgba(255,255,255,0.5)", lineHeight: 1.55 }}>
              <div style={{ width: 16, height: 16, borderRadius: 5, background: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, color: "rgba(255,255,255,0.3)", flexShrink: 0, marginTop: 1 }}>→</div>
              {p}
            </div>
          ))}
        </div>
        {card.objectionResponse && (
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: "10px 13px" }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", marginBottom: 6 }}>Suggested Response</div>
            <div style={{ fontSize: 13, color: "rgba(134,211,105,0.9)", lineHeight: 1.65 }}>{card.objectionResponse}</div>
          </div>
        )}
      </div>
    </div>
  );
}

function FitCardView({ card, onDismiss }: { card: FitCard; onDismiss: () => void }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.028)", border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 16, overflow: "hidden",
      boxShadow: "0 0 0 1px rgba(74,222,128,0.2), 0 4px 28px rgba(74,222,128,0.06)",
    }}>
      <div style={{ height: 2, background: "linear-gradient(90deg, #4ade80, transparent)" }} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#4ade80", background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: 20, padding: "2px 9px" }}>
          <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#4ade80", boxShadow: "0 0 5px #4ade80", flexShrink: 0 }} />
          Shopify Fit
        </div>
        <button onClick={onDismiss} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.25)", cursor: "pointer", fontSize: 14, padding: "2px 6px", borderRadius: 6 }}>✕</button>
      </div>
      <div style={{ padding: "12px 16px 16px" }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", marginBottom: 6 }}>Fit Card</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#f0f0ff", lineHeight: 1.4, marginBottom: 8, letterSpacing: "-0.02em" }}>{card.painPoint}</div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", lineHeight: 1.65, marginBottom: card.stat ? 10 : 0 }}>{card.shopifySolution}</div>
        {card.stat && (
          <div style={{ padding: "8px 12px", borderRadius: 9, background: "rgba(74,222,128,0.06)", border: "1px solid rgba(74,222,128,0.15)", fontSize: 12, fontWeight: 600, color: "rgba(74,222,128,0.85)" }}>
            📊 {card.stat}
          </div>
        )}
      </div>
    </div>
  );
}

const EXAMPLES = [
  "We're currently on Salesforce Commerce Cloud",
  "Our site keeps crashing during Black Friday",
  "We're also talking to BigCommerce",
  "We need B2B wholesale pricing and company accounts",
  "We have budget approved for Q3 and our contract expires in September",
  "Our CTO Sarah is the one who will sign off on this",
];

export default function Home() {
  const { time, running, toggle, reset } = useTimer();
  const [scores, setScores] = useState<Record<ScorecardKey, number>>(
    Object.fromEntries(SCORECARD_ITEMS.map((i) => [i.key, 0])) as Record<ScorecardKey, number>
  );
  const [cards, setCards] = useState<Card[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const cardsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    cardsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [cards]);

  const scored = Object.values(scores).filter((s) => s >= 3).length;

  async function analyze() {
    if (!input.trim() || loading) return;
    const text = input.trim();
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: text }),
      });
      const data = await res.json();
      if (data?.scorecardUpdates) {
        setScores((prev) => {
          const next = { ...prev };
          for (const key of Object.keys(data.scorecardUpdates) as ScorecardKey[]) {
            if (data.scorecardUpdates[key] !== null && data.scorecardUpdates[key] !== undefined) {
              next[key] = data.scorecardUpdates[key];
            }
          }
          return next;
        });
      }
      const newCards: Card[] = [];
      if (data?.battlecard) newCards.push({ id: crypto.randomUUID(), type: "battlecard", timestamp: Date.now(), trigger: text, battlecard: data.battlecard });
      if (data?.fitCard) newCards.push({ id: crypto.randomUUID(), type: "fitcard", timestamp: Date.now(), trigger: text, fitCard: data.fitCard });
      if (data?.coachingNote && newCards.length === 0) newCards.push({ id: crypto.randomUUID(), type: "coaching", timestamp: Date.now(), trigger: text, coachingNote: data.coachingNote });
      if (newCards.length > 0) setCards((prev) => [...prev, ...newCards]);
    } finally {
      setLoading(false);
    }
  }

  const scoreColor = scored >= 6 ? "#4ade80" : scored >= 4 ? "#fbbf24" : "rgba(255,255,255,0.6)";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "linear-gradient(160deg, #0c0c20 0%, #06060f 100%)", overflow: "hidden", WebkitFontSmoothing: "antialiased" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 24px", background: "rgba(255,255,255,0.02)", borderBottom: "1px solid rgba(255,255,255,0.06)", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 34, height: 34, background: "linear-gradient(135deg, #14532d, #166534)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, border: "1px solid rgba(74,222,128,0.25)", boxShadow: "0 0 14px rgba(74,222,128,0.12)" }}>🎯</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: "#f0f0ff", letterSpacing: "-0.02em" }}>Shopi Eval Bot</div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.28)", letterSpacing: "0.04em", textTransform: "uppercase", fontWeight: 600 }}>Discovery Assistant</div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: "7px 14px" }}>
            {running && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#f87171", boxShadow: "0 0 6px rgba(248,113,113,0.7)" }} />}
            <span style={{ fontFamily: "monospace", fontSize: 18, fontWeight: 700, color: running ? "#f0f0ff" : "rgba(255,255,255,0.25)", letterSpacing: "0.04em" }}>{time}</span>
          </div>
          <button onClick={toggle} style={{ padding: "7px 16px", borderRadius: 10, border: "1px solid", cursor: "pointer", fontWeight: 700, fontSize: 12, letterSpacing: "-0.01em", transition: "all 0.15s", background: running ? "rgba(248,113,113,0.08)" : "rgba(74,222,128,0.1)", borderColor: running ? "rgba(248,113,113,0.25)" : "rgba(74,222,128,0.28)", color: running ? "#f87171" : "#4ade80" }}>
            {running ? "■  Pause" : "▶  Start Call"}
          </button>
          <button onClick={() => { reset(); setCards([]); setScores(Object.fromEntries(SCORECARD_ITEMS.map((i) => [i.key, 0])) as Record<ScorecardKey, number>); }}
            style={{ padding: "7px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", color: "rgba(255,255,255,0.3)", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>
            Reset
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", background: "rgba(74,222,128,0.06)", border: "1px solid rgba(74,222,128,0.15)", borderRadius: 8 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ade80", boxShadow: "0 0 6px rgba(74,222,128,0.7)" }} />
          <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(74,222,128,0.8)", letterSpacing: "0.02em" }}>Vault connected</span>
        </div>
      </div>

      {/* Body */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* Scorecard sidebar */}
        <div style={{ width: 256, flexShrink: 0, background: "rgba(255,255,255,0.015)", borderRight: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ padding: "18px 20px 14px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.2)", marginBottom: 12 }}>Qualification Score</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 12 }}>
              <span style={{ fontSize: 32, fontWeight: 800, color: scoreColor, letterSpacing: "-0.03em", lineHeight: 1 }}>{scored}</span>
              <span style={{ fontSize: 14, color: "rgba(255,255,255,0.25)", fontWeight: 600 }}>/ 8</span>
            </div>
            <div style={{ height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${(scored / 8) * 100}%`, background: scored >= 6 ? "#4ade80" : scored >= 4 ? "#fbbf24" : "rgba(255,255,255,0.2)", transition: "width 0.5s cubic-bezier(0.34,1.56,0.64,1)", borderRadius: 2, boxShadow: scored >= 6 ? "0 0 8px rgba(74,222,128,0.5)" : "none" }} />
            </div>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
            {SCORECARD_ITEMS.map((item) => (
              <ScoreRow
                key={item.key}
                label={item.label}
                score={scores[item.key]}
                onChange={(v) => setScores((p) => ({ ...p, [item.key]: v }))}
              />
            ))}
          </div>

          {scored < 3 && (
            <div style={{ padding: "10px 16px", background: "rgba(248,113,113,0.04)", borderTop: "1px solid rgba(248,113,113,0.12)", fontSize: 11, color: "rgba(248,113,113,0.7)", lineHeight: 1.5 }}>
              🚩 Score Authority, Budget & Timeline before pushing forward
            </div>
          )}
        </div>

        {/* Cards panel */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ flex: 1, overflowY: "auto", padding: "20px 20px 0" }}>
            {cards.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 14, textAlign: "center" }}>
                <div style={{ width: 60, height: 60, borderRadius: "50%", background: "rgba(74,222,128,0.06)", border: "1px solid rgba(74,222,128,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26 }}>🎯</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: "rgba(255,255,255,0.22)" }}>Ready to assist</div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.14)", maxWidth: 320, lineHeight: 1.7 }}>
                  Type what the merchant just said. Competitor names trigger battlecards. Pain points surface Shopify fit cards.
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 6, width: "100%", maxWidth: 440 }}>
                  {EXAMPLES.map((ex) => (
                    <button key={ex} onClick={() => setInput(ex)} style={{ padding: "9px 14px", background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, color: "rgba(255,255,255,0.38)", fontSize: 12, cursor: "pointer", textAlign: "left", transition: "all 0.15s", letterSpacing: "-0.01em" }}>
                      &ldquo;{ex}&rdquo;
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingBottom: 20 }}>
                {cards.map((card) => (
                  <div key={card.id}>
                    <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.18)", marginBottom: 7, fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      &ldquo;{card.trigger}&rdquo;
                    </div>
                    {card.type === "battlecard" && card.battlecard && (
                      <BattlecardView card={card.battlecard} onDismiss={() => setCards((c) => c.filter((x) => x.id !== card.id))} />
                    )}
                    {card.type === "fitcard" && card.fitCard && (
                      <FitCardView card={card.fitCard} onDismiss={() => setCards((c) => c.filter((x) => x.id !== card.id))} />
                    )}
                    {card.type === "coaching" && (
                      <div style={{ background: "rgba(255,255,255,0.028)", border: "1px solid rgba(251,191,36,0.15)", borderRadius: 16, overflow: "hidden", boxShadow: "0 4px 24px rgba(251,191,36,0.06)" }}>
                        <div style={{ height: 2, background: "linear-gradient(90deg, #fbbf24, transparent)" }} />
                        <div style={{ padding: "14px 16px", fontSize: 13, color: "rgba(251,191,36,0.85)", lineHeight: 1.65, fontWeight: 500 }}>💡 {card.coachingNote}</div>
                      </div>
                    )}
                  </div>
                ))}
                <div ref={cardsEndRef} />
              </div>
            )}
          </div>

          {/* Input */}
          <div style={{ padding: "16px 20px", background: "rgba(255,255,255,0.02)", borderTop: "1px solid rgba(255,255,255,0.06)", flexShrink: 0 }}>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && analyze()}
                placeholder="What did the merchant just say?"
                style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 11, padding: "11px 16px", color: "#f0f0ff", fontSize: 13, outline: "none", letterSpacing: "-0.01em" }}
              />
              <button
                onClick={analyze}
                disabled={loading || !input.trim()}
                style={{ padding: "11px 22px", background: loading || !input.trim() ? "rgba(255,255,255,0.04)" : "rgba(74,222,128,0.12)", color: loading || !input.trim() ? "rgba(255,255,255,0.2)" : "#4ade80", border: `1px solid ${loading || !input.trim() ? "rgba(255,255,255,0.07)" : "rgba(74,222,128,0.3)"}`, borderRadius: 11, fontWeight: 700, fontSize: 13, cursor: loading ? "default" : "pointer", letterSpacing: "-0.01em", transition: "all 0.15s", minWidth: 100 }}
              >
                {loading ? "…" : "Analyze →"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        input::placeholder { color: rgba(255,255,255,0.2); }
        button:hover { opacity: 0.9; }
        * { -webkit-font-smoothing: antialiased; }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 2px; }
      `}</style>
    </div>
  );
}
