import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatStepper, MatStepperModule } from '@angular/material/stepper';
import { MatDividerModule } from '@angular/material/divider';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';

import { ApiService } from '../../services/api.service';
import { MatOption } from "@angular/material/core";
import { MatSelect } from "@angular/material/select";
import { QuestionBankService } from '../../services/question-bank.service';
import { ExamType, ExamTypesService } from '../../services/exam-types.service';
import { Subject, SubjectService, Topic } from '../../services/subject.service';
import { Subject as RxSubject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { ConfirmActionDialogComponent } from '../../shared/confirm-action-dialog.component';

@Component({
  selector: 'app-create-exam',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCheckboxModule,
    MatIconModule,
    MatCardModule,
    MatStepperModule,
    MatDividerModule,
    MatOption,
    MatSelect,
    MatPaginatorModule,
    FormsModule,
    MatSnackBarModule
  ],
  templateUrl: './create-exam.component.html',
  styleUrls: ['./create-exam.component.css']
})
export class CreateExamComponent implements OnInit, OnDestroy {

  private readonly searchChanges = new RxSubject<string>();
  private readonly destroy$ = new RxSubject<void>();
  private questionBankRequestId = 0;

  examForm!: FormGroup;
  submitting = false;

  isEditMode = false;
  examId!: string;
  examStatus = '';
  examLoadError = false;
  loadingExam = false;
  questionBankError = '';

  get isPublished(): boolean {
    return this.examStatus.toUpperCase() === 'PUBLISH';
  }

  editingQuestionIndex: number | null = null;
  isAddingQuestion = false;
  newQuestionForm!: FormGroup;

  // ---------------- Question Bank Filters ----------------

  filters = {
    subject: '',
    topic: '',
    difficulty: [] as string[],
    q: '',
    examTypeId: null as number | null
  };


  // ---------------- QUESTION BANK (UI ONLY) ----------------

  // pagination
  pageSize = 5;
  pageIndex = 0;

  allQuestionBank: any[] = [];   // full result
  pagedQuestionBank: any[] = []; // current page

  // Selected questions pagination
  selectedPageSize = 5;
  selectedPageIndex = 0;

  pagedSelectedQuestions: any[] = [];
  selectedQuestions: any[] = [];
  loadingSelectedQuestions = false;

  showPreview = false;

  difficultyStats: {
    label: string;
    count: number;
    marks: number;
  }[] = [];

  reviewWarnings: string[] = [];

  examTypes: ExamType[] = [];
  isLoading: boolean = false;

  togglePreview() {
    this.showPreview = !this.showPreview;
  }

  computeReviewStats() {
    const levels = ['EASY', 'MEDIUM', 'HARD'];

    this.difficultyStats = levels.map(level => {
      const questions = this.selectedQuestions.filter(q =>
        (q.difficulty || 'EASY') === level
      );

      return {
        label: level,
        count: questions.length,
        marks: questions.reduce((s, q) => s + (q.marks || 0), 0)
      };
    });

    this.reviewWarnings = [];

    const totalNonEasy =
      this.difficultyStats.find(d => d.label === 'MEDIUM')!.count +
      this.difficultyStats.find(d => d.label === 'HARD')!.count;

    if (totalNonEasy === 0) {
      this.reviewWarnings.push('All questions are EASY.');
    }

    if (this.selectedQuestions.length < 5) {
      this.reviewWarnings.push('Exam has very few questions.');
    }

    if (this.totalSelectedMarks() < this.examForm.value.examDetails.durationMinutes) {
      this.reviewWarnings.push('Total marks are low compared to exam duration.');
    }
  }

  // ---------------- STEP 2: Selected Questions ----------------
  loadSelectedQuestions() {
    if (!this.examId) return;

    this.loadingSelectedQuestions = true;

    this.service.getQuestionsByExam(+this.examId).subscribe({
      next: (questions) => {
        this.selectedQuestions = questions || [];
        this.selectedPageIndex = 0;
        this.updatePagedSelectedQuestions();
        this.loadingSelectedQuestions = false;
        this.computeReviewStats();
      },
      error: () => {
        this.loadingSelectedQuestions = false;
        this.showError('Could not load this exam’s selected questions. Please try again.');
      }
    });
  }

