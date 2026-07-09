"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  onAuthStateChanged
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { Loader2, AlertCircle } from 'lucide-react';
import clsx from 'clsx';

export default function LoginPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [error, setError] = useState('');
  const [isPopupBlocked, setIsPopupBlocked] = useState(false);

  // If already logged in → go to feed immediately
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.replace('/feed');
      } else {
        setCheckingAuth(false);
      }
    });
    return () => unsubscribe();
  }, [router]);

  // Create user doc in Firestore if first time
  const createUserDocIfNeeded = async (user) => {
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      await setDoc(userRef, {
        displayName: user.displayName || 
                     user.email?.split('@')[0] || 
                     'Eco Warrior',
        email: user.email || '',
        photoURL: user.photoURL || '',
        greenCredits: 0,
        rank: 'Seedling',
        streak: 0,
        lastActionDate: null,
        badges: [],
        totalActions: 0,
        treesPlanted: 0,
        cleanupsDone: 0,
        challengesCompleted: 0,
        followersCount: 0,
        followingCount: 0,
        clubIds: [],
        bio: '',
        location: '',
        joinedAt: serverTimestamp()
      });
    }
  };

  // GOOGLE SIGN IN — use popup
  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    setIsPopupBlocked(false);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, provider);
      await createUserDocIfNeeded(result.user);
      router.replace('/feed');
    } catch (err) {
      console.error('Google sign in error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Sign-in cancelled. Please try again.');
      } else if (err.code === 'auth/popup-blocked') {
        setIsPopupBlocked(true);
        setError('Popup blocked! Please click the address bar area in your browser and allow popups for this site, then try again.');
      } else if (err.code === 'auth/cancelled-popup-request') {
        setError('');  // silent — user just clicked again
      } else {
        setError('Google sign-in failed. Please try again.');
      }
      setLoading(false);
    }
  };

  // EMAIL SIGN IN
  const handleEmailSignIn = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const result = await signInWithEmailAndPassword(
        auth, email.trim(), password
      );
      await createUserDocIfNeeded(result.user);
      router.replace('/feed');
    } catch (err) {
      console.error('Email sign in error:', err);
      if (err.code === 'auth/user-not-found' ||
          err.code === 'auth/wrong-password' ||
          err.code === 'auth/invalid-credential') {
        setError('Wrong email or password. Please try again.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Please enter a valid email address.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Too many attempts. Please wait a moment.');
      } else {
        setError('Sign in failed. Please try again.');
      }
      setLoading(false);
    }
  };

  // CREATE ACCOUNT
  const handleCreateAccount = async (e) => {
    e.preventDefault();
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await createUserWithEmailAndPassword(
        auth, email.trim(), password
      );
      await updateProfile(result.user, {
        displayName: name.trim() || email.split('@')[0]
      });
      await createUserDocIfNeeded({
        ...result.user,
        displayName: name.trim() || email.split('@')[0]
      });
      router.replace('/feed');
    } catch (err) {
      console.error('Create account error:', err);
      if (err.code === 'auth/email-already-in-use') {
        setError('Email already registered. Try signing in.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Please enter a valid email address.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password must be at least 6 characters.');
      } else {
        setError('Could not create account. Please try again.');
      }
      setLoading(false);
    }
  };

  // Show spinner while checking auth state
  if (checkingAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen"
           style={{background: 'var(--bg-base)'}}>
        <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-base)] flex flex-col items-center justify-center p-4 selection:bg-[var(--accent)] selection:text-white">
      <div className="w-full max-w-sm">
        {/* Card */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-xl)] p-8 shadow-sm">
          
          <div className="text-center">
            <div className="text-4xl mb-3">🌿</div>
            <h1 className="text-xl font-semibold text-[var(--text-primary)] tracking-tight">GreenCred</h1>
            <p className="text-sm text-[var(--text-muted)] mt-1">Prove your eco impact.</p>
          </div>

          <div className="h-px bg-[var(--border-default)] my-6" />

          {error && !isPopupBlocked && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 border border-red-100 rounded-[var(--radius-md)] text-xs font-medium">
              {error}
            </div>
          )}

          {isPopupBlocked && (
            <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-[var(--radius-lg)] flex gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
              <div className="text-xs text-amber-800 font-medium leading-relaxed">
                {error}
              </div>
            </div>
          )}

          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-default)] rounded-[var(--radius-md)] px-4 py-2 text-sm font-medium hover:bg-[var(--bg-subtle)] hover:border-[var(--border-strong)] transition-[var(--transition)] shadow-sm disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
            )}
            Continue with Google
          </button>

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-[var(--border-default)]"></div>
            <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest text-[10px]">OR</span>
            <div className="flex-1 h-px bg-[var(--border-default)]"></div>
          </div>

          <form onSubmit={isLogin ? handleEmailSignIn : handleCreateAccount} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-[10px] font-bold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">Display Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Eco Warrior"
                  className="w-full bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-md)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--border-accent)] focus:ring-2 focus:ring-[var(--accent)]/10 transition-[var(--transition)]"
                />
              </div>
            )}
            <div>
              <label className="block text-[10px] font-bold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="eco@warrior.com"
                className="w-full bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-md)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--border-accent)] focus:ring-2 focus:ring-[var(--accent)]/10 transition-[var(--transition)]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-md)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--border-accent)] focus:ring-2 focus:ring-[var(--accent)]/10 transition-[var(--transition)]"
              />
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-[var(--accent)] text-white rounded-[var(--radius-md)] px-4 py-2.5 text-sm font-semibold hover:bg-[var(--accent-hover)] transition-[var(--transition)] active:scale-[0.98] shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
               {loading && <Loader2 className="w-4 h-4 animate-spin" />}
               {isLogin ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button 
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
                setIsPopupBlocked(false);
              }}
              className="text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-[var(--transition)]"
            >
              {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
            </button>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-[10px] text-[var(--text-muted)] mt-6 uppercase font-bold tracking-widest opacity-60">
          Next Generation Green Rewards 🌿
        </p>
      </div>
    </div>
  );
}

