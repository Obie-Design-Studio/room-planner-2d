"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import type { RoomConfig, FurnitureItem } from "@/types";
import ColorPicker from "@/components/ui/ColorPicker";
import Input from '@/components/ui/Input';
import { Armchair, Table, Bed, ChevronDown, ChevronUp, RectangleHorizontal, DoorOpen, Trash2 } from "lucide-react";

const RoomCanvas = dynamic(
  () => import("@/components/canvas/RoomCanvas"),
  { ssr: false }
);

export default function Home() {
  const [roomConfig, setRoomConfig] = useState<RoomConfig>({
    width: 400,
    height: 300,
  });

  const [items, setItems] = useState<FurnitureItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showAllMeasurements, setShowAllMeasurements] = useState(false);
  const [viewport, setViewport] = useState({ width: 800, height: 600 });
  const [ceilingHeight, setCeilingHeight] = useState(250);
  const [roomName, setRoomName] = useState('Untitled Room');
  const [isRoomSettingsOpen, setIsRoomSettingsOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setViewport({
        width: window.innerWidth - 320, // reserved for sidebar
        height: window.innerHeight - 64, // reserved for header
      });
    };

    handleResize(); // Set initial size
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleAddItem = (type: string = 'Chair', w: number = 50, h: number = 50, c: string = '#3b82f6', wall?: 'top' | 'left') => {
    let x = 10; // Default start position
    let y = 10;
    
    if (wall === 'top') {
      x = 50; // 50cm from left
      y = -5; // Center in wall (10px wall = 5cm, so -5cm centers 10cm object)
    } else if (wall === 'left') {
      x = -5; // Center in wall (10px wall = 5cm, so -5cm centers 10cm object)
      y = 50; // 50cm from top
    }

    const newItem: FurnitureItem = {
      id: crypto.randomUUID(),
      type: type,
      x: x,
      y: y,
      width: w,
      height: h,
      rotation: 0,
      color: c,
    };
    setItems((prev) => [...prev, newItem]);
    setSelectedId(newItem.id); // Auto-select the new item
  };

  const handleItemChange = (id: string, updates: Partial<FurnitureItem>) => {
    setItems((prevItems) =>
      prevItems.map((item) =>
        item.id === id ? { ...item, ...updates } : item
      )
    );
  };

  const handleSelect = (id: string) => {
    setSelectedId(id);
  };

  const handleUpdateItem = (
    id: string,
    updates: Partial<FurnitureItem>
  ) => {
    setItems((prevItems) =>
      prevItems.map((item) =>
        item.id === id ? { ...item, ...updates } : item
      )
    );
  };

  const handleDeleteItem = () => {
    if (selectedId) {
      setItems((prevItems) => prevItems.filter((item) => item.id !== selectedId));
      setSelectedId(null);
    }
  };

  const handleDeleteItemById = (id: string) => {
    setItems((prevItems) => prevItems.filter((item) => item.id !== id));
    if (selectedId === id) {
      setSelectedId(null);
    }
  };

  const handleAddWindowOrDoor = (type: 'Window' | 'Door', wall: 'top' | 'left') => {
    if (type === 'Window') {
      handleAddItem('Window', 100, 10, '#e0f7fa', wall);
    } else if (type === 'Door') {
      handleAddItem('Door', 90, 10, '#8d6e63', wall);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId !== null) {
        handleDeleteItem();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId]);

  const selectedItem = items.find((item) => item.id === selectedId);

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Header */}
      <header className="h-16 border-b flex items-center justify-between px-8" style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border)' }}>
        {/* Left: Title */}
        <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Room Planner</h1>
        
        {/* Center: Room name (read-only) */}
        <div className="flex-1 flex justify-center px-8">
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {roomName}
          </span>
        </div>
        
        {/* Right: Dimensions */}
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {roomConfig.width} × {roomConfig.height} cm
        </span>
      </header>

      {/* Main Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className="w-80 flex flex-col p-6 space-y-6 border-r" style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border)' }}>
          {/* Room Settings Section */}
          <div>
            <button
              onClick={() => setIsRoomSettingsOpen(!isRoomSettingsOpen)}
              className="w-full flex items-center justify-between py-2 px-3 rounded-lg transition-colors"
              style={{ border: 'none', color: 'var(--text-secondary)' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <p className="text-sm font-medium">Room settings</p>
              {isRoomSettingsOpen ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
            {isRoomSettingsOpen && (
              <div className="space-y-0 mt-3">
                <Input
                  label="Room name"
                  type="text"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                />
                <Input
                  label="Room Width (cm)"
                  type="number"
                  value={roomConfig.width}
                  onChange={(e) => setRoomConfig({ ...roomConfig, width: Number(e.target.value) })}
                />
                <Input
                  label="Room Height (cm)"
                  type="number"
                  value={roomConfig.height}
                  onChange={(e) => setRoomConfig({ ...roomConfig, height: Number(e.target.value) })}
                />
                <Input
                  label="Ceiling Height (cm)"
                  type="number"
                  value={ceilingHeight}
                  onChange={(e) => setCeilingHeight(Number(e.target.value))}
                />

                {/* Windows & Doors Subsection */}
                <div className="mt-6">
                  <p className="text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>Windows & doors</p>
                  <div className="flex flex-col space-y-3 mb-4">
                    <button
                      onClick={() => handleAddWindowOrDoor('Window', 'top')}
                      className="flex items-center justify-start gap-2 py-2.5 px-3 w-full bg-transparent rounded-lg text-sm font-normal transition-colors"
                      style={{ border: 'none', color: 'var(--text-primary)' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <RectangleHorizontal className="w-4 h-4" />
                      + Add Window
                    </button>
                    <button
                      onClick={() => handleAddWindowOrDoor('Door', 'top')}
                      className="flex items-center justify-start gap-2 py-2.5 px-3 w-full bg-transparent rounded-lg text-sm font-normal transition-colors"
                      style={{ border: 'none', color: 'var(--text-primary)' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <DoorOpen className="w-4 h-4" />
                      + Add Door
                    </button>
                  </div>
                  {items.filter(item => item.type.toLowerCase() === 'window' || item.type.toLowerCase() === 'door').length > 0 && (
                    <div className="space-y-2">
                      {items
                        .filter(item => item.type.toLowerCase() === 'window' || item.type.toLowerCase() === 'door')
                        .map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between px-3 py-2 rounded-lg text-sm border"
                            style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-medium capitalize">{item.type}</span>
                              <span style={{ color: 'var(--text-secondary)' }}>
                                {item.width} × {item.height} cm
                              </span>
                            </div>
                            <button
                              onClick={() => handleDeleteItemById(item.id)}
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
            )}
          </div>

          {/* ADD FURNITURE Section */}
          <div>
            <p className="text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>Add furniture</p>
            <div className="flex flex-col space-y-3">
              <button 
                onClick={() => handleAddItem('Chair', 50, 50, '#3b82f6')}
                className="flex items-center justify-start gap-2 py-2.5 px-3 w-full bg-transparent rounded-lg text-sm font-normal transition-colors"
                style={{ border: 'none', color: 'var(--text-primary)' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <Armchair className="w-4 h-4" />
                Chair
              </button>
              <button 
                onClick={() => handleAddItem('Table', 120, 80, '#d97706')}
                className="flex items-center justify-start gap-2 py-2.5 px-3 w-full bg-transparent rounded-lg text-sm font-normal transition-colors"
                style={{ border: 'none', color: 'var(--text-primary)' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <Table className="w-4 h-4" />
                Table
              </button>
              <button 
                onClick={() => handleAddItem('Bed', 160, 200, '#10b981')}
                className="flex items-center justify-start gap-2 py-2.5 px-3 w-full bg-transparent rounded-lg text-sm font-normal transition-colors"
                style={{ border: 'none', color: 'var(--text-primary)' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <Bed className="w-4 h-4" />
                Bed
              </button>
            </div>
          </div>

          <div className="flex-1">
            {selectedItem ? (
              <div>
                <h2 className="text-xl font-semibold mb-8" style={{ color: 'var(--text-primary)' }}>Edit Item</h2>

                {/* Label Input */}
                <Input
                  label="Label"
                  type="text"
                  value={selectedItem.type}
                  onChange={(e) => handleUpdateItem(selectedItem.id, { type: e.target.value })}
                />

                {/* Width Input */}
                <Input
                  label="Width (cm)"
                  type="number"
                  value={selectedItem.width}
                  onChange={(e) => handleUpdateItem(selectedItem.id, { width: Number(e.target.value) })}
                />

                {/* Height Input */}
                <Input
                  label="Height (cm)"
                  type="number"
                  value={selectedItem.height}
                  onChange={(e) => handleUpdateItem(selectedItem.id, { height: Number(e.target.value) })}
                />

                {/* Rotation Input */}
                <div className="mb-6">
                  <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                    Rotation ({selectedItem.rotation || 0}°)
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="360"
                    value={selectedItem.rotation || 0}
                    onChange={(e) => handleUpdateItem(selectedItem.id, { rotation: Number(e.target.value) })}
                    className="w-full"
                  />
                </div>

                {/* Color Picker */}
                <ColorPicker 
                  label="Color" 
                  value={selectedItem.color || '#e0e0e0'} 
                  onChange={(color) => handleUpdateItem(selectedItem.id, { color })} 
                />

                {/* Delete Button */}
                <div className="mt-8 pt-8">
                  <button
                    onClick={handleDeleteItem}
                    className="w-full px-4 py-2.5 bg-red-50 text-red-600 border border-red-200 rounded-md font-bold cursor-pointer hover:bg-red-100 transition-colors"
                  >
                    Delete Item
                  </button>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center" style={{ color: 'var(--text-secondary)' }}>
                <p>Select an item to edit</p>
              </div>
            )}
          </div>
        </aside>

        {/* Canvas Area */}
        <div
          className="flex-1 relative"
          style={{ backgroundColor: 'var(--bg-primary)' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedId(null);
          }}
        >
          <RoomCanvas
            roomConfig={roomConfig}
            items={items}
            onItemChange={handleItemChange}
            selectedId={selectedId}
            onSelect={setSelectedId}
            showAllMeasurements={showAllMeasurements}
            viewportWidth={viewport.width}
            viewportHeight={viewport.height}
          />
        </div>
      </div>
    </div>
  );
}
