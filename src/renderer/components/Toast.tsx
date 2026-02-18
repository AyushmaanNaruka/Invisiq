import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from 'react';
import { X, CheckCircle2, AlertCircle, Info } from 'lucide-react';

// ══════════════════════════════════════
//  TYPES
// ══════════════════════════════════════

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  action?: { label: string; onClick: () => void };
}

interface ToastContextValue {
  showToast: (type: ToastType, message: string, action?: Toast['action']) => void;
}

// ══════════════════════════════════════
//  CONTEXT
// ══════════════════════════════════════

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

// ══════════════════════════════════════
//  PROVIDER
// ══════════════════════════════════════

export function ToastProvider({ children }: { children: ReactNode }): JSX.Element {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idCounter = useRef(0);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (type: ToastType, message: string, action?: Toast['action']) => {
      const id = `toast-${++idCounter.current}`;
      const toast: Toast = { id, type, message, action };

      setToasts((prev) => {
        // Max 3 visible, remove oldest if needed
        const updated = [...prev, toast];
        return updated.length > 3 ? updated.slice(-3) : updated;
      });

      // Auto-dismiss after 3 seconds
      setTimeout(() => removeToast(id), 3000);
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </ToastContext.Provider>
  );
}

// ══════════════════════════════════════
//  TOAST CONTAINER
// ══════════════════════════════════════

const ICON_MAP: Record<ToastType, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
};

const COLOR_MAP: Record<ToastType, string> = {
  success: 'border-status-success/40 bg-status-success/10',
  error: 'border-status-error/40 bg-status-error/10',
  info: 'border-accent-blue/40 bg-accent-blue/10',
};

const ICON_COLOR_MAP: Record<ToastType, string> = {
  success: 'text-status-success',
  error: 'text-status-error',
  info: 'text-accent-blue',
};

function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}): JSX.Element | null {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-8 right-3 z-[60] flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => {
        const Icon = ICON_MAP[toast.type];
        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-2 px-3 py-2 rounded-lg border shadow-dropdown backdrop-blur-sm ${COLOR_MAP[toast.type]}`}
            style={{ animation: 'toastSlideIn 200ms ease-out', maxWidth: '280px' }}
          >
            <Icon size={14} className={`shrink-0 mt-0.5 ${ICON_COLOR_MAP[toast.type]}`} />
            <div className="flex-1 min-w-0">
              <p className="text-text-primary text-xs leading-relaxed">{toast.message}</p>
              {toast.action && (
                <button
                  onClick={toast.action.onClick}
                  className="text-accent-primary text-[10px] font-medium hover:underline mt-0.5"
                >
                  {toast.action.label}
                </button>
              )}
            </div>
            <button
              onClick={() => onDismiss(toast.id)}
              className="shrink-0 p-0.5 rounded hover:bg-bg-hover text-text-secondary hover:text-text-primary transition-colors"
            >
              <X size={10} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
