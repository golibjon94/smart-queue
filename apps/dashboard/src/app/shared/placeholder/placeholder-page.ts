import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Hali tayyor bo'lmagan sahifalar uchun umumiy "Tez orada" ekrani.
 * `title` route `data: { title }` dan withComponentInputBinding orqali bog'lanadi.
 */
@Component({
  selector: 'app-placeholder-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <div
      class="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center text-surface-500 dark:text-surface-400"
    >
      <i class="pi pi-wrench text-4xl text-primary-500"></i>
      <h1 class="text-2xl font-bold text-surface-900 dark:text-surface-0">{{ title() }}</h1>
      <p class="text-sm">Bu bo'lim ustida ish olib borilmoqda — tez orada tayyor bo'ladi.</p>
    </div>
  `,
})
export class PlaceholderPage {
  readonly title = input('Sahifa');
}
