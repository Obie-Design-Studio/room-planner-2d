import React, { useRef, useEffect } from 'react';
import { Rect, Group, Text, Transformer, Arc } from 'react-konva';
import { FurnitureItem, RoomConfig } from '@/types';
import { PIXELS_PER_CM } from '@/lib/constants';
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
  onDelete: (id: string) => void;
  roomConfig: RoomConfig;
}

const FurnitureShape: React.FC<FurnitureShapeProps> = ({
  item,
  isSelected,
  onSelect,
  onEdit,
  onChange,
  onDelete,
  roomConfig,
}) => {
  const shapeRef = useRef<any>(null);
  const trRef = useRef<any>(null);

  const widthPx = item.width * PIXELS_PER_CM;
  const heightPx = item.height * PIXELS_PER_CM;

  // VISUAL POSITION (Center): Data (Top-Left) + Half Width
  const x = (item.x * PIXELS_PER_CM) + (widthPx / 2);
  const y = (item.y * PIXELS_PER_CM) + (heightPx / 2);

  useEffect(() => {
    if (isSelected && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected]);


  const isWallObject = item.type.toLowerCase() === 'window' || item.type.toLowerCase() === 'door';

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
    rotation: item.rotation,
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
        // We calculate which wall is closest and FORCE the item onto it.
        
        const distLeft = currentCenterX;
        const distRight = Math.abs(roomWidthPx - currentCenterX);
        const distTop = currentCenterY;
        const distBottom = Math.abs(roomHeightPx - currentCenterY);

        const minDist = Math.min(distLeft, distRight, distTop, distBottom);

        // Wall Thickness Offset (to center item ON the wall line)
        // Assuming walls are effectively 0-width lines for calculation, or we want them centered on the border
        // If we want them inside the wall, we might need a small offset, but let's stick to the line for now.

        if (minDist === distTop) {
          // LOCK TO TOP WALL
          finalRotation = 0;
          // Center the window/door in the wall thickness
          // Wall is 10px thick (5cm), object is 10cm (20px) tall
          // Position object center at -5cm to center it in the wall
          finalYCm = -5; // Centered in wall thickness
          
          // Allow X movement, but clamp to room width
          const visualLeftX = currentCenterX - widthPx / 2;
          const clampedX = Math.max(0, Math.min(visualLeftX, roomWidthPx - widthPx));
          finalXCm = Math.round(clampedX / PIXELS_PER_CM);
          
          // Override the visual position immediately to prevent "loose" feeling
          e.target.y(-5 * PIXELS_PER_CM + heightPx / 2); // Center in wall
          e.target.rotation(0);
        } 
        else if (minDist === distBottom) {
          // LOCK TO BOTTOM WALL
          finalRotation = 0;
          // Center the window/door in the wall thickness
          // Position object so its center is at roomHeight + 5cm (wall center)
          finalYCm = Math.round((roomHeightPx + 5 * PIXELS_PER_CM - heightPx / 2) / PIXELS_PER_CM);
          
          const visualLeftX = currentCenterX - widthPx / 2;
          const clampedX = Math.max(0, Math.min(visualLeftX, roomWidthPx - widthPx));
          finalXCm = Math.round(clampedX / PIXELS_PER_CM);

          e.target.y(roomHeightPx + 5 * PIXELS_PER_CM - heightPx / 2);
          e.target.rotation(0);
        } 
        else if (minDist === distLeft) {
          // LOCK TO LEFT WALL
          finalRotation = 90;
          // Center the window/door in the wall thickness
          // Position object center at -5cm (wall center)
          finalXCm = Math.round((-5 * PIXELS_PER_CM + heightPx / 2 - widthPx / 2) / PIXELS_PER_CM);
          
          // Allow Y movement
          // Visual Center Y tracks mouse
          // Clamp Visual Top Y
          const visualTopY = currentCenterY - widthPx / 2; // Visual height is widthPx
          const clampedY = Math.max(0, Math.min(visualTopY, roomHeightPx - widthPx));
          finalYCm = Math.round((clampedY + widthPx/2 - heightPx/2) / PIXELS_PER_CM);

          e.target.x(-5 * PIXELS_PER_CM + heightPx / 2); // Lock Visual X to wall center
          e.target.rotation(90);
        } 
        else if (minDist === distRight) {
          // LOCK TO RIGHT WALL
          finalRotation = 90;
          // Center the window/door in the wall thickness
          // Position object center at roomWidth + 5cm (wall center)
          finalXCm = Math.round((roomWidthPx + 5 * PIXELS_PER_CM + heightPx / 2 - widthPx / 2) / PIXELS_PER_CM);
          
          const visualTopY = currentCenterY - widthPx / 2;
          const clampedY = Math.max(0, Math.min(visualTopY, roomHeightPx - widthPx));
          finalYCm = Math.round((clampedY + widthPx/2 - heightPx/2) / PIXELS_PER_CM);

          e.target.x(roomWidthPx + 5 * PIXELS_PER_CM - heightPx / 2); // Lock Visual X to wall center
          e.target.rotation(90);
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
      }
    },
    onTransformEnd: (e: any) => {
      const node = shapeRef.current;
      const scaleX = node.scaleX();
      const scaleY = node.scaleY();
      node.scaleX(1);
      node.scaleY(1);
      
      const newWidthCm = Math.round((widthPx * scaleX) / PIXELS_PER_CM);
      const newHeightCm = Math.round((heightPx * scaleY) / PIXELS_PER_CM);
      const newRotation = Math.round(node.rotation());
      
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

      onChange(item.id, {
        x: Math.round(newTopLeftX / PIXELS_PER_CM),
        y: Math.round(newTopLeftY / PIXELS_PER_CM),
        width: newWidthCm,
        height: newHeightCm,
        rotation: newRotation
      });
    },
  };

  // RENDER: DOOR
  if (item.type.toLowerCase() === 'door') {
    return (
      <>
        <Group {...groupProps}>
          <Rect width={widthPx} height={5} fill="#8d6e63" y={heightPx - 5} />
          <Rect width={5} height={widthPx} fill="#a1887f" x={0} y={heightPx - widthPx} />
          <Arc 
            innerRadius={widthPx} 
            outerRadius={widthPx} 
            angle={90} 
            stroke="gray" 
            dash={[5, 5]} 
            rotation={270}
            x={0}
            y={heightPx}
          />
          <Rect width={widthPx} height={widthPx} opacity={0} />
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
  }

  // RENDER: WINDOW
  if (item.type.toLowerCase() === 'window') {
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
              if (Math.abs(newBox.width) < 5 || Math.abs(newBox.height) < 5) return oldBox;
              return newBox;
            }}
            flipEnabled={false}
          />
        )}
      </>
    );
  }

  // RENDER: STANDARD ITEM (using architectural symbols)
  const renderSymbol = () => {
    const typeLower = item.type.toLowerCase();
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
