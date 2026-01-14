"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import type { RoomConfig, FurnitureItem } from "@/types";
import ColorPicker from "@/components/ui/ColorPicker";
import Input from '@/components/ui/Input';
import ItemEditModal from "@/components/ui/ItemEditModal";
import RoomSettingsModal from "@/components/ui/RoomSettingsModal";
import FurnitureLibraryModal from "@/components/ui/FurnitureLibraryModal";
import CustomFurnitureModal from "@/components/ui/CustomFurnitureModal";
import { Armchair, Table, Bed, RectangleHorizontal, DoorOpen, Trash2, Settings, ChevronDown, ChevronUp, Plus, Grid3x3, Sofa, Lamp, Box, Circle, Square, Bath, UtensilsCrossed, BookOpen, Monitor, CookingPot, Refrigerator } from "lucide-react";
import { PIXELS_PER_CM, WALL_THICKNESS_PX } from "@/lib/constants";
import { getDefaultFurnitureForRoom, FURNITURE_LIBRARY, getFurnitureByType, type RoomType, type FurnitureDefinition } from "@/lib/furnitureLibrary";
import { type Unit, UNIT_LABELS } from "@/lib/unitConversion";

// Calculate wall thickness in cm
const WALL_THICKNESS_CM = WALL_THICKNESS_PX / PIXELS_PER_CM; // 5cm

const RoomCanvas = dynamic(
  () => import("@/components/canvas/RoomCanvas"),
  { ssr: false }
);

// Mapping from furniture type to lucide-react icon
const FURNITURE_ICON_MAP: Record<string, any> = {
  'Bed': Bed,
  'Nightstand': Lamp,
  'Dresser': Box,
  'Closet': Box,
  'Desk': Table,
  'Sofa': Sofa,
  'Armchair': Armchair,
  'Coffee Table': Table,
  'TV Stand': Monitor,
  'Bookshelf': BookOpen,
  'Dining Table': Table,
  'Chair': Circle,
  'Refrigerator': Refrigerator,
  'Stove': CookingPot,
  'Counter': Square,
  'Filing Cabinet': Box,
  'Toilet': Circle,
  'Sink': Bath,
  'Shower': Bath,
  'Bathtub': Bath,
  'Wall Toilet': Circle,
  'Towel Dryer': Square,
  'Table': Table,
};

// Component to render furniture preview icon for sidebar
const FurnitureIconPreview: React.FC<{ furniture: FurnitureDefinition }> = ({ furniture }) => {
  const IconComponent = FURNITURE_ICON_MAP[furniture.type];
  
  if (!IconComponent) {
    // Fallback to generic square icon
    return <Square className="w-4 h-4" style={{ color: '#666666' }} />;
  }

  return <IconComponent className="w-4 h-4" style={{ color: '#666666' }} />;
};