  updatePagedSelectedQuestions() {
    const start = this.selectedPageIndex * this.selectedPageSize;
    const end = start + this.selectedPageSize;
    this.pagedSelectedQuestions = this.selectedQuestions.slice(start, end);
  }

  onSelectedPageChange(event: any) {
    this.selectedPageIndex = event.pageIndex;
    this.selectedPageSize = event.pageSize;
    this.updatePagedSelectedQuestions();
  }



  toggleSelection(q: any) {
    const idx = this.selectedQuestions.findIndex(x => x.id === q.id);
    if (idx >= 0) {
      this.selectedQuestions.splice(idx, 1);
    } else {
      this.selectedQuestions.push(q);
    }
  }

  isSelected(q: any): boolean {
    return this.selectedQuestions.some(x => x.id === q.id);
  }

  removeSelected(q: any) {
    this.selectedQuestions = this.selectedQuestions.filter(x => x.id !== q.id);
  }

  clearSelection() {
    this.selectedQuestions = [];
  }

  totalSelectedMarks(): number {
    return this.selectedQuestions.reduce(
      (sum, q) => sum + (q.marks || 0),
      0
    );
  }


  // ---------------- Question Bank Selection ----------------

  selectedQuestionBankIds = new Set<number>();
  addingFromBank = false;

  toggleQuestionBankSelection(qb: any) {
    if (this.isPublished) return;
    if (this.selectedQuestionBankIds.has(qb.id)) {
      this.selectedQuestionBankIds.delete(qb.id);
    } else {
      this.selectedQuestionBankIds.add(qb.id);
    }
  }

  isAlreadyInExam(qb: any): boolean {
    return this.selectedQuestions.some(q => q.text === qb.text);
  }

  addFromQuestionBank() {
    if (this.isPublished || this.selectedQuestionBankIds.size === 0 || !this.examId) return;

    this.addingFromBank = true;

    const payload = {
      questionBankIds: Array.from(this.selectedQuestionBankIds)
    };

    this.service
      .addQuestionsFromQuestionBank(this.examId, payload)
      .subscribe({
        next: () => {
          // clear local selection
          this.selectedQuestionBankIds.clear();

          // refresh selected questions from backend
          this.loadSelectedQuestions();

          this.addingFromBank = false;

          this.computeReviewStats();
        },
        error: () => {
          this.addingFromBank = false;
          this.showError('Could not add questions to this exam. Please try again.');
        }
      });
  }

  removeQuestion(questionId: number) {
    if (this.isPublished || !this.examId) return;

    const question = this.selectedQuestions.find(item => Number(item.id) === Number(questionId));
    this.dialog.open(ConfirmActionDialogComponent, {
      width: '480px', maxWidth: 'calc(100vw - 32px)', panelClass: 'confirm-action-dialog-panel',
      data: {
        title: 'Remove question from exam?',
        messages: [question?.text ? `Remove “${question.text}” from this exam?` : 'Remove this question from the exam?', 'The question will remain in your question bank.'],
        confirmLabel: 'Remove'
      }
    }).afterClosed().subscribe(confirmed => {
      if (!confirmed) return;
      this.service.removeQuestionFromExam(this.examId!, questionId).subscribe({
        next: () => this.loadSelectedQuestions(),
        error: () => this.showError('Could not remove the question. Please try again.')
      });
    });
  }

  questionBank: any[] = [];
  loadingQuestionBank = false;

  loadQuestionBank() {
    const requestId = ++this.questionBankRequestId;
    const examTypeId = this.examDetailsGroup?.get('examTypeId')?.value;
    if (!examTypeId) {
      this.allQuestionBank = [];
      this.pagedQuestionBank = [];
      this.loadingQuestionBank = false;
      this.questionBankError = '';
      return;
    }

    this.filters.examTypeId = Number(examTypeId);
    this.loadingQuestionBank = true;
    this.questionBankError = '';

    this.questionBankService.search(this.filters).subscribe({
      next: (res) => {
        if (requestId !== this.questionBankRequestId) return;
        this.allQuestionBank = res || [];
        this.pageIndex = 0;
        this.updatePagedQuestions();

        this.loadingQuestionBank = false;
      },
      error: () => {
        if (requestId !== this.questionBankRequestId) return;
        this.loadingQuestionBank = false;
        this.questionBankError = 'Could not load the question bank. Please try again.';
      }
    });
  }

