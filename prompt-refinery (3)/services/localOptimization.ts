import { OptimizationResult, CompressionLevel, OutputFormat, ModelStrategy } from "../types";

/**
 * Local Prompt Optimization Service
 * Provides prompt refinement without external API dependencies
 * Uses rule-based algorithms and semantic analysis
 */

export interface LocalOptimizationConfig {
  strategy: ModelStrategy;
  level: CompressionLevel;
  format: OutputFormat;
  preserveKeywords: string[];
  maxIterations: number;
}

export const optimizePromptLocally = async (
  prompt: string,
  config: LocalOptimizationConfig
): Promise<OptimizationResult> => {
  const startTime = Date.now();
  
  // Step 1: Analyze original prompt
  const originalAnalysis = analyzePrompt(prompt);
  const estOriginalTokens = Math.ceil(prompt.length / 4);

  // Step 2: Apply optimization strategies
  let refinedText = prompt;
  const removedSegments: Array<{ text: string; reason: string }> = [];

  // Apply compression based on level
  refinedText = applyCompression(refinedText, config.level, removedSegments, config.preserveKeywords);
  
  // Apply strategy-specific optimizations
  refinedText = applyStrategyOptimization(refinedText, config.strategy, removedSegments);
  
  // Apply format-specific optimizations
  refinedText = applyFormatOptimization(refinedText, config.format, removedSegments);

  // Step 3: Final cleanup and validation
  refinedText = finalCleanup(refinedText, config.preserveKeywords);
  
  const estRefinedTokens = Math.ceil(refinedText.length / 4);
  const savingsPercentage = Math.max(0, ((estOriginalTokens - estRefinedTokens) / estOriginalTokens) * 100);

  // Step 4: Calculate scores
  const scores = calculateScores(originalAnalysis, refinedText, savingsPercentage, config.level);

  const processingTime = Date.now() - startTime;

  return {
    originalText: prompt,
    refinedText,
    estimatedOriginalTokens: estOriginalTokens,
    estimatedRefinedTokens: estRefinedTokens,
    savingsPercentage,
    removedSegments,
    scores,
    explanation: generateExplanation(config.strategy, config.level, savingsPercentage, removedSegments.length, processingTime),
    strategy: config.strategy,
    level: config.level
  };
};

// Analysis functions
function analyzePrompt(prompt: string) {
  const sentences = prompt.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 0);
  const words = prompt.split(/\s+/).filter(w => w.length > 0);
  const paragraphs = prompt.split(/\n\s*\n/).filter(p => p.trim().length > 0);
  
  return {
    sentences,
    words,
    paragraphs,
    totalWords: words.length,
    totalSentences: sentences.length,
    totalParagraphs: paragraphs.length,
    avgWordsPerSentence: words.length / Math.max(1, sentences.length),
    complexity: calculateComplexity(prompt)
  };
}

function calculateComplexity(prompt: string): number {
  // Simple complexity scoring based on various factors
  let score = 0;
  
  // Length complexity
  if (prompt.length > 2000) score += 20;
  else if (prompt.length > 1000) score += 10;
  else if (prompt.length > 500) score += 5;
  
  // Sentence complexity
  const sentences = prompt.split(/[.!?]+/);
  const avgSentenceLength = prompt.split(/\s+/).length / Math.max(1, sentences.length);
  if (avgSentenceLength > 25) score += 15;
  else if (avgSentenceLength > 15) score += 10;
  else if (avgSentenceLength > 10) score += 5;
  
  // Vocabulary complexity (simple heuristic)
  const uniqueWords = new Set(prompt.toLowerCase().split(/\s+/));
  const vocabRatio = uniqueWords.size / Math.max(1, prompt.split(/\s+/).length);
  if (vocabRatio > 0.6) score += 10;
  else if (vocabRatio > 0.4) score += 5;
  
  return Math.min(100, score);
}

// Compression functions
function applyCompression(
  text: string, 
  level: CompressionLevel, 
  removedSegments: Array<{ text: string; reason: string }>,
  preserveKeywords: string[]
): string {
  let result = text;
  
  // Remove redundant phrases
  result = removeRedundantPhrases(result, removedSegments, preserveKeywords);
  
  // Remove filler words
  result = removeFillerWords(result, removedSegments, preserveKeywords);
  
  // Apply compression level specific optimizations
  switch (level) {
    case CompressionLevel.LIGHT:
      result = applyLightCompression(result, removedSegments, preserveKeywords);
      break;
    case CompressionLevel.MEDIUM:
      result = applyBalancedCompression(result, removedSegments, preserveKeywords);
      break;
    case CompressionLevel.AGGRESSIVE:
      result = applyAggressiveCompression(result, removedSegments, preserveKeywords);
      break;
  }
  
  return result;
}

