// config.js

// Base API URL dynamically loaded from environment variables, with fallback default
export const API_BASE_URL =
  process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Socket URL dynamically loaded from environment variables, with fallback default
export const SOCKET_URL =
  process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

export const ADMIN_USERNAME =
  process.env.REACT_APP_ADMIN_USERNAME || 'admin';

export const SNAPSHOT_BASE_URL =
  process.env.REACT_APP_SNAPSHOT_BASE_URL ||
  `${SOCKET_URL.replace(/\/$/, '')}/snapshots`;
