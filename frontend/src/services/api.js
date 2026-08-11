import axios from 'axios';
import { io } from 'socket.io-client';
import { API_BASE_URL } from '../config';
import { SOCKET_URL } from '../config';  // <-- Import SOCKET_URL here

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: false,
});

// Request interceptor - Add auth token and logging
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Log requests in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔵 ${config.method?.toUpperCase()} ${config.url}`, config.data || '');
    }

    return config;
  },
  (error) => {
    console.error('❌ Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor - Handle auth errors and logging
axiosInstance.interceptors.response.use(
  (response) => {
    // Log successful responses in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ ${response.config.method?.toUpperCase()} ${response.config.url}`, response.data);
    }
    return response;
  },
  (error) => {
    // Handle authentication errors
    if (error.response?.status === 401) {
      console.warn('🔒 Unauthorized - clearing auth and redirecting to login');
      localStorage.removeItem('token');
      localStorage.removeItem('userData');
      localStorage.removeItem('userRole');

      // Prevent infinite redirect loop
      if (window.location.pathname !== '/' && window.location.pathname !== '/login') {
        window.location.href = '/';
      }
    }

    // Log errors with details
    console.error('❌ API Error:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      message: error.response?.data?.error || error.response?.data?.message || error.message,
    });

    return Promise.reject(error);
  }
);

// === Socket.IO Singleton ===
let socketInstance = null;

/**
 * Create Socket.IO connection with enhanced configuration
 * @returns {Socket} Socket instance
 */
export const createSocket = () => {
  if (!socketInstance) {
    socketInstance = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      autoConnect: true,
      upgrade: true,
      forceNew: false,
    });

    // Connection event listeners
    socketInstance.on('connect', () => {
      console.log('✅ Socket connected:', socketInstance.id);
    });

    socketInstance.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error.message);
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('❌ Socket disconnected:', reason);
      if (reason === 'io server disconnect') {
        // Server forcibly disconnected, try to reconnect
        socketInstance.connect();
      }
    });

    socketInstance.on('reconnect', (attemptNumber) => {
      console.log(`🔄 Socket reconnected after ${attemptNumber} attempts`);
    });

    socketInstance.on('reconnect_attempt', (attemptNumber) => {
      console.log(`🔄 Socket reconnection attempt #${attemptNumber}`);
    });

    socketInstance.on('reconnect_error', (error) => {
      console.error('❌ Socket reconnection error:', error.message);
    });

    socketInstance.on('reconnect_failed', () => {
      console.error('❌ Socket reconnection failed - maximum attempts reached');
    });
  }
  return socketInstance;
};

/**
 * Get existing Socket.IO instance or create new one
 * @returns {Socket} Socket instance
 */
export const getSocket = () => {
  if (!socketInstance || !socketInstance.connected) {
    return createSocket();
  }
  return socketInstance;
};

/**
 * Disconnect and clean up Socket.IO instance
 */
export const disconnectSocket = () => {
  if (socketInstance) {
    console.log('🔌 Disconnecting socket...');
    socketInstance.disconnect();
    socketInstance.removeAllListeners();
    socketInstance = null;
  }
};

