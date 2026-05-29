// ═══════════════════════════════════════════════════════════════
// firebase.js — Firestore sync layer
// Replace the config below with your own Firebase project values.
// Get them free at: https://console.firebase.google.com
// Create project → Add web app → Copy firebaseConfig object
// ═══════════════════════════════════════════════════════════════

import { initializeApp } from "firebase/app";
import {
  getFirestore, doc, setDoc, getDoc, collection,
  onSnapshot, addDoc, query, where, orderBy, serverTimestamp,
  updateDoc, deleteDoc,
} from "firebase/firestore";
import {
  getAuth, signInAnonymously, onAuthStateChanged,
} from "firebase/auth";

// ── YOUR FIREBASE CONFIG ──────────────────────────────────────
// Replace this with your actual project config from Firebase Console
// Firebase Console → Project Settings → Your apps → Web app → SDK setup
const firebaseConfig = {
  apiKey:            process.env.REACT_APP_FIREBASE_API_KEY            || "YOUR_API_KEY",
  authDomain:        process.env.REACT_APP_FIREBASE_AUTH_DOMAIN        || "YOUR_PROJECT.firebaseapp.com",
  projectId:         process.env.REACT_APP_FIREBASE_PROJECT_ID         || "YOUR_PROJECT_ID",
  storageBucket:     process.env.REACT_APP_FIREBASE_STORAGE_BUCKET     || "YOUR_PROJECT.appspot.com",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID|| "YOUR_SENDER_ID",
  appId:             process.env.REACT_APP_FIREBASE_APP_ID             || "YOUR_APP_ID",
};

// ── Init ──────────────────────────────────────────────────────
let app, db, auth;
let firebaseReady = false;
let firebaseError = null;

try {
  app  = initializeApp(firebaseConfig);
  db   = getFirestore(app);
  auth = getAuth(app);
  firebaseReady = true;
} catch (e) {
  firebaseError = e.message;
  console.warn("Firebase not configured — running in offline/localStorage mode.", e.message);
}

export const isFirebaseReady = () => firebaseReady;

// ── Anonymous auth (clients don't need accounts) ──────────────
export const ensureAuth = () => new Promise((resolve) => {
  if (!firebaseReady) { resolve(null); return; }
  onAuthStateChanged(auth, user => {
    if (user) { resolve(user); }
    else { signInAnonymously(auth).then(c => resolve(c.user)).catch(() => resolve(null)); }
  });
});

// ═══════════════════════════════════════════════════════════════
// TRAINER SYNC
// ═══════════════════════════════════════════════════════════════

