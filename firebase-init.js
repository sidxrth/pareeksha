// Import functions from the Firebase SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import {
    getAuth,
    onAuthStateChanged,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import {
    getFirestore,
    doc,
    setDoc,
    addDoc,
    getDoc,
    getDocs,
    collection,
    query,
    where,
    orderBy,
    serverTimestamp // <--- FIX 1: Import serverTimestamp from Firestore
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDzjXQFc0VmzkBucL0zZOt535ToCtsvzs8",
  authDomain: "pareeksha-17cd5.firebaseapp.com",
  projectId: "pareeksha-17cd5",
  storageBucket: "pareeksha-17cd5.appspot.com",
  messagingSenderId: "745664069499",
  appId: "1:745664069499:web:5b5410a878b4db0de2c7de",
  measurementId: "G-NDP4DQTS2K"
};

// Initialize Firebase and export the services
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = firebaseConfig.appId; // Use appId from your actual config

export {
    app,
    auth,
    db,
    appId,
    onAuthStateChanged,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    doc,
    setDoc,
    addDoc,
    getDoc,
    getDocs,
    collection,
    query,
    where,
    orderBy,
    serverTimestamp // <--- FIX 2: Export serverTimestamp
};