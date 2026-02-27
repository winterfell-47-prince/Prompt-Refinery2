# Prompt Refinery Logic Analysis - Scattered Context Handling

## Analysis of Prompt Refinement Logic

Based on my examination of the codebase, here's how the Prompt Refinery handles scattered context and semantics:

### 1. **Core Refinement Methodology**

The system uses a sophisticated approach to handle scattered context:

```typescript
REFINERY METHODOLOGY:
1. CORE TASK FIRST: Identify the central command. Put it at the very top.
2. CONSTRAINTS LAST: Place guardrails and formatting rules at the end.
3. SEMANTIC COMPRESSION: Remove any word that doesn't add logical weight.
```

### 2. **Semantic Analysis System**

The `getSemanticDiagnostics` function in `utils/semantic.ts` provides:

- **Leak Detection**: Identifies redundant phrases using n-gram analysis
- **Repetition Analysis**: Finds repeated 3-word phrases across the entire prompt
- **Context Scanning**: Analyzes the entire text, not just local sections

**Key Features:**
- Splits text into sentences for analysis
- Uses 3-word n-grams to detect semantic redundancy
- Counts occurrences across the entire prompt
- Returns both count and specific repeated phrases

### 3. **LLM-Based Refinement Logic**

The actual refinement is handled by LLM providers (Gemini, OpenAI, Anthropic, DeepSeek) with:

**System Instructions Include:**
- **Strategy Context**: Different approaches for different use cases (Legal, GPT-4, Claude, etc.)
- **Compression Levels**: Light, Balanced, Aggressive
- **Output Formats**: XML, Structured, Minimalist

### 4. **Scattered Context Handling**

The system handles scattered context through:

#### A. **Central Command Identification**
- LLM analyzes the entire prompt to find the core task
- Re-sequences instructions to put the main objective first
- Groups related constraints together

#### B. **Semantic Compression**
- Removes words that don't add "logical weight"
- Preserves semantic meaning while reducing verbosity
- Handles context that's spread throughout the prompt

#### C. **Constraint Reorganization**
- Collects all guardrails and formatting rules
- Places them at the end for better LLM processing
- Maintains all original constraints

### 5. **Quality Assurance**

The system provides detailed analysis:
- **Integrity Score**: Measures semantic preservation (0-100)
- **Efficiency Score**: Measures token density improvement (0-100)
- **Complexity Score**: Measures logical structure depth (0-100)
- **Removed Segments**: Lists what was cut and why
- **Explanation**: Summarizes the changes made

### 6. **Multi-Provider Support**

Different LLM providers handle scattered context differently:
- **Gemini**: Uses advanced semantic understanding
- **OpenAI**: Leverages GPT-4's instruction following
- **Anthropic**: Focuses on safety and constraint handling
- **DeepSeek**: Cost-effective semantic analysis

### 7. **Real-World Example**

For a prompt like:
> "Please write a comprehensive analysis of the impact of artificial intelligence on modern business operations, including but not limited to automation, decision-making processes, customer service improvements, and potential challenges that organizations might face when implementing AI technologies. Your response should be detailed and provide specific examples where applicable."

The system would:
1. **Identify Core Task**: "Write a comprehensive analysis of AI impact on business"
2. **Group Related Concepts**: Automation, decision-making, customer service, challenges
3. **Reorganize Structure**: Core task first, constraints last
4. **Remove Redundancy**: "comprehensive," "detailed," "where applicable"
5. **Preserve Semantics**: All key concepts maintained

### 8. **Conclusion**

**✅ YES, the logic handles scattered context effectively:**

1. **Semantic Analysis**: Detects redundant phrases across the entire prompt
2. **Central Command Extraction**: Identifies and prioritizes the main task
3. **Constraint Consolidation**: Groups scattered requirements
4. **Multi-Provider Intelligence**: Leverages advanced LLM capabilities
5. **Quality Metrics**: Ensures semantic preservation during compression

The system is specifically designed to handle prompts where:
- Key information is scattered throughout
- Redundant phrases appear in different sections
- Constraints are mixed with the main task
- Semantic meaning needs to be preserved while reducing verbosity

This makes it highly effective for real-world prompt optimization where context is often distributed and redundant.