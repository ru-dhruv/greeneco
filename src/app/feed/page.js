"use client";

import { useState, useEffect, useRef } from 'react';
import AppLayout from '@/components/AppLayout';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, arrayUnion, arrayRemove, where, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { Heart, MapPin, Filter, Plus, MessageCircle, Send, ShieldCheck, Flame, ChevronDown, ChevronUp } from 'lucide-react';
import clsx from 'clsx';
import Link from 'next/link';
import { ECO_ACTIVITIES } from '@/lib/activities';

const ACTION_TYPES = ['All', ...ECO_ACTIVITIES.map(a => a.label)];

const getActivityData = (type) => {
  return ECO_ACTIVITIES.find(a => a.label === type);
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

function CommentSection({ actionId, user }) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    const q = query(
      collection(db, 'actions', actionId, 'comments'),
      orderBy('createdAt', 'asc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setComments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => {
      // Comments subcollection may not exist yet — that's fine
      console.log('Comments listener:', err.message);
    });
    return () => unsub();
  }, [actionId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !user || submitting) return;
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'actions', actionId, 'comments'), {
        userId: user.uid,
        displayName: user.displayName || 'Eco Warrior',
        photoURL: user.photoURL || '',
        text: newComment.trim(),
        createdAt: serverTimestamp()
      });
      setNewComment('');
    } catch (err) {
      console.error('Failed to add comment:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const visibleComments = expanded ? comments : comments.slice(-2);

  return (
    <div className="px-4 pb-3">
      {/* Comment count toggle */}
      {comments.length > 0 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors mb-2 flex items-center gap-1"
        >
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {comments.length === 1 ? '1 comment' : `${comments.length} comments`}
        </button>
      )}

      {/* Visible comments */}
      {visibleComments.length > 0 && (
        <div className="space-y-2 mb-3">
          {visibleComments.map(c => (
            <div key={c.id} className="flex items-start gap-2">
              <img
                src={c.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${c.displayName}`}
                alt=""
                className="w-5 h-5 rounded-full bg-[var(--bg-subtle)] shrink-0 mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs leading-snug">
                  <span className="font-semibold text-[var(--text-primary)]">{c.displayName}</span>{' '}
                  <span className="text-[var(--text-secondary)]">{c.text}</span>
                </p>
                <span className="text-[10px] text-[var(--text-muted)]">
                  {c.createdAt?.toDate ? formatDistanceToNow(c.createdAt.toDate(), { addSuffix: true }) : 'now'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Comment input */}
      {user && (
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            className="flex-1 text-xs bg-[var(--bg-subtle)] border border-[var(--border-default)] rounded-[var(--radius-full)] px-3 py-1.5 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)] transition-all"
          />
          <button
            type="submit"
            disabled={!newComment.trim() || submitting}
            className="w-7 h-7 rounded-full bg-[var(--accent)] text-white flex items-center justify-center hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      )}
    </div>
  );
}

export default function FeedPage() {
  const { user } = useAuth();
  const [actions, setActions] = useState([]);
  const [filter, setFilter] = useState('All');
  const [feedTab, setFeedTab] = useState('All');
  const [followingIds, setFollowingIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openComments, setOpenComments] = useState({});

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

  const toggleComments = (actionId) => {
    setOpenComments(prev => ({ ...prev, [actionId]: !prev[actionId] }));
  };

  const isVerified = (action) => {
    return action.imageURL && action.location;
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
             {ACTION_TYPES.map(type => {
               const activity = ECO_ACTIVITIES.find(a => a.label === type);
               const Icon = activity?.icon;
               return (
                 <button
                   key={type}
                   onClick={() => setFilter(type)}
                   className={clsx(
                     "whitespace-nowrap rounded-[var(--radius-full)] px-3 py-1.5 text-xs font-medium transition-[var(--transition)] shrink-0 flex items-center gap-1.5",
                     filter === type 
                       ? "bg-[var(--text-primary)] text-white" 
                       : "bg-[var(--bg-subtle)] text-[var(--text-muted)] hover:bg-[var(--border-default)]"
                   )}
                 >
                   {Icon && <Icon className="w-3.5 h-3.5" />}
                   {type}
                 </button>
               );
             })}
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
          <div className="space-y-5 mt-4">
            {filteredActions.map((action) => {
              const hasLiked = action.likedBy?.includes(user?.uid);
              const timeAgo = action.createdAt?.toDate ? formatDistanceToNow(action.createdAt.toDate(), { addSuffix: true }) : 'Just now';
              const activity = getActivityData(action.actionType);
              const Icon = activity?.icon;
              const verified = isVerified(action);
              const commentsOpen = openComments[action.id];

              return (
                <div key={action.id} className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-xl)] overflow-hidden hover:border-[var(--border-strong)] transition-[var(--transition)] duration-150 shadow-[var(--shadow-card)]">
                  {/* Header */}
                  <div className="p-4 pb-3 flex items-start justify-between">
                     <div className="flex items-center gap-3">
                       <Link href={`/profile/${action.userId}`} className="w-9 h-9 rounded-full overflow-hidden bg-[var(--bg-subtle)] ring-2 ring-[var(--bg-surface)] shrink-0 group">
                         <img src={action.userPhotoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${action.userDisplayName}`} alt={action.userDisplayName} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                       </Link>
                       <div>
                         <div className="flex items-center gap-1.5 flex-wrap">
                           <a href={`/profile/${action.userId}`} className="text-sm font-semibold text-[var(--text-primary)] hover:underline">{action.userDisplayName}</a>
                           {verified && (
                             <ShieldCheck className="w-3.5 h-3.5 text-[var(--green)]" />
                           )}
                           <span className={clsx("rounded-[var(--radius-full)] px-2 py-[2px] text-[10px] font-medium leading-none whitespace-nowrap", getRankPill(action.userRank || 'Seedling'))}>
                              {action.userRank || 'Seedling'}
                           </span>
                         </div>
                         <p className="text-xs text-[var(--text-muted)] flex items-center gap-1 mt-0.5">
                           {timeAgo}
                         </p>
                       </div>
                     </div>
                     {/* Category pill with icon */}
                     <span className={clsx("rounded-[var(--radius-full)] px-2.5 py-1 text-xs font-medium whitespace-nowrap flex items-center gap-1.5 border", activity?.color || 'bg-gray-100 text-gray-700 border-gray-200')}>
                       {Icon && <Icon className="w-3.5 h-3.5" />}
                       {action.actionType}
                     </span>
                  </div>

                  {/* Image */}
                  {action.imageURL && (
                    <div className="w-full aspect-[4/3] bg-[var(--bg-subtle)]">
                      <img src={action.imageURL} alt="Proof" className="w-full h-full object-cover" />
                    </div>
                  )}

                  {/* Strava-style stat strip */}
                  <div className="px-4 py-2.5 flex items-center gap-4 border-b border-[var(--border-default)] bg-[var(--bg-subtle)]/50">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-[var(--accent)]">+{action.creditsEarned}</span>
                      <span className="text-[10px] text-[var(--text-muted)] font-medium uppercase">credits</span>
                    </div>
                    {action.location && (
                      <div className="flex items-center gap-1 text-[var(--text-muted)]">
                        <MapPin className="w-3 h-3" />
                        <span className="text-[11px] font-medium truncate max-w-[150px]">{action.location}</span>
                      </div>
                    )}
                    {action.route && action.route.properties?.distanceKm > 0 && (
                      <div className="flex items-center gap-1 text-blue-600">
                        <MapPin className="w-3 h-3" />
                        <span className="text-[11px] font-semibold">{action.route.properties.distanceKm.toFixed(1)} km</span>
                      </div>
                    )}
                    {verified && (
                      <div className="flex items-center gap-1 ml-auto">
                        <ShieldCheck className="w-3.5 h-3.5 text-[var(--green)]" />
                        <span className="text-[10px] font-semibold text-[var(--green)] uppercase">Verified</span>
                      </div>
                    )}
                  </div>

                  {/* Body */}
                  <div className="p-4 pt-3">
                    <p className="text-sm text-[var(--text-secondary)] line-clamp-2 leading-relaxed">{action.description}</p>
                  </div>

                  {/* Footer: Like + Comment toggle */}
                  <div className="px-4 pb-3 flex items-center gap-4">
                    <button 
                      onClick={() => handleLike(action.id, action.likes || 0, action.likedBy || [])}
                      className="flex items-center gap-1.5 group select-none transition-[var(--transition)]"
                    >
                      <Heart className={clsx("w-5 h-5 transition-transform group-active:scale-125 duration-150", hasLiked ? "fill-[var(--error)] text-[var(--error)]" : "text-[var(--text-muted)] group-hover:text-[var(--text-primary)]")} />
                      <span className={clsx("text-xs font-medium", hasLiked ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]")}>{action.likes || 0}</span>
                    </button>
                    
                    <button
                      onClick={() => toggleComments(action.id)}
                      className="flex items-center gap-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                    >
                      <MessageCircle className={clsx("w-5 h-5", commentsOpen && "text-[var(--accent)]")} />
                      <span className="text-xs font-medium">Comment</span>
                    </button>
                  </div>

                  {/* Comments section (toggleable) */}
                  {commentsOpen && (
                    <div className="border-t border-[var(--border-default)]">
                      <CommentSection actionId={action.id} user={user} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* FAB */}
        <button 
          onClick={() => window.dispatchEvent(new CustomEvent('open-log-modal'))}
          className="fixed bottom-20 right-4 w-12 h-12 rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white shadow-[var(--shadow-glow-accent)] flex items-center justify-center transition-[var(--transition)] hover:scale-105 active:scale-95 z-40 md:hidden"
        >
          <Plus className="w-5 h-5" />
        </button>

      {/* Desktop FAB Alternative (if needed later) */}
      <button 
        onClick={() => window.dispatchEvent(new CustomEvent('open-log-modal'))}
        className="hidden md:flex fixed bottom-8 right-8 w-auto px-5 h-12 rounded-[var(--radius-full)] bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white shadow-[var(--shadow-glow-accent)] items-center justify-center gap-2 transition-[var(--transition)] hover:scale-105 active:scale-95 z-40 font-medium text-sm"
      >
        <Plus className="w-5 h-5" /> Log Action
      </button>

      </div>
    </AppLayout>
  );
}
