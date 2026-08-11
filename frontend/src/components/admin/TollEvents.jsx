import React, { useState, useMemo } from 'react';
import {
  TrendingUp, Search, Download, Eye, MapPin,
  Clock, CheckCircle, XCircle,
  Calendar, CreditCard, Camera, X, RefreshCw, Wallet,
  Sparkles, Zap, Activity
} from 'lucide-react';
import { SNAPSHOT_BASE_URL } from '../../config';

// Small format helper
const n0 = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n);
};

const TollEvents = ({ events = [], refreshData, isConnected }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterLocation, setFilterLocation] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Memoize events array
  const eventsArray = useMemo(() => (Array.isArray(events) ? events : []), [events]);

  // Unique locations
  const locations = useMemo(() => {
    return [...new Set(eventsArray.map(e => e?.Location).filter(Boolean))];
  }, [eventsArray]);

  // Filter events
  const filteredEvents = useMemo(() => {
    return eventsArray.filter(event => {
      if (!event) return false;

      const plateStr = String(event.Plate || '');
      const rfidStr = String(event.RFID_UID || '');
      const locationStr = String(event.Location || '');

      const matchesSearch =
        plateStr.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rfidStr.toLowerCase().includes(searchQuery.toLowerCase()) ||
        locationStr.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = filterStatus === 'all' || event.Status === filterStatus;
      const matchesLocation = filterLocation === 'all' || event.Location === filterLocation;

      const ts = event.Timestamp ? new Date(event.Timestamp) : null;
      const matchesDateFrom = !dateFrom || (ts && ts >= new Date(dateFrom));
      const matchesDateTo = !dateTo || (ts && ts <= new Date(`${dateTo}T23:59:59`));

      return matchesSearch && matchesStatus && matchesLocation && matchesDateFrom && matchesDateTo;
    });
  }, [eventsArray, searchQuery, filterStatus, filterLocation, dateFrom, dateTo]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredEvents.length / itemsPerPage));
  const paginatedEvents = useMemo(() => {
    const page = Math.min(currentPage, totalPages);
    const startIndex = (page - 1) * itemsPerPage;
    return filteredEvents.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredEvents, currentPage, itemsPerPage, totalPages]);

  // Stats
  const stats = useMemo(() => ({
    total: filteredEvents.length,
    granted: filteredEvents.filter(e => e?.Status === 'GRANTED').length,
    denied: filteredEvents.filter(e => e?.Status === 'DENIED').length,
    totalRevenue: filteredEvents
      .filter(e => e?.Status === 'GRANTED')
      .reduce((sum, e) => sum + (Number(e.Fee_DA) || 0), 0)
  }), [filteredEvents]);

  const handleExportCSV = () => {
    const headers = ['Timestamp', 'Plate', 'RFID_UID', 'Status', 'Fee_DA', 'Balance_Before', 'Balance_After', 'Location'];
    const rows = filteredEvents.map(e => [
      e.Timestamp || '',
      e.Plate || '',
      e.RFID_UID || '',
      e.Status || '',
      Number(e.Fee_DA) || 0,
      Number(e.Balance_Before) || 0,
      Number(e.Balance_After) || 0,
      e.Location || ''
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `toll_events_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const openEventDetails = (event) => {
    setSelectedEvent(event);
    setShowModal(true);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setFilterStatus('all');
    setFilterLocation('all');
    setDateFrom('');
    setDateTo('');
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Enhanced Header with Gradient */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-2xl shadow-2xl p-8 text-white relative overflow-hidden">
        {/* Animated background orbs */}
        <div className="absolute inset-0 overflow-hidden opacity-20">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl -mr-48 -mt-48 animate-pulse" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-white rounded-full blur-3xl -ml-32 -mb-32 animate-pulse delay-700" />
        </div>

        <div className="relative flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center">
            <div className="p-4 bg-white/20 backdrop-blur-sm rounded-2xl mr-4 shadow-lg">
              <Activity className="w-10 h-10 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-4xl font-bold">Toll Events</h2>
                <Sparkles className="w-6 h-6 text-yellow-300 animate-pulse" />
              </div>
              <p className="text-blue-100 text-lg">Real-time toll transaction monitoring</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
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
              className="flex items-center gap-2 px-5 py-2.5 bg-white/20 hover:bg-white/30 rounded-full transition-all border-2 border-white/30 backdrop-blur-sm hover:scale-105 active:scale-95 shadow-lg font-semibold"
            >
              <RefreshCw className="w-5 h-5" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Enhanced Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard
          label="Total Events"
          value={stats.total}
          icon={<TrendingUp />}
          gradient="from-blue-500 to-cyan-600"
        />
        <StatCard
          label="Granted"
          value={stats.granted}
          icon={<CheckCircle />}
          gradient="from-green-500 to-emerald-600"
        />
        <StatCard
          label="Denied"
          value={stats.denied}
          icon={<XCircle />}
          gradient="from-red-500 to-rose-600"
        />
        <StatCard
          label="Revenue"
          value={`${n0(stats.totalRevenue)} DA`}
          icon={<Wallet />}
          gradient="from-indigo-500 to-purple-600"
        />
      </div>

      {/* Enhanced Filters */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-gray-100 hover:shadow-xl transition-all">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
          {/* Search */}
          <div className="lg:col-span-2">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-blue-600 transition-colors" />
              <input
                type="text"
                placeholder="Search by plate, RFID, or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 font-medium transition-all"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 appearance-none font-medium"
            >
              <option value="all">All Status</option>
              <option value="GRANTED">✓ Granted</option>
              <option value="DENIED">✗ Denied</option>
            </select>
          </div>

          {/* Location Filter */}
          <div>
            <select
              value={filterLocation}
              onChange={(e) => setFilterLocation(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 appearance-none font-medium"
            >
              <option value="all">All Locations</option>
              {locations.map(loc => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          </div>

          {/* Items per page */}
          <div>
            <select
              value={itemsPerPage}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl appearance-none font-medium bg-gray-100 cursor-not-allowed"
              disabled
            >
              <option value="10">10 per page</option>
            </select>
          </div>
        </div>

        {/* Date Range */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Date From</label>
            <div className="relative group">
              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-blue-600 transition-colors" />
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Date To</label>
            <div className="relative group">
              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-blue-600 transition-colors" />
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t-2 border-gray-200">
          <p className="text-sm text-gray-600 flex items-center gap-2">
            <Zap className="w-4 h-4 text-blue-500" />
            Showing <span className="font-bold text-blue-600">{paginatedEvents.length}</span> of <span className="font-bold text-gray-900">{filteredEvents.length}</span> events
            {filteredEvents.length !== eventsArray.length && ` (filtered from ${eventsArray.length} total)`}
          </p>

          <div className="flex items-center gap-3">
            <button
              onClick={clearFilters}
              className="px-5 py-2.5 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-all font-semibold hover:scale-105"
            >
              Clear Filters
            </button>
            <button
              onClick={handleExportCSV}
              className="flex items-center px-5 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg font-semibold hover:scale-105 active:scale-95"
            >
              <Download className="w-5 h-5 mr-2" />
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Enhanced Events Table */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden border-2 border-gray-100 hover:shadow-xl transition-all">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-gray-100 to-blue-50 border-b-2 border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Timestamp</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Plate</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">RFID UID</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Location</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Fee</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Balance After</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedEvents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center">
                    <TrendingUp className="w-20 h-20 mx-auto mb-4 text-gray-300 animate-pulse" />
                    <p className="text-gray-600 font-bold text-lg">No toll events found</p>
                    <p className="text-gray-400 text-sm mt-2">
                      {eventsArray.length === 0
                        ? 'Events will appear here in real-time'
                        : 'Try adjusting your filters'
                      }
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedEvents.map((event, index) => (
                  <tr key={index} className="hover:bg-blue-50 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-900 font-medium">
                        <Clock className="w-4 h-4 text-gray-400 mr-2" />
                        {event.Timestamp ? new Date(event.Timestamp).toLocaleString() : 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <CreditCard className="w-4 h-4 text-gray-400 mr-2" />
                        <span className="font-bold text-gray-900 text-lg">{event.Plate}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <code className="text-xs bg-gray-100 px-3 py-1.5 rounded-lg font-mono font-bold border border-gray-200">{event.RFID_UID}</code>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-700 font-medium">
                        <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                        {event.Location || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-xs font-bold border-2 shadow-sm ${
                        event.Status === 'GRANTED'
                          ? 'bg-green-100 text-green-700 border-green-300'
                          : 'bg-red-100 text-red-700 border-red-300'
                      }`}>
                        {event.Status === 'GRANTED' ? (
                          <CheckCircle className="w-3 h-3 mr-1" />
                        ) : (
                          <XCircle className="w-3 h-3 mr-1" />
                        )}
                        {event.Status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-bold text-gray-900 text-lg">
                        {n0(event.Fee_DA)} DA
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        <span className="font-bold text-gray-900 text-lg">
                          {n0(event.Balance_After)} DA
                        </span>
                        {event.Balance_Before !== undefined && (
                          <span className="text-gray-500 text-xs ml-2">
                            (from {n0(event.Balance_Before)} DA)
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => openEventDetails(event)}
                        className="p-2 text-blue-600 hover:bg-blue-100 rounded-xl transition-all hover:scale-110 shadow-sm"
                        title="View Details"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Enhanced Pagination */}
        {totalPages > 1 && (
          <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t-2 border-gray-200">
            <div className="text-sm text-gray-700 font-medium">
              Page <span className="font-bold text-blue-600">{currentPage}</span> of <span className="font-bold text-gray-900">{totalPages}</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-5 py-2.5 border-2 border-gray-300 rounded-xl hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold hover:scale-105"
              >
                Previous
              </button>
              {[...Array(Math.min(5, totalPages))].map((_, i) => {
                const pageNum = i + 1;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-5 py-2.5 rounded-xl transition-all font-semibold ${
                      currentPage === pageNum
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xl scale-110'
                        : 'border-2 border-gray-300 hover:bg-gray-100 hover:scale-105'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-5 py-2.5 border-2 border-gray-300 rounded-xl hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold hover:scale-105"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Enhanced Event Details Modal */}
      {showModal && selectedEvent && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-md animate-fade-in">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-scale-in">
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <div className="p-4 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl mr-4 shadow-lg">
                    <TrendingUp className="w-10 h-10 text-white" />
                  </div>
                  <div>
                    <h3 className="text-3xl font-bold text-gray-900">Event Details</h3>
                    <p className="text-sm text-gray-500 font-medium">Transaction #{selectedEvent.Plate}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowModal(false);
                    setSelectedEvent(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 p-3 hover:bg-gray-100 rounded-xl transition-all hover:scale-110"
                >
                  <X className="w-7 h-7" />
                </button>
              </div>

              {/* Event Info */}
              <div className="grid grid-cols-2 gap-6 mb-6">
                <InfoCard label="Timestamp" value={selectedEvent.Timestamp ? new Date(selectedEvent.Timestamp).toLocaleString() : 'N/A'} />
                <InfoCard
                  label="Status"
                  value={selectedEvent.Status}
                  isStatus
                  statusType={selectedEvent.Status}
                />
                <InfoCard label="Plate Number" value={selectedEvent.Plate} bold />
                <InfoCard label="RFID UID" value={selectedEvent.RFID_UID} mono />
                <InfoCard label="Location" value={selectedEvent.Location || 'N/A'} />
                <div className="p-5 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl border-2 border-indigo-200 shadow-md">
                  <p className="text-sm text-indigo-700 mb-2 font-bold uppercase">Toll Fee</p>
                  <p className="text-4xl font-bold text-indigo-900 tabular-nums">{n0(selectedEvent.Fee_DA)} DA</p>
                </div>
                <div className="p-5 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl border-2 border-blue-200 shadow-md">
                  <p className="text-sm text-blue-700 mb-2 font-bold uppercase">Balance Before</p>
                  <p className="text-3xl font-bold text-blue-900 tabular-nums">{n0(selectedEvent.Balance_Before)} DA</p>
                </div>
                <div className="p-5 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border-2 border-green-200 shadow-md">
                  <p className="text-sm text-green-700 mb-2 font-bold uppercase">Balance After</p>
                  <p className="text-3xl font-bold text-green-900 tabular-nums">{n0(selectedEvent.Balance_After)} DA</p>
                </div>
              </div>

              {/* Snapshot */}
              {selectedEvent.Snapshot && (
                <div>
                  <p className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                    <Camera className="w-6 h-6 mr-2 text-blue-600" />
                    Vehicle Snapshot
                    </p>
                  <img
                    src={`${SNAPSHOT_BASE_URL}/${selectedEvent.Snapshot}`}
                    alt="Vehicle snapshot"
                    className="w-full rounded-2xl border-2 border-gray-200 shadow-2xl"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      const parent = e.target.parentElement;
                      const errorDiv = document.createElement('div');
                      errorDiv.className = 'p-12 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl text-center';
                      errorDiv.innerHTML = '<div class="flex flex-col items-center"><svg class="w-16 h-16 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg><p class="text-gray-600 font-bold">Snapshot not available</p></div>';
                      parent.appendChild(errorDiv);
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper Components
const StatCard = ({ label, value, icon, gradient }) => {
  return (
    <div className={`bg-gradient-to-br ${gradient} rounded-2xl shadow-2xl p-6 text-white relative overflow-hidden hover:scale-105 transition-transform duration-300 group`}>
      <div className="absolute inset-0 overflow-hidden opacity-20">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white rounded-full blur-3xl -mr-20 -mt-20 group-hover:opacity-30 transition-opacity" />
      </div>

      <div className="relative flex items-center justify-between">
        <div>
          <p className="text-sm opacity-90 mb-2 font-semibold">{label}</p>
          <p className="text-5xl font-bold tabular-nums">{value}</p>
        </div>
        <div className="p-4 bg-white/20 backdrop-blur-sm rounded-2xl shadow-lg group-hover:scale-110 transition-transform">
          {React.cloneElement(icon, { className: 'w-10 h-10' })}
        </div>
      </div>
    </div>
  );
};

const InfoCard = ({ label, value, bold, mono, isStatus, statusType }) => {
  if (isStatus) {
    return (
      <div className="p-5 bg-gray-50 rounded-2xl border-2 border-gray-200 shadow-sm">
        <p className="text-xs text-gray-600 mb-3 font-semibold uppercase tracking-wide">{label}</p>
        <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-bold border-2 shadow-md ${
          statusType === 'GRANTED' ? 'bg-green-100 text-green-700 border-green-300' : 'bg-red-100 text-red-700 border-red-300'
        }`}>
          {statusType}
        </span>
      </div>
    );
  }

  return (
    <div className="p-5 bg-gray-50 rounded-2xl border-2 border-gray-200 shadow-sm hover:shadow-md transition-shadow">
      <p className="text-xs text-gray-600 mb-2 font-semibold uppercase tracking-wide">{label}</p>
      <p className={`text-lg text-gray-900 ${mono ? 'font-mono' : ''} ${bold ? 'font-bold' : 'font-semibold'}`}>
        {value}
      </p>
    </div>
  );
};

export default TollEvents;
