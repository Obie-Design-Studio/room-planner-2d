import React from "react";
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
  selectedId: string | null;
  onSelect: (id: string) => void;
  showAllMeasurements: boolean;
  viewportWidth: number;
  viewportHeight: number;
}

export default function RoomCanvas({
  roomConfig,
  items,
  onItemChange,
  selectedId,
  onSelect,
  showAllMeasurements,
  viewportWidth,
  viewportHeight,
}: RoomCanvasProps) {
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

  return (
    <Stage width={viewportWidth} height={viewportHeight}>
      <Layer scale={{ x: scale, y: scale }}>
        <Group x={offsetX / scale} y={offsetY / scale}>
          <Rect
            x={0}
            y={0}
            width={roomConfig.width * PIXELS_PER_CM}
            height={roomConfig.height * PIXELS_PER_CM}
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
              isSelected={item.id === selectedId}
              onSelect={onSelect}
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
