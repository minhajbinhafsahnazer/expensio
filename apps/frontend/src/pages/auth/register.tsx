/**
 * pages/auth/register.tsx
 *
 * Minimal, flat registration page.
 * On success: automatically authenticates and redirects to intended destination.
 */

import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../core/providers/AuthContext';
import { ApiError } from '../../core/api/client';

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) return;

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      await register(
        email.trim().toLowerCase(),
        password,
        fullName.trim() || undefined,
      );
      // Automatically authenticated — redirect to intended destination
      navigate('/', { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError('An account with this email already exists.');
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  const isValid = email.trim().length > 0 && password.length >= 8;

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

        <h1 style={styles.heading}>Create account</h1>
        <p style={styles.subheading}>Start tracking your finances today.</p>

        <form onSubmit={handleSubmit} style={styles.form} noValidate>
          <div style={styles.field}>
            <label style={styles.label} htmlFor="reg-name">Full name</label>
            <input
              id="reg-name"
              type="text"
              autoComplete="name"
              autoFocus
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              style={styles.input}
              placeholder="Jane Doe"
              disabled={loading}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label} htmlFor="reg-email">Email</label>
            <input
              id="reg-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={styles.input}
              placeholder="you@example.com"
              disabled={loading}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label} htmlFor="reg-password">
              Password
              <span style={styles.hint}> (min. 8 characters)</span>
            </label>
            <input
              id="reg-password"
              type="password"
              autoComplete="new-password"
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
            disabled={loading || !isValid}
            style={{
              ...styles.button,
              opacity: (loading || !isValid) ? 0.5 : 1,
              cursor: (loading || !isValid) ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p style={styles.footer}>
          Already have an account?{' '}
          <Link to="/login" state={{ from: location.state?.from }} style={styles.link}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

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
  hint: {
    fontWeight: '400',
    color: '#94a3b8',
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
