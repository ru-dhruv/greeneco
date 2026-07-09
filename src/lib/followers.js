import { db } from './firebase';
import { doc, collection, runTransaction, serverTimestamp } from 'firebase/firestore';

const DEFAULT_USER_DOC = {
  displayName: 'Eco Warrior',
  photoURL: '',
  bio: '',
  location: '',
  greenCredits: 0,
  rank: 'Seedling',
  totalActions: 0,
  treesPlanted: 0,
  cleanupsDone: 0,
  challengesCompleted: 0,
  followersCount: 0,
  followingCount: 0,
};

export const toggleFollow = async (currentUserId, targetUserId, isCurrentlyFollowing) => {
  if (currentUserId === targetUserId) {
    return { success: false, error: "Cannot follow yourself" };
  }

  const followId = `${currentUserId}_${targetUserId}`;
  const followRef = doc(db, 'follows', followId);
  const targetUserRef = doc(db, 'users', targetUserId);
  const currentUserRef = doc(db, 'users', currentUserId);

  try {
    await runTransaction(db, async (transaction) => {
      const targetUserSnap = await transaction.get(targetUserRef);
      const currentUserSnap = await transaction.get(currentUserRef);

      // Auto-create user documents if they don't exist
      if (!targetUserSnap.exists()) {
        transaction.set(targetUserRef, { ...DEFAULT_USER_DOC, createdAt: serverTimestamp() });
      }
      if (!currentUserSnap.exists()) {
        transaction.set(currentUserRef, { ...DEFAULT_USER_DOC, createdAt: serverTimestamp() });
      }

      const targetData = targetUserSnap.exists() ? targetUserSnap.data() : DEFAULT_USER_DOC;
      const currentData = currentUserSnap.exists() ? currentUserSnap.data() : DEFAULT_USER_DOC;

      const targetFollowersCount = targetData.followersCount || 0;
      const currentFollowingCount = currentData.followingCount || 0;

      if (isCurrentlyFollowing) {
        transaction.delete(followRef);
        transaction.update(targetUserRef, { followersCount: Math.max(0, targetFollowersCount - 1) });
        transaction.update(currentUserRef, { followingCount: Math.max(0, currentFollowingCount - 1) });
      } else {
        transaction.set(followRef, {
          followerId: currentUserId,
          followingId: targetUserId,
          createdAt: serverTimestamp()
        });
        transaction.update(targetUserRef, { followersCount: targetFollowersCount + 1 });
        transaction.update(currentUserRef, { followingCount: currentFollowingCount + 1 });
        
        const notifRef = doc(collection(db, 'notifications'));
        transaction.set(notifRef, {
          userId: targetUserId,
          type: 'follow',
          fromUserId: currentUserId,
          fromUserName: currentData.displayName || 'Someone',
          fromUserAvatar: currentData.photoURL || '',
          message: `${currentData.displayName || 'Someone'} started following you`,
          link: `/profile/${currentUserId}`,
          read: false,
          createdAt: serverTimestamp()
        });
      }
    });

    return { success: true, action: isCurrentlyFollowing ? 'unfollowed' : 'followed' };
  } catch (error) {
    console.error("toggleFollow error:", error);
    return { success: false, error: error.message };
  }
};
