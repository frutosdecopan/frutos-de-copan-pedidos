import React from 'react';
import ReactDOM from 'react-dom/client';
import { ToastProvider } from './ToastContext';
import './index.css'; // Ensure CSS is imported if not already, though I didn't see it in the file view, usually it's there. Wait, previous view didn't show css import. Let me double check if I should add it or just the provider.
// The list_dir showed index.html, index.tsx, App.tsx. It didn't show index.css in the root list?
// list_dir output:
// .env.local
// .gitignore
// App.tsx
// README.md
// constants.ts
// index.html
// index.tsx
// metadata.json
// package.json
// services
// tsconfig.json
// types.ts
// vite.config.ts

// No index.css in root? Maybe it's not there. I'll stick to just adding the Provider.

import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </React.StrictMode>
);