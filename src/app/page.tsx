"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import type { RoomConfig, FurnitureItem } from "@/types";
import ColorPicker from "@/components/ui/ColorPicker";
import Input from '@/components/ui/Input';
import ItemEditModal from "@/components/ui/ItemEditModal";
import RoomSettingsModal from "@/components/ui/RoomSettingsModal";
import FurnitureLibraryModal from "@/components/ui/FurnitureLibraryModal";
import CustomFurnitureModal from "@/components/ui/CustomFurnitureModal";
import LoadRoomModal from "@/components/ui/LoadRoomModal";
import ExportModal from "@/components/ui/ExportModal";
import { Armchair, Table, Bed, RectangleHorizontal, DoorOpen, Trash2, Settings, ChevronDown, ChevronUp, Plus, Grid3x3, Save, FolderOpen, Download, Menu, X } from "lucide-react";
import { PIXELS_PER_CM, WALL_THICKNESS_PX } from "@/lib/constants";
import { getDefaultFurnitureForRoom, FURNITURE_LIBRARY, getFurnitureByType, type RoomType } from "@/lib/furnitureLibrary";
import { saveRoom, loadRoom, listRooms } from "@/lib/supabase";
import { exportAsJSON, exportAsPNG, exportBlueprintAsPDF, exportMeasurementsAsPDF } from "@/lib/export";

const RoomCanvas = dynamic(
  () => import("@/components/canvas/RoomCanvas"),
  { ssr: false }
);

