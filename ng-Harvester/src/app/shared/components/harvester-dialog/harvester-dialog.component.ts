import { Component, Inject, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { TranslationService } from '../../services/translation.service';

export interface HarvesterDialogData {
  mode: 'add' | 'edit';
  currentName?: string;
}

@Component({
  selector: 'app-harvester-dialog',
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
  templateUrl: './harvester-dialog.component.html',
  styleUrls: ['./harvester-dialog.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class HarvesterDialogComponent {
  name = '';

  get isEdit(): boolean {
    return this.data.mode === 'edit';
  }

  get title(): string {
    return this.isEdit
      ? this.translationService.get('settings.editHarvester')
      : this.translationService.get('settings.addHarvester');
  }

  get placeholder(): string {
    return this.translationService.get('settings.harvesterNamePlaceholder');
  }

  constructor(
    public dialogRef: MatDialogRef<HarvesterDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: HarvesterDialogData,
    public translationService: TranslationService
  ) {
    this.name = data.currentName?.trim() ?? '';
  }

  onSave(): void {
    const trimmed = this.name.trim();
    if (!trimmed) return;
    this.dialogRef.close(trimmed);
  }

  onCancel(): void {
    this.dialogRef.close(null);
  }
}
