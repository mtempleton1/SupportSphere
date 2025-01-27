import React, { createContext, useContext, useState, useCallback } from 'react';
import { X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [lastId, setLastId] = useState(0);

  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = lastId + 1;
    setLastId(id);
    
    const newToast = { id, message, type };
    setToasts(prev => [...prev, newToast]);

    // Auto remove after 5 seconds
    setTimeout(() => removeToast(id), 5000);
  }, [lastId, removeToast]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-8 left-8 z-50 flex flex-col gap-2">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`
              flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-white
              animate-[slideIn_0.2s_ease-out]
              ${toast.type === 'success' ? 'bg-green-600' : 
                toast.type === 'error' ? 'bg-red-600' : 
                'bg-blue-600'}
            `}
          >
            <span className="text-sm font-medium">{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="p-1 hover:bg-white/10 rounded-full transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
      <style>
        {`
          @keyframes slideIn {
            from {
              opacity: 0;
              transform: translateX(-100%);
            }
            to {
              opacity: 1;
              transform: translateX(0);
            }
          }
        `}
      </style>
    </ToastContext.Provider>
  );
}

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}; 