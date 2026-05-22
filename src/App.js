import { useState, useEffect, useRef } from "react";

const C = {
  bg: "#080808", surface: "#111111", s2: "#1A1A1A", s3: "#222222",
  border: "#272727", accent: "#00E676", warn: "#FFB300", danger: "#FF3D3D",
  text: "#F0F0F0", muted: "#5A5A5A", mutedLight: "#888",
};

const METRICS_DEF = [
  { key: "kneeAlignment",    label: "Knee Alignment",   weight: 0.25, icon: "⟁" },
  { key: "spineNeutrality",  label: "Spine Neutrality", weight: 0.25, icon: "↕" },
  { key: "squatDepth",       label: "Squat Depth",      weight: 0.20, icon: "↓" },
  { key: "tempoConsistency", label: "Tempo Control",    weight: 0.15, icon: "⏱" },
  { key: "hipHinge",         label: "Hip Hinge",        weight: 0.15, icon: "⌒" },
];

const TIPS = [
  "Chest up — drive through your heels on the way up",
  "Brace your core hard before every single rep",
  "Knees out — push wide, tracking over your toes",
  "2 seconds down · brief pause · drive up explosively",
  "Break at the hips first, then bend the knees",
  "Mid-foot pressure — keep those heels flat",
  "Neutral spine throughout — no rounding at the hole",
  "Eyes forward — lock onto a fixed point and hold",
  "Bar stays over mid-foot — no forward drift",
  "Fill your belly with air before the descent",
];

const mc = (v) => v >= 80 ? C.accent : v >= 60 ? C.warn : C.danger;
const grade = (s) => s >= 90 ? "S" : s >= 82 ? "A+" : s >= 75 ? "A" : s >= 65 ? "B" : s >= 55 ? "C" : "D";
const gradeLabel = (s) => s >= 90 ? "Elite" : s >= 82 ? "Excellent" : s >= 75 ? "Strong" : s >= 65 ? "Good" : s >= 55 ? "Fair" : "Needs Work";

const fallback = (s, set, total) =>
  s >= 82
    ? `Clean set — your mechanics held up well across all 10 reps. Tighten your tempo on the descent, a deliberate 2-count down will build more stability. ${set < total ? "Stay locked in and make the next set even sharper." : "That's a strong session — you're building real consistency."}`
    : s >= 65
    ? `You got through the set but form slipped around reps 6-8 as fatigue built. Drive your knees out and keep your chest from collapsing. ${set < total ? "Reset your breathing and come back with more intention." : "Focus on that correction next session."}`
    : `Form broke down significantly — sit back and down like reaching for a box behind you, and brace hard before every rep. ${set < total ? "Take the full rest and attack the next set with control." : "Prioritize this correction next session before adding load."}`;

