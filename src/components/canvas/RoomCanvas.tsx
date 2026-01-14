import React, { useRef, useEffect, useState } from "react";
import { Stage, Layer, Rect, Group } from "react-konva";
import { PIXELS_PER_CM, WALL_THICKNESS_PX } from "@/lib/constants";
import { RoomConfig, FurnitureItem } from "@/types";
import FurnitureShape from "./FurnitureShape";
import MeasurementOverlay from "./MeasurementOverlay";
import GridBackground from "./GridBackground";
import { Plus, Minus, Maximize2 } from "lucide-react";

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
  viewportWidth: number;
  viewportHeight: number;
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
  viewportWidth,
  viewportHeight,
}: RoomCanvasProps) {
  const stageRef = useRef<any>(null);
  
  // Zoom state: 1.0 = 100%, range 0.1 to 5.0
  const [userZoom, setUserZoom] = useState(1.0);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  
  // Pan state
  const [isPanning, setIsPanning] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const lastPointerPos = useRef({ x: 0, y: 0 });

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
  let minX = -WALL_THICKNESS_PX / 2 - buffer;
  let minY = -WALL_THICKNESS_PX / 2 - buffer;
  let maxX = roomPxWidth + WALL_THICKNESS_PX / 2 + buffer;
  let maxY = roomPxHeight + WALL_THICKNESS_PX / 2 + buffer;
  
  const contentWidth = maxX - minX;
  const contentHeight = maxY - minY;
  const padding = 200;
  
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

  // Mouse wheel handler - zoom with Ctrl/Cmd, pan otherwise
  const handleWheel = (e: any) => {
    e.evt.preventDefault();
    
    const stage = stageRef.current;
    if (!stage) return;

    const ctrlPressed = e.evt.ctrlKey || e.evt.metaKey;

    if (ctrlPressed) {
      // Zoom with Ctrl/Cmd + scroll - keep content center fixed
      const scaleBy = 1.1;
      const direction = e.evt.deltaY > 0 ? -1 : 1;
      
      const oldZoom = userZoom;
      const newZoom = direction > 0 ? userZoom * scaleBy : userZoom / scaleBy;
      const clampedZoom = Math.max(0.25, Math.min(3.0, newZoom));
      
      if (clampedZoom === oldZoom) return; // Already at limit
      
      const oldScale = baseScale * oldZoom;
      const newScale = baseScale * clampedZoom;
      
      // Calculate old and new base center offsets
      const oldBaseCenterOffsetX = viewportWidth / 2 - (contentWidth / 2 + minX) * oldScale;
      const oldBaseCenterOffsetY = viewportHeight / 2 - (contentHeight / 2 + minY) * oldScale;
      const newBaseCenterOffsetX = viewportWidth / 2 - (contentWidth / 2 + minX) * newScale;
      const newBaseCenterOffsetY = viewportHeight / 2 - (contentHeight / 2 + minY) * newScale;
      
      // Find what world point is at viewport center
      const centerPoint = { x: viewportWidth / 2, y: viewportHeight / 2 };
      const worldPointAtCenter = {
        x: (centerPoint.x - stagePos.x - oldBaseCenterOffsetX) / oldScale,
        y: (centerPoint.y - stagePos.y - oldBaseCenterOffsetY) / oldScale,
      };
      
      // Calculate new stagePos to keep that world point at center
      const newPos = {
        x: centerPoint.x - worldPointAtCenter.x * newScale - newBaseCenterOffsetX,
        y: centerPoint.y - worldPointAtCenter.y * newScale - newBaseCenterOffsetY,
      };
      
      setUserZoom(clampedZoom);
      setStagePos(newPos);
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
        
        const clampedX = minPosX <= maxPosX ? Math.max(minPosX, Math.min(maxPosX, newX)) : newX;
        const clampedY = minPosY <= maxPosY ? Math.max(minPosY, Math.min(maxPosY, newY)) : newY;
        
        return {
          x: clampedX,
          y: clampedY,
        };
      });
    }
  };

  // Zoom controls (25% - 300%)
  const handleZoomIn = () => {
    setUserZoom((prev) => Math.min(3.0, prev * 1.2));
  };

  const handleZoomOut = () => {
    setUserZoom((prev) => Math.max(0.25, prev / 1.2));
  };

  const handleResetView = () => {
    setUserZoom(1.0);
    setStagePos({ x: 0, y: 0 }); // Reset pan to center
  };

  // Keyboard shortcut for fit to view
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // F key = Fit to View (reset zoom and pan)
      if (e.key === 'f' || e.key === 'F') {
        // Don't trigger if typing in input field
        const target = e.target as HTMLElement;
        const isInputField = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
        if (!isInputField) {
          e.preventDefault();
          handleResetView();
        }
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
        
        // Clamp position - ensure min <= max for valid range
        const clampedX = minPosX <= maxPosX ? Math.max(minPosX, Math.min(maxPosX, newX)) : newX;
        const clampedY = minPosY <= maxPosY ? Math.max(minPosY, Math.min(maxPosY, newY)) : newY;
        
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
            <Rect
              x={-WALL_THICKNESS_PX / 2}
              y={-WALL_THICKNESS_PX / 2}
              width={roomConfig.width * PIXELS_PER_CM + WALL_THICKNESS_PX}
              height={roomConfig.height * PIXELS_PER_CM + WALL_THICKNESS_PX}
              fill="white"
              stroke="black"
              strokeWidth={WALL_THICKNESS_PX}
            />
            <GridBackground width={roomConfig.width} height={roomConfig.height} />
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
                  />
                );
              }
              return null;
            })}
          </Group>
        </Layer>
      </Stage>
      
      {/* Zoom Controls */}
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
          title="Zoom In"
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
          title="Fit to View (F) - Reset zoom and center room"
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
          title="Zoom Out"
        >
          <Minus size={20} color="#0A0A0A" />
        </button>
      </div>
    </div>
  );
}
