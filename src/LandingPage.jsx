import { useState, useEffect } from "react";

const SITE = "formiq.name.ng";

const font = "'DM Sans', system-ui, -apple-system, sans-serif";

const C = {
  bg:      "#07080A",
  surface: "#0E1014",
  s2:      "#141619",
  border:  "#1E2128",
  accent:  "#00E676",
  gold:    "#F5A623",
  blue:    "#3D8EF0",
  purple:  "#9B6DFF",
  text:    "#F0F2F5",
  muted:   "#6B7280",
  mutedL:  "#9CA3AF",
};

// ── Reusable components ───────────────────────────────────────
function Pill({ children, color = C.accent }) {
  return (
    <span style={{
      display:"inline-block", fontSize:11, fontWeight:700,
      letterSpacing:2, textTransform:"uppercase",
      color, background:`${color}18`,
      border:`1px solid ${color}40`,
      padding:"4px 14px", borderRadius:20,
    }}>{children}</span>
  );
}

function Check({ color = C.accent }) {
  return <span style={{ color, fontWeight:700, fontSize:14, flexShrink:0 }}>✓</span>;
}

function Cross() {
  return <span style={{ color:C.muted, fontWeight:700, fontSize:14, flexShrink:0 }}>—</span>;
}

// ── Animated counter ──────────────────────────────────────────
function Counter({ to, suffix="" }) {
  const [val, setVal] = useState(0);
  useEffect(()=>{
    let start=0;
    const step = to / 40;
    const t = setInterval(()=>{
      start += step;
      if(start >= to){ setVal(to); clearInterval(t); }
      else setVal(Math.floor(start));
    }, 30);
    return ()=>clearInterval(t);
  },[to]);
  return <span>{val.toLocaleString()}{suffix}</span>;
}

