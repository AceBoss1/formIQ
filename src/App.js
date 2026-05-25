import TrainerDashboard from "./TrainerDashboard";
import TrainerRegistration from "./TrainerRegistration";
import { ClientInviteLanding, CoachBrandedBanner, parseInviteHash } from "./CoachBranded";
import { getClientCtx, saveClientCtx, isTrainerLoggedIn, getTrainer, saveTrainer, getSessionUsage, isSessionAllowed, incrementSession, FREE_LIMITS, sessionsRemaining } from "./db";
import { SessionBadge, PaywallModal } from "./FreeSessionGate";
import { useState, useEffect, useRef } from "react";

// ── Palette ───────────────────────────────────────────────────
const C = {
  bg:"#080808", surface:"#111111", s2:"#1A1A1A", s3:"#222222",
  border:"#272727", accent:"#00E676", warn:"#FFB300", danger:"#FF3D3D",
  blue:"#4488FF", text:"#F0F0F0", muted:"#777777", mutedLight:"#AAAAAA",
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
  "Screw your feet into the floor for maximum stability",
  "Grip the floor with your toes — create a stable base",
  "Keep your elbows tucked under the bar",
  "Control the descent — never free-fall into the squat",
  "Drive your traps into the bar on the ascent",
  "Sit between your hips, not on top of your knees",
  "Push the floor away instead of thinking 'stand up'",
  "Maintain tension at the bottom — don't relax in the hole",
  "Big breath at the top · reset · repeat",
  "Keep your ribs down — avoid overextending your back",
  "Lock in your upper back before unracking",
  "Walk the bar out with minimal steps",
  "Stay tight from unrack to rerack",
  "Don't let your knees cave inward on the ascent",
  "Hips and shoulders rise together out of the hole",
  "Use your lats to stabilize the bar path",
  "Think 'spread the floor apart' with your feet",
  "Depth first — hit parallel with control",
  "Keep the bar balanced over your center of gravity",
  "Stay patient in the bottom position",
  "Explode up while maintaining form",
  "Maintain full-foot contact throughout the rep",
  "Tension before motion — get tight before descending",
  "Keep your chin neutral — avoid looking too high up",
  "Breathe and brace before every rep, even lightweight sets",
  "Strong setup equals strong reps",
  "Reset your stance between reps if needed",
  "Control your tempo — don't rush the movement",
  "Train consistency before adding more weight",
  "Quality reps build strength faster than ego lifting",
  "Use your glutes to finish the lockout",
  "Keep the movement smooth and repeatable",
  "Stay stacked — ribs over hips throughout the lift",
  "Foot pressure should stay balanced heel-to-toe",
  "Own the bottom position with confidence",
  "Push evenly through both legs",
  "Tight core · stable feet · powerful drive",
  "Every rep should look almost identical",
  "Think power, not panic, out of the hole",
  "Stability creates strength",
];

const SITE = "formiq.name.ng";

const mc     = (v) => v>=80?C.accent:v>=60?C.warn:C.danger;
const grade  = (s) => s>=90?"S":s>=82?"A+":s>=75?"A":s>=65?"B":s>=55?"C":"D";
const gLabel = (s) => s>=90?"Elite":s>=82?"Excellent":s>=75?"Strong":s>=65?"Good":s>=55?"Fair":"Needs Work";
const avg    = (arr) => arr.length?arr.reduce((s,v)=>s+v,0)/arr.length:0;

const calcAngle = (a,b,c) => {
  const r=Math.atan2(c.y-b.y,c.x-b.x)-Math.atan2(a.y-b.y,a.x-b.x);
  let d=Math.abs(r*180/Math.PI);
  if(d>180)d=360-d;
  return d;
};

const calcRealMetrics = (repData) => {
  if(!repData||repData.length<2)return null;
  const avgMinKnee=avg(repData.map(r=>r.minKneeAngle));
  const avgSpine=avg(repData.map(r=>r.avgSpineAngle));
  const avgHip=avg(repData.map(r=>r.avgHipAngle));
  const avgKAlign=avg(repData.map(r=>r.kneeAlignScore));
  const durs=repData.map(r=>r.duration);
  const avgDur=avg(durs);
  const variance=avg(durs.map(d=>Math.pow(d-avgDur,2)));
  const depthScore=avgMinKnee<=75?100:avgMinKnee<=90?95:avgMinKnee<=100?82:avgMinKnee<=110?68:avgMinKnee<=125?52:35;
  const spineScore=avgSpine>=20&&avgSpine<=50?Math.min(100,90+(45-Math.abs(avgSpine-35))*0.4):avgSpine<20?Math.max(50,90-(20-avgSpine)*2.2):Math.max(38,90-(avgSpine-50)*2.5);
  const tempoScore=Math.max(28,Math.min(100,100-variance*22));
  const hipScore=avgHip>=80&&avgHip<=145?Math.min(100,85+(110-Math.abs(avgHip-110))*0.28):Math.max(35,75-Math.abs(avgHip-110)*1.4);
  return {
    kneeAlignment:Math.round(Math.min(100,Math.max(20,avgKAlign))),
    spineNeutrality:Math.round(Math.min(100,Math.max(20,spineScore))),
    squatDepth:Math.round(depthScore),
    tempoConsistency:Math.round(Math.min(100,Math.max(20,tempoScore))),
    hipHinge:Math.round(Math.min(100,Math.max(20,hipScore))),
  };
};

const mkSimMetrics = (setNum) => {
  const g=(setNum-1)*3.5;
  const r=(b)=>Math.min(100,Math.floor(b+g+(Math.random()-0.28)*17));
  return{kneeAlignment:r(68),spineNeutrality:r(65),squatDepth:r(62),tempoConsistency:r(59),hipHinge:r(71)};
};

const calcScore = (m) => Math.round(METRICS_DEF.reduce((s,{key,weight})=>s+m[key]*weight,0));

const fallback = (s,set,total) =>
  s>=82?`Clean set — mechanics held up well. Sharpen descent tempo to a deliberate 2-count for more power out of the hole. ${set<total?"Stay locked in for the next set.":"Strong session — consistency is building."}`
  :s>=65?`Form held early but slipped around reps 6–8 as fatigue built. Drive knees out, keep chest from diving. ${set<total?"Full rest then come back with more intention.":"Target that correction next session."}`
  :`Form broke down — brace harder before every rep and sit back like reaching for a box behind you. ${set<total?"Take the full rest and reset.":"Make this the priority correction next session."}`;

const loadScript = (src) => new Promise((res,rej) => {
  if(document.querySelector(`script[src="${src}"]`)){res();return;}
  const s=Object.assign(document.createElement("script"),{src,crossOrigin:"anonymous",onload:res,onerror:()=>rej(new Error("Failed: "+src))});
  document.head.appendChild(s);
});

const BONES=[[11,12],[11,23],[12,24],[23,24],[23,25],[25,27],[24,26],[26,28],[27,29],[28,30],[29,31],[30,32],[11,13],[13,15],[12,14],[14,16]];
const KEY_POINTS=[11,12,23,24,25,26,27,28];

function roundRect(ctx,x,y,w,h,r){
  ctx.beginPath();
  ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);
  ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  ctx.lineTo(x+r,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-r);
  ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);
  ctx.closePath();
}

// ── Session history ───────────────────────────────────────────
const LS_KEY="fiq_sessions";
const loadSessions=()=>{try{return JSON.parse(localStorage.getItem(LS_KEY)||"[]");}catch{return[];}};
const saveSession=(entry)=>{try{const p=loadSessions();p.unshift(entry);localStorage.setItem(LS_KEY,JSON.stringify(p.slice(0,50)));}catch{}};
const clearSessions=()=>{try{localStorage.removeItem(LS_KEY);}catch{}};

