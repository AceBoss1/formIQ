import { useState, useEffect, useRef } from "react";

// ── Palette ────────────────────────────────────────────────────────────────
const C = {
  bg:"#080808", surface:"#111111", s2:"#1A1A1A", s3:"#222222",
  border:"#272727", accent:"#00E676", warn:"#FFB300", danger:"#FF3D3D",
  blue:"#4488FF", text:"#F0F0F0", muted:"#5A5A5A", mutedLight:"#888",
};

const METRICS_DEF = [
  { key:"kneeAlignment",    label:"Knee Alignment",   weight:0.25 },
  { key:"spineNeutrality",  label:"Spine Neutrality", weight:0.25 },
  { key:"squatDepth",       label:"Squat Depth",      weight:0.20 },
  { key:"tempoConsistency", label:"Tempo Control",    weight:0.15 },
  { key:"hipHinge",         label:"Hip Hinge",        weight:0.15 },
];

const TIPS = [
  "Chest up — drive through your heels on the way up",
  "Brace your core hard before every single rep",
  "Knees out — push wide, tracking over your toes",
  "2 seconds down · brief pause · drive up explosively",
  "Break at the hips first, then bend the knees",
  "Mid-foot pressure — keep those heels flat",
  "Neutral spine throughout — no rounding at the hole",
  "Eyes forward — lock onto a fixed point",
  "Bar stays over mid-foot — no forward drift",
  "Fill your belly with air before the descent",
];

// ── Helpers ────────────────────────────────────────────────────────────────
const mc      = (v) => v >= 80 ? C.accent : v >= 60 ? C.warn : C.danger;
const grade   = (s) => s>=90?"S":s>=82?"A+":s>=75?"A":s>=65?"B":s>=55?"C":"D";
const gLabel  = (s) => s>=90?"Elite":s>=82?"Excellent":s>=75?"Strong":s>=65?"Good":s>=55?"Fair":"Needs Work";
const avg     = (arr) => arr.length ? arr.reduce((s,v)=>s+v,0)/arr.length : 0;

const calcAngle = (a, b, c) => {
  const r = Math.atan2(c.y-b.y, c.x-b.x) - Math.atan2(a.y-b.y, a.x-b.x);
  let deg = Math.abs(r * 180 / Math.PI);
  if (deg > 180) deg = 360 - deg;
  return deg;
};

const calcRealMetrics = (repData) => {
  if (!repData || repData.length < 2) return null;
  const avgMinKnee   = avg(repData.map(r=>r.minKneeAngle));
  const avgSpine     = avg(repData.map(r=>r.avgSpineAngle));
  const avgHip       = avg(repData.map(r=>r.avgHipAngle));
  const avgKAlign    = avg(repData.map(r=>r.kneeAlignScore));
  const durs         = repData.map(r=>r.duration);
  const avgDur       = avg(durs);
  const variance     = avg(durs.map(d=>Math.pow(d-avgDur,2)));

  // Depth: parallel = 90°, ATG = 70°, shallow > 110°
  const depthScore =
    avgMinKnee<=75?100:avgMinKnee<=90?95:avgMinKnee<=100?82:
    avgMinKnee<=110?68:avgMinKnee<=125?52:35;

  // Spine: ideal 20–50° forward lean for back squat
  const spineScore =
    avgSpine>=20&&avgSpine<=50 ? Math.min(100, 90+(45-Math.abs(avgSpine-35))*0.4)
    : avgSpine<20 ? Math.max(50, 90-(20-avgSpine)*2.2)
    : Math.max(38, 90-(avgSpine-50)*2.5);

  const tempoScore  = Math.max(28, Math.min(100, 100 - variance*22));
  const hipScore    =
    avgHip>=80&&avgHip<=145 ? Math.min(100,85+(110-Math.abs(avgHip-110))*0.28)
    : Math.max(35, 75-Math.abs(avgHip-110)*1.4);

  return {
    kneeAlignment:    Math.round(Math.min(100,Math.max(20,avgKAlign))),
    spineNeutrality:  Math.round(Math.min(100,Math.max(20,spineScore))),
    squatDepth:       Math.round(depthScore),
    tempoConsistency: Math.round(Math.min(100,Math.max(20,tempoScore))),
    hipHinge:         Math.round(Math.min(100,Math.max(20,hipScore))),
  };
};

const mkSimMetrics = (setNum) => {
  const g = (setNum-1)*3.5;
  const r = (b) => Math.min(100, Math.floor(b+g+(Math.random()-0.28)*17));
  return { kneeAlignment:r(68), spineNeutrality:r(65), squatDepth:r(62), tempoConsistency:r(59), hipHinge:r(71) };
};

const calcScore = (m) =>
  Math.round(METRICS_DEF.reduce((s,{key,weight})=>s+m[key]*weight, 0));

const fallback = (s, set, total) =>
  s>=82
    ? `Clean set — mechanics held up well across all 10 reps. Sharpen your descent tempo to a deliberate 2-count; it'll build more power out of the hole. ${set<total?"Stay locked in for the next set.":"Strong session — consistency is building."}`
    : s>=65
    ? `Form held early but slipped around reps 6–8 as fatigue built. Drive your knees out and keep your chest from diving — that's the pattern breaking down. ${set<total?"Full rest, then come back with more intention.":"Target that correction next session."}`
    : `Form broke down significantly this set — brace harder before every rep and sit back like you're reaching for a box behind you. ${set<total?"Take the full rest and reset before the next set.":"Make this the priority correction next session."}`;

const loadScript = (src) => new Promise((res, rej) => {
  if (document.querySelector(`script[src="${src}"]`)) { res(); return; }
  const s = Object.assign(document.createElement("script"), {
    src, crossOrigin:"anonymous",
    onload:res, onerror:()=>rej(new Error("Failed: "+src))
  });
  document.head.appendChild(s);
});

// Skeleton bone pairs (MediaPipe indices)
const BONES = [
  [11,12],[11,23],[12,24],[23,24],           // torso
  [23,25],[25,27],[24,26],[26,28],            // legs
  [27,29],[28,30],[29,31],[30,32],            // feet
  [11,13],[13,15],[12,14],[14,16],            // arms
];
const KEY_POINTS = [11,12,23,24,25,26,27,28];

