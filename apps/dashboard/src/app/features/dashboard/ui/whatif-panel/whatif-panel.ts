import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Slider, SliderChangeEvent } from 'primeng/slider';

import { CountUp } from '../../../../shared/count-up/count-up';
import { SimulateResult } from '../../models';

const MIN_COUNTERS = 1;
const MAX_COUNTERS = 10;
const DEBOUNCE_MS = 150;

/**
 * VAZIFA 1 — What-if simulyatsiya slayderi. Menejer kassa sonini o'zgartiradi,
 * kutish vaqti jonli baseline→scenario ko'rsatiladi (POST /api/simulate, debounce).
 * Slayder — PrimeNG. Raqamlar animatsiyali (CountUp).
 */
@Component({
  selector: 'app-whatif-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, Slider, CountUp],
  host: { class: 'block' },
  template: `
    <section
      class="sq-card sq-rise relative overflow-hidden"
      style="animation-delay:.24s;border-radius:20px;padding:20px;background:linear-gradient(160deg,var(--panel-alt-1),var(--panel-alt-2));border:1px solid var(--border-accent);box-shadow:var(--inset);"
    >
      <div class="absolute" style="top:-40px;right:-30px;width:130px;height:130px;border-radius:50%;background:radial-gradient(circle,rgba(var(--d-rgb),.22),transparent 70%);"></div>

      <!-- sarlavha -->
      <div class="relative mb-4 flex items-center justify-between gap-3">
        <div class="flex items-center gap-[11px]">
          <span class="grid shrink-0 place-items-center" style="width:38px;height:38px;border-radius:12px;background:linear-gradient(150deg,rgba(var(--d-rgb),.22),rgba(var(--d-rgb),.05));border:1px solid rgba(var(--d-rgb),.3);">
            <i class="pi pi-sliders-h" style="font-size:18px;color:var(--accent-d);"></i>
          </span>
          <div>
            <h2 style="margin:0;font-family:var(--font-display,'Space Grotesk');font-weight:600;font-size:15px;color:var(--text);">What-if simulyatsiya</h2>
            <p style="margin:3px 0 0;font-size:11.5px;color:var(--text-dim);">"Yana kassa ochsam-chi?" — jonli hisob</p>
          </div>
        </div>
        <span
          class="inline-flex items-center gap-1.5"
          style="font-size:10.5px;color:var(--accent-d);font-family:var(--font-mono,'JetBrains Mono');padding:4px 9px;border-radius:99px;background:rgba(var(--d-rgb),.12);border:1px solid rgba(var(--d-rgb),.25);"
        >
          <i class="pi pi-bolt" style="font-size:11px;"></i>Erlang-C
        </span>
      </div>

      <!-- slayder -->
      <div class="relative" style="border-radius:15px;padding:16px 18px;background:var(--chip);border:1px solid var(--chip-bd);">
        <div class="mb-3 flex items-center justify-between">
          <span style="font-size:12.5px;color:var(--text-dim);">Ochiq kassalar soni</span>
          <span style="font-family:var(--font-display,'Space Grotesk');font-weight:700;font-size:22px;color:var(--accent-d);">{{ sliderValue() }}</span>
        </div>
        <p-slider
          [ngModel]="sliderValue()"
          [min]="min"
          [max]="max"
          [step]="1"
          (onChange)="onSlide($event)"
        />
        <div class="mt-2 flex justify-between" style="font-size:10.5px;color:var(--text-mut);font-family:var(--font-mono,'JetBrains Mono');">
          <span>{{ min }}</span>
          <span>{{ max }}</span>
        </div>
      </div>

      <!-- baseline vs scenario -->
      <div class="mt-4 grid grid-cols-2 gap-3">
        <!-- Hozir -->
        <div style="border-radius:15px;padding:16px;background:var(--chip);border:1px solid var(--border);">
          <div class="flex items-center gap-1.5" style="font-size:11px;color:var(--text-mut);">
            <span style="width:6px;height:6px;border-radius:50%;background:var(--text-mut);"></span>Hozir
          </div>
          <div class="mt-2" style="font-family:var(--font-display,'Space Grotesk');font-weight:700;font-size:30px;line-height:1;color:var(--text);">
            @if (baseline(); as b) {
              ~<span [sqCountUp]="baselineMin()"></span><span style="font-size:14px;color:var(--text-dim);font-weight:500;"> daq</span>
            } @else { <span style="color:var(--text-mut);font-size:22px;">—</span> }
          </div>
          <div class="mt-1.5" style="font-size:11.5px;color:var(--text-dim);">{{ baseline()?.openCounters ?? currentCounters() }} kassa</div>
        </div>

        <!-- Slayder ssenariysi -->
        <div [style]="scenarioCardStyle()">
          <div class="flex items-center gap-1.5" style="font-size:11px;color:var(--accent-d);">
            <span style="width:6px;height:6px;border-radius:50%;background:var(--accent-d);animation:sq-pulse 1.6s infinite;"></span>Slayder
          </div>
          <div class="mt-2" style="font-family:var(--font-display,'Space Grotesk');font-weight:700;font-size:30px;line-height:1;color:var(--text);">
            @if (scenario(); as s) {
              ~<span [sqCountUp]="scenarioMin()"></span><span style="font-size:14px;color:var(--text-dim);font-weight:500;"> daq</span>
            } @else if (loading()) {
              <i class="pi pi-spin pi-spinner" style="font-size:20px;color:var(--accent-d);"></i>
            } @else { <span style="color:var(--text-mut);font-size:22px;">—</span> }
          </div>
          <div class="mt-1.5" style="font-size:11.5px;color:var(--text-dim);">{{ sliderValue() }} kassa</div>
        </div>
      </div>

      <!-- delta -->
      @if (delta(); as d) {
        <div class="mt-3 flex items-center justify-center gap-2.5" [style]="deltaStyle(d.improves)">
          <i [class]="d.improves ? 'pi pi-arrow-down-right' : 'pi pi-arrow-up-right'" style="font-size:16px;"></i>
          <span style="font-family:var(--font-display,'Space Grotesk');font-weight:600;font-size:14.5px;">
            Kutish {{ d.minutes }} daqiqa {{ d.improves ? 'kamayadi' : 'oshadi' }}
            <span style="opacity:.85;">({{ d.pct }}%)</span>
          </span>
        </div>
      }
    </section>
  `,
})
export class WhatifPanel {
  private readonly destroyRef = inject(DestroyRef);

