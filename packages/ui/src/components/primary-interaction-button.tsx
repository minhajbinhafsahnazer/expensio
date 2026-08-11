import React from "react";
import { cn } from "../utils";

export interface PrimaryInteractionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label?: string;
  icon?: React.ReactNode;
  position?: "bottom-center" | "bottom-right";
}

export const PrimaryInteractionButton = React.forwardRef<HTMLButtonElement, PrimaryInteractionButtonProps>(
  ({ className, label = "Add Expense", icon, position = "bottom-center", disabled, ...props }, ref) => {
    const positionStyles = {
      "bottom-center": "fixed bottom-6 left-1/2 -translate-x-1/2 z-40",
      "bottom-right": "fixed bottom-6 right-6 z-40",
    };

    return (
      <button
        ref={ref}
        type="button"
        disabled={disabled}
        aria-label={label}
        className={cn(
          positionStyles[position],
          "inline-flex items-center justify-center h-14 px-6 gap-2.5 rounded-full font-semibold text-white bg-emerald-600 hover:bg-emerald-500 dark:bg-emerald-500 dark:hover:bg-emerald-400 dark:text-slate-950 shadow-lg hover:shadow-xl transition-all duration-150 ease-out select-none",
          "focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/30 active:scale-95",
          disabled && "opacity-50 pointer-events-none shadow-none",
          className
        )}
        {...props}
      >
        {icon || (
          <span className="text-2xl font-bold leading-none flex items-center justify-center -mt-0.5">
            +
          </span>
        )}
        {label && <span className="text-base tracking-tight">{label}</span>}
      </button>
    );
  }
);
PrimaryInteractionButton.displayName = "PrimaryInteractionButton";
