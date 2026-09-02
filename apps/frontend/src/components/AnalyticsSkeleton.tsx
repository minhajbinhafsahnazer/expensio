import React from "react";
import { Skeleton } from "@expenseflow/ui";

export const AnalyticsPageSkeleton: React.FC = () => {
  const barHeights = [20, 45, 60, 85, 30, 70, 95, 40, 50, 65, 30, 80, 55, 40];

  return (
    <div className="flex flex-col gap-5 w-full select-none">
      {/* Spent Summary Stats Banner Skeleton */}
      <div className="grid grid-cols-2 gap-y-4 gap-x-2 bg-slate-50/80 border border-slate-200/70 p-3.5 rounded-xl text-center">
        <div className="flex flex-col border-r border-b border-slate-200 px-1 pb-2 items-center justify-center">
          <Skeleton className="h-2.5 w-12 mb-2" />
          <Skeleton className="h-6 w-20" />
        </div>
        <div className="flex flex-col border-b border-slate-200 px-1 pb-2 items-center justify-center">
          <Skeleton className="h-2.5 w-14 mb-2" />
          <Skeleton className="h-6 w-20" />
        </div>
        <div className="flex flex-col border-r border-slate-200 px-1 pt-2 items-center justify-center">
          <Skeleton className="h-2.5 w-10 mb-2" />
          <Skeleton className="h-6 w-20" />
        </div>
        <div className="flex flex-col px-1 pt-2 items-center justify-center">
          <Skeleton className="h-2.5 w-14 mb-2" />
          <Skeleton className="h-6 w-20" />
        </div>
      </div>

      {/* Daily Strip Bar Chart Skeleton */}
      <div className="relative w-full bg-slate-50/60 rounded-xl p-3.5 border border-slate-200/70 flex flex-col gap-2">
        <div className="flex items-center justify-between px-1">
          <Skeleton className="h-3.5 w-32" />
          <Skeleton className="h-6 w-24" />
        </div>

        <div className="w-full h-32 flex items-end justify-between gap-[3px] sm:gap-1.5 pt-2">
          {barHeights.map((height, i) => (
            <div key={i} className="flex-1 h-full flex flex-col justify-end items-center">
              <Skeleton
                className="w-full bg-purple-300/40 rounded-t-sm"
                style={{ height: `${height}%` }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Where Money Went Skeleton */}
      <div className="flex flex-col gap-3 pt-3">
        <div className="flex items-center justify-between pb-1 pt-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-28 rounded-full" />
        </div>

        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/70">
              <div className="flex items-center gap-3">
                <Skeleton className="w-3 h-3 rounded-full shrink-0" />
                <Skeleton className="h-4 w-28" />
              </div>
              <div className="flex items-center gap-3">
                <Skeleton className="h-3.5 w-8" />
                <Skeleton className="h-4 w-16" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
