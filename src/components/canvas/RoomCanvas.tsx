import React, { useRef, useEffect, useState } from "react";
import { Stage, Layer, Rect, Group, Line, Text } from "react-konva";
import { PIXELS_PER_CM, WALL_THICKNESS_PX } from "@/lib/constants";
import { RoomConfig, FurnitureItem } from "@/types";
import { type Unit, formatMeasurement } from "@/lib/unitConversion";
import FurnitureShape from "./FurnitureShape";
import MeasurementOverlay from "./MeasurementOverlay";
import GridBackground from "./GridBackground";
import { Plus, Minus, Maximize2, Ruler, Eye } from "lucide-react";

interface RoomCanvasProps {
  roomConfig: RoomConfig;
  items: FurnitureItem[];
  onItemChange: (id: string, updates: Partial<FurnitureItem>) => void;
  onItemChangeEnd?: (id: string, updates: Partial<FurnitureItem>) => void;
  onItemDelete: (id: string) => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onEdit: (id: string) => void;
  showAllMeasurements: boolean;
  showLabels: boolean;
  onToggleMeasurements?: () => void;
  onToggleLabels?: () => void;
  measurementUnit?: Unit;
  viewportWidth: number;
  viewportHeight: number;
  onStageRef?: (stage: any) => void;
}

