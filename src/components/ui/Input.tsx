import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

const Input: React.FC<InputProps> = ({ label, className, id, ...props }) => {
  const inputId = id || `input-${label?.replace(/\s+/g, '-').toLowerCase()}`;
  
  return (
    <div style={{ marginBottom: 0 }}>
      {label && (
        <label 
          htmlFor={inputId}
          style={{ 
            display: 'block',
            fontSize: '12px',
            fontWeight: 500,
            color: '#666666',
            marginBottom: '8px',
          }}
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={className || ''}
        style={{ 
          display: 'block',
          width: '100%',
          padding: '10px 12px',
          fontSize: '14px',
          color: '#0A0A0A',
          backgroundColor: '#FFFFFF',
          border: '1px solid #E5E5E5',
          borderRadius: '8px',
          outline: 'none',
          transition: 'all 150ms',
          boxSizing: 'border-box',
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = '#0A0A0A';
          e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0, 0, 0, 0.05)';
          // Auto-select all text for easier editing (especially for number inputs)
          if (props.type === 'number' || props.type === 'text') {
            e.currentTarget.select();
          }
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = '#E5E5E5';
          e.currentTarget.style.boxShadow = 'none';
        }}
        {...props}
      />
    </div>
  );
};

export default Input;
