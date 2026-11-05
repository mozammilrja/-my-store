import React from 'react';
import { SessionProvider } from './lib/session';
import { App } from './App';

/** /admin/*: the store administration (was apps/admin), on the portal session. */
export default function AdminArea() {
  return (
    <SessionProvider>
      <App />
    </SessionProvider>
  );
}
