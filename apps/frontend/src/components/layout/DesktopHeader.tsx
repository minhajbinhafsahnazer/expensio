import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { 
  Home, 
  Target, 
  BarChart3, 
  Sparkles,
  Plus, 
  HelpCircle, 
  WifiOff, 
  RefreshCw, 
  SlidersHorizontal
} from "lucide-react";
import { useAuth } from "../../core/providers/AuthContext";
import { useSyncEngine } from "../../core/sync/SyncEngine";
import { useTour } from "../../core/providers/TourProvider";
import { cn } from "@wazn/ui";

interface DesktopHeaderProps {
  onAddExpense?: () => void;
  className?: string;
}

export const DesktopHeader: React.FC<DesktopHeaderProps> = ({ 
  onAddExpense, 
  className 
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isOnline, pendingCount, syncStatus, flush } = useSyncEngine();
  const { startTour } = useTour();

  const navItems = [
    {
      id: "home",
      label: "Dashboard",
      path: "/",
      icon: Home,
    },
    {
      id: "portfolio",
      label: "Portfolio & Goals",
      path: "/portfolio",
      icon: Target,
    },
    {
      id: "analytics",
      label: "Analytics",
      path: "/analytics",
      icon: BarChart3,
    },
    {
      id: "ai",
      label: "AI",
      path: "/ai",
      icon: Sparkles,
    },
    {
      id: "profile",
      label: "Settings",
      path: "/profile",
      icon: SlidersHorizontal,
    },
  ];

  const handleAddClick = () => {
    if (onAddExpense) {
      onAddExpense();
    } else {
      // If we are on another page, navigate to home with add trigger
      navigate("/?action=add-expense");
    }
  };

  const userInitials = user?.fullName
    ? user.fullName
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : user?.email
    ? user.email.slice(0, 2).toUpperCase()
    : "WZ";

  return (
    <header
      className={cn(
        "hidden md:block sticky top-0 z-50 w-full bg-white/95 backdrop-blur-xl border-b border-slate-200/80 shadow-2xs select-none",
        className
      )}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-6">
        
        {/* Left: Brand Logo & Navigation Links */}
        <div className="flex items-center gap-8">
          <Link
            to="/"
            className="flex items-center gap-2.5 group cursor-pointer"
            aria-label="Wazn Home"
          >
            <div className="w-9 h-9 rounded-xl overflow-hidden border border-slate-200/80 shadow-xs flex items-center justify-center shrink-0 bg-slate-900 group-hover:scale-105 transition-transform">
              <img
                src="/logo.jpg"
                alt="Wazn Logo"
                className="w-full h-full object-cover scale-[1.35]"
              />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base tracking-tight text-slate-950 font-sans">
                  Wazn
                </span>
                
              </div>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-full border border-slate-200/60">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;
              return (
                <Link
                  key={item.id}
                  to={item.path}
                  className={cn(
                    "flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 cursor-pointer select-none",
                    isActive
                      ? "bg-slate-950 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-950 hover:bg-white/60"
                  )}
                >
                  <Icon size={14} strokeWidth={isActive ? 2.5 : 2} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right: Sync Status, Tour, + Add Transaction, User Avatar */}
        <div className="flex items-center gap-3">
          
          {/* Live Sync Status Indicator */}
          <div
            onClick={() => {
              if (isOnline && pendingCount > 0) flush();
            }}
            title={
              !isOnline
                ? `Offline: ${pendingCount} transactions queued locally`
                : syncStatus === "syncing"
                ? "Syncing data with cloud..."
                : pendingCount > 0
                ? `${pendingCount} pending updates. Click to sync now.`
                : "All data synced and secure"
            }
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all cursor-default select-none",
              !isOnline
                ? "bg-amber-50 text-amber-800 border-amber-200"
                : syncStatus === "syncing"
                ? "bg-sky-50 text-sky-700 border-sky-200"
                : pendingCount > 0
                ? "bg-purple-50 text-purple-700 border-purple-200 cursor-pointer hover:bg-purple-100"
                : "bg-emerald-50/80 text-emerald-700 border-emerald-200/80"
            )}
          >
            {!isOnline ? (
              <>
                <WifiOff size={13} className="text-amber-600" />
                <span className="text-[11px]">Offline</span>
              </>
            ) : syncStatus === "syncing" ? (
              <>
                <RefreshCw size={12} className="animate-spin text-sky-600" />
                <span className="text-[11px]">Syncing</span>
              </>
            ) : pendingCount > 0 ? (
              <>
                <RefreshCw size={12} className="text-purple-600" />
                <span className="text-[11px]">{pendingCount} pending</span>
              </>
            ) : (
              <>
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[11px]">Synced</span>
              </>
            )}
          </div>

          {/* Guided Tour Trigger */}
          <button
            type="button"
            onClick={startTour}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200/80 hover:bg-slate-100 text-slate-700 text-xs font-semibold shadow-2xs transition-all cursor-pointer"
            title="Interactive App Walkthrough"
          >
            <HelpCircle size={14} className="text-indigo-600" />
            <span>Tour</span>
          </button>

          {/* Dominant + New Transaction Action */}
          <button
            type="button"
            onClick={handleAddClick}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 active:scale-95 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
            title="Log new expense or income (Ctrl+N)"
          >
            <Plus size={15} strokeWidth={2.5} />
            <span>New Transaction</span>
          </button>

          {/* User Profile Avatar */}
          <Link
            to="/profile"
            aria-label="Account Settings"
            title={user?.email ? `${user.fullName || user.email} Â· Settings` : "Settings"}
            className="w-9 h-9 rounded-xl bg-gradient-to-tr from-slate-200 to-slate-100 border border-slate-300 text-slate-800 flex items-center justify-center font-bold text-xs hover:border-slate-400 hover:shadow-xs transition-all cursor-pointer"
          >
            {userInitials}
          </Link>

        </div>
      </div>
    </header>
  );
};

