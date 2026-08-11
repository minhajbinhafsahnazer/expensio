import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, RefreshCw, Download, Palette, CheckCircle2, Database, AlertCircle, WifiOff, ChevronLeft, Terminal, ChevronDown, Sliders, Globe, Layers } from "lucide-react";
import { useAuth } from "../core/providers/AuthContext";
import { useSyncEngine } from "../core/sync/SyncEngine";
import { queue } from "../core/sync/db";
import { useQueryClient } from "@tanstack/react-query";
import { AppShell, Container, Stack } from "@expenseflow/ui";

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { pendingCount, syncStatus, isOnline, flush } = useSyncEngine();
  const queryClient = useQueryClient();
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [multiCurrency, setMultiCurrency] = useState(() => {
    return localStorage.getItem("expencio_multi_currency") === "true";
  });
  const [superiorCategory, setSuperiorCategory] = useState(() => {
    return localStorage.getItem("expencio_superior_category") !== "false";
  });
  const [developerMode, setDeveloperMode] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const toggleMultiCurrency = () => {
    const next = !multiCurrency;
    setMultiCurrency(next);
    localStorage.setItem("expencio_multi_currency", String(next));
    showToast(next ? "Multi-currency mode enabled" : "Multi-currency mode disabled");
  };

  const toggleSuperiorCategory = () => {
    const next = !superiorCategory;
    setSuperiorCategory(next);
    localStorage.setItem("expencio_superior_category", String(next));
    showToast(next ? "Superior categorization enabled" : "Superior categorization disabled");
  };

  const handleManualSync = async () => {
    if (!isOnline) {
      showToast("Cannot sync while offline.");
      return;
    }
    try {
      setIsManualSyncing(true);
      await flush();
      showToast("Sync completed successfully.");
    } catch (e) {
      console.error(e);
      showToast("Manual sync failed.");
    } finally {
      setIsManualSyncing(false);
    }
  };

  const handleClearData = async () => {
    if (pendingCount > 0) {
      const confirmed = window.confirm(
        `Reset Local Data?\n\nYou have ${pendingCount} expense${pendingCount === 1 ? '' : 's'} that haven't synced yet. ` +
        `Clearing local data will permanently discard these from this device.\n\n` +
        `Your synced expenses in your account are not affected.\n\nPress OK to discard unsynced expenses and reset.`
      );
      if (!confirmed) return;
    } else {
      const confirmed = window.confirm(
        "Reset Local Data?\n\nThis will clear locally cached data from this device. Your synced expenses will remain in your account."
      );
      if (!confirmed) return;
    }

    try {
      // Clear only this user's queue entries — never touch other users' data.
      if (user?.id) {
        await queue.clearForUser(user.id);
      }

      // Clear React Query cache so stale data isn't shown.
      queryClient.clear();

      showToast("Local data cleared successfully.");

      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    } catch (e) {
      console.error(e);
      showToast("Failed to clear local data.");
    }
  };

  const handleSignOut = async () => {
    if (pendingCount > 0) {
      const confirmed = window.confirm(
        `Sign out of Expencio?\n\n` +
        `You have ${pendingCount} expense${pendingCount === 1 ? '' : 's'} that haven't synced yet.\n\n` +
        `They're saved on this device and will sync automatically the next time you sign in.\n\n` +
        `Sign out anyway?`
      );
      if (!confirmed) return;
    } else {
      const confirmed = window.confirm("Sign out of Expencio?");
      if (!confirmed) return;
    }
    await logout();
  };

  const renderSyncStatus = () => {
    if (!isOnline) {
      return (
        <span className="flex items-center gap-1.5 text-amber-600">
          <WifiOff size={14} />
          Offline
        </span>
      );
    }
    if (syncStatus === "syncing") {
      return (
        <span className="flex items-center gap-1.5 text-sky-600">
          <RefreshCw size={14} className="animate-spin" />
          Syncing…
        </span>
      );
    }
    if (syncStatus === "error") {
      return (
        <span className="flex items-center gap-1.5 text-rose-600">
          <AlertCircle size={14} />
          Sync failed
        </span>
      );
    }
    if (pendingCount > 0) {
      return (
        <span className="flex items-center gap-1.5 text-amber-600">
          <Database size={14} />
          {pendingCount} pending
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1.5 text-emerald-600">
        <CheckCircle2 size={14} />
        Synced
      </span>
    );
  };

  return (
    <AppShell className="bg-slate-50 min-h-screen pb-28 selection:bg-slate-900 selection:text-white">
      <Container size="sm" className="pt-2 sm:pt-4">
        <Stack gap={6}>
          {/* Header */}
          <div className="flex items-center gap-2 px-2 pb-6">
            <button
              onClick={() => navigate("/")}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 transition-colors -ml-2 text-slate-600"
            >
              <ChevronLeft size={20} />
            </button>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Profile</h1>
          </div>

          {/* Profile Hero */}
          <div className="flex flex-col items-center justify-center pt-2 pb-8">
            <div className="w-20 h-20 bg-slate-900 text-white rounded-full flex items-center justify-center text-3xl font-bold shadow-md mb-4">
              {user?.email ? (user.email.split('@')[0].charAt(0) + user.email.split('@')[0].slice(-1)).toUpperCase() : "MJ"}
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              {user?.email ? user.email.split("@")[0] : "Minhaj"}
            </h2>
            <p className="text-sm text-slate-500 font-medium">
              {user?.email || "minhaj@example.com"}
            </p>
          </div>

          {/* Sections */}
          <div className="flex flex-col gap-6 px-2">
            
            {/* PREFERENCES */}
            <section className="flex flex-col gap-1">
              <h3 className="text-xs font-bold text-slate-400 tracking-widest uppercase mb-2 px-2">
                Preferences
              </h3>
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                <div className="flex items-center justify-between p-4 border-b border-slate-100">
                  <div className="flex items-center gap-3 text-slate-700 font-medium">
                    <span className="w-5 h-5 flex items-center justify-center text-slate-400">
                      ₹
                    </span>
                    Currency
                  </div>
                  <span className="text-sm font-semibold text-slate-900">
                    ₹ INR
                  </span>
                </div>
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3 text-slate-700 font-medium">
                    <Palette size={18} className="text-slate-400" />
                    Appearance
                  </div>
                  <span className="text-sm font-semibold text-slate-900">
                    System
                  </span>
                </div>
              </div>
            </section>

            {/* DATA */}
            <section className="flex flex-col gap-1">
              <h3 className="text-xs font-bold text-slate-400 tracking-widest uppercase mb-2 px-2">
                Data
              </h3>
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                <button
                  onClick={() => showToast("Export data feature coming soon")}
                  className="flex items-center justify-between p-4 border-b border-slate-100 hover:bg-slate-50 active:bg-slate-100 transition-colors text-left"
                >
                  <div className="flex items-center gap-3 text-slate-700 font-medium">
                    <Download size={18} className="text-slate-400" />
                    Export Data
                  </div>
                  <span className="text-slate-400">
                    <ChevronLeft size={16} className="rotate-180" />
                  </span>
                </button>
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3 text-slate-700 font-medium">
                    <RefreshCw size={18} className="text-slate-400" />
                    Sync Status
                  </div>
                  <span className="text-sm font-semibold">
                    {renderSyncStatus()}
                  </span>
                </div>
              </div>
            </section>

            {/* ACCOUNT */}
            <section className="flex flex-col gap-1">
              <h3 className="text-xs font-bold text-slate-400 tracking-widest uppercase mb-2 px-2">
                Account
              </h3>
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                <button
                  onClick={handleSignOut}
                  className="flex items-center justify-between p-4 hover:bg-slate-50 active:bg-slate-100 transition-colors text-left"
                >
                  <div className="flex items-center gap-3 text-rose-600 font-medium">
                    <LogOut size={18} className="text-rose-500" />
                    Sign Out
                  </div>
                </button>
              </div>
            </section>

            {/* ADVANCED SECTION */}
            <section className="flex flex-col gap-1 mt-2">
              <h3 className="text-xs font-bold text-slate-400 tracking-widest uppercase mb-2 px-2">
                Advanced
              </h3>
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col transition-all">
                {/* Main Accordion Trigger */}
                <button
                  onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
                  className="flex items-center justify-between p-4 hover:bg-slate-50 active:bg-slate-100 transition-colors text-left"
                >
                  <div className="flex items-center gap-3 text-slate-700 font-medium">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                      <Sliders size={18} />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-900">Advanced Settings & Tools</div>
                      <div className="text-xs text-slate-500">Multi-currency, superior categories, sync & debug</div>
                    </div>
                  </div>
                  <ChevronDown
                    size={18}
                    className={`text-slate-400 transition-transform duration-200 ${isAdvancedOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {/* Expanded Drill-Down Options */}
                {isAdvancedOpen && (
                  <div className="flex flex-col divide-y divide-slate-100 border-t border-slate-100 bg-slate-50/50 animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* Option 1: Multi Currency */}
                    <div className="flex items-center justify-between p-4 bg-white">
                      <div className="flex items-start gap-3">
                        <Globe size={18} className="text-indigo-500 mt-0.5" />
                        <div>
                          <div className="text-sm font-semibold text-slate-800">Multi Currency</div>
                          <div className="text-xs text-slate-500">Support dynamic FX rates & multi-currency transactions</div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={toggleMultiCurrency}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          multiCurrency ? 'bg-indigo-600' : 'bg-slate-200'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            multiCurrency ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Option 2: Superior Category */}
                    <div className="flex items-center justify-between p-4 bg-white">
                      <div className="flex items-start gap-3">
                        <Layers size={18} className="text-indigo-500 mt-0.5" />
                        <div>
                          <div className="text-sm font-semibold text-slate-800">Superior Categorization</div>
                          <div className="text-xs text-slate-500">Enable smart sub-categories & automated tags</div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={toggleSuperiorCategory}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          superiorCategory ? 'bg-indigo-600' : 'bg-slate-200'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            superiorCategory ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Option 3: Force Resync */}
                    <div className="flex items-center justify-between p-4 bg-white">
                      <div className="flex items-start gap-3">
                        <RefreshCw size={18} className={`text-slate-500 mt-0.5 ${isManualSyncing ? "animate-spin" : ""}`} />
                        <div>
                          <div className="text-sm font-semibold text-slate-800">Force Resync Now</div>
                          <div className="text-xs text-slate-500">Trigger immediate sync of pending transactions</div>
                        </div>
                      </div>
                      <button
                        onClick={handleManualSync}
                        disabled={isManualSyncing || !isOnline}
                        className="px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-100 transition-colors disabled:opacity-50"
                      >
                        {isManualSyncing ? "Syncing..." : "Sync"}
                      </button>
                    </div>

                    {/* Option 4: System Diagnostics Toggle */}
                    <div className="flex flex-col bg-white">
                      <div className="flex items-center justify-between p-4">
                        <div className="flex items-start gap-3">
                          <Terminal size={18} className="text-slate-500 mt-0.5" />
                          <div>
                            <div className="text-sm font-semibold text-slate-800">System Diagnostics</div>
                            <div className="text-xs text-slate-500">Show engine, outbox queue, and telemetry data</div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setDeveloperMode(!developerMode)}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            developerMode ? 'bg-slate-900' : 'bg-slate-200'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              developerMode ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>

                      {/* Developer Mode Diagnostics Panel */}
                      {developerMode && (
                        <div className="p-4 bg-slate-900 text-slate-200 text-xs font-mono space-y-2 border-t border-slate-800 animate-in fade-in duration-200">
                          <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                            <span className="text-slate-400">Environment</span>
                            <span className="text-emerald-400 font-bold">Production (Monorepo)</span>
                          </div>
                          <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                            <span className="text-slate-400">Sync Engine Status</span>
                            <span className="text-sky-400 font-semibold uppercase">{syncStatus}</span>
                          </div>
                          <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                            <span className="text-slate-400">Pending Outbox Queue</span>
                            <span className="text-amber-400 font-semibold">{pendingCount} item(s)</span>
                          </div>
                          <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                            <span className="text-slate-400">Network Connection</span>
                            <span className={isOnline ? "text-emerald-400" : "text-rose-400"}>
                              {isOnline ? "Online" : "Offline"}
                            </span>
                          </div>
                          <div className="flex justify-between items-center pt-1">
                            <span className="text-slate-400">Client Engine Version</span>
                            <span className="text-slate-400">v1.0.0</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Option 5: Reset Local Data */}
                    <div className="flex items-center justify-between p-4 bg-white">
                      <div className="flex items-start gap-3">
                        <AlertCircle size={18} className="text-rose-500 mt-0.5" />
                        <div>
                          <div className="text-sm font-semibold text-rose-600">Reset Local Data</div>
                          <div className="text-xs text-rose-400">Clear cached data and unsynced outbox queue</div>
                        </div>
                      </div>
                      <button
                        onClick={handleClearData}
                        className="px-3 py-1.5 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-100 transition-colors"
                      >
                        Reset
                      </button>
                    </div>

                  </div>
                )}
              </div>
            </section>

          </div>
        </Stack>
      </Container>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-4 py-2 rounded-full shadow-lg text-sm font-medium animate-in fade-in slide-in-from-top-4">
          {toastMessage}
        </div>
      )}
    </AppShell>
  );
}
