import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Observable } from 'rxjs';
import { ConfirmationDialogComponent, ConfirmationDialogData } from '../components/confirmation-dialog/confirmation-dialog.component';

@Injectable({
  providedIn: 'root'
})
export class DialogService {
  constructor(private dialog: MatDialog) {}

  /**
   * Show a simple alert dialog
   */
  alert(message: string, title?: string, type: 'info' | 'warning' | 'error' | 'success' = 'info'): Observable<boolean> {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '400px',
      data: {
        title: title || 'Info',
        message,
        confirmText: 'OK',
        // cancelText omitted for alert (no cancel button)
        type
      } as ConfirmationDialogData,
      panelClass: 'custom-dialog-container'
    });

    return dialogRef.afterClosed();
  }

  /**
   * Show a confirmation dialog
   */
  confirm(
    message: string,
    title?: string,
    confirmText: string = 'Yes',
    cancelText: string = 'No',
    type: 'info' | 'warning' | 'error' | 'success' = 'warning'
  ): Observable<boolean> {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '400px',
      data: {
        title: title || 'Confirm',
        message,
        confirmText,
        cancelText,
        type
      } as ConfirmationDialogData,
      panelClass: 'custom-dialog-container'
    });

    return dialogRef.afterClosed();
  }
}

