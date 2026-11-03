import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ApiService } from '../../services/api.service';
import { Router } from '@angular/router';
import { ConfirmActionDialogComponent } from '../../shared/confirm-action-dialog.component';

@Component({
  selector: 'app-profile-settings',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSnackBarModule,
    MatDialogModule
  ],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit {
  private api = inject(ApiService);
  private snack = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  private router = inject(Router);

  user: any = { name: '', email: '' };
  stats: any = { examsTaken: 0, avgScore: 0, lastActive: new Date().toISOString() };
  isLoading = false;
  isSavingProfile = false;
  avatarUploading = false;
  avatarPreview: string | null = null;
  active: 'profile' | 'account' | 'security' | 'danger' = 'profile';

  initials: string = '';

  editForm: FormGroup = new FormGroup({
    name: new FormControl('', [Validators.required, Validators.minLength(2)]),
    email: new FormControl({ value: '', disabled: true }, [Validators.required, Validators.email])
  });

  ngOnInit(): void { this.loadProfile(); }

  select(section: 'profile' | 'account' | 'security' | 'danger') { this.active = section; }

  get joinedText(): string {
    if (!this.user?.createdAt) return '';
    const date = new Date(this.user.createdAt);
    const now = new Date();
    const days = Math.floor((now.getTime()-date.getTime())/(1000*60*60*24));
    if (days === 0) return 'Joined today';
    if (days < 30) return `Joined ${days} day${days>1?'s':''} ago`;
    const months = Math.floor(days/30);
    if (months < 12) return `Joined ${months} month${months>1?'s':''} ago`;
    const years = Math.floor(months/12);
    return `Joined ${years} year${years>1?'s':''} ago`;
  }

  private computeInitials(name?: string): string {
    if (!name) return '';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) {
      return parts[0].charAt(0).toUpperCase();
    }
    const first = parts[0].charAt(0).toUpperCase();
    const last = parts[parts.length - 1].charAt(0).toUpperCase();
    return `${first}${last}`;
  }

  loadProfile() {
    let userEmail: string | undefined;
    const userData = localStorage.getItem('AYE_USER');
    if (userData) {
      try { userEmail = JSON.parse(userData).email; } catch {}
    }
    this.isLoading = true;
    this.api.getMyProfile().subscribe({
      next: (res) => {
        this.user = res || {};
        this.user.name = this.user.name || 'John Doe';
        this.user.email = this.user.email || userEmail || 'you@example.com';
        this.user.createdAt = this.user.createdAt || new Date().toISOString();
        this.user.role = this.user.role || 'Student';
        this.avatarPreview = this.user.avatarUrl || null;
        this.initials = this.computeInitials(this.user.name);
        this.editForm.patchValue({ name: this.user.name, email: this.user.email });

        // stats
        this.api.getUserStats(this.user.email).subscribe({
          next: s => this.stats = s,
          error: () => this.stats = { examsTaken: 0, avgScore: 0, lastActive: new Date().toISOString() }
        });
        this.isLoading = false;
      },
      error: (e) => {
        console.error(e);
        // fallback
        this.user = { name:'John Doe', email: userEmail||'you@example.com', createdAt: new Date().toISOString(), role:'Student' };
        this.initials = this.computeInitials(this.user.name);
        this.editForm.patchValue({ name: this.user.name, email: this.user.email });
        this.isLoading = false;
      }
    });
  }

  saveProfile(): void {
    if (this.editForm.invalid || this.isSavingProfile) return;
    const name = String(this.editForm.get('name')?.value || '').trim();
    this.isSavingProfile = true;
    this.api.updateProfile({ name }).subscribe({
      next: () => {
        this.user = { ...this.user, name };
        this.initials = this.computeInitials(name);
        try {
          const storedUser = JSON.parse(localStorage.getItem('AYE_USER') || '{}');
          localStorage.setItem('AYE_USER', JSON.stringify({ ...storedUser, name }));
        } catch { /* the profile remains saved on the server */ }
        this.editForm.patchValue({ name });
        this.editForm.markAsPristine();
        this.snack.open('Profile updated', 'OK', { duration: 2000 });
        this.isSavingProfile = false;
      },
      error: (err) => {
        console.error(err);
        this.snack.open('Failed to update profile. Please try again.', 'OK', { duration: 3000 });
        this.isSavingProfile = false;
      }
    });
  }

  cancelProfileEdit(): void {
    this.editForm.patchValue({ name: this.user.name, email: this.user.email });
    this.editForm.markAsPristine();
  }

  onAvatarChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      this.snack.open('Choose a PNG, JPG, or WebP image.', 'OK', { duration: 3000 });
      input.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.snack.open('Choose an image smaller than 5 MB.', 'OK', { duration: 3000 });
      input.value = '';
      return;
    }

    const previousPreview = this.avatarPreview;
    const reader = new FileReader();
    reader.onload = () => {
      this.avatarPreview = reader.result as string;
      this.avatarUploading = true;
      const fd = new FormData();
      fd.append('avatar', file);
      this.api.uploadAvatar(fd).subscribe({
        next: (res) => {
          this.avatarUploading = false;
          if (res?.avatarUrl) {
            this.user.avatarUrl = res.avatarUrl;
            this.avatarPreview = res.avatarUrl;
            this.snack.open('Avatar updated', 'OK', { duration: 2000 });
          } else {
            this.avatarPreview = previousPreview;
            this.snack.open('Avatar upload is not available right now.', 'OK', { duration: 3000 });
          }
          input.value = '';
        },
        error: (err) => {
          console.error(err);
          this.avatarUploading = false;
          this.avatarPreview = previousPreview;
          this.snack.open('Avatar upload failed. Please try again.', 'OK', { duration: 3000 });
          input.value = '';
        }
      });
    };
    reader.onerror = () => {
      this.snack.open('Could not read that image. Please try another file.', 'OK', { duration: 3000 });
      input.value = '';
    };
    reader.readAsDataURL(file);
  }

  removeAvatar() {
    this.dialog.open(ConfirmActionDialogComponent, {
      width: '480px', maxWidth: 'calc(100vw - 32px)', panelClass: 'confirm-action-dialog-panel',
      data: { title: 'Remove profile photo?', messages: ['Are you sure you want to remove your profile photo?'], confirmLabel: 'Remove' }
    }).afterClosed().subscribe(confirmed => {
      if (!confirmed) return;
      this.api.deleteAvatar().subscribe({
        next: () => { this.user.avatarUrl = null; this.avatarPreview = null; this.snack.open('Avatar removed', 'OK', { duration: 2000 }); },
        error: (err) => { console.error(err); this.snack.open('Could not remove avatar. Please try again.', 'OK', { duration: 3000 }); }
      });
    });
  }

  openChangePassword() {
    // keep your dialog implementation or existing dialog component
    const ref = this.dialog.open(ChangePasswordDialog, {
      width: '480px', maxWidth: 'calc(100vw - 32px)', panelClass: 'confirm-action-dialog-panel'
    });
    ref.afterClosed().subscribe(result => {
      if (result?.success){
        this.snack.open('Password changed', 'OK', { duration: 2000 });
        this.logout();
      }
    });
  }

  logout(): void {
    this.api.logout();
    this.router.navigate(['/']);
  }

  confirmDelete() {
    this.dialog.open(ConfirmActionDialogComponent, {
      width: '480px', maxWidth: 'calc(100vw - 32px)', panelClass: 'confirm-action-dialog-panel',
      data: { title: 'Delete account?', messages: ['This will permanently delete your account and its associated profile.', 'This action can’t be undone.'], confirmLabel: 'Delete account' }
    }).afterClosed().subscribe(confirmed => {
      if (!confirmed) return;
      this.api.deleteAccount().subscribe({
        next: () => { this.snack.open('Account deleted', 'OK', { duration: 2000 }); this.api.logout(); this.router.navigate(['/login']); },
        error: (e) => { console.error(e); this.snack.open('Failed to delete', 'OK', { duration: 3000 }); }
      });
    });
  }
}

