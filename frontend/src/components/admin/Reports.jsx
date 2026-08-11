import React, { useState, useMemo } from 'react';
import {
  Download, FileText, Calendar, TrendingUp,
  Users, CheckCircle, XCircle,
  BarChart3, Filter, Printer, RefreshCw, Wallet,
  Sparkles, Award
} from 'lucide-react';


// Number helpers
const n0 = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n);
};
const n2 = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return '0.00';
  return n.toFixed(2);
};

const Reports = ({ events = [], users = [], refreshData, isConnected }) => {
  const [reportType, setReportType] = useState('summary');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [selectedUser, setSelectedUser] = useState('all');

  // [Keep all your existing calculation logic - it's perfect!]
  const eventsArray = useMemo(() => Array.isArray(events) ? events : [], [events]);
  const usersArray = useMemo(() => Array.isArray(users) ? users : [], [users]);

  const locations = useMemo(() => {
    return [...new Set(eventsArray.map(e => e.Location).filter(Boolean))];
  }, [eventsArray]);

  const filteredEvents = useMemo(() => {
    return eventsArray.filter(event => {
      const ts = event.Timestamp ? new Date(event.Timestamp) : null;
      let matches = true;

      if (dateFrom && ts) {
        matches = matches && ts >= new Date(dateFrom);
      }

      if (dateTo && ts) {
        matches = matches && ts <= new Date(`${dateTo}T23:59:59`);
      }

      if (selectedLocation !== 'all') {
        matches = matches && event.Location === selectedLocation;
      }

      if (selectedUser !== 'all') {
        matches = matches && String(event.Plate) === selectedUser;
      }

      return matches;
    });
  }, [eventsArray, dateFrom, dateTo, selectedLocation, selectedUser]);

  const statistics = useMemo(() => {
    const granted = filteredEvents.filter(e => e.Status === 'GRANTED');
    const denied = filteredEvents.filter(e => e.Status === 'DENIED');

    const totalRevenue = granted.reduce((sum, e) => sum + (Number(e.Fee_DA) || 0), 0);
    const avgFee = granted.length > 0 ? totalRevenue / granted.length : 0;

    const byLocation = {};
    filteredEvents.forEach(e => {
      const loc = e.Location || 'Unknown';
      if (!byLocation[loc]) byLocation[loc] = { total: 0, granted: 0, denied: 0, revenue: 0 };
      byLocation[loc].total += 1;
      if (e.Status === 'GRANTED') {
        byLocation[loc].granted += 1;
        byLocation[loc].revenue += Number(e.Fee_DA) || 0;
      } else {
        byLocation[loc].denied += 1;
      }
    });

    const byDate = {};
    filteredEvents.forEach(e => {
      const date = e.Timestamp ? e.Timestamp.split(' ')[0] : 'Unknown';
      if (!byDate[date]) byDate[date] = { total: 0, revenue: 0 };
      byDate[date].total += 1;
      if (e.Status === 'GRANTED') byDate[date].revenue += Number(e.Fee_DA) || 0;
    });

    const userStats = {};
    filteredEvents.forEach(e => {
      const plate = String(e.Plate || 'Unknown');
      if (!userStats[plate]) userStats[plate] = { count: 0, spent: 0 };
      userStats[plate].count += 1;
      if (e.Status === 'GRANTED') userStats[plate].spent += Number(e.Fee_DA) || 0;
    });

    const topUsers = Object.entries(userStats)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10);

    return {
      total: filteredEvents.length,
      granted: granted.length,
      denied: denied.length,
      successRate: filteredEvents.length > 0 ? ((granted.length / filteredEvents.length) * 100) : 0,
      totalRevenue,
      avgFee,
      byLocation,
      byDate,
      topUsers,
      uniqueUsers: Object.keys(userStats).length
    };
  }, [filteredEvents]);

  const exportCSV = () => {
    const headers = ['Date', 'Plate', 'RFID', 'Status', 'Fee_DA', 'Location', 'Balance_Before', 'Balance_After'];
    const rows = filteredEvents.map(e => [
      e.Timestamp || '',
      e.Plate || '',
      e.RFID_UID || '',
      e.Status || '',
      Number(e.Fee_DA) || 0,
      e.Location || '',
      Number(e.Balance_Before) || 0,
      Number(e.Balance_After) || 0
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `toll_report_${reportType}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    window.print();
  };

  const generateDateRange = () => {
    if (!dateFrom && !dateTo) return 'All Time';
    if (dateFrom && dateTo) return `${dateFrom} to ${dateTo}`;
    if (dateFrom) return `From ${dateFrom}`;
    if (dateTo) return `Until ${dateTo}`;
    return 'All Time';
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Enhanced Header with Gradient */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-2xl shadow-2xl p-8 text-white relative overflow-hidden">
        {/* Animated background orbs */}
        <div className="absolute inset-0 overflow-hidden opacity-20">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl -mr-48 -mt-48 animate-pulse" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-white rounded-full blur-3xl -ml-32 -mb-32 animate-pulse delay-700" />
        </div>

        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex items-center">
            <div className="p-4 bg-white/20 backdrop-blur-sm rounded-2xl mr-4 shadow-lg">
              <FileText className="w-10 h-10" />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-4xl font-bold">Reports & Analytics</h2>
                <Sparkles className="w-6 h-6 text-yellow-300 animate-pulse" />
              </div>
              <p className="text-indigo-100 text-lg">Generate comprehensive toll system reports</p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-sm transition-all shadow-lg border-2 ${
              isConnected
                ? 'bg-green-500/30 border-green-300'
                : 'bg-red-500/30 border-red-300'
            }`}>
              <div className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-green-300' : 'bg-red-300'} animate-pulse`} />
              <span className="text-sm font-bold">{isConnected ? 'Live' : 'Offline'}</span>
            </div>
            <button
              onClick={refreshData}
              className="flex items-center px-5 py-2.5 bg-white/20 hover:bg-white/30 rounded-full transition-all border-2 border-white/30 backdrop-blur-sm hover:scale-105 active:scale-95 shadow-lg font-semibold"
            >
              <RefreshCw className="w-5 h-5 mr-2" />
              Refresh
            </button>
            <button
              onClick={exportCSV}
              className="flex items-center px-5 py-2.5 bg-green-600 hover:bg-green-700 rounded-full transition-all shadow-lg hover:scale-105 active:scale-95 font-semibold"
            >
              <Download className="w-5 h-5 mr-2" />
              CSV
            </button>
            <button
              onClick={exportPDF}
              className="flex items-center px-5 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-full transition-all shadow-lg hover:scale-105 active:scale-95 font-semibold"
            >
              <Printer className="w-5 h-5 mr-2" />
              Print
            </button>
          </div>
        </div>
      </div>

      {/* Enhanced Filter Controls */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-gray-100 hover:shadow-xl transition-all">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Report Type</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
            >
              <option value="summary">📊 Summary Report</option>
              <option value="detailed">📋 Detailed Report</option>
              <option value="revenue">💰 Revenue Report</option>
              <option value="user">👤 User Activity</option>
              <option value="location">📍 Location Analysis</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Date From</label>
            <div className="relative group">
              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-indigo-600 transition-colors" />
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Date To</label>
            <div className="relative group">
              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-indigo-600 transition-colors" />
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Location</label>
            <div className="relative group">
              <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-indigo-600 transition-colors z-10" />
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 appearance-none font-medium"
              >
                <option value="all">All Locations</option>
                {locations.map(loc => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">User</label>
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 appearance-none font-medium"
            >
              <option value="all">All Users</option>
              {usersArray.map(user => (
                <option key={user.plate} value={user.plate}>
                  {user.plate} - {user.owner_name || user.owner}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-6 p-5 bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 rounded-xl border-2 border-indigo-200 shadow-sm">
          <p className="text-sm text-indigo-900 font-medium flex items-center flex-wrap gap-3">
            <span className="flex items-center gap-2 bg-white px-3 py-1 rounded-lg shadow-sm">
              <strong className="font-bold">Report Period:</strong> {generateDateRange()}
            </span>
            <span className="flex items-center gap-2 bg-white px-3 py-1 rounded-lg shadow-sm">
              <strong className="font-bold">Events:</strong> {statistics.total}
            </span>
            <span className="flex items-center gap-2 bg-white px-3 py-1 rounded-lg shadow-sm">
              <strong className="font-bold">Revenue:</strong> {n0(statistics.totalRevenue)} DA
            </span>
          </p>
        </div>
      </div>

      {/* Summary Statistics */}
      {reportType === 'summary' && (
        <>
          {/* Enhanced Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              label="Total Events"
              value={statistics.total}
              icon={<TrendingUp />}
              color="blue"
              gradient="from-blue-500 to-cyan-600"
            />
            <MetricCard
              label="Granted"
              value={statistics.granted}
              icon={<CheckCircle />}
              color="green"
              gradient="from-green-500 to-emerald-600"
              subtext={`${n2(statistics.successRate)}% success rate`}
            />
            <MetricCard
              label="Denied"
              value={statistics.denied}
              icon={<XCircle />}
              color="red"
              gradient="from-red-500 to-rose-600"
            />
            <MetricCard
              label="Total Revenue"
              value={`${n0(statistics.totalRevenue)} DA`}
              icon={<Wallet />}
              color="indigo"
              gradient="from-indigo-500 to-purple-600"
              subtext={`Avg: ${n0(statistics.avgFee)} DA`}
            />
          </div>

          {/* Enhanced Performance by Location */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-gray-100 hover:shadow-xl transition-all">
            <div className="flex items-center mb-6">
              <div className="p-3 bg-indigo-100 rounded-xl mr-3 shadow-md">
                <BarChart3 className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900">Performance by Location</h3>
                <p className="text-sm text-gray-500 font-medium">Revenue and transaction breakdown</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-gray-100 to-indigo-50 border-b-2 border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Location</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Total Events</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Granted</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Denied</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {Object.keys(statistics.byLocation).length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center">
                        <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4 animate-pulse" />
                        <p className="text-gray-500 font-semibold">No location data available</p>
                      </td>
                    </tr>
                  ) : (
                    Object.entries(statistics.byLocation)
                      .sort((a, b) => b[1].revenue - a[1].revenue)
                      .map(([location, s]) => (
                        <tr key={location} className="hover:bg-indigo-50 transition-colors">
                          <td className="px-6 py-4 font-bold text-gray-900 bg-gray-50">{location}</td>
                          <td className="px-6 py-4 text-gray-700 font-medium">{s.total}</td>
                          <td className="px-6 py-4 text-green-600 font-bold bg-green-50">{s.granted}</td>
                          <td className="px-6 py-4 text-red-600 font-bold bg-red-50">{s.denied}</td>
                          <td className="px-6 py-4 font-bold text-indigo-600 text-lg bg-indigo-50">{n0(s.revenue)} DA</td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Enhanced Top Users with Ranking */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-gray-100 hover:shadow-xl transition-all">
            <div className="flex items-center mb-6">
              <div className="p-3 bg-purple-100 rounded-xl mr-3 shadow-md">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900">Top 10 Users</h3>
                <p className="text-sm text-gray-500 font-medium">Most frequent toll users</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-gray-100 to-purple-50 border-b-2 border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Rank</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Plate</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Total Trips</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Total Spent</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {statistics.topUsers.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center">
                        <Users className="w-16 h-16 text-gray-300 mx-auto mb-4 animate-pulse" />
                        <p className="text-gray-500 font-semibold">No user data available</p>
                      </td>
                    </tr>
                  ) : (
                    statistics.topUsers.map(([plate, s], index) => (
                      <tr key={plate} className="hover:bg-purple-50 transition-colors">
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center justify-center w-10 h-10 rounded-xl font-bold shadow-md ${
                            index === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-white' :
                            index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-500 text-white' :
                            index === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-600 text-white' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {index < 3 ? <Award className="w-5 h-5" /> : index + 1}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-bold text-gray-900 text-lg">{plate}</td>
                        <td className="px-6 py-4 text-gray-700 font-semibold">{s.count}</td>
                        <td className="px-6 py-4 font-bold text-indigo-600 text-lg">{n0(s.spent)} DA</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Keep your existing Detailed Report and Revenue Report sections */}
      {/* Just add the enhanced styling I've shown above */}
    </div>
  );
};

// Helper component for metric cards
const MetricCard = ({ label, value, icon, gradient, subtext }) => {
  return (
    <div className={`bg-gradient-to-br ${gradient} rounded-2xl shadow-2xl p-6 text-white relative overflow-hidden hover:scale-105 transition-transform duration-300 group`}>
      <div className="absolute inset-0 overflow-hidden opacity-20">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white rounded-full blur-3xl -mr-20 -mt-20 group-hover:opacity-30 transition-opacity" />
      </div>

      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <div className="p-4 bg-white/20 backdrop-blur-sm rounded-2xl shadow-lg group-hover:scale-110 transition-transform">
            {React.cloneElement(icon, { className: 'w-8 h-8' })}
          </div>
        </div>
        <p className="text-sm opacity-90 mb-2 font-semibold">{label}</p>
        <p className="text-5xl font-bold mb-3 tabular-nums">{value}</p>
        {subtext && <p className="text-sm opacity-90 font-medium">{subtext}</p>}
      </div>
    </div>
  );
};

export default Reports;
