import React from 'react';
import { Group, Line } from 'react-konva';
import { PIXELS_PER_CM } from '@/lib/constants';

interface GridBackgroundProps {
  width: number; // in cm
  height: number; // in cm
}

const GridBackground: React.FC<GridBackgroundProps> = ({ width, height }) => {
  const lines: React.ReactElement[] = [];

  // Generate vertical lines
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

  // Generate horizontal lines
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

  return <Group>{lines}</Group>;
};

export default GridBackground;
