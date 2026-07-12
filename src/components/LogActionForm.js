"use client";

import { useState, useRef } from 'react';
import { Upload, Loader2, Image as ImageIcon, MapPin } from 'lucide-react';
import { uploadImageToCloudinary } from '@/lib/cloudinary';
import { db } from '@/lib/firebase';
import { collection, addDoc, doc, updateDoc, increment, serverTimestamp, arrayUnion } from 'firebase/firestore';
import { calculateNewStats } from '@/lib/gamification';
import { checkAndAwardBadges } from '@/lib/badges-logic';
import { ECO_ACTIVITIES } from '@/lib/activities';
import toast from 'react-hot-toast';
import { length, lineString } from '@turf/turf';
import confetti from 'canvas-confetti';

export default function LogActionForm({ user, userProfile, defaultLocation = '', onSuccess }) {
  const [step, setStep] = useState(1);
  const [selectedActivityId, setSelectedActivityId] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState(defaultLocation);
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  // Tracking state
  const [isTracking, setIsTracking] = useState(false);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [trackingDistance, setTrackingDistance] = useState(0);
  const watchIdRef = useRef(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (selectedFile.size > 5 * 1024 * 1024) {
        toast.error("Image must be less than 5MB");
        return;
      }
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
    }
  };

  const startTracking = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser.');
      return;
    }
    setRouteCoordinates([]);
    setTrackingDistance(0);
    setIsTracking(true);
    
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setRouteCoordinates(prev => {
          const newCoords = [...prev, [longitude, latitude]];
          if (newCoords.length > 1) {
            const line = lineString(newCoords);
            const dist = length(line, { units: 'kilometers' });
            setTrackingDistance(dist);
          }
          return newCoords;
        });
      },
      (error) => {
        console.error("GPS Error:", error);
        toast.error("Failed to get location.");
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
    );
  };

  const stopTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsTracking(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      toast.error('Please upload a photo as proof of your action.');
      return;
    }
    setLoading(true);

    try {
      const activityData = ECO_ACTIVITIES.find(a => a.id === selectedActivityId);
      const actionType = activityData.label;

      const imageURL = await uploadImageToCloudinary(file);
      const stats = calculateNewStats(userProfile, actionType, new Date());

      const finalDescription = subcategory 
        ? `[${subcategory}] ${description}`
        : description;

      // Lightweight verification: photo + location = verified
      const isVerified = !!imageURL && !!location;

      const actionData = {
        userId: user.uid,
        userDisplayName: userProfile?.displayName || user.displayName || 'Eco Warrior',
        userPhotoURL: userProfile?.photoURL || user.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${user.uid}`,
        userRank: stats.newRank,
        actionType,
        description: finalDescription,
        location,
        imageURL,
        creditsEarned: stats.earned,
        verified: isVerified,
        status: 'approved',
        likes: 0,
        likedBy: [],
        createdAt: serverTimestamp()
      };

      if (routeCoordinates.length > 1) {
        actionData.route = {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: routeCoordinates
          },
          properties: {
            distanceKm: trackingDistance
          }
        };
      }

      await addDoc(collection(db, 'actions'), actionData);

      const userRef = doc(db, 'users', user.uid);
      const statsUpdate = {
        greenCredits: stats.newTotalCredits,
        streak: stats.newStreak,
        rank: stats.newRank,
        totalActions: increment(1),
        lastActionDate: serverTimestamp()
      };
      
      if (actionType === 'Tree Planting') statsUpdate.treesPlanted = increment(1);
      if (actionType === 'Clean-up Drive') statsUpdate.cleanupsDone = increment(1);

      const newBadges = checkAndAwardBadges(userProfile, actionType, stats);
      if (newBadges.length > 0) {
        statsUpdate.badges = arrayUnion(...newBadges);
      }

      await updateDoc(userRef, statsUpdate);
      const streakMsg = stats.newStreak > 1 ? ` | 🔥 ${stats.newStreak}-day streak` : '';
      const multiplierMsg = stats.multiplier > 1 ? ` (${stats.multiplier}x bonus!)` : '';
      toast.success(`Action Logged! +${stats.earned} Credits${multiplierMsg}${streakMsg} 🌿`);
      
      // Trigger a beautiful gamified confetti explosion!
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#10b981', '#34d399', '#f59e0b', '#3b82f6'] // Eco theme colors
      });

      if (onSuccess) onSuccess();
      setStep(1);
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Failed to log action.');
    } finally {
      setLoading(false);
    }
  };

  const selectedActivity = ECO_ACTIVITIES.find(a => a.id === selectedActivityId);

  return (
    <div className="space-y-4">
      {step === 1 && (
        <div className="space-y-3">
          <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Select Activity</p>
          <div className="grid grid-cols-2 gap-2">
            {ECO_ACTIVITIES.slice(0, 4).map(activity => (
              <button
                key={activity.id}
                onClick={() => { setSelectedActivityId(activity.id); setStep(2); }}
                className="p-3 border-2 border-gray-100 rounded-2xl hover:border-emerald-500 hover:bg-emerald-50 transition-all text-center"
              >
                <div className="text-xl mb-1">{activity.emoji}</div>
                <p className="text-[10px] font-black text-gray-900 uppercase">{activity.label}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 2 && selectedActivity && (
        <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
          <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-2xl">
            <span className="text-2xl">{selectedActivity.emoji}</span>
            <div className="flex-1">
              <p className="text-[10px] font-black text-emerald-800 uppercase leading-none">{selectedActivity.label}</p>
              <p className="text-[9px] text-emerald-600 font-bold mt-1">+{selectedActivity.credits} Credits</p>
            </div>
            <button onClick={() => setStep(1)} className="text-[9px] font-black text-emerald-600 underline uppercase">Change</button>
          </div>

          {!isTracking && routeCoordinates.length === 0 && (
             <button 
               type="button"
               onClick={startTracking}
               className="w-full py-2.5 bg-blue-50 text-blue-600 border-2 border-blue-100 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-100 transition-all flex items-center justify-center gap-2"
             >
               <MapPin className="w-4 h-4" /> Record GPS Route
             </button>
          )}

          {routeCoordinates.length > 0 && !isTracking && (
            <div className="bg-blue-50 border-2 border-blue-100 rounded-2xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-blue-700">
                 <MapPin className="w-4 h-4" />
                 <div>
                   <p className="text-[10px] font-black uppercase">Route Saved</p>
                   <p className="text-xs font-bold">{trackingDistance.toFixed(2)} km</p>
                 </div>
              </div>
              <button onClick={() => { setRouteCoordinates([]); setTrackingDistance(0); }} className="text-blue-500 hover:text-blue-700 font-bold text-xs">
                Clear
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="relative h-24 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors overflow-hidden"
              >
                {previewUrl ? (
                   <img src={previewUrl} className="w-full h-full object-cover" />
                ) : (
                  <>
                    <ImageIcon className="w-5 h-5 text-gray-300 mb-1" />
                    <p className="text-[9px] font-black text-gray-400 uppercase">Upload Photo Proof</p>
                  </>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              </div>
            </div>

            <textarea 
              required 
              rows={2} 
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
              placeholder="What did you do?" 
              className="w-full p-3 bg-gray-50 border-none rounded-2xl text-xs font-bold focus:ring-2 focus:ring-emerald-500" 
            />

            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-3 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 shadow-xl shadow-emerald-200 transition-all flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Impact'}
            </button>
          </form>
        </div>
      )}

      {/* GPS Tracking Modal Overlay */}
      {isTracking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 w-full max-w-sm text-center shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-emerald-500 animate-pulse"></div>
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
              <MapPin className="w-10 h-10 animate-bounce" />
            </div>
            <h3 className="text-xl font-black text-gray-900 mb-2">Tracking Route</h3>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-6">Keep moving...</p>
            
            <div className="bg-gray-50 rounded-2xl p-4 mb-8 border-2 border-gray-100">
              <div className="text-3xl font-black text-emerald-600 mb-1">{trackingDistance.toFixed(2)}</div>
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Kilometers</div>
            </div>

            <button 
              onClick={stopTracking}
              className="w-full py-4 bg-red-500 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-red-600 shadow-xl shadow-red-200 transition-transform active:scale-95"
            >
              Stop & Save Route
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
