import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  title?: string;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, title?: string) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'info', title?: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message, title }]);

    setTimeout(() => {
      removeToast(id);
    }, 4500);
  }, [removeToast]);

  const success = useCallback((message: string, title?: string) => showToast(message, 'success', title), [showToast]);
  const error = useCallback((message: string, title?: string) => showToast(message, 'error', title), [showToast]);
  const warning = useCallback((message: string, title?: string) => showToast(message, 'warning', title), [showToast]);
  const info = useCallback((message: string, title?: string) => showToast(message, 'info', title), [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, success, error, warning, info }}>
      {children}
      <div
        id="toast-container"
        className="fixed bottom-4 right-4 z-50 flex flex-col space-y-2 max-w-md w-full px-4 pointer-events-none"
      >
        <AnimatePresence>
          {toasts.map((toast) => {
            const icons = {
              success: <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />,
              error: <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />,
              warning: <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />,
              info: <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />,
            };

            const bgStyles = {
              success: 'bg-emerald-50 border-emerald-200 text-emerald-900',
              error: 'bg-rose-50 border-rose-200 text-rose-900',
              warning: 'bg-amber-50 border-amber-200 text-amber-900',
              info: 'bg-blue-50 border-blue-200 text-blue-900',
            };

            return (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className={`pointer-events-auto p-4 rounded-xl border shadow-lg flex items-start space-x-3 ${bgStyles[toast.type]}`}
              >
                {icons[toast.type]}
                <div className="flex-1 min-w-0">
                  {toast.title && (
                    <p className="text-sm font-semibold mb-0.5">{toast.title}</p>
                  )}
                  <p className="text-xs sm:text-sm leading-relaxed">{toast.message}</p>
                </div>
                <button
                  id={`btn-close-toast-${toast.id}`}
                  onClick={() => removeToast(toast.id)}
                  className="text-slate-400 hover:text-slate-700 p-1 rounded-md transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextType {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
