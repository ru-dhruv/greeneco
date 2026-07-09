"use client";

import { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, limit, getDocs, doc, getDoc } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import Link from 'next/link';
import { TrendingUp, Users, Target, Activity, Loader2, Award, ChevronRight, X, MapPin } from 'lucide-react';
import clsx from 'clsx';
import { getDate } from '@/lib/dateUtils';
import { formatDistanceToNow } from 'date-fns';
import { toggleFollow } from '@/lib/followers';
import toast from 'react-hot-toast';

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

export default function ExplorePage() {
  const { user } = useRequireAuth();
  
  const [loading, setLoading] = useState(true);
  const [topUsers, setTopUsers] = useState([]);
  const [trendingChallenges, setTrendingChallenges] = useState([]);
  const [recentActions, setRecentActions] = useState([]);
  const [activeClubs, setActiveClubs] = useState([]);
  const [error, setError] = useState(false);

  const [selectedAction, setSelectedAction] = useState(null);

  // Follow state tracking
  const [followingMap, setFollowingMap] = useState({}); // { userId: true/false }
  const [followLoadingMap, setFollowLoadingMap] = useState({}); // { userId: true/false }

  useEffect(() => {
    if (!user) return;
    
    const loadExploreData = async () => {
      setLoading(true);
      setError(false);
      
      // 1. TOP WARRIORS
      try {
        const usersSnap = await getDocs(query(collection(db, 'users'), limit(50)));
        const users = usersSnap.docs
          .map(d => ({id: d.id, ...d.data()}))
          .sort((a, b) => (b.greenCredits || 0) - (a.greenCredits || 0))
          .slice(0, 6);
        setTopUsers(users);

        // Check follow status for all top users
        if (user) {
          const followChecks = {};
          await Promise.all(
            users.map(async (u) => {
              if (u.id === user.uid) return;
              try {
                const followDoc = await getDoc(doc(db, 'follows', `${user.uid}_${u.id}`));
                followChecks[u.id] = followDoc.exists();
              } catch (e) {
                followChecks[u.id] = false;
              }
            })
          );
          setFollowingMap(followChecks);
        }
      } catch(e) { 
        console.error("Top users load error:", e);
        setTopUsers([]); 
      }

      // 2. TRENDING CHALLENGES
      try {
        const challengesSnap = await getDocs(query(collection(db, 'challenges'), limit(50)));
        const challenges = challengesSnap.docs
          .map(d => ({id: d.id, ...d.data()}))
          .filter(c => c.status === 'active')
          .sort((a, b) => (b.currentCount || 0) - (a.currentCount || 0))
          .slice(0, 6);
        setTrendingChallenges(challenges);
      } catch(e) { 
        console.error("Challenges load error:", e);
        setTrendingChallenges([]); 
      }

      // 3. RECENT ACTIONS
      try {
        const actionsSnap = await getDocs(query(collection(db, 'actions'), limit(50)));
        const actions = actionsSnap.docs
          .map(d => ({id: d.id, ...d.data()}))
          .filter(a => a.imageURL && a.imageURL.length > 0)
          .sort((a, b) => {
            const getTime = (ts) => {
              if (!ts) return 0;
              if (ts.toDate) return ts.toDate().getTime();
              if (ts.seconds) return ts.seconds * 1000;
              return new Date(ts).getTime();
            };
            return getTime(b.createdAt) - getTime(a.createdAt);
          })
          .slice(0, 9);
        setRecentActions(actions);
      } catch(e) { 
        console.error("Actions load error:", e);
        setRecentActions([]); 
      }

      // 4. ACTIVE CLUBS
      try {
        const clubsSnap = await getDocs(query(collection(db, 'clubs'), limit(50)));
        const clubs = clubsSnap.docs
          .map(d => ({id: d.id, ...d.data()}))
          .sort((a, b) => (b.memberCount || 0) - (a.memberCount || 0))
          .slice(0, 4);
        setActiveClubs(clubs);
      } catch(e) { 
        console.error("Clubs load error:", e);
        setActiveClubs([]); 
      }

      setLoading(false);
    };
    
    loadExploreData();
  }, [user]);

  const handleFollowToggle = async (e, targetUserId) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      toast.error('Please sign in to follow users');
      return;
    }
    if (targetUserId === user.uid) return;

    setFollowLoadingMap(prev => ({ ...prev, [targetUserId]: true }));
    
    const isCurrentlyFollowing = followingMap[targetUserId] || false;
    const result = await toggleFollow(user.uid, targetUserId, isCurrentlyFollowing);
    
    if (result.success) {
      setFollowingMap(prev => ({ ...prev, [targetUserId]: !isCurrentlyFollowing }));
      toast.success(isCurrentlyFollowing ? 'Unfollowed' : 'Following! 🌿');
    } else {
      toast.error(result.error || 'Failed to update follow');
    }
    
    setFollowLoadingMap(prev => ({ ...prev, [targetUserId]: false }));
  };

  const ActionPlaceholders = () => {
    const emojis = ['🌳', '🧹', '♻️', '🚲', '⚡', '📣', '🌱', '💧', '🌍'];
    return (
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        {emojis.map((emoji, i) => (
          <div key={i} className="aspect-square bg-gray-100 rounded-[var(--radius-lg)] flex items-center justify-center text-2xl grayscale opacity-50 border border-dashed border-gray-200">
            {emoji}
          </div>
        ))}
      </div>
    );
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-12 px-4 pt-6 pb-24">
        <h1 className="text-2xl font-semibold text-[var(--text-primary)] tracking-tight">Explore</h1>

        {/* SECTION 1: TOP WARRIORS */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <Award className="w-4 h-4 text-emerald-600" /> Top Eco Warriors
            </h2>
            <Link href="/leaderboard" className="text-xs font-medium text-[var(--accent)] hover:underline flex items-center">
              View All <ChevronRight className="w-3 h-3 ml-0.5" />
            </Link>
          </div>
          
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[...Array(6)].map((_, i) => <div key={i} className="h-24 bg-gray-50 animate-pulse rounded-[var(--radius-lg)] border border-[var(--border-default)]"></div>)}
            </div>
          ) : topUsers.length === 0 ? (
            <div className="text-center py-10 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-xl)]">
              <div className="text-3xl mb-3">🌱</div>
              <p className="text-sm font-medium text-[var(--text-secondary)]">No eco warriors yet — log the first action!</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {topUsers.map(u => {
                const isOwnProfile = user?.uid === u.id;
                const isFollowingUser = followingMap[u.id] || false;
                const isFollowLoading = followLoadingMap[u.id] || false;

                return (
                  <a href={`/profile/${u.id}`} key={u.id} className="flex flex-col bg-[var(--bg-surface)] border border-[var(--border-default)] p-4 rounded-[var(--radius-lg)] hover:border-[var(--border-strong)] transition-colors group shadow-sm">
                     <div className="flex items-start justify-between">
                       <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 ring-1 ring-[var(--border-default)] shrink-0">
                          <img src={u.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${u.displayName}`} alt={u.displayName} className="w-full h-full object-cover" />
                       </div>
                       <div className="bg-[var(--accent-soft)] text-[var(--accent)] px-2 py-0.5 rounded text-[10px] font-bold tracking-wider">{u.greenCredits || 0} GC</div>
                     </div>
                     <h3 className="text-sm font-semibold text-[var(--text-primary)] mt-3 truncate group-hover:text-[var(--accent)] transition-colors">{u.displayName}</h3>
                     <div className="mt-1 flex items-center justify-between">
                       <span className={clsx("px-1.5 py-0.5 rounded text-[9px] uppercase font-bold tracking-wider", getRankPill(u.rank))}>{u.rank || 'Seedling'}</span>
                       {!isOwnProfile && (
                         <button
                           onClick={(e) => handleFollowToggle(e, u.id)}
                           disabled={isFollowLoading}
                           className={clsx(
                             "px-2.5 py-1 rounded-[var(--radius-md)] text-[10px] font-semibold transition-all active:scale-95 disabled:opacity-50",
                             isFollowingUser
                               ? "bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--border-accent)]/20"
                               : "bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]"
                           )}
                         >
                           {isFollowLoading ? (
                             <Loader2 className="w-3 h-3 animate-spin" />
                           ) : (
                             isFollowingUser ? 'Following' : 'Follow'
                           )}
                         </button>
                       )}
                     </div>
                  </a>
                );
              })}
            </div>
          )}
        </section>

        {/* SECTION 2: TRENDING CHALLENGES */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-orange-500" /> Trending Challenges
            </h2>
            <Link href="/challenges" className="text-xs font-medium text-[var(--accent)] hover:underline flex items-center">
              View All <ChevronRight className="w-3 h-3 ml-0.5" />
            </Link>
          </div>
          
          {loading ? (
            <div className="flex gap-3 overflow-hidden">
               {[...Array(3)].map((_, i) => <div key={i} className="min-w-[240px] h-32 bg-gray-50 animate-pulse rounded-[var(--radius-lg)] border border-[var(--border-default)]"></div>)}
            </div>
          ) : trendingChallenges.length === 0 ? (
            <div className="text-center py-10 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-xl)]">
              <div className="text-3xl mb-3">🎯</div>
              <p className="text-sm font-medium text-[var(--text-secondary)] mb-4">No active challenges — create one!</p>
              <Link href="/challenges" className="inline-flex items-center gap-2 bg-[var(--text-primary)] text-white px-4 py-2 rounded-[var(--radius-md)] text-xs font-semibold hover:opacity-90 transition-opacity">
                Go to Challenges
              </Link>
            </div>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-4 snap-x hide-scrollbar">
              {trendingChallenges.map(c => {
                 const progressPct = Math.min(100, Math.round(((c.currentCount || 0) / c.targetCount) * 100));
                 return (
                   <div key={c.id} className="min-w-[260px] max-w-[260px] snap-center bg-[var(--bg-surface)] border border-[var(--border-default)] p-4 rounded-[var(--radius-lg)] hover:border-[var(--border-strong)] transition-colors flex flex-col">
                     <div className="flex items-center justify-between mb-2">
                        <span className="bg-[var(--bg-subtle)] text-[var(--text-secondary)] px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase border border-[var(--border-default)]">{c.actionType}</span>
                        <div className="flex flex-col items-end">
                          <span className="text-xs font-semibold text-[var(--text-primary)]">{progressPct}%</span>
                        </div>
                     </div>
                     <h3 className="font-semibold text-sm text-[var(--text-primary)] line-clamp-1 mb-1">{c.title}</h3>
                     <p className="text-xs text-[var(--text-muted)] mb-3 flex items-center gap-1.5"><Users className="w-3 h-3" /> {c.participants?.length || 0} participants</p>
                     
                     <div className="h-1.5 w-full bg-[var(--bg-subtle)] rounded-full overflow-hidden mb-4">
                        <div className="h-full bg-[var(--accent)] rounded-full transition-all duration-500" style={{ width: `${progressPct}%` }}></div>
                     </div>
                     
                     <div className="mt-auto pt-2">
                       <a href={`/challenges/${c.id}`} className="block w-full text-center bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-md)] py-1.5 text-xs font-medium hover:bg-[var(--bg-subtle)] transition-[var(--transition)]">
                         View Details
                       </a>
                     </div>
                   </div>
                 );
              })}
            </div>
          )}
        </section>

        {/* SECTION 3: ACTIVE CLUBS */}
        {(!loading && activeClubs.length === 0) ? null : (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-500" /> Active Clubs
              </h2>
              <Link href="/clubs" className="text-xs font-medium text-[var(--accent)] hover:underline flex items-center">
                Explore Clubs <ChevronRight className="w-3 h-3 ml-0.5" />
              </Link>
            </div>
            
            {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
               {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-gray-50 animate-pulse rounded-[var(--radius-lg)] border border-[var(--border-default)]"></div>)}
            </div>
          ) : activeClubs.length === 0 ? (
            <div className="text-center py-10 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-xl)]">
              <div className="text-3xl mb-3">🏕️</div>
              <p className="text-sm font-medium text-[var(--text-secondary)] mb-4">No clubs yet — create the first one!</p>
              <Link href="/clubs" className="inline-flex items-center gap-2 bg-[var(--text-primary)] text-white px-4 py-2 rounded-[var(--radius-md)] text-xs font-semibold hover:opacity-90 transition-opacity">
                Go to Clubs
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {activeClubs.map(club => (
                  <a href={`/clubs/${club.id}`} key={club.id} className="bg-[var(--bg-surface)] border border-[var(--border-default)] p-4 rounded-[var(--radius-lg)] hover:border-[var(--border-strong)] transition-colors flex items-center gap-4">
                    <div className="w-12 h-12 rounded-[var(--radius-md)] bg-[var(--bg-subtle)] flex items-center justify-center text-xl shrink-0 border border-[var(--border-default)]">
                      {club.coverEmoji || '🏕️'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-sm text-[var(--text-primary)] truncate">{club.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-xs text-[var(--text-muted)] line-clamp-1">{club.category}</p>
                        <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                        <p className="text-xs font-medium text-[var(--text-secondary)]">{club.memberCount || 0} members</p>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </section>
        )}

        {/* SECTION 4: RECENT ECO ACTIONS */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <Activity className="w-4 h-4 text-teal-500" /> Recent Action Gallery
            </h2>
            <Link href="/feed" className="text-xs font-medium text-[var(--accent)] hover:underline flex items-center">
              Live Feed <ChevronRight className="w-3 h-3 ml-0.5" />
            </Link>
          </div>
          
          {loading ? (
            <div className="grid grid-cols-3 gap-2 sm:gap-4">
               {[...Array(6)].map((_, i) => <div key={i} className="aspect-square bg-gray-50 animate-pulse rounded-[var(--radius-lg)] border border-[var(--border-default)]"></div>)}
            </div>
          ) : recentActions.length === 0 ? (
            <ActionPlaceholders />
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:gap-4">
              {recentActions.map(action => (
                <div 
                  key={action.id} 
                  onClick={() => setSelectedAction(action)}
                  className="aspect-square rounded-[var(--radius-lg)] overflow-hidden cursor-pointer group bg-[var(--bg-subtle)] relative border border-[var(--border-default)]"
                >
                  <img src={action.imageURL} alt={action.actionType} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                     <span className="text-white text-xs font-medium px-2 py-1 bg-black/50 rounded backdrop-blur-sm shadow-sm">{action.actionType}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

      </div>

      {/* ACTION DETAIL MODAL */}
      {selectedAction && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 min-h-screen">
          <div className="bg-[var(--bg-surface)] rounded-[var(--radius-xl)] w-full max-w-lg overflow-hidden border border-[var(--border-default)] shadow-xl relative animate-in fade-in zoom-in-95 duration-200">
            <button onClick={() => setSelectedAction(null)} className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center bg-black/40 hover:bg-black/60 text-white rounded-full transition-colors">
              <X className="w-4 h-4" />
            </button>
            <div className="w-full aspect-video bg-[var(--bg-subtle)] relative">
              <img src={selectedAction.imageURL} alt="Action" className="w-full h-full object-cover" />
            </div>
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                 <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 ring-1 ring-[var(--border-default)]">
                     <img src={selectedAction.userPhotoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${selectedAction.userDisplayName}`} alt={selectedAction.userDisplayName} className="w-full h-full object-cover" />
                   </div>
                   <div>
                     <h4 className="font-semibold text-sm text-[var(--text-primary)]">{selectedAction.userDisplayName}</h4>
                     <p className="text-xs text-[var(--text-muted)]">{formatDistanceToNow(getDate(selectedAction.createdAt), { addSuffix: true })}</p>
                   </div>
                 </div>
                 <span className="bg-[var(--bg-subtle)] border border-[var(--border-default)] px-2.5 py-1 rounded text-[10px] uppercase font-bold text-[var(--text-secondary)] tracking-wide">
                   {selectedAction.actionType}
                 </span>
              </div>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-4">{selectedAction.description}</p>
              {selectedAction.location && (
                <p className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" /> {selectedAction.location}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
