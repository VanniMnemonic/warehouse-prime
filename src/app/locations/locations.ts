import { Component, OnInit, inject, signal } from '@angular/core';
import { OrganizationChartModule } from 'primeng/organizationchart';
import { MenuItem, TreeNode } from 'primeng/api';
import { LocationService } from '../services/location.service';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { LocationForm } from './location-form/location-form';
import { CommonModule } from '@angular/common';
import { DrawerModule } from 'primeng/drawer';
import { TreeModule } from 'primeng/tree';
import { DragDropModule } from 'primeng/dragdrop';
import { TreeDragDropService } from 'primeng/api';
import { SpeedDialModule } from 'primeng/speeddial';
import { TooltipModule } from 'primeng/tooltip';
import { Router } from '@angular/router';
import { BatchService } from '../services/batch.service';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';

@Component({
  selector: 'app-locations',
  imports: [
    OrganizationChartModule,
    ButtonModule,
    DialogModule,
    DrawerModule,
    TreeModule,
    DragDropModule,
    SpeedDialModule,
    TooltipModule,
    TableModule,
    TagModule,
    LocationForm,
    CommonModule,
  ],
  templateUrl: './locations.html',
  styleUrl: './locations.css',
  providers: [TreeDragDropService],
})
export class Locations implements OnInit {
  locationService = inject(LocationService);
  batchService = inject(BatchService);
  router = inject(Router);

  activeSpeedDialLocationId = signal<number | null>(null);

  data = signal<TreeNode[]>([]);
  locations = signal<any[]>([]);
  loading = signal(true);
  drawerVisible = signal(false);
  selectedLocation = signal<any>(null);
  editingLocation = signal<any>(null);
  hierarchyDrawerVisible = signal(false);
  hierarchyData = signal<TreeNode[]>([]);
  hierarchySelection = signal<any>(null);
  hierarchyDirty = signal(false);
  hierarchySaving = signal(false);

  batchesDialogVisible = signal(false);
  batchesLoading = signal(false);
  selectedLocationForBatches = signal<any>(null);
  batches = signal<any[]>([]);

  ngOnInit() {
    void this.loadLocations();
  }

  async loadLocations() {
    this.loading.set(true);
    try {
      const locations = await this.locationService.getAll();
      this.locations.set(locations);
      const tree = this.buildTree(locations, { expanded: true });
      this.data.set(tree);
    } catch (error) {
      this.locations.set([]);
      this.data.set([]);
      console.error(error);
    } finally {
      this.loading.set(false);
    }
  }

