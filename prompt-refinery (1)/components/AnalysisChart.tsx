
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface AnalysisChartProps {
  original: number;
  refined: number;
}

export const AnalysisChart: React.FC<AnalysisChartProps> = ({ original, refined }) => {
  const data = [
    { name: 'Original', tokens: original, color: '#64748b' },
    { name: 'Optimized', tokens: refined, color: '#22c55e' },
  ];

  return (
    <div className="h-64 w-full bg-slate-800/50 p-4 rounded-xl border border-slate-700">
      <h3 className="text-slate-400 text-sm font-medium mb-4 uppercase tracking-wider">Token Comparison</h3>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
          <XAxis 
            dataKey="name" 
            stroke="#94a3b8" 
            fontSize={12} 
            tickLine={false} 
            axisLine={false}
          />
          <YAxis 
            stroke="#94a3b8" 
            fontSize={12} 
            tickLine={false} 
            axisLine={false}
          />
          <Tooltip 
            cursor={{fill: '#334155', opacity: 0.4}}
            contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
          />
          <Bar dataKey="tokens" radius={[4, 4, 0, 0]} barSize={50}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
