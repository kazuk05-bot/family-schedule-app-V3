import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Firebaseコンソール > プロジェクトの設定 > 全般 > マイアプリ
// で表示される「firebaseConfig」をそのままここに貼り付けてください。
const firebaseConfig = {
  apiKey: "AIzaSyAZb2yySLc5g2SG5nsHhPunBpPq5Jg0FkI",
  authDomain: "family-schedule-app-v3.firebaseapp.com",
  projectId: "family-schedule-app-v3",
  storageBucket: "family-schedule-app-v3.firebasestorage.app",
  messagingSenderId: "897861221218",
  appId: "1:897861221218:web:1de19dd1749cda4c38ca3b",
  measurementId: "G-3B5PHGF4ZW"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
