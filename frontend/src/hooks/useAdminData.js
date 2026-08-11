import { useState, useEffect, useCallback, useRef } from 'react';
import { useSocketConnection } from './useSocketConnection';
import tollAPI from '../services/api';
import { API_BASE_URL } from '../config';

/**
 * Custom hook for admin dashboard data management
 * Handles real-time updates via WebSocket and REST API fallbacks
 */
export const useAdminData = () => {
  const { socket, isConnected } = useSocketConnection();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const isMountedRef = useRef(true);

  // State management
  const [stats, setStats] = useState({
    totalEvents: 0,
    activeUsers: 0,
    totalRevenue: 0,
    pendingRequests: 0,
    granted: 0,
    denied: 0,
    totalBalance: 0,
  });

  const [events, setEvents] = useState([]);
  const [users, setUsers] = useState([]);
  const [rechargeRequests, setRechargeRequests] = useState([]);
  const [snapshots, setSnapshots] = useState([]);
  const [notifications, setNotifications] = useState([]); // ADD THIS

  // Track if component is mounted to prevent state updates after unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // === Data Fetching Functions ===

  const fetchAnalytics = useCallback(async () => {
    try {
      const response = await tollAPI.getAnalytics();
      const data = response.data;

      if (isMountedRef.current) {
        setStats({
          totalEvents: data.total_events || 0,
          activeUsers: data.active_users || 0,
          totalRevenue: data.total_revenue || 0,
          pendingRequests: rechargeRequests?.filter((r) => r.status === 'pending').length || 0,
          granted: data.granted || 0,
          denied: data.denied || 0,
          totalBalance: data.total_balance || 0,
        });
        setError(null);
      }
    } catch (err) {
      console.error('❌ Error fetching analytics:', err);
      if (isMountedRef.current) {
        setError('Failed to load analytics');
      }
    }
  }, [rechargeRequests]);

  const fetchTollEvents = useCallback(async () => {
    try {
      const response = await tollAPI.getTollEvents();
      const data = response.data;

      if (isMountedRef.current) {
        setEvents(Array.isArray(data) ? data : []);
        setError(null);
      }
    } catch (err) {
      console.error('❌ Error fetching toll events:', err);
      if (isMountedRef.current) {
        setError('Failed to load toll events');
      }
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const response = await tollAPI.getUsers();
      const data = response.data;

      if (isMountedRef.current) {
        setUsers(Array.isArray(data) ? data : []);
        setError(null);
      }
    } catch (err) {
      console.error('❌ Error fetching users:', err);
      if (isMountedRef.current) {
        setError('Failed to load users');
      }
    }
  }, []);

  const fetchRechargeRequests = useCallback(async () => {
    try {
      const response = await tollAPI.getRechargeRequests();
      const data = response.data;

      if (isMountedRef.current) {
        setRechargeRequests(Array.isArray(data) ? data : []);
        setError(null);
      }
    } catch (err) {
      console.error('❌ Error fetching recharge requests:', err);
      if (isMountedRef.current) {
        setError('Failed to load recharge requests');
      }
    }
  }, []);

  const fetchSnapshots = useCallback(async () => {
    try {
      const response = await tollAPI.getSnapshots();
      const data = response.data;

      if (isMountedRef.current) {
        setSnapshots(Array.isArray(data) ? data : []);
        setError(null);
      }
    } catch (err) {
      console.error('❌ Error fetching snapshots:', err);
      if (isMountedRef.current) {
        setError('Failed to load snapshots');
      }
    }
  }, []);

  // ADD THIS NEW FUNCTION
  const fetchNotifications = useCallback(async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/notifications`);
    if (response.ok) {
      const data = await response.json();
      if (isMountedRef.current) {
        setNotifications(Array.isArray(data) ? data : []);
        setError(null);
      }
    } else {
      console.error('❌ Error fetching notifications:', response.status);
    }
  } catch (err) {
    console.error('❌ Error fetching notifications:', err);
    if (isMountedRef.current) {
      console.warn('Failed to load notifications, will retry');
    }
  }
}, []);


  // === Initial Data Load ===
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      setError(null);

      try {
        await Promise.all([
          fetchAnalytics(),
          fetchTollEvents(),
          fetchUsers(),
          fetchRechargeRequests(),
          fetchSnapshots(),
          fetchNotifications(), // ADD THIS
        ]);
      } catch (err) {
        console.error('❌ Error loading initial data:', err);
        if (isMountedRef.current) {
          setError('Failed to load dashboard data');
        }
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    };

    loadInitialData();
  }, [fetchAnalytics, fetchTollEvents, fetchUsers, fetchRechargeRequests, fetchSnapshots, fetchNotifications]);

  // === WebSocket Real-Time Updates ===
  useEffect(() => {
    if (!socket) return;

    // Handler: New toll event
    const handleTollEvent = (data) => {
      if (data.event && isMountedRef.current) {
        setEvents((prev) => [data.event, ...prev].slice(0, 100)); // Keep last 100
        fetchAnalytics();
      }
    };

    // Handler: Users updated
    const handleUsersUpdated = (data) => {
      if (isMountedRef.current) {
        if (data.users && Array.isArray(data.users)) {
          setUsers(data.users);
        } else {
          fetchUsers(); // Fallback to REST API
        }
        fetchAnalytics();
      }
    };

    // Handler: Analytics update
    const handleAnalyticsUpdate = (data) => {
      if (data.data && isMountedRef.current) {
        setStats((prev) => ({
          totalEvents: data.data.total_events ?? prev.totalEvents,
          activeUsers: data.data.active_users ?? prev.activeUsers,
          totalRevenue: data.data.total_revenue ?? prev.totalRevenue,
          pendingRequests: prev.pendingRequests, // Calculated separately
          granted: data.data.granted ?? prev.granted,
          denied: data.data.denied ?? prev.denied,
          totalBalance: data.data.total_balance ?? prev.totalBalance,
        }));
      }
    };

    // Handler: Recharge updated (approved/rejected)
    const handleRechargeUpdated = () => {
      if (isMountedRef.current) {
        fetchRechargeRequests();
        fetchUsers();
        fetchAnalytics();
      }
    };

    // Handler: New recharge request
    const handleNewRechargeRequest = (data) => {
      if (data.request && isMountedRef.current) {
        setRechargeRequests((prev) => [data.request, ...prev]);
        fetchAnalytics();
      }
    };

    // Handler: Initial events from server
    const handleInitialEvents = (data) => {
      if (data.events && Array.isArray(data.events) && isMountedRef.current) {
        setEvents(data.events);
      }
    };

// Handler: Connection response
const handleConnectionResponse = (data) => {
  // eslint-disable-next-line no-console
  console.log('✅ WebSocket connection confirmed:', data);
  if (data.analytics && isMountedRef.current) {
    handleAnalyticsUpdate({ data: data.analytics });
  }
};


    // ADD NOTIFICATION HANDLERS
    const handleNotificationDeleted = () => {
      if (isMountedRef.current) {
        fetchNotifications();
      }
    };

    const handleNotificationsBatchDeleted = () => {
      if (isMountedRef.current) {
        fetchNotifications();
      }
    };

    // Register all WebSocket event listeners
    socket.on('toll_event', handleTollEvent);
    socket.on('users_updated', handleUsersUpdated);
    socket.on('analytics_update', handleAnalyticsUpdate);
    socket.on('recharge_updated', handleRechargeUpdated);
    socket.on('recharge_approved', handleRechargeUpdated);
    socket.on('recharge_rejected', handleRechargeUpdated);
    socket.on('new_recharge_request', handleNewRechargeRequest);
    socket.on('initial_events', handleInitialEvents);
    socket.on('connection_response', handleConnectionResponse);

    // ADD THESE
    socket.on('admin_notification_deleted', handleNotificationDeleted);
    socket.on('admin_notifications_batch_deleted', handleNotificationsBatchDeleted);

    // Cleanup all listeners on unmount
    return () => {
      socket.off('toll_event', handleTollEvent);
      socket.off('users_updated', handleUsersUpdated);
      socket.off('analytics_update', handleAnalyticsUpdate);
      socket.off('recharge_updated', handleRechargeUpdated);
      socket.off('recharge_approved', handleRechargeUpdated);
      socket.off('recharge_rejected', handleRechargeUpdated);
      socket.off('new_recharge_request', handleNewRechargeRequest);
      socket.off('initial_events', handleInitialEvents);
      socket.off('connection_response', handleConnectionResponse);

      // ADD THESE
      socket.off('admin_notification_deleted', handleNotificationDeleted);
      socket.off('admin_notifications_batch_deleted', handleNotificationsBatchDeleted);
    };
  }, [socket, fetchAnalytics, fetchUsers, fetchRechargeRequests, fetchNotifications]);

  // === Manual Refresh Function ===
  const refreshData = useCallback(async () => {
    setError(null);
    try {
      await Promise.all([
        fetchAnalytics(),
        fetchTollEvents(),
        fetchUsers(),
        fetchRechargeRequests(),
        fetchSnapshots(),
        fetchNotifications(), // ADD THIS
      ]);
    } catch (err) {
      console.error('❌ Error refreshing data:', err);
      if (isMountedRef.current) {
        setError('Failed to refresh data');
      }
    }
  }, [fetchAnalytics, fetchTollEvents, fetchUsers, fetchRechargeRequests, fetchSnapshots, fetchNotifications]);

  // === Return Hook Data ===
  return {
    // Primary data
    stats,
    events,
    users,
    rechargeRequests,
    snapshots,
    notifications, // ADD THIS

    // Connection state
    isConnected,
    loading,
    error,

    // Actions
    refreshData,

    // Aliases for backward compatibility
    tollEvents: events,
    analytics: stats,
  };
};

export default useAdminData;
