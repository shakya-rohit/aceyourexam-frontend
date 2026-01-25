import { Component, OnInit } from '@angular/core';
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
import { MatStepperModule } from '@angular/material/stepper';
import { MatDividerModule } from '@angular/material/divider';
import { MatPaginatorModule } from '@angular/material/paginator';

import { ApiService } from '../../services/api.service';
import { state } from '@angular/animations';
import { MatOption } from "@angular/material/core";
import { MatSelect } from "@angular/material/select";
import { QuestionBankService } from '../../services/question-bank.service';

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
    MatPaginatorModule
  ],
  templateUrl: './create-exam.component.html',
  styleUrls: ['./create-exam.component.scss']
})
export class CreateExamComponent implements OnInit {

  examForm!: FormGroup;
  submitting = false;

  isEditMode = false;
  examId!: string;

  editingQuestionIndex: number | null = null;
  isAddingQuestion = false;
  newQuestionForm!: FormGroup;

  // ---------------- Question Bank Filters ----------------

  filters = {
    subject: '',
    topic: '',
    difficulty: [] as string[],
    q: ''
  };


  // ---------------- QUESTION BANK (UI ONLY) ----------------

  selectedQuestions: any[] = [];
  loadingSelectedQuestions = false;

  // pagination
pageSize = 5;
pageIndex = 0;

allQuestionBank: any[] = [];   // full result
pagedQuestionBank: any[] = []; // current page


  // ---------------- STEP 2: Selected Questions ----------------
  loadSelectedQuestions() {
    if (!this.examId) return;

    this.loadingSelectedQuestions = true;

    this.service.getQuestionsByExam(+this.examId).subscribe({
      next: (questions) => {
        this.selectedQuestions = questions || [];
        this.loadingSelectedQuestions = false;
      },
      error: () => {
        this.loadingSelectedQuestions = false;
      }
    });
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
    if (this.selectedQuestionBankIds.size === 0 || !this.examId) return;

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
        },
        error: () => {
          this.addingFromBank = false;
        }
      });
  }

  removeQuestion(questionId: number) {
    if (!this.examId) return;

    this.service
      .removeQuestionFromExam(this.examId, questionId)
      .subscribe({
        next: () => {
          // refresh selected questions from backend
          this.loadSelectedQuestions();
        },
        error: () => {
          console.error('Failed to remove question from exam');
        }
      });
  }

  questionBank: any[] = [];
  loadingQuestionBank = false;

  loadQuestionBank() {
    this.loadingQuestionBank = true;

    this.questionBankService.search(this.filters).subscribe({
      next: (res) => {
        this.allQuestionBank = res || [];
this.pageIndex = 0;
this.updatePagedQuestions();

        this.loadingQuestionBank = false;
      },
      error: () => {
        this.loadingQuestionBank = false;
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


  onSearchChange(value: string) {
    this.filters.q = value;
    this.loadQuestionBank();
  }

  onSearchChangeInput(event: Event) {
    const input = event.target as HTMLInputElement;
    this.onSearchChange(input.value);
  }

  onSubjectChange(value: string) {
    this.filters.subject = value;
    this.loadQuestionBank();
  }

  onTopicChange(value: string) {
    this.filters.topic = value;
    this.loadQuestionBank();
  }

  onDifficultyToggle(level: string, checked: boolean) {
    if (checked && !this.filters.difficulty.includes(level)) {
      this.filters.difficulty.push(level);
    } else if (!checked) {
      this.filters.difficulty = this.filters.difficulty.filter(d => d !== level);
    }
    this.loadQuestionBank();
  }

  resetFilters() {
    this.filters = {
      subject: '',
      topic: '',
      difficulty: [],
      q: ''
    };
    this.loadQuestionBank();
  }






  constructor(
    private fb: FormBuilder,
    private service: ApiService,
    private questionBankService: QuestionBankService,
    private router: Router,
    private route: ActivatedRoute
  ) { }


  ngOnInit(): void {
    this.examId = this.route.snapshot.paramMap.get('examId')!;
    this.isEditMode = !!this.examId;

    this.examForm = this.fb.group({
      examDetails: this.fb.group({
        title: ['', Validators.required],
        description: [''],
        durationMinutes: [60, [Validators.required, Validators.min(1)]],
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
    this.service.getExamById(this.examId).subscribe(exam => {
      this.examForm.get('examDetails')?.patchValue({
        title: exam.title,
        description: exam.description,
        durationMinutes: exam.durationMinutes
      });
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
    if (this.newQuestionForm.invalid) return;
    this.questions.push(this.newQuestionForm);
    this.isAddingQuestion = false;

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
      next: () => console.log("Question saved sunncessfully"),
      error: () => console.log("Failed to save questions")
    });
  }

  cancelAddQuestion() {
    this.isAddingQuestion = false;
  }

  saveEditedQuestion() {
    if (this.editingQuestionIndex === null) return;

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
        console.log('Question updated successfully');
        this.editingQuestionIndex = null;
      },
      error: () => {
        console.error('Failed to update question');
      }
    });
  }

  saveExam() {
    const payload = {
      ...this.examForm.value.examDetails,
      status: "DRAFT"
    };

    this.service.createExam(payload).subscribe({
      next: () => console.log("Exam information saved successfully"),
      error: () => this.submitting = false
    });
  }

  submit() {
    if (this.examForm.invalid || this.submitting) return;

    this.submitting = true;

    const req$ = this.service.publishExam(this.examId);

    req$.subscribe({
      next: () => this.router.navigate(['/exam-list']),
      error: () => this.submitting = false
    });
  }

  isExamDetailsValid(): boolean {
    const { title, durationMinutes } = this.examForm.controls;
    return title.valid && durationMinutes.valid;
  }

}
