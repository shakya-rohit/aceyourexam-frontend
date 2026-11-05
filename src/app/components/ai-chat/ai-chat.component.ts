import { AfterViewChecked, Component, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AiService } from '../../services/ai.service';

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
  actions?: string[];
  retryable?: boolean;
}

interface FailedRequest {
  question: string;
  history: ChatMessage[];
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
  private failedRequest: FailedRequest | null = null;

  readonly starterPrompts = [
    { icon: '📊', title: 'Understand my results', detail: 'Find subjects and topics to focus on', prompt: 'Analyze my performance and tell me what I should focus on.' },
    { icon: '🗓️', title: 'Build a study plan', detail: 'Plan around your time and exam date', prompt: 'Help me build a study plan for my next exam.' },
    { icon: '🧩', title: 'Practice a topic', detail: 'Find questions for a topic you choose', prompt: 'Find practice questions for a topic I need to improve.' },
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

    this.submitQuestion(question, this.messages.slice(-6));
  }

  private submitQuestion(question: string, history: ChatMessage[]): void {
    this.failedRequest = null;
    this.messages.forEach((message) => message.retryable = false);
    this.messages.push({ role: 'user', text: question });
    this.userInput = '';
    this.loading = true;
    this.scrollPending = true;

    const context = history.map(({ role, text }) => ({ role, text }));
    this.aiService.askAI(question, context).subscribe({
      next: (res) => {
        const answer = res?.answer || 'I could not create a response just now. Please try asking again.';
        const parsed = this.extractActions(answer);
        this.messages.push({
          role: 'assistant',
          text: parsed.text,
          actions: parsed.actions,
        });
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
          retryable: !unauthenticated,
        });
        if (!unauthenticated) this.failedRequest = { question, history };
        this.loading = false;
        this.scrollPending = true;
      },
    });
  }

  retryLast(): void {
    if (!this.failedRequest || this.loading) return;
    const request = this.failedRequest;
    this.messages.splice(-2, 2);
    this.submitQuestion(request.question, request.history);
  }

  startNewChat(): void {
    if (this.loading) return;
    this.messages = [];
    this.failedRequest = null;
    this.userInput = '';
    this.scrollPending = true;
    this.composerInput?.nativeElement.focus();
  }

  sendAction(action: string): void {
    if (!this.loading) this.submitQuestion(action, this.messages.slice(-6));
  }

  private extractActions(answer: string): { text: string; actions: string[] } {
    const lines = answer.split(/\r?\n/);
    const headingIndex = lines.findIndex((line) =>
      /^#{1,4}\s*(try next|next steps|suggested next steps)\s*:?\s*$/i.test(line.trim()),
    );
    if (headingIndex < 0) return { text: answer, actions: [] };

    const actions = lines.slice(headingIndex + 1)
      .map((line) => this.normalizeAction(line))
      .filter((line) => line.length > 0 && !/(?:grade|check|review).{0,35}answers?|answers?.{0,35}(?:grade|check|review|feedback)/i.test(line))
      .slice(0, 3);
    const text = lines.slice(0, headingIndex).join('\n').trim();
    return {
      text: text || (actions.length ? 'Here are a few useful next steps:' : answer),
      actions,
    };
  }

  private normalizeAction(value: string): string {
    let action = value.trim()
      .replace(/^(?:[-*•]|\d+[.)])\s*/, '')
      .replace(/\*\*/g, '')
      .replace(/`/g, '')
      .replace(/^['"“”]+|['"“”]+$/g, '')
      .replace(/^request\s*:\s*/i, '')
      .replace(/^if you have time(?: after that)?,?\s*you can say\s*:\s*/i, '')
      .trim();

    if (/^let me know if you(?:'d| would) like to (?:receive|get)\s+/i.test(action)) {
      action = action.replace(/^let me know if you(?:'d| would) like to (?:receive|get)\s+/i, 'Show me ');
    } else if (/^request\s+(?:a|an)\s+/i.test(action)) {
      action = action.replace(/^request\s+(?:a|an)\s+/i, 'Create a ');
    } else if (/^ask for\s+/i.test(action)) {
      action = action.replace(/^ask for\s+/i, 'Find ');
    } else if (/^let's\s+/i.test(action)) {
      action = action.replace(/^let's\s+/i, '');
    }

    return action.replace(/[.\s]+$/, '').trim();
  }

  formatMessage(text: string): string {
    const escaped = (text || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

    const inline = (value: string) => value
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/`([^`]+)`/g, '<code>$1</code>');
    const output: string[] = [];
    let listType: 'ul' | 'ol' | null = null;
    let nextOrderedNumber = 1;
    const closeList = () => {
      if (listType) output.push(`</${listType}>`);
      listType = null;
    };

    for (const rawLine of escaped.split('\n')) {
      const line = rawLine.trim();
      if (!line) {
        closeList();
        continue;
      }

      const heading = line.match(/^(#{1,3})\s+(.+)$/);
      if (heading) {
        closeList();
        nextOrderedNumber = 1;
        const level = heading[1].length === 1 ? 3 : 4;
        output.push(`<h${level}>${inline(heading[2])}</h${level}>`);
        continue;
      }

      const unordered = line.match(/^[-*•]\s+(.+)$/);
      const ordered = line.match(/^(\d+)[.)]\s+(.+)$/);
      if (unordered || ordered) {
        const nextType = unordered ? 'ul' : 'ol';
        if (listType !== nextType) {
          closeList();
          listType = nextType;
          if (nextType === 'ol') {
            const requestedNumber = Number(ordered![1]);
            const startNumber = requestedNumber === 1 && nextOrderedNumber > 1
              ? nextOrderedNumber
              : requestedNumber;
            nextOrderedNumber = startNumber;
            output.push(`<ol start="${startNumber}">`);
          } else {
            output.push('<ul>');
          }
        }
        output.push(`<li>${inline((unordered || ordered)![unordered ? 1 : 2])}</li>`);
        if (ordered) nextOrderedNumber += 1;
        continue;
      }

      closeList();
      nextOrderedNumber = 1;
      output.push(`<p>${inline(line)}</p>`);
    }
    closeList();
    return output.join('');
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
}
