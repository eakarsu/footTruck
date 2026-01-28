import { useEffect, useState, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_WS_URL || 'http://localhost:4000';

export function useLocationSocket(options = {}) {
  const { truckId, onLocationUpdate, onTruckNearby, autoConnect = true } = options;
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!autoConnect) return;

    const token = localStorage.getItem('token');

    socketRef.current = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    socketRef.current.on('connect', () => {
      setConnected(true);
      setError(null);
      console.log('WebSocket connected');

      // Subscribe to specific truck if provided
      if (truckId) {
        socketRef.current.emit('subscribe-truck', truckId);
      }
    });

    socketRef.current.on('disconnect', () => {
      setConnected(false);
      console.log('WebSocket disconnected');
    });

    socketRef.current.on('connect_error', (err) => {
      setError(err.message);
      console.error('WebSocket connection error:', err);
    });

    // Location update handler
    socketRef.current.on('location-update', (data) => {
      if (onLocationUpdate) {
        onLocationUpdate(data);
      }
    });

    // Nearby truck handler
    socketRef.current.on('truck-nearby', (data) => {
      if (onTruckNearby) {
        onTruckNearby(data);
      }
    });

    // Location stopped handler
    socketRef.current.on('location-stopped', (data) => {
      if (onLocationUpdate) {
        onLocationUpdate({ ...data, isActive: false });
      }
    });

    return () => {
      if (socketRef.current) {
        if (truckId) {
          socketRef.current.emit('unsubscribe-truck', truckId);
        }
        socketRef.current.disconnect();
      }
    };
  }, [truckId, autoConnect]);

  // Subscribe to a truck's location updates
  const subscribeTruck = useCallback((id) => {
    if (socketRef.current && connected) {
      socketRef.current.emit('subscribe-truck', id);
    }
  }, [connected]);

  // Unsubscribe from a truck's location updates
  const unsubscribeTruck = useCallback((id) => {
    if (socketRef.current && connected) {
      socketRef.current.emit('unsubscribe-truck', id);
    }
  }, [connected]);

  // Subscribe to nearby truck notifications based on user location
  const subscribeArea = useCallback((latitude, longitude, radius = 5) => {
    if (socketRef.current && connected) {
      socketRef.current.emit('subscribe-area', { latitude, longitude, radius });
    }
  }, [connected]);

  // Broadcast location (for truck owners)
  const broadcastLocation = useCallback((data) => {
    if (socketRef.current && connected) {
      socketRef.current.emit('broadcast-location', data);
    }
  }, [connected]);

  // Subscribe to order updates
  const subscribeOrder = useCallback((orderNumber) => {
    if (socketRef.current && connected) {
      socketRef.current.emit('join-order', orderNumber);
    }
  }, [connected]);

  const unsubscribeOrder = useCallback((orderNumber) => {
    if (socketRef.current && connected) {
      socketRef.current.emit('leave-order', orderNumber);
    }
  }, [connected]);

  return {
    connected,
    error,
    subscribeTruck,
    unsubscribeTruck,
    subscribeArea,
    broadcastLocation,
    subscribeOrder,
    unsubscribeOrder
  };
}

export default useLocationSocket;
