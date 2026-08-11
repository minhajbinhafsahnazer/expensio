import React, { useState, useEffect, useRef } from "react";
import { cn } from "../utils";

export interface CurrencyFieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> {
  value?: number | string;
  onChange?: (value: number | undefined, rawString: string) => void;
  currencySymbol?: string;
  autoFocus?: boolean;
  label?: string;
  error?: string;
}

export const CurrencyField = React.forwardRef<HTMLInputElement, CurrencyFieldProps>(
  (
    {
      className,
      value = "",
      onChange,
      currencySymbol = "₹",
      autoFocus = false,
      label,
      error,
      placeholder = "0",
      disabled = false,
      onKeyDown,
      ...props
    },
    ref
  ) => {
    const [displayValue, setDisplayValue] = useState<string>("");
    const internalRef = useRef<HTMLInputElement | null>(null);

    // Combine forwarded ref and internal ref
    const setRefs = (element: HTMLInputElement | null) => {
      internalRef.current = element;
      if (typeof ref === "function") {
        ref(element);
      } else if (ref) {
        ref.current = element;
      }
    };

    // Format initial or external value changes
    useEffect(() => {
      if (value === undefined || value === null || value === "") {
        setDisplayValue("");
        return;
      }
      const numStr = value.toString().replace(/[^0-9.]/g, "");
      const parts = numStr.split(".");
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
      setDisplayValue(parts.join("."));
    }, [value]);

    // Handle auto-focus reliably with small delay for sheet animations
    useEffect(() => {
      if (autoFocus && internalRef.current) {
        const timer = setTimeout(() => {
          internalRef.current?.focus();
        }, 50);
        return () => clearTimeout(timer);
      }
      return undefined;
    }, [autoFocus]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawInput = e.target.value;

      // Clean non-numeric except decimal point
      let cleaned = rawInput.replace(/[^0-9.]/g, "");

      // Ensure only one decimal point
      const parts = cleaned.split(".");
      if (parts.length > 2) {
        cleaned = parts[0] + "." + parts.slice(1).join("");
      }

      // Limit decimal places to 2
      if (parts[1] && parts[1].length > 2) {
        cleaned = parts[0] + "." + parts[1].substring(0, 2);
      }

      // Format with thousand separators
      const formattedParts = cleaned.split(".");
      formattedParts[0] = formattedParts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
      const formatted = formattedParts.join(".");

      setDisplayValue(formatted);

      if (onChange) {
        const numericVal = cleaned ? parseFloat(cleaned) : undefined;
        onChange(numericVal, cleaned);
      }
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault();
      const pastedText = e.clipboardData.getData("text");
      const cleaned = pastedText.replace(/[^0-9.]/g, "");
      if (cleaned) {
        const numericVal = parseFloat(cleaned);
        const parts = cleaned.split(".");
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        setDisplayValue(parts.join("."));
        if (onChange) {
          onChange(numericVal, cleaned);
        }
      }
    };

    return (
      <div className="w-full flex flex-col gap-1 select-none">
        {label && (
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono text-center">
            {label}
          </label>
        )}
        {/* Centered Calculator Display with Top & Bottom Dividers */}
        <div
          onClick={() => internalRef.current?.focus()}
          className={cn(
            "relative flex items-center justify-center w-full py-2 border-y border-slate-100 bg-transparent transition-all cursor-text",
            disabled && "opacity-50 pointer-events-none",
            className
          )}
        >
          <div className="flex items-baseline justify-center max-w-full px-2">
            <span className="text-3xl sm:text-4xl font-light text-slate-400 select-none mr-2 font-mono flex-shrink-0">
              {currencySymbol}
            </span>
            <input
              ref={setRefs}
              type="text"
              inputMode="decimal"
              value={displayValue}
              onChange={handleInputChange}
              onPaste={handlePaste}
              placeholder={placeholder}
              disabled={disabled}
              onKeyDown={onKeyDown}
              className="w-full text-center bg-transparent text-4xl sm:text-5xl font-black tracking-tight text-slate-900 focus:outline-none placeholder:text-slate-200 font-mono border-none p-0"
              {...props}
            />
          </div>
        </div>
        {error && <span className="text-[12px] text-rose-500 font-medium text-center">{error}</span>}
      </div>
    );
  }
);
CurrencyField.displayName = "CurrencyField";
