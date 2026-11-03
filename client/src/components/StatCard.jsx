import React from 'react';

export function StatCard({ title, value, icon: Icon, color = 'brand', subtext, onClick }) {
  const colorMap = {
    brand: 'bg-brand-50 text-brand-600 border-brand-100',
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    rose: 'bg-rose-50 text-rose-600 border-rose-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-100',
    cyan: 'bg-cyan-50 text-cyan-600 border-cyan-100',
  };

  const badgeColor = colorMap[color] || colorMap.brand;

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-all duration-200 ${
        onClick ? 'cursor-pointer hover:border-brand-200' : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">{title}</p>
          <h3 className="text-2xl font-extrabold text-slate-800 tracking-tight">{value}</h3>
          {subtext && <p className="text-xs text-slate-500 mt-1">{subtext}</p>}
        </div>
        <div className={`p-3 rounded-2xl border ${badgeColor}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}
