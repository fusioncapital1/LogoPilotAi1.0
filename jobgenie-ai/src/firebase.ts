import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getAnalytics } from 'firebase/analytics';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBqtePjaf4sqiPvBTtM2SrQh2GWp-7vu2M",
  authDomain: "jobgenieai-3163e.firebaseapp.com",
  projectId: "jobgenieai-3163e",
  storageBucket: "jobgenieai-3163e.appspot.com",
  messagingSenderId: "829636970497",
  appId: "1:829636970497:web:2aa5dcf1a90e97be935800",
  measurementId: "G-047MNQ9GDC"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const analytics = getAnalytics(app); 