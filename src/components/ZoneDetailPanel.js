"use client";

import { X, Trophy, Camera, Share2, Sparkles, MapPin, Loader2, Target, CheckCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { clsx } from 'clsx';
import { getDate } from '@/lib/dateUtils';

const MISSIONS = {
  'Dead Zone': [
    { title: 'Emergency Cleanup', desc: 'Log 5 cleanup actions here.', target: 5, actionType: 'Cleanup' },
    { title: 'First Responder', desc: 'Be the first to log any action here.', target: 1, actionType: 'Any' },
    { title: 'Toxic Avenger', desc: 'Collect 10kg waste from this area.', target: 10, actionType: 'Waste' }
  ],
  'Polluted Zone': [
    { title: 'Clear the Air', desc: 'Log 3 cleanup actions here.', target: 3, actionType: 'Cleanup' },
    { title: 'Green Start', desc: 'Plant the first tree in this zone.', target: 1, actionType: 'Tree Planting' },
    { title: 'Squad Cleanup', desc: 'Get 3 warriors to act here together.', target: 3, actionType: 'Any' }
  ],
  'Clean Zone': [
    { title: 'Tree Starter', desc: 'Plant 3 trees here.', target: 3, actionType: 'Tree Planting' },
    { title: 'Sustain the Gain', desc: 'Log actions 3 days in a row.', target: 3, actionType: 'Streak' },
    { title: 'Community Builder', desc: 'Create a challenge for this zone.', target: 1, actionType: 'Challenge' }
  ],
  'Green Zone': [
    { title: 'Biodiversity Boost', desc: 'Log 5 wildlife/plant actions.', target: 5, actionType: 'Any' },
    { title: 'Guardian', desc: 'Maintain zone for 7 consecutive days.', target: 7, actionType: 'Streak' },
    { title: 'Inspire Others', desc: 'Get 5 new warriors to join.', target: 5, actionType: 'Invite' }
  ],
  'Biodiversity Zone': [
    { title: 'Ecosystem Steward', desc: 'Sustain the biome for 30 days.', target: 30, actionType: 'Streak' },
    { title: 'Wildlife Spotter', desc: 'Log 5 animal or bird sightings.', target: 5, actionType: 'Any' },
    { title: 'Master Guardian', desc: 'Top the zone leaderboard.', target: 1, actionType: 'Leaderboard' }
  ]
};

const getAQILabel = (aqi) => {
  if (aqi <= 50) return { label: 'Good', color: 'bg-emerald-500' };
  if (aqi <= 100) return { label: 'Satisfactory', color: 'bg-green-500' };
  if (aqi <= 200) return { label: 'Moderate', color: 'bg-yellow-500' };
  if (aqi <= 300) return { label: 'Poor', color: 'bg-orange-500' };
  if (aqi <= 400) return { label: 'Very Poor', color: 'bg-red-500' };
  return { label: 'Severe', color: 'bg-rose-900' };
};

export default function ZoneDetailPanel({ zone, isOpen, onClose, onLogAction }) {
  if (!isOpen || !zone) return null;

  const aqiInfo = getAQILabel(zone.currentAQI);
  const missions = MISSIONS[zone.currentZoneType] || MISSIONS['Polluted Zone'];
  const progressPct = Math.min(100, Math.max(0, zone.progressToNextZone || 0));

  const handleShare = () => {
    const text = `I helped transform ${zone.name} into a ${zone.currentZoneType} on GreenCred! 🌍 Check it out: https://greeneco-b3a43.web.app/map`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      alert('Copied to clipboard!');
    }
  };

  return (
    <div className={`fixed inset-x-0 bottom-0 md:inset-y-0 md:left-auto md:right-0 md:w-96 bg-[var(--bg-surface)] border-t md:border-t-0 md:border-l border-[var(--border-default)] shadow-2xl z-[500] transition-transform duration-300 transform ${isOpen ? 'translate-y-0 md:translate-x-0' : 'translate-y-full md:translate-x-full'} flex flex-col max-h-[85vh] md:max-h-none rounded-t-3xl md:rounded-none`}>
      
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[var(--border-default)] shrink-0 bg-[var(--bg-subtle)] md:bg-transparent rounded-t-3xl md:rounded-none">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{zone.currentZoneType === 'Dead Zone' ? '💀' : zone.currentZoneType === 'Polluted Zone' ? '🏭' : zone.currentZoneType === 'Clean Zone' ? '🧹' : zone.currentZoneType === 'Green Zone' ? '🌿' : '🦋'}</span>
          <div>
            <h2 className="text-lg font-bold text-[var(--text-primary)] leading-none">{zone.name}</h2>
            <p className="text-xs font-semibold text-[var(--text-secondary)] mt-1 uppercase tracking-wider">{zone.currentZoneType}</p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 -mr-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] rounded-[var(--radius-md)] transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 hide-scrollbar">
        
        {/* AQI Gauge */}
        <div className="bg-[var(--bg-subtle)] border border-[var(--border-default)] rounded-[var(--radius-xl)] p-4 shadow-sm">
          <div className="flex justify-between items-end mb-2">
             <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Air Quality</span>
             <span className="text-2xl font-black text-[var(--text-primary)] tracking-tighter leading-none">{zone.currentAQI}</span>
          </div>
          
          <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden flex mb-2 relative">
             <div className={`h-full ${aqiInfo.color} relative z-10`} style={{ width: `${Math.min(100, (zone.currentAQI / 500) * 100)}%` }} />
             {/* Gradient Background under gauge */}
             <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 via-yellow-500 to-red-600 opacity-20 z-0" />
          </div>
          <p className="text-xs font-bold text-right py-0.5"><span className={clsx("px-2 py-0.5 rounded text-white shadow-sm", aqiInfo.color)}>{aqiInfo.label}</span></p>
        </div>

        {/* Eco Score & Progress */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-xl)] p-4 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10"><Sparkles className="w-16 h-16" /></div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1">Eco Score</h3>
          <p className="text-3xl font-black text-[var(--accent)] mb-1">{zone.ecoScore} <span className="text-sm font-medium text-[var(--text-muted)]">pts</span></p>
          <p className="text-xs text-[var(--text-muted)] mb-4">From {zone.totalActions || 0} local actions</p>
          
          <div>
            <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider mb-1.5 text-[var(--text-secondary)]">
              <span>Next Zone Upgrade</span>
              <span>{Math.round(progressPct)}%</span>
            </div>
            <div className="h-1.5 w-full bg-[var(--bg-subtle)] rounded-full overflow-hidden">
               <div className="h-full bg-[var(--accent)] rounded-full transition-all duration-1000" style={{ width: `${progressPct}%` }} />
            </div>
          </div>
        </div>

        {/* Before / After */}
        <div className="space-y-3">
           <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1.5">
             <Camera className="w-4 h-4" /> Visual Transformation
           </h3>
           <div className="grid grid-cols-2 gap-2">
             <div className="aspect-square bg-[var(--bg-subtle)] border border-[var(--border-default)] rounded-[var(--radius-lg)] relative overflow-hidden group">
               {zone.beforeImageURL ? (
                 <img src={zone.beforeImageURL} className="w-full h-full object-cover group-hover:scale-105 transition-transform" alt="Before" />
               ) : (
                 <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                    <Camera className="w-6 h-6 mb-1 opacity-50" />
                    <span className="text-[10px] uppercase font-bold text-center px-2 text-balance leading-tight">No before photo</span>
                 </div>
               )}
               <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm border border-white/10 uppercase tracking-widest">Before 📸</div>
             </div>
             
             <div className="aspect-square bg-[var(--bg-subtle)] border border-[var(--border-default)] rounded-[var(--radius-lg)] relative overflow-hidden group">
               {zone.afterImageURL ? (
                 <img src={zone.afterImageURL} className="w-full h-full object-cover group-hover:scale-105 transition-transform" alt="After" />
               ) : (
                 <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                    <Sparkles className="w-6 h-6 mb-1 opacity-50 text-[var(--accent)]" />
                    <span className="text-[10px] uppercase font-bold text-center px-2 text-balance leading-tight">No after photo</span>
                 </div>
               )}
               <div className="absolute top-2 left-2 bg-[var(--accent)]/90 backdrop-blur-sm text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm border border-white/10 uppercase tracking-widest">After ✨</div>
             </div>
           </div>
           
           {(zone.beforeImageURL || zone.afterImageURL) && (
             <button onClick={handleShare} className="w-full flex items-center justify-center gap-2 py-2 text-xs font-bold text-[var(--accent)] bg-[var(--accent-soft)] hover:bg-[var(--accent)] hover:text-white border border-[var(--border-accent)]/20 rounded-[var(--radius-md)] transition-colors active:scale-95">
                <Share2 className="w-3.5 h-3.5" /> Share Transformation
             </button>
           )}
        </div>

        {/* Missions */}
        <div className="space-y-3">
           <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1.5">
             <Target className="w-4 h-4" /> Zone Missions
           </h3>
           <div className="space-y-2">
             {missions.map((mission, idx) => (
               <div key={idx} className="bg-[var(--bg-surface)] border border-[var(--border-default)] p-3 rounded-[var(--radius-lg)] hover:border-[var(--border-strong)] transition-colors">
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="font-semibold text-sm text-[var(--text-primary)]">{mission.title}</h4>
                    <span className="text-[10px] font-bold bg-[var(--bg-subtle)] px-2 py-0.5 rounded text-[var(--text-secondary)] border border-[var(--border-default)]">
                      0 / {mission.target}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-muted)] mb-3 leading-relaxed">{mission.desc}</p>
                  <button onClick={() => onLogAction(zone.name)} className="w-full py-1.5 text-xs font-semibold text-[var(--text-primary)] bg-[var(--bg-subtle)] hover:bg-[var(--border-default)] rounded-[var(--radius-md)] transition-colors active:scale-95">
                    Start Mission
                  </button>
               </div>
             ))}
           </div>
        </div>

        {/* Top Warriors */}
        {zone.activeWarriors && zone.activeWarriors.length > 0 && (
          <div className="space-y-3 pb-8">
             <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1.5">
               <Trophy className="w-4 h-4 text-yellow-500" /> Active Warriors
             </h3>
             <div className="flex -space-x-3 overflow-hidden p-2">
                {zone.activeWarriors.slice(0, 5).map((uid, i) => (
                   <img key={i} src={`https://api.dicebear.com/7.x/initials/svg?seed=${uid}`} className="w-8 h-8 rounded-full ring-2 ring-[var(--bg-surface)] bg-gray-100 drop-shadow-sm" alt="Warrior" />
                ))}
                {zone.activeWarriors.length > 5 && (
                  <div className="w-8 h-8 rounded-full ring-2 ring-[var(--bg-surface)] bg-[var(--bg-subtle)] flex items-center justify-center text-[10px] font-bold text-[var(--text-secondary)] z-10">
                    +{zone.activeWarriors.length - 5}
                  </div>
                )}
             </div>
          </div>
        )}
      </div>

      {/* Floating Action Button */}
      <div className="p-4 bg-[var(--bg-surface)] border-t border-[var(--border-default)] md:rounded-none rounded-b-3xl shrink-0 z-20">
        <button 
          onClick={() => onLogAction(zone.name)}
          className="w-full flex justify-center items-center gap-2 bg-[var(--text-primary)] text-white font-semibold text-sm py-3 rounded-[var(--radius-lg)] hover:opacity-90 active:scale-95 transition-all shadow-md"
        >
          <MapPin className="w-4 h-4 mb-0.5" /> Log Action Here
        </button>
      </div>
    </div>
  );
}
