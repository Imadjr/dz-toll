/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-console */
import { useEffect, useState, useCallback, useRef } from 'react';
import tollAPI from '../services/api';

/**
 * Custom hook for managing Socket.IO connection
 * Provides connection status, manual controls, and health monitoring
 * Uses centralized socket from api.js to prevent duplicate connections
 */
export const useSocketConnection = () => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [lastPing, setLastPing] = useState(null);

  const isMountedRef = useRef(true);
  const reconnectTimerRef = useRef(null);

  // Track component mount state
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    // Get or create socket from centralized API service
    const socketInstance = tollAPI.socket.get();
    setSocket(socketInstance);

    // === Connection Event Handlers ===

    const handleConnect = () => {
      if (!isMountedRef.current) return;
      setIsConnected(true);
      setConnectionError(null);
      setReconnectAttempts(0);
      console.log('✅ Socket.IO connected:', socketInstance.id);
    };

    const handleDisconnect = (reason) => {
      if (!isMountedRef.current) return;
      setIsConnected(false);
      console.log('❌ Socket.IO disconnected:', reason);

      // Auto-reconnect if server disconnected us
      if (reason === 'io server disconnect') {
        socketInstance.connect();
      }
    };

    const handleConnectError = (error) => {
      if (!isMountedRef.current) return;
      setIsConnected(false);
      setConnectionError(error.message || 'Connection failed');
      console.error('❌ Socket.IO connection error:', error.message);
    };

    const handleReconnect = (attemptNumber) => {
      if (!isMountedRef.current) return;
      setReconnectAttempts(attemptNumber);
      console.log(`🔄 Socket reconnected after ${attemptNumber} attempts`);
    };

    const handleReconnectAttempt = (attemptNumber) => {
      if (!isMountedRef.current) return;
      setReconnectAttempts(attemptNumber);
      console.log(`🔄 Reconnection attempt #${attemptNumber}`);
    };

    const handleReconnectError = (error) => {
      console.error('❌ Reconnection error:', error.message);
    };

    const handleReconnectFailed = () => {
      if (!isMountedRef.current) return;
      setConnectionError('Failed to reconnect after maximum attempts');
      console.error('❌ Reconnection failed - maximum attempts reached');
    };

    const handleConnectionResponse = (data) => {
      console.log('✅ Server connection confirmed:', data);
      if (data.analytics) {
        console.log('📊 Initial analytics received');
      }
    };

    const handlePing = () => {
      if (!isMountedRef.current) return;
      setLastPing(Date.now());
      console.log('📩 Received ping from server');
    };

    const handlePong = (latency) => {
      if (!isMountedRef.current) return;
      console.log('🏓 Pong received - latency:', latency, 'ms');
    };

    // === Register Event Listeners ===
    socketInstance.on('connect', handleConnect);
    socketInstance.on('disconnect', handleDisconnect);
    socketInstance.on('connect_error', handleConnectError);
    socketInstance.on('reconnect', handleReconnect);
    socketInstance.on('reconnect_attempt', handleReconnectAttempt);
    socketInstance.on('reconnect_error', handleReconnectError);
    socketInstance.on('reconnect_failed', handleReconnectFailed);
    socketInstance.on('connection_response', handleConnectionResponse);
    socketInstance.on('ping', handlePing);
    socketInstance.on('pong', handlePong);

    // Set initial connection state
    setIsConnected(socketInstance.connected);

    // === Cleanup ===
    return () => {
      console.log('🧹 Cleaning up useSocketConnection');

      // Clear reconnect timer
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }

      // Remove all listeners
      socketInstance.off('connect', handleConnect);
      socketInstance.off('disconnect', handleDisconnect);
      socketInstance.off('connect_error', handleConnectError);
      socketInstance.off('reconnect', handleReconnect);
      socketInstance.off('reconnect_attempt', handleReconnectAttempt);
      socketInstance.off('reconnect_error', handleReconnectError);
      socketInstance.off('reconnect_failed', handleReconnectFailed);
      socketInstance.off('connection_response', handleConnectionResponse);
      socketInstance.off('ping', handlePing);
      socketInstance.off('pong', handlePong);

      // Don't disconnect here - let api.js manage the socket lifecycle
      // Only disconnect when the app unmounts or user logs out
    };
  }, []);

  // === Manual Control Functions ===

  /**
   * Manually reconnect socket
   */
  const reconnect = useCallback(() => {
    if (socket && !socket.connected) {
      console.log('🔄 Manual reconnect triggered');
      setConnectionError(null);
      socket.connect();
    } else if (!socket) {
      console.warn('⚠️ Socket not initialized');
    } else {
      console.log('ℹ️ Socket already connected');
    }
  }, [socket]);

  /**
   * Manually disconnect socket
   */
  const disconnect = useCallback(() => {
    if (socket && socket.connected) {
      console.log('🔌 Manual disconnect triggered');
      socket.disconnect();
    }
  }, [socket]);

  /**
   * Emit event to server
   * @param {string} event - Event name
   * @param {*} data - Event data
   * @returns {boolean} Success status
   */
  const emit = useCallback(
    (event, data) => {
      if (socket && socket.connected) {
        socket.emit(event, data);
        console.log(`📤 Emitted event: ${event}`, data);
        return true;
      }
      console.warn(`⚠️ Cannot emit event "${event}" - Socket not connected`);
      return false;
    },
    [socket]
  );

  /**
   * Subscribe to socket event
   * @param {string} event - Event name
   * @param {Function} handler - Event handler
   */
  const on = useCallback(
    (event, handler) => {
      if (socket) {
        socket.on(event, handler);
        console.log(`👂 Subscribed to event: ${event}`);
      }
    },
    [socket]
  );

  /**
   * Unsubscribe from socket event
   * @param {string} event - Event name
   * @param {Function} handler - Event handler
   */
  const off = useCallback(
    (event, handler) => {
      if (socket) {
        socket.off(event, handler);
        console.log(`🔇 Unsubscribed from event: ${event}`);
      }
    },
    [socket]
  );

  /**
   * Get detailed connection status
   * @returns {Object} Connection status details
   */
  const getConnectionStatus = useCallback(() => {
    return {
      isConnected,
      connectionError,
      socketId: socket?.id || null,
      reconnectAttempts,
      lastPing,
      transport: socket?.io?.engine?.transport?.name || null,
      uptime: socket?.connected ? Date.now() - (socket.io.engine.upgrades || 0) : null,
    };
  }, [isConnected, connectionError, socket, reconnectAttempts, lastPing]);

  /**
   * Send ping to server and measure latency
   * @returns {Promise<number>} Latency in milliseconds
   */
  const measureLatency = useCallback(() => {
    return new Promise((resolve, reject) => {
      if (!socket || !socket.connected) {
        reject(new Error('Socket not connected'));
        return;
      }

      const startTime = Date.now();
      socket.emit('ping');

      const pongHandler = () => {
        const latency = Date.now() - startTime;
        socket.off('pong', pongHandler);
        resolve(latency);
      };

      socket.once('pong', pongHandler);

      // Timeout after 5 seconds
      setTimeout(() => {
        socket.off('pong', pongHandler);
        reject(new Error('Ping timeout'));
      }, 5000);
    });
  }, [socket]);

  return {
    // Socket instance
    socket,

    // Connection state
    isConnected,
    connectionError,
    reconnectAttempts,
    lastPing,

    // Manual controls
    reconnect,
    disconnect,
    emit,
    on,
    off,

    // Utilities
    getConnectionStatus,
    measureLatency,
  };
};

export default useSocketConnection;
