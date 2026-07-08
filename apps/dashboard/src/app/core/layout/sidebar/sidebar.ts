import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { NgClass } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { NAV_ITEMS } from '../nav';

@Component({
  selector: 'app-sidebar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgClass, RouterLink, RouterLinkActive],
  template: `
    <aside
      class="sticky top-0 hidden h-screen shrink-0 flex-col border-r border-surface-200 bg-surface-0 transition-[width] duration-200 md:flex dark:border-surface-700 dark:bg-surface-900"
      [ngClass]="collapsed() ? 'w-20' : 'w-64'"
    >
      <!-- Brand -->
      <div
        class="flex h-16 items-center gap-3 border-b border-surface-200 px-4 dark:border-surface-700"
        [class.justify-center]="collapsed()"
      >
        <div
          class="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-gradient-to-br from-primary-500 to-primary-700 text-white"
        >
          <i class="pi pi-bolt"></i>
        </div>
        @if (!collapsed()) {
          <span class="text-base font-bold text-surface-900 dark:text-surface-0">smart-queue</span>
        }
      </div>

      <!-- Nav -->
      <nav class="flex flex-1 flex-col gap-1 p-3">
        @for (item of navItems; track item.route) {
          <a
            [routerLink]="item.route"
            routerLinkActive
            #rla="routerLinkActive"
            [routerLinkActiveOptions]="{ exact: item.route === '/' }"
            [title]="collapsed() ? item.label : ''"
            class="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors"
            [class.justify-center]="collapsed()"
            [ngClass]="
              rla.isActive
                ? 'bg-primary-50 text-primary-600 dark:bg-primary-400/10 dark:text-primary-400'
                : 'text-surface-600 hover:bg-surface-100 dark:text-surface-300 dark:hover:bg-surface-800'
            "
          >
            <i [class]="item.icon" class="text-lg"></i>
            @if (!collapsed()) {
              <span class="flex-1 text-sm font-medium">{{ item.label }}</span>
              @if (item.badge) {
                <span
                  class="rounded-full bg-surface-100 px-2 py-0.5 text-[10px] font-medium text-surface-500 dark:bg-surface-800 dark:text-surface-400"
                >
                  {{ item.badge }}
                </span>
              }
            }
          </a>
        }
      </nav>
    </aside>
  `,
})
export class Sidebar {
  readonly collapsed = input(false);
  protected readonly navItems = NAV_ITEMS;
}
