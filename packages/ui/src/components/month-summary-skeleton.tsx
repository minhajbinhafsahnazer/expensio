import React from "react";
import { cn } from "../utils";
import { Skeleton } from "../atoms/skeleton";

export interface MonthSummarySkeletonProps {
  className?: string;
}

export const MonthSummarySkeleton: React.FC<MonthSummarySkeletonProps> = ({ className }) => {
  // Preset bar heights to mirror the daily sparkline
  const barHeights = [
    30, 45, 20, 65, 80, 40, 55, 30, 70, 95, 35, 50, 60, 25, 75, 40, 65, 85, 30, 50, 90, 45, 60, 75, 20, 55, 40
  ];

  return (
    <div className={cn("w-full flex flex-col gap-2 select-none", className)}>
      <div
        className="relative overflow-hidden group border border-slate-800/80 shadow-xl text-white flex flex-col gap-2.5"
        style={{
          background: "linear-gradient(135deg, #020617 0%, #0f172a 45%, #1e1b4b 100%)",
          borderRadius: "32px",
          padding: "22px 24px 18px 24px",
        }}
      >
        {/* Glow Arc Blur Effect */}
        <div className="absolute -bottom-10 -left-10 size-32 bg-blue-600/10 blur-3xl rounded-full pointer-events-none" />

        {/* Card Header Row */}
        <div className="relative z-10 flex justify-between items-start">
          {/* Left Column */}
          <div className="flex flex-col gap-2">
            <Skeleton className="h-3 w-28 bg-slate-800/80" />
            <Skeleton className="h-7 w-36 bg-slate-800/80" />
          </div>

          {/* Right Column */}
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <Skeleton className="h-5 w-24 bg-slate-800/80 rounded-full" />
            <Skeleton className="h-5 w-16 bg-slate-800/80 rounded-full" />
          </div>
        </div>

        {/* Daily Strip Chart Area */}
        <div className="relative z-10 my-2 flex flex-col gap-1.5">
          <div className="flex items-center justify-between px-1">
            <Skeleton className="h-3 w-28 bg-slate-800/80" />
            <Skeleton className="h-3 w-20 bg-slate-800/80" />
          </div>

          <div className="w-full h-[100px] flex items-end justify-between gap-[3px] sm:gap-1.5 pt-2">
            {barHeights.map((height, i) => (
              <div key={i} className="flex-1 h-full flex flex-col justify-end items-center">
                <Skeleton
                  className="w-full bg-slate-800/60 rounded-t-md"
                  style={{ height: `${height}%` }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Sub-Stats Footer Row */}
        <div className="relative z-10 pt-2 border-t border-slate-800/80 flex justify-between items-center w-full">
          <div className="flex flex-col items-start pl-8">
            <Skeleton className="h-2.5 w-16 bg-slate-800/80 mb-1" />
            <Skeleton className="h-4 w-20 bg-slate-800/80" />
          </div>

          <div className="flex flex-col items-end">
            <Skeleton className="h-2.5 w-16 bg-slate-800/80 mb-1" />
            <Skeleton className="h-4 w-20 bg-slate-800/80" />
          </div>
        </div>
      </div>
    </div>
  );
};
