export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  model?: string;
  persona?: string;
  id?: string;
  autoTuneParams?: any;
  autoTuneContext?: string;
  autoTuneContextScores?: any[];
  autoTunePatternMatches?: any[];
  autoTuneDeltas?: any[];
  attachments?: Attachment[];
  thinking?: {
    logs: ThinkingLog[];
    models?: ThinkingModelStatus[];
    title?: string;
  };
}

export interface Attachment {
  id: string;
  type: 'image' | 'file';
  mimeType: string;
  name: string;
  url: string; // base64 or object URL
}

export interface Conversation {
  id: string;
  title?: string;
  messages: Message[];
  model: string;
  persona: string;
}

export interface Persona {
  id: string;
  name?: string;
  systemPrompt?: string;
  coreDirective?: string;
  codename?: string;
  color?: string;
}

export interface STMModule {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  transformer: (text: string) => string;
}

export type Theme = 'matrix' | 'hacker' | 'solar' | 'glyph' | 'minimal' | 'carbon';

export type MemoryType = 'fact' | 'preference' | 'instruction';

export interface Memory {
  id: string;
  type: MemoryType;
  content: string;
  source: 'manual' | 'auto';
  active: boolean;
}

export interface TierInfo {
  tier: string;
  label: string;
  limits: {
    total: number;
    perMinute: number;
    perDay: number;
  };
}

export interface ParseltongueConfig {
  enabled: boolean;
  technique: string;
  intensity: string;
  customTriggers: string[];
}

export interface AutoTuneResult {
  params: any;
  detectedContext: string;
  contextScores: any[];
  patternMatches: any[];
  paramDeltas: any[];
  confidence: number;
}

export interface ClassificationResult {
  tier: string;
  category: string;
  confidence: number;
}

export interface ThinkingLog {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warn' | 'fail' | 'step';
  timestamp: number;
}

export interface ThinkingModelStatus {
  id: string;
  codename: string;
  status: 'pending' | 'running' | 'success' | 'fail';
  score?: number | null;
  color?: string;
  error?: string;
}

export interface ThinkingState {
  active: boolean;
  title: string;
  logs: ThinkingLog[];
  models: ThinkingModelStatus[];
  currentLeader?: {
    model: string;
    score: number;
    content: string;
  };
  promptPreview?: {
    codename: string;
    color: string;
    systemHtml: string;
    userHtml: string;
  };
}
