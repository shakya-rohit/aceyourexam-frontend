import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AiService } from '../../services/ai.service';

@Component({
  selector: 'app-ai-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ai-chat.component.html',
  styleUrls: ['./ai-chat.component.css'],
})
export class AiChatComponent {
  userInput: string = '';
  messages: any[] = [];
  loading: boolean = false;

  suggestions: string[] = [
    'Analyze my performance',
    'What are my weak subjects?',
    'Give me a study plan',
    'Suggest questions to practice',
  ];

  constructor(private aiService: AiService) {}

  sendMessage() {
    if (!this.userInput.trim()) return;

    const question = this.userInput;

    this.messages.push({ role: 'user', text: question });

    const history = this.messages.slice(0, -1).slice(-6); // exclude latest

    this.userInput = '';
    this.loading = true;

    this.aiService.askAI(question, history).subscribe({
      next: (res) => {
        this.messages.push({
          role: 'assistant',
          text: res.answer,
        });

        this.generateSuggestions(res.answer);
        this.loading = false;
      },
      error: () => {
        this.messages.push({
          role: 'assistant',
          text: 'Something went wrong.',
        });
        this.loading = false;
      },
    });
  }

  formatMessage(text: string): string {
    return text
      .replace(/\n/g, '<br>')
      .replace(/### (.*?)/g, '<h4>$1</h4>')
      .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
      .replace(/- /g, '• ');
  }

  sendQuick(text: string) {
    this.userInput = text;
    this.sendMessage();
  }

  generateSuggestions(lastMessage: string) {
    if (lastMessage.includes('study plan')) {
      this.suggestions = [
        'I have 2 months',
        'I can study 5 hours daily',
        'Focus on Physics',
        'Start beginner level',
      ];
    } else if (lastMessage.includes('results')) {
      this.suggestions = ['Analyze weak areas', 'Compare attempts', 'Give improvement tips'];
    } else {
      this.suggestions = ['Analyze my performance', 'Give me a study plan', 'Suggest questions'];
    }
  }
}
