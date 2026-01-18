import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { listRooms, deleteRoom } from '@/lib/supabase';

interface LoadRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoad: (roomId: string) => void;
}

export default function LoadRoomModal({ isOpen, onClose, onLoad }: LoadRoomModalProps) {
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadRoomsList();
    }
  }, [isOpen]);

  const loadRoomsList = async () => {
    setLoading(true);
    const result = await listRooms();
    if (result.success && result.rooms) {
      setRooms(result.rooms);
    }
    setLoading(false);
  };

  const handleDelete = async (roomId: string, roomName: string) => {
    if (confirm(`Delete "${roomName}"? This cannot be undone.`)) {
      const result = await deleteRoom(roomId);
      if (result.success) {
        setRooms(prev => prev.filter(r => r.id !== roomId));
      } else {
        alert('Failed to delete room');
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    }}
    onClick={onClose}
    >
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '16px',
        width: '90%',
        maxWidth: '600px',
        maxHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
      }}
      onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '24px',
          borderBottom: '1px solid #EFEFEF',
        }}>
          <h2 style={{
            fontSize: '20px',
            fontWeight: 600,
            color: '#0A0A0A',
            margin: 0,
          }}>
            Load Room
          </h2>
          <button
            onClick={onClose}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              padding: 0,
              color: '#666666',
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 150ms',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#F5F5F5';
              e.currentTarget.style.color = '#0A0A0A';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#666666';
            }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div style={{
          flex: 1,
          overflow: 'auto',
          padding: '24px',
        }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#999999' }}>
              Loading rooms...
            </div>
          ) : rooms.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#999999' }}>
              No saved rooms yet. Save your first room to get started!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {rooms.map((room) => (
                <div
                  key={room.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px',
                    backgroundColor: '#FAFAFA',
                    border: '1px solid #EFEFEF',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    transition: 'all 150ms',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#F5F5F5';
                    e.currentTarget.style.borderColor = '#E5E5E5';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#FAFAFA';
                    e.currentTarget.style.borderColor = '#EFEFEF';
                  }}
                  onClick={() => onLoad(room.id)}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontSize: '16px',
                      fontWeight: 600,
                      color: '#0A0A0A',
                      marginBottom: '4px',
                    }}>
                      {room.name}
                    </div>
                    <div style={{
                      fontSize: '13px',
                      color: '#999999',
                    }}>
                      {room.room_type} • {room.width_cm} × {room.length_cm} cm
                      <span style={{ marginLeft: '8px' }}>
                        {new Date(room.updated_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(room.id, room.name);
                    }}
                    style={{
                      padding: '8px',
                      color: '#999999',
                      backgroundColor: 'transparent',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      transition: 'all 150ms',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#FFE5E5';
                      e.currentTarget.style.color = '#FF4444';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = '#999999';
                    }}
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
