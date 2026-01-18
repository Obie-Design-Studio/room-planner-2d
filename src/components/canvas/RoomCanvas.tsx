import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle } from "react";
import { Stage, Layer, Rect, Group, Line, Text } from "react-konva";
import { PIXELS_PER_CM, WALL_THICKNESS_PX } from "@/lib/constants";
import { RoomConfig, FurnitureItem, ViewMode } from "@/types";
import { type Unit, formatMeasurement } from "@/lib/unitConversion";
import FurnitureShape from "./FurnitureShape";
import MeasurementOverlay, { type MeasurementMode } from "./MeasurementOverlay";
import GridBackground from "./GridBackground";
import { Plus, Minus, Maximize2 } from "lucide-react";

interface RoomCanvasProps {
  roomConfig: RoomConfig;
  items: FurnitureItem[];
  onItemChange: (id: string, updates: Partial<FurnitureItem>) => void;
  onItemChangeEnd?: (id: string, updates: Partial<FurnitureItem>) => void;
  onItemDelete: (id: string) => void;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onEdit: (id: string) => void;
  showAllMeasurements: boolean;
  measurementUnit?: Unit;
  viewportWidth: number;
  viewportHeight: number;
  viewMode?: ViewMode;
  hiddenMeasurements?: Set<string>;
  onToggleMeasurement?: (measurementId: string) => void;
  measurementMode?: MeasurementMode;
  pinnedMeasurements?: Set<string>;
  hoveredItemId?: string | null;
  onItemHover?: (itemId: string | null) => void;
}

