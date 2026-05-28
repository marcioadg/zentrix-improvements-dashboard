/**
 * Company Health Score Calculation
 * Score range: 0-100
 * - 85-100: A+ (Excellent) - Green
 * - 70-84: A (Good) - Green
 * - 55-69: B (Fair) - Yellow
 * - 40-54: C (At Risk) - Orange
 * - 0-39: D (Critical) - Red
 */

export interface HealthScoreBreakdown {
  total: number;
  recency: number;
  usage: number;
  adoption: number;
  bonus: number;
  grade: 'A+' | 'A' | 'B' | 'C' | 'D';
  label: 'Excellent' | 'Good' | 'Fair' | 'At Risk' | 'Critical';
  color: 'green' | 'yellow' | 'orange' | 'red';
}

export const calculateHealthScore = (
  lastLoginAt: string | null,
  usageHours7d: number,
  userCount: number,
  pendingCount: number,
  createdAt: string
): HealthScoreBreakdown => {
  let recencyScore = 0;
  let usageScore = 0;
  let adoptionScore = 0;
  let bonusScore = 0;

  // 1. Recency Score (40 points)
  if (lastLoginAt) {
    const now = new Date();
    const lastLogin = new Date(lastLoginAt);
    const daysSinceLogin = Math.floor((now.getTime() - lastLogin.getTime()) / (1000 * 60 * 60 * 24));

    if (daysSinceLogin <= 1) recencyScore = 40;
    else if (daysSinceLogin <= 3) recencyScore = 35;
    else if (daysSinceLogin <= 7) recencyScore = 28;
    else if (daysSinceLogin <= 14) recencyScore = 20;
    else if (daysSinceLogin <= 30) recencyScore = 12;
    else if (daysSinceLogin <= 60) recencyScore = 4;
    else recencyScore = 0;
  } else {
    recencyScore = 0; // Never logged in
  }

  // 2. Usage Intensity Score (30 points)
  const activeUsers = Math.max(1, userCount); // Avoid division by zero
  const hoursPerUser = usageHours7d / activeUsers;

  if (hoursPerUser >= 10) usageScore = 30;
  else if (hoursPerUser >= 5) usageScore = 24;
  else if (hoursPerUser >= 2) usageScore = 18;
  else if (hoursPerUser >= 1) usageScore = 12;
  else if (hoursPerUser >= 0.5) usageScore = 6;
  else if (hoursPerUser > 0) usageScore = 2;
  else usageScore = 0;

  // 3. User Adoption Score (20 points)
  const totalUsers = userCount + pendingCount;
  if (totalUsers > 0) {
    const adoptionRate = userCount / totalUsers;

    if (adoptionRate >= 1) adoptionScore = 20; // All active
    else if (adoptionRate >= 0.75) adoptionScore = 15;
    else if (adoptionRate >= 0.5) adoptionScore = 10;
    else if (adoptionRate >= 0.25) adoptionScore = 5;
    else adoptionScore = 2;
  } else {
    adoptionScore = 2; // At least some points for existing
  }

  // 4. Account Health Bonus (10 points)
  const accountAge = Math.floor((new Date().getTime() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24));

  if (accountAge < 7 && usageHours7d > 0) {
    // New account with usage (onboarding success)
    bonusScore = 10;
  } else if (accountAge >= 30 && usageHours7d > 0) {
    // Established account with consistent usage
    bonusScore = 10;
  } else if (usageHours7d > 0) {
    // Some usage
    bonusScore = 5;
  } else {
    bonusScore = 0;
  }

  const total = recencyScore + usageScore + adoptionScore + bonusScore;

  // Determine grade and label
  let grade: HealthScoreBreakdown['grade'];
  let label: HealthScoreBreakdown['label'];
  let color: HealthScoreBreakdown['color'];

  if (total >= 85) {
    grade = 'A+';
    label = 'Excellent';
    color = 'green';
  } else if (total >= 70) {
    grade = 'A';
    label = 'Good';
    color = 'green';
  } else if (total >= 55) {
    grade = 'B';
    label = 'Fair';
    color = 'yellow';
  } else if (total >= 40) {
    grade = 'C';
    label = 'At Risk';
    color = 'orange';
  } else {
    grade = 'D';
    label = 'Critical';
    color = 'red';
  }

  return {
    total,
    recency: recencyScore,
    usage: usageScore,
    adoption: adoptionScore,
    bonus: bonusScore,
    grade,
    label,
    color
  };
};

export const getScoreVariant = (score: number): 'default' | 'secondary' | 'destructive' | 'outline' => {
  if (score >= 70) return 'default'; // Green
  if (score >= 55) return 'secondary'; // Yellow
  if (score >= 40) return 'outline'; // Orange
  return 'destructive'; // Red
};
