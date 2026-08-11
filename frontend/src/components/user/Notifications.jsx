import React, { useState, useMemo } from 'react';
import {
  Bell, CheckCircle, AlertTriangle, Info, AlertCircle,
  Clock, Trash2, Check, Filter, Search, MoreVertical,
  Star, StarOff, Eye, Calendar, RefreshCw, Sparkles
} from 'lucide-react';
import { API_BASE_URL } from '../../config';

const Notifications = ({ notifications = [], isConnected, refreshData, userData }) => {
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNotifications, setSelectedNotifications] = useState([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const notificationsArray = useMemo(() => (Array.isArray(notifications) ? notifications : []), [notifications]);

  const filteredNotifications = useMemo(() => {
    let filtered = [...notificationsArray];

    if (filter === 'unread') {
      filtered = filtered.filter(n => !n.read && !n.is_read);
    } else if (filter === 'read') {
      filtered = filtered.filter(n => n.read || n.is_read);
    } else if (filter === 'important') {
      filtered = filtered.filter(n => n.important);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(n =>
        (n.title || '').toLowerCase().includes(q) ||
        (n.message || '').toLowerCase().includes(q)
      );
    }

    return filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }, [notificationsArray, filter, searchQuery]);

  const stats = useMemo(() => ({
    total: notificationsArray.length,
    unread: notificationsArray.filter(n => !n.read && !n.is_read).length,
    important: notificationsArray.filter(n => n.important).length,
    today: notificationsArray.filter(n => {
      const notifDate = new Date(n.created_at).toDateString();
      return notifDate === new Date().toDateString();
    }).length
  }), [notificationsArray]);

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-6 h-6 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="w-6 h-6 text-orange-600" />;
      case 'error':
        return <AlertCircle className="w-6 h-6 text-red-600" />;
      case 'info':
      default:
        return <Info className="w-6 h-6 text-blue-600" />;
    }
  };

  // Check if user is admin
  const isAdmin = userData?.role === 'admin' || userData?.username === 'admin';

  const handleMarkAsRead = async (id) => {
    try {
      const endpoint = isAdmin
        ? `${API_BASE_URL}/admin/notifications/${id}/read`
        : `${API_BASE_URL}/user/${userData?.plate}/notifications/${id}/read`;

      const response = await fetch(endpoint, {
        method: 'PUT'
      });

      if (response.ok && typeof refreshData === 'function') {
        refreshData();
      }
    } catch (error) {
      console.error('Mark as read error:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const endpoint = isAdmin
        ? `${API_BASE_URL}/admin/notifications/mark-all-read`
        : `${API_BASE_URL}/user/${userData?.plate}/notifications/mark-all-read`;

      const response = await fetch(endpoint, {
        method: 'PUT'
      });

      if (response.ok) {
        if (typeof refreshData === 'function') refreshData();
      }
    } catch (error) {
      console.error('Mark all as read error:', error);
    }
  };

  const handleToggleImportant = async (id) => {
    try {
      const endpoint = isAdmin
        ? `${API_BASE_URL}/admin/notifications/${id}/important`
        : `${API_BASE_URL}/user/${userData?.plate}/notifications/${id}/important`;

      const response = await fetch(endpoint, {
        method: 'PUT'
      });

      if (response.ok && typeof refreshData === 'function') {
        refreshData();
      }
    } catch (error) {
      console.error('Toggle important error:', error);
    }
  };

  const handleDelete = async (id) => {
    try {
      const endpoint = isAdmin
        ? `${API_BASE_URL}/admin/notifications/${id}`
        : `${API_BASE_URL}/user/${userData?.plate}/notifications/${id}`;

      const response = await fetch(endpoint, {
        method: 'DELETE'
      });

      if (response.ok) {
        if (typeof refreshData === 'function') {
          refreshData();
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Delete failed:', errorData);
      }
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  const handleDeleteSelected = () => {
    if (selectedNotifications.length === 0) {
      alert('⚠️ No notifications selected');
      return;
    }
    setShowDeleteConfirm(true);
  };

 const confirmDelete = async () => {
  try {
    const endpoint = isAdmin
      ? `${API_BASE_URL}/admin/notifications/batch-delete`
      : `${API_BASE_URL}/user/${userData?.plate}/notifications/batch-delete`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        notification_ids: selectedNotifications
      })
    });

    if (response.ok) {
      // No need to store result if not used
      await response.json(); // ✅ FIXED
      setSelectedNotifications([]);
      setShowDeleteConfirm(false);
      if (typeof refreshData === 'function') refreshData();
    } else {
      const errorData = await response.json().catch(() => ({}));
      console.error('Batch delete failed:', errorData);
    }
  } catch (error) {
    console.error('Batch delete error:', error);
  }
};


  const handleSelectAll = () => {
    if (selectedNotifications.length === filteredNotifications.length) {
      setSelectedNotifications([]);
    } else {
      setSelectedNotifications(filteredNotifications.map(n => n.id));
    }
  };

  const handleSelectNotification = (id) => {
    setSelectedNotifications(prev =>
      prev.includes(id) ? prev.filter(nId => nId !== id) : [...prev, id]
    );
  };

  const getTimeAgo = (timestamp) => {
    const now = new Date();
    const notifDate = new Date(timestamp);
    const seconds = Math.floor((now - notifDate) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return notifDate.toLocaleDateString();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Enhanced Header with Gradient */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-2xl shadow-2xl p-8 text-white relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden opacity-20">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl -mr-48 -mt-48 animate-pulse" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-white rounded-full blur-3xl -ml-32 -mb-32 animate-pulse delay-700" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex-1 flex items-center">
            <div className="p-4 bg-white/20 backdrop-blur-sm rounded-2xl mr-4 shadow-lg">
              <Bell className="w-10 h-10 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl md:text-4xl font-bold">Notifications</h1>
                <Sparkles className="w-6 h-6 text-yellow-300 animate-pulse" />
              </div>
              <p className="text-indigo-100 text-lg">Stay updated with your toll account activity</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isConnected !== undefined && (
              <div className={`flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-sm shadow-lg border-2 ${
                isConnected ? 'bg-green-500/30 border-green-300' : 'bg-red-500/30 border-red-300'
              }`}>
                <div className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-green-200' : 'bg-red-200'} animate-pulse`}></div>
                <span className="text-sm font-bold">{isConnected ? 'Live' : 'Offline'}</span>
              </div>
            )}
            {typeof refreshData === 'function' && (
              <button
                onClick={refreshData}
                className="p-3 bg-white/20 hover:bg-white/30 rounded-xl transition-all border-2 border-white/30 backdrop-blur-sm hover:scale-105 shadow-lg"
                title="Refresh"
              >
                <RefreshCw className="w-6 h-6" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Enhanced Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Total" value={stats.total} icon={<Bell />} gradient="from-blue-500 to-cyan-600" />
        <StatCard label="Unread" value={stats.unread} icon={<AlertCircle />} gradient="from-orange-500 to-amber-600" />
        <StatCard label="Important" value={stats.important} icon={<Star />} gradient="from-yellow-500 to-orange-600" />
        <StatCard label="Today" value={stats.today} icon={<Calendar />} gradient="from-green-500 to-emerald-600" />
      </div>

      {/* Enhanced Toolbar */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-gray-100 hover:shadow-xl transition-all">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <div className="w-full sm:flex-1 sm:max-w-md">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-indigo-600 transition-colors" />
              <input
                type="text"
                placeholder="Search notifications..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {selectedNotifications.length > 0 && (
              <button
                onClick={handleDeleteSelected}
                className="flex items-center gap-2 px-5 py-3 text-red-600 bg-red-50 rounded-xl hover:bg-red-100 transition-all font-bold hover:scale-105 shadow-md"
              >
                <Trash2 className="w-5 h-5" />
                <span>Delete ({selectedNotifications.length})</span>
              </button>
            )}
            <button
              onClick={handleMarkAllAsRead}
              className="flex items-center gap-2 px-5 py-3 text-indigo-600 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-all font-bold hover:scale-105 shadow-md"
            >
              <Check className="w-5 h-5" />
              Mark All Read
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3 overflow-x-auto">
          <Filter className="w-5 h-5 text-gray-400 flex-shrink-0" />
          <div className="flex gap-2">
            {['all', 'unread', 'read', 'important'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-5 py-2.5 rounded-xl font-bold transition-all capitalize whitespace-nowrap ${
                  filter === f
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-xl scale-105'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:scale-105'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Enhanced Notifications List */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden border-2 border-gray-100 hover:shadow-xl transition-all">
        {filteredNotifications.length === 0 ? (
          <div className="p-16 text-center">
            <Bell className="w-20 h-20 text-gray-300 mx-auto mb-4 animate-pulse" />
            <p className="text-gray-600 text-xl font-bold mb-2">No notifications found</p>
            <p className="text-gray-400 text-lg">
              {notificationsArray.length === 0
                ? "You're all caught up!"
                : 'Try adjusting your filters'
              }
            </p>
          </div>
        ) : (
          <div>
            <div className="p-5 border-b-2 border-gray-200 bg-gradient-to-r from-gray-100 to-indigo-50 flex items-center gap-4">
              <input
                type="checkbox"
                checked={selectedNotifications.length === filteredNotifications.length && filteredNotifications.length > 0}
                onChange={handleSelectAll}
                className="w-5 h-5 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500"
              />
              <span className="text-sm text-gray-700 font-bold">
                {selectedNotifications.length > 0
                  ? `${selectedNotifications.length} selected`
                  : 'Select all'}
              </span>
            </div>

            <div className="divide-y divide-gray-200">
              {filteredNotifications.map((notification) => {
                const isRead = notification.read || notification.is_read;
                return (
                  <div
                    key={notification.id}
                    className={`p-5 transition-all ${
                      !isRead ? 'bg-blue-50' : 'bg-white'
                    } ${selectedNotifications.includes(notification.id) ? 'bg-indigo-50 scale-102' : ''} hover:bg-gray-50`}
                  >
                    <div className="flex items-start gap-4">
                      <input
                        type="checkbox"
                        checked={selectedNotifications.includes(notification.id)}
                        onChange={() => handleSelectNotification(notification.id)}
                        className="mt-1 w-5 h-5 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500 flex-shrink-0"
                      />

                      <div className="flex-shrink-0 mt-1">
                        {getNotificationIcon(notification.type)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <h3 className={`font-bold text-lg ${
                                !isRead ? 'text-gray-900' : 'text-gray-700'
                              }`}>
                                {notification.title}
                              </h3>
                              {!isRead && (
                                <span className="w-2.5 h-2.5 bg-blue-600 rounded-full flex-shrink-0 animate-pulse"></span>
                              )}
                              {notification.important && (
                                <Star className="w-5 h-5 text-yellow-500 fill-yellow-500 flex-shrink-0" />
                              )}
                            </div>
                            <p className="text-sm text-gray-600 line-clamp-2 break-words font-medium">
                              {notification.message}
                            </p>
                          </div>

                          <div className="flex items-center gap-3 flex-shrink-0">
                            <span className="text-xs text-gray-500 whitespace-nowrap flex items-center gap-1 font-medium">
                              <Clock className="w-3 h-3" />
                              {getTimeAgo(notification.created_at)}
                            </span>
                            <div className="relative group">
                              <button className="p-2 hover:bg-gray-200 rounded-lg transition-colors" title="More actions">
                                <MoreVertical className="w-5 h-5 text-gray-400" />
                              </button>
                              <div className="absolute right-0 mt-2 w-56 bg-white border-2 border-gray-200 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                                {!isRead && (
                                  <button
                                    onClick={() => handleMarkAsRead(notification.id)}
                                    className="w-full px-5 py-3 text-left text-sm hover:bg-gray-50 flex items-center gap-3 font-medium rounded-t-xl"
                                  >
                                    <Eye className="w-4 h-4" />
                                    Mark as read
                                  </button>
                                )}
                                <button
                                  onClick={() => handleToggleImportant(notification.id)}
                                  className="w-full px-5 py-3 text-left text-sm hover:bg-gray-50 flex items-center gap-3 font-medium"
                                >
                                  {notification.important ? (
                                    <>
                                      <StarOff className="w-4 h-4" />
                                      Unmark important
                                    </>
                                  ) : (
                                    <>
                                      <Star className="w-4 h-4" />
                                      Mark important
                                    </>
                                  )}
                                </button>
                                <button
                                  onClick={() => handleDelete(notification.id)}
                                  className="w-full px-5 py-3 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 font-medium rounded-b-xl"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  Delete
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>

                        {notification.category && (
                          <span className="inline-block px-3 py-1.5 text-xs bg-gray-100 text-gray-600 rounded-lg mt-2 font-bold">
                            {notification.category}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Enhanced Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-md animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl animate-scale-in">
            <div className="p-8">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-4 bg-red-100 rounded-2xl">
                  <AlertTriangle className="w-8 h-8 text-red-600" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-1">Delete Notifications</h3>
                  <p className="text-gray-600 font-medium">Are you sure you want to delete {selectedNotifications.length} notification(s)?</p>
                </div>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-6 py-3 border-2 border-gray-300 rounded-xl hover:bg-gray-50 transition-all font-bold hover:scale-105"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-xl hover:from-red-700 hover:to-rose-700 transition-all font-bold shadow-xl hover:scale-105 active:scale-95"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper Component
const StatCard = ({ label, value, icon, gradient }) => {
  return (
    <div className={`bg-gradient-to-br ${gradient} rounded-2xl shadow-2xl p-6 text-white relative overflow-hidden hover:scale-105 transition-transform duration-300 group`}>
      <div className="absolute inset-0 overflow-hidden opacity-20">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white rounded-full blur-3xl -mr-20 -mt-20 group-hover:opacity-30 transition-opacity" />
      </div>

      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm opacity-90 font-semibold uppercase tracking-wide">{label}</h3>
          <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl shadow-lg group-hover:scale-110 transition-transform">
            {React.cloneElement(icon, { className: 'w-7 h-7' })}
          </div>
        </div>
        <p className="text-5xl font-bold tabular-nums">{value}</p>
      </div>
    </div>
  );
};

export default Notifications;
