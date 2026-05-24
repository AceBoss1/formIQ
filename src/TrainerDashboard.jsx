import { useState, useEffect, useRef } from "react";
import { InviteManager, PaymentModal, CURRENCIES, PLANS, saveTrainerProfile, getTrainerProfile, formatPrice } from "./CoachBranded";

// ── Design tokens ──────────────────────────────────────────────────────────
const T = {
  bg:       "#07080A",
  surface:  "#0E1014",
  s2:       "#141619",
  s3:       "#1C1F24",
  border:   "#23262D",
  border2:  "#2E323A",
  accent:   "#00E676",
  accentDim:"#00E67633",
  gold:     "#F5A623",
  blue:     "#3D8EF0",
  purple:   "#9B6DFF",
  danger:   "#FF4757",
  text:     "#F0F2F5",
  muted:    "#6B7280",
  mutedL:   "#9CA3AF",
  card:     "#0E1014",
};

// ── Mock data ──────────────────────────────────────────────────────────────
const CLIENTS = [
  { id:1,  name:"Marcus Williams",   avatar:"MW", plan:"Elite",   score:84, trend:+6,  sessions:28, streak:7,  lastSeen:"Today",        status:"active",   goal:"Powerlifting",   nextSession:"Today 6PM",    progress:84 },
  { id:2,  name:"Aisha Johnson",     avatar:"AJ", plan:"Pro",     score:71, trend:+3,  sessions:14, streak:4,  lastSeen:"Yesterday",    status:"active",   goal:"Athletic perf",  nextSession:"Wed 8AM",      progress:71 },
  { id:3,  name:"Emmanuela Obi",        avatar:"DC", plan:"Starter", score:62, trend:-2,  sessions:9,  streak:0,  lastSeen:"3 days ago",   status:"at-risk",  goal:"BodyFitness",    nextSession:"Thu 7PM",      progress:62 },
  { id:4,  name:"Sofia Reyes",       avatar:"SR", plan:"Elite",   score:91, trend:+9,  sessions:41, streak:14, lastSeen:"Today",        status:"active",   goal:"Competition",    nextSession:"Tomorrow 5AM", progress:91 },
  { id:5,  name:"James Okafor",      avatar:"JO", plan:"Pro",     score:77, trend:+1,  sessions:22, streak:5,  lastSeen:"Yesterday",    status:"active",   goal:"Strength",       nextSession:"Fri 6PM",      progress:77 },
  { id:6,  name:"Ogbodo Charity",        avatar:"PN", plan:"Starter", score:55, trend:-8,  sessions:5,  streak:0,  lastSeen:"1 week ago",   status:"inactive", goal:"Fitness",        nextSession:"—",            progress:55 },
  { id:7,  name:"Tom Brennan",       avatar:"TB", plan:"Elite",   score:88, trend:+4,  sessions:35, streak:10, lastSeen:"Today",        status:"active",   goal:"Powerlifting",   nextSession:"Today 7PM",    progress:88 },
  { id:8,  name:"Yemi Adeyemi",      avatar:"YA", plan:"Pro",     score:68, trend:+2,  sessions:18, streak:3,  lastSeen:"2 days ago",   status:"active",   goal:"Athletic perf",  nextSession:"Sat 9AM",      progress:68 },
];

const SESSION_LOG = [
  { id:1, clientId:1, clientName:"Marcus Williams", date:"Today, 6:15 PM",   score:84, sets:4, reps:40, topMetric:"Hip Hinge",    weakMetric:"Tempo",         poseUsed:true  },
  { id:2, clientId:4, clientName:"Sofia Reyes",     date:"Today, 5:00 AM",   score:91, sets:5, reps:50, topMetric:"Knee Align",   weakMetric:"None",          poseUsed:true  },
  { id:3, clientId:7, clientName:"Tom Brennan",     date:"Today, 7:30 PM",   score:88, sets:3, reps:30, topMetric:"Squat Depth",  weakMetric:"Spine",         poseUsed:true  },
  { id:4, clientId:2, clientName:"Aisha Johnson",   date:"Yesterday, 8AM",   score:71, sets:3, reps:30, topMetric:"Spine",        weakMetric:"Hip Hinge",     poseUsed:true  },
  { id:5, clientId:5, clientName:"James Okafor",    date:"Yesterday, 6PM",   score:77, sets:4, reps:40, topMetric:"Knee Align",   weakMetric:"Squat Depth",   poseUsed:false },
  { id:6, clientId:8, clientName:"Yemi Adeyemi",    date:"2 days ago",        score:68, sets:3, reps:30, topMetric:"Tempo",        weakMetric:"Knee Align",    poseUsed:true  },
];

const SCHEDULE = [
  { id:1, time:"6:00 AM", client:"Sofia Reyes",    type:"Squat Form",    duration:"45 min", status:"done",    color:T.accent },
  { id:2, time:"9:00 AM", client:"Aisha Johnson",  type:"Assessment",    duration:"30 min", status:"done",    color:T.blue },
  { id:3, time:"12:00 PM",client:"James Okafor",   type:"Squat Form",    duration:"45 min", status:"done",    color:T.accent },
  { id:4, time:"5:00 PM", client:"Emmanuela Obi",     type:"Check-in",      duration:"20 min", status:"upcoming",color:T.gold },
  { id:5, time:"6:00 PM", client:"Marcus Williams",type:"Squat Form",    duration:"45 min", status:"upcoming",color:T.accent },
  { id:6, time:"7:00 PM", client:"Tom Brennan",    type:"Squat Form",    duration:"45 min", status:"upcoming",color:T.accent },
];

const METRICS_OVER_TIME = [
  { week:"W1",  avg:58 },
  { week:"W2",  avg:62 },
  { week:"W3",  avg:61 },
  { week:"W4",  avg:67 },
  { week:"W5",  avg:70 },
  { week:"W6",  avg:72 },
  { week:"W7",  avg:75 },
  { week:"W8",  avg:74 },
  { week:"W9",  avg:78 },
  { week:"W10", avg:81 },
  { week:"W11", avg:79 },
  { week:"W12", avg:84 },
];

const CLIENT_METRICS = {
  kneeAlignment:   { label:"Knee Alignment",   avg:74 },
  spineNeutrality: { label:"Spine Neutrality", avg:70 },
  squatDepth:      { label:"Squat Depth",      avg:68 },
  tempoConsistency:{ label:"Tempo Control",    avg:63 },
  hipHinge:        { label:"Hip Hinge",        avg:77 },
};

// ── Helpers ────────────────────────────────────────────────────────────────
const scoreColor = (v) => v>=80 ? T.accent : v>=65 ? T.gold : T.danger;
const gradeStr   = (s) => s>=90?"S":s>=82?"A+":s>=75?"A":s>=65?"B":s>=55?"C":"D";
const statusColor= (s) => s==="active"?T.accent:s==="at-risk"?T.gold:T.danger;

