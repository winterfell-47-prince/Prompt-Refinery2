
import React, { useState } from 'react';
import { 
  TrendingDown, 
  ShieldCheck, 
  Scale, 
  BarChart3, 
  DollarSign, 
  AlertCircle, 
  CheckCircle2,
  ChevronRight,
  Target,
  Zap,
  FileText,
  Loader2,
  Printer,
  Download
} from 'lucide-react';
import { generateMarketDocument } from '../services/geminiService';

export const MarketSheet: React.FC = () => {
  const [monthlyVolume, setMonthlyVolume] = useState(10); // Millions of tokens
  const [targetCompany, setTargetCompany] = useState('');
  const [industry, setIndustry] = useState('LegalTech');
  const [generatedDoc, setGeneratedDoc] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const calculateAnnualSavings = () => {
    const avgTokenCost = 2.50; // $ per 1M tokens
    const avgSavingsPercent = 0.30; // 30% reduction
    return Math.round(monthlyVolume * avgTokenCost * avgSavingsPercent * 12);
  };

  const handleGeneratePitch = async () => {
    if (!targetCompany) return;
    setIsGenerating(true);
    try {
      const doc = await generateMarketDocument(targetCompany, industry);
      setGeneratedDoc(doc);
    } catch (error) {
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-12 pb-20">
      {/* Hero Section */}
      <div className="text-center space-y-4 pt-4">
        <h1 className="text-4xl md:text-6xl font-extrabold text-white tracking-tight">
          The <span className="text-blue-500">Invisible Tax</span> on Enterprise AI
        </h1>
        <p className="text-slate-400 text-lg max-w-2xl mx-auto">
          30-40% of enterprise AI budgets are wasted on linguistic redundancy and "polite" structural fluff. Prompt Refinery recovers that margin instantly.
        </p>
      </div>

      {/* Market Document Generator Form */}
      <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 md:p-12 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <FileText className="w-48 h-48 text-blue-500" />
        </div>
        
        <div className="relative z-10 space-y-8">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Target className="w-6 h-6 text-blue-500" />
              Generate Personalized Business Case
            </h2>
            <p className="text-slate-400 text-sm">Target a specific company and generate a custom sales document using Gemini 3 Pro.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase">Target Company</label>
              <input 
                type="text" 
                placeholder="e.g. Goldman Sachs, DLA Piper, Stripe"
                value={targetCompany}
                onChange={(e) => setTargetCompany(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase">Industry Vertical</label>
              <select 
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all appearance-none"
              >
                <option>LegalTech</option>
                <option>FinTech</option>
                <option>Enterprise SaaS</option>
                <option>E-commerce</option>
                <option>Healthcare Data</option>
              </select>
            </div>
          </div>

          <button 
            onClick={handleGeneratePitch}
            disabled={isGenerating || !targetCompany}
            className="w-full md:w-auto px-10 py-4 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-500 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {isGenerating ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Zap className="w-5 h-5 fill-current" />
            )}
            {isGenerating ? 'Analyzing Target & Generating...' : 'Generate AI-Powered Pitch'}
          </button>
        </div>

        {generatedDoc && (
          <div className="mt-12 animate-in fade-in zoom-in-95 duration-500">
            <div className="bg-white text-slate-900 rounded-3xl p-8 md:p-12 shadow-2xl overflow-hidden font-serif">
              <div className="flex justify-between items-center mb-8 border-b border-slate-200 pb-6">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
                    <Code className="w-4 h-4 text-white" />
                  </div>
                  <span className="font-sans font-bold text-slate-400 text-xs tracking-widest">PROMPT REFINERY | INTERNAL MEMO</span>
                </div>
                <div className="flex gap-2">
                   <button onClick={() => window.print()} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors">
                      <Printer className="w-4 h-4" />
                   </button>
                   <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors">
                      <Download className="w-4 h-4" />
                   </button>
                </div>
              </div>
              <div className="prose prose-slate max-w-none whitespace-pre-wrap leading-relaxed">
                {generatedDoc}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* The Core Problem Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-8 bg-slate-900 border border-slate-800 rounded-3xl space-y-4">
          <div className="w-12 h-12 bg-red-500/10 rounded-2xl flex items-center justify-center">
            <TrendingDown className="w-6 h-6 text-red-400" />
          </div>
          <h3 className="text-xl font-bold text-white">Token Inflation</h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            Legacy prompts contain 25-40% unnecessary "connective tissue." At scale, this translates to thousands of dollars in wasted API spend every month.
          </p>
        </div>

        <div className="p-8 bg-slate-900 border border-slate-800 rounded-3xl space-y-4">
          <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-amber-400" />
          </div>
          <h3 className="text-xl font-bold text-white">Middle-Bias Loss</h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            LLMs naturally "get lost" in verbose instructions. Re-sequencing key tasks to the start (Primacy) and constraints to the end (Recency) is critical for accuracy.
          </p>
        </div>

        <div className="p-8 bg-slate-900 border border-slate-800 rounded-3xl space-y-4">
          <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-blue-400" />
          </div>
          <h3 className="text-xl font-bold text-white">Instruction Drift</h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            Poorly structured prompts allow the model to drift into "conversational mode." Semantic pruning forces the AI back to strict instruction following.
          </p>
        </div>
      </div>

      {/* ROI Calculator */}
      <div className="bg-slate-90