  updatePagedQuestions() {
    const start = this.pageIndex * this.pageSize;
    const end = start + this.pageSize;
    this.pagedQuestionBank = this.allQuestionBank.slice(start, end);
  }

  onPageChange(event: any) {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.updatePagedQuestions();
  }


  onSearchChangeInput(value: string) {
    this.searchChanges.next(value);
  }

  onSubjectChange(value: string) {
    if (this.isPublished) return;
    this.filters.subject = value;
    this.filters.topic = '';
    this.loadQuestionBank();
  }

  onTopicChange(value: string) {
    if (this.isPublished) return;
    this.filters.topic = value;
    this.loadQuestionBank();
  }

  onDifficultyToggle(level: string, checked: boolean) {
    if (this.isPublished) return;
    if (checked && !this.filters.difficulty.includes(level)) {
      this.filters.difficulty.push(level);
    } else if (!checked) {
      this.filters.difficulty = this.filters.difficulty.filter(d => d !== level);
    }
    this.loadQuestionBank();
  }

  resetFilters() {
    if (this.isPublished) return;
    this.filters = {
      subject: '',
      topic: '',
      difficulty: [],
      q: '',
      examTypeId: this.examDetailsGroup.get('examTypeId')?.value || null
    };
    this.searchChanges.next('');
    this.loadQuestionBank();
  }

  backToExamList(): void {
    this.router.navigate(['/exam-list']);
  }






  constructor(
    private fb: FormBuilder,
    private service: ApiService,
    private questionBankService: QuestionBankService,
    private examTypeService: ExamTypesService,
    private subjectService: SubjectService,
    private router: Router,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) { }

  subjects: Subject[] = [];
  subjectToTopicMapping: Map<string, Topic[]> = new Map();

  ngOnInit(): void {
    this.examId = this.route.snapshot.paramMap.get('examId')!;
    this.isEditMode = !!this.examId;

    this.examForm = this.fb.group({
      examDetails: this.fb.group({
        title: ['', Validators.required],
        description: [''],
        durationMinutes: [60, [Validators.required, Validators.min(1)]],
        examTypeId: [null, Validators.required]
      }),
      questions: this.fb.array([])
    });

    if (this.isEditMode) {
      this.loadExamForEdit();
    }

    // Load selected questions when editing an exam
    if (this.isEditMode) {
      this.loadSelectedQuestions();
    }

    this.loadQuestionBank();
    this.fetchExamTypes();

    this.searchChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(value => {
      this.filters.q = value;
      this.loadQuestionBank();
    });

  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.searchChanges.complete();
  }

  private showError(message: string): void {
    this.snackBar.open(message, 'Dismiss', { duration: 5000 });
  }

  /* ---------------- GETTERS ---------------- */

  options(qIndex: number): FormArray {
    return this.questions.at(qIndex).get('options') as FormArray;
  }

  get examDetailsGroup(): FormGroup {
    return this.examForm.get('examDetails') as FormGroup;
  }

  get questions(): FormArray {
    return this.examForm.get('questions') as FormArray;
  }

  get newQuestionOptions(): FormArray {
    return this.newQuestionForm.get('options') as FormArray;
  }


  /* ---------------- LOAD (EDIT MODE) ---------------- */

