export interface FeedbackStats {
  totalFeedback: number;
  positiveRate: number;
  contextBreakdown: Record<string, {
    total: number;
    positive: number;
    negative: number;
    hasLearned: boolean;
  }>;
}

export const getFeedbackStats = (feedbackState: any): FeedbackStats => {
  // Logic based on store implementation
  const learnedProfiles = feedbackState.learnedProfiles || {};
  const contextBreakdown: Record<string, any> = {};
  let totalFeedback = 0;
  let totalPositive = 0;

  Object.entries(learnedProfiles).forEach(([ctx, data]: [string, any]) => {
    const positive = data.positive || 0;
    const negative = data.negative || 0;
    const total = positive + negative;
    totalFeedback += total;
    totalPositive += positive;
    
    contextBreakdown[ctx] = {
      total,
      positive,
      negative,
      hasLearned: total >= 3
    };
  });

  return {
    totalFeedback,
    positiveRate: totalFeedback > 0 ? totalPositive / totalFeedback : 0,
    contextBreakdown
  };
};
