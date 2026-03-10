import { Component, OnInit, inject } from '@angular/core';
import { TabsModule } from 'primeng/tabs';
import { NavigationEnd, Router, RouterModule, RouterOutlet } from '@angular/router';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { animate, group, query, style, transition, trigger } from '@angular/animations';

@Component({
  selector: 'app-home',
  imports: [TabsModule, RouterModule, ToastModule],
  templateUrl: './home.html',
  styleUrl: './home.css',
  providers: [MessageService],
  animations: [
    trigger('routeAnimations', [
      transition('assetsList => assetsDetail', [
        query(':enter, :leave', style({ position: 'absolute', top: 0, left: 0, width: '100%' }), {
          optional: true,
        }),
        group([
          query(
            ':leave',
            [
              style({ opacity: 1, transform: 'translateX(0)' }),
              animate('180ms ease', style({ opacity: 0, transform: 'translateX(-24px)' })),
            ],
            { optional: true },
          ),
          query(
            ':enter',
            [
              style({ opacity: 1, transform: 'translateX(100%)' }),
              animate('280ms cubic-bezier(0.2, 0, 0, 1)', style({ opacity: 1, transform: 'translateX(0)' })),
            ],
            { optional: true },
          ),
        ]),
      ]),
      transition('assetsDetail => assetsList', [
        query(':enter, :leave', style({ position: 'absolute', top: 0, left: 0, width: '100%' }), {
          optional: true,
        }),
        group([
          query(
            ':leave',
            [
              style({ opacity: 1, transform: 'translateX(0)' }),
              animate('220ms ease', style({ opacity: 0, transform: 'translateX(100%)' })),
            ],
            { optional: true },
          ),
          query(
            ':enter',
            [
              style({ opacity: 0, transform: 'translateX(-24px)' }),
              animate('240ms ease', style({ opacity: 1, transform: 'translateX(0)' })),
            ],
            { optional: true },
          ),
        ]),
      ]),
      transition('* <=> *', [
        query(':enter, :leave', style({ position: 'absolute', top: 0, left: 0, width: '100%' }), {
          optional: true,
        }),
        group([
          query(
            ':leave',
            [
              style({ opacity: 1, transform: 'translateX(0)' }),
              animate('180ms ease', style({ opacity: 0, transform: 'translateX(-12px)' })),
            ],
            { optional: true },
          ),
          query(
            ':enter',
            [
              style({ opacity: 0, transform: 'translateX(12px)' }),
              animate('220ms ease', style({ opacity: 1, transform: 'translateX(0)' })),
            ],
            { optional: true },
          ),
        ]),
      ]),
    ]),
  ],
})
export class Home implements OnInit {
  router = inject(Router);
  activeTab = 'dashboard';

  tabs = [
    {
      route: 'dashboard',
      label: 'Dashboard',
      icon: 'pi pi-home',
    },
    {
      route: 'users',
      label: 'Users',
      icon: 'pi pi-user',
    },
    {
      route: 'assets',
      label: 'Assets',
      icon: 'pi pi-box',
    },
    {
      route: 'withdrawals',
      label: 'Withdrawals',
      icon: 'pi pi-upload',
    },
    {
      route: 'locations',
      label: 'Locations',
      icon: 'pi pi-map-marker',
    },
    {
      route: 'settings',
      label: 'Settings',
      icon: 'pi pi-cog',
    },
  ];

  ngOnInit() {
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        const url = event.urlAfterRedirects.split('/')[1];
        if (this.tabs.some((t) => t.route === url)) {
          this.activeTab = url;
        }
      }
    });

    // Set initial tab
    const url = this.router.url.split('/')[1];
    if (this.tabs.some((t) => t.route === url)) {
      this.activeTab = url;
    }
  }

  prepareRoute(outlet: RouterOutlet) {
    if (!outlet?.isActivated) return '';
    return outlet?.activatedRouteData?.['animation'] ?? outlet?.activatedRoute?.routeConfig?.path ?? '';
  }
}