export default function RoomCanvas({
  roomConfig,
  items,
  onItemChange,
  onItemChangeEnd,
  onItemDelete,
  selectedId,
  onSelect,
  onEdit,
  showAllMeasurements,
  showLabels,
  onToggleMeasurements,
  onToggleLabels,
  measurementUnit = 'cm',
  viewportWidth,
  viewportHeight,
  onStageRef,
}: RoomCanvasProps) {
  const stageRef = useRef<any>(null);

  // Expose stage ref to parent via callback
  useEffect(() => {
    if (stageRef.current && onStageRef) {
      onStageRef(stageRef.current);
    }
  }, [onStageRef]);
  
  // Zoom state: 1.0 = 100%, range 0.1 to 3.0
  const [userZoom, setUserZoom] = useState(1.0);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  
  // Pan state
  const [isPanning, setIsPanning] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const lastPointerPos = useRef({ x: 0, y: 0 });
  
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
  const buffer = maxDoorLength; // Buffer extends in all directions
  const dimensionLabelSpace = 160; // Space for room dimension labels (line at -100 + modest text space)
  let minX = -WALL_THICKNESS_PX / 2 - buffer - dimensionLabelSpace;
  let minY = -WALL_THICKNESS_PX / 2 - buffer - dimensionLabelSpace;
  let maxX = roomPxWidth + WALL_THICKNESS_PX / 2 + buffer;
  let maxY = roomPxHeight + WALL_THICKNESS_PX / 2 + buffer;
  
  const contentWidth = maxX - minX;
  const contentHeight = maxY - minY;
  
  // Dynamic padding that scales with zoom level
  // At 100% zoom (userZoom=1.0): 100px padding - room uses maximum space
  // At 300% zoom (userZoom=3.0): 300px padding - ensures edge visibility
  // This keeps content away from edges at all zoom levels while maximizing space
  const basePadding = 100;
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

  // Elastic boundary helper - allows ±100px over-pan with resistance
  const ELASTIC_MARGIN = 100;
  const applyElasticBoundary = (value: number, min: number, max: number): number => {
    if (min > max) return value; // Invalid range, no clamping
    
    if (value < min) {
      // Over-panned to the left/top - apply elastic resistance
      const overpan = min - value;
      if (overpan > ELASTIC_MARGIN) {
        return min - ELASTIC_MARGIN; // Hard limit at margin
      }
      return value; // Allow within elastic margin
    } else if (value > max) {
      // Over-panned to the right/bottom - apply elastic resistance
      const overpan = value - max;
      if (overpan > ELASTIC_MARGIN) {
        return max + ELASTIC_MARGIN; // Hard limit at margin
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
        
        let minPosX, maxPosX, minPosY, maxPosY;
        
        if (contentScreenWidth <= viewportWidth) {
          minPosX = viewportWidth - (baseCenterOffsetX + maxX * scale);
          maxPosX = -(baseCenterOffsetX + minX * scale);
        } else {
          maxPosX = -(baseCenterOffsetX + minX * scale);
          minPosX = viewportWidth - (baseCenterOffsetX + maxX * scale);
        }
        
        if (contentScreenHeight <= viewportHeight) {
          minPosY = viewportHeight - (baseCenterOffsetY + maxY * scale);
          maxPosY = -(baseCenterOffsetY + minY * scale);
        } else {
          maxPosY = -(baseCenterOffsetY + minY * scale);
          minPosY = viewportHeight - (baseCenterOffsetY + maxY * scale);
        }
        
        // Apply elastic boundaries (±100px over-pan allowed)
        const clampedX = applyElasticBoundary(newX, minPosX, maxPosX);
        const clampedY = applyElasticBoundary(newY, minPosY, maxPosY);
        
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

    // Check if clicking on empty space or if Space key is pressed
    const clickedOnEmpty = e.target === stage || e.target.getLayer;
    
    if (clickedOnEmpty || isSpacePressed) {
      setIsPanning(true);
      const pos = stage.getPointerPosition();
      lastPointerPos.current = pos;
      
      // Change cursor
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
        
        // Boundary logic:
        // - If content is smaller than viewport, allow free movement within extra space
        // - If content is larger than viewport, only allow panning to see all parts
        
        let minPosX, maxPosX, minPosY, maxPosY;
        
        if (contentScreenWidth <= viewportWidth) {
          // Content fits horizontally - allow positioning anywhere that keeps it fully visible
          // Right constraint: baseCenterOffsetX + maxX * scale + stagePos.x <= viewportWidth
          minPosX = viewportWidth - (baseCenterOffsetX + maxX * scale);
          // Left constraint: baseCenterOffsetX + minX * scale + stagePos.x >= 0
          maxPosX = -(baseCenterOffsetX + minX * scale);
        } else {
          // Content larger than viewport - clamp to edges
          maxPosX = -(baseCenterOffsetX + minX * scale); // Can pan left
          minPosX = viewportWidth - (baseCenterOffsetX + maxX * scale); // Can pan right
        }
        
        if (contentScreenHeight <= viewportHeight) {
          // Content fits vertically
          minPosY = viewportHeight - (baseCenterOffsetY + maxY * scale);
          maxPosY = -(baseCenterOffsetY + minY * scale);
        } else {
          // Content larger than viewport
          maxPosY = -(baseCenterOffsetY + minY * scale);
          minPosY = viewportHeight - (baseCenterOffsetY + maxY * scale);
        }
        
        // Apply elastic boundaries (±100px over-pan allowed)
        const clampedX = applyElasticBoundary(newX, minPosX, maxPosX);
        const clampedY = applyElasticBoundary(newY, minPosY, maxPosY);
        
        return {
          x: clampedX,
          y: clampedY,
        };
      });

      lastPointerPos.current = pos;
    }
  };

  const handleMouseUp = () => {
    const stage = stageRef.current;
    if (isPanning) {
      setIsPanning(false);
      if (stage) {
        stage.container().style.cursor = isSpacePressed ? 'grab' : 'default';
      }
    }
  };

  // Space key detection for pan mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
            {/* Room floor (white background) */}
            <Rect
              x={0}
              y={0}
              width={roomConfig.width * PIXELS_PER_CM}
              height={roomConfig.height * PIXELS_PER_CM}
              fill="white"
            />
            
            {/* Walls with gaps for doors */}
            {(() => {
              // Find all doors and group by wall
              const doors = items.filter(item => item.type?.toLowerCase() === 'door');
              
              const WALL_THICKNESS_CM = WALL_THICKNESS_PX / PIXELS_PER_CM;
              
              // Helper to get doors on a specific wall
              const getDoorsOnWall = (wall: 'top' | 'bottom' | 'left' | 'right') => {
                return doors.filter(door => {
                  const isOnTop = Math.abs(door.y - (-WALL_THICKNESS_CM)) < 1;
                  const isOnBottom = Math.abs(door.y - roomConfig.height) < 1;
                  const isOnLeft = Math.abs(door.x - (-WALL_THICKNESS_CM)) < 1;
                  const isOnRight = Math.abs(door.x - roomConfig.width) < 1;
                  
                  if (wall === 'top') return isOnTop;
                  if (wall === 'bottom') return isOnBottom;
                  if (wall === 'left') return isOnLeft;
                  if (wall === 'right') return isOnRight;
                  return false;
                });
              };
              
              // Render wall segments with gaps for doors
              const renderWallSegments = () => {
                const segments: React.ReactNode[] = [];
                const roomWidthPx = roomConfig.width * PIXELS_PER_CM;
                const roomHeightPx = roomConfig.height * PIXELS_PER_CM;
                
                // TOP WALL
                const topDoors = getDoorsOnWall('top').sort((a, b) => a.x - b.x);
                if (topDoors.length === 0) {
                  // No doors - draw full wall
                  segments.push(
                    <Rect
                      key="wall-top"
                      x={-WALL_THICKNESS_PX / 2}
                      y={-WALL_THICKNESS_PX / 2}
                      width={roomWidthPx + WALL_THICKNESS_PX}
                      height={WALL_THICKNESS_PX}
                      fill="black"
                    />
                  );
                } else {
                  // Draw wall segments around doors
                  let currentX = -WALL_THICKNESS_PX / 2;
                  topDoors.forEach((door, i) => {
                    const doorStartPx = door.x * PIXELS_PER_CM;
                    const doorEndPx = (door.x + door.width) * PIXELS_PER_CM;
                    
                    // Segment before door
                    if (doorStartPx > currentX + WALL_THICKNESS_PX / 2) {
                      segments.push(
                        <Rect
                          key={`wall-top-${i}-before`}
                          x={currentX}
                          y={-WALL_THICKNESS_PX / 2}
                          width={doorStartPx - currentX + WALL_THICKNESS_PX / 2}
                          height={WALL_THICKNESS_PX}
                          fill="black"
                        />
                      );
                    }
                    currentX = doorEndPx - WALL_THICKNESS_PX / 2;
                  });
                  // Final segment after last door
                  if (currentX < roomWidthPx + WALL_THICKNESS_PX / 2) {
                    segments.push(
                      <Rect
                        key="wall-top-end"
                        x={currentX}
                        y={-WALL_THICKNESS_PX / 2}
                        width={roomWidthPx + WALL_THICKNESS_PX / 2 - currentX}
                        height={WALL_THICKNESS_PX}
                        fill="black"
                      />
                    );
                  }
                }
                
                // BOTTOM WALL
                const bottomDoors = getDoorsOnWall('bottom').sort((a, b) => a.x - b.x);
                if (bottomDoors.length === 0) {
                  segments.push(
                    <Rect
                      key="wall-bottom"
                      x={-WALL_THICKNESS_PX / 2}
                      y={roomHeightPx - WALL_THICKNESS_PX / 2}
                      width={roomWidthPx + WALL_THICKNESS_PX}
                      height={WALL_THICKNESS_PX}
                      fill="black"
                    />
                  );
                } else {
                  let currentX = -WALL_THICKNESS_PX / 2;
                  bottomDoors.forEach((door, i) => {
                    const doorStartPx = door.x * PIXELS_PER_CM;
                    const doorEndPx = (door.x + door.width) * PIXELS_PER_CM;
                    
                    if (doorStartPx > currentX + WALL_THICKNESS_PX / 2) {
                      segments.push(
                        <Rect
                          key={`wall-bottom-${i}-before`}
                          x={currentX}
                          y={roomHeightPx - WALL_THICKNESS_PX / 2}
                          width={doorStartPx - currentX + WALL_THICKNESS_PX / 2}
                          height={WALL_THICKNESS_PX}
                          fill="black"
                        />
                      );
                    }
                    currentX = doorEndPx - WALL_THICKNESS_PX / 2;
                  });
                  if (currentX < roomWidthPx + WALL_THICKNESS_PX / 2) {
                    segments.push(
                      <Rect
                        key="wall-bottom-end"
                        x={currentX}
                        y={roomHeightPx - WALL_THICKNESS_PX / 2}
                        width={roomWidthPx + WALL_THICKNESS_PX / 2 - currentX}
                        height={WALL_THICKNESS_PX}
                        fill="black"
                      />
                    );
                  }
                }
                
                // LEFT WALL
                const leftDoors = getDoorsOnWall('left').sort((a, b) => a.y - b.y);
                if (leftDoors.length === 0) {
                  segments.push(
                    <Rect
                      key="wall-left"
                      x={-WALL_THICKNESS_PX / 2}
                      y={-WALL_THICKNESS_PX / 2}
                      width={WALL_THICKNESS_PX}
                      height={roomHeightPx + WALL_THICKNESS_PX}
                      fill="black"
                    />
                  );
                } else {
                  let currentY = -WALL_THICKNESS_PX / 2;
                  leftDoors.forEach((door, i) => {
                    const doorStartPx = door.y * PIXELS_PER_CM;
                    const doorEndPx = (door.y + door.width) * PIXELS_PER_CM;
                    
                    if (doorStartPx > currentY + WALL_THICKNESS_PX / 2) {
                      segments.push(
                        <Rect
                          key={`wall-left-${i}-before`}
                          x={-WALL_THICKNESS_PX / 2}
                          y={currentY}
                          width={WALL_THICKNESS_PX}
                          height={doorStartPx - currentY + WALL_THICKNESS_PX / 2}
                          fill="black"
                        />
                      );
                    }
                    currentY = doorEndPx - WALL_THICKNESS_PX / 2;
                  });
                  if (currentY < roomHeightPx + WALL_THICKNESS_PX / 2) {
                    segments.push(
                      <Rect
                        key="wall-left-end"
                        x={-WALL_THICKNESS_PX / 2}
                        y={currentY}
                        width={WALL_THICKNESS_PX}
                        height={roomHeightPx + WALL_THICKNESS_PX / 2 - currentY}
                        fill="black"
                      />
                    );
                  }
                }
                
                // RIGHT WALL
                const rightDoors = getDoorsOnWall('right').sort((a, b) => a.y - b.y);
                if (rightDoors.length === 0) {
                  segments.push(
                    <Rect
                      key="wall-right"
                      x={roomWidthPx - WALL_THICKNESS_PX / 2}
                      y={-WALL_THICKNESS_PX / 2}
                      width={WALL_THICKNESS_PX}
                      height={roomHeightPx + WALL_THICKNESS_PX}
                      fill="black"
                    />
                  );
                } else {
                  let currentY = -WALL_THICKNESS_PX / 2;
                  rightDoors.forEach((door, i) => {
                    const doorStartPx = door.y * PIXELS_PER_CM;
                    const doorEndPx = (door.y + door.width) * PIXELS_PER_CM;
                    
                    if (doorStartPx > currentY + WALL_THICKNESS_PX / 2) {
                      segments.push(
                        <Rect
                          key={`wall-right-${i}-before`}
                          x={roomWidthPx - WALL_THICKNESS_PX / 2}
                          y={currentY}
                          width={WALL_THICKNESS_PX}
                          height={doorStartPx - currentY + WALL_THICKNESS_PX / 2}
                          fill="black"
                        />
                      );
                    }
                    currentY = doorEndPx - WALL_THICKNESS_PX / 2;
                  });
                  if (currentY < roomHeightPx + WALL_THICKNESS_PX / 2) {
                    segments.push(
                      <Rect
                        key="wall-right-end"
                        x={roomWidthPx - WALL_THICKNESS_PX / 2}
                        y={currentY}
                        width={WALL_THICKNESS_PX}
                        height={roomHeightPx + WALL_THICKNESS_PX / 2 - currentY}
                        fill="black"
                      />
                    );
                  }
                }
                
                return segments;
              };
              
              return renderWallSegments();
            })()}
            <GridBackground width={roomConfig.width} height={roomConfig.height} />
            
            {/* Room Dimensions - Always visible on top and left walls */}
            <Group>
              {(() => {
                // Dynamic font size that scales with zoom (36-64px range)
                const baseFontSize = 48;
                const dimensionFontSize = Math.max(36, Math.min(64, baseFontSize + (userZoom - 1) * 12));
                
                // Top wall text
                const topText = formatMeasurement(roomConfig.width, measurementUnit);
                const topTextWidth = topText.length * dimensionFontSize * 0.6;
                const topY = -100 - 15 - dimensionFontSize;
                
                // Left wall text
                const leftText = formatMeasurement(roomConfig.height, measurementUnit);
                const leftTextWidth = leftText.length * dimensionFontSize * 0.6;
                const leftCenterY = roomConfig.height * PIXELS_PER_CM / 2;
                
                return (
                  <>
                    {/* Top wall - Room width */}
                    <Line 
                      points={[0, -100, roomConfig.width * PIXELS_PER_CM, -100]} 
                      stroke="#0a0a0a" 
                      strokeWidth={2} 
                    />
                    <Line points={[0, -105, 0, -95]} stroke="#0a0a0a" strokeWidth={2} />
                    <Line points={[roomConfig.width * PIXELS_PER_CM, -105, roomConfig.width * PIXELS_PER_CM, -95]} stroke="#0a0a0a" strokeWidth={2} />
                    <Text 
                      x={roomConfig.width * PIXELS_PER_CM / 2 - topTextWidth / 2} 
                      y={topY}
                      text={topText}
                      fontSize={dimensionFontSize}
                      fontFamily="Arial, sans-serif"
                      fontStyle="bold"
                      fill="#0a0a0a"
                    />
                    
                    {/* Left wall - Room height */}
                    <Line 
                      points={[-100, 0, -100, roomConfig.height * PIXELS_PER_CM]} 
                      stroke="#0a0a0a" 
                      strokeWidth={2} 
                    />
                    <Line points={[-105, 0, -95, 0]} stroke="#0a0a0a" strokeWidth={2} />
                    <Line points={[-105, roomConfig.height * PIXELS_PER_CM, -95, roomConfig.height * PIXELS_PER_CM]} stroke="#0a0a0a" strokeWidth={2} />
                    <Text 
                      x={-100 - 20 - leftTextWidth}
                      y={leftCenterY - dimensionFontSize / 2}
                      text={leftText}
                      fontSize={dimensionFontSize}
                      fontFamily="Arial, sans-serif"
                      fontStyle="bold"
                      fill="#0a0a0a"
                    />
                  </>
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
                allItems={items}
                showLabels={showLabels}
              />
            ))}
            {items.map((item) => {
              if (item.id === selectedId || showAllMeasurements || showLabels) {
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
                    showLabels={showLabels}
                  />
                );
              }
              return null;
            })}
          </Group>
        </Layer>
      </Stage>
      
      {/* Scale Reference - Fixed at bottom-left of viewport */}
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
        {/* Scale box - 10cm reference */}
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
      
      {/* Measurement Toggle & Zoom Controls */}
      <div
        style={{
          position: 'absolute',
          bottom: '20px',
          right: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          zIndex: 10,
        }}
      >
        {/* Show Labels Toggle */}
        {onToggleLabels && (
          <button
            onClick={onToggleLabels}
            style={{
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: showLabels ? '#0A0A0A' : '#FFFFFF',
              border: showLabels ? 'none' : '1px solid #E5E5E5',
              borderRadius: '8px',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
              transition: 'all 150ms',
            }}
            onMouseEnter={(e) => {
              if (!showLabels) {
                e.currentTarget.style.backgroundColor = '#F5F5F5';
                e.currentTarget.style.borderColor = '#0A0A0A';
              }
            }}
            onMouseLeave={(e) => {
              if (!showLabels) {
                e.currentTarget.style.backgroundColor = '#FFFFFF';
                e.currentTarget.style.borderColor = '#E5E5E5';
              }
            }}
            title={showLabels ? 'Hide Labels' : 'Show Labels'}
          >
            <Eye size={20} color={showLabels ? '#FFFFFF' : '#0A0A0A'} />
          </button>
        )}
        
        {/* Show All Measurements Toggle */}
        {onToggleMeasurements && (
          <button
            onClick={onToggleMeasurements}
            style={{
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: showAllMeasurements ? '#0A0A0A' : '#FFFFFF',
              border: showAllMeasurements ? 'none' : '1px solid #E5E5E5',
              borderRadius: '8px',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
              transition: 'all 150ms',
            }}
            onMouseEnter={(e) => {
              if (!showAllMeasurements) {
                e.currentTarget.style.backgroundColor = '#F5F5F5';
                e.currentTarget.style.borderColor = '#0A0A0A';
              }
            }}
            onMouseLeave={(e) => {
              if (!showAllMeasurements) {
                e.currentTarget.style.backgroundColor = '#FFFFFF';
                e.currentTarget.style.borderColor = '#E5E5E5';
              }
            }}
            title={showAllMeasurements ? 'Hide All Measurements' : 'Show All Measurements'}
          >
            <Ruler size={20} color={showAllMeasurements ? '#FFFFFF' : '#0A0A0A'} />
          </button>
        )}
        
        <button
          onClick={handleZoomIn}
          style={{
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#FFFFFF',
            border: '1px solid #E5E5E5',
            borderRadius: '8px',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
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
          title="Zoom In (+)"
        >
          <Plus size={20} color="#0A0A0A" />
        </button>
        
        <button
          onClick={handleResetView}
          style={{
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#FFFFFF',
            border: '1px solid #E5E5E5',
            borderRadius: '8px',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
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
          title="Fit to View (F or 0) - Reset zoom and center room"
        >
          <Maximize2 size={18} color="#0A0A0A" />
        </button>
        
        <button
          onClick={handleResetView}
          style={{
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#FFFFFF',
            border: '1px solid #E5E5E5',
            borderRadius: '8px',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            fontSize: '12px',
            fontWeight: 600,
            color: '#0A0A0A',
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
          title="Fit to View (F) - Reset zoom and center room"
        >
          {Math.round(userZoom * 100)}%
        </button>
        
        <button
          onClick={handleZoomOut}
          style={{
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#FFFFFF',
            border: '1px solid #E5E5E5',
            borderRadius: '8px',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
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
          title="Zoom Out (-)"
        >
          <Minus size={20} color="#0A0A0A" />
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
}