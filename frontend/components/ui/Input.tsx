import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  fullWidth?: boolean;
  icon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({ 
  label, 
  error, 
  fullWidth = true, 
  icon,
  className = '', 
  ...props 
}) => {
  return (
    <div className={`${fullWidth ? 'w-full' : ''} mb-3`}>
      {label && (
        <label className="block text-xs font-semibold text-surface-600 uppercase tracking-wider mb-1.5 ml-0.5">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400">
            {icon}
          </div>
        )}
        <input
          className={`
            w-full px-3.5 py-2.5 
            bg-white border border-surface-200 
            rounded-xl text-sm text-surface-800
            placeholder:text-surface-400
            transition-all duration-200 ease-out
            hover:border-surface-300
            focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20
            disabled:bg-surface-50 disabled:text-surface-400 disabled:cursor-not-allowed disabled:border-surface-200
            ${icon ? 'pl-10' : ''}
            ${error ? 'border-accent-500 focus:border-accent-500 focus:ring-accent-500/20' : ''} 
            ${className}
          `}
          {...props}
        />
      </div>
      {error && (
        <p className="mt-1.5 text-xs text-accent-600 flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
};

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string | number; label: string }[];
  fullWidth?: boolean;
  error?: string;
}

export const Select: React.FC<SelectProps> = ({ 
  label, 
  options, 
  fullWidth = true, 
  error,
  className = '', 
  ...props 
}) => {
  return (
    <div className={`${fullWidth ? 'w-full' : ''} mb-3`}>
      {label && (
        <label className="block text-xs font-semibold text-surface-600 uppercase tracking-wider mb-1.5 ml-0.5">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          className={`
            w-full px-3.5 py-2.5 pr-10
            bg-white border border-surface-200 
            rounded-xl text-sm text-surface-800
            appearance-none cursor-pointer
            transition-all duration-200 ease-out
            hover:border-surface-300
            focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20
            disabled:bg-surface-50 disabled:text-surface-400 disabled:cursor-not-allowed
            ${error ? 'border-accent-500' : ''}
            ${className}
          `}
          {...props}
        >
          {options.map((opt, idx) => (
            <option key={`${opt.value}-${idx}`} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-surface-400">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
      {error && (
        <p className="mt-1.5 text-xs text-accent-600">{error}</p>
      )}
    </div>
  );
};
