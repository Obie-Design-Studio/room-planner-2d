import React from 'react';

interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (color: string) => void;
}

const ColorPicker: React.FC<ColorPickerProps> = ({ label, value, onChange }) => {
  return (
    <div style={{ marginBottom: '15px' }}>
      <label style={{ 
        display: 'block', 
        fontSize: '11px', 
        fontWeight: 'bold', 
        textTransform: 'uppercase', 
        color: '#666', 
        marginBottom: '4px' 
      }}>
        {label}
      </label>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {/* The Color Swatch */}
        <div style={{ 
          position: 'relative', 
          width: '40px', 
          height: '40px', 
          borderRadius: '8px', 
          border: '1px solid #ccc',
          backgroundColor: value,
          cursor: 'pointer',
          overflow: 'hidden'
        }}>
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
              border: 'none'
            }}
          />
        </div>

        {/* Hex Value Text */}
        <div style={{ 
          fontFamily: 'monospace', 
          fontSize: '12px', 
          color: '#333', 
          backgroundColor: '#f5f5f5', 
          padding: '4px 8px', 
          borderRadius: '4px',
          border: '1px solid #ddd'
        }}>
          {value.toUpperCase()}
        </div>
      </div>
    </div>
  );
};

export default ColorPicker;
