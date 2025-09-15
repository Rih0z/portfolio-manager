/**
 * Atlassianデザインシステム準拠ボタンコンポーネント
 * CLAUDE.md第8条完全準拠: https://atlassian.design/components準拠
 * 
 * fundamental-solutions: 独自デザインから標準デザインシステムへの本質的移行
 */

import React from 'react';

/**
 * AtlassianButton - Atlassianデザインシステム準拠のボタンコンポーネント
 * 
 * @param {Object} props - ボタンのプロパティ
 * @param {'default'|'primary'|'subtle'|'warning'|'danger'} props.appearance - ボタンの外観
 * @param {'small'|'medium'|'large'} props.spacing - ボタンのサイズ
 * @param {boolean} props.isDisabled - 無効状態
 * @param {boolean} props.isLoading - ローディング状態
 * @param {React.ReactNode} props.children - ボタン内容
 * @param {Function} props.onClick - クリックハンドラー
 */
const AtlassianButton = React.forwardRef(({
  appearance = 'default',
  spacing = 'medium',
  isDisabled = false,
  isLoading = false,
  children,
  className = '',
  onClick,
  ...props
}, ref) => {
  
  // Atlassianデザインシステムの外観マッピング
  const getAppearanceClasses = () => {
    const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 border';
    
    switch (appearance) {
      case 'primary':
        return `${baseClasses} bg-primary-500 hover:bg-primary-600 text-white border-primary-500 focus:ring-primary-300 shadow-sm hover:shadow-md`;
      
      case 'danger':
        return `${baseClasses} bg-danger-300 hover:bg-danger-400 text-white border-danger-300 focus:ring-danger-200 shadow-sm hover:shadow-md`;
      
      case 'warning':
        return `${baseClasses} bg-warning-300 hover:bg-warning-400 text-neutral-900 border-warning-300 focus:ring-warning-200 shadow-sm`;
      
      case 'subtle':
        return `${baseClasses} bg-neutral-50 hover:bg-neutral-100 text-neutral-800 border-neutral-200 focus:ring-neutral-300`;
      
      default: // 'default'
        return `${baseClasses} bg-neutral-0 hover:bg-neutral-50 text-neutral-800 border-neutral-300 focus:ring-primary-300 shadow-sm hover:shadow-md`;
    }
  };

  // Atlassianスペーシングシステム
  const getSpacingClasses = () => {
    switch (spacing) {
      case 'small':
        return 'px-3 py-1.5 text-sm min-h-[32px]';
      case 'large':
        return 'px-6 py-3 text-base min-h-[48px]';
      default: // 'medium'
        return 'px-4 py-2 text-sm min-h-[40px]';
    }
  };

  // 無効/ローディング状態のクラス
  const getStateClasses = () => {
    if (isDisabled || isLoading) {
      return 'opacity-50 cursor-not-allowed pointer-events-none';
    }
    return 'cursor-pointer';
  };

  // Atlassianローディングスピナー
  const LoadingSpinner = () => (
    <svg 
      className="animate-spin h-4 w-4 mr-2" 
      xmlns="http://www.w3.org/2000/svg" 
      fill="none" 
      viewBox="0 0 24 24"
      role="status"
      aria-label="Loading"
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

  const buttonClasses = `
    ${getAppearanceClasses()}
    ${getSpacingClasses()}
    ${getStateClasses()}
    ${className}
  `.replace(/\s+/g, ' ').trim();

  return (
    <button
      ref={ref}
      className={buttonClasses}
      disabled={isDisabled || isLoading}
      onClick={isDisabled || isLoading ? undefined : onClick}
      aria-disabled={isDisabled || isLoading}
      {...props}
    >
      {isLoading && <LoadingSpinner />}
      {children}
    </button>
  );
});

AtlassianButton.displayName = 'AtlassianButton';

export default AtlassianButton;