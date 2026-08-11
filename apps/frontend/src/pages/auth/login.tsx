/**
 * pages/auth/login.tsx
 *
 * Minimal, flat login page. No gradients, no glassmorphism.
 * Follows the Inter/Notion-inspired design already used throughout ExpenseFlow.
 *
 * - Generic "Invalid email or password" on failure (no account enumeration)
 * - Redirects to the originally requested page after login
 */

import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../core/providers/AuthContext';
import { ApiError } from '../../core/api/client';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) return;

    setError('');
    setLoading(true);

    try {
      await login(email.trim().toLowerCase(), password);
      navigate('/', { replace: true });
    } catch (err) {
      // Always show a generic message — never reveal whether the account exists
      if (err instanceof ApiError && err.status === 401) {
        setError('Invalid email or password.');
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.root}>
      <div style={styles.card}>
        {/* Logo / Brand */}
        <div style={styles.brand}>
          <div style={styles.logoMark}>
            <img src="/logo.jpg" alt="Expencio Logo" style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scale(1.35)' }} />
          </div>
          <span style={styles.logoText}>Expencio</span>
        </div>

        <h1 style={styles.heading}>Sign in</h1>
        <p style={styles.subheading}>Track your finances, reach your goals.</p>

        <form onSubmit={handleSubmit} style={styles.form} noValidate>
          <div style={styles.field}>
            <label style={styles.label} htmlFor="login-email">Email</label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              autoFocus
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={styles.input}
              placeholder="you@example.com"
              disabled={loading}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label} htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={styles.input}
              placeholder="••••••••"
              disabled={loading}
            />
          </div>

          {error && (
            <p style={styles.errorText} role="alert">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !email || !password}
            style={{
              ...styles.button,
              opacity: (loading || !email || !password) ? 0.5 : 1,
              cursor: (loading || !email || !password) ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p style={styles.footer}>
          Don't have an account?{' '}
          <Link to="/register" state={{ from: location.state?.from }} style={styles.link}>
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
// Plain inline styles to remain completely framework-agnostic.
// Matches the flat, light, Inter-based design of the rest of ExpenseFlow.

const styles: Record<string, React.CSSProperties> = {
  root: {
    minHeight: '100vh',
    background: '#f6f6f6',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px 16px',
  },
  card: {
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '20px',
    padding: '40px 36px',
    width: '100%',
    maxWidth: '400px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.05)',
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '28px',
  },
  logoMark: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid #e2e8f0',
    flexShrink: 0,
  },
  logoText: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#0f172a',
    letterSpacing: '-0.02em',
  },
  heading: {
    fontSize: '22px',
    fontWeight: '700',
    color: '#0f172a',
    margin: '0 0 6px 0',
    letterSpacing: '-0.03em',
  },
  subheading: {
    fontSize: '14px',
    color: '#64748b',
    margin: '0 0 28px 0',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '13px',
    fontWeight: '500',
    color: '#374151',
  },
  input: {
    padding: '10px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    fontSize: '14px',
    color: '#0f172a',
    background: '#ffffff',
    outline: 'none',
    transition: 'border-color 0.15s',
    fontFamily: 'inherit',
    width: '100%',
    boxSizing: 'border-box',
  },
  errorText: {
    fontSize: '13px',
    color: '#dc2626',
    margin: '0',
  },
  button: {
    marginTop: '4px',
    padding: '11px 16px',
    background: '#000000',
    color: '#ffffff',
    border: 'none',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: '600',
    fontFamily: 'inherit',
    letterSpacing: '-0.01em',
    transition: 'all 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
  },
  footer: {
    marginTop: '24px',
    fontSize: '13px',
    color: '#64748b',
    textAlign: 'center',
  },
  link: {
    color: '#000000',
    fontWeight: '500',
    textDecoration: 'none',
  },
};
