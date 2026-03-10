import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { UserService } from '../../services/user.service';
import { UserDetail } from '../user-detail/user-detail';
import { UserForm } from '../user-form/user-form';

@Component({
  selector: 'app-user-detail-page',
  imports: [CommonModule, ButtonModule, DialogModule, UserDetail, UserForm],
  templateUrl: './user-detail-page.html',
  styleUrl: './user-detail-page.css',
})
export class UserDetailPage {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private userService = inject(UserService);
  private cdr = inject(ChangeDetectorRef);

  user: any = null;
  loading = true;

  formDrawerVisible = false;
  editingUser: any = null;

  constructor() {
    const navigationUser = this.router.getCurrentNavigation()?.extras.state?.['user'];
    if (navigationUser) {
      this.user = navigationUser;
      this.loading = false;
    }

    this.route.paramMap.subscribe(() => {
      this.loadUser();
    });
  }

  async loadUser() {
    const idParam = this.route.snapshot.paramMap.get('id');
    const userId = idParam ? Number(idParam) : NaN;
    if (!Number.isFinite(userId)) {
      this.user = null;
      this.loading = false;
      this.cdr.detectChanges();
      return;
    }

    if (this.user?.id === userId) {
      this.loading = false;
      this.cdr.detectChanges();
      return;
    }

    try {
      this.loading = true;
      this.cdr.detectChanges();
      const users = await this.userService.getAll();
      this.user = users.find((u: any) => u.id === userId) ?? null;
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  goBack() {
    this.router.navigate(['/users']);
  }

  openEditUser(user: any) {
    if (!user) return;
    this.editingUser = user;
    this.formDrawerVisible = true;
  }

  async onFormSave() {
    this.formDrawerVisible = false;
    await this.loadUser();
  }

  onFormCancel() {
    this.formDrawerVisible = false;
  }
}
