import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAgILLZs06r3_Fynxp64tvgX0j8O8vGEoU",
  authDomain: "gen-lang-client-0759960336.firebaseapp.com",
  projectId: "gen-lang-client-0759960336",
  storageBucket: "gen-lang-client-0759960336.firebasestorage.app",
  messagingSenderId: "1026878900512",
  appId: "1:1026878900512:web:c8f1b5e0e68a1c2865af45"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
