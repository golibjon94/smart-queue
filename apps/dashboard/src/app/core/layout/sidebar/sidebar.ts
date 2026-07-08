import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { NAV_ITEMS } from '../nav';

@Component({
  selector: 'app-sidebar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <aside
      class="sticky top-0 hidden h-screen shrink-0 flex-col gap-2 md:flex"
      style="width:250px;padding:22px 16px;border-right:1px solid var(--border);background:var(--panel-1);backdrop-filter:blur(22px);-webkit-backdrop-filter:blur(22px);"
      [style.width]="collapsed() ? '84px' : '250px'"
    >
      <!-- Brand -->
      <div class="flex items-center gap-3" style="padding:6px 8px 20px;" [style.justify-content]="collapsed() ? 'center' : ''">
        <div
          class="relative grid shrink-0 place-items-center"
          style="height:42px;width:42px;border-radius:13px;background:conic-gradient(from 140deg,var(--accent-a),var(--accent-b),var(--accent-c),var(--accent-a));box-shadow:0 8px 26px -8px rgba(var(--b-rgb),.8);"
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
        @if (!collapsed()) {
          <div class="flex flex-col" style="line-height:1.1;">
            <span style="font-family:var(--font-display,'Space Grotesk');font-weight:700;font-size:16px;letter-spacing:.3px;color:var(--text);">smart-queue</span>
            <span style="font-size:10.5px;color:var(--text-mut);letter-spacing:1.5px;text-transform:uppercase;">AI Orchestrator</span>
          </div>
        }
      </div>

      @if (!collapsed()) {
        <span style="font-size:10px;letter-spacing:1.8px;color:var(--text-mut);text-transform:uppercase;padding:0 10px 4px;">Boshqaruv</span>
      }

      <!-- Nav -->
      @for (item of navItems; track item.route) {
        <a
          class="sq-navitem"
          [routerLink]="item.route"
          routerLinkActive
          #rla="routerLinkActive"
          [routerLinkActiveOptions]="{ exact: item.route === '/' }"
          [title]="collapsed() ? item.label : ''"
          [style]="navStyle(rla.isActive, collapsed())"
        >
          @if (rla.isActive) {
            <span
              class="absolute"
              style="left:0;top:9px;bottom:9px;width:3px;border-radius:9px;background:linear-gradient(var(--accent-a),var(--accent-c));"
            ></span>
          }
          <i
            [class]="item.icon"
            style="font-size:17px;"
            [style.color]="rla.isActive ? 'var(--accent-a)' : 'currentColor'"
          ></i>
          @if (!collapsed()) {
            <span style="flex:1;">{{ item.label }}</span>
            @if (item.badge) {
              <span style="font-size:9.5px;padding:2px 7px;border-radius:99px;background:rgba(var(--b-rgb),.14);color:var(--text-dim);">
                {{ item.badge }}
              </span>
            }
          }
        </a>
      }

      <div style="margin-top:auto;"></div>

      <!-- AI Engine widget -->
      <div
        class="relative overflow-hidden"
        style="border-radius:16px;padding:16px 14px;background:linear-gradient(160deg,rgba(var(--a-rgb),.12),rgba(var(--c-rgb),.10));border:1px solid rgba(var(--b-rgb),.2);"
      >
        <div class="flex items-center gap-3" [style.justify-content]="collapsed() ? 'center' : ''">
          <div class="relative shrink-0" style="width:38px;height:38px;">
            <div class="absolute" style="inset:0;border-radius:50%;border:1.5px solid transparent;border-top-color:var(--accent-a);border-right-color:var(--accent-b);animation:sq-spin 3s linear infinite;"></div>
            <div class="absolute" style="inset:5px;border-radius:50%;border:1.5px solid transparent;border-bottom-color:var(--accent-c);border-left-color:var(--accent-b);animation:sq-spin-rev 2.4s linear infinite;"></div>
            <div class="absolute" style="inset:12px;border-radius:50%;background:radial-gradient(circle,#fff,var(--accent-b));box-shadow:0 0 14px var(--accent-b);animation:sq-pulse 2s ease-in-out infinite;"></div>
          </div>
          @if (!collapsed()) {
            <div style="line-height:1.3;">
              <div style="font-size:12.5px;font-weight:600;color:var(--text);">AI Engine</div>
              <div style="font-size:10.5px;color:var(--text-dim);font-family:var(--font-mono,'JetBrains Mono');">LightGBM v3.2 · live</div>
            </div>
          }
        </div>
      </div>
    </aside>
  `,
})
export class Sidebar {
  readonly collapsed = input(false);
  protected readonly navItems = NAV_ITEMS;

  navStyle(active: boolean, collapsed: boolean): string {
    const base =
      'display:flex;align-items:center;gap:13px;padding:11px 12px;border-radius:12px;text-decoration:none;font-size:13.5px;font-weight:500;position:relative;';
    const center = collapsed ? 'justify-content:center;' : '';
    const state = active
      ? 'color:var(--text);background:linear-gradient(90deg,rgba(var(--a-rgb),.16),rgba(var(--b-rgb),.10));box-shadow:inset 0 0 0 1px rgba(var(--b-rgb),.28);'
      : 'color:var(--text-dim);';
    return base + center + state;
  }
}
