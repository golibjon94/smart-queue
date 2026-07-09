import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';

import { CountUp } from '../../../../shared/count-up/count-up';
import { FeedbackSummary, HeatLevel } from '../../models';

interface DonutSeg {
  color: string;
  dash: string;
  offset: number;
}

const R = 46;
const CIRC = 2 * Math.PI * R;

/**
 * VAZIFA 3 — Sentiment-feedback paneli. Izohlar sentiment (ijobiy/salbiy/neytral) va
 * mavzu bo'yicha jamlanadi; muammoli filial "issiqlik" ko'rsatkichi (yashil→qizil).
 * iQueue CSI faqat ball beradi — biz SABAB va MAVZUni ko'rsatamiz.
 * Demo uchun oddiy baho+izoh formasi (salbiy izoh → panel jonli qiziradi).
 */
@Component({
  selector: 'app-feedback-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CountUp],
  host: { class: 'block' },
  template: `
    <section
      class="sq-card sq-rise"
      style="animation-delay:.38s;border-radius:20px;padding:20px;background:linear-gradient(160deg,var(--panel-1),var(--panel-2));border:1px solid var(--border);box-shadow:var(--inset);"
    >
      <!-- sarlavha + issiqlik -->
      <div class="mb-4 flex items-center justify-between gap-3">
        <div class="flex items-center gap-[11px]">
          <span class="grid shrink-0 place-items-center" style="width:38px;height:38px;border-radius:12px;background:linear-gradient(150deg,rgba(var(--c-rgb),.22),rgba(var(--c-rgb),.05));border:1px solid rgba(var(--c-rgb),.3);">
            <i class="pi pi-comments" style="font-size:18px;color:var(--accent-c);"></i>
          </span>
          <div>
            <h2 style="margin:0;font-family:var(--font-display,'Space Grotesk');font-weight:600;font-size:15px;color:var(--text);">Mijoz kayfiyati</h2>
            <p style="margin:3px 0 0;font-size:11.5px;color:var(--text-dim);">izohlar sentiment + mavzu bo'yicha</p>
          </div>
        </div>
        <span [style]="heatChip(heat())">
          <span [style]="heatDot(heat())"></span>{{ heatLabel(heat()) }}
        </span>
      </div>

      @if (summary(); as s) {
        @if (s.total > 0) {
          <div class="flex flex-col items-center gap-5 sm:flex-row">
            <!-- donut -->
            <div class="relative shrink-0" style="width:132px;height:132px;">
              <svg viewBox="0 0 120 120" style="width:100%;height:100%;transform:rotate(-90deg);">
                <circle cx="60" cy="60" [attr.r]="r" fill="none" stroke="var(--chip-bd)" stroke-width="13" />
                @for (seg of donut(); track $index) {
                  <circle
                    cx="60" cy="60" [attr.r]="r" fill="none"
                    [attr.stroke]="seg.color" stroke-width="13" stroke-linecap="round"
                    [attr.stroke-dasharray]="seg.dash" [attr.stroke-dashoffset]="seg.offset"
                    style="transition:stroke-dasharray .6s cubic-bezier(.2,.7,.3,1);"
                  />
                }
              </svg>
              <div class="absolute inset-0 grid place-items-center" style="transform:none;">
                <div class="text-center">
                  <div style="font-family:var(--font-display,'Space Grotesk');font-weight:700;font-size:26px;line-height:1;color:var(--text);"><span [sqCountUp]="s.total"></span></div>
                  <div style="font-size:10px;color:var(--text-mut);margin-top:2px;">izoh</div>
                </div>
              </div>
            </div>

            <div class="min-w-0 flex-1 self-stretch">
              <!-- taqsimot -->
              <div class="flex flex-col gap-2">
                <div [style]="legendRow()">
                  <span [style]="legendDot('--a-rgb')"></span><span class="flex-1">Ijobiy</span>
                  <b style="color:var(--text);">{{ s.distribution.positive }}</b>
                  <span style="color:var(--text-mut);width:38px;text-align:right;">{{ s.distribution.positivePct }}%</span>
                </div>
                <div [style]="legendRow()">
                  <span [style]="legendDot('--warn-rgb')"></span><span class="flex-1">Neytral</span>
                  <b style="color:var(--text);">{{ s.distribution.neutral }}</b>
                  <span style="color:var(--text-mut);width:38px;text-align:right;">{{ s.distribution.neutralPct }}%</span>
                </div>
                <div [style]="legendRow()">
                  <span [style]="legendDot('--c-rgb')"></span><span class="flex-1">Salbiy</span>
                  <b style="color:var(--text);">{{ s.distribution.negative }}</b>
                  <span style="color:var(--text-mut);width:38px;text-align:right;">{{ s.distribution.negativePct }}%</span>
                </div>
              </div>
              <div class="mt-3 flex items-center justify-between" style="padding-top:11px;border-top:1px solid var(--border);font-size:12px;color:var(--text-dim);">
                O'rtacha baho
                <span class="flex items-center gap-1.5" style="font-family:var(--font-display,'Space Grotesk');font-weight:700;font-size:16px;color:var(--warn);">
                  <i class="pi pi-star-fill" style="font-size:13px;"></i>{{ s.avgRating.toFixed(1) }}
                </span>
              </div>
            </div>
          </div>

          <!-- top mavzular -->
          @if (s.topTopics.length > 0) {
            <div class="mt-4">
              <div style="font-size:11px;color:var(--text-mut);letter-spacing:.4px;text-transform:uppercase;">Eng ko'p tilga olingan mavzular</div>
              <div class="mt-2.5 flex flex-col gap-2">
                @for (t of s.topTopics; track t.topic) {
                  <div class="flex items-center gap-2.5">
                    <span style="width:96px;font-size:12.5px;color:var(--text);text-transform:capitalize;">{{ t.topic }}</span>
                    <div class="flex-1" style="height:8px;border-radius:99px;background:var(--chip);overflow:hidden;">
                      <div [style.width.%]="topicPct(t.count, s.topTopics[0].count)" style="height:100%;border-radius:99px;background:linear-gradient(90deg,var(--accent-c),var(--accent-b));"></div>
                    </div>
                    <span style="font-family:var(--font-mono,'JetBrains Mono');font-size:11.5px;color:var(--text-dim);width:24px;text-align:right;">{{ t.count }}</span>
                  </div>
                }
              </div>
            </div>
          }
        } @else {
          <div class="flex items-center gap-2.5" style="padding:6px 0 14px;font-size:13px;color:var(--text-dim);">
            <i class="pi pi-inbox" style="font-size:17px;color:var(--text-mut);"></i>
            Hozircha izoh yo'q — quyida sinov izohini qoldiring.
          </div>
        }
      } @else {
        <div style="padding:8px 0 14px;font-size:12.5px;color:var(--text-mut);">Jamlanma yuklanmoqda…</div>
      }

      <!-- demo: izoh kiritish -->
      <div class="mt-4" style="border-top:1px solid var(--border);padding-top:16px;">
        <div class="flex items-center justify-between">
          <span style="font-size:12.5px;font-weight:600;color:var(--text-dim);">Demo: izoh qoldirish</span>
          <div class="flex gap-1">
            @for (st of stars; track st) {
              <button type="button" class="grid place-items-center" style="width:26px;height:26px;border:none;background:transparent;cursor:pointer;" (click)="rating.set(st)">
                <i class="pi pi-star-fill" style="font-size:15px;" [style.color]="st <= rating() ? 'var(--warn)' : 'var(--text-mut)'"></i>
              </button>
            }
          </div>
        </div>
        <div class="mt-2.5 flex gap-2">
          <input
            class="sq-input"
            style="height:42px;flex:1;"
            placeholder="masalan: navbat juda uzun edi"
            [value]="comment()"
            (input)="comment.set($any($event.target).value)"
            (keydown.enter)="send()"
          />
          <button
            type="button"
            class="sq-btn grid shrink-0 place-items-center"
            style="width:46px;height:42px;border:none;border-radius:11px;cursor:pointer;color:var(--ok-ink);background:linear-gradient(100deg,var(--accent-c),var(--accent-b));box-shadow:0 8px 22px -10px rgba(var(--c-rgb),.7);"
            [disabled]="rating() === 0 || loading()"
            (click)="send()"
          >
            @if (loading()) {
              <i class="pi pi-spin pi-spinner" style="font-size:15px;"></i>
            } @else {
              <i class="pi pi-send" style="font-size:15px;"></i>
            }
          </button>
        </div>
      </div>
    </section>
  `,
})
export class FeedbackPanel {
  readonly summary = input<FeedbackSummary | null>(null);
  readonly loading = input(false);

