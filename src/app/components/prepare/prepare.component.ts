import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatRadioModule } from '@angular/material/radio';
import { MatInputModule } from '@angular/material/input';
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
    PracticeRunnerComponent
  ],
  templateUrl: './prepare.component.html',
  styleUrls: ['./prepare.component.scss']
})
export class PrepareComponent {

  step: PrepareStep = 'CONFIG';

  // CONFIG
  totalQuestions = 10;
  mode: 'RANDOM' | 'DIFFICULTY' = 'RANDOM';
  feedbackMode: 'INSTANT' | 'END' = 'END';

  difficulty = {
    EASY: 20,
    MEDIUM: 40,
    HARD: 40
  };

  // TEST
  currentIndex = 0;

  questions = [
    {
      id: 1,
      text: 'What is the unit of force?',
      options: ['Newton', 'Pascal', 'Joule', 'Watt'],
      correctOptionIndex: 0,
      explanation: 'Force is measured in Newton.',
      answered: false,
      selectedOptionIndex: -1
    },
    {
      id: 2,
      text: 'Speed of light in vacuum is?',
      options: ['3×10⁸ m/s', '3×10⁶ m/s', '3×10⁵ m/s', 'None'],
      correctOptionIndex: 0,
      explanation: 'Speed of light in vacuum is 3×10⁸ m/s.',
      answered: false,
      selectedOptionIndex: -1
    }
  ];

  correct = 0;
  total: any;
  wrong: any;
  percentage: any;

  constructor(private uiState: UiStateService, private questionBankService: QuestionBankService) { }

  startTest() {

    const request = {
      examType: 'NEET',
      totalQuestions: this.totalQuestions,
      mode: this.mode
      // difficultySplit: this.mode === 'DIFFICULTY'
      //   ? this.calculateDifficultySplit()
      //   : null
    };

    this.questionBankService
      .getPracticeQuestions(request)
      .subscribe(qs => {
        this.questions = qs;
        this.uiState.enterTestMode();
        this.step = 'TEST';
      });

  }

  get currentQuestion() {
    return this.questions[this.currentIndex];
  }

  selectAnswer(optionIndex: number) {
    const q = this.currentQuestion;
    if (q.answered) return;

    q.selectedOptionIndex = optionIndex;
    q.answered = true;
  }

  next() {
    if (this.currentIndex < this.questions.length - 1) {
      this.currentIndex++;
    } else {
      this.submit();
    }
  }

  submit() {
    this.correct = this.questions.filter(
      q => q.selectedOptionIndex === q.correctOptionIndex
    ).length;

    this.step = 'RESULT';
  }

  restart() {
    this.questions.forEach(q => {
      q.answered = false;
      q.selectedOptionIndex = -1;
    });

    this.uiState.exitTestMode();
    this.step = 'CONFIG';
  }

  onPracticeFinished(result: any) {
    this.correct = result.correct;
    this.total = result.total;
    this.wrong = result.wrong;
    this.percentage = result.percentage;

    this.uiState.exitTestMode();
    this.step = 'RESULT';
  }

  ngOnDestroy(): void {
    this.uiState.exitTestMode();
  }

}
