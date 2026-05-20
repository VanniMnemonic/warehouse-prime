import { Routes } from '@angular/router';
import { Home } from './home/home';

// Feature components are loaded lazily so they ship as per-route chunks
// instead of being bundled into main.js. Detail pages are split too -- the
// table page and the detail page rarely render in the same session.
export const routes: Routes = [
  {
    path: '',
    component: Home,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () => import('./dashboard/dashboard').then((m) => m.Dashboard),
      },
      {
        path: 'users',
        loadComponent: () => import('./users/users').then((m) => m.Users),
        data: { animation: 'usersList' },
      },
      {
        path: 'users/:id',
        loadComponent: () =>
          import('./users/user-detail-page/user-detail-page').then((m) => m.UserDetailPage),
        data: { animation: 'usersDetail' },
      },
      {
        path: 'locations',
        loadComponent: () => import('./locations/locations').then((m) => m.Locations),
      },
      {
        path: 'assets',
        loadComponent: () => import('./assets/assets').then((m) => m.Assets),
        data: { animation: 'assetsList' },
      },
      {
        path: 'assets/:id',
        loadComponent: () =>
          import('./assets/asset-detail-page/asset-detail-page').then((m) => m.AssetDetailPage),
        data: { animation: 'assetsDetail' },
      },
      {
        path: 'withdrawals',
        loadComponent: () => import('./withdrawals/withdrawals').then((m) => m.Withdrawals),
      },
      {
        path: 'withdrawals/:id',
        loadComponent: () =>
          import('./withdrawals/withdrawal-detail-page/withdrawal-detail-page').then(
            (m) => m.WithdrawalDetailPage,
          ),
        data: { animation: 'withdrawalsDetail' },
      },
      {
        path: 'settings',
        loadComponent: () => import('./settings/settings').then((m) => m.Settings),
      },
    ],
  },
];
