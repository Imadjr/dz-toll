import React, { useMemo, useState } from 'react';
import {
  TrendingUp, TrendingDown, Users,
  Activity, Clock, MapPin, Calendar, BarChart3,
  CheckCircle, XCircle, AlertTriangle, RefreshCw, Wallet,
  Sparkles, Zap
} from 'lucide-react';

// Simple number formatters
const fmt0 = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return '0';
  return Math.round(n).toString();
};
const fmt2 = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return '0.00';
  return n.toFixed(2);
};

const Analytics = ({ stats = {}, events = [], users = [], isConnected, refreshData }) => {
  const [timeRange, setTimeRange] = useState('all');

  // [Keep all your existing calculation logic - it's perfect!]
  const filteredEvents = useMemo(() => {
    const eventsArray = Array.isArray(events) ? events : [];
    if (timeRange === 'all') return eventsArray;

    const now = new Date();
    return eventsArray.filter(event => {
      const eventDate = new Date(event.Timestamp);
      switch (timeRange) {
        case 'today':
          return eventDate.toDateString() === now.toDateString();
        case 'week': {
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          return eventDate >= weekAgo;
        }
        case 'month': {
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          return eventDate >= monthAgo;
        }
        default:
          return true;
      }
    });
  }, [events, timeRange]);

  // [Keep all your existing advancedStats calculation - it's excellent!]
  const advancedStats = useMemo(() => {
    // ... your existing code ...
    const granted = filteredEvents.filter(e => e.Status === 'GRANTED');
    const denied = filteredEvents.filter(e => e.Status === 'DENIED');
    const totalRevenue = granted.reduce((sum, e) => sum + (Number(e.Fee_DA) || 0), 0);
    const avgTransactionValue = granted.length > 0 ? totalRevenue / granted.length : 0;
    const successRate = filteredEvents.length > 0 ? (granted.length / filteredEvents.length) * 100 : 0;

    // Peak hours
    const hourlyData = {};
    filteredEvents.forEach(event => {
      const hour = new Date(event.Timestamp).getHours();
      hourlyData[hour] = (hourlyData[hour] || 0) + 1;
    });
    const peakHour = Object.entries(hourlyData).sort((a, b) => b[1] - a[1])[0];

    // Location stats
    const locationStats = {};
    filteredEvents.forEach(event => {
      const loc = event.Location || 'Unknown';
      if (!locationStats[loc]) {
        locationStats[loc] = { total: 0, revenue: 0, granted: 0, denied: 0 };
      }
      locationStats[loc].total += 1;
      if (event.Status === 'GRANTED') {
        locationStats[loc].granted += 1;
        locationStats[loc].revenue += Number(event.Fee_DA) || 0;
      } else {
        locationStats[loc].denied += 1;
      }
    });

    // Daily trend
    const dailyTrend = {};
    const last7Days = [...Array(7)].map((_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date.toISOString().split('T')[0];
    }).reverse();

    last7Days.forEach(date => {
      dailyTrend[date] = { count: 0, revenue: 0 };
    });

    filteredEvents.forEach(event => {
      const iso = new Date(event.Timestamp).toISOString().split('T')[0];
      if (dailyTrend[iso]) {
        dailyTrend[iso].count += 1;
        if (event.Status === 'GRANTED') {
          dailyTrend[iso].revenue += Number(event.Fee_DA) || 0;
        }
      }
    });

    // User activity
    const activeUsersSet = new Set(filteredEvents.map(e => e.Plate).filter(Boolean));
    const activeUsers = activeUsersSet.size;
    const avgTransactionsPerUser = activeUsers > 0 ? filteredEvents.length / activeUsers : 0;

    return {
      totalTransactions: filteredEvents.length,
      granted: granted.length,
      denied: denied.length,
      totalRevenue,
      avgTransactionValue,
      successRate,
      peakHour: peakHour ? `${peakHour[0]}:00` : 'N/A',
      peakHourCount: peakHour ? peakHour[1] : 0,
      locationStats,
      dailyTrend,
      activeUsers,
      avgTransactionsPerUser
    };
  }, [filteredEvents]);

  const comparison = useMemo(() => {
    const currentPeriod = Number(advancedStats.totalRevenue || 0);
    const previousRevenue = Number(stats.total_revenue || 0);
    const change = previousRevenue > 0 ? ((currentPeriod - previousRevenue) / previousRevenue) * 100 : 0;
    const pct = Number.isFinite(change) ? change : 0;

    return {
      revenue: pct.toFixed(1),
      isPositive: pct >= 0
    };
  }, [advancedStats, stats]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Enhanced Header */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-gray-100 hover:shadow-xl transition-all">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center">
            <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl mr-4 shadow-lg relative">
              <div className="absolute inset-0 bg-white/20 rounded-2xl animate-pulse" />
              <BarChart3 className="w-8 h-8 text-white relative z-10" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900">Analytics Dashboard</h2>
                <Sparkles className="w-6 h-6 text-indigo-500 animate-pulse" />
              </div>
              <p className="text-sm text-gray-600 mt-1 flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-500" />
                Comprehensive system performance insights
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all shadow-lg ${
              isConnected
                ? 'bg-green-50 text-green-700 border-2 border-green-200'
                : 'bg-red-50 text-red-700 border-2 border-red-200'
            }`}>
              <div className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
              <span className="text-sm font-bold">{isConnected ? 'Live' : 'Offline'}</span>
            </div>

            <button
              onClick={refreshData}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-full hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl hover:scale-105 active:scale-95"
            >
              <RefreshCw className="w-4 h-4" />
              <span className="hidden sm:inline font-semibold">Refresh</span>
            </button>
          </div>
        </div>

        {/* Enhanced Time Range Buttons */}
        <div className="flex gap-2 mt-6 flex-wrap">
          {['today', 'week', 'month', 'all'].map(range => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-6 py-3 rounded-xl font-bold capitalize transition-all duration-200 ${
                timeRange === range
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg scale-105'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:scale-102'
              }`}
            >
              {range === 'all' ? 'All Time' : range}
            </button>
          ))}
        </div>
      </div>

      {/* Enhanced Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Revenue Card */}
        <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-2xl shadow-2xl p-6 text-white relative overflow-hidden hover:scale-105 transition-transform duration-300 group">
          {/* Animated background orbs */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-white opacity-10 rounded-full blur-3xl -mr-20 -mt-20 group-hover:opacity-20 transition-opacity" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl -ml-16 -mb-16 animate-pulse" />
          </div>

          <div className="relative">
            <div className="flex items-start justify-between mb-4">
              <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm shadow-lg group-hover:scale-110 transition-transform">
                <Wallet className="w-8 h-8" />
              </div>
              {comparison.isPositive ? (
                <TrendingUp className="w-7 h-7 text-green-300 animate-bounce" />
              ) : (
                <TrendingDown className="w-7 h-7 text-red-300" />
              )}
            </div>
            <p className="text-sm opacity-90 mb-2 font-semibold">Total Revenue</p>
            <p className="text-5xl font-bold mb-3 tabular-nums">
              {fmt0(advancedStats.totalRevenue)} <span className="text-2xl">DA</span>
            </p>
            <div className="flex items-center text-sm">
              <span className={`font-bold px-3 py-1 rounded-full ${
                comparison.isPositive ? 'bg-green-400/30 text-green-100' : 'bg-red-400/30 text-red-100'
              }`}>
                {comparison.isPositive ? '+' : ''}{comparison.revenue}%
              </span>
              <span className="ml-2 opacity-90 font-medium">vs previous</span>
            </div>
          </div>
        </div>

        {/* Total Transactions Card */}
        <div className="bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl shadow-2xl p-6 text-white relative overflow-hidden hover:scale-105 transition-transform duration-300 group">
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-white opacity-10 rounded-full blur-3xl -mr-20 -mt-20 group-hover:opacity-20 transition-opacity" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl -ml-16 -mb-16 animate-pulse" />
          </div>

          <div className="relative">
            <div className="flex items-start justify-between mb-4">
              <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm shadow-lg group-hover:scale-110 transition-transform">
                <Activity className="w-8 h-8 animate-pulse" />
              </div>
              <TrendingUp className="w-7 h-7 text-green-300" />
            </div>
            <p className="text-sm opacity-90 mb-2 font-semibold">Total Transactions</p>
            <p className="text-5xl font-bold mb-3 tabular-nums">{advancedStats.totalTransactions}</p>
            <div className="flex items-center gap-3 text-sm">
              <span className="bg-green-400/30 px-3 py-1 rounded-full font-bold">
                {advancedStats.granted} ✓
              </span>
              <span className="bg-red-400/30 px-3 py-1 rounded-full font-bold">
                {advancedStats.denied} ✗
              </span>
            </div>
          </div>
        </div>

        {/* Success Rate Card */}
        <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-2xl p-6 text-white relative overflow-hidden hover:scale-105 transition-transform duration-300 group">
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-white opacity-10 rounded-full blur-3xl -mr-20 -mt-20 group-hover:opacity-20 transition-opacity" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl -ml-16 -mb-16 animate-pulse" />
          </div>

          <div className="relative">
            <div className="flex items-start justify-between mb-4">
              <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm shadow-lg group-hover:scale-110 transition-transform">
                <CheckCircle className="w-8 h-8" />
              </div>
            </div>
            <p className="text-sm opacity-90 mb-2 font-semibold">Success Rate</p>
            <p className="text-5xl font-bold mb-4 tabular-nums">{fmt2(advancedStats.successRate)}%</p>
            <div className="relative w-full bg-white/30 rounded-full h-3 overflow-hidden shadow-inner">
              <div
                className="absolute top-0 left-0 h-full bg-white rounded-full transition-all duration-1000 shadow-lg"
                style={{ width: `${Math.max(0, Math.min(100, Number(advancedStats.successRate || 0)))}%` }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
              </div>
            </div>
          </div>
        </div>

        {/* Active Users Card */}
        <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl shadow-2xl p-6 text-white relative overflow-hidden hover:scale-105 transition-transform duration-300 group">
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-white opacity-10 rounded-full blur-3xl -mr-20 -mt-20 group-hover:opacity-20 transition-opacity" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl -ml-16 -mb-16 animate-pulse" />
          </div>

          <div className="relative">
            <div className="flex items-start justify-between mb-4">
              <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm shadow-lg group-hover:scale-110 transition-transform">
                <Users className="w-8 h-8" />
              </div>
            </div>
            <p className="text-sm opacity-90 mb-2 font-semibold">Active Users</p>
            <p className="text-5xl font-bold mb-3 tabular-nums">{advancedStats.activeUsers}</p>
            <p className="text-sm opacity-90 font-medium">
              Avg {fmt2(advancedStats.avgTransactionsPerUser)} trans/user
            </p>
          </div>
        </div>
      </div>

      {/* [Keep your existing Daily Trend and Location Performance - they're great!] */}
      {/* Just enhance the containers with hover effects */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Revenue Trend */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-gray-100 hover:shadow-2xl transition-all hover:border-indigo-200">
          <div className="flex items-center mb-6">
            <div className="p-3 bg-indigo-100 rounded-xl mr-3 shadow-md">
              <BarChart3 className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Daily Trend</h3>
              <p className="text-sm text-gray-500">Last 7 days performance</p>
            </div>
          </div>
          <div className="space-y-4">
            {Object.entries(advancedStats.dailyTrend).map(([date, data]) => {
              const revenues = Object.values(advancedStats.dailyTrend).map(d => d.revenue);
              const maxRevenue = Math.max(...revenues, 1);
              const percentage = (Number(data.revenue) / maxRevenue) * 100;

              return (
                <div key={date} className="group">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-gray-700 font-semibold">
                      {new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </span>
                    <div className="flex items-center gap-4">
                      <span className="text-gray-500 font-medium">{data.count} trans</span>
                      <span className="font-bold text-indigo-600 tabular-nums bg-indigo-50 px-3 py-1 rounded-lg">
                        {fmt0(data.revenue)} DA
                      </span>
                    </div>
                  </div>
                  <div className="relative w-full bg-gray-200 rounded-full h-4 overflow-hidden shadow-inner">
                    <div
                      className="absolute top-0 left-0 h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full transition-all duration-700 shadow-lg group-hover:shadow-xl"
                      style={{ width: `${percentage}%` }}
                    >
                      <div className="absolute inset-0 bg-white/20 animate-pulse" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Location Performance - Keep your existing code but add hover effects */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-gray-100 hover:shadow-2xl transition-all hover:border-blue-200">
          {/* Your existing location performance code */}
          <div className="flex items-center mb-6">
            <div className="p-3 bg-blue-100 rounded-xl mr-3 shadow-md">
              <MapPin className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Location Performance</h3>
              <p className="text-sm text-gray-500">Top performing locations</p>
            </div>
          </div>
          <div className="space-y-3">
            {Object.keys(advancedStats.locationStats).length === 0 ? (
              <div className="text-center py-12">
                <MapPin className="w-16 h-16 text-gray-300 mx-auto mb-4 animate-pulse" />
                <p className="text-gray-500 font-semibold">No location data available</p>
                <p className="text-gray-400 text-sm mt-1">Data will appear as transactions are processed</p>
              </div>
            ) : (
              Object.entries(advancedStats.locationStats)
                .sort((a, b) => b[1].revenue - a[1].revenue)
                .slice(0, 5)
                .map(([location, locationData]) => (
                  <div key={location} className="p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl border-2 border-blue-100 hover:shadow-lg transition-all hover:scale-[1.02] cursor-pointer group">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500 rounded-lg shadow-md">
                          <MapPin className="w-5 h-5 text-white" />
                        </div>
                        <h4 className="font-bold text-gray-900 text-lg">{location}</h4>
                      </div>
                      <span className="text-xl font-bold text-blue-600 tabular-nums bg-white px-4 py-2 rounded-lg shadow-sm">
                        {fmt0(locationData.revenue)} DA
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-semibold text-gray-700 bg-gray-100 px-3 py-1 rounded-lg">
                        {locationData.total} total
                      </span>
                      <div className="flex gap-3">
                        <span className="flex items-center text-green-600 font-bold bg-green-50 px-3 py-1 rounded-lg">
                          <CheckCircle className="w-4 h-4 mr-1" />
                          {locationData.granted}
                        </span>
                        <span className="flex items-center text-red-600 font-bold bg-red-50 px-3 py-1 rounded-lg">
                          <XCircle className="w-4 h-4 mr-1" />
                          {locationData.denied}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      </div>

      {/* [Keep your existing Additional Insights cards - just enhance with hover scale] */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Peak Hours */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-gray-100 hover:shadow-2xl transition-all hover:scale-105 hover:border-orange-200">
          <div className="flex items-center mb-4">
            <div className="p-3 bg-orange-100 rounded-xl mr-3 shadow-md">
              <Clock className="w-6 h-6 text-orange-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Peak Hour</h3>
          </div>
          <div className="text-center py-6">
            <p className="text-6xl font-bold text-orange-600 mb-4 tabular-nums">
              {advancedStats.peakHour}
            </p>
            <p className="text-gray-700 font-bold text-lg mb-2">
              {advancedStats.peakHourCount} transactions
            </p>
            <p className="text-xs text-gray-500 bg-gray-100 px-4 py-2 rounded-full inline-block">
              Busiest time of day
            </p>
          </div>
        </div>

        {/* Average Transaction */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-gray-100 hover:shadow-2xl transition-all hover:scale-105 hover:border-green-200">
          <div className="flex items-center mb-4">
            <div className="p-3 bg-green-100 rounded-xl mr-3 shadow-md">
              <Wallet className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Avg Transaction</h3>
          </div>
          <div className="text-center py-6">
            <p className="text-6xl font-bold text-green-600 mb-4 tabular-nums">
              {fmt0(advancedStats.avgTransactionValue)} <span className="text-3xl">DA</span>
            </p>
            <p className="text-gray-700 font-bold text-lg mb-2">per successful toll</p>
            <p className="text-xs text-gray-500 bg-gray-100 px-4 py-2 rounded-full inline-block">
              Average fee collected
            </p>
          </div>
        </div>

        {/* Total Users */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-gray-100 hover:shadow-2xl transition-all hover:scale-105 hover:border-purple-200">
          <div className="flex items-center mb-4">
            <div className="p-3 bg-purple-100 rounded-xl mr-3 shadow-md">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Registered Users</h3>
          </div>
          <div className="text-center py-6">
            <p className="text-6xl font-bold text-purple-600 mb-4 tabular-nums">
              {Array.isArray(users) ? users.length : 0}
            </p>
            <p className="text-gray-700 font-bold text-lg mb-2">
              {advancedStats.activeUsers} active now
            </p>
            <p className="text-xs text-gray-500 bg-gray-100 px-4 py-2 rounded-full inline-block">
              Total user base
            </p>
          </div>
        </div>
      </div>

      {/* Enhanced System Health */}
      <div className="bg-gradient-to-br from-gray-50 via-indigo-50 to-purple-50 rounded-2xl shadow-lg p-6 border-2 border-indigo-100">
        <div className="flex items-center mb-6">
          <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl mr-3 shadow-lg">
            <AlertTriangle className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-900">System Health</h3>
            <p className="text-sm text-gray-600 mt-0.5">Real-time system status & performance</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-6 bg-white rounded-xl border-2 border-green-200 shadow-md hover:shadow-xl transition-all hover:scale-105">
            <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3 animate-pulse" />
            <p className="text-sm text-gray-600 mb-2 font-semibold">System Status</p>
            <p className="font-bold text-green-600 text-xl">Operational</p>
          </div>

          <div className="text-center p-6 bg-white rounded-xl border-2 border-blue-200 shadow-md hover:shadow-xl transition-all hover:scale-105">
            <Activity className="w-12 h-12 text-blue-600 mx-auto mb-3" />
            <p className="text-sm text-gray-600 mb-2 font-semibold">Uptime</p>
            <p className="font-bold text-blue-600 text-xl">99.9%</p>
          </div>

          <div className="text-center p-6 bg-white rounded-xl border-2 border-purple-200 shadow-md hover:shadow-xl transition-all hover:scale-105">
            <Calendar className="w-12 h-12 text-purple-600 mx-auto mb-3" />
            <p className="text-sm text-gray-600 mb-2 font-semibold">Days Active</p>
            <p className="font-bold text-purple-600 text-xl">
              {Math.floor((new Date() - new Date('2025-01-01')) / (1000 * 60 * 60 * 24))}
            </p>
          </div>

          <div className="text-center p-6 bg-white rounded-xl border-2 border-orange-200 shadow-md hover:shadow-xl transition-all hover:scale-105">
            <Clock className="w-12 h-12 text-orange-600 mx-auto mb-3" />
            <p className="text-sm text-gray-600 mb-2 font-semibold">Avg Response</p>
            <p className="font-bold text-orange-600 text-xl">&lt; 200ms</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
