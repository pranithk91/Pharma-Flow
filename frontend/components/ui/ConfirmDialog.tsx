import React, { useCallback, useEffect } from 'react';
import { X, AlertTriangle, CheckCircle, Info, AlertCircle } from 'lucide-react';
import { Button } from './Button';

type DialogVariant = 'danger' | 'warning' | 'success' | 'info';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: DialogVariant;
  isLoading?: boolean;
}

const variantConfig: Record<DialogVariant, {
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  confirmVariant: 'danger' | 'primary' | 'success' | 'secondary';
}> = {
  danger: {
    icon: <AlertTriangle size={24} />,
    iconBg: 'bg-red-100',
    iconColor: 'text-red-600',
    confirmVariant: 'danger',
  },
  warning: {
    icon: <AlertCircle size={24} />,
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    confirmVariant: 'primary',
  },
  success: {
    icon: <CheckCircle size={24} />,
    iconBg: 'bg-green-100',
    iconColor: 'text-green-600',
    confirmVariant: 'success',
  },
  info: {
    icon: <Info size={24} />,
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    confirmVariant: 'primary',
  },
};

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  isLoading = false,
}) => {
  const config = variantConfig[variant];

  // Handle escape key
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape' && !isLoading) {
      onClose();
    }
  }, [onClose, isLoading]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-surface-950/60 backdrop-blur-sm transition-opacity"
        onClick={isLoading ? undefined : onClose}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full animate-scale-in"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            disabled={isLoading}
            className="absolute right-4 top-4 p-1.5 rounded-lg text-surface-400 hover:text-surface-600 hover:bg-surface-100 transition-colors disabled:opacity-50"
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>

          {/* Content */}
          <div className="p-6">
            <div className="flex items-start gap-4">
              {/* Icon */}
              <div className={`shrink-0 p-3 rounded-xl ${config.iconBg} ${config.iconColor}`}>
                {config.icon}
              </div>

              {/* Text */}
              <div className="flex-1 pt-1">
                <h3 
                  id="dialog-title"
                  className="text-lg font-semibold text-surface-900 mb-2"
                >
                  {title}
                </h3>
                <p className="text-surface-600 text-sm leading-relaxed">
                  {message}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-6 justify-end">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={isLoading}
              >
                {cancelText}
              </Button>
              <Button
                variant={config.confirmVariant}
                onClick={onConfirm}
                loading={isLoading}
              >
                {confirmText}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Custom hook for easier usage
interface UseConfirmDialogOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: DialogVariant;
}

interface UseConfirmDialogReturn {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  confirm: () => void;
  dialogProps: Omit<ConfirmDialogProps, 'onConfirm'> & { onConfirm: () => void };
}

export function useConfirmDialog(
  options: UseConfirmDialogOptions,
  onConfirm: () => void | Promise<void>
): UseConfirmDialogReturn {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => {
    if (!isLoading) {
      setIsOpen(false);
    }
  }, [isLoading]);

  const confirm = useCallback(async () => {
    setIsLoading(true);
    try {
      await onConfirm();
      setIsOpen(false);
    } finally {
      setIsLoading(false);
    }
  }, [onConfirm]);

  return {
    isOpen,
    open,
    close,
    confirm,
    dialogProps: {
      isOpen,
      onClose: close,
      onConfirm: confirm,
      isLoading,
      ...options,
    },
  };
}

