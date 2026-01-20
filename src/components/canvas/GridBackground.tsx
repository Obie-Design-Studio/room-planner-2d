import React from 'react';
import { Group, Line } from 'react-konva';
import { PIXELS_PER_CM, WALL_THICKNESS_PX } from '@/lib/constants';

interface GridBackgroundProps {
  width: number; // in cm
  height: number; // in cm
}

const GridBackground: React.FC<GridBackgroundProps> = ({ width, height }) => {
  const lines: React.ReactElement[] = [];
  
  // CRITICAL: Walls are centered on room boundaries, extending inward by offset
  // Inner edges: (offset, offset) to (roomPx - offset, roomPx - offset)
  // Grid must align EXACTLY with these inner wall edges
  const offset = WALL_THICKNESS_PX / 2;

  // Generate vertical lines from inner left wall edge to inner right wall edge
  // For 290cm room: lines at 0, 10, 20, ..., 280cm (NOT 290 - see note below)
  for (let x = 0; x < width; x += 10) {
    const isMajor = x % 100 === 0;
    lines.push(
      <Line
        key={`v-${x}`}
        points={[
          offset + x * PIXELS_PER_CM,
          offset,
          offset + x * PIXELS_PER_CM,
          height * PIXELS_PER_CM - offset,
        ]}
        stroke={isMajor ? '#9ca3af' : '#e5e7eb'}
        strokeWidth={isMajor ? 2 : 1}
        listening={false}
      />
    );
  }

  // Generate horizontal lines from inner top wall edge to inner bottom wall edge
  // For 250cm room: lines at 0, 10, 20, ..., 240cm (NOT 250 - see note below)
  for (let y = 0; y < height; y += 10) {
    const isMajor = y % 100 === 0;
    lines.push(
      <Line
        key={`h-${y}`}
        points={[
          offset,
          offset + y * PIXELS_PER_CM,
          width * PIXELS_PER_CM - offset,
          offset + y * PIXELS_PER_CM,
        ]}
        stroke={isMajor ? '#9ca3af' : '#e5e7eb'}
        strokeWidth={isMajor ? 2 : 1}
        listening={false}
      />
    );
  }

  // NOTE: We use x < width (not x <= width) because:
  // - Inner space: roomPx - 2*offset = roomPx - WALL_THICKNESS_PX
  // - For 290cm room: 1160px - 10px = 1150px = 287.5cm usable space
  // - This fits 28 complete boxes + partial box
  // - Using x <= width would place last line INSIDE the right wall

  return <Group name="grid">{lines}</Group>;
};

export default GridBackground;
