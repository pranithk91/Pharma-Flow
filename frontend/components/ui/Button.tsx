import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost' | 'success';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  icon,
  iconPosition = 'left',
  loading = false,
  disabled,
  ...props 
}) => {
  const baseStyles = `
    inline-flex items-center justify-center font-medium 
    rounded-xl transition-all duration-200 ease-out
    focus:outline-none focus:ring-2 focus:ring-offset-2
    disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
    active:scale-[0.98]
  `;
  
  const variants = {
    primary: `
      bg-gradient-to-r from-primary-600 to-primary-700 
      text-white 
      hover:from-primary-700 hover:to-primary-800 
      focus:ring-primary-500/50
      shadow-lg shadow-primary-600/25
      hover:shadow-xl hover:shadow-primary-600/30
    `,
    secondary: `
      bg-surface-800 
      text-white 
      hover:bg-surface-900 
      focus:ring-surface-500
      shadow-lg shadow-surface-800/25
    `,
    success: `
      bg-gradient-to-r from-emerald-500 to-emerald-600 
      text-white 
      hover:from-emerald-600 hover:to-emerald-700 
      focus:ring-emerald-500/50
      shadow-lg shadow-emerald-500/25
    `,
    outline: `
      border-2 border-surface-200 
      text-surface-700 
      bg-white
      hover:border-primary-500 hover:text-primary-600 hover:bg-primary-50
      focus:ring-primary-500/30
    `,
    danger: `
      bg-gradient-to-r from-accent-500 to-accent-600 
      text-white 
      hover:from-accent-600 hover:to-accent-700 
      focus:ring-accent-500/50
      shadow-lg shadow-accent-500/25
    `,
    ghost: `
      text-surface-600 
      hover:bg-surface-100 hover:text-surface-800
      focus:ring-surface-300
    `,
  };

  const sizes = {
    sm: "h-8 px-3 text-xs gap-1.5",
    md: "h-10 px-4 text-sm gap-2",
    lg: "h-12 px-6 text-base gap-2.5",
  };

  const iconSizes = {
    sm: 14,
    md: 16,
    lg: 18,
  };

  const LoadingSpinner = () => (
    <svg 
      className="animate-spin" 
      width={iconSizes[size]} 
      height={iconSizes[size]} 
      viewBox="0 0 24 24" 
      fill="none"
    >
      <circle 
        className="opacity-25" 
        cx="12" 
        cy="12" 
        r="10" 
        stroke="currentColor" 
        strokeWidth="4"
      />
      <path 
        className="opacity-75" 
        fill="currentColor" 
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <>
          <LoadingSpinner />
          <span>Loading...</span>
        </>
      ) : (
        <>
          {icon && iconPosition === 'left' && <span className="shrink-0">{icon}</span>}
          {children}
          {icon && iconPosition === 'right' && <span className="shrink-0">{icon}</span>}
        </>
      )}
    </button>
  );
};
