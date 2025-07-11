import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: "AIzaSyA4tpWHciTopvNlW0nzO6PT5Vfj2PlzyXM",
  authDomain: "attendance-management--system.firebaseapp.com",
  projectId: "attendance-management--system",
  storageBucket: "attendance-management--system.appspot.com",
  messagingSenderId: "920595840961",
  appId: "1:920595840961:web:61d249708bd4c11ddd7940",
  measurementId: "G-RZXSRGRQC4",
};

// ✅ Only initialize if no apps exist
const app =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);
