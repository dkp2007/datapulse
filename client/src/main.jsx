import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import './index.css';
import App from './App.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { AuthProvider } from './contexts/AuthContext.jsx';
import { LanguageProvider } from './contexts/LanguageContext.jsx';
import { ToastProvider } from './components/Toast.jsx';
import { ConfirmProvider } from './components/Confirm.jsx';
import { registerServiceWorker } from './lib/pwa.js';

registerServiceWorker();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ErrorBoundary>
        <ToastProvider>
          <ConfirmProvider>
            <LanguageProvider>
              <AuthProvider>
                <App />
              </AuthProvider>
            </LanguageProvider>
          </ConfirmProvider>
        </ToastProvider>
      </ErrorBoundary>
    </BrowserRouter>
  </React.StrictMode>
);