// ── Mini sparkline ─────────────────────────────────────────────────────────
function Sparkline({ data, color="#00E676", width=80, height=28 }) {
  const min=Math.min(...data), max=Math.max(...data), range=max-min||1;
  const pts=data.map((v,i)=>`${(i/(data.length-1))*width},${height-((v-min)/range)*height}`).join(" ");
  return (
    <svg width={width} height={height} style={{overflow:"visible"}}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.8"/>
      <circle cx={(data.length-1)/(data.length-1)*width} cy={height-((data[data.length-1]-min)/range)*height} r="3" fill={color}/>
    </svg>
  );
}

// ── Bar chart (roster screen) ──────────────────────────────────────────────
function MiniBar({ value, color }) {
  return (
    <div style={{ width:"100%", height:4, background:T.s3, borderRadius:2, overflow:"hidden" }}>
      <div style={{ height:"100%", width:`${value}%`, background:color, borderRadius:2, transition:"width 0.8s ease" }}/>
    </div>
  );
}

// ── Donut chart ────────────────────────────────────────────────────────────
function Donut({ value, size=64, stroke=7, color="#00E676" }) {
  const r = (size-stroke*2)/2;
  const circ = 2*Math.PI*r;
  const dash = (value/100)*circ;
  return (
    <svg width={size} height={size} style={{ transform:"rotate(-90deg)" }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={T.s3} strokeWidth={stroke}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ-dash}`} strokeLinecap="round"/>
    </svg>
  );
}

// ── Score badge ────────────────────────────────────────────────────────────
function ScoreBadge({ score, size="sm" }) {
  const col = scoreColor(score);
  const fs = size==="lg"?28:size==="md"?18:13;
  return (
    <div style={{
      display:"inline-flex", alignItems:"center", justifyContent:"center",
      minWidth: size==="lg"?52:size==="md"?40:32,
      height: size==="lg"?52:size==="md"?40:26,
      background: col+"18", border:`1px solid ${col}40`,
      borderRadius:8, padding:"0 8px",
      fontSize:fs, fontWeight:800, color:col, letterSpacing:-0.5,
    }}>
      {score}
    </div>
  );
}

// ── Avatar ─────────────────────────────────────────────────────────────────
function Avatar({ initials, size=36, color=T.accent }) {
  return (
    <div style={{
      width:size, height:size, borderRadius:"50%",
      background: color+"22", border:`1.5px solid ${color}55`,
      display:"flex", alignItems:"center", justifyContent:"center",
      fontSize:size*0.36, fontWeight:700, color, flexShrink:0,
      fontFamily:"system-ui",
    }}>{initials}</div>
  );
}

// ── Client drawer (side panel) ─────────────────────────────────────────────
function ClientDrawer({ client, onClose }) {
  const col = scoreColor(client.score);
  const clientSessions = SESSION_LOG.filter(s=>s.clientId===client.id);
  const weekScores = [62,65,68,67,71,73,client.score];

  return (
    <div style={{
      position:"fixed", inset:0, zIndex:999,
      display:"flex", justifyContent:"flex-end",
    }}>
      {/* Backdrop */}
      <div onClick={onClose} style={{ flex:1, background:"#000000AA", cursor:"pointer" }}/>
      {/* Panel */}
      <div style={{
        width:360, background:T.surface, borderLeft:`1px solid ${T.border}`,
        display:"flex", flexDirection:"column", overflowY:"auto",
        animation:"slideIn .25s ease",
      }}>
        <style>{`@keyframes slideIn{from{transform:translateX(40px);opacity:0}to{transform:translateX(0);opacity:1}}`}</style>

        {/* Header */}
        <div style={{ padding:"20px 20px 16px", borderBottom:`1px solid ${T.border}`, flexShrink:0 }}>
          <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:14 }}>
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              <Avatar initials={client.avatar} size={48} color={col}/>
              <div>
                <div style={{ fontSize:16, fontWeight:700, color:T.text }}>{client.name}</div>
                <div style={{ fontSize:12, color:T.muted, marginTop:2 }}>{client.goal} · {client.plan} plan</div>
              </div>
            </div>
            <button onClick={onClose} style={{ background:"transparent", border:"none", color:T.muted, cursor:"pointer", fontSize:20, padding:4 }}>✕</button>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            {[{l:"Sessions",v:client.sessions},{l:"Streak",v:`${client.streak}d`},{l:"Status",v:client.status}].map(({l,v})=>(
              <div key={l} style={{ flex:1, background:T.s2, borderRadius:8, padding:"8px 10px", textAlign:"center" }}>
                <div style={{ fontSize:10, color:T.muted, letterSpacing:1.5, textTransform:"uppercase", marginBottom:3 }}>{l}</div>
                <div style={{ fontSize:14, fontWeight:700, color:T.text }}>{v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Score + progress */}
        <div style={{ padding:"16px 20px", borderBottom:`1px solid ${T.border}` }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
            <div>
              <div style={{ fontSize:10, color:T.muted, letterSpacing:2, textTransform:"uppercase", marginBottom:4 }}>Form Score</div>
              <div style={{ display:"flex", alignItems:"baseline", gap:8 }}>
                <span style={{ fontSize:40, fontWeight:900, color:col, letterSpacing:-2 }}>{client.score}</span>
                <span style={{ fontSize:13, color:client.trend>0?T.accent:T.danger, fontWeight:600 }}>
                  {client.trend>0?"+":""}{client.trend} this week
                </span>
              </div>
            </div>
            <Donut value={client.score} size={72} stroke={7} color={col}/>
          </div>
          {/* Progress chart */}
          <div style={{ background:T.s2, borderRadius:8, padding:"10px 12px" }}>
            <div style={{ fontSize:10, color:T.muted, letterSpacing:1.5, textTransform:"uppercase", marginBottom:8 }}>7-Week Trend</div>
            <Sparkline data={weekScores} color={col} width={300} height={40}/>
          </div>
        </div>

        {/* Metrics breakdown */}
        <div style={{ padding:"16px 20px", borderBottom:`1px solid ${T.border}` }}>
          <div style={{ fontSize:10, color:T.muted, letterSpacing:2, textTransform:"uppercase", marginBottom:12 }}>Form Breakdown</div>
          {Object.entries(CLIENT_METRICS).map(([key,{label,avg}])=>{
            const v = Math.round(avg + (client.score - 72) * 0.8 + Math.random()*8-4);
            const vc = scoreColor(Math.min(100,Math.max(0,v)));
            return (
              <div key={key} style={{ marginBottom:10 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                  <span style={{ fontSize:12, color:T.mutedL }}>{label}</span>
                  <span style={{ fontSize:12, fontWeight:700, color:vc }}>{Math.min(100,Math.max(0,v))}/100</span>
                </div>
                <MiniBar value={Math.min(100,Math.max(0,v))} color={vc}/>
              </div>
            );
          })}
        </div>

        {/* Recent sessions */}
        <div style={{ padding:"16px 20px", flex:1 }}>
          <div style={{ fontSize:10, color:T.muted, letterSpacing:2, textTransform:"uppercase", marginBottom:12 }}>Recent Sessions</div>
          {clientSessions.length===0
            ? <div style={{ fontSize:12, color:T.muted, textAlign:"center", padding:"20px 0" }}>No sessions recorded yet</div>
            : clientSessions.map(s=>(
              <div key={s.id} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10, padding:"10px 12px", background:T.s2, borderRadius:8 }}>
                <ScoreBadge score={s.score}/>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:11, color:T.text, fontWeight:600, marginBottom:2 }}>{s.date}</div>
                  <div style={{ fontSize:11, color:T.muted }}>{s.sets} sets · {s.reps} reps · Best: {s.topMetric}</div>
                </div>
                {s.poseUsed&&<div style={{ fontSize:9, color:T.accent, background:T.accentDim, padding:"2px 6px", borderRadius:4, fontWeight:700 }}>POSE</div>}
              </div>
            ))
          }
        </div>

        {/* Actions */}
        <div style={{ padding:"14px 20px", borderTop:`1px solid ${T.border}`, display:"flex", gap:8 }}>
          <button style={{ flex:1, padding:"11px", background:T.accent, color:"#000", border:"none", borderRadius:8, fontWeight:700, cursor:"pointer", fontSize:13 }}>
            📋 Assign Plan
          </button>
          <button style={{ flex:1, padding:"11px", background:T.s2, color:T.text, border:`1px solid ${T.border}`, borderRadius:8, fontWeight:600, cursor:"pointer", fontSize:13 }}>
            💬 Message
          </button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// MAIN DASHBOARD
// ══════════════════════════════════════════════════════════════
export default function TrainerDashboard({ onBack }) {
  const [tab, setTab]             = useState("overview");
  const [selectedClient, setSelectedClient] = useState(null);
  const [inviteClient, setInviteClient]     = useState(null);
  const [showPayment, setShowPayment]       = useState(false);
  const [paymentPlan, setPaymentPlan]       = useState("pro");
  const [searchQ, setSearchQ]     = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [notifOpen, setNotifOpen] = useState(false);
  const [mounted, setMounted]     = useState(false);

  // Settings state — loaded from localStorage
  const SLUG = "adams";
  const [profile, setProfile] = useState(()=> getTrainerProfile(SLUG) || {
    name:     "Coach Adams",
    slug:     SLUG,
    photo:    `${process.env.PUBLIC_URL}/photoadams.jpg`,
    tagline:  "Strength & Conditioning Coach",
    welcome:  "Hey! I've invited you to track your squats with FormIQ. After each session I'll review your form and leave you coaching notes. Let's get those numbers up! 💪",
    accent:   "#00E676",
    currency: "NGN",
    plan:     "pro",
    email:    "adams@formiqapp.space",
  });
  const [profileDirty, setProfileDirty] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  const saveProfile = () => {
    saveTrainerProfile(SLUG, profile);
    setProfileDirty(false);
    setProfileSaved(true);
    setTimeout(()=>setProfileSaved(false), 2500);
  };

  const baseUrl = window.location.origin + window.location.pathname;
  const trainerName = profile.name;
  const trainerInitials = profile.name.split(" ").map(n=>n[0]).join("").slice(0,2);

  useEffect(() => { setTimeout(() => setMounted(true), 50); }, []);

  const activeClients   = CLIENTS.filter(c=>c.status==="active").length;
  const atRiskClients   = CLIENTS.filter(c=>c.status==="at-risk").length;
  const avgScore        = Math.round(CLIENTS.reduce((s,c)=>s+c.score,0)/CLIENTS.length);
  const todaySessions   = SCHEDULE.length;
  const completedToday  = SCHEDULE.filter(s=>s.status==="done").length;

  const filteredClients = CLIENTS.filter(c=>{
    const matchSearch = c.name.toLowerCase().includes(searchQ.toLowerCase());
    const matchStatus = filterStatus==="all" || c.status===filterStatus;
    return matchSearch && matchStatus;
  });

  const font = `'DM Sans', system-ui, -apple-system, sans-serif`;
  const page = { background:T.bg, color:T.text, minHeight:"100vh", fontFamily:font };
  const card = (accent) => ({
    background:T.card, borderRadius:12, padding:"16px 18px",
    border:`1px solid ${accent?T.accent+"30":T.border}`,
  });
  const lbl = { fontSize:9, letterSpacing:3, color:T.muted, textTransform:"uppercase", fontWeight:700 };

  const NAV = [
    { id:"overview",  icon:"⬡",  label:"Overview"  },
    { id:"roster",    icon:"◈",  label:"Roster"    },
    { id:"sessions",  icon:"◉",  label:"Sessions"  },
    { id:"schedule",  icon:"◷",  label:"Schedule"  },
    { id:"analytics", icon:"◬",  label:"Analytics" },
    { id:"settings",  icon:"◎",  label:"Settings"  },
  ];

  return (
    <div style={{ ...page }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;0,9..40,900;1,9..40,400&display=swap');
        * { box-sizing: border-box; margin:0; padding:0; }
        ::-webkit-scrollbar { width:4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #2E323A; border-radius:2px; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:translateY(0) } }
        @keyframes pulse  { 0%,100%{opacity:1} 50%{opacity:.4} }
        .card-hover:hover { border-color: #2E323A !important; transform:translateY(-1px); transition:all .2s; }
        .nav-btn:hover { background:#141619 !important; color:#F0F2F5 !important; }
        .row-hover:hover { background:#141619 !important; }
        input::placeholder { color:#4B5563; }
        input:focus { outline:none; border-color:#00E67650 !important; }
      `}</style>

      <div style={{ display:"flex", minHeight:"100vh" }}>

        {/* ── SIDEBAR ────────────────────────────────────────────────── */}
        <div style={{
          width:220, background:T.surface, borderRight:`1px solid ${T.border}`,
          display:"flex", flexDirection:"column", flexShrink:0, position:"sticky", top:0, height:"100vh",
        }}>
          {/* Logo */}
          <div style={{ padding:"24px 20px 20px", borderBottom:`1px solid ${T.border}` }}>
            <img src={`${process.env.PUBLIC_URL}/formIQ.png`} alt="FormIQ"
              style={{ width:"100%", height:"auto", objectFit:"contain", display:"block" }}/>
            <div style={{ fontSize:10, color:T.muted, letterSpacing:2, textTransform:"uppercase", marginTop:8, textAlign:"center" }}>
              Trainer Dashboard
            </div>
          </div>

          {/* Nav */}
          <nav style={{ flex:1, padding:"12px 10px" }}>
            {NAV.map(({id,icon,label})=>(
              <button key={id} className="nav-btn"
                onClick={()=>setTab(id)}
                style={{
                  width:"100%", display:"flex", alignItems:"center", gap:10,
                  padding:"10px 12px", background:tab===id?T.s2:"transparent",
                  border:"none", borderRadius:8, cursor:"pointer",
                  color:tab===id?T.accent:T.muted, fontWeight:tab===id?700:500,
                  fontSize:13, marginBottom:2, transition:"all .15s",
                  fontFamily:font, textAlign:"left",
                  borderLeft: tab===id?`2px solid ${T.accent}`:"2px solid transparent",
                }}>
                <span style={{ fontSize:16 }}>{icon}</span>
                {label}
              </button>
            ))}
          </nav>

          {/* Back to Home */}
          <button onClick={onBack} className="nav-btn" style={{
            width:"100%", display:"flex", alignItems:"center", gap:10,
            padding:"10px 12px", background:"transparent",
            border:"none", borderRadius:8, cursor:"pointer",
            color:T.muted, fontWeight:500, fontSize:13,
            fontFamily:font, textAlign:"left", marginTop:8,
            borderLeft:"2px solid transparent",
          }}>
            <span style={{fontSize:16}}>←</span>
            Home
          </button>

          {/* Trainer profile */}
          <div style={{ padding:"16px", borderTop:`1px solid ${T.border}` }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <Avatar initials={trainerInitials} size={36} color={T.purple}/>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:600, color:T.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{trainerName}</div>
                <div style={{ fontSize:11, color:T.muted }}>Pro Trainer</div>
              </div>
              <div style={{ width:7, height:7, borderRadius:"50%", background:T.accent, flexShrink:0 }}/>
            </div>
          </div>
        </div>

        {/* ── MAIN ───────────────────────────────────────────────────── */}
        <div style={{ flex:1, overflow:"auto" }}>

          {/* Top bar */}
          <div style={{
            background:T.surface, borderBottom:`1px solid ${T.border}`,
            padding:"14px 28px", display:"flex", alignItems:"center", justifyContent:"space-between",
            position:"sticky", top:0, zIndex:10,
          }}>
            <div>
              <div style={{ fontSize:18, fontWeight:700, color:T.text }}>
                {NAV.find(n=>n.id===tab)?.label}
              </div>
              <div style={{ fontSize:12, color:T.muted, marginTop:1 }}>
                {new Date().toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}
              </div>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              {/* Notification bell */}
              <div style={{ position:"relative" }}>
                <button onClick={()=>setNotifOpen(!notifOpen)} style={{
                  background:T.s2, border:`1px solid ${T.border}`, borderRadius:8,
                  width:36, height:36, display:"flex", alignItems:"center", justifyContent:"center",
                  cursor:"pointer", color:T.mutedL, fontSize:16,
                }}>🔔</button>
                {atRiskClients>0&&<div style={{ position:"absolute", top:-3, right:-3, width:16, height:16, borderRadius:"50%", background:T.danger, display:"flex", alignItems:"center", justifyContent:"center", fontSize:9, fontWeight:700, color:"#fff" }}>{atRiskClients}</div>}
                {notifOpen&&(
                  <div style={{ position:"absolute", top:44, right:0, width:280, background:T.surface, border:`1px solid ${T.border}`, borderRadius:10, padding:12, zIndex:20, boxShadow:"0 8px 32px #00000088" }}>
                    <div style={{ fontSize:11, color:T.muted, letterSpacing:2, textTransform:"uppercase", marginBottom:10 }}>Alerts</div>
                    {CLIENTS.filter(c=>c.status!=="active").map(c=>(
                      <div key={c.id} style={{ display:"flex", gap:10, alignItems:"flex-start", padding:"8px 0", borderBottom:`1px solid ${T.border}` }}>
                        <Avatar initials={c.avatar} size={28} color={statusColor(c.status)}/>
                        <div>
                          <div style={{ fontSize:12, color:T.text, fontWeight:600 }}>{c.name}</div>
                          <div style={{ fontSize:11, color:T.muted }}>{c.status==="at-risk"?"3 days inactive":"1 week inactive"} · Last: {c.lastSeen}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {/* Quick start session */}
              <button style={{
                background:T.accent, color:"#000", border:"none", borderRadius:8,
                padding:"8px 16px", cursor:"pointer", fontWeight:700, fontSize:13,
                fontFamily:font, display:"flex", alignItems:"center", gap:6,
              }}>
                ⚡ New Session
              </button>
            </div>
          </div>

          {/* ── TAB: OVERVIEW ──────────────────────────────────────── */}
          {tab==="overview"&&(
            <div style={{ padding:"24px 28px" }}>

              {/* KPI cards */}
              <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:24 }}>
                {[
                  { label:"Active Clients",  value:activeClients,     sub:`of ${CLIENTS.length} total`,        icon:"◈", color:T.accent  },
                  { label:"Avg Form Score",  value:avgScore,          sub:"across all clients",                icon:"◬", color:T.gold    },
                  { label:"Sessions Today",  value:`${completedToday}/${todaySessions}`, sub:"completed today",icon:"◷", color:T.blue    },
                  { label:"Need Attention",  value:atRiskClients,     sub:"clients inactive 3+ days",          icon:"⚠", color:T.danger  },
                ].map(({label,value,sub,icon,color})=>(
                  <div key={label} style={{ ...card(false), position:"relative", overflow:"hidden" }}
                    className="card-hover">
                    <div style={{ position:"absolute", top:0, left:0, width:3, height:"100%", background:color, borderRadius:"12px 0 0 12px" }}/>
                    <div style={{ paddingLeft:8 }}>
                      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
                        <div style={{ ...lbl }}>{label}</div>
                        <div style={{ fontSize:18, opacity:0.4 }}>{icon}</div>
                      </div>
                      <div style={{ fontSize:32, fontWeight:900, color, letterSpacing:-1.5, lineHeight:1 }}>{value}</div>
                      <div style={{ fontSize:11, color:T.muted, marginTop:6 }}>{sub}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:14 }}>

                {/* Client roster preview */}
                <div style={{ ...card(false) }}>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
                    <div style={{ ...lbl }}>Top Performers</div>
                    <button onClick={()=>setTab("roster")} style={{ fontSize:11, color:T.accent, background:"transparent", border:"none", cursor:"pointer", fontFamily:font }}>View all →</button>
                  </div>
                  {[...CLIENTS].sort((a,b)=>b.score-a.score).slice(0,5).map((c,i)=>(
                    <div key={c.id} onClick={()=>setSelectedClient(c)}
                      className="row-hover"
                      style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 8px", borderRadius:8, cursor:"pointer", marginBottom:4 }}>
                      <div style={{ fontSize:12, color:T.muted, width:16, fontWeight:700 }}>#{i+1}</div>
                      <Avatar initials={c.avatar} size={30} color={scoreColor(c.score)}/>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:13, color:T.text, fontWeight:600 }}>{c.name}</div>
                        <div style={{ fontSize:11, color:T.muted }}>{c.sessions} sessions · {c.goal}</div>
                      </div>
                      <ScoreBadge score={c.score}/>
                    </div>
                  ))}
                </div>

                {/* Today's schedule */}
                <div style={{ ...card(false) }}>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
                    <div style={{ ...lbl }}>Today's Schedule</div>
                    <button onClick={()=>setTab("schedule")} style={{ fontSize:11, color:T.accent, background:"transparent", border:"none", cursor:"pointer", fontFamily:font }}>Full calendar →</button>
                  </div>
                  {SCHEDULE.map(s=>(
                    <div key={s.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"7px 0", borderBottom:`1px solid ${T.border}` }}>
                      <div style={{ fontSize:11, color:T.muted, width:52, flexShrink:0 }}>{s.time}</div>
                      <div style={{ width:3, height:28, borderRadius:2, background:s.color, flexShrink:0 }}/>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:12, color:s.status==="done"?T.muted:T.text, fontWeight:600, textDecoration:s.status==="done"?"line-through":"none" }}>{s.client}</div>
                        <div style={{ fontSize:11, color:T.muted }}>{s.type} · {s.duration}</div>
                      </div>
                      <div style={{ fontSize:10, fontWeight:700, letterSpacing:1,
                        color:s.status==="done"?T.muted:T.accent,
                        background:s.status==="done"?T.s2:T.accentDim,
                        padding:"2px 8px", borderRadius:4 }}>
                        {s.status==="done"?"DONE":"NEXT"}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent sessions + Cohort score chart */}
              <div style={{ display:"grid", gridTemplateColumns:"1.4fr 1fr", gap:14 }}>
                <div style={{ ...card(false) }}>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
                    <div style={{ ...lbl }}>Recent Sessions</div>
                    <button onClick={()=>setTab("sessions")} style={{ fontSize:11, color:T.accent, background:"transparent", border:"none", cursor:"pointer", fontFamily:font }}>All sessions →</button>
                  </div>
                  {SESSION_LOG.slice(0,5).map(s=>(
                    <div key={s.id} className="row-hover"
                      style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 6px", borderRadius:8, marginBottom:4 }}>
                      <Avatar initials={s.clientName.split(" ").map(n=>n[0]).join("")} size={32} color={scoreColor(s.score)}/>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:13, color:T.text, fontWeight:600 }}>{s.clientName}</div>
                        <div style={{ fontSize:11, color:T.muted }}>{s.date} · {s.sets} sets · {s.reps} reps</div>
                      </div>
                      <div style={{ textAlign:"right" }}>
                        <ScoreBadge score={s.score}/>
                        {s.poseUsed&&<div style={{ fontSize:9, color:T.accent, marginTop:3, textAlign:"center" }}>● LIVE POSE</div>}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Cohort trend */}
                <div style={{ ...card(false) }}>
                  <div style={{ ...lbl, marginBottom:6 }}>Cohort Score Trend</div>
                  <div style={{ fontSize:11, color:T.muted, marginBottom:16 }}>12-week rolling average</div>
                  {/* Mini bar chart */}
                  <div style={{ display:"flex", alignItems:"flex-end", gap:4, height:80 }}>
                    {METRICS_OVER_TIME.map(({week,avg},i)=>{
                      const isLast=i===METRICS_OVER_TIME.length-1;
                      const h=Math.round((avg/100)*80);
                      const col=isLast?T.accent:T.s3;
                      return(
                        <div key={week} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:3 }}>
                          <div style={{ width:"100%", height:h, background:col, borderRadius:"3px 3px 0 0", transition:"height .5s ease" }}/>
                          {i%3===0&&<div style={{ fontSize:8, color:T.muted }}>{week}</div>}
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ display:"flex", justifyContent:"space-between", marginTop:16 }}>
                    {[{l:"Start",v:METRICS_OVER_TIME[0].avg},{l:"Now",v:METRICS_OVER_TIME[METRICS_OVER_TIME.length-1].avg}].map(({l,v})=>(
                      <div key={l} style={{ textAlign:"center" }}>
                        <div style={{ fontSize:10, color:T.muted, letterSpacing:1 }}>{l}</div>
                        <div style={{ fontSize:20, fontWeight:800, color:scoreColor(v) }}>{v}</div>
                      </div>
                    ))}
                    <div style={{ textAlign:"center" }}>
                      <div style={{ fontSize:10, color:T.muted, letterSpacing:1 }}>Gain</div>
                      <div style={{ fontSize:20, fontWeight:800, color:T.accent }}>+{METRICS_OVER_TIME[METRICS_OVER_TIME.length-1].avg-METRICS_OVER_TIME[0].avg}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── TAB: ROSTER ────────────────────────────────────────── */}
          {tab==="roster"&&(
            <div style={{ padding:"24px 28px" }}>
              {/* Filters */}
              <div style={{ display:"flex", gap:10, marginBottom:20 }}>
                <input
                  value={searchQ} onChange={e=>setSearchQ(e.target.value)}
                  placeholder="Search clients..."
                  style={{ flex:1, background:T.surface, border:`1px solid ${T.border}`, borderRadius:8,
                    padding:"9px 14px", color:T.text, fontSize:13, fontFamily:font }}/>
                <div style={{ display:"flex", gap:6 }}>
                  {["all","active","at-risk","inactive"].map(f=>(
                    <button key={f} onClick={()=>setFilterStatus(f)} style={{
                      padding:"8px 14px", borderRadius:8, cursor:"pointer", fontSize:12, fontWeight:600,
                      background:filterStatus===f?T.accent:T.surface, color:filterStatus===f?"#000":T.muted,
                      border:`1px solid ${filterStatus===f?T.accent:T.border}`, fontFamily:font,
                      textTransform:"capitalize",
                    }}>{f}</button>
                  ))}
                </div>
              </div>

              {/* Client grid */}
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))", gap:12 }}>
                {filteredClients.map(c=>{
                  const col=scoreColor(c.score);
                  return(
                    <div key={c.id} className="card-hover"
                      onClick={()=>setSelectedClient(c)}
                      style={{ ...card(false), cursor:"pointer", transition:"all .2s" }}>
                      <div style={{ display:"flex", alignItems:"flex-start", gap:12, marginBottom:14 }}>
                        <Avatar initials={c.avatar} size={44} color={col}/>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:3 }}>
                            <div style={{ fontSize:14, fontWeight:700, color:T.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{c.name}</div>
                            <div style={{ width:6, height:6, borderRadius:"50%", background:statusColor(c.status), flexShrink:0 }}/>
                          </div>
                          <div style={{ fontSize:11, color:T.muted }}>{c.goal} · {c.plan}</div>
                          <div style={{ fontSize:11, color:T.muted, marginTop:2 }}>Last: {c.lastSeen}</div>
                        </div>
                        <ScoreBadge score={c.score} size="md"/>
                      </div>

                      <MiniBar value={c.score} color={col}/>

                      <div style={{ display:"flex", gap:0, marginTop:12 }}>
                        {[{l:"Sessions",v:c.sessions},{l:"Streak",v:`${c.streak}d`},{l:"Trend",v:`${c.trend>0?"+":""}${c.trend}`}].map(({l,v},i)=>(
                          <div key={l} style={{ flex:1, textAlign:"center", borderRight:i<2?`1px solid ${T.border}`:"none" }}>
                            <div style={{ fontSize:9, color:T.muted, letterSpacing:1.5, textTransform:"uppercase", marginBottom:3 }}>{l}</div>
                            <div style={{ fontSize:14, fontWeight:700, color:l==="Trend"?(c.trend>0?T.accent:T.danger):T.text }}>{v}</div>
                          </div>
                        ))}
                      </div>
                      <div style={{ marginTop:12, fontSize:11, color:T.muted, display:"flex", alignItems:"center", gap:5 }}>
                        <span>📅</span> Next: {c.nextSession}
                      </div>
                      <button
                        onClick={e=>{e.stopPropagation();setInviteClient(c);}}
                        style={{ marginTop:10, width:"100%", padding:"8px",
                          background:T.accentDim, border:`1px solid ${T.accent}40`,
                          borderRadius:7, color:T.accent, fontSize:12, fontWeight:700,
                          cursor:"pointer", fontFamily:font }}>
                        🔗 Send Invite Link
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── TAB: SESSIONS ──────────────────────────────────────── */}
          {tab==="sessions"&&(
            <div style={{ padding:"24px 28px" }}>
              <div style={{ ...card(false), overflow:"hidden" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
                  <div style={{ ...lbl }}>All Sessions</div>
                  <div style={{ fontSize:12, color:T.muted }}>{SESSION_LOG.length} recorded</div>
                </div>
                {/* Table header */}
                <div style={{ display:"grid", gridTemplateColumns:"2fr 1.2fr 1fr 1fr 1fr 1fr 0.7fr", gap:10,
                  padding:"8px 12px", background:T.s2, borderRadius:6, marginBottom:8 }}>
                  {["Client","Date","Score","Sets / Reps","Best Metric","Weakest","Pose"].map(h=>(
                    <div key={h} style={{ fontSize:10, color:T.muted, fontWeight:700, letterSpacing:1, textTransform:"uppercase" }}>{h}</div>
                  ))}
                </div>
                {SESSION_LOG.map((s,i)=>(
                  <div key={s.id} className="row-hover"
                    style={{ display:"grid", gridTemplateColumns:"2fr 1.2fr 1fr 1fr 1fr 1fr 0.7fr", gap:10,
                      padding:"10px 12px", borderRadius:6, cursor:"pointer",
                      borderBottom:i<SESSION_LOG.length-1?`1px solid ${T.border}`:"none" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <Avatar initials={s.clientName.split(" ").map(n=>n[0]).join("")} size={28} color={scoreColor(s.score)}/>
                      <span style={{ fontSize:13, color:T.text, fontWeight:600 }}>{s.clientName}</span>
                    </div>
                    <div style={{ fontSize:12, color:T.muted, alignSelf:"center" }}>{s.date}</div>
                    <div style={{ alignSelf:"center" }}><ScoreBadge score={s.score}/></div>
                    <div style={{ fontSize:12, color:T.mutedL, alignSelf:"center" }}>{s.sets}×{s.reps/s.sets}</div>
                    <div style={{ fontSize:12, color:T.accent, fontWeight:600, alignSelf:"center" }}>{s.topMetric}</div>
                    <div style={{ fontSize:12, color:T.gold, fontWeight:600, alignSelf:"center" }}>{s.weakMetric}</div>
                    <div style={{ alignSelf:"center" }}>
                      {s.poseUsed
                        ?<div style={{ fontSize:9, background:T.accentDim, color:T.accent, padding:"3px 6px", borderRadius:4, fontWeight:700, textAlign:"center" }}>LIVE</div>
                        :<div style={{ fontSize:9, background:T.s2, color:T.muted, padding:"3px 6px", borderRadius:4, fontWeight:700, textAlign:"center" }}>TAP</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── TAB: SCHEDULE ──────────────────────────────────────── */}
          {tab==="schedule"&&(
            <div style={{ padding:"24px 28px" }}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 300px", gap:14 }}>
                {/* Timeline */}
                <div style={{ ...card(false) }}>
                  <div style={{ ...lbl, marginBottom:20 }}>Today — {new Date().toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long"})}</div>
                  {SCHEDULE.map((s,i)=>(
                    <div key={s.id} style={{ display:"flex", gap:14, marginBottom:i<SCHEDULE.length-1?20:0 }}>
                      {/* Time + line */}
                      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", width:56, flexShrink:0 }}>
                        <div style={{ fontSize:12, color:s.status==="done"?T.muted:T.text, fontWeight:600, whiteSpace:"nowrap" }}>{s.time}</div>
                        {i<SCHEDULE.length-1&&<div style={{ flex:1, width:1, background:T.border, marginTop:6 }}/>}
                      </div>
                      {/* Session card */}
                      <div style={{
                        flex:1, padding:"14px", borderRadius:10,
                        background:s.status==="upcoming"?T.s2:T.s3,
                        border:`1px solid ${s.status==="upcoming"?s.color+"40":T.border}`,
                        opacity:s.status==="done"?.6:1,
                        marginBottom:6,
                      }}>
                        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:6 }}>
                          <div style={{ fontSize:14, fontWeight:700, color:T.text }}>{s.client}</div>
                          <div style={{ fontSize:10, fontWeight:700, letterSpacing:1.5,
                            color:s.status==="done"?T.muted:s.color,
                            background:s.status==="done"?T.s3:s.color+"20",
                            padding:"3px 10px", borderRadius:4, textTransform:"uppercase" }}>
                            {s.status==="done"?"Completed":"Upcoming"}
                          </div>
                        </div>
                        <div style={{ fontSize:12, color:T.muted }}>{s.type} · {s.duration}</div>
                        {s.status==="upcoming"&&(
                          <div style={{ marginTop:10, display:"flex", gap:8 }}>
                            <button style={{ padding:"7px 14px", background:s.color, color:"#000", border:"none", borderRadius:6, fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:font }}>Start Session</button>
                            <button style={{ padding:"7px 12px", background:"transparent", color:T.muted, border:`1px solid ${T.border}`, borderRadius:6, fontSize:12, cursor:"pointer", fontFamily:font }}>Reschedule</button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Summary sidebar */}
                <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                  <div style={{ ...card(false) }}>
                    <div style={{ ...lbl, marginBottom:14 }}>Day Summary</div>
                    {[
                      {l:"Total sessions",v:SCHEDULE.length},
                      {l:"Completed",v:completedToday,col:T.accent},
                      {l:"Remaining",v:SCHEDULE.length-completedToday,col:T.gold},
                      {l:"Squat sessions",v:SCHEDULE.filter(s=>s.type==="Squat Form").length},
                    ].map(({l,v,col})=>(
                      <div key={l} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                        <span style={{ fontSize:13, color:T.mutedL }}>{l}</span>
                        <span style={{ fontSize:16, fontWeight:700, color:col||T.text }}>{v}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ ...card(false) }}>
                    <div style={{ ...lbl, marginBottom:14 }}>Quick Actions</div>
                    {["+ Add session","+ Add client","📋 View plans","📊 Export today"].map(a=>(
                      <button key={a} style={{ width:"100%", padding:"10px 12px", background:T.s2, border:`1px solid ${T.border}`, borderRadius:8, color:T.mutedL, fontSize:13, cursor:"pointer", textAlign:"left", marginBottom:8, fontFamily:font }}>
                        {a}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── TAB: ANALYTICS ─────────────────────────────────────── */}
          {tab==="analytics"&&(
            <div style={{ padding:"24px 28px" }}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:14 }}>

                {/* Form metric breakdown across all clients */}
                <div style={{ ...card(false) }}>
                  <div style={{ ...lbl, marginBottom:6 }}>Cohort Form Breakdown</div>
                  <div style={{ fontSize:11, color:T.muted, marginBottom:16 }}>Average across all active clients</div>
                  {Object.entries(CLIENT_METRICS).map(([key,{label,avg}])=>{
                    const col=scoreColor(avg);
                    return(
                      <div key={key} style={{ marginBottom:14 }}>
                        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                          <span style={{ fontSize:13, color:T.mutedL }}>{label}</span>
                          <span style={{ fontSize:13, fontWeight:700, color:col }}>{avg}/100</span>
                        </div>
                        <MiniBar value={avg} color={col}/>
                      </div>
                    );
                  })}
                </div>

                {/* Plan distribution */}
                <div style={{ ...card(false) }}>
                  <div style={{ ...lbl, marginBottom:6 }}>Plan Distribution</div>
                  <div style={{ fontSize:11, color:T.muted, marginBottom:20 }}>Clients by subscription tier</div>
                  {["Elite","Pro","Starter"].map(plan=>{
                    const count=CLIENTS.filter(c=>c.plan===plan).length;
                    const pct=Math.round((count/CLIENTS.length)*100);
                    const col=plan==="Elite"?T.gold:plan==="Pro"?T.blue:T.muted;
                    return(
                      <div key={plan} style={{ marginBottom:14 }}>
                        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                            <div style={{ width:8, height:8, borderRadius:"50%", background:col }}/>
                            <span style={{ fontSize:13, color:T.mutedL }}>{plan}</span>
                          </div>
                          <span style={{ fontSize:13, color:T.text, fontWeight:700 }}>{count} client{count!==1?"s":""} ({pct}%)</span>
                        </div>
                        <MiniBar value={pct} color={col}/>
                      </div>
                    );
                  })}
                  {/* Revenue estimate */}
                  <div style={{ marginTop:20, padding:"12px", background:T.s2, borderRadius:8 }}>
                    <div style={{ ...lbl, marginBottom:8 }}>Est. Monthly Revenue</div>
                    <div style={{ fontSize:28, fontWeight:900, color:T.accent }}>
                      ${(CLIENTS.filter(c=>c.plan==="Elite").length*79+CLIENTS.filter(c=>c.plan==="Pro").length*49+CLIENTS.filter(c=>c.plan==="Starter").length*29).toLocaleString()}
                    </div>
                    <div style={{ fontSize:11, color:T.muted, marginTop:4 }}>Elite $79 · Pro $49 · Starter $29</div>
                  </div>
                </div>
              </div>

              {/* Leaderboard */}
              <div style={{ ...card(false) }}>
                <div style={{ ...lbl, marginBottom:16 }}>Client Leaderboard</div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12 }}>
                  {[...CLIENTS].sort((a,b)=>b.score-a.score).map((c,i)=>{
                    const col=i===0?T.gold:i===1?T.mutedL:i===2?"#CD7F32":scoreColor(c.score);
                    return(
                      <div key={c.id} className="card-hover" onClick={()=>setSelectedClient(c)}
                        style={{ background:T.s2, borderRadius:10, padding:"14px 12px", cursor:"pointer", textAlign:"center", border:`1px solid ${i<3?col+"40":T.border}` }}>
                        <div style={{ fontSize:i<3?22:16, fontWeight:900, color:col, marginBottom:6 }}>#{i+1}</div>
                        <Avatar initials={c.avatar} size={36} color={col}/>
                        <div style={{ fontSize:12, color:T.text, fontWeight:600, marginTop:8, marginBottom:2 }}>{c.name.split(" ")[0]}</div>
                        <div style={{ fontSize:20, fontWeight:900, color:scoreColor(c.score) }}>{c.score}</div>
                        <div style={{ fontSize:10, color:T.muted, marginTop:2 }}>{c.sessions} sessions</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}


          {/* ── TAB: SETTINGS ──────────────────────────────────────── */}
          {tab==="settings"&&(
            <div style={{ padding:"24px 28px" }}>
              <div style={{ display:"grid", gridTemplateColumns:"1.4fr 1fr", gap:14 }}>

                {/* ── Profile editor ── */}
                <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
                  <div style={{ ...card(false) }}>
                    <div style={{ ...lbl, marginBottom:18 }}>Trainer Profile</div>

                    {/* Photo preview */}
                    <div style={{ display:"flex", alignItems:"center", gap:16, marginBottom:20 }}>
                      <img src={profile.photo} alt={profile.name}
                        onError={e=>{e.target.style.display="none";}}
                        style={{ width:72, height:72, borderRadius:"50%", objectFit:"cover",
                          objectPosition:"center top", border:`3px solid ${profile.accent||T.accent}` }}/>
                      <div>
                        <div style={{ fontSize:14, fontWeight:700, color:T.text }}>{profile.name}</div>
                        <div style={{ fontSize:12, color:T.muted, marginTop:2 }}>{profile.tagline}</div>
                        <div style={{ fontSize:11, color:T.accent, marginTop:4 }}>
                          {PLANS[profile.plan]?.name||"Pro"} Plan · {CURRENCIES[profile.currency]?.flag} {profile.currency}
                        </div>
                      </div>
                    </div>

                    {/* Fields */}
                    {[
                      { label:"Display Name",    key:"name",    type:"text",  ph:"Coach Adams" },
                      { label:"Photo URL",       key:"photo",   type:"text",  ph:"https://... or /photoadams.jpg" },
                      { label:"Tagline",         key:"tagline", type:"text",  ph:"Strength & Conditioning Coach" },
                      { label:"Email",           key:"email",   type:"email", ph:"you@email.com" },
                    ].map(({label:fl,key,type,ph})=>(
                      <div key={key} style={{ marginBottom:14 }}>
                        <div style={{ fontSize:10, color:T.muted, letterSpacing:1.5, textTransform:"uppercase", marginBottom:6 }}>{fl}</div>
                        <input value={profile[key]||""} type={type} placeholder={ph}
                          onChange={e=>{setProfile(p=>({...p,[key]:e.target.value}));setProfileDirty(true);}}
                          style={{ width:"100%", padding:"10px 12px", background:T.s2,
                            border:`1px solid ${T.border}`, borderRadius:7, color:T.text,
                            fontSize:13, fontFamily:font, boxSizing:"border-box" }}/>
                      </div>
                    ))}

                    {/* Welcome message */}
                    <div style={{ marginBottom:14 }}>
                      <div style={{ fontSize:10, color:T.muted, letterSpacing:1.5, textTransform:"uppercase", marginBottom:6 }}>Client Welcome Message</div>
                      <textarea value={profile.welcome||""} rows={3}
                        onChange={e=>{setProfile(p=>({...p,welcome:e.target.value}));setProfileDirty(true);}}
                        placeholder="Message clients see when they open their invite..."
                        style={{ width:"100%", padding:"10px 12px", background:T.s2,
                          border:`1px solid ${T.border}`, borderRadius:7, color:T.text,
                          fontSize:13, fontFamily:font, resize:"vertical", boxSizing:"border-box" }}/>
                    </div>

                    {/* Accent colour */}
                    <div style={{ marginBottom:20 }}>
                      <div style={{ fontSize:10, color:T.muted, letterSpacing:1.5, textTransform:"uppercase", marginBottom:8 }}>Brand Colour</div>
                      <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
                        {["#00E676","#3D8EF0","#F5A623","#9B6DFF","#FF4757","#FF6B6B","#00CEC9","#FDCB6E"].map(col=>(
                          <div key={col} onClick={()=>{setProfile(p=>({...p,accent:col}));setProfileDirty(true);}}
                            style={{ width:28, height:28, borderRadius:"50%", background:col, cursor:"pointer",
                              border:`3px solid ${profile.accent===col?"#fff":"transparent"}`,
                              boxShadow:profile.accent===col?`0 0 0 1px ${col}`:"none",
                              transition:"all .15s" }}/>
                        ))}
                      </div>
                    </div>

                    <button onClick={saveProfile} style={{
                      width:"100%", padding:"12px", fontWeight:700, fontSize:14,
                      background:profileSaved?T.accentDim:(profileDirty?T.accent:T.s2),
                      color:profileSaved?T.accent:(profileDirty?"#000":T.muted),
                      border:`1px solid ${profileSaved?T.accent:T.border}`,
                      borderRadius:8, cursor:"pointer", fontFamily:font, transition:"all .2s",
                    }}>
                      {profileSaved?"✓ Profile Saved!":profileDirty?"Save Changes":"No Changes"}
                    </button>
                  </div>
                </div>

                {/* ── Right col: Plan + Currency ── */}
                <div style={{ display:"flex", flexDirection:"column", gap:14 }}>

                  {/* Base currency */}
                  <div style={{ ...card(false) }}>
                    <div style={{ ...lbl, marginBottom:14 }}>Base Currency</div>
                    <div style={{ fontSize:12, color:T.muted, marginBottom:14, lineHeight:1.6 }}>
                      Sets the currency for your subscription and client invoices.<br/>
                      African currencies use <strong style={{color:"#00C3FF"}}>Paystack</strong>. All others use <strong style={{color:"#635BFF"}}>Stripe</strong>.
                    </div>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, maxHeight:300, overflowY:"auto" }}>
                      {Object.entries(CURRENCIES).map(([code,{name,flag,gateway}])=>(
                        <div key={code} onClick={()=>{setProfile(p=>({...p,currency:code}));setProfileDirty(true);}}
                          style={{
                            padding:"8px 10px", borderRadius:8, cursor:"pointer",
                            background:profile.currency===code?T.s3:T.s2,
                            border:`1px solid ${profile.currency===code?T.accent:T.border}`,
                            transition:"all .15s",
                          }}>
                          <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:2 }}>
                            <span style={{ fontSize:14 }}>{flag}</span>
                            <span style={{ fontSize:12, fontWeight:700, color:profile.currency===code?T.accent:T.text }}>{code}</span>
                            <span style={{ fontSize:9, color:gateway==="paystack"?"#00C3FF":"#635BFF",
                              background:gateway==="paystack"?"#00C3FF18":"#635BFF18",
                              padding:"1px 5px", borderRadius:3, fontWeight:700, marginLeft:"auto" }}>
                              {gateway==="paystack"?"PS":"ST"}
                            </span>
                          </div>
                          <div style={{ fontSize:10, color:T.muted }}>{name}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Subscription plan */}
                  <div style={{ ...card(false) }}>
                    <div style={{ ...lbl, marginBottom:14 }}>Subscription Plan</div>
                    <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                      {Object.entries(PLANS).map(([key,plan])=>{
                        const isActive = profile.plan===key;
                        const price = formatPrice(plan.usd, profile.currency);
                        return(
                          <div key={key} style={{
                            padding:"12px", borderRadius:9, cursor:"pointer",
                            background:isActive?T.accentDim:T.s2,
                            border:`1px solid ${isActive?T.accent:T.border}`,
                            transition:"all .15s",
                          }}>
                            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                              <div style={{ fontSize:14, fontWeight:700, color:isActive?T.accent:T.text }}>{plan.name}</div>
                              <div style={{ fontSize:16, fontWeight:900, color:isActive?T.accent:T.mutedL }}>{price}<span style={{ fontSize:10, color:T.muted }}>/mo</span></div>
                            </div>
                            <div style={{ fontSize:11, color:T.muted, marginBottom:isActive?0:8 }}>Up to {plan.clients===999?"unlimited":plan.clients} clients</div>
                            {!isActive&&(
                              <button onClick={()=>{setPaymentPlan(key);setShowPayment(true);}}
                                style={{ width:"100%", padding:"8px", background:T.accent,
                                  color:"#000", border:"none", borderRadius:6, fontWeight:700,
                                  fontSize:12, cursor:"pointer", fontFamily:font, marginTop:6 }}>
                                Upgrade to {plan.name}
                              </button>
                            )}
                            {isActive&&<div style={{ fontSize:11, color:T.accent, fontWeight:700 }}>✓ Current plan</div>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Client drawer */}
      {selectedClient&&<ClientDrawer client={selectedClient} onClose={()=>setSelectedClient(null)}/>}

      {/* Invite manager modal */}
      {inviteClient&&(
        <InviteManager
          client={inviteClient}
          trainerSlug={profile.slug||"adams"}
          baseUrl={baseUrl}
          onClose={()=>setInviteClient(null)}
        />
      )}

      {/* Payment modal */}
      {showPayment&&(
        <PaymentModal
          plan={paymentPlan}
          currency={profile.currency||"NGN"}
          trainerEmail={profile.email}
          onClose={()=>setShowPayment(false)}
          onSuccess={({plan})=>{
            setProfile(p=>({...p,plan}));
            saveTrainerProfile(profile.slug||"adams",{...profile,plan});
            setShowPayment(false);
          }}
        />
      )}
    </div>
  );
}
