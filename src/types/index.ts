export interface RoomConfig {
  width: number; // in cm
  height: number; // in cm
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
}
