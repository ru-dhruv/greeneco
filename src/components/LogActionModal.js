"use client";

import { useState, useRef, useEffect } from 'react';
import { Upload, X, Loader2, Image as ImageIcon, MapPin, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { uploadImageToCloudinary } from '@/lib/cloudinary';
import { db } from '@/lib/firebase';
import { collection, addDoc, doc, updateDoc, increment, serverTimestamp, arrayUnion } from 'firebase/firestore';
import { calculateNewStats } from '@/lib/gamification';
import { checkAndAwardBadges } from '@/lib/badges-logic';
import { ECO_ACTIVITIES } from '@/lib/activities';
import toast from 'react-hot-toast';

export default function LogActionModal({ user, forceOpen = false, defaultLocation = '', onClose: externalClose }) {
  const { userProfile } = useAuth();
  const [isOpen, setIsOpen] = useState(forceOpen);
  
  const [step, setStep] = useState(1);
  const [selectedActivityId, setSelectedActivityId] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState(defaultLocation);
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener('open-log-modal', handleOpen);
    return () => window.removeEventListener('open-log-modal', handleOpen);
  }, []);

  if (!isOpen) return null;

  const handleClose = () => {
    setIsOpen(false);
    setStep(1);
    setSelectedActivityId('');
    setSubcategory('');
    setDescription('');
    setLocation('');
    setFile(null);
    setPreviewUrl('');
    if (externalClose) externalClose();
  };

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

  const handleNextStep1 = () => {
    if (selectedActivityId) setStep(2);
  };

  const handleNextStep2 = () => {
    setStep(3);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (step !== 3) return;
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

      await addDoc(collection(db, 'actions'), {
        userId: user.uid,
        userDisplayName: userProfile?.displayName || user.displayName || 'Eco Warrior',
        userPhotoURL: userProfile?.photoURL || user.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${user.uid}`,
        userRank: stats.newRank,
        actionType,
        description: finalDescription,
        location,
        imageURL,
        creditsEarned: stats.earned,
        status: 'approved',
        likes: 0,
        likedBy: [],
        createdAt: serverTimestamp()
      });

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

      toast.success(`Action logged! Earned ${stats.earned} Credits.`);
      if (newBadges.length > 0) {
        toast.success(`Unlocked ${newBadges.length} new badge(s)!`);
      }

      handleClose();
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Failed to log action.');
    } finally {
      setLoading(false);
    }
  };

  const selectedActivity = ECO_ACTIVITIES.find(a => a.id === selectedActivityId);

  // If we conditionally render with forceOpen, we still need the wrapper or return null
  if (!isOpen && !forceOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/25 backdrop-blur-[2px] z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[var(--bg-surface)] rounded-[var(--radius-xl)] border border-[var(--border-default)] p-6 max-w-2xl w-full mx-4 shadow-[0_8px_32px_rgba(0,0,0,0.08)] flex flex-col max-h-[90vh]">
        
        <div className="flex justify-between items-center mb-6 shrink-0">
          <div className="flex items-center gap-3">
            {step > 1 && (
              <button onClick={() => setStep(step - 1)} className="p-1 rounded-[var(--radius-md)] hover:bg-[var(--bg-subtle)] transition-[var(--transition)] text-[var(--text-secondary)]">
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div>
              <h2 className="text-lg font-semibold text-[var(--text-primary)] leading-tight">Log Eco Action</h2>
              <p className="text-xs text-[var(--text-muted)] mt-0.5 font-medium tracking-wide">Step {step} of 3</p>
            </div>
          </div>
          <button onClick={handleClose} className="w-8 h-8 flex items-center justify-center rounded-[var(--radius-md)] text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] transition-[var(--transition)]">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto w-full pr-1 pb-2">
          
          {step === 1 && (
            <div className="space-y-4 animate-in slide-in-from-right-2 duration-300">
              <p className="text-sm font-medium text-[var(--text-secondary)] mb-4">Choose an action category:</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {ECO_ACTIVITIES.map(activity => {
                  const isSelected = selectedActivityId === activity.id;
                  return (
                    <div 
                      key={activity.id}
                      onClick={() => setSelectedActivityId(activity.id)}
                      className={`cursor-pointer rounded-[var(--radius-lg)] p-4 flex flex-col items-center text-center transition-[var(--transition)] ${
                        isSelected 
                          ? 'border-2 border-green-600 bg-green-50 shadow-sm' 
                          : 'border border-gray-200 bg-white hover:bg-gray-50'
                      }`}
                    >
                      <div className="text-3xl mb-2 select-none pointer-events-none">{activity.emoji}</div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-1">{activity.label}</h4>
                      <p className="text-[10px] text-gray-500 leading-snug">{activity.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {step === 2 && selectedActivity && (
            <div className="space-y-6 animate-in slide-in-from-right-2 duration-300">
              <div className="flex flex-col items-center justify-center text-center p-6 bg-[var(--bg-subtle)] rounded-[var(--radius-xl)] border border-[var(--border-default)]">
                <div className="text-5xl mb-3">{selectedActivity.emoji}</div>
                <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1">{selectedActivity.label}</h3>
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${selectedActivity.color}`}>+{selectedActivity.credits} Credits</span>
              </div>

              <div>
                <p className="text-sm font-medium text-[var(--text-secondary)] mb-3">What specifically did you do?</p>
                <div className="flex flex-wrap gap-2">
                  {selectedActivity.subcategories.map(sub => (
                    <button
                      key={sub}
                      onClick={() => setSubcategory(sub)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-[var(--transition)] ${
                        subcategory === sub 
                          ? 'bg-gray-900 text-white shadow-md' 
                          : 'bg-[var(--bg-surface)] text-gray-700 border border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {sub}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
             <form id="log-action-form" onSubmit={handleSubmit} className="space-y-5 animate-in slide-in-from-right-2 duration-300">
                <div className="flex items-center gap-3 p-3 bg-[var(--bg-subtle)] border border-[var(--border-default)] rounded-[var(--radius-lg)]">
                  <span className="text-2xl">{selectedActivity?.emoji}</span>
                  <div>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">{selectedActivity?.label}</p>
                    {subcategory && <p className="text-xs text-[var(--text-muted)]">{subcategory}</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">Upload Proof (Required)</label>
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className={`relative flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-[var(--radius-lg)] transition-[var(--transition)] cursor-pointer overflow-hidden ${
                      previewUrl ? 'border-[var(--border-accent)] bg-[var(--bg-subtle)]' : 'border-[var(--border-default)] bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)]'
                    }`}
                  >
                    {previewUrl ? (
                      <>
                        <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-[var(--transition)]">
                          <p className="text-white font-medium flex items-center gap-2 text-sm">
                            <Upload className="w-4 h-4" /> Change Photo
                          </p>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <div className="p-2 bg-white border border-gray-200 shadow-sm rounded-full mb-2 text-gray-400">
                          <ImageIcon className="w-5 h-5" />
                        </div>
                        <p className="mb-1 text-sm font-semibold text-gray-700">Click to upload photo evidence</p>
                      </div>
                    )}
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">Description</label>
                  <textarea required rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Share more details about your impact..." className="w-full p-3 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-md)] focus:outline-none focus:border-[var(--border-accent)] focus:ring-2 focus:ring-[var(--accent)]/10 transition-[var(--transition)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] resize-none" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">Location</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                    <input required type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Central Park" className="w-full pl-9 p-3 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-md)] focus:outline-none focus:border-[var(--border-accent)] focus:ring-2 focus:ring-[var(--accent)]/10 transition-[var(--transition)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]" />
                  </div>
                </div>
             </form>
          )}

        </div>

        <div className="flex justify-between items-center mt-6 pt-4 border-t border-[var(--border-default)] shrink-0">
          <div className="flex gap-1.5">
            {[1, 2, 3].map(s => (
              <div key={s} className={`h-1.5 rounded-full transition-all duration-300 ${s === step ? 'w-6 bg-[var(--accent)]' : s < step ? 'w-4 bg-[var(--accent)] opacity-40' : 'w-4 bg-[var(--border-strong)]'}`}></div>
            ))}
          </div>
          
          <div className="flex gap-2">
            {step === 1 && (
              <button onClick={handleNextStep1} disabled={!selectedActivityId} className="bg-[var(--accent)] text-white rounded-[var(--radius-md)] px-6 py-2 text-sm font-medium hover:bg-[var(--accent-hover)] transition-[var(--transition)] disabled:opacity-50">
                Continue →
              </button>
            )}
            {step === 2 && (
              <button onClick={handleNextStep2} className="bg-[var(--accent)] text-white rounded-[var(--radius-md)] px-6 py-2 text-sm font-medium hover:bg-[var(--accent-hover)] transition-[var(--transition)]">
                {subcategory ? 'Continue →' : 'Skip & Continue →'}
              </button>
            )}
            {step === 3 && (
              <button form="log-action-form" type="submit" disabled={loading} className="bg-[var(--accent)] text-white rounded-[var(--radius-md)] px-6 py-2 text-sm font-medium hover:bg-[var(--accent-hover)] transition-[var(--transition)] active:scale-[0.98] disabled:opacity-50 flex items-center justify-center min-w-[120px]">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Log Action'}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
