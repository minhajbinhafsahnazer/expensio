import { useNavigate, Link } from "react-router-dom";
import { ChevronLeft, ShieldCheck, Lock } from "lucide-react";
import { AppShell, Container } from "@expenseflow/ui";

export default function PrivacyPage() {
  const navigate = useNavigate();

  return (
    <AppShell className="bg-slate-50 min-h-screen selection:bg-slate-900 selection:text-white flex flex-col justify-between">
      {/* Header */}
      <header className="w-full border-b border-slate-200/80 bg-white/80 backdrop-blur-md sticky top-0 z-40">
        <Container size="md" className="py-3.5 flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors text-slate-600 cursor-pointer"
            >
              <ChevronLeft size={20} />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full overflow-hidden border border-slate-200 shadow-xs flex items-center justify-center bg-slate-950">
                <img src="/logo.jpg" alt="Expencio" className="w-full h-full object-cover scale-[1.35]" />
              </div>
              <span className="text-sm font-bold text-slate-900 tracking-tight">Expencio</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Link to="/terms" className="hover:text-slate-900 font-medium">Terms of Service</Link>
          </div>
        </Container>
      </header>

      {/* Content */}
      <main className="flex-1 py-10 px-4">
        <Container size="sm">
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-10 shadow-xs flex flex-col gap-6">
            
            {/* Title & Badge */}
            <div className="flex flex-col gap-2 pb-4 border-b border-slate-100">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-[11px] font-semibold w-fit">
                <Lock size={13} />
                <span>Zero-Trust Privacy</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Privacy Policy
              </h1>
              <p className="text-xs text-slate-400 font-medium">
                Last updated: August 12, 2026
              </p>
            </div>

            {/* Sections */}
            <div className="space-y-6 text-xs sm:text-sm text-slate-600 leading-relaxed">
              <section className="space-y-2">
                <h2 className="text-sm sm:text-base font-bold text-slate-900">1. Commitment to Privacy</h2>
                <p>
                  At Expencio, we believe your personal financial data is strictly private. This Privacy Policy outlines what minimal information we collect, how it is stored, and your control over your data.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-sm sm:text-base font-bold text-slate-900">2. Information We Collect</h2>
                <p>
                  We collect only the essential information required to operate your account:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-slate-600">
                  <li><strong>Account Info:</strong> Email address, hashed password, optional full name.</li>
                  <li><strong>Financial Logs:</strong> Expense amounts, categories, dates, and optional superior categories created by you.</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h2 className="text-sm sm:text-base font-bold text-slate-900">3. Row-Level Security (RLS) Isolation</h2>
                <p>
                  All database queries enforce strict tenant isolation (`user_id` filtering). Your financial records are isolated at the database engine level and cannot be queried by other users or unauthorized external processes.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-sm sm:text-base font-bold text-slate-900">4. No Data Selling or Monetization</h2>
                <p>
                  We never sell, analyze for advertising, share, or monetize your transaction data with third-party advertisers or data brokers.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-sm sm:text-base font-bold text-slate-900">5. Data Retention & Deletion</h2>
                <p>
                  You may delete your transactions or clear your local IndexedDB storage at any time. Account deletion removes all associated database records.
                </p>
              </section>
            </div>

            {/* Back button */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={() => navigate(-1)}
                className="px-4 py-2 bg-slate-900 text-white font-semibold text-xs rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Back to Sign Up
              </button>
              <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                <ShieldCheck size={16} />
                <span>Protected by RLS Security</span>
              </div>
            </div>

          </div>
        </Container>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-200/80 bg-white py-4 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} Expencio. All rights reserved.
      </footer>
    </AppShell>
  );
}
