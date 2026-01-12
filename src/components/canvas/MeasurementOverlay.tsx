import React from 'react';
import { Group, Line, Text } from 'react-konva';
import { FurnitureItem, RoomConfig } from '@/types';
import { PIXELS_PER_CM } from '@/lib/constants';

interface Props {
  item: FurnitureItem;
  room: RoomConfig;
  otherItems?: FurnitureItem[];
}

const MeasurementOverlay: React.FC<Props> = ({ item, room, otherItems = [] }) => {
  const x = item.x * PIXELS_PER_CM;
  const y = item.y * PIXELS_PER_CM;
  const w = item.width * PIXELS_PER_CM;
  const h = item.height * PIXELS_PER_CM;
  const roomW = room.width * PIXELS_PER_CM;
  const roomH = room.height * PIXELS_PER_CM;

  const isWallObject = item.type.toLowerCase() === 'window' || item.type.toLowerCase() === 'door';
  
  const color = '#ef4444';
  const dash = [4, 4];
  const fontSize = 12;
  const outsideOffset = 20; // Distance outside room for wall object measurements

  // Helper: check if a value is inside a range
  const isBetween = (val: number, min: number, max: number) => val >= min && val <= max;

  if (isWallObject) {
    // ===== WALL OBJECTS (Doors/Windows) - Measure from edges, draw outside =====
    
    // Determine which wall this item is on based on its position
    const onTopWall = y === 0;
    const onBottomWall = y === roomH - h;
    const onLeftWall = item.rotation === 90 && Math.abs(x - (h - w) / 2) < 1;
    const onRightWall = item.rotation === 90 && Math.abs(x - (roomW - (h + w) / 2)) < 1;

    if (onTopWall) {
      // TOP WALL - Show left and right edge measurements outside the room
      const leftDist = Math.round(x / PIXELS_PER_CM);
      const rightDist = Math.round((roomW - (x + w)) / PIXELS_PER_CM);
      
      return (
        <Group>
          {/* Left edge measurement */}
          <Line 
            points={[0, -outsideOffset, x, -outsideOffset]} 
            stroke={color} 
            dash={dash} 
            strokeWidth={1} 
          />
          <Text
            x={x / 2 - 15}
            y={-outsideOffset - 15}
            text={`${leftDist}cm`}
            fill={color}
            fontSize={fontSize}
          />
          
          {/* Right edge measurement */}
          <Line 
            points={[x + w, -outsideOffset, roomW, -outsideOffset]} 
            stroke={color} 
            dash={dash} 
            strokeWidth={1} 
          />
          <Text
            x={x + w + (roomW - (x + w)) / 2 - 15}
            y={-outsideOffset - 15}
            text={`${rightDist}cm`}
            fill={color}
            fontSize={fontSize}
          />
        </Group>
      );
    }
    
    if (onBottomWall) {
      // BOTTOM WALL - Show left and right edge measurements outside the room
      const leftDist = Math.round(x / PIXELS_PER_CM);
      const rightDist = Math.round((roomW - (x + w)) / PIXELS_PER_CM);
      
      return (
        <Group>
          {/* Left edge measurement */}
          <Line 
            points={[0, roomH + outsideOffset, x, roomH + outsideOffset]} 
            stroke={color} 
            dash={dash} 
            strokeWidth={1} 
          />
          <Text
            x={x / 2 - 15}
            y={roomH + outsideOffset + 5}
            text={`${leftDist}cm`}
            fill={color}
            fontSize={fontSize}
          />
          
          {/* Right edge measurement */}
          <Line 
            points={[x + w, roomH + outsideOffset, roomW, roomH + outsideOffset]} 
            stroke={color} 
            dash={dash} 
            strokeWidth={1} 
          />
          <Text
            x={x + w + (roomW - (x + w)) / 2 - 15}
            y={roomH + outsideOffset + 5}
            text={`${rightDist}cm`}
            fill={color}
            fontSize={fontSize}
          />
        </Group>
      );
    }
    
    if (onLeftWall) {
      // LEFT WALL - Show top and bottom edge measurements outside the room
      // After rotation, visual dimensions are swapped: visual height = w
      const visualTopY = y + h / 2 - w / 2;
      const visualHeight = w;
      
      const topDist = Math.round(visualTopY / PIXELS_PER_CM);
      const bottomDist = Math.round((roomH - (visualTopY + visualHeight)) / PIXELS_PER_CM);
      
      return (
        <Group>
          {/* Top edge measurement */}
          <Line 
            points={[-outsideOffset, 0, -outsideOffset, visualTopY]} 
            stroke={color} 
            dash={dash} 
            strokeWidth={1} 
          />
          <Text
            x={-outsideOffset - 40}
            y={visualTopY / 2 - 6}
            text={`${topDist}cm`}
            fill={color}
            fontSize={fontSize}
          />
          
          {/* Bottom edge measurement */}
          <Line 
            points={[-outsideOffset, visualTopY + visualHeight, -outsideOffset, roomH]} 
            stroke={color} 
            dash={dash} 
            strokeWidth={1} 
          />
          <Text
            x={-outsideOffset - 40}
            y={visualTopY + visualHeight + (roomH - (visualTopY + visualHeight)) / 2 - 6}
            text={`${bottomDist}cm`}
            fill={color}
            fontSize={fontSize}
          />
        </Group>
      );
    }
    
    if (onRightWall) {
      // RIGHT WALL - Show top and bottom edge measurements outside the room
      const visualTopY = y + h / 2 - w / 2;
      const visualHeight = w;
      
      const topDist = Math.round(visualTopY / PIXELS_PER_CM);
      const bottomDist = Math.round((roomH - (visualTopY + visualHeight)) / PIXELS_PER_CM);
      
      return (
        <Group>
          {/* Top edge measurement */}
          <Line 
            points={[roomW + outsideOffset, 0, roomW + outsideOffset, visualTopY]} 
            stroke={color} 
            dash={dash} 
            strokeWidth={1} 
          />
          <Text
            x={roomW + outsideOffset + 5}
            y={visualTopY / 2 - 6}
            text={`${topDist}cm`}
            fill={color}
            fontSize={fontSize}
          />
          
          {/* Bottom edge measurement */}
          <Line 
            points={[roomW + outsideOffset, visualTopY + visualHeight, roomW + outsideOffset, roomH]} 
            stroke={color} 
            dash={dash} 
            strokeWidth={1} 
          />
          <Text
            x={roomW + outsideOffset + 5}
            y={visualTopY + visualHeight + (roomH - (visualTopY + visualHeight)) / 2 - 6}
            text={`${bottomDist}cm`}
            fill={color}
            fontSize={fontSize}
          />
        </Group>
      );
    }
  }

  // ===== STANDARD FURNITURE - Measure from center, with obstacle detection =====
  
  const midX = x + w / 2;
  const midY = y + h / 2;

  // Calculate nearest obstacles
  let leftBound = 0;
  let rightBound = roomW;
  let topBound = 0;
  let bottomBound = roomH;

  otherItems.forEach((other) => {
    const oX = other.x * PIXELS_PER_CM;
    const oY = other.y * PIXELS_PER_CM;
    const oW = other.width * PIXELS_PER_CM;
    const oH = other.height * PIXELS_PER_CM;

    if (isBetween(midY, oY, oY + oH)) {
      if (oX + oW <= x) leftBound = Math.max(leftBound, oX + oW);
      if (oX >= x + w) rightBound = Math.min(rightBound, oX);
    }

    if (isBetween(midX, oX, oX + oW)) {
      if (oY + oH <= y) topBound = Math.max(topBound, oY + oH);
      if (oY >= y + h) bottomBound = Math.min(bottomBound, oY);
    }
  });

  return (
    <Group>
      {/* Left Measure */}
      <Line points={[leftBound, midY, x, midY]} stroke={color} dash={dash} strokeWidth={1} />
      <Text
        x={(leftBound + x) / 2 - 10}
        y={midY - 15}
        text={`${Math.round((x - leftBound) / PIXELS_PER_CM)}cm`}
        fill={color}
        fontSize={fontSize}
      />

      {/* Right Measure */}
      <Line points={[x + w, midY, rightBound, midY]} stroke={color} dash={dash} strokeWidth={1} />
      <Text
        x={(x + w + rightBound) / 2 - 10}
        y={midY - 15}
        text={`${Math.round((rightBound - (x + w)) / PIXELS_PER_CM)}cm`}
        fill={color}
        fontSize={fontSize}
      />

      {/* Top Measure */}
      <Line points={[midX, topBound, midX, y]} stroke={color} dash={dash} strokeWidth={1} />
      <Text
        x={midX + 5}
        y={(topBound + y) / 2 - 5}
        text={`${Math.round((y - topBound) / PIXELS_PER_CM)}cm`}
        fill={color}
        fontSize={fontSize}
      />

      {/* Bottom Measure */}
      <Line points={[midX, y + h, midX, bottomBound]} stroke={color} dash={dash} strokeWidth={1} />
      <Text
        x={midX + 5}
        y={(y + h + bottomBound) / 2 - 5}
        text={`${Math.round((bottomBound - (y + h)) / PIXELS_PER_CM)}cm`}
        fill={color}
        fontSize={fontSize}
      />
    </Group>
  );
};

export default MeasurementOverlay;
