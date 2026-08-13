import React, { useState } from "react";
import { createPortal } from "react-dom";
import { HelpCircle, Info, X, ShieldCheck, Sparkles } from "lucide-react";

export interface SectionInfoContent {
  title: string;
  subtitle?: string;
  badge?: string;
  description: string | React.ReactNode;
  highlights?: { title: string; desc: string }[];
}

interface SectionInfoModalProps {
  content: SectionInfoContent;
  iconSize?: number;
  className?: string;
  buttonLabel?: string;
  variant?: "icon" | "button";
  theme?: "auto" | "dark" | "light";
}

export const SectionInfoModal: React.FC<SectionInfoModalProps> = ({
  content,
  iconSize = 13,
  className = "",
  buttonLabel,
  variant = "icon",
  theme = "auto",
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const defaultIconStyles =
    theme === "dark"
      ? "w-5 h-5 rounded-full inline-flex items-center justify-center text-slate-400 hover:text-white bg-white/10 hover:bg-white/20 border border-white/15 transition-all cursor-pointer shadow-2xs"
      : "w-5 h-5 rounded-full inline-flex items-center justify-center text-slate-400 hover:text-slate-900 bg-slate-100/80 hover:bg-slate-200 border border-slate-200/60 transition-all cursor-pointer";

  return (
    <>
      {variant === "button" ? (
        <button
          onClick={() => setIsOpen(true)}
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
            theme === "dark"
              ? "bg-white/10 hover:bg-white/20 text-slate-200 border border-white/15"
              : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/60"
          } transition-colors cursor-pointer ${className}`}
          title={`Learn about ${content.title}`}
        >
          <HelpCircle size={iconSize} className={theme === "dark" ? "text-slate-300" : "text-slate-500"} />
          <span>{buttonLabel || "How it works"}</span>
        </button>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className={`${defaultIconStyles} ${className}`}
          title={`Info about ${content.title}`}
        >
          <Info size={iconSize} />
        </button>
      )}

      {isOpen && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/50 backdrop-blur-xs animate-fade-in"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="relative w-full max-w-sm sm:max-w-md max-h-[90vh] overflow-y-auto bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                  <Sparkles size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900 tracking-tight">
                      {content.title}
                    </h3>
                    {content.badge && (
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-semibold rounded-md">
                        {content.badge}
                      </span>
                    )}
                  </div>
                  {content.subtitle && (
                    <p className="text-xs text-slate-500 font-medium">
                      {content.subtitle}
                    </p>
                  )}
                </div>
              </div>

              <button
                onClick={() => setIsOpen(false)}
                className="w-7 h-7 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Description Body */}
            <div className="text-xs text-slate-600 leading-relaxed space-y-3 pt-1 border-t border-slate-100">
              {typeof content.description === "string" ? (
                <p>{content.description}</p>
              ) : (
                content.description
              )}

              {content.highlights && content.highlights.length > 0 && (
                <div className="space-y-2 pt-2">
                  {content.highlights.map((h, i) => (
                    <div
                      key={i}
                      className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl space-y-0.5"
                    >
                      <div className="font-semibold text-slate-900 text-xs flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 shrink-0" />
                        <span>{h.title}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 pl-3 leading-snug">
                        {h.desc}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
                <ShieldCheck size={14} className="text-emerald-600" />
                <span>Expencio Guidance</span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="px-3.5 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Got it
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};