  /** Joriy ochiq kassalar (slayder boshlang'ich qiymati). */
  readonly currentCounters = input(0);
  readonly simulation = input<SimulateResult | null>(null);
  readonly loading = input(false);

  /** Tanlangan kassa soni bo'yicha simulyatsiya so'raladi (debounce'dan keyin). */
  readonly simulate = output<number>();

  protected readonly min = MIN_COUNTERS;
  protected readonly max = MAX_COUNTERS;

  readonly sliderValue = signal(MIN_COUNTERS);
  private initialized = false;
  private timer?: ReturnType<typeof setTimeout>;

  readonly baseline = computed(() => this.simulation()?.baseline ?? null);
  readonly scenario = computed(() => this.simulation()?.scenario ?? null);
  readonly baselineMin = computed(() => Math.round((this.baseline()?.avgWaitSec ?? 0) / 60));
  readonly scenarioMin = computed(() => Math.round((this.scenario()?.avgWaitSec ?? 0) / 60));

  readonly delta = computed(() => {
    const d = this.simulation()?.delta;
    if (!d) return null;
    const improves = d.waitReductionSec >= 0;
    return {
      improves,
      minutes: Math.abs(Math.round(d.waitReductionSec / 60)),
      pct: Math.abs(d.waitReductionPct),
    };
  });

  constructor() {
    // baseline kassalar kelgach slayderni bir marta joriy holatga o'rnatadi va
    // dastlabki simulyatsiyani so'raydi (baseline ko'rinishi uchun).
    effect(() => {
      const cur = this.currentCounters();
      if (!this.initialized && cur > 0) {
        this.initialized = true;
        const clamped = Math.min(this.max, Math.max(this.min, cur));
        this.sliderValue.set(clamped);
        this.simulate.emit(clamped);
      }
    });

    this.destroyRef.onDestroy(() => {
      if (this.timer) clearTimeout(this.timer);
    });
  }

  onSlide(e: SliderChangeEvent): void {
    const v = typeof e.value === 'number' ? e.value : this.sliderValue();
    this.sliderValue.set(v);
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.simulate.emit(v), DEBOUNCE_MS);
  }

  scenarioCardStyle(): string {
    return 'border-radius:15px;padding:16px;background:linear-gradient(150deg,rgba(var(--d-rgb),.14),rgba(var(--a-rgb),.05));border:1px solid rgba(var(--d-rgb),.3);';
  }

  deltaStyle(improves: boolean): string {
    const rgb = improves ? '--a-rgb' : '--c-rgb';
    return `border-radius:13px;padding:12px;background:rgba(var(${rgb}),.12);border:1px solid rgba(var(${rgb}),.3);color:rgb(var(${rgb}));`;
  }
}
