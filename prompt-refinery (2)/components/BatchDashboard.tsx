
import React from 'react';
import { TrendingDown, DollarSign, Zap, BarChart3 } from 'lucide-react';
import { BatchSummary } from '../types';

interface Props {
  summary: BatchSummary;
}

export const BatchDashboard: React.FC<Props> = ({ summary }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Processed</p>
          <BarChart3 className="w-4 h-4 text-blue-400" />
        </div>
        <p className="text-2xl font-bold text-white">{summary.totalPrompts}</p>
        <p className="text-[10px] text-slate-400">Total Prompts</p>
      </div>

      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Token Reduction</p>
          <TrendingDown className="w-4 h-4 text-green-400" />
        </div>
        <p className="text-2xl font-bold text-green-400">-{summary.totalSavingsPercent.toFixed(1)}%</p>
        <p className="text-[10px] text-slate-400">Avg. Compression</p>
      </div>

      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Tokens Cleansed</p>
          <Zap className="w-4 h-4 text-amber-400" />
        </div>
        <p className="text-2xl font-bold text-white">{(summary.totalOriginalTokens - summary.totalRefinedTokens).toLocaleString()}</p>
        <p className="text-[10px] text-slate-400">Total Savings</p>
      </div>

      <div className="bg-blue-600/10 border border-blue-500/30 p-4 rounded-2xl">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] text-blue-400 font-bold uppercase tracking-wider">Est. Monthly ROI</p>
          <DollarSign className="w-4 h-4 text-blue-400" />
        </div>
        <p className="text-2xl font-bold text-white">${summary.estimatedDollarSavings.toLocaleString()}</p>
        <p className="text-[10px] text-blue-400">Projected Value</p>
      </div>
    </div>
  );
};
