import React, { useRef, useEffect } from 'react';
import { Rect, Group, Text, Transformer, Arc } from 'react-konva';
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
  TowelDryerSymbol
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
}) => {
  const shapeRef = useRef<any>(null);
  const trRef = useRef<any>(null);

  // Door physical dimensions (never change)
  const doorLengthPx = item.width * PIXELS_PER_CM;   // Door length (90cm = 180px)
  const wallThickPx = item.height * PIXELS_PER_CM;  // Wall thickness (5cm = 10px)
  
  // Detect if door is on a vertical wall (left or right)
  const isOnVerticalWall = (item.type?.toLowerCase() === 'door' || item.type?.toLowerCase() === 'window') && 
                           (Math.abs(item.x - (-WALL_THICKNESS_CM)) < 1 || 
                            Math.abs(item.x - roomConfig.width) < 1);
  
  // Group dimensions - swap for vertical walls so the bounding box is correct
  const widthPx = isOnVerticalWall ? wallThickPx : doorLengthPx;
  const heightPx = isOnVerticalWall ? doorLengthPx : wallThickPx;

  // VISUAL POSITION (Center): Data (Top-Left) + Half Width
  const x = (item.x * PIXELS_PER_CM) + (widthPx / 2);
  const y = (item.y * PIXELS_PER_CM) + (heightPx / 2);

  useEffect(() => {
    if (isSelected && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected]);


  const isWallObject = item.type?.toLowerCase() === 'window' || item.type?.toLowerCase() === 'door';

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

  const groupProps = {
    ref: shapeRef,
    id: item.id, // Add ID so Stage can identify clicked items
    x,
    y,
    width: widthPx,
    height: heightPx,
    draggable: true,
    rotation: isWallObject ? 0 : (item.rotation || 0), // Wall objects don't rotate the group
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
        // Standard Drag for Furniture
        const topLeftX = currentCenterX - widthPx / 2;
        const topLeftY = currentCenterY - heightPx / 2;
        finalXCm = Math.round(topLeftX / PIXELS_PER_CM);
        finalYCm = Math.round(topLeftY / PIXELS_PER_CM);
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

      const node = e.target;
      const bbox = node.getClientRect({ skipTransform: false });
      if (isOutsideRoomPx(bbox)) {
        onDelete(item.id);
      } else if (onChangeEnd) {
        // Save to history after drag ends
        const topLeftX = node.x() - widthPx / 2;
        const topLeftY = node.y() - heightPx / 2;
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
      
      // Rotation handling
      let newRotation = Math.round(node.rotation());
      
      // For doors: snap to 90-degree increments (0, 90, 180, 270)
      if (item.type?.toLowerCase() === 'door') {
        newRotation = Math.round(newRotation / 90) * 90;
        newRotation = newRotation % 360;
        if (newRotation < 0) newRotation += 360;
      }
      
      // For windows: no rotation allowed, always keep at current rotation
      if (item.type?.toLowerCase() === 'window') {
        newRotation = item.rotation || 0;
      }
      
      const newCenterX = node.x();
      const newCenterY = node.y();
      const newWidthPx = newWidthCm * PIXELS_PER_CM;
      const newHeightPx = newHeightCm * PIXELS_PER_CM;
      const newTopLeftX = newCenterX - (newWidthPx / 2);
      const newTopLeftY = newCenterY - (newHeightPx / 2);
      
      if (!isWallObject) {
        const bbox = node.getClientRect({ skipTransform: false });
        if (isOutsideRoomPx(bbox)) {
          onDelete(item.id);
          return;
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
      frameY = wallThickPx - frameHeight;  // Frame at inner edge of wall
      frameWidth = doorLengthPx;
      frameHeight = 5;
      
      // For top wall: "In" = swings down into room, "Out" = swings up outside room
      // Hinge position: "Left" = left side (x=0), "Right" = right side (x=doorLengthPx)
      
      if (rotation === 0) {
        // In + Left: hinge at left, swings down-right into room
        panelX = 0;
        panelY = wallThickPx - 5;  // Panel flush with wall, not sticking into room
        panelWidth = 5;
        panelHeight = doorLengthPx;
        arcX = 0;
        arcY = wallThickPx;
        arcRotation = 0;
      } else if (rotation === 90) {
        // In + Right: hinge at right, swings down-left into room
        panelX = doorLengthPx - 5;
        panelY = wallThickPx - 5;  // Panel flush with wall
        panelWidth = 5;
        panelHeight = doorLengthPx;
        arcX = doorLengthPx;
        arcY = wallThickPx;
        arcRotation = 90;
      } else if (rotation === 180) {
        // Out + Left: hinge at left, swings up-right outside room
        panelX = 0;
        panelY = -doorLengthPx;
        panelWidth = 5;
        panelHeight = doorLengthPx;
        arcX = 0;
        arcY = wallThickPx;
        arcRotation = 270;
      } else {
        // 270: Out + Right: hinge at right, swings up-left outside room
        panelX = doorLengthPx - 5;
        panelY = -doorLengthPx;
        panelWidth = 5;
        panelHeight = doorLengthPx;
        arcX = doorLengthPx;
        arcY = wallThickPx;
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
        arcX = wallThickPx;
        arcY = 0;
        arcRotation = 0;
      } else if (rotation === 90) {
        // In + Right: hinge at bottom, swings right-up into room
        panelX = wallThickPx - 5;  // Panel flush with wall
        panelY = doorLengthPx - 5;
        panelWidth = doorLengthPx;
        panelHeight = 5;
        arcX = wallThickPx;
        arcY = doorLengthPx;
        arcRotation = 270;
      } else if (rotation === 180) {
        // Out + Left: hinge at top, swings left-down outside room
        panelX = -doorLengthPx;
        panelY = 0;
        panelWidth = doorLengthPx;
        panelHeight = 5;
        arcX = 0;
        arcY = 0;
        arcRotation = 90;
      } else {
        // 270: Out + Right: hinge at bottom, swings left-up outside room
        panelX = -doorLengthPx;
        panelY = doorLengthPx - 5;
        panelWidth = doorLengthPx;
        panelHeight = 5;
        arcX = 0;
        arcY = doorLengthPx;
        arcRotation = 180;
      }
    } else if (isOnBottomWall) {
      // HORIZONTAL DOOR ON BOTTOM WALL
      // Group: doorLengthPx wide, wallThickPx tall
      frameX = 0;
      frameY = 0;  // Frame at inner edge (top of wall, room side)
      frameWidth = doorLengthPx;
      frameHeight = 5;
      
      // For bottom wall: "In" = swings up into room, "Out" = swings down outside room
      // Hinge position: "Left" = left side (x=0), "Right" = right side (x=doorLengthPx)
      
      if (rotation === 0) {
        // In + Left: hinge at left, swings up-right into room
        panelX = 0;
        panelY = -doorLengthPx + 5;  // Panel flush with wall
        panelWidth = 5;
        panelHeight = doorLengthPx;
        arcX = 0;
        arcY = 0;
        arcRotation = 270;
      } else if (rotation === 90) {
        // In + Right: hinge at right, swings up-left into room
        panelX = doorLengthPx - 5;
        panelY = -doorLengthPx + 5;  // Panel flush with wall
        panelWidth = 5;
        panelHeight = doorLengthPx;
        arcX = doorLengthPx;
        arcY = 0;
        arcRotation = 180;
      } else if (rotation === 180) {
        // Out + Left: hinge at left, swings down-right outside room
        panelX = 0;
        panelY = wallThickPx;
        panelWidth = 5;
        panelHeight = doorLengthPx;
        arcX = 0;
        arcY = 0;
        arcRotation = 0;
      } else {
        // 270: Out + Right: hinge at right, swings down-left outside room
        panelX = doorLengthPx - 5;
        panelY = wallThickPx;
        panelWidth = 5;
        panelHeight = doorLengthPx;
        arcX = doorLengthPx;
        arcY = 0;
        arcRotation = 90;
      }
    } else if (isOnRightWall) {
      // VERTICAL DOOR ON RIGHT WALL
      // Group: wallThickPx wide, doorLengthPx tall
      // Frame at inner edge (left edge, room side)
      frameX = 0;
      frameY = 0;
      frameWidth = 5;
      frameHeight = doorLengthPx;
      
      // For right wall: "In" = swings left into room, "Out" = swings right outside room
      // Hinge position: "Left" = top (y=0), "Right" = bottom (y=doorLengthPx)
      
      if (rotation === 0) {
        // In + Left: hinge at top, swings left-down into room
        panelX = -doorLengthPx + 5;  // Panel flush with wall
        panelY = 0;
        panelWidth = doorLengthPx;
        panelHeight = 5;
        arcX = 0;
        arcY = 0;
        arcRotation = 90;
      } else if (rotation === 90) {
        // In + Right: hinge at bottom, swings left-up into room
        panelX = -doorLengthPx + 5;  // Panel flush with wall
        panelY = doorLengthPx - 5;
        panelWidth = doorLengthPx;
        panelHeight = 5;
        arcX = 0;
        arcY = doorLengthPx;
        arcRotation = 180;
      } else if (rotation === 180) {
        // Out + Left: hinge at top, swings right-down outside room
        panelX = wallThickPx;
        panelY = 0;
        panelWidth = doorLengthPx;
        panelHeight = 5;
        arcX = 0;
        arcY = 0;
        arcRotation = 0;
      } else {
        // 270: Out + Right: hinge at bottom, swings right-up outside room
        panelX = wallThickPx;
        panelY = doorLengthPx - 5;
        panelWidth = doorLengthPx;
        panelHeight = 5;
        arcX = 0;
        arcY = doorLengthPx;
        arcRotation = 270;
      }
    } else {
      // Default to top wall rendering if position is ambiguous
      frameX = 0;
      frameY = wallThickPx - 2.5;
      frameWidth = doorLengthPx;
      frameHeight = 5;
      panelX = isLeftHinge ? 0 : doorLengthPx - 5;
      panelY = isInward ? wallThickPx : -doorLengthPx;
      panelWidth = 5;
      panelHeight = doorLengthPx;
      arcX = isLeftHinge ? 0 : doorLengthPx;
      arcY = wallThickPx;
      arcRotation = rotation === 0 ? 0 : rotation === 90 ? 90 : rotation === 180 ? 270 : 180;
    }
    
    return (
      <>
        <Group {...groupProps}>
          {/* Door frame (threshold) */}
          <Rect width={frameWidth} height={frameHeight} fill="#8d6e63" x={frameX} y={frameY} />
          {/* Door panel - shows hinge side and open/closed state */}
          <Rect width={panelWidth} height={panelHeight} fill="#a1887f" x={panelX} y={panelY} />
          {/* Door swing arc - shows direction of opening */}
          <Arc 
            innerRadius={0}
            outerRadius={doorLengthPx} 
            angle={90} 
            stroke="gray" 
            strokeWidth={2}
            dash={[5, 5]} 
            rotation={arcRotation}
            x={arcX}
            y={arcY}
          />
          {/* Invisible hit box */}
          <Rect width={widthPx} height={heightPx} opacity={0} />
        </Group>
        {isSelected && (
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
            rotateEnabled={true}
            rotationSnaps={[0, 90, 180, 270]}
            enabledAnchors={['middle-left', 'middle-right']}
          />
        )}
      </>
    );
  }

  // RENDER: WINDOW
  if (item.type?.toLowerCase() === 'window') {
    return (
      <>
        <Group {...groupProps}>
          <Rect width={widthPx} height={heightPx} fill="#e0f7fa" stroke="black" strokeWidth={1} />
          <Rect x={0} y={heightPx / 2 - 2} width={widthPx} height={4} fill="#81d4fa" />
        </Group>
        {isSelected && (
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

  return (
    <>
      <Group {...groupProps}>
        {renderSymbol()}
      </Group>
      {isSelected && (
        <Transformer
          ref={trRef}
          boundBoxFunc={(oldBox, newBox) => {
            if (Math.abs(newBox.width) < 5 || Math.abs(newBox.height) < 5) return oldBox;
            return newBox;
          }}
          flipEnabled={false}
        />
      )}
    </>
  );
};

export default FurnitureShape;