function removeRedundantPhrases(
  text: string, 
  removedSegments: Array<{ text: string; reason: string }>,
  preserveKeywords: string[]
): string {
  const redundantPatterns = [
    /\b(in order to|in order for)\b/gi,
    /\b(very (very|extremely|really)|really (really|very))\b/gi,
    /\b(completely|totally|absolutely) (unnecessary|useless|pointless)\b/gi,
    /\b(start by|begin by|first of all)\b/gi,
    /\b(as mentioned above|as stated earlier|as previously mentioned)\b/gi,
    /\b(it is important to note that|it should be noted that|it is worth mentioning that)\b/gi,
    /\b(in my opinion|in my view|from my perspective)\b/gi,
    /\b(personally speaking|from my experience)\b/gi
  ];
  
  let result = text;
  redundantPatterns.forEach(pattern => {
    const matches = result.match(pattern);
    if (matches) {
      matches.forEach(match => {
        if (!preserveKeywords.some(keyword => match.toLowerCase().includes(keyword.toLowerCase()))) {
          removedSegments.push({
            text: match,
            reason: "Redundant phrase removed"
          });
          result = result.replace(pattern, '');
        }
      });
    }
  });
  
  return result.trim();
}

function removeFillerWords(
  text: string, 
  removedSegments: Array<{ text: string; reason: string }> ,
  preserveKeywords: string[]
): string {
  const fillerWords = [
    /\b(just|simply|basically|essentially|literally|actually|really|very|quite|rather|pretty|so)\b/gi,
    /\b(a little bit|kind of|sort of|somewhat|rather|fairly|quite)\b/gi,
    /\b(that is|this is|it is|there is|here is)\b/gi,
    /\b(in terms of|with regard to|in relation to|as far as)\b/gi,
    /\b(maybe|perhaps|possibly|probably|likely)\b/gi,
    /\b(well|now|then|so|okay|alright)\b/gi
  ];
  
  let result = text;
  fillerWords.forEach(pattern => {
    const matches = result.match(pattern);
    if (matches) {
      matches.forEach(match => {
        if (!preserveKeywords.some(keyword => match.toLowerCase().includes(keyword.toLowerCase()))) {
          removedSegments.push({
            text: match,
            reason: "Filler word removed"
          });
          result = result.replace(pattern, '');
        }
      });
    }
  });
  
  return result.trim();
}

function applyLightCompression(
  text: string, 
  removedSegments: Array<{ text: string; reason: string }>,
  preserveKeywords: string[]
): string {
  // Light compression: minimal changes
  return text;
}

function applyBalancedCompression(
  text: string, 
  removedSegments: Array<{ text: string; reason: string }>,
  preserveKeywords: string[]
): string {
  // Balanced compression: moderate optimization
  let result = text;
  
  // Remove extra whitespace
  result = result.replace(/\s+/g, ' ').trim();
  
  // Remove unnecessary punctuation
  result = result.replace(/([.!?])\s*\1+/g, '$1');
  
  return result;
}

function applyAggressiveCompression(
  text: string, 
  removedSegments: Array<{ text: string; reason: string }>,
  preserveKeywords: string[]
): string {
  // Aggressive compression: maximum optimization
  let result = text;
  
  // Remove extra whitespace
  result = result.replace(/\s+/g, ' ').trim();
  
  // Remove unnecessary punctuation
  result = result.replace(/([.!?])\s*\1+/g, '$1');
  
  // Remove unnecessary articles
  result = result.replace(/\b(a|an|the)\s+/gi, '');
  
  // Shorten common phrases
  result = result.replace(/\b(in order to)\b/gi, 'to');
  result = result.replace(/\b(because of the fact that)\b/gi, 'because');
  result = result.replace(/\b(in the event that)\b/gi, 'if');
  
  return result;
}

// Strategy-specific optimizations
function applyStrategyOptimization(
  text: string, 
  strategy: ModelStrategy, 
  removedSegments: Array<{ text: string; reason: string }>
): string {
  switch (strategy) {
    case ModelStrategy.LEGAL:
      return optimizeForLegal(text, removedSegments);
    case ModelStrategy.GPT:
      return optimizeForGPT4(text, removedSegments);
    case ModelStrategy.CLAUDE:
      return optimizeForClaude(text, removedSegments);
    default:
      return optimizeUniversal(text, removedSegments);
  }
}

function optimizeForLegal(
  text: string, 
  removedSegments: Array<{ text: string; reason: string }>
): string {
  // Legal strategy: preserve all clauses, remove only obvious redundancies
  let result = text;
  
  // Remove obvious redundancies while preserving legal language
  result = result.replace(/\b(and\/or)\b/gi, 'or');
  result = result.replace(/\b(each and every)\b/gi, 'each');
  result = result.replace(/\b(full and complete)\b/gi, 'full');
  
  return result;
}

