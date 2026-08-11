import React, { useState, useMemo } from 'react';
import {
  Camera, Search, Filter, MapPin, Clock, Image as ImageIcon,
  Download, Grid, List, Calendar, CheckCircle, XCircle,
  Eye, X, RefreshCw, Sparkles, Zap
} from 'lucide-react';
import { SNAPSHOT_BASE_URL } from '../../config';

const Snapshots = ({ events = [], refreshData, isConnected }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterLocation, setFilterLocation] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [selectedSnapshot, setSelectedSnapshot] = useState(null);
  const [showLightbox, setShowLightbox] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(12);

  // Unique locations
  const locations = useMemo(() => {
    const eventArray = Array.isArray(events) ? events : [];
    return [...new Set(eventArray.map(e => e?.Location).filter(Boolean))];
  }, [events]);

  // Filter snapshots
  const filteredEvents = useMemo(() => {
    const eventArray = Array.isArray(events) ? events : [];
    return eventArray.filter(event => {
      if (!event) return false;

      const plateStr = String(event.Plate || '');
      const rfidStr = String(event.RFID_UID || '');
      const matchesSearch =
        plateStr.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rfidStr.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = filterStatus === 'all' || event.Status === filterStatus;
      const matchesLocation = filterLocation === 'all' || event.Location === filterLocation;

      let matchesDate = true;
      if (dateFrom || dateTo) {
        const eventDate = event.Timestamp ? new Date(event.Timestamp) : null;
        if (eventDate) {
          if (dateFrom) matchesDate = matchesDate && eventDate >= new Date(dateFrom);
          if (dateTo) matchesDate = matchesDate && eventDate <= new Date(`${dateTo}T23:59:59`);
        }
      }

      return matchesSearch && matchesStatus && matchesLocation && matchesDate;
    });
  }, [events, searchQuery, filterStatus, filterLocation, dateFrom, dateTo]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredEvents.length / itemsPerPage));
  const paginatedEvents = useMemo(() => {
    const clampedPage = Math.min(currentPage, totalPages);
    const startIndex = (clampedPage - 1) * itemsPerPage;
    return filteredEvents.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredEvents, currentPage, itemsPerPage, totalPages]);

  // Stats
  const stats = useMemo(() => {
    return {
      total: filteredEvents.length,
      granted: filteredEvents.filter(e => e && e.Status === 'GRANTED').length,
      denied: filteredEvents.filter(e => e && e.Status === 'DENIED').length,
    };
  }, [filteredEvents]);

  const handleDownloadImage = (event) => {
    if (!event?.Snapshot) return;
    const link = document.createElement('a');
    link.href = `${SNAPSHOT_BASE_URL}/${event.Snapshot}`;
    link.download = `snapshot_${event.Plate}_${event.Timestamp}.jpg`;
    link.click();
  };

  const handleViewSnapshot = (event) => {
    setSelectedSnapshot(event);
    setShowLightbox(true);
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
      <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 rounded-2xl shadow-2xl p-8 text-white relative overflow-hidden">
        {/* Animated background orbs */}
        <div className="absolute inset-0 overflow-hidden opacity-20">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl -mr-48 -mt-48 animate-pulse" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-white rounded-full blur-3xl -ml-32 -mb-32 animate-pulse delay-700" />
        </div>

        <div className="relative flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center">
            <div className="p-4 bg-white/20 backdrop-blur-sm rounded-2xl mr-4 shadow-lg">
              <Camera className="w-10 h-10 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-4xl font-bold">Snapshot Gallery</h2>
                <Sparkles className="w-6 h-6 text-yellow-300 animate-pulse" />
              </div>
              <p className="text-purple-100 text-lg">View and download captured vehicle images</p>
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          label="Total Snapshots"
          value={stats.total}
          icon={<Camera />}
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
      </div>

      {/* Enhanced Filters */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-gray-100 hover:shadow-xl transition-all">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {/* Search */}
          <div className="lg:col-span-2">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-purple-600 transition-colors" />
              <input
                type="text"
                placeholder="Search by plate or RFID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-medium"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <div className="relative group">
              <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-purple-600 transition-colors z-10" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 appearance-none font-medium"
              >
                <option value="all">All Status</option>
                <option value="GRANTED">Granted</option>
                <option value="DENIED">Denied</option>
              </select>
            </div>
          </div>

          {/* Location Filter */}
          <div>
            <div className="relative group">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-purple-600 transition-colors z-10" />
              <select
                value={filterLocation}
                onChange={(e) => setFilterLocation(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 appearance-none font-medium"
              >
                <option value="all">All Locations</option>
                {locations.map(loc => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Date Range */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Date From</label>
            <div className="relative group">
              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-purple-600 transition-colors" />
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Date To</label>
            <div className="relative group">
              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-purple-600 transition-colors" />
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500"
              />
            </div>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="flex items-center justify-between pt-4 border-t-2 border-gray-200">
          <p className="text-sm text-gray-600 flex items-center gap-2">
            <Zap className="w-4 h-4 text-purple-500" />
            Showing <span className="font-bold text-purple-600">{paginatedEvents.length}</span> of <span className="font-bold text-gray-900">{filteredEvents.length}</span> snapshots
          </p>

          <div className="flex items-center gap-3">
            <button
              onClick={clearFilters}
              className="px-5 py-2.5 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-all font-semibold hover:scale-105"
            >
              Clear Filters
            </button>

            {/* View Mode Toggle */}
            <div className="flex bg-gray-100 rounded-xl p-1 shadow-sm">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white shadow-md text-purple-600' : 'text-gray-600 hover:text-gray-900'}`}
                title="Grid View"
              >
                <Grid className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white shadow-md text-purple-600' : 'text-gray-600 hover:text-gray-900'}`}
                title="List View"
              >
                <List className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Snapshots Display */}
      {filteredEvents.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-lg p-16 text-center border-2 border-gray-100">
          <Camera className="w-24 h-24 text-gray-300 mx-auto mb-6 animate-pulse" />
          <p className="text-2xl font-bold text-gray-900 mb-3">No Snapshots Found</p>
          <p className="text-gray-500 text-lg">
            {events.length === 0
              ? 'No snapshots have been captured yet. They will appear here once vehicles pass through the toll.'
              : 'Try adjusting your filters to see more results.'
            }
          </p>
        </div>
      ) : (
        <>
          {viewMode === 'grid' ? (
            /* Enhanced Grid View */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {paginatedEvents.map((event, index) => (
                <div
                  key={`${event.Plate}-${event.Timestamp}-${index}`}
                  className="bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 group border-2 border-gray-100 hover:border-purple-300 hover:scale-105"
                >
                  {/* Image Container */}
                  <div className="aspect-video bg-gray-200 relative overflow-hidden">
                    {event?.Snapshot ? (
                      <>
                        <img
                          src={`${SNAPSHOT_BASE_URL}/${event.Snapshot}`}
                          alt={`Snapshot ${event.Plate}`}
                          className="w-full h-full object-cover cursor-pointer transition-transform group-hover:scale-110"
                          onClick={() => handleViewSnapshot(event)}
                          onError={(e) => {
                            e.target.style.display = 'none';
                            const fallback = e.target.parentElement.querySelector('.fallback-icon');
                            if (fallback) fallback.style.display = 'flex';
                          }}
                        />
                        <div className="fallback-icon absolute inset-0 hidden flex-col items-center justify-center bg-gradient-to-br from-gray-200 to-gray-300">
                          <ImageIcon className="w-16 h-16 text-gray-400 mb-3" />
                          <p className="text-sm text-gray-500 px-2 text-center font-medium">Image Not Available</p>
                        </div>

                        {/* Hover Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-6">
                          <div className="flex gap-3">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewSnapshot(event);
                              }}
                              className="p-3 bg-white rounded-full hover:bg-purple-600 hover:text-white transition-all shadow-xl hover:scale-110"
                              title="View Full Size"
                            >
                              <Eye className="w-6 h-6" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownloadImage(event);
                              }}
                              className="p-3 bg-white rounded-full hover:bg-green-600 hover:text-white transition-all shadow-xl hover:scale-110"
                              title="Download"
                            >
                              <Download className="w-6 h-6" />
                            </button>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full bg-gradient-to-br from-gray-100 to-gray-200">
                        <ImageIcon className="w-16 h-16 text-gray-400 mb-3" />
                        <p className="text-sm text-gray-500 font-medium">No Image</p>
                      </div>
                    )}

                    {/* Status Badge */}
                    {event?.Status && (
                      <div className={`absolute top-3 right-3 px-4 py-1.5 rounded-full text-xs font-bold shadow-2xl backdrop-blur-sm ${
                        event.Status === 'GRANTED'
                          ? 'bg-green-500 text-white border-2 border-green-300'
                          : 'bg-red-500 text-white border-2 border-red-300'
                      }`}>
                        {event.Status}
                      </div>
                    )}
                  </div>

                  {/* Event Details */}
                  <div className="p-5 bg-gradient-to-br from-white to-gray-50">
                    <p className="font-bold text-xl text-gray-900 mb-3">{event?.Plate || 'Unknown'}</p>
                    <div className="space-y-2">
                      <p className="text-xs text-gray-600 flex items-center">
                        <Clock className="w-4 h-4 mr-2 text-gray-400" />
                        <span className="font-medium">{event?.Timestamp ? new Date(event.Timestamp).toLocaleString() : 'N/A'}</span>
                      </p>
                      <div className="flex items-center">
                        <code className="bg-gray-100 px-3 py-1.5 rounded-lg text-xs font-mono font-bold text-gray-700 border border-gray-200">
                          {event?.RFID_UID || 'N/A'}
                        </code>
                      </div>
                      <p className="text-xs text-gray-600 flex items-center">
                        <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                        <span className="font-medium">{event?.Location || 'Unknown Location'}</span>
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Enhanced List View */
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden border-2 border-gray-100 hover:shadow-xl transition-all">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-gray-100 to-purple-50 border-b-2 border-gray-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Preview</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Plate</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">RFID</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Timestamp</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Location</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {paginatedEvents.map((event, index) => (
                      <tr key={`${event.Plate}-${index}`} className="hover:bg-purple-50 transition-colors">
                        <td className="px-6 py-4">
                          {event.Snapshot ? (
                            <img
                              src={`${SNAPSHOT_BASE_URL}/${event.Snapshot}`}
                              alt={event.Plate}
                              className="w-28 h-16 object-cover rounded-xl cursor-pointer shadow-md border-2 border-gray-200 hover:border-purple-400 transition-all hover:scale-110"
                              onClick={() => handleViewSnapshot(event)}
                              onError={(e) => {
                                e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="112" height="64" viewBox="0 0 112 64"%3E%3Crect fill="%23f3f4f6" width="112" height="64"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="%239ca3af" font-size="10"%3ENo Image%3C/text%3E%3C/svg%3E';
                              }}
                            />
                          ) : (
                            <div className="w-28 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center">
                              <ImageIcon className="w-8 h-8 text-gray-400" />
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-bold text-gray-900 text-lg">{event.Plate}</span>
                        </td>
                        <td className="px-6 py-4">
                          <code className="text-xs bg-gray-100 px-3 py-1.5 rounded-lg font-mono font-bold border border-gray-200">{event.RFID_UID}</code>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700 font-medium">
                          {new Date(event.Timestamp).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700 font-medium">
                          {event.Location || 'N/A'}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-4 py-1.5 rounded-full text-xs font-bold border-2 shadow-sm ${
                            event.Status === 'GRANTED'
                              ? 'bg-green-100 text-green-700 border-green-300'
                              : 'bg-red-100 text-red-700 border-red-300'
                          }`}>
                            {event.Status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-3">
                            <button
                              onClick={() => handleViewSnapshot(event)}
                              className="p-2 text-purple-600 hover:bg-purple-100 rounded-xl transition-all hover:scale-110"
                              title="View Full Size"
                            >
                              <Eye className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleDownloadImage(event)}
                              className="p-2 text-green-600 hover:bg-green-100 rounded-xl transition-all hover:scale-110"
                              title="Download Image"
                            >
                              <Download className="w-5 h-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Enhanced Pagination */}
          {totalPages > 1 && (
            <div className="bg-white rounded-2xl shadow-lg px-6 py-4 flex items-center justify-between border-2 border-gray-100">
              <div className="text-sm text-gray-700 font-medium">
                Page <span className="font-bold text-purple-600">{currentPage}</span> of <span className="font-bold text-gray-900">{totalPages}</span>
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
                          ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-xl scale-110'
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
        </>
      )}

      {/* Enhanced Lightbox Modal */}
      {showLightbox && selectedSnapshot && (
        <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-50 p-4 backdrop-blur-lg animate-fade-in">
          <button
            onClick={() => setShowLightbox(false)}
            className="absolute top-6 right-6 text-white hover:text-gray-300 transition-colors z-10 p-3 rounded-full bg-white/10 hover:bg-white/20 shadow-2xl hover:scale-110"
          >
            <X className="w-8 h-8" />
          </button>

          <div className="max-w-7xl max-h-[90vh] w-full flex flex-col animate-scale-in">
            <img
              src={`${SNAPSHOT_BASE_URL}/${selectedSnapshot.Snapshot}`}
              alt={selectedSnapshot.Plate}
              className="max-w-full max-h-[75vh] object-contain mx-auto rounded-2xl shadow-2xl border-4 border-white/20"
            />

            <div className="bg-white mt-6 p-8 rounded-2xl shadow-2xl">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                  <p className="text-sm text-gray-600 mb-2 font-bold uppercase">Vehicle Plate</p>
                  <p className="font-bold text-2xl text-gray-900">{selectedSnapshot.Plate}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-2 font-bold uppercase">RFID Tag</p>
                  <p className="font-mono text-lg bg-gray-100 px-3 py-2 rounded-lg inline-block border border-gray-200 font-bold">{selectedSnapshot.RFID_UID}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-2 font-bold uppercase">Timestamp</p>
                  <p className="text-sm font-bold text-gray-900">{new Date(selectedSnapshot.Timestamp).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-2 font-bold uppercase">Status</p>
                  <span className={`inline-flex px-4 py-2 rounded-full text-sm font-bold border-2 shadow-md ${
                    selectedSnapshot.Status === 'GRANTED'
                      ? 'bg-green-100 text-green-700 border-green-300'
                      : 'bg-red-100 text-red-700 border-red-300'
                  }`}>
                    {selectedSnapshot.Status}
                  </span>
                </div>
              </div>

              <button
                onClick={() => handleDownloadImage(selectedSnapshot)}
                className="mt-8 flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all shadow-xl font-bold text-lg hover:scale-105 active:scale-95"
              >
                <Download className="w-6 h-6" />
                Download High Resolution Image
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper component for stat cards
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
          {React.cloneElement(icon, { className: 'w-12 h-12' })}
        </div>
      </div>
    </div>
  );
};

export default Snapshots;
