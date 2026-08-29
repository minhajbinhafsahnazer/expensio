/**
 * components/layout/ProtectedRoute.tsx
 *
 * Guards all authenticated routes.
 * - Shows nothing while auth status is loading (prevents login-page flash)
 * - Preserves the originally requested URL in `state.from` for post-login redirect
 */

import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../core/providers/AuthContext';

export function ProtectedRoute() {
  const { status } = useAuth();
  const location = useLocation();

  // While the startup session check is in-flight, render nothing.
  // This prevents the brief flash of the login page for users who are
  // already authenticated via their refresh cookie.
  if (status === 'loading') {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-50 px-6">
        <div className="relative flex items-center justify-center w-16 h-16 mb-8">
          <div className="absolute inset-0 rounded-2xl bg-indigo-500 animate-ping opacity-20" style={{ animationDuration: '3s' }}></div>
          <div className="w-14 h-14 rounded-2xl bg-slate-900 shadow-[0_8px_30px_rgba(0,0,0,0.12)] flex items-center justify-center relative z-10">
            <svg className="w-6 h-6 text-white animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"></circle>
              <path className="opacity-100" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        </div>
        <h1 className="text-xl font-extrabold text-slate-900 tracking-tight mb-2">
          Starting Engine
        </h1>
        <p className="text-sm font-semibold text-slate-500 max-w-[280px] text-center leading-relaxed">
          Configuring your secure workspace and setting up analysis...
        </p>
        <p className="text-[11px] font-bold text-slate-400 mt-8 tracking-wider uppercase flex items-center gap-1.5 bg-slate-200/50 px-3 py-1.5 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          Waking server (up to 50s)
        </p>
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