// ══════════════════════════════════════════════════════════════
export default function LandingPage({ onGetStarted }) {
  const [billingAnnual, setBillingAnnual] = useState(false);
  const [menuOpen, setMenuOpen]           = useState(false);
  const [scrolled, setScrolled]           = useState(false);

  useEffect(()=>{
    const handler = ()=>setScrolled(window.scrollY>40);
    window.addEventListener("scroll", handler);
    return ()=>window.removeEventListener("scroll", handler);
  },[]);

  const PLANS = [
    {
      key: "free",
      name: "Free",
      monthly: 0,
      annual: 0,
      badge: null,
      color: C.mutedL,
      desc: "Perfect for getting started — no card ever required.",
      cta: "Get Started Free",
      features: [
        { text:"15 sessions / month",            yes:true  },
        { text:"4 AI form analyses / month",      yes:true  },
        { text:"Basic Form Score",                yes:true  },
        { text:"2–3 key report takeaways",        yes:true  },
        { text:"Single Camera mode",              yes:true  },
        { text:"Public share links",              yes:true  },
        { text:"Full KEEP / FIX / Drill plans",   yes:false },
        { text:"AI Coach chat",                   yes:false },
        { text:"Progress trends & graphs",        yes:false },
        { text:"Quad 4K Multi-Camera mode",       yes:false },
        { text:"Frame-by-frame breakdown",        yes:false },
      ],
    },
    {
      key: "pro",
      name: "Pro",
      monthly: 6.99,
      annual: 4.49,
      badge: "Most Popular",
      color: C.blue,
      desc: "For athletes who train consistently and want full feedback.",
      cta: "Start 7-Day Free Trial",
      features: [
        { text:"30 sessions / month",                     yes:true  },
        { text:"15 AI form analyses / month",             yes:true  },
        { text:"Full KEEP / FIX / Drill plans",          yes:true  },
        { text:"AI Coach chat",                           yes:true  },
        { text:"Progress graphs & trends",                yes:true  },
        { text:"Single Camera mode",                      yes:true  },
        { text:"Quad 4K Multi-Camera mode",               yes:true  },
        { text:"Coach share links + all sport phases",   yes:true  },
        { text:"Frame-by-frame breakdown",                yes:false },
        { text:"Adaptive 12-week programme",              yes:false },
        { text:"Benchmark comparisons",                   yes:false },
      ],
    },
    {
      key: "elite",
      name: "Elite",
      monthly: 12.99,
      annual: 8.49,
      badge: "Best Value",
      color: C.gold,
      desc: "Unlimited everything. For competitive athletes and coaches.",
      cta: "Start 7-Day Free Trial",
      features: [
        { text:"Unlimited sessions",                      yes:true },
        { text:"Unlimited AI form analyses",              yes:true },
        { text:"Frame-by-frame breakdown",                yes:true },
        { text:"Adaptive 12-week programme",              yes:true },
        { text:"Benchmark comparisons",                   yes:true },
        { text:"Personalised training recommendations",   yes:true },
        { text:"Priority AI Coach queue",                 yes:true },
        { text:"Unlimited Coach chat",                    yes:true },
        { text:"Quad 4K Multi-Camera mode",               yes:true },
        { text:"All Pro features",                        yes:true },
        { text:"Early access to new features",            yes:true },
      ],
    },
  ];

  const FEATURES = [
    {
      icon:"🎯",
      title:"Frame-by-Frame AI Analysis",
      body:"Every rep analysed in real time. Our AI tracks 33 body keypoints at 30fps, calculating knee angle, hip hinge, spine neutrality, and bar path — the same metrics used by elite sports scientists.",
    },
    {
      icon:"📐",
      title:"Science-Backed Benchmarks",
      body:"Built on IAAF biomechanics research and ALTIS coaching methodology. Your form scores are calibrated against elite athlete benchmarks — not just generic cues.",
    },
    {
      icon:"🤖",
      title:"AI Coach After Every Set",
      body:"Claude AI reviews your form data and delivers 3-sentence coaching in real time — honest, direct, and specific to what just happened in your set. Not generic advice.",
    },
    {
      icon:"📊",
      title:"KEEP / FIX / Drill Plans",
      body:"Every analysis delivers a structured breakdown: what to keep, what to fix, and the exact drills to close the gap. No guessing. No fluff.",
    },
    {
      icon:"📷",
      title:"Any Camera, Any Setup",
      body:"Works with your phone in single-camera mode today. Quad 4K HDMI (front, back, left, right) coming for pro setups — same app, same AI, complete 360° coverage.",
    },
    {
      icon:"👨‍🏫",
      title:"Trainer Integration",
      body:"Trainers get their own dashboard. They assign you to their FormIQ workspace, set weekly targets, review your sessions, and leave coaching notes — all without being in the room.",
    },
  ];

  const STEPS = [
    { n:"01", title:"Set up in 60 seconds", body:"Open the app, position your phone side-on, and run through a 4-step camera calibration. No equipment. No account required to start." },
    { n:"02", title:"Squat. We track everything.", body:"The AI detects every rep automatically. Knee angle, hip hinge, spine neutrality, tempo — all measured in real time from your camera feed." },
    { n:"03", title:"Get your breakdown instantly.", body:"After each set, Claude AI coaches you in 3 sentences. After your session, your full KEEP / FIX / Drill report is ready to share or save." },
    { n:"04", title:"Improve over time.", body:"Your form score history, metric trends, and progress graphs track every session. Share reports with your trainer or social network in one tap." },
  ];

  const TESTIMONIALS = [
    { name:"Marcus W.", role:"Powerlifter · 3 months", score:84, text:"My squat depth went from a D to a B in 6 weeks. The AI catches things my eyes in the mirror never could — especially my left knee caving on the descent." },
    { name:"Aisha J.", role:"Athletic Coach · Lagos", score:91, text:"I use FormIQ with all my clients now. The invite link system means I can monitor 20 athletes between sessions without a single video call." },
    { name:"Tom B.", role:"CrossFit · 8 months", score:88, text:"The KEEP / FIX breakdown is the best coaching cue system I've used. It doesn't just tell you what's wrong — it tells you exactly what drill fixes it." },
  ];

  return (
    <div style={{ background:C.bg, color:C.text, fontFamily:font, overflowX:"hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800;900&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        html{scroll-behavior:smooth}
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-thumb{background:#2E323A;border-radius:2px}
        @keyframes fadeUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
        .fu{animation:fadeUp .6s ease both}
        .fu1{animation-delay:.05s}.fu2{animation-delay:.15s}.fu3{animation-delay:.25s}.fu4{animation-delay:.35s}
        .pu{animation:pulse 2s ease-in-out infinite}
        .float{animation:float 3s ease-in-out infinite}
        .plan-card:hover{transform:translateY(-4px)!important;transition:all .25s}
        .feat-card:hover{border-color:#00E67640!important;background:#0E1204!important;transition:all .2s}
        .nav-link:hover{color:#F0F2F5!important}
        .cta-btn:hover{opacity:.92!important;transform:translateY(-1px)}
        .cta-btn:active{transform:scale(.98)}
        .toggle-btn:hover{opacity:.85}
      `}</style>

      {/* ── NAV ─────────────────────────────────────────────── */}
      <nav style={{
        position:"fixed", top:0, left:0, right:0, zIndex:100,
        background: scrolled ? `${C.surface}F0` : "transparent",
        borderBottom: scrolled ? `1px solid ${C.border}` : "none",
        backdropFilter: scrolled ? "blur(12px)" : "none",
        transition:"all .3s",
        padding:"14px 5%", display:"flex", alignItems:"center", justifyContent:"space-between",
      }}>
        <img src={`${process.env.PUBLIC_URL}/formIQ.png`} alt="FormIQ"
          style={{ height:32, width:"auto", objectFit:"contain" }}/>
        {/* Desktop nav */}
        <div style={{ display:"flex", gap:32, alignItems:"center" }}>
          {[["#features","Features"],["#how","How it works"],["#pricing","Pricing"]].map(([href,label])=>(
            <a key={href} href={href} className="nav-link"
              style={{ fontSize:14, color:C.muted, textDecoration:"none", fontWeight:500, transition:"color .15s" }}>
              {label}
            </a>
          ))}
          <a href="#trainers" className="nav-link"
            style={{ fontSize:14, color:C.muted, textDecoration:"none", fontWeight:500, transition:"color .15s" }}>
            For Trainers
          </a>
        </div>
        <div style={{ display:"flex", gap:10, alignItems:"center" }}>
          <button onClick={()=>onGetStarted("trainer-login")}
            style={{ background:"transparent", border:`1px solid ${C.border}`, color:C.mutedL, borderRadius:8, padding:"8px 16px", cursor:"pointer", fontSize:13, fontWeight:600, fontFamily:font }}>
            Trainer Login
          </button>
          <button onClick={()=>onGetStarted("squat")} className="cta-btn"
            style={{ background:C.accent, color:"#000", border:"none", borderRadius:8, padding:"9px 20px", cursor:"pointer", fontSize:13, fontWeight:800, letterSpacing:.5, fontFamily:font, transition:"all .2s" }}>
            Start Free →
          </button>
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────────────── */}
      <section style={{
        minHeight:"100vh", display:"flex", flexDirection:"column",
        alignItems:"center", justifyContent:"center",
        padding:"120px 5% 80px", textAlign:"center",
        background:`radial-gradient(ellipse 80% 50% at 50% -10%, ${C.accent}12 0%, transparent 70%)`,
        position:"relative", overflow:"hidden",
      }}>
        {/* Background grid */}
        <div style={{ position:"absolute", inset:0, opacity:.04, backgroundImage:`linear-gradient(${C.accent} 1px, transparent 1px), linear-gradient(90deg, ${C.accent} 1px, transparent 1px)`, backgroundSize:"60px 60px", pointerEvents:"none" }}/>

        <div className="fu fu1" style={{ marginBottom:20 }}>
          <Pill>AI Squat Form Analysis · Phase 2</Pill>
        </div>

        <h1 className="fu fu2" style={{
          fontSize:"clamp(36px,6vw,76px)", fontWeight:900,
          letterSpacing:"-2px", lineHeight:1.08,
          maxWidth:860, margin:"0 auto 24px",
          color:C.text,
        }}>
          Your technique is the gap between{" "}
          <span style={{ color:C.accent }}>where you are</span>{" "}
          and where you could be.
        </h1>

        <p className="fu fu3" style={{
          fontSize:"clamp(15px,2vw,19px)", color:C.mutedL,
          maxWidth:600, margin:"0 auto 36px", lineHeight:1.7, fontWeight:400,
        }}>
          Frame-by-frame AI analysis. Science-backed benchmarks. Coaching after every set.
          Built on IAAF biomechanics research and ALTIS methodology.
        </p>

        <div className="fu fu4" style={{ display:"flex", gap:14, flexWrap:"wrap", justifyContent:"center", marginBottom:48 }}>
          <button onClick={()=>onGetStarted("squat")} className="cta-btn"
            style={{ background:C.accent, color:"#000", border:"none", borderRadius:10, padding:"16px 32px", cursor:"pointer", fontSize:16, fontWeight:800, letterSpacing:.5, fontFamily:font, transition:"all .2s" }}>
            Build My Profile — It's Free →
          </button>
          <button onClick={()=>onGetStarted("trainer")} className="cta-btn"
            style={{ background:"transparent", color:C.text, border:`1px solid ${C.border}`, borderRadius:10, padding:"16px 28px", cursor:"pointer", fontSize:15, fontWeight:600, fontFamily:font, transition:"all .2s" }}>
            I'm a Trainer →
          </button>
        </div>

        {/* Trust badges */}
        <div className="fu" style={{ display:"flex", gap:28, flexWrap:"wrap", justifyContent:"center", alignItems:"center" }}>
          {[
            { icon:"📷", text:"Any smartphone camera" },
            { icon:"⚡", text:"First breakdown in under 2 min" },
            { icon:"🔒", text:"No card required to start" },
            { icon:"🌍", text:"Paystack · Stripe supported" },
          ].map(({icon,text})=>(
            <div key={text} style={{ display:"flex", alignItems:"center", gap:7, fontSize:13, color:C.muted }}>
              <span>{icon}</span><span>{text}</span>
            </div>
          ))}
        </div>

        {/* Hero visual — form score card */}
        <div className="float" style={{
          marginTop:64, background:C.surface, border:`1px solid ${C.border}`,
          borderRadius:16, padding:"20px 24px", maxWidth:420, width:"100%",
          boxShadow:`0 0 80px ${C.accent}18`,
          position:"relative",
        }}>
          <div style={{ position:"absolute", top:0, left:0, right:0, height:3, background:`linear-gradient(90deg,${C.accent},${C.blue})`, borderRadius:"16px 16px 0 0" }}/>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
            <div>
              <div style={{ fontSize:9, color:C.muted, letterSpacing:3, textTransform:"uppercase", marginBottom:4 }}>Live Session · Set 3 of 4</div>
              <div style={{ fontSize:13, fontWeight:600, color:C.text }}>Squat Form Analysis</div>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:6, background:`${C.accent}15`, border:`1px solid ${C.accent}40`, borderRadius:8, padding:"5px 10px" }}>
              <div className="pu" style={{ width:6, height:6, borderRadius:"50%", background:C.accent }}/>
              <span style={{ fontSize:10, color:C.accent, fontWeight:700, letterSpacing:1 }}>LIVE POSE</span>
            </div>
          </div>
          {/* Score */}
          <div style={{ display:"flex", alignItems:"center", gap:20, marginBottom:16 }}>
            <div style={{ fontSize:64, fontWeight:900, color:C.gold, letterSpacing:-3 }}>78</div>
            <div>
              <div style={{ fontSize:18, fontWeight:700, color:C.gold }}>B · Good</div>
              <div style={{ fontSize:12, color:C.muted, marginTop:3 }}>+6 from last session</div>
            </div>
          </div>
          {/* Metric bars */}
          {[
            { label:"Knee Alignment", val:73, col:C.gold },
            { label:"Squat Depth",    val:68, col:C.gold },
            { label:"Spine Neutral",  val:81, col:C.accent },
            { label:"Hip Hinge",      val:76, col:C.gold },
          ].map(({label,val,col})=>(
            <div key={label} style={{ marginBottom:8 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                <span style={{ fontSize:11, color:C.mutedL }}>{label}</span>
                <span style={{ fontSize:11, fontWeight:700, color:col }}>{val}</span>
              </div>
              <div style={{ height:3, background:C.s2, borderRadius:2, overflow:"hidden" }}>
                <div style={{ height:"100%", width:`${val}%`, background:col, borderRadius:2 }}/>
              </div>
            </div>
          ))}
          {/* AI feedback */}
          <div style={{ marginTop:14, background:`${C.accent}10`, border:`1px solid ${C.accent}25`, borderRadius:8, padding:"10px 12px" }}>
            <div style={{ fontSize:10, color:C.accent, fontWeight:700, marginBottom:5 }}>⚡ AI COACH · AFTER SET 3</div>
            <div style={{ fontSize:12, color:C.mutedL, lineHeight:1.6 }}>
              Solid set — your spine held neutral through all 10 reps. Drive your knees out harder on the descent; they're caving slightly at rep 7–8. Fix that and your depth score will climb another 8 points.
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS BAR ───────────────────────────────────────── */}
      <section style={{ background:C.surface, borderTop:`1px solid ${C.border}`, borderBottom:`1px solid ${C.border}`, padding:"32px 5%" }}>
        <div style={{ display:"flex", gap:0, justifyContent:"center", flexWrap:"wrap", maxWidth:900, margin:"0 auto" }}>
          {[
            { label:"Sessions analysed",   to:284000, suffix:"+"  },
            { label:"Form score improvement",to:31,   suffix:"% avg" },
            { label:"Trainers on platform", to:420,   suffix:"+"  },
            { label:"Countries",            to:28,    suffix:""   },
          ].map(({label,to,suffix},i)=>(
            <div key={label} style={{ flex:1, minWidth:160, textAlign:"center", padding:"12px 20px", borderRight:i<3?`1px solid ${C.border}`:"none" }}>
              <div style={{ fontSize:"clamp(28px,4vw,40px)", fontWeight:900, color:C.accent, letterSpacing:-1 }}>
                <Counter to={to} suffix={suffix}/>
              </div>
              <div style={{ fontSize:13, color:C.muted, marginTop:4 }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ────────────────────────────────────────── */}
      <section id="features" style={{ padding:"96px 5%", maxWidth:1200, margin:"0 auto" }}>
        <div style={{ textAlign:"center", marginBottom:60 }}>
          <Pill color={C.blue}>What FormIQ does</Pill>
          <h2 style={{ fontSize:"clamp(28px,4vw,48px)", fontWeight:900, letterSpacing:-1.5, marginTop:16, marginBottom:16 }}>
            Built on elite sports science.<br/>
            <span style={{ color:C.accent }}>Available to every athlete.</span>
          </h2>
          <p style={{ fontSize:16, color:C.muted, maxWidth:560, margin:"0 auto" }}>
            The same analysis methodology used by Olympic strength coaches — now accessible from a single smartphone camera.
          </p>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(320px,1fr))", gap:16 }}>
          {FEATURES.map(({icon,title,body})=>(
            <div key={title} className="feat-card" style={{
              background:C.surface, border:`1px solid ${C.border}`,
              borderRadius:14, padding:"24px",
              transition:"all .2s",
            }}>
              <div style={{ fontSize:32, marginBottom:14 }}>{icon}</div>
              <div style={{ fontSize:16, fontWeight:700, color:C.text, marginBottom:10 }}>{title}</div>
              <div style={{ fontSize:14, color:C.muted, lineHeight:1.7 }}>{body}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────────── */}
      <section id="how" style={{ background:C.surface, borderTop:`1px solid ${C.border}`, borderBottom:`1px solid ${C.border}`, padding:"96px 5%" }}>
        <div style={{ maxWidth:900, margin:"0 auto" }}>
          <div style={{ textAlign:"center", marginBottom:60 }}>
            <Pill color={C.purple}>How it works</Pill>
            <h2 style={{ fontSize:"clamp(28px,4vw,48px)", fontWeight:900, letterSpacing:-1.5, marginTop:16, marginBottom:16 }}>
              First breakdown in <span style={{ color:C.accent }}>under 2 minutes.</span>
            </h2>
            <p style={{ fontSize:16, color:C.muted }}>No equipment. No gym. No coach in the room.</p>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:24 }}>
            {STEPS.map(({n,title,body},i)=>(
              <div key={n} style={{ position:"relative" }}>
                {i<STEPS.length-1&&(
                  <div style={{ position:"absolute", top:20, left:"calc(100% + 12px)", width:24, height:1, background:`${C.accent}40`, display:"none" }}/>
                )}
                <div style={{ fontSize:11, fontWeight:800, color:C.accent, letterSpacing:2, marginBottom:12 }}>{n}</div>
                <div style={{ fontSize:16, fontWeight:700, color:C.text, marginBottom:10 }}>{title}</div>
                <div style={{ fontSize:13, color:C.muted, lineHeight:1.7 }}>{body}</div>
              </div>
            ))}
          </div>
          <div style={{ textAlign:"center", marginTop:48 }}>
            <button onClick={()=>onGetStarted("squat")} className="cta-btn"
              style={{ background:C.accent, color:"#000", border:"none", borderRadius:10, padding:"16px 36px", cursor:"pointer", fontSize:15, fontWeight:800, letterSpacing:.5, fontFamily:font, transition:"all .2s" }}>
              Try It Now — Free →
            </button>
          </div>
        </div>
      </section>

      {/* ── PRICING ─────────────────────────────────────────── */}
      <section id="pricing" style={{ padding:"96px 5%", maxWidth:1200, margin:"0 auto" }}>
        <div style={{ textAlign:"center", marginBottom:48 }}>
          <Pill color={C.gold}>Pricing</Pill>
          <h2 style={{ fontSize:"clamp(28px,4vw,48px)", fontWeight:900, letterSpacing:-1.5, marginTop:16, marginBottom:12 }}>
            Start free. Upgrade when you're ready.
          </h2>
          <p style={{ fontSize:16, color:C.muted, marginBottom:28 }}>
            All prices in USD. Save 35% with annual billing.
          </p>
          {/* Billing toggle */}
          <div style={{ display:"inline-flex", alignItems:"center", gap:12, background:C.surface, border:`1px solid ${C.border}`, borderRadius:30, padding:"6px 8px" }}>
            <button onClick={()=>setBillingAnnual(false)} className="toggle-btn"
              style={{ padding:"7px 18px", borderRadius:22, border:"none", cursor:"pointer", fontFamily:font, fontWeight:600, fontSize:13, background:!billingAnnual?C.accent:"transparent", color:!billingAnnual?"#000":C.muted, transition:"all .2s" }}>
              Monthly
            </button>
            <button onClick={()=>setBillingAnnual(true)} className="toggle-btn"
              style={{ padding:"7px 18px", borderRadius:22, border:"none", cursor:"pointer", fontFamily:font, fontWeight:600, fontSize:13, background:billingAnnual?C.accent:"transparent", color:billingAnnual?"#000":C.muted, transition:"all .2s", display:"flex", alignItems:"center", gap:7 }}>
              Annual
              <span style={{ fontSize:10, background:"#FF4757", color:"#fff", borderRadius:10, padding:"2px 7px", fontWeight:700 }}>−35%</span>
            </button>
          </div>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))", gap:16 }}>
          {PLANS.map(plan=>{
            const price = billingAnnual ? plan.annual : plan.monthly;
            const isPro = plan.key==="pro";
            return(
              <div key={plan.key} className="plan-card" style={{
                background: isPro ? `linear-gradient(145deg,#0A1020,${C.surface})` : C.surface,
                border:`2px solid ${isPro?plan.color:C.border}`,
                borderRadius:16, padding:"28px 24px",
                position:"relative", overflow:"hidden",
                transform: isPro?"translateY(-8px)":"none",
                boxShadow: isPro?`0 0 60px ${plan.color}20`:"none",
                transition:"transform .25s",
              }}>
                {/* Top accent */}
                <div style={{ position:"absolute", top:0, left:0, right:0, height:3, background:plan.color, borderRadius:"16px 16px 0 0" }}/>
                {plan.badge&&(
                  <div style={{ position:"absolute", top:16, right:16, fontSize:9, fontWeight:800, letterSpacing:1.5, background:plan.color, color:"#000", padding:"3px 10px", borderRadius:6 }}>
                    {plan.badge.toUpperCase()}
                  </div>
                )}

                <div style={{ marginBottom:6 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:plan.color, letterSpacing:1, textTransform:"uppercase" }}>{plan.name}</div>
                </div>
                <div style={{ marginBottom:6, display:"flex", alignItems:"baseline", gap:4 }}>
                  <span style={{ fontSize:44, fontWeight:900, color:C.text, letterSpacing:-2 }}>
                    {price===0?"Free":`$${price}`}
                  </span>
                  {price>0&&<span style={{ fontSize:14, color:C.muted }}>/{billingAnnual?"mo*":"mo"}</span>}
                </div>
                {billingAnnual&&price>0&&(
                  <div style={{ fontSize:11, color:C.muted, marginBottom:8 }}>
                    *billed as ${(price*12).toFixed(0)}/year
                  </div>
                )}
                <div style={{ fontSize:13, color:C.muted, marginBottom:24, lineHeight:1.6 }}>{plan.desc}</div>

                <button onClick={()=>onGetStarted("squat")} className="cta-btn"
                  style={{ width:"100%", padding:"13px", background:plan.key==="free"?"transparent":plan.color, color:plan.key==="free"?plan.color:"#000", border:`1.5px solid ${plan.color}`, borderRadius:9, fontWeight:800, fontSize:14, cursor:"pointer", fontFamily:font, letterSpacing:.5, marginBottom:24, transition:"all .2s" }}>
                  {plan.cta}
                </button>

                <div style={{ borderTop:`1px solid ${C.border}`, paddingTop:18 }}>
                  {plan.features.map(({text,yes})=>(
                    <div key={text} style={{ display:"flex", alignItems:"flex-start", gap:10, marginBottom:10, opacity:yes?1:.45 }}>
                      {yes?<Check color={plan.color}/>:<Cross/>}
                      <span style={{ fontSize:13, color:yes?C.mutedL:C.muted, lineHeight:1.5 }}>{text}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ textAlign:"center", marginTop:32, fontSize:13, color:C.muted }}>
          All plans include a 7-day free trial where applicable · Cancel anytime · No hidden fees
        </div>
      </section>

      {/* ── FOR TRAINERS ────────────────────────────────────── */}
      <section id="trainers" style={{ background:C.surface, borderTop:`1px solid ${C.border}`, borderBottom:`1px solid ${C.border}`, padding:"96px 5%" }}>
        <div style={{ maxWidth:960, margin:"0 auto", display:"grid", gridTemplateColumns:"1fr 1fr", gap:60, alignItems:"center" }}>
          <div>
            <Pill color={C.purple}>For Trainers</Pill>
            <h2 style={{ fontSize:"clamp(24px,3.5vw,40px)", fontWeight:900, letterSpacing:-1.5, marginTop:16, marginBottom:16, lineHeight:1.15 }}>
              Your eyes on every client.<br/>
              <span style={{ color:C.purple }}>Between every session.</span>
            </h2>
            <p style={{ fontSize:15, color:C.muted, lineHeight:1.8, marginBottom:28 }}>
              A trainer sees a client 2–3 hours per week. FormIQ fills the other 165 hours. Send a personalised invite link — they get your co-branded squat coach. Every session syncs to your dashboard instantly.
            </p>
            {[
              "Client roster with live form scores and trends",
              "Session sync — review every rep without being there",
              "Leave coaching notes visible before their next set",
              "Set weekly targets — they see them live in the app",
              "Co-branded experience with your photo and welcome message",
              "Send invite links via WhatsApp in one tap",
            ].map(t=>(
              <div key={t} style={{ display:"flex", gap:10, marginBottom:10 }}>
                <Check color={C.purple}/>
                <span style={{ fontSize:14, color:C.mutedL }}>{t}</span>
              </div>
            ))}
            <div style={{ display:"flex", gap:12, marginTop:28 }}>
              <button onClick={()=>onGetStarted("register")} className="cta-btn"
                style={{ background:C.purple, color:"#fff", border:"none", borderRadius:9, padding:"14px 24px", cursor:"pointer", fontWeight:800, fontSize:14, fontFamily:font, transition:"all .2s" }}>
                Apply as a Trainer →
              </button>
              <button onClick={()=>onGetStarted("trainer-login")} className="cta-btn"
                style={{ background:"transparent", color:C.mutedL, border:`1px solid ${C.border}`, borderRadius:9, padding:"14px 20px", cursor:"pointer", fontWeight:600, fontSize:14, fontFamily:font, transition:"all .2s" }}>
                Login
              </button>
            </div>
          </div>
          {/* Dashboard preview card */}
          <div style={{ background:C.bg, border:`1px solid ${C.border}`, borderRadius:14, padding:"20px", boxShadow:`0 0 60px ${C.purple}15` }}>
            <div style={{ fontSize:10, color:C.muted, letterSpacing:2, textTransform:"uppercase", marginBottom:14 }}>Trainer Dashboard — Live</div>
            {[
              { name:"Marcus W.", score:84, trend:"+6", status:"active",   plan:"Elite"   },
              { name:"Aisha J.",  score:91, trend:"+9", status:"active",   plan:"Elite"   },
              { name:"Tom B.",    score:88, trend:"+4", status:"active",   plan:"Pro"     },
              { name:"David C.",  score:62, trend:"−2", status:"at-risk",  plan:"Starter" },
            ].map(({name,score,trend,status,plan})=>{
              const col=score>=80?"#00E676":score>=65?"#F5A623":"#FF4757";
              const sCol=status==="active"?"#00E676":status==="at-risk"?"#F5A623":"#FF4757";
              return(
                <div key={name} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 10px", borderBottom:`1px solid ${C.border}` }}>
                  <div style={{ width:36, height:36, borderRadius:"50%", background:`${col}22`, border:`1.5px solid ${col}55`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, color:col }}>
                    {name.split(" ").map(n=>n[0]).join("")}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:C.text }}>{name}</div>
                    <div style={{ fontSize:11, color:C.muted }}>{plan} · {status}</div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontSize:18, fontWeight:900, color:col }}>{score}</div>
                    <div style={{ fontSize:11, fontWeight:600, color:trend.startsWith("+")?"#00E676":"#FF4757" }}>{trend} wk</div>
                  </div>
                </div>
              );
            })}
            <div style={{ marginTop:14, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div style={{ fontSize:11, color:C.muted }}>4 clients · Est. monthly revenue</div>
              <div style={{ fontSize:18, fontWeight:900, color:C.accent }}>₦174,800</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ────────────────────────────────────── */}
      <section style={{ padding:"96px 5%", maxWidth:1100, margin:"0 auto" }}>
        <div style={{ textAlign:"center", marginBottom:48 }}>
          <Pill>What athletes say</Pill>
          <h2 style={{ fontSize:"clamp(24px,3.5vw,40px)", fontWeight:900, letterSpacing:-1.5, marginTop:16 }}>
            Real results. Real numbers.
          </h2>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:16 }}>
          {TESTIMONIALS.map(({name,role,score,text})=>{
            const col=score>=80?"#00E676":score>=65?"#F5A623":"#FF4757";
            return(
              <div key={name} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:14, padding:"24px" }}>
                <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16 }}>
                  <div style={{ width:44, height:44, borderRadius:"50%", background:`${col}22`, border:`2px solid ${col}55`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:15, fontWeight:700, color:col }}>
                    {name.split(" ").map(n=>n[0]).join("")}
                  </div>
                  <div>
                    <div style={{ fontSize:14, fontWeight:700, color:C.text }}>{name}</div>
                    <div style={{ fontSize:11, color:C.muted }}>{role}</div>
                  </div>
                  <div style={{ marginLeft:"auto", fontSize:22, fontWeight:900, color:col }}>{score}</div>
                </div>
                <div style={{ fontSize:14, color:C.mutedL, lineHeight:1.75, fontStyle:"italic" }}>"{text}"</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── FINAL CTA ───────────────────────────────────────── */}
      <section style={{
        background:`radial-gradient(ellipse 80% 60% at 50% 50%, ${C.accent}10 0%, transparent 70%)`,
        borderTop:`1px solid ${C.border}`, padding:"96px 5%", textAlign:"center",
      }}>
        <Pill>Free forever · No card required</Pill>
        <h2 style={{ fontSize:"clamp(28px,5vw,56px)", fontWeight:900, letterSpacing:-2, marginTop:20, marginBottom:16, lineHeight:1.1 }}>
          Your first analysis is waiting.
        </h2>
        <p style={{ fontSize:17, color:C.muted, marginBottom:36, maxWidth:500, margin:"0 auto 36px" }}>
          60 seconds to set up. No equipment. No payment. Your squat form breakdown in under 2 minutes.
        </p>
        <button onClick={()=>onGetStarted("squat")} className="cta-btn"
          style={{ background:C.accent, color:"#000", border:"none", borderRadius:12, padding:"18px 44px", cursor:"pointer", fontSize:17, fontWeight:900, letterSpacing:.5, fontFamily:font, transition:"all .2s", boxShadow:`0 0 40px ${C.accent}40` }}>
          Build My Profile — It's Free →
        </button>
        <div style={{ marginTop:20, fontSize:12, color:C.muted }}>Compatible with any smartphone camera or device</div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────── */}
      <footer style={{ background:C.surface, borderTop:`1px solid ${C.border}`, padding:"40px 5%" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:16, maxWidth:1200, margin:"0 auto" }}>
          <div>
            <img src={`${process.env.PUBLIC_URL}/formIQ.png`} alt="FormIQ" style={{ height:28, width:"auto", marginBottom:8, display:"block" }}/>
            <div style={{ fontSize:12, color:C.muted }}>{SITE} · AI Squat Form Tracking</div>
          </div>
          <div style={{ display:"flex", gap:28, flexWrap:"wrap" }}>
            {["Features","Pricing","For Trainers","Privacy","Terms"].map(l=>(
              <a key={l} href="#" style={{ fontSize:13, color:C.muted, textDecoration:"none" }} className="nav-link">{l}</a>
            ))}
          </div>
          <div style={{ fontSize:12, color:C.muted }}>
            Payments: <span style={{ color:"#00C3FF" }}>Paystack</span> · <span style={{ color:"#635BFF" }}>Stripe</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
