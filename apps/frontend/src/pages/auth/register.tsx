import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../core/providers/AuthContext';
import { ApiError } from '../../core/api/client';

const NUDGES = [
  "With Expencio, your personal income tracking is made simple",
  "Your data is protected with RLS-grade security",
  "Offline-first sync guarantees privacy and fast access"
];

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [nudgeIndex, setNudgeIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setNudgeIndex((prev) => (prev + 1) % NUDGES.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

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
            <div className="relative w-full">
              <input
                id="reg-password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={styles.input}
                placeholder="••••••••"
                disabled={loading}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors p-1 cursor-pointer"
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Interactive Terms & Privacy Acknowledgement Checkbox */}
          <div className="flex items-start gap-2.5 pt-1 select-none cursor-pointer">
            <input
              type="checkbox"
              id="reg-terms"
              checked={termsAgreed}
              onChange={(e) => setTermsAgreed(e.target.checked)}
              className="w-4 h-4 mt-0.5 rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer shrink-0"
            />
            <label htmlFor="reg-terms" className="text-[11px] text-slate-500 cursor-pointer leading-tight">
              I agree to Expencio's{" "}
              <Link to="/terms" target="_blank" className="text-slate-800 font-semibold underline hover:text-indigo-600 transition-colors">Terms of Service</Link> &{" "}
              <Link to="/privacy" target="_blank" className="text-slate-800 font-semibold underline hover:text-indigo-600 transition-colors">Privacy Policy</Link>.
            </label>
          </div>

          {error && (
            <p style={styles.errorText} role="alert">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !isValid || !termsAgreed}
            style={{
              ...styles.button,
              opacity: (loading || !isValid || !termsAgreed) ? 0.5 : 1,
              cursor: (loading || !isValid || !termsAgreed) ? 'not-allowed' : 'pointer',
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

        {/* Notion / Linear Passby App Nudge Banner */}
        <div style={{
          marginTop: '24px',
          padding: '14px 16px',
          background: 'linear-gradient(to right, rgba(240, 249, 255, 0.8), rgba(238, 242, 255, 0.8))',
          border: '1px solid #e0f2fe',
          borderRadius: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
        }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            border: '2px solid #ffffff',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            background: '#ffffff',
          }}>
            <img
              src="/logo.jpg"
              alt="Expencio"
              style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scale(1.35)' }}
            />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p
              key={nudgeIndex}
              className="animate-in fade-in slide-in-from-bottom-2 duration-300"
              style={{
                margin: 0,
                fontSize: '12.5px',
                fontWeight: '500',
                color: '#334155',
                lineHeight: '1.45',
                letterSpacing: '-0.01em',
              }}
            >
              "{NUDGES[nudgeIndex]}"
            </p>
          </div>
        </div>
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
