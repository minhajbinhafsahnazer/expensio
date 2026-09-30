import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../core/providers/AuthContext';
import { ApiError } from '../../core/api/client';
import { CURRENCIES, CurrencyCode } from '../../constants/currencies';

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [currency, setCurrency] = useState<CurrencyCode>('USD');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
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
        currency
      );
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

  return (
    <div className="min-h-screen bg-[#080811] flex flex-col md:flex-row selection:bg-violet-900 selection:text-white font-sans overflow-hidden">
      
      {/* PC Responsive Left Side */}
      <div className="hidden md:flex md:w-1/2 relative flex-col justify-between p-12 lg:p-20 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-60 pointer-events-none">
          <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] bg-indigo-900/40 rounded-full mix-blend-screen filter blur-[120px] animate-pulse" style={{ animationDuration: '8s' }}></div>
          <div className="absolute top-[40%] right-[0%] w-[60%] h-[60%] bg-[#7C3AED]/30 rounded-full mix-blend-screen filter blur-[140px] animate-pulse" style={{ animationDuration: '12s', animationDelay: '2s' }}></div>
        </div>
        
        <div className={`relative z-10 flex items-center gap-3 transition-all duration-1000 transform ${mounted ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0'}`}>
          <div className="relative group">
            <div className="absolute -inset-1 bg-violet-600 rounded-full blur opacity-30 group-hover:opacity-60 transition duration-1000 group-hover:duration-200"></div>
            <div className="relative w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-lg overflow-hidden border border-white/10">
               <img src="/logo.jpg" alt="Wazn Logo" className="w-full h-full object-cover scale-[1.35]" />
            </div>
          </div>
          <span className="text-white font-bold tracking-wider text-2xl">Wazn</span>
        </div>
        
        <div className={`relative z-10 flex flex-col gap-6 mt-16 max-w-lg transition-all duration-1000 delay-300 transform ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
          <h1 className="text-5xl lg:text-7xl font-extrabold text-white leading-[1.1] tracking-tight">
            Create <br /> account.
          </h1>
          <div className="space-y-2 mt-2">
            <p className="text-white/90 text-xl font-medium tracking-wide">
              Start your journey today.
            </p>
            <p className="text-slate-400 text-lg">
              Join Wazn to measure, understand, and balance your finances.
            </p>
          </div>
          
        </div>

        <div className={`relative z-10 mt-auto pt-16 transition-all duration-1000 delay-500 opacity-100`}>
          <p className="text-slate-500 text-sm font-medium tracking-wide">
            Built for clarity, privacy & control.
          </p>
        </div>
      </div>

      {/* Right Side - Action Area */}
      <div className="w-full md:w-1/2 flex flex-col justify-center p-6 sm:p-12 min-h-screen md:min-h-0 relative overflow-y-auto bg-[#080811] md:bg-transparent border-l border-white/5">
        
        <div className="md:hidden absolute top-0 left-0 w-full h-full opacity-40 pointer-events-none">
           <div className="absolute -top-[10%] -right-[10%] w-[60%] h-[60%] bg-[#7C3AED]/30 rounded-full mix-blend-screen filter blur-[100px] animate-pulse"></div>
        </div>

        <div className={`relative z-10 w-full max-w-md mx-auto flex flex-col items-center py-10 transition-all duration-1000 delay-200 transform ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
          
          <div className="relative group md:hidden mb-8">
            <div className="absolute -inset-1 bg-violet-600 rounded-full blur opacity-40"></div>
            <div className="relative w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-xl overflow-hidden border border-white/10">
              <img src="/logo.jpg" alt="Wazn" className="w-full h-full object-cover scale-[1.35]" />
            </div>
          </div>

          <div className="text-center mb-8 w-full">
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-2">
              Create your account
            </h1>
            <p className="text-slate-400 text-sm font-medium">
              Join Wazn in seconds
            </p>
          </div>

          <div className="w-full bg-[#0d0d1a]/80 backdrop-blur-xl border border-white/10 rounded-[24px] p-8 shadow-2xl hover:border-white/20 transition-colors duration-500">
            
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-slate-300">Full Name <span className="text-slate-500 font-normal">(Optional)</span></label>
                <input
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  disabled={loading}
                  placeholder="John Doe"
                  className="w-full bg-white/5 border border-white/10 text-white placeholder-slate-600 rounded-xl px-4 py-3.5 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 transition-all"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-slate-300">Email address</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  disabled={loading}
                  required
                  placeholder="you@example.com"
                  className="w-full bg-white/5 border border-white/10 text-white placeholder-slate-600 rounded-xl px-4 py-3.5 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 transition-all"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-slate-300">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    disabled={loading}
                    required
                    placeholder="••••••••"
                    className="w-full bg-white/5 border border-white/10 text-white placeholder-slate-600 rounded-xl px-4 py-3.5 pr-12 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-slate-300">Base Currency</label>
                <select
                  value={currency}
                  onChange={e => setCurrency(e.target.value as CurrencyCode)}
                  disabled={loading}
                  className="w-full bg-[#11111a] border border-white/10 text-white rounded-xl px-4 py-3.5 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 transition-all appearance-none cursor-pointer"
                >
                  {CURRENCIES.map((def) => (
                    <option key={def.code} value={def.code}>{def.code} - {def.name}</option>
                  ))}
                </select>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !email || !password || password.length < 8}
                className="w-full mt-4 py-4 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-xl shadow-lg shadow-violet-900/30 transition-all flex items-center justify-center gap-2 border border-violet-500/50"
              >
                {loading ? 'Creating account...' : 'Create Account'}
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-white/5 flex flex-col items-center gap-3">
              <p className="text-slate-500 text-xs font-medium">Already have an account?</p>
              <Link
                to="/login"
                state={{ from: location.state?.from }}
                className="text-white text-sm font-semibold hover:text-violet-400 transition-colors cursor-pointer"
              >
                Sign In
              </Link>
            </div>
            
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 mt-12 text-[11px] text-slate-500 font-medium pb-8">
             <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-slate-700"></span> Private by design</span>
             <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-slate-700"></span> Secure by design</span>
          </div>

        </div>
      </div>
    </div>
  );
}



