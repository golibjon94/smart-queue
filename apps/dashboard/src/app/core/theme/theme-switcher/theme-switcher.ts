import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  inject,
  signal,
} from '@angular/core';

import { Theme, ThemeService } from '../theme.service';

/**
 * Palette tugmasi + 5 preset swatch popover'i (petrol/slate/navy/plum/light).
 * Topbar va login sahifasida qayta ishlatiladi. Tashqariga bosilganda yopiladi.
 */
@Component({
  selector: 'app-theme-switcher',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="relative">
      <button
        class="sq-mini grid place-items-center"
        style="width:38px;height:38px;border-radius:11px;border:1px solid var(--chip-bd);background:var(--chip);color:var(--text-dim);cursor:pointer;"
        title="Mavzu"
        (click)="open.set(!open())"
      >
        <i class="pi pi-palette" style="font-size:16px;"></i>
      </button>

      @if (open()) {
        <div
          class="absolute"
          style="z-index:50;top:46px;right:0;width:184px;padding:8px;border-radius:14px;background:linear-gradient(160deg,var(--panel-1),var(--panel-2));border:1px solid var(--border);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);box-shadow:var(--shadow),var(--inset);"
        >
          <div
            style="font-size:10px;letter-spacing:1.2px;text-transform:uppercase;color:var(--text-mut);padding:4px 8px 6px;font-family:var(--font-mono,'JetBrains Mono');"
          >
            Mavzu
          </div>
          @for (p of presets; track p.id) {
            <button
              class="sq-navitem flex w-full items-center gap-2.5"
              style="padding:8px;border-radius:9px;border:none;background:transparent;cursor:pointer;font-family:var(--font-sans,'Sora');font-size:13px;text-align:left;"
              [style.color]="p.id === current() ? 'var(--text)' : 'var(--text-dim)'"
              (click)="select(p.id)"
            >
              <span
                class="shrink-0"
                style="width:20px;height:20px;border-radius:7px;border:1px solid var(--border-strong);"
                [style.background]="p.swatch"
                [style.box-shadow]="
                  p.id === current() ? '0 0 0 2px var(--accent-d)' : 'inset 0 0 0 2px rgba(0,0,0,.12)'
                "
              ></span>
              <span class="flex-1">{{ p.label }}</span>
              @if (p.id === current()) {
                <i class="pi pi-check" style="font-size:12px;color:var(--accent-d);"></i>
              }
            </button>
          }
        </div>
      }
    </div>
  `,
})
export class ThemeSwitcher {
  private readonly theme = inject(ThemeService);
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly presets = this.theme.presets;
  protected readonly current = this.theme.theme;
  readonly open = signal(false);

  select(id: Theme): void {
    this.theme.set(id);
    this.open.set(false);
  }

  @HostListener('document:click', ['$event'])
  onDocClick(e: MouseEvent): void {
    if (this.open() && !this.el.nativeElement.contains(e.target as Node)) {
      this.open.set(false);
    }
  }
}
