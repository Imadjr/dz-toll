/* eslint-disable no-unused-vars */
import React, { useState, useMemo } from 'react';
import {
  Search, Filter, Calendar, Download, Eye, X,
  MapPin, Clock, CheckCircle, XCircle,
  ChevronLeft, ChevronRight, TrendingDown, BarChart3,
  FileText, Printer, RefreshCw, Camera, Wallet, Sparkles, Activity
} from 'lucide-react';
import { SNAPSHOT_BASE_URL } from '../../config';

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

const TransactionHistory = ({ transactions = [], isConnected, refreshData }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterLocation, setFilterLocation] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [viewMode, setViewMode] = useState('table');

  // Ensure transactions is an array
  const transactionsArray = useMemo(() => (Array.isArray(transactions) ? transactions : []), [transactions]);

  // Unique locations
  const locations = useMemo(() => {
    return [...new Set(transactionsArray.map(t => t?.Location).filter(Boolean))];
  }, [transactionsArray]);

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return transactionsArray.filter(tx => {
      if (!tx) return false;

      const matchesSearch =
        String(tx.Location || '').toLowerCase().includes(q) ||
        String(tx.RFID_UID || '').toLowerCase().includes(q) ||
        String(tx.Timestamp || '').toLowerCase().includes(q);

      const matchesStatus = filterStatus === 'all' || tx.Status === filterStatus;
      const matchesLocation = filterLocation === 'all' || tx.Location === filterLocation;

      let matchesDate = true;
      if (dateFrom || dateTo) {
        const txDate = tx.Timestamp ? new Date(tx.Timestamp) : null;
        if (txDate) {
          if (dateFrom) matchesDate = matchesDate && txDate >= new Date(dateFrom);
          if (dateTo) matchesDate = matchesDate && txDate <= new Date(`${dateTo}T23:59:59`);
        }
      }

      return matchesSearch && matchesStatus && matchesLocation && matchesDate;
    });
  }, [transactionsArray, searchQuery, filterStatus, filterLocation, dateFrom, dateTo]);

  // Statistics
  const stats = useMemo(() => {
    const granted = filteredTransactions.filter(t => t?.Status === 'GRANTED');
    const denied = filteredTransactions.filter(t => t?.Status === 'DENIED');
    const totalSpent = granted.reduce((sum, t) => sum + (Number(t.Fee_DA) || 0), 0);
    const avgFee = granted.length > 0 ? totalSpent / granted.length : 0;

    return {
      total: filteredTransactions.length,
      granted: granted.length,
      denied: denied.length,
      totalSpent,
      avgFee
    };
  }, [filteredTransactions]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / itemsPerPage));
  const paginatedTransactions = useMemo(() => {
    const page = Math.min(currentPage, totalPages);
    const startIndex = (page - 1) * itemsPerPage;
    return filteredTransactions.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredTransactions, currentPage, itemsPerPage, totalPages]);

  const handleExportCSV = () => {
    const headers = ['Date', 'Time', 'Location', 'Status', 'Fee_DA', 'Balance_Before', 'Balance_After', 'RFID_UID'];
    const csvData = [
      headers.join(','),
      ...filteredTransactions.map(tx => {
        const ts = tx.Timestamp ? new Date(tx.Timestamp) : null;
        const dateStr = ts ? ts.toISOString().split('T')[0] : '';
        const timeStr = ts ? ts.toISOString().split('T')[1].slice(0, 8) : '';
        return [
          dateStr,
          timeStr,
          (tx.Location || '').replace(/,/g, ' '),
          tx.Status || '',
          Number(tx.Fee_DA) || 0,
          Number(tx.Balance_Before) || 0,
          Number(tx.Balance_After) || 0,
          tx.RFID_UID || ''
        ].join(',');
      })
    ].join('\n');

    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transaction_history_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  const clearFilters = () => {
    setSearchQuery('');
    setFilterStatus('all');
    setFilterLocation('all');
    setDateFrom('');
    setDateTo('');
    setCurrentPage(1);
  };

  const viewTransactionDetails = (transaction) => {
    setSelectedTransaction(transaction);
    setShowDetailsModal(true);
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

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex-1 flex items-center">
            <div className="p-4 bg-white/20 backdrop-blur-sm rounded-2xl mr-4 shadow-lg">
              <FileText className="w-10 h-10 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl md:text-4xl font-bold">Transaction History</h1>
                <Sparkles className="w-6 h-6 text-yellow-300 animate-pulse" />
              </div>
              <p className="text-indigo-100 text-lg">Complete record of all your toll passages</p>
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
                title="Refresh Data"
              >
                <RefreshCw className="w-6 h-6" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Enhanced Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Total Transactions" value={stats.total} icon={<BarChart3 />} gradient="from-blue-500 to-cyan-600" />
        <StatCard label="Successful" value={stats.granted} icon={<CheckCircle />} gradient="from-green-500 to-emerald-600" />
        <StatCard label="Denied" value={stats.denied} icon={<XCircle />} gradient="from-red-500 to-rose-600" />
        <StatCard
          label="Total Spent"
          value={`${n2(stats.totalSpent)} DA`}
          icon={<TrendingDown />}
          gradient="from-purple-500 to-pink-600"
          footer={`Avg: ${n2(stats.avgFee)} DA`}
        />
      </div>

      {/* Enhanced Filters */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-gray-100 hover:shadow-xl transition-all">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {/* Search */}
          <div className="lg:col-span-2">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-indigo-600 transition-colors" />
              <input
                type="text"
                placeholder="Search by location, RFID, or date..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium transition-all"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <div className="relative group">
              <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-indigo-600 transition-colors" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 appearance-none font-medium"
              >
                <option value="all">All Status</option>
                <option value="GRANTED">✓ Granted</option>
                <option value="DENIED">✗ Denied</option>
              </select>
            </div>
          </div>

          {/* Location Filter */}
          <div>
            <div className="relative group">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-indigo-600 transition-colors" />
              <select
                value={filterLocation}
                onChange={(e) => setFilterLocation(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 appearance-none font-medium"
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
            <label className="block text-sm text-gray-700 mb-2 font-bold uppercase tracking-wide">From Date</label>
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
            <label className="block text-sm text-gray-700 mb-2 font-bold uppercase tracking-wide">To Date</label>
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
        </div>

        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-4 border-t-2 border-gray-200">
          <p className="text-sm text-gray-600 flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-500" />
            Showing <span className="font-bold text-indigo-600">{paginatedTransactions.length}</span> of <span className="font-bold text-gray-900">{filteredTransactions.length}</span> transactions
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={clearFilters}
              className="flex items-center gap-2 px-4 py-2.5 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-all font-semibold hover:scale-105"
            >
              <RefreshCw className="w-4 h-4" />
              Clear
            </button>

            {/* View Mode Toggle */}
            <div className="flex bg-gray-100 rounded-xl p-1 border-2 border-gray-200">
              <button
                onClick={() => setViewMode('table')}
                className={`px-4 py-2 rounded-lg transition-all font-semibold ${
                  viewMode === 'table' ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg scale-105' : 'text-gray-600 hover:text-gray-900'
                }`}
                title="Table View"
              >
                <FileText className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={`px-4 py-2 rounded-lg transition-all font-semibold ${
                  viewMode === 'cards' ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg scale-105' : 'text-gray-600 hover:text-gray-900'
                }`}
                title="Card View"
              >
                <BarChart3 className="w-5 h-5" />
              </button>
            </div>

            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2.5 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-all font-semibold hover:scale-105"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>

            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg font-bold hover:scale-105 active:scale-95"
            >
              <Download className="w-5 h-5" />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Transaction Display */}
      {filteredTransactions.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-lg p-16 text-center border-2 border-gray-100">
          <FileText className="w-20 h-20 text-gray-300 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600 text-xl font-bold mb-2">No transactions found</p>
          <p className="text-gray-400 text-lg">
            {transactionsArray.length === 0
              ? 'Your toll passages will appear here'
              : 'Try adjusting your filters'
            }
          </p>
        </div>
      ) : viewMode === 'table' ? (
        /* Enhanced Table View */
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden border-2 border-gray-100 hover:shadow-xl transition-all">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-100 to-indigo-50 border-b-2 border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Date & Time</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Location</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Fee</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Balance After</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paginatedTransactions.map((tx, index) => (
                  <tr key={index} className="hover:bg-indigo-50 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm font-medium">
                        <Clock className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />
                        <span className="text-gray-900">{tx.Timestamp ? new Date(tx.Timestamp).toLocaleString() : 'N/A'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm">
                        <MapPin className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />
                        <span className="font-bold text-gray-900">{tx.Location || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-xs font-bold border-2 shadow-sm ${
                        tx.Status === 'GRANTED' ? 'bg-green-100 text-green-700 border-green-300' : 'bg-red-100 text-red-700 border-red-300'
                      }`}>
                        {tx.Status === 'GRANTED' ? (
                          <CheckCircle className="w-3 h-3 mr-1" />
                        ) : (
                          <XCircle className="w-3 h-3 mr-1" />
                        )}
                        {tx.Status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-lg font-bold text-gray-900 tabular-nums">
                      {n0(tx.Fee_DA)} DA
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-lg font-bold text-gray-600 tabular-nums">
                      {n0(tx.Balance_After)} DA
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => viewTransactionDetails(tx)}
                        className="p-2 text-indigo-600 hover:bg-indigo-100 rounded-xl transition-all hover:scale-110 shadow-sm"
                        title="View Details"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Enhanced Card View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {paginatedTransactions.map((tx, index) => (
            <div key={index} className="bg-white rounded-2xl shadow-lg p-6 border-2 border-gray-100 hover:shadow-xl transition-all hover:scale-102">
              <div className="flex items-center justify-between mb-4">
                <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-xs font-bold border-2 shadow-sm ${
                  tx.Status === 'GRANTED' ? 'bg-green-100 text-green-700 border-green-300' : 'bg-red-100 text-red-700 border-red-300'
                }`}>
                  {tx.Status === 'GRANTED' ? <CheckCircle className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
                  {tx.Status}
                </span>
                <button
                  onClick={() => viewTransactionDetails(tx)}
                  className="p-2 text-indigo-600 hover:bg-indigo-100 rounded-xl transition-all hover:scale-110"
                >
                  <Eye className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex items-start">
                  <MapPin className="w-5 h-5 text-gray-400 mr-3 mt-1 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-gray-500 font-bold uppercase">Location</p>
                    <p className="font-bold text-gray-900 text-lg truncate">{tx.Location || 'N/A'}</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <Clock className="w-5 h-5 text-gray-400 mr-3 mt-1 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-gray-500 font-bold uppercase">Date & Time</p>
                    <p className="text-sm text-gray-900 font-medium">{tx.Timestamp ? new Date(tx.Timestamp).toLocaleString() : 'N/A'}</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <Wallet className="w-5 h-5 text-gray-400 mr-3 mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500 font-bold uppercase">Fee Charged</p>
                    <p className="text-2xl font-bold text-gray-900 tabular-nums">{n0(tx.Fee_DA)} DA</p>
                  </div>
                </div>

                <div className="pt-3 border-t-2 border-gray-100">
                  <p className="text-xs text-gray-500 font-bold uppercase mb-1">Balance After</p>
                  <p className="font-bold text-gray-900 text-xl tabular-nums">{n0(tx.Balance_After)} DA</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Enhanced Pagination */}
      {totalPages > 1 && (
        <div className="bg-white rounded-2xl shadow-lg px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-2 border-gray-100">
          <div className="text-sm text-gray-700 font-bold">
            Page <span className="text-indigo-600">{currentPage}</span> of <span className="text-gray-900">{totalPages}</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="flex items-center gap-1 px-5 py-2.5 border-2 border-gray-300 rounded-xl hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold hover:scale-105"
            >
              <ChevronLeft className="w-5 h-5" />
              Previous
            </button>

            {[...Array(Math.min(5, totalPages))].map((_, i) => {
              const pageNum = i + 1;
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`px-5 py-2.5 rounded-xl transition-all font-bold ${
                    currentPage === pageNum
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-xl scale-110'
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
              className="flex items-center gap-1 px-5 py-2.5 border-2 border-gray-300 rounded-xl hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold hover:scale-105"
            >
              Next
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Enhanced Transaction Details Modal */}
      {showDetailsModal && selectedTransaction && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-md animate-fade-in">
          <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl max-h-[90vh] overflow-y-auto animate-scale-in">
            <div className="p-6 border-b-2 border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="p-4 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl mr-4 shadow-lg">
                    <FileText className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-3xl font-bold text-gray-900">Transaction Details</h3>
                </div>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-gray-400 hover:text-gray-600 p-3 hover:bg-gray-100 rounded-xl transition-all hover:scale-110"
                >
                  <X className="w-7 h-7" />
                </button>
              </div>
            </div>

            <div className="p-8">
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div className="col-span-2 p-5 bg-gray-50 rounded-2xl border-2 border-gray-200 shadow-sm">
                  <p className="text-xs text-gray-600 mb-2 font-bold uppercase tracking-wide">Date & Time</p>
                  <p className="font-bold text-gray-900 text-xl break-words">{selectedTransaction.Timestamp ? new Date(selectedTransaction.Timestamp).toLocaleString() : 'N/A'}</p>
                </div>

                <div className="col-span-2 p-5 bg-gray-50 rounded-2xl border-2 border-gray-200 shadow-sm">
                  <p className="text-xs text-gray-600 mb-2 font-bold uppercase tracking-wide">Location</p>
                  <p className="font-bold text-gray-900 text-2xl truncate" title={selectedTransaction.Location}>{selectedTransaction.Location || 'N/A'}</p>
                </div>

                <div className="p-5 bg-gray-50 rounded-2xl border-2 border-gray-200 shadow-sm">
                  <p className="text-xs text-gray-600 mb-3 font-bold uppercase tracking-wide">Status</p>
                  <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-bold border-2 ${
                    selectedTransaction.Status === 'GRANTED' ? 'bg-green-100 text-green-700 border-green-300' : 'bg-red-100 text-red-700 border-red-300'
                  }`}>
                    {selectedTransaction.Status === 'GRANTED' ? <CheckCircle className="w-4 h-4 mr-1" /> : <XCircle className="w-4 h-4 mr-1" />}
                    {selectedTransaction.Status}
                  </span>
                </div>

                <div className="p-5 bg-gray-50 rounded-2xl border-2 border-gray-200 shadow-sm">
                  <p className="text-xs text-gray-600 mb-2 font-bold uppercase tracking-wide">RFID Card</p>
                  <p className="font-mono text-sm text-gray-900 break-all font-bold">{selectedTransaction.RFID_UID || 'N/A'}</p>
                </div>

                <div className="p-6 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl border-2 border-indigo-200 shadow-md">
                  <p className="text-sm text-indigo-700 mb-2 font-bold uppercase">Fee Charged</p>
                  <p className="text-4xl font-bold text-indigo-900 tabular-nums">{n0(selectedTransaction.Fee_DA)} DA</p>
                </div>

                <div className="p-6 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl border-2 border-blue-200 shadow-md">
                  <p className="text-sm text-blue-700 mb-2 font-bold uppercase">Balance Before</p>
                  <p className="text-3xl font-bold text-blue-900 tabular-nums">{n0(selectedTransaction.Balance_Before)} DA</p>
                </div>

                <div className="col-span-2 p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border-2 border-green-200 shadow-md">
                  <p className="text-sm text-green-700 mb-2 font-bold uppercase">Balance After Transaction</p>
                  <p className="text-5xl font-bold text-green-900 tabular-nums">{n0(selectedTransaction.Balance_After)} DA</p>
                </div>

                {selectedTransaction.Snapshot && (
                  <div className="col-span-2 p-5 bg-gray-50 rounded-2xl border-2 border-gray-200">
                    <p className="text-sm text-gray-700 mb-4 font-bold uppercase flex items-center gap-2">
                      <Camera className="w-5 h-5 text-indigo-600" />
                      Vehicle Snapshot
                    </p>
                    <img
                      src={`${SNAPSHOT_BASE_URL}/${selectedTransaction.Snapshot}`}
                      alt="Vehicle snapshot"
                      className="w-full rounded-2xl border-2 border-gray-200 shadow-2xl"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        const parent = e.target.parentElement;
                        const errorDiv = document.createElement('div');
                        errorDiv.className = 'p-12 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl text-center';
                        errorDiv.innerHTML = '<div class="flex flex-col items-center"><svg class="w-20 h-20 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg><p class="text-gray-600 font-bold text-lg">Snapshot not available</p></div>';
                        parent.appendChild(errorDiv);
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper Component
const StatCard = ({ label, value, icon, gradient, footer }) => {
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
        <p className="text-4xl md:text-5xl font-bold mb-2 tabular-nums">{value}</p>
        {footer && (
          <p className="text-sm opacity-90 font-medium">{footer}</p>
        )}
      </div>
    </div>
  );
};

export default TransactionHistory;
