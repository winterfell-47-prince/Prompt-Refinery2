
export interface SemanticDiagnostic {
  html: string;
  leaks: number;
  repeatedPhrases: string[];
}

export function getSemanticDiagnostics(text: string): SemanticDiagnostic {
  if (!text || text.length < 20) return { html: text || '', leaks: 0, repeatedPhrases: [] };

  const sentences = text.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 10);
  let htmlResult = text;
  let leakCount = 0;
  const repeatedPhrases = new Set<string>();

  sentences.forEach(sentence => {
    const words = sentence.toLowerCase().split(/\s+/);
    for (let i = 0; i < words.length - 2; i++) {
      const nGram = words.slice(i, i + 3).join(" ");
      // Escape regex special chars
      const escapedNGram = nGram.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const occurrenceCount = (text.toLowerCase().match(new RegExp(`\\b${escapedNGram}\\b`, 'g')) || []).length;

      if (occurrenceCount > 1) {
        leakCount++;
        repeatedPhrases.add(nGram);
        // We don't do the HTML replacement here to avoid overlapping spans in a simple way, 
        // but we return the count and phrases for UI reporting.
      }
    }
  });

  return { 
    html: htmlResult, 
    leaks: leakCount, 
    repeatedPhrases: Array.from(repeatedPhrases) 
  };
}