function optimizeForGPT4(
  text: string, 
  removedSegments: Array<{ text: string; reason: string }>
): string {
  // GPT-4 strategy: optimize for clarity and directness
  let result = text;
  
  // Remove conversational filler
  result = result.replace(/\b(please|could you|would you)\b/gi, '');
  result = result.replace(/\b(be sure to|make sure to)\b/gi, 'ensure');
  
  return result.trim();
}

function optimizeForClaude(
  text: string, 
  removedSegments: Array<{ text: string; reason: string }>
): string {
  // Claude strategy: optimize for structured, clear instructions
  let result = text;
  
  // Improve structure
  result = result.replace(/\b(and also)\b/gi, 'and');
  result = result.replace(/\b(in addition to)\b/gi, 'plus');
  
  return result.trim();
}

function optimizeUniversal(
  text: string, 
  removedSegments: Array<{ text: string; reason: string }>
): string {
  // Universal strategy: general optimization
  let result = text;
  
  // General improvements
  result = result.replace(/\b(very|really|quite)\b\s*/gi, '');
  result = result.replace(/\b(so|very|really) (much|many|big|small)\b/gi, '$2');
  
  return result.trim();
}

// Format-specific optimizations
function applyFormatOptimization(
  text: string, 
  format: OutputFormat, 
  removedSegments: Array<{ text: string; reason: string }>
): string {
  switch (format) {
    case OutputFormat.XML:
      return optimizeForXML(text, removedSegments);
    case OutputFormat.STRUCTURED:
      return optimizeForStructured(text, removedSegments);
    case OutputFormat.MINIMAL:
      return optimizeForMinimalist(text, removedSegments);
    default:
      return text;
  }
}

function optimizeForXML(
  text: string, 
  removedSegments: Array<{ text: string; reason: string }>
): string {
  // XML format: ensure proper structure
  return text;
}

function optimizeForStructured(
  text: string, 
  removedSegments: Array<{ text: string; reason: string }>
): string {
  // Structured format: improve organization
  let result = text;
  
  // Ensure proper line breaks for readability
  result = result.replace(/([.!?])\s*([A-Z])/g, '$1\n$2');
  
  return result;
}

function optimizeForMinimalist(
  text: string, 
  removedSegments: Array<{ text: string; reason: string }>
): string {
  // Minimalist format: maximum conciseness
  let result = text;
  
  // Remove all unnecessary words
  result = result.replace(/\b(please|kindly|thank you|regards)\b/gi, '');
  result = result.replace(/\b(the|a|an)\s+/gi, '');
  result = result.replace(/\s+/g, ' ').trim();
  
  return result;
}

// Final cleanup
function finalCleanup(
  text: string, 
  preserveKeywords: string[]
): string {
  let result = text;
  
  // Remove extra whitespace
  result = result.replace(/\s+/g, ' ').trim();
  
  // Remove trailing punctuation if not appropriate
  result = result.replace(/[.!?]+\s*$/g, '');
  
  // Ensure proper capitalization
  result = result.charAt(0).toUpperCase() + result.slice(1);
  
  return result;
}

// Score calculation
function calculateScores(
  originalAnalysis: any,
  refinedText: string,
  savingsPercentage: number,
  level: CompressionLevel
): { integrity: number; efficiency: number; complexity: number } {
  const refinedAnalysis = analyzePrompt(refinedText);
  
  // Integrity score: how much original meaning is preserved
  let integrity = 80; // Base score
  
  // Adjust based on compression level
  if (level === CompressionLevel.AGGRESSIVE) {
    integrity -= 10;
  } else if (level === CompressionLevel.LIGHT) {
    integrity += 5;
  }
  
  // Adjust based on complexity preservation
  const complexityChange = refinedAnalysis.complexity - originalAnalysis.complexity;
  if (complexityChange < -10) {
    integrity -= 5;
  }
  
  // Efficiency score: how much was optimized
  let efficiency = Math.min(100, savingsPercentage * 2);
  
  // Complexity score: how complex the result is
  let complexity = refinedAnalysis.complexity;
  
  return {
    integrity: Math.max(0, Math.min(100, integrity)),
    efficiency: Math.max(0, Math.min(100, efficiency)),
    complexity: Math.max(0, Math.min(100, complexity))
  };
}

// Explanation generation
function generateExplanation(
  strategy: ModelStrategy,
  level: CompressionLevel,
  savingsPercentage: number,
  removedCount: number,
  processingTime: number
): string {
  return `Local optimization completed in ${processingTime}ms.
Strategy: ${strategy}, Level: ${level}
Token savings: ${savingsPercentage.toFixed(1)}%
Removed segments: ${removedCount}
Integrity preserved through rule-based analysis.`;
}