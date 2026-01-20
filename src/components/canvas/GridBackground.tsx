import React from 'react';
import { Group, Line } from 'react-konva';
import { PIXELS_PER_CM, WALL_THICKNESS_PX } from '@/lib/constants';

interface GridBackgroundProps {
  width: number; // in cm
  height: number; // in cm
}

const GridBackground: React.FC<GridBackgroundProps> = ({ width, height }) => {
  const lines: React.ReactElement[] = [];
  
  // Walls now extend OUTWARD only (inner edges at 0 and roomPx)
  // Grid goes from (0, 0) to (roomWidthPx, roomHeightPx)
  // For 290cm × 250cm room: exactly 29 × 25 complete 10cm boxes ✓

  // Generate vertical lines: 0, 10, 20, ..., 290cm (31 lines for 290cm = 30 boxes wait no)
  // For 290cm: lines at 0, 10, 20, ..., 280, 290 = 30 lines = 29 boxes ✓
  for (let x = 0; x <= width; x += 10) {
    const isMajor = x % 100 === 0;
    lines.push(
      <Line
        key={`v-${x}`}
        points={[
          x * PIXELS_PER_CM,
          0,
          x * PIXELS_PER_CM,
          height * PIXELS_PER_CM,
        ]}
        stroke={isMajor ? '#9ca3af' : '#e5e7eb'}
        strokeWidth={isMajor ? 2 : 1}
        listening={false}
      />
    );
  }

  // Generate horizontal lines: 0, 10, 20, ..., 250cm
  // For 250cm: lines at 0, 10, 20, ..., 240, 250 = 26 lines = 25 boxes ✓
  for (let y = 0; y <= height; y += 10) {
    const isMajor = y % 100 === 0;
    lines.push(
      <Line
        key={`h-${y}`}
        points={[
          0,
          y * PIXELS_PER_CM,
          width * PIXELS_PER_CM,
          y * PIXELS_PER_CM,
        ]}
        stroke={isMajor ? '#9ca3af' : '#e5e7eb'}
        strokeWidth={isMajor ? 2 : 1}
        listening={false}
      />
    );
  }

  return <Group name="grid">{lines}</Group>;
};

export default GridBackground;