export default function Home() {
  const [roomConfig, setRoomConfig] = useState<RoomConfig>({
    width: 400,
    height: 300,
  });

  const [items, setItems] = useState<FurnitureItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showAllMeasurements, setShowAllMeasurements] = useState(false);
  const [measurementUnit, setMeasurementUnit] = useState<Unit>('cm');
  const [viewport, setViewport] = useState({ width: 800, height: 600 });
  const [ceilingHeight, setCeilingHeight] = useState(250);
  const [roomName, setRoomName] = useState('Untitled Room');
  const [defaultWindowLength, setDefaultWindowLength] = useState(100);
  const [defaultWindowHeight, setDefaultWindowHeight] = useState(140);
  const [defaultDoorLength, setDefaultDoorLength] = useState(90);
  const [defaultDoorHeight, setDefaultDoorHeight] = useState(210);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [isRoomSettingsModalOpen, setIsRoomSettingsModalOpen] = useState(false);
  const [isWindowsDoorsOpen, setIsWindowsDoorsOpen] = useState(true);
  const [isFurnitureOpen, setIsFurnitureOpen] = useState(true);
  const [isFurnitureLibraryOpen, setIsFurnitureLibraryOpen] = useState(false);
  const [isCustomFurnitureOpen, setIsCustomFurnitureOpen] = useState(false);
  
  // History state for undo/redo
  const [history, setHistory] = useState<FurnitureItem[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [copiedItem, setCopiedItem] = useState<FurnitureItem | null>(null);

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

  // Save to history when items change
  const saveToHistory = (newItems: FurnitureItem[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newItems);
    // Limit history to 50 states
    if (newHistory.length > 50) {
      newHistory.shift();
    } else {
      setHistoryIndex(historyIndex + 1);
    }
    setHistory(newHistory);
    setItems(newItems);
  };

  // Undo function
  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setItems(history[newIndex]);
    }
  };

  // Redo function
  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setItems(history[newIndex]);
    }
  };

  // Copy selected item
  const handleCopy = () => {
    if (selectedId) {
      const item = items.find(i => i.id === selectedId);
      if (item) {
        setCopiedItem(item);
      }
    }
  };

  // Paste copied item
  const handlePaste = () => {
    if (copiedItem) {
      const newItem: FurnitureItem = {
        ...copiedItem,
        id: crypto.randomUUID(),
        x: copiedItem.x + 20, // Offset slightly
        y: copiedItem.y + 20,
      };
      saveToHistory([...items, newItem]);
      setSelectedId(newItem.id);
    }
  };

  // Duplicate selected item
  const handleDuplicate = () => {
    if (selectedId) {
      const item = items.find(i => i.id === selectedId);
      if (item) {
        const newItem: FurnitureItem = {
          ...item,
          id: crypto.randomUUID(),
          x: item.x + 20,
          y: item.y + 20,
        };
        saveToHistory([...items, newItem]);
        setSelectedId(newItem.id);
      }
    }
  };

  // Select all items
  const handleSelectAll = () => {
    if (items.length > 0) {
      setSelectedId(items[0].id);
    }
  };

  const handleUpdateRoomSettings = (name: string, config: RoomConfig, ceiling: number, windowLength: number, windowHeight: number, doorLength: number, doorHeight: number) => {
    setRoomName(name);
    setRoomConfig(config);
    setCeilingHeight(ceiling);
    setDefaultWindowLength(windowLength);
    setDefaultWindowHeight(windowHeight);
    setDefaultDoorLength(doorLength);
    setDefaultDoorHeight(doorHeight);
  };

  const handleAddFurnitureFromLibrary = (furniture: any) => {
    handleAddItem(furniture.type, furniture.width, furniture.height, furniture.color);
  };

  const handleAddCustomFurniture = (label: string, width: number, height: number, color: string) => {
    handleAddItem(label, width, height, color);
  };

  const handleAddItem = (type: string = 'Chair', w: number = 50, h: number = 50, c: string = '#3b82f6', wall?: 'top' | 'left') => {
    // Default start position (give walls breathing room)
    let x = 20;
    let y = 20;
    
    const typeLower = type?.toLowerCase() || '';
    const isWallObject = typeLower === 'window' || typeLower === 'door';

    if (wall === 'top') {
      x = 50; // 50cm from left
      y = -WALL_THICKNESS_CM; // Center in wall - top-left position for wall-centered object
    } else if (wall === 'left') {
      x = -WALL_THICKNESS_CM; // Center in wall - top-left position for wall-centered object
      y = 50; // 50cm from top
    }

    // Furniture must start inside the room bounds
    if (!isWallObject) {
      const clampedWidth = Math.min(w, roomConfig.width);
      const clampedHeight = Math.min(h, roomConfig.height);
      const maxX = roomConfig.width - clampedWidth;
      const maxY = roomConfig.height - clampedHeight;

      // IMPORTANT: calculations are based on the inner edge of the walls (0..room width/height).
      x = Math.max(0, Math.min(x, maxX));
      y = Math.max(0, Math.min(y, maxY));
      w = clampedWidth;
      h = clampedHeight;
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
      ...(typeLower === 'window' && { floorDistance: 90 }), // Default floor distance for windows
    };
    saveToHistory([newItem, ...items]); // Add new item at the top of the list
    setSelectedId(newItem.id); // Auto-select the new item
  };

  const handleItemChange = (id: string, updates: Partial<FurnitureItem>) => {
    setItems((prevItems) =>
      prevItems.map((item) =>
        item.id === id ? { ...item, ...updates } : item
      )
    );
  };

  const handleItemChangeEnd = (id: string, updates: Partial<FurnitureItem>) => {
    const newItems = items.map((item) =>
      item.id === id ? { ...item, ...updates } : item
    );
    saveToHistory(newItems);
  };

  const handleSelect = (id: string) => {
    setSelectedId(id);
  };

  const handleOpenEditor = (id: string) => {
    setSelectedId(id);
    setEditingItemId(id);
  };

  const handleCloseEditor = () => {
    setEditingItemId(null);
  };

  const handleUpdateItem = (
    id: string,
    updates: Partial<FurnitureItem>
  ) => {
    const newItems = items.map((item) =>
      item.id === id ? { ...item, ...updates } : item
    );
    saveToHistory(newItems);
  };

  const handleDeleteItem = () => {
    if (selectedId) {
      saveToHistory(items.filter((item) => item.id !== selectedId));
      setSelectedId(null);
    }
  };

  const handleDeleteItemById = (id: string) => {
    saveToHistory(items.filter((item) => item.id !== id));
    if (selectedId === id) {
      setSelectedId(null);
    }
  };

  const handleAddWindowOrDoor = (type: 'Window' | 'Door', wall: 'top' | 'left') => {
    // For doors and windows, height must ALWAYS be wall thickness for proper visual rendering
    // The actual physical height is not used for rendering wall-integrated objects
    if (type === 'Window') {
      handleAddItem('Window', defaultWindowLength, WALL_THICKNESS_CM, '#e0f7fa', wall);
    } else if (type === 'Door') {
      handleAddItem('Door', defaultDoorLength, WALL_THICKNESS_CM, '#8d6e63', wall);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if user is typing in an input field
      const target = e.target as HTMLElement;
      const isInputField = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      
      // Cmd/Ctrl + Z = Undo
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
        return;
      }
      
      // Cmd/Ctrl + Shift + Z = Redo
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        handleRedo();
        return;
      }
      
      // Cmd/Ctrl + Y = Redo (alternative)
      if ((e.metaKey || e.ctrlKey) && e.key === 'y') {
        e.preventDefault();
        handleRedo();
        return;
      }

      // Don't process other shortcuts if typing in input field
      if (isInputField) return;
      
      // Cmd/Ctrl + C = Copy
      if ((e.metaKey || e.ctrlKey) && e.key === 'c' && selectedId) {
        e.preventDefault();
        handleCopy();
        return;
      }
      
      // Cmd/Ctrl + V = Paste
      if ((e.metaKey || e.ctrlKey) && e.key === 'v' && copiedItem) {
        e.preventDefault();
        handlePaste();
        return;
      }
      
      // Cmd/Ctrl + D = Duplicate
      if ((e.metaKey || e.ctrlKey) && e.key === 'd' && selectedId) {
        e.preventDefault();
        handleDuplicate();
        return;
      }
      
      // Cmd/Ctrl + A = Select All
      if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
        e.preventDefault();
        handleSelectAll();
        return;
      }
      
      // Delete or Backspace = Delete selected item
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId !== null) {
        e.preventDefault();
        handleDeleteItem();
        return;
      }
      
      // Escape = Deselect
      if (e.key === 'Escape') {
        setSelectedId(null);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, items, historyIndex, history, copiedItem]);

  const selectedItem = items.find((item) => item.id === selectedId);
  const editingItem = items.find((item) => item.id === editingItemId) || null;
  const furnitureItems = items.filter((item) => {
    const type = item.type?.toLowerCase() || '';
    return type !== "window" && type !== "door";
  });

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Header */}
      <header style={{ 
        height: '64px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 32px',
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid #EFEFEF'
      }}>
        {/* Left: Title */}
        <h1 style={{ 
          fontSize: '20px',
          fontWeight: 600,
          color: '#0A0A0A',
          letterSpacing: '-0.02em',
          margin: 0
        }}>
          Room Planner
        </h1>
        
        {/* Center: Room name + dimensions */}
        <div style={{ 
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '2px'
        }}>
          <span style={{ 
            fontSize: '15px',
            fontWeight: 500,
            color: '#0A0A0A'
          }}>
            {roomName}
          </span>
          <span style={{ 
            fontSize: '13px',
            color: '#999999'
          }}>
            {roomConfig.width} × {roomConfig.height} cm
          </span>
        </div>
        
        {/* Right: Unit selector */}
        <div style={{ 
          display: 'flex', 
          gap: '4px',
          padding: '4px',
          backgroundColor: '#F5F5F5',
          borderRadius: '8px'
        }}>
          {(['cm', 'm', 'in', 'ft'] as Unit[]).map((unit) => (
            <button
              key={unit}
              onClick={() => setMeasurementUnit(unit)}
              style={{
                padding: '6px 12px',
                fontSize: '13px',
                fontWeight: 500,
                color: measurementUnit === unit ? '#FFFFFF' : '#666666',
                backgroundColor: measurementUnit === unit ? '#0A0A0A' : 'transparent',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 150ms',
              }}
            >
              {UNIT_LABELS[unit]}
            </button>
          ))}
        </div>
      </header>

      {/* Main Body */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Sidebar */}
        <aside style={{ 
          width: '320px', 
          display: 'flex', 
          flexDirection: 'column', 
          borderRight: '1px solid #EFEFEF',
          backgroundColor: '#FAFAFA'
        }}>
          <div style={{ 
            flex: 1, 
            minHeight: 0, 
            overflowY: 'auto', 
            padding: '20px'
          }}>
            {/* Room Settings Section */}
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ 
                fontSize: '13px', 
                fontWeight: 600,
                color: '#666666',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                margin: '0 0 12px 0'
              }}>
                Room
              </h3>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px',
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                border: '1px solid #EFEFEF',
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                  <div style={{ 
                    fontSize: '14px', 
                    fontWeight: 600, 
                    color: '#0A0A0A'
                  }}>
                    {roomName}
                  </div>
                  <div style={{ 
                    fontSize: '13px', 
                    color: '#999999'
                  }}>
                    {roomConfig.width} × {roomConfig.height} cm • {ceilingHeight}cm ceiling
                  </div>
                </div>
                <button
                  onClick={() => setIsRoomSettingsModalOpen(true)}
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
                    borderRadius: '6px',
                    cursor: 'pointer',
                    transition: 'all 150ms',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#F5F5F5';
                    e.currentTarget.style.color = '#0A0A0A';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = '#666666';
                  }}
                  aria-label="Edit room settings"
                >
                  <Settings className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

          {/* Windows & Doors Section */}
          <div style={{ marginBottom: '24px' }}>
            <button
              onClick={() => setIsWindowsDoorsOpen(!isWindowsDoorsOpen)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 0',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                marginBottom: '12px',
              }}
            >
              <h3 style={{ 
                fontSize: '13px', 
                fontWeight: 600,
                color: '#666666',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                margin: 0
              }}>
                Windows & Doors
              </h3>
              {isWindowsDoorsOpen ? (
                <ChevronUp className="w-4 h-4" style={{ color: '#999999' }} />
              ) : (
                <ChevronDown className="w-4 h-4" style={{ color: '#999999' }} />
              )}
            </button>
            {isWindowsDoorsOpen && (
              <>
              {/* Windows & Doors List - Show first */}
              {items.filter(item => item.type?.toLowerCase() === 'window' || item.type?.toLowerCase() === 'door').length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '12px' }}>
                  {items
                    .filter(item => item.type?.toLowerCase() === 'window' || item.type?.toLowerCase() === 'door')
                    .map((item) => (
                      <div
                        key={item.id}
                        style={{ 
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 12px',
                          fontSize: '14px',
                          color: '#0A0A0A',
                          backgroundColor: '#FFFFFF',
                          border: '1px solid #EFEFEF',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          transition: 'all 150ms',
                        }}
                        onClick={() => handleOpenEditor(item.id)}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#F5F5F5';
                          e.currentTarget.style.borderColor = '#E5E5E5';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#FFFFFF';
                          e.currentTarget.style.borderColor = '#EFEFEF';
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
                          <span style={{ fontWeight: 500, textTransform: 'capitalize' }}>{item.type}</span>
                          <span style={{ fontSize: '12px', color: '#999999' }}>
                            {item.width} × {item.height} cm
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEditor(item.id);
                            }}
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
                              borderRadius: '6px',
                              cursor: 'pointer',
                              transition: 'all 150ms',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#F5F5F5';
                              e.currentTarget.style.color = '#0A0A0A';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'transparent';
                              e.currentTarget.style.color = '#666666';
                            }}
                            aria-label={`Edit ${item.type}`}
                          >
                            <Settings className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteItemById(item.id);
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '32px',
                              height: '32px',
                              padding: 0,
                              color: '#DC2626',
                              backgroundColor: 'transparent',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              transition: 'all 150ms',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#FEF2F2';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                            aria-label={`Delete ${item.type}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
              
              {/* Add Window/Door Buttons - Show after list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: items.filter(item => item.type?.toLowerCase() === 'window' || item.type?.toLowerCase() === 'door').length > 0 ? '12px' : '0' }}>
                <button
                  onClick={() => handleAddWindowOrDoor('Window', 'top')}
                  style={{ 
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '12px 14px',
                    width: '100%',
                    fontSize: '14px',
                    fontWeight: 500,
                    color: '#0A0A0A',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E5E5E5',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    transition: 'all 150ms',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#F5F5F5';
                    e.currentTarget.style.borderColor = '#0A0A0A';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#FFFFFF';
                    e.currentTarget.style.borderColor = '#E5E5E5';
                  }}
                >
                  <RectangleHorizontal className="w-4 h-4" style={{ color: '#666666' }} />
                  <span>Add Window</span>
                </button>
                <button
                  onClick={() => handleAddWindowOrDoor('Door', 'top')}
                  style={{ 
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '12px 14px',
                    width: '100%',
                    fontSize: '14px',
                    fontWeight: 500,
                    color: '#0A0A0A',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E5E5E5',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    transition: 'all 150ms',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#F5F5F5';
                    e.currentTarget.style.borderColor = '#0A0A0A';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#FFFFFF';
                    e.currentTarget.style.borderColor = '#E5E5E5';
                  }}
                >
                  <DoorOpen className="w-4 h-4" style={{ color: '#666666' }} />
                  <span>Add Door</span>
                </button>
              </div>
              </>
            )}
          </div>

          {/* Add Furniture Section */}
          <div style={{ marginBottom: '24px' }}>
            <button
              onClick={() => setIsFurnitureOpen(!isFurnitureOpen)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 0',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                marginBottom: '12px',
              }}
            >
              <h3 style={{ 
                fontSize: '13px', 
                fontWeight: 600,
                color: '#666666',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                margin: 0
              }}>
                Furniture
              </h3>
              {isFurnitureOpen ? (
                <ChevronUp className="w-4 h-4" style={{ color: '#999999' }} />
              ) : (
                <ChevronDown className="w-4 h-4" style={{ color: '#999999' }} />
              )}
            </button>
            {isFurnitureOpen && (
              <>
              {/* Furniture List - Show first */}
              {furnitureItems.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
                  {furnitureItems.map((item) => {
                    const isSelected = item.id === selectedId;

                    return (
                      <div
                        key={item.id}
                        style={{ 
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 12px',
                          fontSize: '14px',
                          color: '#0A0A0A',
                          backgroundColor: isSelected ? '#F5F5F5' : '#FFFFFF',
                          border: isSelected ? '1px solid #0A0A0A' : '1px solid #EFEFEF',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          transition: 'all 150ms',
                        }}
                        onClick={() => handleOpenEditor(item.id)}
                        onMouseEnter={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.backgroundColor = '#F5F5F5';
                            e.currentTarget.style.borderColor = '#E5E5E5';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.backgroundColor = '#FFFFFF';
                            e.currentTarget.style.borderColor = '#EFEFEF';
                          }
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                          {/* Color indicator */}
                          <div style={{ 
                            width: '8px', 
                            height: '8px', 
                            borderRadius: '50%', 
                            backgroundColor: item.color || '#999999',
                            border: '1px solid rgba(0,0,0,0.1)',
                            flexShrink: 0,
                          }} />
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
                            <span style={{ fontWeight: 500 }}>{item.type}</span>
                            <span style={{ fontSize: '12px', color: '#999999' }}>
                              {item.width} × {item.height} cm
                            </span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEditor(item.id);
                            }}
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
                              borderRadius: '6px',
                              cursor: 'pointer',
                              transition: 'all 150ms',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#F5F5F5';
                              e.currentTarget.style.color = '#0A0A0A';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'transparent';
                              e.currentTarget.style.color = '#666666';
                            }}
                            aria-label={`Edit ${item.type}`}
                          >
                            <Settings className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteItemById(item.id);
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '32px',
                              height: '32px',
                              padding: 0,
                              color: '#DC2626',
                              backgroundColor: 'transparent',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              transition: 'all 150ms',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#FEF2F2';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                            aria-label={`Delete ${item.type}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Add Buttons - Show after furniture list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {/* Show default furniture if room type is selected, otherwise show generic options */}
                {roomConfig.roomType ? (
                  getDefaultFurnitureForRoom(roomConfig.roomType).map((furniture) => (
                    <button
                      key={furniture.type}
                      onClick={() => handleAddItem(furniture.type, furniture.width, furniture.height, furniture.color)}
                      style={{ 
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '12px 14px',
                        width: '100%',
                        fontSize: '14px',
                        fontWeight: 500,
                        color: '#0A0A0A',
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #E5E5E5',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        transition: 'all 150ms',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#F5F5F5';
                        e.currentTarget.style.borderColor = '#0A0A0A';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#FFFFFF';
                        e.currentTarget.style.borderColor = '#E5E5E5';
                      }}
                    >
                      <FurnitureIconPreview furniture={furniture} />
                      <span>Add {furniture.label}</span>
                    </button>
                  ))
                ) : (
                  <div style={{
                    padding: '20px',
                    textAlign: 'center',
                    color: '#999999',
                    fontSize: '13px',
                    backgroundColor: '#FAFAFA',
                    borderRadius: '10px',
                    border: '1px dashed #E5E5E5',
                  }}>
                    Select a room type to see suggested furniture
                  </div>
                )}

                {/* Browse all furniture button */}
                <button
                  onClick={() => setIsFurnitureLibraryOpen(true)}
                  style={{ 
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '12px 14px',
                    width: '100%',
                    fontSize: '14px',
                    fontWeight: 500,
                    color: '#666666',
                    backgroundColor: '#FAFAFA',
                    border: '1px dashed #E5E5E5',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    transition: 'all 150ms',
                    marginTop: '8px',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#F5F5F5';
                    e.currentTarget.style.borderColor = '#0A0A0A';
                    e.currentTarget.style.color = '#0A0A0A';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#FAFAFA';
                    e.currentTarget.style.borderColor = '#E5E5E5';
                    e.currentTarget.style.color = '#666666';
                  }}
                >
                  <Grid3x3 className="w-4 h-4" />
                  <span>Browse All Furniture</span>
                </button>

                {/* Add custom furniture button */}
                <button
                  onClick={() => setIsCustomFurnitureOpen(true)}
                  style={{ 
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '12px 14px',
                    width: '100%',
                    fontSize: '14px',
                    fontWeight: 500,
                    color: '#666666',
                    backgroundColor: '#FAFAFA',
                    border: '1px dashed #E5E5E5',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    transition: 'all 150ms',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#F5F5F5';
                    e.currentTarget.style.borderColor = '#0A0A0A';
                    e.currentTarget.style.color = '#0A0A0A';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#FAFAFA';
                    e.currentTarget.style.borderColor = '#E5E5E5';
                    e.currentTarget.style.color = '#666666';
                  }}
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Custom Furniture</span>
                </button>
              </div>
              </>
            )}
          </div>
          </div>
        </aside>

        {/* Canvas Area */}
        <div
          className="flex-1 relative min-h-0"
          style={{ backgroundColor: '#FAFAF8' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedId(null);
          }}
        >
          <RoomCanvas
            roomConfig={roomConfig}
            items={items}
            onItemChange={handleItemChange}
            onItemChangeEnd={handleItemChangeEnd}
            onItemDelete={handleDeleteItemById}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onEdit={handleOpenEditor}
            showAllMeasurements={showAllMeasurements}
            measurementUnit={measurementUnit}
            viewportWidth={viewport.width}
            viewportHeight={viewport.height}
          />
        </div>
      </div>

      {/* Modals at root level so fixed positioning works */}
      <ItemEditModal
        isOpen={editingItemId !== null}
        item={editingItem}
        onClose={handleCloseEditor}
        onUpdate={handleUpdateItem}
        onDelete={handleDeleteItemById}
      />

      <RoomSettingsModal
        isOpen={isRoomSettingsModalOpen}
        roomName={roomName}
        roomConfig={roomConfig}
        ceilingHeight={ceilingHeight}
        defaultWindowLength={defaultWindowLength}
        defaultWindowHeight={defaultWindowHeight}
        defaultDoorLength={defaultDoorLength}
        defaultDoorHeight={defaultDoorHeight}
        onClose={() => setIsRoomSettingsModalOpen(false)}
        onUpdate={handleUpdateRoomSettings}
      />

      <FurnitureLibraryModal
        isOpen={isFurnitureLibraryOpen}
        onClose={() => setIsFurnitureLibraryOpen(false)}
        onAddFurniture={handleAddFurnitureFromLibrary}
      />

      <CustomFurnitureModal
        isOpen={isCustomFurnitureOpen}
        onClose={() => setIsCustomFurnitureOpen(false)}
        onAddCustomFurniture={handleAddCustomFurniture}
      />
    </div>
  );
}
