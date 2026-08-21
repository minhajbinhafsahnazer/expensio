import React, { useState, useEffect } from "react";
import { X, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../core/providers/AuthContext";
import { useTour } from "../core/providers/TourProvider";

interface OnboardingTourProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TourStep {
  id: string;
  counter: string;
  titleLine1: string;
  titleLine2: string;
  subtitle: string;
  hero: React.ReactNode;
}

export const OnboardingTour: React.FC<OnboardingTourProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const { startTour } = useTour();
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);

  const tourStorageKey = user ? `expencio_tour_seen_${user.id}` : "expencio_tour_seen_guest";

  // Prevent background scroll when tour modal is open
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

  if (!isOpen) return null;

  const steps: TourStep[] = [
    {
      id: "welcome",
      counter: "01 / 04",
      titleLine1: "Personal finance,",
      titleLine2: "simplified.",
      subtitle: "Everything you need to understand your money — without the clutter.",
      hero: (
        <div className="w-full h-36 bg-gradient-to-br from-slate-900 to-slate-950 rounded-2xl p-4 shadow-xl border border-slate-800 flex flex-col justify-between text-white relative overflow-hidden select-none">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-slate-400">Monthly Summary</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">Offline-Ready</span>
          </div>
          <div>
            <span className="text-2xl font-bold font-mono tracking-tight">$ 24,580</span>
            <span className="text-[11px] text-slate-400 block mt-0.5 font-medium">12 expenses logged this month</span>
          </div>
          <div className="flex items-end gap-1.5 h-6 pt-1">
            {[40, 65, 30, 90, 45, 80, 100, 60, 75, 50].map((h, i) => (
              <div key={i} className="flex-1 bg-slate-700/60 rounded-xs transition-all duration-300" style={{ height: `${h}%` }} />
            ))}
          </div>
        </div>
      ),
    },
    {
      id: "debt",
      counter: "02 / 04",
      titleLine1: "Debt & loan",
      titleLine2: "management.",
      subtitle: "Track money owed, manage repayments, and stay clear of liabilities.",
      hero: (
        <div className="w-full h-36 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col justify-between text-white relative overflow-hidden select-none">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
          
          {/* Header */}
          <div className="flex items-center justify-between text-xs font-medium z-10">
            <span className="text-slate-400 font-mono text-[10px] uppercase tracking-wider">IOU & Debt Ledger</span>
            <span className="text-rose-400 font-bold font-mono text-xs">
              -$ 750 <span className="text-[10px] text-slate-500 font-normal">(Net)</span>
            </span>
          </div>

          {/* Minimal List Rows */}
          <div className="flex flex-col gap-2 z-10 py-1">
            {/* Item 1 */}
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-800/60">
              <div className="flex items-center gap-2">
                <span className="text-xs">💳</span>
                <span className="text-xs font-medium text-slate-200">Bank Loan / Credit</span>
              </div>
              <span className="font-mono font-bold text-rose-400 text-xs">-$ 1,200</span>
            </div>

            {/* Item 2 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs">🤝</span>
                <span className="text-xs font-medium text-slate-200">Alex (Dinner Split)</span>
              </div>
              <span className="font-mono font-bold text-emerald-400 text-xs">+$ 450</span>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-1 border-t border-slate-800/80 z-10">
            <span>2 Active Items</span>
            <span className="text-indigo-400 font-bold">+ Track IOU →</span>
          </div>
        </div>
      ),
    },
    {
      id: "analytics",
      counter: "03 / 04",
      titleLine1: "Visual spending",
      titleLine2: "analytics.",
      subtitle: "Understand your financial velocity with period breakdowns and trend bars.",
      hero: (
        <div className="w-full h-36 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col justify-between text-white relative overflow-hidden select-none">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />
          
          {/* Header */}
          <div className="flex items-center justify-between text-xs font-medium z-10">
            <span className="text-slate-400 font-mono text-[10px] uppercase tracking-wider">30-Day Velocity</span>
            <span className="text-purple-300 font-bold font-mono text-xs">
              $ 4,200 <span className="text-[10px] text-slate-400 font-normal">(Peak)</span>
            </span>
          </div>

          {/* High-Clarity Sleek Strip Bar Chart */}
          <div className="w-full h-14 flex items-end justify-between gap-[3px] my-1 z-10 relative">
            {[15, 25, 45, 95, 60, 40, 20, 70, 50, 30, 80, 40, 15, 65, 35, 85, 45, 25].map((pct, i) => {
              const isPeak = i === 3;
              return (
                <div key={i} className="relative flex-1 h-full flex flex-col justify-end items-center">
                  <div
                    className={`w-full rounded-t-xs transition-all duration-300 ${
                      isPeak
                        ? "bg-gradient-to-t from-purple-600 to-indigo-400 shadow-[0_-2px_10px_rgba(168,85,247,0.7)]"
                        : pct >= 70
                        ? "bg-purple-600/90"
                        : pct >= 40
                        ? "bg-purple-700/60"
                        : "bg-slate-800/70"
                    }`}
                    style={{ height: `${pct}%` }}
                  />
                  {/* Single Clean Peak Tooltip */}
                  {isPeak && (
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-purple-950/90 text-purple-200 border border-purple-500/40 text-[9px] font-mono font-bold py-0.5 px-1.5 rounded shadow-lg whitespace-nowrap z-20 flex items-center gap-1">
                      <span>$4,200</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer Metrics */}
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-1 border-t border-slate-800/80 z-10">
            <span>Category Velocity</span>
            <span className="text-emerald-400 font-bold">-14.2% Spend</span>
          </div>
        </div>
      ),
    },
    {
      id: "goals",
      counter: "04 / 04",
      titleLine1: "Financial Goals &",
      titleLine2: "guided tour.",
      subtitle: "Track savings milestones and follow interactive dashboard guides.",
      hero: (
        <div className="w-full h-36 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col justify-between text-white relative overflow-hidden select-none">
          <div className="absolute bottom-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between z-10">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Emergency Fund</span>
            <span className="text-xs font-bold text-emerald-400">85% Complete</span>
          </div>
          <div className="flex flex-col gap-1.5 z-10">
            <div className="flex items-center justify-between text-xs font-bold text-white">
              <span>$ 8,500 Saved</span>
              <span className="text-slate-400 font-normal">Target $ 10,000</span>
            </div>
            <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-800">
              <div className="h-full bg-emerald-500 rounded-full w-[85%] transition-all duration-500" />
            </div>
          </div>
          <div className="text-[11px] font-medium text-slate-400 flex items-center justify-between z-10">
            <span>Interactive Tooltip Guidance</span>
            <span className="text-purple-300 font-bold">Ready →</span>
          </div>
        </div>
      ),
    },
  ];

  const step = steps[currentStep];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setDirection(1);
      setCurrentStep((prev) => prev + 1);
    } else {
      handleStartTour();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setDirection(-1);
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleStartTour = () => {
    startTour();
    onClose();
  };

  const handleSkipEntirely = () => {
    localStorage.setItem(tourStorageKey, "true");
    onClose();
  };

  const handleDragEnd = (_: any, info: any) => {
    const swipeThreshold = 50;
    if (info.offset.x < -swipeThreshold) {
      handleNext();
    } else if (info.offset.x > swipeThreshold) {
      handlePrev();
    }
  };

  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 80 : -80,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: number) => ({
      x: dir < 0 ? 80 : -80,
      opacity: 0,
    }),
  };

  const progressPct = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-md animate-fade-in select-none">
      {/* Sleek unified surface container */}
      <div
        className="relative w-full max-w-sm sm:max-w-[420px] h-[500px] sm:h-[520px] bg-[#F5F5F7]/95 backdrop-blur-2xl border border-white/80 rounded-[32px] shadow-[0_30px_90px_-20px_rgba(0,0,0,0.25)] overflow-hidden transition-all duration-300 flex flex-col justify-between"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sleek Top Progress Bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-slate-200/50 overflow-hidden z-20">
          <div
            className="h-full bg-slate-900 transition-all duration-300 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* Top Quiet Header */}
        <div className="pt-6 px-6 sm:px-7 flex items-center justify-between shrink-0 z-20">
          <span className="text-xs font-mono font-medium text-slate-400 tracking-widest">
            {step.counter}
          </span>

          <button
            onClick={handleSkipEntirely}
            className="w-8 h-8 rounded-full bg-slate-200/50 hover:bg-slate-200/80 text-slate-400 hover:text-slate-900 flex items-center justify-center transition-colors cursor-pointer"
            title="Close"
          >
            <X size={15} />
          </button>
        </div>

        {/* Animated Slide Content */}
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div
            key={step.id}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.25, ease: "easeInOut" }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.15}
            onDragEnd={handleDragEnd}
            className="px-6 sm:px-7 flex-1 flex flex-col justify-between py-4 overflow-hidden cursor-grab active:cursor-grabbing"
          >
            {/* Hero Visual Object */}
            <div className="w-full pt-1 shrink-0">
              {step.hero}
            </div>

            {/* Typography Section */}
            <div className="flex flex-col justify-end pb-2">
              <h2 className="text-2xl sm:text-[28px] font-bold text-slate-950 tracking-tight leading-[1.15]">
                {step.titleLine1}
                <br />
                {step.titleLine2}
              </h2>
              <p className="text-xs sm:text-[13px] text-slate-500 font-medium leading-relaxed mt-2.5">
                {step.subtitle}
              </p>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Quiet Bottom Action Bar */}
        <div className="pb-6 px-6 sm:px-7 pt-2 flex items-center justify-between shrink-0 z-20">
          <button
            onClick={handleSkipEntirely}
            className="text-xs font-medium text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
          >
            Skip
          </button>

          <button
            onClick={handleNext}
            className="px-5 py-2.5 bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs rounded-full shadow-sm flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer"
          >
            <span>{currentStep === steps.length - 1 ? "Let's Go" : "Next"}</span>
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

