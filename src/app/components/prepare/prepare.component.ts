import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { PracticeRunnerComponent } from '../practice-runner/practice-runner.component';
import { UiStateService } from '../../services/ui-state.service';
import { QuestionBankService } from '../../services/question-bank.service';
import { Subject, SubjectService } from '../../services/subject.service';
import { ActivatedRoute, Router } from '@angular/router';

type PrepareStep = 'CONFIG' | 'TEST' | 'RESULT';
type PrepareMode = 'RANDOM' | 'DIFFICULTY';
type FeedbackMode = 'INSTANT' | 'END';
type TimeMode = 'UNTIMED' | 'TIMED';

@Component({
  selector: 'app-prepare',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, PracticeRunnerComponent],
  templateUrl: './prepare.component.html',
  styleUrls: ['./prepare.component.css'],
})
export class PrepareComponent implements OnInit, OnDestroy {
  step: PrepareStep = 'CONFIG';
  totalQuestions = 10;
  mode: PrepareMode = 'RANDOM';
  feedbackMode: FeedbackMode = 'END';
  timeMode: TimeMode = 'TIMED';
  timeLimitMinutes = 10;

  difficultySplit = { EASY: 40, MEDIUM: 40, HARD: 20 };
  topics: Array<{ name: string; icon: string; subject: string }> = [];
  showAllTopics = false;
  examTypeId: number | null = null;
  topicsLoading = true;

  questions: any[] = [];
  reviewQuestions: any[] = [];
  selectedTopic = '';
  correct = 0;
  total = 0;
  wrong = 0;
  skipped = 0;
  percentage = 0;
  loading = false;
  errorMessage = '';
  practiceSessionId: string | null = null;
  practiceSubmitError = '';
  private plannedTopic: string | null = null;
  private plannedSubject: string | null = null;
  private plannedQuestionCount = 10;

  @ViewChild(PracticeRunnerComponent) practiceRunner?: PracticeRunnerComponent;

  constructor(
    private uiState: UiStateService,
    private questionBankService: QuestionBankService,
    private subjectService: SubjectService,
    private router: Router,
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    this.plannedTopic = this.route.snapshot.queryParamMap.get('topic');
    this.plannedSubject = this.route.snapshot.queryParamMap.get('subject');
    const plannedCount = Number(this.route.snapshot.queryParamMap.get('questionCount'));
    if (Number.isInteger(plannedCount) && plannedCount > 0 && plannedCount <= 180) {
      this.plannedQuestionCount = plannedCount;
    }
    try {
      const user = JSON.parse(localStorage.getItem('AYE_USER') || '{}');
      this.examTypeId = Number(user.examTypeId) || null;
    } catch {
      this.examTypeId = null;
    }

    if (!this.examTypeId) {
      this.topicsLoading = false;
      this.router.navigate(['/complete-profile']);
      return;
    }

    this.loadTopics();
  }

  private loadTopics(): void {
    this.topicsLoading = true;
    this.subjectService.getSubjects(true, this.examTypeId!).subscribe({
      next: (subjects) => {
        const topicGroups = (subjects || []).map((subject: Subject) =>
          (subject.topics || []).map((topic) => ({
            name: topic.name,
            subject: subject.name,
            icon: this.topicIcon(subject.name, topic.name),
          })),
        );
        // Interleave subjects so the initial quick-practice set is representative.
        this.topics = [];
        for (let index = 0; topicGroups.some((group) => index < group.length); index++) {
          for (const group of topicGroups) {
            if (group[index]) this.topics.push(group[index]);
          }
        }
        this.topicsLoading = false;
        if (this.plannedTopic) {
          const plannedMatch = this.topics.find(topic => topic.name === this.plannedTopic
            && (!this.plannedSubject || topic.subject === this.plannedSubject));
          if (plannedMatch) {
            this.totalQuestions = this.plannedQuestionCount;
            this.startTopicPractice(plannedMatch.name, plannedMatch.subject);
          } else {
            this.errorMessage = 'This recommended topic is no longer available. Choose a topic below to practice.';
          }
        }
      },
      error: () => {
        this.topics = [];
        this.topicsLoading = false;
        this.errorMessage = 'We couldn’t load topics for your exam. Please refresh and try again.';
      },
    });
  }

  private topicIcon(subject: string, topic: string): string {
    const key = `${subject} ${topic}`.toLowerCase();
    if (key.includes('physics') || key.includes('optics') || key.includes('mechanics')) return '🔬';
    if (key.includes('chemistry') || key.includes('organic')) return '🧪';
    if (key.includes('biology') || key.includes('physiology')) return '🧬';
    if (key.includes('mathematics') || key.includes('algebra') || key.includes('calculus')) return '📐';
    if (key.includes('csat') || key.includes('reasoning')) return '🧩';
    if (key.includes('general studies') || key.includes('history') || key.includes('polity')) return '🏛️';
    return '📘';
  }

  get hardPercent(): number {
    return Math.max(0, 100 - this.difficultySplit.EASY - this.difficultySplit.MEDIUM);
  }

  get visibleTopics(): Array<{ name: string; icon: string; subject: string }> {
    return this.showAllTopics ? this.topics : this.topics.slice(0, 6);
  }

  get canStartTest(): boolean {
    const countValid = Number.isInteger(this.totalQuestions) && this.totalQuestions >= 1 && this.totalQuestions <= 180;
    const timeValid = this.timeMode === 'UNTIMED' || this.isTimeLimitValid;
    const difficultyValid = this.mode !== 'DIFFICULTY' || this.difficultySplit.EASY + this.difficultySplit.MEDIUM <= 100;
    return countValid && timeValid && difficultyValid && !this.loading;
  }