// === REST API Service ===
export const tollAPI = {
  // ========== AUTHENTICATION ==========
  /**
   * Admin login
   * @param {string} username
   * @param {string} password
   * @returns {Promise} Axios response
   */
  adminLogin: (username, password) =>
    axiosInstance.post('/admin/login', { username, password }),

  /**
   * User login - accepts plate, RFID, or email
   * @param {string} identifier - plate number, RFID, or email
   * @param {string} password
   * @returns {Promise} Axios response
   */
  userLogin: (identifier, password) =>
    axiosInstance.post('/user/login', { identifier, password }),

  /**
   * Logout user and disconnect socket
   * @returns {Promise} Axios response
   */
  logout: async () => {
    try {
      const response = await axiosInstance.post('/logout');
      disconnectSocket();
      return response;
    } catch (error) {
      // Even if API call fails, clean up socket and localStorage
      disconnectSocket();
      localStorage.removeItem('token');
      localStorage.removeItem('userData');
      localStorage.removeItem('userRole');
      throw error;
    }
  },

  // ========== ADMIN - TOLL EVENTS ==========
  /**
   * Get all toll events
   * @returns {Promise} Axios response with toll events array
   */
  getTollEvents: () => axiosInstance.get('/toll-events'),

  // ========== ADMIN - USER MANAGEMENT ==========
  /**
   * Get all users
   * @returns {Promise} Axios response with users array
   */
  getUsers: () => axiosInstance.get('/users'),

  /**
   * Get single user by plate number
   * @param {string} plate - Vehicle plate number
   * @returns {Promise} Axios response with user object
   */
  getUserByPlate: (plate) => axiosInstance.get(`/users/${plate}`),

  /**
   * Add new user (admin only)
   * @param {Object} userData - User data object
   * @param {string} userData.plateNumber - Vehicle plate number
   * @param {string} userData.rfidUid - RFID UID
   * @param {string} userData.ownerName - Owner name
   * @param {string} userData.email - Email address
   * @param {number} userData.initialBalance - Initial balance in DA
   * @param {string} [userData.vehicleType] - Optional vehicle type
   * @returns {Promise} Axios response
   */
  addUser: (userData) => axiosInstance.post('/admin/users', userData),

  /**
   * Update existing user (admin only)
   * @param {string} plate - Vehicle plate number
   * @param {Object} userData - Updated user data
   * @returns {Promise} Axios response
   */
  updateUser: (plate, userData) => axiosInstance.put(`/admin/users/${plate}`, userData),

  /**
   * Delete user (admin only)
   * @param {string} plate - Vehicle plate number
   * @returns {Promise} Axios response
   */
  deleteUser: (plate) => axiosInstance.delete(`/admin/users/${plate}`),

  // ========== ADMIN - ANALYTICS ==========
  /**
   * Get system analytics
   * @returns {Promise} Axios response with analytics data
   */
  getAnalytics: () => axiosInstance.get('/analytics'),

  // ========== ADMIN - RECHARGE REQUESTS ==========
  /**
   * Get all recharge requests
   * @returns {Promise} Axios response with recharge requests array
   */
  getRechargeRequests: () => axiosInstance.get('/admin/recharge-requests'),

  /**
   * Approve recharge request
   * @param {number} requestId - Request ID
   * @returns {Promise} Axios response
   */
  approveRecharge: (requestId) =>
    axiosInstance.put(`/admin/recharge/${requestId}/approve`),

  /**
   * Reject recharge request
   * @param {number} requestId - Request ID
   * @param {string} reason - Rejection reason
   * @returns {Promise} Axios response
   */
  rejectRecharge: (requestId, reason) =>
    axiosInstance.put(`/admin/recharge/${requestId}/reject`, { reason }),

  // ========== ADMIN - SYSTEM SETTINGS ==========
  /**
   * Get system settings
   * @returns {Promise} Axios response with settings object
   */
  getAdminSettings: () => axiosInstance.get('/admin/settings'),

  /**
   * Update system settings
   * @param {Object} settings - Settings object
   * @returns {Promise} Axios response
   */
  updateAdminSettings: (settings) => axiosInstance.put('/admin/settings', settings),

  // ========== ADMIN - SNAPSHOTS ==========
  /**
   * Get all vehicle snapshots
   * @returns {Promise} Axios response with snapshots array
   */
  getSnapshots: () => axiosInstance.get('/snapshots'),

  // ========== USER - PROFILE ==========
  /**
   * Get user profile
   * @param {string} plate - Vehicle plate number
   * @returns {Promise} Axios response with user profile
   */
  getUserProfile: (plate) => axiosInstance.get(`/users/${plate}`),

  /**
   * Update user profile
   * @param {string} plate - Vehicle plate number
   * @param {Object} profileData - Updated profile data
   * @returns {Promise} Axios response
   */
  updateUserProfile: (plate, profileData) =>
    axiosInstance.put(`/users/${plate}`, profileData),

  // ========== USER - TRANSACTIONS ==========
  /**
   * Get user transaction history
   * @param {string} plate - Vehicle plate number
   * @returns {Promise} Axios response with transactions array
   */
  getUserTransactions: (plate) => axiosInstance.get(`/user/${plate}/transactions`),

  // ========== USER - RECHARGE ==========
  /**
   * Submit recharge request
   * @param {string} plate - Vehicle plate number
   * @param {number} amount - Amount to recharge
   * @param {string} paymentMethod - Payment method (card, cash, etc.)
   * @returns {Promise} Axios response
   */
  requestRecharge: (plate, amount, paymentMethod) =>
    axiosInstance.post(`/user/${plate}/recharge`, {
      amount,
      payment_method: paymentMethod,
    }),

  // ========== USER - NOTIFICATIONS ==========
  /**
   * Get user notifications
   * @param {string} plate - Vehicle plate number
   * @returns {Promise} Axios response with notifications array
   */
  getUserNotifications: (plate) => axiosInstance.get(`/user/${plate}/notifications`),

  /**
   * Mark single notification as read
   * @param {string} plate - Vehicle plate number
   * @param {number} notificationId - Notification ID
   * @returns {Promise} Axios response
   */
  markNotificationRead: (plate, notificationId) =>
    axiosInstance.put(`/user/${plate}/notifications/${notificationId}/read`),

  /**
   * Mark all notifications as read
   * @param {string} plate - Vehicle plate number
   * @returns {Promise} Axios response
   */
  markAllNotificationsRead: (plate) =>
    axiosInstance.put(`/user/${plate}/notifications/mark-all-read`),

  // ========== WEBSOCKET HELPERS ==========
  socket: {
    /**
     * Create and return socket connection
     * @returns {Socket} Socket instance
     */
    connect: createSocket,

    /**
     * Get existing socket or create new one
     * @returns {Socket} Socket instance
     */
    get: getSocket,

    /**
     * Disconnect and cleanup socket
     */
    disconnect: disconnectSocket,

    /**
     * Check if socket is connected
     * @returns {boolean} Connection status
     */
    isConnected: () => socketInstance?.connected || false,
  },
};

export default tollAPI;
