import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-dashboard-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <div
      class="sq-rise flex flex-wrap items-end justify-between gap-[18px]"
      style="animation-delay:.02s;margin-bottom:24px;"
    >
      <div>
        <div class="mb-[7px] flex items-center gap-2.5">
          <span
            style="font-size:11px;letter-spacing:1.6px;text-transform:uppercase;color:var(--accent-b);font-family:var(--font-mono,'JetBrains Mono');"
          >Real-time · Asia/Tashkent</span>
        </div>
        <h1
          style="margin:0;font-family:var(--font-display,'Space Grotesk');font-weight:700;font-size:30px;letter-spacing:-.5px;background:var(--grad);-webkit-background-clip:text;background-clip:text;color:transparent;"
        >
          {{ branchName() ?? 'Boshqaruv paneli' }}
        </h1>
        <p style="margin:6px 0 0;font-size:13.5px;color:var(--text-dim);">
          Navbatlar, prognoz va AI tavsiyalari — bir joyda, jonli.
        </p>
      </div>

      <div class="flex items-center gap-3">
        @if (connectionError()) {
          <span
            class="flex items-center gap-2"
            style="font-size:11.5px;font-weight:600;padding:7px 13px;border-radius:99px;background:rgba(var(--c-rgb),.14);color:var(--danger);border:1px solid rgba(var(--c-rgb),.3);"
          >
            <i class="pi pi-exclamation-triangle" style="font-size:12px;"></i> Aloqa yo'q
          </span>
        }
        <button
          class="sq-btn flex items-center gap-2.5"
          style="height:46px;padding:0 22px;border:none;border-radius:14px;cursor:pointer;font-family:var(--font-display,'Space Grotesk');font-weight:600;font-size:14px;color:var(--ok-ink);background:var(--grad);box-shadow:0 10px 30px -12px rgba(var(--b-rgb),.8);"
          [disabled]="scenarioLoading()"
          (click)="toggleScenario.emit()"
        >
          <i [class]="isPeak() ? 'pi pi-stop-circle' : 'pi pi-play'" style="font-size:16px;"></i>
          {{ isPeak() ? 'Normal holatga qaytish' : "Demo: tushlik cho'qqisi" }}
        </button>
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
