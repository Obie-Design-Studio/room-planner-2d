import React, { useState } from 'react';
import { X, RectangleHorizontal, DoorOpen, Trash2 } from 'lucide-react';
import type { RoomConfig, FurnitureItem } from '@/types';
import Input from '@/components/ui/Input';

interface RoomSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomConfig: RoomConfig;
  ceilingHeight: number;
  onUpdateRoom: (width: number, height: number, ceiling: number) => void;
  items: FurnitureItem[];
  onAddWindowOrDoor: (type: 'Window' | 'Door', wall: 'top' | 'left') => void;
  onDeleteItem: (id: string) => void;
}

const RoomSettingsModal: React.FC<RoomSettingsModalProps> = ({ 
  isOpen, 
  onClose, 
  roomConfig, 
  ceilingHeight,
  onUpdateRoom,
  items,
  onAddWindowOrDoor,
  onDeleteItem
}) => {
  const [width, setWidth] = useState(roomConfig.width);
  const [height, setHeight] = useState(roomConfig.height);
  const [ceiling, setCeiling] = useState(ceilingHeight);

  // Update local state when props change (e.g., when modal opens)
  React.useEffect(() => {
    if (isOpen) {
      setWidth(roomConfig.width);
      setHeight(roomConfig.height);
      setCeiling(ceilingHeight);
    }
  }, [isOpen, roomConfig.width, roomConfig.height, ceilingHeight]);

  if (!isOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleApply = () => {
    onUpdateRoom(width, height, ceiling);
    onClose();
  };

  const windowsAndDoors = items.filter(item => 
    item.type.toLowerCase() === 'window' || item.type.toLowerCase() === 'door'
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
      onClick={handleOverlayClick}
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}
    >
      <div
        className="bg-[#FFFFFF] rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#E5E5E0]">
          <h2 className="text-xl font-semibold text-[#2D2D2D]">Room Settings</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#FAFAF8] rounded-md transition-colors text-[#666666] hover:text-[#2D2D2D]"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="space-y-6">
            <Input
              label="Room Width (cm)"
              type="number"
              value={width}
              onChange={(e) => setWidth(Number(e.target.value))}
            />
            
            <Input
              label="Room Height (cm)"
              type="number"
              value={height}
              onChange={(e) => setHeight(Number(e.target.value))}
            />
            
            <Input
              label="Ceiling Height (cm)"
              type="number"
              value={ceiling}
              onChange={(e) => setCeiling(Number(e.target.value))}
            />
          </div>

          {/* Windows & Doors Section */}
          <div className="pt-6 border-t border-[#E5E5E0]">
            <p className="text-xs font-bold text-[#666666] mb-4 uppercase">WINDOWS & DOORS</p>
            <div className="flex gap-3 mb-4">
              <button
                onClick={() => onAddWindowOrDoor('Window', 'top')}
                className="flex items-center gap-2 px-4 py-2 bg-[#D97706] text-white rounded-md font-medium hover:bg-[#B45309] transition-colors text-sm"
              >
                <RectangleHorizontal className="w-4 h-4" />
                + Add Window
              </button>
              <button
                onClick={() => onAddWindowOrDoor('Door', 'top')}
                className="flex items-center gap-2 px-4 py-2 bg-[#D97706] text-white rounded-md font-medium hover:bg-[#B45309] transition-colors text-sm"
              >
                <DoorOpen className="w-4 h-4" />
                + Add Door
              </button>
            </div>

            {windowsAndDoors.length > 0 && (
              <div className="space-y-2">
                {windowsAndDoors.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between px-3 py-2 bg-[#FAFAF8] border border-[#E5E5E0] rounded text-sm text-[#2D2D2D]"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium capitalize">{item.type}</span>
                      <span className="text-[#666666]">
                        {item.width} × {item.height} cm
                      </span>
                    </div>
                    <button
                      onClick={() => onDeleteItem(item.id)}
                      className="p-1.5 hover:bg-red-50 text-red-600 rounded transition-colors"
                      aria-label={`Delete ${item.type}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-[#E5E5E0]">
          <button
            onClick={handleApply}
            className="w-full px-4 py-2.5 bg-[#D97706] text-white rounded-md font-medium hover:bg-[#B45309] transition-colors"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
};

export default RoomSettingsModal;
