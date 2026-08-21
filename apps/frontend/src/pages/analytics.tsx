import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, PieChart, Calendar, CheckCircle2, ChevronDown } from "lucide-react";
import { AppShell, Container, Stack, cn } from "@expenseflow/ui";
import { motion } from "framer-motion";
import { useAnalytics } from "../core/api/analytics";
import { useAuth } from "../core/providers/AuthContext";
import { CURRENCIES } from "../constants/currencies";
import { formatCurrency } from "../utils/currency";
import { useNeedsReviewTransactions } from "../core/api/transactions";
import { SectionInfoModal } from "../components/SectionInfoModal";
import { ReviewTransactionsModal } from "../components/ReviewTransactionsModal";
import { EditTransactionCategoryModal } from "../components/EditTransactionCategoryModal";

type Timeframe = "today" | "week" | "month" | "custom";

function getDatesForTimeframe(tf: Timeframe, customMonthOffset = 0) {
  const now = new Date();
  
  if (tf === "today") {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    return { from: start.toISOString(), to: end.toISOString() };
  } else if (tf === "week") {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6, 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    return { from: start.toISOString(), to: end.toISOString() };
  } else if (tf === "month" || tf === "custom") {
    const target = new Date();
    target.setDate(1); // Set to 1st to prevent month-overflow bugs
    target.setMonth(target.getMonth() - customMonthOffset);
    const start = new Date(target.getFullYear(), target.getMonth(), 1, 0, 0, 0, 0);
    const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
    const end = new Date(target.getFullYear(), target.getMonth(), lastDay, 23, 59, 59, 999);
    return { from: start.toISOString(), to: end.toISOString() };
  }
  
  return { from: "", to: "" };
}

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

