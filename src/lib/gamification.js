import { differenceInCalendarDays } from 'date-fns';
import { ECO_ACTIVITIES } from '@/lib/activities';

export const ACTION_BASE_POINTS = ECO_ACTIVITIES.reduce((acc, current) => {
  acc[current.label] = current.credits;
  return acc;
}, {});

export const RANKS = [
  { name: 'Seedling', minCredits: 0 },
  { name: 'Sprout', minCredits: 100 },
  { name: 'Sapling', minCredits: 500 },
  { name: 'Eco Warrior', minCredits: 1500 },
  { name: 'Planet Guardian', minCredits: 5000 },
  { name: 'Captain Earth', minCredits: 10000 }
];

export function getRankFromCredits(credits) {
  let currentRank = RANKS[0].name;
  for (let i = 0; i < RANKS.length; i++) {
    if (credits >= RANKS[i].minCredits) {
      currentRank = RANKS[i].name;
    } else {
      break;
    }
  }
  return currentRank;
}

export function getStreakMultiplier(streak) {
  if (streak >= 15) return 2.5;
  if (streak >= 7) return 2.0;
  if (streak >= 3) return 1.5;
  return 1.0;
}

export function calculateNewStats(userProfile, actionType, actionDate = new Date()) {
  const baseCredits = ACTION_BASE_POINTS[actionType] || 10;
  let newStreak = userProfile?.streak || 0;
  
  if (userProfile?.lastActionDate) {
    // Firestore timestamp to JS Date
    const lastDate = userProfile.lastActionDate.toDate ? userProfile.lastActionDate.toDate() : new Date(userProfile.lastActionDate);
    const daysDiff = differenceInCalendarDays(actionDate, lastDate);
    
    if (daysDiff === 1) {
      // Acted yesterday -> increment streak
      newStreak += 1;
    } else if (daysDiff > 1) {
      // Missed a day -> reset
      newStreak = 1;
    } else if (daysDiff === 0 && newStreak === 0) {
      // First action today with 0 streak (e.g. just started)
      newStreak = 1;
    }
    // If daysDiff === 0 and streak > 0, it means multiple actions today -> keep streak same
  } else {
    // Very first action ever
    newStreak = 1;
  }

  const multiplier = getStreakMultiplier(newStreak);
  const creditsEarned = Math.round(baseCredits * multiplier);
  
  const currentTotal = userProfile?.greenCredits || 0;
  const newTotalCredits = currentTotal + creditsEarned;
  const newRank = getRankFromCredits(newTotalCredits);

  return {
    earned: creditsEarned,
    multiplier,
    newStreak,
    newTotalCredits,
    newRank,
    baseCredits
  };
}
