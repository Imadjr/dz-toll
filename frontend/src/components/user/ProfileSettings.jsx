import React, { useState, useEffect, useMemo } from 'react';
import {
  User, Mail, Phone, MapPin, Calendar, CreditCard,
  Shield, Bell, Lock, Eye, EyeOff, Save, X,
  CheckCircle, AlertCircle, Camera, Edit2, Smartphone, RefreshCw, Sparkles
} from 'lucide-react';
import { API_BASE_URL } from '../../config';

const ProfileSettings = ({ profile, userData, refreshData, isConnected }) => {
  const [activeTab, setActiveTab] = useState('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [banner, setBanner] = useState(null);

  const userProfile = useMemo(() => userData || profile || {}, [userData, profile]);

  const [formData, setFormData] = useState({
    owner_name: userProfile?.owner_name || '',
    email: userProfile?.email || '',
    phone: userProfile?.phone || '',
    address: userProfile?.address || '',
    plate: userProfile?.plate || '',
    rfid_uid: userProfile?.rfid_uid || '',
  });

  useEffect(() => {
    setFormData({
      owner_name: userProfile?.owner_name || '',
      email: userProfile?.email || '',
      phone: userProfile?.phone || '',
      address: userProfile?.address || '',
      plate: userProfile?.plate || '',
      rfid_uid: userProfile?.rfid_uid || '',
    });
  }, [userProfile]);

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    smsNotifications: false,
    lowBalanceAlert: true,
    transactionAlerts: true,
    monthlyReport: false
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
  };

  const handleNotificationChange = (key) => {
    setNotifications(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSaveProfile = async () => {
    if (!formData.owner_name?.trim() || !formData.email?.trim()) {
      setBanner({ type: 'error', text: 'Name and email are required.' });
      setTimeout(() => setBanner(null), 3000);
      return;
    }
    setIsSaving(true);
    setBanner(null);
    try {
      const response = await fetch(`${API_BASE_URL}/user/${formData.plate}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setBanner({ type: 'success', text: '✅ Profile updated successfully.' });
        setIsEditing(false);
        if (typeof refreshData === 'function') refreshData();
        setTimeout(() => setBanner(null), 3000);
      } else {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to update profile');
      }
    } catch (error) {
      setBanner({ type: 'error', text: `❌ ${error.message || 'Failed to update profile.'}` });
      setTimeout(() => setBanner(null), 3500);
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setBanner({ type: 'error', text: '❌ New passwords do not match.' });
      setTimeout(() => setBanner(null), 3000);
      return;
    }
    if ((passwordData.newPassword || '').length < 6) {
      setBanner({ type: 'error', text: '❌ Password must be at least 6 characters.' });
      setTimeout(() => setBanner(null), 3000);
      return;
    }

    setIsSaving(true);
    setBanner(null);
    try {
      const response = await fetch(`${API_BASE_URL}/user/${formData.plate}/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        })
      });

      if (response.ok) {
        setBanner({ type: 'success', text: '✅ Password changed successfully.' });
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setTimeout(() => setBanner(null), 3000);
      } else {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to change password');
      }
    } catch (error) {
      setBanner({ type: 'error', text: `❌ ${error.message || 'Failed to change password.'}` });
      setTimeout(() => setBanner(null), 3500);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveNotifications = async () => {
    setIsSaving(true);
    setBanner(null);
    try {
      const response = await fetch(`${API_BASE_URL}/user/${formData.plate}/notifications`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notifications)
      });

      if (response.ok) {
        setBanner({ type: 'success', text: '✅ Notification preferences saved.' });
        setTimeout(() => setBanner(null), 3000);
      } else {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to save preferences');
      }
    } catch (error) {
      setBanner({ type: 'error', text: `❌ ${error.message || 'Failed to save preferences.'}` });
      setTimeout(() => setBanner(null), 3500);
    } finally {
      setIsSaving(false);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Enhanced Header with Gradient */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-2xl shadow-2xl p-8 text-white relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden opacity-20">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl -mr-48 -mt-48 animate-pulse" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-white rounded-full blur-3xl -ml-32 -mb-32 animate-pulse delay-700" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex-1 flex items-center min-w-0">
            <div className="p-4 bg-white/20 backdrop-blur-sm rounded-2xl mr-4 shadow-lg">
              <User className="w-10 h-10 animate-pulse" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl md:text-4xl font-bold truncate">Profile & Settings</h1>
                <Sparkles className="w-6 h-6 text-yellow-300 animate-pulse flex-shrink-0" />
              </div>
              <p className="text-indigo-100 text-lg">Manage your account information and preferences</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isConnected !== undefined && (
              <div className={`flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-sm shadow-lg border-2 ${
                isConnected ? 'bg-green-500/30 border-green-300' : 'bg-red-500/30 border-red-300'
              }`}>
                <div className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-green-200' : 'bg-red-200'} animate-pulse`} />
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

      {/* Enhanced Banner */}
      {banner && (
        <div className={`rounded-2xl p-5 flex items-center gap-4 shadow-lg border-2 animate-slide-down ${
          banner.type === 'success' ? 'bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 border-green-300' :
          banner.type === 'error' ? 'bg-gradient-to-r from-red-50 to-rose-50 text-red-700 border-red-300' :
          'bg-gradient-to-r from-blue-50 to-cyan-50 text-blue-700 border-blue-300'
        }`}>
          {banner.type === 'success' && <CheckCircle className="w-6 h-6 flex-shrink-0" />}
          {banner.type === 'error' && <AlertCircle className="w-6 h-6 flex-shrink-0" />}
          {banner.type === 'info' && <AlertCircle className="w-6 h-6 flex-shrink-0" />}
          <span className="font-bold text-lg">{banner.text}</span>
        </div>
      )}

      {/* Enhanced Account Status Card */}
      <div className="bg-white rounded-2xl shadow-lg p-8 border-2 border-gray-100 hover:shadow-xl transition-all">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-4xl font-bold flex-shrink-0 shadow-2xl animate-pulse-slow">
              {(userProfile?.owner_name?.charAt(0) || 'U').toUpperCase()}
            </div>
            <div className="text-center md:text-left">
              <h2 className="text-3xl font-bold text-gray-900 mb-1">{userProfile?.owner_name || 'User'}</h2>
              <p className="text-gray-600 text-lg mb-3">{userProfile?.email || 'No email provided'}</p>
              <div className="flex items-center gap-3 justify-center md:justify-start flex-wrap">
                <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-bold border-2 shadow-sm ${
                  userProfile?.is_active ? 'bg-green-100 text-green-700 border-green-300' : 'bg-red-100 text-red-700 border-red-300'
                }`}>
                  {userProfile?.is_active ? (
                    <>
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Active Account
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4 mr-1" />
                      Inactive
                    </>
                  )}
                </span>
                <span className="text-sm text-gray-500 font-medium">Member since Jan 2025</span>
              </div>
            </div>
          </div>
          <button
            className="flex items-center gap-2 px-6 py-3 text-indigo-600 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-all whitespace-nowrap font-bold shadow-md hover:scale-105"
            type="button"
          >
            <Camera className="w-5 h-5" />
            Change Photo
          </button>
        </div>
      </div>

      {/* Enhanced Tabs */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden border-2 border-gray-100">
        <div className="border-b-2 border-gray-200">
          <div className="flex overflow-x-auto">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 min-w-[140px] flex items-center justify-center gap-3 px-6 py-5 font-bold transition-all ${
                    activeTab === tab.id
                      ? 'text-indigo-600 border-b-4 border-indigo-600 bg-gradient-to-t from-indigo-50 to-transparent scale-105'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-6 h-6" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-8">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <h3 className="text-2xl font-bold text-gray-900">Personal Information</h3>
                {!isEditing ? (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-2 px-6 py-3 text-indigo-600 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-all font-bold hover:scale-105 shadow-md"
                  >
                    <Edit2 className="w-5 h-5" />
                    Edit Profile
                  </button>
                ) : (
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        setFormData({
                          owner_name: userProfile?.owner_name || '',
                          email: userProfile?.email || '',
                          phone: userProfile?.phone || '',
                          address: userProfile?.address || '',
                          plate: userProfile?.plate || '',
                          rfid_uid: userProfile?.rfid_uid || '',
                        });
                      }}
                      className="flex items-center gap-2 px-5 py-3 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-all font-bold hover:scale-105"
                    >
                      <X className="w-5 h-5" />
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveProfile}
                      disabled={isSaving}
                      className="flex items-center gap-2 px-6 py-3 text-white bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all disabled:opacity-50 font-bold shadow-xl hover:scale-105 active:scale-95"
                    >
                      <Save className="w-5 h-5" />
                      {isSaving ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InputField
                  label="Full Name"
                  icon={<User className="w-5 h-5" />}
                  name="owner_name"
                  value={formData.owner_name}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                />
                <InputField
                  label="Email Address"
                  icon={<Mail className="w-5 h-5" />}
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  placeholder="user@example.com"
                />
                <InputField
                  label="Phone Number"
                  icon={<Phone className="w-5 h-5" />}
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  placeholder="+213 123456789"
                />
                <InputField
                  label="Address"
                  icon={<MapPin className="w-5 h-5" />}
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  placeholder="Street, City"
                />
                <InputField
                  label="Plate Number"
                  icon={<CreditCard className="w-5 h-5" />}
                  value={formData.plate}
                  disabled
                  helper="Plate number cannot be changed"
                  className="font-bold"
                />
                <InputField
                  label="RFID Card"
                  icon={<Smartphone className="w-5 h-5" />}
                  value={formData.rfid_uid}
                  disabled
                  helper="Contact support to update RFID"
                  className="font-mono"
                />
              </div>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Change Password</h3>
                <p className="text-gray-600 text-lg">Update your password to keep your account secure</p>
              </div>

              <div className="max-w-2xl space-y-5">
                <PasswordField
                  label="Current Password"
                  name="currentPassword"
                  value={passwordData.currentPassword}
                  onChange={handlePasswordChange}
                  showPassword={showPassword}
                  setShowPassword={setShowPassword}
                  placeholder="Enter current password"
                />
                <PasswordField
                  label="New Password"
                  name="newPassword"
                  value={passwordData.newPassword}
                  onChange={handlePasswordChange}
                  showPassword={showPassword}
                  placeholder="Enter new password"
                  helper="Minimum 6 characters"
                />
                <PasswordField
                  label="Confirm New Password"
                  name="confirmPassword"
                  value={passwordData.confirmPassword}
                  onChange={handlePasswordChange}
                  showPassword={showPassword}
                  placeholder="Confirm new password"
                />

                <button
                  onClick={handleChangePassword}
                  disabled={isSaving}
                  className="w-full flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all disabled:opacity-50 font-bold shadow-2xl text-lg hover:scale-105 active:scale-95"
                >
                  <Shield className="w-6 h-6" />
                  {isSaving ? 'Updating...' : 'Update Password'}
                </button>
              </div>

              {/* Security Info */}
              <div className="mt-8 p-6 bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-2xl shadow-md">
                <div className="flex items-start">
                  <AlertCircle className="w-6 h-6 text-blue-600 mr-4 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-bold text-blue-900 mb-3 text-xl">Security Tips</h4>
                    <ul className="text-sm text-blue-700 space-y-2 font-medium">
                      <li>• Use a strong password with mixed characters</li>
                      <li>• Never share your password with anyone</li>
                      <li>• Change your password regularly</li>
                      <li>• Enable two-factor authentication (coming soon)</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Notification Preferences</h3>
                <p className="text-gray-600 text-lg">Choose how you want to receive updates</p>
              </div>

              <div className="space-y-4">
                <NotificationToggle
                  icon={<Mail />}
                  label="Email Notifications"
                  description="Receive updates via email"
                  checked={notifications.emailNotifications}
                  onChange={() => handleNotificationChange('emailNotifications')}
                  color="indigo"
                />
                <NotificationToggle
                  icon={<Smartphone />}
                  label="SMS Notifications"
                  description="Receive updates via text message"
                  checked={notifications.smsNotifications}
                  onChange={() => handleNotificationChange('smsNotifications')}
                  color="green"
                />
                <NotificationToggle
                  icon={<AlertCircle />}
                  label="Low Balance Alerts"
                  description="Get notified when balance is low"
                  checked={notifications.lowBalanceAlert}
                  onChange={() => handleNotificationChange('lowBalanceAlert')}
                  color="orange"
                />
                <NotificationToggle
                  icon={<CheckCircle />}
                  label="Transaction Alerts"
                  description="Notify for each toll passage"
                  checked={notifications.transactionAlerts}
                  onChange={() => handleNotificationChange('transactionAlerts')}
                  color="blue"
                />
                <NotificationToggle
                  icon={<Calendar />}
                  label="Monthly Reports"
                  description="Receive monthly usage summary"
                  checked={notifications.monthlyReport}
                  onChange={() => handleNotificationChange('monthlyReport')}
                  color="purple"
                />
              </div>

              <button
                onClick={handleSaveNotifications}
                disabled={isSaving}
                className="w-full flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all disabled:opacity-50 font-bold shadow-2xl text-lg hover:scale-105 active:scale-95"
              >
                <Save className="w-6 h-6" />
                {isSaving ? 'Saving...' : 'Save Preferences'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Helper Components
const InputField = ({ label, icon, name, value, onChange, disabled, placeholder, helper, type = 'text', className = '' }) => (
  <div>
    <label className="block text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">
      {icon && <span className="inline-flex mr-2">{icon}</span>}
      {label}
    </label>
    <input
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      disabled={disabled}
      placeholder={placeholder}
      className={`w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all ${
        disabled ? 'bg-gray-100 cursor-not-allowed' : ''
      } ${className}`}
    />
    {helper && <p className="text-xs text-gray-500 mt-2 font-medium">{helper}</p>}
  </div>
);

const PasswordField = ({ label, name, value, onChange, showPassword, setShowPassword, placeholder, helper }) => (
  <div>
    <label className="block text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">{label}</label>
    <div className="relative">
      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
      <input
        type={showPassword ? 'text' : 'password'}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full pl-12 pr-14 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500"
      />
      {setShowPassword && (
        <button
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
          type="button"
        >
          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
        </button>
      )}
    </div>
    {helper && <p className="text-xs text-gray-500 mt-2 font-medium">{helper}</p>}
  </div>
);

const NotificationToggle = ({ icon, label, description, checked, onChange }) => {
  return (
    <div className="flex items-center justify-between p-6 bg-gray-50 rounded-2xl border-2 border-gray-200 hover:shadow-md transition-all">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-white rounded-xl shadow-sm">
          {React.cloneElement(icon, { className: 'w-6 h-6 text-indigo-600' })}
        </div>
        <div>
          <p className="font-bold text-gray-900 text-lg">{label}</p>
          <p className="text-sm text-gray-600 font-medium">{description}</p>
        </div>
      </div>
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className="sr-only peer"
        />
        <div className="w-14 h-7 bg-gray-300 peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-indigo-600 peer-checked:to-purple-600 shadow-lg"></div>
      </label>
    </div>
  );
};

export default ProfileSettings;
