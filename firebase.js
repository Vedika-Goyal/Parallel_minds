// firebase.js

import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth"; // ✅ IMPORTANT

const firebaseConfig = {
  apiKey: "AIzaSyA4DzRqYMEmoGHQ7lkp3nhBZLtzEX_7zOA",
  authDomain: "astitva-453eb.firebaseapp.com",
  projectId: "astitva-453eb",
  storageBucket: "astitva-453eb.firebasestorage.app",
  messagingSenderId: "250491073063",
  appId: "1:250491073063:web:3212a4c3182c86a3c4d402",
  measurementId: "G-RBKNMT9EK6"
};

const app = initializeApp(firebaseConfig);

// ✅ Firestore
export const db = getFirestore(app);

// ✅ Auth (THIS WAS MISSING)
export const auth = getAuth(app);