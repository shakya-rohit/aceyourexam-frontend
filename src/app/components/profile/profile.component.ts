import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule, MatDialogActions } from '@angular/material/dialog';
import { ApiService } from '../../services/api.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-profile-settings',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatListModule,
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
  avatarPreview: string | null = null;
  active: 'profile' | 'account' | 'security' | 'danger' = 'profile';

  initials: string = '';

  editForm: FormGroup = new FormGroup({
    name: new FormControl('', [Validators.required, Validators.minLength(2)]),
    email: new FormControl({ value: '', disabled: true }, [Validators.required, Validators.email])
  });

  ngOnInit(): void { this.loadProfile(); }

  select(section: any) { this.active = section; }

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
    const token = localStorage.getItem('AYE_TOKEN');
    let userEmail: string | undefined;
    const userData = localStorage.getItem('AYE_USER');
    if (userData) {
      try { userEmail = JSON.parse(userData).email; } catch {}
    }
    this.isLoading = true;
    this.api.getProfileByEmail(userEmail || '').subscribe({
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

  saveProfile() {
    if (this.editForm.invalid) return;
    var email;
    const userData = localStorage.getItem('AYE_USER');
      if (userData) {
        try {
          const parsed = JSON.parse(userData);
          email = parsed.email;
        } catch {
          console.error("Wrong user data", userData);
          return;
        }
      }
      
    const payload = { name: this.editForm.value.name, email: email };
    this.api.updateProfile(payload).subscribe({
      next: (res) => {
        this.user = { ...this.user, ...res };
        // update initials in case name changed
        this.initials = this.computeInitials(this.user.name);
        this.snack.open('Profile updated', 'OK', { duration: 2000 });
      },
      error: (err) => {
        console.error(err);
        this.snack.open('Failed to update profile', 'OK', { duration: 3000 });
      }
    });
  }

  onAvatarChange(event: any) {
    const file: File = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => this.avatarPreview = reader.result as string;
    reader.readAsDataURL(file);

    const fd = new FormData();
    fd.append('avatar', file);
    this.api.uploadAvatar(fd).subscribe({
      next: (res) => {
        if (res?.avatarUrl) { this.user.avatarUrl = res.avatarUrl; this.avatarPreview = res.avatarUrl; }
        this.snack.open('Avatar uploaded', 'OK', { duration: 2000 });
      },
      error: (e) => { console.error(e); this.snack.open('Avatar upload failed', 'OK', { duration: 3000 }); }
    });
  }

  removeAvatar() {
    if (!confirm('Remove avatar?')) return;
    this.avatarPreview = null;
    this.api.deleteAvatar().subscribe({
      next: () => { this.user.avatarUrl = null; this.snack.open('Avatar removed', 'OK', { duration: 2000 }); },
      error: () => { this.user.avatarUrl = null; this.snack.open('Avatar removed locally', 'OK', { duration: 2000 }); }
    });
  }

  openChangePassword() {
    // keep your dialog implementation or existing dialog component
    const ref = this.dialog.open(ChangePasswordDialog, { width: '420px' });
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
    if (!confirm('Delete account? This cannot be undone.')) return;
    this.api.deleteAccount().subscribe({
      next: () => { this.snack.open('Account deleted', 'OK', { duration: 2000 }); this.api.logout(); this.router.navigate(['/login']); },
      error: (e) => { console.error(e); this.snack.open('Failed to delete', 'OK', { duration: 3000 }); }
    });
  }
}

/* ---------------- Change Password Dialog Component ---------------- */

import { MatDialogRef } from '@angular/material/dialog';
import { Component as C2 } from '@angular/core';

@C2({
  selector: 'change-password-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, MatSnackBarModule, MatDialogActions],
  template: `
    <h2 mat-dialog-title>Change Password</h2>
    <mat-dialog-content [formGroup]="form" class="dialog-content">
      <mat-form-field appearance="fill" class="full">
        <mat-label>Current Password</mat-label>
        <input matInput type="password" formControlName="current" />
      </mat-form-field>
      <mat-form-field appearance="fill" class="full">
        <mat-label>New Password</mat-label>
        <input matInput type="password" formControlName="newp" />
      </mat-form-field>
      <mat-form-field appearance="fill" class="full">
        <mat-label>Confirm New</mat-label>
        <input matInput type="password" formControlName="confirm" />
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="close()">Cancel</button>
      <button mat-raised-button color="primary" (click)="submit()" [disabled]="form.invalid">Change</button>
    </mat-dialog-actions>
  `,
  styles: [`.full{width:100%;} .dialog-content{min-width:320px}`]
})
export class ChangePasswordDialog {
  private api = inject(ApiService);
  private snack = inject(MatSnackBar);
  private dialogRef = inject(MatDialogRef<ChangePasswordDialog>);

  form = new FormGroup({
    current: new FormControl('', [Validators.required]),
    newp: new FormControl('', [Validators.required, Validators.minLength(6)]),
    confirm: new FormControl('', [Validators.required])
  });

  submit() {
    if (this.form.invalid) return;
    if (this.form.value.newp !== this.form.value.confirm) {
      this.snack.open('Passwords do not match', 'OK', { duration: 2000 });
      return;
    }

    var email;
    const userData = localStorage.getItem('AYE_USER');
      if (userData) {
        try {
          const parsed = JSON.parse(userData);
          email = parsed.email;
        } catch {
          console.error("Wrong user data", userData);
          return;
        }
      }

    const payload = { email: email, currentPassword: this.form.value.current, newPassword: this.form.value.newp };
    this.api.changePassword(payload).subscribe({
      next: () => { this.dialogRef.close({ success: true }); },
      error: (e) => { console.error(e); this.snack.open('Change failed', 'OK', { duration: 3000 }); }
    });
  }

  close() { this.dialogRef.close(); }
}