export default function FormIQ() {
  const [screen, setScreen]         = useState("setup");
  const [camMode, setCamMode]       = useState(null);
  const [totalSets, setTotalSets]   = useState(3);
  const [curSet, setCurSet]         = useState(1);
  const [reps, setReps]             = useState(0);
  const [repFlash, setRepFlash]     = useState(false);
  const [analyzing, setAnalyzing]   = useState(false);
  const [feedback, setFeedback]     = useState("");
  const [history, setHistory]       = useState([]);
  const [metrics, setMetrics]       = useState(null);
  const [resting, setResting]       = useState(false);
  const [restT, setRestT]           = useState(0);
  const [finalScore, setFinalScore] = useState(null);
  const [tipI, setTipI]             = useState(0);
  const [scan, setScan]             = useState(0);
  const [dots, setDots]             = useState(0);
  const historyRef = useRef([]);

  const REPS = 10, REST = 90;

  useEffect(() => {
    if (screen !== "workout") return;
    const t = setInterval(() => setTipI(i => (i + 1) % TIPS.length), 4500);
    return () => clearInterval(t);
  }, [screen]);

  useEffect(() => {
    const t = setInterval(() => setScan(s => (s + 1.2) % 100), 35);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!analyzing) return;
    const t = setInterval(() => setDots(d => (d + 1) % 4), 450);
    return () => clearInterval(t);
  }, [analyzing]);

  useEffect(() => {
    if (!resting) return;
    const t = setInterval(() => setRestT(r => {
      if (r >= REST - 1) { setResting(false); setRestT(0); return 0; }
      return r + 1;
    }), 1000);
    return () => clearInterval(t);
  }, [resting]);

  const mkMetrics = (setNum) => {
    const g = (setNum - 1) * 3.5;
    const r = (b) => Math.min(100, Math.floor(b + g + (Math.random() - 0.28) * 17));
    return {
      kneeAlignment: r(68), spineNeutrality: r(65),
      squatDepth: r(62), tempoConsistency: r(59), hipHinge: r(71),
    };
  };

  const calcScore = (m) =>
    Math.round(METRICS_DEF.reduce((s, { key, weight }) => s + m[key] * weight, 0));

  const tapRep = () => {
    if (reps >= REPS || analyzing) return;
    const n = reps + 1;
    setReps(n);
    setRepFlash(true);
    setTimeout(() => setRepFlash(false), 200);
    if (n >= REPS) setTimeout(finishSet, 850);
  };

  const finishSet = async () => {
    const m = mkMetrics(curSet);
    const score = calcScore(m);
    setMetrics(m);
    const entry = { setNumber: curSet, score, metrics: m };
    historyRef.current = [...historyRef.current, entry];
    setHistory(historyRef.current);
    setAnalyzing(true);
    setScreen("analysis");
    if (curSet < totalSets) setResting(true);

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 800,
          messages: [{
            role: "user",
            content: `You are an elite strength coach. Athlete finished Set ${curSet} of ${totalSets} (10 squats).
Knee Alignment: ${m.kneeAlignment}/100
Spine Neutrality: ${m.spineNeutrality}/100
Squat Depth: ${m.squatDepth}/100
Tempo Control: ${m.tempoConsistency}/100
Hip Hinge: ${m.hipHinge}/100
Set Score: ${score}/100
Respond in exactly 3 sentences. No lists, no headers.`
          }]
        })
      });
      const d = await res.json();
      const text = d.content?.map(b => b.text || "").join("").trim();
      setFeedback(text || fallback(score, curSet, totalSets));
    } catch {
      setFeedback(fallback(score, curSet, totalSets));
    }
    setAnalyzing(false);
  };

  const nextSet = () => {
    if (curSet >= totalSets) {
      const h = historyRef.current;
      const avg = h.length ? Math.round(h.reduce((s, e) => s + e.score, 0) / h.length) : 0;
      setFinalScore(avg);
      setScreen("results");
    } else {
      setCurSet(c => c + 1);
      setReps(0);
      setFeedback("");
      setMetrics(null);
      setScreen("workout");
    }
  };

  const restart = () => {
    setScreen("setup"); setCamMode(null); setCurSet(1); setReps(0);
    setHistory([]); historyRef.current = [];
    setMetrics(null); setFeedback("");
    setFinalScore(null); setAnalyzing(false);
    setResting(false); setRestT(0); setTotalSets(3);
  };

  const font = "system-ui, -apple-system, 'Segoe UI', sans-serif";
  const page = { background: C.bg, color: C.text, minHeight: "100vh", fontFamily: font };
  const card = (accent) => ({
    background: C.surface, borderRadius: 10, padding: "16px 18px",
    border: `1px solid ${accent ? C.accent + "40" : C.border}`,
  });
  const pill = (active) => ({
    width: 36, height: 36, borderRadius: 8, cursor: "pointer",
    background: active ? C.accent : C.s2,
    color: active ? "#000" : C.text,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontWeight: 800, fontSize: 14,
  });
  const label = {
    fontSize: 10, letterSpacing: 3, color: C.muted,
    textTransform: "uppercase", fontWeight: 600,
  };

  // ── SETUP ──────────────────────────────────────────────────
  if (screen === "setup") return (
    <div style={{ ...page, padding: "28px 20px 32px" }}>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:translateY(0) } }
        .fu { animation: fadeUp 0.4s ease forwards; }
        .fu1 { animation-delay:0.05s; opacity:0 }
        .fu2 { animation-delay:0.12s; opacity:0 }
        .fu3 { animation-delay:0.19s; opacity:0 }
        .fu4 { animation-delay:0.26s; opacity:0 }
        .fu5 { animation-delay:0.33s; opacity:0 }
        .cam-card:hover { border-color:${C.accent}88 !important; }
        .rep-btn:active { transform:scale(0.97); }
      `}</style>
      <div style={{ maxWidth: 560, margin: "0 auto" }}>

        {/* ── HERO LOGO ── */}
        <div className="fu fu1" style={{ textAlign: "center", marginBottom: 36 }}>
          <img
            src={`${process.env.PUBLIC_URL}/formIQ.png`}
            alt="FormIQ"
            style={{ height: 110, width: "auto", objectFit: "contain", display: "block", margin: "0 auto 14px" }}
          />
          <div style={{
            display: "inline-block",
            fontSize: 10, letterSpacing: 3, color: C.accent,
            textTransform: "uppercase", fontWeight: 600,
            background: C.accent + "15", padding: "4px 14px", borderRadius: 20,
            border: `1px solid ${C.accent}30`,
          }}>
            AI Squat Coach · Phase 1
          </div>
          <div style={{ color: C.mutedLight, marginTop: 12, fontSize: 14 }}>
            Real-time form tracking · AI coaching · Session scoring
          </div>
        </div>

        {/* ── CAMERA SETUP ── */}
        <div className="fu fu2" style={{ marginBottom: 18 }}>
          <div style={{ ...label, marginBottom: 10 }}>Camera Setup</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[
              { id: "quad-4k", title: "Quad 4K System",  lines: ["4× cameras via HDMI", "Front · Back · Left · Right", "Capture card required"], badge: "PRO" },
              { id: "single",  title: "Single Camera",    lines: ["Webcam · Mobile · HDMI", "Side-on view recommended", "Plug-and-play ready"],   badge: "BASIC" },
            ].map(({ id, title, lines, badge }) => (
              <div
                key={id}
                className="cam-card"
                onClick={() => setCamMode(id)}
                style={{
                  ...card(false), cursor: "pointer", transition: "border-color 0.2s, background 0.2s",
                  border: `1px solid ${camMode === id ? C.accent : C.border}`,
                  background: camMode === id ? "#071510" : C.surface,
                  position: "relative",
                }}
              >
                <div style={{
                  position: "absolute", top: 12, right: 12, fontSize: 9, fontWeight: 700,
                  letterSpacing: 1.5, padding: "3px 8px", borderRadius: 4,
                  background: camMode === id ? C.accent : C.s2,
                  color: camMode === id ? "#000" : C.muted,
                }}>{badge}</div>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>{title}</div>
                {lines.map((l, i) => <div key={i} style={{ fontSize: 12, color: C.mutedLight, lineHeight: 1.7 }}>{l}</div>)}
                {camMode === id && <div style={{ marginTop: 10, fontSize: 11, color: C.accent, fontWeight: 600 }}>✓ Selected</div>}
              </div>
            ))}
          </div>
        </div>

        {/* ── SESSION CONFIG ── */}
        <div className="fu fu3" style={{ ...card(false), marginBottom: 18 }}>
          <div style={{ ...label, marginBottom: 14 }}>Session Config</div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 15 }}>Number of Sets</div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>10 reps per set · 90s rest</div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {[2, 3, 4, 5].map(n => (
                <div key={n} style={pill(totalSets === n)} onClick={() => setTotalSets(n)}>{n}</div>
              ))}
            </div>
          </div>
        </div>

        {/* ── PHASE NOTE ── */}
        <div className="fu fu4" style={{ ...card(false), marginBottom: 20, background: C.s2 }}>
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ fontSize: 18, flexShrink: 0 }}>🔬</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Phase 1 — Simulation Mode</div>
              <div style={{ fontSize: 12, color: C.mutedLight, lineHeight: 1.6 }}>
                Camera feeds and form metrics are simulated. Phase 2 integrates MediaPipe Pose for live keypoint tracking from all camera inputs.
              </div>
            </div>
          </div>
        </div>

        {/* ── START ── */}
        <div className="fu fu5">
          <button
            onClick={() => camMode && setScreen("workout")}
            style={{
              width: "100%", padding: "18px", fontSize: 15, fontWeight: 800,
              background: camMode ? C.accent : C.s3,
              color: camMode ? "#000" : C.muted,
              border: "none", borderRadius: 10, cursor: camMode ? "pointer" : "default",
              letterSpacing: 2.5, textTransform: "uppercase", transition: "all 0.25s",
            }}
          >
            {camMode ? "Begin Session →" : "Select a camera mode to start"}
          </button>
        </div>

        <div style={{ display: "flex", gap: 6, marginTop: 16, flexWrap: "wrap", justifyContent: "center" }}>
          {["360° multi-angle", "AI coaching", "Per-set scoring", "HDMI support", "Mobile ready"].map(f => (
            <span key={f} style={{ fontSize: 11, color: C.muted, background: C.s2, padding: "3px 10px", borderRadius: 20 }}>{f}</span>
          ))}
        </div>
      </div>
    </div>
  );

  // ── WORKOUT ────────────────────────────────────────────────
  if (screen === "workout") {
    const pct = (reps / REPS) * 100;

    const CamFeed = ({ label: lbl, angle }) => (
      <div style={{
        background: "#030303", position: "relative", overflow: "hidden",
        aspectRatio: camMode === "quad-4k" ? "4/3" : "16/9",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.07 }} preserveAspectRatio="none">
          {[1,2,3,4,5].map(i => <line key={`v${i}`} x1={`${i*16.66}%`} y1="0" x2={`${i*16.66}%`} y2="100%" stroke={C.accent} strokeWidth="0.5"/>)}
          {[1,2,3].map(i => <line key={`h${i}`} x1="0" y1={`${i*25}%`} x2="100%" y2={`${i*25}%`} stroke={C.accent} strokeWidth="0.5"/>)}
        </svg>
        <div style={{ position:"absolute", left:0, right:0, height:1, top:`${scan}%`, background:`linear-gradient(90deg,transparent,${C.accent}60,transparent)` }}/>
        <svg viewBox="0 0 80 90" width={camMode === "quad-4k" ? "26%" : "14%"} style={{ opacity:0.22 }}>
          <circle cx="40" cy="9" r="7" fill={C.accent}/>
          <line x1="40" y1="16" x2="36" y2="46" stroke={C.accent} strokeWidth="3" strokeLinecap="round"/>
          <line x1="38" y1="24" x2="20" y2="30" stroke={C.accent} strokeWidth="2.5" strokeLinecap="round"/>
          <line x1="38" y1="24" x2="56" y2="30" stroke={C.accent} strokeWidth="2.5" strokeLinecap="round"/>
          <line x1="36" y1="46" x2="20" y2="62" stroke={C.accent} strokeWidth="3" strokeLinecap="round"/>
          <line x1="36" y1="46" x2="52" y2="62" stroke={C.accent} strokeWidth="3" strokeLinecap="round"/>
          <line x1="20" y1="62" x2="14" y2="82" stroke={C.accent} strokeWidth="3" strokeLinecap="round"/>
          <line x1="52" y1="62" x2="58" y2="82" stroke={C.accent} strokeWidth="3" strokeLinecap="round"/>
          <line x1="14" y1="82" x2="5"  y2="85" stroke={C.accent} strokeWidth="2" strokeLinecap="round"/>
          <line x1="58" y1="82" x2="67" y2="85" stroke={C.accent} strokeWidth="2" strokeLinecap="round"/>
          <line x1="4"  y1="25" x2="72" y2="25" stroke={C.accent} strokeWidth="4" strokeLinecap="round"/>
          <circle cx="4"  cy="25" r="5" fill="none" stroke={C.accent} strokeWidth="2"/>
          <circle cx="72" cy="25" r="5" fill="none" stroke={C.accent} strokeWidth="2"/>
        </svg>
        {[
          { top:7, left:7,   bt:true, bl:true },
          { top:7, right:7,  bt:true, br:true },
          { bottom:7, left:7,  bb:true, bl:true },
          { bottom:7, right:7, bb:true, br:true },
        ].map(({ top, left, right, bottom, bt, br, bb, bl }, i) => (
          <div key={i} style={{
            position:"absolute", top, left, right, bottom, width:13, height:13,
            borderTop:    bt ? `2px solid ${C.accent}` : "none",
            borderRight:  br ? `2px solid ${C.accent}` : "none",
            borderBottom: bb ? `2px solid ${C.accent}` : "none",
            borderLeft:   bl ? `2px solid ${C.accent}` : "none",
          }}/>
        ))}
        <div style={{ position:"absolute", bottom:7, left:9, fontSize:9, color:C.accent, letterSpacing:2, fontWeight:700 }}>{lbl}</div>
        <div style={{ position:"absolute", top:8, right:9, display:"flex", alignItems:"center", gap:4 }}>
          <div style={{ width:5, height:5, borderRadius:"50%", background:"#FF3B3B" }}/>
          <span style={{ fontSize:9, color:C.muted, letterSpacing:1 }}>LIVE</span>
        </div>
        {angle && <div style={{ position:"absolute", top:8, left:9, fontSize:9, color:C.muted, letterSpacing:1 }}>{angle}</div>}
      </div>
    );

    return (
      <div style={{ ...page }}>
        <div style={{ display:"grid", gridTemplateColumns: camMode==="quad-4k" ? "1fr 1fr" : "1fr", gap:1.5, background:"#000" }}>
          {camMode === "quad-4k"
            ? [
                { label:"FRONT",      angle:"CAM-1 · 4K" },
                { label:"BACK",       angle:"CAM-2 · 4K" },
                { label:"LEFT SIDE",  angle:"CAM-3 · 4K" },
                { label:"RIGHT SIDE", angle:"CAM-4 · 4K" },
              ].map(({ label: lbl, angle }) => <CamFeed key={lbl} label={lbl} angle={angle}/>)
            : <CamFeed label="MAIN CAMERA" />
          }
        </div>

        <div style={{ padding:"18px 20px 24px", background:C.bg }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:14 }}>
            <div>
              <div style={{ ...label, marginBottom:8 }}>Set {curSet} of {totalSets}</div>
              <div style={{ display:"flex", gap:5 }}>
                {[...Array(totalSets)].map((_,i) => (
                  <div key={i} style={{
                    width:26, height:4, borderRadius:2,
                    background: i < curSet-1 ? C.accent : i===curSet-1 ? C.accent+"55" : C.s2,
                  }}/>
                ))}
              </div>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ ...label, marginBottom:3 }}>Reps</div>
              <div style={{ fontSize:50, fontWeight:900, lineHeight:1, letterSpacing:-3, color:repFlash?C.accent:C.text, transition:"color 0.12s" }}>
                {reps}<span style={{ fontSize:22, color:C.muted, fontWeight:400 }}>/{REPS}</span>
              </div>
            </div>
          </div>

          <div style={{ height:3, background:C.s2, borderRadius:2, marginBottom:14, overflow:"hidden" }}>
            <div style={{ height:"100%", width:`${pct}%`, background:C.accent, borderRadius:2, transition:"width 0.28s ease" }}/>
          </div>

          <div style={{ display:"flex", gap:5, marginBottom:14 }}>
            {[...Array(REPS)].map((_,i) => (
              <div key={i} style={{ flex:1, height:6, borderRadius:2, background:i<reps?C.accent:C.s2, transition:"background 0.15s" }}/>
            ))}
          </div>

          <div style={{ ...card(false), marginBottom:14, padding:"11px 14px", display:"flex", gap:10, alignItems:"flex-start" }}>
            <div style={{ color:C.accent, fontSize:13, flexShrink:0, marginTop:1 }}>▸</div>
            <div style={{ fontSize:13, color:"#C8C8C8", lineHeight:1.5 }}>{TIPS[tipI]}</div>
          </div>

          <button
            className="rep-btn"
            onClick={tapRep}
            disabled={reps >= REPS}
            style={{
              width:"100%", padding:"20px", fontSize:16, fontWeight:800,
              background: reps>=REPS ? C.s2 : C.accent,
              color: reps>=REPS ? C.muted : "#000",
              border:"none", borderRadius:10, cursor:reps>=REPS?"default":"pointer",
              letterSpacing:2, textTransform:"uppercase", transition:"all 0.2s",
            }}
          >
            {reps >= REPS ? "Set complete — calculating score..." : `TAP EACH REP  ·  ${REPS - reps} REMAINING`}
          </button>

          <div style={{ textAlign:"center", marginTop:10, fontSize:11, color:C.muted }}>
            Phase 2: automatic rep detection via MediaPipe Pose
          </div>
        </div>
      </div>
    );
  }

  // ── ANALYSIS ───────────────────────────────────────────────
  if (screen === "analysis") {
    const score = metrics ? calcScore(metrics) : 0;
    const restRemaining = REST - restT;
    const restPct = (restRemaining / REST) * 100;

    return (
      <div style={{ ...page, padding:"24px 20px 32px" }}>
        <div style={{ maxWidth:560, margin:"0 auto" }}>

          <div style={{ textAlign:"center", marginBottom:26, paddingTop:6 }}>
            <div style={{ ...label, marginBottom:12 }}>Set {curSet} · {REPS} reps · Complete</div>
            <div style={{ fontSize:88, fontWeight:900, letterSpacing:-5, lineHeight:1, color:analyzing?C.muted:mc(score), transition:"color 0.5s" }}>
              {analyzing ? "—" : score}
            </div>
            <div style={{ fontSize:16, color:analyzing?C.muted:mc(score), fontWeight:700, marginTop:4 }}>
              {analyzing ? `Analyzing form${".".repeat(dots)}` : `${grade(score)}  ·  ${gradeLabel(score)}`}
            </div>
          </div>

          {metrics && (
            <div style={{ ...card(false), marginBottom:14 }}>
              <div style={{ ...label, marginBottom:16 }}>Form Analysis · Set {curSet}</div>
              {METRICS_DEF.map(({ key, label: lbl, weight }) => {
                const v = metrics[key];
                return (
                  <div key={key} style={{ marginBottom:13 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5, alignItems:"center" }}>
                      <span style={{ fontSize:13, color:C.text }}>{lbl}</span>
                      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                        <span style={{ fontSize:11, color:C.muted }}>×{weight}</span>
                        <span style={{ fontSize:13, fontWeight:700, color:mc(v), minWidth:50, textAlign:"right" }}>{v}/100</span>
                      </div>
                    </div>
                    <div style={{ height:4, background:C.s2, borderRadius:2, overflow:"hidden" }}>
                      <div style={{ height:"100%", width:`${v}%`, background:mc(v), borderRadius:2, transition:"width 0.9s cubic-bezier(0.25,1,0.5,1)" }}/>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ ...card(true), marginBottom:14 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
              <div style={{ width:22, height:22, borderRadius:6, background:C.accent, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13 }}>⚡</div>
              <span style={{ ...label, color:C.accent }}>AI Coach · Claude</span>
              {analyzing && <span style={{ fontSize:11, color:C.muted, marginLeft:4 }}>thinking{".".repeat(dots)}</span>}
            </div>
            <p style={{ margin:0, fontSize:14, lineHeight:1.75, color:analyzing?C.muted:"#D8D8D8" }}>
              {analyzing ? "Processing your squat mechanics across all 10 reps..." : feedback}
            </p>
          </div>

          {resting && (
            <div style={{ ...card(false), marginBottom:14, display:"flex", alignItems:"center", gap:16 }}>
              <div style={{ flexShrink:0 }}>
                <div style={{ ...label, marginBottom:4 }}>Rest Timer</div>
                <div style={{ fontSize:34, fontWeight:900, color:restRemaining<20?C.warn:C.text }}>{restRemaining}s</div>
              </div>
              <div style={{ flex:1 }}>
                <div style={{ height:4, background:C.s2, borderRadius:2, overflow:"hidden" }}>
                  <div style={{ height:"100%", width:`${restPct}%`, background:restRemaining<20?C.warn:C.accent, transition:"width 1s linear", borderRadius:2 }}/>
                </div>
                <div style={{ fontSize:11, color:C.muted, marginTop:6 }}>
                  {restRemaining > 0 ? "Tap below to start the next set early" : "Rest complete — ready for next set"}
                </div>
              </div>
            </div>
          )}

          {history.length >= 2 && (
            <div style={{ ...card(false), marginBottom:14 }}>
              <div style={{ ...label, marginBottom:12 }}>Progress This Session</div>
              <div style={{ display:"flex", gap:8 }}>
                {history.map(({ setNumber: sn, score: sc }) => (
                  <div key={sn} style={{ flex:1, textAlign:"center" }}>
                    <div style={{ fontSize:10, color:C.muted, marginBottom:4 }}>S{sn}</div>
                    <div style={{ fontSize:18, fontWeight:800, color:mc(sc) }}>{sc}</div>
                    <div style={{ height:3, background:C.s2, borderRadius:2, marginTop:5, overflow:"hidden" }}>
                      <div style={{ height:"100%", width:`${sc}%`, background:mc(sc), borderRadius:2 }}/>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!analyzing && (
            <button
              onClick={nextSet}
              style={{
                width:"100%", padding:"18px", fontSize:15, fontWeight:800,
                background:C.accent, color:"#000", border:"none",
                borderRadius:10, cursor:"pointer", letterSpacing:2, textTransform:"uppercase",
              }}
            >
              {curSet >= totalSets ? "View Session Results →" : `Start Set ${curSet + 1} / ${totalSets} →`}
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── RESULTS ────────────────────────────────────────────────
  const fs = finalScore ?? 0;
  const gc = mc(fs);
  const avgMetrics = METRICS_DEF.map(({ key, label: lbl }) => ({
    key, label: lbl,
    avg: history.length ? Math.round(history.reduce((s, e) => s + e.metrics[key], 0) / history.length) : 0,
  }));
  const mostImproved = avgMetrics.reduce((a, b) => {
    const aG = history.length >= 2 ? history[history.length-1].metrics[a.key] - history[0].metrics[a.key] : 0;
    const bG = history.length >= 2 ? history[history.length-1].metrics[b.key] - history[0].metrics[b.key] : 0;
    return bG > aG ? b : a;
  });

  return (
    <div style={{ ...page, padding:"24px 20px 36px" }}>
      <div style={{ maxWidth:560, margin:"0 auto" }}>

        <div style={{ textAlign:"center", padding:"20px 0 28px" }}>
          <img
            src={`${process.env.PUBLIC_URL}/formIQ.png`}
            alt="FormIQ"
            style={{ height: 60, width:"auto", objectFit:"contain", display:"block", margin:"0 auto 20px", opacity:0.85 }}
          />
          <div style={{ ...label, marginBottom:14 }}>Session Complete</div>
          <div style={{ fontSize:104, fontWeight:900, letterSpacing:-6, color:gc, lineHeight:1 }}>{fs}</div>
          <div style={{ fontSize:24, color:gc, fontWeight:700, marginTop:6 }}>{grade(fs)}  ·  {gradeLabel(fs)}</div>
          <div style={{ color:C.muted, marginTop:8, fontSize:13 }}>
            {totalSets} sets · {totalSets * REPS} total reps · {camMode === "quad-4k" ? "Quad 4K" : "Single Camera"}
          </div>
        </div>

        <div style={{ ...card(false), marginBottom:14 }}>
          <div style={{ ...label, marginBottom:16 }}>Set-by-Set Results</div>
          {history.map(({ setNumber: sn, score: sc }) => (
            <div key={sn} style={{ display:"flex", alignItems:"center", gap:12, marginBottom:14 }}>
              <div style={{ width:36, height:36, borderRadius:8, flexShrink:0, background:mc(sc)+"18", display:"flex", alignItems:"center", justifyContent:"center", color:mc(sc), fontWeight:800, fontSize:12 }}>S{sn}</div>
              <div style={{ flex:1 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                  <span style={{ fontSize:13, color:C.mutedLight }}>Set {sn}</span>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <span style={{ fontSize:11, color:C.muted }}>{grade(sc)}</span>
                    <span style={{ fontSize:14, fontWeight:700, color:mc(sc) }}>{sc}/100</span>
                  </div>
                </div>
                <div style={{ height:4, background:C.s2, borderRadius:2, overflow:"hidden" }}>
                  <div style={{ height:"100%", width:`${sc}%`, background:mc(sc), borderRadius:2 }}/>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ ...card(false), marginBottom:14 }}>
          <div style={{ ...label, marginBottom:14 }}>Session Averages</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
            {avgMetrics.map(({ key, label: lbl, avg }) => (
              <div key={key} style={{ background:C.s2, borderRadius:8, padding:"12px 14px", position:"relative" }}>
                {key === mostImproved.key && history.length >= 2 && (
                  <div style={{ position:"absolute", top:8, right:8, fontSize:9, color:C.accent, background:C.accent+"18", padding:"1px 6px", borderRadius:4, fontWeight:700, letterSpacing:1 }}>+MOST</div>
                )}
                <div style={{ fontSize:11, color:C.muted, marginBottom:5 }}>{lbl}</div>
                <div style={{ fontSize:26, fontWeight:900, color:mc(avg), lineHeight:1 }}>{avg}</div>
                <div style={{ height:2, background:C.s3, borderRadius:1, marginTop:8, overflow:"hidden" }}>
                  <div style={{ height:"100%", width:`${avg}%`, background:mc(avg), borderRadius:1 }}/>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ ...card(false), marginBottom:20, background:C.s2 }}>
          <div style={{ ...label, marginBottom:10 }}>Roadmap — Coming in Phase 2</div>
          {[
            "Live MediaPipe Pose tracking on all camera inputs",
            "Automatic rep detection — no tapping required",
            "Real-time on-screen form alerts mid-rep",
            "Rep-by-rep consistency heatmap per set",
            "Session history & long-term progress analytics",
          ].map((item, i) => (
            <div key={i} style={{ display:"flex", gap:8, marginBottom:8, alignItems:"flex-start" }}>
              <div style={{ color:C.muted, fontSize:12, marginTop:1, flexShrink:0 }}>○</div>
              <div style={{ fontSize:12, color:C.mutedLight, lineHeight:1.5 }}>{item}</div>
            </div>
          ))}
        </div>

        <div style={{ display:"flex", gap:10 }}>
          <button
            onClick={restart}
            style={{ flex:1, padding:"17px", fontSize:14, fontWeight:800, background:C.accent, color:"#000", border:"none", borderRadius:10, cursor:"pointer", letterSpacing:2, textTransform:"uppercase" }}
          >
            New Session
          </button>
          <button
            onClick={() => alert(`FormIQ Session\nScore: ${fs}/100 (${grade(fs)})\n${totalSets} sets · ${totalSets*REPS} reps\n${history.map(h=>`Set ${h.setNumber}: ${h.score}/100`).join("\n")}`)}
            style={{ flex:1, padding:"17px", fontSize:14, fontWeight:700, background:C.s2, color:C.text, border:`1px solid ${C.border}`, borderRadius:10, cursor:"pointer", letterSpacing:1.5, textTransform:"uppercase" }}
          >
            Share Results
          </button>
        </div>
      </div>
    </div>
  );
}
