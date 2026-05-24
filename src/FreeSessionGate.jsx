import { useState } from "react";
import { FREE_LIMITS, getSessionUsage, isSessionAllowed, sessionsRemaining, markPaid } from "./db";

const font = "system-ui,-apple-system,'Segoe UI',sans-serif";
const C = { bg:"#080808", surface:"#111", s2:"#1A1A1A", border:"#272727", accent:"#00E676", warn:"#FFB300", danger:"#FF3D3D", text:"#F0F0F0", muted:"#666" };

const CURRENCIES = {
  USD:{symbol:"$",flag:"🇺🇸",gateway:"stripe"},   GBP:{symbol:"£",flag:"🇬🇧",gateway:"stripe"},
  EUR:{symbol:"€",flag:"🇪🇺",gateway:"stripe"},   NGN:{symbol:"₦",flag:"🇳🇬",gateway:"paystack"},
  GHS:{symbol:"₵",flag:"🇬🇭",gateway:"paystack"}, KES:{symbol:"KSh",flag:"🇰🇪",gateway:"paystack"},
  ZAR:{symbol:"R",flag:"🇿🇦",gateway:"paystack"},  CAD:{symbol:"CA$",flag:"🇨🇦",gateway:"stripe"},
  AUD:{symbol:"A$",flag:"🇦🇺",gateway:"stripe"},
};
const FX = { USD:1,GBP:.79,EUR:.92,CAD:1.36,AUD:1.53,NGN:1580,GHS:12.5,KES:128,ZAR:18.4 };

const PLANS = [
  { id:"basic",    label:"Basic",    usd:9,  sessions:"500 sessions",  desc:"Great for regular solo training", color:C.accent  },
  { id:"standard", label:"Standard", usd:19, sessions:"Unlimited",     desc:"Most popular — serious athletes", color:"#3D8EF0" },
  { id:"annual",   label:"Annual",   usd:99, sessions:"Unlimited",     desc:"Best value — save 57%",           color:"#F5A623" },
];

// ── Session counter badge ─────────────────────────────────────
export function SessionBadge({ camMode }) {
  const usage = getSessionUsage();
  if (usage.paid) return null;
  const rem = sessionsRemaining(camMode);
  const limit = FREE_LIMITS[camMode];
  const pct = ((limit-rem)/limit)*100;
  const col = rem > limit*0.3 ? C.accent : rem > 0 ? C.warn : C.danger;

  return (
    <div style={{ display:"flex", alignItems:"center", gap:8, padding:"5px 12px",
      background:C.s2, border:`1px solid ${col}40`, borderRadius:8 }}>
      <div style={{ width:32, height:32, position:"relative", flexShrink:0 }}>
        <svg width="32" height="32" style={{ transform:"rotate(-90deg)" }}>
          <circle cx="16" cy="16" r="12" fill="none" stroke="#1E1E1E" strokeWidth="3"/>
          <circle cx="16" cy="16" r="12" fill="none" stroke={col} strokeWidth="3"
            strokeDasharray={`${(pct/100)*75.4} 75.4`} strokeLinecap="round"/>
        </svg>
        <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:8, fontWeight:800, color:col }}>
          {rem}
        </div>
      </div>
      <div>
        <div style={{ fontSize:11, fontWeight:700, color:col }}>
          {rem===0?"No sessions left":`${rem} free session${rem!==1?"s":""} left`}
        </div>
        <div style={{ fontSize:9, color:C.muted }}>
          {camMode==="single"?"Single Camera":"Quad 4K"} · {FREE_LIMITS[camMode]} total free
        </div>
      </div>
    </div>
  );
}

