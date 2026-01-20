import React from 'react';
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: string;
  type?: 'error' | 'success' | 'info';
  title?: string;
}

const NotificationModal: React.FC<NotificationModalProps> = ({
  isOpen,
  onClose,
  message,
  type = 'info',
  title,
}) => {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'error':
        return <AlertCircle size={48} color="#ef4444" />;
      case 'success':
        return <CheckCircle size={48} color="#22c55e" />;
      case 'info':
      default:
        return <Info size={48} color="#3b82f6" />;
    }
  };

  const getTitle = () => {
    if (title) return title;
    switch (type) {
      case 'error':
        return 'Error';
      case 'success':
        return 'Success';
      case 'info':
      default:
        return 'Info';
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          maxWidth: '420px',
          width: '100%',
          padding: '32px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '20px',
          animation: 'slideIn 0.2s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Icon */}
        <div>{getIcon()}</div>

        {/* Title */}
        <h3
          style={{
            fontSize: '20px',
            fontWeight: 600,
            color: '#0A0A0A',
            margin: 0,
            textAlign: 'center',
          }}
        >
          {getTitle()}
        </h3>

        {/* Message */}
        <p
          style={{
            fontSize: '15px',
            fontWeight: 400,
            color: '#666666',
            margin: 0,
            textAlign: 'center',
            lineHeight: '1.6',
          }}
        >
          {message}
        </p>

        {/* OK Button */}
        <button
          onClick={onClose}
          style={{
            width: '100%',
            padding: '12px 24px',
            backgroundColor: '#0A0A0A',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '8px',
            fontSize: '15px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 150ms',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#333333';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#0A0A0A';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          OK
        </button>

        <style jsx>{`
          @keyframes slideIn {
            from {
              opacity: 0;
              transform: scale(0.95) translateY(20px);
            }
            to {
              opacity: 1;
              transform: scale(1) translateY(0);
            }
          }
        `}</style>
      </div>
    </div>
  );
};

export default NotificationModal;
