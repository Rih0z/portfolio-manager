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
}) => {
  const baseClasses = `
    bg-white backdrop-blur-sm border border-secondary-200/50
    ${rounded}
    ${padding}
    ${shadow ? 'shadow-lg shadow-secondary-900/5' : ''}
    ${hover ? 'hover:shadow-xl hover:shadow-secondary-900/10 hover:-translate-y-1' : ''}
    ${gradient ? 'bg-gradient-to-br from-white to-secondary-50/50' : ''}
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

const CardHeader = ({ children, className = '' }) => (
  <div className={`mb-4 ${className}`}>
    {children}
  </div>
);

const CardTitle = ({ children, className = '', size = 'lg' }) => {
  const sizeClasses = {
    sm: 'text-base font-semibold',
    md: 'text-lg font-semibold',
    lg: 'text-xl font-bold',
    xl: 'text-2xl font-bold'
  };

  return (
    <h3 className={`text-secondary-900 ${sizeClasses[size]} ${className}`}>
      {children}
    </h3>
  );
};

const CardContent = ({ children, className = '' }) => (
  <div className={`${className}`}>
    {children}
  </div>
);

const CardFooter = ({ children, className = '' }) => (
  <div className={`mt-4 pt-4 border-t border-secondary-200/50 ${className}`}>
    {children}
  </div>
);

// Value display component for metrics
const CardValue = ({ 
  value, 
  label, 
  change, 
  changeType = 'neutral',
  format = 'number',
  className = ''
}) => {
  const changeColors = {
    positive: 'text-success-600',
    negative: 'text-danger-600',
    neutral: 'text-secondary-500'
  };

  const formatValue = (val) => {
    if (format === 'currency') {
      return new Intl.NumberFormat('ja-JP', { 
        style: 'currency', 
        currency: 'JPY',
        minimumFractionDigits: 0 
      }).format(val);
    }
    if (format === 'percentage') {
      return `${val}%`;
    }
    return val?.toLocaleString();
  };

  return (
    <div className={`${className}`}>
      <div className="text-2xl font-bold text-secondary-900 mb-1">
        {formatValue(value)}
      </div>
      {label && (
        <div className="text-sm text-secondary-600 mb-1">
          {label}
        </div>
      )}
      {change !== undefined && (
        <div className={`text-sm font-medium ${changeColors[changeType]}`}>
          {change > 0 ? '+' : ''}{formatValue(change)}
          {format === 'percentage' ? '' : ` (${change > 0 ? '+' : ''}${((change / value) * 100).toFixed(2)}%)`}
        </div>
      )}
    </div>
  );
};

// Icon wrapper for consistent styling
const CardIcon = ({ icon, className = '', color = 'primary' }) => {
  const colorClasses = {
    primary: 'text-primary-600',
    secondary: 'text-secondary-600',
    success: 'text-success-600',
    warning: 'text-warning-600',
    danger: 'text-danger-600'
  };

  return (
    <div className={`${colorClasses[color]} ${className}`}>
      {icon}
    </div>
  );
};

ModernCard.Header = CardHeader;
ModernCard.Title = CardTitle;
ModernCard.Content = CardContent;
ModernCard.Footer = CardFooter;
ModernCard.Value = CardValue;
ModernCard.Icon = CardIcon;

export default ModernCard;