  loadExamForEdit() {
    this.loadingExam = true;
    this.service.getExamById(this.examId).subscribe({
      next: exam => {
        this.loadingExam = false;
        this.examStatus = String(exam.status || 'DRAFT').toUpperCase();
        this.examForm.get('examDetails')?.patchValue({
          title: exam.title,
          description: exam.description,
          durationMinutes: exam.durationMinutes,
          examTypeId: exam.examTypeId
        });
        this.filters.examTypeId = Number(exam.examTypeId);
        this.loadQuestionBank();
        this.fetchSubjects();
      },
      error: () => {
        this.loadingExam = false;
        this.examLoadError = true;
        this.showError('Could not load the exam. Return to the exam list and try again.');
      }
    });

    // this.service.getQuestionsByExam(+this.examId).subscribe(questions => {
    //   this.setQuestions(questions || []);
    // });
  }

  setQuestions(questions: any[]) {
    this.questions.clear();

    questions.forEach(q => {
      const optionsArray = this.fb.array<FormGroup>([]);

      q.optionList.forEach((opt: string, idx: number) => {
        optionsArray.push(
          this.fb.group({
            text: [opt, Validators.required],
            correct: [idx === q.correctOptionIndex]
          })
        );
      });

      this.questions.push(
        this.fb.group({
          id: [q.id],
          text: [q.text, Validators.required],
          marks: [q.marks, [Validators.required, Validators.min(1)]],
          subject: [q.subject, Validators.required],
          topic: [q.topic, Validators.required],
          options: optionsArray
        })
      );
    });
  }

  /* ---------------- QUESTIONS ---------------- */

  addQuestion() {
    this.questions.push(
      this.fb.group({
        text: ['', Validators.required],
        marks: [1, [Validators.required, Validators.min(1)]],
        subject: ['', Validators.required],
        topic: ['', Validators.required],
        options: this.fb.array([
          this.createOption(),
          this.createOption()
        ])
      })
    );
  }

  createOption(): FormGroup {
    return this.fb.group({
      text: ['', Validators.required],
      correct: [false]
    });
  }

  addOption(qIndex: number) {
    this.options(qIndex).push(this.createOption());
  }

  removeOption(qIndex: number, optIndex: number) {
    this.options(qIndex).removeAt(optIndex);
  }

  startEditQuestion(index: number) {
    this.editingQuestionIndex = index;
  }

  cancelEditQuestion() {
    this.editingQuestionIndex = null;
  }

  startAddQuestion() {
    this.isAddingQuestion = true;
    this.newQuestionForm = this.fb.group({
      text: ['', Validators.required],
      marks: [1, [Validators.required, Validators.min(1)]],
      subject: ['', Validators.required],
      topic: ['', Validators.required],
      options: this.fb.array([
        this.createOption(),
        this.createOption()
      ])
    });
  }

  saveNewQuestion() {
    if (this.isPublished || this.newQuestionForm.invalid) return;

    const data = this.newQuestionForm.value;

    const payload = {
      text: data.text,
      marks: data.marks,
      subject: data.subject,
      topic: data.topic,
      optionList: data.options.map((o: any) => o.text),
      correctOptionIndex: data.options.findIndex((o: any) => o.correct)
    };
    this.service.addQuestionsInExam(this.examId, [payload]).subscribe({
      next: () => {
        this.questions.push(this.newQuestionForm);
        this.isAddingQuestion = false;
        this.loadSelectedQuestions();
      },
      error: () => this.showError('Could not add the question. Please try again.')
    });
  }

  cancelAddQuestion() {
    this.isAddingQuestion = false;
  }

  saveEditedQuestion() {
    if (this.isPublished || this.editingQuestionIndex === null) return;

    const index = this.editingQuestionIndex;
    const qGroup = this.questions.at(index) as FormGroup;

    if (qGroup.invalid) return;

    const data = qGroup.value;

    const payload = {
      text: data.text,
      marks: data.marks,
      subject: data.subject,
      topic: data.topic,
      optionList: data.options.map((o: any) => o.text),
      correctOptionIndex: data.options.findIndex((o: any) => o.correct)
    };

    this.service.updateQuestion(data.id, payload).subscribe({
      next: () => {
        this.editingQuestionIndex = null;
      },
      error: () => this.showError('Could not update the question. Please try again.')
    });
  }

