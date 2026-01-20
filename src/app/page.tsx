"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import type { RoomConfig, FurnitureItem, ManualMeasurement } from "@/types";
import ColorPicker from "@/components/ui/ColorPicker";
import Input from '@/components/ui/Input';
import ItemEditModal from "@/components/ui/ItemEditModal";
import RoomSettingsModal from "@/components/ui/RoomSettingsModal";
import FurnitureLibraryModal from "@/components/ui/FurnitureLibraryModal";
import CustomFurnitureModal from "@/components/ui/CustomFurnitureModal";
import ExportModal from "@/components/ui/ExportModal";
import LoadRoomModal from "@/components/ui/LoadRoomModal";
import { Armchair, Table, Bed, RectangleHorizontal, DoorOpen, Trash2, Settings, ChevronDown, ChevronUp, Plus, Grid3x3, Menu, X, Save, FolderOpen, Download, Eye } from "lucide-react";
import { PIXELS_PER_CM, WALL_THICKNESS_PX, WALL_THICKNESS_CM } from "@/lib/constants";
import { findFreePosition } from "@/lib/collisionDetection";
import { getDefaultFurnitureForRoom, FURNITURE_LIBRARY, getFurnitureByType, type RoomType, roomTypeLabelToKey } from "@/lib/furnitureLibrary";
import { saveRoom, loadRoom } from "@/lib/supabase";
import { exportAsJSON, exportAsPNG, exportCompletePDF } from "@/lib/export";

const RoomCanvas = dynamic(
  () => import("@/components/canvas/RoomCanvas"),
  { ssr: false }
);

