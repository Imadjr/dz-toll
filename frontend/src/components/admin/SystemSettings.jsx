import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon, Save, RefreshCw,
  AlertTriangle, Bell, Database, Shield,
  Check, X, Info, Wallet, Sparkles, Zap, Lock
} from 'lucide-react';
import { API_BASE_URL } from '../../config';

const DEFAULTS = {
  tollFee: 50,
  lowBalanceThreshold: 100,
  systemName: 'DzToll',
  enableNotifications: true,
  autoRechargeEnabled: false,
  maxRechargeAmount: 5000,
  minBalanceAlert: 50,
  sessionTimeout: 30,
  enableEmailAlerts: true,
  enableSMSAlerts: false,
  maintenanceMode: false
};

const SystemSettings = ({ isConnected, refreshData }) => {
  const [config, setConfig] = useState(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [activeTab, setActiveTab] = useState('general');

  useEffect(() => {
    fetchSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/settings`);
      if (response.ok) {
        const data = await response.json();
        if (data && typeof data === 'object') {
          setConfig(prev => ({ ...prev, ...data }));
        }
      } else {
        setMessage({ type: 'error', text: 'Failed to load settings from server.' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error loading settings. Check connection.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch(`${API_BASE_URL}/admin/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });

      if (response.ok) {
        setMessage({ type: 'success', text: '✅ Settings saved successfully!' });
        if (typeof refreshData === 'function') refreshData();
        setTimeout(() => setMessage(null), 3000);
      } else {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to save settings');
      }
    } catch (error) {
      setMessage({ type: 'error', text: '❌ ' + (error.message || 'Failed to save settings. Please try again.') });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (window.confirm('⚠️ Are you sure you want to reset to default settings?')) {
      setConfig(DEFAULTS);
      setMessage({ type: 'info', text: 'ℹ️ Settings reset to defaults. Click Save to apply.' });
    }
  };

  const updateConfig = (key, value) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

const tabs = [
  { id: 'general', label: 'General', icon: SettingsIcon, gradient: 'from-indigo-500 to-purple-600' },
  { id: 'pricing', label: 'Pricing', icon: Wallet, gradient: 'from-emerald-500 to-teal-600' },
  { id: 'notifications', label: 'Notifications', icon: Bell, gradient: 'from-blue-500 to-cyan-600' },
  { id: 'security', label: 'Security', icon: Shield, gradient: 'from-rose-500 to-pink-600' },
  { id: 'advanced', label: 'Advanced', icon: Database, gradient: 'from-violet-500 to-purple-600' }
];


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-white shadow-2xl mb-6 relative">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-600 opacity-10 rounded-2xl animate-pulse" />
            <SettingsIcon className="w-12 h-12 text-indigo-600 animate-spin" style={{ animationDuration: '3s' }} />
          </div>
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-xl font-bold text-gray-800">Loading Settings...</p>
          <p className="text-sm text-gray-500 mt-2">Please wait a moment</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Enhanced Header with Gradient */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-2xl shadow-2xl p-8 text-white relative overflow-hidden">
        {/* Animated background orbs */}
        <div className="absolute inset-0 overflow-hidden opacity-20">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl -mr-48 -mt-48 animate-pulse" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-white rounded-full blur-3xl -ml-32 -mb-32 animate-pulse delay-700" />
        </div>

        <div className="relative flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center">
            <div className="p-4 bg-white/20 backdrop-blur-sm rounded-2xl mr-4 shadow-lg">
              <SettingsIcon className="w-10 h-10" />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-4xl font-bold">System Settings</h2>
                <Sparkles className="w-6 h-6 text-yellow-300 animate-pulse" />
              </div>
              <p className="text-indigo-100 text-lg">Configure your toll collection system</p>
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
              onClick={handleReset}
              className="flex items-center gap-2 px-5 py-2.5 bg-white/20 hover:bg-white/30 rounded-full transition-all border-2 border-white/30 backdrop-blur-sm hover:scale-105 active:scale-95 shadow-lg font-semibold"
            >
              <RefreshCw className="w-5 h-5" />
              Reset
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-white text-indigo-600 rounded-full hover:bg-indigo-50 transition-all disabled:opacity-50 shadow-lg font-bold hover:scale-105 active:scale-95"
            >
              {saving ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>

        {/* Success/Error Message */}
        {message && (
          <div className={`mt-6 p-5 rounded-xl flex items-center border-2 shadow-lg animate-fade-in ${
            message.type === 'success' ? 'bg-green-500/20 text-white border-green-300' :
            message.type === 'error' ? 'bg-red-500/20 text-white border-red-300' :
            'bg-blue-500/20 text-white border-blue-300'
          }`}>
            {message.type === 'success' && <Check className="w-6 h-6 mr-3 flex-shrink-0" />}
            {message.type === 'error' && <X className="w-6 h-6 mr-3 flex-shrink-0" />}
            {message.type === 'info' && <Info className="w-6 h-6 mr-3 flex-shrink-0" />}
            <span className="font-bold text-lg">{message.text}</span>
          </div>
        )}
      </div>

      {/* Enhanced Tabs */}
      <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-100 hover:shadow-xl transition-all">
        <div className="border-b-2 border-gray-200">
          <div className="flex flex-wrap gap-2 p-3">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center px-6 py-3 rounded-xl transition-all font-bold ${
                      isActive
                        ? `bg-gradient-to-r ${tab.gradient} text-white shadow-xl scale-105`
                        : 'text-gray-600 hover:bg-gray-100 hover:scale-105'
                    }`}
                  >

                  <Icon className="w-5 h-5 mr-2" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-8 animate-fade-in">
          {/* General Settings */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
                  <Zap className="w-4 h-4 text-indigo-600" />
                  System Name
                </label>
                <input
                  type="text"
                  value={config.systemName}
                  onChange={(e) => updateConfig('systemName', e.target.value)}
                  className="w-full px-5 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium transition-all"
                  placeholder="Enter system name"
                />
                <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                  <Info className="w-3 h-3" />
                  This name will appear in reports and dashboards
                </p>
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
                  <Lock className="w-4 h-4 text-indigo-600" />
                  Session Timeout (minutes)
                </label>
                <input
                  type="number"
                  value={config.sessionTimeout}
                  onChange={(e) => updateConfig('sessionTimeout', parseInt(e.target.value, 10) || 30)}
                  className="w-full px-5 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium transition-all"
                  min="5"
                  max="120"
                />
                <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                  <Info className="w-3 h-3" />
                  Users will be logged out after this period of inactivity
                </p>
              </div>

              <div className="flex items-center justify-between p-6 bg-gradient-to-r from-orange-50 to-red-50 rounded-2xl border-2 border-orange-200 shadow-md hover:shadow-lg transition-all">
                <div className="flex items-center">
                  <AlertTriangle className="w-6 h-6 text-orange-600 mr-4" />
                  <div>
                    <p className="font-bold text-gray-900 text-lg">Maintenance Mode</p>
                    <p className="text-sm text-gray-600 font-medium">Temporarily disable toll collection</p>
                  </div>
                </div>
                <ToggleSwitch
                  checked={config.maintenanceMode}
                  onChange={(checked) => updateConfig('maintenanceMode', checked)}
                  color="orange"
                />
              </div>
            </div>
          )}

          {/* Pricing Settings */}
          {activeTab === 'pricing' && (
            <div className="space-y-6">
              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
                  <Wallet className="w-4 h-4 text-green-600" />
                  Standard Toll Fee (DA)
                </label>
                <div className="relative">
                  <Wallet className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="number"
                    value={config.tollFee}
                    onChange={(e) => updateConfig('tollFee', parseFloat(e.target.value) || 0)}
                    className="w-full pl-12 pr-5 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-green-500/20 focus:border-green-500 font-medium transition-all"
                    min="0"
                    step="1"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                  <Info className="w-3 h-3" />
                  Fee charged for each toll passage
                </p>
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-600" />
                  Low Balance Threshold (DA)
                </label>
                <div className="relative">
                  <AlertTriangle className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="number"
                    value={config.lowBalanceThreshold}
                    onChange={(e) => updateConfig('lowBalanceThreshold', parseFloat(e.target.value) || 0)}
                    className="w-full pl-12 pr-5 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-green-500/20 focus:border-green-500 font-medium transition-all"
                    min="0"
                    step="10"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                  <Info className="w-3 h-3" />
                  Users will receive warnings when balance falls below this amount
                </p>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Minimum Balance Alert (DA)
                </label>
                <input
                  type="number"
                  value={config.minBalanceAlert}
                  onChange={(e) => updateConfig('minBalanceAlert', parseFloat(e.target.value) || 0)}
                  className="w-full px-5 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-green-500/20 focus:border-green-500 font-medium transition-all"
                  min="0"
                  step="10"
                />
                <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                  <Info className="w-3 h-3" />
                  Critical balance level that triggers urgent notifications
                </p>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Maximum Recharge Amount (DA)
                </label>
                <input
                  type="number"
                  value={config.maxRechargeAmount}
                  onChange={(e) => updateConfig('maxRechargeAmount', parseFloat(e.target.value) || 0)}
                  className="w-full px-5 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-green-500/20 focus:border-green-500 font-medium transition-all"
                  min="100"
                  step="100"
                />
                <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                  <Info className="w-3 h-3" />
                  Maximum amount users can recharge at once
                </p>
              </div>
            </div>
          )}

          {/* Notification Settings */}
          {activeTab === 'notifications' && (
            <div className="space-y-4">
              <NotificationToggle
                label="Enable Notifications"
                description="Send system notifications to users"
                checked={config.enableNotifications}
                onChange={(checked) => updateConfig('enableNotifications', checked)}
                color="indigo"
              />
              <NotificationToggle
                label="Email Alerts"
                description="Send alerts via email"
                checked={config.enableEmailAlerts}
                onChange={(checked) => updateConfig('enableEmailAlerts', checked)}
                color="blue"
              />
              <NotificationToggle
                label="SMS Alerts"
                description="Send alerts via SMS"
                checked={config.enableSMSAlerts}
                onChange={(checked) => updateConfig('enableSMSAlerts', checked)}
                color="green"
              />
            </div>
          )}

          {/* Security Settings */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <div className="p-6 bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-200 rounded-2xl shadow-md">
                <div className="flex items-start">
                  <Shield className="w-6 h-6 text-yellow-600 mr-4 mt-1 flex-shrink-0" />
                  <div>
                    <p className="font-bold text-yellow-900 text-lg">Security Settings</p>
                    <p className="text-sm text-yellow-700 mt-2 font-medium">
                      These settings affect system security. Changes should be made carefully.
                    </p>
                  </div>
                </div>
              </div>

              <InputField
                label="Minimum Password Length"
                defaultValue={8}
                min={6}
                max={20}
                description="Minimum characters required for passwords"
              />
              <InputField
                label="Max Login Attempts"
                defaultValue={5}
                min={3}
                max={10}
                description="Number of failed login attempts before lockout"
              />
              <InputField
                label="Lockout Duration (minutes)"
                defaultValue={15}
                min={5}
                max={60}
                description="How long accounts remain locked after max attempts"
              />
            </div>
          )}

          {/* Advanced Settings */}
          {activeTab === 'advanced' && (
            <div className="space-y-6">
              <div className="p-6 bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-200 rounded-2xl shadow-md">
                <div className="flex items-start">
                  <AlertTriangle className="w-6 h-6 text-red-600 mr-4 mt-1 flex-shrink-0" />
                  <div>
                    <p className="font-bold text-red-900 text-lg">Advanced Settings</p>
                    <p className="text-sm text-red-700 mt-2 font-medium">
                      Changing these settings may affect system performance. Proceed with caution.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-6 bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl border-2 border-purple-200 shadow-md hover:shadow-lg transition-all">
                <div>
                  <p className="font-bold text-gray-900 text-lg">Auto Recharge</p>
                  <p className="text-sm text-gray-600 font-medium">Automatically recharge when balance is low</p>
                </div>
                <ToggleSwitch
                  checked={config.autoRechargeEnabled}
                  onChange={(checked) => updateConfig('autoRechargeEnabled', checked)}
                  color="purple"
                />
              </div>

              <InputField
                label="Data Retention Period (days)"
                defaultValue={365}
                min={30}
                max={1825}
                description="How long to keep transaction data before archiving"
              />

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Backup Frequency
                </label>
                <select className="w-full px-5 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 appearance-none font-medium transition-all">
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
                <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                  <Info className="w-3 h-3" />
                  How often to backup system data
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Helper Components
const ToggleSwitch = ({ checked, onChange, color = 'indigo' }) => {
  const colors = {
    indigo: 'peer-checked:bg-indigo-600 peer-focus:ring-indigo-300',
    blue: 'peer-checked:bg-blue-600 peer-focus:ring-blue-300',
    green: 'peer-checked:bg-green-600 peer-focus:ring-green-300',
    orange: 'peer-checked:bg-orange-600 peer-focus:ring-orange-300',
    purple: 'peer-checked:bg-purple-600 peer-focus:ring-purple-300'
  };

  return (
    <label className="relative inline-flex items-center cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only peer"
      />
      <div className={`w-14 h-7 bg-gray-200 rounded-full peer-focus:outline-none peer-focus:ring-4 ${colors[color]} peer ${colors[color]} after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:after:translate-x-full peer-checked:after:border-white shadow-inner`}></div>
    </label>
  );
};

const NotificationToggle = ({ label, description, checked, onChange, color }) => {
  const colorClasses = {
    indigo: 'from-indigo-50 to-purple-50 border-indigo-200',
    blue: 'from-blue-50 to-cyan-50 border-blue-200',
    green: 'from-green-50 to-emerald-50 border-green-200'
  };

  return (
    <div className={`flex items-center justify-between p-6 bg-gradient-to-r ${colorClasses[color]} rounded-2xl border-2 shadow-md hover:shadow-lg transition-all`}>
      <div className="flex items-center">
        <Bell className={`w-6 h-6 text-${color}-600 mr-4`} />
        <div>
          <p className="font-bold text-gray-900 text-lg">{label}</p>
          <p className="text-sm text-gray-600 font-medium">{description}</p>
        </div>
      </div>
      <ToggleSwitch checked={checked} onChange={onChange} color={color} />
    </div>
  );
};

const InputField = ({ label, defaultValue, min, max, description }) => {
  return (
    <div>
      <label className="block text-sm font-bold text-gray-700 mb-2">
        {label}
      </label>
      <input
        type="number"
        defaultValue={defaultValue}
        className="w-full px-5 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium transition-all"
        min={min}
        max={max}
      />
      <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
        <Info className="w-3 h-3" />
        {description}
      </p>
    </div>
  );
};

export default SystemSettings;
