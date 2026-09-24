import React, { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../core/providers/AuthContext";
import { CURRENCIES } from "../constants/currencies";
import { formatCurrency } from "../utils/currency";
import { useToast } from "../core/providers/ToastProvider";

import {
  AppShell,
  Container,
  Stack,
  BottomNav,
  GoalCardSkeleton,
  DebtCardSkeleton,
  cn,
} from "@wazn/ui";
import { 
  useFinancialGoals, 
  useCreateGoal, 
  useUpdateGoal, 
  useDeleteGoal, 
  useAddGoalProgress 
} from "../features/financial-goals/hooks/useFinancialGoals";
import { type FinancialGoal } from "../features/financial-goals/api/financial-goals.api";
import { useQueryClient } from "@tanstack/react-query";
import { 
  useDebts, 
  useCreateDebt, 
  useUpdateDebt, 
  useDeleteDebt,
  type DebtItem
} from "../features/debts/hooks/useDebts";
import { useSyncEngine } from "../core/sync/SyncEngine";
import { ulid } from "ulid";
import {
  ArrowLeft,
  ArrowDownLeft,
  ArrowUpRight,
  Pencil,
  Trash2,
  Bell,
  BellRing,
  Plus,
  Minus,
  ArrowUpDown,
  CheckCircle2,
  Calendar,
  X,
  MoreVertical,
  Home,
  Settings,
  User,
  ShieldCheck,
  Download,
} from "lucide-react";
import { SectionInfoModal } from "../components/SectionInfoModal";







const formatCompactAmount = (amount: number | string | undefined | null) => {
  const num = Number(amount || 0);
  if (Math.abs(num) < 10000) {
    return Math.round(num).toLocaleString("en-IN");
  }
  return Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(num);
};

export const PortfolioPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const userCurrency = user?.currency || "INR";
  const userCurrencySymbol = CURRENCIES.find(c => c.code === userCurrency)?.symbol || "₹";

  // Settings modal state & pill navigation state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [enableNotifications, setEnableNotifications] = useState(true);

  // Toast Notification state

  const [goalToConfirmDelete, setGoalToConfirmDelete] = useState<{ id: string; title: string } | null>(null);
  const [goalDeleteConfirmText, setGoalDeleteConfirmText] = useState("");

  const { showToast } = useToast();

  const pillNavItems = [
    {
      id: "settings",
      label: "Settings",
      icon: <Settings className="w-4 h-4 text-slate-300 stroke-[1.75]" />,
    },
    {
      id: "home",
      label: "Go Home",
      icon: <Home className="w-5 h-5 stroke-[2.5] text-slate-950" />,
    },
    {
      id: "profile",
      label: "Profile",
      icon: <User className="w-4 h-4 text-slate-300 stroke-[1.75]" />,
    },
  ];

  // Helper for formatting target dates
  const formatGoalDate = (dateStr?: string) => {
    if (!dateStr) return null;
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    } catch {
      return dateStr;
    }
  };

  // Helper for Natural Language Due Dates (Rule #5)
  const formatNaturalDueDate = (dateStr: string) => {
    if (!dateStr) return "";
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const due = new Date(dateStr);
    due.setHours(0, 0, 0, 0);

    const diffTime = due.getTime() - now.getTime();
    const diffDays = Math.round(diffTime / (1000 * 3600 * 24));

    if (diffDays === 0) return "Due Today";
    if (diffDays === 1) return "Due Tomorrow";
    if (diffDays === -1) return "Overdue by 1 day";
    if (diffDays < -1) return `Overdue by ${Math.abs(diffDays)} days`;
    if (diffDays <= 7) return `Due in ${diffDays} days`;

    return `Due ${due.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
  };

  // --- 1. Multiple Goals State ---
  const { data: serverGoals = [], isLoading: isLoadingGoals } = useFinancialGoals();
  const createGoalMutation = useCreateGoal();
  const updateGoalMutation = useUpdateGoal();
  const deleteGoalMutation = useDeleteGoal();
  const addProgressMutation = useAddGoalProgress();

  // Sort goals by displayOrder, then fallback to createdAt
  const goals = React.useMemo(() => {
    return [...serverGoals].sort((a, b) => a.displayOrder - b.displayOrder || new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [serverGoals]);

  const [isGoalModalOpen, setIsGoalModalOpen] = useState<boolean>(false);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [goalFormTitle, setGoalFormTitle] = useState<string>("");
  const [goalFormTarget, setGoalFormTarget] = useState<string>("");
  const [goalFormCurrent, setGoalFormCurrent] = useState<string>("");
  const [goalFormPriority, setGoalFormPriority] = useState<'low'|'medium'|'high'>("medium");
  const [goalFormColor, setGoalFormColor] = useState<string>("blue");
  const [goalFormTargetDate, setGoalFormTargetDate] = useState<string>("");

  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [depositGoalId, setDepositGoalId] = useState<string | null>(null);
  const [depositGoalTitle, setDepositGoalTitle] = useState("");
  const [depositAmount, setDepositAmount] = useState("");
  const [depositMode, setDepositMode] = useState<"add" | "deduct">("add");
  const [addToTransactions, setAddToTransactions] = useState(false);

  const { enqueue, isOnline } = useSyncEngine();
  const queryClient = useQueryClient();

  // Computed Goals Summary
  const totalSavedAcrossGoals = goals.reduce((acc, g) => acc + parseFloat(g.currentAmount), 0);
  const totalTargetAcrossGoals = goals.reduce((acc, g) => acc + parseFloat(g.targetAmount), 0);
  const overallGoalProgressPct = totalTargetAcrossGoals > 0 ? Math.min(100, (totalSavedAcrossGoals / totalTargetAcrossGoals) * 100) : 0;

  const handleOpenNewGoal = () => {
    setEditingGoalId(null);
    setGoalFormTitle("");
    setGoalFormTarget("");
    setGoalFormCurrent("");
    setGoalFormPriority("medium");
    setGoalFormColor("blue");
    setGoalFormTargetDate("");
    setIsGoalModalOpen(true);
  };

  const handleOpenEditGoal = (g: FinancialGoal) => {
    if (!isOnline) {
      showToast('Internet connection required. Goal changes cannot be made offline.');
      return;
    }
    setEditingGoalId(g.id);
    setGoalFormTitle(g.title);
    setGoalFormTarget(g.targetAmount.toString());
    setGoalFormCurrent(g.currentAmount.toString());
    setGoalFormPriority(g.priority || "medium");
    setGoalFormColor(g.color || "blue");
    setGoalFormTargetDate(g.targetDate || "");
    setIsGoalModalOpen(true);
  };

  const handleDeleteGoal = (id: string, title: string) => {
    if (!isOnline) {
      showToast('Internet connection required. Goal changes cannot be made offline.');
      return;
    }
    setGoalToConfirmDelete({ id, title });
    setGoalDeleteConfirmText("");
  };

  const handleSaveGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOnline) {
      showToast('Internet connection required. Goal changes cannot be made offline.');
      return;
    }
    if (!goalFormTitle.trim() || !goalFormTarget || Number(goalFormTarget) <= 0) return;

    if (editingGoalId) {
      updateGoalMutation.mutate({
        id: editingGoalId,
        data: {
          title: goalFormTitle.trim(),
          targetAmount: Number(goalFormTarget),
          priority: goalFormPriority,
          color: goalFormColor,
          targetDate: goalFormTargetDate ? new Date(goalFormTargetDate).toISOString() : undefined,
        }
      }, {
        onError: () => showToast(`Failed to update "${goalFormTitle.trim()}". Changes rolled back.`)
      });
      showToast(`Updated goal "${goalFormTitle.trim()}"`);
    } else {
      createGoalMutation.mutate({
        title: goalFormTitle.trim(),
        targetAmount: Number(goalFormTarget),
        currentAmount: Number(goalFormCurrent) || 0,
        priority: goalFormPriority,
        color: goalFormColor,
        targetDate: goalFormTargetDate ? new Date(goalFormTargetDate).toISOString() : undefined,
      }, {
        onError: () => showToast(`Failed to create "${goalFormTitle.trim()}". Changes rolled back.`)
      });
      showToast(`Created new goal "${goalFormTitle.trim()}"!`);
    }

    setIsGoalModalOpen(false);
  };

  const handleOpenDeposit = (id: string, title: string) => {
    if (!isOnline) {
      showToast('Internet connection required. Goal changes cannot be made offline.');
      return;
    }
    setDepositGoalId(id);
    setDepositGoalTitle(title);
    setDepositAmount("");
    setDepositMode("add");
    setAddToTransactions(false);
    setIsDepositModalOpen(true);
  };

  const handleConfirmDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!depositGoalId) return;
    const numAmt = Number(depositAmount);
    if (isNaN(numAmt) || numAmt <= 0) return;

    // Guard: re-check online status at submission time
    if (!isOnline) {
      showToast('Internet connection required. Goal changes cannot be made offline.');
      setIsDepositModalOpen(false);
      return;
    }

    const deltaAmount = depositMode === "deduct" ? -numAmt : numAmt;

    // --- Goal progress API call ---
    addProgressMutation.mutate({ id: depositGoalId, data: { amount: deltaAmount } }, {
      onError: () => showToast(`Couldn't update goal. Please check your connection and try again.`)
    });

    // --- Transaction creation (only for deduct mode) ---
    if (depositMode === "deduct") {
      const cid = ulid();
      const spentAtIso = new Date().toISOString();
      
      if (addToTransactions) {
        // addToBalance = TRUE:
        //   Goal decreases by X.
        //   Available balance increases by X  (Income +X).
        //   User is withdrawing goal savings back to their wallet.
        const txCategory = `Goal Withdrawal: ${depositGoalTitle}`;
        
        queryClient.setQueryData(["transactions"], (old: any) => {
          const optimisticTx = {
            id: cid,
            description: txCategory,
            category: txCategory,
            amount: numAmt.toString(),
            spentAt: spentAtIso,
            type: "income",
            status: "pending"
          };
          return [optimisticTx, ...(old || [])];
        });

        await enqueue({
          action: "CREATE",
          clientGeneratedId: cid,
          amount: numAmt,
          currency: "INR",
          description: txCategory,
          category: txCategory,
          spentAt: spentAtIso,
          type: "income",
        });

        showToast(`Deducted ${formatCurrency(numAmt, userCurrency)} — added to your balance.`);
      } else {
        // addToBalance = FALSE (default):
        //   Goal decreases by X.
        //   Available balance does NOT increase — money is spent, not recovered.
        //   Record as Expense -X so spending history reflects the outflow.
        const txCategory = `Goal Expense: ${depositGoalTitle}`;

        queryClient.setQueryData(["transactions"], (old: any) => {
          const optimisticTx = {
            id: cid,
            description: txCategory,
            category: txCategory,
            amount: numAmt.toString(),
            spentAt: spentAtIso,
            type: "expense",
            status: "pending"
          };
          return [optimisticTx, ...(old || [])];
        });

        await enqueue({
          action: "CREATE",
          clientGeneratedId: cid,
          amount: numAmt,
          currency: "INR",
          description: txCategory,
          category: txCategory,
          spentAt: spentAtIso,
          type: "expense",
        });

        showToast(`Deducted ${formatCurrency(numAmt, userCurrency)} — recorded as an expense.`);
      }
    } else {
      showToast(`Added ${formatCurrency(numAmt, userCurrency)} to "${depositGoalTitle}"!`);
    }

    setIsDepositModalOpen(false);
  };

  // Analytics moved to dedicated /analytics page

  // --- 3. Debt Tracker State ---
  const { data, error, isLoading: isLoadingDebts } = useDebts();
  
  if (error) {
    console.error("[Portfolio] Error loading debt records:", error);
  }
  
  const debts = (data || []) as DebtItem[];
  const createDebtMutation = useCreateDebt();
  const updateDebtMutation = useUpdateDebt();
  const deleteDebtMutation = useDeleteDebt();

  const [debtFilter, setDebtFilter] = useState<"all" | "lent" | "borrowed">("all");
  const [isAddDebtOpen, setIsAddDebtOpen] = useState<boolean>(false);
  const [activeDebtMenuId, setActiveDebtMenuId] = useState<string | null>(null);

  // New Debt Form State
  const [newDebtName, setNewDebtName] = useState<string>("");
  const [newDebtAmount, setNewDebtAmount] = useState<string>("");
  const [newDebtType, setNewDebtType] = useState<"lent" | "borrowed">("lent");
  const [newDebtDueDate, setNewDebtDueDate] = useState<string>(
    new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0]
  );
  const [newDebtNote, setNewDebtNote] = useState<string>("");
  const [newDebtEnableReminder, setNewDebtEnableReminder] = useState<boolean>(true);

  // Computed Debt Totals
  const totalLent = debts
    .filter((d) => d.type === "lent" && !d.isSettled)
    .reduce((acc, d) => acc + Number(d.amount), 0);

  const totalBorrowed = debts
    .filter((d) => d.type === "borrowed" && !d.isSettled)
    .reduce((acc, d) => acc + Number(d.amount), 0);

  const netDebtPosition = totalLent - totalBorrowed;

  const filteredDebts = debts.filter((d) => {
    if (debtFilter === "lent") return d.type === "lent";
    if (debtFilter === "borrowed") return d.type === "borrowed";
    return true;
  });

  const toggleReminder = (id: string) => {
    const d = debts.find((d) => d.id === id);
    if (!d) return;
    const nextState = !d.hasReminder;
    updateDebtMutation.mutate({ id, hasReminder: nextState });
    if (nextState) {
      showToast(`🔔 Reminder set for ${d.name} (${d.type === "lent" ? "Collect" : "Pay"} ${formatCurrency(Number(d.amount), userCurrency)})`);
    } else {
      showToast(`Notifications turned off for ${d.name}`);
    }
  };

  const toggleSettled = (id: string) => {
    const d = debts.find((d) => d.id === id);
    if (!d) return;
    const nextState = !d.isSettled;
    updateDebtMutation.mutate({ id, isSettled: nextState });
    showToast(nextState ? `Marked debt with ${d.name} as Settled!` : `Reopened debt with ${d.name}`);
  };

  const handleAddDebt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDebtName.trim() || !newDebtAmount || Number(newDebtAmount) <= 0) return;

    createDebtMutation.mutate({
      name: newDebtName.trim(),
      amount: Number(newDebtAmount),
      type: newDebtType,
      dueDate: newDebtDueDate ? new Date(newDebtDueDate).toISOString() : null,
      note: newDebtNote.trim() || null,
      isSettled: false,
      hasReminder: newDebtEnableReminder,
    });

    setIsAddDebtOpen(false);

    // Reset Form
    setNewDebtName("");
    setNewDebtAmount("");
    setNewDebtNote("");
    setNewDebtType("lent");

    showToast(`Added ${newDebtType === "lent" ? "Lent" : "Borrowed"} record for ${newDebtName}`);
  };

  return (
    <AppShell className="min-h-screen pb-32 bg-white text-slate-900 selection:bg-slate-900 selection:text-white">


      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-slate-200/80 pt-8 sm:pt-10">
        <Container size="md" className="h-16 flex items-center justify-between px-4">
          <button
            type="button"
            onClick={() => navigate("/")}
            aria-label="Go Back"
            className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200/80 hover:bg-slate-200/70 flex items-center justify-center text-slate-700 transition-colors cursor-pointer"
          >
            <ArrowLeft size={16} />
          </button>
          
          <div className="flex items-center gap-2">
            <span className="font-bold text-base text-slate-900 tracking-tight">
              Portfolio & Goals
            </span>
          </div>

          <div className="w-9 h-9 rounded-xl border border-slate-200/80 flex items-center justify-center overflow-hidden shrink-0">
            <img src="/logo.jpg" alt="Wazn Logo" className="w-full h-full object-cover scale-[1.35]" />
          </div>
        </Container>
      </header>

      {/* Main Content */}
      <Container size="md" className="pt-4 px-4">
        <Stack gap={6}>
          
          {/* ==================== 1. FINANCIAL GOALS (Refined Premium Dark Design) ==================== */}
          <section className="relative bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 border border-slate-800/80 rounded-3xl p-5 sm:p-6 flex flex-col gap-6 shadow-2xl overflow-hidden">
            {/* Ambient glow effects */}
            <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none z-0">
              <div className="absolute top-0 right-0 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-56 h-56 bg-rose-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3 pointer-events-none" />
            </div>

            {/* Top Summary Header Area */}
            <div className="flex flex-col gap-3 pb-5 border-b border-slate-800/80 relative z-30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold text-white tracking-tight">
                    Financial Goals
                  </h3>
                  <SectionInfoModal
                    content={{
                      title: "Savings Goals & Milestones",
                      subtitle: "Target-driven financial discipline",
                      badge: "Goals",
                      description: "Set target savings limits (e.g. Emergency Fund, Vacation) and log deposit progress in real time.",
                    }}
                    theme="dark"
                    tourStepId="portfolio-goals"
                    align="left"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleOpenNewGoal}
                  className="px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/15 border border-white/10 text-white text-xs font-semibold transition-all duration-150 active:scale-[0.98] cursor-pointer flex items-center gap-1.5 backdrop-blur-md shadow-xs"
                >
                  <Plus size={14} className="text-slate-300" />
                  <span>Add Goal</span>
                </button>
              </div>

              {/* Summary Amount & Subtitle */}
              <div className="flex flex-col gap-1 mt-1">
                <div className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight flex items-baseline gap-1.5 tabular-nums">
                  <span className="text-xl sm:text-2xl font-semibold text-slate-400">{userCurrencySymbol}</span>
                  <span>{totalSavedAcrossGoals.toLocaleString("en-IN")}</span>
                </div>
                <span className="text-xs sm:text-sm text-slate-400 font-medium">
                  {overallGoalProgressPct.toFixed(0)}% of {formatCurrency(totalTargetAcrossGoals, userCurrency)} saved
                </span>
              </div>

              {/* Overall Progress Bar */}
              <div className="w-full h-2 bg-slate-800/80 rounded-full overflow-hidden mt-1.5 p-[1px] shadow-inner border border-white/5">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${overallGoalProgressPct}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full shadow-[0_0_12px_rgba(99,102,241,0.6)]"
                />
              </div>
            </div>

            {/* Individual Goal List Items */}
            <div className="flex flex-col gap-4">
              {isLoadingGoals ? (
                <div className="flex flex-col gap-3">
                  <GoalCardSkeleton />
                  <GoalCardSkeleton />
                </div>
              ) : goals.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 font-normal">
                  No financial goals created yet. Click "+ Add Goal" to start saving.
                </div>
              ) : (
                [...goals].sort((a, b) => {
                  const pw = { high: 3, medium: 2, low: 1 };
                  return (pw[b.priority || 'medium'] || 0) - (pw[a.priority || 'medium'] || 0);
                }).map((g) => {
                  const currentAmount = parseFloat(g.currentAmount);
                  const targetAmount = parseFloat(g.targetAmount);
                  const progressPct = Math.min(100, (currentAmount / targetAmount) * 100);
                  const remaining = Math.max(0, targetAmount - currentAmount);

                  const isGoalOnTrack = (() => {
                    if (!g.targetDate || !g.createdAt) return null;
                    const start = new Date(g.createdAt).getTime();
                    const end = new Date(g.targetDate).getTime();
                    const now = Date.now();
                    
                    if (end > start) {
                      const totalDuration = end - start;
                      const timeElapsed = now - start;
                      const clampedElapsed = Math.max(0, Math.min(timeElapsed, totalDuration));
                      const expectedProgressPct = (clampedElapsed / totalDuration) * 100;
                      
                      return progressPct >= expectedProgressPct;
                    }
                    return null;
                  })();

                  return (
                    <div
                      key={g.id}
                      className={cn(
                        "group flex flex-col gap-3.5 p-4 sm:p-5 rounded-2xl border transition-all duration-200 relative z-10 backdrop-blur-md",
                        g.color === "blue" ? "bg-gradient-to-b from-blue-500/[0.08] via-blue-500/[0.03] to-transparent border-blue-500/25 hover:border-blue-500/40 shadow-[0_4px_24px_-6px_rgba(59,130,246,0.12)]" :
                        g.color === "teal" ? "bg-gradient-to-b from-teal-500/[0.08] via-teal-500/[0.03] to-transparent border-teal-500/25 hover:border-teal-500/40 shadow-[0_4px_24px_-6px_rgba(20,184,166,0.12)]" :
                        g.color === "green" ? "bg-gradient-to-b from-emerald-500/[0.08] via-emerald-500/[0.03] to-transparent border-emerald-500/25 hover:border-emerald-500/40 shadow-[0_4px_24px_-6px_rgba(16,185,129,0.12)]" :
                        g.color === "purple" ? "bg-gradient-to-b from-purple-500/[0.08] via-purple-500/[0.03] to-transparent border-purple-500/25 hover:border-purple-500/40 shadow-[0_4px_24px_-6px_rgba(168,85,247,0.12)]" :
                        g.color === "pink" ? "bg-gradient-to-b from-pink-500/[0.08] via-pink-500/[0.03] to-transparent border-pink-500/25 hover:border-pink-500/40 shadow-[0_4px_24px_-6px_rgba(236,72,153,0.12)]" :
                        g.color === "orange" ? "bg-gradient-to-b from-orange-500/[0.08] via-orange-500/[0.03] to-transparent border-orange-500/25 hover:border-orange-500/40 shadow-[0_4px_24px_-6px_rgba(249,115,22,0.12)]" :
                        "bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/10"
                      )}
                    >
                      {/* Top Row: Status Badges on Left, Action Controls on Right */}
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        {/* Left: Priority & Pace Badges */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {/* Priority Pill */}
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-black/35 rounded-full border border-white/10 backdrop-blur-sm">
                            <span className={cn(
                              "w-1.5 h-1.5 rounded-full shadow-xs",
                              g.priority === 'low' ? 'bg-emerald-400' : g.priority === 'high' ? 'bg-rose-400' : 'bg-amber-400'
                            )} />
                            <span className="text-[10px] uppercase font-bold text-slate-200 tracking-wider">
                              {g.priority || 'Medium'}
                            </span>
                          </div>

                          {/* Pace Status Pill */}
                          {isGoalOnTrack !== null && (
                            <span className={cn(
                              "text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border backdrop-blur-sm",
                              isGoalOnTrack 
                                ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" 
                                : "bg-rose-500/15 text-rose-300 border-rose-500/30"
                            )}>
                              {isGoalOnTrack ? "On Track" : "Behind Schedule"}
                            </span>
                          )}
                        </div>

                        {/* Actions Row: Manage on Left, Edit & Delete on Far Right */}
                        <div className="flex items-center justify-between gap-2 w-full sm:w-auto sm:justify-end">
                          <button
                            type="button"
                            onClick={() => handleOpenDeposit(g.id, g.title)}
                            className={cn(
                              "h-6 sm:h-7 px-3 rounded-full text-[10px] sm:text-[11px] font-bold uppercase tracking-wider transition-all duration-150 active:scale-[0.98] cursor-pointer flex items-center gap-1.5 shadow-xs border shrink-0",
                              g.color === "blue" ? "bg-blue-500/15 text-blue-300 border-blue-500/30 hover:bg-blue-500/25" :
                              g.color === "teal" ? "bg-teal-500/15 text-teal-300 border-teal-500/30 hover:bg-teal-500/25" :
                              g.color === "green" ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25" :
                              g.color === "purple" ? "bg-purple-500/15 text-purple-300 border-purple-500/30 hover:bg-purple-500/25" :
                              g.color === "pink" ? "bg-pink-500/15 text-pink-300 border-pink-500/30 hover:bg-pink-500/25" :
                              g.color === "orange" ? "bg-orange-500/15 text-orange-300 border-orange-500/30 hover:bg-orange-500/25" : 
                              "bg-blue-500/15 text-blue-300 border-blue-500/30 hover:bg-blue-500/25"
                            )}
                          >
                            <ArrowUpDown size={11} className="text-current" />
                            <span>Manage</span>
                          </button>

                          {/* Edit & Delete Action Icons pushed to Far Right */}
                          <div className="flex items-center gap-1 bg-black/30 p-1 rounded-full border border-white/10 backdrop-blur-md ml-auto">
                            <button
                              type="button"
                              onClick={() => handleOpenEditGoal(g)}
                              aria-label="Edit Goal"
                              className="w-6 h-6 sm:w-7 sm:h-7 rounded-full hover:bg-white/15 text-slate-400 hover:text-white transition-colors flex items-center justify-center cursor-pointer"
                            >
                              <Pencil size={12} />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteGoal(g.id, g.title)}
                              aria-label="Delete Goal"
                              className="w-6 h-6 sm:w-7 sm:h-7 rounded-full hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 transition-colors flex items-center justify-center cursor-pointer"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Goal Title */}
                      <h4 className="text-base sm:text-lg font-bold text-white tracking-tight leading-snug">
                        {g.title}
                      </h4>

                      {/* Amount & Percentage Row */}
                      <div className="flex items-baseline justify-between">
                        <div className="flex items-baseline gap-1 text-white font-bold text-base sm:text-lg tracking-tight tabular-nums">
                          <span>{formatCurrency(currentAmount, userCurrency)}</span>
                          <span className="text-xs font-normal text-slate-400">/ {formatCurrency(targetAmount, userCurrency)}</span>
                        </div>
                        <span className="font-extrabold text-sm sm:text-base tabular-nums text-white">
                          {progressPct.toFixed(0)}%
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className={cn(
                        "w-full h-2 rounded-full overflow-hidden p-[1px] shadow-inner",
                        g.color === "blue" ? "bg-blue-950/60 border border-blue-500/20" :
                        g.color === "teal" ? "bg-teal-950/60 border border-teal-500/20" :
                        g.color === "green" ? "bg-emerald-950/60 border border-emerald-500/20" :
                        g.color === "purple" ? "bg-purple-950/60 border border-purple-500/20" :
                        g.color === "pink" ? "bg-pink-950/60 border border-pink-500/20" :
                        g.color === "orange" ? "bg-orange-950/60 border border-orange-500/20" : "bg-blue-950/60 border border-blue-500/20"
                      )}>
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${progressPct}%` }}
                          transition={{ duration: 1, ease: "easeOut", delay: 0.1 }}
                          className={cn(
                            "h-full rounded-full",
                            g.color === "blue" ? "bg-gradient-to-r from-blue-500 to-cyan-400 shadow-[0_0_10px_rgba(96,165,250,0.6)]" :
                            g.color === "teal" ? "bg-gradient-to-r from-teal-500 to-emerald-400 shadow-[0_0_10px_rgba(45,212,191,0.6)]" :
                            g.color === "green" ? "bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_10px_rgba(52,211,153,0.6)]" :
                            g.color === "purple" ? "bg-gradient-to-r from-purple-500 to-indigo-400 shadow-[0_0_10px_rgba(192,132,252,0.6)]" :
                            g.color === "pink" ? "bg-gradient-to-r from-pink-500 to-rose-400 shadow-[0_0_10px_rgba(244,114,182,0.6)]" :
                            g.color === "orange" ? "bg-gradient-to-r from-orange-500 to-amber-400 shadow-[0_0_10px_rgba(251,146,60,0.6)]" : "bg-gradient-to-r from-blue-500 to-cyan-400 shadow-[0_0_10px_rgba(96,165,250,0.6)]"
                          )}
                        />
                      </div>

                      {/* Structured Footer: Remaining, Target & Time Left */}
                      <div className="bg-black/25 rounded-xl p-3 border border-white/5 flex flex-col gap-2 backdrop-blur-xs">
                        <div className="flex items-center justify-between text-xs text-slate-400 font-medium flex-wrap gap-1">
                          <span>
                            <strong className="text-slate-200 font-semibold">{formatCurrency(remaining, userCurrency)}</strong> remaining
                          </span>
                          {g.targetDate && (
                            <span>Target: <strong className="text-slate-200 font-semibold">{formatGoalDate(g.targetDate)}</strong></span>
                          )}
                        </div>

                        {g.targetDate && (
                          <div className="flex items-center justify-between text-xs pt-2 border-t border-white/5">
                            <span className="text-slate-400 font-medium">Time Left</span>
                            <span className="text-slate-200 font-semibold text-right tabular-nums">
                              {(() => {
                                const end = new Date(g.targetDate);
                                const now = new Date();
                                if (end <= now) return "Time is up";
                                
                                let months = (end.getFullYear() - now.getFullYear()) * 12 + (end.getMonth() - now.getMonth());
                                let days = end.getDate() - now.getDate();
                                if (days < 0) {
                                  months -= 1;
                                  const prevMonth = new Date(end.getFullYear(), end.getMonth(), 0);
                                  days += prevMonth.getDate();
                                }
                                
                                const parts = [];
                                if (months > 0) parts.push(`${months} month${months !== 1 ? 's' : ''}`);
                                if (days > 0 || months === 0) parts.push(`${days} day${days !== 1 ? 's' : ''}`);
                                
                                return parts.join(' ') + " left";
                              })()}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>



          {/* ==================== 3. DEBT & LOAN TRACKER (Refined Modern Design) ==================== */}
          <section className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6 flex flex-col gap-5 shadow-xs hover:shadow-sm transition-shadow mt-4">
            {/* Header + Add Record Button */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-slate-900 tracking-tight whitespace-nowrap">
                  Debt Tracker
                </h3>
                <SectionInfoModal
                  content={{
                    title: "Debt & IOU Tracker",
                    subtitle: "Manage money lent and borrowed",
                    badge: "Debts",
                    description: "Keep track of personal loans, shared expenses, and IOUs. Log incoming repayments or settled balances easily.",
                  }}
                  align="left"
                />
              </div>

              <button
                type="button"
                onClick={() => setIsAddDebtOpen(true)}
                className="px-3.5 py-1.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white shadow-xs text-xs font-semibold transition-all duration-150 active:scale-[0.98] cursor-pointer flex items-center gap-1.5"
              >
                <Plus size={14} className="text-white" />
                <span>Add Record</span>
              </button>
            </div>

            {/* Summary Metric Tiles */}
            <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
              {/* To Collect */}
              <div className="bg-emerald-50/60 hover:bg-emerald-50/90 border border-emerald-100/80 rounded-2xl p-2.5 sm:p-3 flex flex-col items-center text-center transition-colors">
                <span className="text-[10px] font-bold text-emerald-800/80 uppercase tracking-wider">
                  To Collect
                </span>
                <span className="text-base sm:text-lg font-bold text-emerald-600 tracking-tight tabular-nums mt-0.5">
                  {formatCompactAmount(totalLent)}
                </span>
              </div>

              {/* To Pay */}
              <div className="bg-rose-50/60 hover:bg-rose-50/90 border border-rose-100/80 rounded-2xl p-2.5 sm:p-3 flex flex-col items-center text-center transition-colors">
                <span className="text-[10px] font-bold text-rose-800/80 uppercase tracking-wider">
                  To Pay
                </span>
                <span className="text-base sm:text-lg font-bold text-rose-600 tracking-tight tabular-nums mt-0.5">
                  {formatCompactAmount(totalBorrowed)}
                </span>
              </div>

              {/* Balance */}
              <div className="bg-slate-50/90 hover:bg-slate-100/80 border border-slate-200/60 rounded-2xl p-2.5 sm:p-3 flex flex-col items-center text-center transition-colors">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Balance
                </span>
                <span
                  className={cn(
                    "text-base sm:text-lg font-bold tracking-tight tabular-nums mt-0.5",
                    netDebtPosition > 0 ? "text-emerald-600" : netDebtPosition < 0 ? "text-rose-600" : "text-slate-900"
                  )}
                >
                  {netDebtPosition >= 0 ? "+" : ""}{formatCompactAmount(netDebtPosition)}
                </span>
              </div>
            </div>

            {/* Filter Segmented Control & Currency Indicator */}
            <div className="flex items-center justify-between gap-2 overflow-x-auto no-scrollbar pt-1 border-b border-slate-100 pb-3">
              <div className="inline-flex p-1 bg-slate-100/90 rounded-xl">
                {(["all", "lent", "borrowed"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setDebtFilter(tab)}
                    className={cn(
                      "px-2.5 sm:px-3 py-1 text-xs font-semibold rounded-lg transition-all duration-150 cursor-pointer whitespace-nowrap",
                      debtFilter === tab
                        ? "bg-white text-slate-900 shadow-xs"
                        : "text-slate-500 hover:text-slate-800"
                    )}
                  >
                    {tab === "all" ? "All" : tab === "lent" ? "To Collect" : "To Pay"}
                  </button>
                ))}
              </div>

              <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 bg-slate-100/80 border border-slate-200/50 px-2.5 py-1 rounded-lg shrink-0">
                Amounts in {userCurrencySymbol}
              </span>
            </div>

            {/* Debt Rows List */}
            <div>
              {isLoadingDebts ? (
                <div className="flex flex-col gap-2">
                  <DebtCardSkeleton />
                  <DebtCardSkeleton />
                </div>
              ) : filteredDebts.length === 0 ? (
                /* Empty State */
                <div className="py-10 flex flex-col items-center justify-center text-center gap-2.5 bg-slate-50/60 rounded-2xl border border-dashed border-slate-200 p-6">
                  <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200/60 flex items-center justify-center text-slate-400">
                    <Calendar size={18} />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <h4 className="text-sm font-semibold text-slate-900">No debts yet</h4>
                    <p className="text-xs text-slate-500 max-w-xs">
                      Track money you've lent or borrowed effortlessly.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAddDebtOpen(true)}
                    className="mt-1 px-4 py-1.5 rounded-full bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus size={14} />
                    <span>Add Record</span>
                  </button>
                </div>
              ) : (
                <div className="flex flex-col divide-y divide-slate-100">
                  {filteredDebts.map((d) => {
                    const isMenuOpen = activeDebtMenuId === d.id;

                    if (d.isSettled) {
                      /* Settled Row */
                      return (
                        <div
                          key={d.id}
                          className="py-3 px-2 sm:px-2.5 rounded-xl flex items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors group cursor-pointer"
                          onClick={() => toggleSettled(d.id)}
                        >
                          {/* Left: Indicator + Name & Details */}
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <div className="w-2 h-2 rounded-full bg-slate-300 shrink-0" />

                            <div className="flex flex-col min-w-0 gap-0.5">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="font-medium text-[13.5px] text-slate-400 tracking-tight truncate line-through">
                                  {d.name}
                                </span>
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase bg-slate-100 text-slate-500 shrink-0">
                                  Settled
                                </span>
                              </div>
                              {d.note && (
                                <span className="text-xs text-slate-400 font-normal truncate line-through">
                                  {d.note}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Right: Amount & Reopen action (Separated flex containers - zero overlap) */}
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="font-semibold text-sm tabular-nums text-slate-400 line-through">
                              {d.type === "lent" ? "+" : "-"}{formatCompactAmount(d.amount)}
                            </span>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleSettled(d.id);
                              }}
                              className="px-2 py-0.5 rounded text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 transition-colors cursor-pointer"
                            >
                              Reopen
                            </button>
                          </div>
                        </div>
                      );
                    }

                    /* Active Debt Row */
                    return (
                      <div
                        key={d.id}
                        className="py-3 px-2 sm:px-2.5 rounded-xl flex items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors relative group cursor-pointer"
                      >
                        {/* Left: Indicator + Name & Details */}
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div className="flex items-center justify-center shrink-0">
                            <span
                              className={cn(
                                "w-2 h-2 rounded-full ring-4",
                                d.type === "lent"
                                  ? "bg-emerald-500 ring-emerald-50"
                                  : "bg-rose-500 ring-rose-50"
                              )}
                            />
                          </div>

                          <div className="flex flex-col min-w-0 gap-0.5">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="font-semibold text-[13.5px] text-slate-900 tracking-tight truncate">
                                {d.name}
                              </span>

                              <span
                                className={cn(
                                  "px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase shrink-0",
                                  d.type === "lent"
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200/50"
                                    : "bg-rose-50 text-rose-700 border border-rose-200/50"
                                )}
                              >
                                {d.type === "lent" ? "Collect" : "Pay"}
                              </span>

                              {d.hasReminder && (
                                <BellRing size={12} className="text-sky-500 shrink-0" />
                              )}
                            </div>

                            {(d.note || d.dueDate) && (
                              <span className="text-xs text-slate-500 font-normal truncate">
                                {d.note ? `${d.note}` : ""}
                                {d.note && d.dueDate ? " • " : ""}
                                {d.dueDate ? formatNaturalDueDate(d.dueDate) : ""}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Right: Amount & Actions Menu */}
                        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                          <span
                            className={cn(
                              "font-semibold text-sm sm:text-[15px] tabular-nums tracking-tight",
                              d.type === "lent" ? "text-emerald-600 font-bold" : "text-slate-900"
                            )}
                          >
                            {d.type === "lent" ? "+" : "-"}{formatCompactAmount(d.amount)}
                          </span>

                          <div className="relative">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveDebtMenuId((prev) => (prev === d.id ? null : d.id));
                              }}
                              className="w-7 h-7 rounded-lg hover:bg-slate-200/60 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
                              aria-label="Options"
                            >
                              <MoreVertical size={15} />
                            </button>

                            {/* Dropdown Options */}
                            {isMenuOpen && (
                              <>
                                {/* Invisible overlay to detect clicks outside */}
                                <div
                                  className="fixed inset-0 z-20"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveDebtMenuId(null);
                                  }}
                                />
                                <div
                                  className="absolute right-0 top-8 z-30 w-44 bg-white border border-slate-200 rounded-xl p-1.5 shadow-lg animate-in fade-in zoom-in-95 duration-100 flex flex-col gap-0.5 text-xs font-medium"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <button
                                    type="button"
                                    onClick={() => {
                                      toggleSettled(d.id);
                                      setActiveDebtMenuId(null);
                                    }}
                                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-slate-700 hover:bg-slate-100 flex items-center gap-2 cursor-pointer"
                                  >
                                    <CheckCircle2 size={13} className="text-emerald-600" />
                                    <span>Mark as Settled</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      toggleReminder(d.id);
                                      setActiveDebtMenuId(null);
                                    }}
                                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-slate-700 hover:bg-slate-100 flex items-center gap-2 cursor-pointer"
                                  >
                                    <Bell size={13} className="text-sky-600" />
                                    <span>{d.hasReminder ? "Remove Reminder" : "Set Reminder"}</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      deleteDebtMutation.mutate(d.id);
                                      setActiveDebtMenuId(null);
                                      showToast(`Deleted debt record for "${d.name}"`);
                                    }}
                                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-rose-600 hover:bg-rose-50 flex items-center gap-2 cursor-pointer"
                                  >
                                    <Trash2 size={13} />
                                    <span>Delete Record</span>
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

        </Stack>
      </Container>

      {/* ADD / EDIT GOAL MODAL */}
      {isGoalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <form
            onSubmit={handleSaveGoal}
            className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl p-5 shadow-xl flex flex-col gap-4 animate-in zoom-in-95 duration-150 text-slate-900"
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-slate-900 tracking-tight">
                  {editingGoalId ? "Edit Goal" : "Create New Goal"}
                </h3>
                <SectionInfoModal
                  content={{
                    title: "Goal Creation Guide",
                    subtitle: "Track targets with visual colors & deadlines",
                    badge: "Goals Guide",
                    description: "Define a financial milestone like an emergency fund, major purchase, or vacation pool.",
                    highlights: [
                      { title: "Target Amount", desc: "The total target savings amount you want to reach." },
                      { title: "Target Date", desc: "Desired completion deadline for this goal." },
                      { title: "Priority & Accent", desc: "Assign Low/Medium/High priority and accent colors for clear organization." }
                    ]
                  }}
                />
              </div>
              <button
                type="button"
                onClick={() => setIsGoalModalOpen(false)}
                className="w-8 h-8 rounded-lg bg-slate-50 text-slate-500 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  Goal Title
                </label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Emergency & Wealth Fund"
                  value={goalFormTitle}
                  onChange={(e) => setGoalFormTitle(e.target.value)}
                  className="w-full h-10 px-3 bg-white border border-slate-200/80 rounded-md text-xs font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-400 placeholder:text-slate-400 shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
                />
              </div>

              {/* Priority */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  Priority
                </label>
                <div className="flex bg-slate-50/50 rounded-md p-1 border border-slate-200/80">
                  {(['low', 'medium', 'high'] as const).map(p => {
                    const isActive = goalFormPriority === p;
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setGoalFormPriority(p)}
                        className={cn(
                          "flex-1 py-1.5 rounded text-xs font-semibold capitalize transition-all duration-150 cursor-pointer flex items-center justify-center gap-1.5",
                          isActive ? "bg-white shadow-xs border border-slate-200/60 text-slate-900" : "text-slate-500 hover:text-slate-700 border border-transparent"
                        )}
                      >
                        <span className={cn(
                          "inline-block w-2 h-2 rounded-full",
                          p === 'low' ? 'bg-emerald-500' : p === 'medium' ? 'bg-amber-400' : 'bg-rose-500'
                        )} />
                        {p}
                      </button>
                    )
                  })}
                </div>
                <span className="text-[10px] text-slate-400 mt-0.5">
                  Set priority to stay focused on what matters most.
                </span>
              </div>

              {/* Accent Color */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  Accent Color
                </label>
                <div className="flex items-center gap-3 mt-1">
                  {[
                    { val: 'blue', tw: 'bg-[#8bb3fb]' },
                    { val: 'teal', tw: 'bg-[#94e2d5]' },
                    { val: 'green', tw: 'bg-[#98e5a5]' },
                    { val: 'purple', tw: 'bg-[#c8b6f9]' },
                    { val: 'pink', tw: 'bg-[#f3b0c9]' },
                    { val: 'orange', tw: 'bg-[#f9c58f]' },
                  ].map((colorObj) => {
                    const isActive = goalFormColor === colorObj.val;
                    return (
                      <button
                        key={colorObj.val}
                        type="button"
                        onClick={() => setGoalFormColor(colorObj.val)}
                        className={cn(
                          "w-7 h-7 rounded-full cursor-pointer transition-all duration-150 flex items-center justify-center",
                          colorObj.tw,
                          isActive ? "ring-2 ring-offset-2 ring-slate-400 scale-110" : "hover:scale-110 shadow-xs"
                        )}
                      />
                    );
                  })}
                </div>
                <span className="text-[10px] text-slate-400 mt-0.5">
                  Choose a color to easily identify this goal.
                </span>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  Target Amount ({userCurrencySymbol})
                </label>
                <input
                  required
                  type="number"
                  placeholder="0"
                  value={goalFormTarget}
                  onChange={(e) => setGoalFormTarget(e.target.value)}
                  className="w-full h-10 px-3 bg-white border border-slate-200/80 rounded-md text-xs font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-400 placeholder:text-slate-400 shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  Already Saved ({userCurrencySymbol})
                </label>
                <input
                  type="number"
                  placeholder="0"
                  value={goalFormCurrent}
                  onChange={(e) => setGoalFormCurrent(e.target.value)}
                  className="w-full h-10 px-3 bg-white border border-slate-200/80 rounded-md text-xs font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-400 placeholder:text-slate-400 shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  Target Date (Optional)
                </label>
                <input
                  type="date"
                  value={goalFormTargetDate}
                  onChange={(e) => setGoalFormTargetDate(e.target.value)}
                  className="w-full h-10 px-3 bg-white border border-slate-200/80 rounded-md text-xs font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-400 placeholder:text-slate-400 shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full h-11 mt-2 bg-slate-900 hover:bg-slate-800 text-white rounded-md font-semibold text-sm transition-all duration-150 active:scale-[0.98] cursor-pointer shadow-xs"
            >
              {editingGoalId ? "Update Goal" : "Save Goal"}
            </button>
          </form>
        </div>
      )}

      {/* UPDATE GOAL MODAL */}
      {isDepositModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <form
            onSubmit={handleConfirmDeposit}
            className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl p-5 shadow-xl flex flex-col gap-4 animate-in zoom-in-95 duration-150 text-slate-900"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-semibold text-base text-slate-900">Update Goal Progress</h3>
              <button
                type="button"
                onClick={() => setIsDepositModalOpen(false)}
                className="w-7 h-7 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center cursor-pointer transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <span className="text-xs text-slate-500 font-normal">
                Updating progress for <strong className="text-slate-900 font-semibold">{depositGoalTitle}</strong>
              </span>

              {/* Add vs Deduct Mode Toggle */}
              <div className="flex items-center p-1 bg-slate-100/80 rounded-md border border-slate-200/60">
                <button
                  type="button"
                  onClick={() => {
                    setDepositMode("add");
                    setAddToTransactions(false);
                  }}
                  className={cn(
                    "flex-1 py-1.5 rounded text-xs font-semibold transition-all duration-150 cursor-pointer flex items-center justify-center gap-1.5",
                    depositMode === "add"
                      ? "bg-white shadow-xs border border-slate-200/60 text-slate-900"
                      : "text-slate-500 hover:text-slate-700 border border-transparent"
                  )}
                >
                  <Plus size={14} />
                  <span>Add</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDepositMode("deduct")}
                  className={cn(
                    "flex-1 py-1.5 rounded text-xs font-semibold transition-all duration-150 cursor-pointer flex items-center justify-center gap-1.5",
                    depositMode === "deduct"
                      ? "bg-white shadow-xs border border-slate-200/60 text-amber-600 font-bold"
                      : "text-slate-500 hover:text-slate-700 border border-transparent"
                  )}
                >
                  <Minus size={14} />
                  <span>Deduct</span>
                </button>
              </div>

              {/* Amount Input */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  {depositMode === "deduct" ? `Deduction Amount (${userCurrencySymbol})` : `Amount to Add (${userCurrencySymbol})`}
                </label>
                <input
                  required
                  type="number"
                  placeholder="0"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  autoFocus
                  className="w-full h-10 px-3 bg-white border border-slate-200/80 rounded-md text-xs font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-400 placeholder:text-slate-400 shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
                />
              </div>

              {/* Deduct mode: destination selector */}
              {depositMode === "deduct" && (
                <div className="flex flex-col gap-2">
                  {/* Default state helper — shown when unchecked */}
                  {!addToTransactions && (
                    <p className="text-[11px] text-slate-500 leading-tight px-0.5">
                      Money will be recorded as an expense.
                    </p>
                  )}

                  <label className="flex items-start gap-2.5 p-2.5 rounded-md bg-amber-50/60 border border-amber-200/60 text-amber-950 cursor-pointer transition-all hover:bg-amber-50">
                    <input
                      type="checkbox"
                      checked={addToTransactions}
                      onChange={(e) => setAddToTransactions(e.target.checked)}
                      className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-amber-300 cursor-pointer mt-0.5"
                    />
                    <div className="flex flex-col text-left">
                      <span className="text-xs font-semibold text-amber-950">Add to balance</span>
                      <span className="text-[11px] text-amber-700 font-normal">
                        {addToTransactions
                          ? "Money will be added to your available balance."
                          : "Check this to return the money to your available balance."}
                      </span>
                    </div>
                  </label>
                </div>
              )}
            </div>

            <button
              type="submit"
              className="w-full h-11 mt-2 bg-slate-900 hover:bg-slate-800 text-white rounded-md font-semibold text-sm transition-all duration-150 active:scale-[0.98] cursor-pointer shadow-xs"
            >
              {depositMode === "deduct" ? "Confirm Deduction" : "Confirm Update"}
            </button>
          </form>
        </div>
      )}

      {/* ADD DEBT MODAL */}
      {isAddDebtOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs animate-in fade-in duration-150">
          <form
            onSubmit={handleAddDebt}
            className="w-full max-w-sm bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-150 text-slate-900"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div
                  className={cn(
                    "w-8 h-8 rounded-xl flex items-center justify-center transition-colors shadow-xs shrink-0",
                    newDebtType === "lent"
                      ? "bg-emerald-50 text-emerald-600 border border-emerald-200/60"
                      : "bg-rose-50 text-rose-600 border border-rose-200/60"
                  )}
                >
                  {newDebtType === "lent" ? (
                    <ArrowDownLeft size={16} />
                  ) : (
                    <ArrowUpRight size={16} />
                  )}
                </div>
                <div className="flex flex-col">
                  <h3 className="font-bold text-base text-slate-900 tracking-tight leading-tight">
                    Add Debt Record
                  </h3>
                  <span className="text-[11px] text-slate-400 font-medium">
                    {newDebtType === "lent"
                      ? "Money you gave to someone"
                      : "Money you owe to someone"}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsAddDebtOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X size={15} />
              </button>
            </div>

            <div className="flex flex-col gap-3.5">
              {/* Type Segmented Control */}
              <div className="grid grid-cols-2 p-1 bg-slate-100/90 rounded-2xl gap-1">
                <button
                  type="button"
                  onClick={() => setNewDebtType("lent")}
                  className={cn(
                    "py-2 px-3 rounded-xl text-xs font-semibold transition-all duration-150 text-center cursor-pointer flex items-center justify-center gap-1.5",
                    newDebtType === "lent"
                      ? "bg-white text-emerald-700 shadow-xs border border-slate-200/60 font-bold"
                      : "text-slate-500 hover:text-slate-900"
                  )}
                >
                  {newDebtType === "lent" && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  )}
                  <span>Lent</span>
                  <span className="font-normal opacity-70">(I gave)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setNewDebtType("borrowed")}
                  className={cn(
                    "py-2 px-3 rounded-xl text-xs font-semibold transition-all duration-150 text-center cursor-pointer flex items-center justify-center gap-1.5",
                    newDebtType === "borrowed"
                      ? "bg-white text-rose-700 shadow-xs border border-slate-200/60 font-bold"
                      : "text-slate-500 hover:text-slate-900"
                  )}
                >
                  {newDebtType === "borrowed" && (
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  )}
                  <span>Borrowed</span>
                  <span className="font-normal opacity-70">(I owe)</span>
                </button>
              </div>

              {/* Person Name */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  Person Name
                </label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Rahul"
                  value={newDebtName}
                  onChange={(e) => setNewDebtName(e.target.value)}
                  className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-100 focus:border-slate-400 focus:bg-white placeholder:text-slate-400 shadow-[0_1px_2px_rgba(0,0,0,0.02)] transition-all"
                />
              </div>

              {/* Amount with integrated currency symbol */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  Amount ({userCurrencySymbol})
                </label>
                <div className="relative flex items-center rounded-xl bg-slate-50 border border-slate-200/80 focus-within:border-slate-400 focus-within:bg-white focus-within:ring-2 focus-within:ring-slate-100 transition-all shadow-[0_1px_2px_rgba(0,0,0,0.02)] overflow-hidden">
                  <span className="pl-3.5 pr-1 text-sm font-bold text-slate-400 select-none">
                    {userCurrencySymbol}
                  </span>
                  <input
                    required
                    type="number"
                    placeholder="0"
                    value={newDebtAmount}
                    onChange={(e) => setNewDebtAmount(e.target.value)}
                    className="w-full h-11 pr-3 bg-transparent text-sm sm:text-base font-bold text-slate-900 placeholder:text-slate-300 focus:outline-none tabular-nums"
                  />
                </div>
              </div>

              {/* Due Date */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  Due Date
                </label>
                <input
                  type="date"
                  value={newDebtDueDate}
                  onChange={(e) => setNewDebtDueDate(e.target.value)}
                  className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-100 focus:border-slate-400 focus:bg-white transition-all cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
                />
              </div>

              {/* Note / Reason */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  Note / Reason (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Trip expenses"
                  value={newDebtNote}
                  onChange={(e) => setNewDebtNote(e.target.value)}
                  className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100 focus:border-slate-400 focus:bg-white shadow-[0_1px_2px_rgba(0,0,0,0.02)] transition-all"
                />
              </div>

              {/* Due Date Reminder Toggle Card */}
              <label
                className={cn(
                  "flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer select-none",
                  newDebtEnableReminder
                    ? "bg-sky-50/60 border-sky-200/80 text-sky-950 shadow-xs"
                    : "bg-slate-50/50 border-slate-200/70 text-slate-600 hover:bg-slate-50"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={cn(
                      "w-7 h-7 rounded-xl flex items-center justify-center transition-colors shrink-0",
                      newDebtEnableReminder
                        ? "bg-sky-100 text-sky-600"
                        : "bg-slate-200/60 text-slate-400"
                    )}
                  >
                    <BellRing size={14} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold leading-tight">
                      Due date reminder
                    </span>
                    <span className="text-[10px] text-slate-400 font-normal">
                      Alert when repayment date arrives
                    </span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={newDebtEnableReminder}
                  onChange={(e) => setNewDebtEnableReminder(e.target.checked)}
                  className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 border-slate-300 cursor-pointer"
                />
              </label>
            </div>

            {/* Submit Action */}
            <button
              type="submit"
              className="w-full h-11 mt-1 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold text-xs transition-all duration-150 active:scale-[0.98] cursor-pointer shadow-xs hover:shadow flex items-center justify-center gap-1.5"
            >
              <span>Save Debt Record</span>
            </button>
          </form>
        </div>
      )}

      {/* SETTINGS MODAL */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl p-5 shadow-xl flex flex-col gap-4 animate-in zoom-in-95 duration-150 text-slate-900">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Settings size={18} className="text-slate-700" />
                <h3 className="font-semibold text-base text-slate-900">App Settings</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className="w-7 h-7 rounded-lg bg-slate-100 text-slate-500 hover:text-slate-800 hover:bg-slate-200 flex items-center justify-center cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <div className="flex flex-col gap-3.5 text-xs">
              {/* Currency preference moved to Profile > Preferences */}              {/* Push Notifications Switch */}
              <div className="flex items-center justify-between py-2 border-y border-slate-100">
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium text-slate-800">Reminders & Notifications</span>
                  <span className="text-[11px] text-slate-400">Get debt and goal progress alerts</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEnableNotifications((prev) => !prev);
                    showToast(!enableNotifications ? "Notifications enabled" : "Notifications disabled");
                  }}
                  className={cn(
                    "w-10 h-6 rounded-full transition-colors relative cursor-pointer",
                    enableNotifications ? "bg-emerald-600" : "bg-slate-200"
                  )}
                >
                  <span
                    className={cn(
                      "w-4 h-4 rounded-full bg-white absolute top-1 transition-transform shadow-xs",
                      enableNotifications ? "left-5" : "left-1"
                    )}
                  />
                </button>
              </div>

              {/* Data & Security Status */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={16} className="text-emerald-600" />
                  <div className="flex flex-col">
                    <span className="font-semibold text-slate-800">Storage & Sync</span>
                    <span className="text-[10px] text-slate-400">Offline-first Dexie DB Active</span>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                  Encrypted
                </span>
              </div>

              {/* Export Data Button */}
              <button
                type="button"
                onClick={() => showToast("Exporting expense records to CSV...")}
                className="w-full h-10 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-lg font-medium text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download size={14} />
                <span>Export Transaction Backup (CSV)</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsSettingsOpen(false)}
              className="w-full h-10 mt-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-semibold text-xs transition-all duration-150 active:scale-[0.98] cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Goal Delete Confirmation Modal */}
      {goalToConfirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-2xl border border-slate-100 flex flex-col gap-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                <div className="w-7 h-7 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
                  <Trash2 size={16} />
                </div>
                <span>Delete Goal</span>
              </div>
              <button
                type="button"
                onClick={() => setGoalToConfirmDelete(null)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
              <p>
                Are you sure you want to delete the financial goal <span className="font-bold text-slate-900">"{goalToConfirmDelete.title}"</span>? 
                This action <span className="font-bold text-red-600">cannot</span> be undone.
              </p>
              
              <div className="mt-4">
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Type "confirm" to proceed
                </label>
                <input
                  type="text"
                  value={goalDeleteConfirmText}
                  onChange={(e) => setGoalDeleteConfirmText(e.target.value)}
                  placeholder="confirm"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all font-medium"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-2">
              <button
                type="button"
                onClick={() => setGoalToConfirmDelete(null)}
                className="flex-1 py-2.5 bg-slate-100 text-slate-700 font-semibold text-xs rounded-xl hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={goalDeleteConfirmText.trim().toLowerCase() !== "confirm"}
                onClick={() => {
                  if (goalDeleteConfirmText.trim().toLowerCase() !== "confirm") return;
                  deleteGoalMutation.mutate(goalToConfirmDelete.id, {
                    onError: () => showToast(`Failed to delete "${goalToConfirmDelete.title}". Changes rolled back.`)
                  });
                  showToast(`Deleted goal "${goalToConfirmDelete.title}"`);
                  setGoalToConfirmDelete(null);
                }}
                className="flex-1 py-2.5 bg-red-600 text-white font-semibold text-xs rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                Delete Goal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hero Dark Floating Dock Navigation Pill (Matching Home Screen) */}
      <BottomNav
        activeTab="portfolio"
        variant="hero"
        items={pillNavItems}
        onTabChange={(tabId: string) => {
          if (tabId === "home") {
            navigate("/");
          } else if (tabId === "settings") {
            setIsSettingsOpen(true);
          } else if (tabId === "profile") {
            navigate("/profile");
          }
        }}
      />
    </AppShell>
  );
};
