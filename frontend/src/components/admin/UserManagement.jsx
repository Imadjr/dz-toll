import React, { useState, useMemo } from 'react';
import {
  Users, Search, Plus, Edit, Trash2,
  Eye, CheckCircle, XCircle,
  Download, Mail, Phone, CreditCard,
  AlertTriangle, X, RefreshCw, Wallet,
  Sparkles, UserCheck, Activity
} from 'lucide-react';
import { API_BASE_URL } from '../../config';

// Helper to safely convert to number
const n0 = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n);
};

const UserManagement = ({ users = [], refreshData, isConnected }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterBalance, setFilterBalance] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [sortBy, setSortBy] = useState('plate');
  const [sortOrder, setSortOrder] = useState('asc');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    plateNumber: '',
    rfidUid: '',
    ownerName: '',
    email: '',
    phone: '',
    initialBalance: 0,
    active: true,
    vehicleType: 'Car'
  });

  // Memoize users array
  const usersArray = useMemo(() => (Array.isArray(users) ? users : []), [users]);

  // Filter and sort users
  const filteredUsers = useMemo(() => {
    let filtered = usersArray.filter(user => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        user.plate?.toLowerCase().includes(q) ||
        user.owner_name?.toLowerCase().includes(q) ||
        user.email?.toLowerCase().includes(q) ||
        user.rfid_uid?.toLowerCase().includes(q);

      const matchesStatus =
        filterStatus === 'all' ||
        (filterStatus === 'active' && user.is_active) ||
        (filterStatus === 'inactive' && !user.is_active);

      const bal = Number(user.balance_da) || 0;
      const matchesBalance =
        filterBalance === 'all' ||
        (filterBalance === 'low' && bal < 100) ||
        (filterBalance === 'medium' && bal >= 100 && bal < 500) ||
        (filterBalance === 'high' && bal >= 500);

      return matchesSearch && matchesStatus && matchesBalance;
    });

    filtered.sort((a, b) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];

      if (aVal === undefined || aVal === null) aVal = '';
      if (bVal === undefined || bVal === null) bVal = '';

      const aNum = Number(aVal);
      const bNum = Number(bVal);
      const bothNumeric = Number.isFinite(aNum) && Number.isFinite(bNum);

      if (bothNumeric) {
        return sortOrder === 'asc' ? aNum - bNum : bNum - aNum;
      }

      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();
      if (aStr < bStr) return sortOrder === 'asc' ? -1 : 1;
      if (aStr > bStr) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [usersArray, searchQuery, filterStatus, filterBalance, sortBy, sortOrder]);

  // Stats
  const stats = useMemo(() => ({
    total: usersArray.length,
    active: usersArray.filter(u => u.is_active).length,
    inactive: usersArray.filter(u => !u.is_active).length,
    lowBalance: usersArray.filter(u => (Number(u.balance_da) || 0) < 100).length,
    totalBalance: usersArray.reduce((sum, u) => sum + (Number(u.balance_da) || 0), 0)
  }), [usersArray]);

  // Validate form
  const validateForm = () => {
    const errors = [];
    if (!formData.plateNumber?.trim()) errors.push('Plate Number is required');
    if (!formData.rfidUid?.trim()) errors.push('RFID UID is required');
    if (!formData.ownerName?.trim()) errors.push('Owner Name is required');
    if (!formData.email?.trim()) errors.push('Email is required');
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.push('Invalid email format');
    }
    return errors;
  };

  const handleAddUser = async () => {
    const errors = validateForm();
    if (errors.length > 0) {
      alert('Validation Error:\n' + errors.join('\n'));
      return;
    }

    setIsSubmitting(true);
    try {
      const userData = {
        plateNumber: formData.plateNumber.trim(),
        rfidUid: formData.rfidUid.trim(),
        ownerName: formData.ownerName.trim(),
        email: formData.email.trim(),
        phone: formData.phone?.trim() || '',
        initialBalance: parseFloat(formData.initialBalance) || 0,
        vehicleType: formData.vehicleType || 'Car',
        active: formData.active
      };

      // eslint-disable-next-line no-console
      console.log('🔵 Adding user with data:', userData);

      const response = await fetch(`${API_BASE_URL}/admin/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });

      if (response.ok) {
        alert('✅ User added successfully!');
        setShowAddModal(false);
        resetForm();
        refreshData && refreshData();
      } else {
        const error = await response.json().catch(() => ({}));
        alert(`Failed to add user:\n${error.error || error.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('❌ Add user error:', error);
      alert(`Failed to add user:\n${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateUser = async () => {
    const errors = validateForm();
    if (errors.length > 0) {
      alert('Validation Error:\n' + errors.join('\n'));
      return;
    }

    setIsSubmitting(true);
    try {
      const userData = {
        plateNumber: formData.plateNumber.trim(),
        rfidUid: formData.rfidUid.trim(),
        ownerName: formData.ownerName.trim(),
        email: formData.email.trim(),
        phone: formData.phone?.trim() || '',
        initialBalance: parseFloat(formData.initialBalance) || 0,
        vehicleType: formData.vehicleType || 'Car',
        active: formData.active
      };

      // eslint-disable-next-line no-console
      console.log('🔵 Updating user:', selectedUser.plate, userData);


      const response = await fetch(`${API_BASE_URL}/admin/users/${selectedUser.plate}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });

      if (response.ok) {
        alert('✅ User updated successfully!');
        setShowEditModal(false);
        setSelectedUser(null);
        resetForm();
        refreshData && refreshData();
      } else {
        const error = await response.json().catch(() => ({}));
        alert(`Failed to update user:\n${error.error || error.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('❌ Update user error:', error);
      alert(`Failed to update user:\n${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (plate) => {
    if (!window.confirm(`Are you sure you want to delete user with plate "${plate}"?`)) return;

    try {
      const response = await fetch(`${API_BASE_URL}/admin/users/${plate}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        alert('✅ User deleted successfully!');
        refreshData && refreshData();
      } else {
        const error = await response.json().catch(() => ({}));
        alert(`Failed to delete user:\n${error.error || error.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('❌ Delete user error:', error);
      alert(`Failed to delete user:\n${error.message}`);
    }
  };

  const handleToggleStatus = async (user) => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/users/${user.plate}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !user.is_active })
      });

      if (response.ok) {
        refreshData && refreshData();
      } else {
        alert('Failed to update user status');
      }
    } catch (error) {
      console.error('❌ Toggle status error:', error);
      alert('Failed to update user status');
    }
  };

  const handleExportCSV = () => {
    const headers = ['Plate', 'RFID_UID', 'Owner', 'Email', 'Phone', 'Balance_DA', 'Status', 'Vehicle_Type'];
    const rows = filteredUsers.map(u => [
      u.plate || '',
      u.rfid_uid || '',
      u.owner_name || '',
      u.email || '',
      u.phone || '',
      Number(u.balance_da) || 0,
      u.is_active ? 'Active' : 'Inactive',
      u.vehicle_type || 'Car'
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const resetForm = () => {
    setFormData({
      plateNumber: '',
      rfidUid: '',
      ownerName: '',
      email: '',
      phone: '',
      initialBalance: 0,
      active: true,
      vehicleType: 'Car'
    });
  };

  const openEditModal = (user) => {
    setSelectedUser(user);
    setFormData({
      plateNumber: user.plate || '',
      rfidUid: user.rfid_uid || '',
      ownerName: user.owner_name || '',
      email: user.email || '',
      phone: user.phone || '',
      initialBalance: Number(user.balance_da) || 0,
      active: !!user.is_active,
      vehicleType: user.vehicle_type || 'Car'
    });
    setShowEditModal(true);
  };

  const openDetailsModal = (user) => {
    setSelectedUser(user);
    setShowDetailsModal(true);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Enhanced Header with Gradient */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 rounded-2xl shadow-2xl p-8 text-white relative overflow-hidden">
        {/* Animated background orbs */}
        <div className="absolute inset-0 overflow-hidden opacity-20">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl -mr-48 -mt-48 animate-pulse" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-white rounded-full blur-3xl -ml-32 -mb-32 animate-pulse delay-700" />
        </div>

        <div className="relative flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center">
            <div className="p-4 bg-white/20 backdrop-blur-sm rounded-2xl mr-4 shadow-lg">
              <UserCheck className="w-10 h-10 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-4xl font-bold">User Management</h2>
                <Sparkles className="w-6 h-6 text-yellow-300 animate-pulse" />
              </div>
              <p className="text-emerald-100 text-lg">Manage registered toll system users</p>
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <StatCard label="Total Users" value={stats.total} icon={<Users />} gradient="from-blue-500 to-cyan-600" />
        <StatCard label="Active" value={stats.active} icon={<CheckCircle />} gradient="from-green-500 to-emerald-600" />
        <StatCard label="Inactive" value={stats.inactive} icon={<XCircle />} gradient="from-red-500 to-rose-600" />
        <StatCard label="Low Balance" value={stats.lowBalance} icon={<AlertTriangle />} gradient="from-orange-500 to-amber-600" />
        <StatCard label="Total Balance" value={`${n0(stats.totalBalance)} DA`} icon={<Wallet />} gradient="from-indigo-500 to-purple-600" />
      </div>

      {/* Enhanced Filters and Actions */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-gray-100 hover:shadow-xl transition-all">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
          {/* Search */}
          <div className="md:col-span-2">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-emerald-600 transition-colors" />
              <input
                type="text"
                placeholder="Search by plate, name, email, or RFID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium transition-all"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 appearance-none font-medium"
            >
              <option value="all">All Status</option>
              <option value="active">✓ Active</option>
              <option value="inactive">✗ Inactive</option>
            </select>
          </div>

          {/* Balance Filter */}
          <div>
            <select
              value={filterBalance}
              onChange={(e) => setFilterBalance(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 appearance-none font-medium"
            >
              <option value="all">All Balance</option>
              <option value="low">&lt; 100 DA</option>
              <option value="medium">100-500 DA</option>
              <option value="high">&gt; 500 DA</option>
            </select>
          </div>

          {/* Sort */}
          <div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 appearance-none font-medium"
            >
              <option value="plate">📋 Plate</option>
              <option value="owner_name">👤 Name</option>
              <option value="balance_da">💰 Balance</option>
              <option value="email">📧 Email</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t-2 border-gray-200">
          <p className="text-sm text-gray-600 flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-500" />
            Showing <span className="font-bold text-emerald-600">{filteredUsers.length}</span> of <span className="font-bold text-gray-900">{usersArray.length}</span> users
          </p>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="px-5 py-2.5 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-all font-semibold hover:scale-105"
            >
              {sortOrder === 'asc' ? '↑ Asc' : '↓ Desc'}
            </button>

            <button
              onClick={handleExportCSV}
              className="flex items-center px-5 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg font-semibold hover:scale-105 active:scale-95"
            >
              <Download className="w-5 h-5 mr-2" />
              Export CSV
            </button>

            <button
              onClick={() => {
                resetForm();
                setShowAddModal(true);
              }}
              className="flex items-center px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-all shadow-lg font-semibold hover:scale-105 active:scale-95"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add User
            </button>
          </div>
        </div>
      </div>

      {/* Enhanced Users Table */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden border-2 border-gray-100 hover:shadow-xl transition-all">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-gray-100 to-emerald-50 border-b-2 border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Plate</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Owner</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">RFID UID</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Balance</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
                    <Users className="w-20 h-20 mx-auto mb-4 text-gray-300 animate-pulse" />
                    <p className="text-gray-600 font-bold text-lg">No users found</p>
                    <p className="text-gray-400 text-sm mt-2">
                      {usersArray.length === 0
                        ? 'Add your first user to get started'
                        : 'Try adjusting your filters'
                      }
                    </p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.plate} className="hover:bg-emerald-50 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <CreditCard className="w-4 h-4 text-gray-400 mr-2" />
                        <span className="font-bold text-gray-900 text-lg">{user.plate}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="text-sm font-bold text-gray-900">{user.owner_name}</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">
                        <div className="flex items-center mb-1 font-medium">
                          <Mail className="w-3 h-3 mr-1.5 text-gray-400" />
                          {user.email}
                        </div>
                        {user.phone && (
                          <div className="flex items-center font-medium">
                            <Phone className="w-3 h-3 mr-1.5 text-gray-400" />
                            {user.phone}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <code className="text-xs bg-gray-100 px-3 py-1.5 rounded-lg font-mono font-bold border border-gray-200">{user.rfid_uid}</code>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`font-bold text-xl tabular-nums ${
                        (Number(user.balance_da) || 0) < 100 ? 'text-red-600' :
                        (Number(user.balance_da) || 0) < 500 ? 'text-orange-600' :
                        'text-green-600'
                      }`}>
                        {n0(user.balance_da)} DA
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleToggleStatus(user)}
                        className={`inline-flex items-center px-4 py-1.5 rounded-full text-xs font-bold border-2 shadow-sm ${
                          user.is_active
                            ? 'bg-green-100 text-green-700 border-green-300 hover:bg-green-200'
                            : 'bg-red-100 text-red-700 border-red-300 hover:bg-red-200'
                        } transition-all hover:scale-105`}
                      >
                        {user.is_active ? (
                          <><CheckCircle className="w-3 h-3 mr-1" /> Active</>
                        ) : (
                          <><XCircle className="w-3 h-3 mr-1" /> Inactive</>
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openDetailsModal(user)}
                          className="p-2 text-indigo-600 hover:bg-indigo-100 rounded-xl transition-all hover:scale-110 shadow-sm"
                          title="View Details"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => openEditModal(user)}
                          className="p-2 text-blue-600 hover:bg-blue-100 rounded-xl transition-all hover:scale-110 shadow-sm"
                          title="Edit"
                        >
                          <Edit className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.plate)}
                          className="p-2 text-red-600 hover:bg-red-100 rounded-xl transition-all hover:scale-110 shadow-sm"
                          title="Delete"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Enhanced Add/Edit Modal */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-md animate-fade-in">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-scale-in">
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <div className="p-4 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl mr-4 shadow-lg">
                    <Users className="w-10 h-10 text-white" />
                  </div>
                  <div>
                    <h3 className="text-3xl font-bold text-gray-900">
                      {showAddModal ? 'Add New User' : 'Edit User'}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1 font-medium">
                      {showAddModal ? 'Register a new toll system user' : 'Update user information'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setShowEditModal(false);
                    resetForm();
                  }}
                  className="text-gray-400 hover:text-gray-600 p-3 hover:bg-gray-100 rounded-xl transition-all hover:scale-110"
                >
                  <X className="w-7 h-7" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Plate Number *
                  </label>
                  <input
                    type="text"
                    value={formData.plateNumber}
                    onChange={(e) => setFormData({ ...formData, plateNumber: e.target.value })}
                    disabled={showEditModal}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 disabled:bg-gray-100 disabled:cursor-not-allowed font-medium"
                    placeholder="9876543210"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    RFID UID *
                  </label>
                  <input
                    type="text"
                    value={formData.rfidUid}
                    onChange={(e) => setFormData({ ...formData, rfidUid: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                    placeholder="AB22CD66"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Owner Name *
                  </label>
                  <input
                    type="text"
                    value={formData.ownerName}
                    onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                    placeholder="Mohammed Djerarda"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                    placeholder="user@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                    placeholder="+213 123456789"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Initial Balance (DA)
                  </label>
                  <input
                    type="number"
                    value={formData.initialBalance}
                    onChange={(e) => setFormData({ ...formData, initialBalance: Number(e.target.value) || 0 })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                    min="0"
                    step="10"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Vehicle Type
                  </label>
                  <select
                    value={formData.vehicleType}
                    onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 appearance-none font-medium"
                  >
                    <option value="Car">🚗 Car</option>
                    <option value="Truck">🚚 Truck</option>
                    <option value="Motorcycle">🏍️ Motorcycle</option>
                    <option value="Bus">🚌 Bus</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="flex items-center cursor-pointer p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={formData.active}
                      onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                      className="w-5 h-5 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                    />
                    <span className="ml-3 text-sm font-bold text-gray-700">✓ Active user account</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-8 pt-6 border-t-2 border-gray-200">
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setShowEditModal(false);
                    resetForm();
                  }}
                  className="px-6 py-3 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-all font-bold hover:scale-105"
                >
                  Cancel
                </button>
                <button
                  onClick={showAddModal ? handleAddUser : handleUpdateUser}
                  disabled={isSubmitting}
                  className="px-8 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-all font-bold shadow-xl disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95"
                >
                  {isSubmitting ? '⏳ Processing...' : showAddModal ? '✓ Add User' : '✓ Update User'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced User Details Modal */}
      {showDetailsModal && selectedUser && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-md animate-fade-in">
          <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl animate-scale-in">
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <div className="p-4 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl mr-4 shadow-lg">
                    <Users className="w-10 h-10 text-white" />
                  </div>
                  <div>
                    <h3 className="text-3xl font-bold text-gray-900">User Details</h3>
                    <p className="text-sm text-gray-500 font-medium">Complete user information</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    setSelectedUser(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 p-3 hover:bg-gray-100 rounded-xl transition-all hover:scale-110"
                >
                  <X className="w-7 h-7" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="p-5 bg-gray-50 rounded-2xl border-2 border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                  <p className="text-xs text-gray-600 mb-2 font-bold uppercase tracking-wide">Plate Number</p>
                  <p className="text-2xl font-bold text-gray-900">{selectedUser.plate}</p>
                </div>

                <div className="p-5 bg-gray-50 rounded-2xl border-2 border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                  <p className="text-xs text-gray-600 mb-2 font-bold uppercase tracking-wide">RFID UID</p>
                  <p className="text-xl font-mono font-bold text-gray-900">{selectedUser.rfid_uid}</p>
                </div>

                <div className="col-span-2 p-5 bg-gray-50 rounded-2xl border-2 border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                  <p className="text-xs text-gray-600 mb-2 font-bold uppercase tracking-wide">Owner Name</p>
                  <p className="text-2xl font-bold text-gray-900">{selectedUser.owner_name}</p>
                </div>

                <div className="p-5 bg-gray-50 rounded-2xl border-2 border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                  <p className="text-xs text-gray-600 mb-2 font-bold uppercase tracking-wide">Email</p>
                  <p className="text-gray-900 font-medium">{selectedUser.email}</p>
                </div>

                <div className="p-5 bg-gray-50 rounded-2xl border-2 border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                  <p className="text-xs text-gray-600 mb-2 font-bold uppercase tracking-wide">Phone</p>
                  <p className="text-gray-900 font-medium">{selectedUser.phone || 'N/A'}</p>
                </div>

                <div className="p-6 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl border-2 border-emerald-200 shadow-md">
                  <p className="text-sm text-emerald-700 mb-2 font-bold uppercase">Current Balance</p>
                  <p className="text-4xl font-bold text-emerald-900 tabular-nums">{n0(selectedUser.balance_da)} DA</p>
                </div>

                <div className="p-5 bg-gray-50 rounded-2xl border-2 border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                  <p className="text-xs text-gray-600 mb-3 font-bold uppercase tracking-wide">Status</p>
                  <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-bold border-2 shadow-md ${
                    selectedUser.is_active ? 'bg-green-100 text-green-700 border-green-300' : 'bg-red-100 text-red-700 border-red-300'
                  }`}>
                    {selectedUser.is_active ? '✓ Active' : '✗ Inactive'}
                  </span>
                </div>

                <div className="p-5 bg-gray-50 rounded-2xl border-2 border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                  <p className="text-xs text-gray-600 mb-2 font-bold uppercase tracking-wide">Vehicle Type</p>
                  <p className="text-gray-900 capitalize font-bold text-xl">{selectedUser.vehicle_type || 'Car'}</p>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-8 pt-6 border-t-2 border-gray-200">
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    openEditModal(selectedUser);
                  }}
                  className="flex items-center px-8 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-all font-bold shadow-xl hover:scale-105 active:scale-95"
                >
                  <Edit className="w-5 h-5 mr-2" />
                  Edit User
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

export default UserManagement;
