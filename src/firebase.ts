import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDPpqytUdflJCYiRJ8ltlAyFwz-bElcNqU",
  authDomain: "anilist-tracker-b25c5.firebaseapp.com",
  projectId: "anilist-tracker-b25c5",
  storageBucket: "anilist-tracker-b25c5.firebasestorage.app",
  messagingSenderId: "581439607274",
  appId: "1:581439607274:web:4b30e3498e200b6633a293",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);