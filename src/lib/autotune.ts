export type AutoTuneStrategy = 'adaptive' | 'precise' | 'balanced' | 'creative' | 'chaotic' | 'default';

export interface AutoTuneParams {
  temperature: number;
  top_p: number;
  top_k: number;
  frequency_penalty: number;
  presence_penalty: number;
  repetition_penalty: number;
}

export interface AutoTuneResult {
  params: AutoTuneParams;
  detectedContext: string;
  confidence: number;
  contextScores?: any[];
  patternMatches?: any[];
  paramDeltas?: any[];
}

export const PARAM_META: Record<string, {
  label: string;
  short: string;
  description: string;
  min: number;
  max: number;
  step: number;
}> = {
  temperature: {
    label: 'Temperature',
    short: 'T',
    description: 'Controls randomness: Lower is more focused, higher is more creative.',
    min: 0,
    max: 2,
    step: 0.01
  },
  top_p: {
    label: 'Top P',
    short: 'P',
    description: 'Nucleus sampling: limits cumulative probability of likely tokens.',
    min: 0,
    max: 1,
    step: 0.01
  },
  top_k: {
    label: 'Top K',
    short: 'K',
    description: 'Limits sample pool to top K most likely tokens.',
    min: 0,
    max: 100,
    step: 1
  },
  frequency_penalty: {
    label: 'Freq Penalty',
    short: 'FP',
    description: 'Penalize tokens based on their frequency in the text.',
    min: -2,
    max: 2,
    step: 0.01
  },
  presence_penalty: {
    label: 'Pres Penalty',
    short: 'PP',
    description: 'Penalize tokens based on whether they have appeared in the text.',
    min: -2,
    max: 2,
    step: 0.01
  },
  repetition_penalty: {
    label: 'Rep Penalty',
    short: 'RP',
    description: 'Penalize tokens that have appeared recently.',
    min: 1,
    max: 2,
    step: 0.01
  }
};

export const STRATEGY_PROFILES: Record<Exclude<AutoTuneStrategy, 'adaptive'>, AutoTuneParams> = {
  default: {
    temperature: 1.0,
    top_p: 1,
    top_k: 0,
    frequency_penalty: 0,
    presence_penalty: 0,
    repetition_penalty: 1
  },
  precise: {
    temperature: 0.1,
    top_p: 1,
    top_k: 0,
    frequency_penalty: 0,
    presence_penalty: 0,
    repetition_penalty: 1
  },
  balanced: {
    temperature: 0.7,
    top_p: 1,
    top_k: 0,
    frequency_penalty: 0,
    presence_penalty: 0,
    repetition_penalty: 1
  },
  creative: {
    temperature: 1.2,
    top_p: 0.9,
    top_k: 40,
    frequency_penalty: 0.1,
    presence_penalty: 0.1,
    repetition_penalty: 1.1
  },
  chaotic: {
    temperature: 1.8,
    top_p: 0.5,
    top_k: 100,
    frequency_penalty: 0.5,
    presence_penalty: 0.5,
    repetition_penalty: 1.5
  }
};

export const computeAutoTuneParams = (params: any): AutoTuneResult => {
  // Mock implementation returning current state or defaults
  return {
    params: STRATEGY_PROFILES.balanced,
    detectedContext: 'general',
    confidence: 1
  };
};

export const getContextLabel = (ctx: string) => ctx.toUpperCase();
export const getStrategyLabel = (strat: string) => strat.toUpperCase();
export const getStrategyDescription = (strat: string) => {
  const descriptions: Record<string, string> = {
    adaptive: 'Automatically adjusts based on context',
    precise: 'Strict adherence to instructions, good for logic/code',
    balanced: 'Standard conversational profile',
    creative: 'Expressive and varied responses',
    chaotic: 'Maximum randomness and unpredictability',
    default: 'Use model defaults'
  };
  return descriptions[strat] || 'Custom strategy';
};

