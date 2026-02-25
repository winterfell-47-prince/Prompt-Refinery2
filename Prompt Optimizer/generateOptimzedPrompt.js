// Add these more aggressive "Refinery" patterns
const INTENT_MARKERS = {
    role: /\b(act as|you are|professional|expert)\b/gi,
    constraint: /\b(must|ensure|limit|never|only|always|do not)\b/gi,
    output: /\b(json|markdown|table|csv|format)\b/gi
};

// In your generateOptimizedPrompt function:
// Instead of just replacing "fluff", try to re-sequence the prompt:
function refineryLogic(text) {
    // 1. Strip the fluff (your existing code)
    // 2. Identify the 'Core Task' (usually the first verb-heavy sentence)
    // 3. Move 'Constraints' to the bottom
    // 4. Wrap in your XML tags
}