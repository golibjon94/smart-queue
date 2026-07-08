import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { LayoutService } from '../layout.service';
import { NeuralBackground } from '../neural-background/neural-background';
import { Sidebar } from '../sidebar/sidebar';
import { ShellTopbar } from '../shell-topbar/shell-topbar';

@Component({
  selector: 'app-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, NeuralBackground, Sidebar, ShellTopbar],
  host: {
    class: 'relative block h-screen overflow-hidden',
    style: 'background: var(--bg-radials), var(--bg); color: var(--text);',
  },
  template: `
    <app-neural-background />

    <!-- vignette -->
    <div
      class="pointer-events-none fixed inset-0"
      style="z-index:0;background:radial-gradient(circle at 50% 50%, transparent 52%, var(--vignette) 100%);"
    ></div>

    <div class="relative flex h-full" style="z-index:2;">
      <app-sidebar [collapsed]="layout.sidebarCollapsed()" />

      <div class="flex min-w-0 flex-1 flex-col">
        <app-shell-topbar />
        <main class="sq-scroll flex-1 overflow-y-auto" style="padding:26px 26px 34px;">
          <div class="mx-auto w-full" style="max-width:1520px;">
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
