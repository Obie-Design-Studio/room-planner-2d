import React, { useRef, useEffect, useState } from 'react';
import { Rect, Group, Text, Transformer, Arc, Circle, Path, Line } from 'react-konva';
import { FurnitureItem, RoomConfig } from '@/types';
import { PIXELS_PER_CM, WALL_THICKNESS_PX } from '@/lib/constants';
import { wouldCollide, getItemBoundingBox } from '@/lib/collisionDetection';

// Calculate wall thickness in cm
const WALL_THICKNESS_CM = WALL_THICKNESS_PX / PIXELS_PER_CM; // 5cm
import { 
  ToiletSymbol, 
  SinkSymbol, 
  BedSymbol, 
  SofaSymbol, 
  ChairSymbol, 
  TableSymbol,
  NightstandSymbol,
  DresserSymbol,
  ClosetSymbol,
  DeskSymbol,
  ArmchairSymbol,
  CoffeeTableSymbol,
  TVStandSymbol,
  BookshelfSymbol,
  DiningTableSymbol,
  RefrigeratorSymbol,
  StoveSymbol,
  CounterSymbol,
  FilingCabinetSymbol,
  ShowerSymbol,
  BathtubSymbol,
  WallToiletSymbol,
  TowelDryerSymbol,
  WallSymbol
} from './furnitureSymbols';

function getContrastColor(hexColor: string) {
  const r = parseInt(hexColor.substring(1, 3), 16);
  const g = parseInt(hexColor.substring(3, 5), 16);
  const b = parseInt(hexColor.substring(5, 7), 16);
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  return yiq >= 128 ? '#000000' : '#ffffff';
}

interface FurnitureShapeProps {
  item: FurnitureItem;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onEdit: (id: string) => void;
  onChange: (id: string, updates: Partial<FurnitureItem>) => void;
  onChangeEnd?: (id: string, updates: Partial<FurnitureItem>) => void;
  onDelete: (id: string) => void;
  roomConfig: RoomConfig;
  zoom?: number;
  isDraggable?: boolean;
  onHover?: (itemId: string | null) => void;
  allItems?: FurnitureItem[];
  showLabels?: boolean;
}

