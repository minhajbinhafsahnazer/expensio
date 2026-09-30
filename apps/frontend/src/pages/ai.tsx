import { useState, useRef, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import {
  ArrowUp,
  RotateCcw,
  ChevronLeft,
  SlidersHorizontal,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Wallet,
  ShieldCheck,
  X,
  Sparkles,
  Compass,
  Check,
  OctagonAlert,
} from "lucide-react";
import { AppShell, Container, Stack, cn } from "@wazn/ui";
import { DesktopHeader } from "../components/layout/DesktopHeader";
import { useAuth } from "../core/providers/AuthContext";
import { useIntelligenceSummary } from "../core/api/intelligence";
import { useSetBudget } from "../core/api/budgets";
import { AiApi, type ChatMessage } from "../core/api/ai";
import { CURRENCIES } from "../constants/currencies";

// ─── Types ────────────────────────────────────────────────────────────────────

interface StructuredReport {
  id: string;
  query: string;
  timestamp: string;
  title: string;
  category: "tolerance" | "spending" | "cashflow" | "goals" | "debt" | "general";
  status: {
    label: string;
    variant: "success" | "warning" | "danger" | "neutral";
  };
  metrics: {
    label: string;
    value: string;
    sublabel?: string;
    highlight?: boolean;
  }[];
  bullets: string[];
  takeaway: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatAmount(amount: number, symbol: string): string {
  return `${symbol} ${Math.abs(Math.round(amount)).toLocaleString()}`;
}

function getPaceVariant(
  paceStatus: "within_limit" | "approaching_limit" | "over_limit"
): "success" | "warning" | "danger" {
  if (paceStatus === "within_limit") return "success";
  if (paceStatus === "approaching_limit") return "warning";
  return "danger";
}

// ─── Spend Limit Configuration Modal ──────────────────────────────────────────

interface LimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLimit: number;
  income: number;
  hasIncome: boolean;
  userCurrencySymbol: string;
  daysRemaining: number;
  monthKey: string;
  onSaved: () => void;
}

function SpendLimitModal({
  isOpen,
  onClose,
  currentLimit,
  income,
  hasIncome,
  userCurrencySymbol,
  daysRemaining,
  monthKey,
  onSaved,
}: LimitModalProps) {
  const [selectedPreset, setSelectedPreset] = useState<number | "custom">(
    currentLimit > 0 ? "custom" : 17
  );
  const [customValue, setCustomValue] = useState(
    currentLimit > 0 ? String(Math.round(currentLimit)) : ""
  );

  const { mutate: setBudget, isPending } = useSetBudget();

  useEffect(() => {
    if (isOpen) {
      if (currentLimit > 0) {
        setCustomValue(String(Math.round(currentLimit)));
        // Check if current limit matches 15%, 17%, or 20% of income
        if (hasIncome && income > 0) {
          const p15 = Math.round(income * 0.15);
          const p17 = Math.round(income * 0.17);
          const p20 = Math.round(income * 0.2);
          if (Math.abs(currentLimit - p15) < 2) setSelectedPreset(15);
          else if (Math.abs(currentLimit - p17) < 2) setSelectedPreset(17);
          else if (Math.abs(currentLimit - p20) < 2) setSelectedPreset(20);
          else setSelectedPreset("custom");
        } else {
          setSelectedPreset("custom");
        }
      } else if (hasIncome && income > 0) {
        setSelectedPreset(17);
        setCustomValue(String(Math.round(income * 0.17)));
      }
    }
  }, [isOpen, currentLimit, income, hasIncome]);

  if (!isOpen) return null;

  const handleSelectPreset = (pct: number) => {
    setSelectedPreset(pct);
    if (income > 0) {
      const computed = Math.round(income * (pct / 100));
      setCustomValue(String(computed));
    }
  };

  const handleSave = () => {
    const val = parseFloat(customValue);
    if (isNaN(val) || val <= 0) return;
    setBudget(
      { monthKey, amount: val },
      {
        onSuccess: () => {
          onSaved();
          onClose();
        },
      }
    );
  };

  const numericTarget = parseFloat(customValue) || 0;
  const projectedDaily =
    daysRemaining > 0 && numericTarget > 0
      ? Math.round(numericTarget / daysRemaining)
      : 0;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-semibold text-slate-900 tracking-tight">
              Configure Monthly Spend Limit
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Rule-based spending ceiling for daily tolerance tracking
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {/* Income Stance Notice */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 shrink-0 mt-0.5">
              <Wallet size={14} />
            </div>
            <div className="text-xs">
              <span className="font-semibold text-slate-800 block">
                {hasIncome && income > 0
                  ? `Recorded Monthly Income: ${formatAmount(income, userCurrencySymbol)}`
                  : "No recorded income for this cycle"}
              </span>
              <span className="text-slate-500 mt-0.5 block">
                {hasIncome && income > 0
                  ? "Standard rule defaults spend limits to 15%–20% of income."
                  : "You can set any custom fixed ceiling to govern your daily allowance."}
              </span>
            </div>
          </div>

          {/* Preset Buttons (if income > 0) */}
          {hasIncome && income > 0 && (
            <div>
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block mb-2">
                Standard Limit Presets
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { pct: 15, label: "15%", tag: "Disciplined" },
                  { pct: 17, label: "17%", tag: "Balanced (Rec.)" },
                  { pct: 20, label: "20%", tag: "Flexible" },
                ].map((item) => {
                  const amt = Math.round(income * (item.pct / 100));
                  const isSelected = selectedPreset === item.pct;
                  return (
                    <button
                      key={item.pct}
                      type="button"
                      onClick={() => handleSelectPreset(item.pct)}
                      className={cn(
                        "p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between",
                        isSelected
                          ? "border-slate-900 bg-slate-900 text-white shadow-xs"
                          : "border-slate-200 bg-white hover:bg-slate-50 text-slate-800"
                      )}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-xs font-semibold">{item.label}</span>
                        {isSelected && <Check size={12} className="text-white" />}
                      </div>
                      <div className="mt-1">
                        <div
                          className={cn(
                            "text-xs font-medium tabular-nums",
                            isSelected ? "text-slate-200" : "text-slate-900"
                          )}
                        >
                          {formatAmount(amt, userCurrencySymbol)}
                        </div>
                        <div
                          className={cn(
                            "text-[10px]",
                            isSelected ? "text-slate-300" : "text-slate-400"
                          )}
                        >
                          {item.tag}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Amount Input */}
          <div>
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block mb-1.5">
              Monthly Ceiling Amount
            </label>
            <div className="flex items-center rounded-xl bg-slate-50 border border-slate-200 focus-within:border-slate-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-slate-100 transition-all overflow-hidden">
              <span className="pl-3.5 pr-1.5 text-sm text-slate-400 font-medium select-none shrink-0">
                {userCurrencySymbol}
              </span>
              <input
                type="number"
                min="1"
                step="any"
                value={customValue}
                onChange={(e) => {
                  setCustomValue(e.target.value);
                  setSelectedPreset("custom");
                }}
                placeholder="e.g. 5000"
                className="w-full py-2.5 pr-4 bg-transparent text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none tabular-nums"
              />
            </div>
          </div>

          {/* Projected Daily Allowance Preview */}
          {numericTarget > 0 && daysRemaining > 0 && (
            <div className="p-3 rounded-xl bg-violet-50/70 border border-violet-100 flex items-center justify-between text-xs">
              <span className="text-violet-900 font-medium">
                Projected Daily Allowance:
              </span>
              <span className="font-semibold text-violet-950 tabular-nums">
                {formatAmount(projectedDaily, userCurrencySymbol)} / day
                <span className="text-violet-700 font-normal text-[11px] ml-1">
                  ({daysRemaining} days left)
                </span>
              </span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-2.5 px-6 py-4 bg-slate-50/70 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending || !numericTarget || numericTarget <= 0}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-40 rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            {isPending ? "Applying Target…" : "Save Spend Target"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AiPage() {
  const { user } = useAuth();
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isChatSidebarOpen, setIsChatSidebarOpen] = useState(false);
  const [reports, setReports] = useState<StructuredReport[]>([]);
  const [isLimitModalOpen, setIsLimitModalOpen] = useState(false);
  const consoleBottomRef = useRef<HTMLDivElement>(null);

  // ── AI Chat state ──────────────────────────────────────────────────────────
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const userCurrency = user?.currency || "AED";
  const userCurrencySymbol =
    CURRENCIES.find((c) => c.code === userCurrency)?.symbol || userCurrency;

  const now = useMemo(() => new Date(), []);

  const monthKey = useMemo(() => {
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
  }, [now]);

  const monthLabel = useMemo(
    () =>
      now.toLocaleString("en-US", { month: "long", year: "numeric" }),
    [now]
  );

  // ── Real data ───────────────────────────────────────────────────────────────
  const {
    data: intel,
    isLoading: intelLoading,
    refetch: refetchIntel,
  } = useIntelligenceSummary(monthKey);

  // ── Derived tolerance & signal values ───────────────────────────────────────
  const tolerance = intel?.tolerance;
  const topCategories = intel?.topCategories ?? [];
  const goals = intel?.goals ?? [];
  const debt = intel?.debt;
  const income = intel?.income ?? 0;
  const hasIncome = intel?.hasIncome ?? false;

  const limitUsedPct = tolerance?.limitUsedPct ?? 0;
  const paceStatus = tolerance?.paceStatus ?? "within_limit";
  const monthlyLimit = tolerance?.monthlyLimit ?? 0;
  const dailyAllowance = tolerance?.dailyAllowance ?? 0;
  const dailyAvgActual = tolerance?.dailyAvgActual ?? 0;
  const daysRemaining = tolerance?.daysRemaining ?? 0;
  const daysInMonth = tolerance?.daysInMonth ?? 30;
  const spent = tolerance?.spent ?? 0;
  const remainingBudget = tolerance?.remaining ?? 0;
  const limitSource = tolerance?.limitSource ?? "no_income";

  // Today's spend tolerance fields
  const todaySpent = tolerance?.todaySpent ?? 0;
  const todayLimitReached = tolerance?.todayLimitReached ?? false;
  const todayNearLimit = tolerance?.todayNearLimit ?? false;
  const todayRemainingAllowance = tolerance?.todayRemainingAllowance ?? 0;
  const todayUsedPct = tolerance?.todayUsedPct ?? 0;
  const todayExcess = tolerance?.todayExcess ?? 0;

  // Show nudge only when there's a real daily allowance set
  const showTodayNudge = !intelLoading && dailyAllowance > 0 && (todayLimitReached || todayNearLimit);

  const daysElapsed = Math.max(1, daysInMonth - daysRemaining);
  const monthProgressPct = Math.min(100, Math.round((daysElapsed / daysInMonth) * 100));

  const topCategory = topCategories[0] ?? null;
  const topGoal = goals[0] ?? null;

  // Financial health
  const netCashFlow = useMemo(() => {
    if (!intel) return null;
    return intel.income - intel.tolerance.spent;
  }, [intel]);

  const isPositiveCashFlow = (netCashFlow ?? 0) >= 0;

  const savingsRate = useMemo(() => {
    if (!hasIncome || income <= 0) return null;
    const rate = Math.max(0, Math.round(((income - spent) / income) * 100));
    return `${rate}%`;
  }, [income, spent, hasIncome]);

  const upcomingCommitments = useMemo(() => {
    if (!debt || debt.unsettledBorrowed === 0) return null;
    return formatAmount(debt.unsettledBorrowed, userCurrencySymbol);
  }, [debt, userCurrencySymbol]);

  // Status badge config
  const paceBadgeConfig: Record<
    "within_limit" | "approaching_limit" | "over_limit",
    { label: string; dotClass: string; badgeClass: string; icon: typeof CheckCircle2 }
  > = {
    within_limit: {
      label: "Pace On Track",
      dotClass: "bg-emerald-500",
      badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-200/80",
      icon: CheckCircle2,
    },
    approaching_limit: {
      label: "Approaching Ceiling",
      dotClass: "bg-amber-500",
      badgeClass: "bg-amber-50 text-amber-800 border-amber-200/80",
      icon: AlertTriangle,
    },
    over_limit: {
      label: "Ceiling Exceeded",
      dotClass: "bg-rose-500",
      badgeClass: "bg-rose-50 text-rose-800 border-rose-200/80",
      icon: AlertCircle,
    },
  };
  const activePaceBadge = paceBadgeConfig[paceStatus];

  // ── Financial Query Engine (Deterministic Logic Reports) ────────────────────
  const generateReport = (queryText: string): StructuredReport => {
    const lower = queryText.toLowerCase();
    const timestamp = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    const id = Date.now().toString();

    // 1. Daily Tolerance & Allowance
    if (
      lower.includes("daily") ||
      lower.includes("tolerance") ||
      lower.includes("allowance") ||
      lower.includes("burn")
    ) {
      const isExceeding = dailyAvgActual > dailyAllowance && dailyAllowance > 0;
      return {
        id,
        query: queryText,
        timestamp,
        title: "Daily Spend Tolerance & Velocity Report",
        category: "tolerance",
        status: {
          label:
            dailyAllowance === 0
              ? "No Limit Configured"
              : isExceeding
              ? "Pace Exceeds Allowance"
              : "Within Daily Ceiling",
          variant:
            dailyAllowance === 0
              ? "neutral"
              : isExceeding
              ? "warning"
              : "success",
        },
        metrics: [
          {
            label: "Daily Allowance",
            value:
              dailyAllowance > 0
                ? `${formatAmount(dailyAllowance, userCurrencySymbol)} / day`
                : "Not set",
            sublabel: `${daysRemaining} days remaining in cycle`,
            highlight: true,
          },
          {
            label: "Average Daily Outflow",
            value: `${formatAmount(dailyAvgActual, userCurrencySymbol)} / day`,
            sublabel: `Over ${daysElapsed} days observed`,
          },
          {
            label: "Cycle Budget Balance",
            value: formatAmount(remainingBudget, userCurrencySymbol),
            sublabel:
              monthlyLimit > 0
                ? `${Math.round(limitUsedPct)}% of limit consumed`
                : "No ceiling",
          },
          {
            label: "Variance Velocity",
            value:
              dailyAllowance > 0
                ? isExceeding
                  ? `+${formatAmount(dailyAvgActual - dailyAllowance, userCurrencySymbol)} / day`
                  : `-${formatAmount(dailyAllowance - dailyAvgActual, userCurrencySymbol)} / day`
                : "—",
            sublabel: isExceeding ? "Over daily target" : "Under daily target",
          },
        ],
        bullets: [
          monthlyLimit > 0
            ? `Your monthly spend target is set to ${formatAmount(monthlyLimit, userCurrencySymbol)} (${limitSource === "user" ? "user configured" : "auto-calibrated at 17% of income"}).`
            : "No spend limit is currently established for this billing period.",
          `You have spent ${formatAmount(spent, userCurrencySymbol)} across ${daysElapsed} days, leaving ${formatAmount(remainingBudget, userCurrencySymbol)} for the remaining ${daysRemaining} days.`,
          isExceeding
            ? `At your current velocity of ${formatAmount(dailyAvgActual, userCurrencySymbol)}/day, you will exceed your remaining ceiling. Reducing discretionary spend will realign the balance.`
            : `Your current burn rate is sustainable. Continuing at this pace will preserve your remaining runway through month-end.`,
        ],
        takeaway: isExceeding
          ? `Recommendation: Trim daily discretionary spend by ~${formatAmount(dailyAvgActual - dailyAllowance, userCurrencySymbol)} to stay within your planned monthly limit.`
          : `Stance: Discipline is on track. You have ample daily headroom for the remaining ${daysRemaining} days.`,
      };
    }

    // 2. Spending Velocity & Outflow Breakdown
    if (
      lower.includes("spend") ||
      lower.includes("analyz") ||
      lower.includes("budget") ||
      lower.includes("outflow")
    ) {
      return {
        id,
        query: queryText,
        timestamp,
        title: "Monthly Outflow & Category Attribution",
        category: "spending",
        status: {
          label:
            paceStatus === "over_limit"
              ? "Limit Exceeded"
              : paceStatus === "approaching_limit"
              ? "Approaching Limit"
              : "Disciplined Range",
          variant: getPaceVariant(paceStatus),
        },
        metrics: [
          {
            label: "Total Month Outflows",
            value: formatAmount(spent, userCurrencySymbol),
            sublabel: `${monthLabel} to date`,
            highlight: true,
          },
          {
            label: "Monthly Limit Target",
            value:
              monthlyLimit > 0
                ? formatAmount(monthlyLimit, userCurrencySymbol)
                : "Uncapped",
            sublabel:
              limitSource === "user" ? "Custom limit" : "17% income rule",
          },
          {
            label: "Primary Outflow Driver",
            value: topCategory ? topCategory.name : "None",
            sublabel: topCategory
              ? `${Math.round(topCategory.percentage)}% of total spend`
              : "No expense data",
          },
          {
            label: "Budget Utilization",
            value: `${Math.round(limitUsedPct)}%`,
            sublabel: `${formatAmount(remainingBudget, userCurrencySymbol)} remaining`,
          },
        ],
        bullets: [
          `Current total spending stands at ${formatAmount(spent, userCurrencySymbol)} for ${monthLabel}.`,
          topCategory
            ? `${topCategory.name} constitutes the largest share at ${formatAmount(topCategory.amount, userCurrencySymbol)} (${Math.round(topCategory.percentage)}% of all outflows).`
            : "No category concentration detected.",
          topCategory?.changeVsPrevMonthPct !== null && topCategory?.changeVsPrevMonthPct !== undefined
            ? `Spending in ${topCategory.name} is ${topCategory.changeVsPrevMonthPct >= 0 ? "+" : ""}${topCategory.changeVsPrevMonthPct.toFixed(0)}% relative to previous month.`
            : "No prior month comparative baseline available.",
        ],
        takeaway:
          paceStatus === "over_limit"
            ? `Alert: Outflows have exceeded your target ceiling by ${formatAmount(spent - monthlyLimit, userCurrencySymbol)}. Audit discretionary outflows.`
            : `Stance: Outflow pace is controlled. Maintain surveillance on ${topCategory?.name || "major categories"}.`,
      };
    }

    // 3. Cash Flow & Surplus
    if (
      lower.includes("cash") ||
      lower.includes("flow") ||
      lower.includes("surplus") ||
      lower.includes("health") ||
      lower.includes("saving")
    ) {
      return {
        id,
        query: queryText,
        timestamp,
        title: "Cash Flow & Net Surplus Assessment",
        category: "cashflow",
        status: {
          label: isPositiveCashFlow ? "Net Positive Stance" : "Net Deficit Alert",
          variant: isPositiveCashFlow ? "success" : "danger",
        },
        metrics: [
          {
            label: "Recorded Inflow",
            value:
              hasIncome && income > 0
                ? formatAmount(income, userCurrencySymbol)
                : "No inflow logged",
            sublabel: "Active cycle income",
          },
          {
            label: "Recorded Outflow",
            value: formatAmount(spent, userCurrencySymbol),
            sublabel: "Total expenditures",
          },
          {
            label: "Net Cash Flow",
            value:
              netCashFlow !== null
                ? `${netCashFlow >= 0 ? "+" : ""}${formatAmount(netCashFlow, userCurrencySymbol)}`
                : "—",
            sublabel: isPositiveCashFlow ? "Retained surplus" : "Capital deficit",
            highlight: true,
          },
          {
            label: "Savings Retention Rate",
            value: savingsRate ?? "N/A",
            sublabel: "Retained post-expenditures",
          },
        ],
        bullets: [
          hasIncome && income > 0
            ? `Total recorded income is ${formatAmount(income, userCurrencySymbol)} against ${formatAmount(spent, userCurrencySymbol)} in total outflows.`
            : "No income recorded for this period. Registering income unlocks precise surplus tracking.",
          isPositiveCashFlow
            ? `Your cash flow surplus is currently positive at ${formatAmount(netCashFlow ?? 0, userCurrencySymbol)}.`
            : `Outflows exceed recorded income by ${formatAmount(Math.abs(netCashFlow ?? 0), userCurrencySymbol)}.`,
          upcomingCommitments
            ? `Unsettled liabilities of ${upcomingCommitments} remain outstanding this period.`
            : "No outstanding counterparty liabilities recorded.",
        ],
        takeaway: isPositiveCashFlow
          ? `Stance: Positive net retention (${savingsRate || "surplus"}). Capital can be safely channeled into active portfolio goals.`
          : `Recommendation: Mitigate outflow burn rate to restore a positive cash reserve balance.`,
      };
    }

    // 4. Portfolio Goals & Targets
    if (lower.includes("goal") || lower.includes("target") || lower.includes("portfolio")) {
      return {
        id,
        query: queryText,
        timestamp,
        title: "Portfolio Milestones & Goal Trajectory",
        category: "goals",
        status: {
          label:
            goals.length === 0
              ? "No Active Goals"
              : topGoal?.onTrack
              ? "Goals On Track"
              : "Behind Schedule",
          variant:
            goals.length === 0 ? "neutral" : topGoal?.onTrack ? "success" : "warning",
        },
        metrics: [
          {
            label: "Active Targets",
            value: `${goals.length}`,
            sublabel: "Portfolio objectives",
          },
          {
            label: "Primary Goal",
            value: topGoal ? topGoal.title : "None",
            sublabel: topGoal
              ? `${Math.round(topGoal.progressPercentage)}% funded`
              : "Add goals in Portfolio",
            highlight: true,
          },
          {
            label: "Goal Runway",
            value:
              topGoal?.daysUntilTarget !== null && topGoal?.daysUntilTarget !== undefined
                ? topGoal.daysUntilTarget > 0
                  ? `${topGoal.daysUntilTarget} days`
                  : "Target date reached"
                : "No deadline set",
            sublabel: "To target milestone",
          },
          {
            label: "Pace Assessment",
            value: !topGoal ? "—" : topGoal.onTrack ? "Pacing Ahead" : "Under Pacing",
            sublabel: "Relative to timeline",
          },
        ],
        bullets:
          goals.length === 0
            ? [
                "No active financial goals configured.",
                "Visit Portfolio & Goals to establish target funds with target dates.",
              ]
            : goals.slice(0, 3).map(
                (g) =>
                  `• ${g.title}: ${g.progressPercentage.toFixed(0)}% funded (${
                    g.daysUntilTarget !== null
                      ? g.daysUntilTarget > 0
                        ? `${g.daysUntilTarget} days remaining`
                        : "Target date passed"
                      : "Open-ended timeline"
                  }) — ${g.onTrack ? "Pacing appropriately" : "Requires additional funding"}.`
              ),
        takeaway:
          goals.length === 0
            ? "Action: Establish at least one portfolio goal to monitor funding progress."
            : topGoal?.onTrack
            ? `Stance: ${topGoal.title} is tracking according to schedule.`
            : `Recommendation: Direct surplus cash flow toward ${topGoal?.title || "lagging goals"} to recover required pace.`,
      };
    }

    // 5. Debt & Liabilities
    if (
      lower.includes("debt") ||
      lower.includes("borrow") ||
      lower.includes("lent") ||
      lower.includes("commit") ||
      lower.includes("owe")
    ) {
      const netDebt = (debt?.unsettledBorrowed ?? 0) - (debt?.unsettledLent ?? 0);
      return {
        id,
        query: queryText,
        timestamp,
        title: "Counterparty Liabilities & Commitments",
        category: "debt",
        status: {
          label:
            !debt || debt.count === 0
              ? "Zero Exposure"
              : netDebt > 0
              ? "Net Payable Position"
              : "Net Receivable Position",
          variant: !debt || debt.count === 0 ? "neutral" : netDebt > 0 ? "warning" : "success",
        },
        metrics: [
          {
            label: "Unsettled Borrowed",
            value: debt ? formatAmount(debt.unsettledBorrowed, userCurrencySymbol) : "—",
            sublabel: "Amount owed to counterparties",
            highlight: true,
          },
          {
            label: "Unsettled Lent",
            value: debt ? formatAmount(debt.unsettledLent, userCurrencySymbol) : "—",
            sublabel: "Receivable from counterparties",
          },
          {
            label: "Net Position",
            value:
              debt && debt.count > 0
                ? netDebt >= 0
                  ? `Payable: ${formatAmount(netDebt, userCurrencySymbol)}`
                  : `Receivable: ${formatAmount(Math.abs(netDebt), userCurrencySymbol)}`
                : "Balanced",
            sublabel: "Net liability exposure",
          },
          {
            label: "Active Records",
            value: `${debt?.count ?? 0}`,
            sublabel: "Open commitments",
          },
        ],
        bullets: [
          debt && debt.unsettledBorrowed > 0
            ? `You have ${formatAmount(debt.unsettledBorrowed, userCurrencySymbol)} in open borrowed liabilities requiring settlement.`
            : "No unsettled borrowed amounts logged.",
          debt && debt.unsettledLent > 0
            ? `You are owed ${formatAmount(debt.unsettledLent, userCurrencySymbol)} from lending counterparties.`
            : "No active loans issued to others.",
        ],
        takeaway:
          debt && debt.unsettledBorrowed > 0
            ? `Recommendation: Schedule repayments for outstanding liabilities (${formatAmount(debt.unsettledBorrowed, userCurrencySymbol)}) to protect cash runway.`
            : "Stance: Clean balance sheet. Zero borrowed exposure detected.",
      };
    }

    // Default General Financial Health Synthesis
    return {
      id,
      query: queryText,
      timestamp,
      title: "Executive Financial Stance Synthesis",
      category: "general",
      status: {
        label: activePaceBadge.label,
        variant: getPaceVariant(paceStatus),
      },
      metrics: [
        {
          label: "Current Outflow",
          value: formatAmount(spent, userCurrencySymbol),
          sublabel:
            monthlyLimit > 0
              ? `${Math.round(limitUsedPct)}% of ${formatAmount(monthlyLimit, userCurrencySymbol)} ceiling`
              : "No limit set",
          highlight: true,
        },
        {
          label: "Daily Burn Allowance",
          value:
            dailyAllowance > 0
              ? `${formatAmount(dailyAllowance, userCurrencySymbol)} / day`
              : "Uncapped",
          sublabel: `${daysRemaining} days remaining in cycle`,
        },
        {
          label: "Net Monthly Flow",
          value:
            netCashFlow !== null
              ? `${netCashFlow >= 0 ? "+" : ""}${formatAmount(netCashFlow, userCurrencySymbol)}`
              : "—",
          sublabel: isPositiveCashFlow ? "Surplus" : "Deficit",
        },
        {
          label: "Active Objectives",
          value: `${goals.length} Goals`,
          sublabel: topGoal ? `${Math.round(topGoal.progressPercentage)}% funded` : "No targets",
        },
      ],
      bullets: [
        `Spending pace for ${monthLabel} is currently ${
          paceStatus === "over_limit"
            ? "exceeding planned budget limits"
            : paceStatus === "approaching_limit"
            ? "approaching threshold limits"
            : "tracking comfortably within planned limits"
        }.`,
        dailyAllowance > 0
          ? `You have a daily burn allowance of ${formatAmount(dailyAllowance, userCurrencySymbol)} per day for the remaining ${daysRemaining} days.`
          : "Establishing a spend limit provides deterministic daily allowance calculations.",
        topCategory
          ? `Leading category expenditure: ${topCategory.name} at ${Math.round(topCategory.percentage)}% of monthly outflows.`
          : "No category concentration detected.",
      ],
      takeaway:
        paceStatus === "over_limit"
          ? "Alert: Outflow has passed your monthly ceiling. Rebalance discretionary spending."
          : `Stance: Your financial velocity is healthy. Daily headroom is ${formatAmount(dailyAllowance, userCurrencySymbol)}/day.`,
    };
  };

  const handleSend = (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query) return;

    if (!textToSend) setInput("");
    setIsTyping(true);

    setTimeout(() => {
      const report = generateReport(query);
      setReports((prev) => [...prev, report]);
      setIsTyping(false);
      setTimeout(() => {
        consoleBottomRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 50);
    }, 400);
  };

  const handleClearHistory = () => {
    setReports([]);
  };

  // ── AI Chat handler ──────────────────────────────────────────────────────
  const handleChatSend = async (textToSend?: string) => {
    const text = (textToSend ?? chatInput).trim();
    if (!text || isChatLoading) return;

    setChatInput("");
    setChatError(null);

    const userMsg: ChatMessage = { role: "user", content: text };
    const nextMessages = [...chatMessages, userMsg];
    setChatMessages(nextMessages);
    setIsChatLoading(true);

    setTimeout(() => {
      chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 30);

    try {
      const reply = await AiApi.chat(nextMessages);
      const assistantMsg: ChatMessage = { role: "assistant", content: reply };
      setChatMessages((prev) => [...prev, assistantMsg]);
    } catch {
      setChatError("Something went wrong. Please try again.");
    } finally {
      setIsChatLoading(false);
      setTimeout(() => {
        chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 50);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <AppShell className="bg-slate-50 min-h-screen pb-24 selection:bg-slate-900 selection:text-white">
      <DesktopHeader />

      <Container size="2xl" className="pt-4 md:pt-8 px-4 sm:px-6 lg:px-8 max-w-6xl">
        <Stack gap={8}>

          {/* Mobile Back Header */}
          <div className="md:hidden flex items-center justify-between pb-3 border-b border-slate-200/60">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              <ChevronLeft size={16} />
              <span>Dashboard</span>
            </Link>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-900" />
              <span className="text-xs font-semibold text-slate-900 tracking-tight">Wazn Intelligence</span>
            </div>
          </div>

          {/* Page Executive Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/70">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                  Rule-based Engine
                </span>
                <span className="text-xs text-slate-400">•</span>
                <span className="text-xs font-medium text-slate-500">
                  {monthLabel} Cycle
                </span>
                <span className="text-xs text-slate-400">•</span>
                <span className="text-xs text-slate-500">
                  {daysRemaining} days remaining
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 tracking-tight">
                Financial Intelligence
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Deterministic daily tolerance, cash flow balance, and outflow surveillance.
              </p>
            </div>

            <div className="flex items-center gap-2.5 self-start sm:self-auto">
              {/* Pace Status Pill */}
              <div
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border shadow-2xs",
                  activePaceBadge.badgeClass
                )}
              >
                <span className={cn("w-2 h-2 rounded-full", activePaceBadge.dotClass)} />
                <span>{activePaceBadge.label}</span>
              </div>

              {/* Adjust Limit Action */}
              <button
                type="button"
                onClick={() => setIsLimitModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-800 transition-colors shadow-2xs cursor-pointer"
              >
                <SlidersHorizontal size={13} className="text-slate-500" />
                <span>Adjust Limit</span>
              </button>
            </div>
          </div>

          {/* ── TODAY'S DAILY LIMIT NUDGE ─────────────────────────────────── */}
          {showTodayNudge && (
            <div
              className={cn(
                "flex items-start gap-4 px-5 py-4 rounded-2xl border shadow-xs",
                todayLimitReached
                  ? "bg-rose-50 border-rose-200/80"
                  : "bg-amber-50 border-amber-200/80"
              )}
              role="alert"
            >
              {/* Icon */}
              <div
                className={cn(
                  "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5",
                  todayLimitReached
                    ? "bg-rose-100 text-rose-600"
                    : "bg-amber-100 text-amber-600"
                )}
              >
                {todayLimitReached ? (
                  <OctagonAlert size={18} strokeWidth={2} />
                ) : (
                  <AlertTriangle size={18} strokeWidth={2} />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span
                    className={cn(
                      "text-sm font-semibold tracking-tight",
                      todayLimitReached ? "text-rose-900" : "text-amber-900"
                    )}
                  >
                    {todayLimitReached
                      ? "Today's Spend Allowance Reached"
                      : "Approaching Today's Daily Limit"}
                  </span>
                  <span
                    className={cn(
                      "text-[11px] font-bold px-2 py-0.5 rounded-full border tabular-nums",
                      todayLimitReached
                        ? "bg-rose-100 text-rose-700 border-rose-200"
                        : "bg-amber-100 text-amber-700 border-amber-200"
                    )}
                  >
                    {Math.round(todayUsedPct)}% used today
                  </span>
                </div>

                <p
                  className={cn(
                    "text-xs leading-relaxed",
                    todayLimitReached ? "text-rose-800" : "text-amber-800"
                  )}
                >
                  {todayLimitReached ? (
                    <>
                      You've spent{" "}
                      <span className="font-semibold tabular-nums">
                        {formatAmount(todaySpent, userCurrencySymbol)}
                      </span>{" "}
                      today, exceeding your daily allowance of{" "}
                      <span className="font-semibold tabular-nums">
                        {formatAmount(dailyAllowance, userCurrencySymbol)}
                      </span>{" "}
                      by{" "}
                      <span className="font-semibold tabular-nums">
                        {formatAmount(todayExcess, userCurrencySymbol)}
                      </span>
                      . Any further spending today increases your overage.
                    </>
                  ) : (
                    <>
                      You've spent{" "}
                      <span className="font-semibold tabular-nums">
                        {formatAmount(todaySpent, userCurrencySymbol)}
                      </span>{" "}
                      today.{" "}
                      <span className="font-semibold tabular-nums">
                        {formatAmount(todayRemainingAllowance, userCurrencySymbol)}
                      </span>{" "}
                      remains within today's daily allowance of{" "}
                      <span className="font-semibold tabular-nums">
                        {formatAmount(dailyAllowance, userCurrencySymbol)}
                      </span>
                      .
                    </>
                  )}
                </p>

                {/* Mini progress strip */}
                <div className="mt-2.5">
                  <div
                    className={cn(
                      "h-1.5 rounded-full overflow-hidden",
                      todayLimitReached ? "bg-rose-200" : "bg-amber-200"
                    )}
                  >
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        todayLimitReached ? "bg-rose-500" : "bg-amber-500"
                      )}
                      style={{ width: `${Math.min(100, todayUsedPct)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Dismiss hint */}
              <div className="shrink-0">
                <button
                  type="button"
                  onClick={() => handleSend("What is my daily spend tolerance?")}
                  className={cn(
                    "text-[11px] font-semibold px-2.5 py-1 rounded-lg border cursor-pointer transition-colors whitespace-nowrap",
                    todayLimitReached
                      ? "bg-rose-100 border-rose-200 text-rose-700 hover:bg-rose-200"
                      : "bg-amber-100 border-amber-200 text-amber-700 hover:bg-amber-200"
                  )}
                >
                  View analysis
                </button>
              </div>
            </div>
          )}

          {/* ── SECTION 1: Executive Tolerance & Vitals Stance ── */}
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-100">

              {/* Left: Daily Tolerance & Spend Velocity (7 cols) */}
              <div className="lg:col-span-7 p-6 sm:p-7 flex flex-col justify-between gap-6">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      Daily Spend Tolerance
                    </span>
                    <span className="text-xs font-medium text-slate-500">
                      Day {daysElapsed} of {daysInMonth} ({monthProgressPct}% elapsed)
                    </span>
                  </div>

                  {/* Primary Allowance Readout */}
                  <div className="flex flex-wrap items-baseline gap-2.5">
                    <span className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 tabular-nums">
                      {intelLoading
                        ? "—"
                        : dailyAllowance > 0
                        ? formatAmount(dailyAllowance, userCurrencySymbol)
                        : "No limit set"}
                    </span>
                    <span className="text-sm font-medium text-slate-500">
                      {dailyAllowance > 0 ? "/ day remaining allowance" : ""}
                    </span>
                  </div>

                  {/* Actual Pace vs Allowance Comparison */}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200/80 text-xs text-slate-700">
                      <span className="text-slate-400">Actual pace:</span>
                      <span className="font-semibold tabular-nums">
                        {intelLoading
                          ? "—"
                          : `${formatAmount(dailyAvgActual, userCurrencySymbol)} / day`}
                      </span>
                    </div>

                    {dailyAllowance > 0 && (
                      <div
                        className={cn(
                          "inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border",
                          dailyAvgActual <= dailyAllowance
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200/70"
                            : "bg-amber-50 text-amber-700 border-amber-200/70"
                        )}
                      >
                        {dailyAvgActual <= dailyAllowance ? (
                          <>
                            <TrendingDown size={13} />
                            <span>
                              Under pace by{" "}
                              {formatAmount(
                                dailyAllowance - dailyAvgActual,
                                userCurrencySymbol
                              )}
                              /day
                            </span>
                          </>
                        ) : (
                          <>
                            <TrendingUp size={13} />
                            <span>
                              Over pace by{" "}
                              {formatAmount(
                                dailyAvgActual - dailyAllowance,
                                userCurrencySymbol
                              )}
                              /day
                            </span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Calibrated Spending Runway Bar */}
                <div className="pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="text-slate-500 font-medium">
                      Cycle Spending Runway
                    </span>
                    <span className="font-semibold text-slate-800 tabular-nums">
                      {formatAmount(spent, userCurrencySymbol)}
                      {monthlyLimit > 0 && (
                        <span className="text-slate-400 font-normal">
                          {" "}
                          / {formatAmount(monthlyLimit, userCurrencySymbol)} (
                          {Math.round(limitUsedPct)}%)
                        </span>
                      )}
                    </span>
                  </div>

                  {/* Progress track */}
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden relative">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        paceStatus === "over_limit"
                          ? "bg-rose-500"
                          : paceStatus === "approaching_limit"
                          ? "bg-amber-500"
                          : "bg-emerald-500"
                      )}
                      style={{ width: `${Math.min(100, limitUsedPct)}%` }}
                    />
                  </div>

                  {/* Footnote details */}
                  <div className="mt-2.5 flex flex-wrap items-center justify-between text-xs text-slate-500">
                    <span>
                      {monthlyLimit > 0
                        ? `${formatAmount(remainingBudget, userCurrencySymbol)} remaining runway`
                        : "Spend limit inactive"}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span>
                        {limitSource === "user"
                          ? "Custom ceiling"
                          : limitSource === "no_income"
                          ? "No income baseline"
                          : "17% income rule"}
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsLimitModalOpen(true)}
                        className="text-slate-900 font-medium underline underline-offset-2 hover:text-slate-600 cursor-pointer"
                      >
                        Adjust
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: Key Diagnostic Vitals (5 cols) */}
              <div className="lg:col-span-5 p-6 sm:p-7 bg-slate-50/50 flex flex-col justify-between gap-4">
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-4">
                    Core Financial Diagnostics
                  </span>

                  <div className="space-y-4">
                    {/* Diagnostic 1: Cash Flow */}
                    <div className="p-3.5 rounded-xl bg-white border border-slate-200/70 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-500">
                          Net Cash Flow
                        </span>
                        <span
                          className={cn(
                            "text-xs font-semibold px-2 py-0.5 rounded-md",
                            isPositiveCashFlow
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-rose-50 text-rose-700"
                          )}
                        >
                          {isPositiveCashFlow ? "Surplus" : "Deficit"}
                        </span>
                      </div>
                      <div
                        className={cn(
                          "text-xl font-bold tracking-tight mt-1 tabular-nums",
                          isPositiveCashFlow ? "text-slate-900" : "text-rose-600"
                        )}
                      >
                        {intelLoading
                          ? "—"
                          : netCashFlow !== null
                          ? `${netCashFlow >= 0 ? "+" : ""}${formatAmount(netCashFlow, userCurrencySymbol)}`
                          : "—"}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Inflows: {formatAmount(income, userCurrencySymbol)} • Outflows:{" "}
                        {formatAmount(spent, userCurrencySymbol)}
                      </div>
                    </div>

                    {/* Diagnostic 2: Savings Rate */}
                    <div className="p-3.5 rounded-xl bg-white border border-slate-200/70 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-500">
                          Savings Retention Rate
                        </span>
                        <span className="text-xs text-slate-400 font-medium">
                          Post-outflow
                        </span>
                      </div>
                      <div className="text-xl font-bold tracking-tight text-slate-900 mt-1 tabular-nums">
                        {intelLoading ? "—" : savingsRate ?? "No income recorded"}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {savingsRate
                          ? "Proportion of active month income retained"
                          : "Log monthly income to unlock retention rate"}
                      </div>
                    </div>

                    {/* Diagnostic 3: Liabilities */}
                    <div className="p-3.5 rounded-xl bg-white border border-slate-200/70 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-500">
                          Unsettled Commitments
                        </span>
                        <span className="text-xs text-slate-400 font-medium">
                          {debt?.count ?? 0} active
                        </span>
                      </div>
                      <div className="text-xl font-bold tracking-tight text-slate-900 mt-1 tabular-nums">
                        {intelLoading ? "—" : upcomingCommitments ?? "Zero liabilities"}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Borrowed obligations requiring settlement
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-2 text-[11px] text-slate-400 flex items-center gap-1.5">
                  <ShieldCheck size={13} className="text-slate-500" />
                  <span>Calculated deterministically from local records.</span>
                </div>
              </div>

            </div>
          </div>

          {/* ── SECTION 2: Structural Signals & Drivers Grid ── */}
          <div>
            <div className="flex items-center justify-between mb-3.5">
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Portfolio Drivers & Signals
              </h2>
              <span className="text-xs text-slate-400">
                Rule-evaluated drivers
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

              {/* Signal 1: Leading Category */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between gap-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-700">
                      Primary Outflow Driver
                    </span>
                    <span
                      className={cn(
                        "px-2 py-0.5 rounded-full text-[11px] font-semibold border",
                        !topCategory
                          ? "bg-slate-50 text-slate-500 border-slate-100"
                          : topCategory.signal === "rising"
                          ? "bg-amber-50 text-amber-700 border-amber-200/60"
                          : topCategory.signal === "falling"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200/60"
                          : "bg-slate-50 text-slate-700 border-slate-200"
                      )}
                    >
                      {!topCategory
                        ? "None"
                        : topCategory.signal === "rising"
                        ? "Velocity Rising"
                        : topCategory.signal === "falling"
                        ? "Velocity Falling"
                        : "Velocity Stable"}
                    </span>
                  </div>

                  <div className="text-xl font-bold tracking-tight text-slate-900 mt-1">
                    {intelLoading ? "—" : topCategory ? topCategory.name : "No expenses"}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {topCategory
                      ? `${formatAmount(topCategory.amount, userCurrencySymbol)} spent (${Math.round(topCategory.percentage)}% of total)`
                      : "No category concentration logged"}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Monthly delta:</span>
                  <span className="font-semibold text-slate-800 tabular-nums">
                    {topCategory?.changeVsPrevMonthPct !== null &&
                    topCategory?.changeVsPrevMonthPct !== undefined
                      ? `${topCategory.changeVsPrevMonthPct >= 0 ? "+" : ""}${topCategory.changeVsPrevMonthPct.toFixed(0)}% vs last month`
                      : "No baseline"}
                  </span>
                </div>
              </div>

              {/* Signal 2: Milestone & Goal Pace */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between gap-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-700">
                      Portfolio Milestone
                    </span>
                    <span
                      className={cn(
                        "px-2 py-0.5 rounded-full text-[11px] font-semibold border",
                        !topGoal
                          ? "bg-slate-50 text-slate-500 border-slate-100"
                          : topGoal.onTrack
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200/60"
                          : "bg-amber-50 text-amber-700 border-amber-200/60"
                      )}
                    >
                      {!topGoal
                        ? "No Goals"
                        : topGoal.onTrack
                        ? "On Track"
                        : "Behind Pace"}
                    </span>
                  </div>

                  <div className="text-xl font-bold tracking-tight text-slate-900 mt-1">
                    {intelLoading ? "—" : topGoal ? topGoal.title : "No active goals"}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {topGoal
                      ? `${topGoal.progressPercentage.toFixed(0)}% of target funded`
                      : "Create goals in Portfolio to track milestones"}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Target runway:</span>
                  <span className="font-semibold text-slate-800">
                    {topGoal?.daysUntilTarget !== null && topGoal?.daysUntilTarget !== undefined
                      ? topGoal.daysUntilTarget > 0
                        ? `${topGoal.daysUntilTarget} days left`
                        : "Target date reached"
                      : "Open target"}
                  </span>
                </div>
              </div>

              {/* Signal 3: Counterparty Position */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between gap-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-700">
                      Obligations Balance
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold border bg-slate-50 text-slate-700 border-slate-200">
                      {debt?.count ?? 0} Records
                    </span>
                  </div>

                  <div className="text-xl font-bold tracking-tight text-slate-900 mt-1 tabular-nums">
                    {intelLoading
                      ? "—"
                      : debt && debt.unsettledBorrowed > 0
                      ? formatAmount(debt.unsettledBorrowed, userCurrencySymbol)
                      : "Zero Debt"}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {debt && debt.unsettledLent > 0
                      ? `Lent out: ${formatAmount(debt.unsettledLent, userCurrencySymbol)} receivable`
                      : "No active lending entries"}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Net exposure:</span>
                  <span className="font-semibold text-slate-800">
                    {!debt || debt.count === 0
                      ? "Balanced"
                      : debt.unsettledBorrowed >= debt.unsettledLent
                      ? "Net Payable"
                      : "Net Receivable"}
                  </span>
                </div>
              </div>

            </div>
          </div>

          {/* ── SECTION 3: Wazn Financial Query Console ── */}
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
            {/* Console Header Bar */}
            <div className="p-5 sm:px-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50/40">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-slate-900" />
                  <h2 className="text-sm font-semibold text-slate-900 tracking-tight">
                    Financial Inquiries & Surveillance
                  </h2>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Query real-time metrics, tolerance limits, and cash flow via deterministic rules
                </p>
              </div>

              {reports.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearHistory}
                  className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors shadow-2xs cursor-pointer"
                >
                  <RotateCcw size={12} className="text-slate-400" />
                  <span>Clear inquiries</span>
                </button>
              )}
            </div>

            {/* Quick Diagnostic Inquiry Chips */}
            <div className="px-5 sm:px-6 py-3 border-b border-slate-100 bg-white flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1">
                Quick Queries:
              </span>
              {[
                { label: "Daily Tolerance", query: "What is my daily spend tolerance?" },
                { label: "Spending Velocity", query: "Analyze my monthly spending pace" },
                { label: "Cash Flow & Surplus", query: "Check cash flow and savings rate" },
                { label: "Goal Runway", query: "Review financial goal milestones" },
                { label: "Debt Obligations", query: "Audit active debt and commitments" },
              ].map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => handleSend(item.query)}
                  className="text-xs font-medium text-slate-700 hover:text-slate-950 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50/80 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Reports Stream */}
            <div className="p-5 sm:p-6 space-y-6 min-h-[220px]">
              {reports.length === 0 && !isTyping ? (
                /* Clean Empty State with Structured Starters */
                <div className="py-8 px-4 text-center max-w-lg mx-auto flex flex-col items-center">
                  <div className="w-10 h-10 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 mb-3 shadow-2xs">
                    <Compass size={20} />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-800">
                    Ready for Financial Inquiries
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Select a quick query above or type a specific question about your daily tolerance allowance, monthly burn rate, or active obligations.
                  </p>
                </div>
              ) : (
                /* Report Cards */
                <div className="space-y-6">
                  {reports.map((report) => {
                    const statusClass =
                      report.status.variant === "success"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200/80"
                        : report.status.variant === "warning"
                        ? "bg-amber-50 text-amber-700 border-amber-200/80"
                        : report.status.variant === "danger"
                        ? "bg-rose-50 text-rose-700 border-rose-200/80"
                        : "bg-slate-50 text-slate-700 border-slate-200";

                    return (
                      <div
                        key={report.id}
                        className="rounded-2xl border border-slate-200 bg-white shadow-2xs overflow-hidden"
                      >
                        {/* Report Header */}
                        <div className="px-5 py-3.5 bg-slate-50/60 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                              Inquiry:
                            </span>
                            <span className="text-xs font-semibold text-slate-800">
                              "{report.query}"
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                "px-2.5 py-0.5 rounded-full text-[11px] font-semibold border",
                                statusClass
                              )}
                            >
                              {report.status.label}
                            </span>
                            <span className="text-[10px] text-slate-400 tabular-nums">
                              {report.timestamp}
                            </span>
                          </div>
                        </div>

                        {/* Report Body */}
                        <div className="p-5 sm:p-6 space-y-5">
                          <div>
                            <h4 className="text-base font-semibold text-slate-900 tracking-tight">
                              {report.title}
                            </h4>
                          </div>

                          {/* Metrics Grid */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {report.metrics.map((metric, idx) => (
                              <div
                                key={idx}
                                className={cn(
                                  "p-3 rounded-xl border",
                                  metric.highlight
                                    ? "bg-slate-50/80 border-slate-200"
                                    : "bg-white border-slate-100"
                                )}
                              >
                                <span className="text-[11px] font-medium text-slate-400 block">
                                  {metric.label}
                                </span>
                                <span
                                  className={cn(
                                    "text-base sm:text-lg font-bold tracking-tight block mt-0.5 tabular-nums",
                                    metric.highlight ? "text-slate-900" : "text-slate-800"
                                  )}
                                >
                                  {metric.value}
                                </span>
                                {metric.sublabel && (
                                  <span className="text-[10px] text-slate-400 block mt-0.5">
                                    {metric.sublabel}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>

                          {/* Bulleted Insights */}
                          <div className="p-4 rounded-xl bg-slate-50/50 border border-slate-100 space-y-2">
                            {report.bullets.map((bullet, idx) => (
                              <div
                                key={idx}
                                className="text-xs text-slate-700 leading-relaxed flex items-start gap-2"
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 shrink-0" />
                                <span>{bullet}</span>
                              </div>
                            ))}
                          </div>

                          {/* Executive Takeaway */}
                          <div className="p-3.5 rounded-xl bg-slate-900 text-white flex items-start gap-3">
                            <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center text-white shrink-0 mt-0.5">
                              <Sparkles size={13} />
                            </div>
                            <div className="text-xs leading-relaxed text-slate-200">
                              {report.takeaway}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Typing Indicator */}
                  {isTyping && (
                    <div className="p-4 rounded-2xl border border-slate-200 bg-white flex items-center gap-2 shadow-2xs">
                      <span className="text-xs text-slate-500 font-medium mr-2">
                        Evaluating financial rules…
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-pulse" />
                        <span
                          className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-pulse"
                          style={{ animationDelay: "150ms" }}
                        />
                        <span
                          className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-pulse"
                          style={{ animationDelay: "300ms" }}
                        />
                      </div>
                    </div>
                  )}

                  <div ref={consoleBottomRef} />
                </div>
              )}
            </div>

            {/* Anchored Command Input */}
            <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/50">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="relative flex items-center"
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask a question (e.g. 'What is my daily tolerance?', 'Analyze spending')…"
                  className="w-full bg-white border border-slate-200 rounded-xl pl-4 pr-12 py-3 text-sm font-normal text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-300 transition-all shadow-2xs"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isTyping}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed text-white flex items-center justify-center transition-all cursor-pointer shadow-2xs"
                  title="Submit inquiry (Enter)"
                >
                  <ArrowUp size={15} strokeWidth={2.2} />
                </button>
              </form>
            </div>
          </div>

        </Stack>
      </Container>

      {/* Spend Limit Modal */}
      <SpendLimitModal
        isOpen={isLimitModalOpen}
        onClose={() => setIsLimitModalOpen(false)}
        currentLimit={monthlyLimit}
        income={income}
        hasIncome={hasIncome}
        userCurrencySymbol={userCurrencySymbol}
        daysRemaining={daysRemaining}
        monthKey={monthKey}
        onSaved={() => refetchIntel()}
      />

      {/* ── WAZN AI FLOATING ACTION BUTTON ── */}
      <button
        type="button"
        onClick={() => setIsChatSidebarOpen(true)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-slate-900 shadow-xl flex items-center justify-center cursor-pointer hover:scale-105 transition-transform border border-slate-700"
      >
        <img src="/logo.jpg" alt="Wazn AI" className="w-full h-full object-cover scale-[1.35] rounded-full mix-blend-screen opacity-90" />
      </button>

      {/* ── WAZN AI SIDEBAR DRAWER ── */}
      <AnimatePresence>
        {isChatSidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsChatSidebarOpen(false)}
              className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ x: '100%', opacity: 0.5 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0.5 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 right-0 z-50 w-full sm:w-[420px] bg-white shadow-2xl flex flex-col border-l border-slate-200"
            >
              {/* ── WAZN AI CHAT ─────────────────────────────────────────────────── */}
          
            {/* Chat Header */}
            <div className="shrink-0 p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/40">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles size={14} className="text-slate-500" />
                  <h2 className="text-sm font-semibold text-slate-900 tracking-tight">Wazn AI</h2>
                  <span className="text-[10px] font-semibold text-slate-400 px-1.5 py-0.5 rounded-md bg-slate-100 border border-slate-200 uppercase tracking-wide">Beta</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {chatMessages.length > 0 && (
                  <button type="button" onClick={() => { setChatMessages([]); setChatError(null); }} className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 transition-colors" title="New Chat">
                    <RotateCcw size={14} />
                  </button>
                )}
                <button type="button" onClick={() => setIsChatSidebarOpen(false)} className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 transition-colors" title="Close AI">
                  <X size={18} />
                </button>
              </div>
            </div>
                        {/* Message Thread */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
              {chatMessages.length === 0 && !isChatLoading ? (
                <div className="py-6 text-center flex flex-col items-center gap-2">
                  <p className="text-xs text-slate-400 font-medium max-w-xs leading-relaxed">
                    Ask about budgeting, savings rates, debt management, or any finance topic.
                  </p>
                  {/* Starter suggestions */}
                  <div className="mt-2 flex flex-wrap justify-center gap-2">
                    {[
                      "How do I build an emergency fund?",
                      "What is the 50/30/20 rule?",
                      "How should I prioritise debt repayment?",
                    ].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => handleChatSend(s)}
                        className="text-xs font-medium text-slate-700 hover:text-slate-950 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50/80 hover:bg-slate-100 transition-colors cursor-pointer"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {chatMessages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        "flex",
                        msg.role === "user" ? "justify-end" : "justify-start"
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed",
                          msg.role === "user"
                            ? "bg-slate-900 text-white rounded-br-sm"
                            : "bg-slate-100 text-slate-800 rounded-bl-sm"
                        )}
                      >
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    </div>
                  ))}

                  {/* Loading indicator */}
                  {isChatLoading && (
                    <div className="flex justify-start">
                      <div className="bg-slate-100 px-4 py-2.5 rounded-2xl rounded-bl-sm flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-pulse" />
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-pulse" style={{ animationDelay: "150ms" }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-pulse" style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>
                  )}

                  {/* Error state */}
                  {chatError && (
                    <div className="flex justify-start">
                      <div className="bg-rose-50 border border-rose-200/80 text-rose-700 px-4 py-2.5 rounded-2xl rounded-bl-sm text-xs font-medium">
                        {chatError}
                      </div>
                    </div>
                  )}

                  <div ref={chatBottomRef} />
                </div>
              )}
            </div>

            {/* Chat Input */}
            <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/50 shrink-0">
              <form
                onSubmit={(e) => { e.preventDefault(); handleChatSend(); }}
                className="relative flex items-center"
              >
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask Wazn anything…"
                  disabled={isChatLoading}
                  className="w-full bg-white border border-slate-200 rounded-xl pl-4 pr-12 py-3 text-sm font-normal text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-300 transition-all shadow-2xs disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim() || isChatLoading}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed text-white flex items-center justify-center transition-all cursor-pointer shadow-2xs"
                  title="Send (Enter)"
                >
                  <ArrowUp size={15} strokeWidth={2.2} />
                </button>
              </form>
            </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </AppShell>
  );
}
