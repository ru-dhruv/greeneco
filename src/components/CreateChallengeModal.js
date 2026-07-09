"use client";

import { useState } from 'react';
import { X, Loader2, MapPin } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { ECO_ACTIVITIES } from '@/lib/activities';

const CATEGORIES = ECO_ACTIVITIES.map(a => a.label);

export default function CreateChallengeModal({ isOpen, onClose }) {
  const { user } = useAuth();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [actionType, setActionType] = useState(CATEGORIES[1]);
  const [targetCount, setTargetCount] = useState(10);
  const [daysDuration, setDaysDuration] = useState(7);
  const [city, setCity] = useState('');
  const [badgeReward, setBadgeReward] = useState(false);
  
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      const now = new Date();
      const endDate = new Date(now);
      endDate.setDate(now.getDate() + daysDuration);

      await addDoc(collection(db, 'challenges'), {
        title,
        description,
        actionType,
        targetCount: Number(targetCount),
        currentCount: 0,
        city,
        badgeReward,
        status: 'active',
        participants: [],
        createdBy: user.uid,
        creatorName: user.displayName || 'Eco Warrior',
        startDate: serverTimestamp(),
        endDate: Timestamp.fromDate(endDate),
        createdAt: serverTimestamp()
      });

      toast.success('Challenge created successfully!');
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Failed to create challenge.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/25 backdrop-blur-[2px] z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[var(--bg-surface)] rounded-[var(--radius-xl)] border border-[var(--border-default)] p-6 max-w-md w-full mx-4 shadow-[0_8px_32px_rgba(0,0,0,0.08)] flex flex-col max-h-[90vh]">
        
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Create Challenge</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-[var(--radius-md)] text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] transition-[var(--transition)]">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto w-full pr-1">
          <form id="create-challenge-form" onSubmit={handleSubmit} className="space-y-4">

            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">Challenge Title</label>
              <input required type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. 100 Trees in Seattle" className="w-full bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-md)] py-2 px-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--border-accent)] focus:ring-2 focus:ring-[var(--accent)]/10 transition-[var(--transition)]" />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">Action Type</label>
              <div className="relative">
                <select value={actionType} onChange={e => setActionType(e.target.value)} className="w-full appearance-none bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-md)] py-2 px-3 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-accent)] transition-[var(--transition)]">
                  {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[var(--text-muted)]">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/></svg>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">Target Goal</label>
                <input required type="number" min="1" value={targetCount} onChange={e => setTargetCount(e.target.value)} className="w-full bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-md)] py-2 px-3 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-accent)] transition-[var(--transition)]" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">Duration (Days)</label>
                <input required type="number" min="1" max="90" value={daysDuration} onChange={e => setDaysDuration(e.target.value)} className="w-full bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-md)] py-2 px-3 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-accent)] transition-[var(--transition)]" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">Description</label>
              <textarea required rows={2} value={description} onChange={e => setDescription(e.target.value)} placeholder="Motivate your community..." className="w-full bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-md)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--border-accent)] transition-[var(--transition)] resize-none" />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">Location (Optional)</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                <input type="text" value={city} onChange={e => setCity(e.target.value)} placeholder="City, Country" className="w-full pl-9 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-md)] py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--border-accent)] transition-[var(--transition)]" />
              </div>
            </div>

            <div className="flex items-center gap-2 mt-4">
              <input type="checkbox" id="badgeReward" checked={badgeReward} onChange={e => setBadgeReward(e.target.checked)} className="w-4 h-4 border-[var(--border-default)] rounded text-[var(--accent)] focus:ring-[var(--accent)] bg-[var(--bg-surface)] cursor-pointer" />
              <label htmlFor="badgeReward" className="text-sm font-medium text-[var(--text-primary)] cursor-pointer select-none">Include Badge Reward on completion</label>
            </div>

          </form>
        </div>

        <div className="flex gap-2 justify-end mt-6 pt-4 border-t border-[var(--border-default)]">
          <button type="button" onClick={onClose} className="bg-transparent text-[var(--text-muted)] rounded-[var(--radius-md)] px-4 py-2 text-sm font-medium hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] transition-[var(--transition)]">
            Cancel
          </button>
          <button form="create-challenge-form" type="submit" disabled={loading} className="bg-[var(--accent)] text-white rounded-[var(--radius-md)] px-4 py-2 text-sm font-medium hover:bg-[var(--accent-hover)] transition-[var(--transition)] active:scale-[0.98] disabled:opacity-50 flex items-center justify-center min-w-[120px]">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}
