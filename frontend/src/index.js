import './index.css'; // Ensure Tailwind CSS is loaded first

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Optional: report web vitals for performance monitoring
// import reportWebVitals from './reportWebVitals';

// Safely find or create root element (preventing errors if missing)
const rootId = 'root';
let rootElement = document.getElementById(rootId);
if (!rootElement) {
  rootElement = document.createElement('div');
  rootElement.id = rootId;
  document.body.appendChild(rootElement);
}

// Create React 18 root
const root = ReactDOM.createRoot(rootElement);

// Render with StrictMode for helpful warnings in development
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Hot Module Replacement support (Vite, Webpack, CRA Fast Refresh)
if (import.meta && import.meta.hot) {
  import.meta.hot.accept();
}

// Optional: Register service worker if your app supports PWA
// if ('serviceWorker' in navigator) {
//   window.addEventListener('load', () => {
//     navigator.serviceWorker.register('/service-worker.js').catch(() => {});
//   });
// }

// Optional: Capture and report web vitals
// reportWebVitals(console.log);
