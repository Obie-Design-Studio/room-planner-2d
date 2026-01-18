"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import type { RoomConfig, FurnitureItem, ViewMode } from "@/types";
import ColorPicker from "@/components/ui/ColorPicker";
import Input from '@/components/ui/Input';
import ItemEditModal from "@/components/ui/ItemEditModal";
import RoomSettingsModal from "@/components/ui/RoomSettingsModal";
import FurnitureLibraryModal from "@/components/ui/FurnitureLibraryModal";
import CustomFurnitureModal from "@/components/ui/CustomFurnitureModal";
import ViewSwitcher from "@/components/ui/ViewSwitcher";
import MeasurementCategories, { type MeasurementCategory } from "@/components/ui/MeasurementCategories";
import MeasurementLegend from "@/components/ui/MeasurementLegend";
import MeasurementModeToggle, { type MeasurementMode } from "@/components/ui/MeasurementModeToggle";
import { Armchair, Table, Bed, RectangleHorizontal, DoorOpen, Trash2, Settings, ChevronDown, ChevronUp, Plus, Grid3x3, Sofa, Lamp, Box, Circle, Square, Bath, UtensilsCrossed, BookOpen, Monitor, CookingPot, Refrigerator, Menu, X } from "lucide-react";
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
    roomType: 'living',
  });

  const [items, setItems] = useState<FurnitureItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showAllMeasurements, setShowAllMeasurements] = useState(false);
  const [measurementUnit, setMeasurementUnit] = useState<Unit>('cm');
  const [viewMode, setViewMode] = useState<ViewMode>('blueprint');
  const [hiddenMeasurements, setHiddenMeasurements] = useState<Set<string>>(new Set());
  const [measurementCategories, setMeasurementCategories] = useState({
    room: true,    // Always visible (disabled in UI)
    items: true,   // Default ON
    spacing: false, // Default OFF (reduces clutter)
    edges: true,   // Default ON (window/door positions)
  });
  const [measurementMode, setMeasurementMode] = useState<MeasurementMode>('all');
  const [pinnedMeasurements, setPinnedMeasurements] = useState<Set<string>>(new Set());
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);
  
  // Auto-hide spacing measurements when switching to measurements view
  useEffect(() => {
    if (viewMode === 'measurements') {
      const spacingMeasurements = new Set<string>();
      items.forEach(item => {
        // Hide spacing measurements by default if category is off
        if (!measurementCategories.spacing) {
          spacingMeasurements.add(`${item.id}-furniture-left`);
          spacingMeasurements.add(`${item.id}-furniture-right`);
          spacingMeasurements.add(`${item.id}-furniture-top`);
          spacingMeasurements.add(`${item.id}-furniture-bottom`);
        }
      });
      setHiddenMeasurements(spacingMeasurements);
    } else {
      // Clear hidden measurements when switching back to blueprint
      setHiddenMeasurements(new Set());
    }
  }, [viewMode, items.length, measurementCategories.spacing]); // Re-run when category changes
  
  const handleToggleCategory = (category: MeasurementCategory) => {
    setMeasurementCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
    
    // Update hidden measurements based on category toggle
    setHiddenMeasurements(prev => {
      const newHidden = new Set(prev);
      
      items.forEach(item => {
        if (category === 'spacing') {
          const spacingIds = [
            `${item.id}-furniture-left`,
            `${item.id}-furniture-right`,
            `${item.id}-furniture-top`,
            `${item.id}-furniture-bottom`,
          ];
          
          if (!measurementCategories.spacing) {
            // Turning ON - remove from hidden
            spacingIds.forEach(id => newHidden.delete(id));
          } else {
            // Turning OFF - add to hidden
            spacingIds.forEach(id => newHidden.add(id));
          }
        } else if (category === 'items') {
          const itemIds = [
            `${item.id}-furniture-width`,
            `${item.id}-furniture-width-1`,
            `${item.id}-furniture-width-2`,
            `${item.id}-furniture-height`,
            `${item.id}-furniture-height-1`,
            `${item.id}-furniture-height-2`,
          ];
          
          if (!measurementCategories.items) {
            itemIds.forEach(id => newHidden.delete(id));
          } else {
            itemIds.forEach(id => newHidden.add(id));
          }
        } else if (category === 'edges') {
          const edgeIds = [
            `${item.id}-top-left`,
            `${item.id}-top-right`,
            `${item.id}-bottom-left`,
            `${item.id}-bottom-right`,
            `${item.id}-left-top`,
            `${item.id}-left-bottom`,
            `${item.id}-right-top`,
            `${item.id}-right-bottom`,
          ];
          
          if (!measurementCategories.edges) {
            edgeIds.forEach(id => newHidden.delete(id));
          } else {
            edgeIds.forEach(id => newHidden.add(id));
          }
        }
      });
      
      return newHidden;
    });
  };
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Mobile sidebar toggle
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const canvasAreaRef = useRef<HTMLDivElement>(null);
  
  // History state for undo/redo
  const [history, setHistory] = useState<FurnitureItem[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [copiedItem, setCopiedItem] = useState<FurnitureItem | null>(null);

  useEffect(() => {
    const handleResize = () => {
      if (canvasAreaRef.current) {
        const rect = canvasAreaRef.current.getBoundingClientRect();
        setViewport({
          width: rect.width,
          height: rect.height,
        });
      }
    };

    // Use ResizeObserver for more accurate sizing
    const resizeObserver = new ResizeObserver(handleResize);
    if (canvasAreaRef.current) {
      resizeObserver.observe(canvasAreaRef.current);
    }

    handleResize(); // Set initial size
    window.addEventListener("resize", handleResize);
    
    return () => {
      window.removeEventListener("resize", handleResize);
      resizeObserver.disconnect();
    };
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
      // Calculate visual dimensions accounting for rotation
      const rotation = copiedItem.rotation || 0;
      const isRotated90 = rotation === 90 || rotation === 270;
      const visualWidth = isRotated90 ? copiedItem.height : copiedItem.width;
      const visualHeight = isRotated90 ? copiedItem.width : copiedItem.height;
      
      // Find empty spot for pasted item
      const emptySpot = findEmptySpot(visualWidth, visualHeight);
      
      const newItem: FurnitureItem = {
        ...copiedItem,
        id: crypto.randomUUID(),
        x: emptySpot.x,
        y: emptySpot.y,
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
        // Calculate visual dimensions accounting for rotation
        const rotation = item.rotation || 0;
        const isRotated90 = rotation === 90 || rotation === 270;
        const visualWidth = isRotated90 ? item.height : item.width;
        const visualHeight = isRotated90 ? item.width : item.height;
        
        // Find empty spot for duplicated item
        const emptySpot = findEmptySpot(visualWidth, visualHeight);
        
        const newItem: FurnitureItem = {
          ...item,
          id: crypto.randomUUID(),
          x: emptySpot.x,
          y: emptySpot.y,
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

  // Helper: Check if two rectangles overlap
  const rectanglesOverlap = (
    r1: { x: number; y: number; width: number; height: number },
    r2: { x: number; y: number; width: number; height: number }
  ): boolean => {
    return !(
      r1.x + r1.width <= r2.x ||
      r2.x + r2.width <= r1.x ||
      r1.y + r1.height <= r2.y ||
      r2.y + r2.height <= r1.y
    );
  };

  // Helper: Find an empty spot for new furniture
  const findEmptySpot = (width: number, height: number): { x: number; y: number } => {
    const margin = 10; // 10cm gap between furniture
    
    // Try default position first (top-left with margin)
    let candidates: Array<{ x: number; y: number }> = [{ x: 20, y: 20 }];
    
    // Generate candidate positions: right of and below each existing furniture
    items.forEach((item) => {
      // Account for rotation
      const itemRotation = item.rotation || 0;
      const itemIsRotated90 = itemRotation === 90 || itemRotation === 270;
      const itemWidth = itemIsRotated90 ? item.height : item.width;
      const itemHeight = itemIsRotated90 ? item.width : item.height;
      
      // To the right of this item
      candidates.push({
        x: item.x + itemWidth + margin,
        y: item.y
      });
      
      // Below this item
      candidates.push({
        x: item.x,
        y: item.y + itemHeight + margin
      });
      
      // To the right and below
      candidates.push({
        x: item.x + itemWidth + margin,
        y: item.y + itemHeight + margin
      });
    });
    
    // Try each candidate position
    for (const candidate of candidates) {
      const { x, y } = candidate;
      
      // Check if within room bounds
      if (x < 0 || y < 0 || x + width > roomConfig.width || y + height > roomConfig.height) {
        continue;
      }
      
      // Check collision with all existing items
      let hasCollision = false;
      for (const item of items) {
        // Account for rotation
        const itemRotation = item.rotation || 0;
        const itemIsRotated90 = itemRotation === 90 || itemRotation === 270;
        const itemWidth = itemIsRotated90 ? item.height : item.width;
        const itemHeight = itemIsRotated90 ? item.width : item.height;
        
        if (rectanglesOverlap(
          { x, y, width, height },
          { x: item.x, y: item.y, width: itemWidth, height: itemHeight }
        )) {
          hasCollision = true;
          break;
        }
      }
      
      if (!hasCollision) {
        return { x, y }; // Found empty spot!
      }
    }
    
    // Fallback: grid search (slower but comprehensive)
    const step = 20; // Check every 20cm
    for (let gridY = 20; gridY + height <= roomConfig.height; gridY += step) {
      for (let gridX = 20; gridX + width <= roomConfig.width; gridX += step) {
        let hasCollision = false;
        for (const item of items) {
          const itemRotation = item.rotation || 0;
          const itemIsRotated90 = itemRotation === 90 || itemRotation === 270;
          const itemWidth = itemIsRotated90 ? item.height : item.width;
          const itemHeight = itemIsRotated90 ? item.width : item.height;
          
          if (rectanglesOverlap(
            { x: gridX, y: gridY, width, height },
            { x: item.x, y: item.y, width: itemWidth, height: itemHeight }
          )) {
            hasCollision = true;
            break;
          }
        }
        
        if (!hasCollision) {
          return { x: gridX, y: gridY };
        }
      }
    }
    
    // Last resort: just use default and let user move it
    return { x: 20, y: 20 };
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
      
      // Smart placement: find empty spot without overlapping existing furniture
      const emptySpot = findEmptySpot(w, h);
      x = emptySpot.x;
      y = emptySpot.y;
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

  const handleSelect = (id: string | null) => {
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
        height: '44px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 12px',
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid #EFEFEF'
      }}>
        {/* Left: Hamburger (mobile) + Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Mobile hamburger menu */}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="md:hidden"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
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
            aria-label="Toggle menu"
          >
            {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          
          <h1 style={{ 
            fontSize: '16px',
            fontWeight: 600,
            color: '#0A0A0A',
            letterSpacing: '-0.02em',
            margin: 0
          }}
          className="md:text-[20px]"
          >
            Room Planner
          </h1>
        </div>
        
        {/* Center: Room name + dimensions */}
        <div style={{ 
          flex: 1,
          display: 'none',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '2px'
        }}
        className="sm:flex"
        >
          <span style={{ 
            fontSize: '14px',
            fontWeight: 500,
            color: '#0A0A0A'
          }}
          className="md:text-[15px]"
          >
            {roomName}
          </span>
          <span style={{ 
            fontSize: '12px',
            color: '#999999'
          }}
          className="hidden sm:inline md:text-[13px]"
          >
            {roomConfig.width} × {roomConfig.height} cm
          </span>
        </div>
        
        {/* Right: Unit selector */}
        <div style={{ 
          display: 'flex', 
          gap: '4px',
          padding: '3px',
          backgroundColor: '#F5F5F5',
          borderRadius: '8px'
        }}>
          {(['cm', 'm', 'in', 'ft'] as Unit[]).map((unit) => (
            <button
              key={unit}
              onClick={() => setMeasurementUnit(unit)}
              style={{
                padding: '5px 8px',
                fontSize: '12px',
                fontWeight: 500,
                color: measurementUnit === unit ? '#FFFFFF' : '#666666',
                backgroundColor: measurementUnit === unit ? '#0A0A0A' : 'transparent',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 150ms',
              }}
              className="md:px-3 md:py-1.5 md:text-[13px]"
            >
              {UNIT_LABELS[unit]}
            </button>
          ))}
        </div>
      </header>

      {/* Main Body */}
      <div className="flex-1 flex overflow-hidden min-h-0 relative">
        {/* Sidebar */}
        <aside 
          style={{ 
            width: '320px', 
            display: 'flex', 
            flexDirection: 'column', 
            borderRight: '1px solid #EFEFEF',
            backgroundColor: '#FAFAFA',
            position: 'absolute',
            top: '44px',
            left: 0,
            bottom: 0,
            transform: isSidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
            transition: 'transform 250ms ease-in-out',
            zIndex: 100,
            boxShadow: isSidebarOpen ? '4px 0 12px rgba(0, 0, 0, 0.1)' : 'none',
          }}
          className="md:relative md:top-auto md:left-auto md:bottom-auto md:translate-x-0 md:w-[280px] lg:w-[320px] md:z-auto md:shadow-none md:flex-shrink-0"
        >
          <div 
            style={{ 
              flex: 1, 
              minHeight: 0, 
              overflowY: 'auto', 
              padding: '20px'
            }}
            className="md:mt-0"
          >
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
              {/* Windows, Doors & Walls List - Show first */}
              {items.filter(item => item.type?.toLowerCase() === 'window' || item.type?.toLowerCase() === 'door' || item.type?.toLowerCase() === 'wall').length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '12px' }}>
                  {items
                    .filter(item => item.type?.toLowerCase() === 'window' || item.type?.toLowerCase() === 'door' || item.type?.toLowerCase() === 'wall')
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
              
              {/* Add Window/Door/Wall Buttons - Show after list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: items.filter(item => item.type?.toLowerCase() === 'window' || item.type?.toLowerCase() === 'door' || item.type?.toLowerCase() === 'wall').length > 0 ? '12px' : '0' }}>
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
                  onClick={() => {
                    const wallDef = getFurnitureByType('Wall');
                    if (wallDef) {
                      handleAddItem('Wall', wallDef.width, wallDef.height, wallDef.color);
                    }
                  }}
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
                  <Square className="w-4 h-4" style={{ color: '#666666' }} />
                  <span>Add Wall</span>
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

        {/* Mobile backdrop overlay */}
        {isSidebarOpen && (
          <div
            onClick={() => setIsSidebarOpen(false)}
            style={{
              position: 'fixed',
              top: '44px',
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.4)',
              zIndex: 90,
              transition: 'opacity 250ms ease-in-out',
            }}
            className="md:hidden"
          />
        )}

        {/* Canvas Area */}
        <div
          ref={canvasContainerRef}
          className="flex-1 relative min-h-0 w-full md:w-auto overflow-hidden"
          style={{ 
            backgroundColor: '#FAFAF8',
            display: 'flex',
            flexDirection: 'column',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSelectedId(null);
              // Close mobile sidebar when clicking on canvas
              if (window.innerWidth < 768) {
                setIsSidebarOpen(false);
              }
            }
          }}
        >
          {/* Canvas */}
          <div ref={canvasAreaRef} style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
            <RoomCanvas
            roomConfig={roomConfig}
            items={items}
            onItemChange={handleItemChange}
            onItemChangeEnd={handleItemChangeEnd}
            onItemDelete={handleDeleteItemById}
            selectedId={selectedId}
            onSelect={handleSelect}
            onEdit={handleOpenEditor}
            showAllMeasurements={viewMode === 'measurements'}
            measurementUnit={measurementUnit}
            viewportWidth={viewport.width}
            viewportHeight={viewport.height}
            viewMode={viewMode}
            hiddenMeasurements={hiddenMeasurements}
            onToggleMeasurement={(measurementId: string) => {
              // In manual/hover mode, clicking toggles pin state
              // In all mode, clicking toggles hidden state
              if (measurementMode === 'all') {
                setHiddenMeasurements(prev => {
                  const newSet = new Set(prev);
                  if (newSet.has(measurementId)) {
                    newSet.delete(measurementId);
                  } else {
                    newSet.add(measurementId);
                  }
                  return newSet;
                });
              } else {
                // Hover or manual mode - toggle pin
                setPinnedMeasurements(prev => {
                  const newSet = new Set(prev);
                  if (newSet.has(measurementId)) {
                    newSet.delete(measurementId);
                  } else {
                    newSet.add(measurementId);
                  }
                  return newSet;
                });
              }
            }}
            measurementMode={measurementMode}
            pinnedMeasurements={pinnedMeasurements}
            hoveredItemId={hoveredItemId}
            onItemHover={setHoveredItemId}
          />
          
          {/* Measurement Controls Panel - Compact floating toolbar */}
          {viewMode === 'measurements' && (
            <div
              style={{
                position: 'absolute',
                bottom: '12px',
                left: '50%',
                transform: 'translateX(-50%)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '6px 12px',
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                border: '1px solid #E5E5E5',
                borderRadius: '6px',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                backdropFilter: 'blur(8px)',
                fontSize: '12px',
              }}
            >
              <MeasurementCategories
                categories={measurementCategories}
                onToggle={handleToggleCategory}
              />
              <div style={{ width: '1px', height: '16px', backgroundColor: '#E5E5E5' }} />
              <MeasurementModeToggle
                allChecked={measurementCategories.items && measurementCategories.spacing && measurementCategories.edges}
                someChecked={(measurementCategories.items || measurementCategories.spacing || measurementCategories.edges) && 
                            !(measurementCategories.items && measurementCategories.spacing && measurementCategories.edges)}
                onToggleAll={() => {
                  const allCurrentlyChecked = measurementCategories.items && measurementCategories.spacing && measurementCategories.edges;
                  const newValue = !allCurrentlyChecked;
                  setMeasurementCategories({
                    ...measurementCategories,
                    items: newValue,
                    spacing: newValue,
                    edges: newValue,
                  });
                }}
              />
            </div>
          )}
          </div>
          
          {/* Footer Toolbar - View Mode Selector Only */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '10px 20px',
              backgroundColor: '#FFFFFF',
              borderTop: '1px solid #E5E5E5',
              boxShadow: '0 -2px 8px rgba(0, 0, 0, 0.04)',
            }}
          >
            <ViewSwitcher currentView={viewMode} onViewChange={setViewMode} compact />
          </div>
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
        defaultCategory={roomConfig.roomType || 'all'}
      />

      <CustomFurnitureModal
        isOpen={isCustomFurnitureOpen}
        onClose={() => setIsCustomFurnitureOpen(false)}
        onAddCustomFurniture={handleAddCustomFurniture}
      />
    </div>
  );
}
