import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';

import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { FormsModule } from '@angular/forms';

import { QuestionBankService } from '../../services/question-bank.service';
import { Subject, SubjectService, Topic } from '../../services/subject.service';
import { MatDividerModule } from "@angular/material/divider";
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { Subject as RxSubject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { ConfirmActionDialogComponent } from '../../shared/confirm-action-dialog.component';

@Component({
  selector: 'app-question-bank',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatIconModule,
    MatPaginatorModule,
    FormsModule,
    MatDividerModule,
    MatSnackBarModule
  ],
  templateUrl: './question-bank.component.html',
  styleUrls: ['./question-bank.component.css']
})
export class QuestionBankComponent implements OnInit, OnDestroy {

  private readonly searchChanges = new RxSubject<string>();
  private readonly destroy$ = new RxSubject<void>();

  questionForm!: FormGroup;
  questions: any[] = [];

  isEditMode = false;
  editingId: number | null = null;

  difficulties = ['EASY', 'MEDIUM', 'HARD'];

  subjects: Subject[] = [];
  topics: Topic[] = [];
  filterTopics: Topic[] = [];

  selectedSubjectId: number | null = null;
  selectedTopicId: number | null = null;

  // pagination
  page = 0;
  pageSize = 10;
  totalElements = 0;
  loading = false;
  saving = false;
  attemptedSubmit = false;

  // filters (only for listing)
  filters = {
    subject: '',
    topic: '',
    difficulty: '',
    q: ''
  };



  constructor(
    private fb: FormBuilder,
    private questionBankService: QuestionBankService,
    private subjectService: SubjectService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) { }

  ngOnInit(): void {
    this.initForm();
    this.loadQuestions();
    this.subjectService.getSubjects(true).subscribe(res => {
      this.subjects = res;
      if (this.filters.subject) {
        this.filterTopics = this.subjects.find(subject => subject.name === this.filters.subject)?.topics || [];
      }
    });
    this.searchChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(() => this.onFilterChange());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.searchChanges.complete();
  }

  initForm() {
    this.questionForm = this.fb.group({
      text: ['', Validators.required],
      optionA: ['', Validators.required],
      optionB: ['', Validators.required],
      optionC: [''],
      optionD: [''],
      correctOptionIndex: [0, Validators.required],
      difficulty: ['EASY', Validators.required],
      marks: [1, Validators.required],
      subject: ['', Validators.required],
      topic: ['', Validators.required]
    }, { validators: this.validateOptionsAndIndex });
  }

  private validateOptionsAndIndex = (control: AbstractControl): ValidationErrors | null => {
    const rawIndex = control.get('correctOptionIndex')?.value;
    const options = ['optionA', 'optionB', 'optionC', 'optionD']
      .map(name => String(control.get(name)?.value || '').trim());
    const enteredCount = options.filter(Boolean).length;
    const hasGap = options.slice(0, enteredCount).some(option => !option);
    if (rawIndex === null || rawIndex === '') return null;
    const index = Number(rawIndex);
    return enteredCount >= 2 && !hasGap
      && Number.isInteger(index) && index >= 0 && index < enteredCount
      ? null
      : { invalidOptionsOrIndex: true };
  };

  get optionLabels(): string[] {
    return ['A', 'B', 'C', 'D'];
  }

  loadQuestions() {
    this.loading = true;
    this.questionBankService.getPaged({
      page: this.page,
      size: this.pageSize,
      ...this.filters
    }).subscribe(res => {
      this.questions = res.content || [];
      this.totalElements = res.totalElements;
      this.loading = false;
    }, () => {
      this.loading = false;
      this.snackBar.open('Could not load questions. Please try again.', 'Dismiss', { duration: 4000 });
    });
  }

  onPageChange(event: PageEvent) {
    this.page = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadQuestions();
  }

  onFilterChange() {
    this.page = 0;
    this.loadQuestions();
  }

  onSearchInput(value: string): void {
    this.searchChanges.next(value);
  }

  onFilterSubjectChange(subjectName: string) {
    this.filterTopics = this.subjects.find(subject => subject.name === subjectName)?.topics || [];
    if (!this.filterTopics.some(topic => topic.name === this.filters.topic)) this.filters.topic = '';
    this.onFilterChange();
  }


  submit() {
    this.attemptedSubmit = true;
    this.questionForm.markAllAsTouched();
    if (this.questionForm.invalid || this.saving) return;

    const formValue = this.questionForm.value;
    const options = [formValue.optionA, formValue.optionB, formValue.optionC, formValue.optionD]
      .map((option: string) => String(option || '').trim());
    while (options.length && !options[options.length - 1]) options.pop();
    const payload = {
      text: formValue.text,
      options: options.join(' || '),
      correctOptionIndex: Number(formValue.correctOptionIndex),
      difficulty: formValue.difficulty,
      marks: Number(formValue.marks),
      subject: formValue.subject,
      topic: formValue.topic,
    };
    this.saving = true;

    if (this.isEditMode && this.editingId !== null) {
      this.questionBankService.update(this.editingId, payload).subscribe(() => {
        this.saving = false;
        this.snackBar.open('Question updated.', 'Dismiss', { duration: 2500 });
        this.reset();
        this.loadQuestions();
      }, () => this.handleSaveError());
    } else {
      this.questionBankService.create(payload).subscribe(() => {
        this.saving = false;
        this.snackBar.open('Question added.', 'Dismiss', { duration: 2500 });
        this.reset();
        this.loadQuestions();
      }, () => this.handleSaveError());
    }
  }

  private handleSaveError(): void {
    this.saving = false;
    this.snackBar.open('Could not save the question. Check the fields and try again.', 'Dismiss', { duration: 4000 });
  }

  edit(q: any) {
    this.isEditMode = true;
    this.editingId = q.id;

    // populate topics based on subject
    const subject = this.subjects.find(s => s.name === q.subject);
    this.topics = subject?.topics || [];

    const options = String(q.options || '').split('||').map(option => option.trim());
    this.questionForm.patchValue({
      ...q,
      optionA: options[0] || '',
      optionB: options[1] || '',
      optionC: options[2] || '',
      optionD: options[3] || '',
    });
  }


  delete(id: number) {
    const question = this.questions.find(item => Number(item.id) === Number(id));
    this.dialog.open(ConfirmActionDialogComponent, {
      width: '480px', maxWidth: 'calc(100vw - 32px)', panelClass: 'confirm-action-dialog-panel',
      data: {
        title: 'Delete question?',
        messages: [question?.text ? `Are you sure you want to delete “${question.text}”?` : 'Are you sure you want to delete this question?', 'This action can’t be undone.'],
        confirmLabel: 'Delete'
      }
    }).afterClosed().subscribe(confirmed => {
      if (!confirmed) return;
      this.questionBankService.delete(id).subscribe(() => {
        this.snackBar.open('Question deleted.', 'Dismiss', { duration: 2500 });
        if (this.questions.length === 1 && this.page > 0) this.page--;
        this.loadQuestions();
      }, () => this.snackBar.open('Could not delete the question. Please try again.', 'Dismiss', { duration: 4000 }));
    });
  }

  reset() {
    this.isEditMode = false;
    this.editingId = null;
    this.topics = [];
    this.attemptedSubmit = false;
    this.saving = false;

    this.questionForm.reset({
      difficulty: 'EASY',
      marks: 1,
      correctOptionIndex: 0
    });
  }


  onSubjectChange(subjectName: string) {
    const subject = this.subjects.find(s => s.name === subjectName);
    this.topics = subject?.topics || [];

    // reset topic when subject changes
    this.questionForm.patchValue({ topic: '' });
  }



}
