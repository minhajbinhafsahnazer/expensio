import { useNavigate, Link } from "react-router-dom";
import { ChevronLeft, ShieldCheck, FileText } from "lucide-react";
import { AppShell, Container } from "@expenseflow/ui";

export default function TermsPage() {
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
            <Link to="/privacy" className="hover:text-slate-900 font-medium">Privacy Policy</Link>
          </div>
        </Container>
      </header>

      {/* Content */}
      <main className="flex-1 py-10 px-4">
        <Container size="sm">
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-10 shadow-xs flex flex-col gap-6">
            
            {/* Title & Badge */}
            <div className="flex flex-col gap-2 pb-4 border-b border-slate-100">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-[11px] font-semibold w-fit">
                <FileText size={13} />
                <span>Legal Agreement</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Terms of Service
              </h1>
              <p className="text-xs text-slate-400 font-medium">
                Last updated: August 12, 2026
              </p>
            </div>

            {/* Sections */}
            <div className="space-y-6 text-xs sm:text-sm text-slate-600 leading-relaxed">
              <section className="space-y-2">
                <h2 className="text-sm sm:text-base font-bold text-slate-900">1. Acceptance of Terms</h2>
                <p>
                  By creating an account or using Expencio ("the Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-sm sm:text-base font-bold text-slate-900">2. Description of Service</h2>
                <p>
                  Expencio provides personal finance tracking, category analysis, income/expense logging, and offline data synchronization. Expencio is a tool for personal record-keeping and does not provide formal tax, legal, or financial advice.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-sm sm:text-base font-bold text-slate-900">3. User Accounts & Security</h2>
                <p>
                  You are responsible for maintaining the confidentiality of your account credentials. All transactions and profile settings made under your account are your responsibility.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-sm sm:text-base font-bold text-slate-900">4. Privacy & Data Ownership</h2>
                <p>
                  Your financial data belongs exclusively to you. Expencio enforces multi-tenant row-level security (RLS) and zero-trust data isolation. We do not sell, rent, or monetize your personal transaction records to third parties.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-sm sm:text-base font-bold text-slate-900">5. Offline Sync & Availability</h2>
                <p>
                  Expencio utilizes an offline-first architecture to store local entries on your device before syncing to server storage. While we take maximum effort to ensure 99.9% availability, local cache backups are recommended.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-sm sm:text-base font-bold text-slate-900">6. Termination</h2>
                <p>
                  You may stop using the Service and request data deletion at any time via your account settings. Expencio reserves the right to suspend accounts that violate security boundaries or attempt malicious system access.
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
                <span>Verified Legal Terms</span>
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