  get isTimeLimitValid(): boolean {
    return Number.isInteger(this.timeLimitMinutes) && this.timeLimitMinutes >= 1 && this.timeLimitMinutes <= 600;
  }

  get validationMessage(): string {
    if (!Number.isInteger(this.totalQuestions) || this.totalQuestions < 1 || this.totalQuestions > 180) {
      return 'Choose between 1 and 180 questions.';
    }
    if (this.timeMode === 'TIMED' && !this.isTimeLimitValid) {
      return 'Set a time limit between 1 and 600 minutes.';
    }
    return '';
  }

  get timeSummary(): string {
    return this.timeMode === 'UNTIMED' ? 'No time limit' : `${this.timeLimitMinutes} min`;
  }

  get feedbackSummary(): string {
    return this.feedbackMode === 'INSTANT' ? 'After each question' : 'At the end';
  }

  onDifficultyShareChange(level: 'EASY' | 'MEDIUM', value: number): void {
    const safeValue = Math.max(0, Math.min(100, Number(value) || 0));
    this.difficultySplit[level] = safeValue;

    const otherLevel = level === 'EASY' ? 'MEDIUM' : 'EASY';
    const otherLimit = 100 - safeValue;
    if (this.difficultySplit[otherLevel] > otherLimit) {
      this.difficultySplit[otherLevel] = otherLimit;
    }
    this.difficultySplit.HARD = this.hardPercent;
  }

  startTest(): void {
    if (!this.canStartTest) return;
    this.selectedTopic = '';
    this.loadPracticeQuestions();
  }

  startTopicPractice(topicName: string, subject?: string): void {
    if (this.loading) return;
    if (this.timeMode === 'TIMED' && !this.isTimeLimitValid) {
      this.errorMessage = 'Set a time limit between 1 and 600 minutes before starting practice.';
      return;
    }
    this.selectedTopic = topicName;
    this.loadPracticeQuestions(topicName, subject);
  }

  private loadPracticeQuestions(topic?: string, subject?: string): void {
    this.loading = true;
    this.errorMessage = '';

    const request: any = {
      examTypeId: this.examTypeId,
      totalQuestions: topic ? 10 : this.totalQuestions,
      mode: topic ? 'RANDOM' : this.mode,
      feedbackMode: this.feedbackMode,
      timeLimitMinutes: this.timeMode === 'TIMED' ? this.timeLimitMinutes : null,
    };

    if (!topic && this.mode === 'DIFFICULTY') {
      request.difficultySplit = { ...this.difficultySplit };
    }
    if (topic) request.topic = topic;
    if (topic && subject) request.subject = subject;

    this.questionBankService.getPracticeQuestions(request).subscribe({
      next: (response) => {
        this.loading = false;
        this.questions = Array.isArray(response?.questions) ? response.questions.map((question: any) => ({
          ...question,
          id: question.questionId,
          text: question.question,
          optionList: question.options,
        })) : [];
        this.practiceSessionId = response?.sessionId || null;
        if (!this.questions.length) {
          this.errorMessage = topic
            ? `No questions are available for ${topic} yet. Try another topic or build a custom test.`
            : 'No questions matched these settings. Try fewer questions or a different selection mode.';
          return;
        }
        if (!this.practiceSessionId) {
          this.errorMessage = 'We couldn’t start this practice session. Please try again.';
          return;
        }

        this.reviewQuestions = [];
        this.uiState.enterTestMode();
        this.step = 'TEST';
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'We couldn’t load questions right now. Please try again.';
      },
    });
  }

  onPracticeFinished(result: any): void {
    if (!this.practiceSessionId || this.loading) return;
    this.loading = true;
    this.practiceSubmitError = '';
    this.questionBankService.submitPracticeTest({
      sessionId: this.practiceSessionId,
      answers: (result.answers || []).map((answer: any) => ({
        questionId: Number(answer.questionId),
        selectedAnswer: answer.selectedOptionIndex === null ? null : String(answer.selectedOptionIndex),
      })),
    }).subscribe({
      next: (response) => {
        this.correct = response.correct;
        this.total = response.total;
        this.wrong = response.wrong;
        this.skipped = response.skipped;
        this.percentage = response.total ? Math.round((response.correct / response.total) * 100) : 0;
        const analyses = new Map<number, any>((response.analysis || []).map((answer: any) => [answer.questionId, answer]));
        this.reviewQuestions = this.questions.map((question, index) => {
          const answer = analyses.get(Number(question.id));
          const selected = answer?.yourAnswer == null ? null : Number(answer.yourAnswer);
          return {
            ...question,
            questionNumber: index + 1,
            selectedOptionIndex: selected,
            correctOptionIndex: Number(answer?.correctAnswer),
            isCorrect: answer?.correct === true,
            explanation: answer?.explanation || question.explanation || null,
          };
        });
        this.practiceSessionId = null;
        this.loading = false;
        this.uiState.exitTestMode();
        this.step = 'RESULT';
      },
      error: () => {
        this.loading = false;
        this.practiceSubmitError = 'We couldn’t submit your practice test. Select Finish practice to retry.';
        this.practiceRunner?.retrySubmission();
      },
    });
  }

  restart(): void {
    this.uiState.exitTestMode();
    this.reviewQuestions = [];
    this.questions = [];
    this.practiceSessionId = null;
    this.practiceSubmitError = '';
    this.selectedTopic = '';
    this.errorMessage = '';
    this.step = 'CONFIG';
  }

  optionReviewClass(question: any, optionIndex: number): string {
    if (optionIndex === question.correctOptionIndex) return 'review-correct';
    if (optionIndex === question.selectedOptionIndex && !question.isCorrect) return 'review-incorrect';
    return '';
  }

  ngOnDestroy(): void {
    this.uiState.exitTestMode();
  }
}
