"use client";

import { useState } from 'react';
import { db } from '@/lib/firebase';
import { doc, setDoc, collection, serverTimestamp, getDocs, writeBatch } from 'firebase/firestore';
import { Loader2, Database, AlertCircle, CheckCircle2 } from 'lucide-react';

const badges = [
  { id: 'first_tree', name: 'First Seed', emoji: '🌱', description: 'Planted your very first tree!', criteria: 'Plant 1 tree', category: 'Trees', issuedBy: 'GreenCred Platform' },
  { id: 'tree_10', name: 'Forest Guardian', emoji: '🌳', description: 'Planted 10 trees', criteria: 'Plant 10 trees', category: 'Trees', issuedBy: 'GreenCred Platform' },
  { id: 'cleanup_first', name: 'Litter Buster', emoji: '🧹', description: 'Completed your first cleanup', criteria: 'Log 1 cleanup action', category: 'Cleanups', issuedBy: 'GreenCred Platform' },
  { id: 'streak_3', name: 'On Fire', emoji: '🔥', description: 'Kept an eco-streak for 3 days', criteria: '3 day streak', category: 'Streaks', issuedBy: 'GreenCred Platform' },
  { id: 'streak_7', name: 'Unstoppable', emoji: '⚡', description: 'Kept an eco-streak for 7 days', criteria: '7 day streak', category: 'Streaks', issuedBy: 'GreenCred Platform' }
];

const demoUsers = [
  {
    id: 'demo_user_1',
    displayName: 'Aarav Kumar',
    email: 'aarav@example.com',
    photoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Aarav',
    greenCredits: 450,
    rank: 'Eco Warrior',
    streak: 5,
    lastActionDate: serverTimestamp(),
    badges: ['first_tree', 'cleanup_first', 'streak_3'],
    totalActions: 12,
    treesPlanted: 3,
    cleanupsDone: 9,
    challengesCompleted: 1,
  },
  {
    id: 'demo_user_2',
    displayName: 'Priya Singh',
    email: 'priya@example.com',
    photoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Priya',
    greenCredits: 1250,
    rank: 'Planet Guardian',
    streak: 12,
    lastActionDate: serverTimestamp(),
    badges: ['first_tree', 'tree_10', 'streak_7'],
    totalActions: 45,
    treesPlanted: 15,
    cleanupsDone: 20,
    challengesCompleted: 5,
  }
];

const challenges = [
  {
    id: 'hackmol_mega_plantation',
    title: 'HackMol 7.0 Mega Plantation',
    description: 'Let us make NITJ greener! Plant as many trees as possible around the campus and hostels.',
    type: 'Campus',
    actionType: 'Tree Planting',
    targetCount: 500,
    currentCount: 145,
    startDate: serverTimestamp(),
    endDate: serverTimestamp(), // Ideally in the future
    createdBy: 'admin',
    creatorName: 'NITJ Eco Club',
    participants: ['demo_user_1', 'demo_user_2'],
    badgeReward: 'tree_10',
    status: 'active',
    location: 'NIT Jalandhar Campus'
  },
  {
    id: 'weekly_city_cleanup',
    title: 'Jalandhar City Cleanup',
    description: 'Help clean up the local parks and streets this weekend.',
    type: 'Local',
    actionType: 'Cleanup',
    targetCount: 100,
    currentCount: 89,
    startDate: serverTimestamp(),
    endDate: serverTimestamp(),
    createdBy: 'admin',
    creatorName: 'City Council',
    participants: ['demo_user_1'],
    badgeReward: 'cleanup_first',
    status: 'active',
    location: 'Jalandhar City'
  }
];

