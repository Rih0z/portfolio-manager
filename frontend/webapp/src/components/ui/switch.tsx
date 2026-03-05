/**
 * Switch コンポーネント（テーマトグル等）
 * @file src/components/ui/switch.tsx
 */
import React from 'react';
import { cn } from '../../lib/utils';

interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
}

function Switch({
  checked,
  onCheckedChange,
  label,
  disabled = false,
  className,
  id,
}: SwitchProps) {
  const switchId = id || label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <button
        id={switchId}
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onCheckedChange(!checked)}
        className={cn(
          'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50',
          checked ? 'bg-primary-500' : 'bg-gray-300 dark:bg-gray-600'
        )}
      >
        <span
          className={cn(
            'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm ring-0 transition-transform duration-200 ease-in-out',
            checked ? 'translate-x-5' : 'translate-x-0'
          )}
        />
      </button>
      {label && (
        <label
          htmlFor={switchId}
          className="text-sm font-medium text-foreground cursor-pointer"
        >
          {label}
        </label>
      )}
    </div>
  );
}

export { Switch };
export default Switch;
