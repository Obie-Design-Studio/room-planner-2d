import React from 'react';

interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (color: string) => void;
}

const ColorPicker: React.FC<ColorPickerProps> = ({ label, value, onChange }) => {
  return (
    <div style={{ marginBottom: 0 }}>
      <label 
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
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* The Color Swatch */}
        <div 
          style={{ 
            position: 'relative',
            width: '42px',
            height: '42px',
            backgroundColor: value,
            border: '1px solid #E5E5E5',
            borderRadius: '8px',
            overflow: 'hidden',
            cursor: 'pointer',
            transition: 'all 150ms',
            boxShadow: 'inset 0 0 0 1px rgba(0, 0, 0, 0.1)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#0A0A0A';
            e.currentTarget.style.transform = 'scale(1.05)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#E5E5E5';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          {/* The Hidden Input - Force it to cover everything */}
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              opacity: 0,
              cursor: 'pointer',
              padding: 0,
              margin: 0,
              border: 0,
            }}
          />
        </div>

        {/* Hex Value Text */}
        <input
          type="text"
          value={value.toUpperCase()}
          onChange={(e) => {
            const hex = e.target.value;
            if (/^#[0-9A-F]{6}$/i.test(hex)) {
              onChange(hex);
            }
          }}
          style={{
            flex: 1,
            padding: '10px 12px',
            fontSize: '14px',
            fontFamily: 'monospace',
            color: '#0A0A0A',
            backgroundColor: '#FFFFFF',
            border: '1px solid #E5E5E5',
            borderRadius: '8px',
            outline: 'none',
            transition: 'all 150ms',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = '#0A0A0A';
            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0, 0, 0, 0.05)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = '#E5E5E5';
            e.currentTarget.style.boxShadow = 'none';
          }}
          maxLength={7}
        />
      </div>
    </div>
  );
};

export default ColorPicker;