// ── Component ──────────────────────────────────────────────────────────────
export default function FormIQ() {
  const [screen,       setScreen]       = useState("setup");
  const [camMode,      setCamMode]      = useState(null);
  const [totalSets,    setTotalSets]    = useState(3);
  const [curSet,       setCurSet]       = useState(1);
  const [reps,         setReps]         = useState(0);
  const [repFlash,     setRepFlash]     = useState(false);
  const [analyzing,    setAnalyzing]    = useState(false);
  const [feedback,     setFeedback]     = useState("");
  const [history,      setHistory]      = useState([]);
  const [metrics,      setMetrics]      = useState(null);
  const [resting,      setResting]      = useState(false);
  const [restT,        setRestT]        = useState(0);
  const [finalScore,   setFinalScore]   = useState(null);
  const [tipI,         setTipI]         = useState(0);
  const [scan,         setScan]         = useState(0);
  const [dots,         setDots]         = useState(0);
  const [camError,     setCamError]     = useState("");
  const [camReady,     setCamReady]     = useState(false);
  const [facingMode,   setFacingMode]   = useState("environment");
  const [poseStatus,   setPoseStatus]   = useState("idle"); // idle|loading|ready|error
  const [formAlerts,   setFormAlerts]   = useState([]);
  const [liveAngles,   setLiveAngles]   = useState(null);  // {knee,hip,spine}
  const [repPhase,     setRepPhase]     = useState("up");  // up|down — for UI indicator

  // Stable refs (readable inside RAF/MediaPipe callbacks)
  const videoRef       = useRef(null);
  const canvasRef      = useRef(null);
  const streamRef      = useRef(null);
  const poseRef        = useRef(null);
  const animFrameRef   = useRef(null);
  const historyRef     = useRef([]);
  const repsRef        = useRef(0);
  const curSetRef      = useRef(1);
  const totalSetsRef   = useRef(3);
  const analyzingRef   = useRef(false);
  const repStateRef    = useRef("up");
  const repDataRef     = useRef([]);
  const currentRepRef  = useRef(null);
  const finishSetRef   = useRef(null);
  const onResultsRef   = useRef(null); // always-fresh pose callback

  const REPS=10, REST=90;
  const DOWN_T=112, UP_T=158; // knee angle thresholds for rep detection

  // Keep refs in sync
  useEffect(()=>{ repsRef.current=reps;       },[reps]);
  useEffect(()=>{ curSetRef.current=curSet;   },[curSet]);
  useEffect(()=>{ totalSetsRef.current=totalSets; },[totalSets]);
  useEffect(()=>{ analyzingRef.current=analyzing; },[analyzing]);

  // ── Pose results (runs every frame via RAF) ──────────────────────────────
  onResultsRef.current = (results) => {
    if (!canvasRef.current || !videoRef.current) return;
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext("2d");
    const W = videoRef.current.videoWidth  || 640;
    const H = videoRef.current.videoHeight || 480;
    canvas.width=W; canvas.height=H;
    ctx.clearRect(0,0,W,H);
    if (!results.poseLandmarks) return;

    const lm = results.poseLandmarks;
    const vis = (i) => (lm[i]?.visibility||0) > 0.32;
    const px  = (i) => ({ x:lm[i].x*W, y:lm[i].y*H });

    // Use side with better hip visibility
    const useLeft = (lm[23]?.visibility||0) >= (lm[24]?.visibility||0);
    const [si,hi,ki,ai] = useLeft ? [11,23,25,27] : [12,24,26,28];
    const pS=px(si), pH=px(hi), pK=px(ki), pA=px(ai);
    const allVis = vis(si)&&vis(hi)&&vis(ki)&&vis(ai);

    const kneeAngle  = allVis ? calcAngle(pH, pK, pA) : null;
    const hipAngle   = vis(si)&&vis(hi)&&vis(ki) ? calcAngle(pS, pH, pK) : null;
    const spineAngle = vis(si)&&vis(hi)
      ? Math.abs(Math.atan2(pH.x-pS.x, pH.y-pS.y)*180/Math.PI) : null;
    // Knee forward of ankle (normalised)
    const kneeForward = allVis ? (pK.x-pA.x)/(W*0.09) : 0;
    const kneeAlignScore = Math.max(20, Math.min(100, 100-Math.max(0,kneeForward-0.5)*18));

    // ── Draw skeleton ──────────────────────────────────────────────────────
    const boneColor =
      kneeAngle===null ? C.blue :
      kneeAngle<95  ? C.accent :
      kneeAngle<132 ? C.warn   : C.blue;

    ctx.lineCap="round"; ctx.lineJoin="round";
    BONES.forEach(([a,b]) => {
      if (!lm[a]||!lm[b]||(lm[a].visibility||0)<0.28||(lm[b].visibility||0)<0.28) return;
      ctx.strokeStyle=boneColor+"CC"; ctx.lineWidth=2.5;
      ctx.beginPath();
      ctx.moveTo(lm[a].x*W, lm[a].y*H);
      ctx.lineTo(lm[b].x*W, lm[b].y*H);
      ctx.stroke();
    });
    KEY_POINTS.forEach(i => {
      if (!vis(i)) return;
      ctx.beginPath();
      ctx.arc(lm[i].x*W, lm[i].y*H, i>=23?6:4, 0, Math.PI*2);
      ctx.fillStyle = boneColor;
      ctx.fill();
      ctx.strokeStyle="#00000080"; ctx.lineWidth=1.2;
      ctx.stroke();
    });

    // ── Rep detection state machine ────────────────────────────────────────
    if (kneeAngle!==null && !analyzingRef.current && repsRef.current<REPS) {
      if (!currentRepRef.current) {
        currentRepRef.current = {
          startTime: Date.now(), minKneeAngle: kneeAngle,
          kneeAngles:[], spineAngles:[], hipAngles:[], kneeAlignScores:[],
        };
      }
      const cr = currentRepRef.current;
      cr.minKneeAngle = Math.min(cr.minKneeAngle, kneeAngle);
      cr.kneeAngles.push(kneeAngle);
      if (spineAngle!==null) cr.spineAngles.push(spineAngle);
      if (hipAngle!==null)   cr.hipAngles.push(hipAngle);
      cr.kneeAlignScores.push(kneeAlignScore);

      // Going DOWN into squat
      if (repStateRef.current==="up" && kneeAngle<DOWN_T) {
        repStateRef.current="down";
        setRepPhase("down");
      }
      // Coming UP — rep complete
      if (repStateRef.current==="down" && kneeAngle>UP_T) {
        repStateRef.current="up";
        setRepPhase("up");
        repDataRef.current.push({
          minKneeAngle:    cr.minKneeAngle,
          avgSpineAngle:   avg(cr.spineAngles),
          avgHipAngle:     avg(cr.hipAngles),
          kneeAlignScore:  avg(cr.kneeAlignScores),
          duration:        (Date.now()-cr.startTime)/1000,
        });
        currentRepRef.current = null;
        const nr = repsRef.current+1;
        repsRef.current=nr;
        setReps(nr);
        setRepFlash(true);
        setTimeout(()=>setRepFlash(false),200);
        if (nr>=REPS && finishSetRef.current) {
          setTimeout(()=>finishSetRef.current(),850);
        }
      }
    }

    // ── Live angles state update (throttle to every 3rd frame roughly) ────
    if (kneeAngle!==null) {
      setLiveAngles({
        knee:  Math.round(kneeAngle),
        hip:   hipAngle   ? Math.round(hipAngle)   : "--",
        spine: spineAngle ? Math.round(spineAngle) : "--",
      });
    }

    // ── Real-time form alerts ─────────────────────────────────────────────
    const alerts=[];
    if (kneeAngle!==null && kneeAngle<162) {
      if (spineAngle!==null && spineAngle>60) alerts.push({text:"CHEST UP ↑",  color:C.danger});
      if (kneeForward>1.9)                    alerts.push({text:"KNEES OUT →", color:C.warn});
      if (repStateRef.current==="down" && kneeAngle>108)
                                              alerts.push({text:"SQUAT DEEPER ↓", color:C.warn});
    }
    setFormAlerts(alerts);
  };

  // ── Load MediaPipe Pose ─────────────────────────────────────────────────
  const loadPose = async () => {
    if (poseRef.current || poseStatus==="loading" || poseStatus==="ready") return;
    setPoseStatus("loading");
    try {
      await loadScript("https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404/pose.js");
      const pose = new window.Pose({
        locateFile:(file)=>`https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404/${file}`,
      });
      pose.setOptions({
        modelComplexity:1, smoothLandmarks:true,
        enableSegmentation:false, minDetectionConfidence:0.5, minTrackingConfidence:0.5,
      });
      // Use ref so callback is always fresh
      pose.onResults((r)=>onResultsRef.current(r));
      await pose.initialize();
      poseRef.current=pose;
      setPoseStatus("ready");
    } catch(err) {
      console.error("MediaPipe error:",err);
      setPoseStatus("error");
    }
  };

  // ── Camera ──────────────────────────────────────────────────────────────
  const startCamera = async (facing) => {
    setCamError(""); setCamReady(false);
    try {
      if (streamRef.current) streamRef.current.getTracks().forEach(t=>t.stop());
      const stream = await navigator.mediaDevices.getUserMedia({
        video:{ facingMode:facing, width:{ideal:1280}, height:{ideal:720} }, audio:false,
      });
      streamRef.current=stream;
      if (videoRef.current) {
        videoRef.current.srcObject=stream;
        videoRef.current.onloadedmetadata=()=>{ videoRef.current.play(); setCamReady(true); };
      }
    } catch(err) {
      setCamError(
        err.name==="NotAllowedError" ? "Camera permission denied. Allow camera access in browser settings."
        :err.name==="NotFoundError"  ? "No camera found on this device."
        : "Could not start camera: "+err.message
      );
    }
  };

  const stopCamera = () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (streamRef.current) { streamRef.current.getTracks().forEach(t=>t.stop()); streamRef.current=null; }
    setCamReady(false);
  };

  const flipCamera = () => {
    const next = facingMode==="environment"?"user":"environment";
    setFacingMode(next);
    startCamera(next);
  };

  // ── RAF pose processing loop ─────────────────────────────────────────────
  useEffect(()=>{
    if (!camReady || !poseRef.current || camMode!=="single") return;
    let running=true;
    const loop = async () => {
      if (!running) return;
      if (videoRef.current?.readyState>=2) {
        try { await poseRef.current.send({image:videoRef.current}); } catch{}
      }
      if (running) animFrameRef.current=requestAnimationFrame(loop);
    };
    animFrameRef.current=requestAnimationFrame(loop);
    return ()=>{ running=false; cancelAnimationFrame(animFrameRef.current); };
  },[camReady, camMode]); // eslint-disable-line

  // Restart pose loop when pose becomes ready (might load after camera)
  useEffect(()=>{
    if (poseStatus==="ready" && camReady && camMode==="single") {
      cancelAnimationFrame(animFrameRef.current);
      let running=true;
      const loop=async()=>{
        if (!running) return;
        if (videoRef.current?.readyState>=2) {
          try { await poseRef.current.send({image:videoRef.current}); } catch{}
        }
        if (running) animFrameRef.current=requestAnimationFrame(loop);
      };
      animFrameRef.current=requestAnimationFrame(loop);
      return()=>{ running=false; cancelAnimationFrame(animFrameRef.current); };
    }
  },[poseStatus, camReady, camMode]); // eslint-disable-line

  // Enter/exit workout
  useEffect(()=>{
    if (screen==="workout" && camMode==="single") { startCamera(facingMode); loadPose(); }
    if (screen!=="workout") stopCamera();
  },[screen, camMode]); // eslint-disable-line

  // Tip rotation
  useEffect(()=>{
    if (screen!=="workout") return;
    const t=setInterval(()=>setTipI(i=>(i+1)%TIPS.length),4500);
    return()=>clearInterval(t);
  },[screen]);

  // Scan line
  useEffect(()=>{
    const t=setInterval(()=>setScan(s=>(s+1.2)%100),35);
    return()=>clearInterval(t);
  },[]);

  // Dots
  useEffect(()=>{
    if (!analyzing) return;
    const t=setInterval(()=>setDots(d=>(d+1)%4),450);
    return()=>clearInterval(t);
  },[analyzing]);

  // Rest timer
  useEffect(()=>{
    if (!resting) return;
    const t=setInterval(()=>setRestT(r=>{
      if(r>=REST-1){setResting(false);setRestT(0);return 0;}
      return r+1;
    }),1000);
    return()=>clearInterval(t);
  },[resting]);

  // ── Finish set ──────────────────────────────────────────────────────────
  const finishSet = async () => {
    if (analyzingRef.current) return;
    const realM = (camMode==="single" && poseStatus==="ready" && repDataRef.current.length>=2)
      ? calcRealMetrics(repDataRef.current) : null;
    const m = realM || mkSimMetrics(curSetRef.current);
    const score = calcScore(m);
    setMetrics(m);
    const entry={setNumber:curSetRef.current, score, metrics:m, usedPose:!!realM};
    historyRef.current=[...historyRef.current, entry];
    setHistory(historyRef.current);
    setAnalyzing(true);
    setScreen("analysis");
    if (curSetRef.current<totalSetsRef.current) setResting(true);
    // Reset per-set accumulators
    repDataRef.current=[]; repStateRef.current="up"; currentRepRef.current=null;
    setRepPhase("up"); setFormAlerts([]); setLiveAngles(null);

    try {
      const res=await fetch("https://api.anthropic.com/v1/messages",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          model:"claude-sonnet-4-20250514",
          max_tokens:800,
          messages:[{role:"user",content:
            `You are an elite strength coach. Athlete just finished Set ${curSetRef.current} of ${totalSetsRef.current} (10 squats). ${realM?"Data from live MediaPipe pose tracking:":"Simulated form data:"}
Knee Alignment: ${m.kneeAlignment}/100
Spine Neutrality: ${m.spineNeutrality}/100
Squat Depth: ${m.squatDepth}/100
Tempo Control: ${m.tempoConsistency}/100
Hip Hinge: ${m.hipHinge}/100
Set Score: ${score}/100
Respond in exactly 3 sentences. Direct, no-fluff coaching voice. No lists or headers.`
          }]
        })
      });
      const d=await res.json();
      const text=d.content?.map(b=>b.text||"").join("").trim();
      setFeedback(text||fallback(score,curSetRef.current,totalSetsRef.current));
    } catch{
      setFeedback(fallback(score,curSetRef.current,totalSetsRef.current));
    }
    setAnalyzing(false);
  };
  finishSetRef.current=finishSet;

  const nextSet=()=>{
    if (curSet>=totalSets) {
      const h=historyRef.current;
      setFinalScore(h.length?Math.round(h.reduce((s,e)=>s+e.score,0)/h.length):0);
      setScreen("results");
    } else {
      const n=curSet+1;
      setCurSet(n); curSetRef.current=n;
      setReps(0); repsRef.current=0;
      setFeedback(""); setMetrics(null);
      setScreen("workout");
    }
  };

  // Manual tap (sim mode / pose unavailable)
  const tapRep=()=>{
    const poseActive = camMode==="single" && poseStatus==="ready";
    if (reps>=REPS||analyzing||poseActive) return;
    const n=reps+1; repsRef.current=n; setReps(n);
    setRepFlash(true); setTimeout(()=>setRepFlash(false),200);
    if (n>=REPS) setTimeout(()=>finishSetRef.current?.(),850);
  };

  const restart=()=>{
    stopCamera();
    setScreen("setup"); setCamMode(null); setCurSet(1); curSetRef.current=1;
    setReps(0); repsRef.current=0; setHistory([]); historyRef.current=[];
    setMetrics(null); setFeedback(""); setFinalScore(null);
    setAnalyzing(false); analyzingRef.current=false;
    setResting(false); setRestT(0); setTotalSets(3); totalSetsRef.current=3;
    setCamError(""); setCamReady(false);
    setPoseStatus("idle"); poseRef.current=null;
    setFormAlerts([]); setLiveAngles(null);
    repDataRef.current=[]; repStateRef.current="up"; currentRepRef.current=null;
  };

  // ── Style helpers ───────────────────────────────────────────────────────
  const font=`system-ui, -apple-system, 'Segoe UI', sans-serif`;
  const page={background:C.bg, color:C.text, minHeight:"100vh", fontFamily:font};
  const card=(ac)=>({
    background:C.surface, borderRadius:10, padding:"16px 18px",
    border:`1px solid ${ac?C.accent+"40":C.border}`,
  });
  const pil=(a)=>({
    width:36,height:36,borderRadius:8,cursor:"pointer",
    background:a?C.accent:C.s2, color:a?"#000":C.text,
    display:"flex",alignItems:"center",justifyContent:"center",
    fontWeight:800, fontSize:14,
  });
  const lbl={fontSize:10,letterSpacing:3,color:C.muted,textTransform:"uppercase",fontWeight:600};

  // ════════════════════════════════════════════════════════════
  // SETUP
  // ════════════════════════════════════════════════════════════
  if (screen==="setup") return (
    <div style={{...page,padding:"28px 20px 32px"}}>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        .fu{animation:fadeUp .4s ease forwards}
        .fu1{animation-delay:.05s;opacity:0}.fu2{animation-delay:.12s;opacity:0}
        .fu3{animation-delay:.19s;opacity:0}.fu4{animation-delay:.26s;opacity:0}
        .fu5{animation-delay:.33s;opacity:0}
        .cc:hover{border-color:${C.accent}88!important}
        .rb:active{transform:scale(.97)}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.35}}
        .pu{animation:pulse 1.8s ease-in-out infinite}
      `}</style>
      <div style={{maxWidth:560,margin:"0 auto"}}>

        {/* Hero */}
        <div className="fu fu1" style={{textAlign:"center",marginBottom:36}}>
          <img src={`${process.env.PUBLIC_URL}/formIQ.png`} alt="FormIQ"
            style={{height:110,width:"auto",objectFit:"contain",display:"block",margin:"0 auto 14px"}}/>
          <div style={{display:"inline-block",fontSize:10,letterSpacing:3,color:C.accent,
            textTransform:"uppercase",fontWeight:600,background:C.accent+"15",
            padding:"4px 14px",borderRadius:20,border:`1px solid ${C.accent}30`}}>
            AI Squat Coach · Phase 2
          </div>
          <div style={{color:C.mutedLight,marginTop:12,fontSize:14}}>
            Live pose tracking · AI coaching · Real-time form scoring
          </div>
        </div>

        {/* Camera cards */}
        <div className="fu fu2" style={{marginBottom:18}}>
          <div style={{...lbl,marginBottom:10}}>Camera Setup</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            {[
              {id:"single",  title:"Single Camera",   badge:"LIVE NOW",   locked:false,
               lines:["Uses your device camera","Side-on view recommended","Webcam or phone"],
               note:"✓ Real pose tracking active"},
              {id:"quad-4k", title:"Quad 4K System",  badge:"PHASE 2 →",  locked:true,
               lines:["4× cameras via HDMI","Front·Back·Left·Right","Capture card required"],
               note:"🔒 Multi-cam — activating soon"},
            ].map(({id,title,badge,locked,lines,note})=>(
              <div key={id} className="cc" onClick={()=>setCamMode(id)} style={{
                ...card(false), cursor:"pointer",
                border:`1px solid ${camMode===id?C.accent:C.border}`,
                background:camMode===id?"#071510":C.surface,
                position:"relative", opacity:locked&&camMode!==id?.78:1,
                transition:"border-color .2s,background .2s",
              }}>
                <div style={{position:"absolute",top:12,right:12,fontSize:9,fontWeight:700,
                  letterSpacing:1.5,padding:"3px 8px",borderRadius:4,
                  background:locked?C.s3:(camMode===id?C.accent:C.s2),
                  color:locked?C.warn:(camMode===id?"#000":C.muted),
                  border:locked?`1px solid ${C.warn}40`:"none"}}>
                  {badge}
                </div>
                <div style={{fontWeight:700,fontSize:14,marginBottom:8}}>{title}</div>
                {lines.map((l,i)=><div key={i} style={{fontSize:12,color:C.mutedLight,lineHeight:1.7}}>{l}</div>)}
                <div style={{marginTop:10,fontSize:11,fontWeight:600,color:locked?C.warn:C.accent}}>{note}</div>
              </div>
            ))}
          </div>

          {camMode==="quad-4k"&&(
            <div style={{marginTop:10,padding:"12px 14px",borderRadius:8,
              background:C.warn+"12",border:`1px solid ${C.warn}30`,
              display:"flex",gap:10,alignItems:"flex-start"}}>
              <div style={{fontSize:16,flexShrink:0}}>⚠️</div>
              <div>
                <div style={{fontSize:12,fontWeight:700,color:C.warn,marginBottom:4}}>
                  Quad 4K — Multi-Cam Phase
                </div>
                <div style={{fontSize:12,color:C.mutedLight,lineHeight:1.6}}>
                  HDMI capture card inputs activate in the upcoming multi-cam phase.
                  You can preview the full scoring interface with a simulated session now.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sets */}
        <div className="fu fu3" style={{...card(false),marginBottom:18}}>
          <div style={{...lbl,marginBottom:14}}>Session Config</div>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div>
              <div style={{fontWeight:600,fontSize:15}}>Number of Sets</div>
              <div style={{fontSize:12,color:C.muted,marginTop:3}}>10 reps per set · 90s rest</div>
            </div>
            <div style={{display:"flex",gap:8}}>
              {[2,3,4,5].map(n=>(
                <div key={n} style={pil(totalSets===n)} onClick={()=>setTotalSets(n)}>{n}</div>
              ))}
            </div>
          </div>
        </div>

        {/* Phase note */}
        <div className="fu fu4" style={{...card(false),marginBottom:20,background:C.s2}}>
          <div style={{display:"flex",gap:10}}>
            <div style={{fontSize:18,flexShrink:0}}>🤖</div>
            <div>
              <div style={{fontSize:13,fontWeight:600,marginBottom:4}}>Phase 2 — Live Pose Tracking</div>
              <div style={{fontSize:12,color:C.mutedLight,lineHeight:1.6}}>
                MediaPipe Pose tracks 33 body keypoints in real time from your camera.
                Knee angle, hip hinge, spine neutrality, and squat depth are all calculated live.
                Reps are counted automatically — no tapping needed.
              </div>
            </div>
          </div>
        </div>

        {/* Start */}
        <div className="fu fu5">
          <button onClick={()=>camMode&&setScreen("workout")} style={{
            width:"100%",padding:"18px",fontSize:15,fontWeight:800,
            background:camMode?C.accent:C.s3, color:camMode?"#000":C.muted,
            border:"none",borderRadius:10,cursor:camMode?"pointer":"default",
            letterSpacing:2.5,textTransform:"uppercase",transition:"all .25s",
          }}>
            {!camMode?"Select a camera mode to start"
             :camMode==="single"?"Open Camera & Begin →"
             :"Preview Simulation →"}
          </button>
        </div>

        <div style={{display:"flex",gap:6,marginTop:16,flexWrap:"wrap",justifyContent:"center"}}>
          {["Live pose tracking","Auto rep count","AI coaching","Form alerts","HDMI ready"].map(f=>(
            <span key={f} style={{fontSize:11,color:C.muted,background:C.s2,padding:"3px 10px",borderRadius:20}}>{f}</span>
          ))}
        </div>
      </div>
    </div>
  );

  // ════════════════════════════════════════════════════════════
  // WORKOUT
  // ════════════════════════════════════════════════════════════
  if (screen==="workout") {
    const pct=(reps/REPS)*100;
    const poseActive=camMode==="single"&&poseStatus==="ready";
    const poseLoading=poseStatus==="loading";

    // Pose status badge
    const poseBadge=()=>{
      if (camMode!=="single") return null;
      const cfg={
        idle:    {label:"INITIALISING",      color:C.muted,   bg:C.s2},
        loading: {label:"LOADING POSE AI...", color:C.warn,   bg:C.warn+"18"},
        ready:   {label:"POSE TRACKING LIVE", color:C.accent, bg:C.accent+"18"},
        error:   {label:"POSE UNAVAILABLE",   color:C.danger, bg:C.danger+"18"},
      }[poseStatus]||{};
      return (
        <div style={{display:"flex",alignItems:"center",gap:6,
          background:cfg.bg,padding:"5px 12px",borderRadius:6,border:`1px solid ${cfg.color}30`}}>
          {poseStatus==="ready" && <div style={{width:6,height:6,borderRadius:"50%",background:C.accent}} className="pu"/>}
          {poseStatus==="loading"&&<div style={{fontSize:11}} className="pu">⟳</div>}
          <span style={{fontSize:9,color:cfg.color,letterSpacing:2,fontWeight:700}}>{cfg.label}</span>
        </div>
      );
    };

    // ── Simulated quad feeds ─────────────────────────────────
    const SimFeed=({label:lb, angle})=>(
      <div style={{background:"#030303",position:"relative",overflow:"hidden",
        aspectRatio:"4/3",display:"flex",alignItems:"center",justifyContent:"center"}}>
        <svg style={{position:"absolute",inset:0,width:"100%",height:"100%",opacity:.07}} preserveAspectRatio="none">
          {[1,2,3,4,5].map(i=><line key={`v${i}`} x1={`${i*16.66}%`} y1="0" x2={`${i*16.66}%`} y2="100%" stroke={C.accent} strokeWidth=".5"/>)}
          {[1,2,3].map(i=><line key={`h${i}`} x1="0" y1={`${i*25}%`} x2="100%" y2={`${i*25}%`} stroke={C.accent} strokeWidth=".5"/>)}
        </svg>
        <div style={{position:"absolute",left:0,right:0,height:1,top:`${scan}%`,
          background:`linear-gradient(90deg,transparent,${C.accent}60,transparent)`}}/>
        <svg viewBox="0 0 80 90" width="26%" style={{opacity:.22}}>
          <circle cx="40" cy="9" r="7" fill={C.accent}/>
          <line x1="40" y1="16" x2="36" y2="46" stroke={C.accent} strokeWidth="3" strokeLinecap="round"/>
          <line x1="38" y1="24" x2="20" y2="30" stroke={C.accent} strokeWidth="2.5" strokeLinecap="round"/>
          <line x1="38" y1="24" x2="56" y2="30" stroke={C.accent} strokeWidth="2.5" strokeLinecap="round"/>
          <line x1="36" y1="46" x2="20" y2="62" stroke={C.accent} strokeWidth="3" strokeLinecap="round"/>
          <line x1="36" y1="46" x2="52" y2="62" stroke={C.accent} strokeWidth="3" strokeLinecap="round"/>
          <line x1="20" y1="62" x2="14" y2="82" stroke={C.accent} strokeWidth="3" strokeLinecap="round"/>
          <line x1="52" y1="62" x2="58" y2="82" stroke={C.accent} strokeWidth="3" strokeLinecap="round"/>
          <line x1="4"  y1="25" x2="72" y2="25" stroke={C.accent} strokeWidth="4" strokeLinecap="round"/>
          <circle cx="4"  cy="25" r="5" fill="none" stroke={C.accent} strokeWidth="2"/>
          <circle cx="72" cy="25" r="5" fill="none" stroke={C.accent} strokeWidth="2"/>
        </svg>
        {[
          {top:7,left:7,   bt:true,bl:true},  {top:7,right:7,  bt:true,br:true},
          {bottom:7,left:7,bb:true,bl:true},   {bottom:7,right:7,bb:true,br:true},
        ].map(({top,left,right,bottom,bt,br,bb,bl},i)=>(
          <div key={i} style={{position:"absolute",top,left,right,bottom,width:13,height:13,
            borderTop:bt?`2px solid ${C.accent}`:"none",
            borderRight:br?`2px solid ${C.accent}`:"none",
            borderBottom:bb?`2px solid ${C.accent}`:"none",
            borderLeft:bl?`2px solid ${C.accent}`:"none"}}/>
        ))}
        <div style={{position:"absolute",bottom:7,left:9,fontSize:9,color:C.accent,letterSpacing:2,fontWeight:700}}>{lb}</div>
        <div style={{position:"absolute",top:8,right:9,display:"flex",alignItems:"center",gap:4}}>
          <div style={{width:5,height:5,borderRadius:"50%",background:"#FF3B3B"}} className="pu"/>
          <span style={{fontSize:9,color:C.muted,letterSpacing:1}}>SIM</span>
        </div>
        {angle&&<div style={{position:"absolute",top:8,left:9,fontSize:9,color:C.muted,letterSpacing:1}}>{angle}</div>}
      </div>
    );

    return (
      <div style={{...page}}>

        {/* ── SINGLE — real camera + pose canvas ── */}
        {camMode==="single"&&(
          <div style={{position:"relative",background:"#000",width:"100%"}}>
            <video ref={videoRef} autoPlay playsInline muted
              style={{width:"100%",maxHeight:340,objectFit:"cover",display:"block"}}/>
            {/* Canvas for skeleton overlay */}
            <canvas ref={canvasRef}
              style={{position:"absolute",top:0,left:0,width:"100%",height:"100%",
                pointerEvents:"none",objectFit:"cover"}}/>
            {/* Scan line (shows until pose takes over) */}
            {poseStatus!=="ready"&&(
              <div style={{position:"absolute",left:0,right:0,height:1,top:`${scan}%`,
                background:`linear-gradient(90deg,transparent,${C.accent}60,transparent)`,
                pointerEvents:"none"}}/>
            )}
            {/* Corner brackets */}
            {[
              {top:10,left:10,   bt:true,bl:true},  {top:10,right:10,  bt:true,br:true},
              {bottom:10,left:10,bb:true,bl:true},   {bottom:10,right:10,bb:true,br:true},
            ].map(({top,left,right,bottom,bt,br,bb,bl},i)=>(
              <div key={i} style={{position:"absolute",top,left,right,bottom,width:18,height:18,pointerEvents:"none",
                borderTop:bt?`2px solid ${C.accent}`:"none",borderRight:br?`2px solid ${C.accent}`:"none",
                borderBottom:bb?`2px solid ${C.accent}`:"none",borderLeft:bl?`2px solid ${C.accent}`:"none"}}/>
            ))}
            {/* Top bar */}
            <div style={{position:"absolute",top:10,left:10,right:10,
              display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              {/* LIVE + pose badge */}
              <div style={{display:"flex",gap:6,alignItems:"center"}}>
                <div style={{display:"flex",alignItems:"center",gap:5,
                  background:"#000000AA",padding:"4px 9px",borderRadius:6}}>
                  <div style={{width:6,height:6,borderRadius:"50%",background:"#FF3B3B"}} className="pu"/>
                  <span style={{fontSize:10,color:C.text,letterSpacing:1.5,fontWeight:700}}>LIVE</span>
                </div>
                {poseBadge()}
              </div>
              {/* Flip */}
              <button onClick={flipCamera} title="Flip camera"
                style={{background:"#000000AA",border:`1px solid ${C.border}`,
                  borderRadius:8,padding:"6px 10px",cursor:"pointer",fontSize:16,color:C.text}}>
                🔄
              </button>
            </div>

            {/* Live angle readout (when pose ready) */}
            {poseActive&&liveAngles&&(
              <div style={{position:"absolute",bottom:10,left:10,
                background:"#000000BB",border:`1px solid ${C.accent}30`,
                borderRadius:8,padding:"6px 12px",display:"flex",gap:12}}>
                {[
                  {l:"KNEE",  v:liveAngles.knee,  good:liveAngles.knee<100},
                  {l:"HIP",   v:liveAngles.hip,   good:true},
                  {l:"SPINE", v:liveAngles.spine, good:liveAngles.spine<55},
                ].map(({l,v,good})=>(
                  <div key={l} style={{textAlign:"center"}}>
                    <div style={{fontSize:9,color:C.muted,letterSpacing:1.5}}>{l}</div>
                    <div style={{fontSize:15,fontWeight:800,
                      color:typeof v==="number"?(good?C.accent:C.warn):C.muted}}>
                      {v}°
                    </div>
                  </div>
                ))}
                {/* Rep phase indicator */}
                <div style={{borderLeft:`1px solid ${C.border}`,paddingLeft:10,textAlign:"center"}}>
                  <div style={{fontSize:9,color:C.muted,letterSpacing:1.5}}>PHASE</div>
                  <div style={{fontSize:12,fontWeight:800,
                    color:repPhase==="down"?C.warn:C.accent}}>
                    {repPhase==="down"?"↓ DOWN":"↑ UP"}
                  </div>
                </div>
              </div>
            )}

            {/* Form alerts */}
            {poseActive&&formAlerts.length>0&&(
              <div style={{position:"absolute",top:"50%",left:"50%",
                transform:"translate(-50%,-50%)",
                display:"flex",flexDirection:"column",gap:6,alignItems:"center",pointerEvents:"none"}}>
                {formAlerts.map((a,i)=>(
                  <div key={i} style={{background:"#000000DD",
                    border:`1.5px solid ${a.color}`,borderRadius:8,
                    padding:"6px 14px",fontSize:12,fontWeight:800,
                    color:a.color,letterSpacing:2}}>
                    {a.text}
                  </div>
                ))}
              </div>
            )}

            {/* Camera loading */}
            {!camReady&&!camError&&(
              <div style={{position:"absolute",inset:0,display:"flex",
                alignItems:"center",justifyContent:"center",background:"#000000CC"}}>
                <div style={{textAlign:"center"}}>
                  <div style={{fontSize:28,marginBottom:8}}>📷</div>
                  <div className="pu" style={{fontSize:12,color:C.accent,letterSpacing:2}}>OPENING CAMERA...</div>
                </div>
              </div>
            )}
            {/* Camera error */}
            {camError&&(
              <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",
                alignItems:"center",justifyContent:"center",background:"#000000EE",padding:20}}>
                <div style={{fontSize:32,marginBottom:12}}>📷</div>
                <div style={{fontSize:13,color:C.danger,textAlign:"center",lineHeight:1.6,marginBottom:16}}>{camError}</div>
                <button onClick={()=>startCamera(facingMode)} style={{
                  padding:"10px 22px",background:C.accent,color:"#000",
                  border:"none",borderRadius:8,fontWeight:700,cursor:"pointer"}}>
                  Retry Camera
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── QUAD — simulated ── */}
        {camMode==="quad-4k"&&(
          <div>
            <div style={{background:C.warn+"18",borderBottom:`1px solid ${C.warn}30`,
              padding:"8px 16px",display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:13}}>🔒</span>
              <span style={{fontSize:11,color:C.warn,fontWeight:600,letterSpacing:.5}}>
                Quad 4K HDMI camera feeds activate in the multi-cam phase — showing simulation
              </span>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:1.5,background:"#000"}}>
              {[{label:"FRONT",angle:"CAM-1·4K"},{label:"BACK",angle:"CAM-2·4K"},
                {label:"LEFT SIDE",angle:"CAM-3·4K"},{label:"RIGHT SIDE",angle:"CAM-4·4K"}]
                .map(({label:lb,angle})=><SimFeed key={lb} label={lb} angle={angle}/>)}
            </div>
          </div>
        )}

        {/* ── Controls ── */}
        <div style={{padding:"18px 20px 24px",background:C.bg}}>
          {/* Set header + rep counter */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:14}}>
            <div>
              <div style={{...lbl,marginBottom:8}}>Set {curSet} of {totalSets}</div>
              <div style={{display:"flex",gap:5}}>
                {[...Array(totalSets)].map((_,i)=>(
                  <div key={i} style={{width:26,height:4,borderRadius:2,
                    background:i<curSet-1?C.accent:i===curSet-1?C.accent+"55":C.s2}}/>
                ))}
              </div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{...lbl,marginBottom:3}}>Reps</div>
              <div style={{fontSize:50,fontWeight:900,lineHeight:1,letterSpacing:-3,
                color:repFlash?C.accent:C.text,transition:"color .12s"}}>
                {reps}<span style={{fontSize:22,color:C.muted,fontWeight:400}}>/{REPS}</span>
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div style={{height:3,background:C.s2,borderRadius:2,marginBottom:14,overflow:"hidden"}}>
            <div style={{height:"100%",width:`${pct}%`,background:C.accent,borderRadius:2,transition:"width .28s ease"}}/>
          </div>
          {/* Rep dots */}
          <div style={{display:"flex",gap:5,marginBottom:14}}>
            {[...Array(REPS)].map((_,i)=>(
              <div key={i} style={{flex:1,height:6,borderRadius:2,
                background:i<reps?C.accent:C.s2,transition:"background .15s"}}/>
            ))}
          </div>

          {/* Coaching tip */}
          <div style={{...card(false),marginBottom:14,padding:"11px 14px",
            display:"flex",gap:10,alignItems:"flex-start"}}>
            <div style={{color:C.accent,fontSize:13,flexShrink:0,marginTop:1}}>▸</div>
            <div style={{fontSize:13,color:"#C8C8C8",lineHeight:1.5}}>{TIPS[tipI]}</div>
          </div>

          {/* Main action button */}
          {poseActive ? (
            /* Pose active — auto counting, show status */
            <div style={{...card(true),textAlign:"center",padding:"18px"}}>
              <div style={{fontSize:11,color:C.accent,letterSpacing:2.5,fontWeight:700,marginBottom:8}}>
                ⚡ AUTO REP COUNTING ACTIVE
              </div>
              <div style={{fontSize:13,color:C.mutedLight,lineHeight:1.6}}>
                {reps===0
                  ? "Step into frame and begin squatting — reps count automatically"
                  : repPhase==="down"
                  ? "↓  Descending — drive through your heels to stand"
                  : "↑  Standing — brace and descend for the next rep"}
              </div>
            </div>
          ) : (
            /* No pose — manual tap */
            <button className="rb" onClick={tapRep} disabled={reps>=REPS}
              style={{width:"100%",padding:"20px",fontSize:16,fontWeight:800,
                background:reps>=REPS?C.s2:C.accent,
                color:reps>=REPS?C.muted:"#000",
                border:"none",borderRadius:10,cursor:reps>=REPS?"default":"pointer",
                letterSpacing:2,textTransform:"uppercase",transition:"all .2s"}}>
              {reps>=REPS
                ? "Set complete — calculating score..."
                : poseLoading
                ? `TAP EACH REP  ·  ${REPS-reps} REMAINING  (pose loading…)`
                : `TAP EACH REP  ·  ${REPS-reps} REMAINING`}
            </button>
          )}

          <div style={{textAlign:"center",marginTop:10,fontSize:11,color:C.muted}}>
            {poseActive
              ? "Position yourself side-on to camera for best tracking accuracy"
              : camMode==="single"
              ? "Pose engine loading — tap to count manually in the meantime"
              : "Quad 4K auto-detection activates in multi-cam phase"}
          </div>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════
  // ANALYSIS
  // ════════════════════════════════════════════════════════════
  if (screen==="analysis") {
    const score = metrics ? calcScore(metrics) : 0;
    const restRemaining = REST - restT;
    const restPct = (restRemaining/REST)*100;
    const usedPose = historyRef.current[historyRef.current.length-1]?.usedPose;

    return (
      <div style={{...page,padding:"24px 20px 32px"}}>
        <div style={{maxWidth:560,margin:"0 auto"}}>

          {/* Score hero */}
          <div style={{textAlign:"center",marginBottom:26,paddingTop:6}}>
            <div style={{...lbl,marginBottom:12}}>
              Set {historyRef.current.length} · {REPS} reps · {usedPose?"Live Pose":"Simulated"}
            </div>
            <div style={{fontSize:88,fontWeight:900,letterSpacing:-5,lineHeight:1,
              color:analyzing?C.muted:mc(score),transition:"color .5s"}}>
              {analyzing?"—":score}
            </div>
            <div style={{fontSize:16,color:analyzing?C.muted:mc(score),fontWeight:700,marginTop:4}}>
              {analyzing?`Analyzing form${".".repeat(dots)}`:`${grade(score)}  ·  ${gLabel(score)}`}
            </div>
            {usedPose&&!analyzing&&(
              <div style={{marginTop:8,display:"inline-flex",alignItems:"center",gap:5,
                background:C.accent+"15",border:`1px solid ${C.accent}30`,
                borderRadius:20,padding:"3px 12px"}}>
                <div style={{width:5,height:5,borderRadius:"50%",background:C.accent}}/>
                <span style={{fontSize:10,color:C.accent,letterSpacing:2,fontWeight:700}}>LIVE POSE DATA</span>
              </div>
            )}
          </div>

          {/* Metric bars */}
          {metrics&&(
            <div style={{...card(false),marginBottom:14}}>
              <div style={{...lbl,marginBottom:16}}>
                Form Analysis {usedPose?"· Real Keypoints":"· Simulation"}
              </div>
              {METRICS_DEF.map(({key,label:lb,weight})=>{
                const v=metrics[key];
                return (
                  <div key={key} style={{marginBottom:13}}>
                    <div style={{display:"flex",justifyContent:"space-between",
                      marginBottom:5,alignItems:"center"}}>
                      <span style={{fontSize:13,color:C.text}}>{lb}</span>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <span style={{fontSize:11,color:C.muted}}>×{weight}</span>
                        <span style={{fontSize:13,fontWeight:700,color:mc(v),
                          minWidth:50,textAlign:"right"}}>{v}/100</span>
                      </div>
                    </div>
                    <div style={{height:4,background:C.s2,borderRadius:2,overflow:"hidden"}}>
                      <div style={{height:"100%",width:`${v}%`,background:mc(v),
                        borderRadius:2,transition:"width .9s cubic-bezier(.25,1,.5,1)"}}/>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* AI feedback */}
          <div style={{...card(true),marginBottom:14}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
              <div style={{width:22,height:22,borderRadius:6,background:C.accent,
                display:"flex",alignItems:"center",justifyContent:"center",fontSize:13}}>⚡</div>
              <span style={{...lbl,color:C.accent}}>AI Coach · Claude</span>
              {analyzing&&<span style={{fontSize:11,color:C.muted,marginLeft:4}}>
                thinking{".".repeat(dots)}
              </span>}
            </div>
            <p style={{margin:0,fontSize:14,lineHeight:1.75,color:analyzing?C.muted:"#D8D8D8"}}>
              {analyzing?"Analysing your squat mechanics across all 10 reps...":feedback}
            </p>
          </div>

          {/* Rest timer */}
          {resting&&(
            <div style={{...card(false),marginBottom:14,display:"flex",alignItems:"center",gap:16}}>
              <div style={{flexShrink:0}}>
                <div style={{...lbl,marginBottom:4}}>Rest Timer</div>
                <div style={{fontSize:34,fontWeight:900,
                  color:restRemaining<20?C.warn:C.text}}>{restRemaining}s</div>
              </div>
              <div style={{flex:1}}>
                <div style={{height:4,background:C.s2,borderRadius:2,overflow:"hidden"}}>
                  <div style={{height:"100%",width:`${restPct}%`,
                    background:restRemaining<20?C.warn:C.accent,
                    transition:"width 1s linear",borderRadius:2}}/>
                </div>
                <div style={{fontSize:11,color:C.muted,marginTop:6}}>
                  {restRemaining>0?"Tap below to start next set early":"Rest complete — ready"}
                </div>
              </div>
            </div>
          )}

          {/* Set comparison */}
          {history.length>=2&&(
            <div style={{...card(false),marginBottom:14}}>
              <div style={{...lbl,marginBottom:12}}>Progress This Session</div>
              <div style={{display:"flex",gap:8}}>
                {history.map(({setNumber:sn,score:sc,usedPose:up})=>(
                  <div key={sn} style={{flex:1,textAlign:"center"}}>
                    <div style={{fontSize:9,color:C.muted,marginBottom:2}}>S{sn}</div>
                    {up&&<div style={{fontSize:8,color:C.accent,marginBottom:2}}>●</div>}
                    <div style={{fontSize:18,fontWeight:800,color:mc(sc)}}>{sc}</div>
                    <div style={{height:3,background:C.s2,borderRadius:2,marginTop:5,overflow:"hidden"}}>
                      <div style={{height:"100%",width:`${sc}%`,background:mc(sc),borderRadius:2}}/>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{fontSize:10,color:C.muted,marginTop:8}}>
                ● = live pose data
              </div>
            </div>
          )}

          {!analyzing&&(
            <button onClick={nextSet} style={{
              width:"100%",padding:"18px",fontSize:15,fontWeight:800,
              background:C.accent,color:"#000",border:"none",
              borderRadius:10,cursor:"pointer",letterSpacing:2,textTransform:"uppercase"}}>
              {curSet>=totalSets?"View Session Results →":`Start Set ${curSet+1} / ${totalSets} →`}
            </button>
          )}
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════
  // RESULTS
  // ════════════════════════════════════════════════════════════
  const fs=finalScore??0;
  const gc=mc(fs);
  const avgM=METRICS_DEF.map(({key,label:lb})=>({
    key,label:lb,
    avg:history.length?Math.round(history.reduce((s,e)=>s+e.metrics[key],0)/history.length):0,
  }));
  const mostImp=avgM.reduce((a,b)=>{
    const aG=history.length>=2?history[history.length-1].metrics[a.key]-history[0].metrics[a.key]:0;
    const bG=history.length>=2?history[history.length-1].metrics[b.key]-history[0].metrics[b.key]:0;
    return bG>aG?b:a;
  });
  const poseSetCount=history.filter(h=>h.usedPose).length;

  return (
    <div style={{...page,padding:"24px 20px 36px"}}>
      <div style={{maxWidth:560,margin:"0 auto"}}>

        <div style={{textAlign:"center",padding:"20px 0 28px"}}>
          <img src={`${process.env.PUBLIC_URL}/formIQ.png`} alt="FormIQ"
            style={{height:60,width:"auto",objectFit:"contain",display:"block",
              margin:"0 auto 20px",opacity:.85}}/>
          <div style={{...lbl,marginBottom:14}}>Session Complete</div>
          <div style={{fontSize:104,fontWeight:900,letterSpacing:-6,color:gc,lineHeight:1}}>{fs}</div>
          <div style={{fontSize:24,color:gc,fontWeight:700,marginTop:6}}>
            {grade(fs)}  ·  {gLabel(fs)}
          </div>
          <div style={{color:C.muted,marginTop:8,fontSize:13}}>
            {totalSets} sets · {totalSets*REPS} reps
            {poseSetCount>0&&` · ${poseSetCount}/${totalSets} sets with live pose`}
          </div>
        </div>

        {/* Set breakdown */}
        <div style={{...card(false),marginBottom:14}}>
          <div style={{...lbl,marginBottom:16}}>Set-by-Set Results</div>
          {history.map(({setNumber:sn,score:sc,usedPose:up})=>(
            <div key={sn} style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
              <div style={{width:36,height:36,borderRadius:8,flexShrink:0,
                background:mc(sc)+"18",display:"flex",alignItems:"center",
                justifyContent:"center",color:mc(sc),fontWeight:800,fontSize:12}}>
                S{sn}
              </div>
              <div style={{flex:1}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <span style={{fontSize:13,color:C.mutedLight}}>Set {sn}</span>
                    {up&&<span style={{fontSize:9,color:C.accent,background:C.accent+"18",
                      padding:"1px 6px",borderRadius:4,fontWeight:700,letterSpacing:1}}>
                      POSE
                    </span>}
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <span style={{fontSize:11,color:C.muted}}>{grade(sc)}</span>
                    <span style={{fontSize:14,fontWeight:700,color:mc(sc)}}>{sc}/100</span>
                  </div>
                </div>
                <div style={{height:4,background:C.s2,borderRadius:2,overflow:"hidden"}}>
                  <div style={{height:"100%",width:`${sc}%`,background:mc(sc),borderRadius:2}}/>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Metric averages */}
        <div style={{...card(false),marginBottom:14}}>
          <div style={{...lbl,marginBottom:14}}>Session Averages</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            {avgM.map(({key,label:lb,avg:av})=>(
              <div key={key} style={{background:C.s2,borderRadius:8,padding:"12px 14px",position:"relative"}}>
                {key===mostImp.key&&history.length>=2&&(
                  <div style={{position:"absolute",top:8,right:8,fontSize:9,color:C.accent,
                    background:C.accent+"18",padding:"1px 6px",borderRadius:4,
                    fontWeight:700,letterSpacing:1}}>+MOST</div>
                )}
                <div style={{fontSize:11,color:C.muted,marginBottom:5}}>{lb}</div>
                <div style={{fontSize:26,fontWeight:900,color:mc(av),lineHeight:1}}>{av}</div>
                <div style={{height:2,background:C.s3,borderRadius:1,marginTop:8,overflow:"hidden"}}>
                  <div style={{height:"100%",width:`${av}%`,background:mc(av),borderRadius:1}}/>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Roadmap */}
        <div style={{...card(false),marginBottom:20,background:C.s2}}>
          <div style={{...lbl,marginBottom:10}}>Multi-Cam Phase — Coming Next</div>
          {[
            "Quad 4K HDMI camera input via capture card",
            "360° pose tracking — front, back, left, right",
            "Knee cave detection from front camera",
            "Bar path tracking overlay on back camera",
            "Rep-by-rep heatmap and long-term analytics dashboard",
          ].map((item,i)=>(
            <div key={i} style={{display:"flex",gap:8,marginBottom:8,alignItems:"flex-start"}}>
              <div style={{color:C.muted,fontSize:12,marginTop:1,flexShrink:0}}>○</div>
              <div style={{fontSize:12,color:C.mutedLight,lineHeight:1.5}}>{item}</div>
            </div>
          ))}
        </div>

        <div style={{display:"flex",gap:10}}>
          <button onClick={restart} style={{
            flex:1,padding:"17px",fontSize:14,fontWeight:800,
            background:C.accent,color:"#000",border:"none",
            borderRadius:10,cursor:"pointer",letterSpacing:2,textTransform:"uppercase"}}>
            New Session
          </button>
          <button onClick={()=>alert(
            `FormIQ Session\nScore: ${fs}/100 (${grade(fs)} · ${gLabel(fs)})\n${totalSets} sets · ${totalSets*REPS} reps\n${history.map(h=>`Set ${h.setNumber}: ${h.score}/100${h.usedPose?" (live)":""}`).join("\n")}`
          )} style={{
            flex:1,padding:"17px",fontSize:14,fontWeight:700,
            background:C.s2,color:C.text,border:`1px solid ${C.border}`,
            borderRadius:10,cursor:"pointer",letterSpacing:1.5,textTransform:"uppercase"}}>
            Share Results
          </button>
        </div>
      </div>
    </div>
  );
}