export default function Home() {
  const stageRef = useRef<any>(null);
  
  // Initialize with saved room data or defaults
  const [roomConfig, setRoomConfig] = useState<RoomConfig>({
    width: 400,
    height: 300,
  });

  const [items, setItems] = useState<FurnitureItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showAllMeasurements, setShowAllMeasurements] = useState(false);
  const [showLabels, setShowLabels] = useState(false);
  const [viewport, setViewport] = useState({ width: 800, height: 600 });
  const [hiddenMeasurements, setHiddenMeasurements] = useState<Set<string>>(new Set());
  const [manualMeasurements, setManualMeasurements] = useState<ManualMeasurement[]>([]);
  const [isDrawingMeasurement, setIsDrawingMeasurement] = useState(false);
  
  // Handler to toggle individual measurement visibility
  const handleToggleMeasurement = (measurementId: string) => {
    setHiddenMeasurements(prev => {
      const newSet = new Set(prev);
      if (newSet.has(measurementId)) {
        newSet.delete(measurementId);
      } else {
        newSet.add(measurementId);
      }
      return newSet;
    });
  };
  
  // Handlers for manual measurement drawing
  const handleAddManualMeasurement = (measurement: ManualMeasurement) => {
    setManualMeasurements(prev => [...prev, measurement]);
  };
  
  const handleDeleteManualMeasurement = (id: string) => {
    setManualMeasurements(prev => prev.filter(m => m.id !== id));
  };
  
  const handleToggleDrawingMode = () => {
    setIsDrawingMeasurement(prev => !prev);
    // Deselect any selected furniture when entering drawing mode
    if (!isDrawingMeasurement) {
      setSelectedId(null);
    }
  };
  
  // Handler to toggle measurements (mutually exclusive with labels)
  const handleToggleMeasurements = () => {
    setShowAllMeasurements(!showAllMeasurements);
    if (!showAllMeasurements) {
      setShowLabels(false); // Turn off labels when turning on measurements
    }
  };
  
  // Handler to toggle labels (mutually exclusive with measurements)
  const handleToggleLabels = () => {
    setShowLabels(!showLabels);
    if (!showLabels) {
      setShowAllMeasurements(false); // Turn off measurements when turning on labels
    }
  };
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
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isLoadModalOpen, setIsLoadModalOpen] = useState(false);
  const [hoveredDimension, setHoveredDimension] = useState<string | null>(null);
  const dimensionTooltipTimeout = useRef<NodeJS.Timeout | null>(null);

  // Load saved room on mount
  useEffect(() => {
    const loadSavedRoom = async () => {
      const savedRoomId = localStorage.getItem('lastRoomId');
      if (savedRoomId) {
        const result = await loadRoom(savedRoomId);
        if (result.success && result.room) {
          setRoomName(result.room.name);
          // Handle both old format ('Living Room') and new format ('living')
          const roomTypeKey = roomTypeLabelToKey(result.room.room_type) || result.room.room_type as RoomType;
          setRoomConfig({ 
            width: result.room.width_cm, 
            height: result.room.length_cm,
            roomType: roomTypeKey
          });
          setCeilingHeight(result.room.ceiling_height_cm);
          if (result.items) {
            setItems(result.items.map((item: any) => ({
              id: item.id || crypto.randomUUID(),
              type: item.type,
              x: item.x,
              y: item.y,
              width: item.width,
              height: item.height,
              rotation: item.rotation || 0,
              color: item.color || '#666666',
              name: item.label || item.type
            })));
          }
          // Restore hidden measurements
          if (result.room.hidden_measurements) {
            setHiddenMeasurements(new Set(result.room.hidden_measurements));
          }
          // Restore manual measurements
          if (result.room.manual_measurements) {
            setManualMeasurements(result.room.manual_measurements);
          }
        }
      }
    };
    loadSavedRoom();
  }, []);

  useEffect(() => {
    const handleResize = () => {
      const windowWidth = window.innerWidth;
      const isMobileView = windowWidth < 1024;
      const isTabletView = windowWidth >= 1024 && windowWidth < 1280;
      
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

  const handleUpdateRoomSettings = (name: string, config: RoomConfig, ceiling: number) => {
    setRoomName(name);
    setRoomConfig(config);
    setCeilingHeight(ceiling);
  };


  const handleSaveRoom = async () => {
    const roomData = { 
      name: roomName, 
      room_type: roomConfig.roomType || 'living', // Store the key format, not the label
      width_cm: roomConfig.width, 
      length_cm: roomConfig.height, 
      ceiling_height_cm: ceilingHeight, 
      default_window_width_cm: 120, 
      default_window_height_cm: 150, 
      default_door_width_cm: 90, 
      default_door_height_cm: 210, 
      wall_color: '#FFFFFF', 
      current_view: 'blueprint',
      hidden_measurements: Array.from(hiddenMeasurements),
      manual_measurements: manualMeasurements
    };
    const roomItems = items.map(item => ({ type: item.type, label: item.type, x: item.x, y: item.y, width: item.width, height: item.height, rotation: item.rotation, color: item.color }));
    const result = await saveRoom(roomData, roomItems);
    if (result.success) { 
      // Save the room ID to localStorage for loading on next visit
      if (result.room?.id) {
        localStorage.setItem('lastRoomId', result.room.id);
      }
      alert('Room saved successfully!'); 
    } else { 
      // Extract error message from error object
      const err = result.error as { message?: string; details?: string } | undefined;
      const errorMessage = err?.message || err?.details || (result.error ? JSON.stringify(result.error) : 'Unknown error');
      alert('Failed to save room: ' + errorMessage); 
    }
  };

  const handleLoadRoom = async (roomId: string) => {
    const result = await loadRoom(roomId);
    if (result.success && result.room) {
      setRoomName(result.room.name);
      // Handle both old format ('Living Room') and new format ('living')
      const roomTypeKey = roomTypeLabelToKey(result.room.room_type) || result.room.room_type as RoomType;
      setRoomConfig({ 
        width: result.room.width_cm, 
        height: result.room.length_cm,
        roomType: roomTypeKey
      });
      setCeilingHeight(result.room.ceiling_height_cm);
      if (result.items) { 
        setItems(result.items.map((item: any) => ({ 
          id: item.id || crypto.randomUUID(), 
          type: item.type, 
          x: item.x, 
          y: item.y, 
          width: item.width, 
          height: item.height, 
          rotation: item.rotation || 0, 
          color: item.color || '#666666', 
          name: item.label || item.type 
        }))); 
      }
      // Restore hidden measurements
      if (result.room.hidden_measurements) {
        setHiddenMeasurements(new Set(result.room.hidden_measurements));
      } else {
        setHiddenMeasurements(new Set());
      }
      // Restore manual measurements
      if (result.room.manual_measurements) {
        setManualMeasurements(result.room.manual_measurements);
      } else {
        setManualMeasurements([]);
      }
      // Save this room ID as the last loaded room
      localStorage.setItem('lastRoomId', roomId);
      setIsLoadModalOpen(false);
    } else { 
      alert('Failed to load room'); 
    }
  };

  // State to track measurements that should be completely hidden during PDF export
  const [hiddenMeasurementsForExport, setHiddenMeasurementsForExport] = useState<Set<string>>(new Set());

  const handleExport = async (format: 'pdf' | 'png' | 'json') => {
    const stageElement = document.querySelector('.konvajs-content canvas') as HTMLCanvasElement;
    if (format === 'json') { 
      exportAsJSON(roomName, 'Living Room', roomConfig, ceilingHeight, items); 
    } else if (format === 'png' && stageElement) { 
      await exportAsPNG(stageElement, roomName); 
    } else if (format === 'pdf') { 
      if (stageRef.current) {
        await exportCompletePDF(
          { current: stageRef.current }, 
          roomName, 
          roomConfig, 
          ceilingHeight, 
          items,
          {
            setShowLabels,
            setShowAllMeasurements,
            hiddenMeasurements,
            setHiddenMeasurementsForExport,
          }
        );
      } else {
        alert('Canvas not ready. Please try again.');
      }
    }
  };
  const handleAddFurnitureFromLibrary = (furniture: any) => {
    handleAddItem(furniture.type, furniture.width, furniture.height, furniture.color);
  };

  const handleAddCustomFurniture = (label: string, width: number, height: number, color: string) => {
    handleAddItem(label, width, height, color);
  };

  const handleAddItem = (type: string = 'Chair', w: number = 50, h: number = 50, c: string = '#3b82f6', wall?: 'top' | 'left') => {
    const typeLower = type.toLowerCase();
    const isWallObject = typeLower === 'window' || typeLower === 'door';

    // Clamp dimensions to room size for furniture
    if (!isWallObject) {
      w = Math.min(w, roomConfig.width);
      h = Math.min(h, roomConfig.height);
    }

    // Find a free position that doesn't overlap with existing items
    const freePos = findFreePosition(w, h, roomConfig.width, roomConfig.height, items, type, wall);
    
    if (!freePos) {
      alert('No free space available to place this item. Please remove or move other items first.');
      return;
    }

    const newItem: FurnitureItem = {
      id: crypto.randomUUID(),
      type: type,
      x: freePos.x,
      y: freePos.y,
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

  const handleAddWindowOrDoor = (type: 'Window' | 'Door' | 'Wall', wall: 'top' | 'left') => {
    if (type === 'Window') {
      // Window: width (along wall) = 100cm, height (actual window height) = 120cm
      handleAddItem('Window', 100, 120, '#e0f7fa', wall);
    } else if (type === 'Door') {
      // Door: width (along wall) = 90cm, height (actual door height) = 210cm
      handleAddItem('Door', 90, 210, '#8d6e63', wall);
    } else if (type === 'Wall') {
      // Wall: width (length) = 200cm, height (thickness) = same as outer walls (2.5cm)
      handleAddItem('Wall', 200, WALL_THICKNESS_CM, '#000000');
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
    return type !== "window" && type !== "door" && type !== "wall";
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
        
        {/* Right: Action buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {!isMobile && (
            <>
              <button onClick={() => setIsLoadModalOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', backgroundColor: 'transparent', border: '1px solid #E5E5E5', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 500, color: '#0A0A0A' }}><FolderOpen size={16} /> Load</button>
              <button onClick={handleSaveRoom} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', backgroundColor: 'transparent', border: '1px solid #E5E5E5', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 500, color: '#0A0A0A' }}><Save size={16} /> Save</button>
              <button onClick={() => setIsExportModalOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', backgroundColor: '#0A0A0A', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 500, color: '#FFFFFF' }}><Download size={16} /> Export</button>
            </>
          )}
        </div>
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
                  <div 
                    onMouseEnter={() => {
                      if (dimensionTooltipTimeout.current) {
                        clearTimeout(dimensionTooltipTimeout.current);
                      }
                      dimensionTooltipTimeout.current = setTimeout(() => {
                        setHoveredDimension('all');
                      }, 1000); // 1 second delay
                    }}
                    onMouseLeave={() => {
                      if (dimensionTooltipTimeout.current) {
                        clearTimeout(dimensionTooltipTimeout.current);
                      }
                      setHoveredDimension(null);
                    }}
                    style={{ 
                      fontSize: '13px', 
                      color: '#999999',
                      position: 'relative',
                      display: 'inline-block',
                      cursor: 'help'
                    }}
                  >
                    {roomConfig.width} × {roomConfig.height} × {ceilingHeight} cm
                    
                    {/* Custom tooltip showing all dimensions */}
                    {hoveredDimension && (
                      <div style={{
                        position: 'absolute',
                        bottom: '100%',
                        left: '0',
                        marginBottom: '8px',
                        padding: '8px 12px',
                        backgroundColor: '#1a1a1a',
                        color: '#ffffff',
                        fontSize: '12px',
                        borderRadius: '6px',
                        whiteSpace: 'nowrap',
                        zIndex: 1000,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                        pointerEvents: 'none',
                        lineHeight: '1.6'
                      }}>
                        <div>Width: {roomConfig.width} cm</div>
                        <div>Length: {roomConfig.height} cm</div>
                        <div>Height (floor to ceiling): {ceilingHeight} cm</div>
                        {/* Arrow */}
                        <div style={{
                          position: 'absolute',
                          top: '100%',
                          left: '12px',
                          width: 0,
                          height: 0,
                          borderLeft: '6px solid transparent',
                          borderRight: '6px solid transparent',
                          borderTop: '6px solid #1a1a1a'
                        }} />
                      </div>
                    )}
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

          {/* Windows, Doors & Walls Section */}
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
                Windows, Doors & Walls
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
                  <button
                    onClick={() => handleAddWindowOrDoor('Wall', 'top')}
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
                    <span>Add Wall</span>
                  </button>
                </div>
              {items.filter(item => item.type.toLowerCase() === 'window' || item.type.toLowerCase() === 'door' || item.type.toLowerCase() === 'wall').length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '12px' }}>
                  {items
                    .filter(item => item.type.toLowerCase() === 'window' || item.type.toLowerCase() === 'door' || item.type.toLowerCase() === 'wall')
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
                            {item.type.toLowerCase() === 'wall' 
                              ? `${item.width} × ${item.height} × ${WALL_THICKNESS_CM} cm` 
                              : `${item.width} × ${item.height} cm`}
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
          {/* Mobile Action Buttons - Bottom of Sidebar */}
          {isMobile && (
            <div style={{ padding: '16px 20px', borderTop: '1px solid #EFEFEF', display: 'flex', flexDirection: 'column', gap: '8px', backgroundColor: '#FAFAFA' }}>
              <button onClick={() => { setIsLoadModalOpen(true); setIsSidebarOpen(false); }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', backgroundColor: '#FFFFFF', border: '1px solid #E5E5E5', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 500, color: '#0A0A0A' }}><FolderOpen size={18} /> Load Room</button>
              <button onClick={() => { handleSaveRoom(); setIsSidebarOpen(false); }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', backgroundColor: '#FFFFFF', border: '1px solid #E5E5E5', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 500, color: '#0A0A0A' }}><Save size={18} /> Save Room</button>
              <button onClick={() => { setIsExportModalOpen(true); setIsSidebarOpen(false); }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', backgroundColor: '#0A0A0A', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 500, color: '#FFFFFF' }}><Download size={18} /> Export</button>
            </div>
          )}
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
            showLabels={showLabels}
            onToggleMeasurements={handleToggleMeasurements}
            onToggleLabels={handleToggleLabels}
            viewportWidth={viewport.width}
            viewportHeight={viewport.height}
            onStageRef={(stage) => { stageRef.current = stage; }}
            hiddenMeasurements={hiddenMeasurements}
            onToggleMeasurement={handleToggleMeasurement}
            hiddenMeasurementsForExport={hiddenMeasurementsForExport}
            manualMeasurements={manualMeasurements}
            isDrawingMeasurement={isDrawingMeasurement}
            onToggleDrawingMode={handleToggleDrawingMode}
            onAddManualMeasurement={handleAddManualMeasurement}
            onDeleteManualMeasurement={handleDeleteManualMeasurement}
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

      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        onExport={handleExport}
        currentView="blueprint"
      />

      <LoadRoomModal
        isOpen={isLoadModalOpen}
        onClose={() => setIsLoadModalOpen(false)}
        onLoad={handleLoadRoom}
      />
    </div>
  );
}
