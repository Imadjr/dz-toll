import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from './contexts/AuthContext';
import { useAdminData } from './hooks/useAdminData';
import {
  LayoutDashboard, Users, Activity, Camera, FileText,
  Settings, LogOut, Bell, Menu, X, BarChart3, RefreshCw, WifiOff, Wifi, Wallet
} from 'lucide-react';



// Admin components
import AdminOverview from './components/admin/AdminOverview';
import Analytics from './components/admin/Analytics';
import TollEvents from './components/admin/TollEvents';
import UserManagement from './components/admin/UserManagement';
import Snapshots from './components/admin/Snapshots';
import Reports from './components/admin/Reports';
import RechargeRequests from './components/admin/RechargeRequests';
import SystemSettings from './components/admin/SystemSettings';
import Notifications from './components/user/Notifications';


const VIEW_DEFAULT = 'overview';
const VIEWS = ['overview', 'analytics', 'events', 'users', 'snapshots', 'reports', 'recharge', 'settings', 'notifications'];


function getInitialView() {
  const hash = (typeof window !== 'undefined' ? window.location.hash : '') || '';
  const view = hash.replace('#', '');
  return VIEWS.includes(view) ? view : VIEW_DEFAULT;
}


const AdminApp = () => {
  const { user, logout } = useAuth();
  const [currentView, setCurrentView] = useState(() => getInitialView());
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Changed: default false for mobile
  const [confirmLogout, setConfirmLogout] = useState(false);
  const mainRef = useRef(null);


  const {
    stats,
    events,
    users,
    rechargeRequests,
    notifications,
    isConnected,
    refreshData
  } = useAdminData();


  // Calculate unread notifications count
  const unreadCount = useMemo(() => {
    const notifArray = Array.isArray(notifications) ? notifications : [];
    return notifArray.filter(n => !n.read && !n.is_read).length;
  }, [notifications]);


  const menuItems = useMemo(() => ([
    { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'events', label: 'Live Events', icon: Activity },
    { id: 'users', label: 'User Management', icon: Users },
    { id: 'snapshots', label: 'Snapshots', icon: Camera },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'recharge', label: 'Recharge Requests', icon: Wallet },
    { id: 'settings', label: 'System Settings', icon: Settings },
  ]), []);


  // Deep-link: sync hash -> view
  useEffect(() => {
    const onHashChange = () => {
      const next = window.location.hash.replace('#', '');
      if (VIEWS.includes(next)) setCurrentView(next);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);


  // Deep-link: sync view -> hash
  useEffect(() => {
    const target = `#${currentView}`;
    if (window.location.hash !== target) window.location.hash = target;
  }, [currentView]);


  // NEW: Handle window resize - open sidebar on desktop, close on mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsSidebarOpen(true);
      } else {
        setIsSidebarOpen(false);
      }
    };

    // Set initial state
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);


  const jumpTo = useCallback((view) => {
    if (!VIEWS.includes(view)) view = VIEW_DEFAULT;
    setCurrentView(view);
    if (window.innerWidth < 1024) setIsSidebarOpen(false);
    setTimeout(() => mainRef.current?.focus(), 50);
  }, []);


  const onReconnect = async () => {
    if (typeof refreshData === 'function') {
      try {
        await refreshData();
      } catch {
        // optional toast
      }
    }
  };


  const props = useMemo(() => ({
    stats: stats || {},
    events: Array.isArray(events) ? events : [],
    users: Array.isArray(users) ? users : [],
    rechargeRequests: Array.isArray(rechargeRequests) ? rechargeRequests : [],
    notifications: Array.isArray(notifications) ? notifications : [],
    refreshData,
    isConnected: !!isConnected,
    userData: { ...user, role: 'admin', username: user?.name || 'admin' }
  }), [stats, events, users, rechargeRequests, notifications, refreshData, isConnected, user]);


  const renderView = () => {
    switch (currentView) {
      case 'overview': return <AdminOverview {...props} />;
      case 'analytics': return <Analytics {...props} />;
      case 'events': return <TollEvents {...props} />;
      case 'users': return <UserManagement {...props} />;
      case 'snapshots': return <Snapshots {...props} />;
      case 'reports': return <Reports {...props} />;
      case 'recharge': return <RechargeRequests {...props} />;
      case 'settings': return <SystemSettings {...props} />;
      case 'notifications': return <Notifications {...props} />;
      default: return <AdminOverview {...props} />;
    }
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white overflow-x-hidden">
      {/* Top Nav - FIXED HEIGHT AND MOBILE OPTIMIZED */}
      <nav className="fixed top-0 left-0 right-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur-sm">
        <div className="px-3 sm:px-4 lg:px-6">
          <div className="flex justify-between items-center h-14 sm:h-16">
            {/* Left */}
            <div className="flex items-center gap-2 sm:gap-4 min-w-0">
              {/* Mobile Hamburger */}
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0"
                aria-label="Toggle sidebar"
                aria-expanded={isSidebarOpen}
              >
                {isSidebarOpen ? <X className="w-5 h-5 sm:w-6 sm:h-6" /> : <Menu className="w-5 h-5 sm:w-6 sm:h-6" />}
              </button>


              {/* DzToll Logo + Name - UPDATED */}
              <a
                href="#overview"
                onClick={(e) => { e.preventDefault(); jumpTo('overview'); }}
                className="group flex items-center gap-2 sm:gap-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-lg min-w-0"
              >
                {/* Logo Image */}
                <img
                  src={process.env.PUBLIC_URL + '/android-chrome-192x192.png'}
                  alt="DzToll Logo"
                  className="w-8 h-8 sm:w-10 sm:h-10 object-contain flex-shrink-0 shadow-md rounded-lg"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />

                {/* Fallback icon if image fails */}
                <div
                  className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow flex-shrink-0"
                  style={{ display: 'none' }}
                  id="logo-fallback"
                >
                  <Activity className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                </div>

                <span className="hidden sm:block">
                  <h1 className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight leading-5">DzToll</h1>
                  <p className="text-xs text-gray-500 -mt-0.5">Admin Dashboard</p>
                </span>
              </a>
            </div>


            {/* Right - SIMPLIFIED FOR MOBILE */}
            <div className="flex items-center gap-1 sm:gap-3">
              <button
                onClick={() => jumpTo('notifications')}
                className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors focus-visible:ring-2 focus-visible:ring-indigo-500"
                aria-label="Notifications"
                title="Notifications"
              >
                <Bell className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" />
                {unreadCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] sm:text-xs rounded-full flex items-center justify-center font-bold shadow-md">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>


              <div className="hidden sm:flex items-center gap-3 pl-3 border-l border-gray-200">
                <div className="hidden md:block text-right">
                  <p className="text-sm font-medium text-gray-900">{user?.name || 'Admin'}</p>
                  <p className="text-xs text-gray-500">Administrator</p>
                </div>
                <div
                  className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold shadow-md select-none"
                  aria-label={`Account avatar for ${user?.name || 'Admin'}`}
                >
                  {(user?.name?.charAt(0) || 'A').toUpperCase()}
                </div>
              </div>


              <button
                onClick={() => setConfirmLogout(true)}
                className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium focus-visible:ring-2 focus-visible:ring-red-500"
                title="Logout"
              >
                <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline text-sm">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </nav>


      {/* Sidebar - MOBILE OPTIMIZED */}
      <aside
        className={`fixed top-14 sm:top-16 left-0 bottom-0 w-64 sm:w-72 bg-white border-r border-gray-200 transition-transform duration-300 ease-in-out z-20 shadow-xl lg:shadow-lg ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Sidebar"
      >
        <div className="p-3 sm:p-4 space-y-1 overflow-y-auto h-full">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => jumpTo(item.id)}
                className={`w-full flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3.5 rounded-xl transition-all duration-200 text-left group ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold shadow-lg scale-[1.02]'
                    : 'text-gray-700 hover:bg-gray-100 hover:scale-[1.01]'
                } focus-visible:ring-2 focus-visible:ring-indigo-500`}
                aria-current={isActive ? 'page' : undefined}
              >
                <span className={`p-2 sm:p-2.5 rounded-lg transition-all ${isActive ? 'bg-white/20' : 'bg-gray-100 group-hover:bg-white group-hover:shadow-md'}`}>
                  <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${isActive ? 'text-white' : 'text-gray-700'}`} />
                </span>
                <span className="flex-1 min-w-0 truncate text-sm sm:text-base">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </aside>


      {/* Overlay for mobile - FIXED Z-INDEX */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-10 lg:hidden backdrop-blur-sm transition-opacity duration-300"
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden="true"
        />
      )}


      {/* Main Content - MOBILE OPTIMIZED PADDING */}
      <main
        ref={mainRef}
        tabIndex={-1}
        className={`pt-14 sm:pt-16 outline-none transition-all duration-300 ease-in-out ${isSidebarOpen ? 'lg:pl-72' : 'lg:pl-0'}`}
        aria-live="polite"
      >
        <div className="p-3 sm:p-4 md:p-6 lg:p-8 max-w-full overflow-x-hidden">
          {!isConnected && (
            <div className="mb-4 p-3 sm:p-4 rounded-xl border-2 border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 text-amber-900 text-xs sm:text-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0 shadow-sm">
              <div className="flex items-center gap-2 sm:gap-3">
                <WifiOff className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                <span className="font-medium">Connection offline. Data may not be current.</span>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={refreshData}
                  className="flex-1 sm:flex-none px-3 py-1.5 rounded-lg bg-white hover:bg-amber-100 border border-amber-200 transition-colors font-medium text-xs sm:text-sm"
                >
                  Refresh
                </button>
                <button
                  onClick={onReconnect}
                  className="flex-1 sm:flex-none px-3 py-1.5 rounded-lg bg-white hover:bg-amber-100 border border-amber-200 transition-colors font-medium text-xs sm:text-sm"
                >
                  Reconnect
                </button>
              </div>
            </div>
          )}
          {renderView()}
        </div>
      </main>


      {/* Mobile floating actions - IMPROVED */}
      <div className="fixed bottom-4 right-4 flex flex-col gap-2 z-30 lg:hidden">
        <button
          onClick={refreshData}
          className="p-3 rounded-full shadow-lg bg-white border border-gray-200 hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-indigo-500 transition-all"
          aria-label="Refresh data"
          title="Refresh"
        >
          <RefreshCw className="w-5 h-5 text-gray-700" />
        </button>
        <button
          onClick={onReconnect}
          className="p-3 rounded-full shadow-lg bg-white border border-gray-200 hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-indigo-500 transition-all"
          aria-label="Reconnect"
          title="Reconnect"
        >
          {isConnected ? <Wifi className="w-5 h-5 text-green-600" /> : <WifiOff className="w-5 h-5 text-red-600" />}
        </button>
      </div>


      {/* Logout confirmation modal - MOBILE OPTIMIZED */}
      {confirmLogout && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5 sm:p-6 animate-scale-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 sm:p-3 bg-red-100 rounded-full">
                <LogOut className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-900">Confirm Logout</h3>
            </div>
            <p className="text-xs sm:text-sm text-gray-600 mb-5 sm:mb-6">Are you sure you want to log out of the admin dashboard?</p>
            <div className="flex items-center justify-end gap-2 sm:gap-3">
              <button
                onClick={() => setConfirmLogout(false)}
                className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg border-2 border-gray-300 hover:bg-gray-50 text-xs sm:text-sm font-semibold focus-visible:ring-2 focus-visible:ring-gray-300 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={logout}
                className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg bg-red-600 text-white hover:bg-red-700 text-xs sm:text-sm font-semibold focus-visible:ring-2 focus-visible:ring-red-500 shadow-md transition-all flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


export default AdminApp;
