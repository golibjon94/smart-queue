import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { CounterState, CounterStatus } from '../../models';

@Component({
  selector: 'app-counters-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <section
      class="sq-card sq-rise"
      style="animation-delay:.26s;border-radius:20px;padding:20px;background:linear-gradient(160deg,var(--panel-1),var(--panel-2));border:1px solid var(--border);box-shadow:var(--inset);"
    >
      <div class="mb-4 flex items-center justify-between">
        <h2 style="margin:0;font-family:var(--font-display,'Space Grotesk');font-weight:600;font-size:15px;color:var(--text);">Kassalar holati</h2>
        <span style="font-size:11px;color:var(--accent-b);font-family:var(--font-mono,'JetBrains Mono');">{{ counters().length }} ta kassa</span>
      </div>
      <div class="grid gap-2.5" style="grid-template-columns:repeat(6,1fr);">
        @for (c of counters(); track c.counterId) {
          <div class="flex flex-col items-center gap-[7px]" [style]="tileStyle(c.status)">
            <span style="font-family:var(--font-display,'Space Grotesk');font-weight:700;font-size:20px;color:var(--text);">{{ c.number }}</span>
            <span class="flex items-center gap-[5px]" [style.color]="textColor(c.status)" style="font-size:9.5px;">
              <span [style]="dotStyle(c.status)"></span>{{ label(c.status) }}
            </span>
          </div>
        } @empty {
          <span style="grid-column:1/-1;font-size:12.5px;color:var(--text-mut);">Ma'lumot yuklanmoqda…</span>
        }
      </div>
    </section>
  `,
})
export class CountersPanel {
  readonly counters = input<CounterState[]>([]);

  label(s: CounterStatus): string {
    return s === 'serving' ? 'xizmatda' : s === 'idle' ? "bo'sh" : 'yopiq';
  }

  textColor(s: CounterStatus): string {
    return s === 'serving' ? 'var(--accent-a)' : s === 'idle' ? 'var(--text-dim)' : 'var(--text-mut)';
  }

  tileStyle(s: CounterStatus): string {
    const base =
      'display:flex;flex-direction:column;align-items:center;gap:7px;padding:12px 4px;border-radius:13px;';
    if (s === 'serving') {
      return `${base}background:linear-gradient(150deg,rgba(var(--a-rgb),.18),rgba(var(--a-rgb),.04));border:1px solid rgba(var(--a-rgb),.4);`;
    }
    if (s === 'closed') {
      return `${base}background:transparent;border:1px dashed var(--border);opacity:.55;`;
    }
    return `${base}background:var(--chip);border:1px solid var(--chip-bd);`;
  }

  dotStyle(s: CounterStatus): string {
    const base = 'width:5px;height:5px;border-radius:50%;';
    if (s === 'serving') return `${base}background:var(--accent-a);animation:sq-pulse 2s infinite;`;
    return `${base}background:var(--text-mut);`;
  }
}
