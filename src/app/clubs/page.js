"use client";

import { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, arrayUnion, arrayRemove, getDoc, writeBatch, serverTimestamp, setDoc } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';
import { Users, MapPin, Search, Plus, Filter } from 'lucide-react';
import clsx from 'clsx';
import Link from 'next/link';
import CreateClubModal from '@/components/CreateClubModal';
import { ECO_ACTIVITIES } from '@/lib/activities';

const CATEGORIES = ['All', ...ECO_ACTIVITIES.map(a => a.label), 'General'];

const getClubPill = (type) => {
  const activity = ECO_ACTIVITIES.find(a => a.label === type);
  return activity ? activity.color : 'bg-gray-100 text-gray-700';
};

export default function ClubsPage() {
  const { user } = useAuth();
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, 'clubs'),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setClubs(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleToggleJoin = async (e, club) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      toast.error('Please sign in to join clubs');
      return;
    }
    
    try {
      const isMember = club.members?.includes(user.uid);
      const clubRef = doc(db, 'clubs', club.id);
      const userRef = doc(db, 'users', user.uid);
      
      const batch = writeBatch(db);

      if (isMember) {
        batch.update(clubRef, { 
          members: arrayRemove(user.uid),
          memberCount: Math.max(0, (club.memberCount || 1) - 1)
        });
        // Use set with merge to avoid error if user doc doesn't exist
        batch.set(userRef, { clubIds: arrayRemove(club.id) }, { merge: true });
      } else {
        batch.update(clubRef, { 
          members: arrayUnion(user.uid),
          memberCount: (club.memberCount || 0) + 1
        });
        // Use set with merge to avoid error if user doc doesn't exist
        batch.set(userRef, { clubIds: arrayUnion(club.id) }, { merge: true });
        
        if (club.adminId && club.adminId !== user.uid) {
           const notifRef = doc(collection(db, 'notifications'));
           batch.set(notifRef, {
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
      
      await batch.commit();
      toast.success(isMember ? `Left ${club.name}` : `Joined ${club.name}! 🎉`);
    } catch (error) {
      console.error("Error toggling membership", error);
      toast.error('Failed to update membership. Please try again.');
    }
  };

  const filteredClubs = clubs.filter(c => {
    const matchesCategory = filter === 'All' || c.category === filter;
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          c.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 pt-6 pb-24 relative">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">Clubs</h1>
          
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 bg-[var(--accent)] text-white rounded-[var(--radius-md)] px-4 py-2 text-sm font-medium hover:bg-[var(--accent-hover)] transition-[var(--transition)] active:scale-[0.98]"
          >
            Create Club <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="mb-6 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search communities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-md)] text-sm focus:outline-none focus:border-[var(--border-accent)] focus:ring-2 focus:ring-[var(--accent)]/10 transition-[var(--transition)] placeholder:text-[var(--text-muted)] text-[var(--text-primary)]"
          />
        </div>

        {/* Filter Scroll Row */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-hide">
           <div className="flex items-center justify-center p-2 rounded-full text-[var(--text-muted)] shrink-0">
             <Filter className="w-4 h-4" />
           </div>
           {CATEGORIES.map(cat => (
             <button
               key={cat}
               onClick={() => setFilter(cat)}
               className={clsx(
                 "whitespace-nowrap px-3 py-1.5 rounded-[var(--radius-full)] text-xs font-medium transition-[var(--transition)] shrink-0",
                 filter === cat 
                   ? "bg-[var(--text-primary)] text-white" 
                   : "bg-[var(--bg-subtle)] text-[var(--text-muted)] hover:bg-[var(--border-default)]"
               )}
             >
               {cat}
             </button>
           ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => (
               <div key={i} className="h-48 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-xl)] animate-pulse"></div>
            ))}
          </div>
        ) : filteredClubs.length === 0 ? (
          <div className="text-center py-20 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-xl)]">
            <div className="text-4xl mb-3">🏕️</div>
            <h3 className="text-sm font-medium text-[var(--text-primary)] mb-1">No clubs found</h3>
            <p className="text-xs text-[var(--text-muted)] mt-1">Try adjusting your search or start your own.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredClubs.map(club => {
              const isMember = club.members?.includes(user?.uid);

              return (
                <Link href={`/clubs/${club.id}`} key={club.id} className="block group">
                  <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-xl)] p-5 hover:border-[var(--border-strong)] transition-[var(--transition)] h-full flex flex-col">
                    
                    {/* Top */}
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-[var(--bg-subtle)] rounded-[var(--radius-md)] flex flex-shrink-0 items-center justify-center text-3xl shadow-sm border border-[var(--border-default)]">
                        {club.coverEmoji || '🏕️'}
                      </div>
                      <div className="flex-1 min-w-0 pt-0.5">
                        <div className="flex justify-between items-start gap-2">
                          <h3 className="text-base font-semibold text-[var(--text-primary)] truncate">{club.name}</h3>
                          <span className={clsx("rounded-[var(--radius-full)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap shrink-0", getClubPill(club.category))}>
                            {club.category}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Middle */}
                    <div className="mt-4 mb-4 flex-grow">
                      <p className="text-sm text-[var(--text-secondary)] line-clamp-2 leading-relaxed">
                        {club.description}
                      </p>
                    </div>

                    {/* Footer */}
                    <div className="mt-auto pt-4 border-t border-[var(--border-default)] flex items-center justify-between">
                       <div className="flex items-center gap-3">
                         <span className="flex items-center gap-1 text-xs text-[var(--text-muted)] font-medium">
                           <Users className="w-3.5 h-3.5" /> {club.memberCount || 0}
                         </span>
                         {club.city && (
                           <span className="flex items-center gap-1 text-xs text-[var(--text-muted)] font-medium truncate max-w-[120px]">
                             <MapPin className="w-3.5 h-3.5" /> <span className="truncate">{club.city}</span>
                           </span>
                         )}
                       </div>

                       <button
                         onClick={(e) => handleToggleJoin(e, club)}
                         className={clsx(
                           "px-4 py-1.5 rounded-[var(--radius-md)] text-xs font-medium transition-[var(--transition)]",
                           isMember
                             ? "bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--border-accent)]/20 shadow-sm shadow-[var(--accent)]/5"
                             : "bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-default)] hover:bg-[var(--bg-subtle)] hover:border-[var(--border-strong)]"
                         )}
                       >
                         {isMember ? 'Joined' : 'Join'}
                       </button>
                    </div>

                  </div>
                </Link>
              );
            })}
          </div>
        )}

      </div>
      {isCreateModalOpen && <CreateClubModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} />}
    </AppLayout>
  );
}
