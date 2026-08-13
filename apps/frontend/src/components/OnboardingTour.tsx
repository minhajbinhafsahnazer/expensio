import React, { useState, useEffect } from "react";
import {
  Wifi,
  ChevronRight,
  ChevronLeft,
  X,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "../core/providers/AuthContext";

interface OnboardingTourProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TourStep {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  color: string;
  content: React.ReactNode;
}

export const OnboardingTour: React.FC<OnboardingTourProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);

  const tourStorageKey = user ? `expencio_tour_seen_${user.id}` : "expencio_tour_seen_guest";

  // Prevent scroll when tour modal is open
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
      title: "Welcome to Expencio",
      subtitle: "Personal income & expense tracking made simple, secure, and private.",
      badge: "Get Started",
      color: "from-amber-500/20 to-orange-500/10",
      content: (
        <div className="space-y-3.5 text-xs sm:text-sm text-slate-600">
          <p>
            Expencio is built with an <strong className="text-slate-900 font-semibold">Apple & Linear-inspired minimal aesthetic</strong> to give you complete clarity over your finances.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-2xl flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-900 block text-xs">RLS-Grade Security</span>
                <span className="text-[11px] text-slate-500">Your data is strictly isolated per user account at the database engine level.</span>
              </div>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-2xl flex items-start gap-2.5">
              <Wifi className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-900 block text-xs">Offline-First Sync</span>
                <span className="text-[11px] text-slate-500">Log entries instantly even without internet. Everything syncs automatically when online.</span>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "logging",
      title: "Fast Expense & Income Logging",
      subtitle: "Capture transactions in seconds with flexible categories.",
      badge: "Quick Action",
      color: "from-indigo-500/20 to-blue-500/10",
      content: (
        <div className="space-y-3.5 text-xs sm:text-sm text-slate-600">
          <p>
            Tap the floating <strong className="text-slate-900 font-semibold">+ Log Expense / Income</strong> button anytime to open the capture sheet.
          </p>
          <ul className="space-y-2 list-none pl-0">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <span><strong>Category & Date Tags:</strong> Tag entries by Today, Yesterday, or custom dates, and organize by standard categories.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <span><strong>Superior Categories:</strong> Group detailed categories into high-level buckets like <em>Food & Dining</em> or <em>Housing & Bills</em>.</span>
            </li>
          </ul>
        </div>
      ),
    },
    {
      id: "analytics",
      title: "Analytics & Superior Categories",
      subtitle: "Deep visual insights into your spending habits.",
      badge: "Smart Reports",
      color: "from-purple-500/20 to-pink-500/10",
      content: (
        <div className="space-y-3.5 text-xs sm:text-sm text-slate-600">
          <p>
            Navigate to the <strong className="text-slate-900 font-semibold">Analytics</strong> tab to view interactive charts and spending distribution breakdowns.
          </p>
          <div className="p-3 bg-purple-50/70 border border-purple-100 rounded-2xl text-purple-900 text-xs leading-relaxed">
            💡 <strong>Superior Category Aggregation:</strong> When enabled in Settings, your analytics dynamically group granular items into clean superior category totals for higher-level budget planning.
          </div>
        </div>
      ),
    },
    {
      id: "goals",
      title: "Financial Goals & Budgets",
      subtitle: "Track savings targets and enforce budget limits effortlessly.",
      badge: "Target Tracking",
      color: "from-emerald-500/20 to-teal-500/10",
      content: (
        <div className="space-y-3.5 text-xs sm:text-sm text-slate-600">
          <p>
            Visit the <strong className="text-slate-900 font-semibold">Goals & Budgets</strong> page to stay disciplined with your financial targets.
          </p>
          <ul className="space-y-2 list-none pl-0">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span><strong>Savings Goals:</strong> Set target amounts, deposit milestones, and track percentage completion.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span><strong>Session Budgets:</strong> Track monthly or event-specific spending caps with real-time remaining balance counters.</span>
            </li>
          </ul>
        </div>
      ),
    },
    {
      id: "privacy",
      title: "Privacy & Zero-Trust Security",
      subtitle: "You own your data. Always.",
      badge: "Zero-Trust",
      color: "from-slate-900/10 to-slate-700/10",
      content: (
        <div className="space-y-3.5 text-xs sm:text-sm text-slate-600">
          <p>
            Expencio is engineered with strict <strong className="text-slate-900 font-semibold">zero-trust security principles</strong>:
          </p>
          <ul className="space-y-2 list-none pl-0 text-xs">
            <li className="flex items-center gap-2 text-slate-700">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-900 shrink-0"></span>
              <span>No user data is ever sold or shared with external data brokers.</span>
            </li>
            <li className="flex items-center gap-2 text-slate-700">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-900 shrink-0"></span>
              <span>Every API request is re-validated against database row-level permissions.</span>
            </li>
            <li className="flex items-center gap-2 text-slate-700">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-900 shrink-0"></span>
              <span>You can replay this tour anytime from your Profile Settings.</span>
            </li>
          </ul>
        </div>
      ),
    },
  ];

  const step = steps[currentStep];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem(tourStorageKey, "true");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
      <div
        className="relative w-full max-w-sm sm:max-w-md max-h-[90vh] bg-white border border-slate-200/90 rounded-3xl shadow-2xl overflow-hidden transition-all duration-300 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header decoration */}
        <div className={`p-5 sm:p-6 bg-gradient-to-br ${step.color} border-b border-slate-100 relative shrink-0`}>
          <div className="flex items-center justify-between gap-3 mb-2.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white/90 backdrop-blur-xs rounded-full border border-slate-200/60 text-[11px] font-semibold text-slate-800 shadow-2xs">
              <div className="w-4 h-4 rounded-full overflow-hidden flex items-center justify-center shrink-0 border border-slate-200/60 bg-white">
                <img src="/logo.jpg" alt="Expencio" className="w-full h-full object-cover scale-[1.35]" />
              </div>
              <span>{step.badge}</span>
            </div>

            <button
              onClick={handleComplete}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/80 hover:bg-white text-slate-500 hover:text-slate-900 flex items-center justify-center transition-colors shadow-2xs cursor-pointer"
              title="Close tour"
            >
              <X size={15} />
            </button>
          </div>

          <h2 className="text-lg sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            {step.title}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
            {step.subtitle}
          </p>
        </div>

        {/* Step Body */}
        <div className="p-5 sm:p-6 flex-1 overflow-y-auto min-h-[140px]">
          {step.content}
        </div>

        {/* Footer Navigation */}
        <div className="px-5 py-3.5 sm:px-6 sm:py-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between shrink-0">
          {/* Progress Indicators */}
          <div className="flex items-center gap-1.5">
            {steps.map((s, idx) => (
              <button
                key={s.id}
                onClick={() => setCurrentStep(idx)}
                className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                  idx === currentStep
                    ? "w-6 bg-slate-900"
                    : "w-2 bg-slate-200 hover:bg-slate-300"
                }`}
                title={`Go to step ${idx + 1}`}
              />
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <button
                onClick={handlePrev}
                className="px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer flex items-center gap-1"
              >
                <ChevronLeft size={16} />
                <span>Back</span>
              </button>
            )}

            <button
              onClick={handleNext}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span>{currentStep === steps.length - 1 ? "Finish Tour" : "Next"}</span>
              {currentStep < steps.length - 1 && <ChevronRight size={15} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
