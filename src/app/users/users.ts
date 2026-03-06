import { Component, OnInit, inject } from '@angular/core';
import { SplitterModule } from 'primeng/splitter';
import { ScrollPanelModule } from 'primeng/scrollpanel';
import { TableModule } from 'primeng/table';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { ElectronService } from '../services/electron';

@Component({
  selector: 'app-users',
  imports: [
    SplitterModule,
    ScrollPanelModule,
    TableModule,
    CommonModule,
    FormsModule,
    IconFieldModule,
    InputIconModule,
    InputTextModule,
  ],
  templateUrl: './users.html',
  styleUrl: './users.css',
})
export class Users implements OnInit {
  electronService = inject(ElectronService);
  selectedUser: any;
  searchValue: string | undefined;
  users: any[] = [];

  ngOnInit() {
    this.loadUsers();
  }

  async loadUsers() {
    this.users = await this.electronService.getUsers();
  }
}
