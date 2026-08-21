import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel = 'Konfirmasi',
  cancelLabel = 'Batal',
  isDestructive = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div id="modal-backdrop" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.15 }}
            className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden"
          >
            <div className="p-6">
              <div className="flex items-start space-x-4">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    isDestructive ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'
                  }`}
                >
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 id="modal-title" className="text-base font-semibold text-slate-900">
                    {title}
                  </h3>
                  <p id="modal-description" className="mt-2 text-sm text-slate-600 leading-relaxed">
                    {message}
                  </p>
                </div>
                <button
                  id="btn-modal-close-icon"
                  onClick={onCancel}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-6 flex items-center justify-end space-x-3">
                <button
                  id="btn-modal-cancel"
                  type="button"
                  onClick={onCancel}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                  {cancelLabel}
                </button>
                <button
                  id="btn-modal-confirm"
                  type="button"
                  onClick={onConfirm}
                  className={`px-4 py-2 text-sm font-medium text-white rounded-xl transition-colors cursor-pointer shadow-sm ${
                    isDestructive
                      ? 'bg-rose-600 hover:bg-rose-700'
                      : 'bg-slate-900 hover:bg-slate-800'
                  }`}
                >
                  {confirmLabel}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
