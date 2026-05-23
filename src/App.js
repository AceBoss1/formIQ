import { useState, useEffect, useRef } from "react";

// ── Palette ───────────────────────────────────────────────────────────────
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

  // Additional coaching tips
  "Screw your feet into the floor for maximum stability",
  "Grip the floor with your toes — create a stable base",
  "Keep your elbows tucked under the bar",
  "Control the descent — never free-fall into the squat",
  "Drive your traps into the bar on the ascent",
  "Sit between your hips, not on top of your knees",
  "Push the floor away instead of thinking 'stand up'",
  "Maintain tension at the bottom — don’t relax in the hole",
  "Big breath at the top · reset · repeat",
  "Keep your ribs down — avoid overextending your back",
  "Lock in your upper back before unracking",
  "Walk the bar out with minimal steps",
  "Stay tight from unrack to rerack",
  "Don’t let your knees cave inward on the ascent",
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
  "Control your tempo — don’t rush the movement",
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

const SITE = "formiqapp.space";

// ── Helpers ───────────────────────────────────────────────────────────────
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
  const avgMinKnee = avg(repData.map(r=>r.minKneeAngle));
  const avgSpine   = avg(repData.map(r=>r.avgSpineAngle));
  const avgHip     = avg(repData.map(r=>r.avgHipAngle));
  const avgKAlign  = avg(repData.map(r=>r.kneeAlignScore));
  const durs       = repData.map(r=>r.duration);
  const avgDur     = avg(durs);
  const variance   = avg(durs.map(d=>Math.pow(d-avgDur,2)));

  const depthScore =
    avgMinKnee<=75?100:avgMinKnee<=90?95:avgMinKnee<=100?82:
    avgMinKnee<=110?68:avgMinKnee<=125?52:35;
  const spineScore =
    avgSpine>=20&&avgSpine<=50
      ?Math.min(100,90+(45-Math.abs(avgSpine-35))*0.4)
      :avgSpine<20?Math.max(50,90-(20-avgSpine)*2.2)
      :Math.max(38,90-(avgSpine-50)*2.5);
  const tempoScore  = Math.max(28,Math.min(100,100-variance*22));
  const hipScore    =
    avgHip>=80&&avgHip<=145
      ?Math.min(100,85+(110-Math.abs(avgHip-110))*0.28)
      :Math.max(35,75-Math.abs(avgHip-110)*1.4);

  return {
    kneeAlignment:    Math.round(Math.min(100,Math.max(20,avgKAlign))),
    spineNeutrality:  Math.round(Math.min(100,Math.max(20,spineScore))),
    squatDepth:       Math.round(depthScore),
    tempoConsistency: Math.round(Math.min(100,Math.max(20,tempoScore))),
    hipHinge:         Math.round(Math.min(100,Math.max(20,hipScore))),
  };
};

const mkSimMetrics = (setNum) => {
  const g=(setNum-1)*3.5;
  const r=(b)=>Math.min(100,Math.floor(b+g+(Math.random()-0.28)*17));
  return{kneeAlignment:r(68),spineNeutrality:r(65),squatDepth:r(62),tempoConsistency:r(59),hipHinge:r(71)};
};

const calcScore = (m) =>
  Math.round(METRICS_DEF.reduce((s,{key,weight})=>s+m[key]*weight,0));

const fallback = (s,set,total) =>
  s>=82
    ?`Clean set — mechanics held up well across all 10 reps. Sharpen the descent tempo to a deliberate 2-count; it'll build more power out of the hole. ${set<total?"Stay locked in for the next set.":"Strong session — consistency is building."}`
    :s>=65
    ?`Form held early but slipped around reps 6–8 as fatigue built. Drive your knees out and keep your chest from diving. ${set<total?"Full rest, then come back with more intention.":"Target that correction next session."}`
    :`Form broke down significantly — brace harder before every rep and sit back like reaching for a box behind you. ${set<total?"Take the full rest and reset.":"Make this the priority correction next session."}`;

const loadScript = (src) => new Promise((res,rej) => {
  if(document.querySelector(`script[src="${src}"]`)){res();return;}
  const s=Object.assign(document.createElement("script"),{
    src,crossOrigin:"anonymous",onload:res,onerror:()=>rej(new Error("Failed: "+src))
  });
  document.head.appendChild(s);
});

const BONES=[[11,12],[11,23],[12,24],[23,24],[23,25],[25,27],[24,26],[26,28],
  [27,29],[28,30],[29,31],[30,32],[11,13],[13,15],[12,14],[14,16]];
const KEY_POINTS=[11,12,23,24,25,26,27,28];

