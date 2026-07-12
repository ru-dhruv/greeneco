"use client";

import { useRef, useCallback } from 'react';
import { Flame, Leaf, TreePine, Trash2, Award, TrendingUp, Share2, Download } from 'lucide-react';

const CO2_PER_ACTION = 2.5; // kg CO₂ equivalent saved per action (rough average)
const TREES_PER_10_ACTIONS = 1; // 10 actions ≈ 1 tree's annual impact

export default function ImpactCard({ profile }) {
  const cardRef = useRef(null);

  const totalActions = profile?.totalActions || 0;
  const greenCredits = profile?.greenCredits || 0;
  const treesPlanted = profile?.treesPlanted || 0;
  const cleanupsDone = profile?.cleanupsDone || 0;
  const streak = profile?.streak || 0;
  const co2Saved = (totalActions * CO2_PER_ACTION).toFixed(1);
  const treeEquivalent = Math.max(treesPlanted, Math.floor(totalActions / 10));

  const handleShare = useCallback(async () => {
    try {
      const { toPng } = await import('html-to-image');
      if (!cardRef.current) return;
      
      const dataUrl = await toPng(cardRef.current, {
        quality: 0.95,
        pixelRatio: 2,
        backgroundColor: '#14532d',
      });
      
      // Create download link
      const link = document.createElement('a');
      link.download = `greeneco-impact-${profile?.displayName?.replace(/\s+/g, '-') || 'card'}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to generate image:', err);
    }
  }, [profile]);

  return (
    <div className="relative group">
      {/* Share button */}
      <button
        onClick={handleShare}
        className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/20 transition-all opacity-0 group-hover:opacity-100"
        title="Download Impact Card"
      >
        <Download className="w-4 h-4" />
      </button>

      {/* The card itself */}
      <div
        ref={cardRef}
        className="rounded-[var(--radius-xl)] overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #14532d 0%, #1a3a2a 40%, #1c2e24 100%)',
        }}
      >
        {/* Header with glow accent */}
        <div className="px-6 pt-6 pb-4 relative">
          <div
            className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-20"
            style={{ background: 'radial-gradient(circle, #ea580c, transparent)' }}
          />
          <div className="flex items-center gap-3 relative z-10">
            <div className="w-12 h-12 rounded-full overflow-hidden ring-2 ring-white/20 shrink-0">
              <img
                src={profile?.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${profile?.displayName}`}
                alt=""
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h3 className="text-white font-semibold text-base leading-tight">{profile?.displayName || 'Eco Warrior'}</h3>
              <p className="text-emerald-300/70 text-xs font-medium mt-0.5">Your Eco Impact</p>
            </div>
          </div>
          
          {/* Streak badge */}
          {streak > 0 && (
            <div className="mt-4 flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-amber-500/20 border border-amber-400/30 rounded-[var(--radius-full)] px-3 py-1">
                <Flame className="w-4 h-4 text-amber-400 animate-flame" />
                <span className="text-amber-300 text-sm font-bold">{streak}-day streak</span>
              </div>
            </div>
          )}
        </div>

        {/* Stats grid */}
        <div className="px-6 pb-6 grid grid-cols-2 gap-3">
          <div className="bg-white/5 border border-white/10 rounded-[var(--radius-lg)] p-4 text-center">
            <Leaf className="w-5 h-5 text-emerald-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-white tracking-tight">{co2Saved}</div>
            <div className="text-[10px] text-emerald-300/60 uppercase tracking-wider font-semibold mt-1">kg CO₂ saved</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-[var(--radius-lg)] p-4 text-center">
            <TreePine className="w-5 h-5 text-green-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-white tracking-tight">{treeEquivalent}</div>
            <div className="text-[10px] text-emerald-300/60 uppercase tracking-wider font-semibold mt-1">trees equivalent</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-[var(--radius-lg)] p-4 text-center">
            <TrendingUp className="w-5 h-5 text-orange-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-white tracking-tight">{greenCredits}</div>
            <div className="text-[10px] text-emerald-300/60 uppercase tracking-wider font-semibold mt-1">green credits</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-[var(--radius-lg)] p-4 text-center">
            <Trash2 className="w-5 h-5 text-sky-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-white tracking-tight">{cleanupsDone}</div>
            <div className="text-[10px] text-emerald-300/60 uppercase tracking-wider font-semibold mt-1">cleanups done</div>
          </div>
        </div>

        {/* Footer branding */}
        <div className="px-6 py-3 border-t border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-sm">🌿</span>
            <span className="text-[10px] text-white/40 font-semibold tracking-wider uppercase">GreenCred</span>
          </div>
          <span className="text-[10px] text-white/30 font-medium">greeneco-navy.vercel.app</span>
        </div>
      </div>
    </div>
  );
}
