import React from 'react';
import { Rect, Circle, Arc, Line, Group } from 'react-konva';
import { FURNITURE_THEME } from '@/lib/furnitureTheme';
import { PIXELS_PER_CM } from '@/lib/constants';

export interface FurnitureSymbolProps {
  widthCm: number;
  heightCm: number;
}

function innerRect(widthPx: number, heightPx: number, strokeWidth: number) {
  const w = Math.max(0, widthPx - strokeWidth);
  const h = Math.max(0, heightPx - strokeWidth);
  const x = strokeWidth / 2;
  const y = strokeWidth / 2;
  return { x, y, width: w, height: h };
}

export const ToiletSymbol: React.FC<FurnitureSymbolProps> = ({ widthCm, heightCm }) => {
  const widthPx = widthCm * PIXELS_PER_CM;
  const heightPx = heightCm * PIXELS_PER_CM;
  const sw = FURNITURE_THEME.strokeWidth.primary;
  const r = innerRect(widthPx, heightPx, sw);

  return (
    <Group>
      {/* Main body: Rounded rect (oval-ish) */}
      <Rect
        x={r.x}
        y={r.y}
        width={r.width}
        height={r.height}
        cornerRadius={r.height / 2}
        fill={FURNITURE_THEME.fill.primary}
        stroke={FURNITURE_THEME.stroke.primary}
        strokeWidth={sw}
      />
      {/* Tank: Small rectangle at the back (top edge) */}
      <Rect
        x={r.x + (r.width * 0.2)}
        y={r.y - (r.height * 0.22)}
        width={widthPx * 0.6}
        height={heightPx * 0.3}
        fill={FURNITURE_THEME.fill.primary}
        stroke={FURNITURE_THEME.stroke.primary}
        strokeWidth={sw}
      />
    </Group>
  );
};

