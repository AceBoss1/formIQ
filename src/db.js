// ═══════════════════════════════════════════════════════════════
// db.js — localStorage "database" (swap for Supabase in prod)
// ═══════════════════════════════════════════════════════════════

const ns = (k) => `fiq_${k}`;
const get = (k, def=null) => { try { const v=localStorage.getItem(ns(k)); return v?JSON.parse(v):def; } catch { return def; } };
const set = (k, v)        => { try { localStorage.setItem(ns(k), JSON.stringify(v)); } catch {} };
const del = (k)           => { try { localStorage.removeItem(ns(k)); } catch {} };

// ── Free session tracking ─────────────────────────────────────
export const FREE_LIMITS = { single: 100, "quad-4k": 5 };

export const getSessionUsage = () => get("session_usage", { single:0, "quad-4k":0, paid:false, planId:null });
export const incrementSession = (mode) => {
  const u = getSessionUsage();
  u[mode] = (u[mode]||0) + 1;
  set("session_usage", u);
  return u;
};
export const markPaid = (planId) => {
  const u = getSessionUsage();
  u.paid = true; u.planId = planId;
  set("session_usage", u);
};
export const isSessionAllowed = (mode) => {
  const u = getSessionUsage();
  if (u.paid) return true;
  return (u[mode]||0) < FREE_LIMITS[mode];
};
export const sessionsRemaining = (mode) => {
  const u = getSessionUsage();
  if (u.paid) return Infinity;
  return Math.max(0, FREE_LIMITS[mode] - (u[mode]||0));
};

// ── Trainer auth ──────────────────────────────────────────────
export const getTrainer        = ()     => get("trainer", null);
export const saveTrainer       = (t)    => set("trainer", t);
export const clearTrainer      = ()     => del("trainer");
export const isTrainerLoggedIn = ()     => !!get("trainer", null);

// ── Trainer registration queue ────────────────────────────────
export const getPendingReg   = ()  => get("pending_reg", null);
export const savePendingReg  = (r) => set("pending_reg", r);
export const clearPendingReg = ()  => del("pending_reg");

// ── Trainer clients ───────────────────────────────────────────
export const getClients   = (slug) => get(`clients_${slug}`, []);
export const saveClients  = (slug, list) => set(`clients_${slug}`, list);
export const addClient    = (slug, client) => {
  const list = getClients(slug);
  const newClient = { ...client, id: Date.now(), createdAt: new Date().toISOString(), sessions:0, score:0, status:"active", streak:0 };
  list.push(newClient);
  saveClients(slug, list);
  return newClient;
};
export const updateClient = (slug, id, patch) => {
  const list = getClients(slug).map(c => c.id===id ? {...c,...patch} : c);
  saveClients(slug, list);
};

// ── Trainer sessions ──────────────────────────────────────────
export const getSessions  = (slug) => get(`sessions_${slug}`, []);
export const addSession   = (slug, session) => {
  const list = getSessions(slug);
  const s = { ...session, id: Date.now(), date: new Date().toISOString() };
  list.unshift(s);
  set(`sessions_${slug}`, list);
  // Update client score & session count
  updateClient(slug, session.clientId, {
    sessions: (getClients(slug).find(c=>c.id===session.clientId)?.sessions||0)+1,
    score: session.score,
    lastSeen: "Today",
  });
  return s;
};

// ── Trainer plans ─────────────────────────────────────────────
export const DEFAULT_PLANS = {
  starter: { name:"Starter", maxClients:10,  priceUSD:29, description:"For new clients getting started" },
  pro:     { name:"Pro",     maxClients:25,  priceUSD:49, description:"Most popular — serious athletes" },
  elite:   { name:"Elite",   maxClients:999, priceUSD:79, description:"Unlimited — competitive athletes" },
};
export const getTrainerPlans = (slug) => get(`plans_${slug}`, DEFAULT_PLANS);
export const saveTrainerPlans = (slug, plans) => set(`plans_${slug}`, plans);

// ── Schedule ──────────────────────────────────────────────────
export const getSchedule  = (slug) => get(`schedule_${slug}`, []);
export const addScheduleItem = (slug, item) => {
  const list = getSchedule(slug);
  list.push({ ...item, id: Date.now() });
  set(`schedule_${slug}`, list);
};
export const updateScheduleItem = (slug, id, patch) => {
  const list = getSchedule(slug).map(s => s.id===id ? {...s,...patch} : s);
  set(`schedule_${slug}`, list);
};

// ── Client session context (for invited clients) ──────────────
export const getClientCtx  = () => { try { return JSON.parse(sessionStorage.getItem("fiq_client_ctx")||"null"); } catch { return null; } };
export const saveClientCtx = (ctx) => { try { sessionStorage.setItem("fiq_client_ctx", JSON.stringify(ctx)); } catch {} };
