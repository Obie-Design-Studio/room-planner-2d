import React, { useState } from 'react';

export type MeasurementMode = 'all' | 'hover' | 'manual';

interface MeasurementModeToggleProps {
  allChecked: boolean;
  someChecked: boolean;
  onToggleAll: () => void;
}

export default function MeasurementModeToggle({ allChecked, someChecked, onToggleAll }: MeasurementModeToggleProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipText = allChecked ? "Uncheck to hide all measurements" : "Check to show all measurements";

  return (
    <label
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        cursor: 'pointer',
        userSelect: 'none',
        whiteSpace: 'nowrap',
        position: 'relative',
      }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <input
        type="checkbox"
        checked={allChecked}
        ref={(input) => {
          if (input) {
            input.indeterminate = someChecked && !allChecked;
          }
        }}
        onChange={onToggleAll}
        style={{
          width: '12px',
          height: '12px',
          cursor: 'pointer',
          accentColor: '#0A0A0A',
        }}
      />
      <span
        style={{
          fontSize: '11px',
          fontWeight: 500,
          color: '#0A0A0A',
        }}
      >
        All
      </span>
      
      {/* Custom tooltip */}
      {showTooltip && (
        <div
          style={{
            position: 'absolute',
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginBottom: '8px',
            padding: '6px 10px',
            backgroundColor: '#1A1A1A',
            color: '#FFFFFF',
            fontSize: '11px',
            borderRadius: '4px',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            zIndex: 1000,
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
          }}
        >
          {tooltipText}
          {/* Arrow */}
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
              width: 0,
              height: 0,
              borderLeft: '4px solid transparent',
              borderRight: '4px solid transparent',
              borderTop: '4px solid #1A1A1A',
            }}
          />
        </div>
      )}
    </label>
  );
}
