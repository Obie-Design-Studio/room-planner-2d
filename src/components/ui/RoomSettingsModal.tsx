import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { RoomConfig } from '@/types';
import Input from '@/components/ui/Input';
import { ROOM_TYPE_LABELS, type RoomType } from '@/lib/furnitureLibrary';

interface RoomSettingsModalProps {
  isOpen: boolean;
  roomName: string;
  roomConfig: RoomConfig;
  ceilingHeight: number;
  defaultWindowWidth: number;
  defaultWindowHeight: number;
  defaultWindowFloorDistance: number;
  defaultDoorWidth: number;
  defaultDoorHeight: number;
  onClose: () => void;
  onUpdate: (name: string, config: RoomConfig, ceiling: number, windowWidth: number, windowHeight: number, windowFloorDistance: number, doorWidth: number, doorHeight: number) => void;
}

const RoomSettingsModal: React.FC<RoomSettingsModalProps> = ({
  isOpen,
  roomName,
  roomConfig,
  ceilingHeight,
  defaultWindowWidth,
  defaultWindowHeight,
  defaultWindowFloorDistance,
  defaultDoorWidth,
  defaultDoorHeight,
  onClose,
  onUpdate,
}) => {
  const [localName, setLocalName] = useState(roomName);
  const [localWidth, setLocalWidth] = useState(roomConfig.width);
  const [localHeight, setLocalHeight] = useState(roomConfig.height);
  const [localCeiling, setLocalCeiling] = useState(ceilingHeight);
  const [localRoomType, setLocalRoomType] = useState<RoomType | undefined>(roomConfig.roomType);
  const [localWindowWidth, setLocalWindowWidth] = useState(defaultWindowWidth);
  const [localWindowHeight, setLocalWindowHeight] = useState(defaultWindowHeight);
  const [localWindowFloorDistance, setLocalWindowFloorDistance] = useState(defaultWindowFloorDistance);
  const [localDoorWidth, setLocalDoorWidth] = useState(defaultDoorWidth);
  const [localDoorHeight, setLocalDoorHeight] = useState(defaultDoorHeight);

  // Sync local state when props change
  useEffect(() => {
    if (isOpen) {
      setLocalName(roomName);
      setLocalWidth(roomConfig.width);
      setLocalHeight(roomConfig.height);
      setLocalCeiling(ceilingHeight);
      setLocalRoomType(roomConfig.roomType);
      setLocalWindowWidth(defaultWindowWidth);
      setLocalWindowHeight(defaultWindowHeight);
      setLocalWindowFloorDistance(defaultWindowFloorDistance);
      setLocalDoorWidth(defaultDoorWidth);
      setLocalDoorHeight(defaultDoorHeight);
    }
  }, [isOpen, roomName, roomConfig, ceilingHeight, defaultWindowWidth, defaultWindowHeight, defaultWindowFloorDistance, defaultDoorWidth, defaultDoorHeight]);

  if (!isOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleApply = () => {
    onUpdate(
      localName, 
      { width: localWidth, height: localHeight, roomType: localRoomType }, 
      localCeiling, 
      localWindowWidth, 
      localWindowHeight, 
      localWindowFloorDistance,
      localDoorWidth, 
      localDoorHeight
    );
    onClose();
  };

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
          maxWidth: '448px',
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
            Room Settings
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

        {/* Content */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Room Type Dropdown */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label
                style={{
                  fontSize: '13px',
                  fontWeight: 500,
                  color: '#666666',
                  letterSpacing: '-0.01em',
                }}
              >
                Room Type
              </label>
              <select
                value={localRoomType || ''}
                onChange={(e) => setLocalRoomType(e.target.value as RoomType)}
                style={{
                  padding: '12px 14px',
                  fontSize: '14px',
                  fontWeight: 400,
                  color: '#0A0A0A',
                  backgroundColor: '#FAFAFA',
                  border: '1px solid #E5E5E5',
                  borderRadius: '10px',
                  outline: 'none',
                  transition: 'all 150ms',
                  cursor: 'pointer',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#0A0A0A';
                  e.currentTarget.style.backgroundColor = '#FFFFFF';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#E5E5E5';
                  e.currentTarget.style.backgroundColor = '#FAFAFA';
                }}
              >
                <option value="">Select a room type...</option>
                {Object.entries(ROOM_TYPE_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <Input
              label="Room Name"
              type="text"
              value={localName}
              onChange={(e) => setLocalName(e.target.value)}
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <Input
                label="Width (cm)"
                type="number"
                value={localWidth}
                onChange={(e) => setLocalWidth(Number(e.target.value))}
              />

              <Input
                label="Length (cm)"
                type="number"
                value={localHeight}
                onChange={(e) => setLocalHeight(Number(e.target.value))}
              />
            </div>

            <Input
              label="Ceiling Height (cm)"
              type="number"
              value={localCeiling}
              onChange={(e) => setLocalCeiling(Number(e.target.value))}
            />

            {/* Divider */}
            <div style={{ 
              height: '1px', 
              backgroundColor: '#EFEFEF',
              margin: '4px 0'
            }} />

            {/* Default Dimensions Section */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#666666',
                  letterSpacing: '-0.01em',
                  textTransform: 'uppercase',
                }}
              >
                Default Dimensions
              </label>
              <p style={{
                fontSize: '12px',
                color: '#999999',
                margin: 0,
                lineHeight: '1.4',
              }}>
                Set default sizes for new windows and doors
              </p>
            </div>

            {/* Window Defaults */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#0A0A0A',
                  letterSpacing: '-0.01em',
                }}
              >
                Window
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <Input
                  label="Width (cm)"
                  type="number"
                  value={localWindowWidth}
                  onChange={(e) => setLocalWindowWidth(Number(e.target.value))}
                  min={10}
                />
                <Input
                  label="Height (cm)"
                  type="number"
                  value={localWindowHeight}
                  onChange={(e) => setLocalWindowHeight(Number(e.target.value))}
                  min={10}
                />
              </div>
              <Input
                label="From Floor (cm)"
                type="number"
                value={localWindowFloorDistance}
                onChange={(e) => setLocalWindowFloorDistance(Number(e.target.value))}
                min={0}
              />
            </div>

            {/* Door Defaults */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#0A0A0A',
                  letterSpacing: '-0.01em',
                }}
              >
                Door
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <Input
                  label="Width (cm)"
                  type="number"
                  value={localDoorWidth}
                  onChange={(e) => setLocalDoorWidth(Number(e.target.value))}
                  min={10}
                />
                <Input
                  label="Height (cm)"
                  type="number"
                  value={localDoorHeight}
                  onChange={(e) => setLocalDoorHeight(Number(e.target.value))}
                  min={10}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{ 
            display: 'flex',
            gap: '12px',
            padding: '20px 24px',
            borderTop: '1px solid #EFEFEF',
            backgroundColor: '#FAFAFA',
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: '12px 20px',
              fontSize: '14px',
              fontWeight: 500,
              color: '#666666',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E5E5E5',
              borderRadius: '10px',
              cursor: 'pointer',
              transition: 'all 150ms',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#F5F5F5';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#FFFFFF';
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            style={{
              flex: 1,
              padding: '12px 20px',
              fontSize: '14px',
              fontWeight: 500,
              color: '#FFFFFF',
              backgroundColor: '#0A0A0A',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
              transition: 'all 150ms',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#2A2A2A';
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#0A0A0A';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            Save Changes
          </button>
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

export default RoomSettingsModal;