  saveExam() {
    if (this.isPublished) return;
    const payload = {
      ...this.examForm.value.examDetails,
      status: "DRAFT"
    };

    this.service.createExam(payload).subscribe({
      next: () => {},
      error: () => {
        this.submitting = false;
        this.showError('Could not create the exam. Please check the details and try again.');
      }
    });
  }

  submit() {
    if (this.isPublished || this.examForm.invalid || this.submitting) return;

    this.submitting = true;

    const req$ = this.service.publishExam(this.examId);

    req$.subscribe({
      next: () => this.router.navigate(['/exam-list']),
      error: (error: any) => {
        this.submitting = false;
        const message = typeof error?.error?.message === 'string'
          ? error.error.message
          : 'Could not publish the exam. Check that it has questions and try again.';
        this.showError(message);
      }
    });
  }

  isExamDetailsValid(): boolean {
    return this.examDetailsGroup.valid;
  }

  saveAndNext(stepper: MatStepper) {
    if (this.isPublished) {
      stepper.next();
      return;
    }
    this.fetchSubjects();

    // CREATE MODE → always save
    if (!this.isEditMode) {
      this.createExamAndNext(stepper);
      return;
    }

    // EDIT MODE + NOT MODIFIED → skip API
    if (!this.examDetailsGroup.dirty) {
      stepper.next();
      return;
    }

    // EDIT MODE + MODIFIED → update
    this.updateExamAndNext(stepper);
  }

  createExamAndNext(stepper: MatStepper) {
    if (this.isPublished) return;
    const payload = {
      ...this.examForm.value.examDetails,
      status: 'DRAFT'
    };

    this.submitting = true;

    this.service.createExam(payload).subscribe({
      next: (res) => {
        this.examId = String(res.id); // IMPORTANT
        this.isEditMode = true;
        this.examDetailsGroup.markAsPristine();
        this.submitting = false;
        stepper.next();
      },
      error: () => {
        this.submitting = false;
        this.showError('Could not create the exam. Please check the details and try again.');
      }
    });
  }

  updateExamAndNext(stepper: MatStepper) {
    if (this.isPublished) return;
    const payload = this.examForm.value.examDetails;

    this.submitting = true;

    this.service.updateExam(this.examId, payload).subscribe({
      next: () => {
        this.examDetailsGroup.markAsPristine();
        this.submitting = false;
        stepper.next();
      },
      error: () => {
        this.submitting = false;
        this.showError('Could not update the exam details. Please try again.');
      }
    });
  }

  fetchExamTypes() {
    this.isLoading = true;

    this.examTypeService.fetchExamTypes()
      .subscribe({
        next: (res) => {
          this.examTypes = res;
          this.isLoading = false;
        },
        error: () => {
          this.isLoading = false;
          this.showError('Could not load exam types. Please refresh and try again.');
        }
      });
  }

  onExamTypeChange(examTypeId: number | null) {
    if (this.isPublished) return;
    this.filters.examTypeId = examTypeId ? Number(examTypeId) : null;
    const selectedExamType = this.examTypes.find(type => type.id === Number(examTypeId));
    if (selectedExamType?.standardDurationMinutes && selectedExamType.standardDurationMinutes > 0) {
      this.examDetailsGroup.get('durationMinutes')?.setValue(selectedExamType.standardDurationMinutes);
    }
    this.filters.subject = '';
    this.filters.topic = '';
    this.filters.difficulty = [];
    this.filters.q = '';
    this.searchChanges.next('');
    this.subjectToTopicMapping.clear();
    this.subjects = [];
    this.fetchSubjects();
    this.loadQuestionBank();
  }

  fetchSubjects() {
    this.isLoading = true;

    this.subjectService.getSubjects(true, this.examForm.value.examDetails.examTypeId)
      .subscribe({
        next: (res) => {
          this.subjects = res;

          this.subjectToTopicMapping.clear();

          this.subjects.forEach(subject => {
            this.subjectToTopicMapping.set(subject.name, subject.topics || []);
          });

          this.isLoading = false;
        },
        error: () => {
          this.isLoading = false;
          this.showError('Could not load subjects for this exam type. Please try again.');
        }
      });
  }



}
