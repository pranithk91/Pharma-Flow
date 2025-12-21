import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

interface ToastProviderProps {
  children: ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    // Use crypto.randomUUID for secure ID generation, fallback for older browsers
    const id = typeof crypto !== 'undefined' && crypto.randomUUID 
      ? crypto.randomUUID() 
      : `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    setToasts((prev) => [...prev, { id, type, message }]);

    // Auto-remove after 4 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 4000);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const getConfig = (type: ToastType) => {
    switch (type) {
      case 'success':
        return {
          icon: <CheckCircle size={20} />,
          bg: 'bg-gradient-to-r from-emerald-500 to-emerald-600',
          iconBg: 'bg-white/20',
          text: 'text-white',
          border: 'border-emerald-400/30',
          shadow: 'shadow-emerald-500/30',
        };
      case 'error':
        return {
          icon: <AlertCircle size={20} />,
          bg: 'bg-gradient-to-r from-rose-500 to-rose-600',
          iconBg: 'bg-white/20',
          text: 'text-white',
          border: 'border-rose-400/30',
          shadow: 'shadow-rose-500/30',
        };
      case 'warning':
        return {
          icon: <AlertTriangle size={20} />,
          bg: 'bg-gradient-to-r from-amber-500 to-orange-500',
          iconBg: 'bg-white/20',
          text: 'text-white',
          border: 'border-amber-400/30',
          shadow: 'shadow-amber-500/30',
        };
      default:
        return {
          icon: <Info size={20} />,
          bg: 'bg-gradient-to-r from-blue-500 to-blue-600',
          iconBg: 'bg-white/20',
          text: 'text-white',
          border: 'border-blue-400/30',
          shadow: 'shadow-blue-500/30',
        };
    }
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      
      {/* Toast Container */}
      <div className="fixed top-4 right-4 z-[100] space-y-3">
        {toasts.map((toast) => {
          const config = getConfig(toast.type);
          return (
            <div
              key={toast.id}
              className={`
                flex items-center gap-3 px-4 py-3.5 
                rounded-2xl border backdrop-blur-sm
                min-w-[320px] max-w-md
                shadow-xl ${config.shadow}
                ${config.bg} ${config.border} ${config.text}
                animate-slide-in
              `}
              style={{
                animation: 'slideInRight 0.3s ease-out',
              }}
            >
              <div className={`p-1.5 rounded-lg ${config.iconBg}`}>
                {config.icon}
              </div>
              <p className="flex-1 text-sm font-medium leading-snug">{toast.message}</p>
              <button
                onClick={() => removeToast(toast.id)}
                className="p-1 rounded-lg hover:bg-white/20 transition-colors"
              >
                <X size={16} />
              </button>
              
              {/* Progress bar */}
              <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-white/20 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-white/50 rounded-full"
                  style={{
                    animation: 'shrink 4s linear forwards',
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Keyframes for progress bar */}
      <style>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </ToastContext.Provider>
  );
};
