"use client";

import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import Link from 'next/link';
import clsx from 'clsx';

export default function FollowListModal({ isOpen, onClose, type, userId, currentUserId }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen || !userId) return;

    const fetchUsers = async () => {
      setLoading(true);
      try {
        let q;
        if (type === 'followers') {
          q = query(collection(db, 'follows'), where('followingId', '==', userId));
        } else {
          q = query(collection(db, 'follows'), where('followerId', '==', userId));
        }

        const followsSnap = await getDocs(q);
        const userIdsToFetch = followsSnap.docs.map(d => 
          type === 'followers' ? d.data().followerId : d.data().followingId
        );

        if (userIdsToFetch.length === 0) {
          setUsers([]);
          setLoading(false);
          return;
        }

        const userSnaps = await Promise.all(
          userIdsToFetch.map(id => getDoc(doc(db, 'users', id)))
        );

        const fetchedUsers = userSnaps
          .filter(snap => snap.exists())
          .map(snap => ({ id: snap.id, ...snap.data() }));

        setUsers(fetchedUsers);
      } catch (error) {
        console.error("Failed to fetch follows", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [isOpen, userId, type]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/25 backdrop-blur-[2px] z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[var(--bg-surface)] rounded-[var(--radius-xl)] border border-[var(--border-default)] p-4 sm:p-6 max-w-sm w-full mx-4 shadow-[0_8px_32px_rgba(0,0,0,0.08)] flex flex-col max-h-[80vh]">
        
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] capitalize">{type}</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-[var(--radius-md)] text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] transition-[var(--transition)]">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto w-full flex-grow pr-1">
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-6 h-6 text-[var(--accent)] animate-spin" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-10 text-[var(--text-muted)] text-sm font-medium">
              No {type} yet.
            </div>
          ) : (
            <div className="space-y-3">
              {users.map(u => (
                <div key={u.id} className="flex items-center justify-between group">
                  <a href={`/profile/${u.id}`} onClick={onClose} className="flex items-center gap-3 flex-grow min-w-0 pr-4">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-[var(--bg-subtle)] ring-1 ring-[var(--border-default)] flex-shrink-0 group-hover:ring-[var(--border-strong)] transition-colors">
                      <img src={u.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${u.displayName}`} alt={u.displayName} className="w-full h-full object-cover" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-medium text-sm text-[var(--text-primary)] truncate transition-colors">
                        {u.displayName}
                      </h4>
                      <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-medium mt-0.5">
                        {u.rank || 'Seedling'}
                      </p>
                    </div>
                  </a>

                  <a 
                    href={`/profile/${u.id}`} 
                    onClick={onClose} 
                    className="shrink-0 bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-default)] rounded-[var(--radius-md)] px-3 py-1 text-xs font-medium hover:bg-[var(--bg-subtle)] hover:border-[var(--border-strong)] transition-[var(--transition)]"
                  >
                    View
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
