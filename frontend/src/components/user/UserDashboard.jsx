import React, { useMemo, useState } from 'react';
import {
  CheckCircle, AlertCircle, Activity, Clock, Wallet as WalletIcon,
  TrendingUp, MapPin, Calendar, Download, Eye, ChevronRight,
  CreditCard, BarChart3, PieChart, RefreshCw, X, Sparkles, Zap
} from 'lucide-react';
import { API_BASE_URL } from '../../config';

// Helpers
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

const UserDashboard = ({ userData = {}, transactions = [], notifications = [], isConnected, refreshData }) => {
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('card');
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [showTransactionDetails, setShowTransactionDetails] = useState(false);

  // Memoize arrays
  const transactionsArray = useMemo(() => (Array.isArray(transactions) ? transactions : []), [transactions]);
  const notificationsArray = useMemo(() => (Array.isArray(notifications) ? notifications : []), [notifications]);

  const profile = userData || {};
  const balance = Number(userData?.balance_da ?? userData?.balance ?? 0) || 0;

  const recentTransactions = useMemo(() => {
    return [...transactionsArray]
      .sort((a, b) => new Date(b.Timestamp) - new Date(a.Timestamp))
      .slice(0, 5);
  }, [transactionsArray]);

  const recentNotifications = useMemo(() => {
    return [...notificationsArray]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 3);
  }, [notificationsArray]);

  const quickStats = useMemo(() => {
    const grantedTx = transactionsArray.filter(t => t.Status === 'GRANTED');
    const deniedTx = transactionsArray.filter(t => t.Status === 'DENIED');

    const totalSpent = grantedTx.reduce((sum, t) => sum + Number(t.Fee_DA || 0), 0);
    const granted = grantedTx.length;
    const denied = deniedTx.length;

    const now = new Date();
    const thisMonth = transactionsArray.filter(t => {
      const txDate = new Date(t.Timestamp);
      return txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear();
    });

    const monthlySpent = thisMonth
      .filter(t => t.Status === 'GRANTED')
      .reduce((sum, t) => sum + Number(t.Fee_DA || 0), 0);

    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thisWeek = transactionsArray.filter(t => new Date(t.Timestamp) >= weekAgo);

    const avgPerTrip = granted > 0 ? totalSpent / granted : 0;

    const locationCounts = {};
    transactionsArray.forEach(t => {
      const loc = t.Location || 'Unknown';
      locationCounts[loc] = (locationCounts[loc] || 0) + 1;
    });
    const mostVisited = Object.entries(locationCounts).sort((a, b) => b[1] - a[1])[0];

    return {
      totalSpent,
      granted,
      denied,
      total: transactionsArray.length,
      monthlyTrips: thisMonth.length,
      monthlySpent,
      weeklyTrips: thisWeek.length,
      avgPerTrip,
      mostVisited: mostVisited ? mostVisited[0] : 'N/A',
      mostVisitedCount: mostVisited ? mostVisited[1] : 0
    };
  }, [transactionsArray]);

  const handleRechargeRequest = async () => {
    const amount = Number(rechargeAmount);
    if (!Number.isFinite(amount) || amount < 10) {
      alert('Minimum recharge amount is 10 DA');
      return;
    }

    try {
      const userPlate = profile?.plate;

      if (!userPlate) {
        alert('Error: User plate not found. Please log in again.');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/user/${userPlate}/recharge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amount,
          paymentMethod: selectedPaymentMethod
        })
      });

      if (response.ok) {
        const paymentMethodText = selectedPaymentMethod === 'card' ? 'Credit/Debit Card' : 'Bank Transfer';
        alert(`✅ Recharge request for ${n0(amount)} DA submitted successfully!\nPayment method: ${paymentMethodText}`);
        setRechargeAmount('');
        setSelectedPaymentMethod('card');
        setShowRechargeModal(false);
        if (typeof refreshData === 'function') refreshData();
      } else {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || err.message || 'Failed to submit recharge request');
      }
    } catch (error) {
      alert('❌ Failed to submit recharge request: ' + error.message);
    }
  };

  const viewTransactionDetails = (transaction) => {
    setSelectedTransaction(transaction);
    setShowTransactionDetails(true);
  };

  const exportTransactions = () => {
    const csv = [
      ['Date', 'Location', 'Status', 'Fee_DA', 'Balance_After'],
      ...transactionsArray.map(t => [
        t.Timestamp || '',
        t.Location || 'N/A',
        t.Status || '',
        Number(t.Fee_DA) || 0,
        Number(t.Balance_After) || 0
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions_${profile?.plate || 'user'}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 p-6 animate-fade-in">
      {/* Enhanced Welcome Card with Gradient */}
      <div className="bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 rounded-2xl shadow-2xl p-8 text-white relative overflow-hidden">
        {/* Animated background orbs */}
        <div className="absolute inset-0 overflow-hidden opacity-20">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl -mr-48 -mt-48 animate-pulse" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-white rounded-full blur-3xl -ml-32 -mb-32 animate-pulse delay-700" />
        </div>

        <div className="relative z-10">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-3">
                <h2 className="text-3xl md:text-4xl font-bold break-words">
                  Welcome back, {profile?.owner_name || profile?.owner || 'User'}!
                </h2>
                <Sparkles className="w-7 h-7 text-yellow-300 animate-pulse flex-shrink-0" />
              </div>
              <p className="text-green-100 text-lg">Here&apos;s an overview of your toll account</p>
            </div>
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full flex-shrink-0 shadow-lg border-2 backdrop-blur-sm ${
              isConnected ? 'bg-green-500/30 border-green-300' : 'bg-red-500/30 border-red-300'
            }`}>
              <div className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-green-200' : 'bg-red-200'} animate-pulse`}></div>
              <span className="text-sm font-bold whitespace-nowrap">{isConnected ? 'Live' : 'Offline'}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setShowRechargeModal(true)}
              className="px-6 py-3 bg-white text-green-600 rounded-xl font-bold hover:bg-green-50 transition-all flex items-center gap-2 shadow-xl hover:scale-105 active:scale-95"
            >
              <WalletIcon className="w-5 h-5" />
              Recharge Account
            </button>
            <button
              onClick={exportTransactions}
              className="px-6 py-3 bg-green-700 text-white rounded-xl font-bold hover:bg-green-800 transition-all flex items-center gap-2 shadow-xl hover:scale-105 active:scale-95 border-2 border-green-500"
            >
              <Download className="w-5 h-5" />
              Export History
            </button>
            {refreshData && (
              <button
                onClick={refreshData}
                className="px-6 py-3 bg-green-700 text-white rounded-xl font-bold hover:bg-green-800 transition-all flex items-center gap-2 shadow-xl hover:scale-105 active:scale-95 border-2 border-green-500"
              >
                <RefreshCw className="w-5 h-5" />
                Refresh
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Enhanced Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          label="Current Balance"
          value={`${n2(balance)} DA`}
          icon={<WalletIcon />}
          gradient={balance < 100 ? "from-red-500 to-rose-600" : "from-green-500 to-emerald-600"}
          badge={balance < 100 ? "⚠️ Low" : null}
          footer={`Updated just now`}
        />
        <StatCard
          label="Total Trips"
          value={quickStats.total}
          icon={<Activity />}
          gradient="from-blue-500 to-cyan-600"
          footer={`${quickStats.weeklyTrips} this week`}
        />
        <StatCard
          label="Success Rate"
          value={`${quickStats.total > 0 ? ((quickStats.granted / quickStats.total) * 100).toFixed(1) : 0}%`}
          icon={<CheckCircle />}
          gradient="from-green-500 to-teal-600"
          footer={`${quickStats.granted} successful`}
        />
        <StatCard
          label="Total Spent"
          value={`${n2(quickStats.totalSpent)} DA`}
          icon={<BarChart3 />}
          gradient="from-purple-500 to-pink-600"
          footer={`Avg: ${n2(quickStats.avgPerTrip)} DA/trip`}
        />
      </div>

      {/* Monthly Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-gray-100 hover:shadow-xl transition-all">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-gray-900">This Month</h3>
            <div className="p-3 bg-blue-100 rounded-xl">
              <Calendar className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-4 bg-gray-50 rounded-xl border border-gray-200">
              <span className="text-sm text-gray-600 font-bold">Trips</span>
              <span className="font-bold text-gray-900 text-2xl tabular-nums">{quickStats.monthlyTrips}</span>
            </div>
            <div className="flex justify-between items-center p-4 bg-indigo-50 rounded-xl border-2 border-indigo-200">
              <span className="text-sm text-indigo-700 font-bold">Spent</span>
              <span className="font-bold text-indigo-900 text-2xl tabular-nums">{n2(quickStats.monthlySpent)} DA</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-gray-100 hover:shadow-xl transition-all">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-gray-900">Most Visited</h3>
            <div className="p-3 bg-green-100 rounded-xl">
              <MapPin className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="space-y-3">
            <p className="font-bold text-gray-900 text-2xl truncate">{quickStats.mostVisited}</p>
            <p className="text-sm text-gray-600 bg-green-50 px-4 py-2 rounded-xl inline-block border border-green-200">
              <span className="font-bold text-green-600 text-lg">{quickStats.mostVisitedCount}</span> visits
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-gray-100 hover:shadow-xl transition-all">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-gray-900">Statistics</h3>
            <div className="p-3 bg-purple-100 rounded-xl">
              <PieChart className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-4 bg-green-50 rounded-xl border-2 border-green-200">
              <span className="text-sm text-green-700 font-bold">Success Rate</span>
              <span className="font-bold text-green-900 text-2xl tabular-nums">
                {quickStats.total > 0 ? ((quickStats.granted / quickStats.total) * 100).toFixed(0) : 0}%
              </span>
            </div>
            <div className="flex justify-between items-center p-4 bg-red-50 rounded-xl border-2 border-red-200">
              <span className="text-sm text-red-700 font-bold">Denied</span>
              <span className="font-bold text-red-900 text-2xl tabular-nums">{quickStats.denied}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Account Info */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-gray-100">
        <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
          <div className="p-3 bg-indigo-100 rounded-xl mr-3">
            <CreditCard className="w-6 h-6 text-indigo-600" />
          </div>
          Account Information
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <InfoCard label="Plate Number" value={profile?.plate || 'N/A'} />
          <InfoCard label="RFID Card" value={profile?.rfid_uid || 'N/A'} mono />
          <div className="p-5 bg-gray-50 rounded-2xl border-2 border-gray-200">
            <p className="text-xs text-gray-600 mb-3 font-bold uppercase">Account Status</p>
            <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-bold border-2 ${
              profile?.is_active ? 'bg-green-100 text-green-800 border-green-300' : 'bg-red-100 text-red-800 border-red-300'
            }`}>
              {profile?.is_active ? '✓ Active' : '✗ Inactive'}
            </span>
          </div>
          <InfoCard label="Email" value={profile?.email || 'N/A'} />
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-100">
          <div className="p-6 border-b-2 border-gray-100">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900 flex items-center">
                <div className="p-2 bg-indigo-100 rounded-xl mr-3">
                  <Clock className="w-5 h-5 text-indigo-600" />
                </div>
                Recent Transactions
              </h3>
              <button className="text-sm text-indigo-600 hover:text-indigo-700 font-bold flex items-center hover:scale-105 transition-transform">
                View All
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="p-6">
            {recentTransactions.length === 0 ? (
              <div className="text-center py-12">
                <Activity className="w-16 h-16 mx-auto mb-4 text-gray-300 animate-pulse" />
                <p className="text-gray-600 font-bold text-lg">No transactions yet</p>
                <p className="text-gray-400 text-sm mt-2">Your toll passages will appear here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentTransactions.map((transaction, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-all cursor-pointer border-2 border-gray-200 hover:border-indigo-300 hover:scale-102"
                    onClick={() => viewTransactionDetails(transaction)}
                  >
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
                        transaction.Status === 'GRANTED' ? 'bg-green-500' : 'bg-red-500'
                      } animate-pulse`}></div>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-gray-900 flex items-center gap-2 truncate">
                          <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <span className="truncate">{transaction.Location || 'Lane-1'}</span>
                        </p>
                        <p className="text-xs text-gray-500 truncate font-medium">{new Date(transaction.Timestamp).toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-2">
                      <p className={`font-bold text-xl whitespace-nowrap tabular-nums ${
                        transaction.Status === 'GRANTED' ? 'text-gray-900' : 'text-red-600'
                      }`}>
                        {transaction.Status === 'GRANTED' ? `-${n0(transaction.Fee_DA)} DA` : '0 DA'}
                      </p>
                      <p className="text-xs text-gray-500 flex items-center justify-end gap-1 font-medium">
                        <Eye className="w-3 h-3" />
                        {transaction.Status}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-100">
          <div className="p-6 border-b-2 border-gray-100">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900 flex items-center">
                <div className="p-2 bg-orange-100 rounded-xl mr-3">
                  <AlertCircle className="w-5 h-5 text-orange-600" />
                </div>
                Notifications
              </h3>
              <button className="text-sm text-indigo-600 hover:text-indigo-700 font-bold hover:scale-105 transition-transform">
                Mark all read
              </button>
            </div>
          </div>
          <div className="p-6">
            {recentNotifications.length === 0 ? (
              <div className="text-center py-12">
                <AlertCircle className="w-16 h-16 mx-auto mb-4 text-gray-300 animate-pulse" />
                <p className="text-gray-600 font-bold text-lg">No notifications</p>
                <p className="text-gray-400 text-sm mt-2">You&apos;re all caught up!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentNotifications.map((notification, index) => (
                  <div key={index} className={`p-5 rounded-xl border-2 shadow-sm hover:shadow-md transition-all ${
                    notification.type === 'warning'
                      ? 'bg-orange-50 border-orange-300'
                      : notification.type === 'success'
                      ? 'bg-green-50 border-green-300'
                      : 'bg-blue-50 border-blue-300'
                  }`}>
                    <h4 className={`font-bold mb-2 truncate ${
                      notification.type === 'warning'
                        ? 'text-orange-900'
                        : notification.type === 'success'
                        ? 'text-green-900'
                        : 'text-blue-900'
                    }`}>
                      {notification.title}
                    </h4>
                    <p className={`text-sm break-words ${
                      notification.type === 'warning'
                        ? 'text-orange-700'
                        : notification.type === 'success'
                        ? 'text-green-700'
                        : 'text-blue-700'
                    }`}>
                      {notification.message}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Low Balance Alert */}
      {balance < 100 && (
        <div className="bg-gradient-to-r from-red-50 via-orange-50 to-red-50 border-2 border-red-300 rounded-2xl p-8 shadow-2xl animate-pulse-slow">
          <div className="flex flex-col sm:flex-row items-start gap-4">
            <AlertCircle className="w-8 h-8 text-red-600 flex-shrink-0 animate-pulse" />
            <div className="flex-1 min-w-0">
              <h3 className="text-2xl font-bold text-red-900 mb-3">⚠️ Low Balance Warning</h3>
              <p className="text-red-700 mb-6 break-words text-lg">
                Your current balance is <span className="font-bold">{n2(balance)} DA</span>. Please recharge soon to avoid service interruption.
                Recommended minimum balance: <span className="font-bold">100 DA</span>
              </p>
              <button
                onClick={() => setShowRechargeModal(true)}
                className="px-8 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all font-bold flex items-center gap-2 shadow-xl hover:scale-105 active:scale-95"
              >
                <Zap className="w-5 h-5" />
                Recharge Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Recharge Modal */}
      {showRechargeModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-md animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto animate-scale-in">
            <div className="p-6 border-b-2 border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center flex-1 min-w-0 mr-4">
                  <div className="p-4 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl mr-4 flex-shrink-0 shadow-lg">
                    <WalletIcon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-3xl font-bold text-gray-900 truncate">Recharge Account</h3>
                </div>
                <button
                  onClick={() => {
                    setShowRechargeModal(false);
                    setRechargeAmount('');
                    setSelectedPaymentMethod('card');
                  }}
                  className="text-gray-400 hover:text-gray-600 p-3 hover:bg-gray-100 rounded-xl transition-all flex-shrink-0 hover:scale-110"
                >
                  <X className="w-7 h-7" />
                </button>
              </div>
            </div>

            <div className="p-8">
              {/* Current Balance Display */}
              <div className="mb-6 p-5 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl border-2 border-gray-200 shadow-md">
                <label className="block text-sm font-bold text-gray-600 mb-2 uppercase tracking-wide">Current Balance</label>
                <p className="text-5xl font-bold text-gray-900 tabular-nums">{n2(balance)} DA</p>
              </div>

              {/* Recharge Amount Input */}
              <div className="mb-6">
                <label className="block text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">Recharge Amount (DA)</label>
                <div className="relative">
                  <WalletIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-6 h-6" />
                  <input
                    type="number"
                    value={rechargeAmount}
                    onChange={(e) => setRechargeAmount(e.target.value)}
                    className="w-full pl-14 pr-4 py-4 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-green-500/20 focus:border-green-500 text-2xl font-bold"
                    placeholder="Enter amount (min 10)"
                    min="10"
                  />
                </div>
              </div>

              {/* Quick Amount Buttons */}
              <div className="grid grid-cols-5 gap-2 mb-6">
                {[50, 100, 200, 500, 1000].map(amount => (
                  <button
                    key={amount}
                    onClick={() => setRechargeAmount(String(amount))}
                    className="px-2 py-3 border-2 border-gray-300 rounded-xl hover:border-green-500 hover:bg-green-50 transition-all text-sm font-bold text-gray-700 hover:text-green-700 hover:scale-105"
                  >
                    {amount}
                  </button>
                ))}
              </div>

              {/* Payment Method Selection */}
              <div className="mb-6">
                <label className="block text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">Payment Method</label>
                <div className="space-y-3">
                  <button
                    onClick={() => setSelectedPaymentMethod('card')}
                    className={`w-full p-5 rounded-xl border-2 transition-all text-left flex items-center gap-4 ${
                      selectedPaymentMethod === 'card'
                        ? 'border-green-500 bg-green-50 shadow-lg scale-102'
                        : 'border-gray-300 bg-white hover:border-gray-400'
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                      selectedPaymentMethod === 'card' ? 'border-green-500' : 'border-gray-400'
                    }`}>
                      {selectedPaymentMethod === 'card' && (
                        <div className="w-3.5 h-3.5 rounded-full bg-green-500"></div>
                      )}
                    </div>
                    <CreditCard className={`w-6 h-6 flex-shrink-0 ${
                      selectedPaymentMethod === 'card' ? 'text-green-600' : 'text-gray-600'
                    }`} />
                    <span className={`font-bold text-lg ${
                      selectedPaymentMethod === 'card' ? 'text-green-900' : 'text-gray-700'
                    }`}>
                      Credit/Debit Card
                    </span>
                  </button>

                  <button
                    onClick={() => setSelectedPaymentMethod('bank_transfer')}
                    className={`w-full p-5 rounded-xl border-2 transition-all text-left flex items-center gap-4 ${
                      selectedPaymentMethod === 'bank_transfer'
                        ? 'border-green-500 bg-green-50 shadow-lg scale-102'
                        : 'border-gray-300 bg-white hover:border-gray-400'
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                      selectedPaymentMethod === 'bank_transfer' ? 'border-green-500' : 'border-gray-400'
                    }`}>
                      {selectedPaymentMethod === 'bank_transfer' && (
                        <div className="w-3.5 h-3.5 rounded-full bg-green-500"></div>
                      )}
                    </div>
                    <WalletIcon className={`w-6 h-6 flex-shrink-0 ${
                      selectedPaymentMethod === 'bank_transfer' ? 'text-green-600' : 'text-gray-600'
                    }`} />
                    <span className={`font-bold text-lg ${
                      selectedPaymentMethod === 'bank_transfer' ? 'text-green-900' : 'text-gray-700'
                    }`}>
                      Bank Transfer
                    </span>
                  </button>
                </div>
              </div>

              {/* New Balance Preview */}
              {rechargeAmount && Number(rechargeAmount) >= 10 && (
                <div className="mb-6 p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border-2 border-green-300 shadow-md">
                  <label className="block text-sm font-bold text-green-700 mb-2 uppercase tracking-wide">New Balance After Recharge</label>
                  <p className="text-4xl font-bold text-green-900 tabular-nums">
                    {n2(balance + Number(rechargeAmount))} DA
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setShowRechargeModal(false);
                    setRechargeAmount('');
                    setSelectedPaymentMethod('card');
                  }}
                  className="flex-1 px-6 py-4 border-2 border-gray-300 rounded-xl hover:bg-gray-50 transition-all font-bold text-gray-700 text-lg hover:scale-105"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRechargeRequest}
                  disabled={!rechargeAmount || Number(rechargeAmount) < 10}
                  className={`flex-1 px-6 py-4 rounded-xl transition-all font-bold shadow-xl flex items-center justify-center gap-2 text-lg ${
                    !rechargeAmount || Number(rechargeAmount) < 10
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700 hover:scale-105 active:scale-95'
                  }`}
                >
                  <CheckCircle className="w-6 h-6" />
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transaction Details Modal */}
      {showTransactionDetails && selectedTransaction && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-md animate-fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto animate-scale-in">
            <div className="p-6 border-b-2 border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center flex-1 min-w-0 mr-4">
                  <div className="p-4 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl mr-4 flex-shrink-0 shadow-lg">
                    <Activity className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-3xl font-bold text-gray-900 truncate">Transaction Details</h3>
                </div>
                <button
                  onClick={() => setShowTransactionDetails(false)}
                  className="text-gray-400 hover:text-gray-600 p-3 hover:bg-gray-100 rounded-xl transition-all flex-shrink-0 hover:scale-110"
                >
                  <X className="w-7 h-7" />
                </button>
              </div>
            </div>
            <div className="p-8 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 p-5 bg-gray-50 rounded-2xl border-2 border-gray-200">
                  <p className="text-xs text-gray-600 mb-2 font-bold uppercase">Date & Time</p>
                  <p className="font-bold text-gray-900 text-lg break-words">{new Date(selectedTransaction.Timestamp).toLocaleString()}</p>
                </div>
                <div className="col-span-2 p-5 bg-gray-50 rounded-2xl border-2 border-gray-200">
                  <p className="text-xs text-gray-600 mb-2 font-bold uppercase">Location</p>
                  <p className="font-bold text-gray-900 text-xl truncate" title={selectedTransaction.Location}>{selectedTransaction.Location || 'N/A'}</p>
                </div>
                <div className="p-5 bg-gray-50 rounded-2xl border-2 border-gray-200">
                  <p className="text-xs text-gray-600 mb-3 font-bold uppercase">Status</p>
                  <span className={`inline-flex px-4 py-2 rounded-full text-sm font-bold border-2 ${
                    selectedTransaction.Status === 'GRANTED' ? 'bg-green-100 text-green-800 border-green-300' : 'bg-red-100 text-red-800 border-red-300'
                  }`}>
                    {selectedTransaction.Status}
                  </span>
                </div>
                <div className="p-5 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl border-2 border-indigo-200">
                  <p className="text-xs text-indigo-700 mb-2 font-bold uppercase">Fee Charged</p>
                  <p className="font-bold text-indigo-900 text-3xl tabular-nums">{n0(selectedTransaction.Fee_DA)} DA</p>
                </div>
                <div className="p-5 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl border-2 border-blue-200">
                  <p className="text-xs text-blue-700 mb-2 font-bold uppercase">Balance Before</p>
                  <p className="font-bold text-blue-900 text-3xl tabular-nums">{n0(selectedTransaction.Balance_Before)} DA</p>
                </div>
                <div className="p-5 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border-2 border-green-200">
                  <p className="text-xs text-green-700 mb-2 font-bold uppercase">Balance After</p>
                  <p className="font-bold text-green-900 text-3xl tabular-nums">{n0(selectedTransaction.Balance_After)} DA</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper Components
const StatCard = ({ label, value, icon, gradient, badge, footer }) => {
  return (
    <div className={`bg-gradient-to-br ${gradient} rounded-2xl shadow-2xl p-6 text-white relative overflow-hidden hover:scale-105 transition-transform duration-300 group`}>
      <div className="absolute inset-0 overflow-hidden opacity-20">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white rounded-full blur-3xl -mr-20 -mt-20 group-hover:opacity-30 transition-opacity" />
      </div>

      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl shadow-lg group-hover:scale-110 transition-transform">
            {React.cloneElement(icon, { className: 'w-7 h-7' })}
          </div>
          {badge && (
            <span className="text-xs font-bold bg-white/30 px-3 py-1 rounded-full animate-pulse border border-white/50">
              {badge}
            </span>
          )}
        </div>
        <h3 className="text-sm opacity-90 mb-2 font-semibold">{label}</h3>
        <p className="text-4xl md:text-5xl font-bold mb-3 tabular-nums">{value}</p>
        {footer && (
          <div className="flex items-center text-xs opacity-90">
            <TrendingUp className="w-3 h-3 mr-1 flex-shrink-0" />
            <span className="truncate">{footer}</span>
          </div>
        )}
      </div>
    </div>
  );
};

const InfoCard = ({ label, value, mono }) => {
  return (
    <div className="p-5 bg-gray-50 rounded-2xl border-2 border-gray-200 hover:shadow-md transition-shadow">
      <p className="text-xs text-gray-600 mb-2 font-bold uppercase tracking-wide">{label}</p>
      <p className={`text-lg text-gray-900 font-bold truncate ${mono ? 'font-mono' : ''}`} title={value}>
        {value}
      </p>
    </div>
  );
};

export default UserDashboard;
