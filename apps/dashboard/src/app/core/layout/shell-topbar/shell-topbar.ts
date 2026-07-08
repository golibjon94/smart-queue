import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MenuItem } from 'primeng/api';
import { MenuModule } from 'primeng/menu';

import { AuthService } from '../../auth/auth.service';
import { ThemeSwitcher } from '../../theme/theme-switcher/theme-switcher';
import { LayoutService } from '../layout.service';

@Component({
  selector: 'app-shell-topbar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MenuModule, ThemeSwitcher],
  host: { class: 'contents' },
  template: `
    <header
      class="sticky top-0 flex items-center gap-3.5"
      style="z-index:5;height:66px;padding:0 26px;border-bottom:1px solid var(--border);background:var(--panel-2);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);"
    >
      <button
        class="sq-mini grid place-items-center"
        style="width:38px;height:38px;border-radius:11px;border:1px solid var(--chip-bd);background:var(--chip);color:var(--text-dim);cursor:pointer;"
        title="Menyu"
        (click)="layout.toggleSidebar()"
      >
        <i class="pi pi-bars" style="font-size:16px;"></i>
      </button>

      <!-- search pill (decorative) -->
      <div
        class="flex items-center gap-2.5"
        style="padding:6px 13px;border-radius:99px;background:var(--chip);border:1px solid var(--chip-bd);font-size:12.5px;color:var(--text-dim);min-width:210px;"
      >
        <i class="pi pi-search" style="font-size:13px;color:var(--text-mut);"></i>
        <span class="hidden sm:inline">Qidirish yoki AI'dan so'rash…</span>
      </div>

      <div class="flex-1"></div>

      <!-- Jonli -->
      <div
        class="hidden items-center gap-2 sm:flex"
        style="height:38px;padding:0 14px;border-radius:11px;border:1px solid var(--chip-bd);background:var(--chip);color:var(--text-dim);font-size:12.5px;"
      >
        <span style="width:7px;height:7px;border-radius:50%;background:var(--accent-d);animation:sq-pulsedot-aqua 2s infinite;"></span>
        Jonli
      </div>

      <!-- bell -->
      <button
        class="sq-mini relative grid place-items-center"
        style="width:38px;height:38px;border-radius:11px;border:1px solid var(--chip-bd);background:var(--chip);color:var(--text-dim);cursor:pointer;"
        title="Bildirishnomalar"
      >
        <i class="pi pi-bell" style="font-size:16px;"></i>
        <span class="absolute" style="top:8px;right:9px;width:7px;height:7px;border-radius:50%;background:var(--danger);box-shadow:0 0 0 2px var(--bg);"></span>
      </button>

      <!-- theme switcher (5 preset) -->
      <app-theme-switcher />

      <!-- user pill -->
      <button
        class="sq-mini flex items-center gap-2.5"
        style="height:38px;padding:3px 12px 3px 4px;border-radius:99px;border:1px solid var(--chip-bd);background:var(--chip);color:var(--text);cursor:pointer;"
        (click)="menu.toggle($event)"
      >
        <span
          class="grid place-items-center"
          style="width:30px;height:30px;border-radius:50%;background:conic-gradient(from 210deg,var(--accent-a),var(--accent-b),var(--accent-c));font-size:12.5px;font-weight:700;color:#0a0d1a;"
        >{{ initial() }}</span>
        <span class="hidden sm:inline" style="font-size:12.5px;font-weight:500;">{{ user()?.fullName ?? user()?.username }}</span>
        <i class="pi pi-angle-down" style="font-size:12px;color:var(--text-mut);"></i>
      </button>
      <p-menu #menu [model]="menuItems()" [popup]="true" />
    </header>
  `,
})
export class ShellTopbar {
  protected readonly layout = inject(LayoutService);
  private readonly auth = inject(AuthService);

  protected readonly user = this.auth.user;
  protected readonly initial = computed(() =>
    (this.user()?.username ?? 'A').charAt(0).toUpperCase(),
  );
  protected readonly menuItems = computed<MenuItem[]>(() => [
    { label: this.user()?.fullName ?? 'Foydalanuvchi', disabled: true },
    { separator: true },
    { label: 'Chiqish', icon: 'pi pi-sign-out', command: () => this.auth.logout() },
  ]);
}
