import { useState } from "react";
import { saveTrainer, savePendingReg, getTrainerPlans, saveTrainerPlans, DEFAULT_PLANS } from "./db";

const C = { bg:"#07080A", surface:"#0E1014", s2:"#141619", s3:"#1C1F24", border:"#23262D", accent:"#00E676", gold:"#F5A623", blue:"#3D8EF0", danger:"#FF4757", text:"#F0F2F5", muted:"#6B7280", mutedL:"#9CA3AF" };

const CURRENCIES = {
  USD:{symbol:"$",flag:"🇺🇸",gateway:"stripe"},   GBP:{symbol:"£",flag:"🇬🇧",gateway:"stripe"},
  EUR:{symbol:"€",flag:"🇪🇺",gateway:"stripe"},   NGN:{symbol:"₦",flag:"🇳🇬",gateway:"paystack"},
  GHS:{symbol:"₵",flag:"🇬🇭",gateway:"paystack"}, KES:{symbol:"KSh",flag:"🇰🇪",gateway:"paystack"},
  ZAR:{symbol:"R",flag:"🇿🇦",gateway:"paystack"},  CAD:{symbol:"CA$",flag:"🇨🇦",gateway:"stripe"},
  AUD:{symbol:"A$",flag:"🇦🇺",gateway:"stripe"},   UGX:{symbol:"USh",flag:"🇺🇬",gateway:"paystack"},
  EGP:{symbol:"E£",flag:"🇪🇬",gateway:"paystack"}, TZS:{symbol:"TSh",flag:"🇹🇿",gateway:"paystack"},
};

const SPECIALIZATIONS = ["Strength & Conditioning","Powerlifting","Olympic Weightlifting","CrossFit","Bodybuilding","Athletic Performance","Rehabilitation","General Fitness","Sports Specific","Nutrition & Fitness"];

const font = "system-ui,-apple-system,'Segoe UI',sans-serif";
const inp  = { width:"100%", padding:"11px 14px", background:C.s2, border:`1px solid ${C.border}`, borderRadius:8, color:C.text, fontSize:14, fontFamily:font, boxSizing:"border-box", outline:"none" };
const lbl  = { fontSize:11, color:C.mutedL, marginBottom:6, display:"block", fontWeight:500 };

