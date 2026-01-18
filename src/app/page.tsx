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
import { Armchair, Table, Bed, RectangleHorizontal, DoorOpen, Trash2, Settings, ChevronDown, ChevronUp, Plus, Grid3x3 } from "lucide-react";
import { PIXELS_PER_CM, WALL_THICKNESS_PX } from "@/lib/constants";
import { getDefaultFurnitureForRoom, FURNITURE_LIBRARY, getFurnitureByType, type RoomType } from "@/lib/furnitureLibrary";

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
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [isRoomSettingsModalOpen, setIsRoomSettingsModalOpen] = useState(false);
  const [isWindowsDoorsOpen, setIsWindowsDoorsOpen] = useState(true);
  const [isFurnitureOpen, setIsFurnitureOpen] = useState(true);
  const [isFurnitureLibraryOpen, setIsFurnitureLibraryOpen] = useState(false);
  const [isCustomFurnitureOpen, setIsCustomFurnitureOpen] = useState(false);
  const [showDownloadBanner, setShowDownloadBanner] = useState(false);

  // Check if user has seen download permissions banner
  useEffect(() => {
    const hasSeenBanner = localStorage.getItem('hasSeenDownloadBanner');
    if (!hasSeenBanner) {
      setShowDownloadBanner(true);
    }
  }, []);

  const dismissDownloadBanner = () => {
    localStorage.setItem('hasSeenDownloadBanner', 'true');
    setShowDownloadBanner(false);
  };

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

  const handleUpdateRoomSettings = (name: string, config: RoomConfig, ceiling: number) => {
    setRoomName(name);
    setRoomConfig(config);
    setCeilingHeight(ceiling);
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
    
    const typeLower = type.toLowerCase();
    const isWallObject = typeLower === 'window' || typeLower === 'door';

    if (wall === 'top') {
      x = 50; // 50cm from left
      y = -5; // Center in wall (10px wall = 5cm, so -5cm centers 10cm object)
    } else if (wall === 'left') {
      x = -5; // Center in wall (10px wall = 5cm, so -5cm centers 10cm object)
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
  const editingItem = items.find((item) => item.id === editingItemId) || null;
  const furnitureItems = items.filter((item) => {
    const type = item.type.toLowerCase();
    return type !== "window" && type !== "door";
  });

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Download Permission Banner */}
      {showDownloadBanner && (
        <div style={{
          position: 'fixed',
          top: '64px',
          left: 0,
          right: 0,
          backgroundColor: '#FFF3CD',
          borderBottom: '1px solid #FFC107',
          padding: '12px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 100,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
            <div style={{
              fontSize: '20px',
              lineHeight: 1,
            }}>⚠️</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#856404', marginBottom: '4px' }}>
                Enable Downloads for PDF Export
              </div>
              <div style={{ fontSize: '13px', color: '#856404' }}>
                Click the lock icon 🔒 in your browser's address bar → Site settings → Set "Automatic downloads" to <strong>Allow</strong>
              </div>
            </div>
          </div>
          <button
            onClick={dismissDownloadBanner}
            style={{
              padding: '6px 16px',
              fontSize: '13px',
              fontWeight: 500,
              color: '#856404',
              backgroundColor: 'transparent',
              border: '1px solid #856404',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'all 150ms',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#856404';
              e.currentTarget.style.color = '#FFF3CD';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#856404';
            }}
          >
            Got it
          </button>
        </div>
      )}

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
        
        {/* Right: Empty spacer for balance */}
        <div style={{ width: '140px' }}></div>
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
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
              {items.filter(item => item.type.toLowerCase() === 'window' || item.type.toLowerCase() === 'door').length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '12px' }}>
                  {items
                    .filter(item => item.type.toLowerCase() === 'window' || item.type.toLowerCase() === 'door')
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
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
                        <div style={{ 
                          width: '16px', 
                          height: '16px', 
                          borderRadius: '4px', 
                          backgroundColor: furniture.color 
                        }} />
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

              {/* Furniture List */}
              {furnitureItems.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '12px' }}>
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
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
                          <span style={{ fontWeight: 500 }}>{item.type}</span>
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
                    );
                  })}
                </div>
              )}
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
            onItemDelete={handleDeleteItemById}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onEdit={handleOpenEditor}
            showAllMeasurements={showAllMeasurements}
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
        roomWidth={roomConfig.width}
        roomHeight={roomConfig.height}
      />

      <RoomSettingsModal
        isOpen={isRoomSettingsModalOpen}
        roomName={roomName}
        roomConfig={roomConfig}
        ceilingHeight={ceilingHeight}
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