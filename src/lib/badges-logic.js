export function checkAndAwardBadges(userProfile, actionType, newStats) {
  const currentBadges = userProfile?.badges || [];
  const newBadgesEarned = [];

  // Trees Badges
  if (actionType === 'Tree Planting') {
    const totalTrees = (userProfile?.treesPlanted || 0) + 1;
    if (totalTrees >= 1 && !currentBadges.includes('first_tree')) {
      newBadgesEarned.push('first_tree');
    }
    if (totalTrees >= 10 && !currentBadges.includes('tree_10')) {
      newBadgesEarned.push('tree_10');
    }
  }

  // Cleanup Badges
  if (actionType === 'Cleanup') {
    const totalCleanups = (userProfile?.cleanupsDone || 0) + 1;
    if (totalCleanups >= 1 && !currentBadges.includes('cleanup_first')) {
      newBadgesEarned.push('cleanup_first');
    }
  }

  // Streak Badges
  const currentStreak = newStats.newStreak;
  if (currentStreak >= 3 && !currentBadges.includes('streak_3')) {
    newBadgesEarned.push('streak_3');
  }
  if (currentStreak >= 7 && !currentBadges.includes('streak_7')) {
    newBadgesEarned.push('streak_7');
  }

  return newBadgesEarned;
}
