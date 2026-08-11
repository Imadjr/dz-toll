import React from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './components/LoginPage';
import AdminApp from './AdminApp';
import UserApp from './UserApp';
import { Loader2, Zap } from 'lucide-react';


/**
 * Enhanced Splash Screen with professional design - MOBILE OPTIMIZED
 * - Smooth animations
 * - Modern gradient background
 * - Better loading indicators
 * - Accessibility features
 * - Responsive sizing
 */
const Splash = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 relative overflow-hidden px-4">
      {/* Animated background elements - OPTIMIZED FOR MOBILE */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-40 h-40 sm:w-64 sm:h-64 bg-indigo-200/30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-56 h-56 sm:w-96 sm:h-96 bg-purple-200/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '700ms' }} />
        <div className="absolute top-1/2 left-1/2 w-48 h-48 sm:w-80 sm:h-80 bg-pink-200/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1000ms' }} />
      </div>


      <div className="relative text-center z-10 w-full max-w-md">
        {/* DzToll Logo container with pulsing effect - MOBILE RESPONSIVE */}
        <div
          className="inline-flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white shadow-2xl ring-4 ring-indigo-100 mb-5 sm:mb-6 relative"
          aria-hidden="true"
        >
          {/* Outer pulse ring */}
          <div className="absolute inset-0 rounded-2xl bg-indigo-500/20 animate-ping" />


          {/* DzToll Logo Image */}
          <img
            src={process.env.PUBLIC_URL + '/android-chrome-192x192.png'}
            alt="DzToll Logo"
            className="relative w-12 h-12 sm:w-14 sm:h-14 object-contain drop-shadow-lg"
            onError={(e) => {
              // Fallback to Zap icon if image fails
              e.target.style.display = 'none';
              const fallback = e.target.nextElementSibling;
              if (fallback) fallback.style.display = 'block';
            }}
          />

          {/* Fallback icon if logo fails to load */}
          <Zap
            className="relative w-10 h-10 sm:w-12 sm:h-12 text-indigo-600 animate-bounce"
            style={{ display: 'none' }}
          />
        </div>


        {/* Spinner with gradient - MOBILE RESPONSIVE */}
        <div className="relative inline-flex mb-5 sm:mb-6">
          <div
            className="animate-spin rounded-full h-14 w-14 sm:h-16 sm:w-16 border-4 border-transparent bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 p-1"
            style={{
              backgroundClip: 'padding-box',
              WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
              WebkitMaskComposite: 'xor',
              maskComposite: 'exclude'
            }}
            role="status"
            aria-label="Loading application"
          >
            <div className="h-full w-full rounded-full bg-gradient-to-br from-indigo-50 to-purple-50" />
          </div>
          <Loader2 className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 sm:w-6 sm:h-6 text-indigo-600 animate-spin" />
        </div>


        {/* Text content - MOBILE RESPONSIVE - UPDATED */}
        <div className="space-y-2 animate-fade-in px-4">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center justify-center gap-2">
            <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600" />
            DzToll
          </h2>
          <p className="text-base sm:text-lg font-semibold text-gray-700">Initializing Dashboard</p>
          <p className="text-xs sm:text-sm text-gray-500">Automated Toll Collection Platform</p>
        </div>


        {/* Loading dots animation - MOBILE RESPONSIVE */}
        <div className="flex items-center justify-center gap-1.5 sm:gap-2 mt-5 sm:mt-6">
          <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 bg-pink-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
};


/**
 * Smart role-based router
 * - Routes users to correct dashboard based on role
 * - Fallback to user dashboard for safety
 */
const RoleRouter = ({ userType, user }) => {
  if (userType === 'admin') {
    return <AdminApp user={user} />;
  }


  if (userType === 'user') {
    return <UserApp user={user} />;
  }


  // Fallback: default to user experience
  console.warn(`Unknown user type: ${userType}. Defaulting to user dashboard.`);
  return <UserApp user={user} />;
};


/**
 * Main app content with authentication routing
 * - Shows splash during initial load
 * - Routes to login or dashboard based on auth state
 * - Smooth transitions between states
 */
const AppContent = () => {
  const { isAuthenticated, userType, user, loading } = useAuth();


  // Show splash screen during authentication check
  if (loading) {
    return <Splash />;
  }


  // Show login page if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
        <div className="motion-safe:animate-fade-in">
          <LoginPage />
        </div>
      </div>
    );
  }


  // Show appropriate dashboard based on user role
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white transition-colors duration-500">
      <div className="motion-safe:animate-fade-in">
        <RoleRouter userType={userType} user={user} />
      </div>
    </div>
  );
};


/**
 * Root App component
 * - Provides authentication context
 * - Sets up global focus styles
 * - Ensures accessibility features
 * - Mobile-optimized global styles
 */
const App = () => {
  return (
    <AuthProvider>
      <div className="antialiased">
        {/* Global styles with mobile optimizations */}
        <style>{`
          /* Global focus ring for accessibility */
          *:focus-visible {
            outline: 2px solid #6366f1;
            outline-offset: 2px;
          }


          /* Smooth fade-in animation */
          @keyframes fade-in {
            from {
              opacity: 0;
              transform: translateY(10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }


          .animate-fade-in {
            animation: fade-in 0.5s ease-out;
          }


          /* Prevent horizontal scroll on mobile */
          html, body {
            overflow-x: hidden;
            max-width: 100vw;
          }


          /* Smooth scrolling */
          html {
            scroll-behavior: smooth;
          }


          /* Mobile-friendly tap highlight */
          * {
            -webkit-tap-highlight-color: rgba(99, 102, 241, 0.1);
          }


          /* Reduced motion support */
          @media (prefers-reduced-motion: reduce) {
            * {
              animation-duration: 0.01ms !important;
              animation-iteration-count: 1 !important;
              transition-duration: 0.01ms !important;
              scroll-behavior: auto !important;
            }
          }


          /* Mobile viewport height fix */
          @supports (-webkit-touch-callout: none) {
            .min-h-screen {
              min-height: -webkit-fill-available;
            }
          }


          /* Prevent zoom on input focus (iOS) */
          @media screen and (max-width: 768px) {
            input[type="text"],
            input[type="password"],
            input[type="email"],
            input[type="number"],
            select,
            textarea {
              font-size: 16px !important;
            }
          }


          /* Custom scrollbar for desktop */
          @media (min-width: 1024px) {
            ::-webkit-scrollbar {
              width: 8px;
              height: 8px;
            }


            ::-webkit-scrollbar-track {
              background: #f1f5f9;
            }


            ::-webkit-scrollbar-thumb {
              background: #cbd5e1;
              border-radius: 4px;
            }


            ::-webkit-scrollbar-thumb:hover {
              background: #94a3b8;
            }
          }
        `}</style>


        <AppContent />
      </div>
    </AuthProvider>
  );
};


export default App;
