import { useState, useEffect } from "react";

const AFRICAN_CURRENCIES = ["NGN","GHS","KES","ZAR","UGX","TZS","XOF","ETB","EGP","MAD","ZMW","RWF"];

// ── Currency config ───────────────────────────────────────────────────────
export const CURRENCIES = {
  USD:{ symbol:"$",  name:"US Dollar",        flag:"🇺🇸", gateway:"stripe"   },
  GBP:{ symbol:"£",  name:"British Pound",     flag:"🇬🇧", gateway:"stripe"   },
  EUR:{ symbol:"€",  name:"Euro",              flag:"🇪🇺", gateway:"stripe"   },
  CAD:{ symbol:"CA$",name:"Canadian Dollar",   flag:"🇨🇦", gateway:"stripe"   },
  AUD:{ symbol:"A$", name:"Australian Dollar", flag:"🇦🇺", gateway:"stripe"   },
  NGN:{ symbol:"₦",  name:"Nigerian Naira",    flag:"🇳🇬", gateway:"paystack" },
  GHS:{ symbol:"₵",  name:"Ghanaian Cedi",     flag:"🇬🇭", gateway:"paystack" },
  KES:{ symbol:"KSh",name:"Kenyan Shilling",   flag:"🇰🇪", gateway:"paystack" },
  ZAR:{ symbol:"R",  name:"South African Rand",flag:"🇿🇦", gateway:"paystack" },
  UGX:{ symbol:"USh",name:"Ugandan Shilling",  flag:"🇺🇬", gateway:"paystack" },
  TZS:{ symbol:"TSh",name:"Tanzanian Shilling",flag:"🇹🇿", gateway:"paystack" },
  EGP:{ symbol:"E£", name:"Egyptian Pound",    flag:"🇪🇬", gateway:"paystack" },
};

// ── Plan pricing (multiply by local rate in production) ───────────────────
export const PLANS = {
  starter:{ name:"Starter", clients:10, usd:29,  features:["10 clients","Session sync","Basic analytics","Invite links"] },
  pro:    { name:"Pro",     clients:25, usd:49,  features:["25 clients","Session sync","Full analytics","Custom branding","Trainer notes","Weekly targets"] },
  elite:  { name:"Elite",  clients:999,usd:79,  features:["Unlimited clients","Everything in Pro","Priority support","White-label app","Revenue analytics","API access"] },
};

// Approximate FX multipliers (in production: fetch live rates)
const FX = { USD:1, GBP:0.79, EUR:0.92, CAD:1.36, AUD:1.53, NGN:1580, GHS:12.5, KES:128, ZAR:18.4, UGX:3740, TZS:2640, EGP:48.7 };
export const formatPrice = (usd, currency) => {
  const rate = FX[currency]||1;
  const sym  = CURRENCIES[currency]?.symbol||"$";
  const amount = Math.round(usd * rate);
  return `${sym}${amount.toLocaleString()}`;
};

// ── Invite token helpers ──────────────────────────────────────────────────
export const makeInviteToken = (trainerSlug, clientId) =>
  btoa(`${trainerSlug}::${clientId}::${Date.now()}`).replace(/=/g,"");