// ── Report canvas ─────────────────────────────────────────────
const generateReportCanvas=({screenName,finalScore,history,totalSets,REPS,logoImg,logo512Img})=>{
  const W=800,H=1260;
  const canvas=document.createElement("canvas");
  canvas.width=W;canvas.height=H;
  const ctx=canvas.getContext("2d");
  const ACCENT="#00E676",WARN="#FFB300",DANGER="#FF3D3D";
  const scoreColor=finalScore>=80?ACCENT:finalScore>=60?WARN:DANGER;
  ctx.fillStyle="#080808";ctx.fillRect(0,0,W,H);
  ctx.strokeStyle="#FFFFFF06";ctx.lineWidth=1;
  for(let x=0;x<W;x+=50){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
  for(let y=0;y<H;y+=50){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
  const topGrad=ctx.createLinearGradient(0,0,W,0);
  topGrad.addColorStop(0,ACCENT+"FF");topGrad.addColorStop(0.6,ACCENT+"88");topGrad.addColorStop(1,ACCENT+"00");
  ctx.fillStyle=topGrad;ctx.fillRect(0,0,W,5);
  const COL=W/2,HDR_H=190,PAD=32,LOGO_RATIO=2661/1024;
  const lLogoW=COL-PAD-20,lLogoH=Math.round(lLogoW/LOGO_RATIO),lLogoY=Math.round((HDR_H-lLogoH)/2)+2;
  if(logoImg){try{ctx.drawImage(logoImg,PAD,lLogoY,lLogoW,lLogoH);}catch{}}
  else{ctx.fillStyle="#FFFFFF";ctx.font="bold 38px system-ui";ctx.textAlign="left";ctx.fillText("FormIQ",PAD,90);}
  ctx.strokeStyle=ACCENT+"25";ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(COL,18);ctx.lineTo(COL,HDR_H-14);ctx.stroke();
  const RX=COL+PAD,RW=W-RX-PAD;let ry=28;
  roundRect(ctx,RX,ry,RW,24,6);ctx.fillStyle="#1C1C1C";ctx.fill();
  ctx.strokeStyle=ACCENT+"40";ctx.lineWidth=1;ctx.stroke();
  ctx.font="bold 10px system-ui";ctx.fillStyle=ACCENT;ctx.textAlign="center";
  ctx.fillText("SESSION REPORT",RX+RW/2,ry+16);ry+=36;
  ctx.font="10px system-ui";ctx.fillStyle="#BBBBBB";ctx.textAlign="left";
  ctx.fillText("AI SQUAT COACH  ·  PHASE 2",RX,ry);ry+=22;
  if(screenName){ctx.font="bold 30px system-ui";ctx.fillStyle="#F0F0F0";ctx.textAlign="left";
    ctx.save();ctx.beginPath();ctx.rect(RX,ry-28,RW,36);ctx.clip();
    ctx.fillText(screenName,RX,ry);ctx.restore();ry+=36;}
  const dateStr=new Date().toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"});
  ctx.font="bold 14px system-ui";ctx.fillStyle="#CCCCCC";ctx.textAlign="left";
  ctx.fillText(dateStr,RX,ry);ry+=22;
  ctx.font="bold 14px system-ui";ctx.fillStyle=ACCENT;ctx.fillText(`🌐  ${SITE}`,RX,ry);
  let yp=HDR_H+10;
  const divGrad=ctx.createLinearGradient(0,0,W,0);
  divGrad.addColorStop(0,ACCENT+"00");divGrad.addColorStop(0.3,ACCENT+"99");
  divGrad.addColorStop(0.7,ACCENT+"99");divGrad.addColorStop(1,ACCENT+"00");
  ctx.fillStyle=divGrad;ctx.fillRect(0,yp,W,2);yp+=20;
  const bx=48,bw=W-96,bh=175;
  const glow=ctx.createRadialGradient(W/2,yp+bh/2,10,W/2,yp+bh/2,bw*0.55);
  glow.addColorStop(0,scoreColor+"28");glow.addColorStop(1,"transparent");
  ctx.fillStyle=glow;ctx.fillRect(bx-20,yp-20,bw+40,bh+40);
  roundRect(ctx,bx,yp,bw,bh,14);ctx.fillStyle="#0C0C0C";ctx.fill();
  ctx.strokeStyle=scoreColor+"55";ctx.lineWidth=1.5;ctx.stroke();
  ctx.font="bold 100px system-ui";ctx.fillStyle=scoreColor;ctx.textAlign="center";
  ctx.fillText(finalScore,W/2,yp+108);
  ctx.font="bold 22px system-ui";ctx.fillStyle=scoreColor;
  ctx.fillText(`${grade(finalScore)}  ·  ${gLabel(finalScore)}`,W/2,yp+148);
  ctx.font="bold 12px system-ui";ctx.fillStyle="#AAAAAA";
  ctx.fillText(`${totalSets} SETS  ·  ${totalSets*REPS} REPS`,W/2,yp+170);
  yp+=bh+26;
  ctx.font="bold 11px system-ui";ctx.fillStyle="#BBBBBB";ctx.textAlign="left";
  ctx.fillText("SET-BY-SET BREAKDOWN",48,yp);yp+=18;
  const setW=(W-96-(history.length-1)*12)/history.length;
  history.forEach(({setNumber:sn,score:sc,usedPose:up},i)=>{
    const sx=48+i*(setW+12),sc_col=sc>=80?ACCENT:sc>=60?WARN:DANGER;
    roundRect(ctx,sx,yp,setW,82,10);ctx.fillStyle="#141414";ctx.fill();
    ctx.strokeStyle=sc_col+"40";ctx.lineWidth=1;ctx.stroke();
    ctx.font="bold 11px system-ui";ctx.fillStyle="#BBBBBB";ctx.textAlign="center";
    ctx.fillText(`S${sn}${up?" ●":""}`,sx+setW/2,yp+18);
    ctx.font="bold 34px system-ui";ctx.fillStyle=sc_col;ctx.fillText(sc,sx+setW/2,yp+54);
    ctx.fillStyle="#252525";roundRect(ctx,sx+14,yp+64,setW-28,5,2);ctx.fill();
    ctx.fillStyle=sc_col;roundRect(ctx,sx+14,yp+64,(setW-28)*(sc/100),5,2);ctx.fill();
  });
  yp+=82+22;
  ctx.font="bold 11px system-ui";ctx.fillStyle="#BBBBBB";ctx.textAlign="left";
  ctx.fillText("FORM BREAKDOWN — SESSION AVERAGE",48,yp);yp+=18;
  const avgM={};
  METRICS_DEF.forEach(({key})=>{avgM[key]=history.length?Math.round(history.reduce((s,e)=>s+e.metrics[key],0)/history.length):0;});
  METRICS_DEF.forEach(({key,label:lb})=>{
    const v=avgM[key],col=v>=80?ACCENT:v>=60?WARN:DANGER;
    ctx.font="14px system-ui";ctx.fillStyle="#DDDDDD";ctx.textAlign="left";ctx.fillText(lb,48,yp+5);
    ctx.font="bold 14px system-ui";ctx.fillStyle=col;ctx.textAlign="right";ctx.fillText(`${v}/100`,W-48,yp+5);
    ctx.fillStyle="#1E1E1E";roundRect(ctx,48,yp+14,W-96,7,3);ctx.fill();
    ctx.fillStyle=col;roundRect(ctx,48,yp+14,(W-96)*(v/100),7,3);ctx.fill();
    yp+=42;
  });
  yp+=10;
  ctx.strokeStyle="#282828";ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(48,yp);ctx.lineTo(W-48,yp);ctx.stroke();yp+=22;
  const invH=205;
  roundRect(ctx,32,yp,W-64,invH,14);
  const invGrad=ctx.createLinearGradient(32,yp,W-32,yp+invH);
  invGrad.addColorStop(0,"#081A10");invGrad.addColorStop(1,"#060C07");
  ctx.fillStyle=invGrad;ctx.fill();ctx.strokeStyle=ACCENT+"50";ctx.lineWidth=1.5;ctx.stroke();
  const il=88,ilx=W-32-il-20,ily=yp+(invH-il)/2;
  if(logo512Img){try{ctx.drawImage(logo512Img,ilx,ily,il,il);}catch{}}
  const invX=52,invTW=W-64-il-40;
  ctx.textAlign="left";ctx.font="bold 11px system-ui";ctx.fillStyle=ACCENT;
  ctx.fillText("🏋️  YOUR FRIEND JUST CRUSHED THEIR SQUATS",invX,yp+28);
  ctx.font="bold 22px system-ui";ctx.fillStyle="#F0F0F0";
  ctx.save();ctx.beginPath();ctx.rect(invX,yp+32,invTW,30);ctx.clip();
  ctx.fillText(`${screenName||"They"} scored ${finalScore}/100`,invX,yp+58);ctx.restore();
  ctx.font="14px system-ui";ctx.fillStyle="#CCCCCC";
  ctx.fillText(`Grade ${grade(finalScore)} · ${gLabel(finalScore)} · ${totalSets} sets · ${totalSets*REPS} reps`,invX,yp+82);
  ctx.font="13px system-ui";ctx.fillStyle="#AAAAAA";
  ctx.fillText("FormIQ uses AI + live camera pose tracking to analyse",invX,yp+108);
  ctx.fillText("your squat form in real time and coach you after every set.",invX,yp+126);
  ctx.font="bold 12px system-ui";ctx.fillStyle=ACCENT;ctx.fillText(`Try it free at  ${SITE}`,invX,yp+148);
  roundRect(ctx,invX,yp+158,200,36,8);ctx.fillStyle=ACCENT;ctx.fill();
  ctx.font="bold 13px system-ui";ctx.fillStyle="#000000";ctx.textAlign="center";
  ctx.fillText("TRY FORMIQ FREE →",invX+100,yp+181);ctx.textAlign="left";
  yp+=invH+20;
  ctx.strokeStyle="#1E1E1E";ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(32,yp);ctx.lineTo(W-32,yp);ctx.stroke();yp+=14;
  const FTR_H=86;
  if(logo512Img){const fls=68,flx=PAD,fly=yp+(FTR_H-fls)/2;try{ctx.drawImage(logo512Img,flx,fly,fls,fls);}catch{}}
  let fry=yp+20;
  ctx.font="bold 16px system-ui";ctx.fillStyle=ACCENT;ctx.textAlign="right";ctx.fillText(SITE,W-PAD,fry);fry+=22;
  ctx.font="11px system-ui";ctx.fillStyle="#888888";ctx.textAlign="right";
  ctx.fillText("Real-time Form Tracking  ·  AI Squat Coaching  ·  Session Scoring",W-PAD,fry);fry+=18;
  ctx.fillStyle="#555555";ctx.fillText(`Generated ${new Date().toLocaleString()}`,W-PAD,fry);
  const botGrad=ctx.createLinearGradient(0,H-5,W,H-5);
  botGrad.addColorStop(0,ACCENT+"00");botGrad.addColorStop(0.5,ACCENT+"99");botGrad.addColorStop(1,ACCENT+"00");
  ctx.fillStyle=botGrad;ctx.fillRect(0,H-5,W,5);
  return canvas;
};

// ── HistoryModal ──────────────────────────────────────────────
function HistoryModal({sessions,onClose,onClear}){
  const mc2=(v)=>v>=80?"#00E676":v>=60?"#FFB300":"#FF3D3D";
  const grade2=(s)=>s>=90?"S":s>=82?"A+":s>=75?"A":s>=65?"B":s>=55?"C":"D";
  const fmt=(iso)=>{const d=new Date(iso);return d.toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"})+" · "+d.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"});};
  const METRICS_LABELS={kneeAlignment:"Knee",spineNeutrality:"Spine",squatDepth:"Depth",tempoConsistency:"Tempo",hipHinge:"Hip"};
  const [expanded,setExpanded]=useState(null);
  const best=sessions.length?Math.max(...sessions.map(s=>s.score)):0;
  const avgScore=sessions.length?Math.round(sessions.reduce((s,e)=>s+e.score,0)/sessions.length):0;
  const trend=sessions.length>=2?sessions[0].score-sessions[sessions.length-1].score:0;
  return(
    <div style={{position:"fixed",inset:0,background:"#000000E8",zIndex:9999,display:"flex",flexDirection:"column",fontFamily:"system-ui"}}>
      <div style={{background:"#111",borderBottom:"1px solid #222",padding:"16px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
        <div>
          <div style={{fontSize:16,fontWeight:700,color:"#F0F0F0"}}>Session History</div>
          <div style={{fontSize:12,color:"#777",marginTop:2}}>{sessions.length} session{sessions.length!==1?"s":""} recorded</div>
        </div>
        <button onClick={onClose} style={{background:"#1A1A1A",border:"1px solid #333",color:"#CCC",borderRadius:8,padding:"8px 14px",cursor:"pointer",fontSize:13}}>✕ Close</button>
      </div>
      {sessions.length>=2&&(
        <div style={{background:"#0D0D0D",padding:"12px 20px",borderBottom:"1px solid #1A1A1A",display:"flex",gap:0,flexShrink:0}}>
          {[{label:"Sessions",val:sessions.length},{label:"Best Score",val:best,col:mc2(best)},{label:"Average",val:avgScore,col:mc2(avgScore)},{label:"Trend",val:(trend>0?"+":"")+trend,col:trend>0?"#00E676":trend<0?"#FF3D3D":"#777"}].map(({label,val,col})=>(
            <div key={label} style={{flex:1,textAlign:"center",padding:"4px 0",borderRight:"1px solid #1A1A1A"}}>
              <div style={{fontSize:10,color:"#555",letterSpacing:2,textTransform:"uppercase",marginBottom:3}}>{label}</div>
              <div style={{fontSize:20,fontWeight:800,color:col||"#F0F0F0"}}>{val}</div>
            </div>
          ))}
        </div>
      )}
      <div style={{flex:1,overflowY:"auto",padding:"12px 16px"}}>
        {sessions.map((s,i)=>(
          <div key={s.id} style={{background:expanded===i?"#141414":"#111",border:`1px solid ${expanded===i?"#272727":"#1A1A1A"}`,borderRadius:10,marginBottom:10,overflow:"hidden"}}>
            <div onClick={()=>setExpanded(expanded===i?null:i)} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",cursor:"pointer"}}>
              <div style={{width:42,height:42,borderRadius:8,background:mc2(s.score)+"18",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                <span style={{fontSize:16,fontWeight:900,color:mc2(s.score)}}>{s.score}</span>
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:2}}>
                  <span style={{fontSize:13,fontWeight:700,color:"#F0F0F0"}}>{grade2(s.score)} · {s.score}/100</span>
                  {i===0&&<span style={{fontSize:9,background:"#00E67618",color:"#00E676",padding:"1px 6px",borderRadius:4,fontWeight:700}}>LATEST</span>}
                  {s.score===best&&sessions.length>1&&<span style={{fontSize:9,background:"#FFB30018",color:"#FFB300",padding:"1px 6px",borderRadius:4,fontWeight:700}}>BEST</span>}
                </div>
                <div style={{fontSize:11,color:"#666"}}>{fmt(s.date)}</div>
                <div style={{fontSize:11,color:"#555",marginTop:2}}>{s.totalSets} sets · {s.totalReps} reps · {s.camMode==="single"?"Single cam":"Quad sim"}{s.usedPose?" · Pose":""}</div>
              </div>
              <div style={{color:"#444",fontSize:14}}>{expanded===i?"▲":"▼"}</div>
            </div>
            {expanded===i&&s.avgMetrics&&(
              <div style={{padding:"0 14px 14px",borderTop:"1px solid #1A1A1A"}}>
                <div style={{fontSize:10,color:"#555",letterSpacing:2,textTransform:"uppercase",margin:"10px 0 8px"}}>Metric Averages</div>
                {Object.entries(METRICS_LABELS).map(([key,label])=>{
                  const v=s.avgMetrics[key]||0;
                  return(
                    <div key={key} style={{marginBottom:8}}>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                        <span style={{fontSize:12,color:"#AAAAAA"}}>{label}</span>
                        <span style={{fontSize:12,fontWeight:700,color:mc2(v)}}>{v}/100</span>
                      </div>
                      <div style={{height:3,background:"#1E1E1E",borderRadius:2,overflow:"hidden"}}>
                        <div style={{height:"100%",width:`${v}%`,background:mc2(v),borderRadius:2}}/>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
      <div style={{padding:"12px 16px",borderTop:"1px solid #1A1A1A",flexShrink:0,background:"#0D0D0D"}}>
        <button onClick={()=>{if(window.confirm("Clear all session history?"))onClear();}}
          style={{width:"100%",padding:"12px",background:"transparent",color:"#555",border:"1px solid #222",borderRadius:8,cursor:"pointer",fontSize:13,fontFamily:"system-ui"}}>
          🗑 Clear All History
        </button>
      </div>
    </div>
  );
}

// ── ScreenName Modal ──────────────────────────────────────────
function ScreenNameModal({value,onSave}){
  const [n,setN]=useState(value||"");
  return(
    <div style={{position:"fixed",inset:0,background:"#000000CC",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9999,padding:20,fontFamily:"system-ui"}}>
      <div style={{background:"#111",border:"1px solid #333",borderRadius:14,padding:"28px 24px",maxWidth:380,width:"100%"}}>
        <div style={{fontSize:22,marginBottom:6,textAlign:"center"}}>🏋️</div>
        <div style={{fontSize:16,fontWeight:700,color:"#F0F0F0",textAlign:"center",marginBottom:6}}>What should we call you?</div>
        <div style={{fontSize:13,color:"#AAAAAA",textAlign:"center",marginBottom:20,lineHeight:1.5}}>Your name appears on the session report you share with friends.</div>
        <input autoFocus value={n} onChange={e=>setN(e.target.value)}
          onKeyDown={e=>e.key==="Enter"&&n.trim()&&onSave(n.trim())}
          placeholder="e.g. Adams, Coach K, Big Lifts..."
          maxLength={28}
          style={{width:"100%",padding:"13px 14px",background:"#1A1A1A",border:"1px solid #333",borderRadius:8,color:"#F0F0F0",fontSize:15,outline:"none",boxSizing:"border-box",marginBottom:14,fontFamily:"system-ui"}}/>
        <button onClick={()=>n.trim()&&onSave(n.trim())}
          style={{width:"100%",padding:"14px",background:"#00E676",color:"#000",border:"none",borderRadius:8,fontWeight:800,fontSize:14,cursor:"pointer",letterSpacing:2,textTransform:"uppercase",fontFamily:"system-ui"}}>
          Save & Generate Report
        </button>
        <button onClick={()=>onSave("")}
          style={{width:"100%",padding:"10px",background:"transparent",color:"#888",border:"none",cursor:"pointer",fontSize:12,marginTop:8,fontFamily:"system-ui"}}>
          Skip — share without name
        </button>
      </div>
    </div>
  );
}

// ── Share Modal ───────────────────────────────────────────────
function ShareModal({canvas,onClose}){
  const [status,setStatus]=useState("idle");
  const [errMsg,setErrMsg]=useState("");
  const previewUrl=canvas.toDataURL("image/png");
  const getPngBlob=()=>new Promise(res=>canvas.toBlob(res,"image/png"));
  const shareViaSheet=async()=>{
    setStatus("sharing");setErrMsg("");
    try{
      const blob=await getPngBlob();
      const file=new File([blob],"FormIQ-Session-Report.png",{type:"image/png"});
      const shareData={title:"My FormIQ Squat Session",text:`Check out my squat form report from FormIQ AI 🏋️ — try it free at https://${SITE}`,files:[file]};
      if(navigator.share&&navigator.canShare&&navigator.canShare(shareData)){await navigator.share(shareData);setStatus("done");}
      else if(navigator.share){await navigator.share({title:"FormIQ — AI Squat Coach",text:`I just tracked my squat form with FormIQ AI 🏋️ — try it free at https://${SITE}`,url:`https://${SITE}`});setStatus("done");}
      else{setErrMsg("Your browser doesn't support native sharing. Download the PNG below.");setStatus("error");}
    }catch(e){if(e.name==="AbortError"){setStatus("idle");}else{setErrMsg("Sharing failed — download below.");setStatus("error");}}
  };
  const downloadPng=async()=>{const blob=await getPngBlob();const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="FormIQ-Session-Report.png";a.click();URL.revokeObjectURL(url);setStatus("idle");};
  const btn=(bg,col,border,onClick,disabled,children)=>(
    <button onClick={onClick} disabled={disabled} style={{display:"flex",alignItems:"center",justifyContent:"center",gap:10,width:"100%",padding:"15px",background:disabled?"#1A1A1A":bg,color:disabled?"#555":col,border:border||"none",borderRadius:10,fontWeight:700,fontSize:14,cursor:disabled?"default":"pointer",letterSpacing:1,textTransform:"uppercase",marginBottom:10,opacity:disabled?.6:1,fontFamily:"system-ui"}}>{children}</button>
  );
  return(
    <div style={{position:"fixed",inset:0,background:"#000000E0",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:9999,fontFamily:"system-ui"}}>
      <div style={{background:"#111",borderTop:"1px solid #333",borderRadius:"20px 20px 0 0",width:"100%",maxWidth:560,padding:"20px 20px 40px",maxHeight:"92vh",overflowY:"auto"}}>
        <div style={{width:36,height:4,background:"#333",borderRadius:2,margin:"0 auto 18px"}}/>
        <div style={{fontSize:15,fontWeight:700,color:"#F0F0F0",marginBottom:3,textAlign:"center"}}>Share Session Report</div>
        <div style={{fontSize:12,color:"#AAAAAA",textAlign:"center",marginBottom:16}}>Your device will open a share sheet — pick any app</div>
        <div style={{borderRadius:10,overflow:"hidden",marginBottom:18,border:"1px solid #222",background:"#000",maxHeight:320,overflowY:"hidden"}}>
          <img src={previewUrl} alt="Report" style={{width:"100%",display:"block"}}/>
        </div>
        {errMsg&&<div style={{background:"#FF3D3D18",border:"1px solid #FF3D3D40",borderRadius:8,padding:"10px 14px",marginBottom:12,fontSize:12,color:"#FF9999",lineHeight:1.5}}>{errMsg}</div>}
        {btn("#00E676","#000","none",shareViaSheet,status==="sharing",<><span style={{fontSize:20}}>{status==="sharing"?"⏳":status==="done"?"✅":"📤"}</span><span>{status==="sharing"?"Opening share sheet...":status==="done"?"Shared!":"Share via WhatsApp / Telegram / Any App"}</span></>)}
        <div style={{background:"#1A1A1A",border:"1px solid #2A2A2A",borderRadius:8,padding:"10px 14px",marginBottom:10}}>
          <div style={{fontSize:11,color:"#AAAAAA",lineHeight:1.7}}><strong style={{color:"#CCCCCC"}}>How it works:</strong> Tap above to open your device's native share sheet. Select WhatsApp, Telegram, Instagram, or any app. The full report image is attached automatically.</div>
        </div>
        {btn("#1A1A1A","#CCCCCC","1px solid #333",downloadPng,false,<><span style={{fontSize:18}}>⬇️</span><span>Download PNG</span></>)}
        <button onClick={onClose} style={{width:"100%",padding:"13px",background:"transparent",color:"#777",border:"none",cursor:"pointer",fontSize:13,marginTop:4,fontFamily:"system-ui"}}>Close</button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// FORMIQ SQUAT APP
// ══════════════════════════════════════════════════════════════
function FormIQ({ onBack, clientCtx }){
  const [screen,setScreen]         = useState("setup");
  const [camMode,setCamMode]       = useState(null);
  const [totalSets,setTotalSets]   = useState(3);
  const [curSet,setCurSet]         = useState(1);
  const [reps,setReps]             = useState(0);
  const [repFlash,setRepFlash]     = useState(false);
  const [analyzing,setAnalyzing]   = useState(false);
  const [feedback,setFeedback]     = useState("");
  const [history,setHistory]       = useState([]);
  const [metrics,setMetrics]       = useState(null);
  const [resting,setResting]       = useState(false);
  const [restT,setRestT]           = useState(0);
  const [finalScore,setFinalScore] = useState(null);
  const [tipI,setTipI]             = useState(0);
  const [scan,setScan]             = useState(0);
  const [dots,setDots]             = useState(0);
  const [camError,setCamError]     = useState("");
  const [camReady,setCamReady]     = useState(false);
  const [facingMode,setFacingMode] = useState("environment");
  const [poseStatus,setPoseStatus] = useState("idle");
  const [formAlerts,setFormAlerts] = useState([]);
  const [liveAngles,setLiveAngles] = useState(null);
  const [repPhase,setRepPhase]     = useState("up");
  const [screenName,setScreenName] = useState(()=>localStorage.getItem("fiq_name")||"");
  const [showNameModal,setShowNameModal] = useState(false);
  const [shareCanvas,setShareCanvas]    = useState(null);
  const [logoImg,setLogoImg]       = useState(null);
  const [logo512Img,setLogo512Img] = useState(null);
  const [calibrated,setCalibrated] = useState(false);
  const [calStep,setCalStep]       = useState(0);
  const [poseDetected,setPoseDetected] = useState(false);
  const [sessionLog,setSessionLog] = useState(()=>loadSessions());
  const [showHistory,setShowHistory] = useState(false);
  // Free session gate
  const [showPaywall,setShowPaywall] = useState(false);
  const [sessionAllowed,setSessionAllowed] = useState(true);

  const videoRef=useRef(null),canvasRef=useRef(null),streamRef=useRef(null);
  const poseRef=useRef(null),animFrameRef=useRef(null),historyRef=useRef([]);
  const repsRef=useRef(0),curSetRef=useRef(1),totalSetsRef=useRef(3);
  const analyzingRef=useRef(false),repStateRef=useRef("up");
  const repDataRef=useRef([]),currentRepRef=useRef(null);
  const finishSetRef=useRef(null),onResultsRef=useRef(null);

  const REPS=10,REST=90,DOWN_T=112,UP_T=158;

  useEffect(()=>{repsRef.current=reps;},[reps]);
  useEffect(()=>{curSetRef.current=curSet;},[curSet]);
  useEffect(()=>{totalSetsRef.current=totalSets;},[totalSets]);
  useEffect(()=>{analyzingRef.current=analyzing;},[analyzing]);

  useEffect(()=>{
    const load=(src,setter)=>{const img=new Image();img.crossOrigin="anonymous";img.onload=()=>setter(img);img.onerror=()=>setter(null);img.src=src;};
    load(`${process.env.PUBLIC_URL}/formIQ.png`,setLogoImg);
    load(`${process.env.PUBLIC_URL}/logo512.png`,setLogo512Img);
  },[]);

  // Check if session is allowed when cam mode selected
  const checkAndStartSession = (mode) => {
    if (clientCtx) { setCamMode(mode); return; } // invited clients bypass gate
    const allowed = isSessionAllowed(mode);
    if (!allowed) { setCamMode(mode); setShowPaywall(true); return; }
    setCamMode(mode);
  };

  onResultsRef.current=(results)=>{
    if(!canvasRef.current||!videoRef.current)return;
    const canvas=canvasRef.current,ctx=canvas.getContext("2d");
    const W=videoRef.current.videoWidth||640,H=videoRef.current.videoHeight||480;
    canvas.width=W;canvas.height=H;ctx.clearRect(0,0,W,H);
    if(!results.poseLandmarks)return;
    setPoseDetected(true);
    const lm=results.poseLandmarks;
    const vis=(i)=>(lm[i]?.visibility||0)>0.32;
    const px=(i)=>({x:lm[i].x*W,y:lm[i].y*H});
    const useLeft=(lm[23]?.visibility||0)>=(lm[24]?.visibility||0);
    const [si,hi,ki,ai]=useLeft?[11,23,25,27]:[12,24,26,28];
    const pS=px(si),pH=px(hi),pK=px(ki),pA=px(ai);
    const allVis=vis(si)&&vis(hi)&&vis(ki)&&vis(ai);
    const kneeAngle=allVis?calcAngle(pH,pK,pA):null;
    const hipAngle=vis(si)&&vis(hi)&&vis(ki)?calcAngle(pS,pH,pK):null;
    const spineAngle=vis(si)&&vis(hi)?Math.abs(Math.atan2(pH.x-pS.x,pH.y-pS.y)*180/Math.PI):null;
    const kneeForward=allVis?(pK.x-pA.x)/(W*0.09):0;
    const kneeAlignScore=Math.max(20,Math.min(100,100-Math.max(0,kneeForward-0.5)*18));
    const boneColor=kneeAngle===null?C.blue:kneeAngle<95?C.accent:kneeAngle<132?C.warn:C.blue;
    ctx.lineCap="round";ctx.lineJoin="round";
    BONES.forEach(([a,b])=>{
      if(!lm[a]||!lm[b]||(lm[a].visibility||0)<0.28||(lm[b].visibility||0)<0.28)return;
      ctx.strokeStyle=boneColor+"CC";ctx.lineWidth=2.5;
      ctx.beginPath();ctx.moveTo(lm[a].x*W,lm[a].y*H);ctx.lineTo(lm[b].x*W,lm[b].y*H);ctx.stroke();
    });
    KEY_POINTS.forEach(i=>{
      if(!vis(i))return;
      ctx.beginPath();ctx.arc(lm[i].x*W,lm[i].y*H,i>=23?6:4,0,Math.PI*2);
      ctx.fillStyle=boneColor;ctx.fill();ctx.strokeStyle="#00000080";ctx.lineWidth=1.2;ctx.stroke();
    });
    if(kneeAngle!==null&&!analyzingRef.current&&repsRef.current<REPS){
      if(!currentRepRef.current){currentRepRef.current={startTime:Date.now(),minKneeAngle:kneeAngle,kneeAngles:[],spineAngles:[],hipAngles:[],kneeAlignScores:[]};}
      const cr=currentRepRef.current;
      cr.minKneeAngle=Math.min(cr.minKneeAngle,kneeAngle);
      cr.kneeAngles.push(kneeAngle);
      if(spineAngle!==null)cr.spineAngles.push(spineAngle);
      if(hipAngle!==null)cr.hipAngles.push(hipAngle);
      cr.kneeAlignScores.push(kneeAlignScore);
      if(repStateRef.current==="up"&&kneeAngle<DOWN_T){repStateRef.current="down";setRepPhase("down");}
      if(repStateRef.current==="down"&&kneeAngle>UP_T){
        repStateRef.current="up";setRepPhase("up");
        repDataRef.current.push({minKneeAngle:cr.minKneeAngle,avgSpineAngle:avg(cr.spineAngles),avgHipAngle:avg(cr.hipAngles),kneeAlignScore:avg(cr.kneeAlignScores),duration:(Date.now()-cr.startTime)/1000});
        currentRepRef.current=null;
        const nr=repsRef.current+1;repsRef.current=nr;setReps(nr);
        setRepFlash(true);setTimeout(()=>setRepFlash(false),200);
        if(nr>=REPS&&finishSetRef.current)setTimeout(()=>finishSetRef.current(),850);
      }
    }
    if(kneeAngle!==null)setLiveAngles({knee:Math.round(kneeAngle),hip:hipAngle?Math.round(hipAngle):"--",spine:spineAngle?Math.round(spineAngle):"--"});
    const alerts=[];
    if(kneeAngle!==null&&kneeAngle<162){
      if(spineAngle!==null&&spineAngle>60)alerts.push({text:"CHEST UP ↑",color:C.danger});
      if(kneeForward>1.9)alerts.push({text:"KNEES OUT →",color:C.warn});
      if(repStateRef.current==="down"&&kneeAngle>108)alerts.push({text:"SQUAT DEEPER ↓",color:C.warn});
    }
    setFormAlerts(alerts);
  };

  const loadPose=async()=>{
    if(poseRef.current||poseStatus==="loading"||poseStatus==="ready")return;
    setPoseStatus("loading");
    try{
      await loadScript("https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404/pose.js");
      const pose=new window.Pose({locateFile:(f)=>`https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404/${f}`});
      pose.setOptions({modelComplexity:1,smoothLandmarks:true,enableSegmentation:false,minDetectionConfidence:0.5,minTrackingConfidence:0.5});
      pose.onResults((r)=>onResultsRef.current(r));
      await pose.initialize();
      poseRef.current=pose;setPoseStatus("ready");
    }catch(err){console.error(err);setPoseStatus("error");}
  };

  const startCamera=async(facing)=>{
    setCamError("");setCamReady(false);
    try{
      if(streamRef.current)streamRef.current.getTracks().forEach(t=>t.stop());
      const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:facing,width:{ideal:1280},height:{ideal:720}},audio:false});
      streamRef.current=stream;
      if(videoRef.current){videoRef.current.srcObject=stream;videoRef.current.onloadedmetadata=()=>{videoRef.current.play();setCamReady(true);};}
    }catch(err){setCamError(err.name==="NotAllowedError"?"Camera permission denied. Allow access in browser settings.":err.name==="NotFoundError"?"No camera found on this device.":"Could not start camera: "+err.message);}
  };

  const stopCamera=()=>{
    if(animFrameRef.current)cancelAnimationFrame(animFrameRef.current);
    if(streamRef.current){streamRef.current.getTracks().forEach(t=>t.stop());streamRef.current=null;}
    setCamReady(false);
  };

  const flipCamera=()=>{const next=facingMode==="environment"?"user":"environment";setFacingMode(next);startCamera(next);};

  useEffect(()=>{
    if(!camReady||!poseRef.current||camMode!=="single")return;
    let running=true;
    const loop=async()=>{if(!running)return;if(videoRef.current?.readyState>=2){try{await poseRef.current.send({image:videoRef.current});}catch{}}if(running)animFrameRef.current=requestAnimationFrame(loop);};
    animFrameRef.current=requestAnimationFrame(loop);
    return()=>{running=false;cancelAnimationFrame(animFrameRef.current);};
  },[camReady,camMode]);// eslint-disable-line

  useEffect(()=>{
    if(poseStatus==="ready"&&camReady&&camMode==="single"){
      cancelAnimationFrame(animFrameRef.current);
      let running=true;
      const loop=async()=>{if(!running)return;if(videoRef.current?.readyState>=2){try{await poseRef.current.send({image:videoRef.current});}catch{}}if(running)animFrameRef.current=requestAnimationFrame(loop);};
      animFrameRef.current=requestAnimationFrame(loop);
      return()=>{running=false;cancelAnimationFrame(animFrameRef.current);};
    }
  },[poseStatus,camReady,camMode]);// eslint-disable-line

  useEffect(()=>{if(screen==="workout"&&camMode==="single"){startCamera(facingMode);loadPose();}if(screen!=="workout")stopCamera();},[screen,camMode]);// eslint-disable-line
  useEffect(()=>{if(screen!=="workout")return;const t=setInterval(()=>setTipI(i=>(i+1)%TIPS.length),4500);return()=>clearInterval(t);},[screen]);
  useEffect(()=>{const t=setInterval(()=>setScan(s=>(s+1.2)%100),35);return()=>clearInterval(t);},[]);
  useEffect(()=>{if(!analyzing)return;const t=setInterval(()=>setDots(d=>(d+1)%4),450);return()=>clearInterval(t);},[analyzing]);
  useEffect(()=>{
    if(!resting)return;
    const t=setInterval(()=>setRestT(r=>{if(r>=REST-1){setResting(false);setRestT(0);return 0;}return r+1;}),1000);
    return()=>clearInterval(t);
  },[resting]);

  const finishSet=async()=>{
    if(analyzingRef.current)return;
    // Increment session usage in db
    if(!clientCtx) incrementSession(camMode||"single");
    const realM=(camMode==="single"&&poseStatus==="ready"&&repDataRef.current.length>=2)?calcRealMetrics(repDataRef.current):null;
    const m=realM||mkSimMetrics(curSetRef.current);
    const score=calcScore(m);
    setMetrics(m);
    const entry={setNumber:curSetRef.current,score,metrics:m,usedPose:!!realM};
    historyRef.current=[...historyRef.current,entry];setHistory(historyRef.current);
    setAnalyzing(true);setScreen("analysis");
    if(curSetRef.current<totalSetsRef.current)setResting(true);
    repDataRef.current=[];repStateRef.current="up";currentRepRef.current=null;
    setRepPhase("up");setFormAlerts([]);setLiveAngles(null);
    try{
      const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:800,messages:[{role:"user",content:
          `You are an elite strength coach. Athlete finished Set ${curSetRef.current} of ${totalSetsRef.current} (10 squats). ${realM?"Live pose data:":"Simulated data:"}
Knee Alignment: ${m.kneeAlignment}/100\nSpine Neutrality: ${m.spineNeutrality}/100\nSquat Depth: ${m.squatDepth}/100\nTempo Control: ${m.tempoConsistency}/100\nHip Hinge: ${m.hipHinge}/100\nSet Score: ${score}/100
Respond in exactly 3 sentences. Direct coaching voice. No lists or headers.`}]})});
      const d=await res.json();
      const text=d.content?.map(b=>b.text||"").join("").trim();
      setFeedback(text||fallback(score,curSetRef.current,totalSetsRef.current));
    }catch{setFeedback(fallback(score,curSetRef.current,totalSetsRef.current));}
    setAnalyzing(false);
  };
  finishSetRef.current=finishSet;

  const nextSet=()=>{
    if(curSet>=totalSets){
      const h=historyRef.current;
      const fs=h.length?Math.round(h.reduce((s,e)=>s+e.score,0)/h.length):0;
      setFinalScore(fs);
      // Save to session history
      const sessionEntry={
        id:Date.now(),date:new Date().toISOString(),score:fs,
        totalSets,totalReps:totalSets*10,camMode,
        usedPose:h.some(s=>s.usedPose),
        sets:h.map(s=>({setNumber:s.setNumber,score:s.score,usedPose:s.usedPose})),
        avgMetrics:METRICS_DEF.reduce((acc,{key})=>({...acc,[key]:h.length?Math.round(h.reduce((sum,e)=>sum+e.metrics[key],0)/h.length):0}),{}),
      };
      saveSession(sessionEntry);setSessionLog(loadSessions());
      setScreen("results");
    }else{
      const n=curSet+1;setCurSet(n);curSetRef.current=n;
      setReps(0);repsRef.current=0;setFeedback("");setMetrics(null);setScreen("workout");
    }
  };

  const handleShare=(fs,h,ts)=>{
    if(!screenName){setShowNameModal(true);return;}
    const c=generateReportCanvas({screenName,finalScore:fs,history:h,totalSets:ts,REPS,logoImg,logo512Img});
    setShareCanvas(c);
  };
  const onNameSave=(name)=>{
    setScreenName(name);if(name)localStorage.setItem("fiq_name",name);
    setShowNameModal(false);
    const c=generateReportCanvas({screenName:name,finalScore:finalScore??0,history:historyRef.current,totalSets,REPS,logoImg,logo512Img});
    setShareCanvas(c);
  };

  const restart=()=>{
    stopCamera();setScreen("setup");setCamMode(null);setCurSet(1);curSetRef.current=1;
    setReps(0);repsRef.current=0;setHistory([]);historyRef.current=[];
    setMetrics(null);setFeedback("");setFinalScore(null);setAnalyzing(false);analyzingRef.current=false;
    setResting(false);setRestT(0);setTotalSets(3);totalSetsRef.current=3;
    setCamError("");setCamReady(false);setPoseStatus("idle");poseRef.current=null;
    setFormAlerts([]);setLiveAngles(null);repDataRef.current=[];repStateRef.current="up";
    currentRepRef.current=null;setShareCanvas(null);setCalibrated(false);setCalStep(0);setPoseDetected(false);
  };

  const tapRep=()=>{
    const poseActive=camMode==="single"&&poseStatus==="ready";
    if(reps>=REPS||analyzing||poseActive)return;
    const n=reps+1;repsRef.current=n;setReps(n);
    setRepFlash(true);setTimeout(()=>setRepFlash(false),200);
    if(n>=REPS)setTimeout(()=>finishSetRef.current?.(),850);
  };

  const font=`system-ui,-apple-system,'Segoe UI',sans-serif`;
  const page={background:C.bg,color:C.text,minHeight:"100vh",fontFamily:font};
  const card=(ac)=>({background:C.surface,borderRadius:10,padding:"16px 18px",border:`1px solid ${ac?C.accent+"40":C.border}`});
  const pil=(a)=>({width:36,height:36,borderRadius:8,cursor:"pointer",background:a?C.accent:C.s2,color:a?"#000":C.text,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:14});
  const lbl={fontSize:10,letterSpacing:3,color:C.muted,textTransform:"uppercase",fontWeight:600};

  // ── SETUP ────────────────────────────────────────────────────
  if(screen==="setup") return(
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

        {/* Hero — co-branded if invited client, normal otherwise */}
        {clientCtx ? (
          <div className="fu fu1" style={{marginBottom:28}}>
            <CoachBrandedBanner ctx={clientCtx} fullHeader/>
          </div>
        ) : (
          <div className="fu fu1" style={{textAlign:"center",marginBottom:36}}>
            {onBack&&(
              <button onClick={onBack} style={{display:"inline-flex",alignItems:"center",gap:6,background:"transparent",border:`1px solid ${C.border}`,color:C.mutedLight,borderRadius:8,padding:"6px 14px",cursor:"pointer",fontSize:12,fontWeight:600,marginBottom:16,fontFamily:font}}>← Home</button>
            )}
            <img src={`${process.env.PUBLIC_URL}/formIQ.png`} alt="FormIQ"
              style={{height:110,width:"auto",objectFit:"contain",display:"block",margin:"0 auto 14px"}}/>
            <div style={{display:"inline-block",fontSize:10,letterSpacing:3,color:C.accent,textTransform:"uppercase",fontWeight:600,background:C.accent+"15",padding:"4px 14px",borderRadius:20,border:`1px solid ${C.accent}30`}}>
              AI Squat Coach
            </div>
            <div style={{color:C.mutedLight,marginTop:12,fontSize:14}}>
              Live pose tracking · AI coaching · Real-time form scoring
            </div>
          </div>
        )}

        {/* Camera cards */}
        <div className="fu fu2" style={{marginBottom:18}}>
          <div style={{...lbl,marginBottom:10}}>Camera Setup</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            {[
              {id:"single",title:"Single Camera",badge:"LIVE NOW",locked:false,
               lines:["Uses your device camera","Side-on view recommended","Webcam or phone"],
               note:`✓ ${sessionsRemaining("single")===Infinity?"Unlimited":sessionsRemaining("single")+" free sessions left"}`},
              {id:"quad-4k",title:"Quad 4K System",badge:"COMING SOON",locked:true,
               lines:["4× cameras via HDMI","Front·Back·Left·Right","Capture card required"],
               note:`${sessionsRemaining("quad-4k")===Infinity?"Unlimited":sessionsRemaining("quad-4k")+" test sessions left"}`},
            ].map(({id,title,badge,locked,lines,note})=>(
              <div key={id} className="cc" onClick={()=>checkAndStartSession(id)} style={{
                ...card(false),cursor:"pointer",
                border:`1px solid ${camMode===id?C.accent:C.border}`,
                background:camMode===id?"#071510":C.surface,
                position:"relative",opacity:locked&&camMode!==id?.78:1,
                transition:"border-color .2s,background .2s"}}>
                <div style={{position:"absolute",top:12,right:12,fontSize:9,fontWeight:700,letterSpacing:1.5,padding:"3px 8px",borderRadius:4,background:locked?C.s3:(camMode===id?C.accent:C.s2),color:locked?C.warn:(camMode===id?"#000":C.muted),border:locked?`1px solid ${C.warn}40`:"none"}}>{badge}</div>
                <div style={{fontWeight:700,fontSize:14,marginBottom:8}}>{title}</div>
                {lines.map((l,i)=><div key={i} style={{fontSize:12,color:C.mutedLight,lineHeight:1.7}}>{l}</div>)}
                <div style={{marginTop:10,fontSize:11,fontWeight:600,color:locked?C.warn:C.accent}}>{note}</div>
              </div>
            ))}
          </div>
          {/* Session badge */}
          {camMode&&!clientCtx&&(
            <div style={{marginTop:10}}>
              <SessionBadge camMode={camMode}/>
            </div>
          )}
        </div>

        <div className="fu fu3" style={{...card(false),marginBottom:18}}>
          <div style={{...lbl,marginBottom:14}}>Session Config</div>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div>
              <div style={{fontWeight:600,fontSize:15}}>Number of Sets</div>
              <div style={{fontSize:12,color:C.mutedLight,marginTop:3}}>10 reps per set · 90s rest</div>
            </div>
            <div style={{display:"flex",gap:8}}>
              {[2,3,4,5].map(n=>(<div key={n} style={pil(totalSets===n)} onClick={()=>setTotalSets(n)}>{n}</div>))}
            </div>
          </div>
        </div>

        {!clientCtx&&(
          <div className="fu fu4" style={{...card(false),marginBottom:18,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div>
              <div style={{fontWeight:600,fontSize:14,color:C.text}}>{screenName?`👤 ${screenName}`:"Set your name for reports"}</div>
              <div style={{fontSize:12,color:C.mutedLight,marginTop:3}}>{screenName?"Shown on shared session reports":"Optional · appears on your share card"}</div>
            </div>
            <button onClick={()=>setShowNameModal(true)} style={{padding:"8px 14px",background:C.s2,color:C.text,border:`1px solid ${C.border}`,borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:600,whiteSpace:"nowrap",fontFamily:font}}>
              {screenName?"Edit":"Set Name"}
            </button>
          </div>
        )}

        <div className="fu fu5">
          <button onClick={()=>{
            if(!camMode)return;
            if(!isSessionAllowed(camMode)&&!clientCtx){setShowPaywall(true);return;}
            if(camMode==="single"){setScreen("calibrate");}else{setScreen("workout");}
          }} style={{width:"100%",padding:"18px",fontSize:15,fontWeight:800,background:camMode?C.accent:C.s3,color:camMode?"#000":C.muted,border:"none",borderRadius:10,cursor:camMode?"pointer":"default",letterSpacing:2.5,textTransform:"uppercase",transition:"all .25s",fontFamily:font}}>
            {!camMode?"Select a camera mode to start":camMode==="single"?"Calibrate & Begin →":"Preview Simulation →"}
          </button>
        </div>

        {!clientCtx&&sessionLog.length>0&&(
          <div style={{marginTop:14,textAlign:"center"}}>
            <button onClick={()=>setShowHistory(true)} style={{background:"transparent",border:`1px solid ${C.border}`,color:C.mutedLight,borderRadius:8,padding:"8px 18px",cursor:"pointer",fontSize:12,fontWeight:600,fontFamily:font}}>
              📈 Session History ({sessionLog.length})
            </button>
          </div>
        )}

        <div style={{display:"flex",gap:6,marginTop:16,flexWrap:"wrap",justifyContent:"center"}}>
          {["Live pose","Auto rep count","AI coaching","Form alerts","Shareable report"].map(f=>(
            <span key={f} style={{fontSize:11,color:C.mutedLight,background:C.s2,padding:"3px 10px",borderRadius:20}}>{f}</span>
          ))}
        </div>
      </div>

      {showNameModal&&<ScreenNameModal value={screenName} onSave={onNameSave}/>}
      {showHistory&&<HistoryModal sessions={sessionLog} onClose={()=>setShowHistory(false)} onClear={()=>{clearSessions();setSessionLog([]);setShowHistory(false);}}/>}
      {showPaywall&&<PaywallModal camMode={camMode||"single"} onPaid={()=>{setShowPaywall(false);setSessionAllowed(true);}} onClose={()=>setShowPaywall(false)}/>}
    </div>
  );

  // ── CALIBRATION ──────────────────────────────────────────────
  if(screen==="calibrate"){
    const CAL_STEPS=[
      {icon:"📐",title:"Position your camera",body:"Place your phone or webcam to the side — your full body from head to feet must be visible. Ideal distance: 6–8 feet from the camera.",
       visual:<div style={{display:"flex",justifyContent:"center",alignItems:"flex-end",gap:24,padding:"12px 0"}}>
         <div style={{textAlign:"center"}}><div style={{fontSize:32,marginBottom:4}}>📱</div><div style={{fontSize:10,color:C.mutedLight,letterSpacing:1}}>CAMERA</div></div>
         <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4}}><div style={{height:2,width:80,background:`repeating-linear-gradient(90deg,${C.accent} 0,${C.accent} 6px,transparent 6px,transparent 12px)`}}/><div style={{fontSize:11,color:C.mutedLight}}>6–8 ft</div></div>
         <div style={{textAlign:"center"}}><div style={{fontSize:32,marginBottom:4}}>🏋️</div><div style={{fontSize:10,color:C.mutedLight,letterSpacing:1}}>YOU</div></div>
       </div>},
      {icon:"↔️",title:"Stand side-on to the camera",body:"Face left or right — not toward the camera. Your left or right side should face the lens so MediaPipe can track your knee, hip, and spine angles accurately.",
       visual:<div style={{display:"flex",justifyContent:"center",gap:32,padding:"12px 0"}}>
         {[{label:"✅ CORRECT",sub:"Side view",ok:true,e:"🚶"},{label:"❌ WRONG",sub:"Facing camera",ok:false,e:"🧍"}].map(({label,sub,ok,e})=>(
           <div key={label} style={{textAlign:"center"}}>
             <div style={{width:60,height:80,borderRadius:8,marginBottom:6,background:ok?C.accent+"18":C.danger+"18",border:`1.5px solid ${ok?C.accent:C.danger}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:28}}>{e}</div>
             <div style={{fontSize:10,fontWeight:700,color:ok?C.accent:C.danger}}>{label}</div>
             <div style={{fontSize:10,color:C.mutedLight}}>{sub}</div>
           </div>
         ))}
       </div>},
      {icon:"💡",title:"Lighting & background",body:"Good lighting helps the AI track you accurately. Stand against a plain background if possible and avoid bright lights directly behind you.",
       visual:<div style={{display:"flex",justifyContent:"center",gap:20,padding:"12px 0"}}>
         {[{e:"☀️",l:"Natural light",ok:true},{e:"🌑",l:"Dark room",ok:false},{e:"🔦",l:"Backlight",ok:false}].map(({e,l,ok})=>(
           <div key={l} style={{textAlign:"center"}}><div style={{fontSize:28,marginBottom:4}}>{e}</div><div style={{fontSize:10,color:ok?C.accent:C.danger,fontWeight:600}}>{ok?"✓":"✗"}</div><div style={{fontSize:10,color:C.mutedLight}}>{l}</div></div>
         ))}
       </div>},
      {icon:"🤖",title:"Confirm pose tracking",
       body:poseDetected?"✅ Pose tracking is active — your skeleton is visible. You're ready to squat!":"Stand in frame now. The AI is loading and will detect your pose automatically. Wait for the green confirmation.",
       visual:(
         <div style={{position:"relative",borderRadius:10,overflow:"hidden",background:"#000",height:160}}>
           <video ref={videoRef} autoPlay playsInline muted style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}/>
           <canvas ref={canvasRef} style={{position:"absolute",inset:0,width:"100%",height:"100%",pointerEvents:"none"}}/>
           <div style={{position:"absolute",bottom:10,left:"50%",transform:"translateX(-50%)",background:poseDetected?"#00E67622":"#00000088",border:`1.5px solid ${poseDetected?C.accent:C.border}`,borderRadius:8,padding:"5px 14px",whiteSpace:"nowrap",display:"flex",alignItems:"center",gap:7}}>
             {poseDetected?<><div style={{width:7,height:7,borderRadius:"50%",background:C.accent}}/><span style={{fontSize:11,color:C.accent,fontWeight:700,letterSpacing:1}}>POSE DETECTED</span></>
               :<span style={{fontSize:11,color:C.mutedLight,letterSpacing:1}} className="pu">SCANNING...</span>}
           </div>
         </div>
       )},
    ];
    const step=CAL_STEPS[calStep];
    const isLast=calStep===CAL_STEPS.length-1;

    // Start camera + pose when reaching step 3
    useEffect(()=>{
      if(calStep===3){
        startCamera(facingMode);
        loadPose();
      }
      return()=>{
        if(calStep!==3) stopCamera();
      };
    },[calStep]); // eslint-disable-line
    return(
      <div style={{...page,padding:"24px 20px 32px"}}>
        <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.35}}.pu{animation:pulse 1.8s ease-in-out infinite}`}</style>
        <div style={{maxWidth:500,margin:"0 auto"}}>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:24}}>
            <button onClick={()=>{stopCamera();setCalStep(0);setPoseDetected(false);setScreen("setup");}} style={{background:C.s2,border:`1px solid ${C.border}`,color:C.text,borderRadius:8,padding:"7px 12px",cursor:"pointer",fontSize:13,fontFamily:font}}>← Back</button>
            <div style={{flex:1}}>
              <div style={{...lbl,marginBottom:4}}>Camera Setup · Step {calStep+1} of {CAL_STEPS.length}</div>
              <div style={{height:3,background:C.s2,borderRadius:2,overflow:"hidden"}}>
                <div style={{height:"100%",width:`${((calStep+1)/CAL_STEPS.length)*100}%`,background:C.accent,borderRadius:2,transition:"width .4s ease"}}/>
              </div>
            </div>
          </div>
          <div style={{display:"flex",gap:8,marginBottom:24,justifyContent:"center"}}>
            {CAL_STEPS.map((_,i)=>(<div key={i} style={{width:i===calStep?24:8,height:8,borderRadius:4,background:i<=calStep?C.accent:C.s2,transition:"all .3s ease"}}/>))}
          </div>
          <div style={{...card(false),marginBottom:18}}>
            <div style={{fontSize:32,textAlign:"center",marginBottom:10}}>{step.icon}</div>
            <div style={{fontSize:18,fontWeight:700,color:C.text,textAlign:"center",marginBottom:10}}>{step.title}</div>
            <div style={{fontSize:13,color:C.mutedLight,lineHeight:1.7,textAlign:"center",marginBottom:16}}>{step.body}</div>
            {step.visual&&<div style={{background:C.s2,borderRadius:8,padding:12,marginTop:8}}>{step.visual}</div>}
          </div>
          {isLast&&!poseDetected&&(
            <div style={{...card(false),marginBottom:14,background:C.warn+"12",border:`1px solid ${C.warn}30`}}>
              <div style={{fontSize:12,color:C.warn,lineHeight:1.6}}>⚠️ Pose not detected yet. You can still continue — tap counting works as fallback.</div>
            </div>
          )}
          <div style={{display:"flex",gap:10}}>
            {calStep>0&&(<button onClick={()=>setCalStep(c=>c-1)} style={{flex:1,padding:"15px",background:C.s2,color:C.text,border:`1px solid ${C.border}`,borderRadius:10,cursor:"pointer",fontWeight:700,fontSize:14,fontFamily:font}}>← Previous</button>)}
            <button onClick={()=>{if(isLast){setCalibrated(true);setScreen("workout");}else setCalStep(c=>c+1);}}
              style={{flex:2,padding:"15px",background:C.accent,color:"#000",border:"none",borderRadius:10,cursor:"pointer",fontWeight:800,fontSize:14,letterSpacing:2,textTransform:"uppercase",fontFamily:font}}>
              {isLast?(poseDetected?"Start Session →":"Skip & Start →"):"Next →"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── WORKOUT ──────────────────────────────────────────────────
  if(screen==="workout"){
    const pct=(reps/REPS)*100;
    const poseActive=camMode==="single"&&poseStatus==="ready";
    const poseLoading=poseStatus==="loading";
    const poseBadge=()=>{
      if(camMode!=="single")return null;
      const cfg={idle:{label:"INITIALISING",color:C.muted,bg:C.s2},loading:{label:"LOADING POSE AI...",color:C.warn,bg:C.warn+"18"},ready:{label:"POSE TRACKING LIVE",color:C.accent,bg:C.accent+"18"},error:{label:"POSE UNAVAILABLE",color:C.danger,bg:C.danger+"18"}}[poseStatus]||{};
      return(<div style={{display:"flex",alignItems:"center",gap:6,background:cfg.bg,padding:"5px 12px",borderRadius:6,border:`1px solid ${cfg.color}30`}}>
        {poseStatus==="ready"&&<div style={{width:6,height:6,borderRadius:"50%",background:C.accent}} className="pu"/>}
        {poseStatus==="loading"&&<div style={{fontSize:11}} className="pu">⟳</div>}
        <span style={{fontSize:9,color:cfg.color,letterSpacing:2,fontWeight:700}}>{cfg.label}</span>
      </div>);
    };
    const SimFeed=({label:lb,angle})=>(
      <div style={{background:"#030303",position:"relative",overflow:"hidden",aspectRatio:"4/3",display:"flex",alignItems:"center",justifyContent:"center"}}>
        <svg style={{position:"absolute",inset:0,width:"100%",height:"100%",opacity:.07}} preserveAspectRatio="none">
          {[1,2,3,4,5].map(i=><line key={`v${i}`} x1={`${i*16.66}%`} y1="0" x2={`${i*16.66}%`} y2="100%" stroke={C.accent} strokeWidth=".5"/>)}
          {[1,2,3].map(i=><line key={`h${i}`} x1="0" y1={`${i*25}%`} x2="100%" y2={`${i*25}%`} stroke={C.accent} strokeWidth=".5"/>)}
        </svg>
        <div style={{position:"absolute",left:0,right:0,height:1,top:`${scan}%`,background:`linear-gradient(90deg,transparent,${C.accent}60,transparent)`}}/>
        <svg viewBox="0 0 80 90" width="26%" style={{opacity:.22}}>
          <circle cx="40" cy="9" r="7" fill={C.accent}/>
          <line x1="40" y1="16" x2="36" y2="46" stroke={C.accent} strokeWidth="3" strokeLinecap="round"/>
          <line x1="38" y1="24" x2="20" y2="30" stroke={C.accent} strokeWidth="2.5" strokeLinecap="round"/>
          <line x1="38" y1="24" x2="56" y2="30" stroke={C.accent} strokeWidth="2.5" strokeLinecap="round"/>
          <line x1="36" y1="46" x2="20" y2="62" stroke={C.accent} strokeWidth="3" strokeLinecap="round"/>
          <line x1="36" y1="46" x2="52" y2="62" stroke={C.accent} strokeWidth="3" strokeLinecap="round"/>
          <line x1="20" y1="62" x2="14" y2="82" stroke={C.accent} strokeWidth="3" strokeLinecap="round"/>
          <line x1="52" y1="62" x2="58" y2="82" stroke={C.accent} strokeWidth="3" strokeLinecap="round"/>
          <line x1="4" y1="25" x2="72" y2="25" stroke={C.accent} strokeWidth="4" strokeLinecap="round"/>
          <circle cx="4" cy="25" r="5" fill="none" stroke={C.accent} strokeWidth="2"/>
          <circle cx="72" cy="25" r="5" fill="none" stroke={C.accent} strokeWidth="2"/>
        </svg>
        {[{top:7,left:7,bt:true,bl:true},{top:7,right:7,bt:true,br:true},{bottom:7,left:7,bb:true,bl:true},{bottom:7,right:7,bb:true,br:true}].map(({top,left,right,bottom,bt,br,bb,bl},i)=>(
          <div key={i} style={{position:"absolute",top,left,right,bottom,width:13,height:13,borderTop:bt?`2px solid ${C.accent}`:"none",borderRight:br?`2px solid ${C.accent}`:"none",borderBottom:bb?`2px solid ${C.accent}`:"none",borderLeft:bl?`2px solid ${C.accent}`:"none"}}/>
        ))}
        <div style={{position:"absolute",bottom:7,left:9,fontSize:9,color:C.accent,letterSpacing:2,fontWeight:700}}>{lb}</div>
        <div style={{position:"absolute",top:8,right:9,display:"flex",alignItems:"center",gap:4}}>
          <div style={{width:5,height:5,borderRadius:"50%",background:"#FF3B3B"}} className="pu"/>
          <span style={{fontSize:9,color:C.mutedLight,letterSpacing:1}}>SIM</span>
        </div>
        {angle&&<div style={{position:"absolute",top:8,left:9,fontSize:9,color:C.mutedLight,letterSpacing:1}}>{angle}</div>}
      </div>
    );
    return(
      <div style={{...page}}>
        <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.35}}.pu{animation:pulse 1.8s ease-in-out infinite}`}</style>
        {clientCtx&&<CoachBrandedBanner ctx={clientCtx}/>}
        {camMode==="single"&&(
          <div style={{position:"relative",background:"#000",width:"100%"}}>
            <video ref={videoRef} autoPlay playsInline muted style={{width:"100%",maxHeight:340,objectFit:"cover",display:"block"}}/>
            <canvas ref={canvasRef} style={{position:"absolute",top:0,left:0,width:"100%",height:"100%",pointerEvents:"none",objectFit:"cover"}}/>
            {poseStatus!=="ready"&&<div style={{position:"absolute",left:0,right:0,height:1,top:`${scan}%`,background:`linear-gradient(90deg,transparent,${C.accent}60,transparent)`,pointerEvents:"none"}}/>}
            {[{top:10,left:10,bt:true,bl:true},{top:10,right:10,bt:true,br:true},{bottom:10,left:10,bb:true,bl:true},{bottom:10,right:10,bb:true,br:true}].map(({top,left,right,bottom,bt,br,bb,bl},i)=>(
              <div key={i} style={{position:"absolute",top,left,right,bottom,width:18,height:18,pointerEvents:"none",borderTop:bt?`2px solid ${C.accent}`:"none",borderRight:br?`2px solid ${C.accent}`:"none",borderBottom:bb?`2px solid ${C.accent}`:"none",borderLeft:bl?`2px solid ${C.accent}`:"none"}}/>
            ))}
            <div style={{position:"absolute",top:10,left:10,right:10,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{display:"flex",gap:6,alignItems:"center"}}>
                <div style={{display:"flex",alignItems:"center",gap:5,background:"#000000AA",padding:"4px 9px",borderRadius:6}}>
                  <div style={{width:6,height:6,borderRadius:"50%",background:"#FF3B3B"}} className="pu"/>
                  <span style={{fontSize:10,color:C.text,letterSpacing:1.5,fontWeight:700}}>LIVE</span>
                </div>
                {poseBadge()}
              </div>
              <button onClick={flipCamera} style={{background:"#000000AA",border:`1px solid ${C.border}`,borderRadius:8,padding:"6px 10px",cursor:"pointer",fontSize:16,color:C.text}}>🔄</button>
            </div>
            {poseActive&&liveAngles&&(
              <div style={{position:"absolute",bottom:10,left:10,background:"#000000BB",border:`1px solid ${C.accent}30`,borderRadius:8,padding:"6px 12px",display:"flex",gap:12}}>
                {[{l:"KNEE",v:liveAngles.knee,good:liveAngles.knee<100},{l:"HIP",v:liveAngles.hip,good:true},{l:"SPINE",v:liveAngles.spine,good:liveAngles.spine<55}].map(({l,v,good})=>(
                  <div key={l} style={{textAlign:"center"}}>
                    <div style={{fontSize:9,color:C.mutedLight,letterSpacing:1.5}}>{l}</div>
                    <div style={{fontSize:15,fontWeight:800,color:typeof v==="number"?(good?C.accent:C.warn):C.muted}}>{v}°</div>
                  </div>
                ))}
                <div style={{borderLeft:`1px solid ${C.border}`,paddingLeft:10,textAlign:"center"}}>
                  <div style={{fontSize:9,color:C.mutedLight,letterSpacing:1.5}}>PHASE</div>
                  <div style={{fontSize:12,fontWeight:800,color:repPhase==="down"?C.warn:C.accent}}>{repPhase==="down"?"↓ DOWN":"↑ UP"}</div>
                </div>
              </div>
            )}
            {poseActive&&formAlerts.length>0&&(
              <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",display:"flex",flexDirection:"column",gap:6,alignItems:"center",pointerEvents:"none"}}>
                {formAlerts.map((a,i)=>(<div key={i} style={{background:"#000000DD",border:`1.5px solid ${a.color}`,borderRadius:8,padding:"6px 14px",fontSize:12,fontWeight:800,color:a.color,letterSpacing:2}}>{a.text}</div>))}
              </div>
            )}
            {!camReady&&!camError&&(
              <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",background:"#000000CC"}}>
                <div style={{textAlign:"center"}}><div style={{fontSize:28,marginBottom:8}}>📷</div><div className="pu" style={{fontSize:12,color:C.accent,letterSpacing:2}}>OPENING CAMERA...</div></div>
              </div>
            )}
            {camError&&(
              <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"#000000EE",padding:20}}>
                <div style={{fontSize:32,marginBottom:12}}>📷</div>
                <div style={{fontSize:13,color:C.danger,textAlign:"center",lineHeight:1.6,marginBottom:16}}>{camError}</div>
                <button onClick={()=>startCamera(facingMode)} style={{padding:"10px 22px",background:C.accent,color:"#000",border:"none",borderRadius:8,fontWeight:700,cursor:"pointer",fontFamily:font}}>Retry Camera</button>
              </div>
            )}
          </div>
        )}
        {camMode==="quad-4k"&&(
          <div>
            <div style={{background:C.warn+"18",borderBottom:`1px solid ${C.warn}30`,padding:"8px 16px",display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:13}}>🔒</span>
              <span style={{fontSize:11,color:C.warn,fontWeight:600}}>Quad 4K HDMI camera feeds activate in multi-cam phase — showing simulation</span>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:1.5,background:"#000"}}>
              {[{label:"FRONT",angle:"CAM-1·4K"},{label:"BACK",angle:"CAM-2·4K"},{label:"LEFT SIDE",angle:"CAM-3·4K"},{label:"RIGHT SIDE",angle:"CAM-4·4K"}].map(({label:lb,angle})=><SimFeed key={lb} label={lb} angle={angle}/>)}
            </div>
          </div>
        )}
        <div style={{padding:"18px 20px 24px",background:C.bg}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:14}}>
            <div>
              <div style={{...lbl,marginBottom:8}}>Set {curSet} of {totalSets}</div>
              <div style={{display:"flex",gap:5}}>
                {[...Array(totalSets)].map((_,i)=>(<div key={i} style={{width:26,height:4,borderRadius:2,background:i<curSet-1?C.accent:i===curSet-1?C.accent+"55":C.s2}}/>))}
              </div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{...lbl,marginBottom:3}}>Reps</div>
              <div style={{fontSize:50,fontWeight:900,lineHeight:1,letterSpacing:-3,color:repFlash?C.accent:C.text,transition:"color .12s"}}>
                {reps}<span style={{fontSize:22,color:C.muted,fontWeight:400}}>/{REPS}</span>
              </div>
            </div>
          </div>
          <div style={{height:3,background:C.s2,borderRadius:2,marginBottom:14,overflow:"hidden"}}>
            <div style={{height:"100%",width:`${pct}%`,background:C.accent,borderRadius:2,transition:"width .28s ease"}}/>
          </div>
          <div style={{display:"flex",gap:5,marginBottom:14}}>
            {[...Array(REPS)].map((_,i)=>(<div key={i} style={{flex:1,height:6,borderRadius:2,background:i<reps?C.accent:C.s2,transition:"background .15s"}}/>))}
          </div>
          <div style={{...card(false),marginBottom:14,padding:"11px 14px",display:"flex",gap:10,alignItems:"flex-start"}}>
            <div style={{color:C.accent,fontSize:13,flexShrink:0,marginTop:1}}>▸</div>
            <div style={{fontSize:13,color:"#CCCCCC",lineHeight:1.5}}>{TIPS[tipI]}</div>
          </div>
          {poseActive?(
            <div style={{...card(true),textAlign:"center",padding:"18px"}}>
              <div style={{fontSize:11,color:C.accent,letterSpacing:2.5,fontWeight:700,marginBottom:8}}>⚡ AUTO REP COUNTING ACTIVE</div>
              <div style={{fontSize:13,color:C.mutedLight,lineHeight:1.6}}>
                {reps===0?"Step into frame and begin squatting — reps count automatically":repPhase==="down"?"↓  Descending — drive through your heels to stand":"↑  Standing — brace and descend for the next rep"}
              </div>
            </div>
          ):(
            <button className="rb" onClick={tapRep} disabled={reps>=REPS}
              style={{width:"100%",padding:"20px",fontSize:16,fontWeight:800,background:reps>=REPS?C.s2:C.accent,color:reps>=REPS?C.muted:"#000",border:"none",borderRadius:10,cursor:reps>=REPS?"default":"pointer",letterSpacing:2,textTransform:"uppercase",transition:"all .2s",fontFamily:font}}>
              {reps>=REPS?"Set complete — calculating score...":poseLoading?`TAP EACH REP  ·  ${REPS-reps} REMAINING  (pose loading…)`:`TAP EACH REP  ·  ${REPS-reps} REMAINING`}
            </button>
          )}
          <div style={{textAlign:"center",marginTop:10,fontSize:11,color:C.mutedLight}}>
            {poseActive?"Position side-on to camera for best accuracy":camMode==="single"?"Pose engine loading — tap to count manually":"Quad 4K auto-detection in multi-cam phase"}
          </div>
        </div>
        {showPaywall&&<PaywallModal camMode={camMode||"single"} onPaid={()=>setShowPaywall(false)} onClose={()=>setShowPaywall(false)}/>}
      </div>
    );
  }

  // ── ANALYSIS ─────────────────────────────────────────────────
  if(screen==="analysis"){
    const score=metrics?calcScore(metrics):0;
    const restRemaining=REST-restT;
    const restPct=(restRemaining/REST)*100;
    const usedPose=historyRef.current[historyRef.current.length-1]?.usedPose;
    return(
      <div style={{...page,padding:"24px 20px 32px"}}>
        <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.35}}.pu{animation:pulse 1.8s ease-in-out infinite}`}</style>
        <div style={{maxWidth:560,margin:"0 auto"}}>
          <div style={{textAlign:"center",marginBottom:26,paddingTop:6}}>
            <div style={{...lbl,marginBottom:12}}>Set {historyRef.current.length} · {REPS} reps · {usedPose?"Live Pose":"Simulated"}</div>
            <div style={{fontSize:88,fontWeight:900,letterSpacing:-5,lineHeight:1,color:analyzing?C.muted:mc(score),transition:"color .5s"}}>{analyzing?"—":score}</div>
            <div style={{fontSize:16,color:analyzing?C.muted:mc(score),fontWeight:700,marginTop:4}}>{analyzing?`Analysing form${".".repeat(dots)}`:`${grade(score)}  ·  ${gLabel(score)}`}</div>
            {usedPose&&!analyzing&&(
              <div style={{marginTop:8,display:"inline-flex",alignItems:"center",gap:5,background:C.accent+"15",border:`1px solid ${C.accent}30`,borderRadius:20,padding:"3px 12px"}}>
                <div style={{width:5,height:5,borderRadius:"50%",background:C.accent}}/>
                <span style={{fontSize:10,color:C.accent,letterSpacing:2,fontWeight:700}}>LIVE POSE DATA</span>
              </div>
            )}
          </div>
          {metrics&&(
            <div style={{...card(false),marginBottom:14}}>
              <div style={{...lbl,marginBottom:16}}>Form Analysis {usedPose?"· Real Keypoints":"· Simulation"}</div>
              {METRICS_DEF.map(({key,label:lb,weight})=>{
                const v=metrics[key];
                return(<div key={key} style={{marginBottom:13}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:5,alignItems:"center"}}>
                    <span style={{fontSize:13,color:C.text}}>{lb}</span>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <span style={{fontSize:11,color:C.mutedLight}}>×{weight}</span>
                      <span style={{fontSize:13,fontWeight:700,color:mc(v),minWidth:50,textAlign:"right"}}>{v}/100</span>
                    </div>
                  </div>
                  <div style={{height:4,background:C.s2,borderRadius:2,overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${v}%`,background:mc(v),borderRadius:2,transition:"width .9s cubic-bezier(.25,1,.5,1)"}}/>
                  </div>
                </div>);
              })}
            </div>
          )}
          <div style={{...card(true),marginBottom:14}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
              <div style={{width:22,height:22,borderRadius:6,background:C.accent,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13}}>⚡</div>
              <span style={{...lbl,color:C.accent}}>AI Coach · Claude</span>
              {analyzing&&<span style={{fontSize:11,color:C.mutedLight,marginLeft:4}}>thinking{".".repeat(dots)}</span>}
            </div>
            <p style={{margin:0,fontSize:14,lineHeight:1.75,color:analyzing?C.muted:"#DDDDDD"}}>{analyzing?"Analysing your squat mechanics across all 10 reps...":feedback}</p>
          </div>
          {resting&&(
            <div style={{...card(false),marginBottom:14,display:"flex",alignItems:"center",gap:16}}>
              <div style={{flexShrink:0}}>
                <div style={{...lbl,marginBottom:4}}>Rest Timer</div>
                <div style={{fontSize:34,fontWeight:900,color:restRemaining<20?C.warn:C.text}}>{restRemaining}s</div>
              </div>
              <div style={{flex:1}}>
                <div style={{height:4,background:C.s2,borderRadius:2,overflow:"hidden"}}>
                  <div style={{height:"100%",width:`${restPct}%`,background:restRemaining<20?C.warn:C.accent,transition:"width 1s linear",borderRadius:2}}/>
                </div>
                <div style={{fontSize:11,color:C.mutedLight,marginTop:6}}>{restRemaining>0?"Tap below to start next set early":"Rest complete — ready"}</div>
              </div>
            </div>
          )}
          {history.length>=2&&(
            <div style={{...card(false),marginBottom:14}}>
              <div style={{...lbl,marginBottom:12}}>Progress This Session</div>
              <div style={{display:"flex",gap:8}}>
                {history.map(({setNumber:sn,score:sc,usedPose:up})=>(
                  <div key={sn} style={{flex:1,textAlign:"center"}}>
                    <div style={{fontSize:9,color:C.mutedLight,marginBottom:2}}>S{sn}{up?" ●":""}</div>
                    <div style={{fontSize:18,fontWeight:800,color:mc(sc)}}>{sc}</div>
                    <div style={{height:3,background:C.s2,borderRadius:2,marginTop:5,overflow:"hidden"}}>
                      <div style={{height:"100%",width:`${sc}%`,background:mc(sc),borderRadius:2}}/>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {!analyzing&&(
            <button onClick={nextSet} style={{width:"100%",padding:"18px",fontSize:15,fontWeight:800,background:C.accent,color:"#000",border:"none",borderRadius:10,cursor:"pointer",letterSpacing:2,textTransform:"uppercase",fontFamily:font}}>
              {curSet>=totalSets?"View Session Results →":`Start Set ${curSet+1} / ${totalSets} →`}
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── RESULTS ──────────────────────────────────────────────────
  const fs=finalScore??0,gc=mc(fs);
  const avgM=METRICS_DEF.map(({key,label:lb})=>({key,label:lb,avg:history.length?Math.round(history.reduce((s,e)=>s+e.metrics[key],0)/history.length):0}));
  const mostImp=avgM.reduce((a,b)=>{
    const aG=history.length>=2?history[history.length-1].metrics[a.key]-history[0].metrics[a.key]:0;
    const bG=history.length>=2?history[history.length-1].metrics[b.key]-history[0].metrics[b.key]:0;
    return bG>aG?b:a;
  });
  const poseCount=history.filter(h=>h.usedPose).length;
  return(
    <div style={{...page,padding:"24px 20px 36px"}}>
      <div style={{maxWidth:560,margin:"0 auto"}}>
        <div style={{display:"flex",alignItems:"center",gap:18,padding:"18px 0 22px",borderBottom:`1px solid ${C.border}`,marginBottom:20}}>
          <img src={`${process.env.PUBLIC_URL}/formIQ.png`} alt="FormIQ" style={{height:"auto",width:"45%",objectFit:"contain",flexShrink:0}}/>
          <div style={{flex:1,minWidth:0}}>
            <div style={{...lbl,marginBottom:6}}>Session Complete</div>
            <div style={{fontSize:68,fontWeight:900,letterSpacing:-4,color:gc,lineHeight:1}}>{fs}</div>
            <div style={{fontSize:17,color:gc,fontWeight:700,marginTop:4}}>{grade(fs)}&nbsp;&nbsp;·&nbsp;&nbsp;{gLabel(fs)}</div>
            <div style={{color:C.mutedLight,marginTop:5,fontSize:12}}>{totalSets} sets · {totalSets*REPS} reps{poseCount>0&&` · ${poseCount}/${totalSets} pose`}</div>
          </div>
        </div>
        <div style={{...card(false),marginBottom:14}}>
          <div style={{...lbl,marginBottom:16}}>Set-by-Set Results</div>
          {history.map(({setNumber:sn,score:sc,usedPose:up})=>(
            <div key={sn} style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
              <div style={{width:36,height:36,borderRadius:8,flexShrink:0,background:mc(sc)+"18",display:"flex",alignItems:"center",justifyContent:"center",color:mc(sc),fontWeight:800,fontSize:12}}>S{sn}</div>
              <div style={{flex:1}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <span style={{fontSize:13,color:C.mutedLight}}>Set {sn}</span>
                    {up&&<span style={{fontSize:9,color:C.accent,background:C.accent+"18",padding:"1px 6px",borderRadius:4,fontWeight:700}}>POSE</span>}
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <span style={{fontSize:11,color:C.mutedLight}}>{grade(sc)}</span>
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
        <div style={{...card(false),marginBottom:14}}>
          <div style={{...lbl,marginBottom:14}}>Session Averages</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            {avgM.map(({key,label:lb,avg:av})=>(
              <div key={key} style={{background:C.s2,borderRadius:8,padding:"12px 14px",position:"relative"}}>
                {key===mostImp.key&&history.length>=2&&<div style={{position:"absolute",top:8,right:8,fontSize:9,color:C.accent,background:C.accent+"18",padding:"1px 6px",borderRadius:4,fontWeight:700,letterSpacing:1}}>+MOST</div>}
                <div style={{fontSize:11,color:C.mutedLight,marginBottom:5}}>{lb}</div>
                <div style={{fontSize:26,fontWeight:900,color:mc(av),lineHeight:1}}>{av}</div>
                <div style={{height:2,background:C.s3,borderRadius:1,marginTop:8,overflow:"hidden"}}>
                  <div style={{height:"100%",width:`${av}%`,background:mc(av),borderRadius:1}}/>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div style={{...card(true),marginBottom:14,background:"#071510"}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
            <div style={{fontSize:20}}>📊</div>
            <div>
              <div style={{fontWeight:700,fontSize:14,color:C.text}}>Share Your Session Report</div>
              <div style={{fontSize:12,color:C.mutedLight,marginTop:2}}>Invite friends to try FormIQ — includes your score, metrics & site link</div>
            </div>
          </div>
          <button onClick={()=>handleShare(fs,historyRef.current,totalSets)} style={{width:"100%",padding:"14px",background:C.accent,color:"#000",border:"none",borderRadius:8,fontWeight:800,cursor:"pointer",fontSize:14,letterSpacing:2,textTransform:"uppercase",fontFamily:font}}>
            📤 Generate & Share Report
          </button>
          {screenName&&(
            <div style={{fontSize:11,color:C.mutedLight,textAlign:"center",marginTop:8}}>
              Sharing as: <strong style={{color:C.accent}}>{screenName}</strong>
              <span onClick={()=>setShowNameModal(true)} style={{color:C.mutedLight,marginLeft:8,cursor:"pointer",textDecoration:"underline"}}>change</span>
            </div>
          )}
        </div>
        <div style={{...card(false),marginBottom:20,background:C.s2}}>
          <div style={{...lbl,marginBottom:10}}>Multi-Cam Phase — Coming Next</div>
          {["Quad 4K HDMI camera input via capture card","360° pose tracking — front, back, left, right","Knee cave detection from front camera","Bar path tracking overlay on back camera","Rep-by-rep heatmap and long-term analytics"].map((item,i)=>(
            <div key={i} style={{display:"flex",gap:8,marginBottom:8,alignItems:"flex-start"}}>
              <div style={{color:C.mutedLight,fontSize:12,marginTop:1,flexShrink:0}}>○</div>
              <div style={{fontSize:12,color:C.mutedLight,lineHeight:1.5}}>{item}</div>
            </div>
          ))}
        </div>
        <button onClick={restart} style={{width:"100%",padding:"17px",fontSize:14,fontWeight:800,background:C.accent,color:"#000",border:"none",borderRadius:10,cursor:"pointer",letterSpacing:2,textTransform:"uppercase",fontFamily:font}}>
          New Session
        </button>
      </div>
      {showNameModal&&<ScreenNameModal value={screenName} onSave={onNameSave}/>}
      {shareCanvas&&<ShareModal canvas={shareCanvas} onClose={()=>setShareCanvas(null)}/>}
    </div>
  );
}

// ── Home screen ───────────────────────────────────────────────
function Home({ onSelect }) {
  const font="system-ui,-apple-system,'Segoe UI',sans-serif";
  const usage = getSessionUsage();
  return(
    <div style={{background:"#080808",color:"#F0F0F0",minHeight:"100vh",fontFamily:font,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"32px 20px"}}>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        .h-btn:hover{transform:translateY(-2px);transition:all .2s}
        .h-btn:active{transform:scale(.98)}
      `}</style>
      <div style={{animation:"fadeUp .5s ease forwards",textAlign:"center",marginBottom:44}}>
        <img src={`${process.env.PUBLIC_URL}/formIQ.png`} alt="FormIQ" style={{height:110,width:"auto",objectFit:"contain",display:"block",margin:"0 auto 16px"}}/>
        <div style={{fontSize:15,color:"#555",letterSpacing:1}}>Choose your destination</div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,maxWidth:540,width:"100%",animation:"fadeUp .5s .12s ease both"}}>
        <button className="h-btn" onClick={()=>onSelect("squat")} style={{background:"#0E1204",border:"1px solid #00E67640",borderRadius:16,padding:"28px 20px",cursor:"pointer",textAlign:"center",display:"flex",flexDirection:"column",alignItems:"center",gap:12,color:"#F0F0F0",fontFamily:font,transition:"all .2s"}}>
          <div style={{width:56,height:56,borderRadius:14,background:"#00E67620",border:"1px solid #00E67650",display:"flex",alignItems:"center",justifyContent:"center",fontSize:28}}>🏋️</div>
          <div>
            <div style={{fontSize:16,fontWeight:800,color:"#00E676",marginBottom:6}}>AI Squat Coach</div>
            <div style={{fontSize:12,color:"#777",lineHeight:1.6}}>Live pose tracking<br/>Real-time form scoring<br/>AI coaching every set</div>
          </div>
          <div style={{fontSize:10,letterSpacing:2,color:"#00E676",background:"#00E67618",padding:"4px 12px",borderRadius:20,fontWeight:700,border:"1px solid #00E67630"}}>
            {usage.paid?"UNLIMITED":"100 FREE SESSIONS"} →
          </div>
        </button>
        <button className="h-btn" onClick={()=>onSelect("trainer")} style={{background:"#0A0C12",border:"1px solid #3D8EF040",borderRadius:16,padding:"28px 20px",cursor:"pointer",textAlign:"center",display:"flex",flexDirection:"column",alignItems:"center",gap:12,color:"#F0F0F0",fontFamily:font,transition:"all .2s"}}>
          <div style={{width:56,height:56,borderRadius:14,background:"#3D8EF020",border:"1px solid #3D8EF050",display:"flex",alignItems:"center",justifyContent:"center",fontSize:28}}>📊</div>
          <div>
            <div style={{fontSize:16,fontWeight:800,color:"#3D8EF0",marginBottom:6}}>Trainer Dashboard</div>
            <div style={{fontSize:12,color:"#777",lineHeight:1.6}}>Manage clients<br/>Analytics & sessions<br/>Send invite links</div>
          </div>
          <div style={{fontSize:10,letterSpacing:2,color:"#3D8EF0",background:"#3D8EF018",padding:"4px 12px",borderRadius:20,fontWeight:700,border:"1px solid #3D8EF030"}}>OPEN DASHBOARD →</div>
        </button>
      </div>
      <div style={{marginTop:40,fontSize:11,color:"#2A2A2A",animation:"fadeUp .5s .24s ease both",textAlign:"center",lineHeight:1.8}}>
        {SITE} · AI Squat Form Tracking · Phase 2
      </div>
    </div>
  );
}

// ── Trainer Login Modal ───────────────────────────────────────
function TrainerLogin({ onLogin, onRegister }) {
  const [email,setEmail]=useState("");
  const [pass,setPass]=useState("");
  const [err,setErr]=useState("");
  const font="system-ui,-apple-system,sans-serif";
  const attempt=()=>{
    const t=getTrainer();
    if(t&&t.email===email){onLogin(t);return;}
    setErr("Account not found. Please check your email or register.");
  };
  return(
    <div style={{position:"fixed",inset:0,background:"#000000EE",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:20,fontFamily:font}}>
      <div style={{background:"#0E1014",border:"1px solid #23262D",borderRadius:16,width:"100%",maxWidth:380,padding:"28px 24px"}}>
        <img src={`${process.env.PUBLIC_URL}/formIQ.png`} alt="FormIQ" style={{height:36,width:"auto",display:"block",margin:"0 auto 20px"}}/>
        <div style={{fontSize:16,fontWeight:700,color:"#F0F2F5",textAlign:"center",marginBottom:20}}>Trainer Login</div>
        {err&&<div style={{background:"#FF475718",border:"1px solid #FF475740",borderRadius:8,padding:"8px 12px",fontSize:12,color:"#FF9999",marginBottom:14}}>{err}</div>}
        <div style={{marginBottom:12}}>
          <div style={{fontSize:11,color:"#6B7280",marginBottom:5}}>Email</div>
          <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@email.com"
            style={{width:"100%",padding:"11px 14px",background:"#141619",border:"1px solid #23262D",borderRadius:8,color:"#F0F2F5",fontSize:14,fontFamily:font,boxSizing:"border-box",outline:"none"}}/>
        </div>
        <div style={{marginBottom:20}}>
          <div style={{fontSize:11,color:"#6B7280",marginBottom:5}}>Password</div>
          <input type="password" value={pass} onChange={e=>setPass(e.target.value)} placeholder="••••••••"
            onKeyDown={e=>e.key==="Enter"&&attempt()}
            style={{width:"100%",padding:"11px 14px",background:"#141619",border:"1px solid #23262D",borderRadius:8,color:"#F0F2F5",fontSize:14,fontFamily:font,boxSizing:"border-box",outline:"none"}}/>
        </div>
        <button onClick={attempt} style={{width:"100%",padding:"13px",background:"#00E676",color:"#000",border:"none",borderRadius:8,fontWeight:800,fontSize:14,cursor:"pointer",letterSpacing:1.5,textTransform:"uppercase",fontFamily:font,marginBottom:12}}>
          Login →
        </button>
        <div style={{textAlign:"center",fontSize:12,color:"#6B7280"}}>
          No account?{" "}
          <span onClick={onRegister} style={{color:"#00E676",cursor:"pointer",fontWeight:600}}>Register as a trainer</span>
        </div>
      </div>
    </div>
  );
}

// ── Router ────────────────────────────────────────────────────
export default function App() {
  const [view,setView]         = useState("loading");
  const [inviteCtx,setInviteCtx] = useState(null);
  const [trainerData,setTrainerData] = useState(null);
  const [showLogin,setShowLogin] = useState(false);

  useEffect(()=>{
    const parsed = parseInviteHash(window.location.hash);
    if(parsed){ setView("invite"); return; }
    const savedCtx = getClientCtx();
    if(savedCtx){ setInviteCtx(savedCtx); setView("squat"); return; }
    setView("home");
  },[]);

  if(view==="loading") return(
    <div style={{background:"#080808",minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <img src={`${process.env.PUBLIC_URL}/formIQ.png`} alt="FormIQ" style={{height:60,width:"auto",opacity:.6}}/>
    </div>
  );

  if(view==="invite"){
    const parsed=parseInviteHash(window.location.hash);
    return(
      <ClientInviteLanding
        trainerSlug={parsed.trainerSlug}
        token={parsed.token}
        onAccept={(ctx)=>{
          saveClientCtx(ctx);
          setInviteCtx(ctx);
          window.history.replaceState(null,"",window.location.pathname);
          setView("squat");
        }}
      />
    );
  }

  if(view==="squat"&&inviteCtx) return <FormIQ onBack={null} clientCtx={inviteCtx}/>;
  if(view==="squat")   return <FormIQ onBack={()=>setView("home")} clientCtx={null}/>;
  if(view==="register") return <TrainerRegistration onDone={()=>{const t=getTrainer();setTrainerData(t);setView("trainer");}} onLogin={()=>setView("trainer-login")}/>;
  if(view==="trainer-login") return(
    <>
      <Home onSelect={(v)=>{if(v==="trainer")setShowLogin(true);else setView(v);}}/>
      {showLogin&&<TrainerLogin onLogin={(t)=>{setTrainerData(t);setShowLogin(false);setView("trainer");}} onRegister={()=>{setShowLogin(false);setView("register");}}/>}
    </>
  );
  if(view==="trainer"){
    const t = trainerData||getTrainer();
    if(!t) return(
      <Home onSelect={(v)=>{
        if(v==="trainer"){
          const existing=getTrainer();
          if(existing){setTrainerData(existing);setView("trainer");}
          else setView("register");
        }else setView(v);
      }}/>
    );
    return <TrainerDashboard trainer={t} onBack={()=>setView("home")} onLogout={()=>{setTrainerData(null);setView("home");}}/>;
  }

  return(
    <Home onSelect={(v)=>{
      if(v==="trainer"){
        const existing=getTrainer();
        if(existing){setTrainerData(existing);setView("trainer");}
        else setView("register");
      }else setView(v);
    }}/>
  );
}