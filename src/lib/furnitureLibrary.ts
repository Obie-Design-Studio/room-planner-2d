export interface FurnitureDefinition {
  type: string;
  label: string;
  width: number;  // cm
  height: number; // cm
  color: string;
  category: 'bedroom' | 'living' | 'kitchen' | 'office' | 'bathroom' | 'general';
}

export const FURNITURE_LIBRARY: FurnitureDefinition[] = [
  // Bedroom
  { type: 'Bed', label: 'Bed', width: 160, height: 200, color: '#10b981', category: 'bedroom' },
  { type: 'Nightstand', label: 'Nightstand', width: 50, height: 40, color: '#f59e0b', category: 'bedroom' },
  { type: 'Dresser', label: 'Dresser', width: 120, height: 50, color: '#8b5cf6', category: 'bedroom' },
  { type: 'Closet', label: 'Closet', width: 150, height: 60, color: '#6366f1', category: 'bedroom' },
  { type: 'Desk', label: 'Desk', width: 120, height: 60, color: '#ec4899', category: 'bedroom' },
  
  // Living Room
  { type: 'Sofa', label: 'Sofa', width: 200, height: 90, color: '#3b82f6', category: 'living' },
  { type: 'Armchair', label: 'Armchair', width: 80, height: 80, color: '#06b6d4', category: 'living' },
  { type: 'Coffee Table', label: 'Coffee Table', width: 100, height: 60, color: '#d97706', category: 'living' },
  { type: 'TV Stand', label: 'TV Stand', width: 150, height: 45, color: '#64748b', category: 'living' },
  { type: 'Bookshelf', label: 'Bookshelf', width: 80, height: 40, color: '#78716c', category: 'living' },
  
  // Kitchen
  { type: 'Dining Table', label: 'Dining Table', width: 160, height: 90, color: '#d97706', category: 'kitchen' },
  { type: 'Chair', label: 'Chair', width: 50, height: 50, color: '#3b82f6', category: 'kitchen' },
  { type: 'Refrigerator', label: 'Refrigerator', width: 70, height: 70, color: '#94a3b8', category: 'kitchen' },
  { type: 'Stove', label: 'Stove', width: 60, height: 60, color: '#ef4444', category: 'kitchen' },
  { type: 'Counter', label: 'Counter', width: 120, height: 60, color: '#a8a29e', category: 'kitchen' },
  
  // Office
  { type: 'Filing Cabinet', label: 'Filing Cabinet', width: 50, height: 60, color: '#64748b', category: 'office' },
  
  // Bathroom
  { type: 'Toilet', label: 'Toilet', width: 40, height: 60, color: '#e0e7ff', category: 'bathroom' },
  { type: 'Sink', label: 'Sink', width: 50, height: 40, color: '#dbeafe', category: 'bathroom' },
  { type: 'Shower', label: 'Shower', width: 90, height: 90, color: '#bfdbfe', category: 'bathroom' },
  { type: 'Bathtub', label: 'Bathtub', width: 170, height: 80, color: '#93c5fd', category: 'bathroom' },
  { type: 'Wall Toilet', label: 'Wall Toilet', width: 40, height: 55, color: '#ddd6fe', category: 'bathroom' },
  { type: 'Towel Dryer', label: 'Towel Dryer', width: 60, height: 80, color: '#fca5a5', category: 'bathroom' },
  
  // General (can appear in any room)
  { type: 'Table', label: 'Table', width: 120, height: 80, color: '#d97706', category: 'general' },
];

export type RoomType = 'bedroom' | 'living' | 'kitchen' | 'office' | 'bathroom';

export const ROOM_TYPE_LABELS: Record<RoomType, string> = {
  bedroom: 'Bedroom',
  living: 'Living Room',
  kitchen: 'Kitchen',
  office: 'Office',
  bathroom: 'Bathroom',
};

export const ROOM_TYPE_DEFAULTS: Record<RoomType, string[]> = {
  bedroom: ['Bed', 'Nightstand', 'Dresser', 'Closet', 'Desk'],
  living: ['Sofa', 'Armchair', 'Coffee Table', 'TV Stand', 'Bookshelf'],
  kitchen: ['Dining Table', 'Chair', 'Refrigerator', 'Stove', 'Counter'],
  office: ['Desk', 'Chair', 'Filing Cabinet', 'Bookshelf', 'Table'],
  bathroom: ['Toilet', 'Sink', 'Shower', 'Bathtub', 'Towel Dryer'],
};

export function getFurnitureByType(type: string): FurnitureDefinition | undefined {
  return FURNITURE_LIBRARY.find(f => f.type === type);
}

export function getDefaultFurnitureForRoom(roomType: RoomType): FurnitureDefinition[] {
  const defaults = ROOM_TYPE_DEFAULTS[roomType];
  return defaults
    .map(type => getFurnitureByType(type))
    .filter((f): f is FurnitureDefinition => f !== undefined);
}
