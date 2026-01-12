import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

const Input: React.FC<InputProps> = ({ label, className, ...props }) => {
  return (
    <div className="mb-6">
      {label && (
        <label className="block text-xs font-semibold text-[#666666] mb-1">
          {label}
        </label>
      )}
      <input
        className={`block w-full px-3 py-2 text-sm rounded-md border border-[#E5E5E0] bg-[#FAFAF8] text-[#2D2D2D] box-border focus:outline-none focus:border-[#D97706] focus:ring-1 focus:ring-[#D97706] ${className || ''}`}
        {...props}
      />
    </div>
  );
};

export default Input;
