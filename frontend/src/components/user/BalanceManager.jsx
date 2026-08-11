import React, { useState, useMemo } from 'react';
import {
  Wallet as WalletIcon, TrendingUp, TrendingDown, Calendar,
  CreditCard, Clock, CheckCircle, XCircle, AlertCircle,
  Download, RefreshCw, Plus, ArrowUpRight, Receipt,
  BarChart3, Target, PieChart, Sparkles, Zap
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

const BalanceManager = ({
  balance = 0,
  transactions = [],
  rechargeHistory = [],
  isConnected,
  refreshData,
  userData
}) => {
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('month');

  const transactionsArray = useMemo(() => (Array.isArray(transactions) ? transactions : []), [transactions]);
  const rechargeArray = useMemo(() => (Array.isArray(rechargeHistory) ? rechargeHistory : []), [rechargeHistory]);

  const stats = useMemo(() => {
    const now = new Date();
    let periodTransactions = transactionsArray;

    if (selectedPeriod === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      periodTransactions = transactionsArray.filter((t) => new Date(t.Timestamp) >= weekAgo);
    } else if (selectedPeriod === 'month') {
      periodTransactions = transactionsArray.filter((t) => {
        const txDate = new Date(t.Timestamp);
        return txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear();
      });
    } else if (selectedPeriod === 'year') {
      periodTransactions = transactionsArray.filter((t) => {
        const txDate = new Date(t.Timestamp);
        return txDate.getFullYear() === now.getFullYear();
      });
    }

    const grantedTx = periodTransactions.filter((t) => t.Status === 'GRANTED');
    const totalSpent = grantedTx.reduce((sum, t) => sum + (Number(t.Fee_DA) || 0), 0);
    const totalRecharges = rechargeArray
      .filter((r) => r.status === 'approved')
      .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

    const avgSpendPerTrip = grantedTx.length > 0 ? totalSpent / grantedTx.length : 0;
    const daysInPeriod = selectedPeriod === 'week' ? 7 : selectedPeriod === 'month' ? 30 : selectedPeriod === 'year' ? 365 : 30;
    const avgSpendPerDay = totalSpent / daysInPeriod;
    const balNum = Number(balance) || 0;
    const daysUntilEmpty = avgSpendPerDay > 0 ? Math.floor(balNum / avgSpendPerDay) : 999;

    return {
      totalSpent,
      totalRecharges,
      avgSpendPerTrip,
      avgSpendPerDay,
      daysUntilEmpty,
      tripsCount: grantedTx.length,
    };
  }, [transactionsArray, rechargeArray, balance, selectedPeriod]);

  const handleRechargeRequest = async () => {
    const amount = Number(rechargeAmount);
    if (!Number.isFinite(amount) || amount < 10) {
      alert('⚠️ Minimum recharge amount is 10 DA');
      return;
    }
    if (amount > 1000000) {
      alert('⚠️ Maximum recharge amount is 1,000,000 DA');
      return;
    }
    setIsProcessing(true);
    try {
const response = await fetch(`${API_BASE_URL}/user/${userData?.plate}/recharge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          payment_method: paymentMethod
        })
      });
      if (response.ok) {
        alert(`✅ Recharge request for ${n0(amount)} DA submitted successfully!\nPayment method: ${paymentMethod}`);
        setShowRechargeModal(false);
        setRechargeAmount('');
        if (typeof refreshData === 'function') refreshData();
      } else {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to submit recharge request');
      }
    } catch (error) {
      alert('❌ Failed to submit recharge request: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const exportBalanceReport = () => {
    const headers = ['Period', 'Total_Spent_DA', 'Total_Recharges_DA', 'Avg_Per_Trip_DA', 'Avg_Per_Day_DA', 'Current_Balance_DA'];
    const data = [selectedPeriod, n2(stats.totalSpent), n2(stats.totalRecharges), n2(stats.avgSpendPerTrip), n2(stats.avgSpendPerDay), n2(balance)];
    const csv = [headers.join(','), data.join(',')].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `balance_report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getBalanceStatus = () => {
    const b = Number(balance) || 0;
    if (b < 50) return { text: 'Critical', color: 'red', icon: AlertCircle };
    if (b < 100) return { text: 'Low', color: 'orange', icon: AlertCircle };
    if (b < 500) return { text: 'Normal', color: 'blue', icon: CheckCircle };
    return { text: 'Good', color: 'green', icon: CheckCircle };
  };

  const balanceStatus = getBalanceStatus();
  const StatusIcon = balanceStatus.icon;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Enhanced Header with Gradient */}
      <div className="bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 rounded-2xl shadow-2xl p-8 text-white relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden opacity-20">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl -mr-48 -mt-48 animate-pulse" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-white rounded-full blur-3xl -ml-32 -mb-32 animate-pulse delay-700" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex-1 flex items-center">
            <div className="p-4 bg-white/20 backdrop-blur-sm rounded-2xl mr-4 shadow-lg">
              <WalletIcon className="w-10 h-10 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl md:text-4xl font-bold">Balance Manager</h1>
                <Sparkles className="w-6 h-6 text-yellow-300 animate-pulse" />
              </div>
              <p className="text-green-100 text-lg">Manage your toll account balance and recharge history</p>
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
                title="Refresh"
              >
                <RefreshCw className="w-6 h-6" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Enhanced Current Balance Card */}
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border-2 border-gray-100">
        <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 p-8 relative overflow-hidden">
          <div className="absolute inset-0 overflow-hidden opacity-10">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full blur-3xl -mr-32 -mt-32" />
          </div>

          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6 mb-6">
            <div className="text-center md:text-left">
              <p className="text-indigo-100 text-sm mb-2 font-bold uppercase tracking-wide">Current Balance</p>
              <h2 className="text-5xl md:text-6xl font-bold text-white mb-3 tabular-nums">
                {n2(balance)} DA
              </h2>
              <div className="flex items-center gap-2 justify-center md:justify-start">
                <StatusIcon className="w-6 h-6 text-white" />
                <span className="text-white font-bold text-lg">
                  Status: {balanceStatus.text}
                </span>
              </div>
            </div>
            <div className="text-center">
              <div className="w-28 h-28 md:w-36 md:h-36 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mb-4 shadow-2xl">
                <WalletIcon className="w-16 h-16 md:w-20 md:h-20 text-white" />
              </div>
              <button
                onClick={() => setShowRechargeModal(true)}
                className="flex items-center gap-2 px-6 py-3 bg-white text-indigo-600 rounded-xl font-bold hover:bg-indigo-50 transition-all shadow-2xl hover:scale-105 active:scale-95"
              >
                <Plus className="w-5 h-5" />
                Recharge Now
              </button>
            </div>
          </div>

          {stats.daysUntilEmpty < 30 && (
            <div className="relative z-10 bg-white/20 backdrop-blur-sm rounded-xl p-5 border-2 border-white/30">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-7 h-7 text-yellow-300 flex-shrink-0 mt-0.5 animate-pulse" />
                <div>
                  <p className="text-white font-bold mb-2 text-lg">⚠️ Balance Alert</p>
                  <p className="text-indigo-100 text-sm font-medium">
                    At current usage rate, your balance will last approximately{' '}
                    <span className="font-bold text-white">{stats.daysUntilEmpty} days</span>
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-gray-200">
          <QuickStat icon={<TrendingDown />} label="Total Spent" value={`${n0(stats.totalSpent)} DA`} subtext={`This ${selectedPeriod}`} color="red" />
          <QuickStat icon={<TrendingUp />} label="Recharges" value={`${n0(stats.totalRecharges)} DA`} subtext="All time" color="green" />
          <QuickStat icon={<Target />} label="Avg/Trip" value={`${n2(stats.avgSpendPerTrip)} DA`} subtext={`${stats.tripsCount} trips`} color="blue" />
          <QuickStat icon={<Calendar />} label="Avg/Day" value={`${n2(stats.avgSpendPerDay)} DA`} subtext="Daily usage" color="purple" />
        </div>
      </div>

      {/* Enhanced Period Selector & Actions */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-gray-100 hover:shadow-xl transition-all">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-gray-400" />
              <span className="text-sm text-gray-700 font-bold">View Period:</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              {['week', 'month', 'year', 'all'].map((period) => (
                <button
                  key={period}
                  onClick={() => setSelectedPeriod(period)}
                  className={`px-5 py-2.5 rounded-xl font-bold capitalize transition-all text-sm ${
                    selectedPeriod === period
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-xl scale-105'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:scale-105'
                  }`}
                >
                  {period === 'all' ? 'All Time' : period}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={exportBalanceReport}
            className="flex items-center gap-2 px-6 py-3 text-indigo-600 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-all font-bold hover:scale-105 shadow-md"
          >
            <Download className="w-5 h-5" />
            Export Report
          </button>
        </div>
      </div>

      {/* Recharge History & Usage Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Enhanced Recharge History */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-gray-100 hover:shadow-xl transition-all">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <div className="p-3 bg-indigo-100 rounded-xl">
                <Receipt className="w-6 h-6 text-indigo-600" />
              </div>
              Recent Recharges
            </h3>
          </div>
          {rechargeArray.length === 0 ? (
            <div className="text-center py-12">
              <CreditCard className="w-16 h-16 text-gray-300 mx-auto mb-4 animate-pulse" />
              <p className="text-gray-600 font-bold text-lg">No recharge history</p>
              <p className="text-gray-400 mt-2">Your recharges will appear here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {rechargeArray.slice(0, 5).map((recharge, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-5 bg-gray-50 rounded-xl hover:bg-gray-100 transition-all border-2 border-gray-200 hover:scale-102"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`p-3 rounded-xl ${
                        recharge.status === 'approved'
                          ? 'bg-green-100'
                          : recharge.status === 'pending'
                          ? 'bg-yellow-100'
                          : 'bg-red-100'
                      }`}
                    >
                      {recharge.status === 'approved' ? (
                        <CheckCircle className="w-6 h-6 text-green-600" />
                      ) : recharge.status === 'pending' ? (
                        <Clock className="w-6 h-6 text-yellow-600" />
                      ) : (
                        <XCircle className="w-6 h-6 text-red-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-lg">+{n0(recharge.amount)} DA</p>
                      <p className="text-xs text-gray-500 font-medium">{recharge.created_at ? new Date(recharge.created_at).toLocaleString() : 'N/A'}</p>
                    </div>
                  </div>
                  <span
                    className={`px-4 py-2 rounded-full text-xs font-bold border-2 ${
                      recharge.status === 'approved'
                        ? 'bg-green-100 text-green-700 border-green-300'
                        : recharge.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-700 border-yellow-300'
                        : 'bg-red-100 text-red-700 border-red-300'
                    }`}
                  >
                    {recharge.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Enhanced Usage Insights */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-gray-100 hover:shadow-xl transition-all">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <div className="p-3 bg-purple-100 rounded-xl">
                <PieChart className="w-6 h-6 text-purple-600" />
              </div>
              Usage Insights
            </h3>
          </div>
          <div className="space-y-4">
            <InsightCard
              icon={<ArrowUpRight />}
              title="Spending Pattern"
              text={`You spend an average of ${n2(stats.avgSpendPerTrip)} DA per trip`}
              gradient="from-blue-50 to-indigo-50"
              borderColor="blue-200"
              textColor="blue"
            />
            <InsightCard
              icon={<Calendar />}
              title="Daily Usage"
              text={`Average daily spending: ${n2(stats.avgSpendPerDay)} DA`}
              gradient="from-green-50 to-emerald-50"
              borderColor="green-200"
              textColor="green"
            />
            <InsightCard
              icon={<Target />}
              title="Recommended Action"
              text={balance < 100 ? '⚠️ Consider recharging soon to avoid service interruption' : balance < 500 ? '✓ Your balance is healthy. Monitor your usage regularly' : '✓ Excellent balance! You have sufficient funds'}
              gradient="from-purple-50 to-pink-50"
              borderColor="purple-200"
              textColor="purple"
            />
            {stats.daysUntilEmpty < 999 && (
              <InsightCard
                icon={<Clock />}
                title="Balance Projection"
                text={`Estimated ${stats.daysUntilEmpty} days until recharge needed`}
                gradient="from-orange-50 to-yellow-50"
                borderColor="orange-200"
                textColor="orange"
              />
            )}
          </div>
        </div>
      </div>

      {/* Enhanced Recharge Modal */}
      {showRechargeModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-md animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto animate-scale-in">
            <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 p-8 rounded-t-3xl relative overflow-hidden">
              <div className="absolute inset-0 opacity-20">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full blur-3xl -mr-32 -mt-32" />
              </div>
              <div className="relative z-10">
                <h3 className="text-3xl font-bold text-white mb-2">Recharge Account</h3>
                <p className="text-indigo-100 text-lg">Add funds to your toll account</p>
              </div>
            </div>

            <div className="p-8 space-y-6">
              <div className="p-5 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl border-2 border-gray-200 shadow-md">
                <p className="text-sm text-gray-600 mb-2 font-bold uppercase tracking-wide">Current Balance</p>
                <p className="text-5xl font-bold text-gray-900 tabular-nums">{n2(balance)} DA</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">
                  Recharge Amount (DA)
                </label>
                <div className="relative">
                  <WalletIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-6 h-6" />
                  <input
                    type="number"
                    value={rechargeAmount}
                    onChange={(e) => setRechargeAmount(e.target.value)}
                    className="w-full pl-14 pr-4 py-4 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 text-2xl font-bold"
                    placeholder="Enter amount (min 10)"
                    min="10"
                  />
                </div>
                <div className="grid grid-cols-5 gap-2 mt-4">
                  {[50, 100, 200, 500, 1000].map((amount) => (
                    <button
                      key={amount}
                      onClick={() => setRechargeAmount(String(amount))}
                      className="px-2 py-3 border-2 border-gray-300 rounded-xl hover:border-indigo-500 hover:bg-indigo-50 transition-all text-sm font-bold hover:scale-105"
                    >
                      {amount}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">
                  Payment Method
                </label>
                <div className="space-y-3">
                  <label className="flex items-center p-5 border-2 border-gray-300 rounded-xl cursor-pointer hover:bg-gray-50 transition-all">
                    <input
                      type="radio"
                      name="payment"
                      value="card"
                      checked={paymentMethod === 'card'}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="mr-4 w-5 h-5"
                    />
                    <CreditCard className="w-6 h-6 text-indigo-600 mr-3" />
                    <span className="font-bold text-lg">Credit/Debit Card</span>
                  </label>
                  <label className="flex items-center p-5 border-2 border-gray-300 rounded-xl cursor-pointer hover:bg-gray-50 transition-all">
                    <input
                      type="radio"
                      name="payment"
                      value="bank"
                      checked={paymentMethod === 'bank'}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="mr-4 w-5 h-5"
                    />
                    <WalletIcon className="w-6 h-6 text-green-600 mr-3" />
                    <span className="font-bold text-lg">Bank Transfer</span>
                  </label>
                </div>
              </div>

              {rechargeAmount && Number(rechargeAmount) > 0 && (
                <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl shadow-md">
                  <p className="text-sm text-green-700 mb-2 font-bold uppercase">New Balance After Recharge</p>
                  <p className="text-5xl font-bold text-green-900 tabular-nums">
                    {n2((Number(balance) || 0) + (Number(rechargeAmount) || 0))} DA
                  </p>
                </div>
              )}

              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setShowRechargeModal(false);
                    setRechargeAmount('');
                  }}
                  disabled={isProcessing}
                  className="flex-1 px-6 py-4 border-2 border-gray-300 rounded-xl hover:bg-gray-50 transition-all disabled:opacity-50 font-bold text-lg hover:scale-105"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRechargeRequest}
                  disabled={isProcessing}
                  className="flex-1 px-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2 font-bold shadow-2xl text-lg hover:scale-105 active:scale-95"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="w-6 h-6 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Zap className="w-6 h-6" />
                      Confirm
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper Components
const QuickStat = ({ icon, label, value, subtext, color }) => {
  const colors = {
    red: 'bg-red-100 text-red-600',
    green: 'bg-green-100 text-green-600',
    blue: 'bg-blue-100 text-blue-600',
    purple: 'bg-purple-100 text-purple-600'
  };

  return (
    <div className="p-6">
      <div className="flex items-center gap-2 mb-3">
        <div className={`p-2 rounded-lg ${colors[color]}`}>
          {React.cloneElement(icon, { className: 'w-5 h-5' })}
        </div>
        <p className="text-sm text-gray-600 font-bold">{label}</p>
      </div>
      <p className="text-2xl font-bold text-gray-900 mb-1 tabular-nums">{value}</p>
      <p className="text-xs text-gray-500 font-medium">{subtext}</p>
    </div>
  );
};

const InsightCard = ({ icon, title, text, gradient, borderColor, textColor }) => {
  return (
    <div className={`p-5 bg-gradient-to-r ${gradient} rounded-2xl border-2 border-${borderColor} shadow-sm hover:shadow-md transition-all`}>
      <div className="flex items-center gap-3 mb-3">
        {React.cloneElement(icon, { className: `w-6 h-6 text-${textColor}-600` })}
        <h4 className={`font-bold text-${textColor}-900 text-lg`}>{title}</h4>
      </div>
      <p className={`text-sm text-${textColor}-700 font-medium`}>{text}</p>
    </div>
  );
};

export default BalanceManager;