// ── Report canvas generator ───────────────────────────────────────────────
const generateReportCanvas = ({ screenName, finalScore, history, totalSets, REPS, logoImg, logo512Img }) => {
  const W=800, H=1200;
  const canvas=document.createElement("canvas");
  canvas.width=W; canvas.height=H;
  const ctx=canvas.getContext("2d");
  const ACCENT="#00E676", WARN="#FFB300", DANGER="#FF3D3D";
  const scoreColor = finalScore>=80?ACCENT:finalScore>=60?WARN:DANGER;

  // ── Background ──────────────────────────────────────────────────────────
  ctx.fillStyle="#080808";
  ctx.fillRect(0,0,W,H);

  // Subtle grid
  ctx.strokeStyle="#FFFFFF08";
  ctx.lineWidth=1;
  for(let x=0;x<W;x+=50){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
  for(let y=0;y<H;y+=50){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}

  // Top accent bar
  const grad=ctx.createLinearGradient(0,0,W,0);
  grad.addColorStop(0,ACCENT+"FF");
  grad.addColorStop(0.5,ACCENT+"88");
  grad.addColorStop(1,ACCENT+"00");
  ctx.fillStyle=grad;
  ctx.fillRect(0,0,W,4);

  // ── ROW 1: Logo LEFT · Session info RIGHT ───────────────────────────────
  const ROW1_H = 160;
  const PAD    = 40;
  const logoW  = 160, logoH = 160;

  // Logo — left side, big and clear
  if(logoImg){
    try{ ctx.drawImage(logoImg, PAD, 20, logoW, logoH); }catch{}
  } else {
    ctx.fillStyle="#FFFFFF";
    ctx.font="bold 36px system-ui";
    ctx.textAlign="left";
    ctx.fillText("FormIQ", PAD, 90);
  }

  // Session info — right side, vertically centred
  const infoX = PAD + logoW + 24;
  const infoW = W - infoX - PAD;
  let iyp = 36;

  // "SESSION REPORT" pill
  roundRect(ctx, infoX, iyp, infoW, 22, 6);
  ctx.fillStyle = "#1A1A1A";
  ctx.fill();
  ctx.strokeStyle = ACCENT+"30"; ctx.lineWidth=1; ctx.stroke();
  ctx.font="bold 9px system-ui";
  ctx.fillStyle=ACCENT;
  ctx.textAlign="center";
  ctx.fillText("SESSION REPORT", infoX+infoW/2, iyp+15);
  iyp+=34;

  // AI badge
  ctx.font="bold 9px system-ui";
  ctx.fillStyle="#AAAAAA";
  ctx.textAlign="left";
  ctx.fillText("AI SQUAT COACH  ·  PHASE 2", infoX, iyp);
  iyp+=22;

  // Name
  if(screenName){
    ctx.font="bold 26px system-ui";
    ctx.fillStyle="#F0F0F0";
    ctx.textAlign="left";
    // Clip long names to infoW
    ctx.save();
    ctx.rect(infoX, iyp-26, infoW, 34);
    ctx.clip();
    ctx.fillText(screenName, infoX, iyp);
    ctx.restore();
    iyp+=34;
  }

  // Date
  const dateStr=new Date().toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"});
  ctx.font="13px system-ui";
  ctx.fillStyle="#BBBBBB";
  ctx.textAlign="left";
  ctx.fillText(dateStr, infoX, iyp);
  iyp+=22;

  // Site
  ctx.font="bold 12px system-ui";
  ctx.fillStyle=ACCENT;
  ctx.fillText(`🌐 ${SITE}`, infoX, iyp);

  let yp = ROW1_H + 30;

// ── Full-width accent divider ────────────────────────────────────────────
  const divGrad=ctx.createLinearGradient(0,0,W,0);
  divGrad.addColorStop(0,ACCENT+"00");
  divGrad.addColorStop(0.3,ACCENT+"88");
  divGrad.addColorStop(0.7,ACCENT+"88");
  divGrad.addColorStop(1,ACCENT+"00");
  ctx.fillStyle=divGrad;
  ctx.fillRect(0,yp,W,2);
  yp+=18;

  // ── Score hero box ───────────────────────────────────────────────────────
  const bx=60,bw=W-120,bh=170;
  // Glow
  const glow=ctx.createRadialGradient(W/2,yp+bh/2,10,W/2,yp+bh/2,bw*0.55);
  glow.addColorStop(0,scoreColor+"22");
  glow.addColorStop(1,"transparent");
  ctx.fillStyle=glow;
  ctx.fillRect(bx-20,yp-20,bw+40,bh+40);
  // Box
  ctx.strokeStyle=scoreColor+"55";
  ctx.lineWidth=1.5;
  roundRect(ctx,bx,yp,bw,bh,12);
  ctx.fillStyle="#0D0D0D";
  ctx.fill();
  ctx.stroke();
  // Score number
  ctx.font="bold 96px system-ui";
  ctx.fillStyle=scoreColor;
  ctx.textAlign="center";
  ctx.fillText(finalScore,W/2,yp+100);
  // Grade
  ctx.font="bold 20px system-ui";
  ctx.fillStyle=scoreColor;
  ctx.fillText(`${grade(finalScore)}  ·  ${gLabel(finalScore)}`,W/2,yp+138);
  // Sets/reps
  ctx.font="12px system-ui";
  ctx.fillStyle="#AAAAAA";
  ctx.fillText(`${totalSets} SETS  ·  ${totalSets*REPS} REPS`,W/2,yp+162);
  yp+=bh+28;

  // ── Set breakdown ─────────────────────────────────────────────────────────
  ctx.font="bold 10px system-ui";
  ctx.fillStyle="#AAAAAA";
  ctx.textAlign="left";
  ctx.fillText("SET-BY-SET BREAKDOWN",60,yp);
  yp+=18;

  const setW=(W-120-(history.length-1)*10)/history.length;
  history.forEach(({setNumber:sn,score:sc,usedPose:up},i)=>{
    const sx=60+i*(setW+10);
    const sc_col=sc>=80?ACCENT:sc>=60?WARN:DANGER;
    // card bg
    roundRect(ctx,sx,yp,setW,76,8);
    ctx.fillStyle="#141414";
    ctx.fill();
    ctx.strokeStyle=sc_col+"30";
    ctx.lineWidth=1;
    ctx.stroke();
    // bar
    const barH=4, barY=yp+76-12, barW=setW-20;
    ctx.fillStyle="#222";
    roundRect(ctx,sx+10,barY,barW,barH,2);
    ctx.fill();
    ctx.fillStyle=sc_col;
    roundRect(ctx,sx+10,barY,barW*(sc/100),barH,2);
    ctx.fill();
    // score
    ctx.font="bold 30px system-ui";
    ctx.fillStyle=sc_col;
    ctx.textAlign="center";
    ctx.fillText(sc,sx+setW/2,yp+44);
    // label
    ctx.font="10px system-ui";
    ctx.fillStyle="#AAAAAA";
    ctx.fillText(`S${sn}${up?" ●":""}`,sx+setW/2,yp+16);
  });
  yp+=76+24;

  // ── Metric bars ───────────────────────────────────────────────────────────
  ctx.font="bold 10px system-ui";
  ctx.fillStyle="#AAAAAA";
  ctx.textAlign="left";
  ctx.fillText("FORM BREAKDOWN — SESSION AVERAGE",60,yp);
  yp+=18;

  const avgM={};
  METRICS_DEF.forEach(({key})=>{
    avgM[key]=history.length
      ?Math.round(history.reduce((s,e)=>s+e.metrics[key],0)/history.length):0;
  });

  METRICS_DEF.forEach(({key,label:lb})=>{
    const v=avgM[key];
    const col=v>=80?ACCENT:v>=60?WARN:DANGER;
    // label
    ctx.font="13px system-ui";
    ctx.fillStyle="#AAAAAA";
    ctx.textAlign="left";
    ctx.fillText(lb,60,yp+4);
    // score
    ctx.font="bold 13px system-ui";
    ctx.fillStyle=col;
    ctx.textAlign="right";
    ctx.fillText(`${v}/100`,W-60,yp+4);
    // bar bg
    ctx.fillStyle="#1E1E1E";
    roundRect(ctx,60,yp+12,W-120,6,3);
    ctx.fill();
    // bar fill
    ctx.fillStyle=col;
    roundRect(ctx,60,yp+12,(W-120)*(v/100),6,3);
    ctx.fill();
    yp+=40;
  });
  yp+=8;

  // ── Divider ──────────────────────────────────────────────────────────────
  ctx.strokeStyle="#222222";
  ctx.lineWidth=1;
  ctx.beginPath();
  ctx.moveTo(60,yp);
  ctx.lineTo(W-60,yp);
  ctx.stroke();
  yp+=28;

  // ── Invite section ────────────────────────────────────────────────────────
  const invH=200;
  roundRect(ctx,40,yp,W-80,invH,14);
  const invGrad=ctx.createLinearGradient(40,yp,W-40,yp+invH);
  invGrad.addColorStop(0,"#0A1A0F");
  invGrad.addColorStop(1,"#080808");
  ctx.fillStyle=invGrad;
  ctx.fill();
  ctx.strokeStyle=ACCENT+"40";
  ctx.lineWidth=1.5;
  ctx.stroke();

  // logo512 image on the right side of invite card
  const il=60, ilx=W-40-il-16, ily=yp+(invH-il)/2;
  if(logo512Img){
    // Clip to rounded square
    ctx.save();
    roundRect(ctx,ilx,ily,il,il,10);
    ctx.clip();
    try{ctx.drawImage(logo512Img,ilx,ily,il,il);}catch{}
    ctx.restore();
    // subtle border
    ctx.strokeStyle=ACCENT+"30"; ctx.lineWidth=1;
    roundRect(ctx,ilx,ily,il,il,10); ctx.stroke();
  }

  const invX=60;
  const invTextW = W-80-il-32; // text area avoids the logo
  ctx.textAlign="left";

  ctx.font="bold 10px system-ui";
  ctx.fillStyle=ACCENT;
  ctx.fillText("🏋️  YOUR FRIEND JUST CRUSHED THEIR SQUATS",invX,yp+26);

  ctx.font="bold 20px system-ui";
  ctx.fillStyle="#F0F0F0";
  const name=screenName||"They";
  // truncate if needed
  let scoreText=`${name} scored ${finalScore}/100`;
  ctx.save();
  ctx.rect(invX,yp+30,invTextW,30);
  ctx.clip();
  ctx.fillText(scoreText,invX,yp+56);
  ctx.restore();

  ctx.font="13px system-ui";
  ctx.fillStyle="#CCCCCC";
  const line1=`Grade ${grade(finalScore)} · ${gLabel(finalScore)} · ${totalSets} sets · ${totalSets*REPS} reps`;
  ctx.fillText(line1,invX,yp+78);

  ctx.font="12px system-ui";
  ctx.fillStyle="#AAAAAA";
  ctx.fillText("FormIQ uses AI + live camera pose tracking to analyse",invX,yp+104);
  ctx.fillText("your squat form in real time and coach you after every set.",invX,yp+120);

  ctx.font="11px system-ui";
  ctx.fillStyle=ACCENT;
  ctx.fillText(`Try it free at ${SITE}`,invX,yp+140);

  // CTA button
  roundRect(ctx,invX,yp+152,190,34,8);
  ctx.fillStyle=ACCENT;
  ctx.fill();
  ctx.font="bold 12px system-ui";
  ctx.fillStyle="#000000";
  ctx.textAlign="center";
  ctx.fillText("TRY FORMIQ FREE →",invX+95,yp+174);
  ctx.textAlign="left";

  yp+=invH+20;

  // ── Footer ────────────────────────────────────────────────────────────────
  ctx.strokeStyle="#1E1E1E";
  ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(40,yp);ctx.lineTo(W-40,yp);ctx.stroke();
  yp+=22;

  ctx.font="bold 13px system-ui";
  ctx.fillStyle=ACCENT;
  ctx.textAlign="center";
  ctx.fillText(`${SITE}`,W/2,yp);
  yp+=18;

  ctx.font="11px system-ui";
  ctx.fillStyle="#888888";
  ctx.fillText("AI Squat Form Tracking  ·  Real-time Coaching  ·  Session Scoring",W/2,yp);
  yp+=16;
  ctx.fillStyle="#666666";
  ctx.fillText(`Generated ${new Date().toLocaleString()}`,W/2,yp);

  // Bottom accent bar
  const botGrad=ctx.createLinearGradient(0,H-4,W,H-4);
  botGrad.addColorStop(0,ACCENT+"00");
  botGrad.addColorStop(0.5,ACCENT+"88");
  botGrad.addColorStop(1,ACCENT+"00");
  ctx.fillStyle=botGrad;
  ctx.fillRect(0,H-4,W,4);

  return canvas;
};

function roundRect(ctx,x,y,w,h,r){
  ctx.beginPath();
  ctx.moveTo(x+r,y);
  ctx.lineTo(x+w-r,y);
  ctx.quadraticCurveTo(x+w,y,x+w,y+r);
  ctx.lineTo(x+w,y+h-r);
  ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  ctx.lineTo(x+r,y+h);
  ctx.quadraticCurveTo(x,y+h,x,y+h-r);
  ctx.lineTo(x,y+r);
  ctx.quadraticCurveTo(x,y,x+r,y);
  ctx.closePath();
}

// ── ScreenName Modal ──────────────────────────────────────────────────────
function ScreenNameModal({value,onSave}){
  const [n,setN]=useState(value||"");
  return(
    <div style={{position:"fixed",inset:0,background:"#000000CC",
      display:"flex",alignItems:"center",justifyContent:"center",
      zIndex:9999,padding:20}}>
      <div style={{background:"#111",border:"1px solid #272727",borderRadius:14,
        padding:"28px 24px",maxWidth:380,width:"100%"}}>
        <div style={{fontSize:22,marginBottom:6,textAlign:"center"}}>🏋️</div>
        <div style={{fontSize:16,fontWeight:700,color:"#F0F0F0",
          textAlign:"center",marginBottom:6}}>
          What should we call you?
        </div>
        <div style={{fontSize:13,color:"#888",textAlign:"center",
          marginBottom:20,lineHeight:1.5}}>
          Your name appears on the session report you share with friends.
        </div>
        <input
          autoFocus
          value={n}
          onChange={e=>setN(e.target.value)}
          onKeyDown={e=>e.key==="Enter"&&n.trim()&&onSave(n.trim())}
          placeholder="e.g. Adams, Coach K, Big Lifts..."
          maxLength={28}
          style={{width:"100%",padding:"13px 14px",background:"#1A1A1A",
            border:"1px solid #333",borderRadius:8,color:"#F0F0F0",
            fontSize:15,outline:"none",boxSizing:"border-box",marginBottom:14}}
        />
        <button
          onClick={()=>n.trim()&&onSave(n.trim())}
          style={{width:"100%",padding:"14px",background:"#00E676",
            color:"#000",border:"none",borderRadius:8,fontWeight:800,
            fontSize:14,cursor:"pointer",letterSpacing:2,textTransform:"uppercase"}}>
          Save & Generate Report
        </button>
        <button
          onClick={()=>onSave("")}
          style={{width:"100%",padding:"10px",background:"transparent",
            color:"#555",border:"none",cursor:"pointer",fontSize:12,marginTop:8}}>
          Skip — share without name
        </button>
      </div>
    </div>
  );
}

// ── Share Report Modal ────────────────────────────────────────────────────
function ShareModal({canvas,onClose}){
  const [status,setStatus]=useState("idle"); // idle|sharing|done|error
  const [errMsg,setErrMsg]=useState("");
  const previewUrl=canvas.toDataURL("image/png");

  const getPngBlob=()=>new Promise(res=>canvas.toBlob(res,"image/png"));

  // ── Primary: Web Share API with image file ────────────────────────────
  // Opens the OS native share sheet (WhatsApp, Telegram, Instagram, etc.)
  // The user picks the app — we never hard-code a destination.
  const shareViaSheet=async()=>{
    setStatus("sharing"); setErrMsg("");
    try{
      const blob=await getPngBlob();
      const file=new File([blob],"FormIQ-Session-Report.png",{type:"image/png"});
      const shareData={
        title:"My FormIQ Squat Session",
        text:`Check out my squat form report from FormIQ AI 🏋️ — try it free at https://${SITE}`,
        files:[file],
      };
      // canShare guards — some desktop browsers don't support file sharing
      if(navigator.share && navigator.canShare && navigator.canShare(shareData)){
        await navigator.share(shareData);
        setStatus("done");
      } else if(navigator.share){
        // File share not supported — share text+URL only (still opens native sheet)
        await navigator.share({
          title:"FormIQ — AI Squat Coach",
          text:`I just tracked my squat form with FormIQ AI 🏋️ — try it free at https://${SITE}`,
          url:`https://${SITE}`,
        });
        setStatus("done");
      } else {
        // Desktop browser with no Web Share API — fall through to download
        setErrMsg("Your browser doesn't support native sharing. Download the PNG and share it manually.");
        setStatus("error");
      }
    } catch(e){
      if(e.name==="AbortError"){
        // User cancelled the share sheet — reset silently
        setStatus("idle");
      } else {
        setErrMsg("Sharing failed. Download the image below and share it yourself.");
        setStatus("error");
      }
    }
  };

  const downloadPng=async()=>{
    const blob=await getPngBlob();
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=url; a.download="FormIQ-Session-Report.png"; a.click();
    URL.revokeObjectURL(url);
    setStatus("idle");
  };

  const btn=(bg,col,border,onClick,disabled,children)=>(
    <button onClick={onClick} disabled={disabled} style={{
      display:"flex",alignItems:"center",justifyContent:"center",gap:10,
      width:"100%",padding:"15px",background:disabled?"#1A1A1A":bg,
      color:disabled?"#444":col,border:border||"none",borderRadius:10,
      fontWeight:700,fontSize:14,cursor:disabled?"default":"pointer",
      letterSpacing:1,textTransform:"uppercase",marginBottom:10,
      transition:"opacity .2s",opacity:disabled?.6:1,
    }}>{children}</button>
  );

  return(
    <div style={{position:"fixed",inset:0,background:"#000000E0",
      display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:9999}}>
      <div style={{background:"#111",borderTop:"1px solid #272727",
        borderRadius:"20px 20px 0 0",width:"100%",maxWidth:560,
        padding:"20px 20px 40px",maxHeight:"92vh",overflowY:"auto"}}>

        {/* Drag handle */}
        <div style={{width:36,height:4,background:"#333",borderRadius:2,margin:"0 auto 18px"}}/>

        <div style={{fontSize:15,fontWeight:700,color:"#F0F0F0",marginBottom:3,textAlign:"center"}}>
          Share Session Report
        </div>
        <div style={{fontSize:12,color:"#777",textAlign:"center",marginBottom:16}}>
          Your device will open a share sheet — pick any app
        </div>

        {/* Report preview thumbnail */}
        <div style={{borderRadius:10,overflow:"hidden",marginBottom:18,
          border:"1px solid #222",background:"#000",maxHeight:320,overflowY:"hidden"}}>
          <img src={previewUrl} alt="Report" style={{width:"100%",display:"block"}}/>
        </div>

        {/* Error message */}
        {errMsg&&(
          <div style={{background:"#FF3D3D18",border:"1px solid #FF3D3D40",
            borderRadius:8,padding:"10px 14px",marginBottom:12,
            fontSize:12,color:"#FF8888",lineHeight:1.5}}>{errMsg}</div>
        )}

        {/* ── MAIN SHARE BUTTON ── */}
        {btn(
          "#00E676","#000","none",
          shareViaSheet,
          status==="sharing",
          <>
            <span style={{fontSize:20}}>
              {status==="sharing"?"⏳":status==="done"?"✅":"📤"}
            </span>
            <span>
              {status==="sharing"?"Opening share sheet..."
               :status==="done"?"Shared successfully!"
               :"Share via WhatsApp / Telegram / Any App"}
            </span>
          </>
        )}

        {/* How it works note */}
        <div style={{background:"#1A1A1A",border:"1px solid #272727",
          borderRadius:8,padding:"10px 14px",marginBottom:10}}>
          <div style={{fontSize:11,color:"#888",lineHeight:1.7}}>
            <strong style={{color:"#AAA"}}>How it works:</strong> Tapping the button above opens your device's
            native share sheet — the same one you use to share photos. Select WhatsApp, Telegram,
            Instagram, or any other app. The full report image is attached automatically.
          </div>
        </div>

        {/* Download fallback */}
        {btn(
          "#1A1A1A","#CCC","1px solid #333",
          downloadPng, false,
          <><span style={{fontSize:18}}>⬇️</span><span>Download PNG (share manually)</span></>
        )}

        <button onClick={onClose}
          style={{width:"100%",padding:"13px",background:"transparent",
            color:"#555",border:"none",cursor:"pointer",fontSize:13,marginTop:4}}>
          Close
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════
export default function FormIQ(){
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
  const [poseStatus,   setPoseStatus]   = useState("idle");
  const [formAlerts,   setFormAlerts]   = useState([]);
  const [liveAngles,   setLiveAngles]   = useState(null);
  const [repPhase,     setRepPhase]     = useState("up");
  // ── New share state ──────────────────────────────────────────────────────
  const [screenName,   setScreenName]   = useState(()=>localStorage.getItem("fiq_name")||"");
  const [showNameModal,setShowNameModal]= useState(false);
  const [shareCanvas,  setShareCanvas]  = useState(null);
  const [logoImg,      setLogoImg]      = useState(null);
  const [logo512Img,   setLogo512Img]   = useState(null);

  const videoRef      = useRef(null);
  const canvasRef     = useRef(null);
  const streamRef     = useRef(null);
  const poseRef       = useRef(null);
  const animFrameRef  = useRef(null);
  const historyRef    = useRef([]);
  const repsRef       = useRef(0);
  const curSetRef     = useRef(1);
  const totalSetsRef  = useRef(3);
  const analyzingRef  = useRef(false);
  const repStateRef   = useRef("up");
  const repDataRef    = useRef([]);
  const currentRepRef = useRef(null);
  const finishSetRef  = useRef(null);
  const onResultsRef  = useRef(null);

  const REPS=10, REST=90;
  const DOWN_T=112, UP_T=158;

  useEffect(()=>{repsRef.current=reps;},[reps]);
  useEffect(()=>{curSetRef.current=curSet;},[curSet]);
  useEffect(()=>{totalSetsRef.current=totalSets;},[totalSets]);
  useEffect(()=>{analyzingRef.current=analyzing;},[analyzing]);

  // Pre-load logo images for report
  useEffect(()=>{
    const img=new Image();
    img.crossOrigin="anonymous";
    img.onload=()=>setLogoImg(img);
    img.onerror=()=>setLogoImg(null);
    img.src=`${process.env.PUBLIC_URL}/formIQ.png`;
    const img2=new Image();
    img2.crossOrigin="anonymous";
    img2.onload=()=>setLogo512Img(img2);
    img2.onerror=()=>setLogo512Img(null);
    img2.src=`${process.env.PUBLIC_URL}/logo512.png`;
  },[]);

  // ── Pose onResults ────────────────────────────────────────────────────────
  onResultsRef.current=(results)=>{
    if(!canvasRef.current||!videoRef.current)return;
    const canvas=canvasRef.current;
    const ctx=canvas.getContext("2d");
    const W=videoRef.current.videoWidth||640;
    const H=videoRef.current.videoHeight||480;
    canvas.width=W; canvas.height=H;
    ctx.clearRect(0,0,W,H);
    if(!results.poseLandmarks)return;

    const lm=results.poseLandmarks;
    const vis=(i)=>(lm[i]?.visibility||0)>0.32;
    const px=(i)=>({x:lm[i].x*W,y:lm[i].y*H});
    const useLeft=(lm[23]?.visibility||0)>=(lm[24]?.visibility||0);
    const [si,hi,ki,ai]=useLeft?[11,23,25,27]:[12,24,26,28];
    const pS=px(si),pH=px(hi),pK=px(ki),pA=px(ai);
    const allVis=vis(si)&&vis(hi)&&vis(ki)&&vis(ai);

    const kneeAngle  = allVis?calcAngle(pH,pK,pA):null;
    const hipAngle   = vis(si)&&vis(hi)&&vis(ki)?calcAngle(pS,pH,pK):null;
    const spineAngle = vis(si)&&vis(hi)
      ?Math.abs(Math.atan2(pH.x-pS.x,pH.y-pS.y)*180/Math.PI):null;
    const kneeForward= allVis?(pK.x-pA.x)/(W*0.09):0;
    const kneeAlignScore=Math.max(20,Math.min(100,100-Math.max(0,kneeForward-0.5)*18));

    const boneColor=kneeAngle===null?C.blue:kneeAngle<95?C.accent:kneeAngle<132?C.warn:C.blue;
    ctx.lineCap="round"; ctx.lineJoin="round";
    BONES.forEach(([a,b])=>{
      if(!lm[a]||!lm[b]||(lm[a].visibility||0)<0.28||(lm[b].visibility||0)<0.28)return;
      ctx.strokeStyle=boneColor+"CC"; ctx.lineWidth=2.5;
      ctx.beginPath();ctx.moveTo(lm[a].x*W,lm[a].y*H);ctx.lineTo(lm[b].x*W,lm[b].y*H);ctx.stroke();
    });
    KEY_POINTS.forEach(i=>{
      if(!vis(i))return;
      ctx.beginPath();ctx.arc(lm[i].x*W,lm[i].y*H,i>=23?6:4,0,Math.PI*2);
      ctx.fillStyle=boneColor;ctx.fill();
      ctx.strokeStyle="#00000080";ctx.lineWidth=1.2;ctx.stroke();
    });

    if(kneeAngle!==null&&!analyzingRef.current&&repsRef.current<REPS){
      if(!currentRepRef.current){
        currentRepRef.current={startTime:Date.now(),minKneeAngle:kneeAngle,
          kneeAngles:[],spineAngles:[],hipAngles:[],kneeAlignScores:[]};
      }
      const cr=currentRepRef.current;
      cr.minKneeAngle=Math.min(cr.minKneeAngle,kneeAngle);
      cr.kneeAngles.push(kneeAngle);
      if(spineAngle!==null)cr.spineAngles.push(spineAngle);
      if(hipAngle!==null)cr.hipAngles.push(hipAngle);
      cr.kneeAlignScores.push(kneeAlignScore);

      if(repStateRef.current==="up"&&kneeAngle<DOWN_T){repStateRef.current="down";setRepPhase("down");}
      if(repStateRef.current==="down"&&kneeAngle>UP_T){
        repStateRef.current="up";setRepPhase("up");
        repDataRef.current.push({
          minKneeAngle:cr.minKneeAngle,avgSpineAngle:avg(cr.spineAngles),
          avgHipAngle:avg(cr.hipAngles),kneeAlignScore:avg(cr.kneeAlignScores),
          duration:(Date.now()-cr.startTime)/1000,
        });
        currentRepRef.current=null;
        const nr=repsRef.current+1; repsRef.current=nr; setReps(nr);
        setRepFlash(true); setTimeout(()=>setRepFlash(false),200);
        if(nr>=REPS&&finishSetRef.current)setTimeout(()=>finishSetRef.current(),850);
      }
    }
    if(kneeAngle!==null)setLiveAngles({
      knee:Math.round(kneeAngle),
      hip:hipAngle?Math.round(hipAngle):"--",
      spine:spineAngle?Math.round(spineAngle):"--",
    });
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
      const pose=new window.Pose({
        locateFile:(f)=>`https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404/${f}`,
      });
      pose.setOptions({modelComplexity:1,smoothLandmarks:true,
        enableSegmentation:false,minDetectionConfidence:0.5,minTrackingConfidence:0.5});
      pose.onResults((r)=>onResultsRef.current(r));
      await pose.initialize();
      poseRef.current=pose; setPoseStatus("ready");
    }catch(err){console.error(err);setPoseStatus("error");}
  };

  const startCamera=async(facing)=>{
    setCamError(""); setCamReady(false);
    try{
      if(streamRef.current)streamRef.current.getTracks().forEach(t=>t.stop());
      const stream=await navigator.mediaDevices.getUserMedia({
        video:{facingMode:facing,width:{ideal:1280},height:{ideal:720}},audio:false,
      });
      streamRef.current=stream;
      if(videoRef.current){
        videoRef.current.srcObject=stream;
        videoRef.current.onloadedmetadata=()=>{videoRef.current.play();setCamReady(true);};
      }
    }catch(err){
      setCamError(err.name==="NotAllowedError"
        ?"Camera permission denied. Allow camera access in browser settings."
        :err.name==="NotFoundError"?"No camera found on this device."
        :"Could not start camera: "+err.message);
    }
  };

  const stopCamera=()=>{
    if(animFrameRef.current)cancelAnimationFrame(animFrameRef.current);
    if(streamRef.current){streamRef.current.getTracks().forEach(t=>t.stop());streamRef.current=null;}
    setCamReady(false);
  };

  const flipCamera=()=>{
    const next=facingMode==="environment"?"user":"environment";
    setFacingMode(next); startCamera(next);
  };

  useEffect(()=>{
    if(!camReady||!poseRef.current||camMode!=="single")return;
    let running=true;
    const loop=async()=>{
      if(!running)return;
      if(videoRef.current?.readyState>=2){try{await poseRef.current.send({image:videoRef.current});}catch{}}
      if(running)animFrameRef.current=requestAnimationFrame(loop);
    };
    animFrameRef.current=requestAnimationFrame(loop);
    return()=>{running=false;cancelAnimationFrame(animFrameRef.current);};
  },[camReady,camMode]); // eslint-disable-line

  useEffect(()=>{
    if(poseStatus==="ready"&&camReady&&camMode==="single"){
      cancelAnimationFrame(animFrameRef.current);
      let running=true;
      const loop=async()=>{
        if(!running)return;
        if(videoRef.current?.readyState>=2){try{await poseRef.current.send({image:videoRef.current});}catch{}}
        if(running)animFrameRef.current=requestAnimationFrame(loop);
      };
      animFrameRef.current=requestAnimationFrame(loop);
      return()=>{running=false;cancelAnimationFrame(animFrameRef.current);};
    }
  },[poseStatus,camReady,camMode]); // eslint-disable-line

  useEffect(()=>{
    if(screen==="workout"&&camMode==="single"){startCamera(facingMode);loadPose();}
    if(screen!=="workout")stopCamera();
  },[screen,camMode]); // eslint-disable-line

  useEffect(()=>{
    if(screen!=="workout")return;
    const t=setInterval(()=>setTipI(i=>(i+1)%TIPS.length),4500);
    return()=>clearInterval(t);
  },[screen]);

  useEffect(()=>{const t=setInterval(()=>setScan(s=>(s+1.2)%100),35);return()=>clearInterval(t);},[]);
  useEffect(()=>{if(!analyzing)return;const t=setInterval(()=>setDots(d=>(d+1)%4),450);return()=>clearInterval(t);},[analyzing]);
  useEffect(()=>{
    if(!resting)return;
    const t=setInterval(()=>setRestT(r=>{
      if(r>=REST-1){setResting(false);setRestT(0);return 0;}return r+1;
    }),1000);
    return()=>clearInterval(t);
  },[resting]);

  const finishSet=async()=>{
    if(analyzingRef.current)return;
    const realM=(camMode==="single"&&poseStatus==="ready"&&repDataRef.current.length>=2)
      ?calcRealMetrics(repDataRef.current):null;
    const m=realM||mkSimMetrics(curSetRef.current);
    const score=calcScore(m);
    setMetrics(m);
    const entry={setNumber:curSetRef.current,score,metrics:m,usedPose:!!realM};
    historyRef.current=[...historyRef.current,entry];
    setHistory(historyRef.current);
    setAnalyzing(true); setScreen("analysis");
    if(curSetRef.current<totalSetsRef.current)setResting(true);
    repDataRef.current=[]; repStateRef.current="up"; currentRepRef.current=null;
    setRepPhase("up"); setFormAlerts([]); setLiveAngles(null);

    try{
      const res=await fetch("https://api.anthropic.com/v1/messages",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          model:"claude-sonnet-4-20250514",max_tokens:800,
          messages:[{role:"user",content:
            `You are an elite strength coach. Athlete finished Set ${curSetRef.current} of ${totalSetsRef.current} (10 squats). ${realM?"Live pose data:":"Simulated data:"}
Knee Alignment: ${m.kneeAlignment}/100
Spine Neutrality: ${m.spineNeutrality}/100
Squat Depth: ${m.squatDepth}/100
Tempo Control: ${m.tempoConsistency}/100
Hip Hinge: ${m.hipHinge}/100
Set Score: ${score}/100
Respond in exactly 3 sentences. Direct coaching voice. No lists or headers.`
          }]
        })
      });
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
      setFinalScore(h.length?Math.round(h.reduce((s,e)=>s+e.score,0)/h.length):0);
      setScreen("results");
    } else {
      const n=curSet+1; setCurSet(n); curSetRef.current=n;
      setReps(0); repsRef.current=0; setFeedback(""); setMetrics(null);
      setScreen("workout");
    }
  };

  // ── Share handler ─────────────────────────────────────────────────────────
  const handleShare=(fs,h,ts)=>{
    if(!screenName){
      setShowNameModal(true);
      // defer canvas gen until name saved — handled in onNameSave
      return;
    }
    const c=generateReportCanvas({screenName,finalScore:fs,history:h,
      totalSets:ts,REPS,logoImg,logo512Img});
    setShareCanvas(c);
  };

  const onNameSave=(name)=>{
    setScreenName(name);
    if(name)localStorage.setItem("fiq_name",name);
    setShowNameModal(false);
    const c=generateReportCanvas({screenName:name,
      finalScore:finalScore??0,history:historyRef.current,
      totalSets,REPS,logoImg,logo512Img});
    setShareCanvas(c);
  };

  const restart=()=>{
    stopCamera();
    setScreen("setup");setCamMode(null);setCurSet(1);curSetRef.current=1;
    setReps(0);repsRef.current=0;setHistory([]);historyRef.current=[];
    setMetrics(null);setFeedback("");setFinalScore(null);
    setAnalyzing(false);analyzingRef.current=false;
    setResting(false);setRestT(0);setTotalSets(3);totalSetsRef.current=3;
    setCamError("");setCamReady(false);
    setPoseStatus("idle");poseRef.current=null;
    setFormAlerts([]);setLiveAngles(null);
    repDataRef.current=[];repStateRef.current="up";currentRepRef.current=null;
    setShareCanvas(null);
  };

  const tapRep=()=>{
    const poseActive=camMode==="single"&&poseStatus==="ready";
    if(reps>=REPS||analyzing||poseActive)return;
    const n=reps+1;repsRef.current=n;setReps(n);
    setRepFlash(true);setTimeout(()=>setRepFlash(false),200);
    if(n>=REPS)setTimeout(()=>finishSetRef.current?.(),850);
  };

  // ── Style shortcuts ───────────────────────────────────────────────────────
  const font=`system-ui,-apple-system,'Segoe UI',sans-serif`;
  const page={background:C.bg,color:C.text,minHeight:"100vh",fontFamily:font};
  const card=(ac)=>({background:C.surface,borderRadius:10,padding:"16px 18px",
    border:`1px solid ${ac?C.accent+"40":C.border}`});
  const pil=(a)=>({width:36,height:36,borderRadius:8,cursor:"pointer",
    background:a?C.accent:C.s2,color:a?"#000":C.text,
    display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:14});
  const lbl={fontSize:10,letterSpacing:3,color:C.muted,textTransform:"uppercase",fontWeight:600};

  // ════════════════════════════════════════════════════════════
  // SETUP
  // ════════════════════════════════════════════════════════════
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

        <div className="fu fu2" style={{marginBottom:18}}>
          <div style={{...lbl,marginBottom:10}}>Camera Setup</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            {[
              {id:"single",title:"Single Camera",badge:"LIVE NOW",locked:false,
               lines:["Uses your device camera","Side-on view recommended","Webcam or phone"],
               note:"✓ Real pose tracking active"},
              {id:"quad-4k",title:"Quad 4K System",badge:"COMING SOON",locked:true,
               lines:["4× cameras via HDMI","Front·Back·Left·Right","Capture card required"],
               note:"🔒 Multi-cam phase"},
            ].map(({id,title,badge,locked,lines,note})=>(
              <div key={id} className="cc" onClick={()=>setCamMode(id)} style={{
                ...card(false),cursor:"pointer",
                border:`1px solid ${camMode===id?C.accent:C.border}`,
                background:camMode===id?"#071510":C.surface,
                position:"relative",opacity:locked&&camMode!==id?.78:1,
                transition:"border-color .2s,background .2s"}}>
                <div style={{position:"absolute",top:12,right:12,fontSize:9,fontWeight:700,
                  letterSpacing:1.5,padding:"3px 8px",borderRadius:4,
                  background:locked?C.s3:(camMode===id?C.accent:C.s2),
                  color:locked?C.warn:(camMode===id?"#000":C.muted),
                  border:locked?`1px solid ${C.warn}40`:"none"}}>{badge}</div>
                <div style={{fontWeight:700,fontSize:14,marginBottom:8}}>{title}</div>
                {lines.map((l,i)=><div key={i} style={{fontSize:12,color:C.mutedLight,lineHeight:1.7}}>{l}</div>)}
                <div style={{marginTop:10,fontSize:11,fontWeight:600,
                  color:locked?C.warn:C.accent}}>{note}</div>
              </div>
            ))}
          </div>
        </div>

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

        {/* Screen name row */}
        <div className="fu fu4" style={{...card(false),marginBottom:18,
          display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div>
            <div style={{fontWeight:600,fontSize:14}}>
              {screenName?`👤 ${screenName}`:"Set your name for reports"}
            </div>
            <div style={{fontSize:12,color:C.muted,marginTop:3}}>
              {screenName?"Shown on shared session reports":"Optional · appears on your share card"}
            </div>
          </div>
          <button onClick={()=>setShowNameModal(true)} style={{
            padding:"8px 14px",background:C.s2,color:C.text,border:`1px solid ${C.border}`,
            borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:600,whiteSpace:"nowrap"}}>
            {screenName?"Edit":"Set Name"}
          </button>
        </div>

        <div className="fu fu5">
          <button onClick={()=>camMode&&setScreen("workout")} style={{
            width:"100%",padding:"18px",fontSize:15,fontWeight:800,
            background:camMode?C.accent:C.s3,color:camMode?"#000":C.muted,
            border:"none",borderRadius:10,cursor:camMode?"pointer":"default",
            letterSpacing:2.5,textTransform:"uppercase",transition:"all .25s"}}>
            {!camMode?"Select a camera mode to start"
              :camMode==="single"?"Open Camera & Begin →":"Preview Simulation →"}
          </button>
        </div>

        <div style={{display:"flex",gap:6,marginTop:16,flexWrap:"wrap",justifyContent:"center"}}>
          {["Live pose","Auto rep count","AI coaching","Form alerts","Shareable report"].map(f=>(
            <span key={f} style={{fontSize:11,color:C.muted,background:C.s2,
              padding:"3px 10px",borderRadius:20}}>{f}</span>
          ))}
        </div>
      </div>
      {showNameModal&&<ScreenNameModal value={screenName} onSave={onNameSave}/>}
    </div>
  );

  // ════════════════════════════════════════════════════════════
  // WORKOUT
  // ════════════════════════════════════════════════════════════
  if(screen==="workout"){
    const pct=(reps/REPS)*100;
    const poseActive=camMode==="single"&&poseStatus==="ready";
    const poseLoading=poseStatus==="loading";

    const poseBadge=()=>{
      if(camMode!=="single")return null;
      const cfg={
        idle:   {label:"INITIALISING",      color:C.muted,  bg:C.s2},
        loading:{label:"LOADING POSE AI...",color:C.warn,   bg:C.warn+"18"},
        ready:  {label:"POSE TRACKING LIVE",color:C.accent, bg:C.accent+"18"},
        error:  {label:"POSE UNAVAILABLE",  color:C.danger, bg:C.danger+"18"},
      }[poseStatus]||{};
      return(
        <div style={{display:"flex",alignItems:"center",gap:6,
          background:cfg.bg,padding:"5px 12px",borderRadius:6,
          border:`1px solid ${cfg.color}30`}}>
          {poseStatus==="ready"&&<div style={{width:6,height:6,borderRadius:"50%",background:C.accent}} className="pu"/>}
          {poseStatus==="loading"&&<div style={{fontSize:11}} className="pu">⟳</div>}
          <span style={{fontSize:9,color:cfg.color,letterSpacing:2,fontWeight:700}}>{cfg.label}</span>
        </div>
      );
    };

    const SimFeed=({label:lb,angle})=>(
      <div style={{background:"#030303",position:"relative",overflow:"hidden",
        aspectRatio:"4/3",display:"flex",alignItems:"center",justifyContent:"center"}}>
        <svg style={{position:"absolute",inset:0,width:"100%",height:"100%",opacity:.07}}
          preserveAspectRatio="none">
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
          <circle cx="4" cy="25" r="5" fill="none" stroke={C.accent} strokeWidth="2"/>
          <circle cx="72" cy="25" r="5" fill="none" stroke={C.accent} strokeWidth="2"/>
        </svg>
        {[{top:7,left:7,bt:true,bl:true},{top:7,right:7,bt:true,br:true},
          {bottom:7,left:7,bb:true,bl:true},{bottom:7,right:7,bb:true,br:true}]
          .map(({top,left,right,bottom,bt,br,bb,bl},i)=>(
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

    return(
      <div style={{...page}}>
        <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.35}}.pu{animation:pulse 1.8s ease-in-out infinite}`}</style>

        {camMode==="single"&&(
          <div style={{position:"relative",background:"#000",width:"100%"}}>
            <video ref={videoRef} autoPlay playsInline muted
              style={{width:"100%",maxHeight:340,objectFit:"cover",display:"block"}}/>
            <canvas ref={canvasRef} style={{position:"absolute",top:0,left:0,
              width:"100%",height:"100%",pointerEvents:"none",objectFit:"cover"}}/>
            {poseStatus!=="ready"&&(
              <div style={{position:"absolute",left:0,right:0,height:1,top:`${scan}%`,
                background:`linear-gradient(90deg,transparent,${C.accent}60,transparent)`,
                pointerEvents:"none"}}/>
            )}
            {[{top:10,left:10,bt:true,bl:true},{top:10,right:10,bt:true,br:true},
              {bottom:10,left:10,bb:true,bl:true},{bottom:10,right:10,bb:true,br:true}]
              .map(({top,left,right,bottom,bt,br,bb,bl},i)=>(
              <div key={i} style={{position:"absolute",top,left,right,bottom,
                width:18,height:18,pointerEvents:"none",
                borderTop:bt?`2px solid ${C.accent}`:"none",
                borderRight:br?`2px solid ${C.accent}`:"none",
                borderBottom:bb?`2px solid ${C.accent}`:"none",
                borderLeft:bl?`2px solid ${C.accent}`:"none"}}/>
            ))}
            <div style={{position:"absolute",top:10,left:10,right:10,
              display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{display:"flex",gap:6,alignItems:"center"}}>
                <div style={{display:"flex",alignItems:"center",gap:5,
                  background:"#000000AA",padding:"4px 9px",borderRadius:6}}>
                  <div style={{width:6,height:6,borderRadius:"50%",background:"#FF3B3B"}} className="pu"/>
                  <span style={{fontSize:10,color:C.text,letterSpacing:1.5,fontWeight:700}}>LIVE</span>
                </div>
                {poseBadge()}
              </div>
              <button onClick={flipCamera} title="Flip camera"
                style={{background:"#000000AA",border:`1px solid ${C.border}`,
                  borderRadius:8,padding:"6px 10px",cursor:"pointer",fontSize:16,color:C.text}}>🔄</button>
            </div>
            {poseActive&&liveAngles&&(
              <div style={{position:"absolute",bottom:10,left:10,
                background:"#000000BB",border:`1px solid ${C.accent}30`,
                borderRadius:8,padding:"6px 12px",display:"flex",gap:12}}>
                {[{l:"KNEE",v:liveAngles.knee,good:liveAngles.knee<100},
                  {l:"HIP",v:liveAngles.hip,good:true},
                  {l:"SPINE",v:liveAngles.spine,good:liveAngles.spine<55}]
                  .map(({l,v,good})=>(
                  <div key={l} style={{textAlign:"center"}}>
                    <div style={{fontSize:9,color:C.muted,letterSpacing:1.5}}>{l}</div>
                    <div style={{fontSize:15,fontWeight:800,
                      color:typeof v==="number"?(good?C.accent:C.warn):C.muted}}>{v}°</div>
                  </div>
                ))}
                <div style={{borderLeft:`1px solid ${C.border}`,paddingLeft:10,textAlign:"center"}}>
                  <div style={{fontSize:9,color:C.muted,letterSpacing:1.5}}>PHASE</div>
                  <div style={{fontSize:12,fontWeight:800,
                    color:repPhase==="down"?C.warn:C.accent}}>
                    {repPhase==="down"?"↓ DOWN":"↑ UP"}
                  </div>
                </div>
              </div>
            )}
            {poseActive&&formAlerts.length>0&&(
              <div style={{position:"absolute",top:"50%",left:"50%",
                transform:"translate(-50%,-50%)",
                display:"flex",flexDirection:"column",gap:6,alignItems:"center",pointerEvents:"none"}}>
                {formAlerts.map((a,i)=>(
                  <div key={i} style={{background:"#000000DD",
                    border:`1.5px solid ${a.color}`,borderRadius:8,
                    padding:"6px 14px",fontSize:12,fontWeight:800,
                    color:a.color,letterSpacing:2}}>{a.text}</div>
                ))}
              </div>
            )}
            {!camReady&&!camError&&(
              <div style={{position:"absolute",inset:0,display:"flex",
                alignItems:"center",justifyContent:"center",background:"#000000CC"}}>
                <div style={{textAlign:"center"}}>
                  <div style={{fontSize:28,marginBottom:8}}>📷</div>
                  <div className="pu" style={{fontSize:12,color:C.accent,letterSpacing:2}}>OPENING CAMERA...</div>
                </div>
              </div>
            )}
            {camError&&(
              <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",
                alignItems:"center",justifyContent:"center",background:"#000000EE",padding:20}}>
                <div style={{fontSize:32,marginBottom:12}}>📷</div>
                <div style={{fontSize:13,color:C.danger,textAlign:"center",lineHeight:1.6,marginBottom:16}}>{camError}</div>
                <button onClick={()=>startCamera(facingMode)} style={{
                  padding:"10px 22px",background:C.accent,color:"#000",
                  border:"none",borderRadius:8,fontWeight:700,cursor:"pointer"}}>Retry Camera</button>
              </div>
            )}
          </div>
        )}

        {camMode==="quad-4k"&&(
          <div>
            <div style={{background:C.warn+"18",borderBottom:`1px solid ${C.warn}30`,
              padding:"8px 16px",display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:13}}>🔒</span>
              <span style={{fontSize:11,color:C.warn,fontWeight:600}}>
                Quad 4K HDMI camera feeds activate in multi-cam phase — showing simulation
              </span>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:1.5,background:"#000"}}>
              {[{label:"FRONT",angle:"CAM-1·4K"},{label:"BACK",angle:"CAM-2·4K"},
                {label:"LEFT SIDE",angle:"CAM-3·4K"},{label:"RIGHT SIDE",angle:"CAM-4·4K"}]
                .map(({label:lb,angle})=><SimFeed key={lb} label={lb} angle={angle}/>)}
            </div>
          </div>
        )}

        <div style={{padding:"18px 20px 24px",background:C.bg}}>
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
          <div style={{height:3,background:C.s2,borderRadius:2,marginBottom:14,overflow:"hidden"}}>
            <div style={{height:"100%",width:`${pct}%`,background:C.accent,borderRadius:2,transition:"width .28s ease"}}/>
          </div>
          <div style={{display:"flex",gap:5,marginBottom:14}}>
            {[...Array(REPS)].map((_,i)=>(
              <div key={i} style={{flex:1,height:6,borderRadius:2,
                background:i<reps?C.accent:C.s2,transition:"background .15s"}}/>
            ))}
          </div>
          <div style={{...card(false),marginBottom:14,padding:"11px 14px",
            display:"flex",gap:10,alignItems:"flex-start"}}>
            <div style={{color:C.accent,fontSize:13,flexShrink:0,marginTop:1}}>▸</div>
            <div style={{fontSize:13,color:"#C8C8C8",lineHeight:1.5}}>{TIPS[tipI]}</div>
          </div>
          {poseActive?(
            <div style={{...card(true),textAlign:"center",padding:"18px"}}>
              <div style={{fontSize:11,color:C.accent,letterSpacing:2.5,fontWeight:700,marginBottom:8}}>
                ⚡ AUTO REP COUNTING ACTIVE
              </div>
              <div style={{fontSize:13,color:C.mutedLight,lineHeight:1.6}}>
                {reps===0?"Step into frame and begin squatting — reps count automatically"
                  :repPhase==="down"?"↓  Descending — drive through your heels to stand"
                  :"↑  Standing — brace and descend for the next rep"}
              </div>
            </div>
          ):(
            <button className="rb" onClick={tapRep} disabled={reps>=REPS}
              style={{width:"100%",padding:"20px",fontSize:16,fontWeight:800,
                background:reps>=REPS?C.s2:C.accent,color:reps>=REPS?C.muted:"#000",
                border:"none",borderRadius:10,cursor:reps>=REPS?"default":"pointer",
                letterSpacing:2,textTransform:"uppercase",transition:"all .2s"}}>
              {reps>=REPS?"Set complete — calculating score..."
                :poseLoading?`TAP EACH REP  ·  ${REPS-reps} REMAINING  (pose loading…)`
                :`TAP EACH REP  ·  ${REPS-reps} REMAINING`}
            </button>
          )}
          <div style={{textAlign:"center",marginTop:10,fontSize:11,color:C.muted}}>
            {poseActive?"Position side-on to camera for best accuracy"
              :camMode==="single"?"Pose engine loading — tap to count manually"
              :"Quad 4K auto-detection in multi-cam phase"}
          </div>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════
  // ANALYSIS
  // ════════════════════════════════════════════════════════════
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
            <div style={{...lbl,marginBottom:12}}>
              Set {historyRef.current.length} · {REPS} reps · {usedPose?"Live Pose":"Simulated"}
            </div>
            <div style={{fontSize:88,fontWeight:900,letterSpacing:-5,lineHeight:1,
              color:analyzing?C.muted:mc(score),transition:"color .5s"}}>
              {analyzing?"—":score}
            </div>
            <div style={{fontSize:16,color:analyzing?C.muted:mc(score),fontWeight:700,marginTop:4}}>
              {analyzing?`Analysing form${".".repeat(dots)}`:`${grade(score)}  ·  ${gLabel(score)}`}
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

          {metrics&&(
            <div style={{...card(false),marginBottom:14}}>
              <div style={{...lbl,marginBottom:16}}>
                Form Analysis {usedPose?"· Real Keypoints":"· Simulation"}
              </div>
              {METRICS_DEF.map(({key,label:lb,weight})=>{
                const v=metrics[key];
                return(
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

          <div style={{...card(true),marginBottom:14}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
              <div style={{width:22,height:22,borderRadius:6,background:C.accent,
                display:"flex",alignItems:"center",justifyContent:"center",fontSize:13}}>⚡</div>
              <span style={{...lbl,color:C.accent}}>AI Coach · Claude</span>
              {analyzing&&<span style={{fontSize:11,color:C.muted,marginLeft:4}}>thinking{".".repeat(dots)}</span>}
            </div>
            <p style={{margin:0,fontSize:14,lineHeight:1.75,color:analyzing?C.muted:"#D8D8D8"}}>
              {analyzing?"Analysing your squat mechanics across all 10 reps...":feedback}
            </p>
          </div>

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

          {history.length>=2&&(
            <div style={{...card(false),marginBottom:14}}>
              <div style={{...lbl,marginBottom:12}}>Progress This Session</div>
              <div style={{display:"flex",gap:8}}>
                {history.map(({setNumber:sn,score:sc,usedPose:up})=>(
                  <div key={sn} style={{flex:1,textAlign:"center"}}>
                    <div style={{fontSize:9,color:C.muted,marginBottom:2}}>S{sn}{up?" ●":""}</div>
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
  const poseCount=history.filter(h=>h.usedPose).length;

  return(
    <div style={{...page,padding:"24px 20px 36px"}}>
      <div style={{maxWidth:560,margin:"0 auto"}}>

        {/* ── Results hero: logo LEFT · score RIGHT ── */}
        <div style={{display:"flex",alignItems:"center",gap:20,
          padding:"20px 0 24px",borderBottom:`1px solid ${C.border}`,marginBottom:20}}>
          {/* Logo left */}
          <img
            src={`${process.env.PUBLIC_URL}/formIQ.png`}
            alt="FormIQ"
            style={{height:100,width:100,objectFit:"contain",flexShrink:0,
              borderRadius:14,background:C.s2,padding:6}}
          />
          {/* Score right */}
          <div style={{flex:1,minWidth:0}}>
            <div style={{...lbl,marginBottom:6}}>Session Complete</div>
            <div style={{fontSize:72,fontWeight:900,letterSpacing:-4,color:gc,lineHeight:1}}>{fs}</div>
            <div style={{fontSize:18,color:gc,fontWeight:700,marginTop:4}}>
              {grade(fs)}&nbsp;&nbsp;·&nbsp;&nbsp;{gLabel(fs)}
            </div>
            <div style={{color:C.muted,marginTop:6,fontSize:12}}>
              {totalSets} sets · {totalSets*REPS} reps
              {poseCount>0&&` · ${poseCount}/${totalSets} pose`}
            </div>
          </div>
        </div>

        <div style={{...card(false),marginBottom:14}}>
          <div style={{...lbl,marginBottom:16}}>Set-by-Set Results</div>
          {history.map(({setNumber:sn,score:sc,usedPose:up})=>(
            <div key={sn} style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
              <div style={{width:36,height:36,borderRadius:8,flexShrink:0,
                background:mc(sc)+"18",display:"flex",alignItems:"center",
                justifyContent:"center",color:mc(sc),fontWeight:800,fontSize:12}}>S{sn}</div>
              <div style={{flex:1}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <span style={{fontSize:13,color:C.mutedLight}}>Set {sn}</span>
                    {up&&<span style={{fontSize:9,color:C.accent,background:C.accent+"18",
                      padding:"1px 6px",borderRadius:4,fontWeight:700}}>POSE</span>}
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

        {/* ── Share CTA ── */}
        <div style={{...card(true),marginBottom:14,background:"#071510"}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
            <div style={{fontSize:20}}>📊</div>
            <div>
              <div style={{fontWeight:700,fontSize:14,color:C.text}}>Share Your Session Report</div>
              <div style={{fontSize:12,color:C.muted,marginTop:2}}>
                Invite friends to try FormIQ — includes your score, metrics & site link
              </div>
            </div>
          </div>
          <button onClick={()=>handleShare(fs,historyRef.current,totalSets)} style={{
            width:"100%",padding:"14px",background:C.accent,color:"#000",
            border:"none",borderRadius:8,fontWeight:800,cursor:"pointer",
            fontSize:14,letterSpacing:2,textTransform:"uppercase"}}>
            📤 Generate & Share Report
          </button>
          {screenName&&(
            <div style={{fontSize:11,color:C.muted,textAlign:"center",marginTop:8}}>
              Sharing as: <strong style={{color:C.accent}}>{screenName}</strong>
              <span onClick={()=>setShowNameModal(true)}
                style={{color:C.muted,marginLeft:8,cursor:"pointer",textDecoration:"underline"}}>
                change
              </span>
            </div>
          )}
        </div>

        <div style={{...card(false),marginBottom:20,background:C.s2}}>
          <div style={{...lbl,marginBottom:10}}>Multi-Cam Phase — Coming Next</div>
          {["Quad 4K HDMI camera input via capture card",
            "360° pose tracking — front, back, left, right",
            "Knee cave detection from front camera",
            "Bar path tracking overlay on back camera",
            "Rep-by-rep heatmap and long-term analytics"].map((item,i)=>(
            <div key={i} style={{display:"flex",gap:8,marginBottom:8,alignItems:"flex-start"}}>
              <div style={{color:C.muted,fontSize:12,marginTop:1,flexShrink:0}}>○</div>
              <div style={{fontSize:12,color:C.mutedLight,lineHeight:1.5}}>{item}</div>
            </div>
          ))}
        </div>

        <button onClick={restart} style={{
          width:"100%",padding:"17px",fontSize:14,fontWeight:800,
          background:C.accent,color:"#000",border:"none",
          borderRadius:10,cursor:"pointer",letterSpacing:2,textTransform:"uppercase"}}>
          New Session
        </button>
      </div>

      {/* Modals */}
      {showNameModal&&<ScreenNameModal value={screenName} onSave={onNameSave}/>}
      {shareCanvas&&<ShareModal canvas={shareCanvas} onClose={()=>setShareCanvas(null)}/>}
    </div>
  );
}
