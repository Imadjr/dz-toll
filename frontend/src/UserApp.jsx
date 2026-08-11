import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from './contexts/AuthContext';
import { useUserData } from './hooks/useUserData';
import {
  LayoutDashboard, Receipt, Bell, Settings,
  LogOut, Menu, X, Activity, Wallet, RefreshCw, WifiOff, Wifi, TrendingUp
} from 'lucide-react';


// User components
import UserDashboard from './components/user/UserDashboard';
import TransactionHistory from './components/user/TransactionHistory';
import BalanceManager from './components/user/BalanceManager';
import Notifications from './components/user/Notifications';
import ProfileSettings from './components/user/ProfileSettings';


const VIEW_DEFAULT = 'dashboard';
const VIEWS = ['dashboard', 'transactions', 'balance', 'notifications', 'settings'];


function getInitialView() {
  const hash = (typeof window !== 'undefined' ? window.location.hash : '') || '';
  const view = hash.replace('#', '');
  return VIEWS.includes(view) ? view : VIEW_DEFAULT;
}


const UserApp = () => {
  const { user, logout } = useAuth();
  const [currentView, setCurrentView] = useState(() => getInitialView());
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Changed: default false for mobile
  const [confirmLogout, setConfirmLogout] = useState(false);
  const mainRef = useRef(null);


  const {
    balance,
    transactions,
    notifications: userNotifications,
    profile,
    stats,
    isConnected,
    loading,
    refreshData
  } = useUserData();


  // Derive counts safely
  const unread = useMemo(
    () => (Array.isArray(userNotifications) ? userNotifications.filter(notification => !notification?.is_read && !notification?.read).length : 0),
    [userNotifications]
  );
  const userDisplayName = user?.name || profile?.owner_name || 'User';
  const userEmail = user?.email || profile?.email || '';


  // Menu items
  const menuItems = useMemo(() => ([
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'transactions', label: 'Transaction History', icon: Receipt },
    { id: 'balance', label: 'Balance Manager', icon: Wallet },
    { id: 'notifications', label: 'Notifications', icon: Bell, badge: unread },
    { id: 'settings', label: 'Profile Settings', icon: Settings },
  ]), [unread]);


  // Deep-link view via hash
  useEffect(() => {
    const onHashChange = () => {
      const next = window.location.hash.replace('#', '');
      if (VIEWS.includes(next)) {
        setCurrentView(next);
      }
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);


  // Keep hash in sync when programmatically switching views
  useEffect(() => {
    if (!currentView) return;
    const targetHash = `#${currentView}`;
    if (window.location.hash !== targetHash) {
      window.location.hash = targetHash;
    }
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
        // Optional: toast
      }
    }
  };


  // Shared props passed down to user components
  const props = useMemo(() => ({
    balance: typeof balance === 'number' ? balance : 0,
    transactions: Array.isArray(transactions) ? transactions : [],
    notifications: Array.isArray(userNotifications) ? userNotifications : [],
    profile: profile || {},
    stats: stats || {},
    userData: profile || {},
    isConnected: !!isConnected,
    refreshData
  }), [balance, transactions, userNotifications, profile, stats, isConnected, refreshData]);


  const renderView = () => {
    switch (currentView) {
      case 'dashboard': return <UserDashboard {...props} />;
      case 'transactions': return <TransactionHistory {...props} />;
      case 'balance': return <BalanceManager {...props} />;
      case 'notifications': return <Notifications {...props} />;
      case 'settings': return <ProfileSettings {...props} />;
      default: return <UserDashboard {...props} />;
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-teal-50 to-emerald-50">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white shadow-lg mb-4">
            {/* DzToll Logo in Loading State */}
            <img
              src={process.env.PUBLIC_URL + '/android-chrome-192x192.png'}
              alt="DzToll Logo"
              className="w-12 h-12 object-contain"
              onError={(e) => {
                e.target.style.display = 'none';
                const fallback = e.target.nextElementSibling;
                if (fallback) fallback.style.display = 'block';
              }}
            />
            <Activity
              className="w-10 h-10 text-green-600 animate-pulse"
              style={{ display: 'none' }}
            />
          </div>
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-700 font-semibold text-lg">Loading your dashboard</p>
          <p className="text-gray-500 text-sm mt-1">Please wait...</p>
        </div>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white overflow-x-hidden">
      {/* Top Nav - MOBILE OPTIMIZED */}
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
                href="#dashboard"
                onClick={(e) => { e.preventDefault(); jumpTo('dashboard'); }}
                className="group flex items-center gap-2 sm:gap-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 rounded-lg min-w-0"
              >
                {/* Logo Image */}
                <img
                  src={process.env.PUBLIC_URL + '/android-chrome-192x192.png'}
                  alt="DzToll Logo"
                  className="w-8 h-8 sm:w-10 sm:h-10 object-contain flex-shrink-0 shadow-md rounded-lg"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    const fallback = e.target.nextElementSibling;
                    if (fallback) fallback.style.display = 'block';
                  }}
                />

                {/* Fallback icon if logo fails */}
                <div
                  className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-green-600 to-teal-600 rounded-lg flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow flex-shrink-0"
                  style={{ display: 'none' }}
                >
                  <Activity className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                </div>

                <span className="hidden sm:block">
                  <h1 className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight leading-5">DzToll</h1>
                  <p className="text-xs text-gray-500 -mt-0.5">User Dashboard</p>
                </span>
              </a>
            </div>


            {/* Center balance pill - MOBILE RESPONSIVE */}
            <div className="flex md:hidden items-center gap-1.5 px-2 py-1 rounded-full border border-green-200 bg-gradient-to-r from-green-50 to-teal-50">
              <Wallet className="w-4 h-4 text-green-700" />
              <span className="text-xs font-semibold text-green-800 tabular-nums">
                {typeof balance === 'number' ? `${balance.toFixed(0)}` : '0'} DA
              </span>
            </div>


            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full border border-green-200 bg-gradient-to-r from-green-50 to-teal-50">
              <Wallet className="w-5 h-5 text-green-700" />
              <span className="text-sm font-semibold text-green-800 tabular-nums">
                {typeof balance === 'number' ? `${balance.toFixed(2)} DA` : '0.00 DA'}
              </span>
              <button
                onClick={refreshData}
                className="ml-2 p-1.5 rounded hover:bg-green-100 transition-colors focus-visible:ring-2 focus-visible:ring-green-500"
                aria-label="Refresh data"
                title="Refresh"
              >
                <RefreshCw className="w-4 h-4 text-green-700" />
              </button>
            </div>


            {/* Right - SIMPLIFIED FOR MOBILE */}
            <div className="flex items-center gap-1 sm:gap-3">
              {/* Notifications */}
              <button
                onClick={() => jumpTo('notifications')}
                className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors focus-visible:ring-2 focus-visible:ring-green-500"
                aria-label="Open notifications"
                title="Notifications"
              >
                <Bell className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" />
                {unread > 0 && (
                  <span className="absolute top-0.5 right-0.5 min-w-[16px] h-[16px] sm:min-w-[18px] sm:h-[18px] px-1 bg-red-500 text-white text-[10px] sm:text-xs rounded-full flex items-center justify-center font-bold">
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </button>


              {/* User profile - HIDDEN ON SMALL MOBILE */}
              <div className="hidden sm:flex items-center gap-2 sm:gap-3 pl-2 sm:pl-3 border-l border-gray-200">
                <div className="hidden md:block text-right leading-tight">
                  <p className="text-sm font-medium text-gray-900 truncate max-w-[120px]">{userDisplayName}</p>
                  <p className="text-xs text-gray-500 truncate max-w-[120px]">{userEmail || '—'}</p>
                </div>
                <div
                  className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-green-500 to-teal-500 rounded-full flex items-center justify-center text-white font-bold shadow-md select-none"
                  aria-label={`Account avatar for ${userDisplayName}`}
                >
                  {(userDisplayName?.charAt(0) || 'U').toUpperCase()}
                </div>
              </div>


              {/* Logout */}
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


      {/* Clean Sidebar - MOBILE OPTIMIZED */}
      <aside
        className={`fixed top-14 sm:top-16 left-0 bottom-0 w-64 sm:w-72 bg-white border-r border-gray-200 transition-transform duration-300 ease-in-out z-20 shadow-xl lg:shadow-lg ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Sidebar"
      >
        <div className="p-3 sm:p-4 space-y-3 overflow-y-auto h-full">
          {/* Balance card - Enhanced & Mobile Responsive */}
          <div className="p-3 sm:p-4 bg-gradient-to-br from-green-500 to-teal-600 rounded-xl shadow-lg text-white">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 sm:w-5 sm:h-5" />
                <p className="text-xs sm:text-sm font-medium opacity-90">Current Balance</p>
              </div>
              {typeof balance === 'number' && balance < 100 && (
                <span className="text-[10px] sm:text-xs bg-orange-500 px-1.5 sm:px-2 py-0.5 rounded-full font-bold">Low</span>
              )}
            </div>
            <p className="text-2xl sm:text-3xl font-bold mb-1 tabular-nums">
              {typeof balance === 'number' ? `${balance.toFixed(2)} DA` : '0.00 DA'}
            </p>
            <div className="flex items-center gap-1 text-[10px] sm:text-xs opacity-75 mb-2 sm:mb-3">
              <TrendingUp className="w-3 h-3" />
              <span>Updated just now</span>
            </div>
            <button
              onClick={() => jumpTo('balance')}
              className="w-full py-2 sm:py-2.5 bg-white text-green-700 text-xs sm:text-sm font-semibold rounded-lg hover:bg-green-50 transition-all shadow-md hover:shadow-lg"
            >
              Recharge Now
            </button>
          </div>


          {/* Menu items - Enhanced & Mobile Responsive */}
          <nav className="space-y-1.5">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => jumpTo(item.id)}
                  className={`w-full flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3.5 rounded-xl transition-all duration-200 group ${
                    isActive
                      ? 'bg-gradient-to-r from-green-500 to-teal-500 text-white font-semibold shadow-lg scale-[1.02]'
                      : 'text-gray-700 hover:bg-gray-100 hover:scale-[1.01]'
                  } focus-visible:ring-2 focus-visible:ring-green-500`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <div className="flex items-center gap-2 sm:gap-3">
                    <span className={`p-1.5 sm:p-2 rounded-lg transition-all ${isActive ? 'bg-white/20' : 'bg-gray-100 group-hover:bg-white group-hover:shadow-md'}`}>
                      <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                    </span>
                    <span className="text-sm sm:text-base">{item.label}</span>
                  </div>
                  {(item.badge || 0) > 0 && (
                    <span className="px-1.5 sm:px-2 py-0.5 bg-red-500 text-white text-[10px] sm:text-xs font-bold rounded-full min-w-[18px] text-center shadow-md">
                      {item.badge > 9 ? '9+' : item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
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
          {/* Offline banner - MOBILE RESPONSIVE */}
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
          className="p-3 rounded-full shadow-lg bg-white border border-gray-200 hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-green-500 transition-all"
          aria-label="Refresh data"
          title="Refresh"
        >
          <RefreshCw className="w-5 h-5 text-gray-700" />
        </button>
        <button
          onClick={onReconnect}
          className="p-3 rounded-full shadow-lg bg-white border border-gray-200 hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-green-500 transition-all"
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
            <p className="text-xs sm:text-sm text-gray-600 mb-5 sm:mb-6">Are you sure you want to log out of your account?</p>
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


export default UserApp;
