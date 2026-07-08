import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  effect,
  inject,
  viewChild,
} from '@angular/core';

import { ThemeService } from '../../theme/theme.service';

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
}
interface Pulse {
  a: Node;
  b: Node;
  t: number;
  c: number[];
}

const N = 58;

/**
 * To'liq ekranli "neyron to'r" fon — prototipdagi initBackground() ning 1:1 porti.
 * app-shell ichida router-outlet ortida joylashadi. ThemeService o'zgarganda
 * qayta bo'yaladi; prefers-reduced-motion'da bitta statik kadr chiziladi.
 */
@Component({
  selector: 'app-neural-background',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <canvas
      #canvas
      class="pointer-events-none fixed inset-0 h-full w-full"
      style="z-index:0;opacity:var(--canvas-op);"
    ></canvas>
  `,
})
export class NeuralBackground {
  private readonly theme = inject(ThemeService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly canvasRef = viewChild<ElementRef<HTMLCanvasElement>>('canvas');

  private raf = 0;
  private onResize?: () => void;

  constructor() {
    effect(() => {
      const canvas = this.canvasRef()?.nativeElement;
      const light = !this.theme.isDark();
      if (canvas) this.setup(canvas, light);
    });
    this.destroyRef.onDestroy(() => this.stop());
  }

  private stop(): void {
    cancelAnimationFrame(this.raf);
    if (this.onResize) window.removeEventListener('resize', this.onResize);
  }

  private setup(canvas: HTMLCanvasElement, light: boolean): void {
    this.stop();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let w = 0;
    let h = 0;
    let dpr = 1;
    const nodes: Node[] = [];
    const pulses: Pulse[] = [];
    const palette = light
      ? [[15, 178, 150], [108, 99, 232], [236, 74, 120], [20, 165, 200]]
      : [[63, 224, 197], [142, 140, 255], [255, 122, 156], [90, 226, 255]];
    const linkC = light ? '70,60,150' : '120,130,220';
    const linkMax = light ? 0.13 : 0.22;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    this.onResize = resize;
    window.addEventListener('resize', resize);
    resize();

    for (let i = 0; i < N; i++) {
      nodes.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.28,
        vy: (Math.random() - 0.5) * 0.28,
        r: Math.random() * 1.6 + 0.8,
      });
    }

    const drawFrame = (animate: boolean) => {
      ctx.clearRect(0, 0, w, h);
      if (animate) {
        for (const n of nodes) {
          n.x += n.vx;
          n.y += n.vy;
          if (n.x < 0 || n.x > w) n.vx *= -1;
          if (n.y < 0 || n.y > h) n.vy *= -1;
        }
      }
      for (let i = 0; i < N; i++) {
        for (let j = i + 1; j < N; j++) {
          const a = nodes[i];
          const b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 150) {
            const al = (1 - d / 150) * linkMax;
            ctx.strokeStyle = `rgba(${linkC},${al})`;
            ctx.lineWidth = 0.7;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }
      for (let k = 0; k < N; k++) {
        const n = nodes[k];
        const c = palette[k % palette.length];
        ctx.beginPath();
        ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${light ? 0.7 : 0.9})`;
        ctx.shadowBlur = light ? 6 : 10;
        ctx.shadowColor = `rgba(${c[0]},${c[1]},${c[2]},.8)`;
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      if (!animate) return;
      if (Math.random() < 0.04 && pulses.length < 8) {
        const a = nodes[(Math.random() * N) | 0];
        const b = nodes[(Math.random() * N) | 0];
        if (a !== b) pulses.push({ a, b, t: 0, c: palette[(Math.random() * palette.length) | 0] });
      }
      for (let i = pulses.length - 1; i >= 0; i--) {
        const p = pulses[i];
        p.t += 0.02;
        if (p.t >= 1) {
          pulses.splice(i, 1);
          continue;
        }
        const x = p.a.x + (p.b.x - p.a.x) * p.t;
        const y = p.a.y + (p.b.y - p.a.y) * p.t;
        ctx.beginPath();
        ctx.fillStyle = `rgba(${p.c[0]},${p.c[1]},${p.c[2]},${(1 - p.t) * 0.95})`;
        ctx.shadowBlur = 14;
        ctx.shadowColor = `rgba(${p.c[0]},${p.c[1]},${p.c[2]},.9)`;
        ctx.arc(x, y, 2.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    };

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      drawFrame(false);
      return;
    }
    const loop = () => {
      drawFrame(true);
      this.raf = requestAnimationFrame(loop);
    };
    loop();
  }
}
