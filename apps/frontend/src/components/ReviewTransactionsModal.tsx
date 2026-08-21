import React, { useState } from "react";
import { createPortal } from "react-dom";
import { X, Sparkles, ChevronDown, Plus, Loader2 } from "lucide-react";
import { SectionInfoModal } from "./SectionInfoModal";
import { useAuth } from "../core/providers/AuthContext";
import { formatCurrency } from "../utils/currency";
import { useCreateBulkMappings } from "../core/api/transactions";
import { useCustomCategories, useCreateCustomCategory } from "../core/api/categories";
import { cn } from "@expenseflow/ui";

const CATEGORIES = [
  "Food",
  "Transport and Vehicle",
  "Household",
  "Shopping and Lifestyle",
  "Bills and Utilities",
  "Health",
  "Travel",
  "Entertainment",
  "Education",
  "Finance",
  "Others"
];

interface ReviewItem {
  term: string;
  transactionCount: number;
  totalAmount: number;
}

interface ReviewTransactionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: ReviewItem[];
}

export const ReviewTransactionsModal: React.FC<ReviewTransactionsModalProps> = ({ isOpen, onClose, items }) => {
  const [mappings, setMappings] = useState<Record<string, { category: string; ignored?: boolean }>>({});
  const { mutate: saveMappings, isPending } = useCreateBulkMappings();
  const { data: customCategories } = useCustomCategories();
  const { mutate: createCategory, isPending: isCreatingCategory } = useCreateCustomCategory();
  const { user } = useAuth();
  const userCurrency = user?.currency || "INR";
  
  const [expandedDropdown, setExpandedDropdown] = useState<string | null>(null);
  const [creatingCategoryFor, setCreatingCategoryFor] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState("");

  const ALL_CATEGORIES = [
    ...CATEGORIES,
    ...(customCategories?.map(c => c.name) || [])
  ];

  if (!isOpen) return null;

  const handleSelect = (term: string, category: string, ignored: boolean = false) => {
    setMappings(prev => ({
      ...prev,
      [term]: { category, ignored }
    }));
    setExpandedDropdown(null);
  };

  const handleSave = () => {
    const payload = Object.entries(mappings).map(([term, data]) => ({
      normalizedTerm: term,
      category: data.category,
      ignored: data.ignored
    }));
    if (payload.length > 0) {
      saveMappings({ mappings: payload }, {
        onSuccess: () => {
          setMappings({});
          onClose();
        }
      });
    } else {
      onClose();
    }
  };

  const handleClose = () => {
    setMappings({});
    setExpandedDropdown(null);
    setCreatingCategoryFor(null);
    setNewCategoryName("");
    onClose();
  };

  const handleCreateCategory = (term: string) => {
    if (!newCategoryName.trim()) return;
    createCategory(newCategoryName.trim(), {
      onSuccess: (newCat) => {
        handleSelect(term, newCat.name);
        setCreatingCategoryFor(null);
        setNewCategoryName("");
      }
    });
  };

  // Only show items that haven't been decided on yet
  const pendingItems = items.filter(item => !mappings[item.term]);
  const completedCount = Object.keys(mappings).length;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm animate-in fade-in"
      onClick={handleClose}
    >
      <div
        className="relative w-full max-w-sm sm:max-w-md max-h-[85vh] flex flex-col bg-slate-50 border border-slate-200 rounded-[28px] shadow-2xl animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200/60 bg-white rounded-t-[28px]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
              <Sparkles size={18} className="text-indigo-600" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-base font-bold text-slate-900 tracking-tight">Teach Expensio</h3>
                <SectionInfoModal
                  content={{
                    title: "Teach Expensio",
                    subtitle: "Smart Categorization Engine",
                    description: "Review and map unrecognized transactions to categories. Expensio learns from your choices to auto-categorize future spending automatically.",
                  }}
                  theme="auto"
                  align="center"
                />
              </div>
              <p className="text-xs text-slate-500 font-medium">{items.length} categories need your help</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body: only render unmapped items so decided items disappear immediately */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {pendingItems.length === 0 && (
            <p className="text-center text-sm text-slate-500 py-6">All done! Tap Save to apply.</p>
          )}
          {pendingItems.map((item) => {
            const isMapped = !!mappings[item.term];
            const mappingData = mappings[item.term];
            const isDropdownOpen = expandedDropdown === item.term;

            return (
              <div key={item.term} className="bg-white border border-slate-200/70 rounded-2xl p-4 shadow-xs flex flex-col gap-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">{item.term}</h4>
                    <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                      {item.transactionCount} transaction{item.transactionCount !== 1 ? 's' : ''} · {formatCurrency(item.totalAmount, userCurrency)}
                    </p>
                  </div>
                </div>

                <div className="relative w-full">
                  <button
                    onClick={() => setExpandedDropdown(isDropdownOpen ? null : item.term)}
                    className={cn(
                      "w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-xs font-semibold transition-colors cursor-pointer",
                      isMapped
                        ? (mappingData.ignored ? "bg-slate-100 border-slate-200 text-slate-500" : "bg-indigo-50 border-indigo-200 text-indigo-700")
                        : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                    )}
                  >
                    <span>
                      {isMapped ? (mappingData.ignored ? "Ignored" : mappingData.category) : "Choose category"}
                    </span>
                    <ChevronDown size={14} className={cn("transition-transform", isDropdownOpen && "rotate-180")} />
                  </button>

                  {isDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-56 overflow-y-auto py-1 flex flex-col">
                      {ALL_CATEGORIES.map(cat => (
                        <button
                          key={cat}
                          onClick={() => handleSelect(item.term, cat)}
                          className="w-full text-left px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 cursor-pointer"
                        >
                          {cat}
                        </button>
                      ))}
                      
                      {creatingCategoryFor === item.term ? (
                        <div className="px-3 py-2 border-t border-slate-100 bg-slate-50 flex items-center gap-2">
                          <input
                            type="text"
                            autoFocus
                            placeholder="Category name"
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleCreateCategory(item.term);
                              if (e.key === 'Escape') setCreatingCategoryFor(null);
                            }}
                            className="flex-1 min-w-0 bg-white border border-slate-200 rounded-md px-2 py-1.5 text-xs text-slate-900 outline-none focus:border-indigo-500"
                            disabled={isCreatingCategory}
                          />
                          <button
                            onClick={() => handleCreateCategory(item.term)}
                            disabled={isCreatingCategory || !newCategoryName.trim()}
                            className="shrink-0 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white px-2 py-1.5 rounded-md text-xs font-semibold flex items-center justify-center min-w-[50px]"
                          >
                            {isCreatingCategory ? <Loader2 size={12} className="animate-spin" /> : 'Create'}
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setCreatingCategoryFor(item.term)}
                          className="w-full text-left px-4 py-2 text-xs font-medium text-indigo-600 hover:bg-indigo-50 cursor-pointer flex items-center gap-1.5 border-t border-slate-100 mt-1 pt-2"
                        >
                          <Plus size={14} /> Create new category
                        </button>
                      )}

                      <div className="h-px bg-slate-100 my-1 mx-2"></div>
                      <button
                        onClick={() => handleSelect(item.term, "Uncategorized", true)}
                        className="w-full text-left px-4 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 cursor-pointer"
                      >
                        Ignore (Don't ask again)
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-200/60 bg-white rounded-b-[28px]">
          <button
            onClick={handleSave}
            disabled={isPending || completedCount === 0}
            className="w-full py-3 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white text-sm font-bold rounded-xl transition-colors cursor-pointer shadow-sm flex justify-center items-center gap-2"
          >
            {isPending ? "Saving..." : `Save ${completedCount} Mapping${completedCount !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
