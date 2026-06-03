import { initializeApp } from "firebase/app";
import {
  getFirestore, doc, setDoc, getDoc, collection,
  onSnapshot, addDoc, query, where, orderBy, serverTimestamp, getDocs,
} from "firebase/firestore";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";

const firebaseConfig = {
  apiKey:            process.env.REACT_APP_FIREBASE_API_KEY            || "",
  authDomain:        process.env.REACT_APP_FIREBASE_AUTH_DOMAIN        || "",
  projectId:         process.env.REACT_APP_FIREBASE_PROJECT_ID         || "",
  storageBucket:     process.env.REACT_APP_FIREBASE_STORAGE_BUCKET     || "",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID|| "",
  appId:             process.env.REACT_APP_FIREBASE_APP_ID             || "",
};

let app, db, auth;
let firebaseReady = false;

try {
  if (firebaseConfig.apiKey) {
    app  = initializeApp(firebaseConfig);
    db   = getFirestore(app);
    auth = getAuth(app);
    firebaseReady = true;
  }
} catch (e) {
  console.warn("Firebase init failed:", e.message);
}

export const isFirebaseReady = () => firebaseReady;

// ── Auth ──────────────────────────────────────────────────────
let _authUser = null;
export const ensureAuth = () => new Promise((resolve) => {
  if (!firebaseReady) { resolve(null); return; }
  if (_authUser) { resolve(_authUser); return; }
  onAuthStateChanged(auth, user => {
    if (user) { _authUser = user; resolve(user); }
    else {
      signInAnonymously(auth)
        .then(c => { _authUser = c.user; resolve(c.user); })
        .catch(() => resolve(null));
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// TRAINER PROFILE
// ═══════════════════════════════════════════════════════════════
export const syncTrainerProfile = async (trainer) => {
  if (!firebaseReady) return;
  try {
    await setDoc(doc(db, "trainers", trainer.slug), {
      ...trainer, updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (e) { console.warn("Trainer sync:", e.message); }
};

export const fetchTrainerByEmail = async (email) => {
  if (!firebaseReady) return null;
  try {
    const snap = await getDocs(query(collection(db, "trainers"), where("email", "==", email)));
    if (snap.empty) return null;
    return { id: snap.docs[0].id, ...snap.docs[0].data() };
  } catch (e) { return null; }
};

// ═══════════════════════════════════════════════════════════════
// CLIENT SESSIONS — client writes, trainer reads in real time
// ═══════════════════════════════════════════════════════════════
export const syncClientSession = async (trainerSlug, clientName, sessionData) => {
  if (!firebaseReady) return null;
  try {
    await ensureAuth();
    const payload = {
      clientName,
      score:      sessionData.score      || 0,
      totalSets:  sessionData.totalSets  || 0,
      totalReps:  sessionData.totalReps  || 0,
      camMode:    sessionData.camMode    || "single",
      usedPose:   sessionData.usedPose   || false,
      avgMetrics: sessionData.avgMetrics || {},
      sets:       sessionData.sets       || [],
      date:       sessionData.date       || new Date().toISOString(),
      syncedAt:   serverTimestamp(),
      source:     "client_device",
    };
    const ref = await addDoc(
      collection(db, "trainers", trainerSlug, "clientSessions"), payload
    );
    console.log("✅ Session synced to Firestore:", ref.id);
    return ref.id;
  } catch (e) {
    console.error("❌ syncClientSession failed:", e.message);
    return null;
  }
};

export const listenClientSessions = (trainerSlug, onChange) => {
  if (!firebaseReady) { onChange([]); return () => {}; }
  try {
    const q = query(
      collection(db, "trainers", trainerSlug, "clientSessions"),
      orderBy("syncedAt", "desc")
    );
    return onSnapshot(q,
      snap => {
        const sessions = snap.docs.map(d => ({
          firestoreId: d.id,
          ...d.data(),
          date: d.data().syncedAt?.toDate?.()?.toISOString()
             || d.data().date
             || new Date().toISOString(),
          topMetric:  d.data().topMetric  || "Knee Alignment",
          weakMetric: d.data().weakMetric || "Tempo Control",
        }));
        onChange(sessions);
      },
      err => { console.warn("listenClientSessions error:", err.message); onChange([]); }
    );
  } catch (e) { console.warn("listenClientSessions failed:", e.message); onChange([]); return () => {}; }
};

// ═══════════════════════════════════════════════════════════════
// CLIENT PROFILES
// ═══════════════════════════════════════════════════════════════
export const syncClientProfile = async (trainerSlug, client) => {
  if (!firebaseReady) return;
  try {
    await setDoc(doc(db, "trainers", trainerSlug, "clients", String(client.id)),
      { ...client, updatedAt: serverTimestamp() }, { merge: true });
  } catch (e) { console.warn("syncClientProfile:", e.message); }
};

export const listenClients = (trainerSlug, onChange) => {
  if (!firebaseReady) { onChange([]); return () => {}; }
  try {
    return onSnapshot(
      collection(db, "trainers", trainerSlug, "clients"),
      snap => onChange(snap.docs.map(d => ({ firestoreId: d.id, ...d.data() }))),
      err  => { console.warn("listenClients error:", err.message); onChange([]); }
    );
  } catch (e) { onChange([]); return () => {}; }
};

// ═══════════════════════════════════════════════════════════════
// COACH NOTES — trainer writes, client reads
// ═══════════════════════════════════════════════════════════════
export const saveCoachNote = async (trainerSlug, clientId, note) => {
  if (!firebaseReady) return;
  try {
    await setDoc(doc(db, "trainers", trainerSlug, "coachNotes", String(clientId)),
      { note, updatedAt: serverTimestamp() });
    console.log("✅ Coach note saved");
  } catch (e) { console.warn("saveCoachNote:", e.message); }
};

export const fetchCoachNote = async (trainerSlug, clientId) => {
  if (!firebaseReady) return null;
  try {
    const snap = await getDoc(doc(db, "trainers", trainerSlug, "coachNotes", String(clientId)));
    return snap.exists() ? snap.data().note : null;
  } catch (e) { return null; }
};

// Live listener so client sees note appear without refresh
export const listenCoachNote = (trainerSlug, clientId, onChange) => {
  if (!firebaseReady) { onChange(null); return () => {}; }
  try {
    return onSnapshot(
      doc(db, "trainers", trainerSlug, "coachNotes", String(clientId)),
      snap => onChange(snap.exists() ? snap.data().note : null),
      err  => { console.warn("listenCoachNote:", err.message); onChange(null); }
    );
  } catch (e) { onChange(null); return () => {}; }
};

// ═══════════════════════════════════════════════════════════════
// WEEKLY TARGETS — trainer sets, client sees live
// ═══════════════════════════════════════════════════════════════
export const saveWeeklyTarget = async (trainerSlug, clientId, targets) => {
  if (!firebaseReady) return;
  try {
    await setDoc(doc(db, "trainers", trainerSlug, "targets", String(clientId)),
      { ...targets, updatedAt: serverTimestamp() });
    console.log("✅ Weekly target saved");
  } catch (e) { console.warn("saveWeeklyTarget:", e.message); }
};

export const fetchWeeklyTarget = async (trainerSlug, clientId) => {
  if (!firebaseReady) return null;
  try {
    const snap = await getDoc(doc(db, "trainers", trainerSlug, "targets", String(clientId)));
    return snap.exists() ? snap.data() : null;
  } catch (e) { return null; }
};

export const listenWeeklyTarget = (trainerSlug, clientId, onChange) => {
  if (!firebaseReady) { onChange(null); return () => {}; }
  try {
    return onSnapshot(
      doc(db, "trainers", trainerSlug, "targets", String(clientId)),
      snap => onChange(snap.exists() ? snap.data() : null),
      err  => { console.warn("listenWeeklyTarget:", err.message); onChange(null); }
    );
  } catch (e) { onChange(null); return () => {}; }
};

// ═══════════════════════════════════════════════════════════════
// CHALLENGES
// ═══════════════════════════════════════════════════════════════
export const createChallenge = async (challenge) => {
  if (!firebaseReady) return null;
  try {
    await ensureAuth();
    const ref = await addDoc(collection(db, "challenges"), {
      ...challenge, createdAt: serverTimestamp(), participants: 0,
    });
    return ref.id;
  } catch (e) { console.warn("createChallenge:", e.message); return null; }
};

export const listenChallenges = (onChange) => {
  if (!firebaseReady) { onChange([]); return () => {}; }
  try {
    return onSnapshot(
      query(collection(db, "challenges"), orderBy("createdAt", "desc")),
      snap => onChange(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      err  => { console.warn("listenChallenges:", err.message); onChange([]); }
    );
  } catch (e) { onChange([]); return () => {}; }
};

export const joinChallenge = async (challengeId, userId, userName) => {
  if (!firebaseReady) return;
  try {
    await ensureAuth();
    await setDoc(
      doc(db, "challenges", challengeId, "entries", userId),
      { userId, userName, progress: 0, joinedAt: serverTimestamp() },
      { merge: true }
    );
  } catch (e) { console.warn("joinChallenge:", e.message); }
};

export const submitChallengeProgress = async (challengeId, userId, userName, progress) => {
  if (!firebaseReady) return;
  try {
    await ensureAuth();
    await setDoc(
      doc(db, "challenges", challengeId, "entries", userId),
      { userId, userName, progress, updatedAt: serverTimestamp() },
      { merge: true }
    );
  } catch (e) { console.warn("submitProgress:", e.message); }
};

export const listenChallengeLeaderboard = (challengeId, onChange) => {
  if (!firebaseReady) { onChange([]); return () => {}; }
  try {
    return onSnapshot(
      query(collection(db, "challenges", challengeId, "entries"), orderBy("progress", "desc")),
      snap => onChange(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      err  => { console.warn("listenLeaderboard:", err.message); onChange([]); }
    );
  } catch (e) { onChange([]); return () => {}; }
};

// ═══════════════════════════════════════════════════════════════
// REFERRALS
// ═══════════════════════════════════════════════════════════════
export const recordReferral = async (referralCode, newUserId, newUserEmail) => {
  if (!firebaseReady) return;
  try {
    await ensureAuth();
    await addDoc(collection(db, "referrals"), {
      referralCode, newUserId, newUserEmail,
      joinedAt: serverTimestamp(), credited: false,
    });
  } catch (e) { console.warn("recordReferral:", e.message); }
};

export const getReferralCount = async (referralCode) => {
  if (!firebaseReady) return 0;
  try {
    const snap = await getDocs(
      query(collection(db, "referrals"), where("referralCode", "==", referralCode))
    );
    return snap.size;
  } catch (e) { return 0; }
};

export { db, auth };
