"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import type { RoomConfig, FurnitureItem } from "@/types";
import type { Unit } from "@/lib/unitConversion";
import ColorPicker from "@/components/ui/ColorPicker";
import Input from '@/components/ui/Input';
import ItemEditModal from "@/components/ui/ItemEditModal";
import RoomSettingsModal from "@/components/ui/RoomSettingsModal";
import FurnitureLibraryModal from "@/components/ui/FurnitureLibraryModal";
import CustomFurnitureModal from "@/components/ui/CustomFurnitureModal";
import { Armchair, Table, Bed, RectangleHorizontal, DoorOpen, Trash2, Settings, ChevronDown, ChevronUp, Plus, Grid3x3, Menu, X } from "lucide-react";
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
  const [measurementUnit, setMeasurementUnit] = useState<Unit>('cm');
  const [viewport, setViewport] = useState({ width: 800, height: 600 });
  const [ceilingHeight, setCeilingHeight] = useState(250);
  const [roomName, setRoomName] = useState('Untitled Room');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [isRoomSettingsModalOpen, setIsRoomSettingsModalOpen] = useState(false);
  const [isWindowsDoorsOpen, setIsWindowsDoorsOpen] = useState(true);
  const [isFurnitureOpen, setIsFurnitureOpen] = useState(true);
  const [isFurnitureLibraryOpen, setIsFurnitureLibraryOpen] = useState(false);
  const [isCustomFurnitureOpen, setIsCustomFurnitureOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const [roomType, setRoomType] = useState<string>('Living Room');

  useEffect(() => {
    const handleResize = () => {
      const windowWidth = window.innerWidth;
      const isMobileView = windowWidth < 768;
      const isTabletView = windowWidth >= 768 && windowWidth < 1024;
      
      setIsMobile(isMobileView);
      
      // Sidebar width based on screen size
      let calculatedSidebarWidth = 0;
      if (isMobileView) {
        calculatedSidebarWidth = 0; // Mobile: sidebar is overlay, doesn't reduce canvas width
        setSidebarWidth(320); // But sidebar itself is still 320px
      } else if (isTabletView) {
        calculatedSidebarWidth = 280; // Tablet: 280px sidebar
        setSidebarWidth(280);
      } else {
        calculatedSidebarWidth = 320; // Desktop: 320px sidebar
        setSidebarWidth(320);
      }
      
      setViewport({
        width: windowWidth - calculatedSidebarWidth,
        height: window.innerHeight - 64, // reserved for header
      });
    };

    handleResize(); // Set initial size
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleUpdateRoomSettings = (
    name: string, 
    config: RoomConfig, 
    ceiling: number, 
    unit?: Unit,
    windowWidth?: number, 
    windowHeight?: number, 
    windowFloorDistance?: number,
    doorWidth?: number, 
    doorHeight?: number
  ) => {
    setRoomName(name);
    setRoomConfig(config);
    setCeilingHeight(ceiling);
    if (unit !== undefined) setMeasurementUnit(unit);
    
    
    // Update roomType state to match config.roomType (convert from category to user-friendly label)
    if (config.roomType === undefined) {
      // Room type was cleared - reset to default
      setRoomType('Living Room');
    } else {
      const roomTypeMap: Record<string, string> = {
        'living': 'Living Room',
        'bedroom': 'Bedroom',
        'kitchen': 'Kitchen',
        'office': 'Office',
        'bathroom': 'Bathroom',
      };
      setRoomType(roomTypeMap[config.roomType] || 'Living Room');
    }
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
      {/* Header */}
      <header style={{ 
        height: '64px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: isMobile ? '0 16px' : '0 32px',
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid #EFEFEF'
      }}>
        {/* Left: Hamburger menu (mobile) + Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {isMobile && (
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '40px',
                height: '40px',
                padding: 0,
                color: '#0A0A0A',
                backgroundColor: 'transparent',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 150ms',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#F5F5F5';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
              aria-label={isSidebarOpen ? 'Close menu' : 'Open menu'}
            >
              {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          )}
          <h1 style={{ 
            fontSize: isMobile ? '18px' : '20px',
            fontWeight: 600,
            color: '#0A0A0A',
            letterSpacing: '-0.02em',
            margin: 0
          }}>
            Room Planner
          </h1>
        </div>
        
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
        <div style={{ width: isMobile ? '0px' : '140px' }}></div>
      </header>

      {/* Main Body */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Sidebar */}
        <aside style={{ 
          width: `${sidebarWidth}px`,
          display: 'flex', 
          flexDirection: 'column', 
          borderRight: '1px solid #EFEFEF',
          backgroundColor: '#FAFAFA',
          position: isMobile ? 'fixed' : 'relative',
          top: isMobile ? '64px' : 'auto',
          left: isMobile ? (isSidebarOpen ? '0' : `-${sidebarWidth}px`) : 'auto',
          height: isMobile ? 'calc(100vh - 64px)' : 'auto',
          zIndex: isMobile ? 50 : 'auto',
          transition: isMobile ? 'left 250ms ease-in-out' : 'none',
          boxShadow: isMobile && isSidebarOpen ? '2px 0 8px rgba(0, 0, 0, 0.1)' : 'none',
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
            if (e.target === e.currentTarget) {
              setSelectedId(null);
              // Auto-close sidebar on mobile when clicking canvas
              if (isMobile && isSidebarOpen) {
                setIsSidebarOpen(false);
              }
            }
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
            onToggleMeasurements={() => setShowAllMeasurements(!showAllMeasurements)}
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
        roomWidth={roomConfig.width}
        roomHeight={roomConfig.height}
      />

      <RoomSettingsModal
        isOpen={isRoomSettingsModalOpen}
        roomName={roomName}
        roomConfig={roomConfig}
        ceilingHeight={ceilingHeight}
        measurementUnit={measurementUnit}
        onClose={() => setIsRoomSettingsModalOpen(false)}
        onUpdate={handleUpdateRoomSettings}
      />

      <FurnitureLibraryModal
        isOpen={isFurnitureLibraryOpen}
        onClose={() => setIsFurnitureLibraryOpen(false)}
        onAddFurniture={handleAddFurnitureFromLibrary}
        defaultCategory={
          roomType === 'Living Room' ? 'living' :
          roomType === 'Bedroom' ? 'bedroom' :
          roomType === 'Kitchen' ? 'kitchen' :
          roomType === 'Office' ? 'office' :
          roomType === 'Bathroom' ? 'bathroom' :
          'all'
        }
      />

      <CustomFurnitureModal
        isOpen={isCustomFurnitureOpen}
        onClose={() => setIsCustomFurnitureOpen(false)}
        onAddCustomFurniture={handleAddCustomFurniture}
      />
    </div>
  );
}