// ── Paywall modal ─────────────────────────────────────────────
export function PaywallModal({ camMode, onPaid, onClose }) {
  const [step, setStep]     = useState("plans");  // plans|pay|done
  const [selPlan, setSelPlan] = useState("standard");
  const [currency, setCurrency] = useState("NGN");
  const [email, setEmail]   = useState("");
  const [paying, setPaying] = useState(false);
  const curr = CURRENCIES[currency]||CURRENCIES.USD;
  const plan = PLANS.find(p=>p.id===selPlan)||PLANS[1];

  const localPrice = (usd) => `${curr.symbol}${Math.round(usd*(FX[currency]||1)).toLocaleString()}`;

  const handlePay = () => {
    if (!email.includes("@")) return;
    setPaying(true);
    setTimeout(()=>{
      markPaid(selPlan);
      setPaying(false);
      setStep("done");
      setTimeout(()=>{ onPaid(); }, 1500);
    }, 2000);
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"#000000EE", zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center", padding:20, fontFamily:font }}>
      <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, width:"100%", maxWidth:480, maxHeight:"90vh", overflowY:"auto" }}>

        {/* Header */}
        <div style={{ padding:"18px 20px", borderBottom:`1px solid ${C.border}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <div style={{ fontSize:15, fontWeight:700, color:C.text }}>
              {camMode==="single"?"Your 100 free sessions are up 🎉":"Your 5 Quad 4K test sessions are up"}
            </div>
            <div style={{ fontSize:12, color:C.muted, marginTop:2 }}>Continue training with a FormIQ plan</div>
          </div>
          {onClose&&<button onClick={onClose} style={{ background:"transparent", border:"none", color:C.muted, cursor:"pointer", fontSize:20 }}>✕</button>}
        </div>

        <div style={{ padding:"20px" }}>
          {step==="plans"&&(
            <>
              {/* What they get summary */}
              <div style={{ background:`${C.accent}10`, border:`1px solid ${C.accent}20`, borderRadius:8, padding:"10px 14px", marginBottom:18 }}>
                <div style={{ fontSize:12, color:C.accent, fontWeight:700, marginBottom:4 }}>
                  {camMode==="single"
                    ? "You've done 100 free sessions — great consistency!"
                    : "You've tried the Quad 4K system — ready to commit?"}
                </div>
                <div style={{ fontSize:12, color:"#888", lineHeight:1.6 }}>
                  Unlock unlimited sessions, full session history, shareable reports, and AI coaching that gets sharper over time.
                </div>
              </div>

              {/* Plans */}
              {PLANS.map(p=>(
                <div key={p.id} onClick={()=>setSelPlan(p.id)} style={{
                  marginBottom:10, padding:"14px", borderRadius:10, cursor:"pointer",
                  background:selPlan===p.id?`${p.color}15`:C.s2,
                  border:`1px solid ${selPlan===p.id?p.color:C.border}`,
                  transition:"all .15s", display:"flex", alignItems:"center", gap:14,
                }}>
                  <div style={{ flex:1 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:3 }}>
                      <span style={{ fontSize:13, fontWeight:700, color:selPlan===p.id?p.color:C.text }}>{p.label}</span>
                      {p.id==="standard"&&<span style={{ fontSize:9, background:`${p.color}20`, color:p.color, padding:"1px 7px", borderRadius:3, fontWeight:700 }}>POPULAR</span>}
                    </div>
                    <div style={{ fontSize:11, color:C.muted }}>{p.desc}</div>
                    <div style={{ fontSize:11, color:p.color, marginTop:3, fontWeight:600 }}>{p.sessions}</div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontSize:20, fontWeight:900, color:selPlan===p.id?p.color:C.text }}>${p.usd}</div>
                    <div style={{ fontSize:10, color:C.muted }}>{p.id==="annual"?"/year":"/mo"}</div>
                  </div>
                </div>
              ))}

              <button onClick={()=>setStep("pay")} style={{ width:"100%", padding:"14px", background:C.accent, color:"#000", border:"none", borderRadius:10, fontWeight:800, fontSize:14, cursor:"pointer", letterSpacing:1.5, textTransform:"uppercase", fontFamily:font, marginTop:8 }}>
                Continue →
              </button>
              <div style={{ textAlign:"center", marginTop:10, fontSize:11, color:"#333" }}>
                No hidden fees · Cancel anytime · Instant activation
              </div>
            </>
          )}

          {step==="pay"&&(
            <>
              {/* Currency */}
              <div style={{ marginBottom:14 }}>
                <div style={{ fontSize:10, color:C.muted, letterSpacing:2, textTransform:"uppercase", marginBottom:8 }}>Your Currency</div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:6 }}>
                  {Object.entries(CURRENCIES).map(([code,{flag,gateway}])=>(
                    <div key={code} onClick={()=>setCurrency(code)} style={{
                      padding:"7px 4px", borderRadius:7, cursor:"pointer", textAlign:"center",
                      background:currency===code?`${C.accent}15`:C.s2,
                      border:`1px solid ${currency===code?C.accent:C.border}`,
                    }}>
                      <div style={{ fontSize:16 }}>{flag}</div>
                      <div style={{ fontSize:10, fontWeight:700, color:currency===code?C.accent:C.text }}>{code}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Order summary */}
              <div style={{ background:C.s2, borderRadius:8, padding:"12px 14px", marginBottom:14 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                  <span style={{ fontSize:13, color:C.text }}>{plan.label} Plan</span>
                  <span style={{ fontSize:16, fontWeight:800, color:C.accent }}>{localPrice(plan.usd)}</span>
                </div>
                <div style={{ fontSize:11, color:C.muted }}>{plan.sessions} · Billed {plan.id==="annual"?"annually":"monthly"}</div>
                <div style={{ marginTop:8, fontSize:11, color:curr.gateway==="paystack"?"#00C3FF":"#8B83FF", fontWeight:600 }}>
                  {curr.gateway==="paystack"?"🌍 Paystack — African Payments":"💳 Stripe — Global Payments"}
                </div>
              </div>

              <div style={{ marginBottom:14 }}>
                <div style={{ fontSize:10, color:C.muted, letterSpacing:2, textTransform:"uppercase", marginBottom:6 }}>Email</div>
                <input type="email" value={email} onChange={e=>setEmail(e.target.value)}
                  placeholder="your@email.com"
                  style={{ width:"100%", padding:"11px 14px", background:C.s2, border:`1px solid ${C.border}`, borderRadius:8, color:C.text, fontSize:14, fontFamily:font, boxSizing:"border-box" }}/>
              </div>

              <div style={{ display:"flex", gap:10 }}>
                <button onClick={()=>setStep("plans")} style={{ flex:1, padding:"13px", background:C.s2, color:C.text, border:`1px solid ${C.border}`, borderRadius:9, cursor:"pointer", fontWeight:600, fontSize:13, fontFamily:font }}>← Back</button>
                <button onClick={handlePay} disabled={!email.includes("@")||paying} style={{
                  flex:2, padding:"13px", background:email.includes("@")&&!paying?C.accent:C.s2,
                  color:email.includes("@")&&!paying?"#000":C.muted,
                  border:"none", borderRadius:9, cursor:!email.includes("@")||paying?"default":"pointer",
                  fontWeight:800, fontSize:14, fontFamily:font, letterSpacing:1,
                }}>
                  {paying?"Processing...":"Pay & Unlock →"}
                </button>
              </div>
            </>
          )}

          {step==="done"&&(
            <div style={{ textAlign:"center", padding:"24px 0" }}>
              <div style={{ fontSize:48, marginBottom:12 }}>✅</div>
              <div style={{ fontSize:18, fontWeight:800, color:C.accent, marginBottom:8 }}>Unlocked!</div>
              <div style={{ fontSize:13, color:C.muted }}>Resuming your session now...</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
