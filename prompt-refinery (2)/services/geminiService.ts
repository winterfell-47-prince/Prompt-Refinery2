
import { GoogleGenAI, Type } from "@google/genai";
import { OptimizationResult, CompressionLevel, OutputFormat, ModelStrategy } from "../types";

export const optimizePrompt = async (
  prompt: string,
  level: CompressionLevel,
  format: OutputFormat,
  strategy: ModelStrategy,
  useBetaModel: boolean = false
): Promise<OptimizationResult> => {
  // Create a new instance right before the call to ensure it uses the latest API key
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const modelName = useBetaModel ? "gemini-3.1-pro-preview" : "gemini-3-flash-preview";
  const systemInstruction = `
    You are "Prompt Refinery", an elite Prompt Engineer.
    Task: Re-sequence and optimize the provided prompt for maximum efficiency and clarity.
    
    STRATEGY CONTEXT: ${strategy}
    ${strategy === ModelStrategy.LEGAL ? `- Focus on removing linguistic fluff while keeping all legal clauses intact.` : ''}

    REFINERY METHODOLOGY:
    1. CORE TASK FIRST: Identify the central command. Put it at the very top.
    2. CONSTRAINTS LAST: Place guardrails and formatting rules at the end.
    3. SEMANTIC COMPRESSION: Remove any word that doesn't add logical weight.
    
    COMPRESSION LEVEL: ${level}
    OUTPUT FORMAT: ${format}

    Return a JSON object containing:
    - refinedText: The optimized prompt.
    - removedSegments: Array of {text, reason} for things cut.
    - scores: Object with {integrity: 0-100, efficiency: 0-100, complexity: 0-100}.
    - explanation: Short summary of the changes.
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelName,
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
            scores: {
              type: Type.OBJECT,
              properties: {
                integrity: { type: Type.NUMBER },
                efficiency: { type: Type.NUMBER },
                complexity: { type: Type.NUMBER }
              },
              required: ["integrity", "efficiency", "complexity"]
            },
            explanation: { type: Type.STRING }
          },
          required: ["refinedText", "removedSegments", "scores", "explanation"]
        }
      }
    });

    const result = JSON.parse(response.text);
    const estOriginal = Math.ceil(prompt.length / 4);
    const estRefined = Math.ceil(result.refinedText.length / 4);
    
    return {
      originalText: prompt,
      refinedText: result.refinedText,
      estimatedOriginalTokens: estOriginal,
      estimatedRefinedTokens: estRefined,
      savingsPercentage: Math.max(0, ((estOriginal - estRefined) / estOriginal) * 100),
      removedSegments: result.removedSegments,
      scores: result.scores,
      explanation: result.explanation,
      strategy,
      level
    };
  } catch (error) {
    console.error("Optimization failed:", error);
    throw new Error("Refinery process failed.");
  }
};

export const generateMarketDocument = async (targetCompany: string, industry: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `Generate an Executive Business Case for "${targetCompany}" in the "${industry}" industry regarding Prompt Refinery's token saving potential. Use professional Markdown.`;
  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: prompt,
  });
  return response.text || "Failed to generate document.";
};