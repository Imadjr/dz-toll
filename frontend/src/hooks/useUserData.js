/* eslint-disable no-console */
import { useState, useEffect, useCallback, useRef } from 'react';
import tollAPI from '../services/api';

/**
 * Custom hook for user dashboard data management
 * Handles real-time updates via WebSocket and user-specific data
 */
export const useUserData = () => {
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState({});
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const isMountedRef = useRef(true);
  const socketRef = useRef(null);

  // Get user plate from localStorage
  const getUserPlate = useCallback(() => {
    const userData = localStorage.getItem('userData');
    if (userData) {
      try {
        const parsed = JSON.parse(userData);
        if (parsed.plate) return parsed.plate;
      } catch (err) {
        console.error('❌ Failed to parse userData:', err);
      }
    }

    const user = localStorage.getItem('user');
    if (user) {
      try {
        const parsed = JSON.parse(user);
        if (parsed.plate) return parsed.plate;
      } catch (err) {
        console.error('❌ Failed to parse user:', err);
      }
    }

    return null;
  }, []);

  const [userPlate, setUserPlate] = useState(() => getUserPlate());

  // Track if component is mounted
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Update userPlate when localStorage changes
  useEffect(() => {
    const handleStorageChange = () => {
      const plate = getUserPlate();
      if (plate && plate !== userPlate) {
        setUserPlate(plate);
        console.log('🔁 User plate updated:', plate);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [getUserPlate, userPlate]);

  // Calculate user stats from transactions
  const calculateStats = useCallback((txData) => {
    const granted = txData.filter((t) => t.Status === 'GRANTED').length;
    const denied = txData.filter((t) => t.Status === 'DENIED').length;
    const totalSpent = txData
      .filter((t) => t.Status === 'GRANTED')
      .reduce((sum, t) => sum + Number(t.Fee_DA || 0), 0);

    if (isMountedRef.current) {
      setStats({
        granted,
        denied,
        total: txData.length,
        totalSpent,
        successRate: txData.length > 0 ? ((granted / txData.length) * 100).toFixed(1) : 0,
      });
    }
  }, []);

  // Fetch all user data
  const fetchUserData = useCallback(async () => {
    if (!userPlate) {
      console.log('🚫 No user plate found - user not logged in');
      setLoading(false);
      return;
    }

    console.log('🔍 Fetching data for user plate:', userPlate);
    setLoading(true);
    setError(null);

    try {
      // Fetch profile
      const profileRes = await tollAPI.getUserProfile(userPlate);
      if (profileRes.data && isMountedRef.current) {
        setProfile(profileRes.data);
        setBalance(profileRes.data.balance_da || profileRes.data.balance || 0);
        console.log('✅ Profile updated');
      }

      // Fetch transactions
      const txRes = await tollAPI.getUserTransactions(userPlate);
      if (txRes.data && isMountedRef.current) {
        const txData = Array.isArray(txRes.data) ? txRes.data : [];
        setTransactions(txData);
        calculateStats(txData);
        console.log('✅ Transactions updated:', txData.length, 'records');
      }

      // Fetch notifications
      const notifRes = await tollAPI.getUserNotifications(userPlate);
      if (notifRes.data && isMountedRef.current) {
        const notifData = Array.isArray(notifRes.data) ? notifRes.data : [];
        setNotifications(notifData);
        console.log('✅ Notifications updated:', notifData.length, 'notifications');
      }
    } catch (err) {
      console.error('🚨 Error fetching user data:', err);
      if (isMountedRef.current) {
        setError('Failed to load user data');
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [userPlate, calculateStats]);

  // WebSocket connection and real-time updates
  useEffect(() => {
    if (!userPlate) {
      setLoading(false);
      return;
    }

    // Fetch initial data
    fetchUserData();

    // Create WebSocket connection
    const socket = tollAPI.socket.get();
    socketRef.current = socket;

    // Connection handlers
    const handleConnect = () => {
      if (isMountedRef.current) {
        setIsConnected(true);
        console.log('🟢 Socket.IO connected');
      }
    };

    const handleDisconnect = () => {
      if (isMountedRef.current) {
        setIsConnected(false);
        console.log('🔴 Socket.IO disconnected');
      }
    };

    const handleConnectionResponse = (data) => {
      console.log('🤝 Connection confirmed:', data);
    };

    // User-specific event handlers
    const handleTollEvent = (data) => {
      if (data.event?.Plate === userPlate && isMountedRef.current) {
        console.log('🎫 New toll event for user');
        setTransactions((prev) => [data.event, ...prev]);
        // Refresh to update balance
        fetchUserData();
      }
    };

    const handleUsersUpdated = (data) => {
      if (!isMountedRef.current) return;

      if (data.users && Array.isArray(data.users)) {
        const updatedUser = data.users.find((u) => u.plate === userPlate);
        if (updatedUser) {
          setProfile(updatedUser);
          setBalance(updatedUser.balance_da || updatedUser.balance || 0);
          console.log('👤 User profile updated via WebSocket');
        }
      } else {
        console.log('🔄 General users update - refreshing data');
        fetchUserData();
      }
    };

    const handleAnalyticsUpdate = () => {
      if (isMountedRef.current) {
        console.log('📊 Analytics update - refreshing user data');
        fetchUserData();
      }
    };

    const handleRechargeApproved = (data) => {
      if (data.request?.plate === userPlate && isMountedRef.current) {
        console.log('✅ Recharge approved - refreshing data');
        fetchUserData();
      }
    };

    const handleRechargeRejected = (data) => {
      if (data.request?.plate === userPlate && isMountedRef.current) {
        console.log('❌ Recharge rejected - refreshing data');
        fetchUserData();
      }
    };

    // Register event listeners
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connection_response', handleConnectionResponse);
    socket.on('toll_event', handleTollEvent);
    socket.on('users_updated', handleUsersUpdated);
    socket.on('analytics_update', handleAnalyticsUpdate);
    socket.on('recharge_approved', handleRechargeApproved);
    socket.on('recharge_rejected', handleRechargeRejected);

    // Set initial connection state
    setIsConnected(socket.connected);

    // Cleanup
    return () => {
      console.log('🧹 Cleaning up user WebSocket listeners');
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connection_response', handleConnectionResponse);
      socket.off('toll_event', handleTollEvent);
      socket.off('users_updated', handleUsersUpdated);
      socket.off('analytics_update', handleAnalyticsUpdate);
      socket.off('recharge_approved', handleRechargeApproved);
      socket.off('recharge_rejected', handleRechargeRejected);
    };
  }, [fetchUserData, userPlate]);

  // Manual refresh function
  const refreshData = useCallback(() => {
    console.log('🔄 Manual data refresh triggered');
    setError(null);
    fetchUserData();
  }, [fetchUserData]);

  // Mark notification as read
  const markNotificationRead = useCallback(
    async (notificationId) => {
      if (!userPlate) return;

      try {
        await tollAPI.markNotificationRead(userPlate, notificationId);
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notificationId ? { ...n, is_read: true, read: true } : n
          )
        );
        console.log('✅ Notification marked as read:', notificationId);
      } catch (err) {
        console.error('❌ Error marking notification as read:', err);
      }
    },
    [userPlate]
  );

  // Mark all notifications as read
  const markAllNotificationsRead = useCallback(async () => {
    if (!userPlate) return;

    try {
      await tollAPI.markAllNotificationsRead(userPlate);
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, is_read: true, read: true }))
      );
      console.log('✅ All notifications marked as read');
    } catch (err) {
      console.error('❌ Error marking all notifications as read:', err);
    }
  }, [userPlate]);

  return {
    // User data
    balance,
    transactions,
    notifications,
    profile,
    stats,
    userPlate,

    // Connection state
    isConnected,
    loading,
    error,

    // Actions
    refreshData,
    markNotificationRead,
    markAllNotificationsRead,
  };
};

export default useUserData;
