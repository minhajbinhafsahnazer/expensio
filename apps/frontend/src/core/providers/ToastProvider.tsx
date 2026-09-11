import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastOptions {
  id?: string;
  type?: ToastType;
  duration?: number; // ms, default 3500
  action?: ToastAction;
  icon?: React.ReactNode;
}

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  duration: number;
  action?: ToastAction;
  icon?: React.ReactNode;
  createdAt: number;
}

interface ToastContextType {
  toasts: ToastItem[];
  toast: {
    (message: string, options?: ToastOptions): string;
    success: (message: string, options?: Omit<ToastOptions, 'type'>) => string;
    error: (message: string, options?: Omit<ToastOptions, 'type'>) => string;
    warning: (message: string, options?: Omit<ToastOptions, 'type'>) => string;
    info: (message: string, options?: Omit<ToastOptions, 'type'>) => string;
    dismiss: (id: string) => void;
  };
  showToast: (message: string, type?: ToastType) => string;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

// Detect type heuristically from message if not explicitly provided
function inferToastType(message: string): ToastType {
  const lower = message.toLowerCase();
  if (
    lower.includes('failed') ||
    lower.includes('error') ||
    lower.includes('offline') ||
    lower.includes("couldn't") ||
    lower.includes('cannot')
  ) {
    return 'error';
  }
  if (
    lower.includes('warning') ||
    lower.includes('required') ||
    lower.includes('please') ||
    lower.includes('alert')
  ) {
    return 'warning';
  }
  if (
    lower.includes('success') ||
    lower.includes('saved') ||
    lower.includes('updated') ||
    lower.includes('created') ||
    lower.includes('added') ||
    lower.includes('deleted') ||
    lower.includes('settled') ||
    lower.includes('reopened') ||
    lower.includes('enabled') ||
    lower.includes('disabled') ||
    lower.includes('deducted') ||
    lower.includes('completed')
  ) {
    return 'success';
  }
  return 'info';
}

// Global listener for standalone singleton toast calls outside React tree
type ToastListener = (action: { type: 'add'; item: ToastItem } | { type: 'dismiss'; id: string }) => void;
let globalListener: ToastListener | null = null;

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((message: string, options?: ToastOptions): string => {
    const id = options?.id || `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const inferredType = options?.type || inferToastType(message);
    const duration = options?.duration ?? 3800;

    // Mobile haptic vibration if supported
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(10);
      } catch (_) {
        // Ignored if browser restricts vibration
      }
    }

    const newItem: ToastItem = {
      id,
      message,
      type: inferredType,
      duration,
      action: options?.action,
      icon: options?.icon,
      createdAt: Date.now(),
    };

    setToasts((prev) => {
      // Keep maximum 2 toasts stacked on mobile to prevent blocking screen
      const filtered = prev.filter((t) => t.id !== id);
      return [...filtered.slice(-1), newItem];
    });

    return id;
  }, []);

  useEffect(() => {
    globalListener = (action) => {
      if (action.type === 'add') {
        setToasts((prev) => [...prev.slice(-1), action.item]);
      } else if (action.type === 'dismiss') {
        dismissToast(action.id);
      }
    };
    return () => {
      globalListener = null;
    };
  }, [dismissToast]);

  const toastMethods = Object.assign(
    (message: string, options?: ToastOptions) => addToast(message, options),
    {
      success: (message: string, options?: Omit<ToastOptions, 'type'>) =>
        addToast(message, { ...options, type: 'success' }),
      error: (message: string, options?: Omit<ToastOptions, 'type'>) =>
        addToast(message, { ...options, type: 'error' }),
      warning: (message: string, options?: Omit<ToastOptions, 'type'>) =>
        addToast(message, { ...options, type: 'warning' }),
      info: (message: string, options?: Omit<ToastOptions, 'type'>) =>
        addToast(message, { ...options, type: 'info' }),
      dismiss: (id: string) => dismissToast(id),
    }
  );

  const showToast = useCallback(
    (message: string, type?: ToastType) => addToast(message, { type }),
    [addToast]
  );

  return (
    <ToastContext.Provider
      value={{
        toasts,
        toast: toastMethods,
        showToast,
        dismissToast,
      }}
    >
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
};

// Standalone toast helper for direct usage anywhere
export const toast = Object.assign(
  (message: string, options?: ToastOptions) => {
    const id = options?.id || `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const inferredType = options?.type || inferToastType(message);
    const duration = options?.duration ?? 3800;

    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(10);
      } catch (_) {}
    }

    if (globalListener) {
      globalListener({
        type: 'add',
        item: {
          id,
          message,
          type: inferredType,
          duration,
          action: options?.action,
          icon: options?.icon,
          createdAt: Date.now(),
        },
      });
    }
    return id;
  },
  {
    success: (message: string, options?: Omit<ToastOptions, 'type'>) =>
      toast(message, { ...options, type: 'success' }),
    error: (message: string, options?: Omit<ToastOptions, 'type'>) =>
      toast(message, { ...options, type: 'error' }),
    warning: (message: string, options?: Omit<ToastOptions, 'type'>) =>
      toast(message, { ...options, type: 'warning' }),
    info: (message: string, options?: Omit<ToastOptions, 'type'>) =>
      toast(message, { ...options, type: 'info' }),
    dismiss: (id: string) => {
      if (globalListener) {
        globalListener({ type: 'dismiss', id });
      }
    },
  }
);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    return {
      toasts: [],
      toast,
      showToast: (msg: string, type?: ToastType) => toast(msg, { type }),
      dismissToast: (id: string) => toast.dismiss(id),
    };
  }
  return context;
};