// Save trainer profile to Firestore (called on registration + settings save)
export const syncTrainerProfile = async (trainer) => {
  if (!firebaseReady) return;
  try {
    await setDoc(doc(db, "trainers", trainer.slug), {
      ...trainer,
      _pwHash: trainer._pwHash, // keep hashed, never plain text
      updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (e) { console.warn("Trainer sync failed:", e.message); }
};

// Load trainer profile from Firestore (login by email lookup)
export const fetchTrainerByEmail = async (email) => {
  if (!firebaseReady) return null;
  try {
    const q = query(collection(db, "trainers"), where("email", "==", email));
    const { getDocs } = await import("firebase/firestore");
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return { id: snap.docs[0].id, ...snap.docs[0].data() };
  } catch (e) { console.warn("fetchTrainerByEmail failed:", e.message); return null; }
};

// ═══════════════════════════════════════════════════════════════
// CLIENT SESSIONS — written by client device, read by trainer
// ═══════════════════════════════════════════════════════════════

// Called when an invited client completes a session
export const syncClientSession = async (trainerSlug, clientName, sessionData) => {
  if (!firebaseReady) return null;
  try {
    await ensureAuth();
    const ref = await addDoc(collection(db, "trainers", trainerSlug, "clientSessions"), {
      ...sessionData,
      clientName,
      syncedAt: serverTimestamp(),
      source: "client_device",
    });
    return ref.id;
  } catch (e) { console.warn("Session sync failed:", e.message); return null; }
};

// Called by trainer dashboard — real-time listener on all client sessions
// Returns an unsubscribe function
export const listenClientSessions = (trainerSlug, onChange) => {
  if (!firebaseReady) { onChange([]); return ()=>{}; }
  try {
    const q = query(
      collection(db, "trainers", trainerSlug, "clientSessions"),
      orderBy("syncedAt", "desc")
    );
    return onSnapshot(q, snap => {
      const sessions = snap.docs.map(d => ({ firestoreId: d.id, ...d.data(),
        // Convert Firestore Timestamp → ISO string
        date: d.data().syncedAt?.toDate?.()?.toISOString() || d.data().date || new Date().toISOString(),
      }));
      onChange(sessions);
    }, err => { console.warn("Session listener failed:", err.message); onChange([]); });
  } catch (e) { console.warn("listenClientSessions failed:", e.message); onChange([]); return ()=>{}; }
};

// ═══════════════════════════════════════════════════════════════
// CLIENT PROFILES — trainer adds clients, synced to Firestore
// ═══════════════════════════════════════════════════════════════

export const syncClientProfile = async (trainerSlug, client) => {
  if (!firebaseReady) return;
  try {
    await setDoc(doc(db, "trainers", trainerSlug, "clients", String(client.id)), {
      ...client,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (e) { console.warn("Client profile sync failed:", e.message); }
};

export const listenClients = (trainerSlug, onChange) => {
  if (!firebaseReady) { onChange([]); return ()=>{}; }
  try {
    return onSnapshot(
      collection(db, "trainers", trainerSlug, "clients"),
      snap => onChange(snap.docs.map(d => ({ firestoreId: d.id, ...d.data() }))),
      err => { console.warn("Client listener failed:", err.message); onChange([]); }
    );
  } catch (e) { console.warn("listenClients failed:", e.message); onChange([]); return ()=>{}; }
};

// ═══════════════════════════════════════════════════════════════
// COACH NOTES — trainer writes, client reads before next session
// ═══════════════════════════════════════════════════════════════

export const saveCoachNote = async (trainerSlug, clientId, note) => {
  if (!firebaseReady) return;
  try {
    await setDoc(doc(db, "trainers", trainerSlug, "coachNotes", String(clientId)), {
      note, updatedAt: serverTimestamp(),
    });
  } catch (e) { console.warn("Coach note sync failed:", e.message); }
};

export const fetchCoachNote = async (trainerSlug, clientId) => {
  if (!firebaseReady) return null;
  try {
    const snap = await getDoc(doc(db, "trainers", trainerSlug, "coachNotes", String(clientId)));
    return snap.exists() ? snap.data().note : null;
  } catch (e) { return null; }
};

// ═══════════════════════════════════════════════════════════════
// WEEKLY TARGETS — trainer sets, client sees live in squat app
// ═══════════════════════════════════════════════════════════════

export const saveWeeklyTarget = async (trainerSlug, clientId, targets) => {
  if (!firebaseReady) return;
  try {
    await setDoc(doc(db, "trainers", trainerSlug, "targets", String(clientId)), {
      ...targets, updatedAt: serverTimestamp(),
    });
  } catch (e) { console.warn("Target sync failed:", e.message); }
};

export const fetchWeeklyTarget = async (trainerSlug, clientId) => {
  if (!firebaseReady) return null;
  try {
    const snap = await getDoc(doc(db, "trainers", trainerSlug, "targets", String(clientId)));
    return snap.exists() ? snap.data() : null;
  } catch (e) { return null; }
};

// ═══════════════════════════════════════════════════════════════
// REFERRAL SYSTEM
// ═══════════════════════════════════════════════════════════════

// Generate a referral code for a user
export const generateReferralCode = (userId) =>
  `FIQ${userId.toString(36).toUpperCase().slice(-6)}`;

// Save a referral record when someone joins via a referral link
export const recordReferral = async (referralCode, newUserId, newUserEmail) => {
  if (!firebaseReady) return;
  try {
    await addDoc(collection(db, "referrals"), {
      referralCode, newUserId, newUserEmail,
      joinedAt: serverTimestamp(), credited: false,
    });
  } catch (e) { console.warn("Referral record failed:", e.message); }
};

// Get referral count for a code (for group discount calculation)
export const getReferralCount = async (referralCode) => {
  if (!firebaseReady) return 0;
  try {
    const { getDocs } = await import("firebase/firestore");
    const q = query(collection(db, "referrals"), where("referralCode", "==", referralCode));
    const snap = await getDocs(q);
    return snap.size;
  } catch (e) { return 0; }
};

export { db, auth };
