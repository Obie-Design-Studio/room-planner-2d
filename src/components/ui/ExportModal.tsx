import { useState } from 'react';
import { X, FileText, Image, FileJson, Download } from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (format: 'pdf-blueprint' | 'pdf-measurements' | 'png' | 'json') => void;
  currentView: 'blueprint' | 'measurements' | 'materials';
}

export default function ExportModal({ isOpen, onClose, onExport, currentView }: ExportModalProps) {
  const [exporting, setExporting] = useState(false);

  if (!isOpen) return null;

  const handleExport = async (format: 'pdf-blueprint' | 'pdf-measurements' | 'png' | 'json') => {
    setExporting(true);
    await onExport(format);
    setExporting(false);
    onClose();
  };

  const exportOptions = [
    {
      id: 'pdf-blueprint',
      icon: FileText,
      title: 'PDF - Blueprint View',
      description: 'Export current room layout as a PDF document',
      recommended: currentView === 'blueprint',
    },
    {
      id: 'pdf-measurements',
      icon: FileText,
      title: 'PDF - With Measurements',
      description: 'Export room with detailed measurements and item list',
      recommended: currentView === 'measurements',
    },
    {
      id: 'png',
      icon: Image,
      title: 'PNG Image',
      description: 'Export current view as a high-quality image',
      recommended: false,
    },
    {
      id: 'json',
      icon: FileJson,
      title: 'JSON Data',
      description: 'Export room data for backup or import later',
      recommended: false,
    },
  ];

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          width: '90%',
          maxWidth: '600px',
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '24px',
            borderBottom: '1px solid #EFEFEF',
          }}
        >
          <div>
            <h2
              style={{
                fontSize: '20px',
                fontWeight: 600,
                color: '#0A0A0A',
                margin: 0,
                marginBottom: '4px',
              }}
            >
              Export Room
            </h2>
            <p
              style={{
                fontSize: '14px',
                color: '#999999',
                margin: 0,
              }}
            >
              Choose your export format
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={exporting}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              padding: 0,
              color: '#666666',
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: '8px',
              cursor: exporting ? 'not-allowed' : 'pointer',
              transition: 'all 150ms',
              opacity: exporting ? 0.5 : 1,
            }}
            onMouseEnter={(e) => {
              if (!exporting) {
                e.currentTarget.style.backgroundColor = '#F5F5F5';
                e.currentTarget.style.color = '#0A0A0A';
              }
            }}
            onMouseLeave={(e) => {
              if (!exporting) {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = '#666666';
              }
            }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div
          style={{
            flex: 1,
            overflow: 'auto',
            padding: '24px',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {exportOptions.map((option) => {
              const Icon = option.icon;
              return (
                <button
                  key={option.id}
                  onClick={() =>
                    handleExport(
                      option.id as 'pdf-blueprint' | 'pdf-measurements' | 'png' | 'json'
                    )
                  }
                  disabled={exporting}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    padding: '16px',
                    backgroundColor: option.recommended ? '#F5F5F5' : '#FAFAFA',
                    border: option.recommended ? '2px solid #0A0A0A' : '1px solid #EFEFEF',
                    borderRadius: '12px',
                    cursor: exporting ? 'not-allowed' : 'pointer',
                    transition: 'all 150ms',
                    textAlign: 'left',
                    width: '100%',
                    opacity: exporting ? 0.6 : 1,
                  }}
                  onMouseEnter={(e) => {
                    if (!exporting) {
                      e.currentTarget.style.backgroundColor = '#F0F0F0';
                      e.currentTarget.style.borderColor = '#0A0A0A';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!exporting) {
                      e.currentTarget.style.backgroundColor = option.recommended
                        ? '#F5F5F5'
                        : '#FAFAFA';
                      e.currentTarget.style.borderColor = option.recommended
                        ? '#0A0A0A'
                        : '#EFEFEF';
                    }
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '48px',
                      height: '48px',
                      backgroundColor: '#FFFFFF',
                      borderRadius: '10px',
                      flexShrink: 0,
                    }}
                  >
                    <Icon className="w-6 h-6" style={{ color: '#0A0A0A' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '4px',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '16px',
                          fontWeight: 600,
                          color: '#0A0A0A',
                        }}
                      >
                        {option.title}
                      </span>
                      {option.recommended && (
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            color: '#0A0A0A',
                            backgroundColor: '#E5E5E5',
                            padding: '2px 8px',
                            borderRadius: '4px',
                          }}
                        >
                          RECOMMENDED
                        </span>
                      )}
                    </div>
                    <p
                      style={{
                        fontSize: '14px',
                        color: '#666666',
                        margin: 0,
                      }}
                    >
                      {option.description}
                    </p>
                  </div>
                  <Download className="w-5 h-5" style={{ color: '#999999', flexShrink: 0 }} />
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        {exporting && (
          <div
            style={{
              padding: '16px 24px',
              borderTop: '1px solid #EFEFEF',
              backgroundColor: '#FAFAFA',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                color: '#666666',
                fontSize: '14px',
              }}
            >
              <div
                style={{
                  width: '16px',
                  height: '16px',
                  border: '2px solid #E5E5E5',
                  borderTopColor: '#0A0A0A',
                  borderRadius: '50%',
                  animation: 'spin 0.6s linear infinite',
                }}
              />
              Generating export...
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
