import React from "react";
import { cn } from "../utils";
import { BarChart2, Plus, PieChart } from "lucide-react";

export interface HeroActionButtonProps {
  onAddExpense?: () => void;
  onAnalyticsClick?: () => void;
  onBudgetClick?: () => void;
  className?: string;
}

export const HeroActionButton: React.FC<HeroActionButtonProps> = ({
  onAddExpense,
  onAnalyticsClick,
  onBudgetClick,
  className,
}) => {
  return (
    <div
      style={{
        background: "linear-gradient(135deg, #020617 0%, #0f172a 45%, #1e1b4b 100%)",
      }}
      className={cn(
        "fixed bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center h-[44px] px-3 border border-slate-800/80 rounded-[22px] shadow-[0_8px_24px_rgba(15,23,42,0.4)] select-none min-w-[260px]",
        className
      )}
    >
      {/* Side Action Left: Stats */}
      <div className="flex-1 flex justify-start">
        <button
          type="button"
          onClick={onAnalyticsClick}
          className="tactile-btn flex items-center gap-1.5 px-2 py-1 opacity-70 hover:opacity-100 transition-opacity cursor-pointer border-none bg-transparent active:scale-95"
        >
          <BarChart2 className="w-4 h-4 text-slate-300 stroke-[1.75]" />
          <span className="text-[12px] font-medium tracking-tight text-slate-200">Statistics</span>
        </button>
      </div>

      {/* Dominant Center FAB - Vertically popping 52px solid white circle with dark navy border */}
      <div className="flex-none flex items-center justify-center shrink-0 mx-2 relative z-10">
        <button
          type="button"
          onClick={onAddExpense}
          aria-label="Add Expense"
          title="Add Expense"
          className="tactile-btn w-[52px] h-[52px] rounded-full bg-white hover:bg-slate-100 text-slate-950 flex items-center justify-center shadow-lg border-2 border-[#0f172a] transition-all active:scale-95"
        >
          <Plus className="w-6 h-6 stroke-[2.5] text-slate-950" />
        </button>
      </div>

      {/* Side Action Right: Analytics */}
      <div className="flex-1 flex justify-end">
        <button
          type="button"
          onClick={onBudgetClick}
          className="tactile-btn flex items-center gap-1.5 px-2 py-1 opacity-70 hover:opacity-100 transition-opacity cursor-pointer border-none bg-transparent active:scale-95"
        >
          <PieChart className="w-4 h-4 text-slate-300 stroke-[1.75]" />
          <span className="text-[12px] font-medium tracking-tight text-slate-200">Analytics</span>
        </button>
      </div>
    </div>
  );
};
