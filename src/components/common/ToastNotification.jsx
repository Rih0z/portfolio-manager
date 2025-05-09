/** 
 * プロジェクト: https://portfolio-wise.com/ 
 * ファイルパス: src/components/common/ToastNotification.jsx 
 * 
 * 作成者: Koki Riho （https://github.com/Rih0z） 
 * 作成日: 2025-05-08 14:30:00 
 * 
 * 更新履歴: 
 * - 2025-05-08 14:30:00 Koki Riho 初回作成
 * 
 * 説明: 
 * トースト通知コンポーネント。
 * 成功、エラー、警告、情報の各種メッセージを画面上部または下部に一定時間表示する。
 * 自動消去機能とユーザー操作による消去機能を備える。
 */
// src/components/common/ToastNotification.jsx

import React, { useState, useEffect } from 'react';

/**
 * トースト通知コンポーネント
 * エラーやメッセージを画面上部または下部に表示する
 */
const ToastNotification = ({ 
  message, 
  type = 'info', 
  duration = 5000,
  onClose,
  position = 'bottom'
}) => {
  const [visible, setVisible] = useState(true);
  
  // 時間経過後に閉じる
  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      if (onClose) onClose();
    }, duration);
    
    return () => clearTimeout(timer);
  }, [duration, onClose]);
  
  // 位置に応じたスタイルを決定
  const positionClass = position === 'top' 
    ? 'top-4' 
    : 'bottom-4';
  
  // タイプに応じたスタイルを決定
  const typeStyles = {
    info: 'bg-blue-100 border-blue-500 text-blue-700',
    success: 'bg-green-100 border-green-500 text-green-700',
    warning: 'bg-yellow-100 border-yellow-500 text-yellow-700',
    error: 'bg-red-100 border-red-500 text-red-700',
  };
  
  if (!visible) return null;
  
  return (
    <div className={`fixed ${positionClass} left-1/2 transform -translate-x-1/2 z-50 max-w-md w-full px-4`}>
      <div className={`border-l-4 rounded-md p-4 shadow-md ${typeStyles[type]}`}>
        <div className="flex items-start">
          <div className="ml-3 w-0 flex-1 pt-0.5">
            <p className="text-sm font-medium">{message}</p>
          </div>
          <div className="ml-4 flex-shrink-0 flex">
            <button
              onClick={() => {
                setVisible(false);
                if (onClose) onClose();
              }}
              className="inline-flex text-gray-400 focus:outline-none hover:text-gray-500"
            >
              <span className="sr-only">閉じる</span>
              <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ToastNotification;
