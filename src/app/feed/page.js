"use client";

import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, arrayUnion, arrayRemove, where } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { Heart, MapPin, Filter, Leaf, Plus } from 'lucide-react';
import clsx from 'clsx';
import Link from 'next/link';
import { ECO_ACTIVITIES } from '@/lib/activities';

const ACTION_TYPES = ['All', ...ECO_ACTIVITIES.map(a => a.label)];

const getActionPill = (type) => {
  const activity = ECO_ACTIVITIES.find(a => a.label === type);
  return activity ? activity.color : 'bg-gray-100 text-gray-700';
};

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

export default function FeedPage() {
  const { user } = useAuth();
  const [actions, setActions] = useState([]);
  const [filter, setFilter] = useState('All');
  const [feedTab, setFeedTab] = useState('All');
  const [followingIds, setFollowingIds] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const qFollowing = query(collection(db, 'follows'), where('followerId', '==', user.uid));
    const unsub = onSnapshot(qFollowing, (snap) => {
      setFollowingIds(snap.docs.map(d => d.data().followingId));
    });
    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (feedTab === 'Following' && followingIds.length === 0) {
      setActions([]);
      setLoading(false);
      return;
    }

    let q = query(collection(db, 'actions'), orderBy('createdAt', 'desc'));
    if (feedTab === 'Following') {
      const sliceIds = followingIds.slice(0, 30);
      q = query(collection(db, 'actions'), where('userId', 'in', sliceIds), orderBy('createdAt', 'desc'));
    }

    setLoading(true);
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const actionsData = [];
      snapshot.forEach((doc) => actionsData.push({ id: doc.id, ...doc.data() }));
      setActions(actionsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [feedTab, followingIds.join(',')]);

  const handleLike = async (actionId, currentLikes, likedBy) => {
    if (!user) return;
    const actionRef = doc(db, 'actions', actionId);
    const hasLiked = likedBy?.includes(user.uid);
    try {
      if (hasLiked) {
        await updateDoc(actionRef, {
          likes: currentLikes > 0 ? currentLikes - 1 : 0,
          likedBy: arrayRemove(user.uid)
        });
      } else {
        await updateDoc(actionRef, {
          likes: currentLikes + 1,
          likedBy: arrayUnion(user.uid)
        });
      }
    } catch (error) {
      console.error("Error liking action", error);
    }
  };

  const filteredActions = filter === 'All' ? actions : actions.filter(a => a.actionType === filter);

  return (
    <AppLayout>
      <div className="max-w-xl mx-auto px-4 pt-6 pb-24 relative min-h-screen">
        
        {/* Header & Tabs */}
        <div className="sticky top-14 bg-[var(--bg-base)]/90 backdrop-blur-md pb-4 z-30 pt-2 -mx-4 px-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">Feed</h1>
            
            <div className="bg-[var(--bg-subtle)] rounded-[var(--radius-lg)] p-1 flex items-center">
              <button
                onClick={() => setFeedTab('All')}
                className={clsx(
                  "px-4 py-1.5 text-sm font-medium transition-[var(--transition)]",
                  feedTab === 'All' ? "bg-[var(--bg-surface)] rounded-[var(--radius-md)] shadow-[0_1px_3px_rgba(0,0,0,0.06)] text-[var(--text-primary)]" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                )}
              >
                🌍 All
              </button>
              <button
                onClick={() => setFeedTab('Following')}
                className={clsx(
                  "px-4 py-1.5 text-sm font-medium transition-[var(--transition)]",
                  feedTab === 'Following' ? "bg-[var(--bg-surface)] rounded-[var(--radius-md)] shadow-[0_1px_3px_rgba(0,0,0,0.06)] text-[var(--text-primary)]" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                )}
              >
                👥 Following
              </button>
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
             <div className="flex items-center justify-center p-2 rounded-full text-[var(--text-muted)] mr-1 shrink-0">
               <Filter className="w-4 h-4" />
             </div>
             {ACTION_TYPES.map(type => (
               <button
                 key={type}
                 onClick={() => setFilter(type)}
                 className={clsx(
                   "whitespace-nowrap rounded-[var(--radius-full)] px-3 py-1.5 text-xs font-medium transition-[var(--transition)] shrink-0",
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

        {/* Action List */}
        {loading ? (
          <div className="space-y-6 mt-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-[var(--bg-surface)] rounded-[var(--radius-xl)] p-4 border border-[var(--border-default)] animate-pulse h-64"></div>
            ))}
          </div>
        ) : filteredActions.length === 0 ? (
          <div className="text-center py-16 mt-8 border border-[var(--border-default)] rounded-[var(--radius-xl)]">
            <div className="text-4xl mb-3">🌱</div>
            <h3 className="text-sm font-medium text-[var(--text-primary)] mb-1">
              {feedTab === 'Following' && followingIds.length === 0 ? "You aren't following anyone" : "No actions found"}
            </h3>
            <p className="text-xs text-[var(--text-muted)] mb-4">
              {feedTab === 'Following' && followingIds.length === 0 
                ? "Follow eco warriors to see their impact." 
                : "Be the first to log an action here."}
            </p>
            {feedTab === 'Following' && followingIds.length === 0 && (
              <Link href="/explore" className="bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-default)] rounded-[var(--radius-md)] px-4 py-2 text-sm font-medium hover:bg-[var(--bg-subtle)] hover:border-[var(--border-strong)] transition-[var(--transition)] inline-flex">
                Explore People →
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-6 mt-4">
            {filteredActions.map((action) => {
              const hasLiked = action.likedBy?.includes(user?.uid);
              const timeAgo = action.createdAt?.toDate ? formatDistanceToNow(action.createdAt.toDate(), { addSuffix: true }) : 'Just now';

              return (
                <div key={action.id} className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-xl)] overflow-hidden hover:border-[var(--border-strong)] transition-[var(--transition)] duration-150">
                  {/* Header */}
                  <div className="p-4 pb-3 flex items-start justify-between">
                     <div className="flex items-center gap-3">
                       <Link href={`/profile/${action.userId}`} className="w-8 h-8 rounded-full overflow-hidden bg-[var(--bg-subtle)] ring-2 ring-[var(--bg-surface)] shrink-0 group">
                         <img src={action.userPhotoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${action.userDisplayName}`} alt={action.userDisplayName} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                       </Link>
                       <div>
                         <div className="flex items-center gap-1.5 flex-wrap">
                           <a href={`/profile/${action.userId}`} className="text-sm font-medium text-[var(--text-primary)] hover:underline">{action.userDisplayName}</a>
                           <span className={clsx("rounded-[var(--radius-full)] px-2 py-[2px] text-[10px] font-medium leading-none whitespace-nowrap", getRankPill(action.userRank || 'Seedling'))}>
                              {action.userRank || 'Seedling'}
                           </span>
                         </div>
                         <p className="text-xs text-[var(--text-muted)] flex items-center gap-1 mt-1">
                           {timeAgo}
                         </p>
                       </div>
                     </div>
                     <span className={clsx("rounded-[var(--radius-full)] px-2.5 py-1 text-xs font-medium whitespace-nowrap", getActionPill(action.actionType))}>
                       {action.actionType}
                     </span>
                  </div>

                  {/* Image */}
                  {action.imageURL && (
                    <div className="w-full aspect-[4/3] bg-[var(--bg-subtle)]">
                      <img src={action.imageURL} alt="Proof" className="w-full h-full object-cover" />
                    </div>
                  )}

                  {/* Body */}
                  <div className="p-4 pt-3">
                    <p className="text-sm text-[var(--text-secondary)] line-clamp-2 leading-relaxed mb-2">{action.description}</p>
                    <div className="flex flex-wrap items-center gap-3">
                      {action.location && (
                        <p className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-[var(--text-muted)]" /> {action.location}
                        </p>
                      )}
                      {action.route && action.route.properties?.distanceKm > 0 && (
                        <p className="text-xs text-blue-500 font-medium flex items-center gap-1 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                          <MapPin className="w-3 h-3 text-blue-500" /> Tracked {action.route.properties.distanceKm.toFixed(2)} km
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="px-4 pb-4 pt-2 border-t border-[var(--border-default)] mt-2 flex items-center justify-between">
                    <button 
                      onClick={() => handleLike(action.id, action.likes || 0, action.likedBy || [])}
                      className="flex items-center gap-1.5 group select-none transition-[var(--transition)]"
                    >
                      <Heart className={clsx("w-5 h-5 transition-transform group-active:scale-125 duration-150", hasLiked ? "fill-[var(--error)] text-[var(--error)]" : "text-[var(--text-muted)] group-hover:text-[var(--text-primary)]")} />
                      <span className={clsx("text-xs font-medium", hasLiked ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]")}>{action.likes || 0}</span>
                    </button>
                    
                    <div className="bg-[var(--accent-soft)] text-[var(--accent)] text-xs font-semibold px-2.5 py-1 rounded-[var(--radius-full)] border border-[var(--border-accent)]/20 shadow-sm shadow-[var(--accent)]/5 flex items-center gap-1">
                      +{action.creditsEarned} <span className="text-[10px]">🌿</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* FAB */}
        <button 
          onClick={() => window.dispatchEvent(new CustomEvent('open-log-modal'))}
          className="fixed bottom-20 right-4 w-12 h-12 rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white shadow-[0_4px_16px_rgba(22,163,74,0.3)] flex items-center justify-center transition-[var(--transition)] hover:scale-105 active:scale-95 z-40 md:hidden"
        >
          <Plus className="w-5 h-5" />
        </button>

      {/* Desktop FAB Alternative (if needed later) */}
      <button 
        onClick={() => window.dispatchEvent(new CustomEvent('open-log-modal'))}
        className="hidden md:flex fixed bottom-8 right-8 w-auto px-5 h-12 rounded-[var(--radius-full)] bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white shadow-[0_4px_16px_rgba(22,163,74,0.3)] items-center justify-center gap-2 transition-[var(--transition)] hover:scale-105 active:scale-95 z-40 font-medium text-sm"
      >
        <Plus className="w-5 h-5" /> Log Action
      </button>

      </div>
    </AppLayout>
  );
}
