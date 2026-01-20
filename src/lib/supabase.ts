import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rbpcaqqahdzvpwzzctlx.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJicGNhcXFhaGR6dnB3enpjdGx4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3MzEzMTcsImV4cCI6MjA4NDMwNzMxN30.GaKs430bVFfWYvpV-t7w9hzDp8eRGsUbXSofhbNKoF4';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types matching our database schema
export interface Room {
  id?: string;
  created_at?: string;
  updated_at?: string;
  user_id?: string;
  name: string;
  room_type: string;
  width_cm: number;
  length_cm: number;
  ceiling_height_cm: number;
  default_window_width_cm: number;
  default_window_height_cm: number;
  default_door_width_cm: number;
  default_door_height_cm: number;
  wall_color: string;
  current_view: string;
  hidden_measurements?: string[]; // Array of measurement IDs that are hidden
}

export interface RoomItem {
  id?: string;
  room_id?: string;
  created_at?: string;
  type: string;
  subtype?: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  color?: string;
  wall_side?: string;
  measurements?: any;
}

// Save room to database
export async function saveRoom(roomData: Room, items: RoomItem[]) {
  try {
    // Save or update room
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .upsert({
        ...roomData,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (roomError) throw roomError;

    // Delete existing items for this room
    if (room.id) {
      await supabase.from('room_items').delete().eq('room_id', room.id);
    }

    // Insert all items
    const itemsWithRoomId = items.map(item => ({
      ...item,
      room_id: room.id,
    }));

    const { error: itemsError } = await supabase
      .from('room_items')
      .insert(itemsWithRoomId);

    if (itemsError) throw itemsError;

    return { success: true, room };
  } catch (error) {
    console.error('Error saving room:', error);
    return { success: false, error };
  }
}

// Load room from database
export async function loadRoom(roomId: string) {
  try {
    // Fetch room
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', roomId)
      .single();

    if (roomError) throw roomError;

    // Fetch items
    const { data: items, error: itemsError } = await supabase
      .from('room_items')
      .select('*')
      .eq('room_id', roomId);

    if (itemsError) throw itemsError;

    return { success: true, room, items };
  } catch (error) {
    console.error('Error loading room:', error);
    return { success: false, error };
  }
}

// List all rooms (for room management UI)
export async function listRooms() {
  try {
    const { data: rooms, error } = await supabase
      .from('rooms')
      .select('id, name, room_type, updated_at, width_cm, length_cm')
      .order('updated_at', { ascending: false });

    if (error) throw error;

    return { success: true, rooms };
  } catch (error) {
    console.error('Error listing rooms:', error);
    return { success: false, error };
  }
}

// Delete room
export async function deleteRoom(roomId: string) {
  try {
    const { error } = await supabase
      .from('rooms')
      .delete()
      .eq('id', roomId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error deleting room:', error);
    return { success: false, error };
  }
}
