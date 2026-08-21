import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2 } from 'lucide-react';
import { Button } from '@expenseflow/ui';
import { TransactionsApi } from '../core/api/transactions';
import { useQueryClient } from '@tanstack/react-query';
import { useCustomCategories } from '../core/api/categories';
import { useAuth } from "../core/providers/AuthContext";
import { formatCurrency } from "../utils/currency";

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

interface EditTransactionCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: {
    id: string;
    description: string;
    amount: number;
    currentCategory: string;
  } | null;
}

export function EditTransactionCategoryModal({ isOpen, onClose, transaction }: EditTransactionCategoryModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const { user } = useAuth();
  const userCurrency = user?.currency || "INR";
  const queryClient = useQueryClient();

  const { data: customCategories } = useCustomCategories();

  // Initialize selected category when modal opens
  if (isOpen && transaction && !selectedCategory) {
    setSelectedCategory(transaction.currentCategory);
  }

  // Generate category list
  const allCategories = Array.from(
    new Set([...CATEGORIES, ...(customCategories?.map((c) => c.name) || [])])
  ).sort();

  const handleSave = async () => {
    if (!transaction || !selectedCategory || selectedCategory === transaction.currentCategory) {
      onClose();
      return;
    }

    try {
      setIsSaving(true);
      await TransactionsApi.update(transaction.id, { category: selectedCategory });
      // Invalidate relevant queries
      await queryClient.invalidateQueries({ queryKey: ['analytics'] });
      await queryClient.invalidateQueries({ queryKey: ['transactions'] });
      onClose();
    } catch (error) {
      console.error('Failed to update transaction', error);
      // Ideally show a toast here
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setSelectedCategory('');
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && transaction && (
        <div className="fixed inset-0 z-[9999] flex flex-col justify-end sm:justify-center items-center p-0 sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
            onClick={handleClose}
          />
          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full sm:max-w-sm bg-white rounded-t-[28px] sm:rounded-2xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[70vh]"
          >
            {/* Handle for mobile */}
            <div className="w-full flex justify-center pt-3 pb-1 sm:hidden">
              <div className="w-10 h-1.5 bg-slate-200 rounded-full" />
            </div>

            <div className="flex items-center justify-between p-4 sm:pt-4 pt-1 border-b border-slate-100 bg-white">
              <div>
                <h2 className="text-base font-bold text-slate-900 tracking-tight truncate pr-4">
                  {transaction.description}
                </h2>
                <p className="text-xs font-semibold text-slate-500 mt-0.5">
                  {formatCurrency(Number(transaction.amount), userCurrency)}
                </p>
              </div>
              <button
                onClick={handleClose}
                className="w-8 h-8 flex items-center justify-center bg-slate-100 text-slate-500 hover:text-slate-900 hover:bg-slate-200 rounded-full transition-colors shrink-0 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              <div className="flex flex-col gap-1">
                {allCategories.map(cat => {
                  const isSelected = selectedCategory === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`flex items-center justify-between w-full px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        isSelected 
                          ? 'bg-indigo-50 text-indigo-700' 
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span>{cat}</span>
                      {isSelected && (
                        <div className="w-2 h-2 rounded-full bg-indigo-600 shadow-[0_0_8px_rgba(79,70,229,0.5)]" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="p-3 bg-white border-t border-slate-100 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.02)]">
              <Button
                variant="primary"
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white rounded-xl text-sm font-bold flex items-center justify-center cursor-pointer transition-colors"
                onClick={handleSave}
                disabled={isSaving || selectedCategory === transaction.currentCategory}
              >
                {isSaving ? (
                  <span className="flex items-center gap-2">
                    <Loader2 size={16} className="animate-spin" />
                    Saving...
                  </span>
                ) : (
                  "Update Category"
                )}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
