import { useState, useEffect } from "react";
import {
  listenChallenges, joinChallenge, submitChallengeProgress,
  listenChallengeLeaderboard, isFirebaseReady,
} from "./firebase";

const C = {
  bg:"#07080A", surface:"#0E1014", s2:"#141619", s3:"#1C1F24",
  border:"#23262D", accent:"#00E676", gold:"#F5A623", blue:"#3D8EF0",
  purple:"#9B6DFF", danger:"#FF4757", text:"#F0F2F5", muted:"#6B7280", mutedL:"#9CA3AF",
};

const font = "system-ui,-apple-system,'Segoe UI',sans-serif";

const mc = (v) => v>=80?C.accent:v>=60?C.gold:C.danger;
const grade = (s) => s>=90?"S":s>=82?"A+":s>=75?"A":s>=65?"B":s>=55?"C":"D";

// ── Helpers ───────────────────────────────────────────────────
const loadSessions = () => { try { return JSON.parse(localStorage.getItem("fiq_sessions")||"[]"); } catch { return []; } };
const getUserPlan  = () => localStorage.getItem("fiq_user_plan")||"free";
const getUserId    = () => { let id=localStorage.getItem("fiq_uid"); if(!id){id=Math.random().toString(36).slice(2);localStorage.setItem("fiq_uid",id);} return id; };
const getUserName  = () => localStorage.getItem("fiq_name")||"Anonymous";
const getReferralCode = () => { let c=localStorage.getItem("fiq_referral_code"); if(!c){c="FIQ"+Math.random().toString(36).slice(2,8).toUpperCase();localStorage.setItem("fiq_referral_code",c);} return c; };

// ── Stat card ──────────────────────────────────────────────────
function StatCard({label,value,sub,icon,color=C.accent}){
  return(
    <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:"16px 18px",position:"relative",overflow:"hidden"}}>
      <div style={{position:"absolute",top:0,left:0,width:3,height:"100%",background:color,borderRadius:"12px 0 0 12px"}}/>
      <div style={{paddingLeft:8}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
          <div style={{fontSize:10,color:C.muted,letterSpacing:3,textTransform:"uppercase",fontWeight:700}}>{label}</div>
          <div style={{fontSize:20,opacity:.5}}>{icon}</div>
        </div>
        <div style={{fontSize:32,fontWeight:900,color,letterSpacing:-1.5,lineHeight:1}}>{value}</div>
        {sub&&<div style={{fontSize:11,color:C.muted,marginTop:6}}>{sub}</div>}
      </div>
    </div>
  );
}

