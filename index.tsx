
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Proteksi Global Window
declare global {
  interface Window {
    process: any;
    // aistudio is already defined as AIStudio in the global scope by the platform.
    // Redeclaring it here with 'any' causes "identical modifiers" and "Subsequent property declarations must have the same type" errors.
  }
}

// @google/genai guidelines: Assume process.env.API_KEY is pre-configured and accessible.
// We must not manually define or initialize process.env in the code.

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(<App />);
}
