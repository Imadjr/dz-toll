import React, { useMemo } from 'react';
import {
  Users, Activity,
  CheckCircle, XCircle, AlertTriangle, Clock,
  Camera, MapPin, ArrowUpRight,
  CreditCard, Zap, TrendingUp, RefreshCw, Wallet,
  Sparkles, Server, Database, Wifi
} from 'lucide-react';

// Simple safe number formatter (no symbol)
const fmt = (v, digits = 0) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return (0).toFixed(digits);
  return n.toFixed(digits);
};

const AdminOverview = ({ stats = {}, events = [], users = [], isConnected, refreshData }) => {
  // Calculate comprehensive statistics from props
  const calculatedStats = useMemo(() => {
    const eventsArray = Array.isArray(events) ? events : [];
    const usersArray = Array.isArray(users) ? users : [];

    const granted = eventsArray.filter(e => e.Status === 'GRANTED');
    const denied = eventsArray.filter(e => e.Status === 'DENIED');

    const totalRevenue = granted.reduce((sum, e) => sum + (Number(e.Fee_DA) || 0), 0);
    const todayRevenue = granted
      .filter(e => {
        const eventDate = new Date(e.Timestamp).toDateString();
        return eventDate === new Date().toDateString();
      })
      .reduce((sum, e) => sum + (Number(e.Fee_DA) || 0), 0);

    const activeUsers = usersArray.filter(u => u.is_active || u.active).length;
    const lowBalanceUsers = usersArray.filter(u => (Number(u.balance_da ?? u.balance ?? 0)) < 100).length;

    const successRate = eventsArray.length > 0
      ? ((granted.length / eventsArray.length) * 100)
      : 0;

    // Recent activity (last 10 events)
    const recentEvents = [...eventsArray].slice(0, 10);

    // Location stats
    const locationStats = {};
    eventsArray.forEach(e => {
      const loc = e.Location || 'Unknown';
      locationStats[loc] = (locationStats[loc] || 0) + 1;
    });

    const topLocation = Object.entries(locationStats).sort((a, b) => b[1] - a[1])[0];

    // Average transaction value
    const avgTransaction = granted.length > 0 ? (totalRevenue / granted.length) : 0;

    return {
      totalEvents: eventsArray.length,
      granted: granted.length,
      denied: denied.length,
      totalRevenue,
      todayRevenue,
      totalUsers: usersArray.length,
      activeUsers,
      lowBalanceUsers,
      successRate,
      recentEvents,
      topLocation: topLocation ? topLocation[0] : 'N/A',
      topLocationCount: topLocation ? topLocation[1] : 0,
      avgTransaction,
      locationStats: Object.entries(locationStats).sort((a, b) => b[1] - a[1]).slice(0, 3)
    };
  }, [events, users]);

  // Use provided stats or calculated stats as fallback
  const displayStats = {
    ...calculatedStats,
    ...stats
  };

  // Mock growth percentages
  const growth = {
    revenue: 12.5,
    transactions: 8.3,
    users: 5.2,
    successRate: 2.1
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Enhanced Welcome Header */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-2xl shadow-2xl p-8 text-white relative overflow-hidden">
        {/* Animated background orbs */}
        <div className="absolute inset-0 overflow-hidden opacity-20">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl -mr-48 -mt-48 animate-pulse" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-white rounded-full blur-3xl -ml-32 -mb-32 animate-pulse delay-700" />
          <div className="absolute top-1/2 left-1/2 w-80 h-80 bg-pink-300 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 animate-pulse delay-1000" />
        </div>

        <div className="relative flex items-center justify-between flex-wrap gap-6">
          <div className="flex-1 min-w-[300px]">
            <div className="flex items-center gap-3 mb-3">
              <Sparkles className="w-8 h-8 text-yellow-300 animate-pulse" />
              <h1 className="text-4xl md:text-5xl font-bold">Admin Dashboard</h1>
            </div>
            <p className="text-indigo-100 text-lg flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5" />
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
            <div className="flex items-center gap-3 flex-wrap">
              <div className={`flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-sm transition-all ${
                isConnected
                  ? 'bg-green-500/30 border-2 border-green-300 shadow-lg shadow-green-500/50'
                  : 'bg-red-500/30 border-2 border-red-300 shadow-lg shadow-red-500/50'
              }`}>
                <div className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-green-300' : 'bg-red-300'} animate-pulse`} />
                <span className="text-sm font-bold">{isConnected ? 'System Online' : 'System Offline'}</span>
              </div>
              <button
                onClick={refreshData}
                className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-full transition-all border-2 border-white/30 backdrop-blur-sm hover:scale-105 active:scale-95 shadow-lg"
              >
                <RefreshCw className="w-4 h-4" />
                <span className="text-sm font-semibold">Refresh</span>
              </button>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-yellow-300 rounded-full blur-xl opacity-50 animate-pulse" />
              <Zap className="relative w-20 h-20 text-yellow-300" />
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Main KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Revenue Card */}
        <div className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-2xl transition-all duration-300 border-2 border-gray-100 hover:border-indigo-200 hover:scale-[1.02] group">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <p className="text-sm font-bold text-gray-600">Total Revenue</p>
                <Sparkles className="w-4 h-4 text-indigo-500" />
              </div>
              <h3 className="text-4xl font-bold text-gray-900 mb-3 tabular-nums">
                {fmt(displayStats.totalRevenue, 0)} <span className="text-xl text-gray-500">DA</span>
              </h3>
              <div className="flex items-center text-sm">
                <div className="flex items-center gap-1 px-2 py-1 bg-green-100 rounded-full">
                  <ArrowUpRight className="w-3 h-3 text-green-600" />
                  <span className="text-green-700 font-bold">{growth.revenue}%</span>
                </div>
                <span className="text-gray-500 ml-2">vs last month</span>
              </div>
            </div>
            <div className="p-4 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-xl group-hover:scale-110 transition-transform">
              <Wallet className="w-8 h-8 text-white" />
            </div>
          </div>
          <div className="pt-4 border-t-2 border-gray-100">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-600 font-medium">Today's Revenue</p>
              <span className="font-bold text-indigo-600 text-sm">{fmt(displayStats.todayRevenue, 0)} DA</span>
            </div>
          </div>
        </div>

        {/* Total Transactions Card */}
        <div className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-2xl transition-all duration-300 border-2 border-gray-100 hover:border-blue-200 hover:scale-[1.02] group">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <p className="text-sm font-bold text-gray-600">Total Transactions</p>
                <Activity className="w-4 h-4 text-blue-500 animate-pulse" />
              </div>
              <h3 className="text-4xl font-bold text-gray-900 mb-3 tabular-nums">
                {Number(displayStats.totalEvents || 0).toLocaleString()}
              </h3>
              <div className="flex items-center text-sm">
                <div className="flex items-center gap-1 px-2 py-1 bg-green-100 rounded-full">
                  <ArrowUpRight className="w-3 h-3 text-green-600" />
                  <span className="text-green-700 font-bold">{growth.transactions}%</span>
                </div>
                <span className="text-gray-500 ml-2">vs last month</span>
              </div>
            </div>
            <div className="p-4 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl shadow-xl group-hover:scale-110 transition-transform">
              <Activity className="w-8 h-8 text-white" />
            </div>
          </div>
          <div className="pt-4 border-t-2 border-gray-100">
            <div className="flex justify-between text-xs gap-2">
              <span className="text-green-600 flex items-center font-bold bg-green-50 px-2 py-1 rounded-full">
                <CheckCircle className="w-3 h-3 mr-1" />
                {displayStats.granted} granted
              </span>
              <span className="text-red-600 flex items-center font-bold bg-red-50 px-2 py-1 rounded-full">
                <XCircle className="w-3 h-3 mr-1" />
                {displayStats.denied} denied
              </span>
            </div>
          </div>
        </div>

        {/* Total Users Card */}
        <div className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-2xl transition-all duration-300 border-2 border-gray-100 hover:border-purple-200 hover:scale-[1.02] group">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <p className="text-sm font-bold text-gray-600">Total Users</p>
                <Users className="w-4 h-4 text-purple-500" />
              </div>
              <h3 className="text-4xl font-bold text-gray-900 mb-3 tabular-nums">
                {Number(displayStats.totalUsers || 0).toLocaleString()}
              </h3>
              <div className="flex items-center text-sm">
                <div className="flex items-center gap-1 px-2 py-1 bg-green-100 rounded-full">
                  <ArrowUpRight className="w-3 h-3 text-green-600" />
                  <span className="text-green-700 font-bold">{growth.users}%</span>
                </div>
                <span className="text-gray-500 ml-2">vs last month</span>
              </div>
            </div>
            <div className="p-4 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl shadow-xl group-hover:scale-110 transition-transform">
              <Users className="w-8 h-8 text-white" />
            </div>
          </div>
          <div className="pt-4 border-t-2 border-gray-100">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-600 font-medium">Active Users</p>
              <span className="font-bold text-purple-600 text-sm">{displayStats.activeUsers}</span>
            </div>
          </div>
        </div>

        {/* Success Rate Card */}
        <div className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-2xl transition-all duration-300 border-2 border-gray-100 hover:border-green-200 hover:scale-[1.02] group">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <p className="text-sm font-bold text-gray-600">Success Rate</p>
                <TrendingUp className="w-4 h-4 text-green-500" />
              </div>
              <h3 className="text-4xl font-bold text-gray-900 mb-3 tabular-nums">
                {fmt(displayStats.successRate, 1)}%
              </h3>
              <div className="flex items-center text-sm">
                <div className="flex items-center gap-1 px-2 py-1 bg-green-100 rounded-full">
                  <TrendingUp className="w-3 h-3 text-green-600" />
                  <span className="text-green-700 font-bold">{growth.successRate}%</span>
                </div>
                <span className="text-gray-500 ml-2">vs last month</span>
              </div>
            </div>
            <div className="p-4 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-xl group-hover:scale-110 transition-transform">
              <CheckCircle className="w-8 h-8 text-white" />
            </div>
          </div>
          <div className="pt-4 border-t-2 border-gray-100">
            <div className="relative w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full transition-all duration-1000 shadow-lg"
                style={{ width: `${Math.max(0, Math.min(100, Number(displayStats.successRate || 0)))}%` }}
              >
                <div className="absolute inset-0 bg-white/30 animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats and Alerts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Enhanced Quick Stats */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-gray-100 hover:shadow-xl transition-all">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
            <div className="p-2 bg-indigo-100 rounded-lg mr-3">
              <TrendingUp className="w-5 h-5 text-indigo-600" />
            </div>
            Quick Stats
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border-2 border-blue-100 hover:shadow-md transition-all hover:scale-[1.02] cursor-pointer">
              <div className="flex items-center">
                <div className="p-2 bg-blue-500 rounded-lg mr-3">
                  <MapPin className="w-5 h-5 text-white" />
                </div>
                <div>
                  <span className="text-xs text-gray-600 block font-medium">Top Location</span>
                  <span className="text-sm font-bold text-gray-900">{displayStats.topLocation}</span>
                </div>
              </div>
              <span className="font-bold text-blue-600 text-xl tabular-nums">{displayStats.topLocationCount}</span>
            </div>

            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border-2 border-purple-100 hover:shadow-md transition-all hover:scale-[1.02] cursor-pointer">
              <div className="flex items-center">
                <div className="p-2 bg-purple-500 rounded-lg mr-3">
                  <Camera className="w-5 h-5 text-white" />
                </div>
                <div>
                  <span className="text-xs text-gray-600 block font-medium">Snapshots</span>
                  <span className="text-sm font-bold text-gray-900">Captured</span>
                </div>
              </div>
              <span className="font-bold text-purple-600 text-xl tabular-nums">{displayStats.totalEvents}</span>
            </div>

            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border-2 border-green-100 hover:shadow-md transition-all hover:scale-[1.02] cursor-pointer">
              <div className="flex items-center">
                <div className="p-2 bg-green-500 rounded-lg mr-3">
                  <CreditCard className="w-5 h-5 text-white" />
                </div>
                <div>
                  <span className="text-xs text-gray-600 block font-medium">Avg Transaction</span>
                  <span className="text-sm font-bold text-gray-900">Per Vehicle</span>
                </div>
              </div>
              <span className="font-bold text-green-600 text-xl tabular-nums">{fmt(displayStats.avgTransaction, 2)} DA</span>
            </div>
          </div>
        </div>

        {/* Enhanced System Alerts */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-gray-100 hover:shadow-xl transition-all">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg mr-3">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
            </div>
            System Alerts
          </h3>
          <div className="space-y-3">
            {Number(displayStats.lowBalanceUsers || 0) > 0 && (
              <div className="flex items-start p-4 bg-gradient-to-r from-orange-50 to-amber-50 border-2 border-orange-200 rounded-xl hover:shadow-md transition-all animate-fade-in">
                <AlertTriangle className="w-5 h-5 text-orange-600 mr-3 mt-0.5 flex-shrink-0 animate-pulse" />
                <div className="flex-1">
                  <p className="text-sm font-bold text-orange-900">Low Balance Alert</p>
                  <p className="text-xs text-orange-700 mt-1 font-medium">
                    {displayStats.lowBalanceUsers} users have balance below 100 DA
                  </p>
                </div>
              </div>
            )}

            {Number(displayStats.denied || 0) > 0 && (
              <div className="flex items-start p-4 bg-gradient-to-r from-red-50 to-rose-50 border-2 border-red-200 rounded-xl hover:shadow-md transition-all animate-fade-in">
                <XCircle className="w-5 h-5 text-red-600 mr-3 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-bold text-red-900">Denied Transactions</p>
                  <p className="text-xs text-red-700 mt-1 font-medium">
                    {displayStats.denied} transactions were denied
                  </p>
                </div>
              </div>
            )}

            {Number(displayStats.lowBalanceUsers || 0) === 0 && Number(displayStats.denied || 0) === 0 && (
              <div className="flex items-start p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl">
                <CheckCircle className="w-5 h-5 text-green-600 mr-3 mt-0.5 flex-shrink-0 animate-pulse" />
                <div className="flex-1">
                  <p className="text-sm font-bold text-green-900">All Systems Normal</p>
                  <p className="text-xs text-green-700 mt-1 font-medium">
                    No critical alerts at this time
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Enhanced System Status */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-gray-100 hover:shadow-xl transition-all">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
            <div className="p-2 bg-green-100 rounded-lg mr-3">
              <Activity className="w-5 h-5 text-green-600" />
            </div>
            System Status
          </h3>
          <div className="space-y-3">
            <StatusItem icon={<Database />} label="Database" status="online" />
            <StatusItem icon={<Server />} label="API Server" status="online" />
            <StatusItem icon={<Wifi />} label="WebSocket" status={isConnected ? 'online' : 'offline'} />

            <div className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-gray-600" />
                <span className="text-sm text-gray-700 font-medium">Last Backup</span>
              </div>
              <span className="text-sm font-bold text-gray-900">2 hours ago</span>
            </div>

            <div className="flex items-center justify-between pt-4 px-4 border-t-2 border-gray-100 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl py-3">
              <span className="text-sm text-gray-700 font-medium">System Uptime</span>
              <span className="font-bold text-indigo-600 text-lg">99.9%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Recent Activity Table */}
      <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-100 overflow-hidden hover:shadow-xl transition-all">
        <div className="flex items-center justify-between p-6 border-b-2 border-gray-100 bg-gradient-to-r from-gray-50 to-indigo-50">
          <div className="flex items-center">
            <div className="p-3 bg-indigo-600 rounded-xl mr-3 shadow-lg">
              <Clock className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Recent Activity</h3>
              <p className="text-sm text-gray-600 mt-0.5">Last 10 transactions in real-time</p>
            </div>
          </div>
          <span className="text-sm font-semibold text-indigo-600 bg-indigo-100 px-4 py-2 rounded-full">
            Live
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-gray-100 to-gray-50 border-b-2 border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Time</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Plate</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">RFID</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Location</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {displayStats.recentEvents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <Activity className="w-16 h-16 text-gray-300 mx-auto mb-4 animate-pulse" />
                    <p className="text-gray-600 font-bold text-lg">No recent activity</p>
                    <p className="text-gray-400 text-sm mt-2">Transactions will appear here in real-time</p>
                  </td>
                </tr>
              ) : (
                displayStats.recentEvents.map((event, index) => (
                  <tr key={index} className="hover:bg-indigo-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-medium">
                      {new Date(event.Timestamp).toLocaleTimeString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-bold text-gray-900 bg-gray-100 px-3 py-1 rounded-lg">{event.Plate}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <code className="text-xs bg-indigo-100 text-indigo-800 px-3 py-1.5 rounded-lg font-mono font-semibold">
                        {event.RFID_UID}
                      </code>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      <div className="flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-lg w-fit">
                        <MapPin className="w-4 h-4 text-blue-600" />
                        <span className="font-medium">{event.Location || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold shadow-sm ${
                        event.Status === 'GRANTED'
                          ? 'bg-green-100 text-green-700 border-2 border-green-200'
                          : 'bg-red-100 text-red-700 border-2 border-red-200'
                      }`}>
                        {event.Status === 'GRANTED' ? (
                          <CheckCircle className="w-3 h-3 mr-1" />
                        ) : (
                          <XCircle className="w-3 h-3 mr-1" />
                        )}
                        {event.Status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className="text-sm font-bold text-gray-900 tabular-nums bg-gray-100 px-3 py-1.5 rounded-lg">
                        {fmt(event.Fee_DA, 0)} DA
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// Helper component for system status items
const StatusItem = ({ icon, label, status }) => {
  const isOnline = status === 'online';
  return (
    <div className={`flex items-center justify-between py-3 px-4 rounded-xl transition-all ${
      isOnline ? 'bg-green-50' : 'bg-red-50'
    }`}>
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}>
          {React.cloneElement(icon, { className: 'w-4 h-4 text-white' })}
        </div>
        <span className="text-sm text-gray-700 font-medium">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full animate-pulse ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
        <span className={`text-sm font-bold ${isOnline ? 'text-green-700' : 'text-red-700'}`}>
          {isOnline ? 'Online' : 'Offline'}
        </span>
      </div>
    </div>
  );
};

export default AdminOverview;
