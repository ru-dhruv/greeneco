"use client";

import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, orderBy, onSnapshot, getDocs, limit, setDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { MapPin, Users, Activity, Loader2, Heart, Award, CheckCircle2, Lock } from 'lucide-react';
import clsx from 'clsx';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import EditProfileModal from '@/components/EditProfileModal';
import FollowListModal from '@/components/FollowListModal';
import { toggleFollow } from '@/lib/followers';
import { ArrowLeft } from 'lucide-react';
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

const getActionPill = (type) => {
  const styles = {
    'Tree Planting': 'bg-green-50 text-green-700',
    'Cleanup': 'bg-sky-50 text-sky-700',
    'Recycling': 'bg-amber-50 text-amber-700',
    'Education': 'bg-violet-50 text-violet-700',
  };
  return styles[type] || 'bg-rose-50 text-rose-700';
};

const ALL_BADGES = [
  { id: 'first_tree', name: 'First Tree', emoji: '🌱', description: 'Log your first tree planting.', type: 'action_count', target: 1 },
  { id: 'weekend_warrior', name: 'Weekend Warrior', emoji: '⚔️', description: 'Log 5 actions on weekends.', type: 'weekend_actions', target: 5 },
  { id: 'cleanup_hero', name: 'Cleanup Hero', emoji: '🦸', description: 'Complete 10 Clean-up Drives.', type: 'cleanup_actions', target: 10 },
  { id: 'century_club', name: 'Century Club', emoji: '💯', description: 'Earn 100 total Green Credits.', type: 'total_credits', target: 100 },
  { id: 'streak_master', name: 'Streak Master', emoji: '🔥', description: 'Maintain a 5-day action streak.', type: 'streak_days', target: 5 },
  { id: 'community_leader', name: 'Community Leader', emoji: '👑', description: 'Follow 5 eco warriors.', type: 'following_count', target: 5 }
];

