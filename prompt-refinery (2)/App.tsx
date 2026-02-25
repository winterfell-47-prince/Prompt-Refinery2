
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Zap, Trash2, Copy, Check, History as HistoryIcon, LayoutDashboard, Cpu, 
  ShieldCheck, ArrowRightLeft, Info, AlertTriangle, Code, FileUp, 
  Download, Layers, FileText, CheckCircle2, TrendingDown, DollarSign, Clock
} from 'lucide-react';
import { optimizePrompt } from './services/geminiService';
import { 
  OptimizationResult, CompressionLevel, HistoryItem, OutputFormat, 
  ModelStrategy, BatchItem, BatchSummary 
} from './types';
import { AnalysisChart } from './components/AnalysisChart';
import { BatchDashboard } from './components/BatchDashboard';
import { MarketSheet } from './components/MarketSheet';
import { getSemanticDiagnostics } from './utils/semantic';

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

  // Lifetime Stats
  const lifetimeStats = useMemo(() => {
    const totalSaved = history.reduce((acc, curr) => acc + (curr.estimatedOriginalTokens - curr.estimatedRefinedTokens), 0);
    const dollarsSaved = (totalSaved / 1000) * 0.03; // Base price $0.03/1k tokens
    return { totalSaved, dollarsSaved };
  }, [history]);

  // Batch States
  const [batchItems, setBatchItems] = useState<BatchItem[]>([]);
  const [batchLoading, setBatchLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const batchSummary = useMemo((): BatchSummary => {
    const completed = batchItems.filter(i => i.status === 'completed' && i.result);
    const totalOrig = completed.reduce((acc, curr) => acc + (curr.result?.estimatedOriginalTokens || 0), 0);
    const totalRefined = completed.reduce((acc, curr) => acc + (curr.result?.estimatedRefinedTokens || 0), 0);
    const savings = totalOrig > 0 ? ((totalOrig - totalRefined) / totalOrig) * 100 : 0;
    const dollarSavings = (totalOrig - totalRefined) / 1000 * 0.03;
    return {
      totalPrompts: completed.length,
      totalOriginalTokens: totalOrig,
      totalRefinedTokens: totalRefined,
      totalSavingsPercent: savings,
      estimatedDollarSavings: dollarSavings
    };
  }, [batchItems]);

  const originalTokenCount = useMemo(() => {
    try { return encode(input).length; } catch { return Math.ceil(input.length / 4); }
  }, [input]);

  const diagnostics = useMemo(() => getSemanticDiagnostics(input), [input]);

  useEffect(() => {
    const saved = localStorage.getItem('prompt_refinery_history_v2');
    if (saved) {
      try { setHistory(JSON.parse(saved)); } catch (e) { console.error("History parse failed"); }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('prompt_refinery_history_v2', JSON.stringify(history.slice(0, 50)));
  }, [history]);

  const copyToClipboard = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleOptimize = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await optimizePrompt(input, level, format, strategy);
      
      // Determine Group and Version
      const existingInGroup = history.filter(h => h.originalText === input);
      const groupId = existingInGroup.length > 0 ? existingInGroup[0].groupId : Math.random().toString(36).substr(2, 9);
      const version = existingInGroup.length + 1;

      const newHistoryItem: HistoryItem = {
        ...res,
        id: Math.random().toString(36).substr(2, 9),
        groupId,
        version,
        timestamp: Date.now()
      };

      setResult(res);
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
        let prompts = file.name.endsWith('.json') ? JSON.parse(content) : content.split('\n').filter(l => l.trim().length > 10);
        setBatchItems(prompts.map((p: any) => ({
          id: Math.random().toString(36).substr(2, 9),
          original: typeof p === 'string' ? p : JSON.stringify(p),
          status: 'pending'
        })));
      } catch (err) { setError("Failed to parse file."); }
    };
    reader.readAsText(file);
  };

  const runBatchRefinery = async () => {
    if (batchLoading) return;
    setBatchLoading(true);
    for (const item of batchItems.filter(i => i.status === 'pending')) {
      setBatchItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'processing' } : i));
      try {
        const res = await optimizePrompt(item.original, level, format, strategy);
        setBatchItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'completed', result: res } : i));
      } catch (err) {
        setBatchItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'error' } : i));
      }
      await new Promise(r => setTimeout(r, 100));
    }
    setBatchLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-20 selection:bg-indigo-500/30">
      {/* Dynamic Header with Stats */}
      <nav className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setView('single')}>
                <div className="p-2 bg-blue-600 rounded-lg shadow-lg">
                  <Code className="w-6 h-6 text-white" />
                </div>
                <span className="text-xl font-bold tracking-tight text-white">Refinery</span>
              </div>
              
              <div className="hidden md:flex items-center space-x-6 border-l border-slate-800 pl-6">
                <div className="text-center">
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Total Cleansed</p>
                  <p className="text-sm font-mono font-bold text-green-400">{lifetimeStats.totalSaved.toLocaleString()} tkns</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Cost Avoidance</p>
                  <p className="text-sm font-mono font-bold text-blue-400">${lifetimeStats.dollarsSaved.toFixed(2)}</p>
                </div>
              </div>
            </div>
            
            <div className="flex bg-slate-800/50 p-1 rounded-xl border border-slate-700">
              <button onClick={() => setView('single')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${view === 'single' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}><Zap className="w-3.5 h-3.5" /> Single</button>
              <button onClick={() => setView('batch')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${view === 'batch' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}><Layers className="w-3.5 h-3.5" /> Batch</button>
              <button onClick={() => setView('business')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${view === 'business' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}><FileText className="w-3.5 h-3.5" /> Business Case</button>
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
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl transition-all">
                    <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                      <div className="flex items-center space-x-3">
                        <Cpu className="w-4 h-4 text-slate-400" />
                        <span className="text-xs font-bold uppercase text-slate-300">Raw Input</span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">Tokens: <b className="text-slate-300">{originalTokenCount}</b></span>
                    </div>
                    <textarea value={input} onChange={(e) => setInput(e.target.value)} placeholder="Paste verbose prompt..." className="w-full h-64 bg-slate-950 p-6 text-slate-200 focus:outline-none resize-none font-mono text-sm" />
                    <div className="p-4 bg-slate-900/80 border-t border-slate-800 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                      <div className="space-y-1"><label className="text-[10px] text-slate-500 font-bold uppercase">Strategy</label><select value={strategy} onChange={(e) => setStrategy(e.target.value as ModelStrategy)} className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-lg p-2">{Object.values(ModelStrategy).map(v => <option key={v} value={v}>{v}</option>)}</select></div>
                      <div className="space-y-1"><label className="text-[10px] text-slate-500 font-bold uppercase">Syntax</label><select value={format} onChange={(e) => setFormat(e.target.value as OutputFormat)} className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-lg p-2">{Object.values(OutputFormat).map(v => <option key={v} value={v}>{v}</option>)}</select></div>
                      <div className="space-y-1"><label className="text-[10px] text-slate-500 font-bold uppercase">Level</label><select value={level} onChange={(e) => setLevel(e.target.value as CompressionLevel)} className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-lg p-2">{Object.values(CompressionLevel).map(v => <option key={v} value={v}>{v}</option>)}</select></div>
                      <button onClick={handleOptimize} disabled={loading || !input.trim()} className="h-[34px] bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                        {loading ? <div className="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full" /> : <Zap className="w-3 h-3" />}
                        Refine
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                    <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                      <div className="flex items-center space-x-3"><FileUp className="w-4 h-4 text-blue-400" /><span className="text-xs font-bold uppercase text-slate-300">Batch Processor</span></div>
                      <div className="flex gap-2">
                        <button onClick={() => fileInputRef.current?.click()} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-[10px] font-bold rounded-lg text-slate-300">Upload JSON/CSV</button>
                        <button onClick={runBatchRefinery} disabled={batchLoading || batchItems.length === 0} className="px-3 py-1.5 bg-green-600 hover:bg-green-500 text-[10px] font-bold rounded-lg text-white">Run Refinery</button>
                        <input type="file" ref={fileInputRef} onChange={handleBatchFileUpload} className="hidden" />
                      </div>
                    </div>
                    <div className="max-h-[500px] overflow-auto">
                      <table className="w-full text-[10px] font-mono">
                        <thead className="bg-slate-950 text-slate-500 sticky top-0"><tr><th className="px-4 py-2 text-left">Status</th><th className="px-4 py-2 text-left">Source</th><th className="px-4 py-2 text-right">Reduction</th></tr></thead>
                        <tbody className="divide-y divide-slate-800">
                          {batchItems.map(i => (
                            <tr key={i.id} className="hover:bg-slate-900 transition-colors">
                              <td className="px-4 py-3">{i.status === 'completed' ? <CheckCircle2 className="w-3 h-3 text-green-500" /> : <Clock className="w-3 h-3 text-slate-500" />}</td>
                              <td className="px-4 py-3 truncate max-w-[300px]">{i.original}</td>
                              <td className="px-4 py-3 text-right text-green-400 font-bold">{i.result ? `-${i.result.savingsPercentage.toFixed(1)}%` : '--'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {result && !loading && (
                  <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
                      <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-green-500/5">
                        <div className="flex items-center space-x-3">
                          <ShieldCheck className="w-4 h-4 text-green-400" />
                          <span className="text-xs font-bold uppercase text-slate-300">Refined Result</span>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => copyToClipboard(result.refinedText)} className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 rounded-lg text-[10px] font-bold text-slate-300 hover:bg-slate-700">
                            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />} {copied ? 'Copied' : 'Copy'}
                          </button>
                        </div>
                      </div>
                      <div className="p-6 bg-slate-950 font-mono text-sm text-green-50 leading-relaxed whitespace-pre-wrap">{result.refinedText}</div>
                      <div className="p-4 bg-slate-900 grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center bg-slate-950 p-2 rounded-lg border border-slate-800"><p className="text-[9px] text-slate-500 font-bold uppercase">Efficiency</p><p className="text-lg font-bold text-green-400">{result.scores.efficiency}%</p></div>
                        <div className="text-center bg-slate-950 p-2 rounded-lg border border-slate-800"><p className="text-[9px] text-slate-500 font-bold uppercase">Integrity</p><p className="text-lg font-bold text-blue-400">{result.scores.integrity}%</p></div>
                        <div className="text-center bg-slate-950 p-2 rounded-lg border border-slate-800"><p className="text-[9px] text-slate-500 font-bold uppercase">Complexity</p><p className="text-lg font-bold text-amber-400">{result.scores.complexity}%</p></div>
                        <div className="text-center bg-slate-950 p-2 rounded-lg border border-slate-800"><p className="text-[9px] text-slate-500 font-bold uppercase">Est. Saving</p><p className="text-lg font-bold text-white">${((result.estimatedOriginalTokens - result.estimatedRefinedTokens) / 1000 * 0.03).toFixed(3)}</p></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="lg:col-span-4 space-y-6">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
                  <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2"><Clock className="w-3 h-3" /> Audit Library</h3>
                  <div className="space-y-3">
                    {history.slice(0, 10).map((item) => (
                      <div key={item.id} onClick={() => { setInput(item.originalText); setResult(item); }} className="p-3 bg-slate-950 border border-slate-800 rounded-xl hover:border-blue-500/50 transition-all cursor-pointer group">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[9px] px-1.5 py-0.5 bg-blue-600/20 text-blue-400 rounded font-bold">V{item.version}</span>
                          <span className="text-[8px] text-slate-600">{new Date(item.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <p className="text-[11px] text-slate-400 line-clamp-2 font-mono leading-relaxed mb-2">{item.originalText}</p>
                        <div className="flex justify-between items-center text-[9px] font-bold">
                          <span className="text-green-500">-{item.savingsPercentage.toFixed(0)}% TOKENS</span>
                          <span className="text-slate-500">{item.strategy}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-blue-600/5 border border-blue-500/20 rounded-2xl p-6">
                  <h3 className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-4 flex items-center gap-2"><TrendingDown className="w-3 h-3" /> Strategic Impact</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                      <span className="text-xs text-slate-400">Monthly Run-Rate Saving</span>
                      <span className="text-sm font-bold text-white">${(lifetimeStats.dollarsSaved * 30).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                      <span className="text-xs text-slate-400">Processing Overhead</span>
                      <span className="text-sm font-bold text-green-400">&lt;200ms</span>
                    </div>
                    <p className="text-[10px] text-slate-500 italic">Based on GPT-4 average pricing of $0.03/1k tokens.</p>
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
