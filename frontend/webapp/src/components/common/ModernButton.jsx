import React from 'react';

const ModernButton = React.forwardRef(({
  children,
  variant = 'primary',
  size = 'md',
  rounded = 'full',
  loading = false,
  disabled = false,
  fullWidth = false,
  loadingText = 'Loading...',
  icon,
  iconPosition = 'left',
  className = '',
  ...props
}, ref) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

  const variants = {
    primary: `
      bg-gradient-to-r from-primary-500 to-primary-600 
      hover:from-primary-600 hover:to-primary-700 
      text-white shadow-lg shadow-primary-500/25 
      hover:shadow-xl hover:shadow-primary-500/30 
      focus:ring-primary-500
    `,
    secondary: `
      bg-white border border-secondary-300 
      text-secondary-700 
      hover:bg-secondary-50 hover:border-secondary-400
      shadow-sm hover:shadow-md
      focus:ring-secondary-500
    `,
    success: `
      bg-gradient-to-r from-success-500 to-success-600 
      hover:from-success-600 hover:to-success-700 
      text-white shadow-lg shadow-success-500/25 
      focus:ring-success-500
    `,
    danger: `
      bg-gradient-to-r from-danger-500 to-danger-600 
      hover:from-danger-600 hover:to-danger-700 
      text-white shadow-lg shadow-danger-500/25 
      focus:ring-danger-500
    `,
    ghost: `
      text-secondary-700 
      hover:bg-secondary-100 
      focus:ring-secondary-500
    `,
    outline: `
      border-2 border-primary-500 
      text-primary-600 
      hover:bg-primary-50 
      focus:ring-primary-500
    `
  };

  const sizes = {
    xs: 'px-3 py-1.5 text-xs',
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
    xl: 'px-10 py-5 text-xl'
  };

  const roundedClasses = {
    none: 'rounded-none',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    '2xl': 'rounded-2xl',
    full: 'rounded-full'
  };

  const LoadingSpinner = () => (
    <svg 
      className="animate-spin h-4 w-4" 
      xmlns="http://www.w3.org/2000/svg" 
      fill="none" 
      viewBox="0 0 24 24"
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

  const buttonContent = (
    <>
      {loading && <LoadingSpinner />}
      {!loading && icon && iconPosition === 'left' && (
        <span className="mr-2">{icon}</span>
      )}
      {loading ? loadingText : children}
      {!loading && icon && iconPosition === 'right' && (
        <span className="ml-2">{icon}</span>
      )}
    </>
  );

  const classes = `
    ${baseClasses}
    ${variants[variant]}
    ${sizes[size]}
    ${roundedClasses[rounded]}
    ${fullWidth ? 'w-full' : ''}
    ${loading ? 'cursor-wait' : ''}
    ${className}
  `.replace(/\s+/g, ' ').trim();

  return (
    <button
      ref={ref}
      className={classes}
      disabled={disabled || loading}
      {...props}
    >
      {buttonContent}
    </button>
  );
});

ModernButton.displayName = 'ModernButton';

export default ModernButton;