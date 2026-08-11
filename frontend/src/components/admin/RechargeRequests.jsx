import React, { useState, useMemo } from 'react';
import {
  Search, CheckCircle, XCircle, Clock,
  Eye, Filter, Calendar, User, CreditCard, AlertCircle, RefreshCw, Wallet,
  Sparkles, TrendingUp, ArrowRight
} from 'lucide-react';
import { API_BASE_URL } from '../../config';

// Simple formatter
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

const RechargeRequests = ({ rechargeRequests = [], users = [], refreshData, isConnected }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Memoize arrays
  const requestsArray = useMemo(
    () => (Array.isArray(rechargeRequests) ? rechargeRequests : []),
    [rechargeRequests]
  );
  const usersArray = useMemo(
    () => (Array.isArray(users) ? users : []),
    [users]
  );

  // Filter requests
  const filteredRequests = useMemo(() => {
    return requestsArray.filter(request => {
      const plateStr = String(request.plate || '');
      const matchesSearch = plateStr.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = filterStatus === 'all' || request.status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [requestsArray, searchQuery, filterStatus]);

  // Statistics
  const stats = useMemo(() => ({
    total: requestsArray.length,
    pending: requestsArray.filter(r => r.status === 'pending').length,
    approved: requestsArray.filter(r => r.status === 'approved').length,
    rejected: requestsArray.filter(r => r.status === 'rejected').length,
    totalAmount: requestsArray
      .filter(r => r.status === 'pending')
      .reduce((sum, r) => sum + (Number(r.amount) || 0), 0)
  }), [requestsArray]);

  const handleApprove = async (request) => {
    if (!window.confirm(`Approve recharge of ${fmt2(request.amount)} DA for ${request.plate}?`)) {
      return;
    }
    setProcessing(true);
    try {
      const response = await fetch(`${API_BASE_URL}/admin/recharge/${request.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        alert('✅ Recharge request approved successfully!');
        setShowModal(false);
        if (typeof refreshData === 'function') refreshData();
      } else {
        const error = await response.json().catch(() => ({}));
        alert('❌ Failed to approve request: ' + (error.message || 'Unknown error'));
      }
    } catch (error) {
      alert('❌ Failed to approve request: ' + error.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (request) => {
    if (!window.confirm('Are you sure you want to reject this recharge request?')) {
      return;
    }

    setProcessing(true);
    try {
      const response = await fetch(`${API_BASE_URL}/admin/recharge/${request.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Rejected by admin' })
      });

      if (response.ok) {
        alert('✅ Recharge request rejected successfully.');
        setShowModal(false);
        if (typeof refreshData === 'function') refreshData();
      } else {
        const error = await response.json().catch(() => ({}));
        alert('❌ Failed to reject request: ' + (error.message || 'Unknown error'));
      }
    } catch (error) {
      alert('❌ Failed to reject request: ' + error.message);
    } finally {
      setProcessing(false);
    }
  };

  const getUserInfo = (plate) => {
    return usersArray.find(u => String(u.plate) === String(plate));
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'approved': return 'bg-green-100 text-green-700 border-green-300';
      case 'rejected': return 'bg-red-100 text-red-700 border-red-300';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'approved': return <CheckCircle className="w-4 h-4" />;
      case 'rejected': return <XCircle className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Enhanced Header */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-2xl shadow-2xl p-8 text-white relative overflow-hidden">
        {/* Animated background orbs */}
        <div className="absolute inset-0 overflow-hidden opacity-20">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl -mr-48 -mt-48 animate-pulse" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-white rounded-full blur-3xl -ml-32 -mb-32 animate-pulse delay-700" />
        </div>

        <div className="relative flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Wallet className="w-10 h-10 animate-bounce" />
              <h2 className="text-4xl font-bold">Recharge Requests</h2>
              <Sparkles className="w-6 h-6 text-yellow-300 animate-pulse" />
            </div>
            <p className="text-indigo-100 text-lg">Review and approve user balance recharge requests</p>
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
              className="flex items-center gap-2 px-5 py-2.5 bg-white/20 hover:bg-white/30 rounded-full transition-all border-2 border-white/30 backdrop-blur-sm hover:scale-105 active:scale-95 shadow-lg"
            >
              <RefreshCw className="w-5 h-5" />
              <span className="font-semibold">Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Enhanced Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <StatCard
          label="Total Requests"
          value={stats.total}
          icon={<Wallet className="w-8 h-8" />}
          color="blue"
        />
        <StatCard
          label="Pending"
          value={stats.pending}
          icon={<Clock className="w-8 h-8" />}
          color="yellow"
        />
        <StatCard
          label="Approved"
          value={stats.approved}
          icon={<CheckCircle className="w-8 h-8" />}
          color="green"
        />
        <StatCard
          label="Rejected"
          value={stats.rejected}
          icon={<XCircle className="w-8 h-8" />}
          color="red"
        />
        <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-indigo-500 hover:shadow-2xl transition-all hover:scale-105 group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-gray-600 mb-2">Pending Amount</p>
              <p className="text-3xl font-bold text-indigo-600 tabular-nums">
                {fmt0(stats.totalAmount)} <span className="text-xl">DA</span>
              </p>
            </div>
            <div className="p-3 bg-indigo-100 rounded-2xl shadow-md group-hover:scale-110 transition-transform">
              <CreditCard className="w-8 h-8 text-indigo-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Filters */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-gray-100 hover:shadow-xl transition-all">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="md:col-span-2">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-indigo-600 transition-colors" />
              <input
                type="text"
                placeholder="Search by plate number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <div className="relative group">
              <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-indigo-600 transition-colors z-10" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 appearance-none font-medium cursor-pointer"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
        </div>

        <p className="text-sm text-gray-600 mt-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-indigo-500" />
          Showing <span className="font-bold text-indigo-600">{filteredRequests.length}</span> of <span className="font-bold text-gray-900">{requestsArray.length}</span> requests
        </p>
      </div>

      {/* Enhanced Requests Table */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden border-2 border-gray-100 hover:shadow-xl transition-all">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-gray-100 to-indigo-50 border-b-2 border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">ID</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">User</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Current Balance</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
                    <Wallet className="w-20 h-20 mx-auto mb-4 text-gray-300 animate-pulse" />
                    <p className="text-gray-600 font-bold text-lg">No recharge requests found</p>
                    <p className="text-gray-400 text-sm mt-2">
                      {requestsArray.length === 0
                        ? 'Requests will appear here once users submit them'
                        : 'Try adjusting your filters'
                      }
                    </p>
                  </td>
                </tr>
              ) : (
                filteredRequests.map((request) => {
                  const userInfo = getUserInfo(request.plate);
                  const currentBalance = Number(userInfo?.balance_da ?? userInfo?.balance ?? 0);
                  const reqAmount = Number(request.amount || 0);
                  return (
                    <tr key={request.id} className="hover:bg-indigo-50 transition-colors group">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <code className="text-sm font-mono font-bold text-gray-900 bg-gray-100 px-3 py-1 rounded-lg">
                          #{request.id}
                        </code>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-700 font-medium">
                          <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                          {request.request_date ? new Date(request.request_date).toLocaleDateString() : 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="p-2 bg-indigo-100 rounded-lg mr-3">
                            <User className="w-4 h-4 text-indigo-600" />
                          </div>
                          <div>
                            <p className="font-bold text-gray-900">{request.plate}</p>
                            {userInfo && (
                              <p className="text-xs text-gray-500 font-medium">{userInfo.owner_name || userInfo.owner}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`font-bold text-lg tabular-nums ${currentBalance < 100 ? 'text-red-600' : 'text-gray-900'}`}>
                          {fmt0(currentBalance)} DA
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center bg-indigo-50 px-3 py-1.5 rounded-lg w-fit">
                          <CreditCard className="w-4 h-4 text-indigo-600 mr-2" />
                          <span className="font-bold text-lg text-indigo-600 tabular-nums">+{fmt0(reqAmount)} DA</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-xs font-bold border-2 shadow-sm ${getStatusColor(request.status)}`}>
                          {getStatusIcon(request.status)}
                          <span className="ml-2 capitalize">{request.status}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setSelectedRequest(request);
                              setShowModal(true);
                            }}
                            className="p-2 text-indigo-600 hover:bg-indigo-100 rounded-xl transition-all hover:scale-110 shadow-sm"
                            title="View Details"
                          >
                            <Eye className="w-5 h-5" />
                          </button>
                          {request.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleApprove(request)}
                                disabled={processing}
                                className="p-2 text-green-600 hover:bg-green-100 rounded-xl transition-all hover:scale-110 disabled:opacity-50 shadow-sm"
                                title="Approve"
                              >
                                <CheckCircle className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => handleReject(request)}
                                disabled={processing}
                                className="p-2 text-red-600 hover:bg-red-100 rounded-xl transition-all hover:scale-110 disabled:opacity-50 shadow-sm"
                                title="Reject"
                              >
                                <XCircle className="w-5 h-5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Enhanced Request Details Modal */}
      {showModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl animate-scale-in max-h-[90vh] overflow-y-auto">
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <div className="p-4 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl mr-4 shadow-lg">
                    <Wallet className="w-10 h-10 text-white" />
                  </div>
                  <div>
                    <h3 className="text-3xl font-bold text-gray-900">Recharge Request</h3>
                    <p className="text-sm text-gray-500 font-medium">Request #{selectedRequest.id}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowModal(false);
                    setSelectedRequest(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 p-3 hover:bg-gray-100 rounded-xl transition-all hover:scale-110"
                >
                  <XCircle className="w-7 h-7" />
                </button>
              </div>

              {/* Request Information */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <InfoCard label="Request ID" value={`#${selectedRequest.id}`} mono />
                  <InfoCard
                    label="Date"
                    value={selectedRequest.request_date ? new Date(selectedRequest.request_date).toLocaleDateString() : 'N/A'}
                  />
                  <InfoCard label="Plate Number" value={selectedRequest.plate} bold />
                  <InfoCard
                    label="Owner"
                    value={getUserInfo(selectedRequest.plate)?.owner_name || getUserInfo(selectedRequest.plate)?.owner || 'N/A'}
                  />
                </div>

                {/* Balance Information */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-5 bg-blue-50 rounded-2xl border-2 border-blue-200 shadow-sm">
                    <p className="text-sm text-blue-700 mb-2 font-bold">Current Balance</p>
                    <p className="text-3xl font-bold text-blue-900 tabular-nums">
                      {fmt0(getUserInfo(selectedRequest.plate)?.balance_da ?? getUserInfo(selectedRequest.plate)?.balance ?? 0)} DA
                    </p>
                  </div>

                  <div className="p-5 bg-indigo-50 rounded-2xl border-2 border-indigo-200 shadow-sm flex items-center justify-center">
                    <ArrowRight className="w-12 h-12 text-indigo-600" />
                  </div>

                  <div className="p-5 bg-green-50 rounded-2xl border-2 border-green-200 shadow-sm">
                    <p className="text-sm text-green-700 mb-2 font-bold">New Balance</p>
                    <p className="text-3xl font-bold text-green-900 tabular-nums">
                      {fmt0((Number(getUserInfo(selectedRequest.plate)?.balance_da ?? getUserInfo(selectedRequest.plate)?.balance ?? 0)) + Number(selectedRequest.amount || 0))} DA
                    </p>
                  </div>
                </div>

                <div className="p-6 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl border-2 border-indigo-200 shadow-md text-center">
                  <p className="text-sm text-indigo-700 mb-3 font-bold">Recharge Amount</p>
                  <p className="text-5xl font-bold text-indigo-600 tabular-nums">
                    +{fmt0(selectedRequest.amount)} DA
                  </p>
                </div>

                <div className="flex items-center justify-between p-5 bg-gray-50 rounded-2xl">
                  <p className="text-sm text-gray-700 font-bold">Status</p>
                  <span className={`inline-flex items-center px-5 py-2 rounded-full text-sm font-bold border-2 shadow-md ${getStatusColor(selectedRequest.status)}`}>
                    {getStatusIcon(selectedRequest.status)}
                    <span className="ml-2 capitalize">{selectedRequest.status}</span>
                  </span>
                </div>

                {selectedRequest.status === 'rejected' && selectedRequest.rejection_reason && (
                  <div className="p-5 bg-red-50 border-2 border-red-300 rounded-2xl shadow-sm">
                    <p className="text-sm font-bold text-red-900 mb-2 flex items-center">
                      <XCircle className="w-5 h-5 mr-2" />
                      Rejection Reason:
                    </p>
                    <p className="text-sm text-red-700 font-medium">{selectedRequest.rejection_reason}</p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              {selectedRequest.status === 'pending' && (
                <div className="flex items-center justify-end gap-4 mt-8 pt-6 border-t-2 border-gray-200">
                  <button
                    onClick={() => {
                      setShowModal(false);
                      setSelectedRequest(null);
                    }}
                    className="px-6 py-3 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-all font-bold hover:scale-105"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleReject(selectedRequest)}
                    disabled={processing}
                    className="flex items-center px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all disabled:opacity-50 font-bold shadow-xl hover:scale-105 active:scale-95"
                  >
                    <XCircle className="w-5 h-5 mr-2" />
                    {processing ? 'Processing...' : 'Reject'}
                  </button>
                  <button
                    onClick={() => handleApprove(selectedRequest)}
                    disabled={processing}
                    className="flex items-center px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all disabled:opacity-50 font-bold shadow-xl hover:scale-105 active:scale-95"
                  >
                    <CheckCircle className="w-5 h-5 mr-2" />
                    {processing ? 'Processing...' : 'Approve'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper component for stat cards
const StatCard = ({ label, value, icon, color }) => {
  const colorMap = {
    blue: 'border-blue-500 bg-blue-100 text-blue-600',
    yellow: 'border-yellow-500 bg-yellow-100 text-yellow-600',
    green: 'border-green-500 bg-green-100 text-green-600',
    red: 'border-red-500 bg-red-100 text-red-600',
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 hover:shadow-2xl transition-all hover:scale-105 group" style={{ borderColor: color }}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-gray-600 mb-2">{label}</p>
          <p className="text-4xl font-bold text-gray-900 tabular-nums">{value}</p>
        </div>
        <div className={`p-3 rounded-2xl shadow-md group-hover:scale-110 transition-transform ${colorMap[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
};

// Helper component for info cards in modal
const InfoCard = ({ label, value, mono = false, bold = false }) => (
  <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
    <p className="text-xs text-gray-600 mb-1 font-semibold uppercase tracking-wide">{label}</p>
    <p className={`text-lg text-gray-900 ${mono ? 'font-mono' : ''} ${bold ? 'font-bold' : 'font-semibold'}`}>
      {value}
    </p>
  </div>
);

export default RechargeRequests;
