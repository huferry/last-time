import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  const email = result.user.email;

  // Check allowed_emails collection in Firestore
  const { getDoc, doc: firestoreDoc } = await import('firebase/firestore');
  const allowedDoc = await getDoc(firestoreDoc(db, 'allowed_emails', email));
  if (!allowedDoc.exists()) {
    await signOut(auth);
    throw new Error(`Access denied for ${email}`);
  }
  return result.user;
}

export async function signOutUser() {
  await signOut(auth);
}
