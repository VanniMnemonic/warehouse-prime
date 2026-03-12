import { Component, OnInit, inject, signal } from '@angular/core';
import { OrganizationChartModule } from 'primeng/organizationchart';
import { TreeNode, MenuItem } from 'primeng/api';
import { LocationService } from '../services/location.service';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { LocationForm } from './location-form/location-form';
import { CommonModule } from '@angular/common';
import { SpeedDialModule } from 'primeng/speeddial';

@Component({
  selector: 'app-locations',
  imports: [
    OrganizationChartModule,
    ButtonModule,
    DialogModule,
    LocationForm,
    CommonModule,
    SpeedDialModule,
  ],
  templateUrl: './locations.html',
  styleUrl: './locations.css',
})
export class Locations implements OnInit {
  locationService = inject(LocationService);

  data = signal<TreeNode[]>([]);
  loading = signal(true);
  drawerVisible = signal(false);
  selectedLocation = signal<any>(null);
  flatLocations = signal<any[]>([]);
  debugSimpleView = signal(false);

  items: MenuItem[] = [
    {
      icon: 'pi pi-plus',
      tooltipOptions: {
        tooltipLabel: 'Add Root Location',
      },
      command: () => {
        this.addRootLocation();
      },
    },
    {
      icon: 'pi pi-list',
      tooltipOptions: {
        tooltipLabel: 'Toggle Debug View',
      },
      command: () => {
        this.debugSimpleView.set(!this.debugSimpleView());
      },
    },
  ];

  ngOnInit() {
    console.log('[locations-page] ngOnInit');
    void this.loadLocations();
  }

  async loadLocations() {
    const startedAt = performance.now();
    console.log('[locations-page] loadLocations:start');
    this.loading.set(true);
    try {
      const locations = await this.locationService.getAll();
      console.log('[locations-page] loadLocations:fetched', { count: locations.length });
      this.flatLocations.set(locations);
      const tree = this.buildTree(locations);
      console.log('[locations-page] loadLocations:builtTree', { roots: tree.length });
      this.data.set(tree);
      const elapsedMs = Math.round(performance.now() - startedAt);
      console.log('[locations-page] loadLocations:done', { elapsedMs });
    } catch (error) {
      const elapsedMs = Math.round(performance.now() - startedAt);
      console.error('[locations-page] loadLocations:error', { elapsedMs, error });
      this.data.set([]);
      this.flatLocations.set([]);
    } finally {
      this.loading.set(false);
    }
  }

  buildTree(locations: any[]): TreeNode[] {
    const locationMap = new Map<number, any>();
    const roots: TreeNode[] = [];

    // First pass: create nodes and map them by ID
    locations.forEach((loc) => {
      locationMap.set(loc.id, {
        label: loc.denomination,
        type: 'default',
        styleClass: '',
        expanded: true,
        data: loc,
        children: [],
        key: loc.id.toString(),
      });
    });

    // Second pass: build hierarchy
    locations.forEach((loc) => {
      const node = locationMap.get(loc.id);
      if (loc.parent_id) {
        const parent = locationMap.get(loc.parent_id);
        if (parent) {
          parent.children.push(node);
        }
      } else {
        roots.push(node);
      }
    });

    return roots;
  }

  addSubLocation(location: any) {
    this.selectedLocation.set(location);
    this.drawerVisible.set(true);
  }

  addRootLocation() {
    this.selectedLocation.set(null);
    this.drawerVisible.set(true);
  }

  onLocationSaved() {
    console.log('[locations-page] onLocationSaved');
    this.drawerVisible.set(false);
    setTimeout(() => {
      console.log('[locations-page] onLocationSaved:refresh');
      void this.loadLocations();
    }, 0);
  }
}
