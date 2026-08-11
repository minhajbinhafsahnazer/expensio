import React from "react";
import { cn } from "../utils";

export interface HeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
  level?: 1 | 2 | 3;
}

export const Heading = React.forwardRef<HTMLHeadingElement, HeadingProps>(
  ({ className, level = 1, children, ...props }, ref) => {
    const Tag = `h${level}` as "h1" | "h2" | "h3";
    const sizeClasses = {
      1: "text-2xl font-bold tracking-tight text-slate-900",
      2: "text-xl font-semibold tracking-tight text-slate-900",
      3: "text-base font-semibold text-slate-900",
    };

    return (
      <Tag
        ref={ref}
        className={cn(sizeClasses[level], className)}
        {...props}
      >
        {children}
      </Tag>
    );
  }
);
Heading.displayName = "Heading";

export interface TextProps extends React.HTMLAttributes<HTMLParagraphElement> {
  variant?: "default" | "medium";
}

export const Text = React.forwardRef<HTMLParagraphElement, TextProps>(
  ({ className, variant = "default", children, ...props }, ref) => {
    return (
      <p
        ref={ref}
        className={cn(
          "text-[15px] leading-relaxed text-slate-700",
          variant === "medium" && "font-medium text-slate-900",
          className
        )}
        {...props}
      >
        {children}
      </p>
    );
  }
);
Text.displayName = "Text";

export interface CaptionProps extends React.HTMLAttributes<HTMLSpanElement> {}

export const Caption = React.forwardRef<HTMLSpanElement, CaptionProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn("text-[13px] leading-normal text-slate-500", className)}
        {...props}
      >
        {children}
      </span>
    );
  }
);
Caption.displayName = "Caption";

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {}

export const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={cn(
          "text-[13px] font-medium leading-none text-slate-800 select-none",
          className
        )}
        {...props}
      >
        {children}
      </label>
    );
  }
);
Label.displayName = "Label";
