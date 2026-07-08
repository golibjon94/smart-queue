import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { LayoutService } from '../layout.service';
import { Sidebar } from '../sidebar/sidebar';
import { ShellTopbar } from '../shell-topbar/shell-topbar';

@Component({
  selector: 'app-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, Sidebar, ShellTopbar],
  template: `
    <div class="flex min-h-screen bg-surface-50 dark:bg-surface-950">
      <app-sidebar [collapsed]="layout.sidebarCollapsed()" />
      <div class="flex min-w-0 flex-1 flex-col">
        <app-shell-topbar />
        <main class="flex-1 overflow-x-hidden">
          <div class="mx-auto max-w-[1440px] px-6 py-6">
            <router-outlet />
          </div>
        </main>
      </div>
    </div>
  `,
})
export class AppShell {
  protected readonly layout = inject(LayoutService);
}
