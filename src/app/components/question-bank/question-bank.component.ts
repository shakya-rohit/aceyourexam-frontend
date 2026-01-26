import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

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
    MatDividerModule
  ],
  templateUrl: './question-bank.component.html',
  styleUrls: ['./question-bank.component.css']
})
export class QuestionBankComponent implements OnInit {

  questionForm!: FormGroup;
  questions: any[] = [];

  isEditMode = false;
  editingId: number | null = null;

  difficulties = ['EASY', 'MEDIUM', 'HARD'];

  subjects: Subject[] = [];
  topics: Topic[] = [];

  selectedSubjectId: number | null = null;
  selectedTopicId: number | null = null;

  // pagination
  page = 0;
  pageSize = 10;
  totalElements = 0;

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
    private subjectService: SubjectService
  ) { }

  ngOnInit(): void {
    this.initForm();
    this.loadQuestions();
    this.subjectService.getSubjects(true).subscribe(res => {
      this.subjects = res;
    });
  }

  initForm() {
    this.questionForm = this.fb.group({
      text: ['', Validators.required],
      options: ['', Validators.required],
      correctOptionIndex: [0, Validators.required],
      difficulty: ['EASY', Validators.required],
      marks: [1, Validators.required],
      subject: ['', Validators.required],
      topic: ['', Validators.required]
    });
  }

  loadQuestions() {
    this.questionBankService.getPaged({
      page: this.page,
      size: this.pageSize,
      ...this.filters
    }).subscribe(res => {
      this.questions = res.content || [];
      this.totalElements = res.totalElements;
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


  submit() {
    if (this.questionForm.invalid) return;

    const payload = this.questionForm.value;

    if (this.isEditMode && this.editingId !== null) {
      this.questionBankService.update(this.editingId, payload).subscribe(() => {
        this.reset();
        this.loadQuestions();
      });
    } else {
      this.questionBankService.create(payload).subscribe(() => {
        this.reset();
        this.loadQuestions();
      });
    }
  }

  edit(q: any) {
    this.isEditMode = true;
    this.editingId = q.id;

    // populate topics based on subject
    const subject = this.subjects.find(s => s.name === q.subject);
    this.topics = subject?.topics || [];

    this.questionForm.patchValue(q);
  }


  delete(id: number) {
    if (!confirm('Delete this question?')) return;
    this.questionBankService.delete(id).subscribe(() => this.loadQuestions());
  }

  reset() {
    this.isEditMode = false;
    this.editingId = null;
    this.topics = [];

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