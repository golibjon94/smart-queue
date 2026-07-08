import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { NgClass } from '@angular/common';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';

import { Anomaly, AnomalySeverity, AnomalyType } from '../../models';

type TagSeverity = 'warn' | 'danger';

@Component({
  selector: 'app-anomalies-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgClass, CardModule, TagModule],
  template: `
    <p-card>
      <ng-template #title>
        <div class="flex items-center justify-between gap-3">
          <span class="text-[15px] font-semibold text-surface-900 dark:text-surface-0">
            Anomaliyalar
          </span>
          @if (anomalies().length > 0) {
            <p-tag severity="danger" [value]="anomalies().length + ' faol'" />
          }
        </div>
      </ng-template>

      @if (anomalies().length === 0) {
        <div class="flex items-center gap-2.5 py-2 text-sm text-surface-500 dark:text-surface-400">
          <i class="pi pi-shield text-lg text-green-600"></i>
          <span>Anomaliya yo'q — tizim barqaror.</span>
        </div>
      }

      <div class="flex flex-col gap-2.5">
        @for (a of anomalies(); track a.detectedAt + '-' + a.type + '-' + (a.counterId ?? a.serviceTypeId ?? 0)) {
          <div class="flex items-start gap-3 rounded-xl border px-4 py-3" [ngClass]="rowClass(a.severity)">
            <i [ngClass]="typeIcon(a.type) + ' ' + iconColor(a.severity)" class="mt-0.5 text-base"></i>
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-2">
                <span class="text-[14px] font-semibold text-surface-900 dark:text-surface-0">
                  {{ typeLabel(a.type) }}
                </span>
                <p-tag [severity]="tagSeverity(a.severity)" [value]="severityLabel(a.severity)" />
                <span class="text-[11px] text-surface-400">{{ time(a.detectedAt) }}</span>
              </div>
              <p class="mt-1 text-[13px] text-surface-600 dark:text-surface-300">{{ a.message }}</p>
              <p class="mt-0.5 text-[12px] text-surface-500 dark:text-surface-400">
                Kuzatilgan: <b>{{ a.metric }}</b> · kutilgan: {{ a.expected }}
              </p>
            </div>
          </div>
        }
      </div>
    </p-card>
  `,
})
export class AnomaliesPanel {
  readonly anomalies = input<Anomaly[]>([]);

  typeIcon(type: AnomalyType): string {
    if (type === 'slow_operator') return 'pi pi-hourglass';
    if (type === 'backlog') return 'pi pi-inbox';
    return 'pi pi-bolt'; // surge
  }

  typeLabel(type: AnomalyType): string {
    if (type === 'slow_operator') return 'Sekin operator';
    if (type === 'backlog') return "Navbat to'planishi";
    return 'Portlash';
  }

  severityLabel(severity: AnomalySeverity): string {
    if (severity === 'warning') return 'ogohlantirish';
    if (severity === 'serious') return 'jiddiy';
    return 'kritik';
  }

  tagSeverity(severity: AnomalySeverity): TagSeverity {
    return severity === 'warning' ? 'warn' : 'danger';
  }

  iconColor(severity: AnomalySeverity): string {
    if (severity === 'warning') return 'text-amber-600';
    if (severity === 'serious') return 'text-orange-600';
    return 'text-red-600';
  }

  rowClass(severity: AnomalySeverity): string {
    if (severity === 'warning') {
      return 'border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10';
    }
    if (severity === 'serious') {
      return 'border-orange-200 bg-orange-50 dark:border-orange-500/30 dark:bg-orange-500/10';
    }
    return 'border-red-200 bg-red-50 dark:border-red-500/30 dark:bg-red-500/10';
  }

  time(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat('uz', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Tashkent',
    }).format(d);
  }
}
