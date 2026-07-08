import { Injectable, inject } from '@angular/core';
import { MessageService } from 'primeng/api';

// PrimeNG MessageService ustidan yupqa, ma'no-darajali wrapper.
// Store/servislar bevosita PrimeNG API'ga bog'lanmasligi uchun.
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly messages = inject(MessageService);

  success(summary: string, detail?: string): void {
    this.messages.add({ severity: 'success', summary, detail, life: 3000 });
  }

  info(summary: string, detail?: string): void {
    this.messages.add({ severity: 'info', summary, detail, life: 4000 });
  }

  muted(summary: string, detail?: string): void {
    this.messages.add({ severity: 'secondary', summary, detail, life: 3000 });
  }

  error(summary: string, detail?: string): void {
    this.messages.add({ severity: 'error', summary, detail, life: 5000 });
  }
}
