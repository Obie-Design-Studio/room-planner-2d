import React from 'react';

interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (color: string) => void;
}

const ColorPicker: React.FC<ColorPickerProps> = ({ label, value, onChange }) => {
  return (
    <div className="mb-6">
      <label className="block text-xs font-medium text-text-secondary mb-2">
        {label}
      </label>
      
      <div className="flex items-center gap-2.5">
        {/* The Color Swatch */}
        <div 
          className="relative w-10 h-10 rounded-lg border border-border cursor-pointer overflow-hidden"
          style={{ backgroundColor: value }}
        >
          {/* The Hidden Input - Force it to cover everything */}
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer p-0 m-0 border-0"
          />
        </div>

        {/* Hex Value Text */}
        <div className="font-mono text-xs text-text-primary bg-bg-secondary px-2 py-1 rounded-lg border border-border">
          {value.toUpperCase()}
        </div>
      </div>
    </div>
  );
};

export default ColorPicker;
