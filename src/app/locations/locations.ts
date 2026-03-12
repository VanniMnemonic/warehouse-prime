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
  ];

  ngOnInit() {
    void this.loadLocations();
  }

  async loadLocations() {
    this.loading.set(true);
    try {
      const locations = await this.locationService.getAll();
      const tree = this.buildTree(locations);
      this.data.set(tree);
    } catch (error) {
      this.data.set([]);
      console.error(error);
    } finally {
      this.loading.set(false);
    }
  }

  buildTree(locations: any[]): TreeNode[] {
    const locationMap = new Map<number, any>();
    const roots: TreeNode[] = [];

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
    this.drawerVisible.set(false);
    setTimeout(() => {
      void this.loadLocations();
    }, 0);
  }
}
