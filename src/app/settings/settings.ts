import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ElectronService } from '../services/electron';
import { BackupService } from '../services/backup.service';

@Component({
  selector: 'app-settings',
  imports: [CommonModule, ButtonModule, ConfirmDialogModule, ToastModule],
  templateUrl: './settings.html',
  styleUrl: './settings.css',
  providers: [ConfirmationService, MessageService],
})
export class Settings {
  electronService = inject(ElectronService);
  backupService = inject(BackupService);
  confirmationService = inject(ConfirmationService);
  messageService = inject(MessageService);

  loading = false;

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
