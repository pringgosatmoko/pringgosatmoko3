
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

declare global {
  // Removed var process to fix: Cannot redeclare block-scoped variable 'process'.
  // It is assumed to be provided by the environment's existing type declarations.
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }
  interface Window {
    snap: any;
    // Added optional modifier to fix: All declarations of 'aistudio' must have identical modifiers.
    aistudio?: AIStudio;
  }
}

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(<App />);
}