// ── Mobile-First Floating Dynamic Toast Container & Items ───────────────────────

interface ToastContainerProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  return (
    <div
      id="toast-container"
      role="region"
      aria-live="polite"
      aria-label="Notifications"
      className="fixed top-0 left-0 right-0 z-[99999] pointer-events-none flex flex-col items-center px-4 pt-[calc(env(safe-area-inset-top,0px)+12px)] sm:pt-6 gap-2"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((item) => (
          <ToastCard key={item.id} item={item} onDismiss={onDismiss} />
        ))}
      </AnimatePresence>
    </div>
  );
};

interface ToastCardProps {
  item: ToastItem;
  onDismiss: (id: string) => void;
}

const ToastCard: React.FC<ToastCardProps> = ({ item, onDismiss }) => {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (item.duration <= 0 || isPaused) return;

    timerRef.current = setTimeout(() => {
      onDismiss(item.id);
    }, item.duration);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [item.id, item.duration, isPaused, onDismiss]);

  const typeConfig = {
    success: {
      badgeClass: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
      progressClass: 'bg-emerald-500',
      icon: <CheckCircle2 size={16} strokeWidth={2.5} className="shrink-0" />,
    },
    error: {
      badgeClass: 'bg-rose-500/20 text-rose-400 border border-rose-500/30',
      progressClass: 'bg-rose-500',
      icon: <AlertCircle size={16} strokeWidth={2.5} className="shrink-0" />,
    },
    warning: {
      badgeClass: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
      progressClass: 'bg-amber-500',
      icon: <AlertTriangle size={16} strokeWidth={2.5} className="shrink-0" />,
    },
    info: {
      badgeClass: 'bg-sky-500/20 text-sky-400 border border-sky-500/30',
      progressClass: 'bg-sky-500',
      icon: <Info size={16} strokeWidth={2.5} className="shrink-0" />,
    },
  }[item.type];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -24, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -24, scale: 0.92, transition: { duration: 0.18 } }}
      transition={{ type: 'spring', stiffness: 420, damping: 32 }}
      // Swipe up to dismiss gesture for natural mobile thumb flick
      drag="y"
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={{ top: 0.7, bottom: 0.1 }}
      onDragEnd={(_e, { offset, velocity }) => {
        if (offset.y < -25 || velocity.y < -150) {
          onDismiss(item.id);
        }
      }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
      className="pointer-events-auto relative overflow-hidden w-full max-w-[calc(100vw-28px)] sm:max-w-md bg-slate-900/95 text-slate-100 backdrop-blur-xl border border-white/10 shadow-[0_16px_36px_-6px_rgba(0,0,0,0.38),0_4px_12px_rgba(0,0,0,0.2)] rounded-2xl p-3 sm:px-4 sm:py-3.5 flex items-center gap-3 select-none touch-pan-y"
    >
      {/* Visual drag handle indicator for mobile affordance */}
      <div className="absolute top-1 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full bg-white/15 sm:hidden pointer-events-none" />

      {/* Type Status Icon Pill */}
      <div
        className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 shadow-inner ${typeConfig.badgeClass}`}
      >
        {item.icon || typeConfig.icon}
      </div>

      {/* Message Content */}
      <div className="flex-1 min-w-0 pr-1">
        <p className="text-[13px] sm:text-sm font-semibold tracking-tight text-slate-100 leading-snug break-words">
          {item.message}
        </p>
      </div>

      {/* Optional Custom Action Button (e.g. Undo, Retry) */}
      {item.action && (
        <button
          type="button"
          onClick={() => {
            item.action?.onClick();
            onDismiss(item.id);
          }}
          className="shrink-0 px-2.5 py-1 rounded-lg text-xs font-bold bg-white/10 hover:bg-white/20 active:scale-95 text-white border border-white/15 transition-all cursor-pointer"
        >
          {item.action.label}
        </button>
      )}

      {/* Dismiss Button */}
      <button
        type="button"
        onClick={() => onDismiss(item.id)}
        aria-label="Dismiss notification"
        className="shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-white/10 active:scale-90 transition-all cursor-pointer"
      >
        <X size={14} strokeWidth={2.2} />
      </button>

      {/* Subtle Auto-dismiss countdown bar */}
      {item.duration > 0 && !isPaused && (
        <motion.div
          initial={{ scaleX: 1 }}
          animate={{ scaleX: 0 }}
          transition={{ duration: item.duration / 1000, ease: 'linear' }}
          style={{ originX: 0 }}
          className={`absolute bottom-0 left-0 right-0 h-[2.5px] opacity-60 ${typeConfig.progressClass}`}
        />
      )}
    </motion.div>
  );
};
