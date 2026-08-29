import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Trash2, ChevronDown, Keyboard, Wifi, WifiOff, RefreshCw, X, ArrowDown, TrendingUp, HelpCircle } from "lucide-react";
import { OnboardingTour } from "../components/OnboardingTour";
import { SectionInfoModal } from "../components/SectionInfoModal";
import {
  AppShell,
  Container,
  Stack,
  MonthSummary,
  NoteTransactionRow,
  HeroActionButton,
  CaptureSheet,
  CurrencyField,
  ReceiptSessionList,
  DateSlider,
  type ReceiptItem,
  cn,
} from "@expenseflow/ui";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { type TransactionCreatePayload } from "../core/api/expense-sessions";
import { TransactionsApi } from "../core/api/transactions";
import { ulid } from "ulid";
import { useAnalytics } from "../core/api/analytics";
import { useSyncEngine } from "../core/sync/SyncEngine";
import { queue } from "../core/sync/db";
import { useAuth } from "../core/providers/AuthContext";
import { CURRENCIES } from "../constants/currencies";
import { formatCurrency } from "../utils/currency";

export interface ExpenseEntry {
  id: string;
  title: string;
  amount: number;
  dateGroup: "Today" | "Yesterday" | "Earlier";
  type?: "expense" | "income";
  spentAt?: string;
  superiorCategory?: string | null;
}

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [currencyVal, setCurrencyVal] = useState<number | undefined>(undefined);
  const [entryType, setEntryType] = useState<"expense" | "income">("expense");
  const [editingTransaction, setEditingTransaction] = useState<ExpenseEntry | null>(null);

  const superiorCategoryPresets = [
    "Food & Dining",
    "Transportation",
    "Housing & Bills",
    "Shopping",
    "Health & Wellness",
    "Entertainment",
    "Travel",
    "Education",
    "Personal & Lifestyle",
    "Financial",
    "Other",
  ];

  const [selectedSuperiorCategory, setSelectedSuperiorCategory] = useState<string>("");
  const [isSuperiorDropdownOpen, setIsSuperiorDropdownOpen] = useState(false);
  const superiorDropdownRef = useRef<HTMLDivElement>(null);

  const [expenseCategories, setExpenseCategories] = useState([
    "Food & Dining",
    "Coffee & Snacks",
    "Transport / Fuel",
    "Shopping & Retail",
    "Bills & Subscriptions",
    "Entertainment",
    "Health & Fitness",
    "Travel & Lodging",
    "General Expense",
  ]);

  const [incomeCategories, setIncomeCategories] = useState([
    "Salary / Paycheck",
    "Freelance / Client",
    "Investments / Dividends",
    "Gift / Bonus",
    "Refund / Cashback",
    "Other Income",
  ]);

  const [selectedCategory, setSelectedCategory] = useState<string>("Food & Dining");
  const [selectedDateTag, setSelectedDateTag] = useState<"Today" | "Yesterday" | "Custom">("Today");
  const [customDate, setCustomDate] = useState<string>(new Date().toISOString().split("T")[0]);

  const [expenseName, setExpenseName] = useState<string>("");
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const categoryBtnRef = useRef<HTMLButtonElement>(null);
  const categoryInputRef = useRef<HTMLInputElement>(null);
  const currencyInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isSheetOpen) {
      setTimeout(() => {
        categoryBtnRef.current?.focus();
      }, 100);
    }
  }, [isSheetOpen]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsCategoryDropdownOpen(false);
      }
      if (superiorDropdownRef.current && !superiorDropdownRef.current.contains(e.target as Node)) {
        setIsSuperiorDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const [receiptItems, setReceiptItems] = useState<ReceiptItem[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isTourOpen, setIsTourOpen] = useState(false);
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { enqueue, enqueueMany, pendingCount, syncStatus, isOnline } = useSyncEngine();

  const userCurrency = user?.currency || "INR";
  const userCurrencySymbol = CURRENCIES.find(c => c.code === userCurrency)?.symbol || "₹";

  // Auto-start guided onboarding tour for first-time logged-in users
  useEffect(() => {
    if (user?.id) {
      const tourKey = `expencio_tour_seen_${user.id}`;
      const tourSeen = localStorage.getItem(tourKey);
      if (!tourSeen) {
        setIsTourOpen(true);
      }
    }
  }, [user?.id]);

  const { data: serverTransactions = [] } = useQuery({
    queryKey: ["transactions"],
    queryFn: async () => {
      const serverData = await TransactionsApi.getAll();
      if (!user?.id) return serverData;
      
      const pending = await queue.getAll(user.id);
      
      // 1. Filter out pending deletes
      const pendingDeletes = new Set(pending.filter(t => t.action === 'DELETE').map(t => t.clientGeneratedId));
      let visibleServer = serverData.filter(t => !pendingDeletes.has(t.id));
      
      // 2. Apply pending updates
      const pendingUpdates = new Map(pending.filter(t => t.action === 'UPDATE').map(t => [t.clientGeneratedId, t]));
      visibleServer = visibleServer.map(t => {
        if (pendingUpdates.has(t.id)) {
          const update = pendingUpdates.get(t.id)!;
          // BUG FIX: category must never substitute for description.
          // Use the explicitly updated description if provided; otherwise preserve
          // the existing server-side description. Never fall back to category.
          return { ...t, amount: update.amount.toString(), description: update.description ?? t.description, category: update.category, superiorCategory: update.superiorCategory, type: update.type, spentAt: update.spentAt };
        }
        return t;
      });
      
      // 3. Prepend pending creates (ignoring any that are already in the server data)
      const serverIds = new Set(serverData.map(t => t.id));
      const pendingCreates = pending
        .filter(t => (t.action === 'CREATE' || !t.action) && !serverIds.has(t.clientGeneratedId))
        .map(t => ({
          id: t.clientGeneratedId,
          sessionId: "pending",
          userId: user.id,
          // BUG FIX: category must never substitute for description.
          // Show empty string rather than silently using the category as the title.
          description: t.description ?? '',
          category: t.category,
          superiorCategory: t.superiorCategory,
          amount: t.amount.toString(),
          spentAt: t.spentAt,
          type: t.type || "expense",
          status: "pending",
          currency: t.currency,
          note: t.note || null,
          createdAt: t.queuedAt,
          updatedAt: t.queuedAt,
          deletedAt: null
        }));
        
      return [...pendingCreates, ...visibleServer].sort((a, b) => new Date(b.spentAt).getTime() - new Date(a.spentAt).getTime());
    }
  });

  const date = new Date();
  const year = date.getFullYear();
  const month = date.getMonth();
  const from = new Date(year, month, 1, 0, 0, 0, 0).toISOString();
  const lastDay = new Date(year, month + 1, 0).getDate();
  const to = new Date(year, month, lastDay, 23, 59, 59, 999).toISOString();
  const { data: analyticsData } = useAnalytics(from, to);

  const todayStr = new Date().toLocaleDateString('en-CA');
  const filteredDailyData = analyticsData?.dailyData?.filter((d: any) => d.fullDateStr <= todayStr);

  // Grouped Expense Data
  const groupedExpenses = React.useMemo(() => {
    const groups: { [key: string]: { label: string; date: Date; expenses: ExpenseEntry[]; total: number } } = {};
    
    serverTransactions.forEach(t => {
      const spentAt = new Date(t.spentAt);
      const dateKey = new Date(spentAt.getFullYear(), spentAt.getMonth(), spentAt.getDate()).toISOString();
      
      if (!groups[dateKey]) {
        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(today.getDate() - 1);
        
        let label = spentAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
        if (spentAt.toDateString() === today.toDateString()) {
          label = "Today";
        } else if (spentAt.toDateString() === yesterday.toDateString()) {
          label = "Yesterday";
        }
        
        groups[dateKey] = {
          label,
          date: new Date(dateKey),
          expenses: [],
          total: 0
        };
      }
      
      const amount = parseFloat(t.amount);
      
      // Determine if transaction is an income based on category keywords
      // since the backend doesn't explicitly store a 'type' column yet.
      const incomeKeywords = ["salary", "paycheck", "freelance", "client", "investment", "dividend", "gift", "bonus", "refund", "cashback", "income"];
      const categoryStr = t.note || t.category || "";
      const isIncome = incomeKeywords.some(kw => categoryStr.toLowerCase().includes(kw));
      const type = (t as any).type || (isIncome ? "income" : "expense");
      
      groups[dateKey].expenses.push({
        id: t.id,
        // BUG FIX: category is analysis metadata and must never appear as the
        // main transaction title. Use description (user-entered), then note
        // (user-entered memo), then empty string. Never fall back to category.
        title: t.description || t.note || '',
        amount,
        dateGroup: groups[dateKey].label as any,
        type,
        spentAt: t.spentAt,
        superiorCategory: t.superiorCategory,
      });
      
      groups[dateKey].total += type === "income" ? -amount : amount;
    });
    
    return Object.values(groups).sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [serverTransactions]);

  // Calculate today's total specifically for the summary card if needed
  const todayGroup = groupedExpenses.find(g => g.label === "Today");
  const todayTotal = todayGroup ? todayGroup.total : 0;


  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const getDateLabel = () => {
    if (selectedDateTag === "Today") return "Today";
    if (selectedDateTag === "Yesterday") return "Yesterday";
    return customDate;
  };

  const handleAddAnother = () => {
    if (!currencyVal) {
      showToast("Please enter an amount.");
      return;
    }
    
    let finalCategory = selectedCategory;
    const wasAdding = isAddingCategory;
    if (isAddingCategory) {
      if (newCategoryName.trim()) {
        finalCategory = newCategoryName.trim();
        if (entryType === "expense") {
          setExpenseCategories((prev) => [...prev, finalCategory]);
        } else {
          setIncomeCategories((prev) => [...prev, finalCategory]);
        }
        setSelectedCategory(finalCategory);
      } else {
        showToast("Please enter a category name.");
        return;
      }
    }

    if (!finalCategory) {
      showToast("Please select a category.");
      return;
    }
    
    const newItem: ReceiptItem = {
      id: Math.random().toString(36).substring(2, 9),
      label: finalCategory,
      amount: currencyVal,
      type: entryType,
      date: getDateLabel(),
      currencySymbol: userCurrencySymbol,
    };
    setReceiptItems((prev) => [...prev, newItem]);
    setCurrencyVal(undefined);
    setNewCategoryName("");
    
    if (!wasAdding) {
      setIsAddingCategory(false);
    }
    
    showToast(`Added ${entryType === "income" ? "+" : "-"}${formatCurrency(Number(currencyVal), userCurrency)} (${finalCategory})`);
    
    // Focus back to category section
    setTimeout(() => {
      if (wasAdding) {
        categoryInputRef.current?.focus();
      } else {
        categoryBtnRef.current?.focus();
      }
    }, 50);
  };

  const handleDeleteClick = async (exp: ExpenseEntry) => {
    // Optimistic: update React Query cache immediately
    queryClient.setQueryData(["transactions"], (old: any) => {
      if (!old) return old;
      return old.filter((t: any) => t.id !== exp.id);
    });

    // Optimistic analytics update
    queryClient.setQueriesData({ queryKey: ["analytics"] }, (old: any) => {
      if (!old) return old;
      const amount = parseFloat(exp.amount.toString());
      return {
        ...old,
        totalSpent: exp.type === "expense" ? old.totalSpent - amount : old.totalSpent,
        totalIncome: exp.type === "income" ? old.totalIncome - amount : old.totalIncome,
        netCashFlow: exp.type === "income" ? old.netCashFlow - amount : old.netCashFlow + amount
      };
    });

    // Enqueue deletion offline
    await enqueue({
      action: "DELETE",
      clientGeneratedId: exp.id,
      amount: exp.amount,
      currency: userCurrency,
      description: exp.title,
      category: exp.title,
      spentAt: new Date().toISOString(),
      type: exp.type || "expense",
    });
    
    showToast(`Deleted ${exp.title}`);
  };

  const getSpentAtISO = (dateStr: string) => {
    if (!dateStr) return new Date().toISOString();
    const parts = dateStr.split("-").map(Number);
    if (parts.length < 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) {
      return new Date().toISOString();
    }
    const [y, m, d] = parts;
    const dateObj = new Date(y, m - 1, d, 12, 0, 0);
    return dateObj.toISOString();
  };

  const handleEditClick = (exp: ExpenseEntry) => {
    setEditingTransaction(exp);
    setCurrencyVal(exp.amount);
    // Restore the expense name and category separately:
    // exp.title is the stored description (user-typed name).
    // We try to find if it matches a known category — if not, it's a custom name.
    const allKnownCats = [...expenseCategories, ...incomeCategories];
    if (allKnownCats.includes(exp.title)) {
      // Old-style entry: name === category, blank out separate name field
      setExpenseName("");
      setSelectedCategory(exp.title);
      setNewCategoryName("");
    } else {
      setExpenseName(exp.title);
      setSelectedCategory(expenseCategories[0]);
      setNewCategoryName("");
    }
    setSelectedSuperiorCategory(exp.superiorCategory || "");
    setEntryType(exp.type || "expense");
    setIsAddingCategory(false);

    if (exp.spentAt) {
      const d = new Date(exp.spentAt);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      const formattedDate = `${yyyy}-${mm}-${dd}`;

      setCustomDate(formattedDate);

      const todayStr = new Date().toLocaleDateString('en-CA');
      const yesterdayObj = new Date();
      yesterdayObj.setDate(yesterdayObj.getDate() - 1);
      const yesterdayStr = yesterdayObj.toLocaleDateString('en-CA');

      if (formattedDate === todayStr) {
        setSelectedDateTag("Today");
      } else if (formattedDate === yesterdayStr) {
        setSelectedDateTag("Yesterday");
      } else {
        setSelectedDateTag("Custom");
      }
    }

    setIsSheetOpen(true);
  };

  const handleDone = async () => {
    if (!currencyVal && receiptItems.length === 0) {
      showToast("Please enter an amount.");
      return;
    }

    let finalCategory = selectedCategory;
    if (currencyVal) {
      if (isAddingCategory) {
        if (newCategoryName.trim()) {
          finalCategory = newCategoryName.trim();
          if (entryType === "expense") {
            setExpenseCategories((prev) => [...prev, finalCategory]);
          } else {
            setIncomeCategories((prev) => [...prev, finalCategory]);
          }
          setSelectedCategory(finalCategory);
        } else {
          showToast("Please enter a category name.");
          return;
        }
      }
      if (!finalCategory) {
        showToast("Please select a category.");
        return;
      }
    }

    // The description (displayed name) is the user-typed name if provided,
    // otherwise fall back to the selected category name.
    const finalDescription = expenseName.trim() || finalCategory;

    const finalSuperiorCategory = selectedSuperiorCategory.trim() ? selectedSuperiorCategory.trim() : null;
    const selectedSpentAtISO = getSpentAtISO(customDate);

    // Check if there is an unadded amount in the input field
    const apiTransactions: TransactionCreatePayload[] = [];
    const uiTransactions: ExpenseEntry[] = [];

    if (currencyVal) {
      const cid = ulid();
      uiTransactions.push({
        id: cid,
        title: finalDescription,
        amount: currencyVal,
        dateGroup: selectedDateTag === "Yesterday" ? "Yesterday" : selectedDateTag === "Today" ? "Today" : "Earlier",
        type: entryType,
        spentAt: selectedSpentAtISO,
        superiorCategory: finalSuperiorCategory,
      });
      apiTransactions.push({
        clientGeneratedId: cid,
        amount: currencyVal,
        description: finalDescription,
        category: finalCategory,
        superiorCategory: finalSuperiorCategory,
        spentAt: selectedSpentAtISO,
        currency: userCurrency,
        type: entryType
      });
    }

    // Add all batched receipt session items
    receiptItems.forEach((item) => {
      const cid = ulid();
      uiTransactions.push({
        id: cid,
        title: item.label,
        amount: item.amount,
        dateGroup: item.date === "Yesterday" ? "Yesterday" : "Today",
        type: item.type || "expense",
        spentAt: selectedSpentAtISO,
        superiorCategory: finalSuperiorCategory,
      });
      apiTransactions.push({
        clientGeneratedId: cid,
        amount: item.amount,
        description: item.label,
        category: item.label,
        superiorCategory: finalSuperiorCategory,
        spentAt: selectedSpentAtISO,
        currency: userCurrency,
        type: item.type || "expense"
      });
    });

    if (uiTransactions.length > 0) {
      if (editingTransaction) {
        const tx = apiTransactions[0];
        if (tx) {
          // Optimistic update
          queryClient.setQueryData(["transactions"], (old: any) => {
            if (!old) return old;
            return old.map((t: any) => 
              t.id === editingTransaction.id 
                ? { ...t, description: tx.description, category: tx.category, superiorCategory: tx.superiorCategory, amount: tx.amount.toString(), spentAt: tx.spentAt, type: tx.type } 
                : t
            );
          });
          queryClient.invalidateQueries({ queryKey: ["analytics"] });

          await enqueue({
            action: "UPDATE",
            clientGeneratedId: editingTransaction.id,
            amount: tx.amount,
            description: tx.description,
            category: tx.category,
            superiorCategory: tx.superiorCategory,
            spentAt: tx.spentAt,
            currency: tx.currency || userCurrency,
            type: (tx.type as 'expense' | 'income') || "expense",
          });
        }
      } else {
        // Optimistic: update the React Query cache immediately so UI responds instantly
        queryClient.setQueryData(["transactions"], (old: any) => {
          const optimistic = apiTransactions.map((t, index) => ({
            id: t.clientGeneratedId,
            description: t.description,
            category: t.category,
            superiorCategory: t.superiorCategory,
            amount: t.amount.toString(),
            spentAt: t.spentAt,
            type: uiTransactions[index]?.type || "expense",
            status: "pending"
          }));
          return [...optimistic, ...(old || [])];
        });
        queryClient.invalidateQueries({ queryKey: ["analytics"] });

        // Enqueue offline creation atomically
        const pendingTxs = apiTransactions.map((tx, i) => ({
          action: "CREATE" as const,
          clientGeneratedId: tx.clientGeneratedId,
          amount: tx.amount,
          currency: tx.currency || userCurrency,
          description: tx.description,
          category: tx.category,
          superiorCategory: tx.superiorCategory,
          spentAt: tx.spentAt,
          type: (uiTransactions[i]?.type as 'expense' | 'income') || "expense",
        }));
        await enqueueMany(pendingTxs);
      }
      
      showToast(editingTransaction ? "Expense updated" : `Saved ${apiTransactions.length} transaction(s)`);
    }

    setIsSheetOpen(false);
    setReceiptItems([]);
    setCurrencyVal(undefined);
    setExpenseName("");
    setSelectedSuperiorCategory("");
    setEditingTransaction(null);
  };

  return (
    <AppShell className="bg-slate-50 min-h-screen pb-28 selection:bg-slate-900 selection:text-white">
      {/* Onboarding Guided Tour Modal */}
      <OnboardingTour isOpen={isTourOpen} onClose={() => setIsTourOpen(false)} />

      <Container size="sm" className="pt-12 sm:pt-14">
        <Stack gap={6}>
          {/* Dashboard Header */}
          <div className="flex items-center justify-between px-2 pb-2">
            <div className="font-bold text-slate-900 flex items-center gap-2 tracking-tight">
              <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center shrink-0 shadow-sm border border-slate-200">
                <img src="/logo.jpg" alt="Expencio Logo" className="w-full h-full object-cover scale-[1.35]" />
              </div>
              <span className="text-lg">Expencio</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsTourOpen(true)}
                className="flex items-center gap-1 px-2 py-1 rounded-full bg-white border border-slate-200/80 hover:bg-slate-100 text-slate-700 text-[11px] font-semibold shadow-2xs transition-all cursor-pointer"
                title="App Walkthrough & Help"
              >
                <HelpCircle size={13} className="text-indigo-600" />
                <span>Tour</span>
              </button>

              <button
                onClick={() => navigate('/profile')}
                className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-sm hover:bg-slate-300 transition-colors cursor-pointer"
              >
                {user?.email ? (user.email.split('@')[0].charAt(0) + user.email.split('@')[0].slice(-1)).toUpperCase() : "MJ"}
              </button>
            </div>
          </div>

          {/* Sync status indicator — only shown when relevant */}
          {(!isOnline || pendingCount > 0 || syncStatus === 'syncing') && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '999px',
              fontSize: '12px',
              fontWeight: '500',
              width: 'fit-content',
              background: !isOnline ? '#fef3c7' : syncStatus === 'error' ? '#fee2e2' : '#f0fdf4',
              color: !isOnline ? '#92400e' : syncStatus === 'error' ? '#991b1b' : '#166534',
              border: `1px solid ${!isOnline ? '#fde68a' : syncStatus === 'error' ? '#fca5a5' : '#bbf7d0'}`,
            }}>
              {!isOnline ? (
                <><WifiOff size={12} /> Offline — {pendingCount} queued</>
              ) : syncStatus === 'syncing' ? (
                <><RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} /> Syncing…</>
              ) : syncStatus === 'error' ? (
                <><RefreshCw size={12} /> Sync failed — will retry</>
              ) : (
                <><Wifi size={12} /> {pendingCount} pending</>
              )}
            </div>
          )}

          {/* 1. Bluish Gradient Month Summary Card */}
          <div className="relative group z-30">
            <div className="absolute left-4 bottom-4 z-40">
              <SectionInfoModal
                theme="dark"
                content={{
                  title: "Monthly Overview & Net Spend",
                  subtitle: "Real-time summary of your current month",
                  badge: "Dashboard",
                  description: "Shows your total monthly expenditures, today's spending total, and percentage change vs last month.",
                }}
                tourStepId="monthly-overview"
              />
            </div>
            <MonthSummary
              monthName={analyticsData?.period?.from ? new Date(`${analyticsData.period.from}`).toLocaleString('en-US', { month: 'long', year: 'numeric' }) : "Current Month"}
              spentAmount={analyticsData?.totalSpent || 0}
              todayAmount={todayTotal}
              totalIncome={analyticsData?.totalIncome || 0}
              percentageChange={analyticsData?.percentageChange || 0}
              dailyData={filteredDailyData}
              currencySymbol={userCurrencySymbol}
            />
          </div>

          {groupedExpenses.length === 0 ? (
            <div className="py-6 text-center text-xs font-semibold text-slate-400 font-mono mt-4">
              No transactions recorded yet
            </div>
          ) : (
            <>
              {/* Transactions Header */}
              <div className="flex items-center justify-between px-2 pt-2 pb-1 mt-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Transactions</span>
                  <SectionInfoModal
                    content={{
                      title: "Recent Transactions",
                      subtitle: "Local-first atomic ledger",
                      badge: "Activity",
                      description: "List of your logged expenses and incomes grouped by date.",
                      highlights: [
                        { title: "Instant Edit / Delete", desc: "Tap any transaction row to edit details or delete." },
                        { title: "Offline Storage", desc: "Saved locally in IndexedDB when offline and synced automatically when connected." }
                      ]
                    }}
                    tourStepId="recent-transactions"
                  />
                </div>
                <span className="text-[11px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">All amounts in {userCurrencySymbol}</span>
              </div>
              
              <div className="flex flex-col bg-white border border-slate-200/60 rounded-2xl p-2 shadow-sm">
                {groupedExpenses.map((group, index) => (
                  <section key={group.date.toISOString()} className={cn("flex flex-col gap-0", index === 0 ? "" : "pt-6")}>
                    {/* Two-Column Date Header */}
                    <div className="grid grid-cols-[minmax(0,1fr)_88px] items-center pb-2 border-b border-slate-100 px-2">
                      <span className="font-semibold text-[14px] text-slate-900 tracking-tight">{group.label}</span>
                      <span className="font-bold text-[14px] text-purple-600 text-right tabular-nums">
                        {group.total.toLocaleString("en-IN")}
                      </span>
                    </div>

                    <div className="flex flex-col pt-0.5">
                      {group.expenses.map((exp) => (
                        <NoteTransactionRow
                          key={exp.id}
                          title={exp.title}
                          amount={exp.amount}
                          type={exp.type}
                          onClick={() => handleEditClick(exp)}
                          onDelete={() => handleDeleteClick(exp)}
                        />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </>
          )}

          {/* Sync Status Indicator */}
          <div className="flex items-center justify-center mt-4 mb-2">
            <span className="text-[10px] font-medium text-slate-400">
              {!isOnline && pendingCount > 0 ? "Offline · Saved locally" : 
               syncStatus === 'syncing' ? "↻ Syncing…" : 
               syncStatus === 'error' ? "Couldn't sync · Will retry" : 
               "✓ Synced"}
            </span>
          </div>


        </Stack>
      </Container>

      {/* Dominating Floating Action Dock: Analytics, (+) Add Expense, Budget */}
      <HeroActionButton
        onAddExpense={() => {
          setEditingTransaction(null);
          setCurrencyVal(undefined);
          setReceiptItems([]);
          setEntryType("expense");
          setSelectedCategory(expenseCategories[0]);
          setExpenseName("");
          const todayStr = new Date().toLocaleDateString('en-CA');
          setCustomDate(todayStr);
          setSelectedDateTag("Today");
          setIsSheetOpen(true);
        }}
        onAnalyticsClick={() => navigate("/portfolio")}
        onBudgetClick={() => navigate("/analytics")}
      />

      {/* Notion x Linear Style Multi-Entry Modal */}
      <CaptureSheet
        isOpen={isSheetOpen}
        onClose={() => {
          setIsSheetOpen(false);
          setEditingTransaction(null);
        }}
        title={editingTransaction ? "Edit Transaction" : "Add Transactions"}
      >
        <Stack gap={2}>
          {/* Quick Entry Guide Info Header */}
          <div className="flex items-center justify-between pb-1 -mt-1">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
              <span>Quick Entry Guide</span>
              <SectionInfoModal
                content={{
                  title: "Transaction Entry Guide",
                  subtitle: "Log expenses or incomes instantly",
                  badge: "Capture Guide",
                  description: "Capture personal financial transactions with category tagging and optional superior category grouping.",
                  highlights: [
                    { title: "Expense vs Income Toggle", desc: "Select Expense to record a spend or Income to record earnings." },
                    { title: "Category Drilldown", desc: "Pick standard categories or type custom ones using the keyboard icon." },
                    { title: "Date Tagging", desc: "Assign to Today, Yesterday, or pick a custom date." },
                    { title: "Superior Category", desc: "Group detailed entries into parent categories for high-level analytics." }
                  ]
                }}
              />
            </div>
          </div>

          {/* 1. Income or Expense Toggle - Modern Pill */}
          <div className="flex items-center p-0.5 bg-slate-100/80 rounded-full border border-slate-200/60">
            <button
              type="button"
              onClick={() => {
                setEntryType("expense");
                setSelectedCategory(expenseCategories[0]);
              }}
              className={cn(
                "flex-1 py-2 px-3 rounded-full text-xs font-bold transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer select-none",
                entryType === "expense"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              <div
                className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-colors",
                  entryType === "expense" ? "bg-white/20 text-white" : "bg-slate-200/70 text-slate-500"
                )}
              >
                <ArrowDown size={13} strokeWidth={2.5} />
              </div>
              <span>Expense</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setEntryType("income");
                setSelectedCategory(incomeCategories[0]);
              }}
              className={cn(
                "flex-1 py-2 px-3 rounded-full text-xs font-bold transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer select-none",
                entryType === "income"
                  ? "bg-[#059669] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              <div
                className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-colors",
                  entryType === "income" ? "bg-white/25 text-white" : "bg-slate-200/70 text-slate-500"
                )}
              >
                <TrendingUp size={13} strokeWidth={2.5} />
              </div>
              <span>Income</span>
            </button>
          </div>

          {/* 1b. Optional Name / Description Field */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
              Name <span className="text-[10px] font-normal text-slate-400 opacity-70">(Optional)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. chai, petrol, amazon order..."
              value={expenseName}
              onChange={(e) => setExpenseName(e.target.value)}
              className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder:font-normal placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          {/* 2. Category Drilldown Dropdown */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
              Category
            </label>
            {isAddingCategory ? (
              <div className="relative w-full">
                <input
                  ref={categoryInputRef}
                  autoFocus
                  type="text"
                  placeholder="New category..."
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      setIsAddingCategory(false);
                      setNewCategoryName("");
                      setSelectedCategory(entryType === "expense" ? expenseCategories[0] : incomeCategories[0]);
                    }
                  }}
                  className="w-full h-10 pl-3 pr-16 bg-white border border-slate-900 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
                <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (newCategoryName) {
                        setNewCategoryName("");
                        categoryInputRef.current?.focus();
                      } else {
                        setIsAddingCategory(false);
                        setSelectedCategory(entryType === "expense" ? expenseCategories[0] : incomeCategories[0]);
                      }
                    }}
                    className="p-1 hover:bg-slate-100 rounded-md text-slate-400 hover:text-slate-700 transition-colors flex items-center justify-center cursor-pointer"
                    aria-label="Clear category input"
                  >
                    <X size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsAddingCategory(false);
                      setNewCategoryName("");
                      setIsCategoryDropdownOpen(true);
                    }}
                    className="p-1 hover:bg-slate-100 rounded-md text-slate-400 hover:text-slate-700 transition-colors cursor-pointer flex items-center justify-center"
                    aria-label="Back to dropdown"
                  >
                    <ChevronDown size={16} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="relative w-full" ref={dropdownRef}>
                <button
                  type="button"
                  ref={categoryBtnRef}
                  onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                  className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 flex items-center justify-between cursor-pointer"
                >
                  <span>{selectedCategory}</span>
                  <div className="flex items-center gap-1">
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        setNewCategoryName("");
                        setIsAddingCategory(true);
                        setIsCategoryDropdownOpen(false);
                      }}
                      className="p-1.5 hover:bg-slate-200 rounded-md text-slate-400 hover:text-slate-700 transition-colors"
                      role="button"
                      aria-label="Type category"
                    >
                      <Keyboard size={14} />
                    </div>
                    <ChevronDown size={16} className="text-slate-400" />
                  </div>
                </button>

                {isCategoryDropdownOpen && (
                  <div className="absolute z-[60] top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-[200px] overflow-y-auto flex flex-col p-1 animate-in fade-in zoom-in-95 duration-100">
                    {(entryType === "expense" ? expenseCategories : incomeCategories).map((cat) => (
                      <div
                        key={cat}
                        className="flex items-center justify-between px-2 py-2 rounded-lg hover:bg-slate-100 cursor-pointer group"
                        onClick={() => {
                          setSelectedCategory(cat);
                          setNewCategoryName(cat);
                          setIsCategoryDropdownOpen(false);
                        }}
                      >
                        <span className="text-xs font-semibold text-slate-700 group-hover:text-slate-900">{cat}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (entryType === "expense") {
                              const updated = expenseCategories.filter(c => c !== cat);
                              setExpenseCategories(updated);
                              if (selectedCategory === cat) setSelectedCategory(updated[0] || "");
                            } else {
                              const updated = incomeCategories.filter(c => c !== cat);
                              setIncomeCategories(updated);
                              if (selectedCategory === cat) setSelectedCategory(updated[0] || "");
                            }
                          }}
                          className="w-6 h-6 flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                          aria-label={`Delete ${cat}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                    <div className="h-px bg-slate-100 my-1 w-full" />
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingCategory(true);
                        setIsCategoryDropdownOpen(false);
                      }}
                      className="w-full text-left px-2 py-2 rounded-lg hover:bg-slate-100 cursor-pointer text-xs font-bold text-slate-900"
                    >
                      + Add New Category
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 2b. Superior Category Combobox (Advanced Feature) */}
          {(user?.superiorCategoriesEnabled ?? (localStorage.getItem("expencio_superior_category") === "true")) && (
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                    Superior Category <span className="text-[10px] text-slate-400 font-normal opacity-70">(Optional)</span>
                  </label>
                  <SectionInfoModal
                    content={{
                      title: "Superior Category Grouping",
                      subtitle: "High-level analytics aggregation",
                      badge: "Advanced",
                      description: "Superior Categories allow you to group granular, detailed categories under parent buckets (e.g. grouping 'Coffee', 'Groceries', and 'Restaurants' under 'Food & Dining').",
                      highlights: [
                        { title: "Aggregated Reports", desc: "Analytics totals reflect Superior Category groups when enabled." },
                        { title: "Optional Assignment", desc: "You can leave this blank if you prefer standard category reporting." }
                      ]
                    }}
                  />
                </div>
                {selectedSuperiorCategory && (
                  <button
                    type="button"
                    onClick={() => setSelectedSuperiorCategory("")}
                    className="text-[11px] font-medium text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>

              <div className="relative w-full" ref={superiorDropdownRef}>
                <div className="relative flex items-center w-full">
                  <input
                    type="text"
                    placeholder="e.g. Food & Dining, Transportation..."
                    value={selectedSuperiorCategory}
                    onChange={(e) => {
                      setSelectedSuperiorCategory(e.target.value);
                      setIsSuperiorDropdownOpen(true);
                    }}
                    onFocus={() => setIsSuperiorDropdownOpen(true)}
                    className="w-full h-10 pl-3 pr-16 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                  <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                    {selectedSuperiorCategory && (
                      <button
                        type="button"
                        onClick={() => setSelectedSuperiorCategory("")}
                        className="p-1 hover:bg-slate-200 rounded-md text-slate-400 hover:text-slate-700 transition-colors flex items-center justify-center cursor-pointer"
                        aria-label="Clear superior category"
                      >
                        <X size={14} />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setIsSuperiorDropdownOpen(!isSuperiorDropdownOpen)}
                      className="p-1 hover:bg-slate-200 rounded-md text-slate-400 hover:text-slate-700 transition-colors cursor-pointer flex items-center justify-center"
                      aria-label="Toggle superior category dropdown"
                    >
                      <ChevronDown size={16} />
                    </button>
                  </div>
                </div>

                {isSuperiorDropdownOpen && (
                  <div className="absolute z-[60] top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-[180px] overflow-y-auto flex flex-col p-1 animate-in fade-in zoom-in-95 duration-100">
                    {superiorCategoryPresets
                      .filter((preset) =>
                        preset.toLowerCase().includes(selectedSuperiorCategory.toLowerCase())
                      )
                      .map((preset) => (
                        <div
                          key={preset}
                          className={cn(
                            "flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-100 cursor-pointer text-xs font-semibold",
                            selectedSuperiorCategory === preset ? "text-indigo-600 bg-indigo-50/70" : "text-slate-700"
                          )}
                          onClick={() => {
                            setSelectedSuperiorCategory(preset);
                            setIsSuperiorDropdownOpen(false);
                          }}
                        >
                          <span>{preset}</span>
                        </div>
                      ))}
                    {selectedSuperiorCategory.trim() &&
                      !superiorCategoryPresets.some(
                        (p) => p.toLowerCase() === selectedSuperiorCategory.trim().toLowerCase()
                      ) && (
                        <div
                          className="px-3 py-2 text-xs font-bold text-indigo-600 hover:bg-indigo-50 rounded-lg cursor-pointer border-t border-slate-100 mt-1"
                          onClick={() => setIsSuperiorDropdownOpen(false)}
                        >
                          Use custom: "{selectedSuperiorCategory.trim()}"
                        </div>
                      )}
                  </div>
                )}
              </div>
            </div>
          )}
          <CurrencyField
            ref={currencyInputRef}
            currencySymbol={userCurrencySymbol}
            value={currencyVal}
            onChange={(val: number | undefined) => setCurrencyVal(val)}
            placeholder="0"
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
              if (e.key === "Enter" && currencyVal && currencyVal > 0) {
                e.preventDefault();
                handleAddAnother();
              }
            }}
          />

          {/* 4. Date Picker Selection Row */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                Date
              </label>
              <button
                type="button"
                onClick={() => {
                  setSelectedDateTag("Today");
                  setCustomDate(new Date().toISOString().split("T")[0]);
                }}
                className={cn(
                  "py-0.5 px-2 rounded text-[10px] font-bold transition-all border cursor-pointer",
                  selectedDateTag === "Today"
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100 hover:text-slate-700"
                )}
              >
                Today
              </button>
            </div>
            
            <div className="w-full bg-slate-50/50 border border-slate-200/60 rounded-xl overflow-hidden py-1">
              <DateSlider
                selectedDate={customDate}
                onSelectDate={(date: string) => {
                  setCustomDate(date);
                  const isToday = date === new Date().toISOString().split("T")[0];
                  setSelectedDateTag(isToday ? "Today" : "Custom");
                }}
              />
            </div>
          </div>

          {/* Add to Batch Action Button */}
          <button
            type="button"
            onClick={handleAddAnother}
            disabled={!currencyVal}
            className="w-full h-10 mt-1 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-xl text-xs font-bold transition-all disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-1 active:scale-[0.98] cursor-pointer"
          >
            + Add more
          </button>

          {/* 5. Live Multi-Entry Session Receipt List */}
          <ReceiptSessionList
            items={receiptItems}
            currencySymbol={userCurrencySymbol}
            onAddAnother={handleAddAnother}
            onDone={handleDone}
            onRemoveItem={(id: string) => {
              setReceiptItems((prev) => prev.filter((item) => item.id !== id));
            }}
          />
        </Stack>
      </CaptureSheet>

      {/* Apple Undo Toast Pattern */}
      {toastMessage && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-5 py-3 rounded-full shadow-xl flex items-center gap-4 text-sm font-medium animate-in fade-in slide-in-from-bottom duration-200">
          <span>{toastMessage}</span>
        </div>
      )}
    </AppShell>
  );
};
