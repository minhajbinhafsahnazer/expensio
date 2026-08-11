import React from "react";
import { cn } from "../utils";
import { TrendingUp, TrendingDown } from "lucide-react";

export interface MonthSummaryProps {
  monthName?: string;
  spentAmount: number;
  todayAmount?: number;
  percentageChange?: number;
  currencySymbol?: string;
  dailyData?: Array<{ day: number; amount: number; dateStr?: string; isPeak?: boolean }>;
  className?: string;
}

interface DailyPoint {
  day: number;
  amount: number;
  dateStr?: string;
  isPeak?: boolean;
}

const DailyStripChart = ({
  data,
  currencySymbol = "₹",
}: {
  data?: DailyPoint[];
  currencySymbol?: string;
}) => {
  const [activeDay, setActiveDay] = React.useState<DailyPoint | null>(null);

  const defaultData: DailyPoint[] = [
    { day: 1, amount: 450, dateStr: "Jul 1" },
    { day: 2, amount: 220, dateStr: "Jul 2" },
    { day: 3, amount: 890, dateStr: "Jul 3" },
    { day: 4, amount: 1200, dateStr: "Jul 4" },
    { day: 5, amount: 350, dateStr: "Jul 5" },
    { day: 6, amount: 670, dateStr: "Jul 6" },
    { day: 7, amount: 1450, dateStr: "Jul 7" },
    { day: 8, amount: 310, dateStr: "Jul 8" },
    { day: 9, amount: 980, dateStr: "Jul 9" },
    { day: 10, amount: 2100, dateStr: "Jul 10", isPeak: true },
    { day: 11, amount: 540, dateStr: "Jul 11" },
    { day: 12, amount: 780, dateStr: "Jul 12" },
    { day: 13, amount: 1100, dateStr: "Jul 13" },
    { day: 14, amount: 420, dateStr: "Jul 14" },
    { day: 15, amount: 860, dateStr: "Jul 15" },
    { day: 16, amount: 300, dateStr: "Jul 16" },
    { day: 17, amount: 950, dateStr: "Jul 17" },
    { day: 18, amount: 1320, dateStr: "Jul 18" },
    { day: 19, amount: 480, dateStr: "Jul 19" },
    { day: 20, amount: 620, dateStr: "Jul 20" },
    { day: 21, amount: 1750, dateStr: "Jul 21" },
    { day: 22, amount: 390, dateStr: "Jul 22" },
    { day: 23, amount: 810, dateStr: "Jul 23" },
    { day: 24, amount: 1050, dateStr: "Jul 24" },
    { day: 25, amount: 290, dateStr: "Jul 25" },
    { day: 26, amount: 730, dateStr: "Jul 26" },
    { day: 27, amount: 670, dateStr: "Jul 27" },
  ];

  const chartData = data && data.length > 0 ? data : defaultData;
  const maxAmount = Math.max(...chartData.map((d) => d.amount), 1);
  const peakPoint =
    chartData.find((d) => d.isPeak) ||
    chartData.reduce((prev, curr) => (curr.amount > prev.amount ? curr : prev), chartData[0]);

  return (
    <div className="relative w-full flex flex-col gap-1.5 my-2 select-none">
      {/* Active Day / Peak Tooltip Indicator */}
      <div className="flex items-center justify-between text-[11px] px-1 font-medium text-slate-300">
        <span className="text-slate-400 font-sans">
          {activeDay ? activeDay.dateStr || `Day ${activeDay.day}` : "Daily Spend Breakdown"}
        </span>
        <span className="font-mono font-bold text-sky-400">
          {currencySymbol}
          {(activeDay ? activeDay.amount : peakPoint.amount).toLocaleString("en-IN")}
          {!activeDay && <span className="text-[10px] text-slate-400 font-normal ml-1">(Peak)</span>}
        </span>
      </div>

      {/* Daily Strip Bars Container */}
      <div className="w-full h-[100px] flex items-end justify-between gap-[3px] sm:gap-1.5 pt-2">
        {chartData.map((pt) => {
          const isEmpty = pt.amount === 0;
          const heightPct = isEmpty ? 10 : Math.max(16, Math.min(100, (pt.amount / maxAmount) * 100));
          const isHovered = activeDay?.day === pt.day;

          return (
            <div
              key={pt.day}
              onMouseEnter={() => setActiveDay(pt)}
              onMouseLeave={() => setActiveDay(null)}
              onTouchStart={() => setActiveDay(pt)}
              className="relative flex-1 h-full flex flex-col justify-end items-center group cursor-pointer"
            >
              <div
                className={cn(
                  "w-full rounded-t-md transition-all duration-200",
                  isEmpty 
                    ? "bg-slate-700/40"
                    : (heightPct >= 90)
                    ? (isHovered ? "bg-purple-500" : "bg-purple-600 shadow-[0_-2px_10px_rgba(147,51,234,0.3)]")
                    : (heightPct >= 60)
                    ? (isHovered ? "bg-purple-400" : "bg-purple-500")
                    : (heightPct >= 30)
                    ? (isHovered ? "bg-purple-300" : "bg-purple-400")
                    : (isHovered ? "bg-purple-200" : "bg-purple-300")
                )}
                style={{ height: `${heightPct}%` }}
              />
              

              {/* Floating Tooltip */}
              {isHovered && (
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] font-medium py-1 px-2 rounded-md shadow-xl whitespace-nowrap z-10 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center">
                  <span>{pt.dateStr || `Day ${pt.day}`}</span>
                  <span className="text-purple-300">{currencySymbol}{pt.amount.toLocaleString("en-IN")}</span>
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-800 rotate-45"></div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const MonthSummary: React.FC<MonthSummaryProps> = ({
  monthName = "July 27",
  spentAmount,
  todayAmount = 670,
  percentageChange = 4.73,
  currencySymbol = "₹",
  dailyData,
  className,
}) => {
  const formatVal = (num: number) =>
    num.toLocaleString("en-IN", {
      minimumFractionDigits: Number.isInteger(num) ? 0 : 2,
    });

  const isPositiveChange = percentageChange >= 0;

  return (
    <div className={cn("w-full flex flex-col gap-2 select-none", className)}>
      {/* Perslace Hero Card: Black & Navy Blue Gradient with 32px Border Radius & 24px Inset Padding */}
      <div
        className="relative overflow-hidden group border border-slate-800/80 shadow-xl hover:shadow-[0_16px_40px_rgba(15,23,42,0.3)] hover:-translate-y-0.5 transition-all duration-300 cursor-pointer select-none text-white flex flex-col gap-2.5"
        style={{
          background: "linear-gradient(135deg, #020617 0%, #0f172a 45%, #1e1b4b 100%)",
          borderRadius: "32px",
          padding: "22px 24px 18px 24px",
        }}
      >
        {/* Glow Arc Blur Effect in Soft Navy Accent */}
        <div className="absolute -bottom-10 -left-10 size-32 bg-blue-600/20 blur-3xl rounded-full group-hover:bg-blue-600/30 transition-all pointer-events-none" />

        {/* Card Header Row: Left Column (Title + Amount), Right Column (July 27 + Trend Pill) */}
        <div className="relative z-10 flex justify-between items-start">
          {/* Left Column: Perfectly Aligned Title & Amount */}
          <div className="flex flex-col gap-1.5">
            <p className="text-[10px] sm:text-[11px] font-bold text-slate-300 tracking-wide uppercase">
              Total Monthly Spend
            </p>
            <h2 className="text-2xl sm:text-[28px] font-black tracking-tight text-white leading-none font-mono truncate">
              <span className="text-lg sm:text-xl font-semibold text-slate-400 mr-0.5">{currencySymbol}</span>
              {formatVal(spentAmount)}
            </h2>
          </div>

          {/* Right Column: Month Name Badge stacked over Trend Pill */}
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <span className="text-[11px] font-black text-white bg-slate-800/90 px-3 py-0.5 rounded-full border border-slate-700/60 font-sans tracking-wide shadow-2xs">
              {monthName}
            </span>

            <span
              className="text-[10.5px] font-bold text-white flex items-center gap-1 bg-slate-800/80 px-2.5 py-0.5 rounded-full border border-slate-700/60 backdrop-blur-md"
              title="vs last period"
            >
              {isPositiveChange ? (
                <TrendingUp className="w-3 h-3 text-emerald-400 stroke-[2.5]" />
              ) : (
                <TrendingDown className="w-3 h-3 text-rose-400 stroke-[2.5]" />
              )}
              {isPositiveChange ? "+" : ""}
              {percentageChange}%
            </span>
          </div>
        </div>

        {/* Spending Analytics Daily Strip Bar Chart (Matching Portfolio Page) */}
        <div className="relative z-10">
          <DailyStripChart data={dailyData} currencySymbol={currencySymbol} />
        </div>

        {/* Sub-Stats Footer Row (Explicit Left & Right Alignment) */}
        <div
          className="relative z-10 pt-2 border-t border-slate-800/80"
          style={{ display: "flex", flexDirection: "row", justifyContent: "flex-end", alignItems: "center", width: "100%" }}
        >
          <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end", marginLeft: "auto" }}>
            <span className="text-[8.5px] font-semibold text-slate-400 uppercase leading-tight block text-right" style={{ textAlign: "right" }}>
              Spent Today
            </span>
            <span className="text-[11px] sm:text-xs font-black text-white font-mono text-right mt-0.5" style={{ textAlign: "right" }}>
              +{currencySymbol}{formatVal(todayAmount)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
