/**
 * ModernCard — テーマ対応カードコンポーネント
 *
 * shadcn/ui Card と同じ CSS 変数ベースのスタイリング。
 * 既存 API (Header/Title/Content/Footer/Value/Icon) を維持。
 *
 * @file src/components/common/ModernCard.tsx
 */
import React from 'react';

const ModernCard = ({
  children,
  className = '',
  hover = true,
  gradient = false,
  padding = 'p-6',
  rounded = 'rounded-2xl',
  shadow = true,
  onClick,
  ...props
}: any) => {
  const baseClasses = `
    bg-card backdrop-blur-sm border border-border text-card-foreground
    ${rounded}
    ${padding}
    ${shadow ? 'shadow-soft' : ''}
    ${hover ? 'hover:shadow-medium hover:-translate-y-0.5' : ''}
    ${gradient ? 'bg-gradient-to-br from-card to-muted/30' : ''}
    ${onClick ? 'cursor-pointer' : ''}
    transition-all duration-300 ease-out
    ${className}
  `;

  return (
    <div className={baseClasses} onClick={onClick} {...props}>
      {children}
    </div>
  );
};

const CardHeader = ({ children, className = '' }: any) => (
  <div className={`mb-4 ${className}`}>
    {children}
  </div>
);

const CardTitle = ({ children, className = '', size = 'lg' }: any) => {
  const sizeClasses: Record<string, string> = {
    sm: 'text-base font-semibold',
    md: 'text-lg font-semibold',
    lg: 'text-xl font-bold',
    xl: 'text-2xl font-bold',
  };

  return (
    <h3 className={`text-foreground ${sizeClasses[size] || sizeClasses.lg} ${className}`}>
      {children}
    </h3>
  );
};

const CardContent = ({ children, className = '' }: any) => (
  <div className={className}>{children}</div>
);

const CardFooter = ({ children, className = '' }: any) => (
  <div className={`mt-4 pt-4 border-t border-border ${className}`}>
    {children}
  </div>
);

const CardValue = ({
  value,
  label,
  change,
  changeType = 'neutral',
  format = 'number',
  className = '',
}: any) => {
  const changeColors: Record<string, string> = {
    positive: 'text-success-600',
    negative: 'text-danger-600',
    neutral: 'text-muted-foreground',
  };

  const formatValue = (val: any) => {
    if (format === 'currency') {
      return new Intl.NumberFormat('ja-JP', {
        style: 'currency',
        currency: 'JPY',
        minimumFractionDigits: 0,
      }).format(val);
    }
    if (format === 'percentage') return `${val}%`;
    return val?.toLocaleString();
  };

  return (
    <div className={className}>
      <div className="text-2xl font-bold text-foreground font-mono mb-1">
        {formatValue(value)}
      </div>
      {label && <div className="text-sm text-muted-foreground mb-1">{label}</div>}
      {change !== undefined && (
        <div className={`text-sm font-medium ${changeColors[changeType]}`}>
          {change > 0 ? '+' : ''}
          {formatValue(change)}
          {format === 'percentage'
            ? ''
            : ` (${change > 0 ? '+' : ''}${((change / value) * 100).toFixed(2)}%)`}
        </div>
      )}
    </div>
  );
};

const CardIcon = ({ icon, className = '', color = 'primary' }: any) => {
  const colorClasses: Record<string, string> = {
    primary: 'text-primary-600',
    secondary: 'text-muted-foreground',
    success: 'text-success-600',
    warning: 'text-warning-600',
    danger: 'text-danger-600',
  };

  return <div className={`${colorClasses[color] || colorClasses.primary} ${className}`}>{icon}</div>;
};

ModernCard.Header = CardHeader;
ModernCard.Title = CardTitle;
ModernCard.Content = CardContent;
ModernCard.Footer = CardFooter;
ModernCard.Value = CardValue;
ModernCard.Icon = CardIcon;

export default ModernCard;
