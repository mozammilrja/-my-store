import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { ThemeProvider } from './lib/theme';
import { SessionProvider } from './lib/session';
import App from './App';
import './index.css';

/**
 * The admin used to route on the hash (#/products). Those links are still in
 * bookmarks and in people's history, so they are rewritten to the real path
 * before React mounts: doing it in an effect lets the index redirect win first
 * and the destination is lost.
 */
const hashRoute = window.location.hash.replace(/^#\/?/, '').trim();
if (hashRoute) {
  window.history.replaceState(null, '', `/${hashRoute}`);
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <ThemeProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </ThemeProvider>
      </SessionProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
