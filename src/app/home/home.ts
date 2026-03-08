import { Component, OnInit, inject } from '@angular/core';
import { TabsModule } from 'primeng/tabs';
import { Router, RouterModule, NavigationEnd } from '@angular/router';

@Component({
  selector: 'app-home',
  imports: [TabsModule, RouterModule],
  templateUrl: './home.html',
  styleUrl: './home.css',
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
}
