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
    return null;
  }

  if (status === 'unauthenticated') {
    // Preserve the originally requested path so we can redirect back after login
    return <Navigate to="/login" state={{ from: location }} replace />;
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
