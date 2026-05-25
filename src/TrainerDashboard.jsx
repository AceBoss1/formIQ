import { useState, useEffect } from "react";
import { getTrainer, saveTrainer, getClients, addClient, updateClient, getSessions, addSession, getTrainerPlans, saveTrainerPlans, getSchedule, addScheduleItem, updateScheduleItem, DEFAULT_PLANS } from "./db";
import { InviteManager } from "./CoachBranded";

const T = {
  bg:"#07080A", surface:"#0E1014", s2:"#141619", s3:"#1C1F24",
  border:"#23262D", border2:"#2E323A", accent:"#00E676", accentDim:"#00E67620",
  gold:"#F5A623", blue:"#3D8EF0", purple:"#9B6DFF", danger:"#FF4757",
  text:"#F0F2F5", muted:"#6B7280", mutedL:"#9CA3AF",
};

const CURRENCIES = {
  USD:{symbol:"$",flag:"🇺🇸",gateway:"stripe"},   GBP:{symbol:"£",flag:"🇬🇧",gateway:"stripe"},
  EUR:{symbol:"€",flag:"🇪🇺",gateway:"stripe"},   NGN:{symbol:"₦",flag:"🇳🇬",gateway:"paystack"},
  GHS:{symbol:"₵",flag:"🇬🇭",gateway:"paystack"}, KES:{symbol:"KSh",flag:"🇰🇪",gateway:"paystack"},
  ZAR:{symbol:"R",flag:"🇿🇦",gateway:"paystack"},  CAD:{symbol:"CA$",flag:"🇨🇦",gateway:"stripe"},
  AUD:{symbol:"A$",flag:"🇦🇺",gateway:"stripe"},   UGX:{symbol:"USh",flag:"🇺🇬",gateway:"paystack"},
  EGP:{symbol:"E£",flag:"🇪🇬",gateway:"paystack"},
};
const FX={USD:1,GBP:.79,EUR:.92,CAD:1.36,AUD:1.53,NGN:1580,GHS:12.5,KES:128,ZAR:18.4,UGX:3740,EGP:48.7};
const GOALS=["Powerlifting","Strength","Athletic Performance","Weight Loss","Bodybuilding","CrossFit","General Fitness","Rehabilitation","Competition Prep","Flexibility"];
const PLAN_KEYS=["starter","pro","elite"];

const scoreColor=(v)=>v>=80?T.accent:v>=65?T.gold:T.danger;
const gradeStr=(s)=>s>=90?"S":s>=82?"A+":s>=75?"A":s>=65?"B":s>=55?"C":"D";
const statusColor=(s)=>s==="active"?T.accent:s==="at-risk"?T.gold:T.danger;
const fmt=(iso)=>{
  if(!iso)return"—";
  const d=new Date(iso);
  return d.toLocaleDateString("en-GB",{day:"numeric",month:"short"})+" "+d.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"});
};
const fmtDate=(iso)=>{
  if(!iso)return"—";
  const d=new Date(iso),now=new Date();
  const diff=Math.floor((now-d)/86400000);
  if(diff===0)return"Today";if(diff===1)return"Yesterday";if(diff<7)return`${diff} days ago`;
  return d.toLocaleDateString("en-GB",{day:"numeric",month:"short"});
};

function MiniBar({value,color}){
  return(<div style={{width:"100%",height:4,background:T.s3,borderRadius:2,overflow:"hidden"}}>
    <div style={{height:"100%",width:`${Math.min(100,value||0)}%`,background:color,borderRadius:2,transition:"width .8s ease"}}/>
  </div>);
}

function Avatar({initials,size=36,color=T.accent,photo}){
  const [imgErr,setImgErr]=useState(false);
  if(photo&&!imgErr) return(
    <img src={photo} alt={initials} onError={()=>setImgErr(true)}
      style={{width:size,height:size,borderRadius:"50%",objectFit:"cover",objectPosition:"center top",border:`2px solid ${color}`,flexShrink:0}}/>
  );
  return(<div style={{width:size,height:size,borderRadius:"50%",background:color+"22",border:`1.5px solid ${color}55`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*0.36,fontWeight:700,color,flexShrink:0}}>{initials}</div>);
}

function ScoreBadge({score,size="sm"}){
  if(!score&&score!==0)return<span style={{fontSize:11,color:T.muted}}>—</span>;
  const col=scoreColor(score);
  const fs=size==="lg"?28:size==="md"?18:13;
  return(<div style={{display:"inline-flex",alignItems:"center",justifyContent:"center",minWidth:size==="lg"?52:size==="md"?40:32,height:size==="lg"?52:size==="md"?40:26,background:col+"18",border:`1px solid ${col}40`,borderRadius:8,padding:"0 8px",fontSize:fs,fontWeight:800,color:col,letterSpacing:-.5}}>{score}</div>);
}

