import React from "react";
import { cn } from "../utils";
import { Skeleton } from "../atoms/skeleton";

export interface GoalCardSkeletonProps {
  className?: string;
}

export const GoalCardSkeleton: React.FC<GoalCardSkeletonProps> = ({ className }) => {
  return (
    <div className={cn("flex flex-col gap-2.5 p-4 rounded-xl border border-white/10 bg-white/5 backdrop-blur-md w-full select-none", className)}>
      {/* Badge + Actions Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-16 bg-slate-800/80 rounded-md" />
          <Skeleton className="h-5 w-20 bg-slate-800/80 rounded-md" />
        </div>
        <div className="flex items-center gap-1">
          <Skeleton className="h-7 w-20 bg-slate-800/80 rounded-full" />
          <Skeleton className="w-7 h-7 bg-slate-800/80 rounded-full" />
          <Skeleton className="w-7 h-7 bg-slate-800/80 rounded-full" />
        </div>
      </div>

      {/* Goal Title */}
      <div className="flex flex-col gap-1 my-0.5">
        <Skeleton className="h-5 w-40 bg-slate-800/80" />
      </div>

      {/* Amount & Progress Stat Row */}
      <div className="flex items-baseline justify-between pt-1">
        <Skeleton className="h-4 w-32 bg-slate-800/80" />
        <Skeleton className="h-3.5 w-24 bg-slate-800/80" />
      </div>

      {/* Progress Bar */}
      <Skeleton className="w-full h-2 bg-slate-800/80 rounded-full" />

      {/* Target Date Footer */}
      <div className="flex items-center justify-between pt-1">
        <Skeleton className="h-3 w-28 bg-slate-800/80" />
        <Skeleton className="h-3 w-16 bg-slate-800/80" />
      </div>
    </div>
  );
};

export interface DebtCardSkeletonProps {
  className?: string;
}

export const DebtCardSkeleton: React.FC<DebtCardSkeletonProps> = ({ className }) => {
  return (
    <div className={cn("flex items-center justify-between p-3.5 rounded-xl border border-slate-200/80 bg-white shadow-xs w-full select-none", className)}>
      <div className="flex items-center gap-3">
        <Skeleton className="w-9 h-9 rounded-full shrink-0" />
        <div className="flex flex-col gap-1">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
      <div className="flex flex-col items-end gap-1">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-3 w-12" />
      </div>
    </div>
  );
};
