import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Group, Line, Text, Rect } from 'react-konva';
import { FurnitureItem, RoomConfig, ViewMode } from '@/types';
import { PIXELS_PER_CM } from '@/lib/constants';
import { type Unit, formatMeasurement, formatDimensions } from '@/lib/unitConversion';

export type MeasurementMode = 'all' | 'hover' | 'manual';

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
  hiddenMeasurements?: Set<string>;
  onToggleMeasurement?: (measurementId: string) => void;
  viewMode?: ViewMode;
  measurementMode?: MeasurementMode;
  pinnedMeasurements?: Set<string>;
  hoveredItemId?: string | null;
  showLabels?: boolean;
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
  measurementClickTimeRef,
  hiddenMeasurements = new Set(),
  onToggleMeasurement,
  viewMode = 'blueprint',
  measurementMode = 'all',
  pinnedMeasurements = new Set(),
  hoveredItemId = null,
  showLabels = false,
}) => {
  // Debug logging
  console.log('MeasurementOverlay render:', { 
    itemId: item.id,
    viewMode, 
    hasOnToggleMeasurement: !!onToggleMeasurement,
    hiddenMeasurementsSize: hiddenMeasurements.size 
  });
  
  const [editingDirection, setEditingDirection] = useState<MeasurementDirection>(null);
  const [editValue, setEditValue] = useState('');
  const [inputPosition, setInputPosition] = useState({ x: 0, y: 0 });
  const [hoveredMeasurement, setHoveredMeasurement] = useState<string | null>(null);
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
  const isWall = item.type.toLowerCase() === 'wall';
  
  // Color-coded measurement types - Updated palette
  const COLORS = {
    dimension: '#3b82f6',    // Blue for item dimensions (W × H)
    edge: '#6b7280',         // Gray for room edge distances (wall objects) - less prominent
    distance: '#f59e0b',     // Amber for furniture-to-obstacle distances - less alarming
  };
  
  // Line styles by measurement type - Visual hierarchy
  const getLineStyle = (type: 'room' | 'item' | 'edge' | 'spacing') => {
    switch(type) {
      case 'room': 
        return { dash: undefined, strokeWidth: 3, opacity: 1.0 };
      case 'item': 
        return { dash: [4, 4], strokeWidth: 2, opacity: 0.8 };
      case 'edge': 
        return { dash: [4, 4], strokeWidth: 1.5, opacity: 0.6 };
      case 'spacing': 
        return { dash: [2, 8], strokeWidth: 1, opacity: 0.4 };
    }
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
  
  // Minimum distance from furniture edge: ensure at least 8cm (or 8px * zoom) of padding
  const MIN_EDGE_PADDING_CM = 8;
  const minPaddingPx = MIN_EDGE_PADDING_CM * PIXELS_PER_CM;
  const labelOffset = Math.max(minPaddingPx, Math.min(30, 20 / zoom)); // Offset for labels from measurement lines

  // Calculate furniture center and nearest obstacles (needed for startEditing)
  const midX = x + w / 2;
  const midY = y + h / 2;

  let leftBound = 0;
  let rightBound = roomW;
  let topBound = 0;
  let bottomBound = roomH;

  // Helper: check if a value is inside a range
  const isBetween = (val: number, min: number, max: number) => val >= min && val <= max;

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
    console.log('[StartEditing] Called with:', { direction, currentValue, itemType: item.type, onItemChange: !!onItemChange });
    
    if (!onItemChange || !stageRef?.current) {
      console.log('[StartEditing] Aborted - missing onItemChange or stageRef');
      return;
    }
    
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
  const WallDimensionLabel = ({ x, y, text, color = '#1a1a1a', measurementId }: { x: number; y: number; text: string; color?: string; measurementId?: string }) => {
    const actualFontSize = wallFontSize;
    const padding = 14;
    
    // Use very generous width to ensure text fits
    const estimatedWidth = text.length * actualFontSize * 0.7 + 40;
    const boxWidth = Math.max(estimatedWidth, 100); // Minimum 100px wide for larger labels
    const boxHeight = actualFontSize + padding * 2;
    
    // Calculate positions - center x,y is the center of the label
    const boxX = x - boxWidth / 2;
    const boxY = y - boxHeight / 2;
    
    // Interactive state
    const isInMeasurementsView = viewMode === 'measurements';
    const isHidden = measurementId ? hiddenMeasurements.has(measurementId) : false;
    const isHovered = measurementId ? hoveredMeasurement === measurementId : false;
    
    // Apply opacity for hidden state
    const opacity = isHidden ? 0.15 : 1.0;
    const strokeColor = isInMeasurementsView && isHovered ? '#3b82f6' : '#e5e5e5';
    const fillColor = isInMeasurementsView && isHovered ? '#3b82f6' : color;
    
    return (
      <Group
        listening={isInMeasurementsView && !!measurementId}
        opacity={opacity}
        onClick={(e) => {
          console.log('WallDimensionLabel clicked!', { measurementId, isInMeasurementsView, hasOnToggle: !!onToggleMeasurement });
          if (isInMeasurementsView && onToggleMeasurement && measurementId) {
            e.cancelBubble = true;
            console.log('Toggling measurement:', measurementId);
            onToggleMeasurement(measurementId);
          }
        }}
        onMouseEnter={(e) => {
          if (isInMeasurementsView && measurementId) {
            setHoveredMeasurement(measurementId);
            const stage = e.target.getStage();
            if (stage) stage.container().style.cursor = 'pointer';
          }
        }}
        onMouseLeave={(e) => {
          if (isInMeasurementsView && measurementId) {
            setHoveredMeasurement(null);
            const stage = e.target.getStage();
            if (stage) stage.container().style.cursor = 'default';
          }
        }}
      >
        <Rect
          x={boxX}
          y={boxY}
          width={boxWidth}
          height={boxHeight}
          fill="white"
          stroke={strokeColor}
          strokeWidth={isInMeasurementsView && isHovered ? 2 : 1}
          cornerRadius={4}
        />
        <Text
          x={boxX}
          y={y - actualFontSize / 2}
          text={text}
          fill={fillColor}
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
              console.log('[EditableDimensionLabel] Click detected!', {
                direction,
                value,
                itemType: item.type,
                itemId: item.id
              });
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

  // Helper component: Interactive measurement line with click-to-hide and hover
  const InteractiveMeasurementLine = ({
    measurementId,
    points,
    color,
    lineType = 'item',
    ...props
  }: {
    measurementId: string;
    points: number[];
    color: string;
    lineType?: 'room' | 'item' | 'edge' | 'spacing';
    [key: string]: any;
  }) => {
    const isHidden = hiddenMeasurements.has(measurementId);
    const isHovered = hoveredMeasurement === measurementId;
    const isPinned = pinnedMeasurements.has(measurementId);
    const isInMeasurementsView = viewMode === 'measurements';
    const isThisItemHovered = hoveredItemId === item.id;
    
    // Get line style based on type
    const lineStyle = getLineStyle(lineType);
    
    // Progressive disclosure logic
    let opacity = lineStyle.opacity;
    
    if (isInMeasurementsView && measurementMode !== 'all') {
      // In hover or manual mode
      if (measurementMode === 'hover') {
        // Show only if item is hovered or measurement is pinned
        if (isPinned) {
          opacity = lineStyle.opacity; // Full opacity for pinned
        } else if (isThisItemHovered || lineType === 'room') {
          opacity = lineStyle.opacity; // Show when hovering this item (or always show room)
        } else {
          opacity = 0.1; // Very faded when not hovered
        }
      } else if (measurementMode === 'manual') {
        // Show only if pinned or room dimension
        if (isPinned || lineType === 'room') {
          opacity = lineStyle.opacity;
        } else {
          opacity = 0.1; // Very faded until clicked
        }
      }
    }
    
    // Apply hidden state
    if (isHidden) {
      opacity = 0.15;
    }
    
    const strokeColor = isInMeasurementsView && isHovered ? '#3b82f6' : color;
    const strokeWidth = lineStyle.strokeWidth;
    const dashPattern = lineStyle.dash || props.dash;
    
    return (
      <Line
        points={points}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        dash={dashPattern}
        opacity={opacity}
        listening={isInMeasurementsView}
        hitStrokeWidth={isInMeasurementsView ? 20 : strokeWidth}
        onClick={(e) => {
          console.log('LINE onClick fired!', { measurementId, isInMeasurementsView, hasOnToggle: !!onToggleMeasurement });
          if (isInMeasurementsView && onToggleMeasurement) {
            e.cancelBubble = true;
            if (measurementClickTimeRef) {
              measurementClickTimeRef.current = Date.now();
            }
            console.log('Calling onToggleMeasurement with:', measurementId);
            onToggleMeasurement(measurementId);
          } else {
            console.log('NOT toggling - conditions not met:', { isInMeasurementsView, hasOnToggle: !!onToggleMeasurement });
          }
        }}
        onMouseEnter={(e) => {
          if (isInMeasurementsView) {
            setHoveredMeasurement(measurementId);
            const stage = e.target.getStage();
            if (stage) stage.container().style.cursor = 'pointer';
          }
        }}
        onMouseLeave={(e) => {
          if (isInMeasurementsView) {
            setHoveredMeasurement(null);
            const stage = e.target.getStage();
            if (stage) stage.container().style.cursor = 'default';
          }
        }}
        {...props}
      />
    );
  };

  // Helper component: Interactive dimension label with click-to-hide and hover
  const InteractiveDimensionLabel = ({
    measurementId,
    x,
    y,
    text,
    color = '#1a1a1a',
    customFontSize,
    isSecondary = false,
  }: {
    measurementId: string;
    x: number;
    y: number;
    text: string;
    color?: string;
    customFontSize?: number;
    isSecondary?: boolean;
  }) => {
    const actualFontSize = isSecondary ? (customFontSize || fontSize) * 0.85 : (customFontSize || fontSize);
    const padding = 12;
    
    const estimatedWidth = text.length * actualFontSize * 0.7 + 30;
    const boxWidth = Math.max(estimatedWidth, 80);
    const boxHeight = actualFontSize + padding * 2;
    
    const boxX = x - boxWidth / 2;
    const boxY = y - boxHeight / 2;
    
    const isHidden = hiddenMeasurements.has(measurementId);
    const isHovered = hoveredMeasurement === measurementId;
    const isPinned = pinnedMeasurements.has(measurementId);
    const isInMeasurementsView = viewMode === 'measurements';
    const isThisItemHovered = hoveredItemId === item.id;
    
    // Progressive disclosure for labels
    let opacity = 1.0;
    
    if (isInMeasurementsView && measurementMode !== 'all') {
      if (measurementMode === 'hover') {
        if (isPinned) {
          opacity = 1.0;
        } else if (isThisItemHovered) {
          opacity = 1.0;
        } else {
          opacity = 0.1;
        }
      } else if (measurementMode === 'manual') {
        if (isPinned) {
          opacity = 1.0;
        } else {
          opacity = 0.1;
        }
      }
    }
    
    if (isHidden) {
      opacity = 0.15;
    }
    
    const strokeColor = isInMeasurementsView && isHovered ? '#3b82f6' : '#e5e5e5';
    const fillColor = isInMeasurementsView && isHovered ? color : '#1a1a1a';
    const bgOpacity = isSecondary ? 0.9 : 1.0;
    
    return (
      <Group
        listening={isInMeasurementsView}
        onClick={(e) => {
          console.log('LABEL onClick fired!', { measurementId, isInMeasurementsView, hasOnToggle: !!onToggleMeasurement });
          if (isInMeasurementsView && onToggleMeasurement) {
            e.cancelBubble = true;
            if (measurementClickTimeRef) {
              measurementClickTimeRef.current = Date.now();
            }
            console.log('Calling onToggleMeasurement with:', measurementId);
            onToggleMeasurement(measurementId);
          } else {
            console.log('NOT toggling - conditions not met:', { isInMeasurementsView, hasOnToggle: !!onToggleMeasurement });
          }
        }}
        onMouseEnter={(e) => {
          if (isInMeasurementsView) {
            setHoveredMeasurement(measurementId);
            const stage = e.target.getStage();
            if (stage) stage.container().style.cursor = 'pointer';
          }
        }}
        onMouseLeave={(e) => {
          if (isInMeasurementsView) {
            setHoveredMeasurement(null);
            const stage = e.target.getStage();
            if (stage) stage.container().style.cursor = 'default';
          }
        }}
        opacity={opacity}
      >
        <Rect
          x={boxX}
          y={boxY}
          width={boxWidth}
          height={boxHeight}
          fill="white"
          opacity={bgOpacity}
          stroke={strokeColor}
          strokeWidth={isInMeasurementsView && isHovered ? 2 : 1}
          cornerRadius={4}
          shadowEnabled={!isSecondary && opacity > 0.5}
          shadowColor="rgba(0,0,0,0.1)"
          shadowBlur={2}
          shadowOffset={{ x: 0, y: 1 }}
        />
        <Text
          x={boxX}
          y={y - actualFontSize / 2}
          text={text}
          fill={fillColor}
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
      // TOP WALL - Show consecutive measurements between objects and walls
      const measureY = -outsideOffset;
      
      // Get all wall objects on the top wall (including this one)
      const topWallItems = [item, ...otherItems.filter(other => {
        const otherIsWallObj = other.type.toLowerCase() === 'window' || other.type.toLowerCase() === 'door';
        const otherOnTop = other.y < 0;
        return otherIsWallObj && otherOnTop;
      })].sort((a, b) => a.x - b.x); // Sort by x position
      
      // Find this item's index
      const thisIndex = topWallItems.findIndex(obj => obj.id === item.id);
      
      // Calculate measurements for this item
      const measurements: React.ReactNode[] = [];
      const existingLabels: Array<{ x: number; y: number; width: number; height: number }> = [];
      const padding = 8;
      const charWidth = fontSize * 1.1;
      
      // Show width of this item
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
      
      measurements.push(
        <InteractiveMeasurementLine
          key={`${item.id}-top-width-line`}
          measurementId={`${item.id}-top-width`}
          points={[x, measureY, x + w, measureY]} 
          color={COLORS.dimension}
          lineType="item"
        />,
        <WallDimensionLabel
          key={`${item.id}-top-width-label`}
          measurementId={`${item.id}-top-width`}
          x={itemWidthPos.x} 
          y={itemWidthPos.y} 
          text={itemWidthText}
          color={COLORS.dimension}
        />
      );
      
      // Show distance to left (either wall or previous object)
      if (thisIndex === 0) {
        // First object - measure to left wall
        const leftDist = Math.round(item.x);
        if (leftDist > 0) {
          const leftDistText = formatMeasurement(leftDist, unit);
          const leftDistPos = adjustLabelPosition(
            (x / 2),
            measureY - 15,
            leftDistText,
            existingLabels,
            false
          );
          existingLabels.push({
            x: leftDistPos.x - (leftDistText.length * charWidth + padding * 2) / 2,
            y: leftDistPos.y - (fontSize + padding * 2) / 2,
            width: leftDistText.length * charWidth + padding * 2,
            height: fontSize + padding * 2,
          });
          
          measurements.push(
            <InteractiveMeasurementLine
              key={`${item.id}-top-left-line`}
              measurementId={`${item.id}-top-left`}
              points={[0, measureY, x, measureY]} 
              color={COLORS.edge}
              lineType="edge"
            />,
            <EditableDimensionLabel
              key={`${item.id}-top-left-label`}
              x={leftDistPos.x} 
              y={leftDistPos.y} 
              text={leftDistText}
              color={COLORS.edge}
              customFontSize={wallFontSize}
              direction="left"
              value={leftDist}
            />
          );
        }
      } else {
        // Not first - measure to previous object
        const prevItem = topWallItems[thisIndex - 1];
        const prevEndX = (prevItem.x + prevItem.width) * PIXELS_PER_CM;
        const gapDist = Math.round((item.x - (prevItem.x + prevItem.width)));
        
        if (gapDist > 0) {
          const gapDistText = formatMeasurement(gapDist, unit);
          const gapDistPos = adjustLabelPosition(
            (prevEndX + x) / 2,
            measureY - 15,
            gapDistText,
            existingLabels,
            false
          );
          existingLabels.push({
            x: gapDistPos.x - (gapDistText.length * charWidth + padding * 2) / 2,
            y: gapDistPos.y - (fontSize + padding * 2) / 2,
            width: gapDistText.length * charWidth + padding * 2,
            height: fontSize + padding * 2,
          });
          
          measurements.push(
            <InteractiveMeasurementLine
              key={`${item.id}-top-gap-line`}
              measurementId={`${item.id}-top-gap`}
              points={[prevEndX, measureY, x, measureY]} 
              color={COLORS.edge}
              lineType="edge"
            />,
            <InteractiveDimensionLabel
              key={`${item.id}-top-gap-label`}
              measurementId={`${item.id}-top-gap`}
              x={gapDistPos.x} 
              y={gapDistPos.y} 
              text={gapDistText}
              color={COLORS.edge}
              customFontSize={wallFontSize}
              isSecondary={false}
            />
          );
        }
      }
      
      // Show distance to right (either wall or next object)
      if (thisIndex === topWallItems.length - 1) {
        // Last object - measure to right wall
        const rightDist = Math.round((room.width - (item.x + item.width)));
        if (rightDist > 0) {
          const rightDistText = formatMeasurement(rightDist, unit);
          const rightDistPos = adjustLabelPosition(
            (x + w + roomW) / 2,
            measureY - 15,
            rightDistText,
            existingLabels,
            false
          );
          
          measurements.push(
            <InteractiveMeasurementLine
              key={`${item.id}-top-right-line`}
              measurementId={`${item.id}-top-right`}
              points={[x + w, measureY, roomW, measureY]} 
              color={COLORS.edge}
              lineType="edge"
            />,
            <EditableDimensionLabel
              key={`${item.id}-top-right-label`}
              x={rightDistPos.x} 
              y={rightDistPos.y} 
              text={rightDistText}
              color={COLORS.edge}
              customFontSize={wallFontSize}
              direction="right"
              value={rightDist}
            />
          );
        }
      }
      
      return <Group>{measurements}</Group>;
    }
    
    if (onBottomWall) {
      // BOTTOM WALL - Show consecutive measurements between objects and walls
      const measureY = roomH + outsideOffset;
      
      // Get all wall objects on the bottom wall (including this one)
      const bottomWallItems = [item, ...otherItems.filter(other => {
        const otherIsWallObj = other.type.toLowerCase() === 'window' || other.type.toLowerCase() === 'door';
        const otherOnBottom = other.y + other.height > room.height;
        return otherIsWallObj && otherOnBottom;
      })].sort((a, b) => a.x - b.x);
      
      const thisIndex = bottomWallItems.findIndex(obj => obj.id === item.id);
      const measurements: React.ReactNode[] = [];
      
      // Show width of this item
      measurements.push(
        <Line 
          key={`${item.id}-bottom-width-line`}
          points={[x, measureY, x + w, measureY]} 
          stroke={COLORS.dimension} 
          dash={dash} 
          strokeWidth={1.5} 
        />,
        <WallDimensionLabel 
          key={`${item.id}-bottom-width-label`}
          measurementId={`${item.id}-bottom-width`}
          x={x + w / 2} 
          y={measureY + 25} 
          text={formatMeasurement(item.width, unit)}
          color={COLORS.dimension}
        />
      );
      
      // Show distance to left
      if (thisIndex === 0) {
        const leftDist = Math.round(item.x);
        if (leftDist > 0) {
          measurements.push(
            <Line 
              key={`${item.id}-bottom-left-line`}
              points={[0, measureY, x, measureY]} 
              stroke={COLORS.edge} 
              dash={dash} 
              strokeWidth={1.5} 
            />,
            <EditableDimensionLabel 
              key={`${item.id}-bottom-left-label`}
              x={x / 2} 
              y={measureY + 25} 
              text={formatMeasurement(leftDist, unit)}
              color={COLORS.edge}
              customFontSize={wallFontSize}
              direction="left"
              value={leftDist}
            />
          );
        }
      } else {
        const prevItem = bottomWallItems[thisIndex - 1];
        const prevEndX = (prevItem.x + prevItem.width) * PIXELS_PER_CM;
        const gapDist = Math.round((item.x - (prevItem.x + prevItem.width)));
        
        if (gapDist > 0) {
          measurements.push(
            <Line 
              key={`${item.id}-bottom-gap-line`}
              points={[prevEndX, measureY, x, measureY]} 
              stroke={COLORS.edge} 
              dash={dash} 
              strokeWidth={1.5} 
            />,
            <WallDimensionLabel 
              key={`${item.id}-bottom-gap-label`}
              measurementId={`${item.id}-bottom-gap`}
              x={(prevEndX + x) / 2} 
              y={measureY + 25} 
              text={formatMeasurement(gapDist, unit)}
              color={COLORS.edge}
            />
          );
        }
      }
      
      // Show distance to right
      if (thisIndex === bottomWallItems.length - 1) {
        const rightDist = Math.round((room.width - (item.x + item.width)));
        if (rightDist > 0) {
          measurements.push(
            <Line 
              key={`${item.id}-bottom-right-line`}
              points={[x + w, measureY, roomW, measureY]} 
              stroke={COLORS.edge} 
              dash={dash} 
              strokeWidth={1.5} 
            />,
            <EditableDimensionLabel 
              key={`${item.id}-bottom-right-label`}
              x={x + w + (roomW - (x + w)) / 2} 
              y={measureY + 25} 
              text={formatMeasurement(rightDist, unit)}
              color={COLORS.edge}
              customFontSize={wallFontSize}
              direction="right"
              value={rightDist}
            />
          );
        }
      }
      
      return <Group>{measurements}</Group>;
    }
    
    if (onLeftWall) {
      // LEFT WALL - Show consecutive measurements between objects and walls
      const measureX = -outsideOffset;
      
      // Get all wall objects on the left wall (including this one)
      const leftWallItems = [item, ...otherItems.filter(other => {
        const otherIsWallObj = other.type.toLowerCase() === 'window' || other.type.toLowerCase() === 'door';
        const otherOnLeft = other.x < 0;
        return otherIsWallObj && otherOnLeft;
      })].sort((a, b) => a.y - b.y); // Sort by y position
      
      const thisIndex = leftWallItems.findIndex(obj => obj.id === item.id);
      const measurements: React.ReactNode[] = [];
      
      // Visual positions
      const windowStartY = y;
      const windowEndY = y + item.width * PIXELS_PER_CM;
      const visualCenterY = y + (item.width * PIXELS_PER_CM) / 2;
      
      // Show width of this item
      measurements.push(
        <Line 
          key={`${item.id}-left-width-line`}
          points={[measureX, windowStartY, measureX, windowEndY]} 
          stroke={COLORS.dimension} 
          dash={dash} 
          strokeWidth={1.5} 
        />,
        <WallDimensionLabel 
          key={`${item.id}-left-width-label`}
          measurementId={`${item.id}-left-width`}
          x={measureX - 60} 
          y={visualCenterY} 
          text={formatMeasurement(item.width, unit)}
          color={COLORS.dimension}
        />
      );
      
      // Show distance to top
      if (thisIndex === 0) {
        const topDist = Math.round(item.y);
        if (topDist > 0) {
          measurements.push(
            <Line 
              key={`${item.id}-left-top-line`}
              points={[measureX, 0, measureX, windowStartY]} 
              stroke={COLORS.edge} 
              dash={dash} 
              strokeWidth={1.5} 
            />,
            <EditableDimensionLabel 
              key={`${item.id}-left-top-label`}
              x={measureX - 60} 
              y={windowStartY / 2} 
              text={formatMeasurement(topDist, unit)}
              color={COLORS.edge}
              customFontSize={wallFontSize}
              direction="top"
              value={topDist}
            />
          );
        }
      } else {
        const prevItem = leftWallItems[thisIndex - 1];
        const prevEndY = (prevItem.y + prevItem.width) * PIXELS_PER_CM;
        const gapDist = Math.round((item.y - (prevItem.y + prevItem.width)));
        
        if (gapDist > 0) {
          measurements.push(
            <Line 
              key={`${item.id}-left-gap-line`}
              points={[measureX, prevEndY, measureX, windowStartY]} 
              stroke={COLORS.edge} 
              dash={dash} 
              strokeWidth={1.5} 
            />,
            <WallDimensionLabel 
              key={`${item.id}-left-gap-label`}
              measurementId={`${item.id}-left-gap`}
              x={measureX - 60} 
              y={(prevEndY + windowStartY) / 2} 
              text={formatMeasurement(gapDist, unit)}
              color={COLORS.edge}
            />
          );
        }
      }
      
      // Show distance to bottom
      if (thisIndex === leftWallItems.length - 1) {
        const bottomDist = Math.round(room.height - (item.y + item.width));
        if (bottomDist > 0) {
          measurements.push(
            <Line 
              key={`${item.id}-left-bottom-line`}
              points={[measureX, windowEndY, measureX, roomH]} 
              stroke={COLORS.edge} 
              dash={dash} 
              strokeWidth={1.5} 
            />,
            <EditableDimensionLabel 
              key={`${item.id}-left-bottom-label`}
              x={measureX - 60} 
              y={windowEndY + (roomH - windowEndY) / 2} 
              text={formatMeasurement(bottomDist, unit)}
              color={COLORS.edge}
              customFontSize={wallFontSize}
              direction="bottom"
              value={bottomDist}
            />
          );
        }
      }
      
      return <Group>{measurements}</Group>;
    }
    
    if (onRightWall) {
      // RIGHT WALL - Show consecutive measurements between objects and walls
      const measureX = roomW + outsideOffset;
      
      // Get all wall objects on the right wall (including this one)
      const rightWallItems = [item, ...otherItems.filter(other => {
        const otherIsWallObj = other.type.toLowerCase() === 'window' || other.type.toLowerCase() === 'door';
        const otherOnRight = other.x + other.width > room.width;
        return otherIsWallObj && otherOnRight;
      })].sort((a, b) => a.y - b.y); // Sort by y position
      
      const thisIndex = rightWallItems.findIndex(obj => obj.id === item.id);
      const measurements: React.ReactNode[] = [];
      
      // Visual positions
      const windowStartY = y;
      const windowEndY = y + item.width * PIXELS_PER_CM;
      const visualCenterY = y + (item.width * PIXELS_PER_CM) / 2;
      
      // Show width of this item
      measurements.push(
        <Line 
          key={`${item.id}-right-width-line`}
          points={[measureX, windowStartY, measureX, windowEndY]} 
          stroke={COLORS.dimension} 
          dash={dash} 
          strokeWidth={1.5} 
        />,
        <WallDimensionLabel 
          key={`${item.id}-right-width-label`}
          measurementId={`${item.id}-right-width`}
          x={measureX + 50} 
          y={visualCenterY} 
          text={formatMeasurement(item.width, unit)}
          color={COLORS.dimension}
        />
      );
      
      // Show distance to top
      if (thisIndex === 0) {
        const topDist = Math.round(item.y);
        if (topDist > 0) {
          measurements.push(
            <Line 
              key={`${item.id}-right-top-line`}
              points={[measureX, 0, measureX, windowStartY]} 
              stroke={COLORS.edge} 
              dash={dash} 
              strokeWidth={1.5} 
            />,
            <EditableDimensionLabel 
              key={`${item.id}-right-top-label`}
              x={measureX + 50} 
              y={windowStartY / 2} 
              text={formatMeasurement(topDist, unit)}
              color={COLORS.edge}
              customFontSize={wallFontSize}
              direction="top"
              value={topDist}
            />
          );
        }
      } else {
        const prevItem = rightWallItems[thisIndex - 1];
        const prevEndY = (prevItem.y + prevItem.width) * PIXELS_PER_CM;
        const gapDist = Math.round((item.y - (prevItem.y + prevItem.width)));
        
        if (gapDist > 0) {
          measurements.push(
            <Line 
              key={`${item.id}-right-gap-line`}
              points={[measureX, prevEndY, measureX, windowStartY]} 
              stroke={COLORS.edge} 
              dash={dash} 
              strokeWidth={1.5} 
            />,
            <WallDimensionLabel 
              key={`${item.id}-right-gap-label`}
              measurementId={`${item.id}-right-gap`}
              x={measureX + 50} 
              y={(prevEndY + windowStartY) / 2} 
              text={formatMeasurement(gapDist, unit)}
              color={COLORS.edge}
            />
          );
        }
      }
      
      // Show distance to bottom
      if (thisIndex === rightWallItems.length - 1) {
        const bottomDist = Math.round(room.height - (item.y + item.width));
        if (bottomDist > 0) {
          measurements.push(
            <Line 
              key={`${item.id}-right-bottom-line`}
              points={[measureX, windowEndY, measureX, roomH]} 
              stroke={COLORS.edge} 
              dash={dash} 
              strokeWidth={1.5} 
            />,
            <EditableDimensionLabel 
              key={`${item.id}-right-bottom-label`}
              x={measureX + 50} 
              y={windowEndY + (roomH - windowEndY) / 2} 
              text={formatMeasurement(bottomDist, unit)}
              color={COLORS.edge}
              customFontSize={wallFontSize}
              direction="bottom"
              value={bottomDist}
            />
          );
        }
      }
      
      return <Group>{measurements}</Group>;
    }
  }

  // ===== STANDARD FURNITURE - Measure from center, with obstacle detection =====
  
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
  
  // Create dimension text for furniture (show on the item itself)
  const dimensionText = `${horizontalLabel} × ${verticalLabel} cm`;
  
  // Auto-size dimension text to fit within furniture with padding
  const DIMENSION_PADDING_RATIO = 0.15; // 15% padding on each side
  const MIN_DIMENSION_FONT = 10;
  const MAX_DIMENSION_FONT = 20;
  
  // Available width for dimension text after padding
  const availableDimensionWidth = w * (1 - 2 * DIMENSION_PADDING_RATIO);
  
  // Calculate font size that fits within available space
  // Approximate text width as fontSize * text.length * 0.6 (average char width ratio)
  const maxDimensionFontFromWidth = availableDimensionWidth / (dimensionText.length * 0.6);
  
  // Apply zoom scaling and clamp
  let dimensionFontSize = Math.max(MIN_DIMENSION_FONT, Math.min(MAX_DIMENSION_FONT, maxDimensionFontFromWidth * Math.sqrt(zoom)));
  
  // When labels are shown, position dimension text as a second row below the label
  // When labels are hidden, position relative to rotation button as before
  let labelYOffset = 0;
  
  if (showLabels) {
    // Estimate label font size (same calculation as in FurnitureShape.tsx)
    const MIN_PADDING_PX = 16;
    const availableWidth = w - (2 * MIN_PADDING_PX);
    const availableHeight = h - (2 * MIN_PADDING_PX);
    let labelFontSize = Math.min(availableWidth, availableHeight) * 0.3;
    labelFontSize = labelFontSize * Math.sqrt(zoom);
    labelFontSize = Math.max(16, Math.min(48, labelFontSize));
    
    // Position dimension text below label with spacing
    const TEXT_SPACING = 8; // Space between label and dimension
    labelYOffset = labelFontSize / 2 + TEXT_SPACING + dimensionFontSize / 2;
  } else {
    // Calculate vertical offset to position label below the rotation button
    const labelVerticalOffset = buttonRadius + dimensionFontSize + 10; // Button radius + font size + spacing
    
    // Check if there's enough space below, otherwise place above
    const spaceBelow = (y + h) - midY;
    const spaceAbove = midY - y;
    labelYOffset = spaceBelow > labelVerticalOffset + 15 ? labelVerticalOffset : -labelVerticalOffset;
  }
  
  return (
    <Group listening={true} name="measurement-overlay">
      {/* Furniture dimensions - shown subtly on the furniture itself */}
      {!isWall && (
        <Group x={midX} y={midY + labelYOffset} rotation={rotation}>
          {/* Dimension text without background - auto-sized to fit */}
          <Text
            text={dimensionText}
            x={-w / 2}
            y={-dimensionFontSize / 2}
            fontSize={dimensionFontSize}
            fontFamily="-apple-system, BlinkMacSystemFont, 'Inter', sans-serif"
            fill="#ffffff"
            align="center"
            width={w}
            listening={false}
            ellipsis={true}
          />
        </Group>
      )}
      
      {/* Left gap - amber line from wall/obstacle to furniture */}
      {!showLabels && Math.round((x - leftBound) / PIXELS_PER_CM) >= 5 && (
        <>
          <InteractiveMeasurementLine
            measurementId={`${item.id}-furniture-left`}
            points={[leftBound, midY, x, midY]}
            color={COLORS.distance}
            lineType="spacing"
          />
          <InteractiveDimensionLabel
            measurementId={`${item.id}-furniture-left`}
            x={adjustLabelX((leftBound + x) / 2, formatMeasurement(Math.round((x - leftBound) / PIXELS_PER_CM), unit).length * fontSize * 0.6)} 
            y={midY + labelOffset + 5} 
            text={formatMeasurement(Math.round((x - leftBound) / PIXELS_PER_CM), unit)}
            color={COLORS.distance}
            isSecondary={true}
          />
        </>
      )}

      {/* Right gap - amber line from furniture to wall/obstacle */}
      {!showLabels && Math.round((rightBound - (x + w)) / PIXELS_PER_CM) >= 5 && (
        <>
          <InteractiveMeasurementLine
            measurementId={`${item.id}-furniture-right`}
            points={[x + w, midY, rightBound, midY]}
            color={COLORS.distance}
            lineType="spacing"
          />
          <InteractiveDimensionLabel
            measurementId={`${item.id}-furniture-right`}
            x={adjustLabelX((x + w + rightBound) / 2, formatMeasurement(Math.round((rightBound - (x + w)) / PIXELS_PER_CM), unit).length * fontSize * 0.6)} 
            y={midY + labelOffset + 5} 
            text={formatMeasurement(Math.round((rightBound - (x + w)) / PIXELS_PER_CM), unit)}
            color={COLORS.distance}
            isSecondary={true}
          />
        </>
      )}

      {/* Top gap - amber line from wall/obstacle to furniture */}
      {!showLabels && Math.round((y - topBound) / PIXELS_PER_CM) >= 5 && (
        <>
          <InteractiveMeasurementLine
            measurementId={`${item.id}-furniture-top`}
            points={[midX, topBound, midX, y]}
            color={COLORS.distance}
            lineType="spacing"
          />
          <InteractiveDimensionLabel
            measurementId={`${item.id}-furniture-top`}
            x={midX - labelOffset - 10} 
            y={adjustLabelY((topBound + y) / 2, fontSize)} 
            text={formatMeasurement(Math.round((y - topBound) / PIXELS_PER_CM), unit)}
            color={COLORS.distance}
            isSecondary={true}
          />
        </>
      )}

      {/* Bottom gap - amber line from furniture to wall/obstacle */}
      {!showLabels && Math.round((bottomBound - (y + h)) / PIXELS_PER_CM) >= 5 && (
        <>
          <InteractiveMeasurementLine
            measurementId={`${item.id}-furniture-bottom`}
            points={[midX, y + h, midX, bottomBound]}
            color={COLORS.distance}
            lineType="spacing"
          />
          <InteractiveDimensionLabel
            measurementId={`${item.id}-furniture-bottom`}
            x={midX - labelOffset - 10} 
            y={adjustLabelY((y + h + bottomBound) / 2, fontSize)} 
            text={formatMeasurement(Math.round((bottomBound - (y + h)) / PIXELS_PER_CM), unit)}
            color={COLORS.distance}
            isSecondary={true}
          />
        </>
      )}
    </Group>
  );
};

export default MeasurementOverlay;
