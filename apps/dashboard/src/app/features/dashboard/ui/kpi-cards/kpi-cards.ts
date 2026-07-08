import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { CountUp } from '../../../../shared/count-up/count-up';

@Component({
  selector: 'app-kpi-cards',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CountUp],
  host: { class: 'grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4' },
  template: `
    <!-- 1 · Navbatda kutmoqda -->
    <div class="sq-card sq-rise" [style]="cardStyle('.06s', false)">
      <div class="absolute" [style]="glow('--b-rgb')"></div>
      <div class="flex items-start justify-between">
        <div class="grid place-items-center" [style]="iconChip('--b-rgb')">
          <i class="pi pi-users" style="font-size:19px;color:var(--accent-b);"></i>
        </div>
        <span [style]="trend('--c-rgb')">▲ 12%</span>
      </div>
      <div [style]="valueStyle()"><span [sqCountUp]="totalWaiting()"></span></div>
      <div [style]="labelStyle()">Navbatda kutmoqda</div>
      <svg viewBox="0 0 120 28" preserveAspectRatio="none" style="margin-top:10px;width:100%;height:24px;">
        <polyline points="0,22 15,18 30,20 45,12 60,15 75,8 90,11 105,5 120,7" fill="none" stroke="var(--accent-b)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </div>

    <!-- 2 · O'rtacha kutish -->
    <div class="sq-card sq-rise" [style]="cardStyle('.11s', false)">
      <div class="absolute" [style]="glow('--warn-rgb')"></div>
      <div class="flex items-start justify-between">
        <div class="grid place-items-center" [style]="iconChip('--warn-rgb')">
          <i class="pi pi-clock" style="font-size:19px;color:var(--warn);"></i>
        </div>
        <span [style]="trend('--a-rgb')">▼ 3%</span>
      </div>
      <div [style]="valueStyle()">
        <span [sqCountUp]="avgWaitMin()" prefix="~"></span><span style="font-size:15px;color:var(--text-dim);font-weight:500;"> daq</span>
      </div>
      <div [style]="labelStyle()">O'rtacha kutish</div>
      <svg viewBox="0 0 120 28" preserveAspectRatio="none" style="margin-top:10px;width:100%;height:24px;">
        <polyline points="0,10 15,14 30,9 45,16 60,13 75,18 90,15 105,20 120,17" fill="none" stroke="var(--warn)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </div>

    <!-- 3 · Ochiq kassalar -->
    <div class="sq-card sq-rise" [style]="cardStyle('.16s', false)">
      <div class="absolute" [style]="glow('--a-rgb')"></div>
      <div class="flex items-start justify-between">
        <div class="grid place-items-center" [style]="iconChip('--a-rgb')">
          <i class="pi pi-desktop" style="font-size:19px;color:var(--accent-a);"></i>
        </div>
        <span style="font-size:11.5px;font-weight:600;color:var(--ok);font-family:var(--font-mono,'JetBrains Mono');">{{ busyPct() }}% band</span>
      </div>
      <div [style]="valueStyle()">
        <span [sqCountUp]="openCounters()"></span><span style="font-size:17px;color:var(--text-dim);font-weight:500;">/{{ totalCounters() }}</span>
      </div>
      <div [style]="labelStyle()">Ochiq kassalar</div>
      <div style="margin-top:12px;height:7px;border-radius:99px;background:rgba(150,140,220,.14);overflow:hidden;">
        <div [style.width.%]="busyPct()" style="height:100%;border-radius:99px;background:linear-gradient(90deg,var(--accent-d),var(--accent-a));box-shadow:0 0 12px rgba(var(--d-rgb),.6);transition:width .6s cubic-bezier(.2,.7,.3,1);"></div>
      </div>
    </div>

    <!-- 4 · Faol AI tavsiyalari -->
    <div class="sq-card sq-rise" [style]="cardStyle('.21s', true)">
      <div class="absolute" [style]="glow('--c-rgb', '120px')"></div>
      <div class="flex items-start justify-between">
        <div class="grid place-items-center" [style]="iconChip('--c-rgb')">
          <i class="pi pi-sparkles" style="font-size:19px;color:var(--accent-c);"></i>
        </div>
        <span class="flex items-center gap-1.5" style="font-size:10.5px;font-weight:600;color:var(--accent-c);font-family:var(--font-mono,'JetBrains Mono');padding:3px 8px;border-radius:99px;background:rgba(var(--c-rgb),.14);">
          <span style="width:5px;height:5px;border-radius:50%;background:var(--accent-c);animation:sq-pulse 1.6s infinite;"></span>AI
        </span>
      </div>
      <div [style]="valueStyle()"><span [sqCountUp]="proposedCount()"></span></div>
      <div [style]="labelStyle()">Faol AI tavsiyalari</div>
      <div style="margin-top:11px;font-size:11px;color:var(--text-mut);font-family:var(--font-mono,'JetBrains Mono');">real-vaqtda kuzatilmoqda</div>
    </div>
  `,
})
export class KpiCards {
  readonly totalWaiting = input<number | null>(null);
  readonly avgWaitMin = input<number | null>(null);
  readonly openCounters = input(0);
  readonly totalCounters = input(0);
  readonly proposedCount = input(0);

  readonly busyPct = computed(() => {
    const total = this.totalCounters();
    return total ? Math.round((this.openCounters() / total) * 100) : 0;
  });

  cardStyle(delay: string, alt: boolean): string {
    const bg = alt
      ? 'linear-gradient(160deg,var(--panel-alt-1),var(--panel-alt-2))'
      : 'linear-gradient(160deg,var(--panel-1),var(--panel-2))';
    const bd = alt ? 'var(--border-accent)' : 'var(--border)';
    return `animation-delay:${delay};position:relative;overflow:hidden;border-radius:18px;padding:18px;background:${bg};border:1px solid ${bd};box-shadow:var(--inset);`;
  }

  glow(rgb: string, size = '110px'): string {
    return `top:-30px;right:-30px;width:${size};height:${size};border-radius:50%;background:radial-gradient(circle,rgba(var(${rgb}),.28),transparent 70%);`;
  }

  iconChip(rgb: string): string {
    return `width:44px;height:44px;border-radius:13px;background:linear-gradient(150deg,rgba(var(${rgb}),.22),rgba(var(${rgb}),.05));border:1px solid rgba(var(${rgb}),.3);`;
  }

  trend(rgb: string): string {
    return `display:flex;align-items:center;gap:4px;font-size:11.5px;font-weight:600;color:rgb(var(${rgb}));font-family:var(--font-mono,'JetBrains Mono');`;
  }

  valueStyle(): string {
    return "margin-top:14px;font-family:var(--font-display,'Space Grotesk');font-weight:700;font-size:34px;line-height:1;color:var(--text);";
  }

  labelStyle(): string {
    return 'margin-top:6px;font-size:12.5px;color:var(--text-dim);';
  }
}
