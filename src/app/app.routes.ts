import { Routes } from '@angular/router';
import { Home } from './home/home';
import { Users } from './users/users';
import { UserDetailPage } from './users/user-detail-page/user-detail-page';
import { Dashboard } from './dashboard/dashboard';
import { Assets } from './assets/assets';
import { AssetDetailPage } from './assets/asset-detail-page/asset-detail-page';
import { Withdrawals } from './withdrawals/withdrawals';
import { Settings } from './settings/settings';
import { Locations } from './locations/locations';

export const routes: Routes = [
  {
    path: '',
    component: Home,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: Dashboard },
      { path: 'users', component: Users, data: { animation: 'usersList' } },
      { path: 'users/:id', component: UserDetailPage, data: { animation: 'usersDetail' } },
      { path: 'locations', component: Locations },
      { path: 'assets', component: Assets, data: { animation: 'assetsList' } },
      { path: 'assets/:id', component: AssetDetailPage, data: { animation: 'assetsDetail' } },
      { path: 'withdrawals', component: Withdrawals },
      { path: 'settings', component: Settings },
    ],
  },
];