const actions = [
  {
    userId: 'demo_user_1',
    userDisplayName: 'Aarav Kumar',
    userPhotoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Aarav',
    actionType: 'Tree Planting',
    description: 'Planted a Neem tree near the IT building.',
    location: 'NIT Jalandhar - IT Block',
    imageURL: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09',
    creditsEarned: 50,
    status: 'approved',
    likes: 12,
    likedBy: ['demo_user_2'],
    challengeId: 'hackmol_mega_plantation',
  },
  {
    userId: 'demo_user_2',
    userDisplayName: 'Priya Singh',
    userPhotoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Priya',
    actionType: 'Cleanup',
    description: 'Collected 2 bags of plastic waste from the local park.',
    location: 'Model Town Park, Jalandhar',
    imageURL: 'https://images.unsplash.com/photo-1611284446314-60a58ac0deb9',
    creditsEarned: 30,
    status: 'approved',
    likes: 24,
    likedBy: ['demo_user_1'],
    challengeId: 'weekly_city_cleanup',
  }
];

const mapZones = [
  { name: 'Anand Vihar', city: 'Delhi', lat: 28.6469, lng: 77.3151, currentAQI: 287, ecoScore: 0, currentZoneType: 'Polluted Zone', totalActions: 0, progressToNextZone: 0, activeWarriors: [] },
  { name: 'Connaught Place', city: 'Delhi', lat: 28.6315, lng: 77.2167, currentAQI: 165, ecoScore: 0, currentZoneType: 'Polluted Zone', totalActions: 0, progressToNextZone: 0, activeWarriors: [] },
  { name: 'Lodhi Garden', city: 'Delhi', lat: 28.5931, lng: 77.2200, currentAQI: 89, ecoScore: 0, currentZoneType: 'Green Zone', totalActions: 0, progressToNextZone: 0, activeWarriors: [] },
  { name: 'Nehru Park', city: 'Delhi', lat: 28.5918, lng: 77.1733, currentAQI: 72, ecoScore: 0, currentZoneType: 'Green Zone', totalActions: 0, progressToNextZone: 0, activeWarriors: [] },
  { name: 'Yamuna Bank', city: 'Delhi', lat: 28.6127, lng: 77.2773, currentAQI: 312, ecoScore: 0, currentZoneType: 'Dead Zone', totalActions: 0, progressToNextZone: 0, activeWarriors: [] },
  { name: 'Chandni Chowk', city: 'Delhi', lat: 28.6506, lng: 77.2300, currentAQI: 198, ecoScore: 0, currentZoneType: 'Polluted Zone', totalActions: 0, progressToNextZone: 0, activeWarriors: [] },
  { name: 'IIT Delhi', city: 'Delhi', lat: 28.5459, lng: 77.1926, currentAQI: 95, ecoScore: 0, currentZoneType: 'Green Zone', totalActions: 0, progressToNextZone: 0, activeWarriors: [] },
  { name: 'Saket', city: 'Delhi', lat: 28.5244, lng: 77.2066, currentAQI: 134, ecoScore: 0, currentZoneType: 'Clean Zone', totalActions: 0, progressToNextZone: 0, activeWarriors: [] },
  { name: 'Dwarka', city: 'Delhi', lat: 28.5921, lng: 77.0460, currentAQI: 221, ecoScore: 0, currentZoneType: 'Polluted Zone', totalActions: 0, progressToNextZone: 0, activeWarriors: [] },
  { name: 'Rohini', city: 'Delhi', lat: 28.7041, lng: 77.1025, currentAQI: 245, ecoScore: 0, currentZoneType: 'Polluted Zone', totalActions: 0, progressToNextZone: 0, activeWarriors: [] }
];

