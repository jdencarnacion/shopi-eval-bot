"use client";

import { useState, useEffect, useRef } from "react";

const SCORECARD_ITEMS = [
  { key: "PROBLEM", label: "Problem", desc: "Clear business pain identified" },
  { key: "IMPACT", label: "Impact", desc: "Cost of inaction quantified" },
  { key: "AUTHORITY", label: "Authority", desc: "Decision maker identified" },
  { key: "BUDGET", label: "Budget", desc: "Budget exists and allocated" },
  { key: "TIMELINE", label: "Timeline", desc: "Specific date + business driver" },
  { key: "CHAMPION", label: "Champion", desc: "Internal advocate named" },
  { key: "PROCESS", label: "Process", desc: "Buying process understood" },
  { key: "COMPETITION", label: "Competition", desc: "Competitors identified" },
] as const;

type ScorecardKey = typeof SCORECARD_ITEMS[number]["key"];

type Battlecard = {
  competitor: string;
  headline: string;
  keyPoints: string[];
  objectionResponse: string | null;
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

function ScoreBar({ score, onChange }: { score: number; onChange: (v: number) => void }) {
  return (
    <div style={{ display: "flex", gap: 3 }}>
      {[1, 2, 3, 4, 5].map((v) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          style={{
            width: 20,
            height: 20,
            borderRadius: 3,
            border: "none",
            cursor: "pointer",
            background: v <= score
              ? score >= 4 ? "#22c55e" : score >= 2 ? "#eab308" : "#ef4444"
              : "#2a2a3d",
            transition: "background 0.15s",
          }}
        />
      ))}
    </div>
  );
}

function BattlecardView({ card }: { card: Battlecard }) {
  const colors: Record<string, string> = {
    "Salesforce": "#00a1e0",
    "Adobe": "#ff6b6b",
    "BigCommerce": "#6b7ff5",
    "WooCommerce": "#7f54b3",
    "commercetools": "#a78bfa",
  };
  const key = Object.keys(colors).find(k => card.competitor.includes(k));
  const accent = key ? colors[key] : "#7c3aed";

  return (
    <div style={{
      background: "#13131a",
      border: `1px solid ${accent}40`,
      borderLeft: `3px solid ${accent}`,
      borderRadius: 8,
      padding: 14,
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: accent, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
        ⚔ vs {card.competitor}
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, color: "#e8e8f0", marginBottom: 10 }}>{card.headline}</div>
      <ul style={{ margin: 0, padding: "0 0 0 16px", display: "flex", flexDirection: "column", gap: 5 }}>
        {card.keyPoints.map((p, i) => (
          <li key={i} style={{ fontSize: 13, color: "#b0b0d0", lineHeight: 1.4 }}>{p}</li>
        ))}
      </ul>
      {card.objectionResponse && (
        <div style={{
          marginTop: 12,
          background: "#1c1c27",
          border: "1px solid #2a2a3d",
          borderRadius: 6,
          padding: "10px 12px",
        }}>
          <div style={{ fontSize: 11, color: "#7070a0", marginBottom: 4, fontWeight: 600 }}>SUGGESTED RESPONSE</div>
          <div style={{ fontSize: 13, color: "#96bf48", lineHeight: 1.5 }}>{card.objectionResponse}</div>
        </div>
      )}
    </div>
  );
}

