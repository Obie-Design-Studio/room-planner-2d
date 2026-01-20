import React from 'react';
import { Group, Line } from 'react-konva';
import { PIXELS_PER_CM, WALL_THICKNESS_PX } from '@/lib/constants';

interface GridBackgroundProps {
  width: number; // in cm
  height: number; // in cm
}

const GridBackground: React.FC<GridBackgroundProps> = ({ width, height }) => {
  const lines: React.ReactElement[] = [];
  
  // Grid aligns EXACTLY with inner room boundaries (0,0) to (width*px, height*px)
  // No offset needed - walls sit AROUND the grid, not overlapping it

  // Generate vertical lines - aligned to room dimensions
  // For 290cm room: lines at 0, 10, 20, ..., 280, 290cm = 30 lines, 29 boxes ✓
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

  // Generate horizontal lines - aligned to room dimensions
  // For 250cm room: lines at 0, 10, 20, ..., 240, 250cm = 26 lines, 25 boxes ✓
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
