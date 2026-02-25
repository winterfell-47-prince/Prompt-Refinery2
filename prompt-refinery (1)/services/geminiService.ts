
import { GoogleGenAI, Type } from "@google/genai";
import { OptimizationResult, CompressionLevel, OutputFormat, ModelStrategy } from "../types";

export const optimizePrompt = async (
  prompt: string,
  level: CompressionLevel,
  format: OutputFormat,
  strategy: ModelStrategy
): Promise<OptimizationResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const systemInstruction = `
    You are "Prompt Refinery", an elite Prompt Engineer specializing in token optimization for high-scale enterprise AI pipelines.
    Task: Re-sequence and optimize the provided prompt for maximum efficiency and clarity.
    
    STRATEGY CONTEXT: ${strategy}
    ${strategy === ModelStrategy.LEGAL ? `
    - SPECIAL FOCUS: LEGAL/REGULATORY. 
    - Strip "polite legalese" (e.g., "It is requested that", "We kindly ask you to ensure").
    - Retain all legal definitions, clause numbers, and jurisdictional references.
    - Convert verbose procedural instructions into concise logical constraints.
    ` : ''}

    REFINERY METHODOLOGY:
    1. RE-SEQUENCE: 
       - Identify the "Core Task". Place it at the top.
       - Identify "Constraints". Move these to the bottom.
       - Place "Context" or "Role" information between the Task and Constraints.
    2. STRIP FLUFF: Remove polite filler, meta-commentary, and linguistic redundancy.
    3. APPLY FORMAT: ${format} syntax.
    
    COMPRESSION LEVEL: ${level}
    
    Return the result in JSON format with refinedText, removedSegments (array of {text, reason}), explanation, and semanticPreservationScore (1-100).
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            refinedText: { type: Type.STRING },
            removedSegments: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  text: { type: Type.STRING },
                  reason: { type: Type.STRING }
                },
                required: ["text", "reason"]
              }
            },
            explanation: { type: Type.STRING },
            semanticPreservationScore: { type: Type.NUMBER }
          },
          required: ["refinedText", "removedSegments", "explanation", "semanticPreservationScore"]
        }
      }
    });

    const result = JSON.parse(response.text);
    const estOriginal = Math.ceil(prompt.length / 4);
    const estRefined = Math.ceil(result.refinedText.length / 4);
    const savings = ((estOriginal - estRefined) / estOriginal) * 100;

    return {
      originalText: prompt,
      refinedText: result.refinedText,
      estimatedOriginalTokens: estOriginal,
      estimatedRefinedTokens: estRefined,
      savingsPercentage: Math.max(0, savings),
      removedSegments: result.removedSegments,
      explanation: result.explanation,
      semanticPreservationScore: result.semanticPreservationScore
    };
  } catch (error) {
    console.error("Optimization failed:", error);
    throw new Error("Refinery process failed.");
  }
};

export const generateMarketDocument = async (targetCompany: string, industry: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `
    Generate a high-stakes "Executive Business Case" for a company called "${targetCompany}" in the "${industry}" industry.
    The document should convince their CTO/COO to adopt "Prompt Refinery" to slash their AI tokenization costs.
    
    Structure the document as follows:
    1. Executive Summary: The $1M+ Token Opportunity.
    2. The "Invisible Token Tax" Audit: Why their current prompts are wasting 30% of their budget.
    3. Sector-Specific Impact: How Prompt Refinery optimizes ${industry}-specific instructions (e.g., if legal, focus on contract density; if retail, focus on customer intent).
    4. Quality Preservation: Explaining the "Primacy/Recency" re-sequencing for zero-loss accuracy.
    5. Financial Projection: Estimated 12-month ROI.
    6. Implementation Roadmap: 200ms latency impact vs. 1.5s generation speedup.

    Tone: Elite Management Consultant (McKinsey/BCG style). Analytical, cold-eyed about efficiency, and value-driven.
    Format: Professional Markdown.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: prompt,
    config: {
      temperature: 0.7,
      topP: 0.95,
    },
  });

  return response.text || "Failed to generate document.";
};
