import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ElectronService } from '../services/electron';
import { BackupService } from '../services/backup.service';
import { TagModule } from 'primeng/tag';

@Component({
  selector: 'app-settings',
  imports: [CommonModule, ButtonModule, ConfirmDialogModule, ToastModule, TagModule],
  templateUrl: './settings.html',
  styleUrl: './settings.css',
  providers: [ConfirmationService, MessageService],
})
export class Settings implements OnInit, OnDestroy {
  electronService = inject(ElectronService);
  backupService = inject(BackupService);
  confirmationService = inject(ConfirmationService);
  messageService = inject(MessageService);

  loading = false;

  updateLoading = false;
  updateSupported = false;
  appVersion = '';
  updateStatus: 'idle' | 'checking' | 'available' | 'not_available' | 'downloading' | 'downloaded' | 'error' =
    'idle';
  updateAvailableVersion: string | null = null;
  updateProgressPercent: number | null = null;
  updateError: string | null = null;
  lastUpdateCheckAt: string | null = null;
  private updatePollTimerId: number | null = null;

  ngOnInit() {
    void this.refreshUpdateStatus();
  }

  ngOnDestroy() {
    this.stopUpdatePolling();
  }

  private stopUpdatePolling() {
    if (this.updatePollTimerId !== null) {
      window.clearInterval(this.updatePollTimerId);
      this.updatePollTimerId = null;
    }
  }

  private startUpdatePolling() {
    this.stopUpdatePolling();
    this.updatePollTimerId = window.setInterval(async () => {
      await this.refreshUpdateStatus();
      if (this.updateStatus === 'downloaded' || this.updateStatus === 'error' || this.updateStatus === 'idle') {
        this.stopUpdatePolling();
      }
    }, 1000);
  }

  private applyUpdateState(state: any) {
    const supported = Boolean(state?.supported);
    this.updateSupported = supported;
    this.updateStatus = (state?.status as any) ?? 'idle';
    this.updateAvailableVersion = typeof state?.info?.version === 'string' ? state.info.version : null;
    this.updateProgressPercent =
      typeof state?.progress?.percent === 'number' ? Math.round(state.progress.percent) : null;
    this.updateError = typeof state?.error === 'string' ? state.error : null;
    this.lastUpdateCheckAt = typeof state?.lastCheckedAt === 'string' ? state.lastCheckedAt : null;
  }

  async refreshUpdateStatus() {
    if (!this.electronService.isElectron()) {
      this.updateSupported = false;
      this.updateStatus = 'idle';
      this.appVersion = '';
      this.updateAvailableVersion = null;
      this.updateProgressPercent = null;
      this.updateError = null;
      this.lastUpdateCheckAt = null;
      return;
    }

    const [appVersion, state] = await Promise.all([
      this.electronService.invoke('get-app-version'),
      this.electronService.invoke('get-update-status'),
    ]);

    this.appVersion = typeof appVersion === 'string' ? appVersion : '';
    this.applyUpdateState(state);
  }

