import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCgCd9oYCCElM61QMsVLSJ9g6gHSTCwjH8",
  authDomain: "greeneco-b3a43.firebaseapp.com",
  projectId: "greeneco-b3a43",
  storageBucket: "greeneco-b3a43.firebasestorage.app",
  messagingSenderId: "127528227866",
  appId: "1:127528227866:web:84a0acd05faa5189432da3"
};

// Prevent duplicate app initialization
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
