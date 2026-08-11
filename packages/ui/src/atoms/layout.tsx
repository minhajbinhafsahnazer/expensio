import React from "react";
import { cn } from "../utils";

export interface AppShellProps extends React.HTMLAttributes<HTMLDivElement> {}

export const AppShell = React.forwardRef<HTMLDivElement, AppShellProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "min-h-screen w-full bg-[#f8f8fa] text-slate-900 flex flex-col justify-between overflow-x-hidden selection:bg-emerald-500 selection:text-white",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
AppShell.displayName = "AppShell";

export interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg" | "full";
}

export const Container = React.forwardRef<HTMLDivElement, ContainerProps>(
  ({ className, size = "md", children, ...props }, ref) => {
    const sizeClasses = {
      sm: "max-w-md",
      md: "max-w-lg",
      lg: "max-w-2xl",
      full: "max-w-full",
    };

    return (
      <div
        ref={ref}
        className={cn("w-full mx-auto px-4 sm:px-6", sizeClasses[size], className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Container.displayName = "Container";

export interface StackProps extends React.HTMLAttributes<HTMLDivElement> {
  direction?: "row" | "column";
  gap?: 1 | 2 | 3 | 4 | 5 | 6 | 8 | 10 | 12;
  align?: "start" | "center" | "end" | "stretch";
  justify?: "start" | "center" | "end" | "between";
}

export const Stack = React.forwardRef<HTMLDivElement, StackProps>(
  ({ className, direction = "column", gap = 4, align = "stretch", justify = "start", children, ...props }, ref) => {
    const gapClasses = {
      1: "gap-1",
      2: "gap-2",
      3: "gap-3",
      4: "gap-4",
      5: "gap-5",
      6: "gap-6",
      8: "gap-8",
      10: "gap-10",
      12: "gap-12",
    };

    const alignClasses = {
      start: "items-start",
      center: "items-center",
      end: "items-end",
      stretch: "items-stretch",
    };

    const justifyClasses = {
      start: "justify-start",
      center: "justify-center",
      end: "justify-end",
      between: "justify-between",
    };

    return (
      <div
        ref={ref}
        className={cn(
          "flex",
          direction === "column" ? "flex-col" : "flex-row",
          gapClasses[gap],
          alignClasses[align],
          justifyClasses[justify],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Stack.displayName = "Stack";

export interface SpacerProps {
  size?: 1 | 2 | 3 | 4 | 5 | 6 | 8 | 10 | 12;
  axis?: "horizontal" | "vertical";
}

export const Spacer: React.FC<SpacerProps> = ({ size = 4, axis = "vertical" }) => {
  const sizeMap = {
    1: axis === "vertical" ? "h-1" : "w-1",
    2: axis === "vertical" ? "h-2" : "w-2",
    3: axis === "vertical" ? "h-3" : "w-3",
    4: axis === "vertical" ? "h-4" : "w-4",
    5: axis === "vertical" ? "h-5" : "w-5",
    6: axis === "vertical" ? "h-6" : "w-6",
    8: axis === "vertical" ? "h-8" : "w-8",
    10: axis === "vertical" ? "h-10" : "w-10",
    12: axis === "vertical" ? "h-12" : "w-12",
  };

  return <div className={cn("flex-shrink-0", sizeMap[size])} aria-hidden="true" />;
};

export interface DividerProps extends React.HTMLAttributes<HTMLDivElement> {}

export const Divider = React.forwardRef<HTMLDivElement, DividerProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("w-full h-[1px] bg-slate-200/80 my-2", className)}
        {...props}
      />
    );
  }
);
Divider.displayName = "Divider";
