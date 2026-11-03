import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface ConfirmActionDialogData {
  title: string;
  messages: string[];
  confirmLabel: string;
  danger?: boolean;
}

@Component({
  selector: 'app-confirm-action-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <div class="confirm-dialog-header">
      <h2 mat-dialog-title>{{ data.title }}</h2>
      <button mat-icon-button type="button" aria-label="Close confirmation" (click)="close()">
        <mat-icon>close</mat-icon>
      </button>
    </div>
    <mat-dialog-content>
      <ul>
        <li *ngFor="let message of data.messages">{{ message }}</li>
      </ul>
    </mat-dialog-content>
    <mat-dialog-actions>
      <button mat-stroked-button type="button" (click)="close()">Cancel</button>
      <button mat-stroked-button [color]="data.danger === false ? 'primary' : 'warn'" [class.confirm-delete-button]="data.danger !== false" type="button" (click)="confirm()">
        {{ data.confirmLabel }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    :host { display: block; color: #20263a; }
    .confirm-dialog-header { display: flex; align-items: center; justify-content: space-between; min-height: 64px; padding: 0 16px 0 24px; border-bottom: 1px solid #e3e7ed; }
    h2[mat-dialog-title] { margin: 0 !important; padding: 0; font-size: 18px; font-weight: 600; line-height: 1.4; }
    .confirm-dialog-header button { color: #667085; }
    mat-dialog-content { padding: 24px; color: #343a46; font-size: 16px; line-height: 1.55; }
    mat-dialog-content ul { margin: 0; padding-left: 20px; }
    mat-dialog-content li + li { margin-top: 4px; }
    mat-dialog-actions { justify-content: flex-end; gap: 8px; padding: 0 24px 20px; }
    mat-dialog-actions button { min-width: 82px; border-radius: 7px; transition: background-color 140ms ease, color 140ms ease, box-shadow 140ms ease; }
    mat-dialog-actions button[color="warn"]:hover:not(:disabled) { color: #fff; background: #c62828; box-shadow: 0 2px 6px rgba(160, 24, 24, 0.28); }
    mat-dialog-actions button[color="warn"]:focus-visible { outline: 3px solid rgba(198, 40, 40, 0.3); outline-offset: 2px; }
    mat-dialog-actions button[color="primary"]:hover:not(:disabled) { color: #fff; background: #3949ab; box-shadow: 0 2px 6px rgba(57, 73, 171, 0.25); }
    mat-dialog-actions button[color="primary"]:focus-visible { outline: 3px solid rgba(57, 73, 171, 0.28); outline-offset: 2px; }
  `]
})
export class ConfirmActionDialogComponent {
  constructor(
    private dialogRef: MatDialogRef<ConfirmActionDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmActionDialogData
  ) {}

  close(): void { this.dialogRef.close(false); }
  confirm(): void { this.dialogRef.close(true); }
}