  buildTree(locations: any[], options: { expanded: boolean }): TreeNode[] {
    const locationMap = new Map<number, any>();
    const roots: TreeNode[] = [];

    locations.forEach((loc) => {
      locationMap.set(loc.id, {
        label: loc.denomination,
        type: 'default',
        styleClass: '',
        expanded: options.expanded,
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

    this.sortTreeNodes(roots);
    return roots;
  }

  private sortTreeNodes(nodes: TreeNode[], visited = new Set<string>()) {
    nodes.sort((a: any, b: any) => {
      const ao = Number(a?.data?.sort_order ?? 0);
      const bo = Number(b?.data?.sort_order ?? 0);
      if (ao !== bo) return ao - bo;
      const aid = Number(a?.data?.id ?? 0);
      const bid = Number(b?.data?.id ?? 0);
      return aid - bid;
    });
    for (const node of nodes) {
      const key = String((node as any)?.key ?? (node as any)?.data?.id ?? '');
      if (key) {
        if (visited.has(key)) continue;
        visited.add(key);
      }
      const children = (node.children ?? []) as TreeNode[];
      if (children.length) this.sortTreeNodes(children, visited);
    }
  }

  addSubLocation(location: any) {
    this.selectedLocation.set(location);
    this.editingLocation.set(null);
    this.drawerVisible.set(true);
  }

  addRootLocation() {
    this.selectedLocation.set(null);
    this.editingLocation.set(null);
    this.drawerVisible.set(true);
  }

  editLocation(location: any) {
    this.selectedLocation.set(null);
    this.editingLocation.set(location);
    this.drawerVisible.set(true);
  }

  openHierarchy() {
    this.hierarchyData.set(this.buildTree(this.locations(), { expanded: true }));
    this.hierarchySelection.set(null);
    this.hierarchyDirty.set(false);
    this.hierarchyDrawerVisible.set(true);
  }

  private findNodeByKey(nodes: TreeNode[], key: string): TreeNode | null {
    for (const node of nodes) {
      if ((node as any)?.key === key) return node;
      const children = (node.children ?? []) as TreeNode[];
      if (children.length) {
        const found = this.findNodeByKey(children, key);
        if (found) return found;
      }
    }
    return null;
  }

  openHierarchyForMove(location: any) {
    const tree = this.buildTree(this.locations(), { expanded: true });
    this.hierarchyData.set(tree);
    const key = String(location?.id ?? '');
    const node = key ? this.findNodeByKey(tree, key) : null;
    this.hierarchySelection.set(node);
    this.hierarchyDirty.set(false);
    this.hierarchyDrawerVisible.set(true);
  }

  onHierarchyDrawerVisibleChange(visible: boolean) {
    this.hierarchyDrawerVisible.set(visible);
  }

  private closeHierarchyDrawerAndReload() {
    this.hierarchyDrawerVisible.set(false);
    setTimeout(() => {
      void this.loadLocations();
    }, 0);
  }

  viewUsers(location: any) {
    const id = Number(location?.id);
    if (!Number.isFinite(id)) return;
    this.router.navigate(['/users'], { queryParams: { locationId: id } });
  }

  async viewBatches(location: any) {
    const id = Number(location?.id);
    if (!Number.isFinite(id)) return;
    this.selectedLocationForBatches.set(location);
    this.batchesDialogVisible.set(true);
    this.batchesLoading.set(true);
    try {
      const batches = await this.batchService.getByLocation(id);
      this.batches.set(batches);
    } finally {
      this.batchesLoading.set(false);
    }
  }

  openAssetFromBatch(batch: any) {
    const asset = batch?.asset;
    const assetId = Number(asset?.id);
    if (!Number.isFinite(assetId)) return;
    this.router.navigate(['/assets', assetId], { state: { asset } });
  }

  closeSpeedDial() {
    this.activeSpeedDialLocationId.set(null);
  }

  onSpeedDialVisibleChange(locationId: number, visible: boolean) {
    if (visible) {
      this.activeSpeedDialLocationId.set(locationId);
    } else if (this.activeSpeedDialLocationId() === locationId) {
      this.activeSpeedDialLocationId.set(null);
    }
  }

  getNodeActions(location: any): MenuItem[] {
    const close = () => this.closeSpeedDial();
    return [
      {
        label: 'Aggiungi',
        icon: 'pi pi-plus',
        command: () => {
          close();
          this.addSubLocation(location);
        },
      },
      {
        label: 'Modifica',
        icon: 'pi pi-pencil',
        command: () => {
          close();
          this.editLocation(location);
        },
      },
      {
        label: 'Sposta',
        icon: 'pi pi-sitemap',
        command: () => {
          close();
          this.openHierarchyForMove(location);
        },
      },
      {
        label: 'Utenti',
        icon: 'pi pi-users',
        command: () => {
          close();
          this.viewUsers(location);
        },
      },
      {
        label: 'Lotti',
        icon: 'pi pi-box',
        command: () => {
          close();
          void this.viewBatches(location);
        },
      },
    ];
  }

  private nodeContainsKey(node: any, key: string): boolean {
    const children = (node?.children ?? []) as any[];
    for (const child of children) {
      const childKey = (child?.key ?? child?.data?.id?.toString?.()) as string | undefined;
      if (childKey === key) return true;
      if (this.nodeContainsKey(child, key)) return true;
    }
    return false;
  }

  onHierarchyNodeDrop(event: any) {
    const dragNode = event?.dragNode;
    const dropNode = event?.dropNode;

    const dragKey = (dragNode?.key ?? dragNode?.data?.id?.toString?.()) as string | undefined;
    const dropKey = (dropNode?.key ?? dropNode?.data?.id?.toString?.()) as string | undefined;

    if (dragKey && dropKey) {
      if (dragKey === dropKey) return;
      if (this.nodeContainsKey(dragNode, dropKey)) return;
    }

    if (typeof event?.accept === 'function') {
      event.accept();
    }

    queueMicrotask(() => {
      this.hierarchyDirty.set(true);
      this.hierarchyData.set([...this.hierarchyData()]);
    });
  }

  private flattenHierarchy(
    nodes: TreeNode[],
    parentId: number | null,
    visited: Set<number>,
    current: Map<number, { parent_id: number | null; sort_order: number }>,
  ) {
    const updates: Array<{ id: number; parent_id: number | null; sort_order: number }> = [];
    for (let index = 0; index < nodes.length; index++) {
      const node: any = nodes[index];
      const id = Number(node?.data?.id);
      if (!Number.isFinite(id)) continue;
      if (visited.has(id)) continue;
      visited.add(id);

      const desired = { parent_id: parentId, sort_order: index };
      const prev = current.get(id);
      if (
        !prev ||
        prev.parent_id !== desired.parent_id ||
        Number(prev.sort_order) !== desired.sort_order
      ) {
        updates.push({ id, ...desired });
      }

      const children = (node.children ?? []) as TreeNode[];
      if (children.length) {
        updates.push(...this.flattenHierarchy(children, id, visited, current));
      }
    }
    return updates;
  }

  async saveHierarchy() {
    if (this.hierarchySaving() || !this.hierarchyDirty()) return;
    this.hierarchySaving.set(true);
    try {
      const current = new Map<number, { parent_id: number | null; sort_order: number }>();
      for (const loc of this.locations()) {
        const id = Number(loc?.id);
        if (!Number.isFinite(id)) continue;
        current.set(id, {
          parent_id: loc.parent_id ?? null,
          sort_order: Number(loc.sort_order ?? 0),
        });
      }

      const updates = this.flattenHierarchy(this.hierarchyData(), null, new Set<number>(), current);
      if (updates.length) {
        await this.locationService.updateHierarchy(updates);
      }
      this.hierarchyDirty.set(false);
      this.closeHierarchyDrawerAndReload();
    } finally {
      this.hierarchySaving.set(false);
    }
  }

  onLocationSaved() {
    this.drawerVisible.set(false);
    this.selectedLocation.set(null);
    this.editingLocation.set(null);
    setTimeout(() => {
      void this.loadLocations();
    }, 0);
  }
}
