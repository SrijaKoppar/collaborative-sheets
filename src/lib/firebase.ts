import { initializeApp } from "firebase/app"
import { getFirestore } from "firebase/firestore"
import { getAuth } from "firebase/auth"

const firebaseConfig = {
  apiKey: "AIzaSyD2q6lJF9XU81Lh4EAzdZKHNivAQ-wMACs",
  authDomain: "collaborative-sheets-app.firebaseapp.com",
  projectId: "collaborative-sheets-app",
  storageBucket: "collaborative-sheets-app.firebasestorage.app",
  messagingSenderId: "871342798784",
  appId: "1:871342798784:web:5afe2eed009905565cba25",
  measurementId: "G-HB91VTC1B1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
export const auth = getAuth(app)