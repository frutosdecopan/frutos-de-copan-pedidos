import React from 'react';
import ReactDOM from 'react-dom/client';
import { ToastProvider } from './ToastContext';
import { ErrorBoundary } from './components/common';
import './index.css';
import App from './App';

// Si alguien deja la pestaña abierta y mientras tanto se publica un nuevo
// deploy, los archivos de las vistas (React.lazy) quedan con un hash
// distinto — el chunk que el navegador intenta cargar ya no existe.
// Vite dispara este evento en ese caso; en vez de mostrar la pantalla de
// error, se recarga una sola vez (por sesión de pestaña, para no entrar en
// bucle si el problema persiste) y así trae la versión actual sola.
window.addEventListener('vite:preloadError', () => {
  const key = 'fdc_reloaded_after_preload_error';
  if (!sessionStorage.getItem(key)) {
    sessionStorage.setItem(key, '1');
    window.location.reload();
  }
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <ToastProvider>
        <App />
      </ToastProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
