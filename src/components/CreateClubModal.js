"use client";

import { useState } from 'react';
import { X, Loader2, MapPin } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';

const CATEGORIES = ['Tree Planting', 'Cleanup', 'Upcycling', 'Sustainable Transport', 'Energy Saving', 'Advocacy'];

export default function CreateClubModal({ isOpen, onClose }) {
  const { user, userProfile } = useAuth();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(CATEGORIES[1]);
  const [city, setCity] = useState('');
  const [coverEmoji, setCoverEmoji] = useState('🏕️');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      await addDoc(collection(db, 'clubs'), {
        name,
        description,
        category,
        city,
        coverEmoji,
        adminId: user.uid,
        adminName: userProfile?.displayName || user.displayName || 'Eco Warrior',
        members: [user.uid],
        memberCount: 1,
        isPrivate: false,
        totalActions: 0,
        createdAt: serverTimestamp()
      });

      toast.success('Club created successfully!');
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Failed to create club.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/25 backdrop-blur-[2px] z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[var(--bg-surface)] rounded-[var(--radius-xl)] border border-[var(--border-default)] p-6 max-w-md w-full mx-4 shadow-[0_8px_32px_rgba(0,0,0,0.08)] flex flex-col max-h-[90vh]">
        
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Create Club</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-[var(--radius-md)] text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] transition-[var(--transition)]">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto w-full pr-1">
          <form id="create-club-form" onSubmit={handleSubmit} className="space-y-4">
            
            <div className="flex flex-col items-center mb-6">
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-2 uppercase tracking-wider text-center w-full">Cover Emoji</label>
              <input 
                type="text" 
                maxLength={2}
                value={coverEmoji} 
                onChange={(e) => setCoverEmoji(e.target.value)}
                className="w-16 h-16 text-4xl text-center bg-[var(--bg-subtle)] border border-[var(--border-default)] rounded-[var(--radius-lg)] focus:outline-none focus:border-[var(--border-accent)] focus:ring-2 focus:ring-[var(--accent)]/10 transition-[var(--transition)] flex items-center justify-center"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">Club Name</label>
              <input required type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Earth Guardians" className="w-full bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-md)] py-2 px-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--border-accent)] focus:ring-2 focus:ring-[var(--accent)]/10 transition-[var(--transition)]" />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">Category</label>
              <div className="relative">
                <select value={category} onChange={e => setCategory(e.target.value)} className="w-full appearance-none bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-md)] py-2 px-3 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-accent)] transition-[var(--transition)]">
                  {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[var(--text-muted)]">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/></svg>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">Description</label>
              <textarea required rows={3} value={description} onChange={e => setDescription(e.target.value)} placeholder="What is this club about?..." className="w-full bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-md)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--border-accent)] transition-[var(--transition)] resize-none" />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">Location</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                <input required type="text" value={city} onChange={e => setCity(e.target.value)} placeholder="City, Country" className="w-full pl-9 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-md)] py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--border-accent)] transition-[var(--transition)]" />
              </div>
            </div>

          </form>
        </div>

        <div className="flex gap-2 justify-end mt-6 pt-4 border-t border-[var(--border-default)]">
          <button type="button" onClick={onClose} className="bg-transparent text-[var(--text-muted)] rounded-[var(--radius-md)] px-4 py-2 text-sm font-medium hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] transition-[var(--transition)]">
            Cancel
          </button>
          <button form="create-club-form" type="submit" disabled={loading} className="bg-[var(--accent)] text-white rounded-[var(--radius-md)] px-4 py-2 text-sm font-medium hover:bg-[var(--accent-hover)] transition-[var(--transition)] active:scale-[0.98] disabled:opacity-50 flex items-center justify-center min-w-[120px]">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}
