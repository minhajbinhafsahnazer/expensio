import React from "react";
import { cn } from "../utils";
import { Trash2 } from "lucide-react";

export interface ReceiptItem {
  id: string;
  icon?: string | React.ReactNode;
  label: string;
  amount: number;
  type?: "expense" | "income";
  date?: string;
  currencySymbol?: string;
}

export interface ReceiptSessionListProps extends React.HTMLAttributes<HTMLDivElement> {
  items: ReceiptItem[];
  onAddAnother: () => void;
  onDone: () => void;
  onRemoveItem?: (id: string) => void;
  currencySymbol?: string;
  title?: string;
}

export const ReceiptSessionList: React.FC<ReceiptSessionListProps> = ({
  className,
  items,
  onAddAnother,
  onDone,
  onRemoveItem,
  currencySymbol = "",
  title = "Receipt Session",
  ...props
}) => {
  const totalExpense = items
    .filter((i) => i.type !== "income")
    .reduce((sum, item) => sum + item.amount, 0);

  const totalIncome = items
    .filter((i) => i.type === "income")
    .reduce((sum, item) => sum + item.amount, 0);

  const netTotal = totalIncome - totalExpense;

  const formatCurrency = (val: number) => {
    return val.toLocaleString("en-IN", {
      minimumFractionDigits: Number.isInteger(val) ? 0 : 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <div className={cn("w-full flex flex-col gap-2 pt-1 select-none", className)} {...props}>
      {/* Items List (Only if items exist) */}
      {items.length > 0 && (
        <div className="flex flex-col gap-2 pt-2 border-t border-slate-100">
          <div className="flex items-baseline justify-between">
            <span className="text-xs font-bold text-slate-900 tracking-tight">
              {title}
              <span className="text-[11px] font-normal text-slate-400 ml-1.5 font-mono">
                ({items.length} {items.length === 1 ? "entry" : "entries"})
              </span>
            </span>

            {/* Visually Larger Net Total */}
            <div className="flex items-baseline gap-1 font-mono">
              <span className="text-[10px] font-semibold text-slate-400 uppercase">Net</span>
              <span
                className={cn(
                  "text-sm font-extrabold",
                  netTotal >= 0 ? "text-emerald-600" : "text-slate-900"
                )}
              >
                {netTotal < 0 ? "-" : "+"}{currencySymbol}{formatCurrency(Math.abs(netTotal))}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-1.5 max-h-28 overflow-y-auto pr-0.5">
            {items.map((item) => {
              const isIncome = item.type === "income";
              return (
                <div
                  key={item.id}
                  className="group flex items-center justify-between py-1.5 px-2 rounded-lg bg-slate-50/70 hover:bg-slate-100/80 transition-colors border border-slate-100"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={cn(
                        "text-[9.5px] font-black uppercase px-1.5 py-0.5 rounded tracking-wide",
                        isIncome
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-slate-200 text-slate-700"
                      )}
                    >
                      {isIncome ? "Income" : "Expense"}
                    </span>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-semibold text-slate-800 truncate">
                        {item.label}
                      </span>
                      {item.date && (
                        <span className="text-[10px] text-slate-400 font-medium leading-none mt-0.5">
                          {item.date}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    <span
                      className={cn(
                        "text-xs font-bold font-mono",
                        isIncome ? "text-emerald-600" : "text-slate-900"
                      )}
                    >
                      {isIncome ? "+" : "-"}{item.currencySymbol || currencySymbol}{formatCurrency(item.amount)}
                    </span>
                    {onRemoveItem && (
                      <button
                        type="button"
                        onClick={() => onRemoveItem(item.id)}
                        aria-label={`Remove ${item.label}`}
                        className="w-6 h-6 rounded-md inline-flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Action Buttons: Done */}
      <div className="pt-2 border-t border-slate-100">
        <button
          type="button"
          onClick={onDone}
          style={{ borderRadius: "10px" }}
          className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold tracking-tight transition-colors flex items-center justify-center shadow-2xs active:scale-[0.98]"
        >
          {items.length > 0 ? `Save All (${items.length} ${items.length === 1 ? "entry" : "entries"})` : "Done"}
        </button>
      </div>
    </div>
  );
};
