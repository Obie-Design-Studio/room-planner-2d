import React from 'react';

export interface MeasurementLegendProps {
  inline?: boolean;
}

export default function MeasurementLegend({ inline = false }: MeasurementLegendProps) {
  const legendItems = [
    { color: '#0A0A0A', label: 'Room', lineStyle: 'solid' },
    { color: '#3b82f6', label: 'Items', lineStyle: 'dashed' },
    { color: '#6b7280', label: 'Edges', lineStyle: 'dashed' },
    { color: '#f59e0b', label: 'Spacing', lineStyle: 'dotted' },
  ];

  if (inline) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        {legendItems.map((item) => (
          <div
            key={item.label}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <div
              style={{
                width: '18px',
                height: '2px',
                backgroundColor: item.color,
                borderRadius: '1px',
                ...(item.lineStyle === 'dashed' && {
                  backgroundImage: `linear-gradient(to right, ${item.color} 50%, transparent 50%)`,
                  backgroundSize: '6px 2px',
                  backgroundRepeat: 'repeat-x',
                  backgroundColor: 'transparent',
                }),
                ...(item.lineStyle === 'dotted' && {
                  backgroundImage: `linear-gradient(to right, ${item.color} 30%, transparent 30%)`,
                  backgroundSize: '3px 2px',
                  backgroundRepeat: 'repeat-x',
                  backgroundColor: 'transparent',
                }),
              }}
            />
            <span
              style={{
                fontSize: '11px',
                color: '#666666',
                fontWeight: 500,
              }}
            >
              {item.label}
            </span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'absolute',
        bottom: '80px',
        right: '20px',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: '8px',
        padding: '12px 16px',
        border: '1px solid #E5E5E5',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        zIndex: 10,
      }}
      className="hidden md:block"
    >
      <div
        style={{
          fontSize: '11px',
          fontWeight: 600,
          color: '#666666',
          marginBottom: '8px',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        Legend
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {legendItems.map((item) => (
          <div
            key={item.label}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <div
              style={{
                width: '24px',
                height: '2px',
                backgroundColor: item.color,
                borderRadius: '1px',
                ...(item.lineStyle === 'dashed' && {
                  backgroundImage: `linear-gradient(to right, ${item.color} 50%, transparent 50%)`,
                  backgroundSize: '8px 2px',
                  backgroundRepeat: 'repeat-x',
                  backgroundColor: 'transparent',
                }),
                ...(item.lineStyle === 'dotted' && {
                  backgroundImage: `linear-gradient(to right, ${item.color} 30%, transparent 30%)`,
                  backgroundSize: '4px 2px',
                  backgroundRepeat: 'repeat-x',
                  backgroundColor: 'transparent',
                }),
              }}
            />
            <span
              style={{
                fontSize: '13px',
                color: '#0A0A0A',
              }}
            >
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
