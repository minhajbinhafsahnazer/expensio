/**
 * components/layout/ProtectedRoute.tsx
 *
 * Guards all authenticated routes.
 * - Shows nothing while auth status is loading (prevents login-page flash)
 * - Preserves the originally requested URL in `state.from` for post-login redirect
 */

import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
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

export function ProtectedRoute() {
  const { status } = useAuth();
  const location = useLocation();
  const [nudgeIndex, setNudgeIndex] = useState(0);

  useEffect(() => {
    if (status !== 'loading') return;

    const nudgeInterval = setInterval(() => {
      setNudgeIndex((prev) => (prev + 1) % NUDGES.length);
    }, 5000);

    return () => clearInterval(nudgeInterval);
  }, [status]);

  // While the startup session check is in-flight, render nothing.
  // This prevents the brief flash of the login page for users who are
  // already authenticated via their refresh cookie.
  if (status === 'loading') {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-50 px-6 font-sans">
        {/* Logo */}
        <div className="w-16 h-16 mb-6 overflow-hidden rounded-[18px] shadow-[0_8px_30px_rgba(0,0,0,0.08)] border border-slate-900/5">
          <img src="/logo.jpg" alt="Expensio Logo" className="w-full h-full object-cover scale-[1.35]" />
        </div>

        {/* Text */}
        <h1 className="text-[22px] font-extrabold text-slate-900 tracking-tight mb-2">
          Starting Engine
        </h1>
        
        {/* Nudges Container */}
        <div className="relative h-12 flex items-center justify-center w-full max-w-[320px] mb-8 overflow-hidden">
          {NUDGES.map((nudge, idx) => (
            <p 
              key={idx}
              className={`absolute w-full text-sm font-medium text-slate-500 text-center leading-relaxed px-2 transition-all duration-700 ease-in-out ${
                idx === nudgeIndex 
                  ? 'opacity-100 translate-y-0' 
                  : 'opacity-0 translate-y-3 pointer-events-none'
              }`}
            >
              {nudge}
            </p>
          ))}
        </div>

        {/* Spinner */}
        <div className="w-full flex justify-center">
          <svg className="w-8 h-8 text-indigo-600 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    // Preserve the originally requested path so we can redirect back after authentication
    return <Navigate to="/welcome" state={{ from: location }} replace />;
  }

  if (status === 'error') {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f6f6f6',
        padding: '24px 16px',
        textAlign: 'center'
      }}>
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '20px',
          padding: '40px 36px',
          maxWidth: '400px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.05)',
        }}>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#0f172a', margin: '0 0 16px 0', letterSpacing: '-0.03em' }}>
            Can't connect right now.
          </h1>
          <p style={{ fontSize: '15px', color: '#64748b', margin: '0 0 8px 0' }}>
            Your local expenses are safe.
          </p>
          <p style={{ fontSize: '15px', color: '#64748b', margin: '0 0 32px 0' }}>
            We'll reconnect automatically when the server is available.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '11px 24px',
              background: '#000000',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              letterSpacing: '-0.01em',
            }}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return <Outlet />;
}
