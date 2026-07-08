import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { Forecast } from '../../models';

interface Pt {
  x: number;
  y: number;
}
interface ChartModel {
  band: string;
  area: string;
  line: string;
  gridY: number[];
  labels: { x: number; text: string }[];
  peak: Pt | null;
}

const W = 640;
const H = 250;
const PAD_L = 8;
const PAD_R = 8;
const PAD_T = 14;
const PAD_B = 26;

@Component({
  selector: 'app-forecast-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <section
      class="sq-card sq-rise relative overflow-hidden"
      style="animation-delay:.28s;border-radius:20px;padding:20px;background:linear-gradient(160deg,var(--panel-1),var(--panel-2));border:1px solid var(--border);box-shadow:var(--inset);"
    >
      <div class="mb-1.5 flex items-center justify-between gap-3">
        <div>
          <h2 style="margin:0;font-family:var(--font-display,'Space Grotesk');font-weight:600;font-size:15px;color:var(--text);">Kelish oqimi bashorati</h2>
          <p style="margin:4px 0 0;font-size:12px;color:var(--text-dim);">Keyingi {{ hours() }} soat · mijoz/soat</p>
        </div>
        <span
          class="inline-flex items-center gap-1.5"
          style="font-size:11px;color:var(--accent-c);font-family:var(--font-mono,'JetBrains Mono');padding:5px 11px;border-radius:99px;background:rgba(var(--c-rgb),.12);border:1px solid rgba(var(--c-rgb),.25);"
        >
          <i class="pi pi-microchip-ai" style="font-size:12px;"></i>
          @if (forecast()?.modelVersion) { LightGBM v{{ forecast()?.modelVersion }} } @else { LightGBM }
        </span>
      </div>

      <div class="my-1.5 flex gap-[18px]" style="font-size:11px;color:var(--text-dim);">
        <span class="flex items-center gap-1.5"><span style="width:14px;height:3px;border-radius:9px;background:var(--grad);"></span>Bashorat</span>
        <span class="flex items-center gap-1.5"><span style="width:14px;height:10px;border-radius:3px;background:rgba(var(--b-rgb),.22);"></span>Ishonch oralig'i</span>
      </div>

      <div style="width:100%;height:250px;">
        @if (chart(); as c) {
          <svg [attr.viewBox]="viewBox" preserveAspectRatio="none" style="width:100%;height:100%;overflow:visible;">
            <defs>
              <linearGradient id="sqLine" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" style="stop-color:var(--accent-a)" />
                <stop offset=".55" style="stop-color:var(--accent-b)" />
                <stop offset="1" style="stop-color:var(--accent-c)" />
              </linearGradient>
              <linearGradient id="sqArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" style="stop-color:rgba(var(--b-rgb),.35)" />
                <stop offset="1" style="stop-color:rgba(var(--b-rgb),0)" />
              </linearGradient>
              <filter id="sqGlow" x="-20%" y="-40%" width="140%" height="180%">
                <feGaussianBlur stdDeviation="4" result="b" />
                <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>
            @for (y of c.gridY; track y) {
              <line [attr.x1]="padL" [attr.y1]="y" [attr.x2]="w - padR" [attr.y2]="y" style="stroke:rgba(var(--b-rgb),.09)" stroke-width="1" />
            }
            <path [attr.d]="c.band" style="fill:rgba(var(--b-rgb),.13)" />
            <path [attr.d]="c.area" fill="url(#sqArea)" />
            <path
              [attr.d]="c.line"
              fill="none"
              stroke="url(#sqLine)"
              stroke-width="2.6"
              stroke-linecap="round"
              filter="url(#sqGlow)"
              stroke-dasharray="1600"
              stroke-dashoffset="1600"
              style="animation:sq-dash 1.8s cubic-bezier(.4,0,.2,1) .3s forwards;"
            />
            @if (c.peak; as p) {
              <circle [attr.cx]="p.x" [attr.cy]="p.y" r="5" style="fill:var(--accent-c)" stroke="#fff" stroke-width="1.5">
                <animate attributeName="r" values="5;7;5" dur="2s" repeatCount="indefinite" />
              </circle>
              <circle [attr.cx]="p.x" [attr.cy]="p.y" r="11" style="fill:rgba(var(--c-rgb),.25)">
                <animate attributeName="r" values="8;16;8" dur="2s" repeatCount="indefinite" />
                <animate attributeName="opacity" values=".5;0;.5" dur="2s" repeatCount="indefinite" />
              </circle>
            }
            @for (l of c.labels; track l.x) {
              <text [attr.x]="l.x" [attr.y]="h - 6" style="fill:var(--text-mut)" font-size="10" font-family="JetBrains Mono" text-anchor="middle">{{ l.text }}</text>
            }
          </svg>
        } @else {
          <div class="grid h-full place-items-center" style="color:var(--text-mut);font-size:12.5px;">Bashorat yuklanmoqda…</div>
        }
      </div>
    </section>
  `,
})
export class ForecastChart {
  readonly forecast = input<Forecast | null>(null);
  readonly hours = input(24);

  protected readonly w = W;
  protected readonly h = H;
  protected readonly padL = PAD_L;
  protected readonly padR = PAD_R;
  protected readonly viewBox = `0 0 ${W} ${H}`;

  readonly chart = computed<ChartModel | null>(() => {
    const f = this.forecast();
    const pts = f?.points ?? [];
    const n = pts.length;
    if (n < 2) return null;

    const pred = pts.map((p) => p.predicted);
    const upper = pts.map((p) => Math.max(p.upperCi, p.predicted));
    const lower = pts.map((p) => Math.max(0, Math.min(p.lowerCi, p.predicted)));
    const maxY = Math.max(...upper) * 1.06 || 1;

    const X = (i: number) => PAD_L + (i / (n - 1)) * (W - PAD_L - PAD_R);
    const Y = (v: number) => PAD_T + (1 - v / maxY) * (H - PAD_T - PAD_B);

    const predPts: Pt[] = pred.map((v, i) => ({ x: X(i), y: Y(v) }));
    const upPts: Pt[] = upper.map((v, i) => ({ x: X(i), y: Y(v) }));
    const loPts: Pt[] = lower.map((v, i) => ({ x: X(i), y: Y(v) }));

    const lineD = this.smooth(predPts);
    const bandTop = this.smooth(upPts);
    const bandBotRev = this.smooth([...loPts].reverse()).replace(/^M [^C]+/, '');
    const bandD = `${bandTop} L ${loPts[n - 1].x} ${loPts[n - 1].y} ${bandBotRev} Z`;
    const areaD = `${lineD} L ${X(n - 1)} ${Y(0)} L ${X(0)} ${Y(0)} Z`;

    const gridY = [0, maxY / 3, (2 * maxY) / 3].map((v) => Y(v));

    const peakI = pred.indexOf(Math.max(...pred));
    const peak: Pt | null = peakI >= 0 ? { x: X(peakI), y: Y(pred[peakI]) } : null;

    // ~6 ta belgi, targetTime soatidan
    const labelCount = Math.min(6, n);
    const fmt = new Intl.DateTimeFormat('uz', { hour: '2-digit', timeZone: 'Asia/Tashkent' });
    const labels = Array.from({ length: labelCount }, (_, k) => {
      const i = Math.round((k / (labelCount - 1)) * (n - 1));
      const t = new Date(pts[i].targetTime);
      const text = Number.isNaN(t.getTime()) ? '' : fmt.format(t).replace(/\D/g, '') + ':00';
      return { x: X(i), text };
    });

    return { band: bandD, area: areaD, line: lineD, gridY, labels, peak };
  });

  private smooth(pts: Pt[]): string {
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      const cx = (a.x + b.x) / 2;
      d += ` C ${cx} ${a.y} ${cx} ${b.y} ${b.x} ${b.y}`;
    }
    return d;
  }
}