export default function UserProfilePage() {
  const params = useParams();
  
  let userId = params.userId;
  if ((!userId || userId === 'fallback' || userId === '%5BuserId%5D') && typeof window !== 'undefined') {
    const parts = window.location.pathname.split('/').filter(Boolean);
    if (parts.length >= 2 && parts[0] === 'profile') {
      userId = parts[1];
    }
  }

  const { user } = useAuth();
  const router = useRouter();
  
  const [profileUser, setProfileUser] = useState(null);
  const [userActions, setUserActions] = useState([]);
  const [userClubs, setUserClubs] = useState([]);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingActions, setLoadingActions] = useState(true);
  const [notFound, setNotFound] = useState(false);
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('Actions'); // Actions | Badges | Challenges
  
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [followModalType, setFollowModalType] = useState(null); // 'followers' | 'following'

  const isOwnProfile = user?.uid === userId;

  useEffect(() => {
    if (!userId) return;
    const unsubProfile = onSnapshot(doc(db, 'users', userId), async (docSnap) => {
      if (docSnap.exists()) {
        setProfileUser({ id: docSnap.id, ...docSnap.data() });
        setNotFound(false);
      } else {
        if (isOwnProfile && user) {
          // Auto-create document
          const newDoc = {
            displayName: user.displayName || 'Eco Warrior',
            photoURL: user.photoURL || '',
            bio: '',
            location: '',
            greenCredits: 0,
            rank: 'Seedling',
            totalActions: 0,
            treesPlanted: 0,
            cleanupsDone: 0,
            challengesCompleted: 0,
            followersCount: 0,
            followingCount: 0,
            createdAt: serverTimestamp()
          };
          await setDoc(doc(db, 'users', userId), newDoc);
          setProfileUser({ id: userId, ...newDoc });
          setNotFound(false);
        } else {
          setProfileUser(null);
          setNotFound(true);
        }
      }
      setLoadingProfile(false);
    });

    return () => unsubProfile();
  }, [userId, isOwnProfile, user]);

  useEffect(() => {
    if (!profileUser?.clubIds || profileUser.clubIds.length === 0) {
      setUserClubs([]);
      return;
    }
    const fetchClubs = async () => {
      const q = query(collection(db, 'clubs'), where('__name__', 'in', profileUser.clubIds.slice(0, 10)));
      const snap = await getDocs(q);
      setUserClubs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    };
    fetchClubs();
  }, [profileUser?.clubIds]);

  useEffect(() => {
    if (!userId) return;
    setLoadingActions(true);
    const unsubActions = onSnapshot(collection(db, 'actions'), (snap) => {
      let data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      data = data.filter(d => d.userId === userId);
      data.sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
        return dateB - dateA;
      });
      setUserActions(data);
      setLoadingActions(false);
    });

    return () => unsubActions();
  }, [userId]);

  useEffect(() => {
    if (!user || !userId || isOwnProfile) return;
    const unsubFollows = onSnapshot(doc(db, 'follows', `${user.uid}_${userId}`), (docSnap) => {
      setIsFollowing(docSnap.exists());
    });
    return () => unsubFollows();
  }, [user, userId, isOwnProfile]);

  const handleFollowClick = async () => {
    if (!user) {
      toast.error('Please sign in to follow users');
      return;
    }
    setFollowLoading(true);
    try {
      const result = await toggleFollow(user.uid, userId, isFollowing);
      if (result.success) {
        toast.success(isFollowing ? 'Unfollowed' : 'Following! 🌿');
      } else {
        toast.error(result.error || 'Failed to update follow');
      }
    } catch (error) {
      console.error("Failed to toggle follow:", error);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setFollowLoading(false);
    }
  };

  if (loadingProfile) {
    return (
      <AppLayout>
        <div className="max-w-2xl mx-auto px-4 pt-20">
           <div className="h-48 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-xl)] animate-pulse"></div>
        </div>
      </AppLayout>
    );
  }

  if (notFound) {
    return (
      <AppLayout>
        <div className="max-w-2xl mx-auto px-4 pt-20 text-center">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-xl)] py-16 flex flex-col items-center">
            <div className="text-4xl mb-4">🌱</div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">User not found 🌱</h2>
            <p className="text-sm text-[var(--text-muted)] mb-6">This profile doesn&apos;t exist or has been removed.</p>
            <button 
              onClick={() => router.back()}
              className="flex items-center gap-2 bg-[var(--bg-subtle)] hover:bg-[var(--border-default)] text-[var(--text-primary)] px-4 py-2 rounded-[var(--radius-md)] text-sm font-medium transition-[var(--transition)]"
            >
              <ArrowLeft className="w-4 h-4" /> Go Back
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!profileUser && !loadingProfile) {
     return null; // Should be handled by notFound, but just in case
  }

  const userBadgesList = profileUser.badges || [];

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-4 pt-6 pb-24 space-y-6">
        
        {/* PROFILE HEADER */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-xl)] p-6 shadow-sm overflow-hidden">
          
          <div className="flex justify-between items-start gap-4">
             <div className="flex gap-5 flex-1">
                <div className="w-16 h-16 rounded-full overflow-hidden bg-[var(--bg-subtle)] ring-2 ring-[var(--bg-surface)] shadow-sm shrink-0">
                  <img src={profileUser.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${profileUser.displayName}`} alt={profileUser.displayName} className="w-full h-full object-cover" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-xl font-semibold text-[var(--text-primary)] leading-none">{profileUser.displayName}</h1>
                    <span className={clsx("rounded-[var(--radius-full)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider", getRankPill(profileUser.rank || 'Seedling'))}>
                      {profileUser.rank || 'Seedling'}
                    </span>
                  </div>
                  
                  {profileUser.bio && (
                    <p className="text-sm text-[var(--text-secondary)] mt-2 leading-relaxed">
                      {profileUser.bio}
                    </p>
                  )}
                  
                  {profileUser.location && (
                    <p className="text-xs text-[var(--text-muted)] flex items-center gap-1 mt-2">
                       <MapPin className="w-3.5 h-3.5" /> {profileUser.location}
                    </p>
                  )}
                </div>
             </div>

             <div className="shrink-0 flex items-center">
               {isOwnProfile ? (
                 <button 
                   onClick={() => setIsEditModalOpen(true)}
                   className="bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-default)] rounded-[var(--radius-md)] px-4 py-1.5 text-sm font-medium hover:bg-[var(--bg-subtle)] hover:border-[var(--border-strong)] transition-[var(--transition)] active:scale-[0.98]"
                 >
                   Edit Profile
                 </button>
               ) : (
                 <button 
                   onClick={handleFollowClick}
                   disabled={followLoading}
                   className={clsx(
                     "rounded-[var(--radius-md)] px-4 py-1.5 text-sm font-medium transition-[var(--transition)] active:scale-[0.98] min-w-[100px] flex justify-center items-center gap-2 disabled:opacity-50",
                     isFollowing 
                       ? "bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-default)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-subtle)]" 
                       : "bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] border border-transparent"
                   )}
                 >
                   {followLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                   {!followLoading && (isFollowing ? 'Following' : 'Follow')}
                 </button>
               )}
             </div>
          </div>

          <div className="mt-6 pt-6 border-t border-[var(--border-default)] flex divide-x divide-[var(--border-default)] bg-[var(--bg-surface)]">
             <button onClick={() => setFollowModalType('followers')} className="flex-1 flex flex-col items-center hover:bg-[var(--bg-subtle)] transition-colors py-1 rounded-[var(--radius-md)]">
               <span className="text-lg font-semibold font-mono text-[var(--text-primary)]">{profileUser.followersCount || 0}</span>
               <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mt-0.5">Followers</span>
             </button>
             <button onClick={() => setFollowModalType('following')} className="flex-1 flex flex-col items-center hover:bg-[var(--bg-subtle)] transition-colors py-1 rounded-[var(--radius-md)]">
               <span className="text-lg font-semibold font-mono text-[var(--text-primary)]">{profileUser.followingCount || 0}</span>
               <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mt-0.5">Following</span>
             </button>
             <div className="flex-1 flex flex-col items-center py-1">
               <span className="text-lg font-semibold font-mono text-[var(--text-primary)]">{profileUser.totalActions || 0}</span>
               <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mt-0.5">Actions</span>
             </div>
             <div className="flex-1 flex flex-col items-center py-1">
               <span className="text-lg font-semibold font-mono text-[var(--accent)]">{profileUser.greenCredits || 0}</span>
               <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mt-0.5">Credits</span>
             </div>
          </div>

          {userClubs.length > 0 && (
            <div className="mt-6 pt-5 border-t border-[var(--border-default)] flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mr-1 text-nowrap">Member of</span>
              {userClubs.map(club => (
                <Link href={`/clubs/${club.id}`} key={club.id} className="bg-[var(--bg-subtle)] hover:bg-[var(--border-default)] transition-colors rounded-[var(--radius-md)] px-2 py-1 text-xs font-medium text-[var(--text-secondary)] flex items-center gap-1.5 border border-[var(--border-default)]">
                  <span className="text-sm">{club.coverEmoji}</span> {club.name}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* PROFILE TABS */}
        <div className="bg-[var(--bg-subtle)] rounded-[var(--radius-lg)] p-1 flex items-center w-full shadow-sm sticky top-14 z-20">
          {['Actions', 'Badges'].map(t => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={clsx(
                "flex-1 py-1.5 text-sm font-medium transition-[var(--transition)] text-center",
                activeTab === t ? "bg-[var(--bg-surface)] rounded-[var(--radius-md)] shadow-[0_1px_3px_rgba(0,0,0,0.06)] text-[var(--text-primary)]" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              )}
            >
              {t}
            </button>
          ))}
        </div>

        {/* TAB LISTINGS */}
        {activeTab === 'Actions' && (
          <div className="space-y-4">
            {loadingActions ? (
              <div className="h-40 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-xl)] animate-pulse"></div>
            ) : userActions.length === 0 ? (
              <div className="text-center py-16 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-xl)]">
                <div className="text-4xl mb-3">🌱</div>
                <h3 className="text-sm font-medium text-[var(--text-primary)] mb-2">No eco actions yet</h3>
                {isOwnProfile && (
                  <Link href="/feed" className="inline-block bg-[var(--accent)] text-white px-4 py-2 rounded-[var(--radius-md)] text-sm font-medium hover:opacity-90 transition-[var(--transition)]">
                    Log your first action →
                  </Link>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {userActions.map(action => {
                   const timeAgo = action.createdAt?.toDate ? formatDistanceToNow(action.createdAt.toDate(), { addSuffix: true }) : 'Just now';
                   return (
                     <div key={action.id} className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-xl)] p-4 flex flex-col gap-3 hover:border-[var(--border-strong)] transition-colors">
                       <div className="flex justify-between items-start">
                         <div>
                           <span className={clsx("rounded-[var(--radius-full)] px-2.5 py-1 text-[10px] uppercase font-bold tracking-wider", getActionPill(action.actionType))}>{action.actionType}</span>
                           <span className="text-xs text-[var(--text-muted)] ml-3">{timeAgo}</span>
                         </div>
                         <div className="bg-[var(--accent-soft)] text-[var(--accent)] text-xs font-semibold px-2 py-0.5 rounded-[var(--radius-full)] border border-[var(--border-accent)]/20 shadow-sm shadow-[var(--accent)]/5">
                            +{action.creditsEarned} 🌿
                         </div>
                       </div>
                       
                       <p className="text-sm text-[var(--text-secondary)]">{action.description}</p>
                       
                       {action.location && (
                          <p className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" /> {action.location}
                          </p>
                       )}
                       
                       {action.imageURL && (
                          <div className="w-full h-48 bg-[var(--bg-subtle)] rounded-[var(--radius-md)] overflow-hidden">
                             <img src={action.imageURL} alt="Proof" className="w-full h-full object-cover" />
                          </div>
                       )}

                       <div className="flex items-center gap-1 mt-1 text-[var(--text-muted)]">
                         <Heart className="w-4 h-4 fill-[var(--text-muted)]" />
                         <span className="text-xs font-medium">{action.likes || 0} likes</span>
                       </div>
                     </div>
                   );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'Badges' && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
             {ALL_BADGES.map(badge => {
                const earnedBadge = userBadgesList.find(b => b.badgeId === badge.id);
                const isEarned = !!earnedBadge;
                return (
                  <div key={badge.id} className={clsx(
                    "bg-[var(--bg-subtle)] rounded-[var(--radius-lg)] p-4 text-center border transition-[var(--transition)] flex flex-col items-center min-h-[140px] justify-center relative",
                    isEarned ? "border-[var(--accent)]/30 bg-[var(--bg-surface)] shadow-sm" : "border-transparent opacity-60 grayscale-[50%]"
                  )}>
                    <div className="text-4xl mb-2">{badge.emoji}</div>
                    <h4 className="text-xs font-semibold text-[var(--text-primary)]">{badge.name}</h4>
                    {!isEarned && <p className="text-[10px] text-[var(--text-muted)] mt-1">{badge.description}</p>}
                    
                    {isEarned && (
                      <div className="absolute top-2 right-2">
                        <CheckCircle2 className="w-4 h-4 text-[var(--accent)]" />
                      </div>
                    )}
                    {!isEarned && (
                      <div className="absolute top-2 right-2">
                        <Lock className="w-4 h-4 text-[var(--text-muted)]" />
                      </div>
                    )}
                  </div>
                );
             })}
          </div>
        )}
      </div>

      <EditProfileModal 
        isOpen={isEditModalOpen} 
        onClose={() => setIsEditModalOpen(false)} 
        currentProfile={profileUser}
      />

      <FollowListModal
        isOpen={!!followModalType}
        onClose={() => setFollowModalType(null)}
        type={followModalType}
        userId={userId}
        currentUserId={user?.uid}
      />
    </AppLayout>
  );
}
