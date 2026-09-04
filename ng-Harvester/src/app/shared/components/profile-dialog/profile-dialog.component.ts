import { Component, Inject, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { TranslationService } from '../../services/translation.service';

export interface ProfileDialogData {
  name: string;
  phone: string;
  businessName?: string;
}

@Component({
  selector: 'app-profile-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule
  ],
  templateUrl: './profile-dialog.component.html',
  styleUrls: ['./profile-dialog.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class ProfileDialogComponent {
  name = '';
  phone = '';
  businessName = '';

  constructor(
    public dialogRef: MatDialogRef<ProfileDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ProfileDialogData,
    public translationService: TranslationService
  ) {
    this.name = data.name || '';
    this.phone = data.phone || '';
    this.businessName = data.businessName || '';
  }

  onSave(): void {
    const trimmedName = this.name.trim();
    const trimmedPhone = this.phone.trim();
    if (!trimmedName) return;

    this.dialogRef.close({
      name: trimmedName,
      phone: trimmedPhone,
      businessName: this.businessName.trim()
    });
  }

  onCancel(): void {
    this.dialogRef.close(null);
  }
}