export default function AnalyticsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const userCurrency = user?.currency || "INR";
  const userCurrencySymbol = CURRENCIES.find(c => c.code === userCurrency)?.symbol || "₹";

  const [activeTimeframe, setActiveTimeframe] = useState<Timeframe>("month");
  const [customMonthOffset, setCustomMonthOffset] = useState(0);
  const [isCustomMonthOpen, setIsCustomMonthOpen] = useState(false);
  const [activeHoverDay, setActiveHoverDay] = useState<any | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [editingTx, setEditingTx] = useState<{ id: string; description: string; amount: number; currentCategory: string } | null>(null);

  const { from, to } = useMemo(
    () => getDatesForTimeframe(activeTimeframe, customMonthOffset),
    [activeTimeframe, customMonthOffset]
  );

  const { data: analyticsData, isLoading } = useAnalytics(from, to);
  const { data: needsReviewData } = useNeedsReviewTransactions();

  const handleCustomSelect = (offset: number) => {
    setCustomMonthOffset(offset);
    setActiveTimeframe("custom");
    setIsCustomMonthOpen(false);
  };

  const currentAnalytics = analyticsData;
  const maxDailyAmount = currentAnalytics 
    ? Math.max(...currentAnalytics.dailyData.map((d) => d.amount), 100) 
    : 100;

  return (
    <AppShell className="bg-slate-50 min-h-screen pb-28 selection:bg-slate-900 selection:text-white">
      <Container size="sm" className="pt-12 sm:pt-14">
        <Stack gap={6}>
          {/* Header & Nudge */}
          <div className="flex flex-col gap-3 px-2 pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate("/")}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 transition-colors -ml-2 text-slate-600 cursor-pointer"
                >
                  <ChevronLeft size={20} />
                </button>
                <h1 className="text-xl font-bold tracking-tight text-slate-900">Analytics</h1>
              </div>

              <SectionInfoModal
                content={{
                  title: "Analytics & Category Insights",
                  subtitle: "Visual spending distribution and period trends",
                  badge: "Reports",
                  description: "Processes your entries into interactive period charts, daily spending bars, and category breakdowns.",
                }}
                align="right"
                tourStepId="analytics-insights"
              />
            </div>
            
            {/* The Nudge */}
            <div className="flex items-center gap-3 bg-gradient-to-r from-sky-50/80 to-indigo-50/80 border border-sky-100/60 rounded-xl p-3 shadow-sm mx-1">
              <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center shrink-0 shadow-sm border border-white">
                <img src="/logo.jpg" alt="Expencio Logo" className="w-full h-full object-cover scale-[1.35]" />
              </div>
              <p className="text-[13px] text-slate-700 font-medium leading-relaxed">
                Let's dive into your spending analytics and track exactly where your money goes.
              </p>
            </div>

            {/* Needs Review Banner */}
            {needsReviewData && needsReviewData.total > 0 && (
              <button
                onClick={() => setIsReviewModalOpen(true)}
                className="flex items-center justify-between bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-3 shadow-md mx-1 border border-indigo-400/50 cursor-pointer hover:shadow-lg transition-shadow group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-white/20 overflow-hidden flex items-center justify-center shrink-0 border border-white/20">
                    <img src="/logo.jpg" alt="Expensio Logo" className="w-full h-full object-cover scale-[1.35] grayscale mix-blend-luminosity opacity-90" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-white tracking-tight">Teach Expensio {needsReviewData.total} thing{needsReviewData.total !== 1 ? 's' : ''}</p>
                    <p className="text-[11px] text-indigo-100 font-medium opacity-90">Tap to categorize unknown transactions</p>
                  </div>
                </div>
                <div className="text-white opacity-80 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all">
                  <ChevronLeft size={20} className="rotate-180" />
                </div>
              </button>
            )}
          </div>

          <section className="bg-white border border-slate-200/80 rounded-2xl p-6 flex flex-col gap-5 shadow-xs">
            {/* Header + Timeframe / Custom Filter Pills */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 py-0.5">
                <div className="flex items-center bg-slate-100/90 border border-slate-200/80 rounded-full p-1 shadow-xs">
                  {(["today", "week", "month"] as const).map((tf) => {
                    const isSelected = activeTimeframe === tf;
                    return (
                      <button
                        key={tf}
                        type="button"
                        onClick={() => {
                          setActiveTimeframe(tf);
                          setCustomMonthOffset(0);
                          setActiveHoverDay(null);
                        }}
                        className={cn(
                          "px-3.5 py-1.5 rounded-full text-[11px] font-bold tracking-wider uppercase transition-all duration-150 cursor-pointer whitespace-nowrap",
                          isSelected
                            ? "bg-slate-950 text-white shadow-xs"
                            : "text-slate-500 hover:text-slate-900"
                        )}
                      >
                        {tf}
                      </button>
                    );
                  })}
                </div>

                {/* Separate CUSTOM Button with Calendar Icon */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsCustomMonthOpen((prev) => !prev)}
                    className={cn(
                      "bg-white border border-slate-200 rounded-full px-3.5 py-1.5 flex items-center gap-1.5 text-[11px] font-bold tracking-wider transition-all cursor-pointer shadow-xs whitespace-nowrap",
                      isCustomMonthOpen || activeTimeframe === "custom" ? "border-slate-400 bg-slate-50 text-slate-900" : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                    )}
                  >
                    <Calendar size={13} className="text-slate-500" />
                    <span>{activeTimeframe === 'custom' ? 'CUSTOM' : 'PREVIOUS'}</span>
                  </button>

                  {/* Custom Month Dropdown Menu */}
                  {isCustomMonthOpen && (
                    <div className="absolute right-0 top-9 z-30 w-44 bg-white border border-slate-200 rounded-xl p-1.5 shadow-lg animate-in fade-in zoom-in-95 duration-100 flex flex-col gap-0.5">
                      <span className="px-2 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                        Select Month
                      </span>
                      {Array.from({ length: 6 }).map((_, i) => {
                        const d = new Date();
                        d.setDate(1); // Prevent overflow bugs
                        d.setMonth(d.getMonth() - i);
                        const mLabel = d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
                        return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => handleCustomSelect(i)}
                          className={cn(
                            "w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center justify-between cursor-pointer",
                            activeTimeframe === "custom" && customMonthOffset === i
                              ? "bg-slate-100 text-slate-900 font-semibold"
                              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                          )}
                        >
                          <span>{mLabel}</span>
                          {activeTimeframe === "custom" && customMonthOffset === i && <CheckCircle2 size={12} className="text-emerald-600" />}
                        </button>
                      )})}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {isLoading || !currentAnalytics ? (
              <div className="py-20 text-center text-slate-500 text-sm animate-pulse">Loading analytics...</div>
            ) : (
              <>
                {/* Spent Summary Stats Banner */}
                <div className="grid grid-cols-2 gap-y-4 gap-x-2 bg-slate-50/80 border border-slate-200/70 p-3.5 rounded-xl text-center">
                  <div className="flex flex-col border-r border-b border-slate-200 px-1 pb-2">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase">Spent</span>
                    <div className="text-xl font-bold text-slate-900 tracking-tight">
                      {userCurrencySymbol}{formatCompactAmount(currentAnalytics.totalSpent)}
                    </div>
                  </div>
                  <div className="flex flex-col border-b border-slate-200 px-1 pb-2">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase">Avg/Day</span>
                    <div className="text-xl font-bold text-slate-900 tracking-tight">
                      {userCurrencySymbol}{formatCompactAmount(currentAnalytics.dailyAverage)}
                    </div>
                  </div>
                  <div className="flex flex-col border-r border-slate-200 px-1 pt-2">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase">Peak</span>
                    <div className="text-xl font-bold text-slate-900 tracking-tight">
                      {userCurrencySymbol}{formatCompactAmount(currentAnalytics.peakDay.amount)}
                    </div>
                  </div>
                  <div className="flex flex-col px-1 pt-2">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase">Trend</span>
                    <span className={cn(
                      "text-sm font-bold mt-0.5 whitespace-nowrap",
                      currentAnalytics.percentageChange > 0 ? "text-rose-600" : currentAnalytics.percentageChange < 0 ? "text-emerald-600" : "text-slate-500"
                    )}>
                      {currentAnalytics.percentageChange > 0 ? "+" : ""}{currentAnalytics.percentageChange}%
                    </span>
                  </div>
                </div>

                {/* DAILY STRIP BAR CHART */}
                <div className="relative w-full bg-slate-50/60 rounded-xl p-3.5 border border-slate-200/70 flex flex-col gap-2 select-none">
                  {/* Tooltip / Active Day Header */}
                  <div className="flex items-center justify-between text-xs px-1 font-medium">
                    <span className="text-slate-500">
                      {activeHoverDay ? activeHoverDay.dateStr : `Trend (${currentAnalytics.daysCount} Days)`}
                    </span>
                    <div className="text-3xl font-black text-slate-900 tracking-tight">
                      {userCurrencySymbol}{formatCompactAmount(activeHoverDay ? activeHoverDay.amount : currentAnalytics.peakDay.amount)}
                      {!activeHoverDay && <span className="text-[10px] text-slate-400 font-normal ml-1">(Peak)</span>}
                    </div>
                  </div>

                  {/* Strip Bars Container */}
                  <div className="w-full h-32 flex items-end justify-between gap-[3px] sm:gap-1.5 pt-2">
                    {currentAnalytics.dailyData.map((pt, i) => {
                      const isEmpty = pt.amount === 0;
                      const heightPct = isEmpty ? 5 : Math.max(10, Math.min(100, (pt.amount / maxDailyAmount) * 100));
                      const isHovered = activeHoverDay?.fullDateStr === pt.fullDateStr;

                      return (
                        <div
                          key={pt.fullDateStr + i}
                          onMouseEnter={() => setActiveHoverDay(pt)}
                          onMouseLeave={() => setActiveHoverDay(null)}
                          onTouchStart={() => setActiveHoverDay(pt)}
                          className="relative flex-1 h-full flex flex-col justify-end items-center group cursor-pointer"
                        >
                          <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: `${heightPct}%` }}
                            transition={{ duration: 0.8, ease: "easeOut", delay: i * 0.02 }}
                            className={cn(
                              "w-full rounded-t-sm transition-colors duration-200",
                              isEmpty 
                                ? "bg-slate-200/80"
                                : (heightPct >= 90)
                                ? (isHovered ? "bg-purple-500" : "bg-purple-600 shadow-[0_-2px_10px_rgba(147,51,234,0.3)]")
                                : (heightPct >= 60)
                                ? (isHovered ? "bg-purple-400" : "bg-purple-500")
                                : (heightPct >= 30)
                                ? (isHovered ? "bg-purple-300" : "bg-purple-400")
                                : (isHovered ? "bg-purple-200" : "bg-purple-300")
                            )}
                          />
                          
                          {/* Floating Tooltip */}
                          {isHovered && (
                            <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] font-medium py-1 px-2 rounded-md shadow-xl whitespace-nowrap z-10 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center">
                              <div className="flex items-center gap-2">
                                <span>{pt.dateStr}</span>
                                <span className="text-purple-300">{userCurrencySymbol}{formatCompactAmount(pt.amount)}</span>
                              </div>
                              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-800 rotate-45"></div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Where Money Went */}
                <div className="flex flex-col gap-3 pt-3">
                  <div className="flex items-center justify-between pb-1 pt-4">
                    <h2 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                      <PieChart size={16} className="text-purple-600" /> Where Money Went
                    </h2>
                    <span className="text-[11px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">All amounts in {userCurrencySymbol}</span>
                  </div>
                  <div className="flex flex-col gap-2">
                    {currentAnalytics.categories.map((cat) => {
                      const isExpanded = expandedCategories.has(cat.name);
                      
                      return (
                        <div key={cat.name} className="flex flex-col rounded-xl bg-slate-50/70 border border-slate-200/70 overflow-hidden">
                          <button
                            type="button"
                            onClick={() => {
                              setExpandedCategories((prev) => {
                                const next = new Set(prev);
                                if (next.has(cat.name)) next.delete(cat.name);
                                else next.add(cat.name);
                                return next;
                              });
                            }}
                            className="flex items-center justify-between p-3 text-sm cursor-pointer hover:bg-slate-100/50 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                              <span className="font-semibold text-slate-700 max-w-[100px] sm:w-32 truncate text-left">{cat.name}</span>
                            </div>
                            <div className="flex items-center gap-2 sm:gap-4 text-right">
                              <span className="font-mono text-slate-500 text-[11px] sm:text-xs w-8 sm:w-10">{cat.percentage}%</span>
                              <ChevronDown size={14} className={cn("text-slate-400 transition-transform mr-1", isExpanded ? "rotate-180" : "")} />
                              <span className="font-bold text-slate-900 text-right min-w-[3.5rem]">{formatCompactAmount(cat.amount)}</span>
                            </div>
                          </button>
                          
                          {/* Expanded Transactions List */}
                          {isExpanded && cat.transactions && cat.transactions.length > 0 && (
                            <div className="border-t border-slate-200/70 bg-white p-3 flex flex-col gap-1.5 max-h-60 overflow-y-auto">
                              {cat.transactions.map((tx) => (
                                <button
                                  key={tx.id}
                                  type="button"
                                  onClick={() => setEditingTx({
                                    id: tx.id,
                                    description: tx.description,
                                    amount: tx.amount,
                                    currentCategory: cat.name
                                  })}
                                  className="flex items-center justify-between text-xs py-1.5 px-2 rounded-md hover:bg-slate-50 transition-colors cursor-pointer w-full text-left"
                                >
                                  <span className="text-slate-600 truncate mr-2 font-medium" title={tx.description}>
                                    {tx.description}
                                  </span>
                                  <div className="text-sm font-bold text-slate-900 text-right min-w-[3.5rem]">
                                    {new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(Number(tx.amount))}
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {currentAnalytics.categories.length === 0 && (
                      <div className="text-center py-6 text-sm text-slate-400">No expenses recorded for this period</div>
                    )}
                  </div>
                </div>
              </>
            )}
          </section>
        </Stack>
      </Container>
      
      {needsReviewData && needsReviewData.items && (
        <ReviewTransactionsModal
          isOpen={isReviewModalOpen}
          onClose={() => setIsReviewModalOpen(false)}
          items={needsReviewData.items}
        />
      )}

      <EditTransactionCategoryModal
        isOpen={!!editingTx}
        onClose={() => setEditingTx(null)}
        transaction={editingTx}
      />
    </AppShell>
  );
}
