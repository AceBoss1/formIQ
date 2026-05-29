// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCX_X77gH7SLvoKyqW4btXV4WAmFX3yWVU",
  authDomain: "formiq-8b7b9.firebaseapp.com",
  projectId: "formiq-8b7b9",
  storageBucket: "formiq-8b7b9.firebasestorage.app",
  messagingSenderId: "1082280622143",
  appId: "1:1082280622143:web:c1bc81d32ae2d1e3ace08a",
  measurementId: "G-7S86JBZZH0"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);