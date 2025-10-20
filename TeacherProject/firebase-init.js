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
    orderBy
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Your web app's Firebase configuration
// This will be replaced by the canvas environment's configuration at runtime.
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

// A helper to safely parse the config if it's provided as a string
function getFirebaseConfig() {
    if (typeof __firebase_config !== 'undefined') {
        try {
            return JSON.parse(__firebase_config);
        } catch (e) {
            console.error("Error parsing Firebase config:", e);
            // Fallback to placeholder if parsing fails
            return firebaseConfig;
        }
    }
    return firebaseConfig;
}


// Initialize Firebase
const app = initializeApp(getFirebaseConfig());

// Initialize Firebase services
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// Export the initialized services and functions for other scripts to use
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
    orderBy
};
