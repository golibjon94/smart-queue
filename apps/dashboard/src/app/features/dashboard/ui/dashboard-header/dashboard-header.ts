import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';

@Component({
  selector: 'app-dashboard-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonModule, TagModule],
  host: { class: 'block' },
  template: `
    <div class="mb-5 flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 class="text-xl font-bold text-surface-900 dark:text-surface-0">
          {{ branchName() ?? 'Boshqaruv paneli' }}
        </h1>
        <p class="mt-0.5 text-sm text-surface-500 dark:text-surface-400">
          Real vaqtdagi navbat holati
        </p>
      </div>

      <div class="flex items-center gap-3">
        @if (connectionError()) {
          <p-tag severity="danger" icon="pi pi-exclamation-triangle" value="Aloqa yo'q" />
        }
        <p-button
          [label]="isPeak() ? 'Normal holatga qaytish' : 'Demo: tushlik cho\\'qqisi'"
          [icon]="isPeak() ? 'pi pi-stop-circle' : 'pi pi-play-circle'"
          [severity]="isPeak() ? 'danger' : 'primary'"
          [loading]="scenarioLoading()"
          (onClick)="toggleScenario.emit()"
        />
      </div>
    </div>
  `,
})
export class DashboardHeader {
  readonly branchName = input<string | null>(null);
  readonly connectionError = input(false);
  readonly isPeak = input(false);
  readonly scenarioLoading = input(false);

  readonly toggleScenario = output<void>();
}
