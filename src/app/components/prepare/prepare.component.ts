import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatRadioModule } from '@angular/material/radio';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { PracticeRunnerComponent } from "../practice-runner/practice-runner.component";
import { UiStateService } from '../../services/ui-state.service';
import { QuestionBankService } from '../../services/question-bank.service';

type PrepareStep = 'CONFIG' | 'TEST' | 'RESULT';

@Component({
  selector: 'app-prepare',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatRadioModule,
    MatInputModule,
    MatCheckboxModule,
    PracticeRunnerComponent
  ],
  templateUrl: './prepare.component.html',
  styleUrls: ['./prepare.component.scss']
})
export class PrepareComponent {

  step: PrepareStep = 'CONFIG';

  // BASIC CONFIG
  totalQuestions = 10;
  mode: 'RANDOM' | 'DIFFICULTY' = 'RANDOM';
  feedbackMode: 'INSTANT' | 'END' = 'END';

  // TIME CONFIG
  timeMode: 'UNTIMED' | 'TIMED' = 'TIMED';
  timeLimitMinutes = 10;

  // Quick topic cards
topics = [
  { name: 'Optics', icon: '🔬' },
  { name: 'Thermodynamics', icon: '🔥' },
  { name: 'Magnetism', icon: '🧲' },
  { name: 'Organic Chemistry', icon: '🧪' },
  { name: 'Human Physiology', icon: '🧠' }
];

  // SUBJECT CONFIG
  // availableSubjects = ['Physics', 'Chemistry', 'Biology'];
  // selectedSubjects: string[] = ['Physics', 'Chemistry', 'Biology'];

  questions: any[] = [];

  correct = 0;
  total = 0;
  wrong = 0;
  percentage = 0;

  constructor(
    private uiState: UiStateService,
    private questionBankService: QuestionBankService
  ) { }

  get estimatedTime(): number {
    if (this.timeMode === 'UNTIMED') return 0;
    return this.timeLimitMinutes;
  }

  startTest() {

    if (this.totalQuestions <= 0) {
      return;
    }

    const request = {
      examType: 'NEET',
      examTypeId: 1,
      totalQuestions: this.totalQuestions,
      mode: this.mode,
      timeLimitMinutes: this.timeMode === 'TIMED'
        ? this.timeLimitMinutes
        : null
    };

    this.questionBankService
      .getPracticeQuestions(request)
      .subscribe(qs => {
        this.questions = qs;
        this.uiState.enterTestMode();
        this.step = 'TEST';
      });
  }

  onPracticeFinished(result: any) {
    this.correct = result.correct;
    this.total = result.total;
    this.wrong = result.wrong;
    this.percentage = result.percentage;

    this.uiState.exitTestMode();
    this.step = 'RESULT';
  }

  restart() {
    this.uiState.exitTestMode();
    this.step = 'CONFIG';
  }

  ngOnDestroy(): void {
    this.uiState.exitTestMode();
  }

  onTotalQuestionsChange() {
    if (this.timeMode === 'TIMED') {
      this.timeLimitMinutes = this.totalQuestions;
    }
  }

  startTopicPractice(topicName: string) {

  const request = {
    examType: 'NEET',
    totalQuestions: 10,
    mode: 'RANDOM',
    topic: topicName
  };

  this.questionBankService
    .getPracticeQuestions(request)
    .subscribe(qs => {
      this.questions = qs;
      this.uiState.enterTestMode();
      this.step = 'TEST';
    });
}
}