
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Zap, 
  Trash2, 
  Copy, 
  Check, 
  History as HistoryIcon, 
  LayoutDashboard,
  Cpu,
  ShieldCheck,
  ArrowRightLeft,
  Info,
  AlertTriangle,
  Code,
  FileUp,
  Download,
  Layers,
  Search,
  CheckCircle2,
  FileText
} from 'lucide-react';
import { optimizePrompt } from './services/geminiService';
import { 
  OptimizationResult, 
  CompressionLevel, 
  HistoryItem, 
  OutputFormat, 
  ModelStrategy,
  BatchItem,
  BatchSummary 
} from './types';
import { AnalysisChart } from './components/AnalysisChart';
import { BatchDashboard } from './components/BatchDashboard';
import { MarketSheet } from './components/MarketSheet';
import { getSemanticDiagnostics } from './utils/semantic';

// GPT-Tokenizer for accurate counting
// @ts-ignore
import { encode } from 'https://esm.sh/gpt-tokenizer@2.1.2';

const App: React.FC = () => {
  const [view, setView] = useState<'single' | 'batch' | 'business'>('single');
  const [input, setInput] = useState('');
  const [level, setLevel] = useState<CompressionLevel>(CompressionLevel.MEDIUM);
  const [format, setFormat] = useState<OutputFormat>(OutputFormat.XML);
  const [strategy, setStrategy] = useState<ModelStrategy>(ModelStrategy.UNIVERSAL);
  
  const [result, setResult] = useState<OptimizationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Batch States
  const [batchItems, setBatchItems] = useState<BatchItem[]>([]);
  const [batchLoading, setBatchLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Stats for Batch
  const batchSummary = useMemo((): BatchSummary => {
    const completed = batchItems.filter(i => i.status === 'completed' && i.result);
    const totalOrig = completed.reduce((acc, curr) => acc + (curr.result?.estimatedOriginalTokens || 0), 0);
    const totalRefined = completed.reduce((acc, curr) => acc + (curr.result?.estimatedRefinedTokens || 0), 0);
    const savings = totalOrig > 0 ? ((totalOrig - totalRefined) / totalOrig) * 100 : 0;
    
    // Calculate dollar savings: Assume 1M requests per month at $2.50/1M tokens (avg for input tokens)
    const dollarSavings = ((totalOrig - totalRefined) / 1000000) * 2.50 * 100000; // Scaled for demo purposes

    return {
      totalPrompts: completed.length,
      totalOriginalTokens: totalOrig,
      totalRefinedTokens: totalRefined,
      totalSavingsPercent: savings,
      estimatedDollarSavings: Math.round(dollarSavings)
    };
  }, [batchItems]);

  const originalTokenCount = useMemo(() => {
    try { return encode(input).length; } catch { return Math.ceil(input.length / 4); }
  }, [input]);

  const diagnostics = useMemo(() => getSemanticDiagnostics(input), [input]);

  useEffect(() => {
    const saved = localStorage.getItem('prompt_refinery_history');
    if (saved) {
      try { setHistory(JSON.parse(saved)); } catch (e) { console.error("History parse failed"); }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('prompt_refinery_history', JSON.stringify(history.slice(0, 10)));
  }, [history]);

  const copyToClipboard = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(err => {
      console.error('Failed to copy text: ', err);
    });
  };

  const handleOptimize = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await optimizePrompt(input, level, format, strategy);
      let finalResTokens = 0;
      try { finalResTokens = encode(res.refinedText).length; } catch { finalResTokens = Math.ceil(res.refinedText.length / 4); }
      
      const resWithRealTokens = {
        ...res,
        estimatedOriginalTokens: originalTokenCount,
        estimatedRefinedTokens: finalResTokens,
        savingsPercentage: ((originalTokenCount - finalResTokens) / originalTokenCount) * 100
      };

      setResult(resWithRealTokens);
      const newHistoryItem: HistoryItem = {
        ...resWithRealTokens,
        id: Math.random().toString(36).substr(2, 9),
        timestamp: Date.now()
      };
      setHistory(prev => [newHistoryItem, ...prev]);
    } catch (err: any) {
      setError(err.message || 'Optimization failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleBatchFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        let prompts: string[] = [];
        if (file.name.endsWith('.json')) {
          prompts = JSON.parse(content);
        } else {
          prompts = content.split('\n').filter(l => l.trim().length > 10);
        }
        
        const newBatch: BatchItem[] = prompts.map(p => ({
          id: Math.random().toString(36).substr(2, 9),
          original: p,
          status: 'pending'
        }));
        setBatchItems(newBatch);
      } catch (err) {
        setError("Failed to parse file. Use a JSON array of strings.");
      }
    };
    reader.readAsText(file);
  };

  const runBatchRefinery = async () => {
    if (batchLoading) return;
    setBatchLoading(true);
    setError(null);

    const itemsToProcess = batchItems.filter(i => i.status === 'pending');
    
    for (const item of itemsToProcess) {
      setBatchItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'processing' } : i));
      
      try {
        const res = await optimizePrompt(item.original, level, format, strategy);
        
        let origTokens = 0;
        let refTokens = 0;
        try { origTokens = encode(item.original).length; refTokens = encode(res.refinedText).length; } 
        catch { origTokens = Math.ceil(item.original.length/4); refTokens = Math.ceil(res.refinedText.length/4); }

        const resWithTokens = {
          ...res,
          estimatedOriginalTokens: origTokens,
          estimatedRefinedTokens: refTokens,
          savingsPercentage: ((origTokens - refTokens) / origTokens) * 100
        };

        setBatchItems(prev => prev.map(i => i.id === item.id ? { 
          ...i, 
          status: 'completed', 
          result: resWithTokens 
        } : i));
      } catch (err) {
        setBatchItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'error' } : i));
      }
      await new Promise(r => setTimeout(r, 200));
    }
    setBatchLoading(false);
  };

  const exportBatch = () => {
    const data = batchItems.filter(i => i.status === 'completed').map(i => ({
      original: i.original,
      refined: i.result?.refinedText,
      savings: i.result?.savingsPercentage
    }));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `refined_batch_${Date.now()}.json`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-20 selection:bg-indigo-500/30">
      <nav className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setView('single')}>
              <div className="p-2 bg-blue-600 rounded-lg shadow-lg shadow-blue-500/20">
                <Code className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight text-white flex items-center">
                Prompt<span className="text-blue-500">Refinery</span>
                <span className="ml-2 px-1.5 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-[10px] text-blue-400 font-mono">BETA</span>
              </span>
            </div>
            
            <div className="flex bg-slate-800/50 p-1 rounded-xl border border-slate-700">
              <button 
                onClick={() => setView('single')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${view === 'single' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
              >
                <Zap className="w-3.5 h-3.5" /> Single
              </button>
              <button 
                onClick={() => setView('batch')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${view === 'batch' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
              >
                <Layers className="w-3.5 h-3.5" /> Batch
              </button>
              <button 
                onClick={() => setView('business')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${view === 'business' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
              >
                <FileText className="w-3.5 h-3.5" /> Business Case
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {view === 'business' ? (
          <MarketSheet />
        ) : (
          <>
            {view === 'batch' && <BatchDashboard summary={batchSummary} />}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              <div className="lg:col-span-8 space-y-6">
                {view === 'single' ? (
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl transition-all hover:border-slate-700">
                    <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-1.5 text-slate-300">
                          <Cpu className="w-4 h-4" />
                          <span className="text-sm font-bold uppercase tracking-wider">Raw Prompt</span>
                        </div>
                        {diagnostics.leaks > 0 && (
                          <div className="flex items-center space-x-1.5 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[10px] font-bold">
                            <AlertTriangle className="w-3 h-3" />
                            <span>{diagnostics.leaks} SEMANTIC LEAKS</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className="text-xs text-slate-500 font-mono">Tokens: <b className="text-slate-300">{originalTokenCount.toLocaleString()}</b></span>
                        <button onClick={() => setInput('')} className="p-1.5 text-slate-500 hover:text-red-400 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Paste your verbose, inefficient prompt here..."
                      className="w-full h-80 bg-slate-950 p-6 text-slate-200 focus:outline-none resize-none font-mono text-sm leading-relaxed"
                    />

                    <div className="p-4 bg-slate-900/80 border-t border-slate-800 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-slate-500 font-bold uppercase">Strategy</label>
                        <select 
                          value={strategy} 
                          onChange={(e) => setStrategy(e.target.value as ModelStrategy)}
                          className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-blue-500 outline-none"
                        >
                          {Object.values(ModelStrategy).map(v => <option key={v} value={v}>{v}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-slate-500 font-bold uppercase">Syntax</label>
                        <select 
                          value={format} 
                          onChange={(e) => setFormat(e.target.value as OutputFormat)}
                          className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-blue-500 outline-none"
                        >
                          {Object.values(OutputFormat).map(v => <option key={v} value={v}>{v}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-slate-500 font-bold uppercase">Compress</label>
                        <select 
                          value={level} 
                          onChange={(e) => setLevel(e.target.value as CompressionLevel)}
                          className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-blue-500 outline-none"
                        >
                          {Object.values(CompressionLevel).map(v => <option key={v} value={v}>{v}</option>)}
                        </select>
                      </div>
                      <button
                        onClick={handleOptimize}
                        disabled={loading || !input.trim()}
                        className={`px-6 py-2.5 rounded-xl font-bold flex items-center justify-center space-x-2 transition-all shadow-lg ${
                          loading || !input.trim()
                            ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                            : 'bg-blue-600 hover:bg-blue-500 text-white active:scale-95'
                        }`}
                      >
                        {loading ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                        ) : (
                          <Zap className="w-4 h-4 fill-current" />
                        )}
                        <span>Refine</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
                    <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                      <div className="flex items-center space-x-3">
                        <FileUp className="w-5 h-5 text-blue-400" />
                        <span className="text-sm font-bold uppercase tracking-wider text-slate-300">Dataset Refinery</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input 
                          type="file" 
                          ref={fileInputRef} 
                          onChange={handleBatchFileUpload} 
                          className="hidden" 
                          accept=".json,.csv,.txt" 
                        />
                        <button 
                          onClick={() => fileInputRef.current?.click()}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 text-xs text-slate-300 hover:bg-slate-700 transition-colors flex items-center gap-2"
                        >
                          <FileUp className="w-3.5 h-3.5" /> Upload Batch
                        </button>
                        <button 
                          onClick={runBatchRefinery}
                          disabled={batchLoading || batchItems.length === 0}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                            batchLoading || batchItems.length === 0 ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-green-600 text-white hover:bg-green-500'
                          }`}
                        >
                          <Zap className="w-3.5 h-3.5" /> Start Refinery
                        </button>
                        {batchItems.some(i => i.status === 'completed') && (
                          <button 
                            onClick={exportBatch}
                            className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-500 flex items-center gap-2"
                          >
                            <Download className="w-3.5 h-3.5" /> Export
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="overflow-x-auto max-h-[500px]">
                      <table className="w-full text-left text-sm">
                        <thead className="sticky top-0 bg-slate-900 z-10 border-b border-slate-800 text-slate-500 text-[10px] uppercase font-bold">
                          <tr>
                            <th className="px-6 py-3">Status</th>
                            <th className="px-6 py-3">Source Excerpt</th>
                            <th className="px-6 py-3">Savings</th>
                            <th className="px-6 py-3">Integrity</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                          {batchItems.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="px-6 py-20 text-center text-slate-600 italic">
                                No batch data loaded. Upload a JSON array of prompts to begin auditing.
                              </td>
                            </tr>
                          ) : (
                            batchItems.map((item) => (
                              <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                                <td className="px-6 py-4">
                                  {item.status === 'completed' ? (
                                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                                  ) : item.status === 'processing' ? (
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent" />
                                  ) : item.status === 'error' ? (
                                    <AlertTriangle className="w-4 h-4 text-red-500" />
                                  ) : (
                                    <div className="w-4 h-4 rounded-full border-2 border-slate-700" />
                                  )}
                                </td>
                                <td className="px-6 py-4 text-xs text-slate-400 font-mono truncate max-w-xs">
                                  {item.original}
                                </td>
                                <td className="px-6 py-4 font-bold text-green-400">
                                  {item.result ? `-${item.result.savingsPercentage.toFixed(1)}%` : '--'}
                                </td>
                                <td className="px-6 py-4 text-slate-500">
                                  {item.result ? `${item.result.semanticPreservationScore}%` : '--'}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="bg-red-900/20 border border-red-500/50 p-4 rounded-xl text-red-200 text-sm flex items-start space-x-3">
                    <Info className="w-5 h-5 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {view === 'single' && result && !loading && (
                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
                      <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-green-500/10">
                        <div className="flex items-center space-x-2 text-green-400">
                          <ShieldCheck className="w-4 h-4" />
                          <span className="text-sm font-bold uppercase tracking-wider">Refined Output</span>
                        </div>
                        <button 
                          onClick={() => copyToClipboard(result.refinedText)}
                          className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            copied ? 'bg-green-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                          }`}
                        >
                          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          <span>{copied ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                      <div className="p-6 bg-slate-950 text-green-50 font-mono text-sm leading-relaxed border-b border-slate-800 whitespace-pre-wrap">
                        {result.refinedText}
                      </div>
                      <div className="p-4 bg-slate-900 grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center p-2 rounded-lg bg-green-500/5 border border-green-500/10">
                          <p className="text-[10px] text-slate-500 font-bold uppercase">Reduction</p>
                          <p className="text-lg font-bold text-green-400">{result.savingsPercentage.toFixed(1)}%</p>
                        </div>
                        <div className="text-center p-2 rounded-lg bg-blue-500/5 border border-blue-500/10">
                          <p className="text-[10px] text-slate-500 font-bold uppercase">New Tokens</p>
                          <p className="text-lg font-bold text-blue-400">{result.estimatedRefinedTokens}</p>
                        </div>
                        <div className="text-center p-2 rounded-lg bg-slate-800/50 border border-slate-800">
                          <p className="text-[10px] text-slate-500 font-bold uppercase">ROI/1M Req</p>
                          <p className="text-lg font-bold text-slate-300">${((result.estimatedOriginalTokens - result.estimatedRefinedTokens) / 1000000 * 2.50 * 1000).toFixed(0)}</p>
                        </div>
                        <div className="text-center p-2 rounded-lg bg-slate-800/50 border border-slate-800">
                          <p className="text-[10px] text-slate-500 font-bold uppercase">Integrity</p>
                          <p className="text-lg font-bold text-slate-300">{result.semanticPreservationScore}%</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
                      <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <ArrowRightLeft className="w-4 h-4" /> Refinery Logic Breakdown
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {result.removedSegments.map((seg, i) => (
                          <div key={i} className="group p-3 rounded-xl bg-slate-950 border border-slate-800 transition-colors hover:border-blue-500/30">
                            <p className="text-xs text-red-400 line-through mb-1.5 font-medium truncate italic" title={seg.text}>
                              &quot;{seg.text}&quot;
                            </p>
                            <p className="text-[11px] text-slate-400 leading-tight">
                              <span className="text-blue-400 font-bold mr-1 tracking-tighter">ACTION:</span>
                              {seg.reason}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="lg:col-span-4 space-y-6">
                <div className="bg-blue-600/5 border border-blue-500/20 rounded-2xl p-6">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                      <LayoutDashboard className="w-5 h-5 text-blue-400" />
                      Analytics
                  </h3>
                  {view === 'single' ? (
                    result ? (
                      <div className="space-y-6">
                          <AnalysisChart original={result.estimatedOriginalTokens} refined={result.estimatedRefinedTokens} />
                          <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
                            <p className="text-[11px] text-slate-400 leading-relaxed italic">
                              &quot;{result.explanation}&quot;
                            </p>
                          </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12 text-slate-600 border-2 border-dashed border-slate-800 rounded-xl">
                          <Info className="w-8 h-8 mb-2 opacity-20" />
                          <p className="text-xs font-medium">Awaiting input for analysis...</p>
                      </div>
                    )
                  ) : (
                    <div className="space-y-4">
                      <div className="p-4 bg-blue-600/10 border border-blue-500/30 rounded-xl text-center">
                        <p className="text-sm font-bold text-blue-400 uppercase tracking-widest mb-1">Scale Potential</p>
                        <p className="text-2xl font-bold text-white">${(batchSummary.estimatedDollarSavings * 12).toLocaleString()}</p>
                        <p className="text-[10px] text-blue-300">Annual Value Projection</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2 px-2">
                    <HistoryIcon className="w-3 h-3" /> Audit Log
                  </h3>
                  <div className="space-y-2">
                    {history.length === 0 ? (
                      <div className="p-8 text-center border border-slate-800/50 rounded-xl border-dashed">
                        <p className="text-[10px] text-slate-600 font-bold uppercase">Empty Log</p>
                      </div>
                    ) : (
                      history.map((item) => (
                        <div 
                          key={item.id} 
                          className="p-3 bg-slate-900/50 border border-slate-800 rounded-xl hover:bg-slate-900 transition-all group cursor-pointer"
                          onClick={() => { setView('single'); setResult(item); setInput(item.originalText); }}
                        >
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-[9px] text-blue-400 font-bold tracking-widest">-{item.savingsPercentage.toFixed(0)}% TOKENS</span>
                            <span className="text-[9px] text-slate-600 font-mono">{new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <p className="text-[11px] text-slate-400 line-clamp-1 font-mono">
                            {item.originalText}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default App;
