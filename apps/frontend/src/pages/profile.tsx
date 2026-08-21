import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, RefreshCw, Download, Palette, CheckCircle2, Database, AlertCircle, WifiOff, ChevronLeft, ChevronDown, Sliders, Globe, Layers, Landmark, Home, Info, X, ShieldAlert, Sparkles, User, Mail, Phone, Edit2 } from "lucide-react";
import { useAuth } from "../core/providers/AuthContext";
import { useSyncEngine } from "../core/sync/SyncEngine";
import { queue } from "../core/sync/db";
import { useQueryClient } from "@tanstack/react-query";
import { AppShell, Container, Stack, BottomNav, cn } from "@expenseflow/ui";
import { OnboardingTour } from "../components/OnboardingTour";
import { CURRENCIES, CurrencyCode } from "../constants/currencies";

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, logout, updateUser } = useAuth();
  const { pendingCount, syncStatus, isOnline, flush } = useSyncEngine();
  const queryClient = useQueryClient();
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [showSuperiorInfoModal, setShowSuperiorInfoModal] = useState(false);
  const [showSuperiorConfirmModal, setShowSuperiorConfirmModal] = useState(false);
  const [currencyToConfirm, setCurrencyToConfirm] = useState<CurrencyCode | null>(null);
  const [currencyConfirmText, setCurrencyConfirmText] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [isSubmittingToggle, setIsSubmittingToggle] = useState(false);
  const [multiCurrency, setMultiCurrency] = useState(() => {
    return localStorage.getItem("expencio_multi_currency") === "true";
  });
  const superiorCategory = user?.superiorCategoriesEnabled ?? (localStorage.getItem("expencio_superior_category") === "true");
  const [multiBankAccounts, setMultiBankAccounts] = useState(() => {
    return localStorage.getItem("expencio_multi_bank_accounts") === "true";
  });

  const [isEditDetailsOpen, setIsEditDetailsOpen] = useState(false);
  const [editFullName, setEditFullName] = useState("");
  const [editPhoneNumber, setEditPhoneNumber] = useState("");
  const [isSavingDetails, setIsSavingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);

  const handleOpenEditDetails = () => {
    setEditFullName(user?.fullName || "");
    setEditPhoneNumber(user?.phoneNumber || "");
    setDetailsError(null);
    setIsEditDetailsOpen(true);
  };

  const handleSaveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = editFullName.trim();
    if (!trimmedName) {
      setDetailsError("Full name is required");
      return;
    }

    const trimmedPhone = editPhoneNumber.trim();
    const phonePayload = trimmedPhone ? trimmedPhone : null;

    setIsSavingDetails(true);
    setDetailsError(null);

    try {
      await updateUser({
        fullName: trimmedName,
        phoneNumber: phonePayload,
      });
      showToast("Personal details updated successfully");
      setIsEditDetailsOpen(false);
    } catch (err: any) {
      console.error(err);
      setDetailsError(err?.message || "Failed to update details. Please try again.");
    } finally {
      setIsSavingDetails(false);
    }
  };

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

  const toggleSuperiorCategory = async () => {
    const next = !superiorCategory;
    localStorage.setItem("expencio_superior_category", String(next));
    try {
      await updateUser({ superiorCategoriesEnabled: next });
      showToast(next ? "Superior categories enabled" : "Superior categories disabled");
    } catch {
      showToast(next ? "Superior categories enabled locally" : "Superior categories disabled locally");
    }
  };

  const handleConfirmSuperiorToggle = async () => {
    if (confirmText.trim().toUpperCase() !== "CONFIRM") return;
    setIsSubmittingToggle(true);
    try {
      await toggleSuperiorCategory();
      setShowSuperiorConfirmModal(false);
      setConfirmText("");
    } finally {
      setIsSubmittingToggle(false);
    }
  };

  const toggleMultiBankAccounts = () => {
    const next = !multiBankAccounts;
    setMultiBankAccounts(next);
    localStorage.setItem("expencio_multi_bank_accounts", String(next));
    showToast(next ? "Multiple bank accounts enabled" : "Multiple bank accounts disabled");
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
      {/* Onboarding Tour Modal */}
      <OnboardingTour isOpen={isTourOpen} onClose={() => setIsTourOpen(false)} />

      <Container size="sm" className="pt-12 sm:pt-14">
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
            <div className="w-20 h-20 bg-slate-900 text-white rounded-full flex items-center justify-center text-3xl font-bold shadow-md mb-4 uppercase">
              {user?.fullName ? (user.fullName.split(' ').map(n => n[0]).join('').slice(0, 2)) : (user?.email ? (user.email.split('@')[0].charAt(0) + user.email.split('@')[0].slice(-1)).toUpperCase() : "MJ")}
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              {user?.fullName || (user?.email ? user.email.split("@")[0] : "User")}
            </h2>
            <p className="text-sm text-slate-500 font-medium">
              {user?.email || "minhaj@example.com"}
            </p>
          </div>

          {/* Sections */}
          <div className="flex flex-col gap-6 px-2">
            
            {/* PERSONAL INFORMATION */}
            <section className="flex flex-col gap-1">
              <div className="flex items-center justify-between px-2 mb-2">
                <h3 className="text-xs font-bold text-slate-400 tracking-widest uppercase">
                  Personal Information
                </h3>
                <button
                  type="button"
                  onClick={handleOpenEditDetails}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
                >
                  <Edit2 size={13} />
                  Edit Details
                </button>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col divide-y divide-slate-100">
                {/* Full Name */}
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3 text-slate-700 font-medium text-sm">
                    <User size={18} className="text-slate-400" />
                    Full Name
                  </div>
                  <span className={cn("text-sm font-semibold", user?.fullName ? "text-slate-900" : "text-slate-400 font-normal")}>
                    {user?.fullName || "Not added"}
                  </span>
                </div>

                {/* Email */}
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3 text-slate-700 font-medium text-sm">
                    <Mail size={18} className="text-slate-400" />
                    Email
                  </div>
                  <span className="text-sm font-semibold text-slate-900 truncate max-w-[200px] sm:max-w-none">
                    {user?.email || "Not added"}
                  </span>
                </div>

                {/* Phone Number */}
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3 text-slate-700 font-medium text-sm">
                    <Phone size={18} className="text-slate-400" />
                    Phone Number
                  </div>
                  <span className={cn("text-sm font-semibold", user?.phoneNumber ? "text-slate-900" : "text-slate-400 font-normal")}>
                    {user?.phoneNumber || "Not added"}
                  </span>
                </div>
              </div>
            </section>

            {/* PREFERENCES */}
            <section className="flex flex-col gap-1">
              <h3 className="text-xs font-bold text-slate-400 tracking-widest uppercase mb-2 px-2">
                Preferences & Help
              </h3>
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                <button
                  type="button"
                  onClick={() => setIsTourOpen(true)}
                  className="flex items-center justify-between p-4 border-b border-slate-100 hover:bg-slate-50 active:bg-slate-100 transition-colors text-left cursor-pointer"
                >
                  <div className="flex items-center gap-3 text-slate-700 font-medium">
                    <Sparkles size={18} className="text-indigo-500" />
                    Guided App Tour
                  </div>
                  <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
                    Replay Tour
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowCurrencyModal(true)}
                  className="w-full flex items-center justify-between p-4 border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3 text-slate-700 font-medium">
                    <span className="w-5 h-5 flex items-center justify-center text-slate-400">
                      {CURRENCIES.find(c => c.code === user?.currency)?.symbol || "₹"}
                    </span>
                    Currency
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-900 font-semibold text-sm">
                    {CURRENCIES.find(c => c.code === user?.currency)?.name || "Indian Rupee"}
                    <ChevronDown size={16} className="text-slate-400" />
                  </div>
                </button>
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
                          <div className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                            <span>Superior Categories</span>
                            <button
                              type="button"
                              onClick={() => setShowSuperiorInfoModal(true)}
                              className="text-slate-400 hover:text-indigo-600 transition-colors p-0.5 rounded-full hover:bg-indigo-50 cursor-pointer inline-flex items-center"
                              title="What are Superior Categories?"
                            >
                              <Info size={15} />
                            </button>
                          </div>
                          <div className="text-xs text-slate-500">Group detailed categories into high-level categories for cleaner spending insights.</div>
                          {superiorCategory && (
                            <div className="text-[11px] text-indigo-600 font-medium mt-1">
                              Superior categories will appear in the transaction form and be used for analytics.
                            </div>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setConfirmText("");
                          setShowSuperiorConfirmModal(true);
                        }}
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

                    {/* Option 3: Multiple Bank Accounts */}
                    <div className="flex items-center justify-between p-4 bg-white">
                      <div className="flex items-start gap-3">
                        <Landmark size={18} className="text-indigo-500 mt-0.5" />
                        <div>
                          <div className="text-sm font-semibold text-slate-800">Multiple Bank Accounts</div>
                          <div className="text-xs text-slate-500">Add or deduct money from multiple bank balances</div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={toggleMultiBankAccounts}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          multiBankAccounts ? 'bg-indigo-600' : 'bg-slate-200'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            multiBankAccounts ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Option 4: Force Resync */}
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

      {/* Superior Category Confirmation Modal */}
      {showSuperiorConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-2xl border border-slate-100 flex flex-col gap-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                  <ShieldAlert size={16} />
                </div>
                <span>{superiorCategory ? "Disable Superior Categories?" : "Enable Superior Categories?"}</span>
              </div>
              <button
                type="button"
                onClick={() => setShowSuperiorConfirmModal(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600">
              <p className="leading-relaxed">
                {superiorCategory
                  ? "Disabling this feature will hide high-level category rollups in your forms and use standard categories for analytics. Saved superior categories will remain intact."
                  : "Enabling this feature will add an optional high-level category field to your forms and group spending in your analytics breakdowns."}
              </p>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <label className="text-[11px] font-bold text-slate-700 block">
                  Type <span className="font-mono text-slate-900 uppercase bg-slate-200 px-1 py-0.5 rounded">CONFIRM</span> to proceed:
                </label>
                <input
                  type="text"
                  autoFocus
                  placeholder="CONFIRM"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && confirmText.trim().toUpperCase() === "CONFIRM") {
                      handleConfirmSuperiorToggle();
                    }
                  }}
                  className="w-full h-9 px-3 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold tracking-wider text-slate-900 uppercase focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowSuperiorConfirmModal(false)}
                className="flex-1 py-2.5 bg-slate-100 text-slate-700 font-semibold text-xs rounded-xl hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={confirmText.trim().toUpperCase() !== "CONFIRM" || isSubmittingToggle}
                onClick={handleConfirmSuperiorToggle}
                className="flex-1 py-2.5 bg-slate-900 text-white font-semibold text-xs rounded-xl hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isSubmittingToggle ? "Updating..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Currency Selection Modal */}
      {showCurrencyModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-0 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl sm:rounded-2xl p-5 max-w-sm w-full shadow-2xl flex flex-col gap-4 animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2 font-bold text-slate-900">
                <span className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-black">
                  ₹
                </span>
                <span>Select Base Currency</span>
              </div>
              <button
                type="button"
                onClick={() => setShowCurrencyModal(false)}
                className="p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer -mr-2"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex flex-col gap-1 max-h-[60vh] overflow-y-auto no-scrollbar pb-2">
              {CURRENCIES.map((c) => {
                const isSelected = user?.currency === c.code;
                return (
                  <button
                    key={c.code}
                    type="button"
                    onClick={async () => {
                      if (isSelected) return;
                      setShowCurrencyModal(false);
                      setCurrencyToConfirm(c.code as CurrencyCode);
                      setCurrencyConfirmText("");
                    }}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-xl transition-all cursor-pointer",
                      isSelected 
                        ? "bg-indigo-50 border border-indigo-100" 
                        : "hover:bg-slate-50 border border-transparent"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center shadow-sm border",
                        c.symbol.length > 2 ? "text-[11px] font-black tracking-tighter" : "text-lg font-bold",
                        isSelected 
                          ? "bg-indigo-600 text-white border-indigo-700" 
                          : "bg-white text-slate-700 border-slate-200"
                      )}>
                        {c.symbol}
                      </div>
                      <div className="flex flex-col items-start">
                        <span className={cn(
                          "font-bold text-sm",
                          isSelected ? "text-indigo-900" : "text-slate-700"
                        )}>
                          {c.code}
                        </span>
                        <span className={cn(
                          "text-xs font-medium",
                          isSelected ? "text-indigo-600" : "text-slate-500"
                        )}>
                          {c.name}
                        </span>
                      </div>
                    </div>
                    {isSelected && (
                      <CheckCircle2 size={20} className="text-indigo-600" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Currency Confirmation Modal */}
      {currencyToConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-2xl border border-slate-100 flex flex-col gap-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Globe size={16} />
                </div>
                <span>Confirm Currency Change</span>
              </div>
              <button
                type="button"
                onClick={() => setCurrencyToConfirm(null)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
              <p>
                Are you sure you want to change your base currency to <span className="font-bold text-slate-900">{currencyToConfirm}</span>? 
                This will only update how amounts are displayed. It will <span className="font-bold text-red-600">not</span> convert any historical transaction values.
              </p>
              
              <div className="mt-4">
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Type "confirm" to proceed
                </label>
                <input
                  type="text"
                  value={currencyConfirmText}
                  onChange={(e) => setCurrencyConfirmText(e.target.value)}
                  placeholder="confirm"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-2">
              <button
                type="button"
                onClick={() => setCurrencyToConfirm(null)}
                className="flex-1 py-2.5 bg-slate-100 text-slate-700 font-semibold text-xs rounded-xl hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={currencyConfirmText.trim().toLowerCase() !== "confirm" || isSubmittingToggle}
                onClick={async () => {
                  if (currencyConfirmText.trim().toLowerCase() !== "confirm") return;
                  setIsSubmittingToggle(true);
                  try {
                    await updateUser({ currency: currencyToConfirm });
                    showToast(`Currency updated to ${currencyToConfirm}`);
                    setCurrencyToConfirm(null);
                  } catch (err) {
                    showToast("Failed to update currency");
                  } finally {
                    setIsSubmittingToggle(false);
                  }
                }}
                className="flex-1 py-2.5 bg-indigo-600 text-white font-semibold text-xs rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isSubmittingToggle ? "Updating..." : "Change Currency"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Superior Category Info Modal */}
      {showSuperiorInfoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-2xl border border-slate-100 flex flex-col gap-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Layers size={16} />
                </div>
                <span>What are Superior Categories?</span>
              </div>
              <button
                type="button"
                onClick={() => setShowSuperiorInfoModal(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
              <p>
                Normally, specific entries like <span className="font-semibold text-slate-800">Burger</span>, <span className="font-semibold text-slate-800">Sandwitch</span>, or <span className="font-semibold text-slate-800">Pizza</span> appear as separate individual items in your breakdown charts.
              </p>

              <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl space-y-1.5">
                <div className="font-bold text-indigo-900 text-[11px] uppercase tracking-wider">With Superior Categories:</div>
                <p className="text-indigo-800">
                  You can group them into a single high-level category like <span className="font-bold">Food & Dining</span>.
                </p>
                <div className="text-[11px] text-indigo-700 font-medium">
                  📊 Result: Clean spending pie charts (e.g. <span className="font-bold">Food & Dining 50%</span>, <span className="font-bold">Transportation 20%</span>).
                </div>
              </div>

              <p className="text-[11px] text-slate-400">
                * Turning this feature OFF will not delete your saved superior categories.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowSuperiorInfoModal(false)}
              className="w-full py-2.5 bg-slate-900 text-white font-semibold text-xs rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Got it!
            </button>
          </div>
        </div>
      )}

      {/* EDIT USER DETAILS MODAL */}
      {isEditDetailsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Edit User Details</h3>
              <button
                type="button"
                onClick={() => !isSavingDetails && setIsEditDetailsOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveDetails} className="p-6 flex flex-col gap-4">
              {detailsError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-medium text-rose-600 flex items-center gap-2">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{detailsError}</span>
                </div>
              )}

              {/* Full Name Input */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
                />
              </div>

              {/* Email (Readonly) */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Email Address
                  </label>
                  <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                    Read-only
                  </span>
                </div>
                <input
                  type="email"
                  disabled
                  readOnly
                  value={user?.email || ""}
                  className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm font-medium text-slate-500 cursor-not-allowed select-none"
                />
              </div>

              {/* Phone Number Input */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Phone Number <span className="text-slate-400 font-normal lowercase">(optional)</span>
                </label>
                <input
                  type="tel"
                  value={editPhoneNumber}
                  onChange={(e) => setEditPhoneNumber(e.target.value)}
                  placeholder="e.g. +1 234 567 8900"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2 mt-2">
                <button
                  type="button"
                  disabled={isSavingDetails}
                  onClick={() => setIsEditDetailsOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 text-slate-700 font-semibold text-xs rounded-xl hover:bg-slate-200 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingDetails}
                  className="flex-1 py-2.5 bg-indigo-600 text-white font-semibold text-xs rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                >
                  {isSavingDetails ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-4 py-2 rounded-full shadow-lg text-sm font-medium animate-in slide-in-from-bottom-5">
          {toastMessage}
        </div>
      )}

      {/* Floating Bottom Nav (Home Only) */}
      <BottomNav
        activeTab="profile"
        variant="hero"
        items={[
          {
            id: "home",
            label: "Go Home",
            icon: <Home className="w-5 h-5 stroke-[2.5] text-slate-950" />,
          }
        ]}
        onTabChange={(tabId: string) => {
          if (tabId === "home") {
            navigate("/");
          }
        }}
      />
    </AppShell>
  );
}
