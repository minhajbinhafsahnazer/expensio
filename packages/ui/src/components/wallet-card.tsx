import React from "react";
import { cn } from "../utils";

export interface WalletCardProps {
  cardName?: string;
  cardType?: string;
  balance: number | string;
  currencySymbol?: string;
  cardNumber?: string;
  expiryDate?: string;
  className?: string;
}

export const WalletCard: React.FC<WalletCardProps> = ({
  cardName = "Finsight",
  cardType = "VISA",
  balance,
  currencySymbol = "$",
  cardNumber = "**** **** **** 6925",
  expiryDate = "10/28",
  className,
}) => {
  const formattedBalance =
    typeof balance === "number"
      ? balance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : balance;

  return (
    <div
      className={cn(
        "relative w-full rounded-[24px] p-6 text-white shadow-xl overflow-hidden flex flex-col justify-between select-none transition-transform duration-200 active:scale-[0.99]",
        "bg-gradient-to-br from-[#24242d] via-[#1a1a22] to-[#121218] border border-white/10",
        className
      )}
      style={{ minHeight: "190px" }}
    >
      {/* Decorative Glow */}
      <div className="absolute -top-12 -right-12 w-40 h-40 bg-white/5 rounded-full blur-2xl pointer-events-none" />

      {/* Card Header */}
      <div className="flex items-center justify-between z-10">
        <span className="text-base font-semibold tracking-tight text-slate-200">{cardName}</span>
        <span className="text-xs font-extrabold tracking-widest text-slate-300 italic uppercase">
          {cardType}
        </span>
      </div>

      {/* Balance Area */}
      <div className="my-3 z-10">
        <span className="text-xs font-medium text-slate-400 block mb-1">Current Balance</span>
        <div className="text-3xl sm:text-4xl font-extrabold tracking-tight font-mono text-white flex items-baseline gap-1">
          <span className="text-2xl font-normal text-slate-400">{currencySymbol}</span>
          {formattedBalance}
        </div>
      </div>

      {/* Card Footer */}
      <div className="flex items-center justify-between z-10 pt-2 text-xs font-mono text-slate-400">
        <span className="tracking-widest">{cardNumber}</span>
        <div className="flex flex-col items-end">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider">Exp Date</span>
          <span className="text-slate-300">{expiryDate}</span>
        </div>
      </div>
    </div>
  );
};
