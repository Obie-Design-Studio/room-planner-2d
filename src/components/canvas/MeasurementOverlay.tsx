import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  onItemChange?: (id: string, updates: Partial<FurnitureItem>) => void;
  stageRef?: React.RefObject<any>;
  scale?: number;
  stagePos?: { x: number; y: number };
  layerOffset?: { x: number; y: number };
  measurementClickTimeRef?: React.MutableRefObject<number>;
}

type MeasurementDirection = 'left' | 'right' | 'top' | 'bottom' | null;

const MeasurementOverlay: React.FC<Props> = ({ 
  item, 
  room, 
  otherItems = [], 
  zoom = 1.0, 
  unit = 'cm', 
  onItemChange,
  stageRef,
  scale = 1,
  stagePos = { x: 0, y: 0 },
  layerOffset = { x: 0, y: 0 },
  measurementClickTimeRef
}) => {
  const [editingDirection, setEditingDirection] = useState<MeasurementDirection>(null);
  const [editValue, setEditValue] = useState('');
  const [inputPosition, setInputPosition] = useState({ x: 0, y: 0 });
  const inputRef = useRef<HTMLInputElement>(null);
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
  
  // Zoom-aware font size for furniture measurements
  // At 100% zoom: 24px, at 300% zoom: 32px, at 10% zoom: 20px
  const baseFontSize = 24;
  const fontSize = Math.max(20, Math.min(36, baseFontSize + (zoom - 1) * 8));
  
  // LARGER font size for wall object measurements (doors/windows) - 2x bigger
  // At 100% zoom: 32px, scales up to 48px at high zoom, down to 28px at low zoom
  const wallBaseFontSize = 32;
  const wallFontSize = Math.max(28, Math.min(48, wallBaseFontSize + (zoom - 1) * 12));
  
  // Zoom-aware offsets for better spacing at different zoom levels
  const outsideOffset = Math.max(20, Math.min(40, 30 / zoom)); // Distance outside room for wall object measurements
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
    const padding = 8; // Match the padding in DimensionLabel
    const charWidth = fontSize * 1.1; // Match the charWidth in DimensionLabel
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

  // Helper: Start editing a measurement
  const startEditing = (direction: MeasurementDirection, currentValue: number) => {
    if (!onItemChange || !stageRef?.current) return;
    
    // Calculate canvas position for this direction
    let canvasX = 0;
    let canvasY = 0;
    
    const midX = x + w / 2;
    const midY = y + h / 2;
    
    switch (direction) {
      case 'left':
        canvasX = (leftBound + x) / 2;
        canvasY = midY + labelOffset + 5;
        break;
      case 'right':
        canvasX = (x + w + rightBound) / 2;
        canvasY = midY + labelOffset + 5;
        break;
      case 'top':
        canvasX = midX - labelOffset - 10;
        canvasY = (topBound + y) / 2;
        break;
      case 'bottom':
        canvasX = midX - labelOffset - 10;
        canvasY = (y + h + bottomBound) / 2;
        break;
    }
    
    // Convert canvas coordinates to screen coordinates
    const stage = stageRef.current;
    const stageBox = stage.container().getBoundingClientRect();
    
    const screenX = stageBox.left + (canvasX * scale) + layerOffset.x + stagePos.x;
    const screenY = stageBox.top + (canvasY * scale) + layerOffset.y + stagePos.y;
    
    setInputPosition({ x: screenX, y: screenY });
    setEditingDirection(direction);
    setEditValue(currentValue.toString());
  };

  // Auto-focus input when editing starts
  useEffect(() => {
    if (editingDirection && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingDirection]);

  // Render edit input as side effect to completely avoid React-Konva reconciler
  useEffect(() => {
    if (!editingDirection || typeof window === 'undefined') {
      return;
    }

    const container = document.createElement('div');
    container.id = 'measurement-edit-container';
    container.style.cssText = `
      position: fixed;
      left: ${inputPosition.x}px;
      top: ${inputPosition.y}px;
      transform: translate(-50%, -50%);
      z-index: 10000;
    `;

    const input = document.createElement('input');
    input.type = 'number';
    input.value = editValue;
    input.id = 'measurement-edit-input';
    input.style.cssText = `
      width: 80px;
      padding: 6px 10px;
      font-size: 16px;
      font-family: -apple-system, BlinkMacSystemFont, "Inter", sans-serif;
      font-weight: 600;
      text-align: center;
      border: 3px solid #3b82f6;
      border-radius: 6px;
      outline: none;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      background-color: white;
    `;

    const hint = document.createElement('div');
    hint.textContent = 'Enter to save • Esc to cancel';
    hint.style.cssText = `
      margin-top: 4px;
      font-size: 12px;
      color: #6b7280;
      text-align: center;
      font-family: -apple-system, BlinkMacSystemFont, "Inter", sans-serif;
    `;

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        // Read value directly from input to avoid stale closure
        const value = input.value;
        saveEditedMeasurement(value);
      } else if (e.key === 'Escape') {
        setEditingDirection(null);
      }
    });

    input.addEventListener('blur', () => {
      // Small delay to allow click events to process first
      setTimeout(() => {
        setEditingDirection(null);
      }, 100);
    });

    container.appendChild(input);
    container.appendChild(hint);
    document.body.appendChild(container);

    // Delay focus slightly to ensure element is in DOM
    setTimeout(() => {
      input.focus();
      input.select();
    }, 10);

    return () => {
      if (document.body.contains(container)) {
        document.body.removeChild(container);
      }
    };
  }, [editingDirection, inputPosition.x, inputPosition.y]);

  // Helper: Save edited measurement and update furniture position
  const saveEditedMeasurement = (inputValue: string) => {
    if (!onItemChange || !editingDirection) {
      return;
    }

    const newDistanceCm = parseFloat(inputValue);
    if (isNaN(newDistanceCm) || newDistanceCm < 0) {
      setEditingDirection(null);
      setEditValue('');
      return;
    }

    // Account for rotation when calculating visual dimensions
    const rotation = item.rotation || 0;
    const isRotated90 = rotation === 90 || rotation === 270;
    const visualW = (isRotated90 ? item.height : item.width);
    const visualH = (isRotated90 ? item.width : item.height);

    // Need to recalculate bounds for position calculation
    const currentX = item.x * PIXELS_PER_CM;
    const currentY = item.y * PIXELS_PER_CM;
    const visualWPx = visualW * PIXELS_PER_CM;
    const visualHPx = visualH * PIXELS_PER_CM;

    // Calculate nearest obstacles for each direction
    let leftBoundCm = 0;
    let rightBoundCm = room.width;
    let topBoundCm = 0;
    let bottomBoundCm = room.height;
    
    const midX = currentX + visualWPx / 2;
    const midY = currentY + visualHPx / 2;

    otherItems.forEach((other) => {
      const oX = other.x * PIXELS_PER_CM;
      const oY = other.y * PIXELS_PER_CM;
      
      const otherRotation = other.rotation || 0;
      const otherIsRotated90 = otherRotation === 90 || otherRotation === 270;
      const oW = (otherIsRotated90 ? other.height : other.width) * PIXELS_PER_CM;
      const oH = (otherIsRotated90 ? other.width : other.height) * PIXELS_PER_CM;

      if (isBetween(midY, oY, oY + oH)) {
        if (oX + oW <= currentX) leftBoundCm = Math.max(leftBoundCm, (oX + oW) / PIXELS_PER_CM);
        if (oX >= currentX + visualWPx) rightBoundCm = Math.min(rightBoundCm, oX / PIXELS_PER_CM);
      }

      if (isBetween(midX, oX, oX + oW)) {
        if (oY + oH <= currentY) topBoundCm = Math.max(topBoundCm, (oY + oH) / PIXELS_PER_CM);
        if (oY >= currentY + visualHPx) bottomBoundCm = Math.min(bottomBoundCm, oY / PIXELS_PER_CM);
      }
    });

    let newX = item.x;
    let newY = item.y;

    // Calculate new position based on direction
    switch (editingDirection) {
      case 'left':
        newX = leftBoundCm + newDistanceCm;
        break;
      case 'right':
        newX = rightBoundCm - visualW - newDistanceCm;
        break;
      case 'top':
        newY = topBoundCm + newDistanceCm;
        break;
      case 'bottom':
        newY = bottomBoundCm - visualH - newDistanceCm;
        break;
    }

    onItemChange(item.id, { x: newX, y: newY });
    setEditingDirection(null);
  };

  // Helper component: Dimension label with white background (for furniture)
  const DimensionLabel = ({ x, y, text, color = '#1a1a1a', customFontSize }: { x: number; y: number; text: string; color?: string; customFontSize?: number }) => {
    const actualFontSize = customFontSize || fontSize;
    const padding = 12;
    
    // Use very generous width to ensure text fits
    const estimatedWidth = text.length * actualFontSize * 0.7 + 30;
    const boxWidth = Math.max(estimatedWidth, 80); // Minimum 80px wide
    const boxHeight = actualFontSize + padding * 2;
    
    // Calculate positions - center x,y is the center of the label
    const boxX = x - boxWidth / 2;
    const boxY = y - boxHeight / 2;
    
    return (
      <Group>
        <Rect
          x={boxX}
          y={boxY}
          width={boxWidth}
          height={boxHeight}
          fill="white"
          stroke="#e5e5e5"
          strokeWidth={1}
          cornerRadius={4}
        />
        <Text
          x={boxX}
          y={y - actualFontSize / 2}
          text={text}
          fill={color}
          fontSize={actualFontSize}
          fontFamily="Arial, sans-serif"
          fontStyle="bold"
          align="center"
          width={boxWidth}
        />
      </Group>
    );
  };

  // Helper component: LARGE dimension label for wall objects (doors/windows) - 2x size
  const WallDimensionLabel = ({ x, y, text, color = '#1a1a1a' }: { x: number; y: number; text: string; color?: string }) => {
    const actualFontSize = wallFontSize;
    const padding = 14;
    
    // Use very generous width to ensure text fits
    const estimatedWidth = text.length * actualFontSize * 0.7 + 40;
    const boxWidth = Math.max(estimatedWidth, 100); // Minimum 100px wide for larger labels
    const boxHeight = actualFontSize + padding * 2;
    
    // Calculate positions - center x,y is the center of the label
    const boxX = x - boxWidth / 2;
    const boxY = y - boxHeight / 2;
    
    return (
      <Group>
        <Rect
          x={boxX}
          y={boxY}
          width={boxWidth}
          height={boxHeight}
          fill="white"
          stroke="#e5e5e5"
          strokeWidth={1}
          cornerRadius={4}
        />
        <Text
          x={boxX}
          y={y - actualFontSize / 2}
          text={text}
          fill={color}
          fontSize={actualFontSize}
          fontFamily="Arial, sans-serif"
          fontStyle="bold"
          align="center"
          width={boxWidth}
        />
      </Group>
    );
  };

  // Helper component: Editable dimension label (for distance measurements)
  const EditableDimensionLabel = ({ 
    x, 
    y, 
    text, 
    color = '#1a1a1a', 
    customFontSize,
    direction,
    value
  }: { 
    x: number; 
    y: number; 
    text: string; 
    color?: string; 
    customFontSize?: number;
    direction: MeasurementDirection;
    value: number;
  }) => {
    const actualFontSize = customFontSize || fontSize;
    const padding = 12;
    
    // Use very generous width to ensure text fits
    const estimatedWidth = text.length * actualFontSize * 0.7 + 30;
    const boxWidth = Math.max(estimatedWidth, 80); // Minimum 80px wide
    const boxHeight = actualFontSize + padding * 2;
    
    // Calculate positions - center x,y is the center of the label
    const boxX = x - boxWidth / 2;
    const boxY = y - boxHeight / 2;
    
    const isEditable = onItemChange !== undefined;
    
    return (
      <Group name="dimension-label">
        <Rect
          x={boxX}
          y={boxY}
          width={boxWidth}
          height={boxHeight}
          fill="white"
          stroke={isEditable ? color : "#e5e5e5"}
          strokeWidth={isEditable ? 2 : 1}
          cornerRadius={4}
          listening={isEditable}
          name="dimension-label-rect"
          onMouseDown={(e) => {
            if (isEditable) {
              e.evt.stopPropagation();
              e.cancelBubble = true;
              
              // Set timestamp to prevent deselection on mouseup
              if (measurementClickTimeRef) {
                measurementClickTimeRef.current = Date.now();
              }
              
              startEditing(direction, value);
            }
          }}
          onMouseUp={(e) => {
            if (isEditable) {
              e.evt.stopPropagation();
              e.cancelBubble = true;
            }
          }}
          onMouseEnter={(e) => {
            if (isEditable) {
              const stage = e.target.getStage();
              if (stage) stage.container().style.cursor = 'pointer';
            }
          }}
          onMouseLeave={(e) => {
            if (isEditable) {
              const stage = e.target.getStage();
              if (stage) stage.container().style.cursor = 'default';
            }
          }}
        />
        <Text
          x={boxX}
          y={y - actualFontSize / 2}
          text={text}
          fill={color}
          fontSize={actualFontSize}
          fontFamily="Arial, sans-serif"
          fontStyle="bold"
          align="center"
          width={boxWidth}
          listening={false}
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
      const padding = 8; // Match DimensionLabel padding
      const charWidth = fontSize * 1.1; // Match DimensionLabel charWidth
      
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
          <WallDimensionLabel 
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
              <WallDimensionLabel 
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
              <WallDimensionLabel 
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
          <WallDimensionLabel 
            x={x + w / 2} 
            y={measureY + 25} 
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
              <WallDimensionLabel 
                x={x / 2} 
                y={measureY + 25} 
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
              <WallDimensionLabel 
                x={x + w + (roomW - (x + w)) / 2} 
                y={measureY + 25} 
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
      const padding = 8; // Match DimensionLabel padding
      const charWidth = fontSize * 1.1; // Match DimensionLabel charWidth
      
      // Calculate label positions with collision avoidance
      const itemWidthText = formatMeasurement(item.width, unit);
      const itemWidthPos = adjustLabelPosition(
        measureX - 60,
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
        measureX - 60,
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
        measureX - 60,
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
          <WallDimensionLabel 
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
              <WallDimensionLabel 
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
              <WallDimensionLabel 
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
          <WallDimensionLabel 
            x={measureX + 50} 
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
              <WallDimensionLabel 
                x={measureX + 50} 
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
              <WallDimensionLabel 
                x={measureX + 50} 
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
    
    // Account for rotation when calculating visual dimensions
    const otherRotation = other.rotation || 0;
    const otherIsRotated90 = otherRotation === 90 || otherRotation === 270;
    const oW = (otherIsRotated90 ? other.height : other.width) * PIXELS_PER_CM;
    const oH = (otherIsRotated90 ? other.width : other.height) * PIXELS_PER_CM;

    if (isBetween(midY, oY, oY + oH)) {
      if (oX + oW <= x) leftBound = Math.max(leftBound, oX + oW);
      if (oX >= x + w) rightBound = Math.min(rightBound, oX);
    }

    if (isBetween(midX, oX, oX + oW)) {
      if (oY + oH <= y) topBound = Math.max(topBound, oY + oH);
      if (oY >= y + h) bottomBound = Math.min(bottomBound, oY);
    }
  });

  // Gap around center for rotation button (smart sized)
  const minDim = Math.min(w, h);
  const baseButtonRadius = Math.min(32, Math.max(16, minDim * 0.15));
  const zoomAdjustedButtonRadius = baseButtonRadius * Math.sqrt(zoom);
  const buttonRadius = Math.max(16, Math.min(48, zoomAdjustedButtonRadius)) + 10; // Button radius + margin
  
  // Determine which dimension to show on which axis based on rotation
  // At 0° or 180°: horizontal = width, vertical = height
  // At 90° or 270°: horizontal = height, vertical = width
  const horizontalLabel = isRotated90 ? actualHeight : actualWidth;
  const verticalLabel = isRotated90 ? actualWidth : actualHeight;
  
  return (
    <Group listening={true} name="measurement-overlay">
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
      <EditableDimensionLabel 
        x={adjustLabelX((leftBound + x) / 2, formatMeasurement(Math.round((x - leftBound) / PIXELS_PER_CM), unit).length * fontSize * 0.6)} 
        y={midY + labelOffset + 5} 
        text={formatMeasurement(Math.round((x - leftBound) / PIXELS_PER_CM), unit)}
        color={COLORS.distance}
        direction="left"
        value={Math.round((x - leftBound) / PIXELS_PER_CM)}
      />

      {/* Right gap - red line from furniture to wall/obstacle */}
      <Line points={[x + w, midY, rightBound, midY]} stroke={COLORS.distance} dash={dash} strokeWidth={1.5} />
      <EditableDimensionLabel 
        x={adjustLabelX((x + w + rightBound) / 2, formatMeasurement(Math.round((rightBound - (x + w)) / PIXELS_PER_CM), unit).length * fontSize * 0.6)} 
        y={midY + labelOffset + 5} 
        text={formatMeasurement(Math.round((rightBound - (x + w)) / PIXELS_PER_CM), unit)}
        color={COLORS.distance}
        direction="right"
        value={Math.round((rightBound - (x + w)) / PIXELS_PER_CM)}
      />

      {/* Top gap - red line from wall/obstacle to furniture */}
      <Line points={[midX, topBound, midX, y]} stroke={COLORS.distance} dash={dash} strokeWidth={1.5} />
      <EditableDimensionLabel 
        x={midX - labelOffset - 10} 
        y={adjustLabelY((topBound + y) / 2, fontSize)} 
        text={formatMeasurement(Math.round((y - topBound) / PIXELS_PER_CM), unit)}
        color={COLORS.distance}
        direction="top"
        value={Math.round((y - topBound) / PIXELS_PER_CM)}
      />

      {/* Bottom gap - red line from furniture to wall/obstacle */}
      <Line points={[midX, y + h, midX, bottomBound]} stroke={COLORS.distance} dash={dash} strokeWidth={1.5} />
      <EditableDimensionLabel 
        x={midX - labelOffset - 10} 
        y={adjustLabelY((y + h + bottomBound) / 2, fontSize)} 
        text={formatMeasurement(Math.round((bottomBound - (y + h)) / PIXELS_PER_CM), unit)}
        color={COLORS.distance}
        direction="bottom"
        value={Math.round((bottomBound - (y + h)) / PIXELS_PER_CM)}
      />
    </Group>
  );
};

export default MeasurementOverlay;
