import React, { useRef } from "react";
import { cn } from "../utils";
import { motion, useAnimation, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { Trash2 } from "lucide-react";

export interface NoteTransactionRowProps {
  title: string;
  amount: number;
  currencySymbol?: string;
  type?: "income" | "expense" | string;
  className?: string;
  onClick?: () => void;
  onDelete?: () => void;
}

export const NoteTransactionRow: React.FC<NoteTransactionRowProps> = ({
  title,
  amount,
  type = "expense",
  className,
  onClick,
  onDelete,
}) => {
  const formattedAmount = amount.toLocaleString("en-IN", {
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
  });

  const controls = useAnimation();
  const x = useMotionValue(0);
  const deleteOpacity = useTransform(x, [-32, 0], [1, 0]);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleDragEnd = (_event: any, info: PanInfo) => {
    const threshold = -50;
    if (info.offset.x < threshold || info.velocity.x < -500) {
      controls.start({ x: -64 }); // Width of the delete button
    } else {
      controls.start({ x: 0 });
    }
  };

  const isGoalWithdrawal = title.toLowerCase().startsWith("goal withdrawal");

  return (
    <div className="relative overflow-hidden rounded-lg group" ref={containerRef}>
      {/* Background Delete Button */}
      <motion.div 
        style={{ opacity: deleteOpacity }}
        className="absolute inset-y-0 right-0 w-16 bg-red-500 rounded-lg flex items-center justify-center"
      >
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onDelete?.();
            controls.start({ x: 0 }); // Close after delete click
          }}
          className="w-full h-full flex items-center justify-center text-white active:bg-red-600 transition-colors cursor-pointer"
        >
          <Trash2 size={18} strokeWidth={2.5} />
        </button>
      </motion.div>

      {/* Swipeable Foreground */}
      <motion.div
        drag="x"
        dragConstraints={{ left: -64, right: 0 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        animate={controls}
        style={{ x }}
        onClick={onClick}
        className={cn(
          "relative z-10 grid grid-cols-[minmax(0,1fr)_88px] items-center py-2 px-2 rounded-lg cursor-pointer select-none transition-colors",
          type === "income" ? "hover:bg-emerald-50/50" : "hover:bg-slate-50/70",
          className
        )}
      >
        {/* Title */}
        <div className="flex items-center min-w-0 pr-2">
          <span className={cn(
            "font-normal text-[14px] sm:text-[15px] truncate tracking-tight",
            isGoalWithdrawal ? "text-red-500" : "text-slate-700"
          )}>
            {title}
          </span>
        </div>

        {/* Fixed Width Tabular Amount */}
        <div className={cn(
          "text-right text-[14px] sm:text-[15px] font-semibold tabular-nums",
          isGoalWithdrawal ? "text-red-500" : (type === "income" ? "text-emerald-600" : "text-slate-900")
        )}>
          {type === "income" ? "+" : ""}{formattedAmount}
        </div>
      </motion.div>
    </div>
  );
};
