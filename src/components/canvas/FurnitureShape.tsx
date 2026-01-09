import React, { useRef, useEffect } from 'react';
import { Rect, Group, Text, Transformer, Arc } from 'react-konva';
import { FurnitureItem, RoomConfig } from '@/types';
import { PIXELS_PER_CM } from '@/lib/constants';

function getContrastColor(hexColor: string) {
  // Convert hex to RGB
  const r = parseInt(hexColor.substring(1, 3), 16);
  const g = parseInt(hexColor.substring(3, 5), 16);
  const b = parseInt(hexColor.substring(5, 7), 16);
  // Calculate brightness (YIQ formula)
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  // Return black for bright colors, white for dark colors
  return yiq >= 128 ? '#000000' : '#ffffff';
}

interface FurnitureShapeProps {
  item: FurnitureItem;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onChange: (id: string, updates: Partial<FurnitureItem>) => void;
  roomConfig: RoomConfig;
}

const FurnitureShape: React.FC<FurnitureShapeProps> = ({
  item,
  isSelected,
  onSelect,
  onChange,
  roomConfig,
}) => {
  const shapeRef = useRef<any>(null);
  const trRef = useRef<any>(null);

  // Calculate dimensions in pixels
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

  // Common group props for all shapes
  const groupProps = {
    ref: shapeRef,
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
    onDragMove: (e: any) => {
      // 1. Get new Visual Position (Center)
      const newCenterX = e.target.x();
      const newCenterY = e.target.y();

      // 2. Convert to Data Position (Top-Left)
      // TopLeft = Center - HalfSize
      let newTopLeftX = newCenterX - (widthPx / 2);
      let newTopLeftY = newCenterY - (heightPx / 2);

      // 3. Wall Snapping for Doors and Windows
      const isWallObject = item.type.toLowerCase() === 'window' || item.type.toLowerCase() === 'door';
      
      if (isWallObject) {
        const roomWidthPx = roomConfig.width * PIXELS_PER_CM;
        const roomHeightPx = roomConfig.height * PIXELS_PER_CM;

        // Calculate distance to each wall (in pixels)
        const distLeft = Math.abs(newTopLeftX);
        const distRight = Math.abs(roomWidthPx - (newTopLeftX + widthPx));
        const distTop = Math.abs(newTopLeftY);
        const distBottom = Math.abs(roomHeightPx - (newTopLeftY + heightPx));

        // Find min distance
        const minDist = Math.min(distLeft, distRight, distTop, distBottom);

        // Snap to closest wall
        if (minDist === distTop) {
          newTopLeftY = 0;
        } else if (minDist === distBottom) {
          newTopLeftY = roomHeightPx - heightPx;
        } else if (minDist === distLeft) {
          newTopLeftX = 0;
        } else if (minDist === distRight) {
          newTopLeftX = roomWidthPx - widthPx;
        }
      }

      // 4. Convert Pixels to CM
      const finalX = Math.round(newTopLeftX / PIXELS_PER_CM);
      const finalY = Math.round(newTopLeftY / PIXELS_PER_CM);

      onChange(item.id, { x: finalX, y: finalY });
    },
    onTransformEnd: (e: any) => {
      const node = shapeRef.current;
      const scaleX = node.scaleX();
      const scaleY = node.scaleY();

      // Reset scale back to 1 so we work with "clean" dimensions next time
      node.scaleX(1);
      node.scaleY(1);

      const newWidthCm = Math.round((widthPx * scaleX) / PIXELS_PER_CM);
      const newHeightCm = Math.round((heightPx * scaleY) / PIXELS_PER_CM);
      
      // Rotation is easy
      const newRotation = Math.round(node.rotation());

      // Position changes when we rotate/resize around center
      // We need to recalculate Top-Left from the new Center
      const newCenterX = node.x();
      const newCenterY = node.y();
      const newWidthPx = newWidthCm * PIXELS_PER_CM;
      const newHeightPx = newHeightCm * PIXELS_PER_CM;

      const newTopLeftX = newCenterX - (newWidthPx / 2);
      const newTopLeftY = newCenterY - (newHeightPx / 2);

      const newXCm = Math.round(newTopLeftX / PIXELS_PER_CM);
      const newYCm = Math.round(newTopLeftY / PIXELS_PER_CM);

      // We need to update ALL properties because transform affects them all
      onChange(item.id, {
        x: newXCm, 
        y: newYCm, 
        width: newWidthCm, 
        height: newHeightCm, 
        rotation: newRotation 
      });
    },
  };

  // Special rendering for Doors
  if (item.type.toLowerCase() === 'door') {
    return (
      <>
        <Group {...groupProps}>
          {/* Door Frame/Threshold */}
          <Rect width={widthPx} height={5} fill="#8d6e63" y={heightPx - 5} />
          {/* The Door Panel (Open 90 degrees) */}
          <Rect width={5} height={widthPx} fill="#a1887f" x={0} y={heightPx - widthPx} />
          {/* Swing Arc (Simplified as a quarter circle line) */}
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
          {/* Interaction Layer (Invisible rect to catch clicks) */}
          <Rect width={widthPx} height={heightPx} opacity={0} />
        </Group>
        {isSelected && (
          <Transformer
            ref={trRef}
            boundBoxFunc={(oldBox, newBox) => {
              if (Math.abs(newBox.width) < 5 || Math.abs(newBox.height) < 5) {
                return oldBox;
              }
              return newBox;
            }}
            flipEnabled={false}
          />
        )}
      </>
    );
  }

  // Special rendering for Windows
  if (item.type.toLowerCase() === 'window') {
    return (
      <>
        <Group {...groupProps}>
          <Rect width={widthPx} height={heightPx} fill="#e0f7fa" stroke="black" strokeWidth={1} />
          {/* Center Line (Glass pane) */}
          <Rect x={0} y={heightPx / 2 - 2} width={widthPx} height={4} fill="#81d4fa" />
        </Group>
        {isSelected && (
          <Transformer
            ref={trRef}
            boundBoxFunc={(oldBox, newBox) => {
              if (Math.abs(newBox.width) < 5 || Math.abs(newBox.height) < 5) {
                return oldBox;
              }
              return newBox;
            }}
            flipEnabled={false}
          />
        )}
      </>
    );
  }

  // Standard furniture rendering
  return (
    <>
      <Group
        ref={shapeRef}
        x={x}
        y={y}
        width={widthPx}
        height={heightPx}
        draggable
        rotation={item.rotation}
        offsetX={widthPx / 2}
        offsetY={heightPx / 2}
        onClick={(e) => {
          e.cancelBubble = true;
          onSelect(item.id);
        }}
        onTap={(e) => {
          e.cancelBubble = true;
          onSelect(item.id);
        }}
        onDragMove={(e) => {
          // 1. Get new Visual Position (Center)
          const newCenterX = e.target.x();
          const newCenterY = e.target.y();

          // 2. Convert to Data Position (Top-Left)
          // TopLeft = Center - HalfSize
          const newTopLeftX = newCenterX - (widthPx / 2);
          const newTopLeftY = newCenterY - (heightPx / 2);

          // 3. Convert Pixels to CM
          const finalX = Math.round(newTopLeftX / PIXELS_PER_CM);
          const finalY = Math.round(newTopLeftY / PIXELS_PER_CM);

          onChange(item.id, { x: finalX, y: finalY });
        }}
        onTransformEnd={(e) => {
          const node = shapeRef.current;
          const scaleX = node.scaleX();
          const scaleY = node.scaleY();

          // Reset scale back to 1 so we work with "clean" dimensions next time
          node.scaleX(1);
          node.scaleY(1);

          const newWidthCm = Math.round((widthPx * scaleX) / PIXELS_PER_CM);
          const newHeightCm = Math.round((heightPx * scaleY) / PIXELS_PER_CM);
          
          // Rotation is easy
          const newRotation = Math.round(node.rotation());

          // Position changes when we rotate/resize around center
          // We need to recalculate Top-Left from the new Center
          const newCenterX = node.x();
          const newCenterY = node.y();
          const newWidthPx = newWidthCm * PIXELS_PER_CM;
          const newHeightPx = newHeightCm * PIXELS_PER_CM;

          const newTopLeftX = newCenterX - (newWidthPx / 2);
          const newTopLeftY = newCenterY - (newHeightPx / 2);

          const newXCm = Math.round(newTopLeftX / PIXELS_PER_CM);
          const newYCm = Math.round(newTopLeftY / PIXELS_PER_CM);

          // We need to update ALL properties because transform affects them all
          onChange(item.id, {
            x: newXCm, 
            y: newYCm, 
            width: newWidthCm, 
            height: newHeightCm, 
            rotation: newRotation 
          });
        }}
      >
        <Rect
          width={widthPx}
          height={heightPx}
          fill={item.color || '#e0e0e0'}
          stroke={isSelected ? '#3b82f6' : '#94a3b8'} // Blue if selected, Gray if not
          strokeWidth={isSelected ? 2 : 1}
          cornerRadius={4}
        />
        <Text
          text={item.type}
          width={widthPx}
          height={heightPx}
          x={widthPx / 2}
          y={heightPx / 2}
          offsetX={widthPx / 2}
          offsetY={heightPx / 2}
          rotation={-item.rotation}
          align="center"
          verticalAlign="middle"
          fontSize={10}
          fontFamily="sans-serif"
          fill={getContrastColor(item.color || '#e0e0e0')}
          listening={false}
        />
      </Group>
      {isSelected && (
        <Transformer
          ref={trRef}
          boundBoxFunc={(oldBox, newBox) => {
            // Prevent resizing to less than 5px
            if (Math.abs(newBox.width) < 5 || Math.abs(newBox.height) < 5) {
              return oldBox;
            }
            return newBox;
          }}
          flipEnabled={false}
        />
      )}
    </>
  );
};

export default FurnitureShape;
