import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';

import { ServiceQueueState } from '../../models';

type WaitSeverity = 'success' | 'warn' | 'danger';

@Component({
  selector: 'app-queues-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CardModule, TableModule, TagModule],
  template: `
    <p-card>
      <ng-template #title>
        <span class="text-[15px] font-semibold text-surface-900 dark:text-surface-0">Navbatlar</span>
      </ng-template>
      <p-table [value]="queues()" styleClass="p-datatable-sm">
        <ng-template #header>
          <tr>
            <th>Xizmat turi</th>
            <th class="text-center">Kutmoqda</th>
            <th class="text-center">Kassalar</th>
            <th class="text-right">Taxminiy kutish</th>
          </tr>
        </ng-template>
        <ng-template #body let-q>
          <tr>
            <td>{{ q.name }}</td>
            <td class="text-center">
              <p-tag [severity]="waitSeverity(q.estWaitMin)" [value]="q.waiting.toString()" />
            </td>
            <td class="text-center text-surface-500 dark:text-surface-400">{{ q.openCounters }} ochiq</td>
            <td class="text-right">
              <span class="font-semibold" [class]="waitColor(q.estWaitMin)">~{{ q.estWaitMin }} daq</span>
            </td>
          </tr>
        </ng-template>
      </p-table>
    </p-card>
  `,
})
export class QueuesTable {
  readonly queues = input<ServiceQueueState[]>([]);

  waitSeverity(min: number): WaitSeverity {
    if (min > 10) return 'danger';
    if (min > 5) return 'warn';
    return 'success';
  }

  waitColor(min: number): string {
    if (min > 10) return 'text-red-600';
    if (min > 5) return 'text-amber-600';
    return 'text-green-600';
  }
}