  readonly submit = output<{ rating: number; comment: string }>();

  protected readonly stars = [1, 2, 3, 4, 5];
  protected readonly r = R;

  readonly rating = signal(0);
  readonly comment = signal('');

  readonly heat = computed<HeatLevel>(() => this.summary()?.heat ?? 'green');

  readonly donut = computed<DonutSeg[]>(() => {
    const d = this.summary()?.distribution;
    if (!d) return [];
    const parts: { pct: number; color: string }[] = [
      { pct: d.positivePct, color: 'rgb(var(--a-rgb))' },
      { pct: d.neutralPct, color: 'rgb(var(--warn-rgb))' },
      { pct: d.negativePct, color: 'rgb(var(--c-rgb))' },
    ];
    let acc = 0;
    const segs: DonutSeg[] = [];
    for (const p of parts) {
      if (p.pct <= 0) continue;
      const len = (p.pct / 100) * CIRC;
      segs.push({
        color: p.color,
        dash: `${len} ${CIRC - len}`,
        offset: -(acc / 100) * CIRC,
      });
      acc += p.pct;
    }
    return segs;
  });

  topicPct(count: number, max: number): number {
    return max > 0 ? Math.max(8, Math.round((count / max) * 100)) : 0;
  }

  send(): void {
    if (this.rating() === 0) return;
    this.submit.emit({ rating: this.rating(), comment: this.comment() });
    this.rating.set(0);
    this.comment.set('');
  }

  // --- issiqlik ko'rinishi ---

  private heatRgb(h: HeatLevel): string {
    if (h === 'red') return '--c-rgb';
    if (h === 'yellow') return '--warn-rgb';
    return '--a-rgb';
  }

  heatLabel(h: HeatLevel): string {
    if (h === 'red') return 'Muammoli';
    if (h === 'yellow') return 'E\'tibor';
    return 'Barqaror';
  }

  heatChip(h: HeatLevel): string {
    const rgb = this.heatRgb(h);
    return `display:inline-flex;align-items:center;gap:6px;font-size:11px;font-weight:600;padding:5px 11px;border-radius:99px;color:rgb(var(${rgb}));background:rgba(var(${rgb}),.14);border:1px solid rgba(var(${rgb}),.3);`;
  }

  heatDot(h: HeatLevel): string {
    const rgb = this.heatRgb(h);
    return `width:7px;height:7px;border-radius:50%;background:rgb(var(${rgb}));${h === 'red' ? 'animation:sq-pulse 1.4s infinite;' : ''}`;
  }

  legendRow(): string {
    return 'display:flex;align-items:center;gap:8px;font-size:12.5px;color:var(--text-dim);';
  }

  legendDot(rgb: string): string {
    return `width:9px;height:9px;border-radius:3px;background:rgb(var(${rgb}));`;
  }
}
