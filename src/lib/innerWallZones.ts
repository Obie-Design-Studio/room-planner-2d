import { FurnitureItem, RoomConfig } from '@/types';
import { WALL_THICKNESS_CM } from './constants';

/**
 * Represents a "dead zone" created by a spanning inner wall
 * This is the area between the inner wall and the outer wall that's cut off
 */
export interface InnerWallZone {
  wallId: string;
  // Zone boundaries in cm (from room origin 0,0)
  x: number;
  y: number;
  width: number;
  height: number;
  // Which side of the wall this zone is on
  side: 'top' | 'bottom' | 'left' | 'right';
}

/**
 * Check if an inner wall spans from one outer wall to another
 * Returns the zone info if it does, null otherwise
 */
export function detectSpanningInnerWall(
  wall: FurnitureItem,
  roomConfig: RoomConfig
): InnerWallZone | null {
  if (wall.type?.toLowerCase() !== 'wall') return null;

  const wallX = wall.x;
  const wallY = wall.y;
  const wallWidth = wall.width;
  const wallHeight = wall.height;

  // Determine if wall is horizontal or vertical
  const isHorizontal = wallWidth > wallHeight;
  
  // Tolerance for "touching" the wall (in cm)
  const TOUCH_TOLERANCE = 5;

  if (isHorizontal) {
    // Horizontal wall - check if it spans from left outer wall to right outer wall
    const touchesLeftWall = wallX <= TOUCH_TOLERANCE;
    const touchesRightWall = (wallX + wallWidth) >= (roomConfig.width - TOUCH_TOLERANCE);
    
    if (touchesLeftWall && touchesRightWall) {
      // Wall spans horizontally - determine which zone to gray out (smaller one)
      const distanceToTop = wallY; // Distance from top of room to wall
      const distanceToBottom = roomConfig.height - (wallY + wallHeight); // Distance from wall to bottom
      
      if (distanceToTop <= distanceToBottom) {
        // Gray out the top zone
        return {
          wallId: wall.id,
          x: 0,
          y: 0,
          width: roomConfig.width,
          height: wallY, // Up to where the wall starts
          side: 'top',
        };
      } else {
        // Gray out the bottom zone
        return {
          wallId: wall.id,
          x: 0,
          y: wallY + wallHeight, // Start after the wall
          width: roomConfig.width,
          height: roomConfig.height - (wallY + wallHeight),
          side: 'bottom',
        };
      }
    }
  } else {
    // Vertical wall - check if it spans from top outer wall to bottom outer wall
    const touchesTopWall = wallY <= TOUCH_TOLERANCE;
    const touchesBottomWall = (wallY + wallHeight) >= (roomConfig.height - TOUCH_TOLERANCE);
    
    if (touchesTopWall && touchesBottomWall) {
      // Wall spans vertically - determine which zone to gray out (smaller one)
      const distanceToLeft = wallX; // Distance from left of room to wall
      const distanceToRight = roomConfig.width - (wallX + wallWidth); // Distance from wall to right
      
      if (distanceToLeft <= distanceToRight) {
        // Gray out the left zone
        return {
          wallId: wall.id,
          x: 0,
          y: 0,
          width: wallX, // Up to where the wall starts
          height: roomConfig.height,
          side: 'left',
        };
      } else {
        // Gray out the right zone
        return {
          wallId: wall.id,
          x: wallX + wallWidth, // Start after the wall
          y: 0,
          width: roomConfig.width - (wallX + wallWidth),
          height: roomConfig.height,
          side: 'right',
        };
      }
    }
  }

  return null;
}

/**
 * Get all inner wall zones from a list of items
 */
export function getAllInnerWallZones(
  items: FurnitureItem[],
  roomConfig: RoomConfig
): InnerWallZone[] {
  const zones: InnerWallZone[] = [];
  
  for (const item of items) {
    if (item.type?.toLowerCase() === 'wall') {
      const zone = detectSpanningInnerWall(item, roomConfig);
      if (zone) {
        zones.push(zone);
      }
    }
  }
  
  return zones;
}

/**
 * Check if a point is inside any inner wall zone
 */
export function isPointInZone(
  x: number,
  y: number,
  zones: InnerWallZone[]
): boolean {
  for (const zone of zones) {
    if (
      x >= zone.x &&
      x <= zone.x + zone.width &&
      y >= zone.y &&
      y <= zone.y + zone.height
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Check if a rectangle overlaps with any inner wall zone
 */
export function rectangleOverlapsZone(
  x: number,
  y: number,
  width: number,
  height: number,
  zones: InnerWallZone[]
): boolean {
  for (const zone of zones) {
    // Check for rectangle intersection
    const noOverlap =
      x + width <= zone.x ||      // Rectangle is left of zone
      x >= zone.x + zone.width || // Rectangle is right of zone
      y + height <= zone.y ||     // Rectangle is above zone
      y >= zone.y + zone.height;  // Rectangle is below zone
    
    if (!noOverlap) {
      return true; // There is overlap
    }
  }
  return false;
}

/**
 * Get the effective room boundaries considering inner wall zones
 * This returns the usable area after excluding gray zones
 */
export function getEffectiveRoomBoundaries(
  roomConfig: RoomConfig,
  zones: InnerWallZone[]
): { minX: number; minY: number; maxX: number; maxY: number } {
  let minX = 0;
  let minY = 0;
  let maxX = roomConfig.width;
  let maxY = roomConfig.height;

  for (const zone of zones) {
    switch (zone.side) {
      case 'top':
        minY = Math.max(minY, zone.y + zone.height);
        break;
      case 'bottom':
        maxY = Math.min(maxY, zone.y);
        break;
      case 'left':
        minX = Math.max(minX, zone.x + zone.width);
        break;
      case 'right':
        maxX = Math.min(maxX, zone.x);
        break;
    }
  }

  return { minX, minY, maxX, maxY };
}