const RoomCanvas = forwardRef<any, RoomCanvasProps>(({
  roomConfig,
  items,
  onItemChange,
  onItemChangeEnd,
  onItemDelete,
  selectedId,
  onSelect,
  onEdit,
  showAllMeasurements,
  measurementUnit = 'cm',
  viewportWidth,
  viewportHeight,
  viewMode,
  hiddenMeasurements,
  onToggleMeasurement,
  measurementMode = 'all',
  pinnedMeasurements = new Set(),
  hoveredItemId = null,
  onItemHover,
}, ref) => {
  const stageRef = useRef<any>(null);
  
  // Expose stageRef to parent via ref
  useImperativeHandle(ref, () => stageRef.current);
  
  // Zoom state: 1.0 = 100%, range 0.1 to 3.0
  const [userZoom, setUserZoom] = useState(1.0);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  
  // Pan state
  const [isPanning, setIsPanning] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const lastPointerPos = useRef({ x: 0, y: 0 });
  
  // Track timestamp of measurement click to prevent deselection
  const measurementClickTimeRef = useRef(0);
  
  // Zoom tooltip state (shows during Ctrl+Scroll zoom)
  const [showZoomTooltip, setShowZoomTooltip] = useState(false);
  const [zoomTooltipPos, setZoomTooltipPos] = useState({ x: 0, y: 0 });
  const zoomTooltipTimeout = useRef<NodeJS.Timeout | null>(null);

  // Calculate optimal scale and position
  const roomPxWidth = roomConfig.width * PIXELS_PER_CM;
  const roomPxHeight = roomConfig.height * PIXELS_PER_CM;
  
  // Find the maximum door length to create a fixed buffer zone
  let maxDoorLength = 0;
  items.forEach((item) => {
    if (item.type?.toLowerCase() === 'door') {
      const doorLength = item.width * PIXELS_PER_CM;
      maxDoorLength = Math.max(maxDoorLength, doorLength);
    }
  });
  
  // Create fixed bounds with buffer for door arcs on ALL walls
  // This prevents the room from jumping when doors move between walls
  // Ensure minimum buffer for room dimension labels (positioned at -100 with text extending ~30-50px beyond)
  const ROOM_LABEL_BUFFER = 150; // Space for room dimension labels on top and left walls
  const buffer = Math.max(maxDoorLength, ROOM_LABEL_BUFFER); // Buffer extends in all directions
  let minX = -WALL_THICKNESS_PX / 2 - buffer;
  let minY = -WALL_THICKNESS_PX / 2 - buffer;
  let maxX = roomPxWidth + WALL_THICKNESS_PX / 2 + buffer;
  let maxY = roomPxHeight + WALL_THICKNESS_PX / 2 + buffer;
  
  const contentWidth = maxX - minX;
  const contentHeight = maxY - minY;
  
  // Dynamic padding that scales with zoom level
  // At 100% zoom (userZoom=1.0): 40px padding - room uses maximum space (buffer already accounts for door swings)
  // At 300% zoom (userZoom=3.0): 120px padding - ensures comfortable edge visibility when zoomed in
  // This keeps content away from edges at all zoom levels while maximizing space at default zoom
  const basePadding = 40;
  const padding = basePadding * userZoom;
  
  // Base scale to fit content
  const baseScale = Math.min(
    (viewportWidth - padding) / contentWidth,
    (viewportHeight - padding) / contentHeight
  );
  
  // Apply user zoom to base scale
  const scale = baseScale * userZoom;
  
  // Calculate where the content should be positioned to center it
  // These offsets account for: viewport center, content size, and content origin (minX, minY)
  const baseCenterOffsetX = viewportWidth / 2 - (contentWidth / 2 + minX) * scale;
  const baseCenterOffsetY = viewportHeight / 2 - (contentHeight / 2 + minY) * scale;

  // Elastic boundary helper - allows ±100px over-pan with resistance (configurable)
  const ELASTIC_MARGIN = 100;
  const applyElasticBoundary = (value: number, min: number, max: number, margin: number = ELASTIC_MARGIN): number => {
    if (min > max) return value; // Invalid range, no clamping
    
    if (value < min) {
      // Over-panned to the left/top - apply elastic resistance
      const overpan = min - value;
      if (overpan > margin) {
        return min - margin; // Hard limit at margin
      }
      return value; // Allow within elastic margin
    } else if (value > max) {
      // Over-panned to the right/bottom - apply elastic resistance
      const overpan = value - max;
      if (overpan > margin) {
        return max + margin; // Hard limit at margin
      }
      return value; // Allow within elastic margin
    }
    return value; // Within normal bounds
  };

  // Mouse wheel handler - zoom with Ctrl/Cmd, pan otherwise
  const handleWheel = (e: any) => {
    e.evt.preventDefault();
    
    const stage = stageRef.current;
    if (!stage) return;

    const ctrlPressed = e.evt.ctrlKey || e.evt.metaKey;

    if (ctrlPressed) {
      // Zoom with Ctrl/Cmd + scroll - cursor-anchored (Figma/Miro style)
      // The point under the cursor stays under the cursor
      const scaleBy = 1.1;
      const direction = e.evt.deltaY > 0 ? -1 : 1;
      
      const oldZoom = userZoom;
      const newZoom = direction > 0 ? userZoom * scaleBy : userZoom / scaleBy;
      const clampedZoom = Math.max(0.1, Math.min(3.0, newZoom));
      
      if (clampedZoom === oldZoom) return; // Already at limit
      
      const oldScale = baseScale * oldZoom;
      const newScale = baseScale * clampedZoom;
      
      // Get cursor position in viewport coordinates
      const pointerPos = stage.getPointerPosition();
      if (!pointerPos) return;
      
      // Calculate old and new base center offsets
      const oldBaseCenterOffsetX = viewportWidth / 2 - (contentWidth / 2 + minX) * oldScale;
      const oldBaseCenterOffsetY = viewportHeight / 2 - (contentHeight / 2 + minY) * oldScale;
      const newBaseCenterOffsetX = viewportWidth / 2 - (contentWidth / 2 + minX) * newScale;
      const newBaseCenterOffsetY = viewportHeight / 2 - (contentHeight / 2 + minY) * newScale;
      
      // Find what world point is under the cursor
      const worldPointUnderCursor = {
        x: (pointerPos.x - stagePos.x - oldBaseCenterOffsetX) / oldScale,
        y: (pointerPos.y - stagePos.y - oldBaseCenterOffsetY) / oldScale,
      };
      
      // Calculate new stagePos to keep that world point under the cursor
      const newPos = {
        x: pointerPos.x - worldPointUnderCursor.x * newScale - newBaseCenterOffsetX,
        y: pointerPos.y - worldPointUnderCursor.y * newScale - newBaseCenterOffsetY,
      };
      
      setUserZoom(clampedZoom);
      setStagePos(newPos);
      
      // Show zoom tooltip near cursor
      setZoomTooltipPos({ x: pointerPos.x + 20, y: pointerPos.y - 10 });
      setShowZoomTooltip(true);
      
      // Hide tooltip after 800ms of no zoom activity
      if (zoomTooltipTimeout.current) {
        clearTimeout(zoomTooltipTimeout.current);
      }
      zoomTooltipTimeout.current = setTimeout(() => {
        setShowZoomTooltip(false);
      }, 800);
    } else {
      // Pan with regular scroll (two-finger scroll on trackpad)
      const deltaX = e.evt.deltaX;
      const deltaY = e.evt.deltaY;
      
      setStagePos((prev) => {
        const newX = prev.x - deltaX;
        const newY = prev.y - deltaY;
        
        // Apply same boundary constraints as mouse pan
        const contentScreenWidth = contentWidth * scale;
        const contentScreenHeight = contentHeight * scale;
        
        // At minimum zoom (10%), enforce stricter boundaries to keep room fully visible
        // At 10% zoom, keep room completely within canvas boundaries
        const MIN_VISIBILITY_RATIO = userZoom <= 0.15 ? 1.0 : 0.0; // Keep 100% visible at very low zoom
        const minVisibilityWidth = contentScreenWidth * MIN_VISIBILITY_RATIO;
        const minVisibilityHeight = contentScreenHeight * MIN_VISIBILITY_RATIO;
        
        let minPosX, maxPosX, minPosY, maxPosY;
        
        if (contentScreenWidth <= viewportWidth) {
          minPosX = viewportWidth - (baseCenterOffsetX + maxX * scale);
          maxPosX = -(baseCenterOffsetX + minX * scale);
          
          // At minimum zoom, even when content fits, prevent it from moving completely off-screen
          if (MIN_VISIBILITY_RATIO > 0) {
            minPosX = Math.max(minPosX, -contentScreenWidth + minVisibilityWidth);
            maxPosX = Math.min(maxPosX, viewportWidth - minVisibilityWidth);
          }
        } else {
          maxPosX = -(baseCenterOffsetX + minX * scale);
          minPosX = viewportWidth - (baseCenterOffsetX + maxX * scale);
          
          // At minimum zoom, restrict panning to keep room partially visible
          if (MIN_VISIBILITY_RATIO > 0) {
            minPosX = Math.max(minPosX, -contentScreenWidth + minVisibilityWidth);
            maxPosX = Math.min(maxPosX, viewportWidth - minVisibilityWidth);
          }
        }
        
        if (contentScreenHeight <= viewportHeight) {
          minPosY = viewportHeight - (baseCenterOffsetY + maxY * scale);
          maxPosY = -(baseCenterOffsetY + minY * scale);
          
          // At minimum zoom, even when content fits, prevent it from moving completely off-screen
          if (MIN_VISIBILITY_RATIO > 0) {
            minPosY = Math.max(minPosY, -contentScreenHeight + minVisibilityHeight);
            maxPosY = Math.min(maxPosY, viewportHeight - minVisibilityHeight);
          }
        } else {
          maxPosY = -(baseCenterOffsetY + minY * scale);
          minPosY = viewportHeight - (baseCenterOffsetY + maxY * scale);
          
          // At minimum zoom, restrict panning to keep room partially visible
          if (MIN_VISIBILITY_RATIO > 0) {
            minPosY = Math.max(minPosY, -contentScreenHeight + minVisibilityHeight);
            maxPosY = Math.min(maxPosY, viewportHeight - minVisibilityHeight);
          }
        }
        
        // Apply elastic boundaries
        // At low zoom (≤15%), disable elastic margin to prevent room from moving off-screen
        const elasticMargin = userZoom <= 0.15 ? 0 : ELASTIC_MARGIN;
        const clampedX = applyElasticBoundary(newX, minPosX, maxPosX, elasticMargin);
        const clampedY = applyElasticBoundary(newY, minPosY, maxPosY, elasticMargin);
        
        return {
          x: clampedX,
          y: clampedY,
        };
      });
    }
  };

  // Zoom controls (10% - 300%)
  // Button zoom is center-locked for predictable, consistent behavior
  const handleZoomIn = () => {
    const oldZoom = userZoom;
    const newZoom = Math.min(3.0, oldZoom * 1.15);
    if (newZoom === oldZoom) return; // Already at limit
    
    const oldScale = baseScale * oldZoom;
    const newScale = baseScale * newZoom;
    
    // Calculate old and new base center offsets
    const oldBaseCenterOffsetX = viewportWidth / 2 - (contentWidth / 2 + minX) * oldScale;
    const oldBaseCenterOffsetY = viewportHeight / 2 - (contentHeight / 2 + minY) * oldScale;
    const newBaseCenterOffsetX = viewportWidth / 2 - (contentWidth / 2 + minX) * newScale;
    const newBaseCenterOffsetY = viewportHeight / 2 - (contentHeight / 2 + minY) * newScale;
    
    // Keep viewport center fixed
    const centerPoint = { x: viewportWidth / 2, y: viewportHeight / 2 };
    const worldPointAtCenter = {
      x: (centerPoint.x - stagePos.x - oldBaseCenterOffsetX) / oldScale,
      y: (centerPoint.y - stagePos.y - oldBaseCenterOffsetY) / oldScale,
    };
    
    const newPos = {
      x: centerPoint.x - worldPointAtCenter.x * newScale - newBaseCenterOffsetX,
      y: centerPoint.y - worldPointAtCenter.y * newScale - newBaseCenterOffsetY,
    };
    
    setUserZoom(newZoom);
    setStagePos(newPos);
  };

  const handleZoomOut = () => {
    const oldZoom = userZoom;
    const newZoom = Math.max(0.1, oldZoom / 1.15);
    if (newZoom === oldZoom) return; // Already at limit
    
    const oldScale = baseScale * oldZoom;
    const newScale = baseScale * newZoom;
    
    // Calculate old and new base center offsets
    const oldBaseCenterOffsetX = viewportWidth / 2 - (contentWidth / 2 + minX) * oldScale;
    const oldBaseCenterOffsetY = viewportHeight / 2 - (contentHeight / 2 + minY) * oldScale;
    const newBaseCenterOffsetX = viewportWidth / 2 - (contentWidth / 2 + minX) * newScale;
    const newBaseCenterOffsetY = viewportHeight / 2 - (contentHeight / 2 + minY) * newScale;
    
    // Keep viewport center fixed
    const centerPoint = { x: viewportWidth / 2, y: viewportHeight / 2 };
    const worldPointAtCenter = {
      x: (centerPoint.x - stagePos.x - oldBaseCenterOffsetX) / oldScale,
      y: (centerPoint.y - stagePos.y - oldBaseCenterOffsetY) / oldScale,
    };
    
    const newPos = {
      x: centerPoint.x - worldPointAtCenter.x * newScale - newBaseCenterOffsetX,
      y: centerPoint.y - worldPointAtCenter.y * newScale - newBaseCenterOffsetY,
    };
    
    setUserZoom(newZoom);
    setStagePos(newPos);
  };

  const handleResetView = () => {
    setUserZoom(1.0);
    setStagePos({ x: 0, y: 0 }); // Reset pan to center
  };

  // Keyboard shortcuts for zoom and view control
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Don't trigger if typing in input field
      const target = e.target as HTMLElement;
      const isInputField = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      if (isInputField) return;

      // F or 0 key = Fit to View (reset zoom and pan)
      if (e.key === 'f' || e.key === 'F' || e.key === '0') {
        e.preventDefault();
        handleResetView();
      }
      // + or = key = Zoom In
      else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        handleZoomIn();
      }
      // - key = Zoom Out
      else if (e.key === '-') {
        e.preventDefault();
        handleZoomOut();
      }
      // Cmd/Ctrl + 0 = Reset to 100%
      else if ((e.metaKey || e.ctrlKey) && e.key === '0') {
        e.preventDefault();
        handleResetView();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  // Pan handlers
  const handleMouseDown = (e: any) => {
    const stage = stageRef.current;
    if (!stage) return;

    // Only enable panning when Space key is pressed (pan mode)
    // Don't pan on regular clicks - those should select/deselect
    if (isSpacePressed) {
      setIsPanning(true);
      const pos = stage.getPointerPosition();
      lastPointerPos.current = pos;
      stage.container().style.cursor = 'grabbing';
    }
  };

  const handleMouseMove = (e: any) => {
    const stage = stageRef.current;
    if (!stage) return;

    // Update cursor when space is pressed
    if (isSpacePressed && !isPanning) {
      stage.container().style.cursor = 'grab';
    }

    if (isPanning) {
      const pos = stage.getPointerPosition();
      const dx = pos.x - lastPointerPos.current.x;
      const dy = pos.y - lastPointerPos.current.y;
      
      setStagePos((prev) => {
        const newX = prev.x + dx;
        const newY = prev.y + dy;
        
        // Calculate content bounds in screen space
        const contentScreenWidth = contentWidth * scale;
        const contentScreenHeight = contentHeight * scale;
        
        // Calculate limits to keep content fully visible within viewport
        // Content spans from (minX * scale) to (maxX * scale) in its own coordinate space
        // With Layer offset, the content's screen position is: stagePos + offsetX + (content coords * scale)
        
        // At minimum zoom (10%), enforce stricter boundaries to keep room fully visible
        // At 10% zoom, keep room completely within canvas boundaries
        const MIN_VISIBILITY_RATIO = userZoom <= 0.15 ? 1.0 : 0.0; // Keep 100% visible at very low zoom
        const minVisibilityWidth = contentScreenWidth * MIN_VISIBILITY_RATIO;
        const minVisibilityHeight = contentScreenHeight * MIN_VISIBILITY_RATIO;
        
        // Boundary logic:
        // - If content is smaller than viewport, allow free movement within extra space
        // - If content is larger than viewport, only allow panning to see all parts
        // - At minimum zoom, enforce minimum visibility to prevent losing the room
        
        let minPosX, maxPosX, minPosY, maxPosY;
        
        if (contentScreenWidth <= viewportWidth) {
          // Content fits horizontally - allow positioning anywhere that keeps it fully visible
          // Right constraint: baseCenterOffsetX + maxX * scale + stagePos.x <= viewportWidth
          minPosX = viewportWidth - (baseCenterOffsetX + maxX * scale);
          // Left constraint: baseCenterOffsetX + minX * scale + stagePos.x >= 0
          maxPosX = -(baseCenterOffsetX + minX * scale);
          
          // At minimum zoom, even when content fits, prevent it from moving completely off-screen
          if (MIN_VISIBILITY_RATIO > 0) {
            minPosX = Math.max(minPosX, -contentScreenWidth + minVisibilityWidth);
            maxPosX = Math.min(maxPosX, viewportWidth - minVisibilityWidth);
          }
        } else {
          // Content larger than viewport - clamp to edges, but ensure minimum visibility at low zoom
          maxPosX = -(baseCenterOffsetX + minX * scale); // Can pan left
          minPosX = viewportWidth - (baseCenterOffsetX + maxX * scale); // Can pan right
          
          // At minimum zoom, restrict panning to keep room partially visible
          if (MIN_VISIBILITY_RATIO > 0) {
            // Ensure at least minVisibilityWidth is visible on right side
            minPosX = Math.max(minPosX, -contentScreenWidth + minVisibilityWidth);
            // Ensure at least minVisibilityWidth is visible on left side
            maxPosX = Math.min(maxPosX, viewportWidth - minVisibilityWidth);
          }
        }
        
        if (contentScreenHeight <= viewportHeight) {
          // Content fits vertically
          minPosY = viewportHeight - (baseCenterOffsetY + maxY * scale);
          maxPosY = -(baseCenterOffsetY + minY * scale);
          
          // At minimum zoom, even when content fits, prevent it from moving completely off-screen
          if (MIN_VISIBILITY_RATIO > 0) {
            minPosY = Math.max(minPosY, -contentScreenHeight + minVisibilityHeight);
            maxPosY = Math.min(maxPosY, viewportHeight - minVisibilityHeight);
          }
        } else {
          // Content larger than viewport
          maxPosY = -(baseCenterOffsetY + minY * scale);
          minPosY = viewportHeight - (baseCenterOffsetY + maxY * scale);
          
          // At minimum zoom, restrict panning to keep room partially visible
          if (MIN_VISIBILITY_RATIO > 0) {
            // Ensure at least minVisibilityHeight is visible on bottom
            minPosY = Math.max(minPosY, -contentScreenHeight + minVisibilityHeight);
            // Ensure at least minVisibilityHeight is visible on top
            maxPosY = Math.min(maxPosY, viewportHeight - minVisibilityHeight);
          }
        }
        
        // Apply elastic boundaries
        // At low zoom (≤15%), disable elastic margin to prevent room from moving off-screen
        const elasticMargin = userZoom <= 0.15 ? 0 : ELASTIC_MARGIN;
        const clampedX = applyElasticBoundary(newX, minPosX, maxPosX, elasticMargin);
        const clampedY = applyElasticBoundary(newY, minPosY, maxPosY, elasticMargin);
        
        return {
          x: clampedX,
          y: clampedY,
        };
      });

      lastPointerPos.current = pos;
    }
  };

  const handleMouseUp = (e: any) => {
    const stage = stageRef.current;
    const targetName = e.target?.attrs?.name;
    
    if (isPanning) {
      setIsPanning(false);
      if (stage) {
        stage.container().style.cursor = isSpacePressed ? 'grab' : 'default';
      }
      return;
    }
    
    // Handle deselection
    if (selectedId !== null && e && e.target) {
      // Check if measurement was clicked within last 200ms
      const timeSinceMeasurementClick = Date.now() - measurementClickTimeRef.current;
      if (timeSinceMeasurementClick < 200) {
        return;
      }
      
      // Check if clicked on floor (empty space) or Stage directly
      const isFloorClick = targetName === 'floor';
      const isStageClick = e.target === e.target.getStage();
      
      if (isFloorClick || isStageClick) {
        onSelect(null);
        return;
      }
      
      // Check if clicked on furniture or UI elements
      let clickedOnFurnitureOrUI = false;
      let current = e.target;
      
      while (current && current.getParent) {
        const attrs = current.attrs || {};
        
        if (attrs.id && items.find((item) => item.id === attrs.id)) {
          clickedOnFurnitureOrUI = true;
          break;
        }
        
        if (attrs.name && (
          attrs.name.includes('measurement') || 
          attrs.name.includes('dimension-label') ||
          attrs.name === 'rotate-button'
        )) {
          clickedOnFurnitureOrUI = true;
          break;
        }
        
        current = current.getParent();
      }

      if (!clickedOnFurnitureOrUI) {
        onSelect(null);
      }
    }
  };

  // Space key detection for pan mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't interfere with typing in input fields
      const target = e.target as HTMLElement;
      const isInputField = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      if (isInputField) return;
      
      if (e.code === 'Space' && !isSpacePressed) {
        e.preventDefault();
        setIsSpacePressed(true);
        const stage = stageRef.current;
        if (stage && !isPanning) {
          stage.container().style.cursor = 'grab';
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      // Don't interfere with typing in input fields
      const target = e.target as HTMLElement;
      const isInputField = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      if (isInputField) return;
      
      if (e.code === 'Space') {
        e.preventDefault();
        setIsSpacePressed(false);
        const stage = stageRef.current;
        if (stage && !isPanning) {
          stage.container().style.cursor = 'default';
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isSpacePressed, isPanning]);

  // Native double-click handler for canvas
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const handleNativeDoubleClick = (e: MouseEvent) => {
      const pointerPos = stage.getPointerPosition();
      if (!pointerPos) return;

      // Get the shape at the click position
      const shape = stage.getIntersection(pointerPos);
      if (!shape) return;

      // Find the furniture group
      let current = shape;
      while (current) {
        if (current.attrs?.id && items.find((item) => item.id === current.attrs.id)) {
          onEdit(current.attrs.id);
          return;
        }
        current = current.getParent();
      }
    };

    const canvas = stage.content;
    if (canvas) {
      canvas.addEventListener('dblclick', handleNativeDoubleClick);
      return () => {
        canvas.removeEventListener('dblclick', handleNativeDoubleClick);
      };
    }
  }, [items, onEdit]);

  return (
    <div style={{ position: 'relative', width: viewportWidth, height: viewportHeight }}>
      <Stage 
        ref={stageRef} 
        width={viewportWidth} 
        height={viewportHeight}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <Layer 
          scale={{ x: scale, y: scale }}
          x={stagePos.x + baseCenterOffsetX}
          y={stagePos.y + baseCenterOffsetY}
        >
          <Group x={0} y={0}>
            {/* Floor background */}
            <Rect
              name="floor"
              x={0}
              y={0}
              width={roomConfig.width * PIXELS_PER_CM}
              height={roomConfig.height * PIXELS_PER_CM}
              fill="white"
            />
            
            {/* Walls with door gaps */}
            {(() => {
              const roomWidthPx = roomConfig.width * PIXELS_PER_CM;
              const roomHeightPx = roomConfig.height * PIXELS_PER_CM;
              const WALL_THICKNESS_CM = WALL_THICKNESS_PX / PIXELS_PER_CM;
              
              // Find all doors and their positions
              const doors = items.filter(item => item.type?.toLowerCase() === 'door');
              
              // Helper: Generate wall segments for a wall, with gaps for doors
              const generateWallSegments = (wall: 'top' | 'bottom' | 'left' | 'right') => {
                const segments: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
                
                // Get doors on this wall
                const wallDoors = doors.filter(door => {
                  // Match door positions as set by drag logic in FurnitureShape
                  // Top/Left: -WALL_THICKNESS_CM (-2.5cm)
                  // Bottom/Right: roomConfig dimension (doors are at outer edge coordinate)
                  if (wall === 'top') return Math.abs(door.y - (-WALL_THICKNESS_CM)) < 1;
                  if (wall === 'bottom') return Math.abs(door.y - roomConfig.height) < 1;
                  if (wall === 'left') return Math.abs(door.x - (-WALL_THICKNESS_CM)) < 1;
                  if (wall === 'right') return Math.abs(door.x - roomConfig.width) < 1;
                  return false;
                });
                
                // Sort doors by position along the wall
                wallDoors.sort((a, b) => {
                  if (wall === 'top' || wall === 'bottom') return a.x - b.x;
                  return a.y - b.y;
                });
                
                if (wall === 'top' || wall === 'bottom') {
                  // Horizontal wall
                  const y = wall === 'top' ? -WALL_THICKNESS_PX / 2 : roomHeightPx + WALL_THICKNESS_PX / 2;
                  let currentX = -WALL_THICKNESS_PX / 2;
                  const endX = roomWidthPx + WALL_THICKNESS_PX / 2;
                  
                  wallDoors.forEach(door => {
                    const doorStartX = door.x * PIXELS_PER_CM;
                    const doorEndX = doorStartX + door.width * PIXELS_PER_CM;
                    
                    // Add segment before door (if there's space)
                    if (doorStartX > currentX + 1) {
                      segments.push({ x1: currentX, y1: y, x2: doorStartX, y2: y });
                    }
                    
                    currentX = doorEndX;
                  });
                  
                  // Add final segment after last door
                  if (currentX < endX - 1) {
                    segments.push({ x1: currentX, y1: y, x2: endX, y2: y });
                  }
                } else {
                  // Vertical wall
                  const x = wall === 'left' ? -WALL_THICKNESS_PX / 2 : roomWidthPx + WALL_THICKNESS_PX / 2;
                  let currentY = -WALL_THICKNESS_PX / 2;
                  const endY = roomHeightPx + WALL_THICKNESS_PX / 2;
                  
                  wallDoors.forEach(door => {
                    const doorStartY = door.y * PIXELS_PER_CM;
                    const doorEndY = doorStartY + door.width * PIXELS_PER_CM; // door.width is the length along the wall
                    
                    // Add segment before door (if there's space)
                    if (doorStartY > currentY + 1) {
                      segments.push({ x1: x, y1: currentY, x2: x, y2: doorStartY });
                    }
                    
                    currentY = doorEndY;
                  });
                  
                  // Add final segment after last door
                  if (currentY < endY - 1) {
                    segments.push({ x1: x, y1: currentY, x2: x, y2: endY });
                  }
                }
                
                return segments;
              };
              
              // Generate all wall segments
              const allSegments = [
                ...generateWallSegments('top'),
                ...generateWallSegments('right'),
                ...generateWallSegments('bottom'),
                ...generateWallSegments('left'),
              ];
              
              return allSegments.map((seg, i) => (
                <Line
                  key={`wall-${i}`}
                  points={[seg.x1, seg.y1, seg.x2, seg.y2]}
                  stroke="black"
                  strokeWidth={WALL_THICKNESS_PX}
                  lineCap="square"
                  listening={false}
                />
              ));
            })()}
            
            <GridBackground width={roomConfig.width} height={roomConfig.height} />
            
            {/* Room Dimensions - Always visible on top and left walls */}
            <Group>
              {/* Top wall - Room width */}
              <Line 
                points={[0, -100, roomConfig.width * PIXELS_PER_CM, -100]} 
                stroke="#0a0a0a" 
                strokeWidth={2} 
              />
              <Line points={[0, -105, 0, -95]} stroke="#0a0a0a" strokeWidth={2} />
              <Line points={[roomConfig.width * PIXELS_PER_CM, -105, roomConfig.width * PIXELS_PER_CM, -95]} stroke="#0a0a0a" strokeWidth={2} />
              {/* Top wall label - ABOVE the dimension line, 2x bigger, zoom-responsive, no box */}
              {(() => {
                const topText = formatMeasurement(roomConfig.width, measurementUnit);
                // 2x bigger base (48px), scales with zoom for readability
                const baseFontSize = 48;
                const topFontSize = Math.max(36, Math.min(64, baseFontSize + (userZoom - 1) * 12));
                const textWidth = topText.length * topFontSize * 0.6;
                const topCenterX = roomConfig.width * PIXELS_PER_CM / 2 - textWidth / 2;
                const topY = -100 - 15 - topFontSize; // Position so bottom edge is 15px above line
                return (
                  <Text 
                    x={topCenterX}
                    y={topY}
                    text={topText}
                    fontSize={topFontSize}
                    fontFamily="Arial, sans-serif"
                    fontStyle="bold"
                    fill="#0a0a0a"
                  />
                );
              })()}
              
              {/* Left wall - Room height */}
              <Line 
                points={[-100, 0, -100, roomConfig.height * PIXELS_PER_CM]} 
                stroke="#0a0a0a" 
                strokeWidth={2} 
              />
              <Line points={[-105, 0, -95, 0]} stroke="#0a0a0a" strokeWidth={2} />
              <Line points={[-105, roomConfig.height * PIXELS_PER_CM, -95, roomConfig.height * PIXELS_PER_CM]} stroke="#0a0a0a" strokeWidth={2} />
              {/* Left wall label - LEFT of the dimension line, 2x bigger, zoom-responsive, no box */}
              {(() => {
                const leftText = formatMeasurement(roomConfig.height, measurementUnit);
                // 2x bigger base (48px), scales with zoom for readability
                const baseFontSize = 48;
                const leftFontSize = Math.max(36, Math.min(64, baseFontSize + (userZoom - 1) * 12));
                const textWidth = leftText.length * leftFontSize * 0.6;
                const leftX = -100 - 15 - textWidth; // Position so right edge is 15px left of line
                const leftCenterY = roomConfig.height * PIXELS_PER_CM / 2;
                return (
                  <Text 
                    x={leftX}
                    y={leftCenterY - leftFontSize / 2}
                    text={leftText}
                    fontSize={leftFontSize}
                    fontFamily="Arial, sans-serif"
                    fontStyle="bold"
                    fill="#0a0a0a"
                  />
                );
              })()}
            </Group>
            
            {items.map((item) => (
              <FurnitureShape
                key={item.id}
                item={item}
                onChange={onItemChange}
                onChangeEnd={onItemChangeEnd}
                onDelete={onItemDelete}
                isSelected={item.id === selectedId}
                onSelect={onSelect}
                onEdit={onEdit}
                roomConfig={roomConfig}
                zoom={userZoom}
                isDraggable={viewMode === 'blueprint'}
                onHover={onItemHover}
              />
            ))}
            {items.map((item) => {
              if (item.id === selectedId || showAllMeasurements) {
                // Filter out the current item so we don't measure distance to itself
                const neighbors = items.filter((other) => other.id !== item.id);
                
                return (
                  <MeasurementOverlay
                    key={`measurement-${item.id}`}
                    item={item}
                    room={roomConfig}
                    otherItems={neighbors}
                    zoom={userZoom}
                    unit={measurementUnit}
                    onItemChange={onItemChange}
                    stageRef={stageRef}
                    scale={scale}
                    stagePos={stagePos}
                    layerOffset={{ x: baseCenterOffsetX, y: baseCenterOffsetY }}
                    measurementClickTimeRef={measurementClickTimeRef}
                    hiddenMeasurements={hiddenMeasurements}
                    onToggleMeasurement={onToggleMeasurement}
                    viewMode={viewMode}
                    measurementMode={measurementMode}
                    pinnedMeasurements={pinnedMeasurements}
                    hoveredItemId={hoveredItemId}
                  />
                );
              }
              return null;
            })}
          </Group>
        </Layer>
      </Stage>
      
      {/* Scale Reference - Fixed at bottom-left of viewport, independent of zoom/pan */}
      <div
        style={{
          position: 'absolute',
          bottom: '20px',
          left: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          pointerEvents: 'none',
          zIndex: 100,
        }}
      >
        {/* Scale box - 10cm reference - visual only, size doesn't change with zoom */}
        <div
          style={{
            width: '32px',
            height: '32px',
            backgroundColor: '#fafafa',
            border: '1px solid #d4d4d4',
          }}
        />
        {/* Label below box */}
        <div
          style={{
            fontSize: '11px',
            fontFamily: 'Arial, sans-serif',
            fontWeight: '500',
            color: '#a3a3a3',
            textAlign: 'center',
            marginTop: '-2px',
          }}
        >
          = {formatMeasurement(10, measurementUnit)}
        </div>
      </div>
      
      {/* Zoom Controls */}
      <div
        style={{
          position: 'absolute',
          bottom: '12px',
          right: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          zIndex: 1000,
        }}
        className="md:bottom-5 md:right-5 md:gap-2"
      >
        <button
          onClick={handleZoomIn}
          style={{
            width: '40px',
            height: '40px',
            minWidth: '40px',
            minHeight: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#FFFFFF',
            border: '1px solid #E5E5E5',
            borderRadius: '8px',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            transition: 'all 150ms',
            boxSizing: 'border-box',
            padding: 0,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#F5F5F5';
            e.currentTarget.style.borderColor = '#0A0A0A';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#FFFFFF';
            e.currentTarget.style.borderColor = '#E5E5E5';
          }}
          title="Zoom In (+)"
        >
          <Plus size={18} color="#0A0A0A" />
        </button>
        
        <button
          onClick={handleResetView}
          style={{
            width: '40px',
            height: '40px',
            minWidth: '40px',
            minHeight: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#FFFFFF',
            border: '1px solid #E5E5E5',
            borderRadius: '8px',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            transition: 'all 150ms',
            boxSizing: 'border-box',
            padding: 0,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#F5F5F5';
            e.currentTarget.style.borderColor = '#0A0A0A';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#FFFFFF';
            e.currentTarget.style.borderColor = '#E5E5E5';
          }}
          title="Fit to View (F or 0) - Reset zoom and center room"
        >
          <Maximize2 size={16} color="#0A0A0A" />
        </button>
        
        {/* Zoom percentage display (read-only) */}
        <div
          style={{
            width: '40px',
            height: '40px',
            minWidth: '40px',
            minHeight: '40px',
            maxWidth: '40px',
            maxHeight: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#FAFAFA',
            border: '1px solid #E5E5E5',
            borderRadius: '8px',
            fontSize: '10px',
            fontWeight: 600,
            color: '#666666',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            userSelect: 'none',
            boxSizing: 'border-box',
            lineHeight: '1',
          }}
          title={`Current zoom: ${Math.round(userZoom * 100)}%`}
        >
          {Math.round(userZoom * 100)}%
        </div>
        
        <button
          onClick={handleZoomOut}
          style={{
            width: '40px',
            height: '40px',
            minWidth: '40px',
            minHeight: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#FFFFFF',
            border: '1px solid #E5E5E5',
            borderRadius: '8px',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            transition: 'all 150ms',
            boxSizing: 'border-box',
            padding: 0,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#F5F5F5';
            e.currentTarget.style.borderColor = '#0A0A0A';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#FFFFFF';
            e.currentTarget.style.borderColor = '#E5E5E5';
          }}
          title="Zoom Out (-)"
        >
          <Minus size={18} color="#0A0A0A" />
        </button>
      </div>
      
      {/* Zoom Tooltip - shows near cursor during Ctrl+Scroll zoom */}
      {showZoomTooltip && (
        <div
          style={{
            position: 'absolute',
            left: `${zoomTooltipPos.x}px`,
            top: `${zoomTooltipPos.y}px`,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            color: 'white',
            padding: '6px 12px',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: '600',
            pointerEvents: 'none',
            zIndex: 1000,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            transition: 'opacity 200ms ease-out',
            opacity: showZoomTooltip ? 1 : 0,
          }}
        >
          {Math.round(userZoom * 100)}%
        </div>
      )}
    </div>
  );
});

RoomCanvas.displayName = 'RoomCanvas';

export default RoomCanvas;
