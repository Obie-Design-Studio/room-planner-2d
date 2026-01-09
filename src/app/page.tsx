"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import type { RoomConfig, FurnitureItem } from "@/types";
import ColorPicker from "@/components/ui/ColorPicker";
import Input from '@/components/ui/Input';

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

  const handleAddItem = (type: string = 'Chair', w: number = 50, h: number = 50, c: string = '#3b82f6') => {
    const newItem: FurnitureItem = {
      id: crypto.randomUUID(),
      type: type,
      x: 10, // Default start position
      y: 10,
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
    <div className="h-screen flex flex-col overflow-hidden bg-gray-50">
      {/* Header */}
      <header className="h-16 border-b bg-white flex items-center px-4 gap-4">
        <h1 className="text-xl font-semibold">Room Planner</h1>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2">
            Width (cm):
            <input
              type="number"
              className="border rounded px-2 py-1 w-20"
              value={roomConfig.width}
              onChange={(e) =>
                setRoomConfig({ ...roomConfig, width: Number(e.target.value) })
              }
            />
          </label>
          <label className="flex items-center gap-2">
            Height (cm):
            <input
              type="number"
              className="border rounded px-2 py-1 w-20"
              value={roomConfig.height}
              onChange={(e) =>
                setRoomConfig({
                  ...roomConfig,
                  height: Number(e.target.value),
                })
              }
            />
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={showAllMeasurements}
              onChange={(e) => setShowAllMeasurements(e.target.checked)}
            />
            Blueprint Mode (Show All)
          </label>
        </div>
      </header>

      {/* Main Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className="w-80 flex flex-col font-sans" style={{ background: '#fff', borderRight: '1px solid #ddd', padding: '20px' }}>
          <div style={{ paddingBottom: '20px', borderBottom: '1px solid #eee', marginBottom: '20px' }}>
            <p style={{ fontSize: '12px', fontWeight: 'bold', color: '#666', marginBottom: '10px' }}>ADD OBJECTS</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <button 
                onClick={() => handleAddItem('Chair', 50, 50, '#3b82f6')}
                style={{
                  padding: '10px',
                  backgroundColor: '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                Chair
              </button>
              <button 
                onClick={() => handleAddItem('Table', 120, 80, '#d97706')}
                style={{
                  padding: '10px',
                  backgroundColor: '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                Table
              </button>
              <button 
                onClick={() => handleAddItem('Bed', 160, 200, '#10b981')}
                style={{
                  padding: '10px',
                  backgroundColor: '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                Bed
              </button>
              <button 
                onClick={() => handleAddItem('Window', 100, 15, '#e0f7fa')}
                style={{
                  padding: '10px',
                  backgroundColor: '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                Window
              </button>
              <button 
                onClick={() => handleAddItem('Door', 90, 90, '#8d6e63')}
                style={{
                  padding: '10px',
                  backgroundColor: '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                Door
              </button>
            </div>
          </div>

          <div className="flex-1">
            {selectedItem ? (
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '15px' }}>Edit Item</h2>

                {/* Label Input */}
                <Input
                  label="Label"
                  type="text"
                  value={selectedItem.type}
                  onChange={(e) => handleUpdateItem(selectedItem.id, { type: e.target.value })}
                />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
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
                </div>

                {/* Rotation Input */}
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', color: '#666', marginBottom: '4px' }}>
                    Rotation ({selectedItem.rotation || 0}°)
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="360"
                    value={selectedItem.rotation || 0}
                    onChange={(e) => handleUpdateItem(selectedItem.id, { rotation: Number(e.target.value) })}
                    style={{ width: '100%' }}
                  />
                </div>

                {/* Color Picker */}
                <ColorPicker 
                  label="COLOR" 
                  value={selectedItem.color || '#e0e0e0'} 
                  onChange={(color) => handleUpdateItem(selectedItem.id, { color })} 
                />

                {/* Delete Button */}
                <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #eee' }}>
                  <button
                    onClick={handleDeleteItem}
                    style={{
                      width: '100%',
                      padding: '10px',
                      backgroundColor: '#fee2e2', // Light Red
                      color: '#dc2626', // Dark Red
                      border: '1px solid #fecaca',
                      borderRadius: '6px',
                      fontWeight: 'bold',
                      cursor: 'pointer'
                    }}
                  >
                    Delete Item
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>
                <p>Select an item to edit</p>
              </div>
            )}
          </div>
        </aside>

        {/* Canvas Area */}
        <div
          className="flex-1 relative bg-gray-100"
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
