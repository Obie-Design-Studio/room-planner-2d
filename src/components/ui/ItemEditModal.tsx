import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { FurnitureItem } from '@/types';
import Input from '@/components/ui/Input';
import ColorPicker from '@/components/ui/ColorPicker';
import { WALL_THICKNESS_CM } from '@/lib/constants';

interface ItemEditModalProps {
  isOpen: boolean;
  item: FurnitureItem | null;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<FurnitureItem>) => void;
  onDelete: (id: string) => void;
  roomWidth: number;
  roomHeight: number;
}

const ItemEditModal: React.FC<ItemEditModalProps> = ({
  isOpen,
  item,
  onClose,
  onUpdate,
  onDelete,
  roomWidth,
  roomHeight,
}) => {
  const [localType, setLocalType] = useState('');
  const [localWidth, setLocalWidth] = useState(0);
  const [localHeight, setLocalHeight] = useState(0);
  const [localRotation, setLocalRotation] = useState(0);
  const [localColor, setLocalColor] = useState('#e0e0e0');
  const [localFloorDistance, setLocalFloorDistance] = useState(90);
  const [localDistanceFromCorner, setLocalDistanceFromCorner] = useState(0);

  // Detect which wall the door/window is on
  const getWallPosition = (item: FurnitureItem | null): 'top' | 'bottom' | 'left' | 'right' | null => {
    if (!item) return null;
    const isWallObject = item.type?.toLowerCase() === 'door' || 
                         item.type?.toLowerCase() === 'window' || 
                         item.type?.toLowerCase() === 'wall';
    if (!isWallObject) return null;

    // Check which wall based on y/x position
    if (Math.abs(item.y - (-WALL_THICKNESS_CM)) < 1) return 'top';
    if (Math.abs(item.y - roomHeight) < 1) return 'bottom';
    if (Math.abs(item.x - (-WALL_THICKNESS_CM)) < 1) return 'left';
    if (Math.abs(item.x - roomWidth) < 1) return 'right';

    return null;
  };

  const wallPosition = getWallPosition(item);

  // Sync local state when item changes
  useEffect(() => {
    if (item) {
      setLocalType(item.type);
      setLocalWidth(item.width);
      setLocalHeight(item.height);
      setLocalRotation(item.rotation || 0);
      setLocalColor(item.color || '#e0e0e0');
      setLocalFloorDistance(item.floorDistance || 90);
      
      // Convert X/Y to distance from corner for wall objects
      const wall = getWallPosition(item);
      console.log('[ItemEditModal] useEffect - Item:', item.id, 'Type:', item.type, 'Wall Position:', wall);
      console.log('[ItemEditModal] useEffect - Item X:', item.x, 'Item Y:', item.y);

      if (wall === 'top' || wall === 'bottom') {
        // On horizontal walls: distance from left corner = X coordinate
        setLocalDistanceFromCorner(item.x);
        console.log('[ItemEditModal] useEffect - Horizontal wall, Distance from Corner (X):', item.x);
      } else if (wall === 'left' || wall === 'right') {
        // On vertical walls: distance from top corner = Y coordinate
        setLocalDistanceFromCorner(item.y);
        console.log('[ItemEditModal] useEffect - Vertical wall, Distance from Corner (Y):', item.y);
      } else {
        console.log('[ItemEditModal] useEffect - Not a wall object or wall not detected.');
      }
    }
  }, [item, roomWidth, roomHeight]); // Include roomWidth/roomHeight for wall detection

  if (!isOpen || !item) return null;

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const isWallObject = item.type?.toLowerCase() === 'door' || 
                       item.type?.toLowerCase() === 'window' || 
                       item.type?.toLowerCase() === 'wall';
  const isDoor = item.type?.toLowerCase() === 'door';
  const isWindow = item.type?.toLowerCase() === 'window';
  const isWall = item.type?.toLowerCase() === 'wall';

  // Door orientation state (derived from rotation)
  const doorSwing = localRotation >= 180 ? 'out' : 'in';
  const doorHinge = localRotation % 180 === 0 ? 'left' : 'right';
  
  // Debug logging
  if (isDoor && isOpen) {
    console.log('Door Edit Modal:', {
      rotation: localRotation,
      swing: doorSwing,
      hinge: doorHinge,
      position: { x: item?.x, y: item?.y }
    });
  }

  const setDoorOrientation = (swing: 'in' | 'out', hinge: 'left' | 'right') => {
    // Map swing + hinge to rotation angle
    if (swing === 'in' && hinge === 'left') setLocalRotation(0);
    else if (swing === 'in' && hinge === 'right') setLocalRotation(90);
    else if (swing === 'out' && hinge === 'left') setLocalRotation(180);
    else if (swing === 'out' && hinge === 'right') setLocalRotation(270);
  };

  const handleApply = () => {
    console.log('[ItemEditModal] handleApply called');
    console.log('[ItemEditModal] isWallObject:', isWallObject);
    console.log('[ItemEditModal] wallPosition:', wallPosition);
    console.log('[ItemEditModal] localDistanceFromCorner:', localDistanceFromCorner);
    console.log('[ItemEditModal] item.x:', item?.x, 'item.y:', item?.y);
    console.log('[ItemEditModal] localColor:', localColor);
    console.log('[ItemEditModal] item.color before update:', item?.color);
    
    const updates: Partial<FurnitureItem> = {
      type: localType,
      width: localWidth,
      rotation: localRotation,
      color: localColor,
    };
    
    console.log('[ItemEditModal] updates object:', updates);

    // Convert distance from corner back to X/Y coordinates for wall objects
    if (isWallObject && wallPosition) {
      if (wallPosition === 'top' || wallPosition === 'bottom') {
        // On horizontal walls: X = distance from corner, Y stays the same
        updates.x = localDistanceFromCorner;
        updates.y = item?.y || 0;
        console.log('[ItemEditModal] Horizontal wall - setting x:', updates.x, 'y:', updates.y);
      } else if (wallPosition === 'left' || wallPosition === 'right') {
        // On vertical walls: Y = distance from corner, X stays the same
        updates.x = item?.x || 0;
        updates.y = localDistanceFromCorner;
        console.log('[ItemEditModal] Vertical wall - setting x:', updates.x, 'y:', updates.y);
      }
    } else {
      // For regular furniture, preserve existing X/Y coordinates
      // (They are positioned via drag-and-drop, not via this modal)
      updates.x = item?.x || 0;
      updates.y = item?.y || 0;
      console.log('[ItemEditModal] Regular furniture - preserving x:', updates.x, 'y:', updates.y);
    }

    // For windows, include height and floor distance
    if (isWindow) {
      updates.height = localHeight;
      updates.floorDistance = localFloorDistance;
    } else if (isDoor) {
      // For doors, allow editing both width and height
      // Width = door width (along wall), Height = door height (floor to ceiling)
      // Thickness is fixed and not editable
      updates.height = localHeight;
    } else if (isWall) {
      // For walls, include thickness and height from floor
      updates.height = localHeight;
      updates.floorDistance = localFloorDistance;
    } else {
      // For regular furniture, update height normally
      updates.height = localHeight;
    }

    console.log('[ItemEditModal] Final updates:', updates);
    onUpdate(item.id, updates);
    onClose();
  };

  const handleDelete = () => {
    onDelete(item.id);
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
            Edit Item
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
            <Input
              label="Label"
              type="text"
              value={localType}
              onChange={(e) => setLocalType(e.target.value)}
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <Input
                label={isWall ? "Length (cm)" : "Width (cm)"}
                type="number"
                value={localWidth}
                onChange={(e) => setLocalWidth(e.target.value === '' ? 0 : Number(e.target.value))}
              />

              {isWindow ? (
                <Input
                  label="Height (cm)"
                  type="number"
                  value={localHeight}
                  onChange={(e) => setLocalHeight(e.target.value === '' ? 0 : Number(e.target.value))}
                />
              ) : isDoor ? (
                <Input
                  label="Height (cm)"
                  type="number"
                  value={localHeight}
                  onChange={(e) => setLocalHeight(e.target.value === '' ? 0 : Number(e.target.value))}
                />
              ) : isWall ? (
                <Input
                  label="Thickness (cm)"
                  type="number"
                  value={localHeight}
                  onChange={(e) => setLocalHeight(e.target.value === '' ? 0 : Number(e.target.value))}
                />
              ) : (
                <Input
                  label="Height (cm)"
                  type="number"
                  value={localHeight}
                  onChange={(e) => setLocalHeight(e.target.value === '' ? 0 : Number(e.target.value))}
                />
              )}
            </div>

            {/* Floor Distance for Windows */}
            {isWindow && (
              <Input
                label="From Floor Distance (cm)"
                type="number"
                value={localFloorDistance}
                onChange={(e) => setLocalFloorDistance(e.target.value === '' ? 0 : Number(e.target.value))}
              />
            )}
            
            {/* Height from Floor for Walls */}
            {isWall && (
              <Input
                label="Height from Floor (cm)"
                type="number"
                value={localFloorDistance}
                onChange={(e) => setLocalFloorDistance(e.target.value === '' ? 0 : Number(e.target.value))}
              />
            )}

            {/* Distance from Corner for Doors and Windows */}
            {isWallObject && wallPosition && (
              <Input
                label={
                  wallPosition === 'top' 
                    ? "Distance from Left Corner (cm)" 
                    : wallPosition === 'bottom'
                    ? "Distance from Left Corner (cm)"
                    : wallPosition === 'left'
                    ? "Distance from Top Corner (cm)"
                    : "Distance from Top Corner (cm)"
                }
                type="number"
                value={localDistanceFromCorner}
                onChange={(e) => setLocalDistanceFromCorner(e.target.value === '' ? 0 : Number(e.target.value))}
              />
            )}

            {/* Rotation Control */}
            {!isWindow && !isWall && (
              <div>
                {isDoor ? (
                  // Door: Two separate controls for Swing and Hinge
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    {/* Swing Direction */}
                    <div>
                      <label
                        style={{ 
                          display: 'block',
                          fontSize: '12px',
                          fontWeight: 500,
                          color: '#666666',
                          marginBottom: '8px',
                        }}
                      >
                        Swing
                      </label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => setDoorOrientation('in', doorHinge)}
                          style={{
                            flex: 1,
                            padding: '12px',
                            fontSize: '14px',
                            fontWeight: 500,
                            color: doorSwing === 'in' ? '#FFFFFF' : '#666666',
                            backgroundColor: doorSwing === 'in' ? '#0A0A0A' : '#FAFAFA',
                            border: `1px solid ${doorSwing === 'in' ? '#0A0A0A' : '#E5E5E5'}`,
                            borderRadius: '10px',
                            cursor: 'pointer',
                            transition: 'all 150ms',
                          }}
                        >
                          In
                        </button>
                        <button
                          onClick={() => setDoorOrientation('out', doorHinge)}
                          style={{
                            flex: 1,
                            padding: '12px',
                            fontSize: '14px',
                            fontWeight: 500,
                            color: doorSwing === 'out' ? '#FFFFFF' : '#666666',
                            backgroundColor: doorSwing === 'out' ? '#0A0A0A' : '#FAFAFA',
                            border: `1px solid ${doorSwing === 'out' ? '#0A0A0A' : '#E5E5E5'}`,
                            borderRadius: '10px',
                            cursor: 'pointer',
                            transition: 'all 150ms',
                          }}
                        >
                          Out
                        </button>
                      </div>
                    </div>

                    {/* Hinge Side */}
                    <div>
                      <label
                        style={{ 
                          display: 'block',
                          fontSize: '12px',
                          fontWeight: 500,
                          color: '#666666',
                          marginBottom: '8px',
                        }}
                      >
                        Hinge
                      </label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => setDoorOrientation(doorSwing, 'left')}
                          style={{
                            flex: 1,
                            padding: '12px',
                            fontSize: '14px',
                            fontWeight: 500,
                            color: doorHinge === 'left' ? '#FFFFFF' : '#666666',
                            backgroundColor: doorHinge === 'left' ? '#0A0A0A' : '#FAFAFA',
                            border: `1px solid ${doorHinge === 'left' ? '#0A0A0A' : '#E5E5E5'}`,
                            borderRadius: '10px',
                            cursor: 'pointer',
                            transition: 'all 150ms',
                          }}
                        >
                          Left
                        </button>
                        <button
                          onClick={() => setDoorOrientation(doorSwing, 'right')}
                          style={{
                            flex: 1,
                            padding: '12px',
                            fontSize: '14px',
                            fontWeight: 500,
                            color: doorHinge === 'right' ? '#FFFFFF' : '#666666',
                            backgroundColor: doorHinge === 'right' ? '#0A0A0A' : '#FAFAFA',
                            border: `1px solid ${doorHinge === 'right' ? '#0A0A0A' : '#E5E5E5'}`,
                            borderRadius: '10px',
                            cursor: 'pointer',
                            transition: 'all 150ms',
                          }}
                        >
                          Right
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  // Regular furniture: rotate button
                  <>
                    <label
                      style={{ 
                        display: 'block',
                        fontSize: '12px',
                        fontWeight: 500,
                        color: '#666666',
                        marginBottom: '8px',
                      }}
                    >
                      Rotation
                    </label>
                    <button
                      onClick={() => {
                        const nextRotation = (localRotation + 90) % 360;
                        setLocalRotation(nextRotation);
                      }}
                      style={{
                        width: '100%',
                        padding: '16px',
                        fontSize: '14px',
                        fontWeight: 500,
                        color: '#0A0A0A',
                        backgroundColor: '#FAFAFA',
                        border: '1px solid #E5E5E5',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        transition: 'all 150ms',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#F5F5F5';
                        e.currentTarget.style.borderColor = '#D4D4D4';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#FAFAFA';
                        e.currentTarget.style.borderColor = '#E5E5E5';
                      }}
                    >
                      <span style={{ color: '#666666' }}>
                        {localRotation === 0 && '↑ 0°'}
                        {localRotation === 90 && '→ 90°'}
                        {localRotation === 180 && '↓ 180°'}
                        {localRotation === 270 && '← 270°'}
                      </span>
                      <span style={{ 
                        fontSize: '12px',
                        color: '#999999',
                        fontWeight: 400,
                      }}>
                        Click to rotate
                      </span>
                    </button>
                  </>
                )}
              </div>
            )}

            <ColorPicker
              label="Color"
              value={localColor}
              onChange={(color) => setLocalColor(color)}
            />
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
            onClick={handleDelete}
            style={{
              padding: '12px 20px',
              fontSize: '14px',
              fontWeight: 500,
              color: '#DC2626',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E5E5E5',
              borderRadius: '10px',
              cursor: 'pointer',
              transition: 'all 150ms',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#FEF2F2';
              e.currentTarget.style.borderColor = '#FECACA';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#FFFFFF';
              e.currentTarget.style.borderColor = '#E5E5E5';
            }}
          >
            Delete Item
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

export default ItemEditModal;
