"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, updateDoc, arrayUnion, getDoc, collection, query, where, orderBy, limit, increment, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import { Target, MapPin, Users, Award, ArrowLeft, Loader2, Calendar, CheckCircle2 } from 'lucide-react';
import clsx from 'clsx';
import Link from 'next/link';

const getRankPill = (rank) => {
  const styles = {
    'Seedling': 'bg-gray-100 text-gray-600',
    'Sprout': 'bg-green-50 text-green-700',
    'Grove Keeper': 'bg-emerald-50 text-emerald-700',
    'Ecosystem Builder': 'bg-teal-50 text-teal-700',
    'Earth Guardian': 'bg-yellow-50 text-yellow-700',
  };
  return styles[rank] || styles['Seedling'];
};

export default function ChallengeDetailPage({ params }) {
  let challengeId = params.id;
  if ((!challengeId || challengeId === 'fallback' || challengeId === '%5Bid%5D') && typeof window !== 'undefined') {
    const parts = window.location.pathname.split('/').filter(Boolean);
    if (parts.length >= 2 && parts[0] === 'challenges') {
      challengeId = parts[1];
    }
  }

  const { user } = useAuth();
  const router = useRouter();
  
  const [challenge, setChallenge] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [participantsData, setParticipantsData] = useState([]);
  
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'challenges', challengeId), (docSnap) => {
      if (docSnap.exists()) {
        setChallenge({ id: docSnap.id, ...docSnap.data() });
      } else {
        setChallenge(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [challengeId]);

  useEffect(() => {
    if (!challenge?.participants) return;
    const fetchParticipants = async () => {
      try {
        const ids = challenge.participants.slice(0, 12);
        const snaps = await Promise.all(ids.map(uid => getDoc(doc(db, 'users', uid))));
        setParticipantsData(snaps.filter(s => s.exists()).map(s => ({ id: s.id, ...s.data() })));
      } catch (err) {
        console.error("Failed to load participants", err);
      }
    };
    fetchParticipants();
  }, [challenge?.participants]);

  const handleJoin = async () => {
    if (!user || !challenge) return;
    setActionLoading(true);
    try {
      const challengeRef = doc(db, 'challenges', challenge.id);
      await updateDoc(challengeRef, { 
        participants: arrayUnion(user.uid),
        memberCount: increment(1)
      });
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        joinedChallenges: arrayUnion(challenge.id)
      });
      if (challenge.adminId && challenge.adminId !== user.uid) {
        await addDoc(collection(db, 'notifications'), {
          userId: challenge.adminId,
          type: 'challenge_join',
          fromUserId: user.uid,
          fromUserName: user.displayName || 'Someone',
          fromUserAvatar: user.photoURL || '',
          message: `${user.displayName || 'Someone'} joined your challenge!`,
          link: `/challenges/${challenge.id}`,
          read: false,
          createdAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error("Error joining challenge", error);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <AppLayout><div className="flex justify-center py-32"><Loader2 className="w-8 h-8 text-[var(--accent)] animate-spin" /></div></AppLayout>;
  }

  if (!challenge) {
    return (
      <AppLayout>
        <div className="text-center py-20 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-xl)] max-w-2xl mx-auto mt-6">
           <h2 className="text-lg font-semibold text-[var(--text-primary)]">Challenge not found</h2>
        </div>
      </AppLayout>
    );
  }

  const isParticipant = challenge.participants?.includes(user?.uid);
  const progressPct = Math.min(100, Math.round(((challenge.currentCount || 0) / challenge.targetCount) * 100));

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-8 px-4 pt-6 pb-24">
        
        <button onClick={() => router.push('/challenges')} className="flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] text-sm font-medium transition-[var(--transition)]">
          <ArrowLeft className="w-4 h-4" /> Back to Challenges
        </button>

        {/* Hero Section */}
        <div className="bg-[var(--bg-surface)] rounded-[var(--radius-xl)] p-6 sm:p-10 border border-[var(--border-default)] flex flex-col items-center text-center">
          
          <div className="w-24 h-24 rounded-[var(--radius-xl)] bg-[var(--bg-subtle)] flex items-center justify-center text-5xl mb-6 shadow-sm border border-[var(--border-default)]">
            🎯
          </div>
          
          <div className="flex justify-center items-center gap-2 mb-3">
            <span className="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-[var(--radius-full)] text-[10px] uppercase font-bold tracking-wider">
              {challenge.actionType}
            </span>
            <span className="bg-[var(--bg-subtle)] text-[var(--text-secondary)] px-2.5 py-1 rounded-[var(--radius-md)] text-xs font-medium border border-[var(--border-default)]">
              {challenge.endDate?.toDate ? new Date(challenge.endDate.toDate()).toLocaleDateString() : 'Ongoing'}
            </span>
          </div>
          
          <h1 className="text-2xl sm:text-3xl font-semibold text-[var(--text-primary)] tracking-tight max-w-2xl">{challenge.title}</h1>
          
          <p className="text-[var(--text-secondary)] text-sm mt-3 max-w-2xl mx-auto leading-relaxed">
            {challenge.description}
          </p>

          {challenge.city && (
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--bg-subtle)] text-[var(--text-secondary)] rounded-[var(--radius-md)] text-sm font-medium border border-[var(--border-default)]">
                <MapPin className="w-4 h-4 text-[var(--text-muted)]" /> {challenge.city}
              </span>
            </div>
          )}

          {/* Progress */}
          <div className="w-full max-w-xl mt-8 pt-6 border-t border-[var(--border-default)]">
             <div className="flex justify-between items-end mb-2">
                <span className="text-sm font-medium text-[var(--text-primary)]">Community Progress</span>
                <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider text-right">
                  {challenge.currentCount || 0} / {challenge.targetCount} actions
                </span>
             </div>
             <div className="h-2.5 bg-[var(--bg-subtle)] rounded-full overflow-hidden relative shadow-inner border border-[var(--border-default)]">
                <div 
                  className="h-full bg-[var(--accent)] rounded-full transition-all duration-700 ease-out" 
                  style={{ width: `${progressPct}%` }}
                />
             </div>
          </div>

          <div className="mt-8">
            {isParticipant ? (
              <div className="px-6 py-2 rounded-[var(--radius-md)] text-sm font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> ✓ Joined
              </div>
            ) : (
              <button
                onClick={handleJoin}
                disabled={actionLoading}
                className="px-8 py-2.5 rounded-[var(--radius-md)] text-sm font-medium transition-[var(--transition)] active:scale-[0.98] w-full sm:w-auto h-11 flex items-center justify-center gap-2 bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] border border-transparent shadow-[0_4px_12px_rgba(22,163,74,0.2)] disabled:opacity-50"
              >
                {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Join Challenge
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Members Panel */}
          <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-xl)] p-6 md:col-span-3">
            <h3 className="font-semibold text-lg text-[var(--text-primary)] mb-6 flex items-center gap-2">
              👥 Participants ({challenge.participants?.length || 0})
            </h3>
            
            {participantsData.length === 0 ? (
              <div className="text-center py-8 text-sm text-[var(--text-muted)] bg-[var(--bg-subtle)] rounded-[var(--radius-md)] border border-[var(--border-default)]">
                No participants yet. Be the first to join! 🌱
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {participantsData.map(m => (
                  <Link href={`/profile/${m.id}`} key={m.id} className="flex gap-3 bg-[var(--bg-surface)] border border-[var(--border-default)] p-3 rounded-[var(--radius-lg)] hover:border-[var(--border-strong)] transition-colors items-center">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 shrink-0 flex items-center justify-center text-gray-500 font-bold">
                      {m.photoURL ? (
                        <img src={m.photoURL} alt={m.displayName} className="w-full h-full object-cover" />
                      ) : (
                        m.displayName?.charAt(0) || '?'
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[var(--text-primary)] truncate">{m.displayName}</p>
                      <div className="mt-1 flex items-center gap-2">
                         <span className={clsx("px-1.5 py-0.5 rounded text-[9px] uppercase font-bold tracking-wider", getRankPill(m.rank))}>
                           {m.rank || 'Seedling'}
                         </span>
                         <span className="text-xs text-[var(--text-muted)]">{m.greenCredits || 0} GC</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Challenge Info Panel */}
          <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-xl)] p-6 md:col-span-2 text-[var(--text-secondary)] text-sm space-y-4">
             <h3 className="font-semibold text-[var(--text-primary)]">Rules & Information</h3>
             <ul className="list-disc pl-5 space-y-2 marker:text-[var(--text-muted)]">
               <li>Log interactions with the specific action type <b>{challenge.actionType}</b>.</li>
               <li>Ensure photos uniquely identify the verified action. AI verification applies.</li>
               <li>Actions logged before the start date do not count towards community progress.</li>
             </ul>
             
             {challenge.badgeReward && (
               <div className="mt-6 pt-4 border-t border-[var(--border-default)]">
                 <h4 className="font-semibold text-[var(--text-primary)] flex items-center gap-2 mb-2">
                   <Award className="w-4 h-4 text-yellow-500" /> Reward
                 </h4>
                 <div className="bg-yellow-50 text-yellow-800 border border-yellow-200 px-4 py-3 rounded-[var(--radius-md)] flex items-center gap-3">
                    <div className="text-2xl">🏆</div>
                    <div>
                      <p className="font-semibold text-sm">Special Badge</p>
                      <p className="text-xs opacity-80 mt-0.5">Will be distributed when the challenge completes 100%.</p>
                    </div>
                 </div>
               </div>
             )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
