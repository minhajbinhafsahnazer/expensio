import React, { useEffect } from "react";
import { cn } from "../utils";

export interface CaptureSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export const CaptureSheet: React.FC<CaptureSheetProps> = ({
  isOpen,
  onClose,
  title = "Add Expense",
  children,
  className,
}) => {
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  // Handle escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 select-none"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 50,
      }}
    >
      {/* Backdrop: Clicking outside the modal immediately closes it */}
      <div
        onClick={onClose}
        className="fixed inset-0 transition-opacity duration-150 animate-in fade-in cursor-pointer"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(15, 23, 42, 0.4)",
          backdropFilter: "blur(2px)",
        }}
        aria-hidden="true"
      />

      {/* Centered Notion Minimal Modal Surface */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{
          borderRadius: "14px",
          margin: "auto",
          maxHeight: "80vh",
        }}
        className={cn(
          "relative z-50 w-full max-w-[340px] bg-white border border-slate-200 shadow-2xl p-3 sm:p-3.5 flex flex-col gap-2 transition-all duration-150 animate-in zoom-in-95 fade-in overflow-y-auto selection:bg-slate-900 selection:text-white",
          className
        )}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-900 tracking-tight font-sans">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="w-7 h-7 rounded-md inline-flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <span className="text-lg leading-none">&times;</span>
          </button>
        </div>

        {/* Modal Content (CurrencyField, Quick Choices, Receipt Cart) */}
        <div className="flex flex-col gap-4">{children}</div>
      </div>
    </div>
  );
};
