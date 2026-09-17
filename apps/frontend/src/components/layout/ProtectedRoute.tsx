/**
 * components/layout/ProtectedRoute.tsx
 *
 * Guards all authenticated routes.
 * - Minimal, sleek loading screen
 * - Preserves the originally requested URL in `state.from` for post-login redirect
 */

import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '../../core/providers/AuthContext';

const NUDGES = [
  "Track your goals from Expensio",
  "Add multiple transactions from a single screen",
  "Smart analysis waiting for you, map once and forget",
  "Track and manage your debts, add reminders",
  "Take your tour",
  "Expensio is made for the one who's lazy enough to track things one by one",
  "Our simple UI makes it easy for anyone to handle your expenses",
  "Expenses at your fingertips"
];

export function ExpensioLoadingScreen() {
  const [nudgeIndex, setNudgeIndex] = useState(0);

  useEffect(() => {
    const nudgeInterval = setInterval(() => {
      setNudgeIndex((prev) => (prev + 1) % NUDGES.length);
    }, 4000);

    return () => clearInterval(nudgeInterval);
  }, []);

  return (
    <div className="relative min-h-screen w-full bg-[#08080a] text-white flex items-center justify-center select-none overflow-hidden font-sans">
      {/* Ambient soft violet glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 65% 55% at 50% 50%, rgba(139, 92, 246, 0.08) 0%, rgba(99, 102, 241, 0.03) 45%, transparent 75%)',
        }}
      />

      {/* Subtle geometric Hexagonal Jaali cut lattice pattern */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none text-violet-300" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="hex-jaali-pattern" width="60" height="104" patternUnits="userSpaceOnUse">
            {/* Hexagon 1 (Center: 30, 26) - Outer Perimeter */}
            <path
              d="M15 0 L45 0 L60 26 L45 52 L15 52 L0 26 Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.75"
              strokeOpacity="0.05"
            />
            {/* Hexagon 1 - Inner Concentric Jaali Cut */}
            <path
              d="M21 10.4 L39 10.4 L48 26 L39 41.6 L21 41.6 L12 26 Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.7"
              strokeOpacity="0.07"
            />
            {/* Hexagon 1 - Radial Filigree Connectors */}
            <path
              d="M15 0 L21 10.4 M45 0 L39 10.4 M60 26 L48 26 M45 52 L39 41.6 M15 52 L21 41.6 M0 26 L12 26"
              stroke="currentColor"
              strokeWidth="0.6"
              strokeOpacity="0.04"
            />
            <circle cx="30" cy="26" r="1.5" fill="currentColor" fillOpacity="0.06" />

            {/* Hexagon 2 (Left Offset: Center 0, 78) */}
            <path
              d="M0 65 L15 52 L30 78 L15 104 L0 91"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.75"
              strokeOpacity="0.05"
            />
            <path
              d="M0 68.6 L9 62.4 L18 78 L9 93.6 L0 87.4"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.7"
              strokeOpacity="0.07"
            />
            <path
              d="M15 52 L9 62.4 M30 78 L18 78 M15 104 L9 93.6"
              stroke="currentColor"
              strokeWidth="0.6"
              strokeOpacity="0.04"
            />
            <circle cx="0" cy="78" r="1.5" fill="currentColor" fillOpacity="0.06" />

            {/* Hexagon 3 (Right Offset: Center 60, 78) */}
            <path
              d="M60 65 L45 52 L30 78 L45 104 L60 91"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.75"
              strokeOpacity="0.05"
            />
            <path
              d="M60 68.6 L51 62.4 L42 78 L51 93.6 L60 87.4"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.7"
              strokeOpacity="0.07"
            />
            <path
              d="M45 52 L51 62.4 M45 104 L51 93.6"
              stroke="currentColor"
              strokeWidth="0.6"
              strokeOpacity="0.04"
            />
            <circle cx="60" cy="78" r="1.5" fill="currentColor" fillOpacity="0.06" />
          </pattern>

          <radialGradient id="jaali-vignette" cx="50%" cy="50%" r="65%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
            <stop offset="50%" stopColor="#ffffff" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.05" />
          </radialGradient>
          <mask id="jaali-mask">
            <rect width="100%" height="100%" fill="url(#jaali-vignette)" />
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="url(#hex-jaali-pattern)" mask="url(#jaali-mask)" />
      </svg>

      {/* Foreground Content */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center px-4 max-w-md sm:max-w-xl select-none">
        <h1 className="font-google-sans text-4xl sm:text-6xl font-bold tracking-tight bg-gradient-to-r from-[#d8b4fe] via-[#a855f7] to-[#6366f1] bg-clip-text text-transparent mb-2 sm:mb-3 pb-1">
          Expensio
        </h1>
        <div className="min-h-[48px] sm:min-h-[32px] flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.p
              key={nudgeIndex}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.25 }}
              className="text-xs sm:text-sm text-zinc-400 font-normal tracking-wide px-2 leading-relaxed text-center"
            >
              {NUDGES[nudgeIndex]}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* Sleek Rare Kinetic Loading Circle - positioned under */}
        <div className="relative w-8 h-8 sm:w-9 sm:h-9 mt-6 sm:mt-8 flex items-center justify-center">
          <svg className="w-full h-full animate-rare-spin" viewBox="0 0 36 36" fill="none">
            <defs>
              <linearGradient id="rare-loader-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#d8b4fe" />
                <stop offset="50%" stopColor="#a855f7" />
                <stop offset="100%" stopColor="#6366f1" />
              </linearGradient>
            </defs>
            {/* Ultra-thin hairline guide track */}
            <circle
              cx="18"
              cy="18"
              r="14.5"
              stroke="rgba(255, 255, 255, 0.08)"
              strokeWidth="1.2"
            />
            {/* Breathing kinetic gradient arc with soft glow */}
            <circle
              cx="18"
              cy="18"
              r="14.5"
              stroke="url(#rare-loader-grad)"
              strokeWidth="1.6"
              strokeLinecap="round"
              className="animate-rare-arc"
              style={{
                filter: 'drop-shadow(0 0 5px rgba(168, 85, 247, 0.6))',
              }}
            />
          </svg>
          {/* Inner breathing quantum photon core */}
          <div className="absolute w-1.5 h-1.5 rounded-full bg-gradient-to-tr from-violet-300 via-fuchsia-300 to-indigo-400 shadow-[0_0_8px_rgba(216,180,254,0.9)] animate-pulse" />
        </div>
      </div>
    </div>
  );
}

export function ProtectedRoute() {
  const { status } = useAuth();
  const location = useLocation();
  const isPreview = new URLSearchParams(location.search).get('preview') === 'loading';

  // While the startup session check is in-flight (or in preview mode), render the minimal loader
  if (status === 'loading' || isPreview) {
    return <ExpensioLoadingScreen />;
  }

  if (status === 'unauthenticated') {
    // Preserve the originally requested path so we can redirect back after authentication
    return <Navigate to="/welcome" state={{ from: location }} replace />;
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen w-full bg-[#08080a] text-white flex items-center justify-center select-none overflow-hidden font-sans">
        <div className="flex flex-col items-center justify-center text-center px-6 max-w-sm select-none">
          <h2 className="text-3xl font-bold tracking-tight text-white mb-2">
            Expensio
          </h2>
          <p className="text-sm text-zinc-400 mb-6">
            Can't connect right now. Your local expenses are safe.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-5 py-2 rounded-full text-xs font-semibold text-black bg-white hover:bg-zinc-200 transition-colors pointer-events-auto"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return <Outlet />;
}

export default ProtectedRoute;
