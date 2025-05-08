import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getAnalytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: "AIzaSyBqte2jaf4sqiPvBTtM2SrQh2GWp-7vu2M",
  authDomain: "jobgenieai-3163e.firebaseapp.com",
  projectId: "jobgenieai-3163e",
  storageBucket: "jobgenieai-3163e.appspot.com",
  messagingSenderId: "82963970497",
  appId: "1:82963970497:web:2aa5dcf1a90e7b9e935800",
  measurementId: "G-047MNQ9GDC"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const analytics = getAnalytics(app);
export {};
