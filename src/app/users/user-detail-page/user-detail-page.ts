import { Component, NgZone, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { UserService } from '../../services/user.service';
import { UserDetail } from '../user-detail/user-detail';
import { UserForm } from '../user-form/user-form';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-user-detail-page',
  imports: [CommonModule, ButtonModule, DialogModule, UserDetail, UserForm],
  templateUrl: './user-detail-page.html',
  styleUrl: './user-detail-page.css',
})
export class UserDetailPage implements OnDestroy {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private userService = inject(UserService);
  private zone = inject(NgZone);
  private destroyed = false;
  private routeSub: Subscription | null = null;

  user: any = null;
  loading = true;

  formDrawerVisible = false;
  editingUser: any = null;

  get pageTitle() {
    const firstName = this.user?.first_name ?? '';
    const lastName = this.user?.last_name ?? '';
    const fullName = `${firstName} ${lastName}`.trim();
    return fullName || $localize`:@@userDetailTitle:User Detail`;
  }

  constructor() {
    const navigationUser = this.router.getCurrentNavigation()?.extras.state?.['user'];
    if (navigationUser) {
      this.user = navigationUser;
      this.loading = false;
    }

    this.routeSub = this.route.paramMap.subscribe(() => {
      this.loadUser();
    });
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.routeSub?.unsubscribe();
  }

  async loadUser() {
    const idParam = this.route.snapshot.paramMap.get('id');
    const userId = idParam ? Number(idParam) : NaN;
    if (!Number.isFinite(userId)) {
      if (this.destroyed) return;
      this.zone.run(() => {
        this.user = null;
        this.loading = false;
      });
      return;
    }

    if (this.user?.id === userId) {
      if (this.destroyed) return;
      this.zone.run(() => {
        this.loading = false;
      });
      return;
    }

    try {
      if (this.destroyed) return;
      this.zone.run(() => {
        this.loading = true;
      });
      const users = await this.userService.getAll();
      if (this.destroyed) return;
      const selectedUser = users.find((u: any) => u.id === userId) ?? null;
      this.zone.run(() => {
        this.user = selectedUser;
      });
    } finally {
      if (this.destroyed) return;
      this.zone.run(() => {
        this.loading = false;
      });
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