// ── Add Client Modal ──────────────────────────────────────────
function AddClientModal({trainerSlug,plans,onSave,onClose}){
  const [form,setForm]=useState({name:"",email:"",phone:"",goal:"Strength",plan:Object.keys(plans)[0]||"starter",notes:""});
  const [err,setErr]=useState("");
  const font="system-ui,-apple-system,sans-serif";
  const inp={width:"100%",padding:"10px 12px",background:T.s2,border:`1px solid ${T.border}`,borderRadius:7,color:T.text,fontSize:13,fontFamily:font,boxSizing:"border-box",outline:"none"};
  const save=()=>{
    if(!form.name.trim()){setErr("Client name is required");return;}
    const c=addClient(trainerSlug,{...form,avatar:form.name.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase(),lastSeen:"Just added",nextSession:"—",trend:0,streak:0});
    onSave(c);
  };
  return(
    <div style={{position:"fixed",inset:0,background:"#000000E0",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:20,fontFamily:font}}>
      <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:16,width:"100%",maxWidth:420}}>
        <div style={{padding:"16px 20px",borderBottom:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{fontSize:15,fontWeight:700,color:T.text}}>Add New Client</div>
          <button onClick={onClose} style={{background:"transparent",border:"none",color:T.muted,cursor:"pointer",fontSize:20}}>✕</button>
        </div>
        <div style={{padding:"20px"}}>
          {err&&<div style={{background:"#FF475718",border:"1px solid #FF475740",borderRadius:8,padding:"8px 12px",fontSize:12,color:"#FF9999",marginBottom:14}}>{err}</div>}
          {[{k:"name",l:"Full Name*",p:"e.g. Marcus Williams",t:"text"},
            {k:"email",l:"Email",p:"client@email.com",t:"email"},
            {k:"phone",l:"Phone",p:"+234...",t:"tel"},
          ].map(({k,l,p,t})=>(
            <div key={k} style={{marginBottom:12}}>
              <div style={{fontSize:10,color:T.muted,letterSpacing:1.5,textTransform:"uppercase",marginBottom:5}}>{l}</div>
              <input type={t} value={form[k]} placeholder={p} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))} style={inp}/>
            </div>
          ))}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
            <div>
              <div style={{fontSize:10,color:T.muted,letterSpacing:1.5,textTransform:"uppercase",marginBottom:5}}>Goal</div>
              <select value={form.goal} onChange={e=>setForm(f=>({...f,goal:e.target.value}))} style={inp}>
                {GOALS.map(g=><option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <div style={{fontSize:10,color:T.muted,letterSpacing:1.5,textTransform:"uppercase",marginBottom:5}}>Plan</div>
              <select value={form.plan} onChange={e=>setForm(f=>({...f,plan:e.target.value}))} style={inp}>
                {Object.entries(plans).map(([k,p])=><option key={k} value={k}>{p.name}</option>)}
              </select>
            </div>
          </div>
          <div style={{marginBottom:18}}>
            <div style={{fontSize:10,color:T.muted,letterSpacing:1.5,textTransform:"uppercase",marginBottom:5}}>Notes (optional)</div>
            <textarea rows={2} value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} placeholder="Any initial notes about this client..." style={{...inp,resize:"vertical"}}/>
          </div>
          <div style={{display:"flex",gap:10}}>
            <button onClick={onClose} style={{flex:1,padding:"11px",background:T.s2,color:T.text,border:`1px solid ${T.border}`,borderRadius:8,cursor:"pointer",fontWeight:600,fontSize:13,fontFamily:font}}>Cancel</button>
            <button onClick={save} style={{flex:2,padding:"11px",background:T.accent,color:"#000",border:"none",borderRadius:8,cursor:"pointer",fontWeight:800,fontSize:14,fontFamily:font}}>Add Client</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Log Session Modal ─────────────────────────────────────────
function LogSessionModal({trainerSlug,clients,onSave,onClose}){
  const [form,setForm]=useState({clientId:"",sets:3,score:"",topMetric:"Knee Alignment",weakMetric:"Tempo Control",poseUsed:false,notes:""});
  const [err,setErr]=useState("");
  const font="system-ui,-apple-system,sans-serif";
  const inp={width:"100%",padding:"10px 12px",background:T.s2,border:`1px solid ${T.border}`,borderRadius:7,color:T.text,fontSize:13,fontFamily:font,boxSizing:"border-box",outline:"none"};
  const METRICS=["Knee Alignment","Spine Neutrality","Squat Depth","Tempo Control","Hip Hinge"];
  const save=()=>{
    if(!form.clientId){setErr("Select a client");return;}
    if(!form.score||isNaN(form.score)||form.score<0||form.score>100){setErr("Enter a valid score 0–100");return;}
    const client=clients.find(c=>c.id===Number(form.clientId));
    const s=addSession(trainerSlug,{clientId:Number(form.clientId),clientName:client?.name||"",sets:Number(form.sets),reps:Number(form.sets)*10,score:Number(form.score),topMetric:form.topMetric,weakMetric:form.weakMetric,poseUsed:form.poseUsed,notes:form.notes});
    onSave(s);
  };
  return(
    <div style={{position:"fixed",inset:0,background:"#000000E0",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:20,fontFamily:font}}>
      <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:16,width:"100%",maxWidth:420}}>
        <div style={{padding:"16px 20px",borderBottom:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{fontSize:15,fontWeight:700,color:T.text}}>Log Session</div>
          <button onClick={onClose} style={{background:"transparent",border:"none",color:T.muted,cursor:"pointer",fontSize:20}}>✕</button>
        </div>
        <div style={{padding:"20px"}}>
          {err&&<div style={{background:"#FF475718",border:"1px solid #FF475740",borderRadius:8,padding:"8px 12px",fontSize:12,color:"#FF9999",marginBottom:14}}>{err}</div>}
          <div style={{marginBottom:12}}>
            <div style={{fontSize:10,color:T.muted,letterSpacing:1.5,textTransform:"uppercase",marginBottom:5}}>Client*</div>
            <select value={form.clientId} onChange={e=>setForm(f=>({...f,clientId:e.target.value}))} style={inp}>
              <option value="">Select client...</option>
              {clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
            <div>
              <div style={{fontSize:10,color:T.muted,letterSpacing:1.5,textTransform:"uppercase",marginBottom:5}}>Sets</div>
              <select value={form.sets} onChange={e=>setForm(f=>({...f,sets:e.target.value}))} style={inp}>
                {[2,3,4,5].map(n=><option key={n} value={n}>{n} sets (10 reps each)</option>)}
              </select>
            </div>
            <div>
              <div style={{fontSize:10,color:T.muted,letterSpacing:1.5,textTransform:"uppercase",marginBottom:5}}>Form Score* (0–100)</div>
              <input type="number" min="0" max="100" value={form.score} onChange={e=>setForm(f=>({...f,score:e.target.value}))} placeholder="e.g. 78" style={inp}/>
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
            <div>
              <div style={{fontSize:10,color:T.muted,letterSpacing:1.5,textTransform:"uppercase",marginBottom:5}}>Best Metric</div>
              <select value={form.topMetric} onChange={e=>setForm(f=>({...f,topMetric:e.target.value}))} style={inp}>
                {METRICS.map(m=><option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <div style={{fontSize:10,color:T.muted,letterSpacing:1.5,textTransform:"uppercase",marginBottom:5}}>Needs Work</div>
              <select value={form.weakMetric} onChange={e=>setForm(f=>({...f,weakMetric:e.target.value}))} style={inp}>
                {METRICS.map(m=><option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>
          <div style={{marginBottom:12,display:"flex",alignItems:"center",gap:10}}>
            <input type="checkbox" id="pose" checked={form.poseUsed} onChange={e=>setForm(f=>({...f,poseUsed:e.target.checked}))} style={{width:16,height:16,accentColor:T.accent}}/>
            <label htmlFor="pose" style={{fontSize:13,color:T.mutedL,cursor:"pointer"}}>Live pose tracking was used</label>
          </div>
          <div style={{marginBottom:18}}>
            <div style={{fontSize:10,color:T.muted,letterSpacing:1.5,textTransform:"uppercase",marginBottom:5}}>Coaching Notes</div>
            <textarea rows={3} value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} placeholder="Notes visible to client on next login..." style={{...inp,resize:"vertical"}}/>
          </div>
          <div style={{display:"flex",gap:10}}>
            <button onClick={onClose} style={{flex:1,padding:"11px",background:T.s2,color:T.text,border:`1px solid ${T.border}`,borderRadius:8,cursor:"pointer",fontWeight:600,fontSize:13,fontFamily:font}}>Cancel</button>
            <button onClick={save} style={{flex:2,padding:"11px",background:T.accent,color:"#000",border:"none",borderRadius:8,cursor:"pointer",fontWeight:800,fontSize:14,fontFamily:font}}>Log Session</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Schedule Item Modal ───────────────────────────────────────
function AddScheduleModal({trainerSlug,clients,onSave,onClose}){
  const [form,setForm]=useState({clientId:"",time:"",type:"Squat Form",duration:"45",date:new Date().toISOString().slice(0,10)});
  const [err,setErr]=useState("");
  const font="system-ui,-apple-system,sans-serif";
  const inp={width:"100%",padding:"10px 12px",background:T.s2,border:`1px solid ${T.border}`,borderRadius:7,color:T.text,fontSize:13,fontFamily:font,boxSizing:"border-box",outline:"none"};
  const save=()=>{
    if(!form.clientId||!form.time){setErr("Select client and time");return;}
    const client=clients.find(c=>c.id===Number(form.clientId));
    const item=addScheduleItem(trainerSlug,{clientId:Number(form.clientId),client:client?.name||"",time:form.time,date:form.date,type:form.type,duration:`${form.duration} min`,status:"upcoming",color:T.accent});
    onSave(item);
  };
  return(
    <div style={{position:"fixed",inset:0,background:"#000000E0",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:20,fontFamily:font}}>
      <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:16,width:"100%",maxWidth:400}}>
        <div style={{padding:"16px 20px",borderBottom:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{fontSize:15,fontWeight:700,color:T.text}}>Schedule Session</div>
          <button onClick={onClose} style={{background:"transparent",border:"none",color:T.muted,cursor:"pointer",fontSize:20}}>✕</button>
        </div>
        <div style={{padding:"20px"}}>
          {err&&<div style={{background:"#FF475718",border:"1px solid #FF475740",borderRadius:8,padding:"8px 12px",fontSize:12,color:"#FF9999",marginBottom:14}}>{err}</div>}
          <div style={{marginBottom:12}}>
            <div style={{fontSize:10,color:T.muted,letterSpacing:1.5,textTransform:"uppercase",marginBottom:5}}>Client</div>
            <select value={form.clientId} onChange={e=>setForm(f=>({...f,clientId:e.target.value}))} style={inp}>
              <option value="">Select client...</option>
              {clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
            <div>
              <div style={{fontSize:10,color:T.muted,letterSpacing:1.5,textTransform:"uppercase",marginBottom:5}}>Date</div>
              <input type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))} style={inp}/>
            </div>
            <div>
              <div style={{fontSize:10,color:T.muted,letterSpacing:1.5,textTransform:"uppercase",marginBottom:5}}>Time</div>
              <input type="time" value={form.time} onChange={e=>setForm(f=>({...f,time:e.target.value}))} style={inp}/>
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:18}}>
            <div>
              <div style={{fontSize:10,color:T.muted,letterSpacing:1.5,textTransform:"uppercase",marginBottom:5}}>Session Type</div>
              <select value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))} style={inp}>
                {["Squat Form","Assessment","Check-in","Programme Review","Competition Prep"].map(t=><option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <div style={{fontSize:10,color:T.muted,letterSpacing:1.5,textTransform:"uppercase",marginBottom:5}}>Duration (min)</div>
              <input type="number" min="15" max="120" step="15" value={form.duration} onChange={e=>setForm(f=>({...f,duration:e.target.value}))} style={inp}/>
            </div>
          </div>
          <div style={{display:"flex",gap:10}}>
            <button onClick={onClose} style={{flex:1,padding:"11px",background:T.s2,color:T.text,border:`1px solid ${T.border}`,borderRadius:8,cursor:"pointer",fontWeight:600,fontSize:13,fontFamily:font}}>Cancel</button>
            <button onClick={save} style={{flex:2,padding:"11px",background:T.accent,color:"#000",border:"none",borderRadius:8,cursor:"pointer",fontWeight:800,fontSize:14,fontFamily:font}}>Schedule</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Client Drawer ─────────────────────────────────────────────
function ClientDrawer({client,sessions,plans,trainerSlug,baseUrl,onClose,onRefresh}){
  const col=client.score?scoreColor(client.score):T.muted;
  const clientSessions=sessions.filter(s=>s.clientId===client.id);
  const font="system-ui,-apple-system,sans-serif";
  const [showInvite,setShowInvite]=useState(false);
  const [note,setNote]=useState("");
  const [noteSaved,setNoteSaved]=useState(false);
  const saveNote=()=>{
    updateClient(trainerSlug,client.id,{coachNote:note,noteDate:new Date().toISOString()});
    setNoteSaved(true);setTimeout(()=>setNoteSaved(false),2000);
    onRefresh();
  };
  useEffect(()=>{setNote(client.coachNote||"");},[client]);
  return(
    <div style={{position:"fixed",inset:0,zIndex:999,display:"flex",justifyContent:"flex-end",fontFamily:font}}>
      <div onClick={onClose} style={{flex:1,background:"#000000AA",cursor:"pointer"}}/>
      <div style={{width:360,background:T.surface,borderLeft:`1px solid ${T.border}`,display:"flex",flexDirection:"column",overflowY:"auto",animation:"slideIn .25s ease"}}>
        <style>{`@keyframes slideIn{from{transform:translateX(40px);opacity:0}to{transform:translateX(0);opacity:1}}`}</style>
        {/* Header */}
        <div style={{padding:"20px 20px 16px",borderBottom:`1px solid ${T.border}`,flexShrink:0}}>
          <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:14}}>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <Avatar initials={client.avatar} size={48} color={col}/>
              <div>
                <div style={{fontSize:16,fontWeight:700,color:T.text}}>{client.name}</div>
                <div style={{fontSize:12,color:T.muted,marginTop:2}}>{client.goal} · {plans[client.plan]?.name||client.plan} plan</div>
              </div>
            </div>
            <button onClick={onClose} style={{background:"transparent",border:"none",color:T.muted,cursor:"pointer",fontSize:20}}>✕</button>
          </div>
          <div style={{display:"flex",gap:8}}>
            {[{l:"Sessions",v:client.sessions||0},{l:"Streak",v:`${client.streak||0}d`},{l:"Last seen",v:fmtDate(client.updatedAt||client.createdAt)}].map(({l,v})=>(
              <div key={l} style={{flex:1,background:T.s2,borderRadius:8,padding:"8px 10px",textAlign:"center"}}>
                <div style={{fontSize:9,color:T.muted,letterSpacing:1.5,textTransform:"uppercase",marginBottom:3}}>{l}</div>
                <div style={{fontSize:13,fontWeight:700,color:T.text}}>{v}</div>
              </div>
            ))}
          </div>
        </div>
        {/* Score */}
        <div style={{padding:"16px 20px",borderBottom:`1px solid ${T.border}`}}>
          <div style={{fontSize:9,color:T.muted,letterSpacing:2,textTransform:"uppercase",marginBottom:8}}>Form Score</div>
          <div style={{display:"flex",alignItems:"center",gap:14}}>
            <div style={{fontSize:44,fontWeight:900,color:col,letterSpacing:-2}}>{client.score||"—"}</div>
            <div style={{flex:1}}>
              <MiniBar value={client.score||0} color={col}/>
              <div style={{fontSize:11,color:T.muted,marginTop:5}}>{clientSessions.length} sessions tracked</div>
            </div>
          </div>
        </div>
        {/* Coach note */}
        <div style={{padding:"16px 20px",borderBottom:`1px solid ${T.border}`}}>
          <div style={{fontSize:9,color:T.muted,letterSpacing:2,textTransform:"uppercase",marginBottom:8}}>Coaching Note for Client</div>
          <textarea rows={3} value={note} onChange={e=>setNote(e.target.value)}
            placeholder="Leave a note — client sees this before their next session..."
            style={{width:"100%",padding:"10px 12px",background:T.s2,border:`1px solid ${T.border}`,borderRadius:7,color:T.text,fontSize:12,fontFamily:font,resize:"vertical",boxSizing:"border-box",outline:"none"}}/>
          <button onClick={saveNote} style={{marginTop:8,width:"100%",padding:"8px",background:noteSaved?T.accentDim:T.accent,color:noteSaved?T.accent:"#000",border:`1px solid ${noteSaved?T.accent:"transparent"}`,borderRadius:6,fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:font,transition:"all .2s"}}>
            {noteSaved?"✓ Note Saved":"Save Note"}
          </button>
        </div>
        {/* Recent sessions */}
        <div style={{padding:"16px 20px",flex:1}}>
          <div style={{fontSize:9,color:T.muted,letterSpacing:2,textTransform:"uppercase",marginBottom:12}}>Recent Sessions</div>
          {clientSessions.length===0
            ?<div style={{fontSize:12,color:T.muted,textAlign:"center",padding:"20px 0"}}>No sessions logged yet</div>
            :clientSessions.slice(0,5).map(s=>(
              <div key={s.id} style={{display:"flex",alignItems:"center",gap:10,marginBottom:10,padding:"10px 12px",background:T.s2,borderRadius:8}}>
                <ScoreBadge score={s.score}/>
                <div style={{flex:1}}>
                  <div style={{fontSize:11,color:T.text,fontWeight:600,marginBottom:2}}>{fmtDate(s.date)}</div>
                  <div style={{fontSize:11,color:T.muted}}>{s.sets} sets · Best: {s.topMetric}</div>
                  {s.notes&&<div style={{fontSize:10,color:T.accent,marginTop:3}}>📝 {s.notes.slice(0,40)}{s.notes.length>40?"...":""}</div>}
                </div>
                {s.poseUsed&&<div style={{fontSize:9,color:T.accent,background:T.accentDim,padding:"2px 6px",borderRadius:4,fontWeight:700}}>POSE</div>}
              </div>
            ))
          }
        </div>
        {/* Actions */}
        <div style={{padding:"14px 20px",borderTop:`1px solid ${T.border}`,display:"flex",gap:8}}>
          <button onClick={()=>setShowInvite(true)} style={{flex:1,padding:"11px",background:T.accentDim,color:T.accent,border:`1px solid ${T.accent}40`,borderRadius:8,fontWeight:700,cursor:"pointer",fontSize:12,fontFamily:font}}>
            🔗 Invite Link
          </button>
          <button onClick={()=>{updateClient(trainerSlug,client.id,{status:client.status==="active"?"inactive":"active"});onRefresh();}} style={{flex:1,padding:"11px",background:T.s2,color:T.mutedL,border:`1px solid ${T.border}`,borderRadius:8,fontWeight:600,cursor:"pointer",fontSize:12,fontFamily:font}}>
            {client.status==="active"?"Set Inactive":"Set Active"}
          </button>
        </div>
        {showInvite&&<InviteManager client={client} trainerSlug={trainerSlug} baseUrl={baseUrl} onClose={()=>setShowInvite(false)}/>}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// MAIN TRAINER DASHBOARD
// ══════════════════════════════════════════════════════════════
export default function TrainerDashboard({ trainer:initialTrainer, onBack, onLogout }) {
  const font="system-ui,-apple-system,'Segoe UI',sans-serif";
  const SLUG = initialTrainer?.slug||"demo";
  const baseUrl = window.location.origin+window.location.pathname;

  // Real data from db
  const [trainer,setTrainer]     = useState(initialTrainer||getTrainer()||{name:"Trainer",email:"",slug:"demo",accent:"#00E676",currency:"NGN"});
  const [clients,setClients]     = useState([]);
  const [sessions,setSessions]   = useState([]);
  const [schedule,setSchedule]   = useState([]);
  const [plans,setPlans]         = useState(DEFAULT_PLANS);

  const [tab,setTab]             = useState("overview");
  const [selectedClient,setSelectedClient] = useState(null);
  const [showAddClient,setShowAddClient]   = useState(false);
  const [showLogSession,setShowLogSession] = useState(false);
  const [showAddSchedule,setShowAddSchedule] = useState(false);
  const [inviteClient,setInviteClient]     = useState(null);
  const [searchQ,setSearchQ]     = useState("");
  const [filterStatus,setFilterStatus]     = useState("all");
  const [notifOpen,setNotifOpen] = useState(false);
  const [profileSaved,setProfileSaved]     = useState(false);
  const [profileDirty,setProfileDirty]     = useState(false);
  const [plansDirty,setPlansDirty]         = useState(false);
  const [plansSaved,setPlansSaved]         = useState(false);

  // Load all real data on mount
  const refresh = () => {
    setClients(getClients(SLUG));
    setSessions(getSessions(SLUG));
    setSchedule(getSchedule(SLUG));
    setPlans(getTrainerPlans(SLUG));
  };
  useEffect(()=>{ refresh(); },[SLUG]); // eslint-disable-line

  const saveProfile = () => {
    saveTrainer(trainer);
    setProfileDirty(false);setProfileSaved(true);
    setTimeout(()=>setProfileSaved(false),2500);
  };
  const savePlans = () => {
    saveTrainerPlans(SLUG,plans);
    setPlansDirty(false);setPlansSaved(true);
    setTimeout(()=>setPlansSaved(false),2500);
    refresh();
  };

  const activeClients  = clients.filter(c=>c.status==="active").length;
  const atRiskClients  = clients.filter(c=>{const d=new Date(c.updatedAt||c.createdAt);return(Date.now()-d)>3*86400000&&c.status!=="inactive";}).length;
  const avgScore       = clients.length?Math.round(clients.filter(c=>c.score>0).reduce((s,c)=>s+c.score,0)/Math.max(1,clients.filter(c=>c.score>0).length)):0;
  const todaySched     = schedule.filter(s=>{const d=new Date(s.date||Date.now());const n=new Date();return d.toDateString()===n.toDateString();});
  const completedToday = todaySched.filter(s=>s.status==="done").length;
  const filteredClients= clients.filter(c=>{
    const ms=c.name.toLowerCase().includes(searchQ.toLowerCase());
    const mf=filterStatus==="all"||c.status===filterStatus||(filterStatus==="at-risk"&&atRiskClients>0);
    return ms&&mf;
  });

  const localPrice=(usd)=>{const c=CURRENCIES[trainer.currency||"NGN"]||CURRENCIES.NGN;return`${c.symbol}${Math.round(usd*(FX[trainer.currency]||1)).toLocaleString()}`;};

  const card=(ac)=>({background:"#0E1014",borderRadius:12,padding:"16px 18px",border:`1px solid ${ac?T.accent+"30":T.border}`});
  const lbl={fontSize:9,letterSpacing:3,color:T.muted,textTransform:"uppercase",fontWeight:700};
  const inp={width:"100%",padding:"10px 12px",background:T.s2,border:`1px solid ${T.border}`,borderRadius:7,color:T.text,fontSize:13,fontFamily:font,boxSizing:"border-box",outline:"none"};

  const NAV=[
    {id:"overview", icon:"⬡", label:"Overview"},
    {id:"roster",   icon:"◈", label:"Roster"},
    {id:"sessions", icon:"◉", label:"Sessions"},
    {id:"schedule", icon:"◷", label:"Schedule"},
    {id:"analytics",icon:"◬", label:"Analytics"},
    {id:"settings", icon:"◎", label:"Settings"},
  ];

  return(
    <div style={{background:T.bg,color:T.text,minHeight:"100vh",fontFamily:font,display:"flex"}}>
      <style>{`
        *{box-sizing:border-box}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:#2E323A;border-radius:2px}
        .nav-btn:hover{background:#141619!important;color:#F0F2F5!important}
        .card-hover:hover{border-color:#2E323A!important;transform:translateY(-1px);transition:all .2s}
        .row-hover:hover{background:#141619!important;cursor:pointer}
        input:focus,select:focus,textarea:focus{border-color:#00E67650!important}
        input::placeholder,textarea::placeholder{color:#4B5563}
      `}</style>

      {/* ── SIDEBAR ── */}
      <div style={{width:220,background:T.surface,borderRight:`1px solid ${T.border}`,display:"flex",flexDirection:"column",flexShrink:0,position:"sticky",top:0,height:"100vh"}}>
        <div style={{padding:"20px 16px 16px",borderBottom:`1px solid ${T.border}`}}>
          <img src={`${process.env.PUBLIC_URL}/formIQ.png`} alt="FormIQ" style={{width:"100%",height:"auto",objectFit:"contain",display:"block",marginBottom:6}}/>
          <div style={{fontSize:9,color:T.muted,letterSpacing:2,textTransform:"uppercase",textAlign:"center"}}>Trainer Dashboard</div>
        </div>
        <nav style={{flex:1,padding:"12px 10px"}}>
          {NAV.map(({id,icon,label})=>(
            <button key={id} className="nav-btn" onClick={()=>setTab(id)} style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"10px 12px",background:tab===id?T.s2:"transparent",border:"none",borderRadius:8,cursor:"pointer",color:tab===id?T.accent:T.muted,fontWeight:tab===id?700:500,fontSize:13,marginBottom:2,transition:"all .15s",fontFamily:font,textAlign:"left",borderLeft:tab===id?`2px solid ${T.accent}`:"2px solid transparent"}}>
              <span style={{fontSize:16}}>{icon}</span>{label}
            </button>
          ))}
          <button className="nav-btn" onClick={onBack} style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"10px 12px",background:"transparent",border:"none",borderRadius:8,cursor:"pointer",color:T.muted,fontWeight:500,fontSize:13,marginTop:8,fontFamily:font,textAlign:"left",borderLeft:"2px solid transparent"}}>
            <span style={{fontSize:16}}>←</span>Home
          </button>
        </nav>
        <div style={{padding:"14px 16px",borderTop:`1px solid ${T.border}`}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <Avatar initials={(trainer.name||"T").slice(0,2).toUpperCase()} size={36} color={trainer.accent||T.accent} photo={trainer.photo}/>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:13,fontWeight:600,color:T.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{trainer.name}</div>
              <div style={{fontSize:11,color:T.muted}}>Pro Trainer</div>
            </div>
            <button onClick={onLogout} title="Logout" style={{background:"transparent",border:"none",color:T.muted,cursor:"pointer",fontSize:16}}>⏻</button>
          </div>
        </div>
      </div>

      {/* ── MAIN ── */}
      <div style={{flex:1,overflow:"auto"}}>
        {/* Top bar */}
        <div style={{background:T.surface,borderBottom:`1px solid ${T.border}`,padding:"14px 28px",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:10}}>
          <div>
            <div style={{fontSize:18,fontWeight:700,color:T.text}}>{NAV.find(n=>n.id===tab)?.label}</div>
            <div style={{fontSize:12,color:T.muted,marginTop:1}}>{new Date().toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}</div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{position:"relative"}}>
              <button onClick={()=>setNotifOpen(!notifOpen)} style={{background:T.s2,border:`1px solid ${T.border}`,borderRadius:8,width:36,height:36,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:T.mutedL,fontSize:16}}>🔔</button>
              {atRiskClients>0&&<div style={{position:"absolute",top:-3,right:-3,width:16,height:16,borderRadius:"50%",background:T.danger,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,color:"#fff"}}>{atRiskClients}</div>}
              {notifOpen&&(
                <div style={{position:"absolute",top:44,right:0,width:290,background:T.surface,border:`1px solid ${T.border}`,borderRadius:10,padding:12,zIndex:20,boxShadow:"0 8px 32px #00000088"}}>
                  <div style={{fontSize:11,color:T.muted,letterSpacing:2,textTransform:"uppercase",marginBottom:10}}>Alerts</div>
                  {clients.filter(c=>c.status==="at-risk"||c.status==="inactive").length===0
                    ?<div style={{fontSize:12,color:T.muted,textAlign:"center",padding:"12px 0"}}>All clients active ✓</div>
                    :clients.filter(c=>c.status!=="active").map(c=>(
                      <div key={c.id} style={{display:"flex",gap:10,alignItems:"flex-start",padding:"8px 0",borderBottom:`1px solid ${T.border}`}}>
                        <Avatar initials={c.avatar} size={28} color={statusColor(c.status)}/>
                        <div>
                          <div style={{fontSize:12,color:T.text,fontWeight:600}}>{c.name}</div>
                          <div style={{fontSize:11,color:T.muted}}>Last seen: {fmtDate(c.updatedAt||c.createdAt)}</div>
                        </div>
                      </div>
                    ))
                  }
                </div>
              )}
            </div>
            <button onClick={()=>setShowLogSession(true)} style={{background:T.s2,color:T.mutedL,border:`1px solid ${T.border}`,borderRadius:8,padding:"8px 14px",cursor:"pointer",fontWeight:600,fontSize:13,fontFamily:font}}>
              + Log Session
            </button>
            <button onClick={()=>setShowAddClient(true)} style={{background:T.accent,color:"#000",border:"none",borderRadius:8,padding:"8px 16px",cursor:"pointer",fontWeight:700,fontSize:13,fontFamily:font}}>
              + Add Client
            </button>
          </div>
        </div>

        {/* ── OVERVIEW ── */}
        {tab==="overview"&&(
          <div style={{padding:"24px 28px"}}>
            {clients.length===0&&(
              <div style={{...card(true),marginBottom:20,textAlign:"center",padding:"32px 20px",background:"#071510"}}>
                <div style={{fontSize:40,marginBottom:12}}>🏋️</div>
                <div style={{fontSize:18,fontWeight:700,color:T.text,marginBottom:8}}>Welcome, {trainer.name.split(" ")[0]}!</div>
                <div style={{fontSize:13,color:T.muted,marginBottom:20,lineHeight:1.7}}>Your dashboard is live. Start by adding your first client, then send them their personalised invite link.</div>
                <div style={{display:"flex",gap:12,justifyContent:"center"}}>
                  <button onClick={()=>setShowAddClient(true)} style={{padding:"12px 24px",background:T.accent,color:"#000",border:"none",borderRadius:8,fontWeight:700,cursor:"pointer",fontSize:14,fontFamily:font}}>+ Add First Client</button>
                  <button onClick={()=>setTab("settings")} style={{padding:"12px 24px",background:T.s2,color:T.mutedL,border:`1px solid ${T.border}`,borderRadius:8,fontWeight:600,cursor:"pointer",fontSize:14,fontFamily:font}}>Set Up Profile</button>
                </div>
              </div>
            )}
            {/* KPIs */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:24}}>
              {[
                {label:"Active Clients",value:activeClients,sub:`of ${clients.length} total`,icon:"◈",color:T.accent},
                {label:"Avg Form Score",value:avgScore||"—",sub:"across all clients",icon:"◬",color:T.gold},
                {label:"Sessions Today",value:`${completedToday}/${todaySched.length}`,sub:"completed today",icon:"◷",color:T.blue},
                {label:"Need Attention",value:atRiskClients,sub:"inactive 3+ days",icon:"⚠",color:T.danger},
              ].map(({label,value,sub,icon,color})=>(
                <div key={label} style={{...card(false),position:"relative",overflow:"hidden"}} className="card-hover">
                  <div style={{position:"absolute",top:0,left:0,width:3,height:"100%",background:color,borderRadius:"12px 0 0 12px"}}/>
                  <div style={{paddingLeft:8}}>
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                      <div style={{...lbl}}>{label}</div>
                      <div style={{fontSize:18,opacity:.4}}>{icon}</div>
                    </div>
                    <div style={{fontSize:32,fontWeight:900,color,letterSpacing:-1.5,lineHeight:1}}>{value}</div>
                    <div style={{fontSize:11,color:T.muted,marginTop:6}}>{sub}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
              {/* Client list */}
              <div style={{...card(false)}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
                  <div style={{...lbl}}>Clients</div>
                  <button onClick={()=>setTab("roster")} style={{fontSize:11,color:T.accent,background:"transparent",border:"none",cursor:"pointer",fontFamily:font}}>View all →</button>
                </div>
                {clients.length===0
                  ?<div style={{fontSize:12,color:T.muted,textAlign:"center",padding:"20px 0"}}>No clients yet — <span style={{color:T.accent,cursor:"pointer"}} onClick={()=>setShowAddClient(true)}>add your first</span></div>
                  :[...clients].sort((a,b)=>(b.score||0)-(a.score||0)).slice(0,6).map((c,i)=>(
                    <div key={c.id} onClick={()=>setSelectedClient(c)} className="row-hover"
                      style={{display:"flex",alignItems:"center",gap:10,padding:"8px 8px",borderRadius:8,marginBottom:4}}>
                      <div style={{fontSize:12,color:T.muted,width:16,fontWeight:700}}>#{i+1}</div>
                      <Avatar initials={c.avatar} size={30} color={c.score?scoreColor(c.score):T.muted}/>
                      <div style={{flex:1}}>
                        <div style={{fontSize:13,color:T.text,fontWeight:600}}>{c.name}</div>
                        <div style={{fontSize:11,color:T.muted}}>{c.sessions||0} sessions · {c.goal}</div>
                      </div>
                      <ScoreBadge score={c.score||null}/>
                    </div>
                  ))
                }
              </div>
              {/* Today's schedule */}
              <div style={{...card(false)}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
                  <div style={{...lbl}}>Today's Schedule</div>
                  <button onClick={()=>setShowAddSchedule(true)} style={{fontSize:11,color:T.accent,background:"transparent",border:"none",cursor:"pointer",fontFamily:font}}>+ Add</button>
                </div>
                {todaySched.length===0
                  ?<div style={{fontSize:12,color:T.muted,textAlign:"center",padding:"20px 0"}}>No sessions scheduled today — <span style={{color:T.accent,cursor:"pointer"}} onClick={()=>setShowAddSchedule(true)}>add one</span></div>
                  :todaySched.map(s=>(
                    <div key={s.id} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 0",borderBottom:`1px solid ${T.border}`}}>
                      <div style={{fontSize:11,color:T.muted,width:52,flexShrink:0}}>{s.time}</div>
                      <div style={{width:3,height:28,borderRadius:2,background:T.accent,flexShrink:0}}/>
                      <div style={{flex:1}}>
                        <div style={{fontSize:12,color:s.status==="done"?T.muted:T.text,fontWeight:600}}>{s.client}</div>
                        <div style={{fontSize:11,color:T.muted}}>{s.type} · {s.duration}</div>
                      </div>
                      <button onClick={()=>{updateScheduleItem(SLUG,s.id,{status:s.status==="done"?"upcoming":"done"});refresh();}}
                        style={{fontSize:10,fontWeight:700,letterSpacing:1,color:s.status==="done"?T.muted:T.accent,background:s.status==="done"?T.s2:T.accentDim,padding:"2px 8px",borderRadius:4,border:"none",cursor:"pointer",fontFamily:font}}>
                        {s.status==="done"?"DONE":"DONE?"}
                      </button>
                    </div>
                  ))
                }
              </div>
            </div>
            {/* Recent sessions */}
            <div style={{...card(false)}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
                <div style={{...lbl}}>Recent Sessions</div>
                <button onClick={()=>setTab("sessions")} style={{fontSize:11,color:T.accent,background:"transparent",border:"none",cursor:"pointer",fontFamily:font}}>All sessions →</button>
              </div>
              {sessions.length===0
                ?<div style={{fontSize:12,color:T.muted,textAlign:"center",padding:"20px 0"}}>No sessions logged yet — <span style={{color:T.accent,cursor:"pointer"}} onClick={()=>setShowLogSession(true)}>log first session</span></div>
                :sessions.slice(0,5).map(s=>(
                  <div key={s.id} className="row-hover" style={{display:"flex",alignItems:"center",gap:10,padding:"8px 6px",borderRadius:8,marginBottom:4}}>
                    <Avatar initials={(s.clientName||"?").split(" ").map(n=>n[0]).join("").slice(0,2)} size={32} color={scoreColor(s.score)}/>
                    <div style={{flex:1}}>
                      <div style={{fontSize:13,color:T.text,fontWeight:600}}>{s.clientName}</div>
                      <div style={{fontSize:11,color:T.muted}}>{fmtDate(s.date)} · {s.sets} sets · Best: {s.topMetric}</div>
                      {s.notes&&<div style={{fontSize:10,color:T.accent,marginTop:2}}>📝 {s.notes.slice(0,50)}{s.notes.length>50?"...":""}</div>}
                    </div>
                    <ScoreBadge score={s.score}/>
                  </div>
                ))
              }
            </div>
          </div>
        )}

        {/* ── ROSTER ── */}
        {tab==="roster"&&(
          <div style={{padding:"24px 28px"}}>
            <div style={{display:"flex",gap:10,marginBottom:20}}>
              <input value={searchQ} onChange={e=>setSearchQ(e.target.value)} placeholder="Search clients..."
                style={{flex:1,background:T.surface,border:`1px solid ${T.border}`,borderRadius:8,padding:"9px 14px",color:T.text,fontSize:13,fontFamily:font,outline:"none"}}/>
              <div style={{display:"flex",gap:6}}>
                {["all","active","inactive"].map(f=>(
                  <button key={f} onClick={()=>setFilterStatus(f)} style={{padding:"8px 14px",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:600,background:filterStatus===f?T.accent:T.surface,color:filterStatus===f?"#000":T.muted,border:`1px solid ${filterStatus===f?T.accent:T.border}`,fontFamily:font,textTransform:"capitalize"}}>
                    {f}
                  </button>
                ))}
              </div>
              <button onClick={()=>setShowAddClient(true)} style={{padding:"8px 16px",background:T.accent,color:"#000",border:"none",borderRadius:8,fontWeight:700,cursor:"pointer",fontSize:13,fontFamily:font}}>+ Add</button>
            </div>
            {filteredClients.length===0
              ?<div style={{textAlign:"center",padding:"60px 20px",color:T.muted}}>
                <div style={{fontSize:40,marginBottom:12}}>◈</div>
                <div style={{fontSize:16,fontWeight:600,color:T.mutedL,marginBottom:8}}>No clients yet</div>
                <button onClick={()=>setShowAddClient(true)} style={{padding:"10px 24px",background:T.accent,color:"#000",border:"none",borderRadius:8,fontWeight:700,cursor:"pointer",fontSize:14,fontFamily:font}}>Add Your First Client</button>
              </div>
              :<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:12}}>
                {filteredClients.map(c=>{
                  const col=c.score?scoreColor(c.score):T.muted;
                  return(
                    <div key={c.id} className="card-hover" onClick={()=>setSelectedClient(c)}
                      style={{...card(false),cursor:"pointer",transition:"all .2s"}}>
                      <div style={{display:"flex",alignItems:"flex-start",gap:12,marginBottom:14}}>
                        <Avatar initials={c.avatar} size={44} color={col}/>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:3}}>
                            <div style={{fontSize:14,fontWeight:700,color:T.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.name}</div>
                            <div style={{width:6,height:6,borderRadius:"50%",background:statusColor(c.status||"active"),flexShrink:0}}/>
                          </div>
                          <div style={{fontSize:11,color:T.muted}}>{c.goal} · {plans[c.plan]?.name||c.plan||"Starter"}</div>
                          <div style={{fontSize:11,color:T.muted,marginTop:2}}>Last: {fmtDate(c.updatedAt||c.createdAt)}</div>
                        </div>
                        {c.score?<ScoreBadge score={c.score} size="md"/>:<div style={{fontSize:11,color:T.muted}}>No sessions</div>}
                      </div>
                      <MiniBar value={c.score||0} color={col}/>
                      <div style={{display:"flex",gap:0,marginTop:12}}>
                        {[{l:"Sessions",v:c.sessions||0},{l:"Streak",v:`${c.streak||0}d`},{l:"Score",v:c.score||"—"}].map(({l,v},i)=>(
                          <div key={l} style={{flex:1,textAlign:"center",borderRight:i<2?`1px solid ${T.border}`:"none"}}>
                            <div style={{fontSize:9,color:T.muted,letterSpacing:1.5,textTransform:"uppercase",marginBottom:3}}>{l}</div>
                            <div style={{fontSize:14,fontWeight:700,color:T.text}}>{v}</div>
                          </div>
                        ))}
                      </div>
                      <button onClick={e=>{e.stopPropagation();setInviteClient(c);}} style={{marginTop:10,width:"100%",padding:"8px",background:T.accentDim,border:`1px solid ${T.accent}40`,borderRadius:7,color:T.accent,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:font}}>
                        🔗 Send Invite Link
                      </button>
                    </div>
                  );
                })}
              </div>
            }
          </div>
        )}

        {/* ── SESSIONS ── */}
        {tab==="sessions"&&(
          <div style={{padding:"24px 28px"}}>
            <div style={{...card(false),overflow:"hidden"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
                <div style={{...lbl}}>All Sessions ({sessions.length})</div>
                <button onClick={()=>setShowLogSession(true)} style={{padding:"7px 14px",background:T.accent,color:"#000",border:"none",borderRadius:7,fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:font}}>+ Log Session</button>
              </div>
              {sessions.length===0
                ?<div style={{textAlign:"center",padding:"40px 20px",color:T.muted}}>
                  <div style={{fontSize:32,marginBottom:8}}>◉</div>
                  <div style={{fontSize:14,color:T.mutedL,marginBottom:12}}>No sessions logged yet</div>
                  <button onClick={()=>setShowLogSession(true)} style={{padding:"10px 20px",background:T.accent,color:"#000",border:"none",borderRadius:8,fontWeight:700,cursor:"pointer",fontSize:13,fontFamily:font}}>Log First Session</button>
                </div>
                :<>
                  <div style={{display:"grid",gridTemplateColumns:"2fr 1.2fr 1fr 1fr 1fr 0.7fr",gap:10,padding:"8px 12px",background:T.s2,borderRadius:6,marginBottom:8}}>
                    {["Client","Date","Score","Sets/Reps","Best Metric","Pose"].map(h=>(
                      <div key={h} style={{fontSize:10,color:T.muted,fontWeight:700,letterSpacing:1,textTransform:"uppercase"}}>{h}</div>
                    ))}
                  </div>
                  {sessions.map((s,i)=>(
                    <div key={s.id} className="row-hover" style={{display:"grid",gridTemplateColumns:"2fr 1.2fr 1fr 1fr 1fr 0.7fr",gap:10,padding:"10px 12px",borderRadius:6,borderBottom:i<sessions.length-1?`1px solid ${T.border}`:"none",cursor:"pointer"}}
                      onClick={()=>{const c=clients.find(cl=>cl.id===s.clientId);if(c)setSelectedClient(c);}}>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <Avatar initials={(s.clientName||"?").split(" ").map(n=>n[0]).join("").slice(0,2)} size={28} color={scoreColor(s.score)}/>
                        <div>
                          <div style={{fontSize:13,color:T.text,fontWeight:600}}>{s.clientName}</div>
                          {s.notes&&<div style={{fontSize:10,color:T.accent}}>📝 Note</div>}
                        </div>
                      </div>
                      <div style={{fontSize:12,color:T.muted,alignSelf:"center"}}>{fmtDate(s.date)}</div>
                      <div style={{alignSelf:"center"}}><ScoreBadge score={s.score}/></div>
                      <div style={{fontSize:12,color:T.mutedL,alignSelf:"center"}}>{s.sets}×10</div>
                      <div style={{fontSize:12,color:T.accent,fontWeight:600,alignSelf:"center"}}>{s.topMetric}</div>
                      <div style={{alignSelf:"center"}}>{s.poseUsed?<div style={{fontSize:9,background:T.accentDim,color:T.accent,padding:"3px 6px",borderRadius:4,fontWeight:700,textAlign:"center"}}>LIVE</div>:<div style={{fontSize:9,background:T.s2,color:T.muted,padding:"3px 6px",borderRadius:4,fontWeight:700,textAlign:"center"}}>TAP</div>}</div>
                    </div>
                  ))}
                </>
              }
            </div>
          </div>
        )}

        {/* ── SCHEDULE ── */}
        {tab==="schedule"&&(
          <div style={{padding:"24px 28px"}}>
            <div style={{display:"flex",gap:14}}>
              <div style={{...card(false),flex:1}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
                  <div style={{...lbl}}>Today — {new Date().toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long"})}</div>
                  <button onClick={()=>setShowAddSchedule(true)} style={{padding:"7px 14px",background:T.accent,color:"#000",border:"none",borderRadius:7,fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:font}}>+ Schedule</button>
                </div>
                {todaySched.length===0
                  ?<div style={{textAlign:"center",padding:"40px 0",color:T.muted}}>
                    <div style={{fontSize:32,marginBottom:8}}>◷</div>
                    <div style={{fontSize:14,color:T.mutedL,marginBottom:12}}>Nothing scheduled today</div>
                    <button onClick={()=>setShowAddSchedule(true)} style={{padding:"9px 20px",background:T.accent,color:"#000",border:"none",borderRadius:8,fontWeight:700,cursor:"pointer",fontFamily:font}}>Add Session</button>
                  </div>
                  :todaySched.map((s,i)=>(
                    <div key={s.id} style={{display:"flex",gap:14,marginBottom:i<todaySched.length-1?20:0}}>
                      <div style={{display:"flex",flexDirection:"column",alignItems:"center",width:56,flexShrink:0}}>
                        <div style={{fontSize:12,color:s.status==="done"?T.muted:T.text,fontWeight:600,whiteSpace:"nowrap"}}>{s.time}</div>
                        {i<todaySched.length-1&&<div style={{flex:1,width:1,background:T.border,marginTop:6}}/>}
                      </div>
                      <div style={{flex:1,padding:"14px",borderRadius:10,background:s.status==="upcoming"?T.s2:T.s3,border:`1px solid ${s.status==="upcoming"?T.accent+"40":T.border}`,opacity:s.status==="done"?.6:1,marginBottom:6}}>
                        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
                          <div style={{fontSize:14,fontWeight:700,color:T.text}}>{s.client}</div>
                          <button onClick={()=>{updateScheduleItem(SLUG,s.id,{status:s.status==="done"?"upcoming":"done"});refresh();}}
                            style={{fontSize:10,fontWeight:700,color:s.status==="done"?T.muted:T.accent,background:s.status==="done"?T.s3:T.accentDim,padding:"3px 10px",borderRadius:4,border:"none",cursor:"pointer",fontFamily:font}}>
                            {s.status==="done"?"Completed":"Mark Done"}
                          </button>
                        </div>
                        <div style={{fontSize:12,color:T.muted}}>{s.type} · {s.duration}</div>
                      </div>
                    </div>
                  ))
                }
              </div>
              <div style={{width:280,display:"flex",flexDirection:"column",gap:12}}>
                <div style={{...card(false)}}>
                  <div style={{...lbl,marginBottom:14}}>Day Summary</div>
                  {[{l:"Total scheduled",v:todaySched.length},{l:"Completed",v:completedToday,col:T.accent},{l:"Remaining",v:todaySched.length-completedToday,col:T.gold}].map(({l,v,col})=>(
                    <div key={l} style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                      <span style={{fontSize:13,color:T.mutedL}}>{l}</span>
                      <span style={{fontSize:16,fontWeight:700,color:col||T.text}}>{v}</span>
                    </div>
                  ))}
                </div>
                <div style={{...card(false)}}>
                  <div style={{...lbl,marginBottom:14}}>All Upcoming</div>
                  {schedule.filter(s=>s.status==="upcoming").length===0
                    ?<div style={{fontSize:12,color:T.muted}}>No upcoming sessions</div>
                    :schedule.filter(s=>s.status==="upcoming").slice(0,5).map(s=>(
                      <div key={s.id} style={{padding:"8px 0",borderBottom:`1px solid ${T.border}`}}>
                        <div style={{fontSize:12,color:T.text,fontWeight:600}}>{s.client}</div>
                        <div style={{fontSize:11,color:T.muted}}>{s.date} {s.time} · {s.type}</div>
                      </div>
                    ))
                  }
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── ANALYTICS ── */}
        {tab==="analytics"&&(
          <div style={{padding:"24px 28px"}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
              <div style={{...card(false)}}>
                <div style={{...lbl,marginBottom:6}}>Client Leaderboard</div>
                <div style={{fontSize:11,color:T.muted,marginBottom:16}}>Ranked by form score</div>
                {clients.length===0
                  ?<div style={{fontSize:12,color:T.muted,textAlign:"center",padding:"20px 0"}}>No clients yet</div>
                  :[...clients].sort((a,b)=>(b.score||0)-(a.score||0)).map((c,i)=>{
                    const col=i===0?T.gold:i===1?T.mutedL:i===2?"#CD7F32":scoreColor(c.score||0);
                    return(
                      <div key={c.id} onClick={()=>setSelectedClient(c)} className="row-hover"
                        style={{display:"flex",alignItems:"center",gap:10,padding:"8px",borderRadius:8,marginBottom:4}}>
                        <div style={{fontSize:14,fontWeight:900,color:col,width:20}}>#{i+1}</div>
                        <Avatar initials={c.avatar} size={32} color={col}/>
                        <div style={{flex:1}}>
                          <div style={{fontSize:13,color:T.text,fontWeight:600}}>{c.name}</div>
                          <div style={{fontSize:11,color:T.muted}}>{c.sessions||0} sessions</div>
                        </div>
                        <ScoreBadge score={c.score||null}/>
                      </div>
                    );
                  })
                }
              </div>
              <div style={{...card(false)}}>
                <div style={{...lbl,marginBottom:6}}>Revenue Estimate</div>
                <div style={{fontSize:11,color:T.muted,marginBottom:20}}>Based on your plan pricing</div>
                {Object.entries(plans).map(([key,plan])=>{
                  const count=clients.filter(c=>c.plan===key).length;
                  const rev=count*plan.priceUSD;
                  const colors={starter:T.mutedL,pro:T.blue,elite:T.gold};
                  return(
                    <div key={key} style={{marginBottom:14}}>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                        <div style={{display:"flex",alignItems:"center",gap:8}}>
                          <div style={{width:8,height:8,borderRadius:"50%",background:colors[key]}}/>
                          <span style={{fontSize:13,color:T.mutedL}}>{plan.name} ({count} clients)</span>
                        </div>
                        <span style={{fontSize:13,color:T.text,fontWeight:700}}>{localPrice(rev)}/mo</span>
                      </div>
                      <MiniBar value={count?100:0} color={colors[key]}/>
                    </div>
                  );
                })}
                <div style={{marginTop:20,padding:"14px",background:T.s2,borderRadius:8}}>
                  <div style={{...lbl,marginBottom:8}}>Total Monthly Revenue</div>
                  <div style={{fontSize:28,fontWeight:900,color:T.accent}}>
                    {localPrice(clients.reduce((total,c)=>total+(plans[c.plan]?.priceUSD||0),0))}
                  </div>
                  <div style={{fontSize:11,color:T.muted,marginTop:4}}>from {clients.length} client{clients.length!==1?"s":""}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab==="settings"&&(
          <div style={{padding:"24px 28px", height:"calc(100vh - 65px)", overflow:"hidden", display:"flex", flexDirection:"column"}}>
            <div style={{display:"grid", gridTemplateColumns:"1.4fr 1fr", gap:14, flex:1, overflow:"hidden", alignItems:"start"}}>
              {/* Left column — scrollable independently */}
              <div style={{display:"flex", flexDirection:"column", gap:14, height:"100%", overflowY:"auto", paddingRight:4}}>
                {/* Profile */}
                <div style={{...card(false)}}>
                  <div style={{...lbl, marginBottom:18}}>Trainer Profile</div>
                  <div style={{display:"flex", alignItems:"center", gap:16, marginBottom:20}}>
                    <Avatar initials={(trainer.name||"T").slice(0,2).toUpperCase()} size={72} color={trainer.accent||T.accent} photo={trainer.photo}/>
                    <div>
                      <div style={{fontSize:14, fontWeight:700, color:T.text}}>{trainer.name}</div>
                      <div style={{fontSize:12, color:T.muted, marginTop:2}}>{trainer.specialization||trainer.tagline||"Trainer"}</div>
                      <div style={{fontSize:11, color:T.accent, marginTop:4}}>{CURRENCIES[trainer.currency||"NGN"]?.flag} {trainer.currency||"NGN"}</div>
                    </div>
                  </div>
                  {[{label:"Display Name",key:"name",type:"text",ph:"Coach Adams"},
                    {label:"Photo URL",key:"photo",type:"text",ph:"https://... or /photoadams.jpg"},
                    {label:"Tagline",key:"tagline",type:"text",ph:"Strength & Conditioning Coach"},
                    {label:"Email",key:"email",type:"email",ph:"you@email.com"},
                  ].map(({label:fl,key,type,ph})=>(
                    <div key={key} style={{marginBottom:14}}>
                      <div style={{fontSize:10,color:T.muted,letterSpacing:1.5,textTransform:"uppercase",marginBottom:5}}>{fl}</div>
                      <input type={type} value={trainer[key]||""} placeholder={ph}
                        onChange={e=>{setTrainer(p=>({...p,[key]:e.target.value}));setProfileDirty(true);}}
                        style={inp}/>
                    </div>
                  ))}
                  <div style={{marginBottom:14}}>
                    <div style={{fontSize:10,color:T.muted,letterSpacing:1.5,textTransform:"uppercase",marginBottom:5}}>Welcome Message</div>
                    <textarea rows={3} value={trainer.welcome||""} onChange={e=>{setTrainer(p=>({...p,welcome:e.target.value}));setProfileDirty(true);}} style={{...inp,resize:"vertical"}} placeholder="Message clients see when they open their invite..."/>
                  </div>
                  <div style={{marginBottom:20}}>
                    <div style={{fontSize:10,color:T.muted,letterSpacing:1.5,textTransform:"uppercase",marginBottom:8}}>Brand Colour</div>
                    <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                      {["#00E676","#3D8EF0","#F5A623","#9B6DFF","#FF4757","#FF6B6B","#00CEC9","#FDCB6E"].map(col=>(
                        <div key={col} onClick={()=>{setTrainer(p=>({...p,accent:col}));setProfileDirty(true);}}
                          style={{width:28,height:28,borderRadius:"50%",background:col,cursor:"pointer",border:`3px solid ${trainer.accent===col?"#fff":"transparent"}`,boxShadow:trainer.accent===col?`0 0 0 1px ${col}`:"none",transition:"all .15s"}}/>
                      ))}
                    </div>
                  </div>
                  <button onClick={saveProfile} style={{width:"100%",padding:"12px",fontWeight:700,fontSize:14,background:profileSaved?T.accentDim:(profileDirty?T.accent:T.s2),color:profileSaved?T.accent:(profileDirty?"#000":T.muted),border:`1px solid ${profileSaved?T.accent:T.border}`,borderRadius:8,cursor:"pointer",fontFamily:font,transition:"all .2s"}}>
                    {profileSaved?"✓ Saved!":profileDirty?"Save Profile":"No Changes"}
                  </button>
                </div>

                {/* Client Plans */}
                <div style={{...card(false)}}>
                  <div style={{...lbl,marginBottom:16}}>Your Client Plans</div>
                  {PLAN_KEYS.map((key,idx)=>{
                    const p=plans[key]||{name:"",priceUSD:0,maxClients:10,description:""};
                    const colors=[T.mutedL,T.blue,T.gold];
                    const col=colors[idx];
                    return(
                      <div key={key} style={{marginBottom:16,padding:"14px",background:T.s2,borderRadius:10,border:`1px solid ${col}30`}}>
                        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
                          <div style={{width:8,height:8,borderRadius:"50%",background:col}}/>
                          <div style={{fontSize:13,fontWeight:700,color:col,textTransform:"capitalize"}}>{key} tier</div>
                        </div>
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
                          <div>
                            <div style={{fontSize:9,color:T.muted,letterSpacing:1.5,textTransform:"uppercase",marginBottom:4}}>Plan Name</div>
                            <input value={p.name} onChange={e=>{setPlans(ps=>({...ps,[key]:{...ps[key],name:e.target.value}}));setPlansDirty(true);}} style={inp}/>
                          </div>
                          <div>
                            <div style={{fontSize:9,color:T.muted,letterSpacing:1.5,textTransform:"uppercase",marginBottom:4}}>Price (USD/mo)</div>
                            <input type="number" min="1" value={p.priceUSD} onChange={e=>{setPlans(ps=>({...ps,[key]:{...ps[key],priceUSD:Number(e.target.value)}}));setPlansDirty(true);}} style={inp}/>
                          </div>
                        </div>
                        <div style={{marginBottom:8}}>
                          <div style={{fontSize:9,color:T.muted,letterSpacing:1.5,textTransform:"uppercase",marginBottom:4}}>Max Clients</div>
                          <input type="number" min="1" value={p.maxClients} onChange={e=>{setPlans(ps=>({...ps,[key]:{...ps[key],maxClients:Number(e.target.value)}}));setPlansDirty(true);}} style={inp}/>
                        </div>
                        <div>
                          <div style={{fontSize:9,color:T.muted,letterSpacing:1.5,textTransform:"uppercase",marginBottom:4}}>Description</div>
                          <input value={p.description} onChange={e=>{setPlans(ps=>({...ps,[key]:{...ps[key],description:e.target.value}}));setPlansDirty(true);}} placeholder="Who is this plan for?" style={inp}/>
                        </div>
                        <div style={{fontSize:11,color:col,marginTop:8,fontWeight:600}}>{localPrice(p.priceUSD)}/mo · {p.maxClients===999?"Unlimited":p.maxClients} clients max</div>
                      </div>
                    );
                  })}
                  <button onClick={savePlans} style={{width:"100%",padding:"12px",fontWeight:700,fontSize:14,background:plansSaved?T.accentDim:(plansDirty?T.accent:T.s2),color:plansSaved?T.accent:(plansDirty?"#000":T.muted),border:`1px solid ${plansSaved?T.accent:T.border}`,borderRadius:8,cursor:"pointer",fontFamily:font,transition:"all .2s"}}>
                    {plansSaved?"✓ Plans Saved!":plansDirty?"Save Plans":"No Changes"}
                  </button>
                </div>
              </div>

              {/* Right column — scrollable independently */}
              <div style={{height:"100%", overflowY:"auto", paddingLeft:4}}>
                <div style={{...card(false)}}>
                  <div style={{...lbl,marginBottom:14}}>Base Currency</div>
                  <div style={{fontSize:12,color:T.muted,marginBottom:14,lineHeight:1.8}}>
                    Sets your billing currency.<br/>
                    <strong style={{color:"#00C3FF"}}>Paystack</strong> — African currencies.<br/>
                    <strong style={{color:"#635BFF"}}>Stripe</strong> — all others.
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                    {Object.entries(CURRENCIES).map(([code,{flag,gateway,name}])=>(
                      <div key={code} onClick={()=>{setTrainer(p=>({...p,currency:code}));setProfileDirty(true);}}
                        style={{padding:"10px",borderRadius:8,cursor:"pointer",background:trainer.currency===code?T.s3:T.s2,border:`1px solid ${trainer.currency===code?T.accent:T.border}`,transition:"all .15s"}}>
                        <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
                          <span style={{fontSize:16}}>{flag}</span>
                          <span style={{fontSize:12,fontWeight:700,color:trainer.currency===code?T.accent:T.text}}>{code}</span>
                          <span style={{fontSize:8,color:gateway==="paystack"?"#00C3FF":"#635BFF",background:gateway==="paystack"?"#00C3FF18":"#635BFF18",padding:"1px 5px",borderRadius:3,fontWeight:700,marginLeft:"auto"}}>{gateway==="paystack"?"PS":"ST"}</span>
                        </div>
                        <div style={{fontSize:10,color:T.muted}}>{name||code}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      {selectedClient&&<ClientDrawer client={selectedClient} sessions={sessions} plans={plans} trainerSlug={SLUG} baseUrl={baseUrl} onClose={()=>setSelectedClient(null)} onRefresh={()=>{refresh();setSelectedClient(c=>getClients(SLUG).find(cl=>cl.id===c?.id)||c);}}/>}
      {showAddClient&&<AddClientModal trainerSlug={SLUG} plans={plans} onSave={()=>{refresh();setShowAddClient(false);}} onClose={()=>setShowAddClient(false)}/>}
      {showLogSession&&<LogSessionModal trainerSlug={SLUG} clients={clients} onSave={()=>{refresh();setShowLogSession(false);}} onClose={()=>setShowLogSession(false)}/>}
      {showAddSchedule&&<AddScheduleModal trainerSlug={SLUG} clients={clients} onSave={()=>{refresh();setShowAddSchedule(false);}} onClose={()=>setShowAddSchedule(false)}/>}
      {inviteClient&&<InviteManager client={inviteClient} trainerSlug={SLUG} baseUrl={baseUrl} onClose={()=>setInviteClient(null)}/>}
    </div>
  );
}