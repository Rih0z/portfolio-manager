/**
 * ModernForm — テーマ対応フォームコンポーネント
 *
 * ModernCard/ModernInput/ModernButton を内部利用。
 * 既存 API (Field/InlineEdit) を維持。
 *
 * @file src/components/common/ModernForm.tsx
 */
import React from 'react';
import ModernCard from './ModernCard';
import ModernInput from './ModernInput';

const ModernForm = ({
  title,
  description,
  onSubmit,
  className = '',
  children,
  actions,
  ...props
}: any) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSubmit) onSubmit(e);
  };

  return (
    <ModernCard className={className} {...props}>
      {title && (
        <ModernCard.Header>
          <ModernCard.Title>{title}</ModernCard.Title>
          {description && <p className="text-sm text-muted-foreground mt-2">{description}</p>}
        </ModernCard.Header>
      )}
      <ModernCard.Content>
        <form onSubmit={handleSubmit} className="space-y-6">
          {children}
        </form>
      </ModernCard.Content>
      {actions && (
        <ModernCard.Footer>
          <div className="flex justify-end space-x-3">{actions}</div>
        </ModernCard.Footer>
      )}
    </ModernCard>
  );
};

const FormField = ({ label, error, required = false, className = '', children }: any) => (
  <div className={`space-y-2 ${className}`}>
    {label && (
      <label className="block text-sm font-semibold text-foreground">
        {label}
        {required && <span className="text-danger-500 ml-1">*</span>}
      </label>
    )}
    {children}
    {error && (
      <p className="text-sm text-danger-600 flex items-center mt-1">
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
  </div>
);

const InlineEdit = ({
  value,
  onSave,
  onCancel,
  type = 'text',
  placeholder,
  disabled = false,
  className = '',
}: any) => {
  const [isEditing, setIsEditing] = React.useState(false);
  const [editValue, setEditValue] = React.useState(value);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    if (onSave) onSave(editValue);
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditValue(value);
    setIsEditing(false);
    if (onCancel) onCancel();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave();
    else if (e.key === 'Escape') handleCancelEdit();
  };

  if (disabled) {
    return <span className={`text-muted-foreground ${className}`}>{value}</span>;
  }

  if (isEditing) {
    return (
      <div className="flex items-center space-x-2">
        <ModernInput
          ref={inputRef}
          type={type}
          value={editValue}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          size="sm"
          className="min-w-0 flex-1"
        />
        <div className="flex space-x-1">
          <button
            type="button"
            onClick={handleSave}
            className="p-1 text-success-600 hover:text-success-700 transition-colors"
            title="保存"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={handleCancelEdit}
            className="p-1 text-muted-foreground hover:text-foreground transition-colors"
            title="キャンセル"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setIsEditing(true)}
      className={`text-left hover:bg-accent px-2 py-1 rounded transition-colors ${className}`}
      title="クリックして編集"
    >
      {value || placeholder}
    </button>
  );
};

ModernForm.Field = FormField;
ModernForm.InlineEdit = InlineEdit;

export default ModernForm;
