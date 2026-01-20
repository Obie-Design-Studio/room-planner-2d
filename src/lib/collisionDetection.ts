import { FurnitureItem } from '@/types';
import { WALL_THICKNESS_CM } from './constants';

/**
 * Check if two rectangles overlap
 */
export function rectanglesOverlap(
  rect1: { x: number; y: number; width: number; height: number },
  rect2: { x: number; y: number; width: number; height: number }
): boolean {
  return !(
    rect1.x + rect1.width <= rect2.x ||
    rect1.x >= rect2.x + rect2.width ||
    rect1.y + rect1.height <= rect2.y ||
    rect1.y >= rect2.y + rect2.height
  );
}

/**
 * Get bounding box for an item in cm
 */
export function getItemBoundingBox(item: FurnitureItem): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  const isWallObject =
    item.type.toLowerCase() === 'door' ||
    item.type.toLowerCase() === 'window';
  const isWall = item.type.toLowerCase() === 'wall';

  let width = item.width;
  let height = item.height;

  // For wall objects (doors/windows), one dimension is the wall thickness
  if (isWallObject) {
    // Check which wall it's on
    const isOnTopOrBottomWall = Math.abs(item.y - (-WALL_THICKNESS_CM)) < 1 || 
                                 Math.abs(item.y) < 1; // Also check if y is close to 0 for bottom wall calculation
    
    if (isOnTopOrBottomWall) {
      // Horizontal wall: width = item.width (length), height = WALL_THICKNESS_CM
      width = item.width;
      height = WALL_THICKNESS_CM;
    } else {
      // Vertical wall: width = WALL_THICKNESS_CM, height = item.width (length)
      width = WALL_THICKNESS_CM;
      height = item.width;
    }
  }

  // For regular furniture and walls, account for rotation
  if (!isWallObject) {
    const rotation = item.rotation || 0;
    const isRotated90 = rotation === 90 || rotation === 270;
    if (isRotated90) {
      [width, height] = [height, width];
    }
  }

  return {
    x: item.x,
    y: item.y,
    width,
    height,
  };
}

/**
 * Check if an item would collide with any other items
 */
export function wouldCollide(
  item: { x: number; y: number; width: number; height: number; rotation?: number; type: string },
  otherItems: FurnitureItem[],
  excludeId?: string
): boolean {
  const itemBox = getItemBoundingBox(item as FurnitureItem);

  for (const other of otherItems) {
    if (excludeId && other.id === excludeId) continue;

    const otherBox = getItemBoundingBox(other);

    if (rectanglesOverlap(itemBox, otherBox)) {
      return true;
    }
  }

  return false;
}

/**
 * Find a free position in the room for a new item
 * Tries to place the item in a grid pattern starting from top-left
 */
export function findFreePosition(
  itemWidth: number,
  itemHeight: number,
  roomWidth: number,
  roomHeight: number,
  existingItems: FurnitureItem[],
  itemType: string = 'furniture',
  wall?: 'top' | 'left'
): { x: number; y: number } | null {
  const isWallObject = itemType.toLowerCase() === 'window' || itemType.toLowerCase() === 'door';

  // For wall objects, try the specified wall first, then try all other walls if no space
  if (isWallObject) {
    // Try specified wall first (if provided)
    if (wall) {
      const pos = findFreePositionOnWall(itemWidth, roomWidth, roomHeight, existingItems, wall);
      if (pos) return pos;
    }
    
    // If specified wall was full or no wall specified, try all walls in order
    const wallsToTry: ('top' | 'bottom' | 'left' | 'right')[] = wall 
      ? ['top', 'bottom', 'left', 'right'].filter(w => w !== wall) as ('top' | 'bottom' | 'left' | 'right')[]
      : ['top', 'bottom', 'left', 'right'];
    
    for (const tryWall of wallsToTry) {
      const pos = findFreePositionOnWall(itemWidth, roomWidth, roomHeight, existingItems, tryWall);
      if (pos) return pos;
    }
    
    // No space found on any wall
    return null;
  }

  // For regular furniture and walls, try grid positions
  const gridSize = 20; // cm
  const padding = 10; // cm from edges

  for (let y = padding; y <= roomHeight - itemHeight - padding; y += gridSize) {
    for (let x = padding; x <= roomWidth - itemWidth - padding; x += gridSize) {
      const testItem = {
        x,
        y,
        width: itemWidth,
        height: itemHeight,
        rotation: 0,
        type: itemType,
      } as FurnitureItem;

      if (!wouldCollide(testItem, existingItems)) {
        return { x, y };
      }
    }
  }

  // If no free position found in grid, try random positions
  for (let attempt = 0; attempt < 100; attempt++) {
    const x = Math.random() * (roomWidth - itemWidth - padding * 2) + padding;
    const y = Math.random() * (roomHeight - itemHeight - padding * 2) + padding;

    const testItem = {
      x,
      y,
      width: itemWidth,
      height: itemHeight,
      rotation: 0,
      type: itemType,
    } as FurnitureItem;

    if (!wouldCollide(testItem, existingItems)) {
      return { x: Math.round(x), y: Math.round(y) };
    }
  }

  // No free position found
  return null;
}

/**
 * Find a free position on a specific wall for doors/windows
 */
function findFreePositionOnWall(
  itemLength: number,
  roomWidth: number,
  roomHeight: number,
  existingItems: FurnitureItem[],
  wall: 'top' | 'left' | 'bottom' | 'right'
): { x: number; y: number } | null {
  const gridSize = 10; // cm
  const padding = 5; // cm from corners

  if (wall === 'top') {
    // Try positions along top wall
    for (let x = padding; x <= roomWidth - itemLength - padding; x += gridSize) {
      const testItem = {
        x,
        y: -WALL_THICKNESS_CM,
        width: itemLength,
        height: WALL_THICKNESS_CM,
        rotation: 0,
        type: 'door',
      } as FurnitureItem;

      if (!wouldCollide(testItem, existingItems)) {
        return { x, y: -WALL_THICKNESS_CM };
      }
    }
  } else if (wall === 'bottom') {
    // Try positions along bottom wall
    for (let x = padding; x <= roomWidth - itemLength - padding; x += gridSize) {
      const testItem = {
        x,
        y: roomHeight,
        width: itemLength,
        height: WALL_THICKNESS_CM,
        rotation: 0,
        type: 'door',
      } as FurnitureItem;

      if (!wouldCollide(testItem, existingItems)) {
        return { x, y: roomHeight };
      }
    }
  } else if (wall === 'left') {
    // Try positions along left wall
    for (let y = padding; y <= roomHeight - itemLength - padding; y += gridSize) {
      const testItem = {
        x: -WALL_THICKNESS_CM,
        y,
        width: WALL_THICKNESS_CM,
        height: itemLength,
        rotation: 0,
        type: 'door',
      } as FurnitureItem;

      if (!wouldCollide(testItem, existingItems)) {
        return { x: -WALL_THICKNESS_CM, y };
      }
    }
  } else if (wall === 'right') {
    // Try positions along right wall
    for (let y = padding; y <= roomHeight - itemLength - padding; y += gridSize) {
      const testItem = {
        x: roomWidth,
        y,
        width: WALL_THICKNESS_CM,
        height: itemLength,
        rotation: 0,
        type: 'door',
      } as FurnitureItem;

      if (!wouldCollide(testItem, existingItems)) {
        return { x: roomWidth, y };
      }
    }
  }

  return null;
}
