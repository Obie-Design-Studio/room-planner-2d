import React from 'react';
import { Group, Line, Text, Rect } from 'react-konva';
import { FurnitureItem, RoomConfig } from '@/types';
import { PIXELS_PER_CM } from '@/lib/constants';
import { type Unit, formatMeasurement, formatDimensions } from '@/lib/unitConversion';

interface Props {
  item: FurnitureItem;
  room: RoomConfig;
  otherItems?: FurnitureItem[];
  zoom?: number;
  unit?: Unit;
}

const MeasurementOverlay: React.FC<Props> = ({ item, room, otherItems = [], zoom = 1.0, unit = 'cm' }) => {
  const x = item.x * PIXELS_PER_CM;
  const y = item.y * PIXELS_PER_CM;
  
  // Account for rotation when calculating visual dimensions
  const rotation = item.rotation || 0;
  const isRotated90 = rotation === 90 || rotation === 270;
  
  // Visual dimensions (what you see on screen after rotation)
  const w = (isRotated90 ? item.height : item.width) * PIXELS_PER_CM;
  const h = (isRotated90 ? item.width : item.height) * PIXELS_PER_CM;
  
  // Actual item dimensions (for labels)
  const actualWidth = item.width;
  const actualHeight = item.height;
  
  const roomW = room.width * PIXELS_PER_CM;
  const roomH = room.height * PIXELS_PER_CM;

  const isWallObject = item.type.toLowerCase() === 'window' || item.type.toLowerCase() === 'door';
  
  // Color-coded measurement types
  const COLORS = {
    dimension: '#3b82f6',    // Blue for item dimensions (W × H)
    edge: '#f97316',         // Orange for room edge distances (wall objects)
    distance: '#ef4444',     // Red for furniture-to-obstacle distances
  };
  
  const dash = [4, 4];
  
  // Zoom-aware font size: scales WITH zoom for readability
  // At 100% zoom: 20px, at 300% zoom: 28px, at 10% zoom: 16px
  const baseFontSize = 20;
  const fontSize = Math.max(16, Math.min(30, baseFontSize + (zoom - 1) * 8));
  
  // Zoom-aware offsets for better spacing at different zoom levels
  const outsideOffset = Math.max(15, Math.min(30, 20 / zoom)); // Distance outside room for wall object measurements
  const labelOffset = Math.max(10, Math.min(20, 15 / zoom)); // Offset for labels from measurement lines

  // Helper: check if a value is inside a range
  const isBetween = (val: number, min: number, max: number) => val >= min && val <= max;
  
  // Helper: adjust label position to avoid going off-canvas
  const adjustLabelX = (x: number, textWidth: number) => {
    if (x - textWidth / 2 < 0) return textWidth / 2;
    if (x + textWidth / 2 > roomW) return roomW - textWidth / 2;
    return x;
  };
  
  const adjustLabelY = (y: number, textHeight: number) => {
    if (y - textHeight / 2 < -outsideOffset - 50) return -outsideOffset - 50 + textHeight / 2;
    if (y + textHeight / 2 > roomH + outsideOffset + 50) return roomH + outsideOffset + 50 - textHeight / 2;
    return y;
  };

  // Helper: Check if two rectangles overlap
  const rectanglesOverlap = (
    r1: { x: number; y: number; width: number; height: number },
    r2: { x: number; y: number; width: number; height: number }
  ): boolean => {
    return !(
      r1.x + r1.width < r2.x ||
      r2.x + r2.width < r1.x ||
      r1.y + r1.height < r2.y ||
      r2.y + r2.height < r1.y
    );
  };

  // Helper: Adjust label position to avoid overlap with existing labels
  const adjustLabelPosition = (
    x: number,
    y: number,
    text: string,
    existingLabels: Array<{ x: number; y: number; width: number; height: number }>,
    isVertical: boolean = false
  ): { x: number; y: number } => {
    const padding = 4;
    const charWidth = fontSize * 0.6;
    const textWidth = text.length * charWidth;
    const textHeight = fontSize;
    const labelWidth = textWidth + padding * 2;
    const labelHeight = textHeight + padding * 2;
    
    let adjustedX = x;
    let adjustedY = y;
    let attempts = 0;
    const maxAttempts = 10;
    const shiftAmount = 25; // Amount to shift when collision detected
    
    while (attempts < maxAttempts) {
      const currentRect = {
        x: adjustedX - labelWidth / 2,
        y: adjustedY - labelHeight / 2,
        width: labelWidth,
        height: labelHeight,
      };
      
      let hasOverlap = false;
      for (const existing of existingLabels) {
        if (rectanglesOverlap(currentRect, existing)) {
          hasOverlap = true;
          break;
        }
      }
      
      if (!hasOverlap) {
        break;
      }
      
      // Shift position to avoid overlap
      if (isVertical) {
        // For vertical walls, shift horizontally
        adjustedX += shiftAmount;
      } else {
        // For horizontal walls, shift vertically
        adjustedY += shiftAmount;
      }
      
      attempts++;
    }
    
    return { x: adjustedX, y: adjustedY };
  };

  // Helper component: Dimension label with white background
  const DimensionLabel = ({ x, y, text, color = '#1a1a1a' }: { x: number; y: number; text: string; color?: string }) => {
    const padding = 4;
    const charWidth = fontSize * 0.6; // Approximate character width based on font size
    const textWidth = text.length * charWidth;
    const textHeight = fontSize;
    
    return (
      <Group>
        <Rect
          x={x - textWidth / 2 - padding}
          y={y - textHeight / 2 - padding}
          width={textWidth + padding * 2}
          height={textHeight + padding * 2}
          fill="white"
          stroke="#e5e5e5"
          strokeWidth={1}
          cornerRadius={3}
        />
        <Text
          x={x - textWidth / 2}
          y={y - textHeight / 2}
          text={text}
          fill={color}
          fontSize={fontSize}
        />
      </Group>
    );
  };

  if (isWallObject) {
    // ===== WALL OBJECTS (Doors/Windows) - Measure from edges, draw outside =====
    
    // Wall thickness in cm
    const wallThickCm = Math.min(item.width, item.height);
    
    // Determine which wall this item is on based on its position
    // Priority: check most specific conditions first
    // Left wall: x is negative (item extends into left wall)
    const onLeftWall = item.x < 0;
    // Right wall: x + width exceeds room width
    const onRightWall = !onLeftWall && (item.x + item.width > room.width);
    // Top wall: y is negative (item extends into top wall)
    const onTopWall = !onLeftWall && !onRightWall && item.y < 0;
    // Bottom wall: y + height exceeds room height
    const onBottomWall = !onLeftWall && !onRightWall && !onTopWall && (item.y + item.height > room.height);

    if (onTopWall) {
      // TOP WALL - Show left and right edge measurements outside the room
      const leftDist = Math.round(x / PIXELS_PER_CM);
      const rightDist = Math.round((roomW - (x + w)) / PIXELS_PER_CM);
      const measureY = -outsideOffset; // All lines at same distance from wall
      
      // Track label positions to avoid overlaps
      const existingLabels: Array<{ x: number; y: number; width: number; height: number }> = [];
      const padding = 4;
      const charWidth = fontSize * 0.6;
      
      // Calculate label positions with collision avoidance
      const itemWidthText = formatMeasurement(item.width, unit);
      const itemWidthPos = adjustLabelPosition(
        x + w / 2,
        measureY - 15,
        itemWidthText,
        existingLabels,
        false
      );
      existingLabels.push({
        x: itemWidthPos.x - (itemWidthText.length * charWidth + padding * 2) / 2,
        y: itemWidthPos.y - (fontSize + padding * 2) / 2,
        width: itemWidthText.length * charWidth + padding * 2,
        height: fontSize + padding * 2,
      });
      
      const leftDistText = formatMeasurement(leftDist, unit);
      const leftDistPos = leftDist > 0 ? adjustLabelPosition(
        x / 2,
        measureY - 15,
        leftDistText,
        existingLabels,
        false
      ) : { x: 0, y: 0 };
      if (leftDist > 0) {
        existingLabels.push({
          x: leftDistPos.x - (leftDistText.length * charWidth + padding * 2) / 2,
          y: leftDistPos.y - (fontSize + padding * 2) / 2,
          width: leftDistText.length * charWidth + padding * 2,
          height: fontSize + padding * 2,
        });
      }
      
      const rightDistText = formatMeasurement(rightDist, unit);
      const rightDistPos = rightDist > 0 ? adjustLabelPosition(
        x + w + (roomW - (x + w)) / 2,
        measureY - 15,
        rightDistText,
        existingLabels,
        false
      ) : { x: 0, y: 0 };
      
      return (
        <Group>
          {/* Item width measurement - blue dashed line across the item */}
          <Line 
            points={[x, measureY, x + w, measureY]} 
            stroke={COLORS.dimension} 
            dash={dash} 
            strokeWidth={1.5} 
          />
          <DimensionLabel 
            x={itemWidthPos.x} 
            y={itemWidthPos.y} 
            text={itemWidthText}
            color={COLORS.dimension}
          />
          
          {/* Left edge measurement - only show if > 0 */}
          {leftDist > 0 && (
            <>
              <Line 
                points={[0, measureY, x, measureY]} 
                stroke={COLORS.edge} 
                dash={dash} 
                strokeWidth={1.5} 
              />
              <DimensionLabel 
                x={leftDistPos.x} 
                y={leftDistPos.y} 
                text={leftDistText}
                color={COLORS.edge}
              />
            </>
          )}
          
          {/* Right edge measurement - only show if > 0 */}
          {rightDist > 0 && (
            <>
              <Line 
                points={[x + w, measureY, roomW, measureY]} 
                stroke={COLORS.edge} 
                dash={dash} 
                strokeWidth={1.5} 
              />
              <DimensionLabel 
                x={rightDistPos.x} 
                y={rightDistPos.y} 
                text={rightDistText}
                color={COLORS.edge}
              />
            </>
          )}
        </Group>
      );
    }
    
    if (onBottomWall) {
      // BOTTOM WALL - Show left and right edge measurements outside the room
      const leftDist = Math.round(x / PIXELS_PER_CM);
      const rightDist = Math.round((roomW - (x + w)) / PIXELS_PER_CM);
      const measureY = roomH + outsideOffset; // All lines at same distance from wall
      
      return (
        <Group>
          {/* Item width measurement - blue dashed line across the item */}
          <Line 
            points={[x, measureY, x + w, measureY]} 
            stroke={COLORS.dimension} 
            dash={dash} 
            strokeWidth={1.5} 
          />
          <DimensionLabel 
            x={x + w / 2} 
            y={measureY + 15} 
            text={formatMeasurement(item.width, unit)}
            color={COLORS.dimension}
          />
          
          {/* Left edge measurement - only show if > 0 */}
          {leftDist > 0 && (
            <>
              <Line 
                points={[0, measureY, x, measureY]} 
                stroke={COLORS.edge} 
                dash={dash} 
                strokeWidth={1.5} 
              />
              <DimensionLabel 
                x={x / 2} 
                y={measureY + 15} 
                text={formatMeasurement(leftDist, unit)}
                color={COLORS.edge}
              />
            </>
          )}
          
          {/* Right edge measurement - only show if > 0 */}
          {rightDist > 0 && (
            <>
              <Line 
                points={[x + w, measureY, roomW, measureY]} 
                stroke={COLORS.edge} 
                dash={dash} 
                strokeWidth={1.5} 
              />
              <DimensionLabel 
                x={x + w + (roomW - (x + w)) / 2} 
                y={measureY + 15} 
                text={formatMeasurement(rightDist, unit)}
                color={COLORS.edge}
              />
            </>
          )}
        </Group>
      );
    }
    
    if (onLeftWall) {
      // LEFT WALL - Show top and bottom edge measurements outside the room
      // Treat item.y as the START of the window (consistent with horizontal walls)
      const windowStartY = y;
      const windowEndY = y + item.width * PIXELS_PER_CM;
      const visualCenterY = y + (item.width * PIXELS_PER_CM) / 2;
      
      const topDist = Math.round(item.y);
      const bottomDist = Math.round(room.height - (item.y + item.width));
      const measureX = -outsideOffset;
      
      // Track label positions to avoid overlaps (vertical wall)
      const existingLabels: Array<{ x: number; y: number; width: number; height: number }> = [];
      const padding = 4;
      const charWidth = fontSize * 0.6;
      
      // Calculate label positions with collision avoidance
      const itemWidthText = formatMeasurement(item.width, unit);
      const itemWidthPos = adjustLabelPosition(
        measureX - 30,
        visualCenterY,
        itemWidthText,
        existingLabels,
        true
      );
      existingLabels.push({
        x: itemWidthPos.x - (itemWidthText.length * charWidth + padding * 2) / 2,
        y: itemWidthPos.y - (fontSize + padding * 2) / 2,
        width: itemWidthText.length * charWidth + padding * 2,
        height: fontSize + padding * 2,
      });
      
      const topDistText = formatMeasurement(topDist, unit);
      const topDistPos = topDist > 0 ? adjustLabelPosition(
        measureX - 30,
        windowStartY / 2,
        topDistText,
        existingLabels,
        true
      ) : { x: 0, y: 0 };
      if (topDist > 0) {
        existingLabels.push({
          x: topDistPos.x - (topDistText.length * charWidth + padding * 2) / 2,
          y: topDistPos.y - (fontSize + padding * 2) / 2,
          width: topDistText.length * charWidth + padding * 2,
          height: fontSize + padding * 2,
        });
      }
      
      const bottomDistText = formatMeasurement(bottomDist, unit);
      const bottomDistPos = bottomDist > 0 ? adjustLabelPosition(
        measureX - 30,
        windowEndY + (roomH - windowEndY) / 2,
        bottomDistText,
        existingLabels,
        true
      ) : { x: 0, y: 0 };
      
      return (
        <Group>
          {/* Item width measurement - blue dashed line along the item */}
          <Line 
            points={[measureX, windowStartY, measureX, windowEndY]} 
            stroke={COLORS.dimension} 
            dash={dash} 
            strokeWidth={1.5} 
          />
          <DimensionLabel 
            x={itemWidthPos.x} 
            y={itemWidthPos.y} 
            text={itemWidthText}
            color={COLORS.dimension}
          />
          
          {/* Top edge measurement - only show if > 0 */}
          {topDist > 0 && (
            <>
              <Line 
                points={[measureX, 0, measureX, windowStartY]} 
                stroke={COLORS.edge} 
                dash={dash} 
                strokeWidth={1.5} 
              />
              <DimensionLabel 
                x={topDistPos.x} 
                y={topDistPos.y} 
                text={topDistText}
                color={COLORS.edge}
              />
            </>
          )}
          
          {/* Bottom edge measurement - only show if > 0 */}
          {bottomDist > 0 && (
            <>
              <Line 
                points={[measureX, windowEndY, measureX, roomH]} 
                stroke={COLORS.edge} 
                dash={dash} 
                strokeWidth={1.5} 
              />
              <DimensionLabel 
                x={bottomDistPos.x} 
                y={bottomDistPos.y} 
                text={bottomDistText}
                color={COLORS.edge}
              />
            </>
          )}
        </Group>
      );
    }
    
    if (onRightWall) {
      // RIGHT WALL - Show top and bottom edge measurements outside the room
      // Treat item.y as the START of the window (consistent with horizontal walls)
      const windowStartY = y;
      const windowEndY = y + item.width * PIXELS_PER_CM;
      const visualCenterY = y + (item.width * PIXELS_PER_CM) / 2;
      
      const topDist = Math.round(item.y);
      const bottomDist = Math.round(room.height - (item.y + item.width));
      const measureX = roomW + outsideOffset;
      
      return (
        <Group>
          {/* Item width measurement - blue dashed line along the item */}
          <Line 
            points={[measureX, windowStartY, measureX, windowEndY]} 
            stroke={COLORS.dimension} 
            dash={dash} 
            strokeWidth={1.5} 
          />
          <DimensionLabel 
            x={measureX + 30} 
            y={visualCenterY} 
            text={formatMeasurement(item.width, unit)}
            color={COLORS.dimension}
          />
          
          {/* Top edge measurement - only show if > 0 */}
          {topDist > 0 && (
            <>
              <Line 
                points={[measureX, 0, measureX, windowStartY]} 
                stroke={COLORS.edge} 
                dash={dash} 
                strokeWidth={1.5} 
              />
              <DimensionLabel 
                x={measureX + 30} 
                y={windowStartY / 2} 
                text={formatMeasurement(topDist, unit)}
                color={COLORS.edge}
              />
            </>
          )}
          
          {/* Bottom edge measurement - only show if > 0 */}
          {bottomDist > 0 && (
            <>
              <Line 
                points={[measureX, windowEndY, measureX, roomH]} 
                stroke={COLORS.edge} 
                dash={dash} 
                strokeWidth={1.5} 
              />
              <DimensionLabel 
                x={measureX + 30} 
                y={windowEndY + (roomH - windowEndY) / 2} 
                text={formatMeasurement(bottomDist, unit)}
                color={COLORS.edge}
              />
            </>
          )}
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

  // Gap around center for rotation button
  const buttonRadius = 20; // Space to leave clear for rotation button
  
  // Determine which dimension to show on which axis based on rotation
  // At 0° or 180°: horizontal = width, vertical = height
  // At 90° or 270°: horizontal = height, vertical = width
  const horizontalLabel = isRotated90 ? actualHeight : actualWidth;
  const verticalLabel = isRotated90 ? actualWidth : actualHeight;
  
  return (
    <Group>
      {/* Furniture dimensions - blue lines showing width and height, split to avoid rotation button */}
      {/* Horizontal dimension lines - split at center */}
      <Line points={[x, midY, midX - buttonRadius, midY]} stroke={COLORS.dimension} dash={dash} strokeWidth={1.5} />
      <Line points={[midX + buttonRadius, midY, x + w, midY]} stroke={COLORS.dimension} dash={dash} strokeWidth={1.5} />
      <DimensionLabel 
        x={x + w / 4} 
        y={midY - labelOffset} 
        text={formatMeasurement(horizontalLabel, unit)}
        color={COLORS.dimension}
      />
      
      {/* Vertical dimension lines - split at center */}
      <Line points={[midX, y, midX, midY - buttonRadius]} stroke={COLORS.dimension} dash={dash} strokeWidth={1.5} />
      <Line points={[midX, midY + buttonRadius, midX, y + h]} stroke={COLORS.dimension} dash={dash} strokeWidth={1.5} />
      <DimensionLabel 
        x={midX + labelOffset + 10} 
        y={y + h / 4} 
        text={formatMeasurement(verticalLabel, unit)}
        color={COLORS.dimension}
      />
      
      {/* Left gap - red line from wall/obstacle to furniture */}
      <Line points={[leftBound, midY, x, midY]} stroke={COLORS.distance} dash={dash} strokeWidth={1.5} />
      <DimensionLabel 
        x={adjustLabelX((leftBound + x) / 2, formatMeasurement(Math.round((x - leftBound) / PIXELS_PER_CM), unit).length * fontSize * 0.6)} 
        y={midY + labelOffset + 5} 
        text={formatMeasurement(Math.round((x - leftBound) / PIXELS_PER_CM), unit)}
        color={COLORS.distance}
      />

      {/* Right gap - red line from furniture to wall/obstacle */}
      <Line points={[x + w, midY, rightBound, midY]} stroke={COLORS.distance} dash={dash} strokeWidth={1.5} />
      <DimensionLabel 
        x={adjustLabelX((x + w + rightBound) / 2, formatMeasurement(Math.round((rightBound - (x + w)) / PIXELS_PER_CM), unit).length * fontSize * 0.6)} 
        y={midY + labelOffset + 5} 
        text={formatMeasurement(Math.round((rightBound - (x + w)) / PIXELS_PER_CM), unit)}
        color={COLORS.distance}
      />

      {/* Top gap - red line from wall/obstacle to furniture */}
      <Line points={[midX, topBound, midX, y]} stroke={COLORS.distance} dash={dash} strokeWidth={1.5} />
      <DimensionLabel 
        x={midX - labelOffset - 10} 
        y={adjustLabelY((topBound + y) / 2, fontSize)} 
        text={formatMeasurement(Math.round((y - topBound) / PIXELS_PER_CM), unit)}
        color={COLORS.distance}
      />

      {/* Bottom gap - red line from furniture to wall/obstacle */}
      <Line points={[midX, y + h, midX, bottomBound]} stroke={COLORS.distance} dash={dash} strokeWidth={1.5} />
      <DimensionLabel 
        x={midX - labelOffset - 10} 
        y={adjustLabelY((y + h + bottomBound) / 2, fontSize)} 
        text={formatMeasurement(Math.round((bottomBound - (y + h)) / PIXELS_PER_CM), unit)}
        color={COLORS.distance}
      />
    </Group>
  );
};

export default MeasurementOverlay;
