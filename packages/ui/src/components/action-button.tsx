import React from "react";
import { cn } from "../utils";

export interface ActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  label: string;
}

export const ActionButton: React.FC<ActionButtonProps> = ({
  icon,
  label,
  className,
  disabled,
  ...props
}) => {
  return (
    <button
      type="button"
      disabled={disabled}
      className={cn(
        "flex flex-col items-center justify-center py-4 px-3 bg-white border border-slate-100/80 rounded-2xl shadow-xs hover:shadow-md transition-all duration-150 active:scale-95 select-none w-full",
        disabled && "opacity-50 pointer-events-none",
        className
      )}
      {...props}
    >
      <div className="w-11 h-11 rounded-full bg-slate-950 text-white flex items-center justify-center text-lg mb-2 shadow-xs">
        {icon}
      </div>
      <span className="text-xs font-semibold text-slate-800 tracking-tight">
        {label}
      </span>
    </button>
  );
};