export default function SeedPage() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });

  const clearCollection = async (collectionName) => {
    const querySnapshot = await getDocs(collection(db, collectionName));
    const batch = writeBatch(db);
    querySnapshot.docs.forEach((d) => {
      batch.delete(d.ref);
    });
    await batch.commit();
  };

  const seedDatabase = async () => {
    setLoading(true);
    setStatus({ type: '', message: '' });

    try {
      // 1. Clear existing demo data (optional, but good for reset)
      await Promise.all([
        clearCollection('badges'),
        clearCollection('challenges'),
        clearCollection('zones'),
      ]);

      // 2. Seed Badges
      const badgesBatch = writeBatch(db);
      badges.forEach(badge => {
        const ref = doc(db, 'badges', badge.id);
        badgesBatch.set(ref, badge);
      });
      await badgesBatch.commit();

      // 3. Seed Users
      const usersBatch = writeBatch(db);
      demoUsers.forEach(user => {
        const { id, ...userData } = user;
        const ref = doc(db, 'users', id);
        usersBatch.set(ref, { ...userData, joinedAt: serverTimestamp() }, { merge: true });
      });
      await usersBatch.commit();

      // 4. Seed Challenges
      const challengesBatch = writeBatch(db);
      challenges.forEach(challenge => {
        const ref = doc(db, 'challenges', challenge.id);
        challengesBatch.set(ref, challenge);
      });
      await challengesBatch.commit();

      // 5. Seed Actions
      const actionsBatch = writeBatch(db);
      actions.forEach((action, i) => {
        const ref = doc(collection(db, 'actions')); // Auto-generate ID
        actionsBatch.set(ref, { 
          ...action, 
          createdAt: serverTimestamp() 
        });
      });
      await actionsBatch.commit();

      // 6. Seed Map Zones
      const zonesBatch = writeBatch(db);
      mapZones.forEach((zone) => {
        // use lower case name with no space for consistent ID
        const zoneId = zone.name.toLowerCase().replace(/\s+/g, '-');
        const ref = doc(db, 'zones', zoneId);
        zonesBatch.set(ref, {
          ...zone,
          lastUpdated: serverTimestamp()
        });
      });
      await zonesBatch.commit();

      setStatus({ type: 'success', message: 'Database seeded successfully with demo data & map zones!' });
    } catch (error) {
      console.error(error);
      setStatus({ type: 'error', message: 'Failed to seed database: ' + error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="p-8 sm:p-10 bg-emerald-600 text-white flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-extrabold flex items-center gap-3">
                <Database className="w-8 h-8" />
                Admin Setup
              </h1>
              <p className="mt-2 text-emerald-100 font-medium">
                Initialize Firestore Schema & Demo Data for HackMol 7.0
              </p>
            </div>
          </div>
          
          <div className="p-8 sm:p-10 space-y-8">
            <div className="prose prose-emerald max-w-none text-gray-600">
              <p>This page will inject the following demo data into your Firebase Firestore project <strong>greeneco-b3a43</strong>:</p>
              <ul>
                <li><strong>5 Badges</strong> (First Tree, Streaks, etc.)</li>
                <li><strong>2 Demo Users</strong> (Aarav and Priya) with pre-populated green credits and ranks</li>
                <li><strong>2 Active Challenges</strong> (HackMol Mega Plantation, City Cleanup)</li>
                <li><strong>Sample Feed Actions</strong> (Tree planting and cleanup photos)</li>
              </ul>
              <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-md mt-6">
                <p className="text-amber-800 text-sm m-0 flex items-center gap-2 font-medium">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  Running this will overwrite identical badge/challenge IDs and may duplicate actions if run multiple times.
                </p>
              </div>
            </div>

            {status.message && (
              <div className={`p-4 rounded-xl flex items-start gap-3 ${status.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                {status.type === 'success' ? <CheckCircle2 className="w-6 h-6 flex-shrink-0 text-green-500" /> : <AlertCircle className="w-6 h-6 flex-shrink-0 text-red-500" />}
                <p className="font-medium">{status.message}</p>
              </div>
            )}

            <div className="pt-4 border-t border-gray-100 flex justify-end">
              <button
                onClick={seedDatabase}
                disabled={loading}
                className="inline-flex items-center gap-2 px-8 py-4 bg-emerald-600 hover:bg-emerald-700 focus:ring-4 focus:ring-emerald-500/30 text-white rounded-xl font-bold shadow-lg shadow-emerald-500/30 transition-all disabled:opacity-75 disabled:cursor-wait"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Seeding Database...
                  </>
                ) : (
                  <>
                    <Database className="w-5 h-5" />
                    Inject Demo Data
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
