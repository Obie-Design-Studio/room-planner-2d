import React, { useRef, useEffect, useState, useMemo } from "react";
import { Stage, Layer, Rect, Group, Line, Text, Circle } from "react-konva";
import { PIXELS_PER_CM, WALL_THICKNESS_PX } from "@/lib/constants";
import { RoomConfig, FurnitureItem, ManualMeasurement } from "@/types";
import { type Unit, formatMeasurement } from "@/lib/unitConversion";
import { getAllInnerWallZones, InnerWallZone } from "@/lib/innerWallZones";
import FurnitureShape from "./FurnitureShape";
import MeasurementOverlay from "./MeasurementOverlay";
import GridBackground from "./GridBackground";
import { Plus, Minus, Maximize2, Ruler, Eye, PenLine, Trash2 } from "lucide-react";

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
  showLabels: boolean;
  onToggleMeasurements?: () => void;
  onToggleLabels?: () => void;
  measurementUnit?: Unit;
  viewportWidth: number;
  viewportHeight: number;
  onStageRef?: (stage: any) => void;
  hiddenMeasurements?: Set<string>;
  onToggleMeasurement?: (measurementId: string) => void;
  hiddenMeasurementsForExport?: Set<string>; // Measurements to completely hide during PDF export
  manualMeasurements?: ManualMeasurement[];
  isDrawingMeasurement?: boolean;
  onToggleDrawingMode?: () => void;
  onAddManualMeasurement?: (measurement: ManualMeasurement) => void;
  onDeleteManualMeasurement?: (id: string) => void;
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
  showLabels,
  onToggleMeasurements,
  onToggleLabels,
  measurementUnit = 'cm',
  viewportWidth,
  viewportHeight,
  onStageRef,
  hiddenMeasurements = new Set(),
  onToggleMeasurement,
  hiddenMeasurementsForExport = new Set(),
  manualMeasurements = [],
  isDrawingMeasurement = false,
  onToggleDrawingMode,
  onAddManualMeasurement,
  onDeleteManualMeasurement,
}: RoomCanvasProps) {
  const stageRef = useRef<any>(null);

  // Expose stage ref to parent via callback
  useEffect(() => {
    if (stageRef.current && onStageRef) {
      onStageRef(stageRef.current);
    }
  }, [onStageRef]);
  
  // Zoom state: 1.0 = 100%, range 0.1 to 3.0
  const [userZoom, setUserZoom] = useState(1.0);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  
  // Pan state
  const [isPanning, setIsPanning] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const lastPointerPos = useRef({ x: 0, y: 0 });
  
  // Zoom tooltip state (shows during Ctrl+Scroll zoom)
  const [showZoomTooltip, setShowZoomTooltip] = useState(false);
  const [zoomTooltipPos, setZoomTooltipPos] = useState({ x: 0, y: 0 });
  const zoomTooltipTimeout = useRef<NodeJS.Timeout | null>(null);
  
  // Manual measurement drawing state
  const [drawingStart, setDrawingStart] = useState<{ x: number; y: number } | null>(null);
  const [drawingPreview, setDrawingPreview] = useState<{ x: number; y: number } | null>(null);
  const [isSnapping, setIsSnapping] = useState(false);
  const [selectedManualMeasurement, setSelectedManualMeasurement] = useState<string | null>(null);
  
  // Toolbar tooltip state
  const [hoveredTool, setHoveredTool] = useState<string | null>(null);
  const toolTooltipTimeout = useRef<NodeJS.Timeout | null>(null);
  
  // Reset drawing state and update cursor when drawing mode changes
  useEffect(() => {
    const stage = stageRef.current;
    if (!isDrawingMeasurement) {
      setDrawingStart(null);
      setDrawingPreview(null);
      if (stage) {
        stage.container().style.cursor = 'default';
      }
    } else {
      // Immediately change cursor when entering drawing mode
      if (stage) {
        stage.container().style.cursor = 'crosshair';
      }
    }
  }, [isDrawingMeasurement]);

  // Calculate inner wall zones (gray areas created by spanning walls)
  const innerWallZones = useMemo(() => {
    return getAllInnerWallZones(items, roomConfig);
  }, [items, roomConfig]);

  // Snap threshold for manual measurement tool (in cm)
  const MEASUREMENT_SNAP_THRESHOLD_CM = 10; // 10cm snap distance
  
  // Helper function to find nearest snap point for measurement tool
  const findSnapPoint = (cmX: number, cmY: number): { x: number; y: number; snapped: boolean } => {
    const snapPoints: { x: number; y: number; dist: number }[] = [];
    
    // Room corners and edges (in cm)
    const roomCorners = [
      { x: 0, y: 0 },
      { x: roomConfig.width, y: 0 },
      { x: 0, y: roomConfig.height },
      { x: roomConfig.width, y: roomConfig.height },
    ];
    
    // Add room corners
    roomCorners.forEach(corner => {
      const dist = Math.sqrt((cmX - corner.x) ** 2 + (cmY - corner.y) ** 2);
      if (dist <= MEASUREMENT_SNAP_THRESHOLD_CM) {
        snapPoints.push({ ...corner, dist });
      }
    });
    
    // Snap to room edges (walls) - snap to nearest point on edge
    // Top wall (y = 0)
    if (cmX >= 0 && cmX <= roomConfig.width && Math.abs(cmY) <= MEASUREMENT_SNAP_THRESHOLD_CM) {
      snapPoints.push({ x: cmX, y: 0, dist: Math.abs(cmY) });
    }
    // Bottom wall (y = roomHeight)
    if (cmX >= 0 && cmX <= roomConfig.width && Math.abs(cmY - roomConfig.height) <= MEASUREMENT_SNAP_THRESHOLD_CM) {
      snapPoints.push({ x: cmX, y: roomConfig.height, dist: Math.abs(cmY - roomConfig.height) });
    }
    // Left wall (x = 0)
    if (cmY >= 0 && cmY <= roomConfig.height && Math.abs(cmX) <= MEASUREMENT_SNAP_THRESHOLD_CM) {
      snapPoints.push({ x: 0, y: cmY, dist: Math.abs(cmX) });
    }
    // Right wall (x = roomWidth)
    if (cmY >= 0 && cmY <= roomConfig.height && Math.abs(cmX - roomConfig.width) <= MEASUREMENT_SNAP_THRESHOLD_CM) {
      snapPoints.push({ x: roomConfig.width, y: cmY, dist: Math.abs(cmX - roomConfig.width) });
    }
    
    // Add snap points for all items (furniture, doors, windows, walls)
    items.forEach(item => {
      // Get item bounds in cm
      const itemLeft = item.x;
      const itemRight = item.x + item.width;
      const itemTop = item.y;
      const itemBottom = item.y + item.height;
      
      // Item corners
      const itemCorners = [
        { x: itemLeft, y: itemTop },
        { x: itemRight, y: itemTop },
        { x: itemLeft, y: itemBottom },
        { x: itemRight, y: itemBottom },
      ];
      
      itemCorners.forEach(corner => {
        const dist = Math.sqrt((cmX - corner.x) ** 2 + (cmY - corner.y) ** 2);
        if (dist <= MEASUREMENT_SNAP_THRESHOLD_CM) {
          snapPoints.push({ ...corner, dist });
        }
      });
      
      // Item center
      const centerX = item.x + item.width / 2;
      const centerY = item.y + item.height / 2;
      const centerDist = Math.sqrt((cmX - centerX) ** 2 + (cmY - centerY) ** 2);
      if (centerDist <= MEASUREMENT_SNAP_THRESHOLD_CM) {
        snapPoints.push({ x: centerX, y: centerY, dist: centerDist });
      }
      
      // Item edges (snap to nearest point on edge)
      // Top edge
      if (cmX >= itemLeft && cmX <= itemRight && Math.abs(cmY - itemTop) <= MEASUREMENT_SNAP_THRESHOLD_CM) {
        snapPoints.push({ x: cmX, y: itemTop, dist: Math.abs(cmY - itemTop) });
      }
      // Bottom edge
      if (cmX >= itemLeft && cmX <= itemRight && Math.abs(cmY - itemBottom) <= MEASUREMENT_SNAP_THRESHOLD_CM) {
        snapPoints.push({ x: cmX, y: itemBottom, dist: Math.abs(cmY - itemBottom) });
      }
      // Left edge
      if (cmY >= itemTop && cmY <= itemBottom && Math.abs(cmX - itemLeft) <= MEASUREMENT_SNAP_THRESHOLD_CM) {
        snapPoints.push({ x: itemLeft, y: cmY, dist: Math.abs(cmX - itemLeft) });
      }
      // Right edge
      if (cmY >= itemTop && cmY <= itemBottom && Math.abs(cmX - itemRight) <= MEASUREMENT_SNAP_THRESHOLD_CM) {
        snapPoints.push({ x: itemRight, y: cmY, dist: Math.abs(cmX - itemRight) });
      }
    });
    
    // Find closest snap point
    if (snapPoints.length > 0) {
      snapPoints.sort((a, b) => a.dist - b.dist);
      return { x: snapPoints[0].x, y: snapPoints[0].y, snapped: true };
    }
    
    return { x: cmX, y: cmY, snapped: false };
  };

  // Calculate optimal scale and position
  const roomPxWidth = roomConfig.width * PIXELS_PER_CM;
  const roomPxHeight = roomConfig.height * PIXELS_PER_CM;
  
  // Smart bounds calculation: only add buffer where doors/windows actually are
  // This allows better zoom when doors are only on some walls (e.g., 165% when doors on 2 walls)
  
  const dimensionLabelSpace = 100; // Space for wall dimension labels (reduced from 160px)
  
  // Detect which walls have doors/windows and their sizes
  let maxDoorOnTop = 0;
  let maxDoorOnBottom = 0;
  let maxDoorOnLeft = 0;
  let maxDoorOnRight = 0;
  
  items.forEach((item) => {
    const itemType = item.type?.toLowerCase();
    if (itemType === 'door' || itemType === 'window') {
      const itemY = item.y;  // Keep in CM for easier comparison
      const itemX = item.x;  // Keep in CM
      
      // Check door swing direction (from ItemEditModal.tsx logic)
      // rotation >= 180 = swings OUT (outward from room) - needs buffer
      // rotation < 180 = swings IN (inward to room) - NO buffer needed!
      const swingsOutward = item.rotation >= 180;
      const isDoor = itemType === 'door';
      
      // Windows always need buffer (they extend outside)
      // Doors only need buffer if they swing outward
      const needsBuffer = !isDoor || swingsOutward;
      
      if (!needsBuffer) {
        console.log('⚪ Door swings INWARD - no buffer needed:', item.type, `rotation=${item.rotation}°`);
        return; // Skip this door - no buffer needed
      }
      
      // CRITICAL FIX: Door/window arcs use WIDTH (smaller dimension), not height!
      // Example: 80×210cm door → arc is 80cm radius, not 210cm
      const arcLength = Math.min(item.width, item.height) * PIXELS_PER_CM;
      
      // More lenient detection thresholds (within 20cm of wall edge)
      const threshold = 20; // cm
      
      // Top wall: y is near 0
      if (itemY < threshold) {
        maxDoorOnTop = Math.max(maxDoorOnTop, arcLength);
        console.log('🔵 Door/Window on TOP wall:', item.type, arcLength, 'px', swingsOutward ? '(OUT)' : '(IN)');
      }
      // Bottom wall: y is near room height
      else if (itemY > roomConfig.height - threshold) {
        maxDoorOnBottom = Math.max(maxDoorOnBottom, arcLength);
        console.log('🔵 Door/Window on BOTTOM wall:', item.type, arcLength, 'px', swingsOutward ? '(OUT)' : '(IN)');
      }
      // Left wall: x is near 0
      if (itemX < threshold) {
        maxDoorOnLeft = Math.max(maxDoorOnLeft, arcLength);
        console.log('🔵 Door/Window on LEFT wall:', item.type, arcLength, 'px', swingsOutward ? '(OUT)' : '(IN)');
      }
      // Right wall: x is near room width
      else if (itemX > roomConfig.width - threshold) {
        maxDoorOnRight = Math.max(maxDoorOnRight, arcLength);
        console.log('🔵 Door/Window on RIGHT wall:', item.type, arcLength, 'px', swingsOutward ? '(OUT)' : '(IN)');
      }
    }
  });
  
  console.log('📏 Content bounds buffers:', {
    top: maxDoorOnTop,
    bottom: maxDoorOnBottom,
    left: maxDoorOnLeft,
    right: maxDoorOnRight
  });
  
  // CONTENT BOUNDS (for scale calculation - includes door arcs)
  // Add buffer only on sides that have doors/windows
  let minX = -WALL_THICKNESS_PX / 2 - dimensionLabelSpace - maxDoorOnLeft;
  let minY = -WALL_THICKNESS_PX / 2 - dimensionLabelSpace - maxDoorOnTop;
  let maxX = roomPxWidth + WALL_THICKNESS_PX / 2 + maxDoorOnRight;
  let maxY = roomPxHeight + WALL_THICKNESS_PX / 2 + maxDoorOnBottom;
  
  const contentWidth = maxX - minX;
  const contentHeight = maxY - minY;
  
  // ROOM BOUNDS (for centering - excludes door arcs, only room + labels)
  // Center the ROOM itself, not the door arcs!
  const roomMinX = -WALL_THICKNESS_PX / 2 - dimensionLabelSpace;
  const roomMinY = -WALL_THICKNESS_PX / 2 - dimensionLabelSpace;
  const roomMaxX = roomPxWidth + WALL_THICKNESS_PX / 2;
  const roomMaxY = roomPxHeight + WALL_THICKNESS_PX / 2;
  
  const roomCenterWidth = roomMaxX - roomMinX;
  const roomCenterHeight = roomMaxY - roomMinY;
  
  // Adaptive padding based on viewport size only (NOT scaled with zoom)
  // This allows "Fit to View" to calculate optimal zoom levels above 100%
  // Smaller viewports get smaller padding (maximize space)
  // Larger viewports get larger padding (nicer appearance)
  const PADDING_RATIO = 0.04; // 4% of smaller viewport dimension
  const MIN_PADDING = 20; // Minimum for small screens
  const MAX_PADDING = 60; // Maximum for large screens
  
  const smallerViewportDim = Math.min(viewportWidth, viewportHeight);
  const padding = Math.max(MIN_PADDING, Math.min(MAX_PADDING, smallerViewportDim * PADDING_RATIO));
  
  // Base scale to fit content
  const baseScale = Math.min(
    (viewportWidth - padding) / contentWidth,
    (viewportHeight - padding) / contentHeight
  );
  
  // Apply user zoom to base scale
  const scale = baseScale * userZoom;
  
  console.log('🔍 Fit-to-view calculation:', {
    viewport: `${viewportWidth}×${viewportHeight}`,
    content: `${contentWidth.toFixed(0)}×${contentHeight.toFixed(0)}`,
    padding: padding.toFixed(0),
    baseScale: baseScale.toFixed(3),
    userZoom: userZoom.toFixed(2),
    finalScale: scale.toFixed(3),
    effectiveZoom: `${(scale * 100).toFixed(0)}%`
  });
  
  // Calculate where the ROOM should be positioned to center it
  // Use room bounds (not content bounds) so the room is centered, not the door arcs
  // Door arcs extend into padding symmetrically
  const baseCenterOffsetX = viewportWidth / 2 - (roomCenterWidth / 2 + roomMinX) * scale;
  const baseCenterOffsetY = viewportHeight / 2 - (roomCenterHeight / 2 + roomMinY) * scale;

  // Elastic boundary helper - allows ±100px over-pan with resistance
  const ELASTIC_MARGIN = 100;
  const applyElasticBoundary = (value: number, min: number, max: number): number => {
    if (min > max) return value; // Invalid range, no clamping
    
    if (value < min) {
      // Over-panned to the left/top - apply elastic resistance
      const overpan = min - value;
      if (overpan > ELASTIC_MARGIN) {
        return min - ELASTIC_MARGIN; // Hard limit at margin
      }
      return value; // Allow within elastic margin
    } else if (value > max) {
      // Over-panned to the right/bottom - apply elastic resistance
      const overpan = value - max;
      if (overpan > ELASTIC_MARGIN) {
        return max + ELASTIC_MARGIN; // Hard limit at margin
      }
      return value; // Allow within elastic margin
    }
    return value; // Within normal bounds
  };

  // Mouse wheel handler - zoom with Ctrl/Cmd, pan otherwise
  const handleWheel = (e: any) => {
    e.evt.preventDefault();
    
    const stage = stageRef.current;
    if (!stage) return;

    const ctrlPressed = e.evt.ctrlKey || e.evt.metaKey;

    if (ctrlPressed) {
      // Zoom with Ctrl/Cmd + scroll - cursor-anchored (Figma/Miro style)
      // The point under the cursor stays under the cursor
      const scaleBy = 1.1;
      const direction = e.evt.deltaY > 0 ? -1 : 1;
      
      const oldZoom = userZoom;
      const newZoom = direction > 0 ? userZoom * scaleBy : userZoom / scaleBy;
      const clampedZoom = Math.max(0.1, Math.min(5.0, newZoom)); // Increased max zoom to 500%
      
      if (clampedZoom === oldZoom) return; // Already at limit
      
      const oldScale = baseScale * oldZoom;
      const newScale = baseScale * clampedZoom;
      
      // Get cursor position in viewport coordinates
      const pointerPos = stage.getPointerPosition();
      if (!pointerPos) return;
      
      // Calculate old and new base center offsets
      const oldBaseCenterOffsetX = viewportWidth / 2 - (contentWidth / 2 + minX) * oldScale;
      const oldBaseCenterOffsetY = viewportHeight / 2 - (contentHeight / 2 + minY) * oldScale;
      const newBaseCenterOffsetX = viewportWidth / 2 - (contentWidth / 2 + minX) * newScale;
      const newBaseCenterOffsetY = viewportHeight / 2 - (contentHeight / 2 + minY) * newScale;
      
      // Find what world point is under the cursor
      const worldPointUnderCursor = {
        x: (pointerPos.x - stagePos.x - oldBaseCenterOffsetX) / oldScale,
        y: (pointerPos.y - stagePos.y - oldBaseCenterOffsetY) / oldScale,
      };
      
      // Calculate new stagePos to keep that world point under the cursor
      const newPos = {
        x: pointerPos.x - worldPointUnderCursor.x * newScale - newBaseCenterOffsetX,
        y: pointerPos.y - worldPointUnderCursor.y * newScale - newBaseCenterOffsetY,
      };
      
      setUserZoom(clampedZoom);
      setStagePos(newPos);
      
      // Show zoom tooltip near cursor
      setZoomTooltipPos({ x: pointerPos.x + 20, y: pointerPos.y - 10 });
      setShowZoomTooltip(true);
      
      // Hide tooltip after 800ms of no zoom activity
      if (zoomTooltipTimeout.current) {
        clearTimeout(zoomTooltipTimeout.current);
      }
      zoomTooltipTimeout.current = setTimeout(() => {
        setShowZoomTooltip(false);
      }, 800);
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
        
        // Apply elastic boundaries (±100px over-pan allowed)
        const clampedX = applyElasticBoundary(newX, minPosX, maxPosX);
        const clampedY = applyElasticBoundary(newY, minPosY, maxPosY);
        
        return {
          x: clampedX,
          y: clampedY,
        };
      });
    }
  };

  // Zoom controls (10% - 500%)
  // Button zoom is center-locked for predictable, consistent behavior
  const handleZoomIn = () => {
    const oldZoom = userZoom;
    const newZoom = Math.min(5.0, oldZoom * 1.15); // Increased max zoom to 500%
    if (newZoom === oldZoom) return; // Already at limit
    
    const oldScale = baseScale * oldZoom;
    const newScale = baseScale * newZoom;
    
    // Calculate old and new base center offsets
    const oldBaseCenterOffsetX = viewportWidth / 2 - (contentWidth / 2 + minX) * oldScale;
    const oldBaseCenterOffsetY = viewportHeight / 2 - (contentHeight / 2 + minY) * oldScale;
    const newBaseCenterOffsetX = viewportWidth / 2 - (contentWidth / 2 + minX) * newScale;
    const newBaseCenterOffsetY = viewportHeight / 2 - (contentHeight / 2 + minY) * newScale;
    
    // Keep viewport center fixed
    const centerPoint = { x: viewportWidth / 2, y: viewportHeight / 2 };
    const worldPointAtCenter = {
      x: (centerPoint.x - stagePos.x - oldBaseCenterOffsetX) / oldScale,
      y: (centerPoint.y - stagePos.y - oldBaseCenterOffsetY) / oldScale,
    };
    
    const newPos = {
      x: centerPoint.x - worldPointAtCenter.x * newScale - newBaseCenterOffsetX,
      y: centerPoint.y - worldPointAtCenter.y * newScale - newBaseCenterOffsetY,
    };
    
    setUserZoom(newZoom);
    setStagePos(newPos);
  };

  const handleZoomOut = () => {
    const oldZoom = userZoom;
    const newZoom = Math.max(0.1, oldZoom / 1.15);
    if (newZoom === oldZoom) return; // Already at limit
    
    const oldScale = baseScale * oldZoom;
    const newScale = baseScale * newZoom;
    
    // Calculate old and new base center offsets
    const oldBaseCenterOffsetX = viewportWidth / 2 - (contentWidth / 2 + minX) * oldScale;
    const oldBaseCenterOffsetY = viewportHeight / 2 - (contentHeight / 2 + minY) * oldScale;
    const newBaseCenterOffsetX = viewportWidth / 2 - (contentWidth / 2 + minX) * newScale;
    const newBaseCenterOffsetY = viewportHeight / 2 - (contentHeight / 2 + minY) * newScale;
    
    // Keep viewport center fixed
    const centerPoint = { x: viewportWidth / 2, y: viewportHeight / 2 };
    const worldPointAtCenter = {
      x: (centerPoint.x - stagePos.x - oldBaseCenterOffsetX) / oldScale,
      y: (centerPoint.y - stagePos.y - oldBaseCenterOffsetY) / oldScale,
    };
    
    const newPos = {
      x: centerPoint.x - worldPointAtCenter.x * newScale - newBaseCenterOffsetX,
      y: centerPoint.y - worldPointAtCenter.y * newScale - newBaseCenterOffsetY,
    };
    
    setUserZoom(newZoom);
    setStagePos(newPos);
  };

  const handleResetView = () => {
    setUserZoom(1.0);
    setStagePos({ x: 0, y: 0 }); // Reset pan to center
  };

  // Keyboard shortcuts for zoom and view control
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Don't trigger if typing in input field
      const target = e.target as HTMLElement;
      const isInputField = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      if (isInputField) return;

      // F or 0 key = Fit to View (reset zoom and pan)
      if (e.key === 'f' || e.key === 'F' || e.key === '0') {
        e.preventDefault();
        handleResetView();
      }
      // + or = key = Zoom In
      else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        handleZoomIn();
      }
      // - key = Zoom Out
      else if (e.key === '-') {
        e.preventDefault();
        handleZoomOut();
      }
      // Cmd/Ctrl + 0 = Reset to 100%
      else if ((e.metaKey || e.ctrlKey) && e.key === '0') {
        e.preventDefault();
        handleResetView();
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
    // Fixed: e.target.getLayer() was missing () - it was always truthy as a function reference
    const clickedOnEmpty = e.target === stage || e.target === e.target.getLayer();
    
    // Handle manual measurement drawing mode
    // In drawing mode, capture ALL clicks (except when panning with space)
    // This allows drawing inside the room on any element (grid, floor, etc.)
    if (isDrawingMeasurement && !isSpacePressed) {
      const pos = stage.getPointerPosition();
      if (!pos) return;
      
      // Convert screen position to canvas coordinates (in cm)
      const canvasX = (pos.x - stagePos.x - baseCenterOffsetX) / scale;
      const canvasY = (pos.y - stagePos.y - baseCenterOffsetY) / scale;
      
      // Convert to cm (relative to room origin)
      const rawCmX = canvasX / PIXELS_PER_CM;
      const rawCmY = canvasY / PIXELS_PER_CM;
      
      // ONLY allow drawing strictly inside the room (0 to width, 0 to height)
      if (rawCmX < 0 || rawCmX > roomConfig.width ||
          rawCmY < 0 || rawCmY > roomConfig.height) {
        return; // Don't draw outside the room
      }
      
      // Apply snap
      const snapped = findSnapPoint(rawCmX, rawCmY);
      const cmX = snapped.x;
      const cmY = snapped.y;
      
      if (!drawingStart) {
        // First click: set start point
        setDrawingStart({ x: cmX, y: cmY });
        setDrawingPreview({ x: cmX, y: cmY });
      } else {
        // Second click: create the measurement
        if (onAddManualMeasurement) {
          const measurement: ManualMeasurement = {
            id: `manual-${Date.now()}`,
            startX: drawingStart.x,
            startY: drawingStart.y,
            endX: cmX,
            endY: cmY,
          };
          onAddManualMeasurement(measurement);
        }
        // Reset drawing state
        setDrawingStart(null);
        setDrawingPreview(null);
      }
      
      e.cancelBubble = true; // Prevent other handlers
      return; // Don't start panning
    }
    
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
    
    // Update cursor for drawing mode
    if (isDrawingMeasurement && !isSpacePressed) {
      stage.container().style.cursor = 'crosshair';
    }
    
    // Update preview while drawing (with snap)
    // Show preview point even BEFORE first click (so user knows where they'll place start)
    // ONLY show preview when inside the room bounds
    if (isDrawingMeasurement) {
      const pos = stage.getPointerPosition();
      if (pos) {
        const canvasX = (pos.x - stagePos.x - baseCenterOffsetX) / scale;
        const canvasY = (pos.y - stagePos.y - baseCenterOffsetY) / scale;
        const rawCmX = canvasX / PIXELS_PER_CM;
        const rawCmY = canvasY / PIXELS_PER_CM;
        
        // Only show preview inside the room (0 to roomWidth, 0 to roomHeight)
        if (rawCmX >= 0 && rawCmX <= roomConfig.width &&
            rawCmY >= 0 && rawCmY <= roomConfig.height) {
          // Apply snap
          const snapped = findSnapPoint(rawCmX, rawCmY);
          setDrawingPreview({ x: snapped.x, y: snapped.y });
          setIsSnapping(snapped.snapped);
        } else {
          // Outside room - hide preview
          setDrawingPreview(null);
          setIsSnapping(false);
        }
      }
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
        
        // Apply elastic boundaries (±100px over-pan allowed)
        const clampedX = applyElasticBoundary(newX, minPosX, maxPosX);
        const clampedY = applyElasticBoundary(newY, minPosY, maxPosY);
        
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

  // Space key detection for pan mode, ESC to cancel drawing, Delete to remove selected measurement
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
      
      // ESC cancels drawing or deselects manual measurement
      if (e.code === 'Escape') {
        if (drawingStart) {
          setDrawingStart(null);
          setDrawingPreview(null);
        } else if (selectedManualMeasurement) {
          setSelectedManualMeasurement(null);
        } else if (isDrawingMeasurement && onToggleDrawingMode) {
          onToggleDrawingMode();
        }
      }
      
      // Delete or Backspace to delete selected manual measurement
      if ((e.code === 'Delete' || e.code === 'Backspace') && selectedManualMeasurement) {
        e.preventDefault();
        if (onDeleteManualMeasurement) {
          onDeleteManualMeasurement(selectedManualMeasurement);
          setSelectedManualMeasurement(null);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        setIsSpacePressed(false);
        const stage = stageRef.current;
        if (stage && !isPanning) {
          stage.container().style.cursor = isDrawingMeasurement ? 'crosshair' : 'default';
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

  // Handle click on empty space to deselect
  const handleStageClick = (e: any) => {
    // Check if clicked on empty area (Stage, Layer, floor, or grid)
    const clickedOnEmpty = 
      e.target === e.target.getStage() || 
      e.target === e.target.getLayer() ||
      e.target.attrs?.name === 'floor' ||
      e.target.attrs?.name === 'grid';
    
    if (clickedOnEmpty) {
      onSelect(''); // Deselect
    }
  };

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
        onClick={handleStageClick}
      >
        <Layer 
          scale={{ x: scale, y: scale }}
          x={stagePos.x + baseCenterOffsetX}
          y={stagePos.y + baseCenterOffsetY}
        >
          <Group x={0} y={0}>
            {/* Room floor (white background) */}
            <Rect
              name="floor"
              x={0}
              y={0}
              width={roomConfig.width * PIXELS_PER_CM}
              height={roomConfig.height * PIXELS_PER_CM}
              fill="white"
            />
            
            {/* Walls with gaps for doors */}
            {(() => {
              // Find all doors and group by wall
              const doors = items.filter(item => item.type?.toLowerCase() === 'door');
              
              const WALL_THICKNESS_CM = WALL_THICKNESS_PX / PIXELS_PER_CM;
              
              // Helper to get doors on a specific wall
              const getDoorsOnWall = (wall: 'top' | 'bottom' | 'left' | 'right') => {
                return doors.filter(door => {
                  const isOnTop = Math.abs(door.y - (-WALL_THICKNESS_CM)) < 1;
                  const isOnBottom = Math.abs(door.y - roomConfig.height) < 1;
                  const isOnLeft = Math.abs(door.x - (-WALL_THICKNESS_CM)) < 1;
                  const isOnRight = Math.abs(door.x - roomConfig.width) < 1;
                  
                  if (wall === 'top') return isOnTop;
                  if (wall === 'bottom') return isOnBottom;
                  if (wall === 'left') return isOnLeft;
                  if (wall === 'right') return isOnRight;
                  return false;
                });
              };
              
              // Render wall segments with gaps for doors
              const renderWallSegments = () => {
                const segments: React.ReactNode[] = [];
                const roomWidthPx = roomConfig.width * PIXELS_PER_CM;
                const roomHeightPx = roomConfig.height * PIXELS_PER_CM;
                
                // TOP WALL
                const topDoors = getDoorsOnWall('top').sort((a, b) => a.x - b.x);
                if (topDoors.length === 0) {
                  // No doors - draw full wall
                  segments.push(
                    <Rect
                      key="wall-top"
                      x={-WALL_THICKNESS_PX / 2}
                      y={-WALL_THICKNESS_PX / 2}
                      width={roomWidthPx + WALL_THICKNESS_PX}
                      height={WALL_THICKNESS_PX}
                      fill="black"
                    />
                  );
                } else {
                  // Draw wall segments around doors
                  let currentX = -WALL_THICKNESS_PX / 2;
                  topDoors.forEach((door, i) => {
                    const doorStartPx = door.x * PIXELS_PER_CM;
                    const doorEndPx = (door.x + door.width) * PIXELS_PER_CM;
                    
                    // Segment before door
                    if (doorStartPx > currentX + WALL_THICKNESS_PX / 2) {
                      segments.push(
                        <Rect
                          key={`wall-top-${i}-before`}
                          x={currentX}
                          y={-WALL_THICKNESS_PX / 2}
                          width={doorStartPx - currentX + WALL_THICKNESS_PX / 2}
                          height={WALL_THICKNESS_PX}
                          fill="black"
                        />
                      );
                    }
                    currentX = doorEndPx - WALL_THICKNESS_PX / 2;
                  });
                  // Final segment after last door
                  if (currentX < roomWidthPx + WALL_THICKNESS_PX / 2) {
                    segments.push(
                      <Rect
                        key="wall-top-end"
                        x={currentX}
                        y={-WALL_THICKNESS_PX / 2}
                        width={roomWidthPx + WALL_THICKNESS_PX / 2 - currentX}
                        height={WALL_THICKNESS_PX}
                        fill="black"
                      />
                    );
                  }
                }
                
                // BOTTOM WALL
                const bottomDoors = getDoorsOnWall('bottom').sort((a, b) => a.x - b.x);
                if (bottomDoors.length === 0) {
                  segments.push(
                    <Rect
                      key="wall-bottom"
                      x={-WALL_THICKNESS_PX / 2}
                      y={roomHeightPx - WALL_THICKNESS_PX / 2}
                      width={roomWidthPx + WALL_THICKNESS_PX}
                      height={WALL_THICKNESS_PX}
                      fill="black"
                    />
                  );
                } else {
                  let currentX = -WALL_THICKNESS_PX / 2;
                  bottomDoors.forEach((door, i) => {
                    const doorStartPx = door.x * PIXELS_PER_CM;
                    const doorEndPx = (door.x + door.width) * PIXELS_PER_CM;
                    
                    if (doorStartPx > currentX + WALL_THICKNESS_PX / 2) {
                      segments.push(
                        <Rect
                          key={`wall-bottom-${i}-before`}
                          x={currentX}
                          y={roomHeightPx - WALL_THICKNESS_PX / 2}
                          width={doorStartPx - currentX + WALL_THICKNESS_PX / 2}
                          height={WALL_THICKNESS_PX}
                          fill="black"
                        />
                      );
                    }
                    currentX = doorEndPx - WALL_THICKNESS_PX / 2;
                  });
                  if (currentX < roomWidthPx + WALL_THICKNESS_PX / 2) {
                    segments.push(
                      <Rect
                        key="wall-bottom-end"
                        x={currentX}
                        y={roomHeightPx - WALL_THICKNESS_PX / 2}
                        width={roomWidthPx + WALL_THICKNESS_PX / 2 - currentX}
                        height={WALL_THICKNESS_PX}
                        fill="black"
                      />
                    );
                  }
                }
                
                // LEFT WALL
                const leftDoors = getDoorsOnWall('left').sort((a, b) => a.y - b.y);
                if (leftDoors.length === 0) {
                  segments.push(
                    <Rect
                      key="wall-left"
                      x={-WALL_THICKNESS_PX / 2}
                      y={-WALL_THICKNESS_PX / 2}
                      width={WALL_THICKNESS_PX}
                      height={roomHeightPx + WALL_THICKNESS_PX}
                      fill="black"
                    />
                  );
                } else {
                  let currentY = -WALL_THICKNESS_PX / 2;
                  leftDoors.forEach((door, i) => {
                    const doorStartPx = door.y * PIXELS_PER_CM;
                    const doorEndPx = (door.y + door.width) * PIXELS_PER_CM;
                    
                    if (doorStartPx > currentY + WALL_THICKNESS_PX / 2) {
                      segments.push(
                        <Rect
                          key={`wall-left-${i}-before`}
                          x={-WALL_THICKNESS_PX / 2}
                          y={currentY}
                          width={WALL_THICKNESS_PX}
                          height={doorStartPx - currentY + WALL_THICKNESS_PX / 2}
                          fill="black"
                        />
                      );
                    }
                    currentY = doorEndPx - WALL_THICKNESS_PX / 2;
                  });
                  if (currentY < roomHeightPx + WALL_THICKNESS_PX / 2) {
                    segments.push(
                      <Rect
                        key="wall-left-end"
                        x={-WALL_THICKNESS_PX / 2}
                        y={currentY}
                        width={WALL_THICKNESS_PX}
                        height={roomHeightPx + WALL_THICKNESS_PX / 2 - currentY}
                        fill="black"
                      />
                    );
                  }
                }
                
                // RIGHT WALL
                const rightDoors = getDoorsOnWall('right').sort((a, b) => a.y - b.y);
                if (rightDoors.length === 0) {
                  segments.push(
                    <Rect
                      key="wall-right"
                      x={roomWidthPx - WALL_THICKNESS_PX / 2}
                      y={-WALL_THICKNESS_PX / 2}
                      width={WALL_THICKNESS_PX}
                      height={roomHeightPx + WALL_THICKNESS_PX}
                      fill="black"
                    />
                  );
                } else {
                  let currentY = -WALL_THICKNESS_PX / 2;
                  rightDoors.forEach((door, i) => {
                    const doorStartPx = door.y * PIXELS_PER_CM;
                    const doorEndPx = (door.y + door.width) * PIXELS_PER_CM;
                    
                    if (doorStartPx > currentY + WALL_THICKNESS_PX / 2) {
                      segments.push(
                        <Rect
                          key={`wall-right-${i}-before`}
                          x={roomWidthPx - WALL_THICKNESS_PX / 2}
                          y={currentY}
                          width={WALL_THICKNESS_PX}
                          height={doorStartPx - currentY + WALL_THICKNESS_PX / 2}
                          fill="black"
                        />
                      );
                    }
                    currentY = doorEndPx - WALL_THICKNESS_PX / 2;
                  });
                  if (currentY < roomHeightPx + WALL_THICKNESS_PX / 2) {
                    segments.push(
                      <Rect
                        key="wall-right-end"
                        x={roomWidthPx - WALL_THICKNESS_PX / 2}
                        y={currentY}
                        width={WALL_THICKNESS_PX}
                        height={roomHeightPx + WALL_THICKNESS_PX / 2 - currentY}
                        fill="black"
                      />
                    );
                  }
                }
                
                return segments;
              };
              
              return renderWallSegments();
            })()}
            <GridBackground width={roomConfig.width} height={roomConfig.height} />
            
            {/* Inner Wall Gray Zones - Areas cut off by spanning inner walls */}
            {innerWallZones.map((zone) => (
              <Rect
                key={`zone-${zone.wallId}`}
                x={zone.x * PIXELS_PER_CM}
                y={zone.y * PIXELS_PER_CM}
                width={zone.width * PIXELS_PER_CM}
                height={zone.height * PIXELS_PER_CM}
                fill="#4a4a4a"
                opacity={0.7}
              />
            ))}
            
            {/* Room Dimensions - Always visible on top and left walls */}
            <Group>
              {(() => {
                // Dynamic font size that scales with zoom (36-64px range)
                const baseFontSize = 48;
                const dimensionFontSize = Math.max(36, Math.min(64, baseFontSize + (userZoom - 1) * 12));
                
                // Top wall text
                const topText = formatMeasurement(roomConfig.width, measurementUnit);
                const topTextWidth = topText.length * dimensionFontSize * 0.6;
                const topY = -100 - 15 - dimensionFontSize;
                
                // Left wall text
                const leftText = formatMeasurement(roomConfig.height, measurementUnit);
                const leftTextWidth = leftText.length * dimensionFontSize * 0.6;
                const leftCenterY = roomConfig.height * PIXELS_PER_CM / 2;
                
                return (
                  <>
                    {/* Top wall - Room width */}
                    <Line 
                      points={[0, -100, roomConfig.width * PIXELS_PER_CM, -100]} 
                      stroke="#0a0a0a" 
                      strokeWidth={2} 
                    />
                    <Line points={[0, -105, 0, -95]} stroke="#0a0a0a" strokeWidth={2} />
                    <Line points={[roomConfig.width * PIXELS_PER_CM, -105, roomConfig.width * PIXELS_PER_CM, -95]} stroke="#0a0a0a" strokeWidth={2} />
                    <Text 
                      x={roomConfig.width * PIXELS_PER_CM / 2 - topTextWidth / 2} 
                      y={topY}
                      text={topText}
                      fontSize={dimensionFontSize}
                      fontFamily="Arial, sans-serif"
                      fontStyle="bold"
                      fill="#0a0a0a"
                    />
                    
                    {/* Left wall - Room height */}
                    <Line 
                      points={[-100, 0, -100, roomConfig.height * PIXELS_PER_CM]} 
                      stroke="#0a0a0a" 
                      strokeWidth={2} 
                    />
                    <Line points={[-105, 0, -95, 0]} stroke="#0a0a0a" strokeWidth={2} />
                    <Line points={[-105, roomConfig.height * PIXELS_PER_CM, -95, roomConfig.height * PIXELS_PER_CM]} stroke="#0a0a0a" strokeWidth={2} />
                    <Text 
                      x={-100 - 20 - leftTextWidth}
                      y={leftCenterY - dimensionFontSize / 2}
                      text={leftText}
                      fontSize={dimensionFontSize}
                      fontFamily="Arial, sans-serif"
                      fontStyle="bold"
                      fill="#0a0a0a"
                    />
                  </>
                );
              })()}
            </Group>
            
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
                allItems={items}
                showLabels={showLabels}
                innerWallZones={innerWallZones}
              />
            ))}
            {items.map((item) => {
              if (item.id === selectedId || showAllMeasurements || showLabels) {
                // Filter out the current item so we don't measure distance to itself
                const neighbors = items.filter((other) => other.id !== item.id);
                
                return (
                  <MeasurementOverlay
                    key={`measurement-${item.id}`}
                    item={item}
                    room={roomConfig}
                    otherItems={neighbors}
                    zoom={userZoom}
                    unit={measurementUnit}
                    showLabels={showLabels}
                    hiddenMeasurements={hiddenMeasurements}
                    onToggleMeasurement={onToggleMeasurement}
                    viewMode={showAllMeasurements ? 'measurements' : 'blueprint'}
                    hiddenMeasurementsForExport={hiddenMeasurementsForExport}
                  />
                );
              }
              return null;
            })}
            
            {/* Manual Measurement Lines */}
            {manualMeasurements.map((measurement) => {
              const startPx = { x: measurement.startX * PIXELS_PER_CM, y: measurement.startY * PIXELS_PER_CM };
              const endPx = { x: measurement.endX * PIXELS_PER_CM, y: measurement.endY * PIXELS_PER_CM };
              const midX = (startPx.x + endPx.x) / 2;
              const midY = (startPx.y + endPx.y) / 2;
              
              // Calculate distance in cm
              const dx = measurement.endX - measurement.startX;
              const dy = measurement.endY - measurement.startY;
              const distanceCm = Math.sqrt(dx * dx + dy * dy);
              const distanceText = formatMeasurement(distanceCm, measurementUnit);
              
              // Calculate angle for the label
              const angle = Math.atan2(dy, dx) * (180 / Math.PI);
              
              const isSelected = selectedManualMeasurement === measurement.id;
              const lineColor = isSelected ? '#fca5a5' : '#8b5cf6'; // Light red/pink when selected, purple normally
              
              return (
                <Group key={measurement.id}>
                  {/* Main line - BIGGER */}
                  <Line
                    points={[startPx.x, startPx.y, endPx.x, endPx.y]}
                    stroke={lineColor}
                    strokeWidth={isSelected ? 4 : 3}
                    dash={[12, 6]}
                    hitStrokeWidth={25}
                    onClick={() => setSelectedManualMeasurement(measurement.id)}
                    onMouseEnter={(e) => {
                      const stage = e.target.getStage();
                      if (stage) stage.container().style.cursor = 'pointer';
                    }}
                    onMouseLeave={(e) => {
                      const stage = e.target.getStage();
                      if (stage) stage.container().style.cursor = isDrawingMeasurement ? 'crosshair' : 'default';
                    }}
                  />
                  
                  {/* Start point - BIGGER */}
                  <Circle
                    x={startPx.x}
                    y={startPx.y}
                    radius={10}
                    fill={lineColor}
                  />
                  
                  {/* End point - BIGGER */}
                  <Circle
                    x={endPx.x}
                    y={endPx.y}
                    radius={10}
                    fill={lineColor}
                  />
                  
                  {/* Distance label background - BIGGER */}
                  <Rect
                    x={midX - 55}
                    y={midY - 16}
                    width={110}
                    height={32}
                    fill="white"
                    stroke={lineColor}
                    strokeWidth={2}
                    cornerRadius={6}
                  />
                  
                  {/* Distance label text - BIGGER */}
                  <Text
                    x={midX - 55}
                    y={midY - 10}
                    width={110}
                    text={distanceText}
                    fill={lineColor}
                    fontSize={20}
                    fontStyle="bold"
                    align="center"
                  />
                  
                  {/* Delete button when selected - BIGGER and offset from line */}
                  {isSelected && (
                    <Group
                      x={endPx.x + 40}
                      y={endPx.y - 40}
                      onClick={() => {
                        if (onDeleteManualMeasurement) {
                          onDeleteManualMeasurement(measurement.id);
                          setSelectedManualMeasurement(null);
                        }
                      }}
                      onMouseEnter={(e) => {
                        const stage = e.target.getStage();
                        if (stage) stage.container().style.cursor = 'pointer';
                      }}
                      onMouseLeave={(e) => {
                        const stage = e.target.getStage();
                        if (stage) stage.container().style.cursor = isDrawingMeasurement ? 'crosshair' : 'default';
                      }}
                    >
                      <Circle
                        x={0}
                        y={0}
                        radius={24}
                        fill="#dc2626"
                        stroke="#991b1b"
                        strokeWidth={2}
                      />
                      <Text
                        x={-10}
                        y={-14}
                        text="×"
                        fill="white"
                        fontSize={28}
                        fontStyle="bold"
                      />
                    </Group>
                  )}
                </Group>
              );
            })}
            
            {/* Drawing preview - show cursor point even before first click */}
            {isDrawingMeasurement && !drawingStart && drawingPreview && (
              <Group>
                {/* Preview cursor point (before first click) - BIGGER */}
                <Circle
                  x={drawingPreview.x * PIXELS_PER_CM}
                  y={drawingPreview.y * PIXELS_PER_CM}
                  radius={isSnapping ? 14 : 10}
                  fill={isSnapping ? '#22c55e' : '#8b5cf6'}
                  opacity={0.7}
                />
                {isSnapping && (
                  <Circle
                    x={drawingPreview.x * PIXELS_PER_CM}
                    y={drawingPreview.y * PIXELS_PER_CM}
                    radius={22}
                    stroke="#22c55e"
                    strokeWidth={3}
                    fill="transparent"
                    opacity={0.5}
                  />
                )}
                {/* "Click to start" hint - BIGGER */}
                <Text
                  x={drawingPreview.x * PIXELS_PER_CM + 25}
                  y={drawingPreview.y * PIXELS_PER_CM - 12}
                  text="Click to start"
                  fill={isSnapping ? '#22c55e' : '#8b5cf6'}
                  fontSize={16}
                  fontStyle="bold"
                  opacity={0.8}
                />
              </Group>
            )}
            
            {/* Drawing preview line (after first click) - BIGGER */}
            {isDrawingMeasurement && drawingStart && drawingPreview && (
              <Group>
                {/* Preview line - BIGGER */}
                <Line
                  points={[
                    drawingStart.x * PIXELS_PER_CM,
                    drawingStart.y * PIXELS_PER_CM,
                    drawingPreview.x * PIXELS_PER_CM,
                    drawingPreview.y * PIXELS_PER_CM,
                  ]}
                  stroke={isSnapping ? '#22c55e' : '#8b5cf6'}
                  strokeWidth={3}
                  dash={[12, 6]}
                  opacity={0.7}
                />
                
                {/* Start point - BIGGER */}
                <Circle
                  x={drawingStart.x * PIXELS_PER_CM}
                  y={drawingStart.y * PIXELS_PER_CM}
                  radius={10}
                  fill="#8b5cf6"
                />
                
                {/* Preview end point (shows snap state) - BIGGER */}
                <Circle
                  x={drawingPreview.x * PIXELS_PER_CM}
                  y={drawingPreview.y * PIXELS_PER_CM}
                  radius={isSnapping ? 14 : 10}
                  fill={isSnapping ? '#22c55e' : '#8b5cf6'}
                  opacity={isSnapping ? 1 : 0.5}
                />
                
                {/* Snap indicator ring - BIGGER */}
                {isSnapping && (
                  <Circle
                    x={drawingPreview.x * PIXELS_PER_CM}
                    y={drawingPreview.y * PIXELS_PER_CM}
                    radius={22}
                    stroke="#22c55e"
                    strokeWidth={3}
                    fill="transparent"
                    opacity={0.5}
                  />
                )}
                
                {/* Preview distance label - BIGGER */}
                {(() => {
                  const dx = drawingPreview.x - drawingStart.x;
                  const dy = drawingPreview.y - drawingStart.y;
                  const distanceCm = Math.sqrt(dx * dx + dy * dy);
                  const distanceText = formatMeasurement(distanceCm, measurementUnit);
                  const midX = (drawingStart.x + drawingPreview.x) / 2 * PIXELS_PER_CM;
                  const midY = (drawingStart.y + drawingPreview.y) / 2 * PIXELS_PER_CM;
                  
                  if (distanceCm < 1) return null; // Don't show label for very short distances
                  
                  const labelColor = isSnapping ? '#22c55e' : '#8b5cf6';
                  
                  return (
                    <>
                      <Rect
                        x={midX - 55}
                        y={midY - 16}
                        width={110}
                        height={32}
                        fill="white"
                        stroke={labelColor}
                        strokeWidth={2}
                        cornerRadius={6}
                        opacity={0.9}
                      />
                      <Text
                        x={midX - 55}
                        y={midY - 10}
                        width={110}
                        text={distanceText}
                        fill={labelColor}
                        fontSize={20}
                        fontStyle="bold"
                        align="center"
                        opacity={0.9}
                      />
                    </>
                  );
                })()}
              </Group>
            )}
          </Group>
        </Layer>
      </Stage>
      
      {/* Scale Reference - Fixed at bottom-left of viewport */}
      <div
        style={{
          position: 'absolute',
          bottom: '20px',
          left: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          pointerEvents: 'none',
          zIndex: 100,
        }}
      >
        {/* Scale box - 10cm reference matching actual grid size */}
        <div
          style={{
            width: `${10 * PIXELS_PER_CM * scale}px`,
            height: `${10 * PIXELS_PER_CM * scale}px`,
            backgroundColor: '#fafafa',
            border: '1px solid #d4d4d4',
            flexShrink: 0,
          }}
        />
        {/* Label next to box */}
        <div
          style={{
            fontSize: '11px',
            fontFamily: 'Arial, sans-serif',
            fontWeight: '500',
            color: '#a3a3a3',
            whiteSpace: 'nowrap',
          }}
        >
          = {formatMeasurement(10, measurementUnit)}
        </div>
      </div>
      
      {/* Measurement Toggle & Zoom Controls */}
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
        {/* Show Labels Toggle */}
        {onToggleLabels && (
          <div style={{ position: 'relative' }}>
            <button
              onClick={onToggleLabels}
              onMouseEnter={(e) => {
                if (toolTooltipTimeout.current) {
                  clearTimeout(toolTooltipTimeout.current);
                }
                toolTooltipTimeout.current = setTimeout(() => {
                  setHoveredTool('labels');
                }, 1000);
                if (!showLabels) {
                  e.currentTarget.style.backgroundColor = '#F5F5F5';
                  e.currentTarget.style.borderColor = '#0A0A0A';
                }
              }}
              onMouseLeave={(e) => {
                if (toolTooltipTimeout.current) {
                  clearTimeout(toolTooltipTimeout.current);
                }
                setHoveredTool(null);
                if (!showLabels) {
                  e.currentTarget.style.backgroundColor = '#FFFFFF';
                  e.currentTarget.style.borderColor = '#E5E5E5';
                }
              }}
              style={{
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: showLabels ? '#0A0A0A' : '#FFFFFF',
                border: showLabels ? 'none' : '1px solid #E5E5E5',
                borderRadius: '8px',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                transition: 'all 150ms',
              }}
            >
              <Eye size={20} color={showLabels ? '#FFFFFF' : '#0A0A0A'} />
            </button>
            {hoveredTool === 'labels' && (
              <div style={{
                position: 'absolute',
                right: '100%',
                top: '50%',
                transform: 'translateY(-50%)',
                marginRight: '12px',
                padding: '8px 12px',
                backgroundColor: '#1a1a1a',
                color: '#ffffff',
                fontSize: '12px',
                borderRadius: '6px',
                whiteSpace: 'nowrap',
                zIndex: 1000,
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                pointerEvents: 'none'
              }}>
                {showLabels ? 'Hide furniture labels' : 'Show furniture labels'}
                <div style={{
                  position: 'absolute',
                  left: '100%',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: 0,
                  height: 0,
                  borderTop: '6px solid transparent',
                  borderBottom: '6px solid transparent',
                  borderLeft: '6px solid #1a1a1a'
                }} />
              </div>
            )}
          </div>
        )}
        
        {/* Show All Measurements Toggle */}
        {onToggleMeasurements && (
          <div style={{ position: 'relative' }}>
            <button
              onClick={onToggleMeasurements}
              onMouseEnter={(e) => {
                if (toolTooltipTimeout.current) {
                  clearTimeout(toolTooltipTimeout.current);
                }
                toolTooltipTimeout.current = setTimeout(() => {
                  setHoveredTool('measurements');
                }, 1000);
                if (!showAllMeasurements) {
                  e.currentTarget.style.backgroundColor = '#F5F5F5';
                  e.currentTarget.style.borderColor = '#0A0A0A';
                }
              }}
              onMouseLeave={(e) => {
                if (toolTooltipTimeout.current) {
                  clearTimeout(toolTooltipTimeout.current);
                }
                setHoveredTool(null);
                if (!showAllMeasurements) {
                  e.currentTarget.style.backgroundColor = '#FFFFFF';
                  e.currentTarget.style.borderColor = '#E5E5E5';
                }
              }}
              style={{
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: showAllMeasurements ? '#0A0A0A' : '#FFFFFF',
                border: showAllMeasurements ? 'none' : '1px solid #E5E5E5',
                borderRadius: '8px',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                transition: 'all 150ms',
              }}
            >
              <Ruler size={20} color={showAllMeasurements ? '#FFFFFF' : '#0A0A0A'} />
            </button>
            {hoveredTool === 'measurements' && (
              <div style={{
                position: 'absolute',
                right: '100%',
                top: '50%',
                transform: 'translateY(-50%)',
                marginRight: '12px',
                padding: '8px 12px',
                backgroundColor: '#1a1a1a',
                color: '#ffffff',
                fontSize: '12px',
                borderRadius: '6px',
                whiteSpace: 'nowrap',
                zIndex: 1000,
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                pointerEvents: 'none'
              }}>
                {showAllMeasurements ? 'Hide all measurements' : 'Show distance measurements'}
                <div style={{
                  position: 'absolute',
                  left: '100%',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: 0,
                  height: 0,
                  borderTop: '6px solid transparent',
                  borderBottom: '6px solid transparent',
                  borderLeft: '6px solid #1a1a1a'
                }} />
              </div>
            )}
          </div>
        )}
        
        {/* Draw Manual Measurement Toggle */}
        {onToggleDrawingMode && (
          <div style={{ position: 'relative' }}>
            <button
              onClick={onToggleDrawingMode}
              onMouseEnter={(e) => {
                if (toolTooltipTimeout.current) {
                  clearTimeout(toolTooltipTimeout.current);
                }
                toolTooltipTimeout.current = setTimeout(() => {
                  setHoveredTool('drawing');
                }, 1000);
                if (!isDrawingMeasurement) {
                  e.currentTarget.style.backgroundColor = '#F5F5F5';
                  e.currentTarget.style.borderColor = '#0A0A0A';
                }
              }}
              onMouseLeave={(e) => {
                if (toolTooltipTimeout.current) {
                  clearTimeout(toolTooltipTimeout.current);
                }
                setHoveredTool(null);
                if (!isDrawingMeasurement) {
                  e.currentTarget.style.backgroundColor = '#FFFFFF';
                  e.currentTarget.style.borderColor = '#E5E5E5';
                }
              }}
              style={{
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: isDrawingMeasurement ? '#0A0A0A' : '#FFFFFF',
                border: isDrawingMeasurement ? 'none' : '1px solid #E5E5E5',
                borderRadius: '8px',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                transition: 'all 150ms',
              }}
            >
              <PenLine size={20} color={isDrawingMeasurement ? '#FFFFFF' : '#0A0A0A'} />
            </button>
            {hoveredTool === 'drawing' && (
              <div style={{
                position: 'absolute',
                right: '100%',
                top: '50%',
                transform: 'translateY(-50%)',
                marginRight: '12px',
                padding: '8px 12px',
                backgroundColor: '#1a1a1a',
                color: '#ffffff',
                fontSize: '12px',
                borderRadius: '6px',
                whiteSpace: 'nowrap',
                zIndex: 1000,
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                pointerEvents: 'none'
              }}>
                {isDrawingMeasurement ? 'Exit drawing mode (ESC)' : 'Draw custom measurement lines'}
                <div style={{
                  position: 'absolute',
                  left: '100%',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: 0,
                  height: 0,
                  borderTop: '6px solid transparent',
                  borderBottom: '6px solid transparent',
                  borderLeft: '6px solid #1a1a1a'
                }} />
              </div>
            )}
          </div>
        )}
        
        <div style={{ position: 'relative' }}>
          <button
            onClick={handleZoomIn}
            onMouseEnter={(e) => {
              if (toolTooltipTimeout.current) {
                clearTimeout(toolTooltipTimeout.current);
              }
              toolTooltipTimeout.current = setTimeout(() => {
                setHoveredTool('zoom-in');
              }, 1000);
              e.currentTarget.style.backgroundColor = '#F5F5F5';
              e.currentTarget.style.borderColor = '#0A0A0A';
            }}
            onMouseLeave={(e) => {
              if (toolTooltipTimeout.current) {
                clearTimeout(toolTooltipTimeout.current);
              }
              setHoveredTool(null);
              e.currentTarget.style.backgroundColor = '#FFFFFF';
              e.currentTarget.style.borderColor = '#E5E5E5';
            }}
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
          >
            <Plus size={20} color="#0A0A0A" />
          </button>
          {hoveredTool === 'zoom-in' && (
            <div style={{
              position: 'absolute',
              right: '100%',
              top: '50%',
              transform: 'translateY(-50%)',
              marginRight: '12px',
              padding: '8px 12px',
              backgroundColor: '#1a1a1a',
              color: '#ffffff',
              fontSize: '12px',
              borderRadius: '6px',
              whiteSpace: 'nowrap',
              zIndex: 1000,
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              pointerEvents: 'none'
            }}>
              Zoom in (+)
              <div style={{
                position: 'absolute',
                left: '100%',
                top: '50%',
                transform: 'translateY(-50%)',
                width: 0,
                height: 0,
                borderTop: '6px solid transparent',
                borderBottom: '6px solid transparent',
                borderLeft: '6px solid #1a1a1a'
              }} />
            </div>
          )}
        </div>
        
        <div style={{ position: 'relative' }}>
          <button
            onClick={handleResetView}
            onMouseEnter={(e) => {
              if (toolTooltipTimeout.current) {
                clearTimeout(toolTooltipTimeout.current);
              }
              toolTooltipTimeout.current = setTimeout(() => {
                setHoveredTool('fit');
              }, 1000);
              e.currentTarget.style.backgroundColor = '#F5F5F5';
              e.currentTarget.style.borderColor = '#0A0A0A';
            }}
            onMouseLeave={(e) => {
              if (toolTooltipTimeout.current) {
                clearTimeout(toolTooltipTimeout.current);
              }
              setHoveredTool(null);
              e.currentTarget.style.backgroundColor = '#FFFFFF';
              e.currentTarget.style.borderColor = '#E5E5E5';
            }}
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
          >
            <Maximize2 size={18} color="#0A0A0A" />
          </button>
          {hoveredTool === 'fit' && (
            <div style={{
              position: 'absolute',
              right: '100%',
              top: '50%',
              transform: 'translateY(-50%)',
              marginRight: '12px',
              padding: '8px 12px',
              backgroundColor: '#1a1a1a',
              color: '#ffffff',
              fontSize: '12px',
              borderRadius: '6px',
              whiteSpace: 'nowrap',
              zIndex: 1000,
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              pointerEvents: 'none'
            }}>
              Fit to view (F or 0)
              <div style={{
                position: 'absolute',
                left: '100%',
                top: '50%',
                transform: 'translateY(-50%)',
                width: 0,
                height: 0,
                borderTop: '6px solid transparent',
                borderBottom: '6px solid transparent',
                borderLeft: '6px solid #1a1a1a'
              }} />
            </div>
          )}
        </div>
        
        <div style={{ position: 'relative' }}>
          <button
            onClick={handleResetView}
            onMouseEnter={(e) => {
              if (toolTooltipTimeout.current) {
                clearTimeout(toolTooltipTimeout.current);
              }
              toolTooltipTimeout.current = setTimeout(() => {
                setHoveredTool('zoom-display');
              }, 1000);
              e.currentTarget.style.backgroundColor = '#F5F5F5';
              e.currentTarget.style.borderColor = '#0A0A0A';
            }}
            onMouseLeave={(e) => {
              if (toolTooltipTimeout.current) {
                clearTimeout(toolTooltipTimeout.current);
              }
              setHoveredTool(null);
              e.currentTarget.style.backgroundColor = '#FFFFFF';
              e.currentTarget.style.borderColor = '#E5E5E5';
            }}
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
          >
            {Math.round(userZoom * 100)}%
          </button>
          {hoveredTool === 'zoom-display' && (
            <div style={{
              position: 'absolute',
              right: '100%',
              top: '50%',
              transform: 'translateY(-50%)',
              marginRight: '12px',
              padding: '8px 12px',
              backgroundColor: '#1a1a1a',
              color: '#ffffff',
              fontSize: '12px',
              borderRadius: '6px',
              whiteSpace: 'nowrap',
              zIndex: 1000,
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              pointerEvents: 'none'
            }}>
              Current zoom level (click to reset)
              <div style={{
                position: 'absolute',
                left: '100%',
                top: '50%',
                transform: 'translateY(-50%)',
                width: 0,
                height: 0,
                borderTop: '6px solid transparent',
                borderBottom: '6px solid transparent',
                borderLeft: '6px solid #1a1a1a'
              }} />
            </div>
          )}
        </div>
        
        <div style={{ position: 'relative' }}>
          <button
            onClick={handleZoomOut}
            onMouseEnter={(e) => {
              if (toolTooltipTimeout.current) {
                clearTimeout(toolTooltipTimeout.current);
              }
              toolTooltipTimeout.current = setTimeout(() => {
                setHoveredTool('zoom-out');
              }, 1000);
              e.currentTarget.style.backgroundColor = '#F5F5F5';
              e.currentTarget.style.borderColor = '#0A0A0A';
            }}
            onMouseLeave={(e) => {
              if (toolTooltipTimeout.current) {
                clearTimeout(toolTooltipTimeout.current);
              }
              setHoveredTool(null);
              e.currentTarget.style.backgroundColor = '#FFFFFF';
              e.currentTarget.style.borderColor = '#E5E5E5';
            }}
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
          >
            <Minus size={20} color="#0A0A0A" />
          </button>
          {hoveredTool === 'zoom-out' && (
            <div style={{
              position: 'absolute',
              right: '100%',
              top: '50%',
              transform: 'translateY(-50%)',
              marginRight: '12px',
              padding: '8px 12px',
              backgroundColor: '#1a1a1a',
              color: '#ffffff',
              fontSize: '12px',
              borderRadius: '6px',
              whiteSpace: 'nowrap',
              zIndex: 1000,
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              pointerEvents: 'none'
            }}>
              Zoom out (-)
              <div style={{
                position: 'absolute',
                left: '100%',
                top: '50%',
                transform: 'translateY(-50%)',
                width: 0,
                height: 0,
                borderTop: '6px solid transparent',
                borderBottom: '6px solid transparent',
                borderLeft: '6px solid #1a1a1a'
              }} />
            </div>
          )}
        </div>
      </div>
      
      {/* Zoom Tooltip - shows near cursor during Ctrl+Scroll zoom */}
      {showZoomTooltip && (
        <div
          style={{
            position: 'absolute',
            left: `${zoomTooltipPos.x}px`,
            top: `${zoomTooltipPos.y}px`,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            color: 'white',
            padding: '6px 12px',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: '600',
            pointerEvents: 'none',
            zIndex: 1000,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            transition: 'opacity 200ms ease-out',
            opacity: showZoomTooltip ? 1 : 0,
          }}
        >
          {Math.round(userZoom * 100)}%
        </div>
      )}
    </div>
  );
}