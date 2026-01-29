
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Mendeklarasikan variabel global agar dikenali oleh TypeScript Compiler (tsc)
// Fix: Removed duplicate 'process' declaration which conflicts with built-in Node types.
// Fix: Unified AIStudio type definition and applied it to the Window interface.
declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }

  interface Window {
    snap: any;
    aistudio: AIStudio;
  }
}

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(<App />);
}
