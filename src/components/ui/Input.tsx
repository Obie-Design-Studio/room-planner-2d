import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

const Input: React.FC<InputProps> = ({ label, style, ...props }) => {
  const baseStyle: React.CSSProperties = {
    display: 'block',
    width: '100%',
    padding: '8px 12px',
    fontSize: '14px',
    borderRadius: '6px',
    border: '1px solid #ccc',
    backgroundColor: 'white',
    boxSizing: 'border-box',
    marginBottom: '10px',
    ...style,
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '11px',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    color: '#666',
    marginBottom: '4px',
  };

  return (
    <div style={{ marginBottom: '15px' }}>
      {label && <label style={labelStyle}>{label}</label>}
      <input style={baseStyle} {...props} />
    </div>
  );
};

export default Input;
