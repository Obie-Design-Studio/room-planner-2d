import React from 'react';
import { Rect, Circle, Arc, Line, Group } from 'react-konva';
import { FURNITURE_THEME } from '@/lib/furnitureTheme';
import { PIXELS_PER_CM } from '@/lib/constants';

export interface FurnitureSymbolProps {
  widthCm: number;
  heightCm: number;
}

export const ToiletSymbol: React.FC<FurnitureSymbolProps> = ({ widthCm, heightCm }) => {
  const widthPx = widthCm * PIXELS_PER_CM;
  const heightPx = heightCm * PIXELS_PER_CM;
  const centerX = 0;
  const centerY = 0;

  return (
    <Group>
      {/* Main body: Rounded rect (oval-ish) */}
      <Rect
        x={centerX - widthPx / 2}
        y={centerY - heightPx / 2}
        width={widthPx}
        height={heightPx}
        cornerRadius={heightPx / 2}
        fill={FURNITURE_THEME.fill.primary}
        stroke={FURNITURE_THEME.stroke.primary}
        strokeWidth={FURNITURE_THEME.strokeWidth.primary}
      />
      {/* Tank: Small rectangle at the back (top edge) */}
      <Rect
        x={centerX - (widthPx * 0.6) / 2}
        y={centerY - heightPx / 2 - (heightPx * 0.3) * 0.7}
        width={widthPx * 0.6}
        height={heightPx * 0.3}
        fill={FURNITURE_THEME.fill.primary}
        stroke={FURNITURE_THEME.stroke.primary}
        strokeWidth={FURNITURE_THEME.strokeWidth.primary}
      />
    </Group>
  );
};

export const SinkSymbol: React.FC<FurnitureSymbolProps> = ({ widthCm, heightCm }) => {
  const widthPx = widthCm * PIXELS_PER_CM;
  const heightPx = heightCm * PIXELS_PER_CM;
  const centerX = 0;
  const centerY = 0;
  const drainRadius = Math.min(widthPx, heightPx) * 0.15;

  return (
    <Group>
      {/* Main basin: Rectangle */}
      <Rect
        x={centerX - widthPx / 2}
        y={centerY - heightPx / 2}
        width={widthPx}
        height={heightPx}
        fill={FURNITURE_THEME.fill.primary}
        stroke={FURNITURE_THEME.stroke.primary}
        strokeWidth={FURNITURE_THEME.strokeWidth.primary}
      />
      {/* Drain: Small circle in center */}
      <Circle
        x={centerX}
        y={centerY}
        radius={drainRadius}
        fill={FURNITURE_THEME.stroke.secondary}
        stroke={FURNITURE_THEME.stroke.primary}
        strokeWidth={FURNITURE_THEME.strokeWidth.secondary}
      />
    </Group>
  );
};

export const BedSymbol: React.FC<FurnitureSymbolProps> = ({ widthCm, heightCm }) => {
  const widthPx = widthCm * PIXELS_PER_CM;
  const heightPx = heightCm * PIXELS_PER_CM;
  const centerX = 0;
  const centerY = 0;
  const pillowWidth = widthPx * 0.2;
  const pillowHeight = heightPx * 0.15;
  const pillowSpacing = widthPx * 0.1;
  const pillowY = centerY - heightPx / 2 + pillowHeight * 0.3;

  return (
    <Group>
      {/* Main body: Large rectangle (mattress) */}
      <Rect
        x={centerX - widthPx / 2}
        y={centerY - heightPx / 2}
        width={widthPx}
        height={heightPx}
        fill={FURNITURE_THEME.fill.primary}
        stroke={FURNITURE_THEME.stroke.primary}
        strokeWidth={FURNITURE_THEME.strokeWidth.primary}
      />
      {/* Duvet fold line: Horizontal line across middle */}
      <Line
        points={[centerX - widthPx / 2, centerY, centerX + widthPx / 2, centerY]}
        stroke={FURNITURE_THEME.stroke.secondary}
        strokeWidth={FURNITURE_THEME.strokeWidth.secondary}
        dash={[5, 3]}
      />
      {/* Pillows: 2 small rectangles at head (top edge) */}
      <Rect
        x={centerX - widthPx / 2 + pillowSpacing}
        y={pillowY - pillowHeight / 2}
        width={pillowWidth}
        height={pillowHeight}
        fill={FURNITURE_THEME.fill.accent}
        stroke={FURNITURE_THEME.stroke.secondary}
        strokeWidth={FURNITURE_THEME.strokeWidth.secondary}
      />
      <Rect
        x={centerX + widthPx / 2 - pillowSpacing - pillowWidth}
        y={pillowY - pillowHeight / 2}
        width={pillowWidth}
        height={pillowHeight}
        fill={FURNITURE_THEME.fill.accent}
        stroke={FURNITURE_THEME.stroke.secondary}
        strokeWidth={FURNITURE_THEME.strokeWidth.secondary}
      />
    </Group>
  );
};

