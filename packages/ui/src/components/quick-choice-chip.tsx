import React from "react";
import { cn } from "../utils";

export interface QuickChoiceChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  selected?: boolean;
  onSelect?: () => void;
  recommended?: boolean;
}

export const QuickChoiceChip = React.forwardRef<HTMLButtonElement, QuickChoiceChipProps>(
  ({ className, label, selected = false, onSelect, recommended = false, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        onClick={onSelect}
        disabled={disabled}
        style={{ borderRadius: "10px" }}
        className={cn(
          "inline-flex items-center justify-center h-8 px-3 gap-1 rounded-lg text-xs select-none transition-all duration-150 ease-out cursor-pointer active:scale-95",
          selected
            ? "bg-slate-900 text-white font-bold shadow-xs scale-[1.03]"
            : "bg-transparent text-slate-400 hover:text-slate-700 font-medium border-none",
          disabled && "opacity-50 pointer-events-none",
          className
        )}
        {...props}
      >
        <span className="truncate">{label}</span>
      </button>
    );
  }
);
QuickChoiceChip.displayName = "QuickChoiceChip";
