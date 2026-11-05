import React, { Suspense, lazy } from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, Navigate, Outlet, RouterProvider, useLocation } from 'react-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { ThemeProvider } from './lib/theme';
import { PortalSessionProvider } from './portal/session';
import { HomeRedirect, PortalSpinner, RequireArea } from './portal/RequireArea';
import { LoginPage } from './portal/LoginPage';
import { ForgotPasswordPage, ResetPasswordPage } from './portal/AuthPages';
import { MODULE_ROUTES } from './routes';
import './index.css';

/*
 * The operations portal: one app, one sign-in, four areas. Each area loads
 * only when opened, and only for a session whose accounts include it
 * (RequireArea); the API enforces the same thing on every call.
 *
 *   /admin/*      store administration (was apps/admin)
 *   /warehouse/*  warehouse floor (was apps/warehouse)
 *   /delivery/*   own-fleet riders (was apps/rider)
 *   /seller/*     marketplace Seller Hub (was apps/seller)
 */

const AdminArea = lazy(() => import('./AdminArea'));
const WarehouseArea = lazy(() => import('./areas/warehouse'));
const DeliveryArea = lazy(() => import('./areas/delivery'));
const SellerArea = lazy(() => import('./areas/seller'));
const DeliveryRegister = lazy(() => import('./areas/delivery').then((m) => ({ default: m.DeliveryRegister })));
const SellerRegister = lazy(() => import('./areas/seller').then((m) => ({ default: m.SellerRegister })));
const AccountPage = lazy(() => import('./portal/AccountPage').then((m) => ({ default: m.AccountPage })));

/**
 * The admin used to route on the hash (#/products), then at the site root
 * (/products). Both kinds of link are still in bookmarks: the hash is turned
 * into a path before React mounts, and the old paths redirect under /admin.
 */
const hashRoute = window.location.hash.replace(/^#\/?/, '').trim();
if (hashRoute) {
  window.history.replaceState(null, '', `/${hashRoute}`);
}

function LegacyAdminRedirect() {
  const location = useLocation();
  return <Navigate to={`/admin${location.pathname}${location.search}${location.hash}`} replace />;
}

const area = (name, Component) => (
  <RequireArea area={name}>
    <Suspense fallback={<PortalSpinner />}>
      <Component />
    </Suspense>
  </RequireArea>
);

const lazyPage = (Component) => (
  <Suspense fallback={<PortalSpinner />}>
    <Component />
  </Suspense>
);

function Root() {
  return <Outlet />;
}

const router = createBrowserRouter([
  {
    element: <Root />,
    children: [
      { path: '/', element: <HomeRedirect /> },
      { path: '/login', element: <LoginPage /> },
      { path: '/forgot-password', element: <ForgotPasswordPage /> },
      { path: '/reset-password', element: <ResetPasswordPage /> },
      { path: '/delivery/register', element: lazyPage(DeliveryRegister) },
      { path: '/seller/register', element: lazyPage(SellerRegister) },
      { path: '/account', element: <RequireArea area="any">{lazyPage(AccountPage)}</RequireArea> },
      { path: '/admin/*', element: area('admin', AdminArea) },
      { path: '/warehouse/*', element: area('warehouse', WarehouseArea) },
      { path: '/delivery/*', element: area('delivery', DeliveryArea) },
      { path: '/seller/*', element: area('seller', SellerArea) },
      // Old admin URLs at the site root: /products, /order-management/ORD-1 ...
      ...MODULE_ROUTES.map(({ path }) => ({ path: `/${path}/*`, element: <LegacyAdminRedirect /> })),
      { path: '*', element: <HomeRedirect /> },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <PortalSessionProvider>
        <ThemeProvider>
          <RouterProvider router={router} />
        </ThemeProvider>
      </PortalSessionProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
