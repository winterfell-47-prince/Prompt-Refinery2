import { GoogleGenAI, Type } from "@google/genai";
import { OptimizationResult, CompressionLevel, OutputFormat, ModelStrategy, LLMProvider, CustomAPIConfig } from "../types";

const getSystemInstruction = (strategy: ModelStrategy, format: OutputFormat, level: CompressionLevel): string => {
  return `
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
};

export const optimizePrompt = async (
  prompt: string,
  level: CompressionLevel,
  format: OutputFormat,
  strategy: ModelStrategy,
  provider: LLMProvider,
  apiKey: string,
  config?: { model?: string; endpoint?: string; useBetaModel?: boolean; customConfig?: CustomAPIConfig }
): Promise<OptimizationResult> => {
  switch (provider) {
    case LLMProvider.GOOGLE_GEMINI:
      return optimizeWithGemini(prompt, level, format, strategy, apiKey, config?.useBetaModel);
    case LLMProvider.OPENAI:
      return optimizeWithOpenAI(prompt, level, format, strategy, apiKey, config?.model);
    case LLMProvider.ANTHROPIC:
      return optimizeWithAnthropic(prompt, level, format, strategy, apiKey, config?.model);
    case LLMProvider.DEEPSEEK:
      return optimizeWithDeepSeek(prompt, level, format, strategy, apiKey, config?.model);
    case LLMProvider.CUSTOM:
      if (!config?.customConfig) throw new Error("Custom config required for custom provider");
      return optimizeWithCustomAPI(prompt, level, format, strategy, config.customConfig);
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
};

const optimizeWithGemini = async (
  prompt: string,
  level: CompressionLevel,
  format: OutputFormat,
  strategy: ModelStrategy,
  apiKey: string,
  useBetaModel: boolean = false
): Promise<OptimizationResult> => {
  const ai = new GoogleGenAI({ apiKey });
  const modelName = useBetaModel ? "gemini-3.1-pro-preview" : "gemini-3-flash-preview";
  const systemInstruction = getSystemInstruction(strategy, format, level);

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
    console.error("Gemini optimization failed:", error);
    throw new Error("Gemini optimization failed.");
  }
};

const optimizeWithOpenAI = async (
  prompt: string,
  level: CompressionLevel,
  format: OutputFormat,
  strategy: ModelStrategy,
  apiKey: string,
  model: string = "gpt-4o-mini"
): Promise<OptimizationResult> => {
  const systemInstruction = getSystemInstruction(strategy, format, level);

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemInstruction },
          { role: "user", content: prompt }
        ],
        temperature: 0.1,
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const result = JSON.parse(data.choices[0].message.content);
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
    console.error("OpenAI optimization failed:", error);
    throw new Error("OpenAI optimization failed.");
  }
};

const optimizeWithAnthropic = async (
  prompt: string,
  level: CompressionLevel,
  format: OutputFormat,
  strategy: ModelStrategy,
  apiKey: string,
  model: string = "claude-3-5-sonnet-20241022"
): Promise<OptimizationResult> => {
  const systemInstruction = getSystemInstruction(strategy, format, level);

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        system: systemInstruction,
        messages: [{ role: "user", content: prompt }]
      })
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status}`);
    }

    const data = await response.json();
    const result = JSON.parse(data.content[0].text);
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
    console.error("Anthropic optimization failed:", error);
    throw new Error("Anthropic optimization failed.");
  }
};

const optimizeWithDeepSeek = async (
  prompt: string,
  level: CompressionLevel,
  format: OutputFormat,
  strategy: ModelStrategy,
  apiKey: string,
  model: string = "deepseek-chat"
): Promise<OptimizationResult> => {
  const systemInstruction = getSystemInstruction(strategy, format, level);

  try {
    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemInstruction },
          { role: "user", content: prompt }
        ],
        temperature: 0.1,
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      throw new Error(`DeepSeek API error: ${response.status}`);
    }

    const data = await response.json();
    const result = JSON.parse(data.choices[0].message.content);
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
    console.error("DeepSeek optimization failed:", error);
    throw new Error("DeepSeek optimization failed.");
  }
};

const optimizeWithCustomAPI = async (
  prompt: string,
  level: CompressionLevel,
  format: OutputFormat,
  strategy: ModelStrategy,
  customConfig: CustomAPIConfig
): Promise<OptimizationResult> => {
  const systemInstruction = getSystemInstruction(strategy, format, level);
  let requestBody: any;

  if (customConfig.requestFormat === 'openai') {
    requestBody = {
      model: customConfig.model,
      messages: [
        { role: 'system', content: systemInstruction },
        { role: 'user', content: prompt }
      ],
      temperature: 0.1
    };
  } else if (customConfig.requestFormat === 'anthropic') {
    requestBody = {
      model: customConfig.model,
      system: systemInstruction,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 4096,
      temperature: 0.1
    };
  } else {
    requestBody = {
      model: customConfig.model,
      messages: [
        { role: 'system', content: systemInstruction },
        { role: 'user', content: prompt }
      ]
    };
  }

  try {
    const response = await fetch(customConfig.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        [customConfig.authHeader]: customConfig.authValue
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();
    let result: any;

    if (customConfig.requestFormat === 'anthropic') {
      result = JSON.parse(data.content[0].text);
    } else {
      result = JSON.parse(data.choices[0].message.content);
    }

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
    console.error("Custom API optimization failed:", error);
    throw new Error("Custom API optimization failed.");
  }
};

export const generateMarketDocument = async (targetCompany: string, industry: string, provider: LLMProvider, apiKey: string, model?: string): Promise<string> => {
  if (provider === LLMProvider.GOOGLE_GEMINI) {
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `Generate an Executive Business Case for "${targetCompany}" in the "${industry}" industry regarding Prompt Refinery's token saving potential. Use professional Markdown.`;
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: prompt,
    });
    return response.text || "Failed to generate document.";
  } else if (provider === LLMProvider.OPENAI) {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model || "gpt-4o-mini",
        messages: [
          { role: "user", content: `Generate an Executive Business Case for "${targetCompany}" in the "${industry}" industry regarding Prompt Refinery's token saving potential. Use professional Markdown.` }
        ]
      })
    });
    const data = await response.json();
    return data.choices[0].message.content;
  }
  return "Provider not supported for document generation.";
};
