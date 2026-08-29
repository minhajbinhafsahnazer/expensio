import React from "react";
import { cn } from "../utils";
import { Skeleton } from "../atoms/skeleton";

export interface TransactionItemProps {
  icon: React.ReactNode;
  title: string;
  category: string;
  date: string;
  amount: number | string;
  currencySymbol?: string;
  className?: string;
  onClick?: () => void;
}

export const TransactionItem: React.FC<TransactionItemProps> = ({
  icon,
  title,
  category,
  date,
  amount,
  currencySymbol = "$",
  className,
  onClick,
}) => {
  const formattedAmount =
    typeof amount === "number"
      ? amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : amount;

  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-center justify-between py-3 px-3 sm:px-4 hover:bg-slate-100/60 rounded-2xl transition-colors cursor-pointer select-none",
        className
      )}
    >
      {/* Icon + Info */}
      <div className="flex items-center gap-3.5 min-w-0">
        <div className="w-11 h-11 rounded-full bg-slate-100/80 border border-slate-200/50 flex items-center justify-center text-slate-700 text-lg flex-shrink-0">
          {icon}
        </div>
        <div className="flex flex-col min-w-0">
          <span className="font-semibold text-[15px] text-slate-900 truncate tracking-tight">
            {title}
          </span>
          <span className="text-[12px] text-slate-400 font-medium truncate">
            {category} · {date}
          </span>
        </div>
      </div>

      {/* Amount */}
      <div className="font-bold text-[15px] font-mono text-slate-900 flex-shrink-0 ml-3">
        {currencySymbol}{formattedAmount}
      </div>
    </div>
  );
};

export const TransactionItemSkeleton: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div
      className={cn(
        "flex items-center justify-between py-3 px-3 sm:px-4 rounded-2xl",
        className
      )}
    >
      <div className="flex items-center gap-3.5 min-w-0">
        <Skeleton className="w-11 h-11 rounded-full flex-shrink-0" />
        <div className="flex flex-col gap-1.5 min-w-0">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      <Skeleton className="h-5 w-16 ml-3 flex-shrink-0" />
    </div>
  );
};
