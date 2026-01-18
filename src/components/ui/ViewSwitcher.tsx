import React from 'react';
import { ViewMode } from '@/types';

interface ViewSwitcherProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  compact?: boolean;
}

export default function ViewSwitcher({ currentView, onViewChange, compact = false }: ViewSwitcherProps) {
  const views: Array<{ id: ViewMode; label: string; enabled: boolean }> = [
    { id: 'blueprint', label: 'Blueprint', enabled: true },
    { id: 'measurements', label: 'Measurements', enabled: true },
    { id: 'materials', label: 'Materials', enabled: false }, // Coming soon
  ];

  if (compact) {
    return (
      <div
        style={{
          display: 'inline-flex',
          gap: '4px',
          padding: '3px',
          backgroundColor: '#F5F5F5',
          borderRadius: '6px',
        }}
      >
        {views.map((view) => (
          <button
            key={view.id}
            onClick={() => view.enabled && onViewChange(view.id)}
            disabled={!view.enabled}
            style={{
              padding: '4px 12px',
              fontSize: '12px',
              fontWeight: 600,
              color: currentView === view.id ? '#FFFFFF' : view.enabled ? '#0A0A0A' : '#CCCCCC',
              backgroundColor: currentView === view.id ? '#0A0A0A' : 'transparent',
              border: 'none',
              borderRadius: '4px',
              cursor: view.enabled ? 'pointer' : 'not-allowed',
              transition: 'all 150ms',
              whiteSpace: 'nowrap',
            }}
          >
            {view.label}
            {!view.enabled && (
              <span style={{ fontSize: '10px', marginLeft: '4px', opacity: 0.6 }}>
                (Soon)
              </span>
            )}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        gap: '4px',
        padding: '4px',
        backgroundColor: '#FFFFFF',
        borderRadius: '10px',
        border: '1px solid #E5E5E5',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
      }}
    >
      {views.map((view) => (
        <button
          key={view.id}
          onClick={() => view.enabled && onViewChange(view.id)}
          disabled={!view.enabled}
          style={{
            padding: '8px 16px',
            fontSize: '14px',
            fontWeight: 600,
            color: currentView === view.id ? '#FFFFFF' : view.enabled ? '#0A0A0A' : '#CCCCCC',
            backgroundColor: currentView === view.id ? '#0A0A0A' : 'transparent',
            border: 'none',
            borderRadius: '7px',
            cursor: view.enabled ? 'pointer' : 'not-allowed',
            transition: 'all 150ms',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={(e) => {
            if (view.enabled && currentView !== view.id) {
              e.currentTarget.style.backgroundColor = '#F5F5F5';
            }
          }}
          onMouseLeave={(e) => {
            if (currentView !== view.id) {
              e.currentTarget.style.backgroundColor = 'transparent';
            }
          }}
          className="md:px-5 md:py-2 md:text-[15px]"
        >
          {view.label}
          {!view.enabled && (
            <span style={{ fontSize: '11px', marginLeft: '6px', opacity: 0.6 }}>
              (Soon)
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
