import React, { useState } from 'react';

export type MeasurementCategory = 'room' | 'items' | 'spacing' | 'edges';

interface MeasurementCategoriesProps {
  categories: {
    room: boolean;
    items: boolean;
    spacing: boolean;
    edges: boolean;
  };
  onToggle: (category: MeasurementCategory) => void;
}

export default function MeasurementCategories({ categories, onToggle }: MeasurementCategoriesProps) {
  const [hoveredCategory, setHoveredCategory] = useState<MeasurementCategory | null>(null);
  
  const categoryList: Array<{ 
    id: MeasurementCategory; 
    label: string; 
    tooltip: string; 
    color: string;
    lineStyle: 'solid' | 'dashed' | 'dotted';
  }> = [
    { id: 'items', label: 'Items', tooltip: 'Show/hide furniture dimensions (width and height)', color: '#3b82f6', lineStyle: 'dashed' },
    { id: 'spacing', label: 'Spacing', tooltip: 'Show/hide spacing between furniture and walls', color: '#f59e0b', lineStyle: 'dotted' },
    { id: 'edges', label: 'Edges', tooltip: 'Show/hide window and door positions on walls', color: '#6b7280', lineStyle: 'dashed' },
  ];

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
      }}
    >
      {categoryList.map((cat) => (
        <label
          key={cat.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            cursor: 'pointer',
            userSelect: 'none',
            position: 'relative',
          }}
          onMouseEnter={() => setHoveredCategory(cat.id)}
          onMouseLeave={() => setHoveredCategory(null)}
        >
          <input
            type="checkbox"
            checked={categories[cat.id]}
            onChange={() => onToggle(cat.id)}
            style={{
              width: '12px',
              height: '12px',
              cursor: 'pointer',
              accentColor: cat.color,
            }}
          />
          {/* Visual indicator - line style */}
          <div
            style={{
              width: '14px',
              height: '2px',
              backgroundColor: cat.color,
              borderRadius: '1px',
              ...(cat.lineStyle === 'dashed' && {
                backgroundImage: `linear-gradient(to right, ${cat.color} 50%, transparent 50%)`,
                backgroundSize: '5px 2px',
                backgroundRepeat: 'repeat-x',
                backgroundColor: 'transparent',
              }),
              ...(cat.lineStyle === 'dotted' && {
                backgroundImage: `linear-gradient(to right, ${cat.color} 30%, transparent 30%)`,
                backgroundSize: '3px 2px',
                backgroundRepeat: 'repeat-x',
                backgroundColor: 'transparent',
              }),
            }}
          />
          <span
            style={{
              fontSize: '11px',
              fontWeight: 500,
              color: '#0A0A0A',
            }}
          >
            {cat.label}
          </span>
          
          {/* Custom tooltip */}
          {hoveredCategory === cat.id && (
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
              {cat.tooltip}
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
      ))}
    </div>
  );
}
