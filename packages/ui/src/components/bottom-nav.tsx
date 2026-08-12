import React from "react";
import { cn } from "../utils";

export interface NavTabItem {
  id: string;
  icon: React.ReactNode;
  label: string;
  badge?: string;
  disabled?: boolean;
}

export interface BottomNavProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
  onPlusClick?: () => void;
  className?: string;
  items?: NavTabItem[];
  variant?: "default" | "hero";
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
  onPlusClick,
  className,
  items,
  variant = "default",
}) => {
  const defaultTabs: NavTabItem[] = [
    {
      id: "home",
      label: "Home",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2.2}
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
          />
        </svg>
      ),
    },
    {
      id: "portfolio",
      label: "Portfolio",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2.2}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
      ),
    },
    {
      id: "wallet",
      label: "Wallet",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2.2}
            d="M3 10h18M7 15h1m4 0h1m-7 4h12a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
      ),
    },
    {
      id: "profile",
      label: "Profile",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2.2}
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        </svg>
      ),
    },
  ];

  // Dark Hero Dock Variant (Matching Home Screen Floating Dock)
  if (variant === "hero" && items && (items.length === 3 || items.length === 1)) {
    const centerItem = items.length === 1 ? items[0] : items[1];
    const leftItem = items.length === 3 ? items[0] : null;
    const rightItem = items.length === 3 ? items[2] : null;

    return (
      <div
        style={{
          background: "linear-gradient(135deg, #020617 0%, #0f172a 45%, #1e1b4b 100%)",
        }}
        className={cn(
          "fixed bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center justify-between h-[44px] px-2.5 border border-slate-800/80 rounded-[22px] shadow-[0_8px_24px_rgba(15,23,42,0.4)] select-none w-auto",
          items.length === 3 ? "min-w-[240px]" : "min-w-[100px]",
          className
        )}
      >
        {/* Left Action - Equal width & symmetrical padding */}
        {leftItem ? (
          <button
            type="button"
            onClick={() => onTabChange(leftItem.id)}
            className="tactile-btn flex items-center justify-center gap-1.5 w-[96px] py-1 opacity-80 hover:opacity-100 transition-opacity cursor-pointer border-none bg-transparent active:scale-95 text-slate-200"
          >
            {leftItem.icon}
            <span className="text-[12px] font-medium tracking-tight text-slate-200">
              {leftItem.label}
            </span>
          </button>
        ) : (
          <div className={items.length === 3 ? "w-[96px]" : "w-1"} />
        )}

        {/* Center Dominant FAB - Vertically popping 52px solid white circle */}
        <button
          type="button"
          onClick={() => onTabChange(centerItem.id)}
          aria-label={centerItem.label}
          title={centerItem.label}
          className="tactile-btn relative -my-1 w-[52px] h-[52px] rounded-full bg-white hover:bg-slate-100 text-slate-950 flex items-center justify-center shadow-lg border-2 border-[#0f172a] transition-all active:scale-95 shrink-0 mx-1 z-10 cursor-pointer"
        >
          {centerItem.icon}
        </button>

        {/* Right Action - Equal width & symmetrical padding */}
        {rightItem ? (
          <button
            type="button"
            onClick={() => onTabChange(rightItem.id)}
            className="tactile-btn flex items-center justify-center gap-1.5 w-[96px] py-1 opacity-80 hover:opacity-100 transition-opacity cursor-pointer border-none bg-transparent active:scale-95 text-slate-200"
          >
            {rightItem.icon}
            <span className="text-[12px] font-medium tracking-tight text-slate-200">
              {rightItem.label}
            </span>
            {rightItem.badge && (
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-300 bg-slate-800/90 border border-slate-700/80 px-1.5 py-0.5 rounded-full">
                {rightItem.badge}
              </span>
            )}
          </button>
        ) : (
          <div className={items.length === 3 ? "w-[96px]" : "w-1"} />
        )}
      </div>
    );
  }

  if (items) {
    return (
      <div
        className={cn(
          "fixed bottom-5 left-1/2 -translate-x-1/2 z-40 flex items-center justify-between gap-1.5 p-1.5 bg-white/95 backdrop-blur-xl border border-slate-200/80 rounded-full shadow-xl transition-all duration-200 select-none max-w-sm w-[92%]",
          className
        )}
      >
        {items.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              aria-label={tab.label}
              className={cn(
                "relative flex-1 flex items-center justify-center gap-1.5 h-11 px-2.5 rounded-full transition-all duration-150 active:scale-95 text-xs font-semibold cursor-pointer",
                isActive
                  ? "bg-slate-950 text-white shadow-xs"
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-100/70"
              )}
            >
              {tab.icon}
              <span className="truncate">{tab.label}</span>
              {tab.badge && (
                <span
                  className={cn(
                    "text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full shrink-0",
                    isActive
                      ? "bg-slate-800 text-slate-300"
                      : "bg-slate-100 text-slate-400 border border-slate-200"
                  )}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "fixed bottom-5 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 p-1.5 bg-white/90 backdrop-blur-xl border border-slate-200/80 rounded-full shadow-xl transition-all duration-200 select-none max-w-sm w-[90%]",
        className
      )}
    >
      {defaultTabs.slice(0, 2).map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            aria-label={tab.label}
            className={cn(
              "flex-1 flex items-center justify-center h-11 rounded-full transition-all duration-150 active:scale-95",
              isActive
                ? "bg-slate-950 text-white shadow-xs font-semibold"
                : "text-slate-400 hover:text-slate-700"
            )}
          >
            {tab.icon}
          </button>
        );
      })}

      {/* Center Plus Trigger if provided */}
      {onPlusClick && (
        <button
          type="button"
          onClick={onPlusClick}
          aria-label="Add Expense"
          className="flex-shrink-0 w-11 h-11 rounded-full bg-slate-950 hover:bg-slate-800 text-white flex items-center justify-center shadow-md active:scale-95 transition-transform"
        >
          <span className="text-2xl font-bold leading-none -mt-0.5">+</span>
        </button>
      )}

      {defaultTabs.slice(2).map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            aria-label={tab.label}
            className={cn(
              "flex-1 flex items-center justify-center h-11 rounded-full transition-all duration-150 active:scale-95",
              isActive
                ? "bg-slate-950 text-white shadow-xs font-semibold"
                : "text-slate-400 hover:text-slate-700"
            )}
          >
            {tab.icon}
          </button>
        );
      })}
    </div>
  );
};

