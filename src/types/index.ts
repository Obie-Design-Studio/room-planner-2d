export interface RoomConfig {
  width: number; // in cm
  height: number; // in cm
  roomType?: 'bedroom' | 'living' | 'kitchen' | 'office' | 'bathroom'; // room type
}

export interface FurnitureItem {
  id: string;
  type: string; // e.g., 'chair', 'table'
  x: number; // position in cm
  y: number; // position in cm
  width: number; // in cm
  height: number; // in cm
  rotation: number; // in degrees, default 0
  color?: string; // optional hex code
  floorDistance?: number; // optional, for windows - distance from floor in cm
}

export interface WallObject {
  id: string;
  type: 'window' | 'door';
  wall: 'top' | 'bottom' | 'left' | 'right';
  pos: number; // distance from the start of that wall in cm
  width: number; // in cm
  openDirection?: 'in' | 'out'; // optional, for doors later
}

export type ViewMode = 'blueprint' | 'measurements' | 'materials';

export interface ManualMeasurement {
  id: string;
  startX: number; // in cm
  startY: number; // in cm
  endX: number; // in cm
  endY: number; // in cm
}
