
export interface OptimizationResult {
  originalText: string;
  refinedText: string;
  estimatedOriginalTokens: number;
  estimatedRefinedTokens: number;
  savingsPercentage: number;
  removedSegments: RemovedSegment[];
  semanticPreservationScore: number;
  explanation: string;
}

export interface RemovedSegment {
  text: string;
  reason: string;
}

export enum CompressionLevel {
  LIGHT = 'Light',
  MEDIUM = 'Balanced',
  AGGRESSIVE = 'Aggressive',
}

export enum OutputFormat {
  XML = 'XML Tags',
  STRUCTURED = 'Structured',
  MINIMAL = 'Minimalist',
}

export enum ModelStrategy {
  UNIVERSAL = 'Universal',
  GPT = 'GPT-4 Optimized',
  CLAUDE = 'Claude Optimized',
  DEEPSEEK = 'DeepSeek Optimized',
  LEGAL = 'Legal / Regulatory',
}

export interface HistoryItem extends OptimizationResult {
  id: string;
  timestamp: number;
}

export interface BatchItem {
  id: string;
  original: string;
  result?: OptimizationResult;
  status: 'pending' | 'processing' | 'completed' | 'error';
}

export interface BatchSummary {
  totalPrompts: number;
  totalOriginalTokens: number;
  totalRefinedTokens: number;
  totalSavingsPercent: number;
  estimatedDollarSavings: number;
}
