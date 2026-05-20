import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { FormsModule } from '@angular/forms';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { UserService } from '../services/user.service';
import { BadgeModule } from 'primeng/badge';
import { OverlayBadgeModule } from 'primeng/overlaybadge';
import { ChipModule } from 'primeng/chip';
import { ButtonModule } from 'primeng/button';
import { UserForm } from './user-form/user-form';
import { CommonModule } from '@angular/common';
import { ScrollPanelModule } from 'primeng/scrollpanel';
import { UserTableItem } from '../shared/components/user-display/user-table-item';
import { ActivatedRoute, Router } from '@angular/router';
import { ToolbarModule } from 'primeng/toolbar';
import type { UserWithDetails } from '../../shared/types/models';

@Component({
  selector: 'app-users',
  imports: [
    CommonModule,
    TableModule,
    DialogModule,
    FormsModule,
    IconFieldModule,
    InputIconModule,
    InputTextModule,
    BadgeModule,
    OverlayBadgeModule,
    ChipModule,
    ButtonModule,
    UserForm,
    ScrollPanelModule,
    UserTableItem,
    ToolbarModule,
  ],
  templateUrl: './users.html',
  styleUrl: './users.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Users implements OnInit {
  private userService = inject(UserService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private destroyRef = inject(DestroyRef);

  searchValue: string | undefined;

  // All users loaded from the IPC layer (un-filtered). Source of truth.
  protected readonly allUsers = signal<UserWithDetails[]>([]);

  // Optional `?locationId=` filter applied to the table.
  protected readonly locationIdFilter = signal<number | null>(null);

  // Derived view: respects `locationIdFilter` when set.
  protected readonly users = computed<UserWithDetails[]>(() => {
    const filter = this.locationIdFilter();
    const all = this.allUsers();
    return filter == null
      ? all
      : all.filter((u) => Number(u?.location?.id) === filter);
  });

  protected readonly loading = signal(true);
  protected readonly formDrawerVisible = signal(false);
  protected readonly editingUser = signal<UserWithDetails | null>(null);
  private selectedUser: UserWithDetails | null = null;

  ngOnInit() {
    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        const raw = this.route.snapshot.queryParamMap.get('locationId');
        const id = raw ? Number(raw) : NaN;
        this.locationIdFilter.set(Number.isFinite(id) ? id : null);
        const action = this.route.snapshot.queryParamMap.get('action');
        if (action === 'add') {
          this.openAddUser();
          this.router.navigate([], {
            queryParams: { action: null },
            queryParamsHandling: 'merge',
            replaceUrl: true,
          });
        }
        void this.loadUsers();
      });
  }

  getUserDialogHeader(): string {
    return this.editingUser()
      ? $localize`:@@editUserDialogHeader:Edit User`
      : $localize`:@@addUserDialogHeader:Add User`;
  }

  async loadUsers() {
    try {
      this.loading.set(true);
      this.allUsers.set(await this.userService.getAll());
    } finally {
      this.loading.set(false);
    }
  }

  openDetail(user: UserWithDetails) {
    this.selectedUser = user;
    this.router.navigate(['/users', user.id], { state: { user } });
  }

  openAddUser(event?: Event) {
    event?.stopPropagation();
    event?.preventDefault();
    this.editingUser.set(null);
    this.formDrawerVisible.set(true);
  }

  openEditUser(user: UserWithDetails) {
    this.editingUser.set(user);
    this.formDrawerVisible.set(true);
  }

  async onFormSave() {
    this.formDrawerVisible.set(false);
    await this.loadUsers();
    if (this.selectedUser) {
      const refreshed = this.users().find((u) => u.id === this.selectedUser?.id);
      if (refreshed) this.selectedUser = refreshed;
    }
  }

  onFormCancel() {
    this.formDrawerVisible.set(false);
  }
}
