import React, { useRef, useEffect } from "react";
import { Stage, Layer, Rect, Group } from "react-konva";
import { PIXELS_PER_CM, WALL_THICKNESS_PX } from "@/lib/constants";
import { RoomConfig, FurnitureItem } from "@/types";
import FurnitureShape from "./FurnitureShape";
import MeasurementOverlay from "./MeasurementOverlay";
import GridBackground from "./GridBackground";

interface RoomCanvasProps {
  roomConfig: RoomConfig;
  items: FurnitureItem[];
  onItemChange: (id: string, updates: Partial<FurnitureItem>) => void;
  onItemDelete: (id: string) => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onEdit: (id: string) => void;
  showAllMeasurements: boolean;
  viewportWidth: number;
  viewportHeight: number;
}

export default function RoomCanvas({
  roomConfig,
  items,
  onItemChange,
  onItemDelete,
  selectedId,
  onSelect,
  onEdit,
  showAllMeasurements,
  viewportWidth,
  viewportHeight,
}: RoomCanvasProps) {
  const stageRef = useRef<any>(null);

  // Calculate optimal scale and position
  const roomPxWidth = roomConfig.width * PIXELS_PER_CM;
  const roomPxHeight = roomConfig.height * PIXELS_PER_CM;
  const padding = 50;
  const scale = Math.min(
    (viewportWidth - padding) / roomPxWidth,
    (viewportHeight - padding) / roomPxHeight
  );
  const offsetX = (viewportWidth - roomPxWidth * scale) / 2;
  const offsetY = (viewportHeight - roomPxHeight * scale) / 2;

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

  return (
    <Stage ref={stageRef} width={viewportWidth} height={viewportHeight}>
      <Layer scale={{ x: scale, y: scale }}>
        <Group x={offsetX / scale} y={offsetY / scale}>
          <Rect
            x={-WALL_THICKNESS_PX / 2}
            y={-WALL_THICKNESS_PX / 2}
            width={roomConfig.width * PIXELS_PER_CM + WALL_THICKNESS_PX}
            height={roomConfig.height * PIXELS_PER_CM + WALL_THICKNESS_PX}
            fill="white"
            stroke="black"
            strokeWidth={WALL_THICKNESS_PX}
          />
          <GridBackground width={roomConfig.width} height={roomConfig.height} />
          {items.map((item) => (
            <FurnitureShape
              key={item.id}
              item={item}
              onChange={onItemChange}
              onDelete={onItemDelete}
              isSelected={item.id === selectedId}
              onSelect={onSelect}
              onEdit={onEdit}
              roomConfig={roomConfig}
            />
          ))}
          {items.map((item) => {
            if (item.id === selectedId || showAllMeasurements) {
              // Filter out the current item so we don't measure distance to itself
              const neighbors = items.filter((other) => other.id !== item.id);
              
              return (
                <MeasurementOverlay
                  key={`measurement-${item.id}`}
                  item={item}
                  room={roomConfig}
                  otherItems={neighbors}
                />
              );
            }
            return null;
          })}
        </Group>
      </Layer>
    </Stage>
  );
}
