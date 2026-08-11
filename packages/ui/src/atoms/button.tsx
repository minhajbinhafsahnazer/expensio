import React from "react";
import { cn } from "../utils";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive" | "outline";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      loading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center font-medium transition-all duration-150 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none select-none";

    const variantStyles: Record<ButtonVariant, string> = {
      primary:
        "bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm",
      secondary:
        "bg-slate-100 hover:bg-slate-200 text-slate-900",
      ghost:
        "bg-transparent hover:bg-slate-100 text-slate-700",
      destructive:
        "bg-rose-600 hover:bg-rose-500 text-white shadow-sm",
      outline:
        "border border-slate-200 bg-white hover:bg-slate-50 text-slate-900",
    };

    const sizeStyles: Record<ButtonSize, string> = {
      // All sizes maintain at least 44px height for touch accessibility
      sm: "h-11 px-3 text-[13px] rounded-md gap-1.5",
      md: "h-12 px-4 text-[15px] rounded-md gap-2",
      lg: "h-14 px-6 text-[16px] rounded-lg gap-2.5 font-semibold",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        {...props}
      >
        {loading ? (
          <span className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin flex-shrink-0" />
        ) : (
          <>
            {leftIcon && <span className="flex-shrink-0 flex items-center">{leftIcon}</span>}
            <span className="truncate">{children}</span>
            {rightIcon && <span className="flex-shrink-0 flex items-center">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);
Button.displayName = "Button";

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon: React.ReactNode;
  "aria-label": string;
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, variant = "ghost", size = "md", icon, "aria-label": ariaLabel, ...props }, ref) => {
    const sizeStyles: Record<ButtonSize, string> = {
      sm: "w-11 h-11 rounded-md",
      md: "w-12 h-12 rounded-md",
      lg: "w-14 h-14 rounded-lg",
    };

    return (
      <Button
        ref={ref}
        variant={variant}
        size={size}
        aria-label={ariaLabel}
        className={cn("p-0 flex-shrink-0", sizeStyles[size], className)}
        {...props}
      >
        {icon}
      </Button>
    );
  }
);
IconButton.displayName = "IconButton";