// ── Step indicator ────────────────────────────────────────────
function StepDots({ step, total }) {
  return (
    <div style={{ display:"flex", gap:8, justifyContent:"center", marginBottom:28 }}>
      {Array.from({length:total}).map((_,i)=>(
        <div key={i} style={{ height:4, borderRadius:2, transition:"all .3s",
          width: i===step?28:8,
          background: i<step ? C.accent : i===step ? C.accent : C.s3,
          opacity: i<=step ? 1 : 0.4,
        }}/>
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────
export default function TrainerRegistration({ onDone, onLogin }) {
  const [step, setStep]       = useState(0);
  // Registration fields
  const [form, setForm]       = useState({ name:"", email:"", phone:"", location:"", specialization:"", bio:"", experience:"", website:"" });
  const [formErr, setFormErr] = useState({});
  // Approval state
  const [approvalStatus, setApprovalStatus] = useState("pending"); // pending|approved|rejected
  // Plan setup
  const [currency, setCurrency]   = useState("NGN");
  const [plans, setPlans]         = useState(DEFAULT_PLANS);
  const [planErrors, setPlanErrors] = useState({});
  // Payment
  const [payEmail, setPayEmail]   = useState("");
  const [paying, setPaying]       = useState(false);
  const [payDone, setPayDone]     = useState(false);

  const TOTAL_STEPS = 5;
  const fld = (k,v) => setForm(f=>({...f,[k]:v}));

  // ── Step 0: Registration form ─────────────────────────────
  const submitReg = () => {
    const errs = {};
    if (!form.name.trim())           errs.name = "Required";
    if (!form.email.includes("@"))   errs.email = "Valid email required";
    if (!form.phone.trim())          errs.phone = "Required";
    if (!form.location.trim())       errs.location = "Required";
    if (!form.specialization)        errs.specialization = "Select a specialization";
    if (form.bio.trim().length < 30) errs.bio = "Tell us a bit more (min 30 chars)";
    if (Object.keys(errs).length)    { setFormErr(errs); return; }
    setFormErr({});
    savePendingReg({ ...form, submittedAt: new Date().toISOString() });
    setStep(1);
  };

  // ── Step 1: Under review → simulate instant approval ─────
  const simulateApproval = () => {
    setTimeout(() => { setApprovalStatus("approved"); setStep(2); }, 1500);
    setApprovalStatus("checking");
  };

  // ── Step 2: Set up plans ──────────────────────────────────
  const savePlansAndNext = () => {
    const errs = {};
    ["starter","pro","elite"].forEach(k => {
      if (!plans[k].priceUSD || plans[k].priceUSD <= 0) errs[k] = "Set a price";
      if (!plans[k].name.trim()) errs[`${k}_name`] = "Required";
    });
    if (Object.keys(errs).length) { setPlanErrors(errs); return; }
    setPlanErrors({});
    setStep(3);
  };

  // ── Step 3: Currency + payment ────────────────────────────
  const handlePay = async () => {
    if (!payEmail.includes("@")) return;
    setPaying(true);
    // In production: call Stripe/Paystack checkout API
    // For demo: simulate 2s processing
    setTimeout(() => {
      const slug = form.name.toLowerCase().replace(/[^a-z0-9]/g,"").slice(0,16) + Date.now().toString(36);
      const trainer = {
        slug, name:form.name, email:form.email, phone:form.phone,
        location:form.location, specialization:form.specialization, bio:form.bio,
        experience:form.experience, website:form.website,
        photo: `${process.env.PUBLIC_URL}/photoadams.jpg`,
        accent:"#00E676", currency, plan:"starter",
        tagline: form.specialization,
        welcome: `Hi! I'm ${form.name}, your personal squat coach. I've set you up with FormIQ so I can track your form between our sessions. Accept this invite to get started!`,
        createdAt: new Date().toISOString(), approved:true,
      };
      saveTrainer(trainer);
      saveTrainerPlans(slug, plans);
      setPayDone(true);
      setPaying(false);
      setTimeout(() => { setStep(4); }, 1000);
    }, 2000);
  };

  const curr = CURRENCIES[currency];
  const localPrice = (usd) => {
    const FX = { USD:1,GBP:.79,EUR:.92,CAD:1.36,AUD:1.53,NGN:1580,GHS:12.5,KES:128,ZAR:18.4,UGX:3740,EGP:48.7,TZS:2640 };
    return `${curr.symbol}${Math.round(usd*(FX[currency]||1)).toLocaleString()}`;
  };

  const card = (extra={}) => ({
    background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, padding:"20px 22px", ...extra
  });

  return (
    <div style={{ background:C.bg, minHeight:"100vh", fontFamily:font, color:C.text }}>
      <style>{`
        input:focus,textarea:focus,select:focus{outline:none!important;border-color:#00E67650!important}
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        .fu{animation:fadeUp .4s ease both}
        @keyframes spin{to{transform:rotate(360deg)}}
        .spin{animation:spin 1s linear infinite;display:inline-block}
      `}</style>

      {/* Top bar */}
      <div style={{ background:C.surface, borderBottom:`1px solid ${C.border}`, padding:"14px 24px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <img src={`${process.env.PUBLIC_URL}/formIQ.png`} alt="FormIQ" style={{ height:32, width:"auto" }}/>
        <button onClick={onLogin} style={{ background:"transparent", border:`1px solid ${C.border}`, color:C.mutedL, borderRadius:8, padding:"7px 16px", cursor:"pointer", fontSize:13, fontFamily:font }}>
          I already have an account →
        </button>
      </div>

      <div style={{ maxWidth:620, margin:"0 auto", padding:"32px 20px 48px" }}>

        {/* ── STEP 0: Registration form ── */}
        {step===0&&(
          <div className="fu">
            <div style={{ textAlign:"center", marginBottom:32 }}>
              <div style={{ fontSize:28, fontWeight:900, color:C.text, marginBottom:6 }}>Become a FormIQ Trainer</div>
              <div style={{ fontSize:14, color:C.muted, lineHeight:1.6 }}>
                Join the platform that gives you real-time squat form data on every client.
              </div>
            </div>

            <div style={{ ...card(), marginBottom:16 }}>
              <div style={{ fontSize:12, color:C.accent, fontWeight:700, letterSpacing:2, textTransform:"uppercase", marginBottom:16 }}>Personal Information</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                {[
                  {k:"name",       label:"Full Name",      ph:"Coach Adams",          type:"text"},
                  {k:"email",      label:"Email Address",  ph:"you@email.com",        type:"email"},
                  {k:"phone",      label:"Phone Number",   ph:"+234 800 000 0000",    type:"tel"},
                  {k:"location",   label:"City / Country", ph:"Lagos, Nigeria",       type:"text"},
                  {k:"experience", label:"Years Experience",ph:"e.g. 5",             type:"number"},
                  {k:"website",    label:"Website (optional)",ph:"https://...",       type:"url"},
                ].map(({k,label,ph,type})=>(
                  <div key={k}>
                    <label style={lbl}>{label}</label>
                    <input type={type} placeholder={ph} value={form[k]} onChange={e=>fld(k,e.target.value)}
                      style={{...inp, borderColor:formErr[k]?C.danger:C.border}}/>
                    {formErr[k]&&<div style={{fontSize:11,color:C.danger,marginTop:4}}>{formErr[k]}</div>}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ ...card(), marginBottom:16 }}>
              <div style={{ fontSize:12, color:C.accent, fontWeight:700, letterSpacing:2, textTransform:"uppercase", marginBottom:16 }}>Professional Details</div>
              <div style={{ marginBottom:14 }}>
                <label style={lbl}>Specialization</label>
                <select value={form.specialization} onChange={e=>fld("specialization",e.target.value)}
                  style={{...inp, borderColor:formErr.specialization?C.danger:C.border}}>
                  <option value="">Select your specialization...</option>
                  {SPECIALIZATIONS.map(s=><option key={s} value={s}>{s}</option>)}
                </select>
                {formErr.specialization&&<div style={{fontSize:11,color:C.danger,marginTop:4}}>{formErr.specialization}</div>}
              </div>
              <div>
                <label style={lbl}>Bio — tell clients and FormIQ about your coaching approach</label>
                <textarea rows={4} value={form.bio} onChange={e=>fld("bio",e.target.value)}
                  placeholder="I specialize in building powerful, injury-free squatters. My approach combines biomechanics analysis with progressive overload..."
                  style={{...inp, resize:"vertical", borderColor:formErr.bio?C.danger:C.border}}/>
                {formErr.bio
                  ? <div style={{fontSize:11,color:C.danger,marginTop:4}}>{formErr.bio}</div>
                  : <div style={{fontSize:11,color:C.muted,marginTop:4}}>{form.bio.length}/30 min chars</div>}
              </div>
            </div>

            <div style={{ background:`${C.accent}10`, border:`1px solid ${C.accent}30`, borderRadius:10, padding:"12px 16px", marginBottom:20 }}>
              <div style={{ fontSize:12, color:C.accent, fontWeight:700, marginBottom:4 }}>What happens after you submit?</div>
              <div style={{ fontSize:12, color:C.mutedL, lineHeight:1.7 }}>
                ① Your application is reviewed (usually within 24hrs) · ② You'll set up your client plans and pricing · ③ You choose a payment method and go live
              </div>
            </div>

            <button onClick={submitReg} style={{ width:"100%", padding:"15px", background:C.accent, color:"#000", border:"none", borderRadius:10, fontWeight:800, fontSize:15, cursor:"pointer", letterSpacing:1.5, textTransform:"uppercase", fontFamily:font }}>
              Submit Application →
            </button>
          </div>
        )}

        {/* ── STEP 1: Review screen ── */}
        {step===1&&(
          <div className="fu" style={{ textAlign:"center", padding:"40px 0" }}>
            <div style={{ fontSize:52, marginBottom:20 }}>📋</div>
            <div style={{ fontSize:22, fontWeight:800, color:C.text, marginBottom:12 }}>Application Submitted!</div>
            <div style={{ fontSize:14, color:C.muted, lineHeight:1.7, maxWidth:400, margin:"0 auto 32px" }}>
              We've received your application, <strong style={{color:C.text}}>{form.name}</strong>. In production, our team reviews this within 24 hours. For this demo, tap below to simulate instant approval.
            </div>
            {approvalStatus==="checking"
              ? <div style={{ color:C.accent, fontSize:14 }}><span className="spin">⟳</span> Checking status...</div>
              : (
                <button onClick={simulateApproval} style={{ padding:"14px 32px", background:C.accent, color:"#000", border:"none", borderRadius:10, fontWeight:700, fontSize:14, cursor:"pointer", fontFamily:font }}>
                  ⚡ Simulate Approval (Demo)
                </button>
              )
            }
          </div>
        )}

        {/* ── STEP 2: Plan setup ── */}
        {step===2&&(
          <div className="fu">
            <div style={{ textAlign:"center", marginBottom:28 }}>
              <div style={{ display:"inline-block", background:`${C.accent}15`, border:`1px solid ${C.accent}30`, color:C.accent, fontSize:11, fontWeight:700, letterSpacing:2, padding:"4px 14px", borderRadius:20, marginBottom:12 }}>✓ APPROVED</div>
              <div style={{ fontSize:22, fontWeight:800, color:C.text, marginBottom:8 }}>Set Up Your Client Plans</div>
              <div style={{ fontSize:13, color:C.muted }}>Define what each tier offers and set your own prices. You can change these anytime.</div>
            </div>

            {["starter","pro","elite"].map((key,idx)=>{
              const p = plans[key];
              const colors = [C.mutedL, C.blue, C.gold];
              const col = colors[idx];
              return (
                <div key={key} style={{ ...card(), marginBottom:14, borderColor:`${col}30` }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
                    <div style={{ width:10, height:10, borderRadius:"50%", background:col }}/>
                    <div style={{ fontSize:14, fontWeight:700, color:col, textTransform:"capitalize" }}>{key} Tier</div>
                    {planErrors[key]&&<div style={{fontSize:11,color:C.danger,marginLeft:"auto"}}>{planErrors[key]}</div>}
                  </div>

                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12, marginBottom:12 }}>
                    <div>
                      <label style={lbl}>Plan Name</label>
                      <input value={p.name} onChange={e=>setPlans(ps=>({...ps,[key]:{...ps[key],name:e.target.value}}))}
                        style={{...inp, borderColor:planErrors[`${key}_name`]?C.danger:C.border}}/>
                    </div>
                    <div>
                      <label style={lbl}>Monthly Price (USD)</label>
                      <input type="number" min="1" value={p.priceUSD}
                        onChange={e=>setPlans(ps=>({...ps,[key]:{...ps[key],priceUSD:Number(e.target.value)}}))}
                        style={{...inp, borderColor:planErrors[key]?C.danger:C.border}}/>
                    </div>
                    <div>
                      <label style={lbl}>Max Clients</label>
                      <input type="number" min="1" value={p.maxClients===999?"∞":p.maxClients}
                        onChange={e=>{const v=e.target.value;setPlans(ps=>({...ps,[key]:{...ps[key],maxClients:v==="∞"?999:Number(v)}}))} }
                        style={inp}/>
                    </div>
                  </div>
                  <div>
                    <label style={lbl}>Description (shown to clients)</label>
                    <input value={p.description} onChange={e=>setPlans(ps=>({...ps,[key]:{...ps[key],description:e.target.value}}))}
                      style={inp} placeholder="Who is this plan for?"/>
                  </div>
                </div>
              );
            })}

            <button onClick={savePlansAndNext} style={{ width:"100%", padding:"15px", background:C.accent, color:"#000", border:"none", borderRadius:10, fontWeight:800, fontSize:15, cursor:"pointer", letterSpacing:1.5, textTransform:"uppercase", fontFamily:font, marginTop:8 }}>
              Save Plans & Continue →
            </button>
          </div>
        )}

        {/* ── STEP 3: Currency + pay ── */}
        {step===3&&(
          <div className="fu">
            <div style={{ textAlign:"center", marginBottom:28 }}>
              <div style={{ fontSize:22, fontWeight:800, color:C.text, marginBottom:8 }}>Choose Currency & Pay</div>
              <div style={{ fontSize:13, color:C.muted }}>Your base currency determines your payment gateway and client billing.</div>
            </div>

            {/* Currency grid */}
            <div style={{ ...card(), marginBottom:14 }}>
              <div style={{ fontSize:11, color:C.muted, letterSpacing:2, textTransform:"uppercase", marginBottom:14 }}>Base Currency</div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8, marginBottom:16 }}>
                {Object.entries(CURRENCIES).map(([code,{flag,gateway}])=>(
                  <div key={code} onClick={()=>setCurrency(code)} style={{
                    padding:"8px", borderRadius:8, cursor:"pointer", textAlign:"center",
                    background:currency===code?`${C.accent}15`:C.s2,
                    border:`1px solid ${currency===code?C.accent:C.border}`,
                    transition:"all .15s",
                  }}>
                    <div style={{ fontSize:20 }}>{flag}</div>
                    <div style={{ fontSize:11, fontWeight:700, color:currency===code?C.accent:C.text, marginTop:2 }}>{code}</div>
                    <div style={{ fontSize:9, color:gateway==="paystack"?"#00C3FF":"#635BFF", fontWeight:700 }}>{gateway==="paystack"?"Paystack":"Stripe"}</div>
                  </div>
                ))}
              </div>

              {/* Platform subscription summary */}
              <div style={{ background:C.s2, borderRadius:8, padding:"14px", marginBottom:14 }}>
                <div style={{ fontSize:11, color:C.muted, marginBottom:8 }}>FormIQ Platform Subscription</div>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div>
                    <div style={{ fontSize:14, fontWeight:700, color:C.text }}>Starter Plan — Trainer Access</div>
                    <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>Up to {plans.starter.maxClients} clients · Upgrade anytime in settings</div>
                  </div>
                  <div style={{ fontSize:22, fontWeight:900, color:C.accent }}>{localPrice(plans.starter.priceUSD)}<span style={{ fontSize:11, color:C.muted }}>/mo</span></div>
                </div>
              </div>

              <div style={{ marginBottom:14 }}>
                <label style={lbl}>Email for receipt</label>
                <input type="email" value={payEmail} onChange={e=>setPayEmail(e.target.value)}
                  placeholder={form.email||"you@email.com"} style={inp}/>
              </div>

              {/* Gateway badge */}
              <div style={{ background:curr.gateway==="paystack"?"#00C3FF12":"#635BFF12", border:`1px solid ${curr.gateway==="paystack"?"#00C3FF30":"#635BFF30"}`, borderRadius:8, padding:"10px 14px", marginBottom:16, display:"flex", alignItems:"center", gap:10 }}>
                <span style={{ fontSize:22 }}>{curr.gateway==="paystack"?"🌍":"💳"}</span>
                <div>
                  <div style={{ fontSize:12, fontWeight:700, color:curr.gateway==="paystack"?"#00C3FF":"#8B83FF" }}>
                    {curr.gateway==="paystack"?"Paystack — Secure African Payments":"Stripe — Global Secure Payments"}
                  </div>
                  <div style={{ fontSize:11, color:C.muted }}>Charging in {currency} · {curr.flag} · SSL encrypted</div>
                </div>
              </div>

              <button onClick={handlePay} disabled={!payEmail.includes("@")||paying||payDone} style={{
                width:"100%", padding:"14px", fontWeight:800, fontSize:15,
                background: payDone ? `${C.accent}30` : (!payEmail.includes("@")||paying) ? C.s3 : C.accent,
                color: payDone ? C.accent : (!payEmail.includes("@")||paying) ? C.muted : "#000",
                border: payDone ? `1px solid ${C.accent}` : "none",
                borderRadius:10, cursor:(!payEmail.includes("@")||paying||payDone)?"default":"pointer",
                fontFamily:font, letterSpacing:1.5, textTransform:"uppercase", transition:"all .2s",
              }}>
                {payDone ? "✓ Payment Successful!" : paying ? "Processing..." : `Pay with ${curr.gateway==="paystack"?"Paystack":"Stripe"} ${localPrice(plans.starter.priceUSD)}/mo`}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 4: Welcome ── */}
        {step===4&&(
          <div className="fu" style={{ textAlign:"center", padding:"40px 0" }}>
            <div style={{ fontSize:64, marginBottom:20 }}>🏋️</div>
            <div style={{ fontSize:26, fontWeight:900, color:C.accent, marginBottom:12 }}>You're live, {form.name.split(" ")[0]}!</div>
            <div style={{ fontSize:14, color:C.muted, lineHeight:1.8, maxWidth:420, margin:"0 auto 32px" }}>
              Your FormIQ trainer account is active. Go to your dashboard to add your first client, customise your profile, and send your first invite link.
            </div>
            {[
              "Add your first client from the Roster tab",
              "Send them an invite link — they get your co-branded squat coach",
              "Review their sessions from your dashboard",
              "Leave coaching notes after each session",
            ].map((t,i)=>(
              <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 0", borderBottom:`1px solid ${C.border}`, maxWidth:380, margin:"0 auto", textAlign:"left" }}>
                <div style={{ width:22, height:22, borderRadius:"50%", background:`${C.accent}20`, border:`1px solid ${C.accent}40`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, color:C.accent, flexShrink:0 }}>{i+1}</div>
                <div style={{ fontSize:13, color:C.mutedL }}>{t}</div>
              </div>
            ))}
            <button onClick={onDone} style={{ marginTop:32, padding:"16px 40px", background:C.accent, color:"#000", border:"none", borderRadius:10, fontWeight:800, fontSize:15, cursor:"pointer", letterSpacing:1.5, textTransform:"uppercase", fontFamily:font }}>
              Open My Dashboard →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
