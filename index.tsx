
// Robust Environment Variable Polyfill for Satmoko Studio V7.8
if (typeof window !== 'undefined') {
  const win = window as any;
  
  // Inisialisasi awal agar tidak undefined saat diakses komponen
  win.process = win.process || { env: {} };
  win.process.env = win.process.env || {};
  win.systemAudit = win.systemAudit || []; 
  
  const metaEnv = (import.meta as any).env || {};
  
  console.group("%c 🚀 SATMOKO CORE BOOT SEQUENCE ", "background: #020617; color: #22d3ee; font-weight: bold; padding: 4px;");

  const syncVar = (key: string) => {
    // Cari di window.process.env (diatur oleh server/runtime) atau di metaEnv (Vite)
    const val = win.process?.env?.[key] || metaEnv[key] || "";
    const status = val ? 'OK' : 'MISSING';
    
    // Simpan ke audit global agar bisa dilihat di layar HP (StartAnimation)
    win.systemAudit.push({ 
      key, 
      status, 
      timestamp: new Date().toLocaleTimeString() 
    });

    if (val) {
      win.process.env[key] = val;
      console.log(`%c[OK]%c ${key.padEnd(25)}: Detected`, "color: #10b981; font-weight: bold", "color: #94a3b8");
    } else {
      console.warn(`%c[!!]%c ${key.padEnd(25)}: Missing`, "color: #ef4444; font-weight: bold", "color: #64748b");
    }
    return val;
  };

  // Pemuatan Variabel Wajib Master
  syncVar('VITE_DATABASE_URL');
  syncVar('VITE_SUPABASE_ANON');
  syncVar('VITE_MIDTRANS_SERVER_ID');
  syncVar('VITE_MIDTRANS_CLIENT_ID');
  syncVar('VITE_TELEGRAM_BOT_TOKEN');
  syncVar('VITE_TELEGRAM_CHAT_ID');
  syncVar('VITE_ADMIN_EMAILS');
  syncVar('VITE_PASSW');

  // Audit Multi-Slot Gemini API
  const k1 = syncVar('VITE_GEMINI_API_1');
  syncVar('VITE_GEMINI_API_2');
  syncVar('VITE_GEMINI_API_3');

  // Set default API_KEY untuk SDK Gemini (Slot 1 sebagai Primary)
  if (k1 && !win.process.env.API_KEY) {
    win.process.env.API_KEY = k1;
    console.log("%c[AI]%c Gemini Primary Engine: Slot 1 Ready", "color: #22d3ee; font-weight: bold", "color: #94a3b8");
  }

  console.groupEnd();

  // PWA Service Worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    });
  }
}

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
