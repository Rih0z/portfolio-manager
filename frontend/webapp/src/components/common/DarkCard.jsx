/** 
 * プロジェクト: https://portfolio-wise.com/ 
 * ファイルパス: src/components/common/DarkCard.jsx 
 * 
 * 作成者: Koki Riho （https://github.com/Rih0z） 
 * 作成日: 2025-06-02 
 * 
 * 説明: 
 * Netflix/Uber風のダークテーマカードコンポーネント
 * モダンなデザインシステムに基づいた再利用可能なカードコンポーネント
 */

import React from 'react';

const DarkCard = ({ 
  children, 
  className = '', 
  variant = 'default',
  glow = false,
  hover = true,
  ...props 
}) => {
  const getVariantClasses = () => {
    switch (variant) {
      case 'elevated':
        return 'bg-dark-200 border border-dark-400 shadow-large';
      case 'minimal':
        return 'bg-dark-300/50 border border-dark-500';
      case 'accent':
        return 'bg-gradient-to-br from-dark-200 to-dark-300 border border-primary-500/30';
      case 'success':
        return 'bg-dark-200 border border-success-500/30 shadow-lg shadow-success-500/10';
      case 'warning':
        return 'bg-dark-200 border border-warning-500/30 shadow-lg shadow-warning-500/10';
      case 'danger':
        return 'bg-dark-200 border border-danger-500/30 shadow-lg shadow-danger-500/10';
      default:
        return 'bg-dark-200 border border-dark-400 shadow-medium';
    }
  };

  const glowClass = glow ? 'shadow-glow' : '';
  const hoverClass = hover ? 'hover:shadow-large hover:border-dark-300 transition-all duration-300' : '';

  return (
    <div 
      className={`
        rounded-2xl p-4 sm:p-6 
        ${getVariantClasses()} 
        ${glowClass} 
        ${hoverClass} 
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
};

// Title component
DarkCard.Title = ({ children, className = '', size = 'lg' }) => {
  const sizeClasses = {
    sm: 'text-sm font-semibold',
    md: 'text-base font-semibold',
    lg: 'text-lg font-bold',
    xl: 'text-xl font-bold',
    '2xl': 'text-2xl font-bold'
  };

  return (
    <h3 className={`text-gray-100 ${sizeClasses[size]} ${className}`}>
      {children}
    </h3>
  );
};

// Content component
DarkCard.Content = ({ children, className = '' }) => {
  return (
    <div className={`text-gray-300 ${className}`}>
      {children}
    </div>
  );
};

// Footer component
DarkCard.Footer = ({ children, className = '' }) => {
  return (
    <div className={`pt-4 border-t border-dark-400 ${className}`}>
      {children}
    </div>
  );
};

// Header component
DarkCard.Header = ({ children, className = '' }) => {
  return (
    <div className={`pb-4 border-b border-dark-400 mb-4 ${className}`}>
      {children}
    </div>
  );
};

export default DarkCard;