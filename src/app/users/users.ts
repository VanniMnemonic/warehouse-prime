import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { TableModule } from 'primeng/table';
import { AvatarModule } from 'primeng/avatar';
import { DrawerModule } from 'primeng/drawer';
import { FormsModule } from '@angular/forms';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { UserService } from '../services/user.service';
import { UserDetail } from './user-detail/user-detail';
import { BadgeModule } from 'primeng/badge';
import { OverlayBadgeModule } from 'primeng/overlaybadge';
import { ChipModule } from 'primeng/chip';
import { ButtonModule } from 'primeng/button';
import { UserForm } from './user-form/user-form';
import { CommonModule } from '@angular/common';
import { SplitButtonModule } from 'primeng/splitbutton';
import { MenuItem } from 'primeng/api';
import { ScrollPanelModule } from 'primeng/scrollpanel';
import { LocationDisplay } from '../shared/components/location-display';
import { TagModule } from 'primeng/tag';

@Component({
  selector: 'app-users',
  imports: [
    CommonModule,
    TableModule,
    AvatarModule,
    DrawerModule,
    FormsModule,
    IconFieldModule,
    InputIconModule,
    InputTextModule,
    UserDetail,
    BadgeModule,
    OverlayBadgeModule,
    ChipModule,
    ButtonModule,
    UserForm,
    SplitButtonModule,
    ScrollPanelModule,
    LocationDisplay,
    TagModule,
  ],
  templateUrl: './users.html',
  styleUrl: './users.css',
})
export class Users implements OnInit {
  userService = inject(UserService);
  cdr = inject(ChangeDetectorRef);

  selectedUser: any;
  searchValue: string | undefined;
  users: any[] = [];
  loading: boolean = true;
  drawerVisible: boolean = false;
  formDrawerVisible: boolean = false;
  editingUser: any = null;

  ngOnInit() {
    this.loadUsers();
  }

  items: MenuItem[] = [
    {
      label: 'Edit',
      icon: 'pi pi-pencil',
      command: () => {
        this.openEditUser(this.selectedUser);
      },
    },
    {
      label: 'Add Withdrawal',
      icon: 'pi pi-cart-plus',
      command: () => {
        console.log('Add withdrawal for:', this.selectedUser);
        // TODO: Implement add withdrawal logic
      },
    },
  ];

  setMenuUser(user: any) {
    this.selectedUser = user;
  }

  async loadUsers() {
    try {
      this.loading = true;
      this.users = await this.userService.getAll();
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  openDetail(user: any) {
    this.selectedUser = user;
    this.drawerVisible = true;
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
