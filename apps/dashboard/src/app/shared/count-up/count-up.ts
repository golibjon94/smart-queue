import { Directive, ElementRef, DestroyRef, effect, inject, input } from '@angular/core';

/**
 * Host elementning matnini joriy qiymatdan yangi qiymatga cubic-ease bilan sanaydi.
 * `[sqCountUp]` — maqsad son (null → 0). `prefix`/`decimals` ixtiyoriy.
 * prefers-reduced-motion'da darrov o'rnatadi.
 */
@Directive({ selector: '[sqCountUp]' })
export class CountUp {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  readonly value = input.required<number | null>({ alias: 'sqCountUp' });
  readonly decimals = input(0);
  readonly prefix = input('');

  private from = 0;
  private raf = 0;
  private alive = true;

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.alive = false;
      cancelAnimationFrame(this.raf);
    });
    effect(() => {
      const target = this.value() ?? 0;
      this.animate(this.from, target);
      this.from = target;
    });
  }

  private animate(from: number, to: number): void {
    cancelAnimationFrame(this.raf);
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || from === to) {
      this.render(to);
      return;
    }
    const dur = 1100;
    const start = performance.now();
    const step = (now: number) => {
      if (!this.alive) return;
      const t = Math.min(1, (now - start) / dur);
      const e = 1 - Math.pow(1 - t, 3);
      this.render(from + (to - from) * e);
      if (t < 1) this.raf = requestAnimationFrame(step);
    };
    this.raf = requestAnimationFrame(step);
  }

  private render(v: number): void {
    const d = this.decimals();
    this.el.nativeElement.textContent = this.prefix() + (d ? v.toFixed(d) : String(Math.round(v)));
  }
}
