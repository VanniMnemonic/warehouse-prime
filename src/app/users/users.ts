import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
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
import { LocationDisplay } from '../shared/components/location-display';
import { TagModule } from 'primeng/tag';
import { ImageDisplay } from '../shared/components/image-display/image-display';
import { ActivatedRoute, Router } from '@angular/router';
import { ToolbarModule } from 'primeng/toolbar';

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
    LocationDisplay,
    TagModule,
    ImageDisplay,
    ToolbarModule,
  ],
  templateUrl: './users.html',
  styleUrl: './users.css',
})
export class Users implements OnInit {
  userService = inject(UserService);
  cdr = inject(ChangeDetectorRef);
  router = inject(Router);
  route = inject(ActivatedRoute);

  selectedUser: any;
  searchValue: string | undefined;
  allUsers: any[] = [];
  users: any[] = [];
  loading: boolean = true;
  formDrawerVisible: boolean = false;
  editingUser: any = null;
  locationIdFilter: number | null = null;

  ngOnInit() {
    this.route.queryParamMap.subscribe(() => {
      const raw = this.route.snapshot.queryParamMap.get('locationId');
      const id = raw ? Number(raw) : NaN;
      this.locationIdFilter = Number.isFinite(id) ? id : null;
      void this.loadUsers();
    });
  }

  getUserDialogHeader(): string {
    return this.editingUser
      ? $localize`:@@editUserDialogHeader:Edit User`
      : $localize`:@@addUserDialogHeader:Add User`;
  }

  async loadUsers() {
    try {
      this.loading = true;
      this.allUsers = await this.userService.getAll();
      this.users = this.locationIdFilter
        ? this.allUsers.filter((u) => Number(u?.location?.id) === this.locationIdFilter)
        : this.allUsers;
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  openDetail(user: any) {
    this.selectedUser = user;
    this.router.navigate(['/users', user.id], { state: { user } });
  }

  openAddUser(event: Event) {
    console.log('openAddUser clicked');
    event.stopPropagation();
    event.preventDefault();
    this.editingUser = null;
    this.formDrawerVisible = true;
    console.log('formDrawerVisible set to:', this.formDrawerVisible);
    this.cdr.detectChanges();
  }

  openEditUser(user: any) {
    console.log('openEditUser clicked for:', user);
    this.editingUser = user;
    this.formDrawerVisible = true;
    console.log('formDrawerVisible set to:', this.formDrawerVisible);
  }

  async onFormSave() {
    this.formDrawerVisible = false;
    await this.loadUsers();

    if (this.selectedUser) {
      // Find the updated user in the refreshed list
      const updatedUser = this.users.find((u) => u.id === this.selectedUser.id);
      if (updatedUser) {
        this.selectedUser = updatedUser;
        this.cdr.detectChanges();
      }
    }
  }

  onFormCancel() {
    this.formDrawerVisible = false;
  }
}
