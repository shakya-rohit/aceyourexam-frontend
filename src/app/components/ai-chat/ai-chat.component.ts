import { AfterViewChecked, Component, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AiService } from '../../services/ai.service';

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

@Component({
  selector: 'app-ai-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ai-chat.component.html',
  styleUrls: ['./ai-chat.component.css'],
})
export class AiChatComponent implements AfterViewChecked {
  @ViewChild('scrollContainer') private scrollContainer?: ElementRef<HTMLElement>;
  @ViewChild('composerInput') private composerInput?: ElementRef<HTMLInputElement>;

  userInput = '';
  messages: ChatMessage[] = [];
  loading = false;
  private scrollPending = false;

  suggestions: string[] = [
    'Analyze my performance',
    'What are my weak subjects?',
    'Give me a study plan',
    'Suggest questions to practice',
  ];

  readonly starterPrompts = [
    { icon: '📊', title: 'Understand my results', detail: 'Find subjects and topics to focus on', prompt: 'Analyze my performance and tell me what I should focus on.' },
    { icon: '🗓️', title: 'Build a study plan', detail: 'Plan around your time and exam date', prompt: 'Help me build a study plan for my next exam.' },
    { icon: '🧩', title: 'Practice a topic', detail: 'Get questions and explanations', prompt: 'Suggest practice questions for a topic I need to improve.' },
    { icon: '💬', title: 'Explain a concept', detail: 'Ask a question in your own words', prompt: '' },
  ];

  constructor(private aiService: AiService) {}

  ngAfterViewChecked(): void {
    if (this.scrollPending && this.scrollContainer) {
      const element = this.scrollContainer.nativeElement;
      element.scrollTop = element.scrollHeight;
      this.scrollPending = false;
    }
  }

  sendMessage(): void {
    const question = this.userInput.trim();
    if (!question || this.loading) return;

    const history = this.messages.slice(-6);
    this.messages.push({ role: 'user', text: question });
    this.userInput = '';
    this.loading = true;
    this.scrollPending = true;

    this.aiService.askAI(question, history).subscribe({
      next: (res) => {
        this.messages.push({
          role: 'assistant',
          text: res?.answer || 'I could not create a response just now. Please try asking again.',
        });
        this.generateSuggestions(res?.answer || '');
        this.loading = false;
        this.scrollPending = true;
      },
      error: (err) => {
        const unauthenticated = err?.status === 401 || err?.message === 'User not authenticated' || err?.message === 'User session is invalid';
        const text = unauthenticated
          ? 'Your session has expired. Please sign in again to continue chatting.'
          : 'I could not connect just now. Please check your connection and try again.';
        this.messages.push({
          role: 'assistant',
          text,
        });
        this.loading = false;
        this.scrollPending = true;
      },
    });
  }

  formatMessage(text: string): string {
    const escaped = (text || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

    return escaped.split('\n').map((line) => {
      if (/^###\s+/.test(line)) return `<h4>${line.replace(/^###\s+/, '')}</h4>`;
      if (/^-\s+/.test(line)) return `• ${line.replace(/^-\s+/, '')}`;
      return line;
    }).join('<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  }

  sendQuick(text: string): void {
    this.userInput = text;
    this.sendMessage();
  }

  sendStarter(prompt: string): void {
    if (prompt) {
      this.sendQuick(prompt);
      return;
    }
    this.userInput = '';
    this.composerInput?.nativeElement.focus();
  }

  generateSuggestions(lastMessage: string): void {
    const content = lastMessage.toLocaleLowerCase();
    if (content.includes('study plan')) {
      this.suggestions = [
        'I have 2 months',
        'I can study 5 hours daily',
        'Focus on Physics',
        'Start beginner level',
      ];
    } else if (content.includes('results') || content.includes('performance')) {
      this.suggestions = ['Analyze weak areas', 'Compare attempts', 'Give improvement tips'];
    } else {
      this.suggestions = ['Analyze my performance', 'Give me a study plan', 'Suggest questions'];
    }
  }
}
