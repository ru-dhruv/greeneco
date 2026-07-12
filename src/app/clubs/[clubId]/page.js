"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, updateDoc, arrayUnion, arrayRemove, getDoc, collection, addDoc, serverTimestamp, query, where, orderBy, limit, setDoc } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';
import { Users, MapPin, Loader2, ArrowLeft, Calendar, Activity, CheckCircle2, X, Trophy } from 'lucide-react';
import clsx from 'clsx';
import Link from 'next/link';

export default function ClubDetailPage({ params }) {
  let clubId = params.clubId;
  if ((!clubId || clubId === 'fallback' || clubId === '%5BclubId%5D') && typeof window !== 'undefined') {
    const parts = window.location.pathname.split('/').filter(Boolean);
    if (parts.length >= 2 && parts[0] === 'clubs') {
      clubId = parts[1];
    }
  }

  const { user } = useAuth();
  const router = useRouter();
  
  const [club, setClub] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [membersData, setMembersData] = useState([]);
  const [actions, setActions] = useState([]);
  const [activeTab, setActiveTab] = useState('Activity'); // Activity | Leaderboard

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'clubs', clubId), (docSnap) => {
      if (docSnap.exists()) {
        setClub({ id: docSnap.id, ...docSnap.data() });
      } else {
        setClub(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [clubId]);

  useEffect(() => {
    if (!club?.members) return;
    const fetchMembers = async () => {
      try {
        const ids = club.members.slice(0, 12);
        const snaps = await Promise.all(ids.map(uid => getDoc(doc(db, 'users', uid))));
        setMembersData(snaps.filter(s => s.exists()).map(s => ({ id: s.id, ...s.data() })));
      } catch (err) {
        console.error("Failed to load members", err);
      }
    };
    fetchMembers();
  }, [club?.members]);

  useEffect(() => {
    if (!club?.members || club.members.length === 0) {
      setActions([]);
      return;
    }
    
    // Split members into chunks of 30 to bypass Firestore 'in' query limits
    const chunks = [];
    for (let i = 0; i < club.members.length; i += 30) {
      chunks.push(club.members.slice(i, i + 30));
    }
    
    const unsubs = [];
    const allActions = new Map();
    
    chunks.forEach(chunk => {
      const q = query(
        collection(db, 'actions'),
        where('userId', 'in', chunk),
        orderBy('createdAt', 'desc'),
        limit(20)
      );
      
      const unsub = onSnapshot(q, (snap) => {
        snap.docs.forEach(d => {
          allActions.set(d.id, { id: d.id, ...d.data() });
        });
        
        // Convert Map to array, sort by time desc, and slice top 20
        const sortedActions = Array.from(allActions.values())
          .sort((a, b) => {
            const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt || 0);
            const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt || 0);
            return timeB - timeA;
          })
          .slice(0, 20);
          
        setActions(sortedActions);
      });
      unsubs.push(unsub);
    });
    
    return () => {
      unsubs.forEach(u => u());
    };
  }, [club?.members]);

  const handleToggleJoin = async () => {
    if (!user || !club) {
      if (!user) toast.error('Please sign in to join clubs');
      return;
    }
    setActionLoading(true);
    try {
      const isMember = club.members?.includes(user.uid);
      const clubRef = doc(db, 'clubs', club.id);
      const userRef = doc(db, 'users', user.uid);
      
      if (isMember) {
        await updateDoc(clubRef, {
          members: arrayRemove(user.uid),
          memberCount: Math.max(0, (club.memberCount || 1) - 1)
        });
        // Use setDoc with merge to avoid error if user doc doesn't exist
        await setDoc(userRef, {
          clubIds: arrayRemove(club.id)
        }, { merge: true });
      } else {
        await updateDoc(clubRef, {
          members: arrayUnion(user.uid),
          memberCount: (club.memberCount || 0) + 1
        });
        // Use setDoc with merge to avoid error if user doc doesn't exist
        await setDoc(userRef, {
          clubIds: arrayUnion(club.id)
        }, { merge: true });
        
        if (club.adminId && club.adminId !== user.uid) {
          await addDoc(collection(db, 'notifications'), {
            userId: club.adminId,
            type: 'club_join',
            fromUserId: user.uid,
            fromUserName: user.displayName || 'Someone',
            fromUserAvatar: user.photoURL || '',
            message: `${user.displayName || 'Someone'} joined your club ${club.name}`,
            link: `/clubs/${club.id}`,
            read: false,
            createdAt: serverTimestamp()
          });
        }
      }
      toast.success(isMember ? `Left ${club.name}` : `Joined ${club.name}! 🎉`);
    } catch (error) {
      console.error("Error toggling club membership", error);
      toast.error('Failed to update membership. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <AppLayout><div className="flex justify-center items-center py-32"><Loader2 className="w-8 h-8 text-[var(--accent)] animate-spin" /></div></AppLayout>;
  }

  if (!club) {
    return (
      <AppLayout>
        <div className="text-center py-20"><h2 className="text-xl font-semibold text-[var(--text-primary)]">Club not found</h2></div>
      </AppLayout>
    );
  }

  const isMember = club.members?.includes(user?.uid);
  
  // Club leaderboard: sort members by greenCredits descending
  const leaderboardData = [...membersData].sort((a, b) => (b.greenCredits || 0) - (a.greenCredits || 0));

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-8 px-4 pt-6 pb-24">
        
        <button onClick={() => router.push('/clubs')} className="flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] font-medium transition-[var(--transition)] text-sm">
          <ArrowLeft className="w-4 h-4" /> Back to Clubs
        </button>

        {/* Hero Section */}
        <div className="bg-[var(--bg-surface)] rounded-[var(--radius-xl)] p-6 sm:p-10 shadow-[var(--shadow-card)] border border-[var(--border-default)] flex flex-col items-center text-center relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-32 bg-[var(--bg-subtle)] z-0"></div>
          
          <div className="relative z-10 w-32 h-32 rounded-[var(--radius-xl)] border-4 border-[var(--bg-surface)] shadow-sm overflow-hidden bg-[var(--bg-surface)] flex items-center justify-center text-6xl transition-[var(--transition)] bg-[var(--bg-subtle)]">
            <span className="group-hover:scale-110 transition-transform">{club.coverEmoji || '🏕️'}</span>
          </div>
          
          <div className="relative z-10 w-full mt-6">
            <div className="flex justify-center items-center gap-2 mb-3">
              <span className="px-3 py-1 rounded-[var(--radius-full)] text-[10px] uppercase tracking-wider font-semibold bg-[var(--bg-subtle)] text-[var(--text-secondary)] border border-[var(--border-default)]">
                {club.category}
              </span>
              {club.isPrivate && (
                <span className="px-3 py-1 rounded-[var(--radius-full)] text-[10px] uppercase tracking-wider font-semibold bg-[var(--text-primary)] text-white">Private</span>
              )}
            </div>
            
            <h1 className="text-2xl sm:text-4xl font-semibold text-[var(--text-primary)] tracking-tight">{club.name}</h1>
            
            <p className="text-[var(--text-secondary)] text-sm sm:text-base mt-4 max-w-2xl mx-auto leading-relaxed">
              {club.description}
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
              {club.city && (
                <p className="text-[var(--text-secondary)] flex items-center gap-1.5 text-xs font-medium bg-[var(--bg-subtle)] px-3 py-1.5 rounded-[var(--radius-md)] border border-[var(--border-default)]">
                  <MapPin className="w-3.5 h-3.5 text-[var(--text-muted)]" /> {club.city}
                </p>
              )}
              <p className="text-[var(--text-secondary)] flex items-center gap-1.5 text-xs font-medium bg-[var(--bg-subtle)] px-3 py-1.5 rounded-[var(--radius-md)] border border-[var(--border-default)]">
                <Users className="w-3.5 h-3.5 text-[var(--text-muted)]" /> {club.memberCount || 0} Members
              </p>
              <p className="text-[var(--text-secondary)] flex items-center gap-1.5 text-xs font-medium bg-[var(--bg-subtle)] px-3 py-1.5 rounded-[var(--radius-md)] border border-[var(--border-default)]">
                <Calendar className="w-3.5 h-3.5 text-[var(--text-muted)]" /> Since {club.createdAt?.toDate ? new Date(club.createdAt.toDate()).getFullYear() : 'Now'}
              </p>
            </div>

            <div className="mt-8">
              <button
                onClick={handleToggleJoin}
                disabled={actionLoading}
                className={clsx(
                  "px-8 py-2.5 rounded-[var(--radius-md)] font-medium text-sm transition-[var(--transition)] active:scale-95 flex items-center justify-center gap-2 mx-auto sm:w-auto w-full",
                  isMember 
                    ? "bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-default)] hover:bg-[var(--bg-subtle)] hover:border-[var(--border-strong)]" 
                    : "bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] shadow-[var(--shadow-glow-accent)]"
                )}
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {!actionLoading && isMember && <CheckCircle2 className="w-4 h-4 text-[var(--green)]" />}
                {isMember ? 'Joined' : 'Join Club'}
              </button>
            </div>
          </div>
        </div>

        {/* Tabs: Activity | Leaderboard */}
        <div className="bg-[var(--bg-subtle)] rounded-[var(--radius-lg)] p-1 flex items-center w-full shadow-sm">
          {['Activity', 'Leaderboard'].map(t => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={clsx(
                "flex-1 py-2 text-sm font-medium transition-[var(--transition)] text-center flex items-center justify-center gap-2",
                activeTab === t ? "bg-[var(--bg-surface)] rounded-[var(--radius-md)] shadow-[0_1px_3px_rgba(0,0,0,0.06)] text-[var(--text-primary)]" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              )}
            >
              {t === 'Leaderboard' && <Trophy className="w-4 h-4" />}
              {t === 'Activity' && <Activity className="w-4 h-4" />}
              {t}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          
          {/* Members Panel */}
          <div className="space-y-6 md:col-span-1">
            <div className="bg-[var(--bg-surface)] rounded-[var(--radius-xl)] p-6 shadow-[var(--shadow-card)] border border-[var(--border-default)]">
              <h3 className="font-semibold text-sm text-[var(--text-primary)] flex items-center justify-between mb-4">
                <span className="flex items-center gap-2">Members</span>
                <span className="text-[10px] font-semibold bg-[var(--bg-subtle)] border border-[var(--border-default)] px-2 py-0.5 rounded-[var(--radius-md)] text-[var(--text-secondary)]">{club.memberCount}</span>
              </h3>
              
              <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-4 gap-2">
                {membersData.map(m => (
                  <Link href={`/profile/${m.id}`} key={m.id} title={m.displayName}>
                    <div className="aspect-square rounded-full overflow-hidden bg-[var(--bg-subtle)] ring-1 ring-[var(--border-default)] hover:ring-[var(--border-strong)] transition-[var(--transition)] shadow-sm">
                      <img src={m.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${m.displayName}`} alt={m.displayName} className="w-full h-full object-cover" />
                    </div>
                  </Link>
                ))}
              </div>
              {club.memberCount > 12 && (
                <button className="w-full mt-4 py-1.5 bg-[var(--bg-subtle)] hover:bg-[var(--border-default)] text-[var(--text-primary)] text-xs font-medium rounded-[var(--radius-md)] transition-[var(--transition)]">
                  View All Members
                </button>
              )}
            </div>
          </div>

          {/* Content: Activity or Leaderboard */}
          <div className="md:col-span-2 space-y-6">
            
            {activeTab === 'Activity' && (
              <>
                <h2 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
                  <Activity className="w-5 h-5 text-[var(--text-muted)]" />
                  Club Activity
                </h2>
                
                {actions.length === 0 ? (
                  <div className="text-center py-16 bg-[var(--bg-surface)] rounded-[var(--radius-xl)] border border-[var(--border-default)]">
                    <Activity className="w-10 h-10 text-[var(--border-default)] mx-auto mb-3" />
                    <h3 className="text-sm font-semibold text-[var(--text-primary)]">No recent activity</h3>
                    <p className="text-xs text-[var(--text-muted)] mt-1">Actions by club members appear here.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {actions.map(action => (
                       <Link href={`/feed`} key={action.id} className="block bg-[var(--bg-surface)] rounded-[var(--radius-lg)] p-4 shadow-[var(--shadow-card)] border border-[var(--border-default)] hover:border-[var(--border-strong)] transition-[var(--transition)]">
                        <div className="flex items-center gap-3">
                          <img src={action.userPhotoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${action.userDisplayName}`} alt="" className="w-10 h-10 rounded-full ring-1 ring-[var(--border-default)] bg-[var(--bg-subtle)] object-cover" />
                          <div>
                            <p className="text-sm font-semibold text-[var(--text-primary)]">{action.userDisplayName} <span className="font-normal text-[var(--text-secondary)] ml-1">logged {action.actionType}</span></p>
                            <p className="text-[10px] text-[var(--accent)] bg-[var(--accent-soft)] inline-block px-2 py-0.5 rounded-[var(--radius-full)] mt-1 font-semibold border border-[var(--accent)]/20 shadow-sm">+{action.creditsEarned}🌿</p>
                          </div>
                        </div>
                       </Link>
                    ))}
                  </div>
                )}
              </>
            )}

            {activeTab === 'Leaderboard' && (
              <>
                <h2 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-500" />
                  Club Leaderboard
                </h2>

                {leaderboardData.length === 0 ? (
                  <div className="text-center py-16 bg-[var(--bg-surface)] rounded-[var(--radius-xl)] border border-[var(--border-default)]">
                    <Trophy className="w-10 h-10 text-[var(--border-default)] mx-auto mb-3" />
                    <h3 className="text-sm font-semibold text-[var(--text-primary)]">No members yet</h3>
                    <p className="text-xs text-[var(--text-muted)] mt-1">Join the club to appear on the leaderboard!</p>
                  </div>
                ) : (
                  <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-xl)] overflow-hidden shadow-[var(--shadow-card)]">
                    {/* Header */}
                    <div className="flex items-center px-4 py-3 bg-[var(--bg-subtle)] border-b border-[var(--border-default)]">
                      <div className="w-10 text-xs font-medium text-[var(--text-muted)] text-center">#</div>
                      <div className="flex-1 text-xs font-medium text-[var(--text-muted)]">Member</div>
                      <div className="w-20 text-xs font-medium text-[var(--text-muted)] text-right">Actions</div>
                      <div className="w-24 text-xs font-medium text-[var(--text-muted)] text-right">Credits</div>
                    </div>

                    {/* Rows */}
                    <div>
                      {leaderboardData.map((member, index) => {
                        const rank = index + 1;
                        const isYou = user?.uid === member.id;
                        const medalEmoji = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null;

                        return (
                          <Link href={`/profile/${member.id}`} key={member.id}>
                            <div className={clsx(
                              "flex items-center px-4 py-3 border-b border-[var(--border-default)] last:border-0 transition-[var(--transition)] hover:bg-[var(--bg-subtle)]",
                              isYou && "bg-[var(--accent-soft)] hover:bg-orange-50",
                              rank <= 3 && "bg-amber-50/30"
                            )}>
                              <div className={clsx("w-10 text-center font-mono text-sm font-semibold", isYou ? "text-[var(--accent)]" : "text-[var(--text-muted)]")}>
                                {medalEmoji || rank}
                              </div>
                              
                              <div className="flex-1 flex items-center gap-3 min-w-0 pr-2">
                                <img src={member.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${member.displayName}`} alt="" className="w-8 h-8 rounded-full bg-[var(--bg-subtle)] shrink-0 object-cover ring-1 ring-[var(--border-default)]" />
                                <div className="min-w-0">
                                  <h4 className={clsx("text-sm font-medium truncate", isYou ? "text-[var(--accent)]" : "text-[var(--text-primary)]")}>
                                    {member.displayName} {isYou && "(You)"}
                                  </h4>
                                  <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-medium">{member.rank || 'Seedling'}</p>
                                </div>
                              </div>

                              <div className="w-20 text-right text-sm text-[var(--text-secondary)]">
                                 {member.totalActions || 0}
                              </div>

                              <div className="w-24 text-right flex items-center justify-end gap-1 font-mono text-sm">
                                <span className={clsx("font-semibold", isYou ? "text-[var(--accent)]" : "text-[var(--text-primary)]")}>{member.greenCredits || 0}</span>
                                <span className="text-[10px] text-[var(--text-muted)]">CR</span>
                              </div>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}

          </div>

        </div>
      </div>
    </AppLayout>
  );
}
