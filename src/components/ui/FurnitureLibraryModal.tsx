import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Stage, Layer } from 'react-konva';
import { FURNITURE_LIBRARY, type FurnitureDefinition } from '@/lib/furnitureLibrary';
import {
  BedSymbol,
  NightstandSymbol,
  DresserSymbol,
  ClosetSymbol,
  DeskSymbol,
  SofaSymbol,
  ArmchairSymbol,
  CoffeeTableSymbol,
  TVStandSymbol,
  BookshelfSymbol,
  DiningTableSymbol,
  ChairSymbol,
  RefrigeratorSymbol,
  StoveSymbol,
  CounterSymbol,
  FilingCabinetSymbol,
  ToiletSymbol,
  SinkSymbol,
  ShowerSymbol,
  BathtubSymbol,
  WallToiletSymbol,
  TowelDryerSymbol,
  TableSymbol,
} from '@/components/canvas/furnitureSymbols';

interface FurnitureLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddFurniture: (furniture: FurnitureDefinition) => void;
  defaultCategory?: string;
}

// Mapping from furniture type to symbol component
const FURNITURE_SYMBOL_MAP: Record<string, React.FC<{ widthCm: number; heightCm: number }>> = {
  'Bed': BedSymbol,
  'Nightstand': NightstandSymbol,
  'Dresser': DresserSymbol,
  'Closet': ClosetSymbol,
  'Desk': DeskSymbol,
  'Sofa': SofaSymbol,
  'Armchair': ArmchairSymbol,
  'Coffee Table': CoffeeTableSymbol,
  'TV Stand': TVStandSymbol,
  'Bookshelf': BookshelfSymbol,
  'Dining Table': DiningTableSymbol,
  'Chair': ChairSymbol,
  'Refrigerator': RefrigeratorSymbol,
  'Stove': StoveSymbol,
  'Counter': CounterSymbol,
  'Filing Cabinet': FilingCabinetSymbol,
  'Toilet': ToiletSymbol,
  'Sink': SinkSymbol,
  'Shower': ShowerSymbol,
  'Bathtub': BathtubSymbol,
  'Wall Toilet': WallToiletSymbol,
  'Towel Dryer': TowelDryerSymbol,
  'Table': TableSymbol,
};

// Component to render furniture preview icon
const FurniturePreview: React.FC<{ furniture: FurnitureDefinition }> = ({ furniture }) => {
  const SymbolComponent = FURNITURE_SYMBOL_MAP[furniture.type];
  
  if (!SymbolComponent) {
    // Fallback to color block if no symbol found
    return (
      <div style={{ 
        width: '48px', 
        height: '48px', 
        borderRadius: '8px', 
        backgroundColor: furniture.color,
        border: '1px solid rgba(0,0,0,0.1)',
      }} />
    );
  }

  // PIXELS_PER_CM constant from constants.ts
  const PIXELS_PER_CM = 2;
  
  // Calculate the actual pixel dimensions of the furniture
  const furnitureWidthPx = furniture.width * PIXELS_PER_CM;
  const furnitureHeightPx = furniture.height * PIXELS_PER_CM;
  
  // Calculate scale to fit in preview with padding
  const previewSize = 48;
  const padding = 8;
  const availableSize = previewSize - padding * 2;
  const maxDimension = Math.max(furnitureWidthPx, furnitureHeightPx);
  const scale = availableSize / maxDimension;
  
  // Calculate final Stage dimensions
  const stageWidth = furnitureWidthPx * scale;
  const stageHeight = furnitureHeightPx * scale;
  
  return (
    <div style={{ 
      width: '48px', 
      height: '48px', 
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#FAFAFA',
      borderRadius: '8px',
      border: '1px solid #E5E5E5',
    }}>
      <Stage width={stageWidth} height={stageHeight}>
        <Layer scale={{ x: scale, y: scale }}>
          <SymbolComponent widthCm={furniture.width} heightCm={furniture.height} />
        </Layer>
      </Stage>
    </div>
  );
};

const FurnitureLibraryModal: React.FC<FurnitureLibraryModalProps> = ({
  isOpen,
  onClose,
  onAddFurniture,
  defaultCategory = 'all',
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>(defaultCategory);

  // Reset to default category when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedCategory(defaultCategory);
    }
  }, [isOpen, defaultCategory]);

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
          maxHeight: 'calc(100vh - 80px)',
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
          alignItems: 'center',
          gap: '8px',
          overflowX: 'auto',
        }}>
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: 500,
                lineHeight: '1',
                color: selectedCategory === category ? '#FFFFFF' : '#666666',
                backgroundColor: selectedCategory === category ? '#0A0A0A' : '#FAFAFA',
                border: '1px solid',
                borderColor: selectedCategory === category ? '#0A0A0A' : '#E5E5E5',
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
                {/* Furniture icon preview */}
                <FurniturePreview furniture={furniture} />
                
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