const FurnitureShape: React.FC<FurnitureShapeProps> = ({
  item,
  isSelected,
  onSelect,
  onEdit,
  onChange,
  onChangeEnd,
  onDelete,
  roomConfig,
  zoom = 1.0,
  isDraggable = true,
  onHover,
  allItems = [],
  showLabels = false,
}) => {
  const shapeRef = useRef<any>(null);
  const trRef = useRef<any>(null);
  const [isRotateHovered, setIsRotateHovered] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Door/Window/Wall dimensions
  const isDoor = item.type?.toLowerCase() === 'door';
  const isWindow = item.type?.toLowerCase() === 'window';
  const isWall = item.type?.toLowerCase() === 'wall';
  const isWallObject = isDoor || isWindow;
  
  // For doors and windows:
  // - item.width = length along the wall (e.g., 90cm door width)
  // - item.height = actual height (e.g., 210cm door height, or 120cm window height)
  // - thickness = WALL_THICKNESS_CM (fixed at 2.5cm, matches wall thickness)
  
  const doorOrWindowLengthPx = item.width * PIXELS_PER_CM;   // Length along wall (90cm = 360px)
  const wallThicknessPx = WALL_THICKNESS_PX;  // Fixed wall thickness (10px = 2.5cm)
  
  
  // Detect if door is on a vertical wall (left or right)
  const isOnVerticalWall = isWallObject && 
                           (Math.abs(item.x - (-WALL_THICKNESS_CM)) < 1 || 
                            Math.abs(item.x - roomConfig.width) < 1);
  
  // Group dimensions - different for wall objects (doors/windows) vs standard furniture
  // For wall objects: use doorOrWindowLengthPx and wallThicknessPx
  // For standard furniture: use item dimensions directly
  let widthPx: number;
  let heightPx: number;
  
  if (isWallObject) {
    // Doors/Windows - swap dimensions for vertical walls
    widthPx = isOnVerticalWall ? wallThicknessPx : doorOrWindowLengthPx;
    heightPx = isOnVerticalWall ? doorOrWindowLengthPx : wallThicknessPx;
  } else {
    // Standard furniture - use item dimensions
    widthPx = item.width * PIXELS_PER_CM;
    heightPx = item.height * PIXELS_PER_CM;
  }
  
  // For boundary calculations, we need the VISUAL bounding box size after rotation
  const rotation = item.rotation || 0;
  const isRotated90 = rotation === 90 || rotation === 270;
  const visualWidthPx = (!isWallObject && isRotated90) ? heightPx : widthPx;
  const visualHeightPx = (!isWallObject && isRotated90) ? widthPx : heightPx;

  // VISUAL POSITION (Center): 
  // item.x/y represents top-left of the VISUAL (rotated) bounding box
  // Group position is the center of that visual bounding box
  const x = (item.x * PIXELS_PER_CM) + (visualWidthPx / 2);
  const y = (item.y * PIXELS_PER_CM) + (visualHeightPx / 2);

  useEffect(() => {
    // Only attach nodes when selected - Transformer is conditionally rendered
    if (isSelected && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected]);

  const roomWidthPx = roomConfig.width * PIXELS_PER_CM;
  const roomHeightPx = roomConfig.height * PIXELS_PER_CM;

  const isOutsideRoomPx = (bbox: { x: number; y: number; width: number; height: number }) => {
    return (
      // IMPORTANT: calculations are based on the inner edge of the walls (0..room width/height).
      bbox.x < 0 ||
      bbox.y < 0 ||
      bbox.x + bbox.width > roomWidthPx ||
      bbox.y + bbox.height > roomHeightPx
    );
  };

  // Group is positioned at the CENTER of the visual (rotated) bounding box
  // The Group itself is rotated, and content is drawn at original dimensions
  const groupProps = {
    ref: shapeRef,
    id: item.id, // Add ID so Stage can identify clicked items
    x,
    y,
    width: widthPx,
    height: heightPx,
    draggable: isDraggable,
    rotation: isWallObject ? 0 : rotation, // Apply rotation for furniture
    offsetX: widthPx / 2,
    offsetY: heightPx / 2,
    onMouseDown: (e: any) => {
      // Select immediately on mousedown so measurements show during drag
      e.cancelBubble = true;
      onSelect(item.id);
    },
    onTouchStart: (e: any) => {
      // Select immediately on touch so measurements show during drag (mobile)
      e.cancelBubble = true;
      onSelect(item.id);
    },
    onClick: (e: any) => {
      e.cancelBubble = true;
      onSelect(item.id);
    },
    onTap: (e: any) => {
      e.cancelBubble = true;
      onSelect(item.id);
    },
    onDblClick: (e: any) => {
      e.cancelBubble = true;
      onSelect(item.id);
      onEdit(item.id);
    },
    onDblTap: (e: any) => {
      e.cancelBubble = true;
      onSelect(item.id);
      onEdit(item.id);
    },
    onMouseEnter: () => {
      setIsHovered(true);
      if (onHover) onHover(item.id);
    },
    onMouseLeave: () => {
      setIsHovered(false);
      if (onHover) onHover(null);
    },
    onDragMove: (e: any) => {
      // 1. Get current mouse position (Visual Center)
      const currentCenterX = e.target.x();
      const currentCenterY = e.target.y();

      let finalXCm = 0;
      let finalYCm = 0;
      let finalRotation = item.rotation;
      
      // Store previous position for collision detection
      const prevXCm = item.x;
      const prevYCm = item.y;

      if (isWallObject) {
        // --- STRICT WALL LOCKING ---
        // Use RAW dimensions (not swapped) for consistent calculations
        // doorOrWindowLengthPx = door length (90cm), wallThicknessPx = wall thickness (5cm)
        
        const distLeft = currentCenterX;
        const distRight = Math.abs(roomWidthPx - currentCenterX);
        const distTop = currentCenterY;
        const distBottom = Math.abs(roomHeightPx - currentCenterY);

        const minDist = Math.min(distLeft, distRight, distTop, distBottom);

        if (minDist === distTop) {
          // LOCK TO TOP WALL (horizontal door)
          finalRotation = item.rotation || 0;
          finalYCm = -WALL_THICKNESS_CM;
          
          // For horizontal walls: width = doorLength, height = wallThick
          const clampedX = Math.max(0, Math.min(currentCenterX - doorOrWindowLengthPx / 2, roomWidthPx - doorOrWindowLengthPx));
          finalXCm = Math.round(clampedX / PIXELS_PER_CM);
          
          e.target.y(-WALL_THICKNESS_CM * PIXELS_PER_CM + wallThicknessPx / 2);
          e.target.x(clampedX + doorOrWindowLengthPx / 2);
          e.target.rotation(0);
        } 
        else if (minDist === distBottom) {
          // LOCK TO BOTTOM WALL (horizontal door)
          finalRotation = item.rotation || 0;
          finalYCm = roomConfig.height;
          
          const clampedX = Math.max(0, Math.min(currentCenterX - doorOrWindowLengthPx / 2, roomWidthPx - doorOrWindowLengthPx));
          finalXCm = Math.round(clampedX / PIXELS_PER_CM);

          e.target.y(roomHeightPx + wallThicknessPx / 2);
          e.target.x(clampedX + doorOrWindowLengthPx / 2);
          e.target.rotation(0);
        } 
        else if (minDist === distLeft) {
          // LOCK TO LEFT WALL (vertical door)
          finalRotation = item.rotation || 0;
          finalXCm = -WALL_THICKNESS_CM;
          
          // For vertical walls: width = wallThick, height = doorLength
          const clampedY = Math.max(0, Math.min(currentCenterY - doorOrWindowLengthPx / 2, roomHeightPx - doorOrWindowLengthPx));
          finalYCm = Math.round(clampedY / PIXELS_PER_CM);

          e.target.x(-WALL_THICKNESS_CM * PIXELS_PER_CM + wallThicknessPx / 2);
          e.target.y(clampedY + doorOrWindowLengthPx / 2);
          e.target.rotation(0);  // Don't rotate group, rendering handles orientation
        } 
        else if (minDist === distRight) {
          // LOCK TO RIGHT WALL (vertical door)
          finalRotation = item.rotation || 0;
          finalXCm = roomConfig.width;
          
          const clampedY = Math.max(0, Math.min(currentCenterY - doorOrWindowLengthPx / 2, roomHeightPx - doorOrWindowLengthPx));
          finalYCm = Math.round(clampedY / PIXELS_PER_CM);

          e.target.x(roomWidthPx + wallThicknessPx / 2);
          e.target.y(clampedY + doorOrWindowLengthPx / 2);
          e.target.rotation(0);  // Don't rotate group, rendering handles orientation
        }
      } else {
        // Standard Drag for Furniture - constrain to room bounds
        // Use visual dimensions (after rotation) for boundary calculation
        
        // Calculate top-left based on center position and visual dimensions
        const topLeftX = currentCenterX - visualWidthPx / 2;
        const topLeftY = currentCenterY - visualHeightPx / 2;
        
        // Furniture must stay inside the inner room (grid area), not overlap walls
        // Inner room starts at WALL_THICKNESS_PX/2 and ends at roomSize - WALL_THICKNESS_PX/2
        const innerRoomMinX = WALL_THICKNESS_PX / 2;
        const innerRoomMinY = WALL_THICKNESS_PX / 2;
        const innerRoomMaxX = roomWidthPx - WALL_THICKNESS_PX / 2;
        const innerRoomMaxY = roomHeightPx - WALL_THICKNESS_PX / 2;
        
        // Clamp position to keep furniture fully inside inner room (grid area)
        let clampedTopLeftX = Math.max(innerRoomMinX, Math.min(topLeftX, innerRoomMaxX - visualWidthPx));
        let clampedTopLeftY = Math.max(innerRoomMinY, Math.min(topLeftY, innerRoomMaxY - visualHeightPx));
        
        // SNAP TO WALLS AND INNER WALLS: If within 5cm (snap threshold), snap to it
        const SNAP_THRESHOLD_CM = 5;
        const SNAP_THRESHOLD_PX = SNAP_THRESHOLD_CM * PIXELS_PER_CM;
        
        // Calculate distances to outer walls (from furniture edges to inner wall edges)
        const distToLeftWall = clampedTopLeftX - innerRoomMinX;
        const distToTopWall = clampedTopLeftY - innerRoomMinY;
        const distToRightWall = innerRoomMaxX - (clampedTopLeftX + visualWidthPx);
        const distToBottomWall = innerRoomMaxY - (clampedTopLeftY + visualHeightPx);
        
        // Snap to outer walls
        if (distToLeftWall > 0 && distToLeftWall <= SNAP_THRESHOLD_PX) {
          clampedTopLeftX = innerRoomMinX;
        }
        if (distToTopWall > 0 && distToTopWall <= SNAP_THRESHOLD_PX) {
          clampedTopLeftY = innerRoomMinY;
        }
        if (distToRightWall > 0 && distToRightWall <= SNAP_THRESHOLD_PX) {
          clampedTopLeftX = innerRoomMaxX - visualWidthPx;
        }
        if (distToBottomWall > 0 && distToBottomWall <= SNAP_THRESHOLD_PX) {
          clampedTopLeftY = innerRoomMaxY - visualHeightPx;
        }
        
        // Snap to INNER WALLS (type === 'wall')
        const innerWalls = allItems.filter(i => i.type?.toLowerCase() === 'wall' && i.id !== item.id);
        
        for (const wall of innerWalls) {
          // Calculate wall boundaries in pixels
          const wallX = wall.x * PIXELS_PER_CM;
          const wallY = wall.y * PIXELS_PER_CM;
          const wallWidth = wall.width * PIXELS_PER_CM;
          const wallHeight = wall.height * PIXELS_PER_CM;
          
          // Detect if wall is horizontal or vertical based on dimensions
          const isHorizontalWall = wallWidth > wallHeight;
          
          if (isHorizontalWall) {
            // Horizontal inner wall - snap furniture top or bottom edge to it
            const wallTopEdge = wallY;
            const wallBottomEdge = wallY + wallHeight;
            
            // Check if furniture is horizontally aligned with wall (overlaps in X direction)
            const furnitureRight = clampedTopLeftX + visualWidthPx;
            const wallRight = wallX + wallWidth;
            const xOverlaps = !(furnitureRight < wallX || clampedTopLeftX > wallRight);
            
            if (xOverlaps) {
              // Distance from furniture bottom to wall top
              const distToWallTop = Math.abs((clampedTopLeftY + visualHeightPx) - wallTopEdge);
              if (distToWallTop <= SNAP_THRESHOLD_PX) {
                clampedTopLeftY = wallTopEdge - visualHeightPx;
              }
              
              // Distance from furniture top to wall bottom
              const distToWallBottom = Math.abs(clampedTopLeftY - wallBottomEdge);
              if (distToWallBottom <= SNAP_THRESHOLD_PX) {
                clampedTopLeftY = wallBottomEdge;
              }
            }
          } else {
            // Vertical inner wall - snap furniture left or right edge to it
            const wallLeftEdge = wallX;
            const wallRightEdge = wallX + wallWidth;
            
            // Check if furniture is vertically aligned with wall (overlaps in Y direction)
            const furnitureBottom = clampedTopLeftY + visualHeightPx;
            const wallBottom = wallY + wallHeight;
            const yOverlaps = !(furnitureBottom < wallY || clampedTopLeftY > wallBottom);
            
            if (yOverlaps) {
              // Distance from furniture right to wall left
              const distToWallLeft = Math.abs((clampedTopLeftX + visualWidthPx) - wallLeftEdge);
              if (distToWallLeft <= SNAP_THRESHOLD_PX) {
                clampedTopLeftX = wallLeftEdge - visualWidthPx;
              }
              
              // Distance from furniture left to wall right
              const distToWallRight = Math.abs(clampedTopLeftX - wallRightEdge);
              if (distToWallRight <= SNAP_THRESHOLD_PX) {
                clampedTopLeftX = wallRightEdge;
              }
            }
          }
        }
        
        finalXCm = Math.round(clampedTopLeftX / PIXELS_PER_CM);
        finalYCm = Math.round(clampedTopLeftY / PIXELS_PER_CM);
        
        // Update visual position to clamped center position
        e.target.x(clampedTopLeftX + visualWidthPx / 2);
        e.target.y(clampedTopLeftY + visualHeightPx / 2);
      }

      // Check for collisions with other items
      const testItem: FurnitureItem = {
        ...item,
        x: finalXCm,
        y: finalYCm,
        rotation: finalRotation,
      };

      if (wouldCollide(testItem, allItems, item.id)) {
        // Collision detected - revert to previous position
        const prevCenterX = (prevXCm * PIXELS_PER_CM) + (visualWidthPx / 2);
        const prevCenterY = (prevYCm * PIXELS_PER_CM) + (visualHeightPx / 2);
        e.target.x(prevCenterX);
        e.target.y(prevCenterY);
        return; // Don't call onChange
      }

      // Sync State
      onChange(item.id, { 
        x: finalXCm, 
        y: finalYCm,
        rotation: finalRotation
      });
    },
    onDragEnd: (e: any) => {
      if (isWallObject) return;

      // Save to history after drag ends
      if (onChangeEnd) {
        const node = e.target;
        // Use visual dimensions (accounts for rotation) not raw dimensions
        const topLeftX = node.x() - visualWidthPx / 2;
        const topLeftY = node.y() - visualHeightPx / 2;
        onChangeEnd(item.id, {
          x: Math.round(topLeftX / PIXELS_PER_CM),
          y: Math.round(topLeftY / PIXELS_PER_CM),
        });
      }
    },
    onTransformEnd: (e: any) => {
      const node = shapeRef.current;
      const scaleX = node.scaleX();
      const scaleY = node.scaleY();
      
      // Calculate the old dimensions before resetting scale
      const oldWidthPx = widthPx;
      const oldHeightPx = heightPx;
      
      // Get the current center position BEFORE any changes
      const currentCenterX = node.x();
      const currentCenterY = node.y();
      
      // Calculate the OLD top-left position (before resize)
      const oldTopLeftX = currentCenterX - (oldWidthPx / 2);
      const oldTopLeftY = currentCenterY - (oldHeightPx / 2);
      
      // Reset scale
      node.scaleX(1);
      node.scaleY(1);
      
      let newWidthCm = Math.round((widthPx * scaleX) / PIXELS_PER_CM);
      let newHeightCm = Math.round((heightPx * scaleY) / PIXELS_PER_CM);
      
      // For doors and windows, lock height to wall thickness
      if (isWallObject) {
        newHeightCm = WALL_THICKNESS_CM;
      }
      
      // Rotation handling - snap to 90-degree increments for all items
      let newRotation = Math.round(node.rotation());
      
      // For windows: no rotation allowed, always keep at current rotation
      if (item.type?.toLowerCase() === 'window') {
        newRotation = item.rotation || 0;
      } else {
        // For all other items (doors and furniture): snap to 90-degree increments
        newRotation = Math.round(newRotation / 90) * 90;
        newRotation = newRotation % 360;
        if (newRotation < 0) newRotation += 360;
      }
      
      const newWidthPx = newWidthCm * PIXELS_PER_CM;
      const newHeightPx = newHeightCm * PIXELS_PER_CM;
      
      // KEEP TOP-LEFT CORNER FIXED: Use the old top-left position
      // This prevents the furniture from jumping during resize
      const newTopLeftX = oldTopLeftX;
      const newTopLeftY = oldTopLeftY;
      
      // Calculate the new center position based on fixed top-left
      const newCenterX = newTopLeftX + (newWidthPx / 2);
      const newCenterY = newTopLeftY + (newHeightPx / 2);
      
      // Update the node position to the new center
      node.x(newCenterX);
      node.y(newCenterY);
      
      if (!isWallObject) {
        // Check if new position/rotation would be outside room
        const newXCm = Math.round(newTopLeftX / PIXELS_PER_CM);
        const newYCm = Math.round(newTopLeftY / PIXELS_PER_CM);
        
        // Calculate bounding box after rotation
        const rad = (newRotation * Math.PI) / 180;
        const cos = Math.abs(Math.cos(rad));
        const sin = Math.abs(Math.sin(rad));
        const rotatedWidth = newWidthCm * cos + newHeightCm * sin;
        const rotatedHeight = newWidthCm * sin + newHeightCm * cos;
        
        // Check if furniture would be outside room bounds
        const wouldBeOutside = 
          newXCm < 0 || 
          newYCm < 0 || 
          newXCm + rotatedWidth > roomConfig.width || 
          newYCm + rotatedHeight > roomConfig.height;
        
        if (wouldBeOutside) {
          // Revert the transformation - reset node to original state
          node.rotation(item.rotation || 0);
          node.position({
            x: (item.x * PIXELS_PER_CM) + (widthPx / 2),
            y: (item.y * PIXELS_PER_CM) + (heightPx / 2)
          });
          return; // Don't apply the changes
        }
      }

      const updates = {
        x: Math.round(newTopLeftX / PIXELS_PER_CM),
        y: Math.round(newTopLeftY / PIXELS_PER_CM),
        width: newWidthCm,
        height: newHeightCm,
        rotation: newRotation
      };
      onChange(item.id, updates);
      
      // Save to history after transform ends
      if (onChangeEnd) {
        onChangeEnd(item.id, updates);
      }
    },
  };

  const handleRotateClick = (e: any) => {
    e.cancelBubble = true;
    const currentRotation = item.rotation || 0;
    const nextRotation = (currentRotation + 90) % 360;
    
    // For furniture (not wall objects), recalculate position when rotating
    if (!isWallObject) {
      // Current visual dimensions (may already be swapped due to current rotation)
      const isCurrentlyRotated90 = currentRotation === 90 || currentRotation === 270;
      const currentVisualWidth = isCurrentlyRotated90 ? item.height : item.width;
      const currentVisualHeight = isCurrentlyRotated90 ? item.width : item.height;
      
      // New visual dimensions after rotation
      const isNextRotated90 = nextRotation === 90 || nextRotation === 270;
      const nextVisualWidth = isNextRotated90 ? item.height : item.width;
      const nextVisualHeight = isNextRotated90 ? item.width : item.height;
      
      // Calculate current center position
      const centerX = item.x + currentVisualWidth / 2;
      const centerY = item.y + currentVisualHeight / 2;
      
      // Calculate new top-left position (keeping center the same)
      let newX = centerX - nextVisualWidth / 2;
      let newY = centerY - nextVisualHeight / 2;
      
      // Clamp to room bounds
      newX = Math.max(0, Math.min(newX, roomConfig.width - nextVisualWidth));
      newY = Math.max(0, Math.min(newY, roomConfig.height - nextVisualHeight));
      
      // Apply rotation with adjusted position
      onChange(item.id, { rotation: nextRotation, x: Math.round(newX), y: Math.round(newY) });
      if (onChangeEnd) {
        onChangeEnd(item.id, { rotation: nextRotation, x: Math.round(newX), y: Math.round(newY) });
      }
      return;
    }
    
    onChange(item.id, { rotation: nextRotation });
    if (onChangeEnd) {
      onChangeEnd(item.id, { rotation: nextRotation });
    }
  };

  // Render rotate button helper with smart sizing
  const renderRotateButton = () => {
    // Smart sizing based on furniture size and zoom
    // Smaller furniture = smaller button, larger furniture = larger button
    const minDim = Math.min(widthPx, heightPx);
    const baseRadius = Math.min(32, Math.max(16, minDim * 0.15)); // 15% of smallest dimension
    const zoomAdjustedRadius = baseRadius * Math.sqrt(zoom); // Scale with sqrt of zoom for better feel
    const radius = Math.max(16, Math.min(48, zoomAdjustedRadius)); // Clamp between 16-48px
    
    const iconScale = radius / 24; // Scale icon proportionally
    const strokeWidth = Math.max(2, iconScale * 2.5);
    
    return (
      <Group
        x={widthPx / 2}
        y={heightPx / 2}
        onClick={handleRotateClick}
        onTap={handleRotateClick}
        onMouseEnter={(e: any) => {
          setIsRotateHovered(true);
          const stage = e?.target?.getStage?.();
          if (stage) stage.container().style.cursor = 'pointer';
        }}
        onMouseLeave={(e: any) => {
          setIsRotateHovered(false);
          const stage = e?.target?.getStage?.();
          if (stage) stage.container().style.cursor = 'default';
        }}
      >
        {/* Button background - smart sized */}
        <Circle
          radius={radius}
          fill={isRotateHovered ? '#F5F5F5' : '#FFFFFF'}
          stroke={isRotateHovered ? '#111827' : '#0A0A0A'}
          strokeWidth={strokeWidth}
          shadowColor="rgba(0, 0, 0, 0.18)"
          shadowBlur={isRotateHovered ? radius * 0.5 : radius * 0.4}
          shadowOffset={{ x: 0, y: 2 }}
          shadowOpacity={1}
        />
        {/* Rotate icon (↻) - scaled */}
        <Path
          data={`M 0 ${-9 * iconScale} A ${9 * iconScale} ${9 * iconScale} 0 1 1 ${-7.8 * iconScale} ${4.5 * iconScale} L ${-5.25 * iconScale} ${2.25 * iconScale} M ${-7.8 * iconScale} ${4.5 * iconScale} L ${-10.5 * iconScale} ${2.25 * iconScale}`}
          stroke={isRotateHovered ? '#111827' : '#0A0A0A'}
          strokeWidth={strokeWidth}
          fill="transparent"
          lineCap="round"
          lineJoin="round"
        />
      </Group>
    );
  };

  // RENDER: DOOR
  if (item.type?.toLowerCase() === 'door') {
    // Door Dimensions:
    // - item.width = door width along wall (e.g., 90cm)
    // - item.height = door height floor-to-ceiling (e.g., 210cm) - displayed in UI
    // - thickness = FIXED at WALL_THICKNESS_CM (2.5cm) - NOT editable, matches wall thickness
    // 
    // Door rendering based on rotation:
    // 0° = Left hinge, Inward (swings into room)
    // 90° = Right hinge, Inward (swings into room)
    // 180° = Left hinge, Outward (swings away from room)
    // 270° = Right hinge, Outward (swings away from room)
    
    const rotation = item.rotation || 0;
    const isInward = rotation < 180;
    const isLeftHinge = rotation % 180 === 0;
    
    // Detect which wall the door is on based on item position
    // Top wall: y ≈ -WALL_THICKNESS_CM
    // Left wall: x ≈ -WALL_THICKNESS_CM
    const isOnTopWall = Math.abs(item.y - (-WALL_THICKNESS_CM)) < 1;
    const isOnLeftWall = Math.abs(item.x - (-WALL_THICKNESS_CM)) < 1;
    const isOnBottomWall = Math.abs(item.y - roomConfig.height) < 1;
    const isOnRightWall = Math.abs(item.x - roomConfig.width) < 1;
    
    let frameX, frameY, frameWidth, frameHeight;
    let panelX, panelY, panelWidth, panelHeight;
    let arcX, arcY, arcRotation;
    
    if (isOnTopWall) {
      // HORIZONTAL DOOR ON TOP WALL
      // Group: doorOrWindowLengthPx wide, wallThicknessPx tall
      frameX = 0;
      frameWidth = doorOrWindowLengthPx;
      frameHeight = 5;
      frameY = wallThicknessPx - frameHeight;  // Frame at inner edge of wall
      
      // For top wall: "In" = swings down into room, "Out" = swings up outside room
      // Hinge position: "Left" = left side (x=0), "Right" = right side (x=doorOrWindowLengthPx)
      
      if (rotation === 0) {
        // In + Left: hinge at left, swings down-right into room
        panelX = 0;
        panelY = wallThicknessPx - 5;  // Panel flush with wall, not sticking into room
        panelWidth = 5;
        panelHeight = doorOrWindowLengthPx;
        arcX = 0;
        arcY = wallThicknessPx / 2;  // Hinge at inner edge of wall
        arcRotation = 0;
      } else if (rotation === 90) {
        // In + Right: hinge at right, swings down-left into room
        panelX = doorOrWindowLengthPx - 5;
        panelY = wallThicknessPx - 5;  // Panel flush with wall
        panelWidth = 5;
        panelHeight = doorOrWindowLengthPx;
        arcX = doorOrWindowLengthPx;
        arcY = wallThicknessPx / 2;  // Hinge at inner edge of wall
        arcRotation = 90;
      } else if (rotation === 180) {
        // Out + Left: hinge at left, swings up-right outside room
        panelX = 0;
        panelY = -doorOrWindowLengthPx;
        panelWidth = 5;
        panelHeight = doorOrWindowLengthPx;
        arcX = 0;
        arcY = wallThicknessPx / 2;  // Hinge at inner edge of wall
        arcRotation = 270;
      } else {
        // 270: Out + Right: hinge at right, swings up-left outside room
        panelX = doorOrWindowLengthPx - 5;
        panelY = -doorOrWindowLengthPx;
        panelWidth = 5;
        panelHeight = doorOrWindowLengthPx;
        arcX = doorOrWindowLengthPx;
        arcY = wallThicknessPx / 2;  // Hinge at inner edge of wall
        arcRotation = 180;
      }
    } else if (isOnLeftWall) {
      // VERTICAL DOOR ON LEFT WALL
      // Group: wallThicknessPx wide, doorOrWindowLengthPx tall
      // Frame at inner edge of wall (right edge, against room)
      frameX = wallThicknessPx - 5;
      frameY = 0;
      frameWidth = 5;
      frameHeight = doorOrWindowLengthPx;
      
      // For left wall: "In" = swings right into room, "Out" = swings left outside room
      // Hinge position: "Left" = top (y=0), "Right" = bottom (y=doorOrWindowLengthPx)
      
      if (rotation === 0) {
        // In + Left: hinge at top, swings right-down into room
        panelX = wallThicknessPx - 5;  // Panel flush with wall
        panelY = 0;
        panelWidth = doorOrWindowLengthPx;
        panelHeight = 5;
        arcX = wallThicknessPx / 2;  // Hinge at inner edge of wall
        arcY = 0;
        arcRotation = 0;
      } else if (rotation === 90) {
        // In + Right: hinge at bottom, swings right-up into room
        panelX = wallThicknessPx - 5;  // Panel flush with wall
        panelY = doorOrWindowLengthPx - 5;
        panelWidth = doorOrWindowLengthPx;
        panelHeight = 5;
        arcX = wallThicknessPx / 2;  // Hinge at inner edge of wall
        arcY = doorOrWindowLengthPx;
        arcRotation = 270;
      } else if (rotation === 180) {
        // Out + Left: hinge at top, swings left-down outside room
        panelX = -doorOrWindowLengthPx;
        panelY = 0;
        panelWidth = doorOrWindowLengthPx;
        panelHeight = 5;
        arcX = wallThicknessPx / 2;  // Hinge at inner edge of wall
        arcY = 0;
        arcRotation = 90;
      } else {
        // 270: Out + Right: hinge at bottom, swings left-up outside room
        panelX = -doorOrWindowLengthPx;
        panelY = doorOrWindowLengthPx - 5;
        panelWidth = doorOrWindowLengthPx;
        panelHeight = 5;
        arcX = wallThicknessPx / 2;  // Hinge at inner edge of wall
        arcY = doorOrWindowLengthPx;
        arcRotation = 180;
      }
    } else if (isOnBottomWall) {
      // HORIZONTAL DOOR ON BOTTOM WALL
      // Group: doorOrWindowLengthPx wide, wallThicknessPx tall
      frameWidth = doorOrWindowLengthPx;
      frameHeight = 5;
      frameX = 0;
      frameY = 0;  // Frame at inner edge (top of wall, room side)
      
      // For bottom wall: "In" = swings up into room, "Out" = swings down outside room
      // Hinge position: "Left" = left side (x=0), "Right" = right side (x=doorOrWindowLengthPx)
      
      if (rotation === 0) {
        // In + Left: hinge at left, swings up-right into room
        panelX = 0;
        panelY = -doorOrWindowLengthPx + 5;  // Panel flush with wall
        panelWidth = 5;
        panelHeight = doorOrWindowLengthPx;
        arcX = 0;
        arcY = wallThicknessPx / 2;  // Hinge at inner edge of wall
        arcRotation = 270;
      } else if (rotation === 90) {
        // In + Right: hinge at right, swings up-left into room
        panelX = doorOrWindowLengthPx - 5;
        panelY = -doorOrWindowLengthPx + 5;  // Panel flush with wall
        panelWidth = 5;
        panelHeight = doorOrWindowLengthPx;
        arcX = doorOrWindowLengthPx;
        arcY = wallThicknessPx / 2;  // Hinge at inner edge of wall
        arcRotation = 180;
      } else if (rotation === 180) {
        // Out + Left: hinge at left, swings down-right outside room
        panelX = 0;
        panelY = wallThicknessPx;
        panelWidth = 5;
        panelHeight = doorOrWindowLengthPx;
        arcX = 0;
        arcY = wallThicknessPx / 2;  // Hinge at inner edge of wall
        arcRotation = 0;
      } else {
        // 270: Out + Right: hinge at right, swings down-left outside room
        panelX = doorOrWindowLengthPx - 5;
        panelY = wallThicknessPx;
        panelWidth = 5;
        panelHeight = doorOrWindowLengthPx;
        arcX = doorOrWindowLengthPx;
        arcY = wallThicknessPx / 2;  // Hinge at inner edge of wall
        arcRotation = 90;
      }
    } else if (isOnRightWall) {
      // VERTICAL DOOR ON RIGHT WALL
      // Group: wallThicknessPx wide, doorOrWindowLengthPx tall
      // Frame at inner edge (left edge, room side)
      frameWidth = 5;
      frameHeight = doorOrWindowLengthPx;
      frameX = 0;
      frameY = 0;
      
      // For right wall: "In" = swings left into room, "Out" = swings right outside room
      // Hinge position: "Left" = top (y=0), "Right" = bottom (y=doorOrWindowLengthPx)
      
      if (rotation === 0) {
        // In + Left: hinge at top, swings left-down into room
        panelX = -doorOrWindowLengthPx + 5;  // Panel flush with wall
        panelY = 0;
        panelWidth = doorOrWindowLengthPx;
        panelHeight = 5;
        arcX = wallThicknessPx / 2;  // Hinge at inner edge of wall
        arcY = 0;
        arcRotation = 90;
      } else if (rotation === 90) {
        // In + Right: hinge at bottom, swings left-up into room
        panelX = -doorOrWindowLengthPx + 5;  // Panel flush with wall
        panelY = doorOrWindowLengthPx - 5;
        panelWidth = doorOrWindowLengthPx;
        panelHeight = 5;
        arcX = wallThicknessPx / 2;  // Hinge at inner edge of wall
        arcY = doorOrWindowLengthPx;
        arcRotation = 180;
      } else if (rotation === 180) {
        // Out + Left: hinge at top, swings right-down outside room
        panelX = wallThicknessPx;
        panelY = 0;
        panelWidth = doorOrWindowLengthPx;
        panelHeight = 5;
        arcX = wallThicknessPx / 2;  // Hinge at inner edge of wall
        arcY = 0;
        arcRotation = 0;
      } else {
        // 270: Out + Right: hinge at bottom, swings right-up outside room
        panelX = wallThicknessPx;
        panelY = doorOrWindowLengthPx - 5;
        panelWidth = doorOrWindowLengthPx;
        panelHeight = 5;
        arcX = wallThicknessPx / 2;  // Hinge at inner edge of wall
        arcY = doorOrWindowLengthPx;
        arcRotation = 270;
      }
    } else {
      // Default to top wall rendering if position is ambiguous
      frameWidth = doorOrWindowLengthPx;
      frameHeight = 5;
      frameX = 0;
      frameY = wallThicknessPx - 2.5;
      panelX = isLeftHinge ? 0 : doorOrWindowLengthPx - 5;
      panelY = isInward ? wallThicknessPx : -doorOrWindowLengthPx;
      panelWidth = 5;
      panelHeight = doorOrWindowLengthPx;
      arcX = isLeftHinge ? 0 : doorOrWindowLengthPx;
      arcY = wallThicknessPx / 2;  // Hinge at inner edge of wall
      arcRotation = rotation === 0 ? 0 : rotation === 90 ? 90 : rotation === 180 ? 270 : 180;
    }
    
    // Calculate door blade line endpoints
    // The blade should extend from the hinge point (arcX, arcY) for doorOrWindowLengthPx
    // in the direction perpendicular to the arc's initial rotation
    let bladePoints: number[] = [];
    
    if (isOnTopWall) {
      // Top wall: blade is vertical
      if (rotation === 0 || rotation === 90) {
        // Swings into room (downward from wall)
        bladePoints = [arcX, arcY, arcX, arcY + doorOrWindowLengthPx];
      } else {
        // Swings outside room (upward from wall)
        bladePoints = [arcX, arcY, arcX, arcY - doorOrWindowLengthPx];
      }
    } else if (isOnBottomWall) {
      // Bottom wall: blade is vertical but direction reversed from top wall
      if (rotation === 0 || rotation === 90) {
        // Swings into room (upward from wall, INTO the room which is above the bottom wall)
        bladePoints = [arcX, arcY, arcX, arcY - doorOrWindowLengthPx];
      } else {
        // Swings outside room (downward from wall, OUTSIDE the room which is below the bottom wall)
        bladePoints = [arcX, arcY, arcX, arcY + doorOrWindowLengthPx];
      }
    } else if (isOnLeftWall) {
      // Left wall: blade is horizontal
      if (rotation === 0 || rotation === 90) {
        // Swings into room (rightward from wall)
        bladePoints = [arcX, arcY, arcX + doorOrWindowLengthPx, arcY];
      } else {
        // Swings outside room (leftward from wall)
        bladePoints = [arcX, arcY, arcX - doorOrWindowLengthPx, arcY];
      }
    } else if (isOnRightWall) {
      // Right wall: blade is horizontal but direction reversed from left wall
      if (rotation === 0 || rotation === 90) {
        // Swings into room (leftward from wall, INTO the room which is to the left of the right wall)
        bladePoints = [arcX, arcY, arcX - doorOrWindowLengthPx, arcY];
      } else {
        // Swings outside room (rightward from wall, OUTSIDE the room which is to the right of the right wall)
        bladePoints = [arcX, arcY, arcX + doorOrWindowLengthPx, arcY];
      }
    } else {
      // Fallback: assume top wall behavior
      if (rotation === 0 || rotation === 90) {
        bladePoints = [arcX, arcY, arcX, arcY + doorOrWindowLengthPx];
      } else {
        bladePoints = [arcX, arcY, arcX, arcY - doorOrWindowLengthPx];
      }
    }
    
    const hitAreaPadding = 30; // 30px padding for easier clicking
    return (
      <>
        <Group {...groupProps}>
          {/* Invisible larger hit area for easier selection */}
          <Rect 
            x={-hitAreaPadding / 2} 
            y={-hitAreaPadding / 2} 
            width={widthPx + hitAreaPadding} 
            height={heightPx + hitAreaPadding} 
            opacity={0}
          />
          
          {/* Door blade - thin line from hinge point showing the door in open position */}
          <Line
            points={bladePoints}
            stroke="#8B4513"
            strokeWidth={4}
            lineCap="round"
          />
          
          {/* Door swing arc - shows curved path of swing only (no straight lines from hinge) */}
          <Arc 
            innerRadius={doorOrWindowLengthPx - 2}
            outerRadius={doorOrWindowLengthPx} 
            angle={90} 
            stroke="#333333" 
            strokeWidth={2}
            dash={[6, 4]} 
            rotation={arcRotation}
            x={arcX}
            y={arcY}
          />
          
          {/* Centered Rotate Button - only show when selected */}
          {isSelected && renderRotateButton()}
        </Group>
      </>
    );
  }

  // RENDER: WINDOW
  if (item.type?.toLowerCase() === 'window') {
    // Window Dimensions:
    // - item.width = window width along wall (e.g., 120cm)
    // - item.height = window height (e.g., 120cm) - actual visible window height
    // - item.floorDistance = distance from floor (e.g., 90cm)
    // - thickness = FIXED at WALL_THICKNESS_CM (2.5cm) - NOT editable, matches wall thickness
    
    // Visual window dimensions (what user sees)
    const windowWidthPx = item.width * PIXELS_PER_CM;  // Width along wall
    const windowHeightPx = item.height * PIXELS_PER_CM; // Actual window height
    
    // Detect which wall the window is on
    const isOnTopWall = Math.abs(item.y - (-WALL_THICKNESS_CM)) < 1;
    const isOnLeftWall = Math.abs(item.x - (-WALL_THICKNESS_CM)) < 1;
    const isOnBottomWall = Math.abs(item.y - roomConfig.height) < 1;
    const isOnRightWall = Math.abs(item.x - roomConfig.width) < 1;
    
    const hitAreaPadding = 30; // 30px padding for easier clicking
    
    return (
      <>
        <Group {...groupProps}>
          {/* Invisible larger hit area for easier selection */}
          <Rect 
            x={-hitAreaPadding / 2} 
            y={-hitAreaPadding / 2} 
            width={widthPx + hitAreaPadding} 
            height={heightPx + hitAreaPadding} 
            opacity={0}
          />
          
          {/* Window frame (in wall) - thin slice showing window embedded in wall */}
          <Rect 
            width={widthPx} 
            height={heightPx} 
            fill="#e0f7fa" 
            stroke="black" 
            strokeWidth={2} 
          />
          
          {/* Window divider (cross-section view) */}
          <Rect 
            x={0} 
            y={heightPx / 2 - 1} 
            width={widthPx} 
            height={2} 
            fill="#81d4fa" 
          />
          
          {/* Measurement labels removed - now shown by MeasurementOverlay in blue */}
        </Group>
      </>
    );
  }

  // RENDER: STANDARD ITEM (using architectural symbols)
  const renderSymbol = () => {
    const typeLower = item.type?.toLowerCase() || '';
    switch (typeLower) {
      case 'toilet':
        return <ToiletSymbol widthCm={item.width} heightCm={item.height} />;
      case 'sink':
        return <SinkSymbol widthCm={item.width} heightCm={item.height} />;
      case 'bed':
        return <BedSymbol widthCm={item.width} heightCm={item.height} />;
      case 'sofa':
        return <SofaSymbol widthCm={item.width} heightCm={item.height} />;
      case 'chair':
        return <ChairSymbol widthCm={item.width} heightCm={item.height} />;
      case 'table':
        return <TableSymbol widthCm={item.width} heightCm={item.height} />;
      case 'nightstand':
        return <NightstandSymbol widthCm={item.width} heightCm={item.height} />;
      case 'dresser':
        return <DresserSymbol widthCm={item.width} heightCm={item.height} />;
      case 'closet':
        return <ClosetSymbol widthCm={item.width} heightCm={item.height} />;
      case 'desk':
        return <DeskSymbol widthCm={item.width} heightCm={item.height} />;
      case 'armchair':
        return <ArmchairSymbol widthCm={item.width} heightCm={item.height} />;
      case 'coffee table':
        return <CoffeeTableSymbol widthCm={item.width} heightCm={item.height} />;
      case 'tv stand':
        return <TVStandSymbol widthCm={item.width} heightCm={item.height} />;
      case 'bookshelf':
        return <BookshelfSymbol widthCm={item.width} heightCm={item.height} />;
      case 'dining table':
        return <DiningTableSymbol widthCm={item.width} heightCm={item.height} />;
      case 'refrigerator':
        return <RefrigeratorSymbol widthCm={item.width} heightCm={item.height} />;
      case 'stove':
        return <StoveSymbol widthCm={item.width} heightCm={item.height} />;
      case 'counter':
        return <CounterSymbol widthCm={item.width} heightCm={item.height} />;
      case 'filing cabinet':
        return <FilingCabinetSymbol widthCm={item.width} heightCm={item.height} />;
      case 'shower':
        return <ShowerSymbol widthCm={item.width} heightCm={item.height} />;
      case 'bathtub':
        return <BathtubSymbol widthCm={item.width} heightCm={item.height} />;
      case 'wall toilet':
        return <WallToiletSymbol widthCm={item.width} heightCm={item.height} />;
      case 'towel dryer':
        return <TowelDryerSymbol widthCm={item.width} heightCm={item.height} />;
      case 'wall':
        return <WallSymbol widthCm={item.width} heightCm={item.height} />;
      default:
        // Fallback: simple rectangle
        return (
          <Rect
            width={widthPx}
            height={heightPx}
            x={0}
            y={0}
            fill="#F5F5F5"
            stroke="#333333"
            strokeWidth={2}
          />
        );
    }
  };

  // Format furniture name for display
  const getFurnitureName = () => {
    const name = item.type || 'Item';
    // Capitalize first letter of each word
    return name.split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  };

  return (
    <>
      <Group {...groupProps}>
        {/* Render furniture symbol */}
        {renderSymbol()}
        
        {/* Hover Overlay - Only show when hovering AND not selected */}
        {!isWallObject && !isWall && (isHovered || showLabels) && !isSelected && (() => {
          const labelText = getFurnitureName();
          
          // Smart font sizing with proper padding - accounts for shape orientation
          const MIN_PADDING_PX = 16; // Minimum padding on each side
          const MIN_FONT_SIZE = 16;
          const MAX_FONT_SIZE = 48;
          
          // Use ACTUAL dimensions (widthPx x heightPx are already the visual dimensions after rotation)
          const availableWidth = widthPx - (2 * MIN_PADDING_PX);
          const availableHeight = heightPx - (2 * MIN_PADDING_PX);
          
          // Start with base font size: use 30% of the SMALLER dimension
          let fontSize = Math.min(availableWidth, availableHeight) * 0.3;
          
          // Check if text fits horizontally (approximate width: fontSize * length * 0.55)
          const estimatedTextWidth = fontSize * labelText.length * 0.55;
          
          // If text is too wide, scale down to fit
          if (estimatedTextWidth > availableWidth) {
            fontSize = availableWidth / (labelText.length * 0.55);
          }
          
          // Don't let font get taller than available height
          if (fontSize > availableHeight * 0.8) {
            fontSize = availableHeight * 0.8;
          }
          
          // Apply zoom factor for consistency (sqrt gives gentler scaling)
          fontSize = fontSize * Math.sqrt(zoom);
          
          // Clamp to min/max
          fontSize = Math.max(MIN_FONT_SIZE, Math.min(MAX_FONT_SIZE, fontSize));
          
          return (
            <>
              {/* Strong semi-opaque overlay - covers everything */}
              <Rect
                x={0}
                y={0}
                width={widthPx}
                height={heightPx}
                fill="rgba(0, 0, 0, 0.85)"
                strokeEnabled={false}
                listening={false}
              />
              {/* Bold border highlight */}
              <Rect
                x={0}
                y={0}
                width={widthPx}
                height={heightPx}
                stroke="rgba(255, 255, 255, 0.3)"
                strokeWidth={4}
                fill="transparent"
                listening={false}
              />
              {/* Label - properly centered with padding */}
              <Text
                text={labelText}
                x={MIN_PADDING_PX}
                y={(heightPx - fontSize) / 2}
                fontSize={fontSize}
                fontFamily="-apple-system, BlinkMacSystemFont, 'Inter', 'SF Pro Display', sans-serif"
                fontStyle="700"
                fill="#FFFFFF"
                align="center"
                verticalAlign="middle"
                width={availableWidth}
                listening={false}
                ellipsis={true}
              />
            </>
          );
        })()}
        
        {/* Centered Rotate Button - renders on top, slightly faded when hovering */}
        {isSelected && (
          <Group opacity={isHovered ? 0.7 : 1}>
            {renderRotateButton()}
          </Group>
        )}
      </Group>
      {isSelected && isDraggable && !isWall && (
        <Transformer
          ref={trRef}
          boundBoxFunc={(oldBox, newBox) => {
            if (Math.abs(newBox.width) < 5 || Math.abs(newBox.height) < 5) return oldBox;
            return newBox;
          }}
          flipEnabled={false}
          rotateEnabled={false}
          anchorSize={10}
          anchorStroke="#0A0A0A"
          anchorStrokeWidth={2}
          anchorFill="#FFFFFF"
          anchorCornerRadius={2}
        />
      )}
    </>
  );
};

export default FurnitureShape;
