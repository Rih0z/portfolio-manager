/** 
 * プロジェクト: https://portfolio-wise.com/ 
 * ファイルパス: src/components/common/DarkButton.jsx 
 * 
 * 作成者: Koki Riho （https://github.com/Rih0z） 
 * 作成日: 2025-06-02 
 * 
 * 説明: 
 * Netflix/Uber風のダークテーマボタンコンポーネント
 * モダンなデザインシステムに基づいた再利用可能なボタンコンポーネント
 */

import React from 'react';

const DarkButton = ({ 
  children, 
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon = null,
  iconPosition = 'left',
  className = '',
  onClick,
  ...props 
}) => {
  const getVariantClasses = () => {
    if (disabled) {
      return 'bg-dark-400 text-gray-500 cursor-not-allowed border border-dark-500';
    }

    switch (variant) {
      case 'primary':
        return `
          bg-primary-500 text-white border border-primary-500
          hover:bg-primary-600 hover:border-primary-600
          focus:ring-2 focus:ring-primary-400 focus:ring-offset-2 focus:ring-offset-dark-200
          shadow-lg hover:shadow-glow
        `;
      case 'secondary':
        return `
          bg-dark-300 text-gray-300 border border-dark-400
          hover:bg-dark-400 hover:text-gray-200 hover:border-dark-300
          focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 focus:ring-offset-dark-200
        `;
      case 'success':
        return `
          bg-success-500 text-white border border-success-500
          hover:bg-success-600 hover:border-success-600
          focus:ring-2 focus:ring-success-400 focus:ring-offset-2 focus:ring-offset-dark-200
          shadow-lg
        `;
      case 'danger':
        return `
          bg-danger-500 text-white border border-danger-500
          hover:bg-danger-600 hover:border-danger-600
          focus:ring-2 focus:ring-danger-400 focus:ring-offset-2 focus:ring-offset-dark-200
          shadow-lg
        `;
      case 'warning':
        return `
          bg-warning-500 text-dark-100 border border-warning-500
          hover:bg-warning-600 hover:border-warning-600
          focus:ring-2 focus:ring-warning-400 focus:ring-offset-2 focus:ring-offset-dark-200
          shadow-lg
        `;
      case 'ghost':
        return `
          bg-transparent text-gray-300 border border-transparent
          hover:bg-dark-300 hover:text-gray-200
          focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 focus:ring-offset-dark-200
        `;
      case 'outline':
        return `
          bg-transparent text-primary-400 border border-primary-500
          hover:bg-primary-500 hover:text-white
          focus:ring-2 focus:ring-primary-400 focus:ring-offset-2 focus:ring-offset-dark-200
        `;
      default:
        return `
          bg-primary-500 text-white border border-primary-500
          hover:bg-primary-600 hover:border-primary-600
          focus:ring-2 focus:ring-primary-400 focus:ring-offset-2 focus:ring-offset-dark-200
          shadow-lg hover:shadow-glow
        `;
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'xs':
        return 'px-2.5 py-1.5 text-xs min-h-[32px]';
      case 'sm':
        return 'px-3 py-2 text-sm min-h-[36px]';
      case 'md':
        return 'px-4 py-2.5 text-sm min-h-[44px]';
      case 'lg':
        return 'px-6 py-3 text-base min-h-[48px]';
      case 'xl':
        return 'px-8 py-4 text-lg min-h-[56px]';
      default:
        return 'px-4 py-2.5 text-sm min-h-[44px]';
    }
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

  const renderContent = () => {
    if (loading) {
      return (
        <>
          <LoadingSpinner />
          {children && <span className="ml-2">{children}</span>}
        </>
      );
    }

    if (icon && iconPosition === 'left') {
      return (
        <>
          <span className="flex-shrink-0">{icon}</span>
          {children && <span className="ml-2">{children}</span>}
        </>
      );
    }

    if (icon && iconPosition === 'right') {
      return (
        <>
          {children && <span className="mr-2">{children}</span>}
          <span className="flex-shrink-0">{icon}</span>
        </>
      );
    }

    return children;
  };

  return (
    <button
      className={`
        inline-flex items-center justify-center
        font-medium rounded-xl
        transition-all duration-200
        focus:outline-none
        disabled:cursor-not-allowed
        ${getSizeClasses()}
        ${getVariantClasses()}
        ${className}
      `}
      disabled={disabled || loading}
      onClick={onClick}
      {...props}
    >
      {renderContent()}
    </button>
  );
};

export default DarkButton;