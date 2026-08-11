import React from "react";
import { cn } from "../utils";

export interface DonutSegment {
  id: string;
  label: string;
  amount: number;
  color: string;
}

export interface DonutChartProps {
  segments: DonutSegment[];
  totalBalance: number | string;
  currencySymbol?: string;
  className?: string;
}

export const DonutChart: React.FC<DonutChartProps> = ({
  segments,
  totalBalance,
  currencySymbol = "$",
  className,
}) => {
  const totalAmount = segments.reduce((sum, s) => sum + s.amount, 0);

  const formattedBalance =
    typeof totalBalance === "number"
      ? totalBalance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : totalBalance;

  // Calculate SVG stroke-dasharray values for donut ring
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  let accumulatedAngle = 0;

  return (
    <div className={cn("flex flex-col items-center gap-6 w-full", className)}>
      {/* Donut SVG Ring */}
      <div className="relative w-56 h-56 flex items-center justify-center">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 180 180">
          {/* Background circle track */}
          <circle
            cx="90"
            cy="90"
            r={radius}
            fill="transparent"
            stroke="currentColor"
            strokeWidth="16"
            className="text-slate-100"
          />

          {/* Segment Arcs */}
          {segments.map((seg) => {
            const percentage = totalAmount > 0 ? seg.amount / totalAmount : 0;
            const strokeDasharray = `${percentage * circumference} ${circumference}`;
            const strokeDashoffset = -accumulatedAngle * circumference;
            accumulatedAngle += percentage;

            return (
              <circle
                key={seg.id}
                cx="90"
                cy="90"
                r={radius}
                fill="transparent"
                stroke={seg.color}
                strokeWidth="16"
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-500 ease-out"
              />
            );
          })}
        </svg>

        {/* Center Balance Label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
          <span className="text-xs font-medium text-slate-400 block mb-0.5">Balance</span>
          <div className="text-xl sm:text-2xl font-extrabold font-mono tracking-tight text-slate-900">
            {currencySymbol}{formattedBalance}
          </div>
        </div>
      </div>

      {/* Legend Below Chart */}
      <div className="flex items-center justify-center gap-4 sm:gap-6 flex-wrap w-full bg-[#ffffff] border border-slate-200/60 p-4 rounded-2xl shadow-xs">
        {segments.map((seg) => (
          <div key={seg.id} className="flex flex-col items-center text-center">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: seg.color }} />
              <span className="text-xs font-semibold text-slate-700">
                {seg.label}
              </span>
            </div>
            <span className="text-xs font-mono font-bold text-slate-900">
              {currencySymbol}
              {seg.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
