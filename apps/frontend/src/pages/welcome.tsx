import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";

const NUDGES = [
  "With Expencio, your personal income tracking is made simple",
  "Your data is protected with RLS-grade security",
  "Offline-first sync ensures your data is always accessible"
];

export default function WelcomePage() {
  const navigate = useNavigate();
  const [nudgeIndex, setNudgeIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setNudgeIndex((prev) => (prev + 1) % NUDGES.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 selection:bg-slate-900 selection:text-white">
      <div className="w-full max-w-sm bg-white border border-slate-200/80 rounded-3xl p-7 sm:p-8 shadow-sm flex flex-col items-center text-center gap-6 animate-in fade-in zoom-in-95 duration-200">
        
        {/* App Logo */}
        <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-white shadow-md flex items-center justify-center bg-slate-950 mt-1">
          <img
            src="/logo.jpg"
            alt="Expencio"
            className="w-full h-full object-cover scale-[1.35]"
          />
        </div>

        {/* Brand & Tagline */}
        <div className="flex flex-col gap-1.5">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-950 tracking-tight">
            Welcome to Expencio
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed max-w-[260px] mx-auto">
            Personal income & expense tracking, made simple.
          </p>
        </div>

        {/* Notion / Linear Passby Nudge Pill */}
        <div className="w-full p-3 bg-gradient-to-r from-sky-50/80 to-indigo-50/80 border border-sky-100/70 rounded-2xl flex items-center gap-2.5 shadow-xs text-left">
          <div className="w-6 h-6 rounded-full overflow-hidden flex items-center justify-center shrink-0 border border-white bg-white shadow-xs">
            <img
              src="/logo.jpg"
              alt="Expencio"
              className="w-full h-full object-cover scale-[1.35]"
            />
          </div>
          <div className="flex-1 min-w-0">
            <p
              key={nudgeIndex}
              className="text-[11px] text-slate-700 font-medium leading-snug animate-in fade-in slide-in-from-bottom-2 duration-300"
            >
              "{NUDGES[nudgeIndex]}"
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2.5 w-full pt-1">
          <button
            type="button"
            onClick={() => navigate("/register")}
            className="w-full py-3 bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer group"
          >
            <span>Get Started</span>
            <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
          </button>
          
          <button
            type="button"
            onClick={() => navigate("/login")}
            className="w-full py-3 bg-slate-100/90 hover:bg-slate-200/80 text-slate-800 font-semibold text-xs rounded-xl border border-slate-200/60 transition-colors cursor-pointer"
          >
            Sign In
          </button>
        </div>

        {/* Footer Subtext */}
        <div className="text-[10px] text-slate-400 font-medium tracking-wide">
          Offline-first • Zero-trust security
        </div>

      </div>
    </div>
  );
}
