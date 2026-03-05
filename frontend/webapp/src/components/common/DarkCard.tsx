/**
 * プロジェクト: https://portfolio-wise.com/
 * ファイルパス: src/components/common/DarkCard.tsx
 *
 * 作成者: Koki Riho （https://github.com/Rih0z）
 * 作成日: 2025-06-02
 *
 * 説明:
 * テーマ対応カードコンポーネント（CSS変数ベース）
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
}: any) => {
  const getVariantClasses = () => {
    switch (variant) {
      case 'elevated':
        return 'bg-card border border-border shadow-large';
      case 'minimal':
        return 'bg-muted/50 border border-border';
      case 'accent':
        return 'bg-gradient-to-br from-card to-muted border border-primary-500/30';
      case 'success':
        return 'bg-card border border-success-500/30 shadow-lg shadow-success-500/10';
      case 'warning':
        return 'bg-card border border-warning-500/30 shadow-lg shadow-warning-500/10';
      case 'danger':
        return 'bg-card border border-danger-500/30 shadow-lg shadow-danger-500/10';
      default:
        return 'bg-card border border-border shadow-medium';
    }
  };

  const glowClass = glow ? 'shadow-glow' : '';
  const hoverClass = hover ? 'hover:shadow-large hover:border-border transition-all duration-300' : '';

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
DarkCard.Title = ({ children, className = '', size = 'lg' }: any) => {
  const sizeClasses: Record<string, string> = {
    sm: 'text-sm font-semibold',
    md: 'text-base font-semibold',
    lg: 'text-lg font-bold',
    xl: 'text-xl font-bold',
    '2xl': 'text-2xl font-bold'
  };

  return (
    <h3 className={`text-foreground ${sizeClasses[size]} ${className}`}>
      {children}
    </h3>
  );
};

// Content component
DarkCard.Content = ({ children, className = '' }: any) => {
  return (
    <div className={`text-muted-foreground ${className}`}>
      {children}
    </div>
  );
};

// Footer component
DarkCard.Footer = ({ children, className = '' }: any) => {
  return (
    <div className={`pt-4 border-t border-border ${className}`}>
      {children}
    </div>
  );
};

// Header component
DarkCard.Header = ({ children, className = '' }: any) => {
  return (
    <div className={`pb-4 border-b border-border mb-4 ${className}`}>
      {children}
    </div>
  );
};

export default DarkCard;
