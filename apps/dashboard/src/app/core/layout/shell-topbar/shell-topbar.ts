import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MenuItem } from 'primeng/api';
import { AvatarModule } from 'primeng/avatar';
import { MenuModule } from 'primeng/menu';

import { AuthService } from '../../auth/auth.service';
import { ThemeService } from '../../theme/theme.service';
import { LayoutService } from '../layout.service';

@Component({
  selector: 'app-shell-topbar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AvatarModule, MenuModule],
  host: { class: 'contents' },
  template: `
    <header
      class="sticky top-0 z-10 flex h-16 items-center gap-3 border-b border-surface-200 bg-surface-0 px-5 dark:border-surface-700 dark:bg-surface-900"
    >
      <button
        type="button"
        class="grid h-9 w-9 place-items-center rounded-lg text-surface-500 hover:bg-surface-100 dark:text-surface-400 dark:hover:bg-surface-800"
        title="Menyu"
        (click)="layout.toggleSidebar()"
      >
        <i class="pi pi-bars"></i>
      </button>

      <div class="flex-1"></div>

      <button
        type="button"
        class="grid h-9 w-9 place-items-center rounded-lg text-surface-500 hover:bg-surface-100 dark:text-surface-400 dark:hover:bg-surface-800"
        [title]="theme.isDark() ? 'Yorug‘ rejim' : 'Qorong‘i rejim'"
        (click)="theme.toggle()"
      >
        <i [class]="theme.isDark() ? 'pi pi-sun' : 'pi pi-moon'"></i>
      </button>

      <button
        type="button"
        class="flex cursor-pointer items-center gap-2 rounded-full border border-surface-200 py-1 pl-1 pr-3 text-surface-900 hover:bg-surface-100 dark:border-surface-700 dark:text-surface-0 dark:hover:bg-surface-800"
        (click)="menu.toggle($event)"
      >
        <p-avatar [label]="initial()" shape="circle" styleClass="!bg-primary !text-white font-semibold" />
        <span class="text-[13px] font-medium">{{ user()?.fullName ?? user()?.username }}</span>
        <i class="pi pi-angle-down text-xs text-surface-500 dark:text-surface-400"></i>
      </button>
      <p-menu #menu [model]="menuItems()" [popup]="true" />
    </header>
  `,
})
export class ShellTopbar {
  protected readonly layout = inject(LayoutService);
  protected readonly theme = inject(ThemeService);
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