  async checkUpdates() {
    if (!this.electronService.isElectron()) return;
    this.updateLoading = true;
    try {
      await this.electronService.invoke('check-for-updates');
      await this.refreshUpdateStatus();
      if (this.updateStatus === 'available') {
        this.messageService.add({
          severity: 'info',
          summary: $localize`:@@toastUpdatesSummary:Updates`,
          detail: $localize`:@@toastUpdateAvailableDetail:An update is available.`,
        });
      } else if (this.updateStatus === 'not_available') {
        this.messageService.add({
          severity: 'success',
          summary: $localize`:@@toastUpdatesSummary:Updates`,
          detail: $localize`:@@toastNoUpdatesDetail:You are on the latest version.`,
        });
      }
    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: $localize`:@@toastUpdatesSummary:Updates`,
        detail: $localize`:@@toastUpdateCheckFailedDetail:Failed to check for updates.`,
      });
    } finally {
      this.updateLoading = false;
    }
  }

  async downloadUpdate() {
    if (!this.electronService.isElectron()) return;
    this.updateLoading = true;
    try {
      const ok = await this.electronService.invoke('download-update');
      await this.refreshUpdateStatus();
      if (ok) this.startUpdatePolling();
    } finally {
      this.updateLoading = false;
    }
  }

  async installUpdate() {
    if (!this.electronService.isElectron()) return;
    await this.electronService.invoke('quit-and-install-update');
  }

  resetDatabase() {
    this.confirmationService.confirm({
      header: $localize`:@@confirmResetDatabaseHeader:Reset Database`,
      message: $localize`:@@confirmResetDatabaseMessage:Are you sure you want to delete all data? This action cannot be undone.`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: async () => {
        try {
          this.loading = true;
          await this.electronService.invoke('reset-db');
          this.messageService.add({
            severity: 'success',
            summary: $localize`:@@toastSuccessSummary:Success`,
            detail: $localize`:@@toastResetDatabaseSuccessDetail:Database has been reset. Please restart the app.`,
          });
        } catch (error) {
          console.error('Error resetting database:', error);
          this.messageService.add({
            severity: 'error',
            summary: $localize`:@@toastErrorSummary:Error`,
            detail: $localize`:@@toastResetDatabaseErrorDetail:Failed to reset database`,
          });
        } finally {
          this.loading = false;
        }
      },
    });
  }

  seedDatabase() {
    this.confirmationService.confirm({
      header: $localize`:@@confirmSeedDatabaseHeader:Seed Database`,
      message: $localize`:@@confirmSeedDatabaseMessage:This will add mock data to the database. Continue?`,
      icon: 'pi pi-info-circle',
      accept: async () => {
        try {
          this.loading = true;
          await this.electronService.invoke('seed-db');
          this.messageService.add({
            severity: 'success',
            summary: $localize`:@@toastSuccessSummary:Success`,
            detail: $localize`:@@toastSeedDatabaseSuccessDetail:Mock data seeded successfully.`,
          });
        } catch (error) {
          console.error('Error seeding database:', error);
          this.messageService.add({
            severity: 'error',
            summary: $localize`:@@toastErrorSummary:Error`,
            detail: $localize`:@@toastSeedDatabaseErrorDetail:Failed to seed database`,
          });
        } finally {
          this.loading = false;
        }
      },
    });
  }

  async exportBackup() {
    try {
      this.loading = true;
      const success = await this.backupService.exportBackup();
      if (success) {
        this.messageService.add({
          severity: 'success',
          summary: $localize`:@@toastSuccessSummary:Success`,
          detail: $localize`:@@toastExportBackupSuccessDetail:Backup exported successfully.`,
        });
      }
    } catch (error) {
      console.error('Error exporting backup:', error);
      this.messageService.add({
        severity: 'error',
        summary: $localize`:@@toastErrorSummary:Error`,
        detail: $localize`:@@toastExportBackupErrorDetail:Failed to export backup.`,
      });
    } finally {
      this.loading = false;
    }
  }

  async importBackup() {
    this.confirmationService.confirm({
      header: $localize`:@@confirmImportBackupHeader:Import Backup`,
      message: $localize`:@@confirmImportBackupMessage:This will overwrite your current data. Are you sure you want to continue?`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: async () => {
        try {
          this.loading = true;
          const success = await this.backupService.importBackup();
          if (success) {
            this.messageService.add({
              severity: 'success',
              summary: $localize`:@@toastSuccessSummary:Success`,
              detail: $localize`:@@toastImportBackupSuccessDetail:Backup imported successfully. Please restart the application.`,
            });
          }
        } catch (error) {
          console.error('Error importing backup:', error);
          this.messageService.add({
            severity: 'error',
            summary: $localize`:@@toastErrorSummary:Error`,
            detail: $localize`:@@toastImportBackupErrorDetail:Failed to import backup.`,
          });
        } finally {
          this.loading = false;
        }
      },
    });
  }
}
