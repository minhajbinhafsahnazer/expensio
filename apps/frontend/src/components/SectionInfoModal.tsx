import React, { useState, useEffect, useRef } from "react";
import { HelpCircle, Info, X, Sparkles } from "lucide-react";
import { useTour } from "../core/providers/TourProvider";

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
  align?: "left" | "center" | "right";
  tourStepId?: string;
}

export const SectionInfoModal: React.FC<SectionInfoModalProps> = ({
  content,
  iconSize = 13,
  className = "",
  buttonLabel,
  variant = "icon",
  theme = "auto",
  align = "left",
  tourStepId,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Safe extraction of tour context (in case it's used outside a provider somehow, though App wraps it)
  let tour: any = null;
  try {
    tour = useTour();
  } catch (e) {
    // Ignore if not wrapped
  }

  const defaultIconStyles =
    theme === "dark"
      ? "w-5 h-5 rounded-full inline-flex items-center justify-center text-slate-400 hover:text-white bg-white/10 hover:bg-white/20 border border-white/15 transition-all cursor-pointer shadow-2xs"
      : "w-5 h-5 rounded-full inline-flex items-center justify-center text-slate-400 hover:text-slate-900 bg-slate-100/80 hover:bg-slate-200 border border-slate-200/60 transition-all cursor-pointer";

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (isOpen && containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        if (tour?.isActive && tour.currentStepId === tourStepId) {
          tour.skipTour();
        }
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, tour?.isActive, tour?.currentStepId, tourStepId]);

  useEffect(() => {
    if (tour?.isActive && tour.currentStepId === tourStepId) {
      setIsOpen(true);
      setTimeout(() => {
        containerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 300);
    } else if (tour?.isActive && tour.currentStepId !== tourStepId) {
      setIsOpen(false);
    }
  }, [tour?.isActive, tour?.currentStepId, tourStepId]);

  const handleClose = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsOpen(false);
    if (tour?.isActive && tour.currentStepId === tourStepId) {
      tour.skipTour();
    }
  };

  return (
    <div className={`inline-flex items-center ${isOpen ? 'relative z-[9999]' : 'relative'}`} ref={containerRef}>
      {variant === "button" ? (
        <button
          onClick={(e) => { e.preventDefault(); setIsOpen(!isOpen); }}
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
            theme === "dark"
              ? "bg-white/10 hover:bg-white/20 text-slate-200 border border-white/15"
              : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/60"
          } transition-colors cursor-pointer ${className} ${isOpen ? 'ring-2 ring-indigo-500/50' : ''}`}
          title={`Learn about ${content.title}`}
        >
          <HelpCircle size={iconSize} className={theme === "dark" ? "text-slate-300" : "text-slate-500"} />
          <span>{buttonLabel || "How it works"}</span>
        </button>
      ) : (
        <button
          onClick={(e) => { e.preventDefault(); setIsOpen(!isOpen); }}
          className={`${defaultIconStyles} ${className} ${isOpen ? 'ring-2 ring-indigo-500/50' : ''}`}
          title={`Info about ${content.title}`}
        >
          <Info size={iconSize} />
        </button>
      )}

      {isOpen && (
        <div className={`absolute top-[calc(100%+10px)] ${
          align === 'right' 
            ? 'right-0' 
            : align === 'center' 
            ? 'left-1/2 -translate-x-1/2' 
            : 'left-0'
        } w-[250px] sm:w-[270px] max-w-[calc(100vw-32px)] z-[9999] animate-in slide-in-from-top-2 fade-in duration-200`}>
          {/* Arrow */}
          <div className={`absolute -top-1.5 ${
            align === 'right' 
              ? 'right-3' 
              : align === 'center' 
              ? 'left-1/2 -translate-x-1/2' 
              : 'left-3'
          } w-3 h-3 bg-slate-900/95 rotate-45 border-t border-l border-slate-700/50 z-10`} />
          
          {/* Content Box */}
          <div className="relative bg-slate-900/95 backdrop-blur-2xl border border-slate-700/60 rounded-2xl p-3.5 shadow-[0_20px_50px_rgba(0,0,0,0.6)] text-left overflow-hidden z-20">
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <div>
                <h4 className="text-xs font-bold text-white tracking-tight flex items-center gap-1.5">
                  <Sparkles size={12} className="text-indigo-400" />
                  {content.title}
                </h4>
                {content.subtitle && <p className="text-[10px] text-slate-400 font-medium mt-0.5">{content.subtitle}</p>}
              </div>
              <button onClick={handleClose} className="text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full p-1 transition-colors cursor-pointer shrink-0">
                <X size={12} />
              </button>
            </div>
            
            <div className="text-[11px] text-slate-300 leading-relaxed mt-2">
              {typeof content.description === "string" ? <p>{content.description}</p> : content.description}
              
              {tour?.isActive && tour.currentStepId === tourStepId && (
                <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between">
                  <button onClick={(e) => { e.preventDefault(); tour.skipTour(); }} className="text-[10px] text-slate-400 font-semibold hover:text-white transition-colors cursor-pointer">
                    Skip Tour
                  </button>
                  <button onClick={(e) => { e.preventDefault(); tour.nextStep(); }} className="bg-white text-slate-950 text-[11px] font-bold px-3 py-1 rounded-lg hover:bg-slate-200 transition-colors shadow-xs cursor-pointer">
                    {tour.isLastStep ? "Finish Tour" : "Next →"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