function FitCardView({ card }: { card: FitCard }) {
  return (
    <div style={{
      background: "#13131a",
      border: "1px solid #96bf4840",
      borderLeft: "3px solid #96bf48",
      borderRadius: 8,
      padding: 14,
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#96bf48", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
        ✦ Shopify Fit
      </div>
      <div style={{ fontSize: 13, color: "#7070a0", marginBottom: 6 }}>
        <span style={{ color: "#e8e8f0", fontWeight: 600 }}>Pain: </span>{card.painPoint}
      </div>
      <div style={{ fontSize: 13, color: "#b0b0d0", lineHeight: 1.5 }}>
        <span style={{ color: "#e8e8f0", fontWeight: 600 }}>Solution: </span>{card.shopifySolution}
      </div>
      {card.stat && (
        <div style={{
          marginTop: 10,
          background: "#96bf4810",
          border: "1px solid #96bf4830",
          borderRadius: 6,
          padding: "8px 10px",
          fontSize: 12,
          color: "#96bf48",
          fontWeight: 600,
        }}>
          📊 {card.stat}
        </div>
      )}
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
  const totalItems = SCORECARD_ITEMS.length;

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

      if (data.scorecardUpdates) {
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
      if (data.battlecard) {
        newCards.push({ id: crypto.randomUUID(), type: "battlecard", timestamp: Date.now(), trigger: text, battlecard: data.battlecard });
      }
      if (data.fitCard) {
        newCards.push({ id: crypto.randomUUID(), type: "fitcard", timestamp: Date.now(), trigger: text, fitCard: data.fitCard });
      }
      if (data.coachingNote && newCards.length === 0) {
        newCards.push({ id: crypto.randomUUID(), type: "coaching", timestamp: Date.now(), trigger: text, coachingNote: data.coachingNote });
      }
      if (newCards.length > 0) setCards((prev) => [...prev, ...newCards]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#0a0a0f", overflow: "hidden" }}>

      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 20px", background: "#13131a", borderBottom: "1px solid #2a2a3d", flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 28, height: 28, background: "#96bf48", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>🎯</div>
          <span style={{ fontWeight: 700, fontSize: 15, color: "#e8e8f0" }}>Shopi Eval Bot</span>
          <span style={{ fontSize: 11, color: "#7070a0", background: "#1c1c27", border: "1px solid #2a2a3d", padding: "2px 8px", borderRadius: 4 }}>Discovery</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {running && <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#ef4444", animation: "pulse 1.5s infinite" }} />}
            <span style={{ fontFamily: "monospace", fontSize: 18, fontWeight: 700, color: running ? "#e8e8f0" : "#7070a0" }}>{time}</span>
          </div>
          <button onClick={toggle} style={{
            padding: "5px 14px", borderRadius: 6, border: "none",
            background: running ? "#2a2a3d" : "#96bf48", color: running ? "#e8e8f0" : "#0a0a0f",
            fontWeight: 600, fontSize: 12, cursor: "pointer",
          }}>{running ? "Pause" : "Start Call"}</button>
          <button onClick={() => { reset(); setCards([]); setScores(Object.fromEntries(SCORECARD_ITEMS.map((i) => [i.key, 0])) as Record<ScorecardKey, number>); }}
            style={{ padding: "5px 14px", borderRadius: 6, border: "1px solid #2a2a3d", background: "transparent", color: "#7070a0", fontSize: 12, cursor: "pointer" }}>
            Reset
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e" }} />
          <span style={{ fontSize: 12, color: "#7070a0" }}>Vault connected</span>
        </div>
      </div>

      {/* Body */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* Scorecard */}
        <div style={{
          width: 240, flexShrink: 0, background: "#13131a",
          borderRight: "1px solid #2a2a3d", display: "flex", flexDirection: "column", overflow: "hidden",
        }}>
          <div style={{ padding: "14px 16px 10px", borderBottom: "1px solid #2a2a3d" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#7070a0", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Qualification Score</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
              <span style={{ fontSize: 24, fontWeight: 800, color: scored >= 6 ? "#22c55e" : scored >= 4 ? "#eab308" : "#e8e8f0" }}>{scored}</span>
              <span style={{ fontSize: 14, color: "#7070a0" }}>/ {totalItems} qualified</span>
            </div>
            <div style={{ marginTop: 8, height: 4, background: "#2a2a3d", borderRadius: 2, overflow: "hidden" }}>
              <div style={{
                height: "100%", width: `${(scored / totalItems) * 100}%`,
                background: scored >= 6 ? "#22c55e" : scored >= 4 ? "#eab308" : "#96bf48",
                transition: "width 0.4s ease", borderRadius: 2,
              }} />
            </div>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
            {SCORECARD_ITEMS.map((item) => {
              const score = scores[item.key];
              return (
                <div key={item.key} style={{ padding: "10px 16px", borderBottom: "1px solid #1c1c27" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: score >= 3 ? "#e8e8f0" : "#7070a0" }}>{item.label}</span>
                    <span style={{ fontSize: 11, color: score >= 4 ? "#22c55e" : score >= 2 ? "#eab308" : "#3a3a5a" }}>{score > 0 ? `${score}/5` : "—"}</span>
                  </div>
                  <ScoreBar score={score} onChange={(v) => setScores((p) => ({ ...p, [item.key]: v }))} />
                  <div style={{ fontSize: 11, color: "#4a4a6a", marginTop: 5, lineHeight: 1.3 }}>{item.desc}</div>
                </div>
              );
            })}
          </div>

          {scored < 3 && (
            <div style={{ padding: "10px 16px", background: "#1c1520", borderTop: "1px solid #3d2a2a", fontSize: 11, color: "#ef4444", lineHeight: 1.4 }}>
              🚩 Score 4+ on Authority, Budget & Timeline or push hard / walk away
            </div>
          )}
        </div>

        {/* Cards panel */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
            {cards.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "#3a3a5a", textAlign: "center", gap: 12 }}>
                <div style={{ fontSize: 40 }}>🎯</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: "#5a5a7a" }}>Ready to assist</div>
                <div style={{ fontSize: 13, maxWidth: 340, lineHeight: 1.6, color: "#4a4a6a" }}>
                  Type what the merchant just said. Competitor mentions trigger battlecards. Pain points surface Shopify fit cards.
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8, width: "100%", maxWidth: 420 }}>
                  {EXAMPLES.map((ex) => (
                    <button key={ex} onClick={() => setInput(ex)} style={{
                      padding: "8px 14px", background: "#13131a", border: "1px solid #2a2a3d",
                      borderRadius: 6, color: "#6060a0", fontSize: 12, cursor: "pointer", textAlign: "left",
                    }}>
                      "{ex}"
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {cards.map((card) => (
                  <div key={card.id}>
                    <div style={{ fontSize: 11, color: "#4a4a6a", marginBottom: 6 }}>
                      Triggered by: <span style={{ color: "#6060a0", fontStyle: "italic" }}>"{card.trigger}"</span>
                    </div>
                    {card.type === "battlecard" && card.battlecard && <BattlecardView card={card.battlecard} />}
                    {card.type === "fitcard" && card.fitCard && <FitCardView card={card.fitCard} />}
                    {card.type === "coaching" && (
                      <div style={{ background: "#13131a", border: "1px solid #2a2a3d", borderLeft: "3px solid #eab308", borderRadius: 8, padding: 14, fontSize: 13, color: "#eab308" }}>
                        💡 {card.coachingNote}
                      </div>
                    )}
                  </div>
                ))}
                <div ref={cardsEndRef} />
              </div>
            )}
          </div>

          {/* Input */}
          <div style={{ padding: 16, background: "#13131a", borderTop: "1px solid #2a2a3d", flexShrink: 0 }}>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && analyze()}
                placeholder="What did the merchant just say? (paste a quote or type keywords)"
                style={{
                  flex: 1, background: "#1c1c27", border: "1px solid #2a2a3d",
                  borderRadius: 8, padding: "10px 14px", color: "#e8e8f0", fontSize: 13, outline: "none",
                }}
              />
              <button
                onClick={analyze}
                disabled={loading || !input.trim()}
                style={{
                  padding: "10px 20px",
                  background: loading || !input.trim() ? "#2a2a3d" : "#96bf48",
                  color: loading || !input.trim() ? "#7070a0" : "#0a0a0f",
                  border: "none", borderRadius: 8, fontWeight: 700, fontSize: 13,
                  cursor: loading ? "default" : "pointer", minWidth: 90, transition: "background 0.15s",
                }}
              >
                {loading ? "..." : "Analyze →"}
              </button>
            </div>
            <div style={{ fontSize: 11, color: "#3a3a5a", marginTop: 6 }}>
              Press Enter or click Analyze. Scorecard updates automatically based on what the merchant reveals.
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
        input::placeholder { color: #4a4a6a; }
      `}</style>
    </div>
  );
}
