import React, { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

import {
  AppShell,
  Container,
  Stack,
  BottomNav,
  cn,
} from "@expenseflow/ui";
import { 
  useFinancialGoals, 
  useCreateGoal, 
  useUpdateGoal, 
  useDeleteGoal, 
  useAddGoalProgress 
} from "../features/financial-goals/hooks/useFinancialGoals";
import { type FinancialGoal } from "../features/financial-goals/api/financial-goals.api";
import { useQueryClient } from "@tanstack/react-query";
import { useSyncEngine } from "../core/sync/SyncEngine";
import { ulid } from "ulid";
import {
  ArrowLeft,
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



export interface DebtItem {
  id: string;
  name: string;
  amount: number;
  type: "lent" | "borrowed"; // lent = money owed to me; borrowed = money I owe
  dueDate: string;
  note?: string;
  isSettled: boolean;
  hasReminder: boolean;
  reminderDate?: string;
}



export const PortfolioPage: React.FC = () => {
  const navigate = useNavigate();

  // Settings modal state & pill navigation state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [currencyPref, setCurrencyPref] = useState("₹ (INR)");
  const [enableNotifications, setEnableNotifications] = useState(true);

  // Toast Notification state
  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

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
  const { data: serverGoals = [] } = useFinancialGoals();
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
    deleteGoalMutation.mutate(id, {
      onError: () => showToast(`Failed to delete "${title}". Changes rolled back.`)
    });
    showToast(`Deleted goal "${title}"`);
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
          category: txCategory,
          spentAt: spentAtIso,
          type: "income",
        });

        showToast(`Deducted ₹${numAmt.toLocaleString("en-IN")} — added to your balance.`);
      } else {
        // addToBalance = FALSE (default):
        //   Goal decreases by X.
        //   Available balance does NOT increase — money is spent, not recovered.
        //   Record as Expense -X so spending history reflects the outflow.
        const txCategory = `Goal Expense: ${depositGoalTitle}`;

        queryClient.setQueryData(["transactions"], (old: any) => {
          const optimisticTx = {
            id: cid,
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
          category: txCategory,
          spentAt: spentAtIso,
          type: "expense",
        });

        showToast(`Deducted ₹${numAmt.toLocaleString("en-IN")} — recorded as an expense.`);
      }
    } else {
      showToast(`Added ₹${numAmt.toLocaleString("en-IN")} to "${depositGoalTitle}"!`);
    }

    setIsDepositModalOpen(false);
  };

  // Analytics moved to dedicated /analytics page

  // --- 3. Debt & Loan Tracker State ---
  const [debts, setDebts] = useState<DebtItem[]>([
    {
      id: "d1",
      name: "John",
      amount: 5000,
      type: "lent",
      dueDate: "2026-08-10",
      note: "Goa trip hotel splitting",
      isSettled: false,
      hasReminder: true,
      reminderDate: "2026-08-08",
    },
    {
      id: "d2",
      name: "Jack",
      amount: 1200,
      type: "borrowed",
      dueDate: "2026-08-05",
      note: "Dinner bill split",
      isSettled: false,
      hasReminder: false,
    },
    {
      id: "d3",
      name: "Alex",
      amount: 3500,
      type: "lent",
      dueDate: "2026-08-15",
      note: "Concert tickets",
      isSettled: false,
      hasReminder: false,
    },
    {
      id: "d4",
      name: "John",
      amount: 2000,
      type: "lent",
      dueDate: "2026-07-20",
      note: "Gadgets purchase",
      isSettled: true,
      hasReminder: false,
    },
  ]);

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
    .reduce((acc, d) => acc + d.amount, 0);

  const totalBorrowed = debts
    .filter((d) => d.type === "borrowed" && !d.isSettled)
    .reduce((acc, d) => acc + d.amount, 0);

  const netDebtPosition = totalLent - totalBorrowed;

  const filteredDebts = debts.filter((d) => {
    if (debtFilter === "lent") return d.type === "lent";
    if (debtFilter === "borrowed") return d.type === "borrowed";
    return true;
  });

  const toggleReminder = (id: string) => {
    setDebts((prev) =>
      prev.map((d) => {
        if (d.id === id) {
          const nextState = !d.hasReminder;
          if (nextState) {
            showToast(`🔔 Reminder set for ${d.name} (${d.type === "lent" ? "Collect" : "Pay"} ₹${d.amount.toLocaleString("en-IN")})`);
          } else {
            showToast(`Notifications turned off for ${d.name}`);
          }
          return { ...d, hasReminder: nextState };
        }
        return d;
      })
    );
  };

  const toggleSettled = (id: string) => {
    setDebts((prev) =>
      prev.map((d) => {
        if (d.id === id) {
          const nextState = !d.isSettled;
          showToast(nextState ? `Marked debt with ${d.name} as Settled!` : `Reopened debt with ${d.name}`);
          return { ...d, isSettled: nextState };
        }
        return d;
      })
    );
  };

  const handleAddDebt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDebtName.trim() || !newDebtAmount || Number(newDebtAmount) <= 0) return;

    const created: DebtItem = {
      id: Math.random().toString(36).substring(2, 9),
      name: newDebtName.trim(),
      amount: Number(newDebtAmount),
      type: newDebtType,
      dueDate: newDebtDueDate,
      note: newDebtNote.trim(),
      isSettled: false,
      hasReminder: newDebtEnableReminder,
      reminderDate: newDebtDueDate,
    };

    setDebts((prev) => [created, ...prev]);
    setIsAddDebtOpen(false);

    // Reset Form
    setNewDebtName("");
    setNewDebtAmount("");
    setNewDebtNote("");
    setNewDebtType("lent");

    showToast(`Added ${created.type === "lent" ? "Lent" : "Borrowed"} record for ${created.name}`);
  };

  return (
    <AppShell className="min-h-screen pb-32 bg-white text-slate-900 selection:bg-slate-900 selection:text-white">
      {/* Dynamic Toast Banner */}
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-4 py-3 bg-white border border-slate-200 text-slate-800 text-sm font-medium rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.06)] animate-in fade-in slide-in-from-bottom-5 duration-200 flex items-center gap-2">
          <span>{toast}</span>
        </div>
      )}

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
            <img src="/logo.jpg" alt="Expencio Logo" className="w-full h-full object-cover scale-[1.35]" />
          </div>
        </Container>
      </header>

      {/* Main Content */}
      <Container size="md" className="pt-4 px-4">
        <Stack gap={6}>
          
          {/* ==================== 1. FINANCIAL GOALS (Linear + Notion Light Design) ==================== */}
          <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-6 flex flex-col gap-6 shadow-2xl">
            {/* Ambient glow effects */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-rose-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3 pointer-events-none" />

            {/* Top Summary Header Area */}
            <div className="flex flex-col gap-3 pb-5 border-b border-slate-800/60 relative z-10">
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
                      description: "Set target savings limits (e.g. Emergency Fund, New Bike, Vacation) and log deposit progress.",
                      highlights: [
                        { title: "Progress Percentage", desc: "Calculated in real-time as (Current Amount / Target Amount) × 100%." },
                        { title: "Priority Tagging", desc: "Organize goals by Low, Medium, or High priority." },
                        { title: "Quick Deposit", desc: "Tap '+ Deposit' on any goal card to add funds toward your target." }
                      ]
                    }}
                    theme="dark"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleOpenNewGoal}
                  className="px-3.5 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 text-xs font-medium transition-all duration-150 active:scale-[0.98] cursor-pointer flex items-center gap-1.5 backdrop-blur-sm"
                >
                  <Plus size={14} className="text-slate-400" />
                  <span>Add Goal</span>
                </button>
              </div>

              {/* Summary Amount & Subtitle */}
              <div className="flex flex-col gap-1 mt-1">
                <span className="text-3xl font-bold text-white tracking-tight">
                  ₹{totalSavedAcrossGoals.toLocaleString("en-IN")}
                </span>
                <span className="text-sm text-slate-400 font-normal">
                  {overallGoalProgressPct.toFixed(0)}% of ₹{totalTargetAcrossGoals.toLocaleString("en-IN")} saved
                </span>
              </div>

              {/* Slim Progress Bar (5px height) */}
              <div className="w-full h-[5px] bg-slate-800 rounded-full overflow-hidden mt-1 shadow-inner">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${overallGoalProgressPct}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className="h-full bg-indigo-500 rounded-full shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                />
              </div>
            </div>

            {/* Individual Goal List Items */}
            <div className="flex flex-col gap-5">
              {goals.length === 0 ? (
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

                  return (
                    <div
                      key={g.id}
                      className={cn(
                        "group flex flex-col gap-2.5 p-4 rounded-xl border transition-all duration-150 relative z-10 backdrop-blur-md",
                        g.color === "blue" ? "bg-blue-500/5 border-blue-500/20 hover:border-blue-500/40 hover:bg-blue-500/10" :
                        g.color === "teal" ? "bg-teal-500/5 border-teal-500/20 hover:border-teal-500/40 hover:bg-teal-500/10" :
                        g.color === "green" ? "bg-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/40 hover:bg-emerald-500/10" :
                        g.color === "purple" ? "bg-purple-500/5 border-purple-500/20 hover:border-purple-500/40 hover:bg-purple-500/10" :
                        g.color === "pink" ? "bg-pink-500/5 border-pink-500/20 hover:border-pink-500/40 hover:bg-pink-500/10" :
                        g.color === "orange" ? "bg-orange-500/5 border-orange-500/20 hover:border-orange-500/40 hover:bg-orange-500/10" :
                        "bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/10"
                      )}
                    >
                      {/* Badge + Actions Header */}
                      <div className="flex items-center justify-between">
                        {/* Subtle Priority Dot Indicator */}
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-black/20 rounded-md border border-white/5">
                          <span className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            g.priority === 'low' ? 'bg-emerald-400' : g.priority === 'high' ? 'bg-rose-400' : 'bg-amber-400'
                          )} />
                          <span className="text-[9px] uppercase font-bold text-slate-300 tracking-wider">
                            {g.priority || 'Medium'}
                          </span>
                        </div>

                        {/* Actions: Deposit (Primary), Edit (Ghost), Delete (Ghost) */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenDeposit(g.id, g.title)}
                            className={cn(
                              "h-7 px-3 rounded-full text-[11px] font-bold uppercase tracking-wider transition-all duration-150 active:scale-[0.98] cursor-pointer flex items-center gap-1.5 shadow-sm border",
                              g.color === "blue" ? "bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20" :
                              g.color === "teal" ? "bg-teal-500/10 text-teal-400 border-teal-500/20 hover:bg-teal-500/20" :
                              g.color === "green" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20" :
                              g.color === "purple" ? "bg-purple-500/10 text-purple-400 border-purple-500/20 hover:bg-purple-500/20" :
                              g.color === "pink" ? "bg-pink-500/10 text-pink-400 border-pink-500/20 hover:bg-pink-500/20" :
                              g.color === "orange" ? "bg-orange-500/10 text-orange-400 border-orange-500/20 hover:bg-orange-500/20" : 
                              "bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20"
                            )}
                          >
                            <ArrowUpDown size={12} className="text-current" />
                            <span>Manage</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenEditGoal(g)}
                            aria-label="Edit Goal"
                            className="w-7 h-7 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-all duration-150 flex items-center justify-center cursor-pointer"
                          >
                            <Pencil size={13} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteGoal(g.id, g.title)}
                            aria-label="Delete Goal"
                            className="w-7 h-7 rounded-full hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 transition-all duration-150 flex items-center justify-center cursor-pointer"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      {/* Goal Title */}
                      <h4 className="text-base font-semibold text-white tracking-tight drop-shadow-sm">
                        {g.title}
                      </h4>

                      {/* Amount & Percentage Row */}
                      <div className="flex items-baseline justify-between text-sm">
                        <span className="font-medium text-white">
                          ₹{currentAmount.toLocaleString("en-IN")}{" "}
                          <span className="text-slate-400 font-normal">/ ₹{targetAmount.toLocaleString("en-IN")}</span>
                        </span>
                        <span className="font-semibold text-slate-300">{progressPct.toFixed(0)}%</span>
                      </div>

                      {/* Slim Progress Bar (5px height) */}
                      <div className={cn(
                        "w-full h-[5px] rounded-full overflow-hidden shadow-inner",
                        g.color === "blue" ? "bg-blue-900/40" :
                        g.color === "teal" ? "bg-teal-900/40" :
                        g.color === "green" ? "bg-emerald-900/40" :
                        g.color === "purple" ? "bg-purple-900/40" :
                        g.color === "pink" ? "bg-pink-900/40" :
                        g.color === "orange" ? "bg-orange-900/40" : "bg-blue-900/40"
                      )}>
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${progressPct}%` }}
                          transition={{ duration: 1, ease: "easeOut", delay: 0.1 }}
                          className={cn(
                            "h-full rounded-full shadow-[0_0_8px_rgba(255,255,255,0.4)]",
                            g.color === "blue" ? "bg-blue-400" :
                            g.color === "teal" ? "bg-teal-400" :
                            g.color === "green" ? "bg-emerald-400" :
                            g.color === "purple" ? "bg-purple-400" :
                            g.color === "pink" ? "bg-pink-400" :
                            g.color === "orange" ? "bg-orange-400" : "bg-blue-400"
                          )}
                        />
                      </div>

                      {/* Muted Caption Row with Remaining & Target Ending Date */}
                      <div className="flex items-center justify-between text-xs text-slate-400 font-normal">
                        <span>₹{remaining.toLocaleString("en-IN")} remaining</span>
                        {g.targetDate && (
                          <span className="text-slate-400">Target: {formatGoalDate(g.targetDate)}</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>



          {/* ==================== 3. DEBT & LOAN TRACKER (Simplified Linear Design) ==================== */}
          <section className="bg-white border border-slate-200/60 rounded-3xl p-6 flex flex-col gap-5 shadow-sm mt-4">
            {/* Header + Add Debt Button (Rule #13) */}
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-slate-900 tracking-tight">
                  Debt & Loan Tracker
                </h3>
                <span className="text-[9px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-500 px-2 py-1 rounded-full">
                  Coming Soon
                </span>
              </div>

              <button
                type="button"
                onClick={() => setIsAddDebtOpen(true)}
                className="px-3.5 py-1.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white shadow-xs text-[13px] font-medium transition-all duration-150 active:scale-[0.98] cursor-pointer flex items-center gap-1.5"
              >
                <Plus size={14} className="text-white" />
                <span>Add Record</span>
              </button>
            </div>

            {/* Summary Metrics - No Inner Card, No Vertical Borders, Pure Typography & Spacing (Rule #6 & #13) */}
            <div className="border-b border-slate-100 pb-5">
              <div className="grid grid-cols-3 gap-4 pt-1">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider truncate">
                    To Collect
                  </span>
                  <span className="text-lg font-bold text-emerald-600 tracking-tight tabular-nums truncate">
                    {totalLent.toLocaleString("en-IN")}
                  </span>
                </div>

                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider truncate">
                    To Pay
                  </span>
                  <span className="text-lg font-bold text-rose-600 tracking-tight tabular-nums truncate">
                    {totalBorrowed.toLocaleString("en-IN")}
                  </span>
                </div>

                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider truncate">
                    Balance
                  </span>
                  <span
                    className={cn(
                      "text-lg font-bold tracking-tight tabular-nums truncate",
                      netDebtPosition >= 0 ? "text-slate-900" : "text-rose-600"
                    )}
                  >
                    {netDebtPosition >= 0 ? "+" : ""}{netDebtPosition.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
            </div>

            {/* Filter Segmented Pills: All | Lent | Borrowed */}
            <div className="flex items-center justify-between overflow-x-auto no-scrollbar border-b border-slate-100 pb-2">
              <div className="flex items-center gap-4">
                {(["all", "lent", "borrowed"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setDebtFilter(tab)}
                    className={cn(
                      "text-[12px] font-bold tracking-wider uppercase transition-all duration-150 cursor-pointer whitespace-nowrap relative pb-1",
                      debtFilter === tab
                        ? "text-slate-900"
                        : "text-slate-400 hover:text-slate-600"
                    )}
                  >
                    {tab === "all" ? "All" : tab === "lent" ? "To Collect" : "To Pay"}
                    {debtFilter === tab && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-900 rounded-full" />
                    )}
                  </button>
                ))}
              </div>
              <span className="text-[10px] font-semibold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0">
                Amounts in ₹
              </span>
            </div>

            {/* Debt Rows List (Rules #1, #2, #3, #4, #5, #7, #8, #9, #10, #11, #12) */}
            <div className="pt-1">
              {filteredDebts.length === 0 ? (
                /* Friendly Empty State (Rule #11) */
                <div className="py-12 flex flex-col items-center justify-center text-center gap-3 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 p-6">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                    <Calendar size={18} />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <h4 className="text-sm font-semibold text-slate-900">No debts yet</h4>
                    <p className="text-xs text-slate-500 max-w-xs">
                      Track money you've lent or borrowed from friends effortlessly.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAddDebtOpen(true)}
                    className="mt-1 px-4 py-1.5 rounded-full bg-slate-900 text-white text-xs font-medium hover:bg-slate-800 transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
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
                      /* Settled Row (Rule #10 - Archived look, low opacity, clean text link instead of disabled buttons) */
                      return (
                        <div
                          key={d.id}
                          className="py-2.5 grid grid-cols-[12px_minmax(0,1fr)_80px_35px] items-center opacity-40 hover:opacity-75 transition-opacity group cursor-pointer rounded-lg"
                          onClick={() => toggleSettled(d.id)}
                        >
                          {/* Dot Indicator */}
                          <div className="flex items-center justify-center">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                          </div>

                          {/* Name & Details */}
                          <div className="flex flex-col gap-0.5 min-w-0 pr-2 pl-1.5">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-[14px] text-slate-700 tracking-tight truncate line-through">
                                {d.name}
                              </span>
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase bg-slate-100 text-slate-500">
                                Settled
                              </span>
                            </div>
                            {d.note && <span className="text-[12px] text-slate-400 font-normal truncate line-through">{d.note}</span>}
                          </div>

                          {/* Tabular Amount */}
                          <div className="text-right">
                            <span className="font-semibold text-[14px] sm:text-[15px] tabular-nums text-slate-400 line-through">
                              {d.type === "lent" ? "+" : "-"}{d.amount.toLocaleString("en-IN")}
                            </span>
                          </div>

                          {/* Reopen Action */}
                          <div className="relative flex justify-end">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleSettled(d.id);
                              }}
                              className="text-[10px] sm:text-[11px] font-semibold text-slate-400 hover:text-slate-700 underline cursor-pointer pr-1"
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
                        className="py-2.5 grid grid-cols-[12px_minmax(0,1fr)_80px_35px] items-center hover:bg-slate-50/50 rounded-lg transition-colors relative group cursor-pointer"
                      >
                        {/* Dot Indicator */}
                        <div className="flex items-center justify-center">
                          <span
                            className={cn(
                              "w-1.5 h-1.5 rounded-full",
                              d.type === "lent" ? "bg-emerald-500" : "bg-rose-500"
                            )}
                          />
                        </div>

                        {/* Name & Details */}
                        <div className="flex flex-col gap-0.5 min-w-0 pr-2 pl-1.5">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-[14px] text-slate-900 tracking-tight truncate">
                              {d.name}
                            </span>

                            {/* Minimal Tag */}
                            <span
                              className={cn(
                                "px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase",
                                d.type === "lent"
                                  ? "bg-emerald-50 text-emerald-600"
                                  : "bg-rose-50 text-rose-600"
                              )}
                            >
                              {d.type === "lent" ? "Get" : "Pay"}
                            </span>

                            {d.hasReminder && (
                              <BellRing size={11} className="text-sky-500 shrink-0" />
                            )}
                          </div>

                          <span className="text-[12px] text-slate-500 font-normal truncate">
                            {d.note ? `${d.note} • ` : ""}{formatNaturalDueDate(d.dueDate)}
                          </span>
                        </div>

                        {/* Tabular Amount */}
                        <div className="text-right">
                          <span
                            className={cn(
                              "font-semibold text-[14px] sm:text-[15px] tabular-nums",
                              d.type === "lent" ? "text-emerald-600" : "text-slate-900"
                            )}
                          >
                            {d.type === "lent" ? "+" : "-"}{d.amount.toLocaleString("en-IN")}
                          </span>
                        </div>

                        {/* Menu */}
                        <div className="relative flex justify-end">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveDebtMenuId((prev) => (prev === d.id ? null : d.id));
                            }}
                            className="w-7 h-7 rounded-md hover:bg-slate-200/60 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
                            aria-label="Options"
                          >
                            <MoreVertical size={14} />
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
                                    setDebts((prev) => prev.filter((item) => item.id !== d.id));
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
                  Target Amount (₹)
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
                  Already Saved (₹)
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
                  {depositMode === "deduct" ? "Deduction Amount (₹)" : "Amount to Add (₹)"}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <form
            onSubmit={handleAddDebt}
            className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl p-5 shadow-xl flex flex-col gap-4 animate-in zoom-in-95 duration-150 text-slate-900"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-semibold text-base text-slate-900">Add Debt / Loan Record</h3>
              <button
                type="button"
                onClick={() => setIsAddDebtOpen(false)}
                className="w-7 h-7 rounded-lg bg-slate-100 text-slate-500 hover:text-slate-800 hover:bg-slate-200 flex items-center justify-center"
              >
                <X size={15} />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              {/* Type Toggle */}
              <div className="flex items-center p-1 bg-slate-100 rounded-full border border-slate-200">
                <button
                  type="button"
                  onClick={() => setNewDebtType("lent")}
                  className={cn(
                    "flex-1 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 text-center cursor-pointer",
                    newDebtType === "lent"
                      ? "bg-white text-emerald-700 shadow-xs border border-slate-200"
                      : "text-slate-500 hover:text-slate-900"
                  )}
                >
                  Lent (I gave)
                </button>
                <button
                  type="button"
                  onClick={() => setNewDebtType("borrowed")}
                  className={cn(
                    "flex-1 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 text-center cursor-pointer",
                    newDebtType === "borrowed"
                      ? "bg-white text-rose-700 shadow-xs border border-slate-200"
                      : "text-slate-500 hover:text-slate-900"
                  )}
                >
                  Borrowed (I owe)
                </button>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                  Person Name
                </label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Rahul"
                  value={newDebtName}
                  onChange={(e) => setNewDebtName(e.target.value)}
                  className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-400 focus:bg-white placeholder:text-slate-400"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                  Amount (₹)
                </label>
                <input
                  required
                  type="number"
                  placeholder="0"
                  value={newDebtAmount}
                  onChange={(e) => setNewDebtAmount(e.target.value)}
                  className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-400 focus:bg-white placeholder:text-slate-400"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                  Due Date
                </label>
                <input
                  type="date"
                  value={newDebtDueDate}
                  onChange={(e) => setNewDebtDueDate(e.target.value)}
                  className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-400 focus:bg-white placeholder:text-slate-400"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                  Note / Reason (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Trip expenses"
                  value={newDebtNote}
                  onChange={(e) => setNewDebtNote(e.target.value)}
                  className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-400 focus:bg-white placeholder:text-slate-400"
                />
              </div>

              <label className="flex items-center gap-2 pt-1 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={newDebtEnableReminder}
                  onChange={(e) => setNewDebtEnableReminder(e.target.checked)}
                  className="w-4 h-4 rounded bg-slate-50 border-slate-300 text-slate-900 focus:ring-0 cursor-pointer"
                />
                <span className="text-xs font-medium text-slate-700">Set automatic due date reminder</span>
              </label>
            </div>

            <button
              type="submit"
              className="w-full h-10 mt-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-semibold text-xs transition-all duration-150 active:scale-[0.98] cursor-pointer shadow-xs"
            >
              Save Debt Record
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
              {/* Currency Preference */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Default Currency
                </label>
                <select
                  value={currencyPref}
                  onChange={(e) => {
                    setCurrencyPref(e.target.value);
                    showToast(`Updated currency to ${e.target.value}`);
                  }}
                  className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-400 cursor-pointer"
                >
                  <option value="₹ (INR)">₹ - Indian Rupee (INR)</option>
                  <option value="$ (USD)">$ - US Dollar (USD)</option>
                  <option value="€ (EUR)">€ - Euro (EUR)</option>
                  <option value="£ (GBP)">£ - British Pound (GBP)</option>
                </select>
              </div>

              {/* Push Notifications Switch */}
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