/* ---------------- Change Password Dialog Component ---------------- */

import { MatDialogRef } from '@angular/material/dialog';
import { Component as C2 } from '@angular/core';

@C2({
  selector: 'change-password-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule],
  template: `
    <div class="password-dialog-header">
      <div>
        <h2 mat-dialog-title>Change password</h2>
        <p>Choose a new password to keep your account secure.</p>
      </div>
      <button mat-icon-button type="button" aria-label="Close change password dialog" (click)="close()">
        <mat-icon>close</mat-icon>
      </button>
    </div>
    <mat-dialog-content [formGroup]="form" class="password-dialog-content">
      <mat-form-field appearance="outline" class="full">
        <mat-label>Current password</mat-label>
        <input matInput [type]="showCurrent ? 'text' : 'password'" formControlName="current" autocomplete="current-password" />
        <button mat-icon-button matSuffix type="button" (click)="showCurrent = !showCurrent" [attr.aria-label]="showCurrent ? 'Hide current password' : 'Show current password'">
          <mat-icon>{{ showCurrent ? 'visibility_off' : 'visibility' }}</mat-icon>
        </button>
        <mat-error *ngIf="form.controls.current.hasError('required')">Enter your current password.</mat-error>
      </mat-form-field>
      <mat-form-field appearance="outline" class="full">
        <mat-label>New password</mat-label>
        <input matInput [type]="showNew ? 'text' : 'password'" formControlName="newp" autocomplete="new-password" />
        <button mat-icon-button matSuffix type="button" (click)="showNew = !showNew" [attr.aria-label]="showNew ? 'Hide new password' : 'Show new password'">
          <mat-icon>{{ showNew ? 'visibility_off' : 'visibility' }}</mat-icon>
        </button>
        <mat-hint>At least 6 characters</mat-hint>
        <mat-error *ngIf="form.controls.newp.hasError('required')">Enter a new password.</mat-error>
        <mat-error *ngIf="form.controls.newp.hasError('minlength')">Use at least 6 characters.</mat-error>
      </mat-form-field>
      <mat-form-field appearance="outline" class="full">
        <mat-label>Confirm new password</mat-label>
        <input matInput [type]="showConfirm ? 'text' : 'password'" formControlName="confirm" autocomplete="new-password" />
        <button mat-icon-button matSuffix type="button" (click)="showConfirm = !showConfirm" [attr.aria-label]="showConfirm ? 'Hide confirmation password' : 'Show confirmation password'">
          <mat-icon>{{ showConfirm ? 'visibility_off' : 'visibility' }}</mat-icon>
        </button>
        <mat-error *ngIf="form.controls.confirm.hasError('required')">Confirm your new password.</mat-error>
      </mat-form-field>
      <p class="password-error" role="alert" *ngIf="errorMessage">{{ errorMessage }}</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" (click)="close()" [disabled]="isSubmitting">Cancel</button>
      <button mat-flat-button color="primary" type="button" (click)="submit()" [disabled]="form.invalid || isSubmitting">
        {{ isSubmitting ? 'Updating…' : 'Update password' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    :host { display: block; color: #20263a; }
    .password-dialog-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; padding: 22px 24px 18px; border-bottom: 1px solid #e3e7ed; }
    h2[mat-dialog-title] { margin: 0 !important; padding: 0; font-size: 20px; font-weight: 650; line-height: 1.35; }
    .password-dialog-header p { margin: 6px 0 0; color: #70778a; font-size: 13px; line-height: 1.45; }
    .password-dialog-header button { margin: -7px -8px 0 0; color: #667085; }
    .password-dialog-content { display: flex; flex-direction: column; gap: 8px; min-width: 360px; padding: 22px 24px 8px; }
    .full { width: 100%; }
    mat-form-field { font-size: 14px; }
    mat-dialog-actions { gap: 8px; padding: 8px 24px 22px; }
    mat-dialog-actions button { min-height: 40px; border-radius: 7px; }
    .password-error { margin: 0 0 8px; color: #b42318; font-size: 13px; }
    @media (max-width: 480px) { .password-dialog-content { min-width: 0; } }
  `]
})
export class ChangePasswordDialog {
  private api = inject(ApiService);
  private dialogRef = inject(MatDialogRef<ChangePasswordDialog>);
  showCurrent = false;
  showNew = false;
  showConfirm = false;
  isSubmitting = false;
  errorMessage = '';

  form = new FormGroup({
    current: new FormControl('', [Validators.required]),
    newp: new FormControl('', [Validators.required, Validators.minLength(6)]),
    confirm: new FormControl('', [Validators.required])
  });

  submit() {
    if (this.form.invalid) return;
    if (this.form.value.newp !== this.form.value.confirm) {
      this.errorMessage = 'The new password and confirmation do not match.';
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';
    const payload = {
      currentPassword: this.form.value.current || '',
      newPassword: this.form.value.newp || ''
    };
    this.api.changePassword(payload).subscribe({
      next: () => { this.dialogRef.close({ success: true }); },
      error: (e) => {
        console.error(e);
        this.isSubmitting = false;
        this.errorMessage = e?.error?.message || 'Could not update your password. Check your current password and try again.';
      }
    });
  }

  close() { this.dialogRef.close(); }
}
