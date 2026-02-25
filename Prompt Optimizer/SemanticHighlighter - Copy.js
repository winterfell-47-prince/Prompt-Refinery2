function highlightSemanticLeaks(text) {
    // 1. Break text into sentences to find "Scattered Ideas"
    const sentences = text.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 20);
    let highlights = text;
    
    // 2. Identify "Concept Repetition" (3+ words in a row appearing elsewhere)
    sentences.forEach((sentence, index) => {
        const words = sentence.toLowerCase().split(/\s+/);
        for (let i = 0; i < words.length - 3; i++) {
            const nGram = words.slice(i, i + 3).join(" ");
            
            // Check if this 3-word "concept" exists in other sentences
            const occurrenceCount = (text.toLowerCase().match(new RegExp(nGram, 'g')) || []).length;
            
            if (occurrenceCount > 1) {
                // Highlight this "Logic Leak" in orange
                const regex = new RegExp(`(${nGram})`, 'gi');
                highlights = highlights.replace(regex, '<mark style="background: #ffcc00; color: black;">$1</mark>');
            }
        }
    });
    
    return highlights;
}

export function getSemanticDiagnostics(text) {
    if (!text || text.length < 20) return { html: text || '', leaks: 0 };

    const sentences = text.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 10);
    let htmlResult = text;
    let leakCount = 0;

    sentences.forEach(sentence => {
        const words = sentence.toLowerCase().split(/\s+/);
        for (let i = 0; i < words.length - 2; i++) {
            const nGram = words.slice(i, i + 3).join(" ");
            const occurrenceCount = (text.toLowerCase().match(new RegExp(nGram.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), 'g')) || []).length;

            if (occurrenceCount > 1) {
                leakCount++;
                const regex = new RegExp(`(${nGram.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, 'gi');
                htmlResult = htmlResult.replace(regex, '<mark style="background: rgba(255, 204, 0, 0.3); color: #ffcc00; border-bottom: 1px solid #ffcc00;">$1</mark>');
            }
        }
    });

    return { html: htmlResult, leaks: leakCount };
}