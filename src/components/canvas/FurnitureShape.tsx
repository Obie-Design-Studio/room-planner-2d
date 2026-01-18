import React, { useRef, useEffect, useState } from 'react';
import { Rect, Group, Text, Transformer, Arc, Circle, Path, Line } from 'react-konva';
import { FurnitureItem, RoomConfig } from '@/types';
import { PIXELS_PER_CM, WALL_THICKNESS_PX } from '@/lib/constants';

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
}) => {
  const shapeRef = useRef<any>(null);
  const trRef = useRef<any>(null);
  const [isRotateHovered, setIsRotateHovered] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Door physical dimensions (never change)
  const doorLengthPx = item.width * PIXELS_PER_CM;   // Door length (90cm = 180px)
  const wallThickPx = item.height * PIXELS_PER_CM;  // Wall thickness (5cm = 10px)
  
  const isWallObject = item.type?.toLowerCase() === 'window' || item.type?.toLowerCase() === 'door';
  
  // Detect if door is on a vertical wall (left or right)
  const isOnVerticalWall = isWallObject && 
                           (Math.abs(item.x - (-WALL_THICKNESS_CM)) < 1 || 
                            Math.abs(item.x - roomConfig.width) < 1);
  
  // Group dimensions - swap for vertical walls so the bounding box is correct
  const widthPx = isOnVerticalWall ? wallThickPx : doorLengthPx;
  const heightPx = isOnVerticalWall ? doorLengthPx : wallThickPx;
  
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

      if (isWallObject) {
        // --- STRICT WALL LOCKING ---
        // Use RAW dimensions (not swapped) for consistent calculations
        // doorLengthPx = door length (90cm), wallThickPx = wall thickness (5cm)
        
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
          const clampedX = Math.max(0, Math.min(currentCenterX - doorLengthPx / 2, roomWidthPx - doorLengthPx));
          finalXCm = Math.round(clampedX / PIXELS_PER_CM);
          
          e.target.y(-WALL_THICKNESS_CM * PIXELS_PER_CM + wallThickPx / 2);
          e.target.x(clampedX + doorLengthPx / 2);
          e.target.rotation(0);
        } 
        else if (minDist === distBottom) {
          // LOCK TO BOTTOM WALL (horizontal door)
          finalRotation = item.rotation || 0;
          finalYCm = roomConfig.height;
          
          const clampedX = Math.max(0, Math.min(currentCenterX - doorLengthPx / 2, roomWidthPx - doorLengthPx));
          finalXCm = Math.round(clampedX / PIXELS_PER_CM);

          e.target.y(roomHeightPx + wallThickPx / 2);
          e.target.x(clampedX + doorLengthPx / 2);
          e.target.rotation(0);
        } 
        else if (minDist === distLeft) {
          // LOCK TO LEFT WALL (vertical door)
          finalRotation = item.rotation || 0;
          finalXCm = -WALL_THICKNESS_CM;
          
          // For vertical walls: width = wallThick, height = doorLength
          const clampedY = Math.max(0, Math.min(currentCenterY - doorLengthPx / 2, roomHeightPx - doorLengthPx));
          finalYCm = Math.round(clampedY / PIXELS_PER_CM);

          e.target.x(-WALL_THICKNESS_CM * PIXELS_PER_CM + wallThickPx / 2);
          e.target.y(clampedY + doorLengthPx / 2);
          e.target.rotation(0);  // Don't rotate group, rendering handles orientation
        } 
        else if (minDist === distRight) {
          // LOCK TO RIGHT WALL (vertical door)
          finalRotation = item.rotation || 0;
          finalXCm = roomConfig.width;
          
          const clampedY = Math.max(0, Math.min(currentCenterY - doorLengthPx / 2, roomHeightPx - doorLengthPx));
          finalYCm = Math.round(clampedY / PIXELS_PER_CM);

          e.target.x(roomWidthPx + wallThickPx / 2);
          e.target.y(clampedY + doorLengthPx / 2);
          e.target.rotation(0);  // Don't rotate group, rendering handles orientation
        }
      } else {
        // Standard Drag for Furniture - constrain to room bounds
        // Use visual dimensions (after rotation) for boundary calculation
        
        // Calculate top-left based on center position and visual dimensions
        const topLeftX = currentCenterX - visualWidthPx / 2;
        const topLeftY = currentCenterY - visualHeightPx / 2;
        
        // Clamp position to keep furniture inside room
        const clampedTopLeftX = Math.max(0, Math.min(topLeftX, roomWidthPx - visualWidthPx));
        const clampedTopLeftY = Math.max(0, Math.min(topLeftY, roomHeightPx - visualHeightPx));
        
        finalXCm = Math.round(clampedTopLeftX / PIXELS_PER_CM);
        finalYCm = Math.round(clampedTopLeftY / PIXELS_PER_CM);
        
        // Update visual position to clamped center position
        e.target.x(clampedTopLeftX + visualWidthPx / 2);
        e.target.y(clampedTopLeftY + visualHeightPx / 2);
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
      
      const newCenterX = node.x();
      const newCenterY = node.y();
      const newWidthPx = newWidthCm * PIXELS_PER_CM;
      const newHeightPx = newHeightCm * PIXELS_PER_CM;
      const newTopLeftX = newCenterX - (newWidthPx / 2);
      const newTopLeftY = newCenterY - (newHeightPx / 2);
      
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
      // Group: doorLengthPx wide, wallThickPx tall
      frameX = 0;
      frameWidth = doorLengthPx;
      frameHeight = 5;
      frameY = wallThickPx - frameHeight;  // Frame at inner edge of wall
      
      // For top wall: "In" = swings down into room, "Out" = swings up outside room
      // Hinge position: "Left" = left side (x=0), "Right" = right side (x=doorLengthPx)
      
      if (rotation === 0) {
        // In + Left: hinge at left, swings down-right into room
        panelX = 0;
        panelY = wallThickPx - 5;  // Panel flush with wall, not sticking into room
        panelWidth = 5;
        panelHeight = doorLengthPx;
        arcX = 0;
        arcY = wallThickPx / 2;  // Hinge at inner edge of wall
        arcRotation = 0;
      } else if (rotation === 90) {
        // In + Right: hinge at right, swings down-left into room
        panelX = doorLengthPx - 5;
        panelY = wallThickPx - 5;  // Panel flush with wall
        panelWidth = 5;
        panelHeight = doorLengthPx;
        arcX = doorLengthPx;
        arcY = wallThickPx / 2;  // Hinge at inner edge of wall
        arcRotation = 90;
      } else if (rotation === 180) {
        // Out + Left: hinge at left, swings up-right outside room
        panelX = 0;
        panelY = -doorLengthPx;
        panelWidth = 5;
        panelHeight = doorLengthPx;
        arcX = 0;
        arcY = wallThickPx / 2;  // Hinge at inner edge of wall
        arcRotation = 270;
      } else {
        // 270: Out + Right: hinge at right, swings up-left outside room
        panelX = doorLengthPx - 5;
        panelY = -doorLengthPx;
        panelWidth = 5;
        panelHeight = doorLengthPx;
        arcX = doorLengthPx;
        arcY = wallThickPx / 2;  // Hinge at inner edge of wall
        arcRotation = 180;
      }
    } else if (isOnLeftWall) {
      // VERTICAL DOOR ON LEFT WALL
      // Group: wallThickPx wide, doorLengthPx tall
      // Frame at inner edge of wall (right edge, against room)
      frameX = wallThickPx - 5;
      frameY = 0;
      frameWidth = 5;
      frameHeight = doorLengthPx;
      
      // For left wall: "In" = swings right into room, "Out" = swings left outside room
      // Hinge position: "Left" = top (y=0), "Right" = bottom (y=doorLengthPx)
      
      if (rotation === 0) {
        // In + Left: hinge at top, swings right-down into room
        panelX = wallThickPx - 5;  // Panel flush with wall
        panelY = 0;
        panelWidth = doorLengthPx;
        panelHeight = 5;
        arcX = wallThickPx / 2;  // Hinge at inner edge of wall
        arcY = 0;
        arcRotation = 0;
      } else if (rotation === 90) {
        // In + Right: hinge at bottom, swings right-up into room
        panelX = wallThickPx - 5;  // Panel flush with wall
        panelY = doorLengthPx - 5;
        panelWidth = doorLengthPx;
        panelHeight = 5;
        arcX = wallThickPx / 2;  // Hinge at inner edge of wall
        arcY = doorLengthPx;
        arcRotation = 270;
      } else if (rotation === 180) {
        // Out + Left: hinge at top, swings left-down outside room
        panelX = -doorLengthPx;
        panelY = 0;
        panelWidth = doorLengthPx;
        panelHeight = 5;
        arcX = wallThickPx / 2;  // Hinge at inner edge of wall
        arcY = 0;
        arcRotation = 90;
      } else {
        // 270: Out + Right: hinge at bottom, swings left-up outside room
        panelX = -doorLengthPx;
        panelY = doorLengthPx - 5;
        panelWidth = doorLengthPx;
        panelHeight = 5;
        arcX = wallThickPx / 2;  // Hinge at inner edge of wall
        arcY = doorLengthPx;
        arcRotation = 180;
      }
    } else if (isOnBottomWall) {
      // HORIZONTAL DOOR ON BOTTOM WALL
      // Group: doorLengthPx wide, wallThickPx tall
      frameWidth = doorLengthPx;
      frameHeight = 5;
      frameX = 0;
      frameY = 0;  // Frame at inner edge (top of wall, room side)
      
      // For bottom wall: "In" = swings up into room, "Out" = swings down outside room
      // Hinge position: "Left" = left side (x=0), "Right" = right side (x=doorLengthPx)
      
      if (rotation === 0) {
        // In + Left: hinge at left, swings up-right into room
        panelX = 0;
        panelY = -doorLengthPx + 5;  // Panel flush with wall
        panelWidth = 5;
        panelHeight = doorLengthPx;
        arcX = 0;
        arcY = wallThickPx / 2;  // Hinge at inner edge of wall
        arcRotation = 270;
      } else if (rotation === 90) {
        // In + Right: hinge at right, swings up-left into room
        panelX = doorLengthPx - 5;
        panelY = -doorLengthPx + 5;  // Panel flush with wall
        panelWidth = 5;
        panelHeight = doorLengthPx;
        arcX = doorLengthPx;
        arcY = wallThickPx / 2;  // Hinge at inner edge of wall
        arcRotation = 180;
      } else if (rotation === 180) {
        // Out + Left: hinge at left, swings down-right outside room
        panelX = 0;
        panelY = wallThickPx;
        panelWidth = 5;
        panelHeight = doorLengthPx;
        arcX = 0;
        arcY = wallThickPx / 2;  // Hinge at inner edge of wall
        arcRotation = 0;
      } else {
        // 270: Out + Right: hinge at right, swings down-left outside room
        panelX = doorLengthPx - 5;
        panelY = wallThickPx;
        panelWidth = 5;
        panelHeight = doorLengthPx;
        arcX = doorLengthPx;
        arcY = wallThickPx / 2;  // Hinge at inner edge of wall
        arcRotation = 90;
      }
    } else if (isOnRightWall) {
      // VERTICAL DOOR ON RIGHT WALL
      // Group: wallThickPx wide, doorLengthPx tall
      // Frame at inner edge (left edge, room side)
      frameWidth = 5;
      frameHeight = doorLengthPx;
      frameX = 0;
      frameY = 0;
      
      // For right wall: "In" = swings left into room, "Out" = swings right outside room
      // Hinge position: "Left" = top (y=0), "Right" = bottom (y=doorLengthPx)
      
      if (rotation === 0) {
        // In + Left: hinge at top, swings left-down into room
        panelX = -doorLengthPx + 5;  // Panel flush with wall
        panelY = 0;
        panelWidth = doorLengthPx;
        panelHeight = 5;
        arcX = wallThickPx / 2;  // Hinge at inner edge of wall
        arcY = 0;
        arcRotation = 90;
      } else if (rotation === 90) {
        // In + Right: hinge at bottom, swings left-up into room
        panelX = -doorLengthPx + 5;  // Panel flush with wall
        panelY = doorLengthPx - 5;
        panelWidth = doorLengthPx;
        panelHeight = 5;
        arcX = wallThickPx / 2;  // Hinge at inner edge of wall
        arcY = doorLengthPx;
        arcRotation = 180;
      } else if (rotation === 180) {
        // Out + Left: hinge at top, swings right-down outside room
        panelX = wallThickPx;
        panelY = 0;
        panelWidth = doorLengthPx;
        panelHeight = 5;
        arcX = wallThickPx / 2;  // Hinge at inner edge of wall
        arcY = 0;
        arcRotation = 0;
      } else {
        // 270: Out + Right: hinge at bottom, swings right-up outside room
        panelX = wallThickPx;
        panelY = doorLengthPx - 5;
        panelWidth = doorLengthPx;
        panelHeight = 5;
        arcX = wallThickPx / 2;  // Hinge at inner edge of wall
        arcY = doorLengthPx;
        arcRotation = 270;
      }
    } else {
      // Default to top wall rendering if position is ambiguous
      frameWidth = doorLengthPx;
      frameHeight = 5;
      frameX = 0;
      frameY = wallThickPx - 2.5;
      panelX = isLeftHinge ? 0 : doorLengthPx - 5;
      panelY = isInward ? wallThickPx : -doorLengthPx;
      panelWidth = 5;
      panelHeight = doorLengthPx;
      arcX = isLeftHinge ? 0 : doorLengthPx;
      arcY = wallThickPx / 2;  // Hinge at inner edge of wall
      arcRotation = rotation === 0 ? 0 : rotation === 90 ? 90 : rotation === 180 ? 270 : 180;
    }
    
    // Calculate door blade line endpoints
    // The blade should extend from the hinge point (arcX, arcY) for doorLengthPx
    // in the direction perpendicular to the arc's initial rotation
    let bladePoints: number[] = [];
    
    if (isOnTopWall || isOnBottomWall) {
      // Horizontal walls: door blade is vertical
      // Blade extends from hinge point (arcX, arcY) downward (into room) or upward (outside room)
      if (rotation === 0 || rotation === 90) {
        // Swings into room (downward from wall)
        bladePoints = [arcX, arcY, arcX, arcY + doorLengthPx];
      } else {
        // Swings outside room (upward from wall)
        bladePoints = [arcX, arcY, arcX, arcY - doorLengthPx];
      }
    } else {
      // Vertical walls: door blade is horizontal
      // Blade extends from hinge point (arcX, arcY) rightward (into room) or leftward (outside room)
      if (rotation === 0 || rotation === 90) {
        // Swings into room (rightward from wall)
        bladePoints = [arcX, arcY, arcX + doorLengthPx, arcY];
      } else {
        // Swings outside room (leftward from wall)
        bladePoints = [arcX, arcY, arcX - doorLengthPx, arcY];
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
            strokeWidth={3}
            lineCap="round"
          />
          
          {/* Door swing arc - shows path of swing */}
          <Arc 
            innerRadius={0}
            outerRadius={doorLengthPx} 
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
        {isSelected && isDraggable && (
          <Transformer
            ref={trRef}
            boundBoxFunc={(oldBox, newBox) => {
              // Lock height to wall thickness, only allow width changes
              if (Math.abs(newBox.width) < 5) return oldBox;
              return {
                ...newBox,
                height: WALL_THICKNESS_CM * PIXELS_PER_CM,
              };
            }}
            flipEnabled={false}
            rotateEnabled={false}
            enabledAnchors={['middle-left', 'middle-right']}
            anchorSize={10}
            anchorStroke="#0A0A0A"
            anchorStrokeWidth={2}
            anchorFill="#FFFFFF"
            anchorCornerRadius={2}
          />
        )}
      </>
    );
  }

  // RENDER: WINDOW
  if (item.type?.toLowerCase() === 'window') {
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
          {/* Visible window */}
          <Rect width={widthPx} height={heightPx} fill="#e0f7fa" stroke="black" strokeWidth={1} />
          <Rect x={0} y={heightPx / 2 - 2} width={widthPx} height={4} fill="#81d4fa" />
        </Group>
        {isSelected && isDraggable && (
          <Transformer
            ref={trRef}
            boundBoxFunc={(oldBox, newBox) => {
              // Lock height to wall thickness, only allow width changes
              if (Math.abs(newBox.width) < 5) return oldBox;
              return {
                ...newBox,
                height: WALL_THICKNESS_CM * PIXELS_PER_CM, // Lock height to wall thickness
              };
            }}
            flipEnabled={false}
            rotateEnabled={false} // Disable rotation for windows
            enabledAnchors={['middle-left', 'middle-right']} // Only allow horizontal resizing
            anchorSize={10}
            anchorStroke="#0A0A0A"
            anchorStrokeWidth={2}
            anchorFill="#FFFFFF"
            anchorCornerRadius={2}
          />
        )}
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
    const name = item.name || item.type || 'Item';
    // Capitalize first letter of each word
    return name.split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  };

  return (
    <>
      <Group {...groupProps}>
        {renderSymbol()}
        
        {/* Hover Overlay - Only show when hovering AND not selected */}
        {!isWallObject && isHovered && !isSelected && (() => {
          const labelText = getFurnitureName();
          // Smart font sizing based on furniture size and zoom
          const baseFontSize = Math.min(widthPx, heightPx) * 0.25;
          const fontSize = Math.max(20, Math.min(56, baseFontSize * Math.sqrt(zoom)));
          
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
              {/* Label container with counter-rotation */}
              <Group
                x={widthPx / 2}
                y={heightPx / 2}
                rotation={-rotation}
              >
                {/* Large centered label - always horizontal */}
                <Text
                  text={labelText}
                  x={0}
                  y={0}
                  offsetX={Math.max(widthPx, heightPx) / 2}
                  offsetY={fontSize / 2}
                  fontSize={fontSize}
                  fontFamily="-apple-system, BlinkMacSystemFont, 'Inter', 'SF Pro Display', sans-serif"
                  fontStyle="700"
                  fill="#FFFFFF"
                  align="center"
                  width={Math.max(widthPx, heightPx)}
                  listening={false}
                />
              </Group>
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
      {isSelected && isDraggable && (
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
