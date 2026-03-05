/**
 * Input コンポーネント（shadcn/ui スタイル）
 * @file src/components/ui/input.tsx
 */
import React from 'react';
import { cn } from '../../lib/utils';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  errorMessage?: string;
  invalid?: boolean;
  fullWidth?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type = 'text',
      label,
      helperText,
      errorMessage,
      invalid,
      fullWidth = true,
      id,
      required,
      ...props
    },
    ref
  ) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
    const hasError = invalid || !!errorMessage;

    return (
      <div className={cn(fullWidth ? 'w-full' : 'w-auto')}>
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-foreground mb-1.5"
          >
            {label}
            {required && <span className="text-danger-500 ml-0.5">*</span>}
          </label>
        )}
        <input
          type={type}
          id={inputId}
          ref={ref}
          className={cn(
            'flex h-10 w-full rounded-lg border bg-transparent px-3 py-2 text-sm',
            'placeholder:text-muted-foreground',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'transition-colors duration-150',
            hasError
              ? 'border-danger-500 focus-visible:ring-danger-500'
              : 'border-input hover:border-gray-400 dark:hover:border-gray-500',
            className
          )}
          aria-invalid={hasError}
          aria-describedby={
            errorMessage
              ? `${inputId}-error`
              : helperText
                ? `${inputId}-helper`
                : undefined
          }
          required={required}
          {...props}
        />
        {errorMessage && (
          <p
            id={`${inputId}-error`}
            className="mt-1.5 text-xs text-danger-500"
            role="alert"
          >
            {errorMessage}
          </p>
        )}
        {!errorMessage && helperText && (
          <p
            id={`${inputId}-helper`}
            className="mt-1.5 text-xs text-muted-foreground"
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

/* Textarea */
export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  helperText?: string;
  errorMessage?: string;
  invalid?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, helperText, errorMessage, invalid, id, required, ...props }, ref) => {
    const textareaId = id || label?.toLowerCase().replace(/\s+/g, '-');
    const hasError = invalid || !!errorMessage;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={textareaId}
            className="block text-sm font-medium text-foreground mb-1.5"
          >
            {label}
            {required && <span className="text-danger-500 ml-0.5">*</span>}
          </label>
        )}
        <textarea
          id={textareaId}
          ref={ref}
          className={cn(
            'flex min-h-[80px] w-full rounded-lg border bg-transparent px-3 py-2 text-sm',
            'placeholder:text-muted-foreground',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'transition-colors duration-150 resize-y',
            hasError
              ? 'border-danger-500 focus-visible:ring-danger-500'
              : 'border-input hover:border-gray-400',
            className
          )}
          aria-invalid={hasError}
          required={required}
          {...props}
        />
        {errorMessage && (
          <p className="mt-1.5 text-xs text-danger-500" role="alert">
            {errorMessage}
          </p>
        )}
        {!errorMessage && helperText && (
          <p className="mt-1.5 text-xs text-muted-foreground">{helperText}</p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

/* Select */
export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label?: string;
  options: SelectOption[];
  helperText?: string;
  errorMessage?: string;
  invalid?: boolean;
  placeholder?: string;
  fullWidth?: boolean;
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      className,
      label,
      options,
      helperText,
      errorMessage,
      invalid,
      placeholder,
      fullWidth,
      id,
      required,
      ...props
    },
    ref
  ) => {
    const selectId = id || label?.toLowerCase().replace(/\s+/g, '-');
    const hasError = invalid || !!errorMessage;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-sm font-medium text-foreground mb-1.5"
          >
            {label}
            {required && <span className="text-danger-500 ml-0.5">*</span>}
          </label>
        )}
        <select
          id={selectId}
          ref={ref}
          className={cn(
            'flex h-10 w-full rounded-lg border bg-transparent px-3 py-2 text-sm',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'transition-colors duration-150',
            hasError
              ? 'border-danger-500 focus-visible:ring-danger-500'
              : 'border-input hover:border-gray-400',
            className
          )}
          aria-invalid={hasError}
          required={required}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} disabled={opt.disabled}>
              {opt.label}
            </option>
          ))}
        </select>
        {errorMessage && (
          <p className="mt-1.5 text-xs text-danger-500" role="alert">
            {errorMessage}
          </p>
        )}
        {!errorMessage && helperText && (
          <p className="mt-1.5 text-xs text-muted-foreground">{helperText}</p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

export { Input, Textarea, Select };
export default Input;