export const SofaSymbol: React.FC<FurnitureSymbolProps> = ({ widthCm, heightCm }) => {
  const widthPx = widthCm * PIXELS_PER_CM;
  const heightPx = heightCm * PIXELS_PER_CM;
  const centerX = 0;
  const centerY = 0;
  const backrestHeight = heightPx * 0.25;
  const armrestWidth = widthPx * 0.08;
  const armrestHeight = heightPx * 0.7;

  return (
    <Group>
      {/* Main seat: Large rectangle */}
      <Rect
        x={centerX - widthPx / 2}
        y={centerY - heightPx / 2}
        width={widthPx}
        height={heightPx}
        fill={FURNITURE_THEME.fill.primary}
        stroke={FURNITURE_THEME.stroke.primary}
        strokeWidth={FURNITURE_THEME.strokeWidth.primary}
      />
      {/* Backrest: Thin rectangle along back edge */}
      <Rect
        x={centerX - widthPx / 2}
        y={centerY - heightPx / 2}
        width={widthPx}
        height={backrestHeight}
        fill={FURNITURE_THEME.fill.accent}
        stroke={FURNITURE_THEME.stroke.primary}
        strokeWidth={FURNITURE_THEME.strokeWidth.primary}
      />
      {/* Armrests: Small rectangles on left/right edges */}
      <Rect
        x={centerX - widthPx / 2}
        y={centerY - armrestHeight / 2}
        width={armrestWidth}
        height={armrestHeight}
        fill={FURNITURE_THEME.fill.accent}
        stroke={FURNITURE_THEME.stroke.primary}
        strokeWidth={FURNITURE_THEME.strokeWidth.primary}
      />
      <Rect
        x={centerX + widthPx / 2 - armrestWidth}
        y={centerY - armrestHeight / 2}
        width={armrestWidth}
        height={armrestHeight}
        fill={FURNITURE_THEME.fill.accent}
        stroke={FURNITURE_THEME.stroke.primary}
        strokeWidth={FURNITURE_THEME.strokeWidth.primary}
      />
    </Group>
  );
};

export const ChairSymbol: React.FC<FurnitureSymbolProps> = ({ widthCm, heightCm }) => {
  const widthPx = widthCm * PIXELS_PER_CM;
  const heightPx = heightCm * PIXELS_PER_CM;
  const centerX = 0;
  const centerY = 0;
  const backrestHeight = heightPx * 0.4;

  return (
    <Group>
      {/* Seat: Small square */}
      <Rect
        x={centerX - widthPx / 2}
        y={centerY - heightPx / 2}
        width={widthPx}
        height={heightPx}
        fill={FURNITURE_THEME.fill.primary}
        stroke={FURNITURE_THEME.stroke.primary}
        strokeWidth={FURNITURE_THEME.strokeWidth.primary}
      />
      {/* Backrest: Thin rect at back edge */}
      <Rect
        x={centerX - widthPx / 2}
        y={centerY - heightPx / 2}
        width={widthPx}
        height={backrestHeight}
        fill={FURNITURE_THEME.fill.accent}
        stroke={FURNITURE_THEME.stroke.primary}
        strokeWidth={FURNITURE_THEME.strokeWidth.primary}
      />
    </Group>
  );
};

export const TableSymbol: React.FC<FurnitureSymbolProps> = ({ widthCm, heightCm }) => {
  const widthPx = widthCm * PIXELS_PER_CM;
  const heightPx = heightCm * PIXELS_PER_CM;
  const centerX = 0;
  const centerY = 0;

  return (
    <Group>
      {/* Simple rectangle outline */}
      <Rect
        x={centerX - widthPx / 2}
        y={centerY - heightPx / 2}
        width={widthPx}
        height={heightPx}
        fill={FURNITURE_THEME.fill.primary}
        stroke={FURNITURE_THEME.stroke.primary}
        strokeWidth={FURNITURE_THEME.strokeWidth.primary}
      />
    </Group>
  );
};
