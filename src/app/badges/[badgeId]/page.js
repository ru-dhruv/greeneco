"use client";

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import AppLayout from '@/components/AppLayout';
import { Loader2, ArrowLeft, Download, Share2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

const ALL_BADGES = {
  'first_tree': { name: 'First Tree', emoji: '🌱', description: 'Log your first tree planting.', type: 'action_count', target: 1 },
  'weekend_warrior': { name: 'Weekend Warrior', emoji: '⚔️', description: 'Log 5 actions on weekends.', type: 'weekend_actions', target: 5 },
  'cleanup_hero': { name: 'Cleanup Hero', emoji: '🦸', description: 'Complete 10 Clean-up Drives.', type: 'cleanup_actions', target: 10 },
  'century_club': { name: 'Century Club', emoji: '💯', description: 'Earn 100 total Green Credits.', type: 'total_credits', target: 100 },
  'streak_master': { name: 'Streak Master', emoji: '🔥', description: 'Maintain a 5-day action streak.', type: 'streak_days', target: 5 },
  'community_leader': { name: 'Community Leader', emoji: '👑', description: 'Follow 5 eco warriors.', type: 'following_count', target: 5 }
};

export default function BadgeDetailPage({ params }) {
  const { badgeId } = params;
  const { user, userProfile } = useAuth();
  const router = useRouter();
  const [earnedBadge, setEarnedBadge] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const certificateRef = useRef(null);

  useEffect(() => {
    const fetchBadge = async () => {
      if (!user) {
         setLoading(false);
         return;
      }
      try {
        const uDoc = await getDoc(doc(db, 'users', user.uid));
        if (uDoc.exists()) {
          const badges = uDoc.data().badges || [];
          const found = badges.find(b => b.badgeId === badgeId);
          if (found) {
            setEarnedBadge(found);
          }
        }
      } catch (err) {
         console.error(err);
      } finally {
         setLoading(false);
      }
    };
    fetchBadge();
  }, [user, badgeId]);

  const badgeInfo = ALL_BADGES[badgeId];

  const handleDownload = () => {
     // A simple fallback if no html2canvas is installed, 
     // browser print dialogue works best for these perfectly styled CSS certs.
     window.print();
  };

  const handleLinkedInShare = () => {
    const url = encodeURIComponent(window.location.origin);
    const text = encodeURIComponent(`I just earned the ${badgeInfo?.name} badge on GreenCred! 🌿🌍`);
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}&summary=${text}`, '_blank');
  };

  if (loading) {
    return <AppLayout><div className="flex justify-center py-32"><Loader2 className="w-8 h-8 text-[var(--accent)] animate-spin" /></div></AppLayout>;
  }

  if (!badgeInfo || !earnedBadge) {
    return (
      <AppLayout>
        <div className="max-w-sm mx-auto px-4 pt-20 text-center">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-xl)] p-8">
             <div className="text-4xl mb-4">🔒</div>
             <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Badge Locked</h2>
             <p className="text-sm text-[var(--text-muted)]">You haven&apos;t earned this badge yet, or it doesn&apos;t exist.</p>
             <button onClick={() => router.back()} className="mt-6 bg-[var(--bg-subtle)] px-4 py-2 text-sm font-medium rounded-[var(--radius-md)]">Go Back</button>
          </div>
        </div>
      </AppLayout>
    );
  }

  const issueDate = earnedBadge.earnedAt?.toDate ? new Date(earnedBadge.earnedAt.toDate()).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Recently';

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-4 pt-6 pb-24">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] text-sm font-medium transition-[var(--transition)] mb-8 hide-on-print">
          <ArrowLeft className="w-4 h-4" /> Go Back
        </button>

        <div className="flex flex-col items-center">
          
          {/* Certificate Card */}
          <div 
            ref={certificateRef}
            className="w-full max-w-sm bg-white border-2 border-[var(--border-default)] rounded-[var(--radius-xl)] p-10 shadow-sm print:shadow-none print:border-8 print:border-double"
            style={{ '@media print': { margin: '0', boxShadow: 'none' } }}
          >
            <p className="text-center text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)]">
              🌿 GreenCred
            </p>
            
            <div className="w-16 h-px bg-[var(--border-default)] mx-auto my-6"></div>
            
            <div className="text-6xl text-center mb-6 drop-shadow-sm">
              {badgeInfo.emoji}
            </div>
            
            <h2 className="text-2xl font-semibold text-center text-[var(--text-primary)] tracking-tight">
              {badgeInfo.name}
            </h2>
            
            <div className="mt-8 text-center">
              <p className="text-[10px] uppercase tracking-wider font-semibold text-[var(--text-muted)] mb-1">
                Awarded To
              </p>
              <p className="text-xl font-semibold text-[var(--accent)]">
                {userProfile?.displayName || user?.displayName || 'Eco Warrior'}
              </p>
            </div>
            
            <p className="text-sm text-[var(--text-secondary)] mt-6 text-center leading-relaxed px-4">
              For successfully verifying the completion of the following objective: <br/> 
              <span className="font-medium text-[var(--text-primary)]">{badgeInfo.description}</span>
            </p>
            
            <div className="mt-8 text-center">
               <p className="text-xs font-semibold text-[var(--text-muted)]">
                 Issued: {issueDate}
               </p>
            </div>
            
            <div className="w-16 h-px bg-[var(--border-default)] mx-auto my-6"></div>
            
            <p className="text-[10px] text-[var(--text-muted)] text-center font-medium mt-auto">
              Issued by GreenCred · HackMol 7.0 · NIT Jalandhar
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-center gap-3 mt-8 w-full max-w-sm hide-on-print">
            <button 
              onClick={handleLinkedInShare}
              className="flex-1 flex items-center justify-center gap-2 bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-default)] rounded-[var(--radius-md)] px-4 py-2.5 text-sm font-medium hover:bg-[var(--bg-subtle)] hover:border-[var(--border-strong)] transition-[var(--transition)] shadow-sm"
            >
              <Share2 className="w-4 h-4 text-[#0A66C2]" /> Share
            </button>
            <button 
              onClick={handleDownload}
              className="flex-1 flex items-center justify-center gap-2 bg-transparent text-[var(--text-muted)] rounded-[var(--radius-md)] px-4 py-2.5 text-sm font-medium hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] transition-[var(--transition)]"
            >
              <Download className="w-4 h-4" /> Download
            </button>
          </div>

        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * {
            visibility: hidden;
          }
          .hide-on-print, nav {
            display: none !important;
          }
          .max-w-sm {
            visibility: visible;
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            max-width: 100% !important;
            height: 100vh !important;
            display: flex;
            flex-direction: column;
            justify-content: center;
          }
          .max-w-sm * {
            visibility: visible;
          }
        }
      `}} />
    </AppLayout>
  );
}
