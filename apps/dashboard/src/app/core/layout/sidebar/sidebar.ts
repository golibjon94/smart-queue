import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { NAV_ITEMS } from '../nav';

@Component({
  selector: 'app-sidebar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <aside
      class="sq-side sticky top-0 hidden h-screen shrink-0 flex-col gap-2 md:flex"
      [class.is-collapsed]="collapsed()"
      style="border-right:1px solid var(--border);background:var(--panel-1);backdrop-filter:blur(22px);-webkit-backdrop-filter:blur(22px);"
      [style.width]="collapsed() ? '84px' : '250px'"
      [style.padding]="collapsed() ? '22px 12px' : '22px 16px'"
    >
      <!-- Brand -->
      <div class="sq-side-row" style="padding:6px 8px 20px;">
        <div
          class="relative grid shrink-0 place-items-center"
          style="height:42px;width:42px;border-radius:13px;background:conic-gradient(from 140deg,var(--accent-d),var(--accent-a),var(--accent-b),var(--accent-c));box-shadow:0 8px 26px -8px rgba(var(--d-rgb),.8);"
        >
          <div class="absolute" style="inset:2px;border-radius:11px;background:var(--bg);"></div>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" class="relative">
            <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" fill="url(#brandg)" />
            <defs>
              <linearGradient id="brandg" x1="0" y1="0" x2="24" y2="24">
                <stop style="stop-color:var(--accent-a)" />
                <stop offset="1" style="stop-color:var(--accent-c)" />
              </linearGradient>
            </defs>
          </svg>
        </div>
        <div class="sq-side-label flex flex-col" style="line-height:1.1;">
          <span style="font-family:var(--font-display,'Space Grotesk');font-weight:700;font-size:16px;letter-spacing:.3px;color:var(--text);">smart-queue</span>
          <span style="font-size:10.5px;color:var(--text-mut);letter-spacing:1.5px;text-transform:uppercase;">AI Orchestrator</span>
        </div>
      </div>

      <span class="sq-side-eyebrow" style="font-size:10px;letter-spacing:1.8px;color:var(--text-mut);text-transform:uppercase;padding:0 10px 4px;">Boshqaruv</span>

      <!-- Nav -->
      @for (item of navItems; track item.route) {
        <a
          class="sq-navitem sq-side-row"
          [routerLink]="item.route"
          routerLinkActive
          #rla="routerLinkActive"
          [routerLinkActiveOptions]="{ exact: item.route === '/' }"
          [title]="collapsed() ? item.label : ''"
          [style]="navStyle(rla.isActive)"
        >
          @if (rla.isActive) {
            <span
              class="absolute"
              style="left:0;top:9px;bottom:9px;width:3px;border-radius:9px;background:linear-gradient(var(--accent-d),var(--accent-b));"
            ></span>
          }
          <i
            [class]="item.icon"
            style="font-size:17px;flex-shrink:0;"
            [style.color]="rla.isActive ? 'var(--accent-d)' : 'currentColor'"
          ></i>
          <span class="sq-side-label" style="flex:1;">{{ item.label }}</span>
          @if (item.badge) {
            <span
              class="sq-side-label"
              style="font-size:9.5px;padding:2px 7px;border-radius:99px;background:rgba(var(--b-rgb),.14);color:var(--text-dim);"
            >
              {{ item.badge }}
            </span>
          }
        </a>
      }

      <div style="margin-top:auto;"></div>

      <!-- AI Engine widget -->
      <div
        class="relative overflow-hidden"
        style="border-radius:16px;background:linear-gradient(160deg,rgba(var(--a-rgb),.12),rgba(var(--c-rgb),.10));border:1px solid rgba(var(--b-rgb),.2);transition:padding .42s cubic-bezier(.4,0,.2,1);"
        [style.padding]="collapsed() ? '14px 8px' : '16px 14px'"
      >
        <div class="sq-side-row">
          <div class="relative shrink-0" style="width:38px;height:38px;">
            <div class="absolute" style="inset:0;border-radius:50%;border:1.5px solid transparent;border-top-color:var(--accent-a);border-right-color:var(--accent-b);animation:sq-spin 3s linear infinite;"></div>
            <div class="absolute" style="inset:5px;border-radius:50%;border:1.5px solid transparent;border-bottom-color:var(--accent-c);border-left-color:var(--accent-b);animation:sq-spin-rev 2.4s linear infinite;"></div>
            <div class="absolute" style="inset:12px;border-radius:50%;background:radial-gradient(circle,#fff,var(--accent-d));box-shadow:0 0 14px var(--accent-d);animation:sq-pulse 2s ease-in-out infinite;"></div>
          </div>
          <div class="sq-side-label" style="line-height:1.3;">
            <div style="font-size:12.5px;font-weight:600;color:var(--text);">AI Engine</div>
            <div style="font-size:10.5px;color:var(--text-dim);font-family:var(--font-mono,'JetBrains Mono');">LightGBM v3.2 · live</div>
          </div>
        </div>
      </div>
    </aside>
  `,
})
export class Sidebar {
  readonly collapsed = input(false);
  protected readonly navItems = NAV_ITEMS;

  navStyle(active: boolean): string {
    const base =
      'padding:11px 12px;border-radius:12px;text-decoration:none;font-size:13.5px;font-weight:500;position:relative;';
    const state = active
      ? 'color:var(--text);background:linear-gradient(90deg,rgba(var(--a-rgb),.16),rgba(var(--b-rgb),.10));box-shadow:inset 0 0 0 1px rgba(var(--b-rgb),.28);'
      : 'color:var(--text-dim);';
    return base + state;
  }
}
