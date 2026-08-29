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

export function ProtectedRoute() {
  const { status } = useAuth();
  const location = useLocation();
  const [progress, setProgress] = useState(0);
  const [timeLeft, setTimeLeft] = useState(50);

  useEffect(() => {
    // Only run the timer if we are in the loading state
    if (status === 'loading') {
      const startTime = Date.now();
      const totalDuration = 50000; // 50 seconds

      const interval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const newProgress = Math.min((elapsed / totalDuration) * 100, 100);
        setProgress(newProgress);
        
        const remaining = Math.max(Math.ceil((totalDuration - elapsed) / 1000), 0);
        setTimeLeft(remaining);
      }, 50);

      return () => clearInterval(interval);
    }
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
        <p className="text-sm font-medium text-slate-500 max-w-[280px] text-center leading-relaxed mb-10">
          Configuring your secure workspace and setting up analysis...
        </p>

        {/* Horizontal Progress Bar */}
        <div className="w-full max-w-xs flex flex-col items-center">
          <div className="w-full h-1.5 bg-slate-200/80 rounded-full overflow-hidden mb-3 relative">
            <div 
              className="absolute top-0 left-0 h-full bg-indigo-600 rounded-full transition-all duration-75 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="w-full flex justify-between items-center text-[11px] font-bold text-slate-400 tracking-wider uppercase">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Waking Server
            </span>
            <span className="text-slate-500 tabular-nums">0:{timeLeft.toString().padStart(2, '0')}s</span>
          </div>
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
