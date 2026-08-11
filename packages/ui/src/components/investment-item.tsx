import React from "react";
import { cn } from "../utils";

export interface InvestmentItemProps {
  icon: React.ReactNode;
  name: string;
  ticker: string;
  price: number;
  changeAmount: number;
  changePercent: number;
  isPositive?: boolean;
  currencySymbol?: string;
  className?: string;
}

export const InvestmentItem: React.FC<InvestmentItemProps> = ({
  icon,
  name,
  ticker,
  price,
  changeAmount,
  changePercent,
  isPositive = true,
  currencySymbol = "$",
  className,
}) => {
  // Mini SVG Sparkline polyline paths
  const sparklinePathPositive = "M 0,20 Q 15,5 30,15 T 60,8 T 90,2";
  const sparklinePathNegative = "M 0,2 Q 15,18 30,8 T 60,15 T 90,22";

  return (
    <div
      className={cn(
        "flex items-center justify-between py-3 px-3 hover:bg-slate-100/60 rounded-2xl transition-colors select-none",
        className
      )}
    >
      {/* Icon + Asset Name */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-full bg-slate-950 text-white flex items-center justify-center text-lg flex-shrink-0">
          {icon}
        </div>
        <div className="flex flex-col min-w-0">
          <span className="font-semibold text-[14px] text-slate-900 truncate">
            {name}
          </span>
          <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
            {ticker}
          </span>
        </div>
      </div>

      {/* Mini SVG Sparkline */}
      <div className="hidden sm:flex items-center w-20 h-6 px-1">
        <svg className="w-full h-full" viewBox="0 0 90 24">
          <path
            d={isPositive ? sparklinePathPositive : sparklinePathNegative}
            fill="none"
            stroke={isPositive ? "#22c55e" : "#ef4444"}
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {/* Price + Change */}
      <div className="flex flex-col items-end flex-shrink-0 ml-3">
        <span className="font-bold text-[14px] font-mono text-slate-900">
          {currencySymbol}
          {price.toLocaleString("en-US", { minimumFractionDigits: 2 })}
        </span>
        <span
          className={cn(
            "text-[11px] font-mono font-semibold",
            isPositive ? "text-emerald-500" : "text-rose-500"
          )}
        >
          {isPositive ? "+" : "-"}
          {currencySymbol}
          {Math.abs(changeAmount).toFixed(2)} ({changePercent}%)
        </span>
      </div>
    </div>
  );
};
