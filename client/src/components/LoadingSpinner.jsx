import React from 'react';
import { Loader2 } from 'lucide-react';

export function LoadingSpinner({ text = 'Loading data...', size = 'default' }) {
  const sizeClasses = {
    small: 'w-4 h-4',
    default: 'w-8 h-8',
    large: 'w-12 h-12',
  };

  return (
    <div className="flex flex-col items-center justify-center p-12 text-slate-500">
      <Loader2 className={`${sizeClasses[size] || sizeClasses.default} animate-spin text-brand-600 mb-3`} />
      {text && <p className="text-sm font-medium text-slate-600">{text}</p>}
    </div>
  );
}

export function InlineSpinner({ className = "w-4 h-4" }) {
  return <Loader2 className={`${className} animate-spin`} />;
}
