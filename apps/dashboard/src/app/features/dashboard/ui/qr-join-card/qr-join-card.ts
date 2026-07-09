import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';

import { ServiceQueueState } from '../../models';

/**
 * VAZIFA 2 (menejer tomoni) — QR kod. Mijoz telefonda skanlab `/q/join`'ga o'tadi.
 * QR tasvir oddiy QR API orqali (apparatsiz). Manejer xizmat turini tanlaydi,
 * QR shu xizmatga (`branch`+`service`+`label`) yo'naltiradi.
 */
@Component({
  selector: 'app-qr-join-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <section
      class="sq-card sq-rise"
      style="animation-delay:.4s;border-radius:20px;padding:20px;background:linear-gradient(160deg,var(--panel-1),var(--panel-2));border:1px solid var(--border);box-shadow:var(--inset);"
    >
      <div class="mb-3.5 flex items-center gap-[11px]">
        <span class="grid shrink-0 place-items-center" style="width:38px;height:38px;border-radius:12px;background:linear-gradient(150deg,rgba(var(--b-rgb),.22),rgba(var(--b-rgb),.05));border:1px solid rgba(var(--b-rgb),.3);">
          <i class="pi pi-qrcode" style="font-size:18px;color:var(--accent-b);"></i>
        </span>
        <div>
          <h2 style="margin:0;font-family:var(--font-display,'Space Grotesk');font-weight:600;font-size:15px;color:var(--text);">Masofadan navbat (QR)</h2>
          <p style="margin:3px 0 0;font-size:11.5px;color:var(--text-dim);">Skanlang → telefonda navbatga qo'shiling</p>
        </div>
      </div>

      <div class="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
        <!-- QR -->
        <div class="grid shrink-0 place-items-center" style="width:172px;height:172px;border-radius:16px;padding:10px;background:#fff;border:1px solid var(--border);box-shadow:0 12px 30px -14px rgba(0,0,0,.5);">
          <img [src]="qrSrc()" alt="QR kod" width="150" height="150" style="display:block;border-radius:8px;" />
        </div>

        <div class="min-w-0 flex-1">
          <div style="font-size:11.5px;color:var(--text-mut);">Xizmat turi</div>
          <div class="mt-2 flex flex-wrap gap-2">
            @for (q of queues(); track q.serviceTypeId) {
              <button
                type="button"
                class="sq-mini"
                [style]="chipStyle(q.serviceTypeId === selectedId())"
                (click)="selectedId.set(q.serviceTypeId)"
              >{{ q.name }}</button>
            } @empty {
              <span style="font-size:12px;color:var(--text-mut);">Xizmat turlari yuklanmoqda…</span>
            }
          </div>

          <div class="mt-4" style="font-size:11px;color:var(--text-mut);">Havola</div>
          <code style="display:block;margin-top:4px;font-family:var(--font-mono,'JetBrains Mono');font-size:10.5px;color:var(--accent-d);word-break:break-all;padding:8px 10px;border-radius:9px;background:var(--chip);border:1px solid var(--chip-bd);">{{ joinUrl() }}</code>

          <p class="mt-3 flex items-start gap-2" style="font-size:11.5px;color:var(--text-dim);line-height:1.5;">
            <i class="pi pi-info-circle" style="font-size:13px;margin-top:1px;color:var(--accent-b);"></i>
            Demo: QR ni telefonда skanlang. Mijoz navbatga qo'shiladi va o'z o'rnini jonli ko'radi.
          </p>
        </div>
      </div>
    </section>
  `,
})
export class QrJoinCard {
  readonly queues = input<ServiceQueueState[]>([]);
  readonly branchId = input(1);

  readonly selectedId = signal<number | null>(null);

  readonly selected = computed(() => {
    const id = this.selectedId();
    const list = this.queues();
    return list.find((q) => q.serviceTypeId === id) ?? list[0] ?? null;
  });

  readonly joinUrl = computed(() => {
    const origin =
      typeof window !== 'undefined' ? window.location.origin : 'http://localhost:4300';
    const svc = this.selected();
    const service = svc?.serviceTypeId ?? 1;
    const label = svc?.name ? `&label=${encodeURIComponent(svc.name)}` : '';
    return `${origin}/q/join?branch=${this.branchId()}&service=${service}${label}`;
  });

  readonly qrSrc = computed(
    () =>
      `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=0&data=${encodeURIComponent(
        this.joinUrl(),
      )}`,
  );

  chipStyle(active: boolean): string {
    const base =
      'font-size:12px;font-weight:600;padding:7px 12px;border-radius:99px;cursor:pointer;transition:all .3s;';
    if (active) {
      return `${base}color:var(--ok-ink);background:linear-gradient(100deg,var(--accent-d),var(--accent-b));border:none;`;
    }
    return `${base}color:var(--text-dim);background:var(--chip);border:1px solid var(--chip-bd);`;
  }
}
