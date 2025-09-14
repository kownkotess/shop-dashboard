// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// 🔴 Replace the values below with the config you copied from Firebase console
const firebaseConfig = {
  apiKey: "AIzaSyC3U86hoUTmzkq1WpRpxyMby5a3hepx9FU",
  authDomain: "shop-system-e9877.firebaseapp.com",
  projectId: "shop-system-e9877",
  storageBucket: "shop-system-e9877.appspot.com",
  messagingSenderId: "880441026552",
  appId: "1:880441026552:web:5452871e5d28f6f033980d"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app);
