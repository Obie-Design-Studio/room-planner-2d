import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

const Input: React.FC<InputProps> = ({ label, className, ...props }) => {
  return (
    <div className="mb-6">
      {label && (
        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-2">
          {label}
        </label>
      )}
      <input
        className={`block w-full px-3 py-2 text-sm rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-primary)] box-border focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] ${className || ''}`}
        {...props}
      />
    </div>
  );
};

export default Input;
