import React from 'react';
import { Group, Line, Text } from 'react-konva';
import { FurnitureItem, RoomConfig } from '@/types';
import { PIXELS_PER_CM } from '@/lib/constants';

interface Props {
  item: FurnitureItem;
  room: RoomConfig;
}

const MeasurementOverlay: React.FC<Props> = ({ item, room }) => {
  // Convert everything to Pixels
  const x = item.x * PIXELS_PER_CM; // Left edge
  const y = item.y * PIXELS_PER_CM; // Top edge
  const w = item.width * PIXELS_PER_CM;
  const h = item.height * PIXELS_PER_CM;
  const roomW = room.width * PIXELS_PER_CM;
  const roomH = room.height * PIXELS_PER_CM;

  // Center points for the lines
  const midX = x + w / 2;
  const midY = y + h / 2;

  // Style constants
  const color = '#ef4444'; // Red for visibility
  const dash = [1];
  const fontSize = 12;

  return (
    <Group>
      {/* Left Wall Distance */}
      <Line points={[0, midY, x, midY]} stroke={color} dash={dash} strokeWidth={1} />
      <Text x={x / 2} y={midY - 15} text={`${Math.round(item.x)}cm`} fill={color} fontSize={fontSize} />

      {/* Top Wall Distance */}
      <Line points={[midX, 0, midX, y]} stroke={color} dash={dash} strokeWidth={1} />
      <Text x={midX + 5} y={y / 2} text={`${Math.round(item.y)}cm`} fill={color} fontSize={fontSize} />

      {/* Right Wall Distance */}
      <Line points={[x + w, midY, roomW, midY]} stroke={color} dash={dash} strokeWidth={1} />
      <Text x={x + w + (roomW - (x + w)) / 2} y={midY - 15} text={`${Math.round(room.width - item.x - item.width)}cm`} fill={color} fontSize={fontSize} />

      {/* Bottom Wall Distance */}
      <Line points={[midX, y + h, midX, roomH]} stroke={color} dash={dash} strokeWidth={1} />
      <Text x={midX + 5} y={y + h + (roomH - (y + h)) / 2} text={`${Math.round(room.height - item.y - item.height)}cm`} fill={color} fontSize={fontSize} />
    </Group>
  );
};

export default MeasurementOverlay;
