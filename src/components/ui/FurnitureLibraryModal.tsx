import React, { useState } from 'react';
import { X } from 'lucide-react';
import { FURNITURE_LIBRARY, type FurnitureDefinition } from '@/lib/furnitureLibrary';

interface FurnitureLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddFurniture: (furniture: FurnitureDefinition) => void;
}

const FurnitureLibraryModal: React.FC<FurnitureLibraryModalProps> = ({
  isOpen,
  onClose,
  onAddFurniture,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  if (!isOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleAddFurniture = (furniture: FurnitureDefinition) => {
    onAddFurniture(furniture);
    onClose();
  };

  const categories = ['all', 'bedroom', 'living', 'kitchen', 'office', 'bathroom', 'general'];
  const filteredFurniture = selectedCategory === 'all' 
    ? FURNITURE_LIBRARY 
    : FURNITURE_LIBRARY.filter(f => f.category === selectedCategory);

  return (
    <div
      onClick={handleOverlayClick}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.25)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '640px',
          maxHeight: '80vh',
          margin: '0 16px',
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)',
          animation: 'modalSlideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div
          style={{ 
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px 24px',
            borderBottom: '1px solid #EFEFEF',
          }}
        >
          <h2
            style={{
              fontSize: '18px',
              fontWeight: 600,
              color: '#0A0A0A',
              letterSpacing: '-0.01em',
              margin: 0,
            }}
          >
            Furniture Library
          </h2>
          <button
            onClick={onClose}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              padding: 0,
              color: '#999999',
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 150ms',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#F5F5F5';
              e.currentTarget.style.color = '#0A0A0A';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#999999';
            }}
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Category Filter */}
        <div style={{ 
          padding: '16px 24px', 
          borderBottom: '1px solid #EFEFEF',
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
        }}>
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              style={{
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: 500,
                color: selectedCategory === category ? '#FFFFFF' : '#666666',
                backgroundColor: selectedCategory === category ? '#0A0A0A' : '#FAFAFA',
                border: selectedCategory === category ? 'none' : '1px solid #E5E5E5',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 150ms',
                whiteSpace: 'nowrap',
                textTransform: 'capitalize',
              }}
              onMouseEnter={(e) => {
                if (selectedCategory !== category) {
                  e.currentTarget.style.backgroundColor = '#F5F5F5';
                  e.currentTarget.style.borderColor = '#0A0A0A';
                }
              }}
              onMouseLeave={(e) => {
                if (selectedCategory !== category) {
                  e.currentTarget.style.backgroundColor = '#FAFAFA';
                  e.currentTarget.style.borderColor = '#E5E5E5';
                }
              }}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Content - Scrollable */}
        <div style={{ 
          flex: 1,
          overflowY: 'auto',
          padding: '24px',
        }}>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
            gap: '12px',
          }}>
            {filteredFurniture.map((furniture) => (
              <button
                key={furniture.type}
                onClick={() => handleAddFurniture(furniture)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '16px',
                  backgroundColor: '#FAFAFA',
                  border: '1px solid #E5E5E5',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  transition: 'all 150ms',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#F5F5F5';
                  e.currentTarget.style.borderColor = '#0A0A0A';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#FAFAFA';
                  e.currentTarget.style.borderColor = '#E5E5E5';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                {/* Color preview */}
                <div style={{ 
                  width: '48px', 
                  height: '48px', 
                  borderRadius: '8px', 
                  backgroundColor: furniture.color,
                  border: '1px solid rgba(0,0,0,0.1)',
                }} />
                
                {/* Label */}
                <div style={{
                  fontSize: '13px',
                  fontWeight: 500,
                  color: '#0A0A0A',
                  textAlign: 'center',
                }}>
                  {furniture.label}
                </div>
                
                {/* Dimensions */}
                <div style={{
                  fontSize: '11px',
                  color: '#999999',
                }}>
                  {furniture.width} × {furniture.height} cm
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes modalSlideIn {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(20px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default FurnitureLibraryModal;
