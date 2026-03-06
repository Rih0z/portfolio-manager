/**
 * ModernInput — テーマ対応インプットコンポーネント
 *
 * shadcn/ui Input と同じ CSS 変数ベースのスタイリング。
 * 既存 API (label/error/hint/icon 等) を維持。
 *
 * @file src/components/common/ModernInput.tsx
 */
import React, { forwardRef } from 'react';

const ModernInput = forwardRef((props: any, ref: any) => {
  const {
    label,
    error,
    hint,
    icon,
    iconPosition = 'left',
    size = 'md',
    variant = 'default',
    className = '',
    containerClassName = '',
    ...rest
  } = props;

  const baseClasses =
    'w-full border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-muted-foreground';

  const variants: Record<string, string> = {
    default:
      'border-border bg-card text-foreground focus:border-primary-500 focus:ring-primary-500/20 hover:border-primary-300',
    filled:
      'border-transparent bg-muted text-foreground focus:bg-card focus:border-primary-500 focus:ring-primary-500/20 hover:bg-accent',
    underline:
      'border-0 border-b-2 border-border bg-transparent rounded-none text-foreground focus:border-primary-500 focus:ring-0 hover:border-primary-300',
  };

  const sizes: Record<string, string> = {
    sm: 'px-3 py-2 text-sm rounded-lg',
    md: 'px-4 py-3 text-base rounded-xl',
    lg: 'px-5 py-4 text-lg rounded-xl',
  };

  const iconSizes: Record<string, string> = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const classes = `${baseClasses} ${variants[variant] || variants.default} ${sizes[size] || sizes.md} ${icon && iconPosition === 'left' ? 'pl-10' : ''} ${icon && iconPosition === 'right' ? 'pr-10' : ''} ${error ? 'border-danger-500 focus:border-danger-500 focus:ring-danger-500/20' : ''} ${className}`;

  return (
    <div className={containerClassName}>
      {label && <label className="block text-sm font-medium text-foreground mb-2">{label}</label>}
      <div className="relative">
        {icon && (
          <div
            className={`absolute inset-y-0 ${iconPosition === 'left' ? 'left-0 pl-3' : 'right-0 pr-3'} flex items-center pointer-events-none text-muted-foreground`}
          >
            <span className={iconSizes[size] || iconSizes.md}>{icon}</span>
          </div>
        )}
        <input ref={ref} className={classes} {...rest} />
      </div>
      {error && (
        <p className="mt-1 text-sm text-danger-600 flex items-center">
          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          {error}
        </p>
      )}
      {hint && !error && <p className="mt-1 text-sm text-muted-foreground">{hint}</p>}
    </div>
  );
});

ModernInput.displayName = 'ModernInput';

export default ModernInput;
