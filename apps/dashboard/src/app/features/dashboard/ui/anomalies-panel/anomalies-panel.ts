import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { Anomaly, AnomalySeverity, AnomalyType } from '../../models';

@Component({
  selector: 'app-anomalies-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <section
      class="sq-card sq-rise"
      style="animation-delay:.36s;border-radius:20px;padding:20px;background:linear-gradient(160deg,var(--panel-1),var(--panel-2));border:1px solid var(--border);box-shadow:var(--inset);"
    >
      <div class="mb-3.5 flex items-center justify-between">
        <h2 style="margin:0;font-family:var(--font-display,'Space Grotesk');font-weight:600;font-size:15px;color:var(--text);">Anomaliyalar</h2>
        @if (anomalies().length > 0) {
          <span style="font-size:10.5px;font-weight:600;padding:3px 9px;border-radius:99px;background:rgba(var(--c-rgb),.14);color:var(--danger);">{{ anomalies().length }} faol</span>
        }
      </div>

      @if (anomalies().length === 0) {
        <div class="flex items-center gap-2.5" style="padding:6px 0;font-size:13px;color:var(--text-dim);">
          <i class="pi pi-shield" style="font-size:17px;color:var(--ok);"></i>
          Anomaliya yo'q — tizim barqaror.
        </div>
      }

      <div class="flex flex-col gap-2.5">
        @for (a of anomalies(); track a.detectedAt + a.type + (a.counterId ?? a.serviceTypeId ?? 0)) {
          <div class="sq-rec flex gap-3" [style]="rowStyle(a.severity)">
            <div class="grid shrink-0 place-items-center" [style]="iconChip(a.severity)">
              <i [class]="typeIcon(a.type)" style="font-size:15px;" [style.color]="color(a.severity)"></i>
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-2">
                <span style="font-family:var(--font-display,'Space Grotesk');font-weight:600;font-size:13.5px;color:var(--text);">{{ typeLabel(a.type) }}</span>
                <span [style]="tag(a.severity)">{{ severityLabel(a.severity) }}</span>
                <span style="font-size:10.5px;color:var(--text-mut);font-family:var(--font-mono,'JetBrains Mono');margin-left:auto;">{{ time(a.detectedAt) }}</span>
              </div>
              <p style="margin:6px 0 0;font-size:12.5px;color:var(--text-dim);line-height:1.45;">{{ a.message }}</p>
              <p style="margin:4px 0 0;font-size:11px;color:var(--text-mut);">
                Kuzatilgan: <b style="color:var(--text);">{{ a.metric }}</b> · kutilgan: {{ a.expected }}
              </p>
            </div>
          </div>
        }
      </div>
    </section>
  `,
})
export class AnomaliesPanel {
  readonly anomalies = input<Anomaly[]>([]);

  typeIcon(t: AnomalyType): string {
    if (t === 'slow_operator') return 'pi pi-hourglass';
    if (t === 'backlog') return 'pi pi-inbox';
    return 'pi pi-bolt';
  }

  typeLabel(t: AnomalyType): string {
    if (t === 'slow_operator') return 'Sekin operator';
    if (t === 'backlog') return "Navbat to'planishi";
    return 'Portlash';
  }

  severityLabel(s: AnomalySeverity): string {
    if (s === 'warning') return 'ogohlantirish';
    if (s === 'serious') return 'jiddiy';
    return 'kritik';
  }

  private rgb(s: AnomalySeverity): string {
    return s === 'warning' ? '--warn-rgb' : '--c-rgb';
  }

  color(s: AnomalySeverity): string {
    return s === 'warning' ? 'var(--warn)' : 'var(--danger)';
  }

  rowStyle(s: AnomalySeverity): string {
    const rgb = this.rgb(s);
    return `padding:13px;border-radius:14px;background:rgba(var(${rgb}),.1);border:1px solid rgba(var(${rgb}),.28);`;
  }

  iconChip(s: AnomalySeverity): string {
    const rgb = this.rgb(s);
    return `width:34px;height:34px;border-radius:10px;background:rgba(var(${rgb}),.12);border:1px solid rgba(var(${rgb}),.3);`;
  }

  tag(s: AnomalySeverity): string {
    const rgb = this.rgb(s);
    return `font-size:9.5px;font-weight:600;padding:2px 8px;border-radius:99px;background:rgba(var(${rgb}),.14);color:${this.color(s)};border:1px solid rgba(var(${rgb}),.3);`;
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
