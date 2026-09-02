import React from "react";
import { cn } from "../utils";
import { Skeleton } from "../atoms/skeleton";

export interface TransactionListSkeletonProps {
  count?: number;
  className?: string;
}

export const TransactionListSkeleton: React.FC<TransactionListSkeletonProps> = ({
  count = 4,
  className,
}) => {
  return (
    <div className={cn("flex flex-col gap-2 w-full select-none", className)}>
      {/* Transactions Header Skeleton */}
      <div className="flex items-center justify-between px-2 pt-2 pb-1 mt-2">
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="h-4 w-28 rounded-full" />
      </div>

      {/* Main Ledger Card */}
      <div className="flex flex-col bg-white border border-slate-200/60 rounded-2xl p-2.5 shadow-sm gap-4">
        {/* Day Group 1 */}
        <div className="flex flex-col gap-1">
          <div className="grid grid-cols-[minmax(0,1fr)_88px] items-center pb-2 border-b border-slate-100 px-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-12 ml-auto" />
          </div>

          <div className="flex flex-col pt-1">
            {Array.from({ length: Math.min(count, 3) }).map((_, i) => (
              <div key={i} className="flex items-center justify-between py-2.5 px-2 border-b border-slate-100/60 last:border-0">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-8 h-8 rounded-full shrink-0" />
                  <div className="flex flex-col gap-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
                <Skeleton className="h-4 w-14 shrink-0" />
              </div>
            ))}
          </div>
        </div>

        {/* Day Group 2 */}
        <div className="flex flex-col gap-1 pt-1">
          <div className="grid grid-cols-[minmax(0,1fr)_88px] items-center pb-2 border-b border-slate-100 px-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-14 ml-auto" />
          </div>

          <div className="flex flex-col pt-1">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between py-2.5 px-2 border-b border-slate-100/60 last:border-0">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-8 h-8 rounded-full shrink-0" />
                  <div className="flex flex-col gap-1">
                    <Skeleton className="h-3.5 w-28" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
                <Skeleton className="h-4 w-16 shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
