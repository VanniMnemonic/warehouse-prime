import { Routes } from '@angular/router';
import { Home } from './home/home';
import { Users } from './users/users';
import { Dashboard } from './dashboard/dashboard';
import { Assets } from './assets/assets';
import { Withdrawals } from './withdrawals/withdrawals';
import { Settings } from './settings/settings';

export const routes: Routes = [
  {
    path: '',
    component: Home,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: Dashboard },
      { path: 'users', component: Users },
      { path: 'assets', component: Assets },
      { path: 'withdrawals', component: Withdrawals },
      { path: 'settings', component: Settings },
    ],
  },
];
