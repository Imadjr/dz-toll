/* eslint-disable no-console */
import { ADMIN_USERNAME, API_BASE_URL } from '../config';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  Lock, Mail, Eye, EyeOff, LogIn, AlertCircle,
  Activity, ArrowRight, Key, Zap, MapPin, Sparkles
} from 'lucide-react';


const LoginPage = () => {
  const { login } = useAuth();


  // Form state
  const [formData, setFormData] = useState({ identifier: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);


  // UX state
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({ identifier: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [touched, setTouched] = useState({ identifier: false, password: false });


  // Refs
  const idInputRef = useRef(null);
  const pwdInputRef = useRef(null);
  const submitRef = useRef(null);


  // Admin check
  const isAdminLogin = (id) => {
    const v = String(id || '').trim().toLowerCase();
    return v === ADMIN_USERNAME.toLowerCase();
  };


  // Simple validators
  const validate = useCallbackFormValidator();
  const validation = useMemo(() => validate(formData), [formData, validate]);


  const canSubmit = useMemo(() => {
    return !validation.identifier && !validation.password && !isLoading && formData.identifier.trim() && formData.password.trim();
  }, [validation, isLoading, formData]);


  // Autofocus identifier on mount
  useEffect(() => {
    idInputRef.current?.focus();
  }, []);


  // CapsLock detection
  const handleKeyDetection = (e) => {
    const caps = e.getModifierState && e.getModifierState('CapsLock');
    setCapsLock(Boolean(caps));
  };


  // Input change
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
    setError('');
    setFieldErrors((p) => ({ ...p, [name]: '' }));
  };


  // On blur (field level)
  const handleBlur = (e) => {
    const { name } = e.target;
    setTouched((p) => ({ ...p, [name]: true }));
    const v = validate(formData);
    setFieldErrors((p) => ({ ...p, [name]: v[name] || '' }));
  };


  const handleSubmit = async (e) => {
  e.preventDefault();
  setTouched({ identifier: true, password: true });


  const v = validate(formData);
  if (v.identifier || v.password) {
    setFieldErrors(v);
    const focusTarget = v.identifier ? idInputRef : v.password ? pwdInputRef : null;
    focusTarget?.current?.focus();
    return;
  }


  setIsLoading(true);
  setError('');


  try {
    const identifier = formData.identifier.trim();


    if (process.env.NODE_ENV === 'development') {
      console.log('🎯 Login attempt:', {
        identifier,
        isEmail: identifier.includes('@'),
        isAdmin: isAdminLogin(identifier),
      });
    }


    if (isAdminLogin(identifier.toLowerCase())) {
      // ADMIN: Use username not identifier in payload!
      const res = await fetch(`${API_BASE_URL}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: identifier, password: formData.password }),
      });


      const data = await safeJson(res);


      if (res.ok) {
        const userData = { name: data.admin?.username || 'Admin', email: '', role: 'admin' };
        login(userData, 'admin', data.token);
      } else {
        setError(data?.message || 'Invalid admin credentials');
      }
    } else {
      // USER: Use identifier as before
      const res = await fetch(`${API_BASE_URL}/user/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password: formData.password }),
      });


      const data = await safeJson(res);


      if (res.ok) {
        const userData = {
          name: data.user?.owner_name || 'User',
          email: data.user?.email || '',
          plate: data.user?.plate,
          rfid_uid: data.user?.rfid_uid,
          role: 'user',
        };
        localStorage.setItem('userData', JSON.stringify(userData));
        login(userData, 'user', data.token);
      } else {
        if (res.status === 401) {
          setError('Invalid credentials. Check your password or identifier.');
        } else if (res.status >= 500) {
          setError('Server error. Please try again shortly.');
        } else {
          setError(data?.message || 'Unable to sign in.');
        }
      }
    }
  } catch (err) {
    setError('Cannot reach server. Is your backend running?');
    console.error('🚨 Critical login error:', err);
  } finally {
    setIsLoading(false);
  }
};


  // Enter key support
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && canSubmit) {
      submitRef.current?.click();
    }
  };


  return (
    <div className="min-h-screen flex">
      {/* Left: Enhanced form section */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8 bg-gradient-to-br from-gray-50 to-white relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30">
          <div className="absolute top-20 right-20 w-64 h-64 bg-indigo-200 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 left-20 w-80 h-80 bg-purple-200 rounded-full blur-3xl animate-pulse delay-700" />
        </div>


        <div className="w-full max-w-md relative z-10">
          {/* Enhanced heading - UPDATED LOGO + NAME */}
          <div className="text-center mb-8 animate-fade-in">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white shadow-2xl ring-4 ring-indigo-100 mb-5 relative group">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 opacity-0 group-hover:opacity-10 transition-opacity" />
              <div className="absolute inset-0 rounded-2xl bg-indigo-500/20 animate-ping" />
              {/* DzToll Favicon Logo */}
<img
  src={process.env.PUBLIC_URL + '/android-chrome-192x192.png'}
  alt="DzToll Logo"
  className="relative w-10 h-10 object-contain"
  onError={(e) => { e.target.style.display = 'none'; }}
/>

            </div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
              DzToll
            </h1>
            <p className="text-gray-600 flex items-center justify-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              Automated Toll Collection
            </p>
          </div>


          {/* Enhanced error message */}
          {error && (
            <div className="mb-6 p-4 bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-200 rounded-xl flex items-start shadow-lg animate-shake" role="alert">
              <AlertCircle className="w-5 h-5 text-red-600 mr-3 mt-0.5 flex-shrink-0 animate-pulse" />
              <p className="text-sm text-red-700 font-medium">{error}</p>
            </div>
          )}


          {/* Enhanced form */}
          <form onSubmit={handleSubmit} className="space-y-5 animate-fade-in" noValidate>
            {/* Enhanced identifier field */}
            <div>
              <div className="mb-2">
                <label htmlFor="identifier" className="block text-sm font-semibold text-gray-700">
                  Plate, RFID, or Email
                </label>
              </div>
              <div className="relative group">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-indigo-600 transition-colors" />
                <input
                  id="identifier"
                  ref={idInputRef}
                  type="text"
                  name="identifier"
                  value={formData.identifier}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  onKeyDown={(e) => { handleKeyDetection(e); handleKeyDown(e); }}
                  className={`w-full pl-10 pr-4 py-3.5 border-2 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200 ${
                    fieldErrors.identifier && touched.identifier
                      ? 'border-red-400 bg-red-50/50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                  placeholder="e.g., 1234567891 or A368ED17"
                  autoComplete="username"
                  required
                />
              </div>
              {fieldErrors.identifier && touched.identifier && (
                <p className="mt-2 text-xs text-red-600 flex items-center gap-1 animate-fade-in">
                  <AlertCircle className="w-3 h-3" />
                  {fieldErrors.identifier}
                </p>
              )}
            </div>


            {/* Enhanced password field */}
            <div>
              <div className="mb-2">
                <label htmlFor="password" className="block text-sm font-semibold text-gray-700">
                  Password
                </label>
              </div>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-indigo-600 transition-colors" />
                <input
                  id="password"
                  ref={pwdInputRef}
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  onKeyDown={(e) => { handleKeyDetection(e); handleKeyDown(e); }}
                  className={`w-full pl-10 pr-12 py-3.5 border-2 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200 ${
                    fieldErrors.password && touched.password
                      ? 'border-red-400 bg-red-50/50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-lg p-1 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {capsLock && (
                <p className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-300 rounded-lg px-3 py-2 inline-flex items-center gap-2 animate-fade-in">
                  <Key className="w-3 h-3" />
                  Caps Lock is ON
                </p>
              )}
              {fieldErrors.password && touched.password && (
                <p className="mt-2 text-xs text-red-600 flex items-center gap-1 animate-fade-in">
                  <AlertCircle className="w-3 h-3" />
                  {fieldErrors.password}
                </p>
              )}
            </div>


            {/* Enhanced submit button */}
            <button
              ref={submitRef}
              type="submit"
              disabled={!canSubmit}
              className={`w-full flex items-center justify-center gap-2 py-3.5 text-white rounded-xl font-semibold transition-all duration-200 shadow-lg ${
                canSubmit
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]'
                  : 'bg-gray-300 cursor-not-allowed opacity-60'
              }`}
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  <span>Sign In</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>


        </div>
      </div>


      {/* Enhanced right hero section - UPDATED NAME */}
      <div className="hidden lg:flex lg:flex-1 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 p-12 items-center justify-center relative overflow-hidden">
        {/* Animated orbs */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 animate-pulse" />
          <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-white rounded-full blur-3xl translate-x-1/3 translate-y-1/3 animate-pulse delay-1000" />
          <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-pink-300 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 animate-pulse delay-500" />
        </div>


        <div className="relative z-10 max-w-lg text-white">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
            Welcome to DzToll
          </h2>
          <p className="text-xl text-indigo-100 mb-10 leading-relaxed">
            Experience seamless toll collection with cutting-edge RFID technology and real-time processing
          </p>


          <div className="space-y-5">
            <Feature
              icon={<Zap className="w-6 h-6" />}
              title="Lightning Fast"
              text="Instant authentication with multiple login methods"
            />
            <Feature
              icon={<MapPin className="w-6 h-6" />}
              title="Multi-Lane Support"
              text="Manage multiple toll locations from one dashboard"
            />
            <Feature
              icon={<Activity className="w-6 h-6" />}
              title="Real-Time Updates"
              text="Live transaction monitoring and instant notifications"
            />
          </div>


          <div className="mt-10 p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
            <p className="text-sm text-indigo-100">
              <strong className="text-white">Secure & Reliable:</strong> Enterprise-grade security with encrypted connections and role-based access control.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};


function Feature({ icon, title, text }) {
  return (
    <div className="flex items-start gap-4 group">
      <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl group-hover:bg-white/30 transition-all group-hover:scale-110">
        {icon}
      </div>
      <div>
        <h3 className="font-semibold text-lg mb-1">{title}</h3>
        <p className="text-indigo-100 text-sm leading-relaxed">{text}</p>
      </div>
    </div>
  );
}


// Util: defensively parse JSON
async function safeJson(res) {
  try {
    return await res.json();
  } catch {
    return {};
  }
}


// Validator hook
function useCallbackFormValidator() {
  const validate = (values) => {
    const errors = { identifier: '', password: '' };
    const id = String(values.identifier || '').trim();


    if (!id) {
      errors.identifier = 'Identifier is required';
    } else if (id.includes('@')) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(id)) {
        errors.identifier = 'Invalid email format';
      }
    } else {
      if (!/^[A-Za-z0-9._-]{4,}$/.test(id)) {
        errors.identifier = 'Use a valid plate, RFID, or email';
      }
    }


    if (!values.password || !String(values.password).trim()) {
      errors.password = 'Password is required';
    } else if (String(values.password).length < 4) {
      errors.password = 'Password is too short (min 4 characters)';
    }


    return errors;
  };


  return validate;
}


export default LoginPage;
