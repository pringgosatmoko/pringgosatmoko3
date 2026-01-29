
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// TypeScript Global Augmentation
declare global {
  /* Define the AIStudio interface to match the globally expected type name */
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }

  interface Window {
    snap: any;
    /* Use the AIStudio interface instead of an anonymous object type to match external definitions and resolve declaration conflicts */
    aistudio?: AIStudio;
    process: {
      env: Record<string, string>;
    };
  }
}

// Runtime Shim for Gemini SDK compatibility in browser
if (typeof (window as any).process === 'undefined') {
  (window as any).process = { env: {} };
}

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(<App />);
}
