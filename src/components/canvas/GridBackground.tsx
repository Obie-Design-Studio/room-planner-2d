import React from 'react';
import { Group, Line } from 'react-konva';
import { PIXELS_PER_CM, WALL_THICKNESS_PX } from '@/lib/constants';

interface GridBackgroundProps {
  width: number; // in cm
  height: number; // in cm
}

const GridBackground: React.FC<GridBackgroundProps> = ({ width, height }) => {
  const lines: React.ReactElement[] = [];
  
  // Offset to position grid at inner edge of walls (not center)
  const offset = WALL_THICKNESS_PX / 2;

  // Generate vertical lines - stay inside walls
  // Lines run from inner edge of top wall to inner edge of bottom wall
  for (let x = 0; x <= width; x += 10) {
    const isMajor = x % 100 === 0;
    lines.push(
      <Line
        key={`v-${x}`}
        points={[
          x * PIXELS_PER_CM + offset,
          offset,
          x * PIXELS_PER_CM + offset,
          height * PIXELS_PER_CM - offset,
        ]}
        stroke={isMajor ? '#9ca3af' : '#e5e7eb'}
        strokeWidth={isMajor ? 2 : 1}
        listening={false}
      />
    );
  }

  // Generate horizontal lines - stay inside walls
  // Lines run from inner edge of left wall to inner edge of right wall
  for (let y = 0; y <= height; y += 10) {
    const isMajor = y % 100 === 0;
    lines.push(
      <Line
        key={`h-${y}`}
        points={[
          offset,
          y * PIXELS_PER_CM + offset,
          width * PIXELS_PER_CM - offset,
          y * PIXELS_PER_CM + offset,
        ]}
        stroke={isMajor ? '#9ca3af' : '#e5e7eb'}
        strokeWidth={isMajor ? 2 : 1}
        listening={false}
      />
    );
  }

  return <Group>{lines}</Group>;
};

export default GridBackground;
