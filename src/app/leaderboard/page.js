"use client";

import { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import clsx from 'clsx';
import Link from 'next/link';

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('Global'); // Global | This Week

  useEffect(() => {
    const fetchLeaders = async () => {
      setLoading(true);
      try {
        const q = query(
          collection(db, 'users'),
          orderBy('greenCredits', 'desc'),
          limit(50)
        );
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setLeaders(data);
      } catch (error) {
        console.error("Error fetching leaders", error);
      } finally {
        setLoading(false);
      }
    };
    fetchLeaders();
  }, [tab]);
  // Note: "This Week" would require separate metric tracking, using global for both in demo

  const podium = leaders.slice(0, 3);
  const restOfList = leaders.slice(3);

  // Reorder podium to: 2nd, 1st, 3rd
  const orderedPodium = [];
  if (podium[1]) orderedPodium.push({ ...podium[1], place: 2 });
  if (podium[0]) orderedPodium.push({ ...podium[0], place: 1 });
  if (podium[2]) orderedPodium.push({ ...podium[2], place: 3 });

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-4 pt-6 pb-24">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 sticky top-14 bg-[var(--bg-base)]/90 backdrop-blur-md pb-4 z-30 pt-2 -mx-4 px-4 overflow-hidden">
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">Leaderboard</h1>
          
          <div className="bg-[var(--bg-subtle)] rounded-[var(--radius-lg)] p-1 flex items-center shrink-0">
            <button
              onClick={() => setTab('Global')}
              className={clsx(
                "px-4 py-1.5 text-sm font-medium transition-[var(--transition)]",
                tab === 'Global' ? "bg-[var(--bg-surface)] rounded-[var(--radius-md)] shadow-[0_1px_3px_rgba(0,0,0,0.06)] text-[var(--text-primary)]" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              )}
            >
              🌎 Global
            </button>
            <button
              onClick={() => setTab('This Week')}
              className={clsx(
                "px-4 py-1.5 text-sm font-medium transition-[var(--transition)]",
                tab === 'This Week' ? "bg-[var(--bg-surface)] rounded-[var(--radius-md)] shadow-[0_1px_3px_rgba(0,0,0,0.06)] text-[var(--text-primary)]" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              )}
            >
              📅 This Week
            </button>
          </div>
        </div>

        {loading ? (
          <div className="space-y-6">
            <div className="h-48 bg-[var(--bg-surface)] rounded-[var(--radius-xl)] animate-pulse border border-[var(--border-default)]"></div>
            <div className="h-64 bg-[var(--bg-surface)] rounded-[var(--radius-xl)] animate-pulse border border-[var(--border-default)]"></div>
          </div>
        ) : leaders.length === 0 ? (
          <div className="text-center py-16 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-xl)]">
            <div className="text-4xl mb-3">🏆</div>
            <h3 className="text-sm font-medium text-[var(--text-primary)] mb-1">No leaders yet</h3>
            <p className="text-xs text-[var(--text-muted)]">Be the first to log an action and top the charts!</p>
          </div>
        ) : (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* Top 3 Podium */}
            <div className="flex items-end justify-center gap-2 sm:gap-4 mt-8 px-2">
              {orderedPodium.map((leader) => {
                const isFirst = leader.place === 1;
                const isSecond = leader.place === 2;
                const isThird = leader.place === 3;
                
                return (
                  <Link 
                    href={`/profile/${leader.id}`} 
                    key={leader.id}
                    className={clsx(
                      "flex flex-col items-center justify-end rounded-[var(--radius-xl)] p-3 text-center transition-[var(--transition)] hover:scale-105 border flex-1 max-w-[140px]",
                      isFirst && "bg-yellow-50 border-yellow-200 h-48 sm:h-56 z-10 shadow-lg shadow-yellow-500/10",
                      isSecond && "bg-gray-50 border-gray-200 h-40 sm:h-48 mt-8",
                      isThird && "bg-orange-50 border-orange-200 h-36 sm:h-44 mt-12"
                    )}
                  >
                    <div className="text-3xl mb-2 sm:mb-4">
                      {isFirst && '🥇'}
                      {isSecond && '🥈'}
                      {isThird && '🥉'}
                    </div>
                    <div className={clsx("rounded-full overflow-hidden bg-white shrink-0 mx-auto", isFirst ? "w-14 h-14 sm:w-16 sm:h-16 ring-4 ring-yellow-100" : "w-10 h-10 sm:w-12 sm:h-12 ring-2 ring-white")}>
                      <img src={leader.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${leader.displayName}`} alt={leader.displayName} className="w-full h-full object-cover" />
                    </div>
                    <div className="mt-2 w-full">
                      <h3 className={clsx("font-semibold truncate w-full px-1", isFirst ? "text-sm text-yellow-900" : isSecond ? "text-xs text-gray-800" : "text-xs text-orange-900")}>
                        {leader.displayName}
                      </h3>
                      <div className={clsx("font-bold text-xs mt-0.5", isFirst ? "text-yellow-700" : isSecond ? "text-gray-600" : "text-orange-700")}>
                        {leader.greenCredits || 0} <span className="text-[10px]">CR</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* List from 4th place */}
            <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-xl)] overflow-hidden">
              {/* Header row */}
              <div className="flex items-center px-4 py-3 bg-[var(--bg-subtle)] border-b border-[var(--border-default)]">
                <div className="w-10 text-xs font-medium text-[var(--text-muted)] text-center">#</div>
                <div className="flex-1 text-xs font-medium text-[var(--text-muted)]">Citizen</div>
                <div className="w-20 text-xs font-medium text-[var(--text-muted)] text-right">Actions</div>
                <div className="w-24 text-xs font-medium text-[var(--text-muted)] text-right">Credits</div>
              </div>

              {/* Rows */}
              <div>
                {restOfList.map((leader, index) => {
                  const rank = index + 4;
                  const isYou = user?.uid === leader.id;
                  
                  return (
                    <Link href={`/profile/${leader.id}`} key={leader.id}>
                      <div className={clsx(
                        "flex items-center px-4 py-3 border-b border-[var(--border-default)] last:border-0 transition-[var(--transition)] hover:bg-[var(--bg-subtle)]",
                        isYou && "bg-[var(--accent-soft)] hover:bg-green-100"
                      )}>
                        <div className={clsx("w-10 text-center font-mono text-sm font-semibold", isYou ? "text-[var(--accent)]" : "text-[var(--text-muted)]")}>
                          {rank}
                        </div>
                        
                        <div className="flex-1 flex items-center gap-3 min-w-0 pr-2">
                          <img src={leader.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${leader.displayName}`} alt="" className="w-8 h-8 rounded-full bg-[var(--bg-subtle)] shrink-0 object-cover" />
                          <div className="min-w-0">
                            <h4 className={clsx("text-sm font-medium truncate", isYou ? "text-[var(--accent)]" : "text-[var(--text-primary)]")}>
                              {leader.displayName} {isYou && "(You)"}
                            </h4>
                            <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-medium">{leader.rank || 'Seedling'}</p>
                          </div>
                        </div>

                        <div className="w-20 text-right text-sm text-[var(--text-secondary)]">
                           {leader.totalActions || 0}
                        </div>

                        <div className="w-24 text-right flex items-center justify-end gap-1 font-mono text-sm">
                          <span className={clsx("font-semibold", isYou ? "text-[var(--accent)]" : "text-[var(--text-primary)]")}>{leader.greenCredits || 0}</span>
                          <span className="text-[10px] text-[var(--text-muted)]">CR</span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