// ── Challenge Card ─────────────────────────────────────────────
function ChallengeCard({challenge,onJoin,onView,userId,userName}){
  const [joined,setJoined]=useState(()=>!!localStorage.getItem(`fiq_ch_${challenge.id}`));
  const [joining,setJoining]=useState(false);
  const daysLeft = challenge.endDate
    ? Math.max(0,Math.ceil((new Date(challenge.endDate)-new Date())/86400000))
    : 30;
  const prize = challenge.prize||"Free Pro access · 30 days";
  const col = challenge.tier==="elite"?C.gold:challenge.tier==="pro"?C.blue:C.accent;

  const handleJoin = async()=>{
    setJoining(true);
    await joinChallenge(challenge.id, userId, userName);
    localStorage.setItem(`fiq_ch_${challenge.id}`,"1");
    setJoined(true);setJoining(false);
  };

  return(
    <div style={{background:C.surface,border:`1px solid ${col}30`,borderRadius:14,overflow:"hidden",transition:"all .2s"}}>
      {/* Header strip */}
      <div style={{height:4,background:`linear-gradient(90deg,${col},${col}44)`}}/>
      <div style={{padding:"18px"}}>
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:12}}>
          <div style={{flex:1}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
              <span style={{fontSize:20}}>{challenge.icon||"🏆"}</span>
              <span style={{fontSize:14,fontWeight:800,color:C.text}}>{challenge.title}</span>
            </div>
            <div style={{fontSize:12,color:C.muted,lineHeight:1.6}}>{challenge.description}</div>
          </div>
          <div style={{fontSize:11,fontWeight:700,color:col,background:`${col}18`,border:`1px solid ${col}40`,padding:"2px 10px",borderRadius:20,marginLeft:10,whiteSpace:"nowrap",textTransform:"uppercase",letterSpacing:1}}>
            {challenge.tier||"All"} tier
          </div>
        </div>

        {/* Stats row */}
        <div style={{display:"flex",gap:0,background:C.s2,borderRadius:8,marginBottom:14,overflow:"hidden"}}>
          {[
            {l:"Duration",v:`${challenge.duration||30} days`},
            {l:"Days left",v:daysLeft>0?`${daysLeft}d`:"Ended",col:daysLeft<=3?C.danger:undefined},
            {l:"Participants",v:challenge.participants||0},
          ].map(({l,v,col:vc},i)=>(
            <div key={l} style={{flex:1,padding:"8px 10px",textAlign:"center",borderRight:i<2?`1px solid ${C.border}`:"none"}}>
              <div style={{fontSize:9,color:C.muted,letterSpacing:1.5,textTransform:"uppercase",marginBottom:3}}>{l}</div>
              <div style={{fontSize:14,fontWeight:700,color:vc||C.text}}>{v}</div>
            </div>
          ))}
        </div>

        {/* Prize */}
        <div style={{display:"flex",alignItems:"center",gap:8,background:`${col}10`,border:`1px solid ${col}25`,borderRadius:8,padding:"8px 12px",marginBottom:14}}>
          <span style={{fontSize:16}}>🎁</span>
          <div>
            <div style={{fontSize:10,color:col,fontWeight:700,letterSpacing:1.5,textTransform:"uppercase"}}>Prize</div>
            <div style={{fontSize:12,color:C.mutedL}}>{prize}</div>
          </div>
        </div>

        {/* Actions */}
        <div style={{display:"flex",gap:8}}>
          <button onClick={onView} style={{flex:1,padding:"9px",background:C.s2,color:C.mutedL,border:`1px solid ${C.border}`,borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:600,fontFamily:font}}>
            View Leaderboard
          </button>
          {!joined?(
            <button onClick={handleJoin} disabled={joining} style={{flex:1,padding:"9px",background:joining?C.s2:col,color:joining?C.muted:"#000",border:"none",borderRadius:8,cursor:joining?"default":"pointer",fontSize:12,fontWeight:800,fontFamily:font}}>
              {joining?"Joining...":"Join Challenge"}
            </button>
          ):(
            <button onClick={()=>onView(challenge)} style={{flex:1,padding:"9px",background:`${col}20`,color:col,border:`1px solid ${col}40`,borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:700,fontFamily:font}}>
              ✓ Joined · Log Progress
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Leaderboard Modal ──────────────────────────────────────────
function LeaderboardModal({challenge,userId,userName,onClose}){
  const [entries,setEntries]=useState([]);
  const [progress,setProgress]=useState("");
  const [submitting,setSubmitting]=useState(false);
  const [submitted,setSubmitted]=useState(false);
  const joined = !!localStorage.getItem(`fiq_ch_${challenge.id}`);
  const col = challenge.tier==="elite"?C.gold:challenge.tier==="pro"?C.blue:C.accent;

  useEffect(()=>{
    const unsub = listenChallengeLeaderboard(challenge.id, setEntries);
    return ()=>unsub();
  },[challenge.id]);

  const handleSubmit = async()=>{
    const val = parseInt(progress);
    if(isNaN(val)||val<0) return;
    setSubmitting(true);
    await submitChallengeProgress(challenge.id, userId, userName, val);
    setSubmitted(true);setSubmitting(false);
    setTimeout(()=>setSubmitted(false),2000);
    setProgress("");
  };

  return(
    <div style={{position:"fixed",inset:0,background:"#000000E8",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:20,fontFamily:font}}>
      <div style={{background:C.surface,border:`1px solid ${col}40`,borderRadius:16,width:"100%",maxWidth:480,maxHeight:"88vh",display:"flex",flexDirection:"column",overflow:"hidden"}}>
        {/* Header */}
        <div style={{padding:"18px 20px",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
          <div>
            <div style={{fontSize:16,fontWeight:800,color:C.text}}>{challenge.icon} {challenge.title}</div>
            <div style={{fontSize:11,color:C.muted,marginTop:2}}>🎁 {challenge.prize||"Free Pro access · 30 days"}</div>
          </div>
          <button onClick={onClose} style={{background:"transparent",border:"none",color:C.muted,cursor:"pointer",fontSize:20}}>✕</button>
        </div>

        {/* Log progress (if joined) */}
        {joined&&(
          <div style={{padding:"14px 20px",borderBottom:`1px solid ${C.border}`,background:C.s2,flexShrink:0}}>
            <div style={{fontSize:10,color:C.muted,letterSpacing:2,textTransform:"uppercase",marginBottom:8}}>Log Your Progress</div>
            <div style={{display:"flex",gap:8}}>
              <input type="number" min="0" value={progress} onChange={e=>setProgress(e.target.value)}
                placeholder={challenge.unit==="score"?"Enter form score (0–100)":"Enter reps completed"}
                style={{flex:1,padding:"9px 12px",background:C.s3,border:`1px solid ${C.border}`,borderRadius:8,color:C.text,fontSize:13,fontFamily:font,outline:"none"}}/>
              <button onClick={handleSubmit} disabled={submitting||!progress} style={{padding:"9px 18px",background:submitted?`${C.accent}30`:col,color:submitted?C.accent:"#000",border:submitted?`1px solid ${C.accent}`:"none",borderRadius:8,fontWeight:700,cursor:"pointer",fontSize:13,fontFamily:font,whiteSpace:"nowrap"}}>
                {submitted?"✓ Saved!":submitting?"...":"Submit"}
              </button>
            </div>
          </div>
        )}

        {/* Leaderboard */}
        <div style={{flex:1,overflowY:"auto",padding:"14px 20px"}}>
          <div style={{fontSize:10,color:C.muted,letterSpacing:2,textTransform:"uppercase",marginBottom:12}}>Leaderboard</div>
          {entries.length===0?(
            <div style={{textAlign:"center",padding:"30px 0",color:C.muted}}>
              <div style={{fontSize:32,marginBottom:8}}>🏆</div>
              <div style={{fontSize:13}}>No entries yet — be the first!</div>
            </div>
          ):entries.map((e,i)=>{
            const medalCol=i===0?C.gold:i===1?C.mutedL:i===2?"#CD7F32":C.muted;
            const isMe=e.userId===userId;
            return(
              <div key={e.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 12px",borderRadius:10,marginBottom:6,background:isMe?`${col}15`:C.s2,border:isMe?`1px solid ${col}40`:`1px solid ${C.border}`}}>
                <div style={{fontSize:i<3?20:14,fontWeight:900,color:medalCol,width:24,textAlign:"center"}}>{i<3?["🥇","🥈","🥉"][i]:`#${i+1}`}</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:700,color:C.text}}>{e.userName}{isMe&&" (you)"}</div>
                </div>
                <div style={{fontSize:18,fontWeight:900,color:col}}>{e.progress}</div>
                <div style={{fontSize:10,color:C.muted}}>{challenge.unit||"reps"}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// MAIN USER DASHBOARD
// ══════════════════════════════════════════════════════════════
export default function UserDashboard({ onBack, onStartSession }) {
  const [tab,setTab]           = useState("overview");
  const [sessions,setSessions] = useState([]);
  const [challenges,setChallenges] = useState([]);
  const [viewChallenge,setViewChallenge] = useState(null);
  const [refCopied,setRefCopied] = useState(false);

  // Profile state
  const [profile,setProfile] = useState(()=>{
    try{ return JSON.parse(localStorage.getItem("fiq_profile")||"null"); }catch{ return null; }
  });
  const [profileForm,setProfileForm] = useState(()=>({
    name:        localStorage.getItem("fiq_name")||"",
    email:       localStorage.getItem("fiq_email")||"",
    location:    localStorage.getItem("fiq_location")||"",
    goal:        localStorage.getItem("fiq_goal")||"Strength",
    experience:  localStorage.getItem("fiq_experience")||"beginner",
    bio:         localStorage.getItem("fiq_bio")||"",
    photoUrl:    localStorage.getItem("fiq_photo_url")||"",
    plan:        getUserPlan(),
  }));
  const [profileSaved,setProfileSaved] = useState(false);

  const userId   = getUserId();
  const userName = getUserName();
  const userPlan = getUserPlan();
  const refCode  = getReferralCode();

  useEffect(()=>{ setSessions(loadSessions()); },[]);

  useEffect(()=>{
    const unsub = listenChallenges(list => {
      // Show public challenges + plan-gated ones
      setChallenges(list.length > 0 ? list : DEMO_CHALLENGES);
    });
    return ()=>unsub();
  },[]);

  // ── Computed stats ─────────────────────────────────────────
  const totalSessions = sessions.length;
  const avgScore = totalSessions
    ? Math.round(sessions.reduce((s,e)=>s+e.score,0)/totalSessions) : 0;
  const bestScore = totalSessions ? Math.max(...sessions.map(s=>s.score)) : 0;
  const totalReps = sessions.reduce((s,e)=>s+(e.totalReps||0),0);
  const scores    = sessions.slice(0,10).reverse().map(s=>s.score);

  // Streak calculation
  const streak = (() => {
    if(!sessions.length) return 0;
    let s=0, prev=new Date();
    for(const sess of sessions){
      const d=new Date(sess.date);
      const diff=Math.floor((prev-d)/86400000);
      if(diff<=1){s++;prev=d;}else break;
    }
    return s;
  })();

  // Metric averages
  const metricAvgs = ["kneeAlignment","spineNeutrality","squatDepth","tempoConsistency","hipHinge"].map(k=>({
    key:k,
    label:{kneeAlignment:"Knee Alignment",spineNeutrality:"Spine Neutrality",squatDepth:"Squat Depth",tempoConsistency:"Tempo Control",hipHinge:"Hip Hinge"}[k],
    avg: totalSessions ? Math.round(sessions.reduce((s,e)=>s+(e.avgMetrics?.[k]||0),0)/totalSessions) : 0,
  }));

  const copyRef = async()=>{
    const link = `https://formiq.name.ng/ref/${refCode}`;
    try{ await navigator.clipboard.writeText(link); setRefCopied(true); setTimeout(()=>setRefCopied(false),2000); }catch{ alert(link); }
  };

  const saveProfile = () => {
    localStorage.setItem("fiq_name",       profileForm.name);
    localStorage.setItem("fiq_email",      profileForm.email);
    localStorage.setItem("fiq_location",   profileForm.location);
    localStorage.setItem("fiq_goal",       profileForm.goal);
    localStorage.setItem("fiq_experience", profileForm.experience);
    localStorage.setItem("fiq_bio",        profileForm.bio);
    localStorage.setItem("fiq_photo_url",  profileForm.photoUrl);
    localStorage.setItem("fiq_profile",    JSON.stringify(profileForm));
    setProfile(profileForm);
    setProfileSaved(true);
    setTimeout(()=>setProfileSaved(false),2500);
  };

  const NAV=[
    {id:"overview",  icon:"◈", label:"Overview"},
    {id:"progress",  icon:"◬", label:"Progress"},
    {id:"challenges",icon:"🏆", label:"Challenges"},
    {id:"referrals", icon:"🎁", label:"Referrals"},
    {id:"profile",   icon:"👤", label:"My Profile"},
  ];

  const lbl={fontSize:9,letterSpacing:3,color:C.muted,textTransform:"uppercase",fontWeight:700};
  const card=(ac)=>({background:C.surface,border:`1px solid ${ac?C.accent+"30":C.border}`,borderRadius:12,padding:"16px 18px"});

  return(
    <div style={{background:C.bg,color:C.text,minHeight:"100vh",fontFamily:font,display:"flex"}}>
      <style>{`
        *{box-sizing:border-box}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:#2E323A;border-radius:2px}
        .nav-btn:hover{background:${C.s2}!important;color:${C.text}!important}
        .card-h:hover{border-color:#2E323A!important;transform:translateY(-1px);transition:all .2s}
        input:focus{border-color:${C.accent}50!important;outline:none}
      `}</style>

      {/* ── SIDEBAR ── */}
      <div style={{width:220,background:C.surface,borderRight:`1px solid ${C.border}`,display:"flex",flexDirection:"column",flexShrink:0,position:"sticky",top:0,height:"100vh"}}>
        {/* Logo */}
        <div style={{padding:"20px 16px 16px",borderBottom:`1px solid ${C.border}`}}>
          <img src={`${process.env.PUBLIC_URL}/formIQ.png`} alt="FormIQ" style={{width:"100%",height:"auto",objectFit:"contain",display:"block",marginBottom:6}}/>
          <div style={{fontSize:9,color:C.muted,letterSpacing:2,textTransform:"uppercase",textAlign:"center"}}>My Dashboard</div>
        </div>

        {/* User profile card */}
        <div style={{margin:"14px 12px",background:C.s2,borderRadius:12,padding:"14px"}}>
          <div style={{width:52,height:52,borderRadius:"50%",background:`${C.accent}20`,border:`2px solid ${C.accent}55`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,fontWeight:700,color:C.accent,margin:"0 auto 10px"}}>
            {(userName[0]||"?").toUpperCase()}
          </div>
          <div style={{textAlign:"center"}}>
            <div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:3}}>{userName||"Athlete"}</div>
            <div style={{display:"inline-block",fontSize:9,fontWeight:800,letterSpacing:2,color:userPlan==="elite"?C.gold:userPlan==="pro"?C.blue:C.accent,background:userPlan==="elite"?`${C.gold}18`:userPlan==="pro"?`${C.blue}18`:`${C.accent}18`,padding:"2px 10px",borderRadius:20,textTransform:"uppercase"}}>
              {userPlan} plan
            </div>
          </div>
          <div style={{display:"flex",gap:0,marginTop:12}}>
            {[{l:"Sessions",v:totalSessions},{l:"Best",v:bestScore||"—"},{l:"Streak",v:`${streak}d`}].map(({l,v},i)=>(
              <div key={l} style={{flex:1,textAlign:"center",borderRight:i<2?`1px solid ${C.border}`:"none"}}>
                <div style={{fontSize:9,color:C.muted,letterSpacing:1,textTransform:"uppercase",marginBottom:2}}>{l}</div>
                <div style={{fontSize:14,fontWeight:700,color:C.text}}>{v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Nav */}
        <nav style={{flex:1,padding:"4px 10px"}}>
          {NAV.map(({id,icon,label})=>(
            <button key={id} className="nav-btn" onClick={()=>setTab(id)} style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"10px 12px",background:tab===id?C.s2:"transparent",border:"none",borderRadius:8,cursor:"pointer",color:tab===id?C.accent:C.muted,fontWeight:tab===id?700:500,fontSize:13,marginBottom:2,fontFamily:font,textAlign:"left",borderLeft:tab===id?`2px solid ${C.accent}`:"2px solid transparent"}}>
              <span style={{fontSize:16}}>{icon}</span>{label}
            </button>
          ))}
        </nav>

        {/* Back */}
        <div style={{padding:"12px 10px",borderTop:`1px solid ${C.border}`}}>
          <button onClick={onBack} className="nav-btn" style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"10px 12px",background:"transparent",border:"none",borderRadius:8,cursor:"pointer",color:C.muted,fontSize:13,fontFamily:font,textAlign:"left"}}>
            <span>←</span> Back to App
          </button>
        </div>
      </div>

      {/* ── MAIN ── */}
      <div style={{flex:1,overflow:"auto"}}>

        {/* Top bar */}
        <div style={{background:C.surface,borderBottom:`1px solid ${C.border}`,padding:"14px 28px",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:10}}>
          <div>
            <div style={{fontSize:18,fontWeight:700,color:C.text}}>{NAV.find(n=>n.id===tab)?.label}</div>
            <div style={{fontSize:12,color:C.muted,marginTop:1}}>{new Date().toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long"})}</div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{fontSize:11,color:isFirebaseReady()?C.accent:C.gold,display:"flex",alignItems:"center",gap:4}}>
              <div style={{width:6,height:6,borderRadius:"50%",background:isFirebaseReady()?C.accent:C.gold}}/>
              {isFirebaseReady()?"Live":"Offline"}
            </div>
            <button onClick={onStartSession} style={{background:C.accent,color:"#000",border:"none",borderRadius:8,padding:"9px 18px",cursor:"pointer",fontWeight:700,fontSize:13,fontFamily:font,display:"flex",alignItems:"center",gap:6}}>
              🏋️ New Session
            </button>
          </div>
        </div>

        {/* ── OVERVIEW ── */}
        {tab==="overview"&&(
          <div style={{padding:"24px 28px"}}>
            {totalSessions===0?(
              <div style={{...card(true),textAlign:"center",padding:"48px 24px",background:"#071510",marginBottom:20}}>
                <div style={{fontSize:48,marginBottom:16}}>🏋️</div>
                <div style={{fontSize:20,fontWeight:700,color:C.text,marginBottom:8}}>No sessions yet</div>
                <div style={{fontSize:13,color:C.muted,marginBottom:24,lineHeight:1.7}}>Complete your first session in the AI Squat Coach to see your progress dashboard come to life.</div>
                <button onClick={onStartSession} style={{padding:"12px 28px",background:C.accent,color:"#000",border:"none",borderRadius:9,fontWeight:700,fontSize:14,cursor:"pointer",fontFamily:font}}>Start First Session →</button>
              </div>
            ):(
              <>
                <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:24}}>
                  <StatCard label="Sessions" value={totalSessions} sub="total completed" icon="◉" color={C.accent}/>
                  <StatCard label="Avg Score" value={avgScore} sub={`Grade ${grade(avgScore)}`} icon="◬" color={mc(avgScore)}/>
                  <StatCard label="Best Score" value={bestScore} sub={`Grade ${grade(bestScore)}`} icon="🏆" color={C.gold}/>
                  <StatCard label="Total Reps" value={totalReps.toLocaleString()} sub="across all sessions" icon="💪" color={C.purple}/>
                </div>

                {/* Score trend */}
                <div style={{...card(false),marginBottom:14}}>
                  <div style={{...lbl,marginBottom:14}}>Score Trend — Last {scores.length} Sessions</div>
                  {scores.length>=2?(
                    <div style={{position:"relative"}}>
                      {/* Y-axis */}
                      <div style={{display:"flex",gap:0,alignItems:"flex-end",height:80,paddingBottom:0}}>
                        {scores.map((s,i)=>{
                          const h=Math.max(8,Math.round((s/100)*72));
                          const col=mc(s);
                          return(
                            <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                              <div style={{width:"70%",height:h,background:col,borderRadius:"4px 4px 0 0",transition:"height .5s ease"}}/>
                            </div>
                          );
                        })}
                      </div>
                      <div style={{display:"flex",gap:0,marginTop:4}}>
                        {scores.map((_,i)=>(
                          <div key={i} style={{flex:1,textAlign:"center",fontSize:9,color:C.muted}}>S{i+1}</div>
                        ))}
                      </div>
                    </div>
                  ):<div style={{fontSize:12,color:C.muted}}>Complete more sessions to see your trend</div>}
                </div>

                {/* Recent sessions */}
                <div style={{...card(false)}}>
                  <div style={{...lbl,marginBottom:14}}>Recent Sessions</div>
                  {sessions.slice(0,5).map((s,i)=>(
                    <div key={s.id||i} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 8px",borderBottom:i<4?`1px solid ${C.border}`:"none"}}>
                      <div style={{width:40,height:40,borderRadius:8,background:mc(s.score)+"18",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:900,color:mc(s.score)}}>
                        {s.score}
                      </div>
                      <div style={{flex:1}}>
                        <div style={{fontSize:13,color:C.text,fontWeight:600}}>Grade {grade(s.score)} · {s.totalSets||3} sets · {s.totalReps||30} reps</div>
                        <div style={{fontSize:11,color:C.muted}}>{new Date(s.date).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"})}</div>
                      </div>
                      {s.usedPose&&<div style={{fontSize:9,background:`${C.accent}18`,color:C.accent,padding:"2px 7px",borderRadius:4,fontWeight:700}}>POSE</div>}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── PROGRESS ── */}
        {tab==="progress"&&(
          <div style={{padding:"24px 28px"}}>
            {totalSessions===0?(
              <div style={{...card(false),textAlign:"center",padding:"48px"}}>
                <div style={{fontSize:32,marginBottom:12}}>📊</div>
                <div style={{fontSize:15,color:C.mutedL}}>Complete sessions to track your form progress</div>
              </div>
            ):(
              <>
                <div style={{...card(false),marginBottom:14}}>
                  <div style={{...lbl,marginBottom:18}}>Form Metric Averages</div>
                  {metricAvgs.map(({key,label,avg:av})=>(
                    <div key={key} style={{marginBottom:14}}>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                        <span style={{fontSize:13,color:C.mutedL}}>{label}</span>
                        <span style={{fontSize:13,fontWeight:700,color:mc(av)}}>{av}/100</span>
                      </div>
                      <div style={{height:6,background:C.s2,borderRadius:3,overflow:"hidden"}}>
                        <div style={{height:"100%",width:`${av}%`,background:mc(av),borderRadius:3,transition:"width .8s ease"}}/>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Personal bests */}
                <div style={{...card(false),marginBottom:14}}>
                  <div style={{...lbl,marginBottom:14}}>Personal Bests</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
                    {[
                      {label:"Best Session",value:bestScore,suffix:"/100",col:C.gold},
                      {label:"Most Sets",value:Math.max(...sessions.map(s=>s.totalSets||0)),suffix:" sets",col:C.blue},
                      {label:"Most Reps",value:Math.max(...sessions.map(s=>s.totalReps||0)),suffix:" reps",col:C.purple},
                    ].map(({label,value,suffix,col})=>(
                      <div key={label} style={{background:C.s2,borderRadius:10,padding:"14px",textAlign:"center"}}>
                        <div style={{fontSize:9,color:C.muted,letterSpacing:2,textTransform:"uppercase",marginBottom:8}}>{label}</div>
                        <div style={{fontSize:26,fontWeight:900,color:col}}>{value}<span style={{fontSize:13,color:C.muted}}>{suffix}</span></div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* All sessions table */}
                <div style={{...card(false)}}>
                  <div style={{...lbl,marginBottom:14}}>All Sessions ({totalSessions})</div>
                  <div style={{display:"grid",gridTemplateColumns:"1.5fr 1fr 1fr 1fr 0.8fr",gap:8,padding:"6px 8px",background:C.s2,borderRadius:6,marginBottom:8}}>
                    {["Date","Score","Sets","Reps","Pose"].map(h=>(
                      <div key={h} style={{fontSize:9,color:C.muted,fontWeight:700,letterSpacing:1.5,textTransform:"uppercase"}}>{h}</div>
                    ))}
                  </div>
                  {sessions.map((s,i)=>(
                    <div key={s.id||i} style={{display:"grid",gridTemplateColumns:"1.5fr 1fr 1fr 1fr 0.8fr",gap:8,padding:"9px 8px",borderBottom:i<sessions.length-1?`1px solid ${C.border}`:"none"}}>
                      <div style={{fontSize:12,color:C.mutedL}}>{new Date(s.date).toLocaleDateString("en-GB",{day:"numeric",month:"short"})}</div>
                      <div style={{fontSize:13,fontWeight:700,color:mc(s.score)}}>{s.score}</div>
                      <div style={{fontSize:12,color:C.mutedL}}>{s.totalSets||"—"}</div>
                      <div style={{fontSize:12,color:C.mutedL}}>{s.totalReps||"—"}</div>
                      <div style={{fontSize:11}}>{s.usedPose?<span style={{color:C.accent,fontWeight:700}}>●</span>:<span style={{color:C.muted}}>—</span>}</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── CHALLENGES ── */}
        {tab==="challenges"&&(
          <div style={{padding:"24px 28px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
              <div>
                <div style={{fontSize:13,color:C.muted,marginTop:4}}>Complete challenges to win free Pro or Elite access</div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:6,background:`${C.gold}18`,border:`1px solid ${C.gold}40`,borderRadius:8,padding:"6px 12px"}}>
                <span style={{fontSize:14}}>🏆</span>
                <span style={{fontSize:12,color:C.gold,fontWeight:700}}>Winners get free plan upgrades</span>
              </div>
            </div>

            {challenges.length===0?(
              <div style={{...card(false),textAlign:"center",padding:"48px"}}>
                <div style={{fontSize:32,marginBottom:12}}>🏆</div>
                <div style={{fontSize:15,color:C.mutedL}}>No active challenges right now</div>
                <div style={{fontSize:12,color:C.muted,marginTop:6}}>Check back soon — challenges are created by FormIQ and trainers</div>
              </div>
            ):(
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(340px,1fr))",gap:16}}>
                {challenges.map(ch=>(
                  <ChallengeCard key={ch.id} challenge={ch} userId={userId} userName={userName}
                    onJoin={()=>{}} onView={()=>setViewChallenge(ch)}/>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── REFERRALS ── */}
        {tab==="referrals"&&(
          <div style={{padding:"24px 28px",maxWidth:680}}>
            <div style={{...card(true),marginBottom:16,background:"#0A100A"}}>
              <div style={{...lbl,marginBottom:8,color:C.accent}}>🎁 Bring-A-Friend Discount</div>
              <div style={{fontSize:15,fontWeight:700,color:C.text,marginBottom:8}}>Earn up to 35% off your plan</div>
              <div style={{fontSize:13,color:C.muted,lineHeight:1.8,marginBottom:20}}>
                Share your referral link. Every friend who joins FormIQ earns you a bigger discount — stacking up to 35% off automatically.
              </div>
              {[
                {n:1,label:"1 friend joins",discount:"10% off"},
                {n:3,label:"3 friends join",discount:"20% off"},
                {n:5,label:"5+ friends join",discount:"35% off"},
              ].map(({n,label,discount})=>(
                <div key={n} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:`1px solid ${C.border}`}}>
                  <div style={{width:28,height:28,borderRadius:"50%",background:`${C.accent}20`,border:`1px solid ${C.accent}40`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:800,color:C.accent}}>{n}</div>
                  <div style={{flex:1,fontSize:13,color:C.mutedL}}>{label}</div>
                  <div style={{fontSize:13,fontWeight:800,color:C.accent}}>{discount}</div>
                </div>
              ))}
            </div>

            <div style={{...card(false),marginBottom:16}}>
              <div style={{...lbl,marginBottom:12}}>Your Referral Link</div>
              <div style={{background:C.s2,borderRadius:8,padding:"12px 14px",fontFamily:"monospace",fontSize:13,color:C.accent,wordBreak:"break-all",marginBottom:12}}>
                https://formiq.name.ng/ref/{refCode}
              </div>
              <div style={{display:"flex",gap:10}}>
                <button onClick={copyRef} style={{flex:1,padding:"11px",background:refCopied?`${C.accent}20`:C.s2,color:refCopied?C.accent:C.mutedL,border:`1px solid ${refCopied?C.accent:C.border}`,borderRadius:8,cursor:"pointer",fontWeight:700,fontSize:13,fontFamily:font,transition:"all .2s"}}>
                  {refCopied?"✓ Copied!":"📋 Copy Link"}
                </button>
                {"share" in navigator&&(
                  <button onClick={()=>navigator.share({title:"Join FormIQ",text:"Track your squat form with AI — free to start!",url:`https://formiq.name.ng/ref/${refCode}`}).catch(()=>{})}
                    style={{flex:1,padding:"11px",background:C.accent,color:"#000",border:"none",borderRadius:8,cursor:"pointer",fontWeight:700,fontSize:13,fontFamily:font}}>
                    📤 Share Link
                  </button>
                )}
              </div>
            </div>

            <div style={{...card(false)}}>
              <div style={{...lbl,marginBottom:12}}>Your Code</div>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <div style={{fontSize:24,fontWeight:900,color:C.accent,fontFamily:"monospace",letterSpacing:3}}>{refCode}</div>
                <div style={{fontSize:12,color:C.muted}}>Share this code directly — friends enter it at checkout for their first-session discount too</div>
              </div>
            </div>
          </div>
        )}
        {/* ── PROFILE ── */}
        {tab==="profile"&&(
          <div style={{padding:"24px 28px"}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1.4fr",gap:16,alignItems:"start"}}>

              {/* Left — profile card preview */}
              <div style={{display:"flex",flexDirection:"column",gap:14}}>
                <div style={{...card(true),textAlign:"center",padding:"28px 20px",background:"#071510"}}>
                  {/* Avatar */}
                  <div style={{position:"relative",display:"inline-block",marginBottom:14}}>
                    {profileForm.photoUrl?(
                      <img src={profileForm.photoUrl} alt="Profile"
                        onError={e=>{e.target.style.display="none";}}
                        style={{width:88,height:88,borderRadius:"50%",objectFit:"cover",objectPosition:"center top",border:`3px solid ${C.accent}`,display:"block"}}/>
                    ):(
                      <div style={{width:88,height:88,borderRadius:"50%",background:`${C.accent}20`,border:`3px solid ${C.accent}55`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:32,fontWeight:700,color:C.accent,margin:"0 auto"}}>
                        {(profileForm.name||userName||"?")[0].toUpperCase()}
                      </div>
                    )}
                    <div style={{position:"absolute",bottom:2,right:2,width:20,height:20,borderRadius:"50%",background:C.accent,border:`2px solid ${C.bg}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10}}>✓</div>
                  </div>
                  <div style={{fontSize:18,fontWeight:800,color:C.text,marginBottom:4}}>{profileForm.name||"Athlete"}</div>
                  <div style={{fontSize:12,color:C.muted,marginBottom:10}}>{profileForm.location||"Location not set"}</div>
                  <div style={{display:"inline-block",fontSize:10,fontWeight:800,letterSpacing:2,textTransform:"uppercase",
                    color:userPlan==="elite"?C.gold:userPlan==="pro"?C.blue:C.accent,
                    background:userPlan==="elite"?`${C.gold}18`:userPlan==="pro"?`${C.blue}18`:`${C.accent}18`,
                    padding:"3px 12px",borderRadius:20,marginBottom:14}}>
                    {userPlan} plan
                  </div>
                  {profileForm.bio&&<div style={{fontSize:13,color:C.mutedL,lineHeight:1.7,fontStyle:"italic"}}>"{profileForm.bio}"</div>}
                </div>

                {/* Stats summary */}
                <div style={{...card(false)}}>
                  <div style={{...lbl,marginBottom:14}}>Training Stats</div>
                  {[
                    {label:"Total Sessions",   value:totalSessions},
                    {label:"Average Score",    value:avgScore||"—"},
                    {label:"Best Score",       value:bestScore||"—"},
                    {label:"Total Reps",       value:totalReps.toLocaleString()},
                    {label:"Current Streak",   value:`${streak} day${streak!==1?"s":""}`},
                    {label:"Training Goal",    value:profileForm.goal||"—"},
                    {label:"Experience Level", value:profileForm.experience||"—"},
                  ].map(({label,value})=>(
                    <div key={label} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:`1px solid ${C.border}`}}>
                      <span style={{fontSize:12,color:C.muted}}>{label}</span>
                      <span style={{fontSize:13,fontWeight:700,color:C.text}}>{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right — edit form */}
              <div style={{...card(false)}}>
                <div style={{...lbl,marginBottom:20}}>Edit Profile</div>

                {/* Photo URL */}
                <div style={{marginBottom:14}}>
                  <div style={{fontSize:10,color:C.muted,letterSpacing:1.5,textTransform:"uppercase",marginBottom:5}}>Profile Photo URL</div>
                  <input value={profileForm.photoUrl} onChange={e=>setProfileForm(p=>({...p,photoUrl:e.target.value}))}
                    placeholder="https://i.imgur.com/yourphoto.jpg"
                    style={{width:"100%",padding:"10px 12px",background:C.s2,border:`1px solid ${C.border}`,borderRadius:8,color:C.text,fontSize:13,fontFamily:font,boxSizing:"border-box",outline:"none"}}/>
                  <div style={{fontSize:10,color:C.muted,marginTop:4}}>Upload to <a href="https://imgur.com/upload" target="_blank" rel="noreferrer" style={{color:C.accent}}>Imgur</a> (free) and paste the direct link</div>
                </div>

                {/* Name + Email */}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
                  {[{label:"Display Name",key:"name",ph:"Your name",type:"text"},
                    {label:"Email",key:"email",ph:"you@email.com",type:"email"}].map(({label,key,ph,type})=>(
                    <div key={key}>
                      <div style={{fontSize:10,color:C.muted,letterSpacing:1.5,textTransform:"uppercase",marginBottom:5}}>{label}</div>
                      <input type={type} value={profileForm[key]} onChange={e=>setProfileForm(p=>({...p,[key]:e.target.value}))} placeholder={ph}
                        style={{width:"100%",padding:"10px 12px",background:C.s2,border:`1px solid ${C.border}`,borderRadius:8,color:C.text,fontSize:13,fontFamily:font,boxSizing:"border-box",outline:"none"}}/>
                    </div>
                  ))}
                </div>

                {/* Location */}
                <div style={{marginBottom:14}}>
                  <div style={{fontSize:10,color:C.muted,letterSpacing:1.5,textTransform:"uppercase",marginBottom:5}}>Location</div>
                  <input value={profileForm.location} onChange={e=>setProfileForm(p=>({...p,location:e.target.value}))} placeholder="Lagos, Nigeria"
                    style={{width:"100%",padding:"10px 12px",background:C.s2,border:`1px solid ${C.border}`,borderRadius:8,color:C.text,fontSize:13,fontFamily:font,boxSizing:"border-box",outline:"none"}}/>
                </div>

                {/* Goal + Experience */}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
                  <div>
                    <div style={{fontSize:10,color:C.muted,letterSpacing:1.5,textTransform:"uppercase",marginBottom:5}}>Training Goal</div>
                    <select value={profileForm.goal} onChange={e=>setProfileForm(p=>({...p,goal:e.target.value}))}
                      style={{width:"100%",padding:"10px 12px",background:C.s2,border:`1px solid ${C.border}`,borderRadius:8,color:C.text,fontSize:13,fontFamily:font,boxSizing:"border-box",outline:"none"}}>
                      {["Strength","Powerlifting","Athletic Performance","Weight Loss","Bodybuilding","CrossFit","General Fitness","Competition Prep"].map(g=>(
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <div style={{fontSize:10,color:C.muted,letterSpacing:1.5,textTransform:"uppercase",marginBottom:5}}>Experience Level</div>
                    <select value={profileForm.experience} onChange={e=>setProfileForm(p=>({...p,experience:e.target.value}))}
                      style={{width:"100%",padding:"10px 12px",background:C.s2,border:`1px solid ${C.border}`,borderRadius:8,color:C.text,fontSize:13,fontFamily:font,boxSizing:"border-box",outline:"none"}}>
                      {[["beginner","Beginner (0–1 yr)"],["intermediate","Intermediate (1–3 yrs)"],["advanced","Advanced (3–5 yrs)"],["elite","Elite (5+ yrs)"]].map(([v,l])=>(
                        <option key={v} value={v}>{l}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Bio */}
                <div style={{marginBottom:20}}>
                  <div style={{fontSize:10,color:C.muted,letterSpacing:1.5,textTransform:"uppercase",marginBottom:5}}>Bio (optional)</div>
                  <textarea rows={3} value={profileForm.bio} onChange={e=>setProfileForm(p=>({...p,bio:e.target.value}))}
                    placeholder="Tell us about your training journey..."
                    style={{width:"100%",padding:"10px 12px",background:C.s2,border:`1px solid ${C.border}`,borderRadius:8,color:C.text,fontSize:13,fontFamily:font,boxSizing:"border-box",outline:"none",resize:"vertical"}}/>
                </div>

                {/* Plan info */}
                <div style={{background:C.s2,borderRadius:8,padding:"12px 14px",marginBottom:20,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                  <div>
                    <div style={{fontSize:10,color:C.muted,letterSpacing:1.5,textTransform:"uppercase",marginBottom:3}}>Current Plan</div>
                    <div style={{fontSize:14,fontWeight:700,color:userPlan==="elite"?C.gold:userPlan==="pro"?C.blue:C.accent,textTransform:"capitalize"}}>{userPlan}</div>
                  </div>
                  {userPlan==="free"&&(
                    <button onClick={()=>window.location.href="/#pricing"} style={{padding:"8px 16px",background:C.blue,color:"#fff",border:"none",borderRadius:7,cursor:"pointer",fontSize:12,fontWeight:700,fontFamily:font}}>
                      Upgrade Plan →
                    </button>
                  )}
                </div>

                <button onClick={saveProfile} style={{width:"100%",padding:"13px",background:profileSaved?`${C.accent}25`:C.accent,color:profileSaved?C.accent:"#000",border:`1px solid ${profileSaved?C.accent:"transparent"}`,borderRadius:9,fontWeight:800,fontSize:14,cursor:"pointer",fontFamily:font,transition:"all .2s",letterSpacing:.5}}>
                  {profileSaved?"✓ Profile Saved!":"Save Profile"}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Leaderboard modal */}
      {viewChallenge&&(
        <LeaderboardModal
          challenge={viewChallenge}
          userId={userId}
          userName={userName}
          onClose={()=>setViewChallenge(null)}
        />
      )}
    </div>
  );
}

// ── Demo challenges (shown when Firebase has none) ─────────────
const DEMO_CHALLENGES = [
  {
    id:"ch_squat_30",
    title:"30-Day Squat Blitz",
    icon:"🏋️",
    description:"Complete 1,200 total reps across 30 days. Every session counts. Log your reps and watch your form score climb.",
    duration:30,
    unit:"reps",
    tier:"all",
    prize:"Free Pro access · 30 days for top 3",
    participants:47,
    endDate: new Date(Date.now()+28*86400000).toISOString(),
  },
  {
    id:"ch_form_score",
    title:"Form Score Challenge",
    icon:"📐",
    description:"Achieve the highest average form score across 10 sessions. Science beats ego. Technique wins this one.",
    duration:14,
    unit:"score",
    tier:"pro",
    prize:"Free Elite access · 30 days for winner",
    participants:23,
    endDate: new Date(Date.now()+12*86400000).toISOString(),
  },
  {
    id:"ch_consistency",
    title:"Consistency King",
    icon:"🔥",
    description:"Log sessions 7 days in a row. Streak = discipline. The athlete who shows up every day always beats the one who trains hardest occasionally.",
    duration:7,
    unit:"days",
    tier:"all",
    prize:"Free Pro access · 30 days",
    participants:89,
    endDate: new Date(Date.now()+5*86400000).toISOString(),
  },
];