export const parseInviteHash = (hash) => {
  // expects #/c/TRAINERSLUG/TOKEN
  const m = hash.match(/#\/c\/([^/]+)\/([^/]+)/);
  if (!m) return null;
  return { trainerSlug: m[1], token: m[2] };
};

// ── Trainer profile store (localStorage) ─────────────────────────────────
export const getTrainerProfile = (slug) => {
  try { return JSON.parse(localStorage.getItem(`fiq_trainer_${slug}`)||"null"); } catch { return null; }
};
export const saveTrainerProfile = (slug, profile) => {
  try { localStorage.setItem(`fiq_trainer_${slug}`, JSON.stringify(profile)); } catch {}
};
export const getClientContext = () => {
  try { return JSON.parse(sessionStorage.getItem("fiq_client_ctx")||"null"); } catch { return null; }
};
export const saveClientContext = (ctx) => {
  try { sessionStorage.setItem("fiq_client_ctx", JSON.stringify(ctx)); } catch {}
};

// ═══════════════════════════════════════════════════════════════
// CLIENT INVITE LANDING — shown when client opens invite link
// ═══════════════════════════════════════════════════════════════
export function ClientInviteLanding({ trainerSlug, token, onAccept }) {
  const [name, setName]     = useState("");
  const [step, setStep]     = useState("welcome"); // welcome | name
  const [trainer, setTrainer] = useState(null);

  useEffect(()=>{
    // Load trainer profile
    const p = getTrainerProfile(trainerSlug);
    if (p) { setTrainer(p); }
    else {
      // Fallback demo profile
      setTrainer({
        name:    "Coach Adams",
        slug:    "adams",
        photo:   `${process.env.PUBLIC_URL}/photoadams.jpg`,
        tagline: "Strength & Conditioning Coach",
        welcome: "Hey! I've invited you to track your squats with FormIQ. After each session I'll review your form and leave you coaching notes. Let's get those numbers up! 💪",
        accent:  "#00E676",
      });
    }
  },[trainerSlug]);

  const handleAccept = () => {
    if (!name.trim()) return;
    const ctx = { trainerSlug, trainerName: trainer?.name, clientName: name.trim(), token, joinedAt: Date.now() };
    saveClientContext(ctx);
    onAccept(ctx);
  };

  const font = "system-ui,-apple-system,'Segoe UI',sans-serif";
  const accent = trainer?.accent||"#00E676";

  if (!trainer) return (
    <div style={{background:"#080808",minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{color:"#555",fontFamily:font}}>Loading...</div>
    </div>
  );

  return (
    <div style={{background:"#080808",minHeight:"100vh",fontFamily:font,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"28px 20px"}}>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        .fu1{animation:fadeUp .4s .05s ease both}
        .fu2{animation:fadeUp .4s .15s ease both}
        .fu3{animation:fadeUp .4s .25s ease both}
        .fu4{animation:fadeUp .4s .35s ease both}
        input:focus{outline:none}
      `}</style>

      <div style={{maxWidth:420,width:"100%"}}>

        {/* FormIQ logo */}
        <div className="fu1" style={{textAlign:"center",marginBottom:32}}>
          <img src={`${process.env.PUBLIC_URL}/formIQ.png`} alt="FormIQ"
            style={{height:48,width:"auto",objectFit:"contain",display:"block",margin:"0 auto 8px"}}/>
          <div style={{fontSize:10,color:"#444",letterSpacing:3,textTransform:"uppercase"}}>AI Squat Coach</div>
        </div>

        {step === "welcome" && (
          <>
            {/* Trainer card */}
            <div className="fu2" style={{
              background:"#0E0E0E",border:`1px solid ${accent}30`,
              borderRadius:16,padding:"24px",marginBottom:20,
              textAlign:"center",
            }}>
              {/* Trainer photo */}
              <div style={{position:"relative",display:"inline-block",marginBottom:16}}>
                <img src={trainer.photo} alt={trainer.name}
                  onError={e=>{e.target.style.display="none";}}
                  style={{width:88,height:88,borderRadius:"50%",objectFit:"cover",objectPosition:"center top",border:`3px solid ${accent}`,display:"block"}}/>
                <div style={{
                  position:"absolute",bottom:2,right:2,
                  width:20,height:20,borderRadius:"50%",
                  background:accent,border:"2px solid #080808",
                  display:"flex",alignItems:"center",justifyContent:"center",
                  fontSize:10,
                }}>✓</div>
              </div>
              <div style={{fontSize:20,fontWeight:800,color:"#F0F0F0",marginBottom:4}}>{trainer.name}</div>
              <div style={{fontSize:13,color:"#777",marginBottom:16}}>{trainer.tagline}</div>
              <div style={{
                background:"#151515",borderRadius:10,padding:"14px 16px",
                fontSize:13,color:"#CCCCCC",lineHeight:1.7,textAlign:"left",
                borderLeft:`3px solid ${accent}`,
              }}>
                "{trainer.welcome}"
              </div>
            </div>

            {/* Invite badge */}
            <div className="fu3" style={{
              background:`${accent}12`,border:`1px solid ${accent}30`,
              borderRadius:10,padding:"12px 16px",marginBottom:20,
              display:"flex",alignItems:"center",gap:12,
            }}>
              <div style={{fontSize:24}}>🏋️</div>
              <div>
                <div style={{fontSize:13,fontWeight:700,color:"#F0F0F0"}}>Personal Training Invite</div>
                <div style={{fontSize:12,color:"#888",marginTop:2}}>
                  Track your squat form with AI · {trainer.name} reviews every session
                </div>
              </div>
            </div>

            <div className="fu4">
              <button onClick={()=>setStep("name")} style={{
                width:"100%",padding:"16px",
                background:accent,color:"#000",border:"none",
                borderRadius:10,fontWeight:800,fontSize:15,
                cursor:"pointer",letterSpacing:1.5,textTransform:"uppercase",
                fontFamily:font,
              }}>
                Accept Invite →
              </button>
              <div style={{fontSize:11,color:"#333",textAlign:"center",marginTop:10}}>
                Free for you · Your trainer manages your account
              </div>
            </div>
          </>
        )}

        {step === "name" && (
          <>
            <div className="fu1" style={{
              background:"#0E0E0E",border:"1px solid #222",
              borderRadius:16,padding:"24px",marginBottom:20,textAlign:"center",
            }}>
              <div style={{fontSize:28,marginBottom:12}}>👋</div>
              <div style={{fontSize:18,fontWeight:700,color:"#F0F0F0",marginBottom:6}}>
                What's your name?
              </div>
              <div style={{fontSize:13,color:"#777",marginBottom:20,lineHeight:1.6}}>
                {trainer.name} will see this on your session reports.
              </div>
              <input
                autoFocus
                value={name}
                onChange={e=>setName(e.target.value)}
                onKeyDown={e=>e.key==="Enter"&&name.trim()&&handleAccept()}
                placeholder="Your first name or nickname..."
                maxLength={28}
                style={{
                  width:"100%",padding:"14px 16px",
                  background:"#1A1A1A",border:"1px solid #333",
                  borderRadius:8,color:"#F0F0F0",fontSize:15,
                  boxSizing:"border-box",marginBottom:14,fontFamily:font,
                  borderColor:name?"#00E67650":"#333",transition:"border-color .2s",
                }}/>
              <button
                onClick={handleAccept}
                disabled={!name.trim()}
                style={{
                  width:"100%",padding:"14px",
                  background:name.trim()?accent:"#1A1A1A",
                  color:name.trim()?"#000":"#444",
                  border:"none",borderRadius:8,fontWeight:800,
                  fontSize:14,cursor:name.trim()?"pointer":"default",
                  letterSpacing:1.5,textTransform:"uppercase",fontFamily:font,
                  transition:"all .2s",
                }}>
                Start Training →
              </button>
            </div>
            <button onClick={()=>setStep("welcome")} style={{
              width:"100%",padding:"10px",background:"transparent",
              color:"#444",border:"none",cursor:"pointer",fontSize:12,fontFamily:font,
            }}>← Back</button>
          </>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// CO-BRANDED HEADER — shown inside squat app when client is invited
// ═══════════════════════════════════════════════════════════════
export function CoachBrandedBanner({ ctx, fullHeader }) {
  const [trainer, setTrainer] = useState(null);
  useEffect(()=>{
    if (ctx?.trainerSlug) {
      const p = getTrainerProfile(ctx.trainerSlug);
      setTrainer(p || {
        name:    ctx.trainerName||"Your Coach",
        photo:   `${process.env.PUBLIC_URL}/photoadams.jpg`,
        accent:  "#00E676",
        tagline: "Personal Strength Coach",
      });
    }
  },[ctx]);

  if (!trainer||!ctx) return null;
  const accent = trainer.accent||"#00E676";

  // ── Full header variant (setup screen) ───────────────────────
  if (fullHeader) return (
    <div style={{
      background:"#080808", borderRadius:14,
      border:`1px solid ${accent}30`, overflow:"hidden",
    }}>
      {/* Top: powered by strip */}
      <div style={{
        background:`${accent}10`, borderBottom:`1px solid ${accent}20`,
        padding:"6px 16px", display:"flex", alignItems:"center",
        justifyContent:"space-between",
      }}>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          <img src={`${process.env.PUBLIC_URL}/formIQ.png`} alt="FormIQ"
            style={{height:16,width:"auto",objectFit:"contain",opacity:.7}}/>
          <span style={{fontSize:9,color:"#555",letterSpacing:2,textTransform:"uppercase"}}>
            Powered by FormIQ
          </span>
        </div>
        <span style={{fontSize:9,color:accent,letterSpacing:1.5,textTransform:"uppercase",fontWeight:700}}>
          AI Squat Coach
        </span>
      </div>

      {/* Main coach card */}
      <div style={{padding:"20px",textAlign:"center"}}>
        {/* Photo */}
        <div style={{position:"relative",display:"inline-block",marginBottom:12}}>
          <img src={trainer.photo} alt={trainer.name}
            onError={e=>{e.target.style.display="none";}}
            style={{
              width:80, height:80, borderRadius:"50%",
              objectFit:"cover", objectPosition:"center top",
              border:`3px solid ${accent}`, display:"block",
            }}/>
          <div style={{
            position:"absolute", bottom:2, right:2,
            width:18, height:18, borderRadius:"50%",
            background:accent, border:"2px solid #080808",
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:9,
          }}>✓</div>
        </div>
        <div style={{fontSize:11,color:"#666",letterSpacing:2,textTransform:"uppercase",marginBottom:4}}>
          Your Coach
        </div>
        <div style={{fontSize:20,fontWeight:800,color:"#F0F0F0",marginBottom:3}}>{trainer.name}</div>
        <div style={{fontSize:12,color:"#777",marginBottom:14}}>{trainer.tagline}</div>

        {/* Client name badge */}
        <div style={{
          display:"inline-flex", alignItems:"center", gap:6,
          background:`${accent}15`, border:`1px solid ${accent}30`,
          borderRadius:20, padding:"5px 14px", marginBottom:14,
        }}>
          <div style={{width:6,height:6,borderRadius:"50%",background:accent}}/>
          <span style={{fontSize:12,color:accent,fontWeight:700}}>{ctx.clientName}</span>
          <span style={{fontSize:11,color:"#555"}}>· sessions sync to your coach</span>
        </div>
      </div>
    </div>
  );

  // ── Slim banner variant (workout screen top bar) ──────────────
  return (
    <div style={{
      background:"#0A0A0A", borderBottom:"1px solid #1A1A1A",
      padding:"8px 16px", display:"flex", alignItems:"center",
      gap:10, justifyContent:"space-between",
    }}>
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        <img src={trainer.photo} alt={trainer.name}
          onError={e=>{e.target.style.display="none";}}
          style={{width:28,height:28,borderRadius:"50%",objectFit:"cover",objectPosition:"center top",border:`1.5px solid ${accent}`}}/>
        <div>
          <div style={{fontSize:9,color:"#555",letterSpacing:1.5,textTransform:"uppercase"}}>Coached by</div>
          <div style={{fontSize:12,fontWeight:700,color:accent,lineHeight:1}}>{trainer.name}</div>
        </div>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:6}}>
        <img src={`${process.env.PUBLIC_URL}/formIQ.png`} alt="FormIQ"
          style={{height:14,width:"auto",objectFit:"contain",opacity:.4}}/>
        <div style={{textAlign:"right"}}>
          <div style={{fontSize:11,color:"#F0F0F0",fontWeight:600}}>{ctx.clientName}</div>
          <div style={{fontSize:9,color:"#444"}}>Session syncing to coach</div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// PAYMENT MODAL — Stripe (global) + Paystack (Africa)
// ═══════════════════════════════════════════════════════════════
export function PaymentModal({ plan, currency, trainerEmail, onClose, onSuccess }) {
  const [step, setStep]       = useState("details"); // details | processing | done | error
  const [email, setEmail]     = useState(trainerEmail||"");
  const [errMsg, setErrMsg]   = useState("");
  const curr     = CURRENCIES[currency]||CURRENCIES.USD;
  const planData = PLANS[plan];
  const gateway  = curr.gateway;
  const price    = formatPrice(planData.usd, currency);
  const font     = "system-ui,-apple-system,sans-serif";

  const handleStripe = async () => {
    setStep("processing");
    try {
      // Load Stripe.js from CDN
      if (!window.Stripe) {
        await new Promise((res,rej)=>{
          const s=document.createElement("script");
          s.src="https://js.stripe.com/v3/";
          s.onload=res; s.onerror=rej;
          document.head.appendChild(s);
        });
      }
      // In production: call your backend to create a Checkout Session
      // const { sessionId } = await fetch("/api/create-checkout", {...}).then(r=>r.json());
      // const stripe = window.Stripe(process.env.REACT_APP_STRIPE_KEY);
      // await stripe.redirectToCheckout({ sessionId });

      // Demo: simulate success after 2s
      setTimeout(()=>{ setStep("done"); onSuccess?.({gateway:"stripe", plan, currency}); }, 2000);
    } catch(e) {
      setErrMsg("Stripe payment failed. Please try again.");
      setStep("error");
    }
  };

  const handlePaystack = async () => {
    setStep("processing");
    try {
      if (!window.PaystackPop) {
        await new Promise((res,rej)=>{
          const s=document.createElement("script");
          s.src="https://js.paystack.co/v1/inline.js";
          s.onload=res; s.onerror=rej;
          document.head.appendChild(s);
        });
      }
      // In production: use your Paystack public key
      // const handler = window.PaystackPop.setup({
      //   key: process.env.REACT_APP_PAYSTACK_KEY,
      //   email, amount: planData.usd * FX[currency] * 100,
      //   currency, ref: `FIQ_${Date.now()}`,
      //   onClose: ()=>setStep("details"),
      //   callback: (response)=>{ setStep("done"); onSuccess?.({gateway:"paystack",...}); }
      // });
      // handler.openIframe();

      // Demo: simulate
      setTimeout(()=>{ setStep("done"); onSuccess?.({gateway:"paystack", plan, currency}); }, 2000);
    } catch(e) {
      setErrMsg("Paystack payment failed. Please try again.");
      setStep("error");
    }
  };

  const handlePay = () => {
    if (!email.trim()) return;
    if (gateway==="paystack") handlePaystack();
    else handleStripe();
  };

  return (
    <div style={{position:"fixed",inset:0,background:"#000000E8",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{background:"#0E0E0E",border:"1px solid #222",borderRadius:16,width:"100%",maxWidth:420,fontFamily:font,overflow:"hidden"}}>
        {/* Header */}
        <div style={{background:"#111",borderBottom:"1px solid #1A1A1A",padding:"16px 20px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontSize:15,fontWeight:700,color:"#F0F0F0"}}>Upgrade to {planData.name}</div>
            <div style={{fontSize:12,color:"#666",marginTop:2}}>Billed monthly · Cancel anytime</div>
          </div>
          <button onClick={onClose} style={{background:"transparent",border:"none",color:"#555",cursor:"pointer",fontSize:20}}>✕</button>
        </div>

        <div style={{padding:"20px"}}>
          {step==="details"&&(
            <>
              {/* Plan summary */}
              <div style={{background:"#141414",borderRadius:10,padding:"14px",marginBottom:16,border:"1px solid #222"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                  <span style={{fontSize:14,fontWeight:700,color:"#F0F0F0"}}>{planData.name} Plan</span>
                  <span style={{fontSize:20,fontWeight:900,color:"#00E676"}}>{price}<span style={{fontSize:12,color:"#555"}}>/mo</span></span>
                </div>
                {planData.features.map(f=>(
                  <div key={f} style={{display:"flex",gap:7,marginBottom:5}}>
                    <span style={{color:"#00E676",fontSize:12}}>✓</span>
                    <span style={{fontSize:12,color:"#AAAAAA"}}>{f}</span>
                  </div>
                ))}
              </div>

              {/* Gateway badge */}
              <div style={{
                background: gateway==="paystack"?"#00C3FF18":"#635BFF18",
                border:`1px solid ${gateway==="paystack"?"#00C3FF40":"#635BFF40"}`,
                borderRadius:8,padding:"8px 12px",marginBottom:16,
                display:"flex",alignItems:"center",gap:8,
              }}>
                <span style={{fontSize:18}}>{gateway==="paystack"?"🌍":"💳"}</span>
                <div>
                  <div style={{fontSize:11,fontWeight:700,color:gateway==="paystack"?"#00C3FF":"#8B83FF"}}>
                    {gateway==="paystack"?"Paystack — Secure African Payments":"Stripe — Global Secure Payments"}
                  </div>
                  <div style={{fontSize:10,color:"#555"}}>
                    Charging in {CURRENCIES[currency]?.name} ({currency}) · {CURRENCIES[currency]?.flag}
                  </div>
                </div>
              </div>

              {/* Email */}
              <div style={{marginBottom:14}}>
                <div style={{fontSize:11,color:"#777",marginBottom:6,letterSpacing:1.5,textTransform:"uppercase"}}>Email for receipt</div>
                <input value={email} onChange={e=>setEmail(e.target.value)}
                  placeholder="you@example.com" type="email"
                  style={{width:"100%",padding:"12px 14px",background:"#1A1A1A",border:"1px solid #2A2A2A",borderRadius:8,color:"#F0F0F0",fontSize:14,boxSizing:"border-box",fontFamily:font}}/>
              </div>

              <button onClick={handlePay} disabled={!email.trim()} style={{
                width:"100%",padding:"14px",
                background:email.trim()?(gateway==="paystack"?"#00C3FF":"#635BFF"):"#1A1A1A",
                color:email.trim()?"#fff":"#444",
                border:"none",borderRadius:8,fontWeight:700,fontSize:14,
                cursor:email.trim()?"pointer":"default",letterSpacing:1,fontFamily:font,
                transition:"all .2s",
              }}>
                {gateway==="paystack"?`Pay with Paystack ${price}/mo`:`Pay with Stripe ${price}/mo`}
              </button>

              <div style={{fontSize:10,color:"#333",textAlign:"center",marginTop:10}}>
                🔒 Secured by {gateway==="paystack"?"Paystack":"Stripe"} · SSL encrypted · No card stored on FormIQ
              </div>
            </>
          )}

          {step==="processing"&&(
            <div style={{textAlign:"center",padding:"32px 0"}}>
              <div style={{fontSize:40,marginBottom:16}}>⏳</div>
              <div style={{fontSize:15,fontWeight:700,color:"#F0F0F0",marginBottom:8}}>Processing payment...</div>
              <div style={{fontSize:12,color:"#555"}}>Please wait — do not close this window</div>
            </div>
          )}

          {step==="done"&&(
            <div style={{textAlign:"center",padding:"32px 0"}}>
              <div style={{fontSize:48,marginBottom:16}}>✅</div>
              <div style={{fontSize:17,fontWeight:800,color:"#00E676",marginBottom:8}}>Payment Successful!</div>
              <div style={{fontSize:13,color:"#888",marginBottom:20}}>Welcome to FormIQ {planData.name}. Your dashboard is now upgraded.</div>
              <button onClick={onClose} style={{padding:"12px 28px",background:"#00E676",color:"#000",border:"none",borderRadius:8,fontWeight:700,cursor:"pointer",fontSize:14,fontFamily:font}}>
                Go to Dashboard →
              </button>
            </div>
          )}

          {step==="error"&&(
            <div style={{textAlign:"center",padding:"32px 0"}}>
              <div style={{fontSize:40,marginBottom:12}}>❌</div>
              <div style={{fontSize:13,color:"#FF4757",marginBottom:16}}>{errMsg}</div>
              <button onClick={()=>setStep("details")} style={{padding:"10px 20px",background:"#1A1A1A",color:"#F0F0F0",border:"1px solid #333",borderRadius:8,cursor:"pointer",fontSize:13,fontFamily:font}}>
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// INVITE MANAGER — used inside TrainerDashboard clients tab
// ═══════════════════════════════════════════════════════════════
export function InviteManager({ client, trainerSlug, baseUrl, onClose }) {
  const [copied, setCopied] = useState(false);
  const token  = makeInviteToken(trainerSlug, client.id);
  const link   = `${baseUrl}#/c/${trainerSlug}/${token}`;
  const font   = "system-ui,-apple-system,sans-serif";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(()=>setCopied(false), 2500);
    } catch { alert(link); }
  };

  const shareLink = async () => {
    try {
      await navigator.share({ title:`Join ${client.name} on FormIQ`, text:`Your personal FormIQ squat tracking link — click to accept your invite and start training.`, url:link });
    } catch { copy(); }
  };

  return (
    <div style={{position:"fixed",inset:0,background:"#000000E0",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{background:"#0E0E0E",border:"1px solid #222",borderRadius:16,width:"100%",maxWidth:420,fontFamily:font}}>
        <div style={{padding:"20px 20px 0",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{fontSize:15,fontWeight:700,color:"#F0F0F0"}}>Client Invite Link</div>
          <button onClick={onClose} style={{background:"transparent",border:"none",color:"#555",cursor:"pointer",fontSize:20}}>✕</button>
        </div>

        <div style={{padding:"20px"}}>
          {/* Client card */}
          <div style={{display:"flex",alignItems:"center",gap:12,background:"#141414",borderRadius:10,padding:"12px",marginBottom:16}}>
            <div style={{width:42,height:42,borderRadius:"50%",background:"#00E67622",border:"1px solid #00E67650",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,fontWeight:700,color:"#00E676"}}>
              {client.avatar}
            </div>
            <div>
              <div style={{fontSize:14,fontWeight:700,color:"#F0F0F0"}}>{client.name}</div>
              <div style={{fontSize:11,color:"#666"}}>{client.plan} plan · {client.goal}</div>
            </div>
          </div>

          {/* Link box */}
          <div style={{background:"#141414",borderRadius:8,padding:"12px 14px",marginBottom:14,border:"1px solid #2A2A2A"}}>
            <div style={{fontSize:10,color:"#555",letterSpacing:1.5,textTransform:"uppercase",marginBottom:6}}>Invite Link</div>
            <div style={{fontSize:11,color:"#AAAAAA",wordBreak:"break-all",lineHeight:1.6,fontFamily:"monospace"}}>
              {link}
            </div>
          </div>

          {/* What they'll see */}
          <div style={{background:"#00E67210",border:"1px solid #00E67230",borderRadius:8,padding:"10px 12px",marginBottom:16}}>
            <div style={{fontSize:11,fontWeight:700,color:"#00E676",marginBottom:6}}>What {client.name} will see:</div>
            {["Your photo, name, and welcome message","A personalised invite to accept","Their name saved to your dashboard","Every session auto-synced to you"].map(t=>(
              <div key={t} style={{display:"flex",gap:7,marginBottom:4}}>
                <span style={{color:"#00E676",fontSize:11,flexShrink:0}}>✓</span>
                <span style={{fontSize:11,color:"#888"}}>{t}</span>
              </div>
            ))}
          </div>

          {/* Buttons */}
          {"share" in navigator && (
            <button onClick={shareLink} style={{width:"100%",padding:"13px",background:"#00E676",color:"#000",border:"none",borderRadius:8,fontWeight:700,fontSize:14,cursor:"pointer",marginBottom:10,fontFamily:font}}>
              📤 Share Link (WhatsApp / Any App)
            </button>
          )}
          <button onClick={copy} style={{width:"100%",padding:"12px",background:copied?"#00E67620":"#1A1A1A",color:copied?"#00E676":"#CCCCCC",border:`1px solid ${copied?"#00E67640":"#2A2A2A"}`,borderRadius:8,fontWeight:600,fontSize:13,cursor:"pointer",fontFamily:font,transition:"all .2s"}}>
            {copied?"✓ Copied to clipboard!":"📋 Copy Link"}
          </button>
        </div>
      </div>
    </div>
  );
}
