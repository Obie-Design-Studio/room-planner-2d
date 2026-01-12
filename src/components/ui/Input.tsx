import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

const Input: React.FC<InputProps> = ({ label, className, ...props }) => {
  return (
    <div className="mb-6">
      {label && (
        <label className="block text-xs font-medium text-text-secondary mb-2">
          {label}
        </label>
      )}
      <input
        className={`block w-full px-3 py-2 text-sm rounded-lg border border-border bg-bg-secondary text-text-primary box-border focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent ${className || ''}`}
        {...props}
      />
    </div>
  );
};

export default Input;
