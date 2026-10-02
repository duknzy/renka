import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

export const firebaseConfig = {
  apiKey: "AIzaSyB55MdhpjJizQaLEdRu-XhBVJ4PqrHsAyY",
  authDomain: "buturi-2449e.firebaseapp.com",
  databaseURL: "https://buturi-2449e-default-rtdb.asia-southeast1.firebasedatabase.app/",
  projectId: "buturi-2449e",
  storageBucket: "buturi-2449e.appspot.com",
  messagingSenderId: "976306696124",
  appId: "1:976306696124:web:e455c1953544bff5c345b9"
};

// Initialize Firebase safely
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const database = getDatabase(app);
