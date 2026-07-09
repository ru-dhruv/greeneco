"use client";

import { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import { Shield, Lock, Award } from 'lucide-react';
import clsx from 'clsx';

export default function BadgesPage() {
  const { userProfile } = useAuth();
  const [allBadges, setAllBadges] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBadges = async () => {
      const snap = await getDocs(collection(db, 'badges'));
      const badgesData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAllBadges(badgesData);
      setLoading(false);
    };
    fetchBadges();
  }, []);

  const userBadges = userProfile?.badges || [];

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
            <Shield className="w-8 h-8 text-emerald-600" />
            Your Credentials
          </h1>
          <p className="text-gray-500 mt-2 text-lg">
            Track your milestones and collect eco-badges.
          </p>
        </div>

        <div className="bg-emerald-600 rounded-3xl p-6 sm:p-10 text-white shadow-xl flex flex-col sm:flex-row items-center justify-between gap-6 overflow-hidden relative">
          <div className="absolute -right-10 -top-10 text-emerald-500/30">
            <Award className="w-48 h-48" />
          </div>
          <div className="relative z-10 text-center sm:text-left">
            <p className="text-emerald-100 font-bold uppercase tracking-wider text-sm mb-1">Badges Earned</p>
            <p className="text-5xl font-extrabold">{userBadges.length} <span className="text-2xl font-medium text-emerald-200">/ {allBadges.length || 5}</span></p>
          </div>
          <div className="relative z-10 w-full sm:w-auto flex flex-wrap gap-2 justify-center sm:justify-start">
            {userBadges.slice(0, 3).map(badgeId => {
              const b = allBadges.find(x => x.id === badgeId);
              return b ? (
                <div key={b.id} className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-2xl" title={b.name}>
                  {b.emoji}
                </div>
              ) : null;
            })}
            {userBadges.length > 3 && (
              <div className="w-12 h-12 rounded-full bg-emerald-800/50 backdrop-blur-md flex items-center justify-center text-sm font-bold">
                +{userBadges.length - 3}
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-48 bg-white rounded-2xl animate-pulse border border-gray-100"></div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {allBadges.map(badge => {
              const isUnlocked = userBadges.includes(badge.id);
              return (
                <div 
                  key={badge.id}
                  className={clsx(
                    "relative p-6 rounded-3xl border-2 transition-all flex flex-col items-center text-center",
                    isUnlocked 
                      ? "bg-white border-emerald-100 hover:border-emerald-300 hover:shadow-lg shadow-sm" 
                      : "bg-gray-50 border-gray-100 opacity-75 grayscale hover:grayscale-0"
                  )}
                >
                  {!isUnlocked && (
                    <div className="absolute top-4 right-4 bg-gray-200 p-1.5 rounded-full text-gray-500">
                      <Lock className="w-3.5 h-3.5" />
                    </div>
                  )}
                  <div className={clsx(
                    "w-20 h-20 rounded-full flex items-center justify-center mb-4 text-4xl shadow-inner",
                    isUnlocked ? "bg-emerald-50 text-emerald-600" : "bg-gray-200"
                  )}>
                    {badge.emoji}
                  </div>
                  <h3 className={clsx("font-bold text-lg mb-1", isUnlocked ? "text-gray-900" : "text-gray-500")}>
                    {badge.name}
                  </h3>
                  <p className="text-xs text-gray-500 font-medium mb-3">
                    {badge.description}
                  </p>
                  <div className={clsx(
                    "mt-auto text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-md",
                    isUnlocked ? "bg-emerald-100 text-emerald-700" : "bg-gray-200 text-gray-400"
                  )}>
                    {badge.category}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