export default function Home() {
  const [roomConfig, setRoomConfig] = useState<RoomConfig>({
    width: 400,
    height: 300,
    roomType: undefined, // Optional: users can set via room settings
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(320);
  
  // Save/Load state
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [roomType, setRoomType] = useState<string>('Living Room');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadModalOpen, setIsLoadModalOpen] = useState(false);
  const [defaultWindowWidth, setDefaultWindowWidth] = useState(100);
  const [defaultWindowHeight, setDefaultWindowHeight] = useState(140);
  const [defaultWindowFloorDistance, setDefaultWindowFloorDistance] = useState(90);
  const [defaultDoorWidth, setDefaultDoorWidth] = useState(90);
  const [defaultDoorHeight, setDefaultDoorHeight] = useState(210);
  
  // View mode state
  const [viewMode, setViewMode] = useState<'blueprint' | 'measurements' | 'materials'>('blueprint');
  const [hiddenMeasurements, setHiddenMeasurements] = useState<Set<string>>(new Set());
  
  // Export state
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<any>(null); // Konva stage ref for clean PDF export

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

  // Auto-restore room state on page load
  useEffect(() => {
    const savedState = localStorage.getItem('roomPlanner_currentRoom');
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        console.log('[Auto-restore] Restoring saved room state');
        setRoomName(parsed.roomName || 'Untitled Room');
        setRoomConfig(parsed.roomConfig || { width: 400, height: 300 });
        setCeilingHeight(parsed.ceilingHeight || 250);
        setItems(parsed.items || []);
        setCurrentRoomId(parsed.currentRoomId || null);
        setRoomType(parsed.roomType || 'Living Room');
      } catch (error) {
        console.error('[Auto-restore] Error restoring room state:', error);
      }
    }
  }, []); // Only run once on mount

  // Auto-save room state whenever it changes
  useEffect(() => {
    const stateToSave = {
      roomName,
      roomConfig,
      ceilingHeight,
      items,
      currentRoomId,
      roomType,
      lastSaved: new Date().toISOString(),
    };
    
    localStorage.setItem('roomPlanner_currentRoom', JSON.stringify(stateToSave));
    console.log('[Auto-save] Room state saved to localStorage');
  }, [roomName, roomConfig, ceilingHeight, items, currentRoomId, roomType]);

  const handleUpdateRoomSettings = (
    name: string, 
    config: RoomConfig, 
    ceiling: number, 
    windowWidth?: number, 
    windowHeight?: number, 
    windowFloorDistance?: number,
    doorWidth?: number, 
    doorHeight?: number
  ) => {
    setRoomName(name);
    setRoomConfig(config);
    setCeilingHeight(ceiling);
    if (windowWidth !== undefined) setDefaultWindowWidth(windowWidth);
    if (windowHeight !== undefined) setDefaultWindowHeight(windowHeight);
    if (windowFloorDistance !== undefined) setDefaultWindowFloorDistance(windowFloorDistance);
    if (doorWidth !== undefined) setDefaultDoorWidth(doorWidth);
    if (doorHeight !== undefined) setDefaultDoorHeight(doorHeight);
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
      // Center horizontally on top wall
      x = (roomConfig.width - w) / 2; // Center the door/window
      y = -2.5; // Center in wall: -WALL_THICKNESS_CM (10px / 4px-per-cm = 2.5cm)
    } else if (wall === 'left') {
      x = -2.5; // Center in wall: -WALL_THICKNESS_CM (10px / 4px-per-cm = 2.5cm)
      // Center vertically on left wall
      y = (roomConfig.height - w) / 2; // Center the door/window (w is the length along the wall)
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
    
    // Add floorDistance for windows (use default value)
    if (typeLower === 'window') {
      newItem.floorDistance = defaultWindowFloorDistance;
    }
    
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
    
    // Auto-open edit modal for doors and windows to show measurements immediately
    const selectedItem = items.find(item => item.id === id);
    if (selectedItem) {
      const typeLower = selectedItem.type?.toLowerCase() || '';
      if (typeLower === 'door' || typeLower === 'window') {
        setEditingItemId(id);
      }
    }
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

  // Save room to Supabase
  const handleSaveRoom = async () => {
    setIsSaving(true);
    try {
      const roomData = {
        id: currentRoomId || undefined,
        name: roomName,
        room_type: roomType,
        width_cm: roomConfig.width,
        length_cm: roomConfig.height,
        ceiling_height_cm: ceilingHeight,
        default_window_width_cm: defaultWindowWidth,
        default_window_height_cm: defaultWindowHeight,
        default_door_width_cm: defaultDoorWidth,
        default_door_height_cm: defaultDoorHeight,
        wall_color: '#E5E5E5',
        current_view: 'blueprint',
      };

      const roomItems = items.map(item => ({
        type: item.type.toLowerCase() === 'window' || item.type.toLowerCase() === 'door' || item.type.toLowerCase() === 'wall' ? 
          item.type.toLowerCase() : 'furniture',
        subtype: item.type,
        label: item.type,
        x: item.x,
        y: item.y,
        width: item.width,
        height: item.height,
        rotation: item.rotation,
        color: item.color,
        wall_side: undefined,
      }));

      const result = await saveRoom(roomData, roomItems);
      
      if (result.success && result.room) {
        setCurrentRoomId(result.room.id);
        console.log('[Save] Room saved successfully with ID:', result.room.id);
      } else {
        alert('Failed to save room. Please try again.');
      }
    } catch (error) {
      console.error('Save error:', error);
      alert('Error saving room');
    } finally {
      setIsSaving(false);
    }
  };

  // Load room from Supabase
  const handleLoadRoom = async (roomId: string) => {
    try {
      const result = await loadRoom(roomId);
      
      if (result.success && result.room && result.items) {
        // Update room data
        setRoomName(result.room.name);
        setRoomType(result.room.room_type);
        setRoomConfig({
          width: Number(result.room.width_cm),
          height: Number(result.room.length_cm),
        });
        setCeilingHeight(Number(result.room.ceiling_height_cm));
        setCurrentRoomId(result.room.id || null);

        // Update items
        const loadedItems: FurnitureItem[] = result.items.map((item: any) => ({
          id: item.id,
          type: item.subtype || item.label,
          x: Number(item.x),
          y: Number(item.y),
          width: Number(item.width),
          height: Number(item.height),
          rotation: Number(item.rotation),
          color: item.color || '#3b82f6',
        }));
        setItems(loadedItems);
        
        setIsLoadModalOpen(false);
        console.log('[Load] Room loaded successfully:', result.room.name);
      } else {
        alert('Failed to load room');
      }
    } catch (error) {
      console.error('Load error:', error);
      alert('Error loading room');
    }
  };

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

  // Export handler
  const handleExport = async (format: 'pdf-blueprint' | 'pdf-measurements' | 'png' | 'json') => {
    console.log('[Export] Starting export:', format);
    console.log('[Export] stageRef:', stageRef);
    console.log('[Export] stageRef.current:', stageRef.current);
    console.log('[Export] canvasContainerRef.current:', canvasContainerRef.current);
    
    if (!canvasContainerRef.current) {
      alert('Canvas container not ready');
      return;
    }
    
    if ((format === 'pdf-blueprint' || format === 'pdf-measurements') && !stageRef.current) {
      console.error('[Export] Stage ref not available for PDF export');
      alert('Canvas not ready for PDF export. Please try again.');
      return;
    }

    try {
      let success = false;

      switch (format) {
        case 'pdf-blueprint':
          success = await exportBlueprintAsPDF(
            stageRef,
            roomName,
            roomConfig,
            ceilingHeight
          );
          break;
        case 'pdf-measurements':
          console.log('[Export] Starting measurements PDF export with items:', items.length);
          success = await exportMeasurementsAsPDF(
            stageRef,
            roomName,
            roomConfig,
            ceilingHeight,
            items
          );
          console.log('[Export] Measurements PDF export result:', success);
          break;
        case 'png':
          success = await exportAsPNG(canvasContainerRef.current, roomName);
          break;
        case 'json':
          exportAsJSON(roomName, roomType, roomConfig, ceilingHeight, items);
          success = true;
          break;
      }

      if (success) {
        console.log(`Successfully exported as ${format}`);
      } else {
        alert('Export failed. Please try again.');
      }
    } catch (error) {
      console.error('Export error:', error);
      alert('Error during export');
    }
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
      // Window: width = length along wall, height = window height
      handleAddItem('Window', defaultWindowWidth, 120, '#e0f7fa', wall);
    } else if (type === 'Door') {
      // Door: width = door width (along wall), height = door height (floor to ceiling)
      // Thickness is fixed at WALL_THICKNESS_CM and not stored in item.height
      handleAddItem('Door', defaultDoorWidth, 210, '#8d6e63', wall);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in input field
      const target = e.target as HTMLElement;
      const isInputField = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      if (isInputField) return;
      
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
        
        {/* Right: Save/Load/Export buttons - Only show on desktop/tablet */}
        {!isMobile && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleSaveRoom}
              disabled={isSaving}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                fontSize: '14px',
                fontWeight: 500,
                color: isSaving ? '#999999' : '#FFFFFF',
                backgroundColor: isSaving ? '#E5E5E5' : '#0A0A0A',
                border: 'none',
                borderRadius: '8px',
                cursor: isSaving ? 'not-allowed' : 'pointer',
                transition: 'all 150ms',
              }}
              onMouseEnter={(e) => {
                if (!isSaving) {
                  e.currentTarget.style.backgroundColor = '#333333';
                }
              }}
              onMouseLeave={(e) => {
                if (!isSaving) {
                  e.currentTarget.style.backgroundColor = '#0A0A0A';
                }
              }}
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving...' : 'Save'}</span>
            </button>

            <button
              onClick={() => setIsLoadModalOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                fontSize: '14px',
                fontWeight: 500,
                color: '#0A0A0A',
                backgroundColor: '#FFFFFF',
                border: '1px solid #E5E5E5',
                borderRadius: '8px',
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
              <FolderOpen className="w-4 h-4" />
              <span>Load</span>
            </button>

            <button
              onClick={() => setIsExportModalOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                fontSize: '14px',
                fontWeight: 500,
                color: '#0A0A0A',
                backgroundColor: '#FFFFFF',
                border: '1px solid #E5E5E5',
                borderRadius: '8px',
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
              <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
        </div>
        )}
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

            {/* Mobile-only Save/Load/Export Section - At bottom of sidebar */}
            {isMobile && (
              <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid #EFEFEF' }}>
                <h3 style={{ 
                  fontSize: '13px', 
                  fontWeight: 600,
                  color: '#666666',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  margin: '0 0 12px 0'
                }}>
                  Actions
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <button
                    onClick={() => {
                      handleSaveRoom();
                      if (isMobile) setIsSidebarOpen(false);
                    }}
                    disabled={isSaving}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      padding: '12px',
                      fontSize: '14px',
                      fontWeight: 500,
                      color: isSaving ? '#999999' : '#FFFFFF',
                      backgroundColor: isSaving ? '#E5E5E5' : '#0A0A0A',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: isSaving ? 'not-allowed' : 'pointer',
                      transition: 'all 150ms',
                    }}
                  >
                    <Save className="w-4 h-4" />
                    <span>{isSaving ? 'Saving...' : 'Save Room'}</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsLoadModalOpen(true);
                      if (isMobile) setIsSidebarOpen(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      padding: '12px',
                      fontSize: '14px',
                      fontWeight: 500,
                      color: '#0A0A0A',
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E5E5E5',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'all 150ms',
                    }}
                  >
                    <FolderOpen className="w-4 h-4" />
                    <span>Load Room</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsExportModalOpen(true);
                      if (isMobile) setIsSidebarOpen(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      padding: '12px',
                      fontSize: '14px',
                      fontWeight: 500,
                      color: '#0A0A0A',
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E5E5E5',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'all 150ms',
                    }}
                  >
                    <Download className="w-4 h-4" />
                    <span>Export</span>
                  </button>
                </div>
              </div>
            )}
          </div>
          </div>
        </aside>

        {/* Backdrop Overlay (mobile only, when sidebar is open) */}
        {isMobile && isSidebarOpen && (
          <div
            style={{
              position: 'fixed',
              top: '64px',
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.4)',
              backdropFilter: 'blur(2px)',
              zIndex: 40,
              cursor: 'pointer',
            }}
            onClick={() => setIsSidebarOpen(false)}
            aria-label="Close sidebar"
          />
        )}

        {/* Canvas Area */}
        <div
          ref={canvasContainerRef}
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
            ref={stageRef}
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
            viewMode={viewMode}
            hiddenMeasurements={hiddenMeasurements}
            onToggleMeasurement={handleToggleMeasurement}
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
        defaultWindowWidth={defaultWindowWidth}
        defaultWindowHeight={defaultWindowHeight}
        defaultWindowFloorDistance={defaultWindowFloorDistance}
        defaultDoorWidth={defaultDoorWidth}
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

      <LoadRoomModal
        isOpen={isLoadModalOpen}
        onClose={() => setIsLoadModalOpen(false)}
        onLoad={handleLoadRoom}
      />

      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        onExport={handleExport}
        currentView={viewMode}
      />
    </div>
  );
}