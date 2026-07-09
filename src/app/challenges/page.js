"use client";

import { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import { formatDistanceToNow, differenceInDays } from 'date-fns';
import { Target, MapPin, Plus, Sparkles, Users, Award, Filter } from 'lucide-react';
import clsx from 'clsx';
import Link from 'next/link';
import CreateChallengeModal from '@/components/CreateChallengeModal';
import { ECO_ACTIVITIES } from '@/lib/activities';

const ACTION_TYPES = ['All', ...ECO_ACTIVITIES.map(a => a.label)];

const getChallengePill = (type) => {
  const activity = ECO_ACTIVITIES.find(a => a.label === type);
  return activity ? activity.color : 'bg-gray-100 text-gray-700';
};

export default function ChallengesPage() {
  const { user } = useAuth();
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('Active');
  const [filter, setFilter] = useState('All');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'challenges'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Sort by createdAt descending in memory
      data.sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
        return dateB - dateA;
      });
      
      setChallenges(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleToggleJoin = async (e, challenge) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) return;
    const challengeRef = doc(db, 'challenges', challenge.id);
    const isParticipant = challenge.participants?.includes(user.uid);
    try {
      if (isParticipant) {
        await updateDoc(challengeRef, { participants: arrayRemove(user.uid) });
      } else {
        await updateDoc(challengeRef, { participants: arrayUnion(user.uid) });
      }
    } catch (error) {
      console.error("Error toggling participation", error);
    }
  };

  const filteredChallenges = challenges.filter(c => {
    const isTabMatch = tab === 'Active' ? (!c.status || c.status === 'active') : c.status === 'completed';
    const isCategoryMatch = filter === 'All' || c.actionType === filter;
    return isTabMatch && isCategoryMatch;
  });

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 pt-6 pb-24">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">Challenges</h1>
          
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-default)] rounded-[var(--radius-md)] px-4 py-2 text-sm font-medium hover:bg-[var(--bg-subtle)] hover:border-[var(--border-strong)] transition-[var(--transition)]">
              <Sparkles className="w-4 h-4 text-purple-500" />
              <span className="hidden sm:inline">AI Generate</span>
            </button>
            <button 
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-2 bg-[var(--accent)] text-white rounded-[var(--radius-md)] px-4 py-2 text-sm font-medium hover:bg-[var(--accent-hover)] transition-[var(--transition)] active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              Create
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="flex items-center bg-[var(--bg-subtle)] border border-[var(--border-default)] rounded-[var(--radius-lg)] p-1 w-fit">
            <button
              onClick={() => setTab('Active')}
              className={clsx(
                "px-6 py-1.5 text-sm font-medium transition-[var(--transition)]",
                tab === 'Active' ? "bg-[var(--bg-surface)] rounded-[var(--radius-md)] shadow-[0_1px_3px_rgba(0,0,0,0.06)] text-[var(--text-primary)]" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              )}
            >
              Active
            </button>
            <button
              onClick={() => setTab('Completed')}
              className={clsx(
                "px-6 py-1.5 text-sm font-medium transition-[var(--transition)]",
                tab === 'Completed' ? "bg-[var(--bg-surface)] rounded-[var(--radius-md)] shadow-[0_1px_3px_rgba(0,0,0,0.06)] text-[var(--text-primary)]" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              )}
            >
              Completed
            </button>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0 scrollbar-hide items-center">
             <div className="flex items-center justify-center p-2 rounded-full text-[var(--text-muted)] shrink-0">
               <Filter className="w-4 h-4" />
             </div>
             {ACTION_TYPES.map(type => (
               <button
                 key={type}
                 onClick={() => setFilter(type)}
                 className={clsx(
                   "whitespace-nowrap px-3 py-1.5 rounded-[var(--radius-full)] text-xs font-medium transition-[var(--transition)] shrink-0",
                   filter === type 
                     ? "bg-[var(--text-primary)] text-white" 
                     : "bg-[var(--bg-subtle)] text-[var(--text-muted)] hover:bg-[var(--border-default)]"
                 )}
               >
                 {type}
               </button>
             ))}
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => (
               <div key={i} className="h-56 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-xl)] animate-pulse"></div>
            ))}
          </div>
        ) : filteredChallenges.length === 0 ? (
          <div className="text-center py-20 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-xl)]">
            <Target className="w-10 h-10 text-[var(--border-strong)] mx-auto mb-3" />
            <h3 className="text-sm font-medium text-[var(--text-primary)]">No {tab.toLowerCase()} challenges</h3>
            <p className="text-xs text-[var(--text-muted)] mt-1">Create one to get your community engaged.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredChallenges.map(challenge => {
              const isParticipant = challenge.participants?.includes(user?.uid);
              const progressPct = Math.min(100, Math.round(((challenge.currentCount || 0) / challenge.targetCount) * 100));
              const daysLeft = challenge.endDate?.toDate 
                ? differenceInDays(challenge.endDate.toDate(), new Date()) 
                : 0;
              const participants = challenge.participants || [];

              return (
                <a href={`/challenges/${challenge.id}`} key={challenge.id} className="block group">
                  <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-xl)] p-5 hover:border-[var(--border-strong)] transition-[var(--transition)] h-full flex flex-col">
                    
                    {/* Top Row */}
                    <div className="flex justify-between items-start">
                      <span className={clsx("rounded-[var(--radius-full)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap", getChallengePill(challenge.actionType))}>
                        {challenge.actionType}
                      </span>
                      <span className="bg-[var(--bg-subtle)] text-[var(--text-secondary)] rounded-[var(--radius-md)] px-2.5 py-1 text-xs font-medium">
                        {daysLeft > 0 ? `${daysLeft} days left` : 'Ended'}
                      </span>
                    </div>

                    <h3 className="text-lg font-semibold text-[var(--text-primary)] mt-3 mb-1 line-clamp-2">
                       {challenge.title}
                    </h3>

                    {challenge.city && (
                      <p className="text-xs text-[var(--text-muted)] flex items-center gap-1 mb-4">
                        <MapPin className="w-3.5 h-3.5" /> {challenge.city}
                      </p>
                    )}

                    <div className="mt-auto">
                      {/* Progress */}
                      <div className="flex justify-between items-end mb-2">
                        <span className="text-xs font-medium text-[var(--text-secondary)]">Progress</span>
                        <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider text-right">
                          {challenge.currentCount || 0} / {challenge.targetCount} actions
                        </span>
                      </div>
                      <div className="h-1.5 bg-[var(--bg-subtle)] rounded-full overflow-hidden relative">
                         {/* Optional static markers */}
                         <div className="absolute top-0 bottom-0 left-1/4 w-px bg-[var(--border-default)] z-10"></div>
                         <div className="absolute top-0 bottom-0 left-2/4 w-px bg-[var(--border-default)] z-10"></div>
                         <div className="absolute top-0 bottom-0 left-3/4 w-px bg-[var(--border-default)] z-10"></div>
                         
                         <div 
                           className="h-full bg-[var(--accent)] rounded-full transition-all duration-500 ease-out relative z-0" 
                           style={{ width: `${progressPct}%` }}
                         />
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="mt-5 pt-4 border-t border-[var(--border-default)] flex items-center justify-between">
                       <div className="flex items-center">
                         <div className="flex -space-x-2">
                           {participants.slice(0, 3).map((pId, i) => (
                             <img 
                               key={pId} 
                               src={`https://api.dicebear.com/7.x/initials/svg?seed=${pId}`} 
                               alt="Participant" 
                               className="w-6 h-6 rounded-full ring-2 ring-[var(--bg-surface)] bg-[var(--bg-subtle)]"
                             />
                           ))}
                         </div>
                         {participants.length > 3 && (
                           <span className="text-[10px] text-[var(--text-muted)] font-medium ml-2">+{participants.length - 3}</span>
                         )}
                         {participants.length === 0 && (
                            <span className="text-[10px] text-[var(--text-muted)] font-medium"><Users className="w-3 h-3 inline mr-1"/>0 joined</span>
                         )}
                       </div>

                       <div className="flex items-center gap-2">
                         {challenge.badgeReward && (
                           <span className="flex items-center gap-1 text-[10px] font-bold text-yellow-700 bg-yellow-50 px-2 py-1 rounded-[var(--radius-sm)] uppercase tracking-wider">
                             <Award className="w-3 h-3 text-yellow-500" />
                             Badge
                           </span>
                         )}
                         <button
                           onClick={(e) => handleToggleJoin(e, challenge)}
                           className={clsx(
                             "px-4 py-1.5 rounded-[var(--radius-md)] text-xs font-medium transition-[var(--transition)]",
                             isParticipant
                               ? "bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--border-accent)]/20"
                               : "bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-default)] hover:bg-[var(--bg-subtle)]"
                           )}
                         >
                           {isParticipant ? '✓ Joined' : 'Join'}
                         </button>
                       </div>
                    </div>

                  </div>
                </a>
              );
            })}
          </div>
        )}

      </div>
      {isCreateModalOpen && <CreateChallengeModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} />}
    </AppLayout>
  );
}
