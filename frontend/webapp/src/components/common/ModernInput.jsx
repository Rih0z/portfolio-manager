import React, { forwardRef } from 'react';

const ModernInput = forwardRef(({
  label,
  error,
  hint,
  icon,
  iconPosition = 'left',
  size = 'md',
  variant = 'default',
  className = '',
  containerClassName = '',
  ...props
}, ref) => {
  const baseClasses = `
    w-full border transition-all duration-200 
    focus:outline-none focus:ring-2 focus:ring-offset-0
    disabled:opacity-50 disabled:cursor-not-allowed
    placeholder:text-secondary-400
  `;

  const variants = {
    default: `
      border-secondary-300 
      focus:border-primary-500 focus:ring-primary-500/20
      bg-white hover:border-secondary-400
    `,
    filled: `
      border-transparent 
      bg-secondary-100 
      focus:bg-white focus:border-primary-500 focus:ring-primary-500/20
      hover:bg-secondary-50
    `,
    underline: `
      border-0 border-b-2 border-secondary-300 
      bg-transparent rounded-none
      focus:border-primary-500 focus:ring-0
      hover:border-secondary-400
    `
  };

  const sizes = {
    sm: 'px-3 py-2 text-sm rounded-lg',
    md: 'px-4 py-3 text-base rounded-xl',
    lg: 'px-5 py-4 text-lg rounded-xl'
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  const classes = `
    ${baseClasses}
    ${variants[variant]}
    ${sizes[size]}
    ${icon && iconPosition === 'left' ? 'pl-10' : ''}
    ${icon && iconPosition === 'right' ? 'pr-10' : ''}
    ${error ? 'border-danger-500 focus:border-danger-500 focus:ring-danger-500/20' : ''}
    ${className}
  `;

  return (
    <div className={`${containerClassName}`}>
      {label && (
        <label className="block text-sm font-medium text-secondary-700 mb-2">
          {label}
        </label>
      )}
      
      <div className="relative">
        {icon && (
          <div className={`
            absolute inset-y-0 ${iconPosition === 'left' ? 'left-0 pl-3' : 'right-0 pr-3'} 
            flex items-center pointer-events-none text-secondary-400
          `}>
            <span className={iconSizes[size]}>
              {icon}
            </span>
          </div>
        )}
        
        <input
          ref={ref}
          className={classes}
          {...props}
        />
      </div>
      
      {error && (
        <p className="mt-1 text-sm text-danger-600 flex items-center">
          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
      
      {hint && !error && (
        <p className="mt-1 text-sm text-secondary-500">
          {hint}
        </p>
      )}
    </div>
  );
});

ModernInput.displayName = 'ModernInput';

export default ModernInput;