export const SinkSymbol: React.FC<FurnitureSymbolProps> = ({ widthCm, heightCm }) => {
  const widthPx = widthCm * PIXELS_PER_CM;
  const heightPx = heightCm * PIXELS_PER_CM;
  const drainRadius = Math.min(widthPx, heightPx) * 0.15;
  const sw = FURNITURE_THEME.strokeWidth.primary;
  const r = innerRect(widthPx, heightPx, sw);

  return (
    <Group>
      {/* Main basin: Rectangle */}
      <Rect
        x={r.x}
        y={r.y}
        width={r.width}
        height={r.height}
        fill={FURNITURE_THEME.fill.primary}
        stroke={FURNITURE_THEME.stroke.primary}
        strokeWidth={sw}
      />
      {/* Drain: Small circle in center */}
      <Circle
        x={widthPx / 2}
        y={heightPx / 2}
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
  const pillowWidth = widthPx * 0.2;
  const pillowHeight = heightPx * 0.15;
  const pillowSpacing = widthPx * 0.1;
  const sw = FURNITURE_THEME.strokeWidth.primary;
  const r = innerRect(widthPx, heightPx, sw);

  return (
    <Group>
      {/* Main body: Large rectangle (mattress) */}
      <Rect
        x={r.x}
        y={r.y}
        width={r.width}
        height={r.height}
        fill={FURNITURE_THEME.fill.primary}
        stroke={FURNITURE_THEME.stroke.primary}
        strokeWidth={sw}
      />
      {/* Duvet fold line: Horizontal line across middle */}
      <Line
        points={[r.x, heightPx / 2, r.x + r.width, heightPx / 2]}
        stroke={FURNITURE_THEME.stroke.secondary}
        strokeWidth={FURNITURE_THEME.strokeWidth.secondary}
        dash={[5, 3]}
      />
      {/* Pillows: 2 small rectangles at head (top edge) */}
      <Rect
        x={r.x + pillowSpacing}
        y={r.y + pillowHeight * 0.15}
        width={pillowWidth}
        height={pillowHeight}
        fill={FURNITURE_THEME.fill.accent}
        stroke={FURNITURE_THEME.stroke.secondary}
        strokeWidth={FURNITURE_THEME.strokeWidth.secondary}
      />
      <Rect
        x={r.x + r.width - pillowSpacing - pillowWidth}
        y={r.y + pillowHeight * 0.15}
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
  const backrestHeight = heightPx * 0.25;
  const armrestWidth = widthPx * 0.08;
  const armrestHeight = heightPx * 0.7;
  const sw = FURNITURE_THEME.strokeWidth.primary;
  const r = innerRect(widthPx, heightPx, sw);

  return (
    <Group>
      {/* Main seat: Large rectangle */}
      <Rect
        x={r.x}
        y={r.y}
        width={r.width}
        height={r.height}
        fill={FURNITURE_THEME.fill.primary}
        stroke={FURNITURE_THEME.stroke.primary}
        strokeWidth={sw}
      />
      {/* Backrest: Thin rectangle along back edge */}
      <Rect
        x={r.x}
        y={r.y}
        width={r.width}
        height={backrestHeight}
        fill={FURNITURE_THEME.fill.accent}
        stroke={FURNITURE_THEME.stroke.primary}
        strokeWidth={sw}
      />
      {/* Armrests: Small rectangles on left/right edges */}
      <Rect
        x={r.x}
        y={heightPx / 2 - armrestHeight / 2}
        width={armrestWidth}
        height={armrestHeight}
        fill={FURNITURE_THEME.fill.accent}
        stroke={FURNITURE_THEME.stroke.primary}
        strokeWidth={sw}
      />
      <Rect
        x={r.x + r.width - armrestWidth}
        y={heightPx / 2 - armrestHeight / 2}
        width={armrestWidth}
        height={armrestHeight}
        fill={FURNITURE_THEME.fill.accent}
        stroke={FURNITURE_THEME.stroke.primary}
        strokeWidth={sw}
      />
    </Group>
  );
};

export const ChairSymbol: React.FC<FurnitureSymbolProps> = ({ widthCm, heightCm }) => {
  const widthPx = widthCm * PIXELS_PER_CM;
  const heightPx = heightCm * PIXELS_PER_CM;
  const backrestHeight = heightPx * 0.4;
  const sw = FURNITURE_THEME.strokeWidth.primary;
  const r = innerRect(widthPx, heightPx, sw);

  return (
    <Group>
      {/* Seat: Small square */}
      <Rect
        x={r.x}
        y={r.y}
        width={r.width}
        height={r.height}
        fill={FURNITURE_THEME.fill.primary}
        stroke={FURNITURE_THEME.stroke.primary}
        strokeWidth={sw}
      />
      {/* Backrest: Thin rect at back edge */}
      <Rect
        x={r.x}
        y={r.y}
        width={r.width}
        height={Math.max(0, backrestHeight - sw / 2)}
        fill={FURNITURE_THEME.fill.accent}
        stroke={FURNITURE_THEME.stroke.primary}
        strokeWidth={sw}
      />
    </Group>
  );
};

export const TableSymbol: React.FC<FurnitureSymbolProps> = ({ widthCm, heightCm }) => {
  const widthPx = widthCm * PIXELS_PER_CM;
  const heightPx = heightCm * PIXELS_PER_CM;
  const sw = FURNITURE_THEME.strokeWidth.primary;
  const r = innerRect(widthPx, heightPx, sw);

  return (
    <Group>
      {/* Simple rectangle outline */}
      <Rect
        x={r.x}
        y={r.y}
        width={r.width}
        height={r.height}
        fill={FURNITURE_THEME.fill.primary}
        stroke={FURNITURE_THEME.stroke.primary}
        strokeWidth={sw}
      />
    </Group>
  );
};

export const NightstandSymbol: React.FC<FurnitureSymbolProps> = ({ widthCm, heightCm }) => {
  const widthPx = widthCm * PIXELS_PER_CM;
  const heightPx = heightCm * PIXELS_PER_CM;
  const sw = FURNITURE_THEME.strokeWidth.primary;
  const r = innerRect(widthPx, heightPx, sw);
  const drawerHeight = r.height / 2;

  return (
    <Group>
      {/* Main body */}
      <Rect
        x={r.x}
        y={r.y}
        width={r.width}
        height={r.height}
        fill={FURNITURE_THEME.fill.primary}
        stroke={FURNITURE_THEME.stroke.primary}
        strokeWidth={sw}
      />
      {/* Drawer divider */}
      <Line
        points={[r.x, r.y + drawerHeight, r.x + r.width, r.y + drawerHeight]}
        stroke={FURNITURE_THEME.stroke.secondary}
        strokeWidth={FURNITURE_THEME.strokeWidth.secondary}
      />
      {/* Drawer handles */}
      <Circle
        x={widthPx / 2}
        y={r.y + drawerHeight / 2}
        radius={Math.min(widthPx, heightPx) * 0.08}
        fill={FURNITURE_THEME.stroke.secondary}
      />
      <Circle
        x={widthPx / 2}
        y={r.y + drawerHeight + drawerHeight / 2}
        radius={Math.min(widthPx, heightPx) * 0.08}
        fill={FURNITURE_THEME.stroke.secondary}
      />
    </Group>
  );
};

export const DresserSymbol: React.FC<FurnitureSymbolProps> = ({ widthCm, heightCm }) => {
  const widthPx = widthCm * PIXELS_PER_CM;
  const heightPx = heightCm * PIXELS_PER_CM;
  const sw = FURNITURE_THEME.strokeWidth.primary;
  const r = innerRect(widthPx, heightPx, sw);
  const drawerHeight = r.height / 3;

  return (
    <Group>
      {/* Main body */}
      <Rect
        x={r.x}
        y={r.y}
        width={r.width}
        height={r.height}
        fill={FURNITURE_THEME.fill.primary}
        stroke={FURNITURE_THEME.stroke.primary}
        strokeWidth={sw}
      />
      {/* Drawer dividers */}
      <Line
        points={[r.x, r.y + drawerHeight, r.x + r.width, r.y + drawerHeight]}
        stroke={FURNITURE_THEME.stroke.secondary}
        strokeWidth={FURNITURE_THEME.strokeWidth.secondary}
      />
      <Line
        points={[r.x, r.y + drawerHeight * 2, r.x + r.width, r.y + drawerHeight * 2]}
        stroke={FURNITURE_THEME.stroke.secondary}
        strokeWidth={FURNITURE_THEME.strokeWidth.secondary}
      />
      {/* Drawer handles */}
      <Circle
        x={widthPx / 2}
        y={r.y + drawerHeight / 2}
        radius={Math.min(widthPx, heightPx) * 0.06}
        fill={FURNITURE_THEME.stroke.secondary}
      />
      <Circle
        x={widthPx / 2}
        y={r.y + drawerHeight + drawerHeight / 2}
        radius={Math.min(widthPx, heightPx) * 0.06}
        fill={FURNITURE_THEME.stroke.secondary}
      />
      <Circle
        x={widthPx / 2}
        y={r.y + drawerHeight * 2 + drawerHeight / 2}
        radius={Math.min(widthPx, heightPx) * 0.06}
        fill={FURNITURE_THEME.stroke.secondary}
      />
    </Group>
  );
};

export const ClosetSymbol: React.FC<FurnitureSymbolProps> = ({ widthCm, heightCm }) => {
  const widthPx = widthCm * PIXELS_PER_CM;
  const heightPx = heightCm * PIXELS_PER_CM;
  const sw = FURNITURE_THEME.strokeWidth.primary;
  const r = innerRect(widthPx, heightPx, sw);

  return (
    <Group>
      {/* Main body */}
      <Rect
        x={r.x}
        y={r.y}
        width={r.width}
        height={r.height}
        fill={FURNITURE_THEME.fill.primary}
        stroke={FURNITURE_THEME.stroke.primary}
        strokeWidth={sw}
      />
      {/* Door divider (middle) */}
      <Line
        points={[widthPx / 2, r.y, widthPx / 2, r.y + r.height]}
        stroke={FURNITURE_THEME.stroke.secondary}
        strokeWidth={FURNITURE_THEME.strokeWidth.secondary}
      />
      {/* Door handles */}
      <Circle
        x={widthPx / 2 - r.width * 0.15}
        y={heightPx / 2}
        radius={Math.min(widthPx, heightPx) * 0.05}
        fill={FURNITURE_THEME.stroke.secondary}
      />
      <Circle
        x={widthPx / 2 + r.width * 0.15}
        y={heightPx / 2}
        radius={Math.min(widthPx, heightPx) * 0.05}
        fill={FURNITURE_THEME.stroke.secondary}
      />
    </Group>
  );
};

export const DeskSymbol: React.FC<FurnitureSymbolProps> = ({ widthCm, heightCm }) => {
  const widthPx = widthCm * PIXELS_PER_CM;
  const heightPx = heightCm * PIXELS_PER_CM;
  const sw = FURNITURE_THEME.strokeWidth.primary;
  const r = innerRect(widthPx, heightPx, sw);
  const drawerWidth = r.width * 0.25;

  return (
    <Group>
      {/* Main surface */}
      <Rect
        x={r.x}
        y={r.y}
        width={r.width}
        height={r.height}
        fill={FURNITURE_THEME.fill.primary}
        stroke={FURNITURE_THEME.stroke.primary}
        strokeWidth={sw}
      />
      {/* Drawer unit on right */}
      <Rect
        x={r.x + r.width - drawerWidth}
        y={r.y}
        width={drawerWidth}
        height={r.height}
        fill={FURNITURE_THEME.fill.accent}
        stroke={FURNITURE_THEME.stroke.secondary}
        strokeWidth={FURNITURE_THEME.strokeWidth.secondary}
      />
      {/* Drawer divider */}
      <Line
        points={[
          r.x + r.width - drawerWidth,
          heightPx / 2,
          r.x + r.width,
          heightPx / 2
        ]}
        stroke={FURNITURE_THEME.stroke.secondary}
        strokeWidth={FURNITURE_THEME.strokeWidth.secondary}
      />
    </Group>
  );
};

export const ArmchairSymbol: React.FC<FurnitureSymbolProps> = ({ widthCm, heightCm }) => {
  const widthPx = widthCm * PIXELS_PER_CM;
  const heightPx = heightCm * PIXELS_PER_CM;
  const sw = FURNITURE_THEME.strokeWidth.primary;
  const r = innerRect(widthPx, heightPx, sw);
  const backrestHeight = r.height * 0.3;
  const armrestWidth = r.width * 0.2;

  return (
    <Group>
      {/* Main seat */}
      <Rect
        x={r.x}
        y={r.y}
        width={r.width}
        height={r.height}
        fill={FURNITURE_THEME.fill.primary}
        stroke={FURNITURE_THEME.stroke.primary}
        strokeWidth={sw}
      />
      {/* Backrest */}
      <Rect
        x={r.x}
        y={r.y}
        width={r.width}
        height={backrestHeight}
        fill={FURNITURE_THEME.fill.accent}
        stroke={FURNITURE_THEME.stroke.primary}
        strokeWidth={sw}
      />
      {/* Armrests */}
      <Rect
        x={r.x}
        y={r.y + backrestHeight}
        width={armrestWidth}
        height={r.height - backrestHeight}
        fill={FURNITURE_THEME.fill.accent}
        stroke={FURNITURE_THEME.stroke.primary}
        strokeWidth={sw}
      />
      <Rect
        x={r.x + r.width - armrestWidth}
        y={r.y + backrestHeight}
        width={armrestWidth}
        height={r.height - backrestHeight}
        fill={FURNITURE_THEME.fill.accent}
        stroke={FURNITURE_THEME.stroke.primary}
        strokeWidth={sw}
      />
    </Group>
  );
};

export const CoffeeTableSymbol: React.FC<FurnitureSymbolProps> = ({ widthCm, heightCm }) => {
  const widthPx = widthCm * PIXELS_PER_CM;
  const heightPx = heightCm * PIXELS_PER_CM;
  const sw = FURNITURE_THEME.strokeWidth.primary;
  const r = innerRect(widthPx, heightPx, sw);

  return (
    <Group>
      {/* Main surface */}
      <Rect
        x={r.x}
        y={r.y}
        width={r.width}
        height={r.height}
        fill={FURNITURE_THEME.fill.primary}
        stroke={FURNITURE_THEME.stroke.primary}
        strokeWidth={sw}
      />
      {/* Inner decorative border */}
      <Rect
        x={r.x + r.width * 0.1}
        y={r.y + r.height * 0.1}
        width={r.width * 0.8}
        height={r.height * 0.8}
        fill="transparent"
        stroke={FURNITURE_THEME.stroke.secondary}
        strokeWidth={FURNITURE_THEME.strokeWidth.secondary}
      />
    </Group>
  );
};

export const TVStandSymbol: React.FC<FurnitureSymbolProps> = ({ widthCm, heightCm }) => {
  const widthPx = widthCm * PIXELS_PER_CM;
  const heightPx = heightCm * PIXELS_PER_CM;
  const sw = FURNITURE_THEME.strokeWidth.primary;
  const r = innerRect(widthPx, heightPx, sw);
  const sectionWidth = r.width / 3;

  return (
    <Group>
      {/* Main body */}
      <Rect
        x={r.x}
        y={r.y}
        width={r.width}
        height={r.height}
        fill={FURNITURE_THEME.fill.primary}
        stroke={FURNITURE_THEME.stroke.primary}
        strokeWidth={sw}
      />
      {/* Dividers */}
      <Line
        points={[r.x + sectionWidth, r.y, r.x + sectionWidth, r.y + r.height]}
        stroke={FURNITURE_THEME.stroke.secondary}
        strokeWidth={FURNITURE_THEME.strokeWidth.secondary}
      />
      <Line
        points={[r.x + sectionWidth * 2, r.y, r.x + sectionWidth * 2, r.y + r.height]}
        stroke={FURNITURE_THEME.stroke.secondary}
        strokeWidth={FURNITURE_THEME.strokeWidth.secondary}
      />
    </Group>
  );
};

export const BookshelfSymbol: React.FC<FurnitureSymbolProps> = ({ widthCm, heightCm }) => {
  const widthPx = widthCm * PIXELS_PER_CM;
  const heightPx = heightCm * PIXELS_PER_CM;
  const sw = FURNITURE_THEME.strokeWidth.primary;
  const r = innerRect(widthPx, heightPx, sw);
  const shelfHeight = r.height / 4;

  return (
    <Group>
      {/* Main body */}
      <Rect
        x={r.x}
        y={r.y}
        width={r.width}
        height={r.height}
        fill={FURNITURE_THEME.fill.primary}
        stroke={FURNITURE_THEME.stroke.primary}
        strokeWidth={sw}
      />
      {/* Shelves */}
      <Line
        points={[r.x, r.y + shelfHeight, r.x + r.width, r.y + shelfHeight]}
        stroke={FURNITURE_THEME.stroke.secondary}
        strokeWidth={FURNITURE_THEME.strokeWidth.secondary}
      />
      <Line
        points={[r.x, r.y + shelfHeight * 2, r.x + r.width, r.y + shelfHeight * 2]}
        stroke={FURNITURE_THEME.stroke.secondary}
        strokeWidth={FURNITURE_THEME.strokeWidth.secondary}
      />
      <Line
        points={[r.x, r.y + shelfHeight * 3, r.x + r.width, r.y + shelfHeight * 3]}
        stroke={FURNITURE_THEME.stroke.secondary}
        strokeWidth={FURNITURE_THEME.strokeWidth.secondary}
      />
    </Group>
  );
};

export const DiningTableSymbol: React.FC<FurnitureSymbolProps> = ({ widthCm, heightCm }) => {
  const widthPx = widthCm * PIXELS_PER_CM;
  const heightPx = heightCm * PIXELS_PER_CM;
  const sw = FURNITURE_THEME.strokeWidth.primary;
  const r = innerRect(widthPx, heightPx, sw);

  return (
    <Group>
      {/* Main surface */}
      <Rect
        x={r.x}
        y={r.y}
        width={r.width}
        height={r.height}
        cornerRadius={Math.min(widthPx, heightPx) * 0.05}
        fill={FURNITURE_THEME.fill.primary}
        stroke={FURNITURE_THEME.stroke.primary}
        strokeWidth={sw}
      />
    </Group>
  );
};

export const RefrigeratorSymbol: React.FC<FurnitureSymbolProps> = ({ widthCm, heightCm }) => {
  const widthPx = widthCm * PIXELS_PER_CM;
  const heightPx = heightCm * PIXELS_PER_CM;
  const sw = FURNITURE_THEME.strokeWidth.primary;
  const r = innerRect(widthPx, heightPx, sw);
  const dividerY = r.y + r.height * 0.35;

  return (
    <Group>
      {/* Main body */}
      <Rect
        x={r.x}
        y={r.y}
        width={r.width}
        height={r.height}
        fill={FURNITURE_THEME.fill.primary}
        stroke={FURNITURE_THEME.stroke.primary}
        strokeWidth={sw}
      />
      {/* Freezer/fridge divider */}
      <Line
        points={[r.x, dividerY, r.x + r.width, dividerY]}
        stroke={FURNITURE_THEME.stroke.secondary}
        strokeWidth={FURNITURE_THEME.strokeWidth.secondary}
      />
      {/* Door handles */}
      <Rect
        x={r.x + r.width * 0.75}
        y={r.y + r.height * 0.15}
        width={r.width * 0.08}
        height={r.height * 0.12}
        fill={FURNITURE_THEME.stroke.secondary}
      />
      <Rect
        x={r.x + r.width * 0.75}
        y={dividerY + r.height * 0.1}
        width={r.width * 0.08}
        height={r.height * 0.15}
        fill={FURNITURE_THEME.stroke.secondary}
      />
    </Group>
  );
};

export const StoveSymbol: React.FC<FurnitureSymbolProps> = ({ widthCm, heightCm }) => {
  const widthPx = widthCm * PIXELS_PER_CM;
  const heightPx = heightCm * PIXELS_PER_CM;
  const sw = FURNITURE_THEME.strokeWidth.primary;
  const r = innerRect(widthPx, heightPx, sw);
  const burnerRadius = Math.min(r.width, r.height) * 0.15;
  const spacing = r.width * 0.15;

  return (
    <Group>
      {/* Main body */}
      <Rect
        x={r.x}
        y={r.y}
        width={r.width}
        height={r.height}
        fill={FURNITURE_THEME.fill.primary}
        stroke={FURNITURE_THEME.stroke.primary}
        strokeWidth={sw}
      />
      {/* Four burners */}
      <Circle
        x={r.x + spacing + burnerRadius}
        y={r.y + spacing + burnerRadius}
        radius={burnerRadius}
        fill={FURNITURE_THEME.fill.secondary}
        stroke={FURNITURE_THEME.stroke.secondary}
        strokeWidth={FURNITURE_THEME.strokeWidth.secondary}
      />
      <Circle
        x={r.x + r.width - spacing - burnerRadius}
        y={r.y + spacing + burnerRadius}
        radius={burnerRadius}
        fill={FURNITURE_THEME.fill.secondary}
        stroke={FURNITURE_THEME.stroke.secondary}
        strokeWidth={FURNITURE_THEME.strokeWidth.secondary}
      />
      <Circle
        x={r.x + spacing + burnerRadius}
        y={r.y + r.height - spacing - burnerRadius}
        radius={burnerRadius}
        fill={FURNITURE_THEME.fill.secondary}
        stroke={FURNITURE_THEME.stroke.secondary}
        strokeWidth={FURNITURE_THEME.strokeWidth.secondary}
      />
      <Circle
        x={r.x + r.width - spacing - burnerRadius}
        y={r.y + r.height - spacing - burnerRadius}
        radius={burnerRadius}
        fill={FURNITURE_THEME.fill.secondary}
        stroke={FURNITURE_THEME.stroke.secondary}
        strokeWidth={FURNITURE_THEME.strokeWidth.secondary}
      />
    </Group>
  );
};

export const CounterSymbol: React.FC<FurnitureSymbolProps> = ({ widthCm, heightCm }) => {
  const widthPx = widthCm * PIXELS_PER_CM;
  const heightPx = heightCm * PIXELS_PER_CM;
  const sw = FURNITURE_THEME.strokeWidth.primary;
  const r = innerRect(widthPx, heightPx, sw);

  return (
    <Group>
      {/* Main surface */}
      <Rect
        x={r.x}
        y={r.y}
        width={r.width}
        height={r.height}
        fill={FURNITURE_THEME.fill.primary}
        stroke={FURNITURE_THEME.stroke.primary}
        strokeWidth={sw}
      />
      {/* Front edge line */}
      <Line
        points={[r.x, r.y + r.height * 0.7, r.x + r.width, r.y + r.height * 0.7]}
        stroke={FURNITURE_THEME.stroke.secondary}
        strokeWidth={FURNITURE_THEME.strokeWidth.secondary}
      />
    </Group>
  );
};

export const FilingCabinetSymbol: React.FC<FurnitureSymbolProps> = ({ widthCm, heightCm }) => {
  const widthPx = widthCm * PIXELS_PER_CM;
  const heightPx = heightCm * PIXELS_PER_CM;
  const sw = FURNITURE_THEME.strokeWidth.primary;
  const r = innerRect(widthPx, heightPx, sw);
  const drawerHeight = r.height / 3;

  return (
    <Group>
      {/* Main body */}
      <Rect
        x={r.x}
        y={r.y}
        width={r.width}
        height={r.height}
        fill={FURNITURE_THEME.fill.primary}
        stroke={FURNITURE_THEME.stroke.primary}
        strokeWidth={sw}
      />
      {/* Drawer dividers */}
      <Line
        points={[r.x, r.y + drawerHeight, r.x + r.width, r.y + drawerHeight]}
        stroke={FURNITURE_THEME.stroke.secondary}
        strokeWidth={FURNITURE_THEME.strokeWidth.secondary}
      />
      <Line
        points={[r.x, r.y + drawerHeight * 2, r.x + r.width, r.y + drawerHeight * 2]}
        stroke={FURNITURE_THEME.stroke.secondary}
        strokeWidth={FURNITURE_THEME.strokeWidth.secondary}
      />
      {/* Handles */}
      <Rect
        x={widthPx / 2 - r.width * 0.1}
        y={r.y + drawerHeight * 0.4}
        width={r.width * 0.2}
        height={r.height * 0.04}
        fill={FURNITURE_THEME.stroke.secondary}
      />
      <Rect
        x={widthPx / 2 - r.width * 0.1}
        y={r.y + drawerHeight + drawerHeight * 0.4}
        width={r.width * 0.2}
        height={r.height * 0.04}
        fill={FURNITURE_THEME.stroke.secondary}
      />
      <Rect
        x={widthPx / 2 - r.width * 0.1}
        y={r.y + drawerHeight * 2 + drawerHeight * 0.4}
        width={r.width * 0.2}
        height={r.height * 0.04}
        fill={FURNITURE_THEME.stroke.secondary}
      />
    </Group>
  );
};

export const ShowerSymbol: React.FC<FurnitureSymbolProps> = ({ widthCm, heightCm }) => {
  const widthPx = widthCm * PIXELS_PER_CM;
  const heightPx = heightCm * PIXELS_PER_CM;
  const sw = FURNITURE_THEME.strokeWidth.primary;
  const r = innerRect(widthPx, heightPx, sw);

  return (
    <Group>
      {/* Main enclosure */}
      <Rect
        x={r.x}
        y={r.y}
        width={r.width}
        height={r.height}
        fill={FURNITURE_THEME.fill.secondary}
        stroke={FURNITURE_THEME.stroke.primary}
        strokeWidth={sw}
      />
      {/* Drain */}
      <Circle
        x={widthPx / 2}
        y={r.y + r.height - r.height * 0.2}
        radius={Math.min(widthPx, heightPx) * 0.08}
        fill={FURNITURE_THEME.stroke.secondary}
      />
      {/* Shower head indicator */}
      <Arc
        x={widthPx / 2}
        y={r.y + r.height * 0.15}
        innerRadius={0}
        outerRadius={Math.min(widthPx, heightPx) * 0.2}
        angle={180}
        rotation={0}
        fill="transparent"
        stroke={FURNITURE_THEME.stroke.secondary}
        strokeWidth={FURNITURE_THEME.strokeWidth.secondary}
        dash={[3, 3]}
      />
    </Group>
  );
};

export const BathtubSymbol: React.FC<FurnitureSymbolProps> = ({ widthCm, heightCm }) => {
  const widthPx = widthCm * PIXELS_PER_CM;
  const heightPx = heightCm * PIXELS_PER_CM;
  const sw = FURNITURE_THEME.strokeWidth.primary;
  const r = innerRect(widthPx, heightPx, sw);

  return (
    <Group>
      {/* Main tub body */}
      <Rect
        x={r.x}
        y={r.y}
        width={r.width}
        height={r.height}
        cornerRadius={Math.min(widthPx, heightPx) * 0.15}
        fill={FURNITURE_THEME.fill.primary}
        stroke={FURNITURE_THEME.stroke.primary}
        strokeWidth={sw}
      />
      {/* Inner basin */}
      <Rect
        x={r.x + r.width * 0.1}
        y={r.y + r.height * 0.15}
        width={r.width * 0.8}
        height={r.height * 0.7}
        cornerRadius={Math.min(widthPx, heightPx) * 0.1}
        fill={FURNITURE_THEME.fill.secondary}
        stroke={FURNITURE_THEME.stroke.secondary}
        strokeWidth={FURNITURE_THEME.strokeWidth.secondary}
      />
      {/* Drain */}
      <Circle
        x={widthPx / 2}
        y={heightPx / 2}
        radius={Math.min(widthPx, heightPx) * 0.05}
        fill={FURNITURE_THEME.stroke.secondary}
      />
    </Group>
  );
};

export const WallToiletSymbol: React.FC<FurnitureSymbolProps> = ({ widthCm, heightCm }) => {
  const widthPx = widthCm * PIXELS_PER_CM;
  const heightPx = heightCm * PIXELS_PER_CM;
  const sw = FURNITURE_THEME.strokeWidth.primary;
  const r = innerRect(widthPx, heightPx, sw);

  return (
    <Group>
      {/* Wall mount bracket (top section) */}
      <Rect
        x={r.x + r.width * 0.2}
        y={r.y}
        width={r.width * 0.6}
        height={r.height * 0.2}
        fill={FURNITURE_THEME.fill.accent}
        stroke={FURNITURE_THEME.stroke.secondary}
        strokeWidth={FURNITURE_THEME.strokeWidth.secondary}
      />
      {/* Main bowl */}
      <Rect
        x={r.x}
        y={r.y + r.height * 0.15}
        width={r.width}
        height={r.height * 0.85}
        cornerRadius={r.height * 0.3}
        fill={FURNITURE_THEME.fill.primary}
        stroke={FURNITURE_THEME.stroke.primary}
        strokeWidth={sw}
      />
    </Group>
  );
};

export const TowelDryerSymbol: React.FC<FurnitureSymbolProps> = ({ widthCm, heightCm }) => {
  const widthPx = widthCm * PIXELS_PER_CM;
  const heightPx = heightCm * PIXELS_PER_CM;
  const sw = FURNITURE_THEME.strokeWidth.primary;
  const r = innerRect(widthPx, heightPx, sw);
  const barCount = 5;
  const barSpacing = r.height / (barCount + 1);

  return (
    <Group>
      {/* Main frame */}
      <Rect
        x={r.x}
        y={r.y}
        width={r.width}
        height={r.height}
        fill="transparent"
        stroke={FURNITURE_THEME.stroke.primary}
        strokeWidth={sw}
      />
      {/* Horizontal bars */}
      {Array.from({ length: barCount }, (_, i) => (
        <Line
          key={i}
          points={[
            r.x,
            r.y + barSpacing * (i + 1),
            r.x + r.width,
            r.y + barSpacing * (i + 1)
          ]}
          stroke={FURNITURE_THEME.stroke.secondary}
          strokeWidth={FURNITURE_THEME.strokeWidth.primary}
        />
      ))}
    </Group>
  );
};

export const WallSymbol: React.FC<FurnitureSymbolProps> = ({ widthCm, heightCm }) => {
  const widthPx = widthCm * PIXELS_PER_CM;
  const heightPx = heightCm * PIXELS_PER_CM;

  return (
    <Group>
      {/* Solid filled rectangle matching outer wall style */}
      <Rect
        x={0}
        y={0}
        width={widthPx}
        height={heightPx}
        fill="#000000"
        strokeEnabled={false}
      />
    </Group>
  );
};
