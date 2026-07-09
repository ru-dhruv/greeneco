import { auth, db } from './firebase';
import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

const googleProvider = new GoogleAuthProvider();

// Initialize user in firestore if they don't exist
async function initUserInFirestore(user, additionalData = {}) {
  const userRef = doc(db, 'users', user.uid);
  const snapshot = await getDoc(userRef);

  if (!snapshot.exists()) {
    const { displayName, email, photoURL } = user;
    const createdAt = serverTimestamp();

    try {
      await setDoc(userRef, {
        displayName: displayName || additionalData.displayName || 'Eco Warrior',
        email,
        photoURL: photoURL || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + user.uid,
        greenCredits: 0,
        rank: 'Seedling',
        streak: 0,
        lastActionDate: null,
        badges: [],
        totalActions: 0,
        treesPlanted: 0,
        cleanupsDone: 0,
        challengesCompleted: 0,
        joinedAt: createdAt,
        ...additionalData
      });
    } catch (error) {
      console.error('Error creating user profile', error);
    }
  }
}

export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    await initUserInFirestore(result.user);
    return result.user;
  } catch (error) {
    throw error;
  }
};

export const signUpWithEmail = async (email, password, displayName) => {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    await initUserInFirestore(result.user, { displayName });
    return result.user;
  } catch (error) {
    throw error;
  }
};

export const signInWithEmail = async (email, password) => {
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    // Just in case they were created successfully but firestore init failed
    await initUserInFirestore(result.user);
    return result.user;
  } catch (error) {
    throw error;
  }
};

export const signOut = () => {
  return firebaseSignOut(auth);
};
