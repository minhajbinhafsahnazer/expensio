import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Trash2, ChevronDown, Keyboard, Wifi, WifiOff, RefreshCw, Wallet } from "lucide-react";
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
import { useAuth } from "../core/providers/AuthContext";

export interface ExpenseEntry {
  id: string;
  title: string;
  amount: number;
  dateGroup: "Today" | "Yesterday" | "Earlier";
  type?: "expense" | "income";
  spentAt?: string;
}

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [currencyVal, setCurrencyVal] = useState<number | undefined>(undefined);
  const [entryType, setEntryType] = useState<"expense" | "income">("expense");
  const [editingTransaction, setEditingTransaction] = useState<ExpenseEntry | null>(null);

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

  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const categoryBtnRef = useRef<HTMLButtonElement>(null);
  const categoryInputRef = useRef<HTMLInputElement>(null);

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
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const [receiptItems, setReceiptItems] = useState<ReceiptItem[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: serverTransactions = [] } = useQuery({
    queryKey: ["transactions"],
    queryFn: TransactionsApi.getAll
  });

  const { enqueue, pendingCount, syncStatus, isOnline } = useSyncEngine();
  const { user } = useAuth();

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
      const categoryStr = t.category || "";
      const isIncome = incomeKeywords.some(kw => categoryStr.toLowerCase().includes(kw));
      const type = (t as any).type || (isIncome ? "income" : "expense");
      
      groups[dateKey].expenses.push({
        id: t.id,
        title: t.category,
        amount,
        dateGroup: groups[dateKey].label as any,
        type,
        spentAt: t.spentAt,
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
    if (!currencyVal) return;
    
    let finalCategory = selectedCategory;
    const wasAdding = isAddingCategory;
    if (isAddingCategory && newCategoryName.trim()) {
      finalCategory = newCategoryName.trim();
      if (entryType === "expense") {
        setExpenseCategories((prev) => [...prev, finalCategory]);
      } else {
        setIncomeCategories((prev) => [...prev, finalCategory]);
      }
      setSelectedCategory(finalCategory);
    }
    
    const newItem: ReceiptItem = {
      id: Math.random().toString(36).substring(2, 9),
      label: finalCategory,
      amount: currencyVal,
      type: entryType,
      date: getDateLabel(),
      currencySymbol: "₹",
    };
    setReceiptItems((prev) => [...prev, newItem]);
    setCurrencyVal(undefined);
    setNewCategoryName("");
    
    if (!wasAdding) {
      setIsAddingCategory(false);
    }
    
    showToast(`Added ${entryType === "income" ? "+" : "-"}₹${currencyVal} (${finalCategory})`);
    
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
      currency: "INR",
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
    setSelectedCategory(exp.title);
    setNewCategoryName(exp.title);
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

    let finalCategory = selectedCategory;
    if (isAddingCategory && newCategoryName.trim()) {
      finalCategory = newCategoryName.trim();
      if (entryType === "expense") {
        setExpenseCategories((prev) => [...prev, finalCategory]);
      } else {
        setIncomeCategories((prev) => [...prev, finalCategory]);
      }
      setSelectedCategory(finalCategory);
    }

    const selectedSpentAtISO = getSpentAtISO(customDate);

    // Check if there is an unadded amount in the input field
    const apiTransactions: TransactionCreatePayload[] = [];
    const uiTransactions: ExpenseEntry[] = [];

    if (currencyVal) {
      const cid = ulid();
      uiTransactions.push({
        id: cid,
        title: finalCategory,
        amount: currencyVal,
        dateGroup: selectedDateTag === "Yesterday" ? "Yesterday" : selectedDateTag === "Today" ? "Today" : "Earlier",
        type: entryType,
        spentAt: selectedSpentAtISO,
      });
      apiTransactions.push({
        clientGeneratedId: cid,
        amount: currencyVal,
        category: finalCategory,
        spentAt: selectedSpentAtISO,
        currency: 'INR'
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
      });
      apiTransactions.push({
        clientGeneratedId: cid,
        amount: item.amount,
        category: item.label,
        spentAt: selectedSpentAtISO,
        currency: 'INR'
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
                ? { ...t, category: tx.category, amount: tx.amount.toString(), spentAt: tx.spentAt } 
                : t
            );
          });
          
          // Optimistic analytics update
          queryClient.setQueriesData({ queryKey: ["analytics"] }, (old: any) => {
            if (!old) return old;
            const newAmount = parseFloat(tx.amount.toString());
            const oldAmount = parseFloat(editingTransaction.amount.toString());
            const diff = newAmount - oldAmount;
            return {
              ...old,
              totalSpent: editingTransaction.type === "expense" ? old.totalSpent + diff : old.totalSpent,
              totalIncome: editingTransaction.type === "income" ? old.totalIncome + diff : old.totalIncome,
              netCashFlow: editingTransaction.type === "income" ? old.netCashFlow + diff : old.netCashFlow - diff
            };
          });
          
          await enqueue({
            action: "UPDATE",
            clientGeneratedId: editingTransaction.id,
            amount: tx.amount,
            category: tx.category,
            spentAt: tx.spentAt,
            currency: tx.currency || 'INR',
            type: editingTransaction.type || "expense",
          });
        }
      } else {
        // Optimistic: update the React Query cache immediately so UI responds instantly
        queryClient.setQueryData(["transactions"], (old: any) => {
          const optimistic = apiTransactions.map(t => ({
            id: t.clientGeneratedId,
            category: t.category,
            amount: t.amount.toString(),
            spentAt: t.spentAt,
            status: "pending"
          }));
          return [...optimistic, ...(old || [])];
        });

        // Optimistic analytics update
        const expenseTotal = uiTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);
        const incomeTotal = uiTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);
        
        queryClient.setQueriesData({ queryKey: ["analytics"] }, (old: any) => {
          if (!old) return old;
          return {
            ...old,
            totalSpent: old.totalSpent + expenseTotal,
            totalIncome: old.totalIncome + incomeTotal,
            netCashFlow: old.netCashFlow + incomeTotal - expenseTotal
          };
        });

        // Enqueue offline creation
        for (let i = 0; i < apiTransactions.length; i++) {
          const tx = apiTransactions[i];
          const uiTx = uiTransactions[i];
          await enqueue({
            action: "CREATE",
            clientGeneratedId: tx.clientGeneratedId,
            amount: tx.amount,
            currency: tx.currency || 'INR',
            category: tx.category,
            spentAt: tx.spentAt,
            type: uiTx?.type || "expense",
          });
        }
      }
      
      showToast(editingTransaction ? "Expense updated" : `Saved ${apiTransactions.length} transaction(s)`);
    }

    setIsSheetOpen(false);
    setReceiptItems([]);
    setCurrencyVal(undefined);
    setEditingTransaction(null);
  };

  return (
    <AppShell className="bg-slate-50 min-h-screen pb-28 selection:bg-slate-900 selection:text-white">
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
            <button
              onClick={() => navigate('/profile')}
              className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-sm hover:bg-slate-300 transition-colors cursor-pointer"
            >
              {user?.email ? (user.email.split('@')[0].charAt(0) + user.email.split('@')[0].slice(-1)).toUpperCase() : "MJ"}
            </button>
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
          <div>
            <MonthSummary
              monthName={analyticsData?.period?.from ? new Date(`${analyticsData.period.from}`).toLocaleString('en-US', { month: 'long', year: 'numeric' }) : "Current Month"}
              spentAmount={analyticsData?.totalSpent || 0}
              todayAmount={todayTotal}
              percentageChange={analyticsData?.percentageChange || 0}
              dailyData={filteredDailyData}
              currencySymbol="₹"
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
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Transactions</span>
                <span className="text-[11px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">All amounts in ₹</span>
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

          {/* 4. Upcoming Features Teasers */}
          <div className="flex items-center justify-center mt-4 mb-2">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors shadow-sm cursor-pointer active:scale-95"
            >
              <RefreshCw size={14} className="text-slate-500" />
              <span>Refresh Page</span>
            </button>
          </div>
          <section className="flex flex-col gap-3 pt-2 px-2">
            <h3 className="text-xs font-bold text-slate-400 tracking-widest uppercase mb-1">
              Coming Soon
            </h3>
            
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Debt & Loans Teaser */}
              <div className="flex-1 bg-white border border-slate-200/60 rounded-2xl p-4 shadow-sm flex items-center gap-4 relative overflow-hidden group hover:border-slate-300 transition-colors cursor-default">
                <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-indigo-50 to-transparent opacity-50 rounded-bl-3xl" />
                <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-500 flex items-center justify-center shrink-0">
                  <Wallet size={20} />
                </div>
                <div className="flex flex-col z-10">
                  <span className="text-sm font-bold text-slate-900 tracking-tight">Debt & Loans</span>
                  <span className="text-[11px] font-medium text-slate-500">Track who owes you</span>
                </div>
                <div className="ml-auto z-10">
                  <span className="text-[9px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500 px-2 py-1 rounded-full">
                    Soon
                  </span>
                </div>
              </div>

            </div>
          </section>

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
          {/* 1. Income or Expense Toggle */}
          <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/80">
            <button
              type="button"
              onClick={() => {
                setEntryType("expense");
                setSelectedCategory(expenseCategories[0]);
              }}
              className={cn(
                "flex-1 py-1.5 rounded-lg text-xs font-bold transition-all text-center cursor-pointer",
                entryType === "expense"
                  ? "bg-slate-900 text-white shadow-2xs"
                  : "text-slate-500 hover:text-slate-800"
              )}
            >
              Expense
            </button>

            <button
              type="button"
              onClick={() => {
                setEntryType("income");
                setSelectedCategory(incomeCategories[0]);
              }}
              className={cn(
                "flex-1 py-1.5 rounded-lg text-xs font-bold transition-all text-center cursor-pointer",
                entryType === "income"
                  ? "bg-emerald-600 text-white shadow-2xs"
                  : "text-slate-500 hover:text-slate-800"
              )}
            >
              Income
            </button>
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
                  className="w-full h-10 pl-3 pr-10 bg-white border border-slate-900 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsAddingCategory(false);
                    setNewCategoryName("");
                    setIsCategoryDropdownOpen(true);
                  }}
                  className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 hover:bg-slate-100 rounded-md text-slate-400 hover:text-slate-700 transition-colors cursor-pointer flex items-center justify-center"
                  role="button"
                  aria-label="Back to dropdown"
                >
                  <ChevronDown size={16} />
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
                        setNewCategoryName(selectedCategory);
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

          {/* 3. Amount Input */}
          <CurrencyField
            value={currencyVal}
            onChange={(val: number | undefined) => setCurrencyVal(val)}
            placeholder="0"
            currencySymbol="₹"
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
            currencySymbol="₹"
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
