import React from 'react';

export const Skeleton = ({ className = '', rounded = 'rounded-xl' }) => {
  return (
    <div
      className={`animate-pulse bg-gradient-to-r from-slate-800/60 via-slate-700/40 to-slate-800/60 bg-[length:200%_100%] ${rounded} ${className}`}
    />
  );
};

export const CardSkeleton = () => {
  return (
    <div className="p-4 rounded-2xl glass-card border border-slate-800/70 space-y-3">
      <Skeleton className="h-36 w-full rounded-xl" />
      <div className="flex items-center justify-between pt-1">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-12" />
      </div>
      <Skeleton className="h-3 w-48" />
      <div className="flex items-center justify-between pt-2 border-t border-slate-800/60">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-7 w-24 rounded-lg" />
      </div>
    </div>
  );
};
