"use client";

import { useState, useRef } from 'react';
import { X, Loader2, Upload, User, MapPin } from 'lucide-react';
import { uploadImageToCloudinary } from '@/lib/cloudinary';
import { db } from '@/lib/firebase';
import { doc, getDocs, collection, query, where, writeBatch } from 'firebase/firestore';
import toast from 'react-hot-toast';

export default function EditProfileModal({ isOpen, onClose, currentProfile }) {
  const [displayName, setDisplayName] = useState(currentProfile?.displayName || '');
  const [bio, setBio] = useState(currentProfile?.bio || '');
  const [location, setLocation] = useState(currentProfile?.location || '');
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(currentProfile?.photoURL || '');
  
  const [loading, setLoading] = useState(false);
  
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      let photoURL = currentProfile?.photoURL;
      
      if (file) {
        photoURL = await uploadImageToCloudinary(file);
      }

      const updates = {
        displayName,
        bio,
        location,
        photoURL
      };

      const batch = writeBatch(db);
      
      const userRef = doc(db, 'users', currentProfile.id);
      batch.update(userRef, updates);

      if (displayName !== currentProfile.displayName || photoURL !== currentProfile.photoURL) {
        const actionsQ = query(collection(db, 'actions'), where('userId', '==', currentProfile.id));
        const actionsSnap = await getDocs(actionsQ);
        actionsSnap.forEach(actionDoc => {
          batch.update(actionDoc.ref, { 
            userDisplayName: displayName,
            userPhotoURL: photoURL
          });
        });
      }

      await batch.commit();
      
      toast.success('Profile updated');
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/25 backdrop-blur-[2px] z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[var(--bg-surface)] rounded-[var(--radius-xl)] border border-[var(--border-default)] p-6 max-w-md w-full mx-4 shadow-[0_8px_32px_rgba(0,0,0,0.08)] flex flex-col max-h-[90vh]">
        
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Edit Profile</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-[var(--radius-md)] text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] transition-[var(--transition)]">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto w-full pr-1">
          <form id="edit-profile-form" onSubmit={handleSubmit} className="space-y-4">
            
            <div className="flex flex-col items-center mb-6">
              <div 
                className="relative group w-24 h-24 rounded-full overflow-hidden border-2 border-[var(--bg-surface)] ring-1 ring-[var(--border-default)] bg-[var(--bg-subtle)] cursor-pointer" 
                onClick={() => fileInputRef.current?.click()}
              >
                <img src={previewUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=fallback'} alt="Avatar" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-[var(--transition)]">
                  <Upload className="w-5 h-5 text-white" />
                </div>
              </div>
              <button type="button" onClick={() => fileInputRef.current?.click()} className="mt-3 text-xs font-medium text-[var(--accent)] hover:text-[var(--accent-hover)] transition-[var(--transition)]">
                Change Photo
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">Display Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                <input required type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} className="w-full pl-9 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-md)] py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--border-accent)] focus:ring-2 focus:ring-[var(--accent)]/10 transition-[var(--transition)]" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">Bio</label>
              <textarea maxLength={160} rows={3} value={bio} onChange={e => setBio(e.target.value)} placeholder="Tell your eco story..." className="w-full bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-md)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--border-accent)] focus:ring-2 focus:ring-[var(--accent)]/10 transition-[var(--transition)] resize-none" />
              <div className="text-right text-[10px] text-[var(--text-muted)] mt-1">{bio.length}/160</div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">Location</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                <input type="text" value={location} onChange={e => setLocation(e.target.value)} placeholder="City, Country" className="w-full pl-9 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-md)] py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--border-accent)] focus:ring-2 focus:ring-[var(--accent)]/10 transition-[var(--transition)]" />
              </div>
            </div>
          </form>
        </div>

        <div className="flex gap-2 justify-end mt-6 pt-4 border-t border-[var(--border-default)]">
          <button type="button" onClick={onClose} className="bg-transparent text-[var(--text-muted)] rounded-[var(--radius-md)] px-3 py-1.5 text-sm font-medium hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] transition-[var(--transition)]">
            Cancel
          </button>
          <button form="edit-profile-form" type="submit" disabled={loading} className="bg-[var(--accent)] text-white rounded-[var(--radius-md)] px-4 py-1.5 text-sm font-medium hover:bg-[var(--accent-hover)] transition-[var(--transition)] active:scale-[0.98] disabled:opacity-50 flex items-center gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Profile'}
          </button>
        </div>
      </div>
    </div>
  );
}
