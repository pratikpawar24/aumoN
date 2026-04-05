import React from 'react';
import { Leaf } from 'lucide-react';

export const Spinner = ({ size = 'md', color = 'primary' }) => {
  const sizes = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12', xl: 'w-16 h-16' };
  const colors = {
    primary: 'border-primary-500',
    white:   'border-white',
    gray:    'border-slate-400',
  };
  return (
    <div className={`${sizes[size]} border-2 ${colors[color]} border-t-transparent
                     rounded-full animate-spin`} />
  );
};

export const SkeletonCard = () => (
  <div className="glass rounded-xl p-4 space-y-3">
    <div className="skeleton h-4 w-3/4" />
    <div className="skeleton h-4 w-1/2" />
    <div className="skeleton h-8 w-full" />
  </div>
);

export const FullPageLoader = ({ message = 'Loading AUMO...' }) => (
  <div className="min-h-screen bg-dark-bg flex flex-col items-center justify-center gap-6">
    <div className="relative">
      <div className="w-20 h-20 border-4 border-primary-500/20 rounded-full animate-spin-slow" />
      <div className="absolute inset-0 flex items-center justify-center">
        <Leaf className="w-8 h-8 text-primary-500" />
      </div>
    </div>
    <div className="text-center">
      <h2 className="text-2xl font-bold text-white mb-2">
        AU<span className="text-primary-400">MO</span>
      </h2>
      <p className="text-slate-400 text-sm animate-pulse">{message}</p>
    </div>
  </div>
);

const Loading = ({ message }) => <FullPageLoader message={message} />;
export default Loading;